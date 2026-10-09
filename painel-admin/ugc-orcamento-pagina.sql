-- ==========================================================================
-- ugc-orcamento-pagina.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs). Antes, rode o ugc-pacotes-tabela.sql.
-- ==========================================================================
-- Página pública de orçamento (brunamedeiros.com/orcamento/?t=...): UM link só,
-- que mostra os pacotes marcados como "Mostrar na página de orçamento".
-- Quem não tem o link não encontra a página; o link é um código longo e
-- aleatório (token) que dá pra desligar ou trocar pelo painel.
-- A página não lê a tabela direto: ela chama a função orcamento_publico(token),
-- que só devolve nome, descrição, itens, desconto e valor dos pacotes marcados.
-- É seguro rodar de novo.

alter table public.ugc_pacotes add column if not exists publicado boolean not null default false;
alter table public.ugc_pacotes add column if not exists descricao_publica text;

create table if not exists public.orcamento_pagina (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  ativa boolean not null default true,
  titulo text,
  intro text,
  condicoes text,
  contato_rotulo text,
  contato_link text
);

alter table public.orcamento_pagina enable row level security;

drop policy if exists "Painel: leitura autenticada da página de orçamento" on public.orcamento_pagina;
drop policy if exists "Painel: escrita autenticada da página de orçamento" on public.orcamento_pagina;
drop policy if exists "Painel: atualização autenticada da página de orçamento" on public.orcamento_pagina;
drop policy if exists "Painel: exclusão autenticada da página de orçamento" on public.orcamento_pagina;

create policy "Painel: leitura autenticada da página de orçamento"
  on public.orcamento_pagina for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada da página de orçamento"
  on public.orcamento_pagina for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada da página de orçamento"
  on public.orcamento_pagina for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada da página de orçamento"
  on public.orcamento_pagina for delete to authenticated using (public.is_owner());

-- Uma linha só (a página tem um link só).
insert into public.orcamento_pagina (titulo, intro, contato_rotulo)
select 'Orçamentos', 'Pacotes e valores de UGC e publicidade.', 'Falar com a Bru'
where not exists (select 1 from public.orcamento_pagina);

-- Função chamada pela página pública. Só responde se o token estiver certo e o link ativo.
create or replace function public.orcamento_publico(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pg public.orcamento_pagina;
  lista jsonb;
begin
  select * into pg from public.orcamento_pagina where token = p_token and ativa limit 1;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'nome', p.nome,
             'descricao', p.descricao_publica,
             'itens', (
               select coalesce(jsonb_agg(jsonb_build_object('servico', i->>'servico', 'quantidade', i->'quantidade')), '[]'::jsonb)
               from jsonb_array_elements(p.itens) i
             ),
             'desconto_pct', p.desconto_pct,
             'valor_bruto', p.valor_bruto,
             'valor_final', p.valor_final
           ) order by p.created_at
         ), '[]'::jsonb)
    into lista
    from public.ugc_pacotes p
   where p.publicado;

  return jsonb_build_object(
    'titulo', pg.titulo,
    'intro', pg.intro,
    'condicoes', pg.condicoes,
    'contato_rotulo', pg.contato_rotulo,
    'contato_link', pg.contato_link,
    'pacotes', lista
  );
end;
$$;

revoke all on function public.orcamento_publico(text) from public;
grant execute on function public.orcamento_publico(text) to anon, authenticated;
