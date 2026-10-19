-- ==========================================================================
-- ugc-orcamento-black-friday.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs), depois do ugc-orcamento-pagina-v3.sql.
-- ==========================================================================
-- Cria um SEGUNDO link de orçamento, só pros pacotes da Black Friday, no mesmo
-- estilo do primeiro (brunamedeiros.com/orcamento/?t=...):
--  - cada pacote ganha uma segunda marcação, "Mostrar na página Black Friday"
--    (um pacote pode aparecer em uma das páginas, nas duas ou em nenhuma);
--  - a tabela da página ganha o tipo (padrao ou blackfriday) e nasce a linha da
--    Black Friday, com link próprio, copiando seu WhatsApp, e-mail e Instagram;
--  - a função da página pública passa a mostrar os pacotes certos de cada link.
-- O link que você já usa continua igual. É seguro rodar de novo.

alter table public.ugc_pacotes add column if not exists publicado_bf boolean not null default false;

alter table public.orcamento_pagina add column if not exists tipo text not null default 'padrao';

alter table public.orcamento_pagina drop constraint if exists orcamento_pagina_tipo_check;
alter table public.orcamento_pagina add constraint orcamento_pagina_tipo_check check (tipo in ('padrao', 'blackfriday'));

create unique index if not exists orcamento_pagina_tipo_idx on public.orcamento_pagina (tipo);

-- A linha da Black Friday (token novo e aleatório, gerado sozinho).
insert into public.orcamento_pagina (tipo, titulo, intro, frase_final, contato_rotulo, contato_link, contato_email, contato_instagram)
select 'blackfriday',
       'Pacotes *Black Friday*',
       'Condições especiais por tempo limitado. Escolha o formato ideal para a sua marca.',
       p.frase_final, p.contato_rotulo, p.contato_link, p.contato_email, p.contato_instagram
  from public.orcamento_pagina p
 where p.tipo = 'padrao'
   and not exists (select 1 from public.orcamento_pagina where tipo = 'blackfriday')
 limit 1;

-- Função da página pública: cada link mostra só os pacotes marcados pra ele.
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
             'destaque', p.destaque,
             'tipo', p.tipo,
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
   where case when pg.tipo = 'blackfriday' then p.publicado_bf else p.publicado end;

  return jsonb_build_object(
    'titulo', pg.titulo,
    'intro', pg.intro,
    'condicoes', pg.condicoes,
    'frase_final', pg.frase_final,
    'contato_rotulo', pg.contato_rotulo,
    'contato_link', pg.contato_link,
    'contato_email', pg.contato_email,
    'contato_instagram', pg.contato_instagram,
    'pacotes', lista
  );
end;
$$;

revoke all on function public.orcamento_publico(text) from public;
grant execute on function public.orcamento_publico(text) to anon, authenticated;
