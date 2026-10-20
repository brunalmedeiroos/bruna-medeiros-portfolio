-- ==========================================================================
-- ugc-orcamento-tipo-publico.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs), depois do ugc-orcamento-black-friday.sql.
-- ==========================================================================
-- A página pública de orçamento passa a saber se o link é o normal ou o da
-- Black Friday (a função agora devolve o "tipo"). A faixa "Veja os pacotes da
-- Black Friday" só aparece no link normal e leva pro link da Black Friday (a
-- função devolve esse link, só pra quem abriu o link normal). No link da Black
-- Friday a faixa não aparece. Se o link da Black Friday estiver desligado, a
-- faixa some. Não muda nenhum pacote nem nenhum link. É seguro rodar de novo.

create or replace function public.orcamento_publico(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pg public.orcamento_pagina;
  lista jsonb;
  token_bf text;
begin
  select * into pg from public.orcamento_pagina where token = p_token and ativa limit 1;
  if not found then
    return null;
  end if;

  -- o link da Black Friday (se estiver ligado), pra faixa do link normal levar até ele
  select token into token_bf from public.orcamento_pagina where tipo = 'blackfriday' and ativa limit 1;

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
    'tipo_pagina', pg.tipo,
    'link_black_friday', case when pg.tipo = 'blackfriday' then null else token_bf end,
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
