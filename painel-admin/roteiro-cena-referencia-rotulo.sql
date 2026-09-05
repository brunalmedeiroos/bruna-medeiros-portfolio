-- ==========================================================================
-- roteiro-cena-referencia-rotulo.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- referencias_imagens (array de texto, só a URL da imagem) vira jsonb
-- (array de objetos {url, rotulo}) — cada imagem de referência agora pode
-- ter uma etiqueta curta (ex: "Cenário", "Roupa", "Item"). Imagens já
-- anexadas antes viram {url: <a mesma URL>, rotulo: null} e podem receber
-- o rótulo depois, direto no painel.
-- Postgres não deixa usar subquery direto no "using" de um alter column
-- type, então faz em etapas: coluna nova, preenche com update, troca o
-- nome no lugar da antiga.
alter table public.ugc_roteiro_cenas
  add column referencias_imagens_novo jsonb not null default '[]'::jsonb;

update public.ugc_roteiro_cenas
set referencias_imagens_novo = coalesce(
  (select jsonb_agg(jsonb_build_object('url', u, 'rotulo', null)) from unnest(referencias_imagens) as u),
  '[]'::jsonb
);

alter table public.ugc_roteiro_cenas drop column referencias_imagens;
alter table public.ugc_roteiro_cenas rename column referencias_imagens_novo to referencias_imagens;

-- Atualiza a função de "apaga e reinsere as cenas" pra gravar
-- referencias_imagens como jsonb (array de {url, rotulo}) no lugar de
-- array de texto.
create or replace function public.ugc_substituir_cenas(p_roteiro_id uuid, p_cenas jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.ugc_roteiro_cenas where roteiro_id = p_roteiro_id;

  insert into public.ugc_roteiro_cenas (roteiro_id, ordem, fala, o_que_fazer, tipo_cena, descricao_cena, cena_gravada, cena_conferida, faixa_tempo, funcao_cena, referencias_imagens)
  select
    p_roteiro_id,
    (c->>'ordem')::int,
    c->>'fala',
    c->>'o_que_fazer',
    c->>'tipo_cena',
    c->>'descricao_cena',
    coalesce((c->>'cena_gravada')::boolean, false),
    coalesce((c->>'cena_conferida')::boolean, false),
    c->>'faixa_tempo',
    c->>'funcao_cena',
    coalesce(c->'referencias_imagens', '[]'::jsonb)
  from jsonb_array_elements(p_cenas) as c;
end;
$$;
