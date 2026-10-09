-- ==========================================================================
-- ugc-orcamento-pagina-v2.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs). Antes, rode ugc-pacotes-tabela.sql e
-- ugc-orcamento-pagina.sql.
-- ==========================================================================
-- Nova página de orçamento (apresentação comercial):
--  - cada pacote pode ter uma etiqueta de destaque ("Mais escolhido") e ser
--    mostrado como "pacote" (cards) ou "vídeo avulso" (seção discreta);
--  - a página ganha e-mail, Instagram e a frase final do contato;
--  - cadastra os pacotes Inicial, Creator, Premium e o vídeo avulso, já marcados
--    pra aparecer na página (só se ainda não existirem, e dá pra editar depois);
--  - preenche os textos da página só onde ainda estão no padrão ou vazios.
-- É seguro rodar de novo.

alter table public.ugc_pacotes add column if not exists destaque text;
alter table public.ugc_pacotes add column if not exists tipo text not null default 'pacote';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ugc_pacotes_tipo_check') then
    alter table public.ugc_pacotes add constraint ugc_pacotes_tipo_check check (tipo in ('pacote', 'avulso'));
  end if;
end
$$;

alter table public.orcamento_pagina add column if not exists contato_email text;
alter table public.orcamento_pagina add column if not exists contato_instagram text;
alter table public.orcamento_pagina add column if not exists frase_final text;

-- Textos da página (o que estiver entre *asteriscos* ganha o destaque colorido).
update public.orcamento_pagina set
  titulo = case when titulo is null or titulo = 'Orçamentos' then 'Vamos criar algo *incrível juntos?*' else titulo end,
  intro = case when intro is null or intro = 'Pacotes e valores de UGC e publicidade.' then 'Conheça as possibilidades de colaboração e encontre o formato ideal para a sua marca.' else intro end,
  frase_final = coalesce(frase_final, 'Vamos trabalhar juntos para dar vida às ideias *da sua marca?*'),
  contato_link = coalesce(nullif(contato_link, ''), '5585992805861'),
  contato_email = coalesce(contato_email, 'brunamedeirosugc@gmail.com'),
  contato_instagram = coalesce(contato_instagram, 'brunalmedeiroos');

-- Pacotes (valor bruto = vídeos x R$ 300; o valor final já tem o desconto).
insert into public.ugc_pacotes (created_at, nome, itens, desconto_pct, urgencia_pct, valor_bruto, valor_final, publicado, destaque, tipo)
select now() + interval '1 second', 'Inicial',
       '[{"servico":"Vídeos UGC","categoria":"UGC","quantidade":2,"valor_unitario":300},{"servico":"Direito de uso para anúncios por 3 meses","categoria":"Adicionais","quantidade":1,"valor_unitario":0}]'::jsonb,
       5, 0, 600, 570, true, null, 'pacote'
where not exists (select 1 from public.ugc_pacotes where nome = 'Inicial');

insert into public.ugc_pacotes (created_at, nome, itens, desconto_pct, urgencia_pct, valor_bruto, valor_final, publicado, destaque, tipo)
select now() + interval '2 seconds', 'Creator',
       '[{"servico":"Vídeos UGC","categoria":"UGC","quantidade":4,"valor_unitario":300},{"servico":"Direito de uso para anúncios por 6 meses","categoria":"Adicionais","quantidade":1,"valor_unitario":0}]'::jsonb,
       10, 0, 1200, 1080, true, 'Mais escolhido', 'pacote'
where not exists (select 1 from public.ugc_pacotes where nome = 'Creator');

insert into public.ugc_pacotes (created_at, nome, itens, desconto_pct, urgencia_pct, valor_bruto, valor_final, publicado, destaque, tipo)
select now() + interval '3 seconds', 'Premium',
       '[{"servico":"Vídeos UGC","categoria":"UGC","quantidade":6,"valor_unitario":300},{"servico":"Direito de uso para anúncios por 6 meses","categoria":"Adicionais","quantidade":1,"valor_unitario":0}]'::jsonb,
       15, 0, 1800, 1530, true, null, 'pacote'
where not exists (select 1 from public.ugc_pacotes where nome = 'Premium');

insert into public.ugc_pacotes (created_at, nome, itens, desconto_pct, urgencia_pct, valor_bruto, valor_final, publicado, destaque, tipo)
select now() + interval '4 seconds', 'Vídeo avulso',
       '[{"servico":"Vídeo UGC","categoria":"UGC","quantidade":1,"valor_unitario":300},{"servico":"Direito de uso para anúncios por 3 meses","categoria":"Adicionais","quantidade":1,"valor_unitario":0}]'::jsonb,
       0, 0, 300, 300, true, null, 'avulso'
where not exists (select 1 from public.ugc_pacotes where nome = 'Vídeo avulso');

-- Função da página pública: agora também devolve destaque, tipo, e-mail, Instagram e a frase final.
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
   where p.publicado;

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
