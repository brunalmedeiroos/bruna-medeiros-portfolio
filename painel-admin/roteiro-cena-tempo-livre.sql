-- ==========================================================================
-- roteiro-cena-tempo-livre.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- duracao_segundos (número, a faixa de tempo era calculada somando as
-- durações anteriores) vira faixa_tempo (texto livre, ex: "0-5s") — a Bruna
-- escreve a faixa exata que quiser, sem depender de preencher as cenas
-- anteriores em sequência pra funcionar. Valores numéricos já existentes
-- (ex: 10) viram texto ("10") e podem ser editados livremente depois.
alter table public.ugc_roteiro_cenas
  alter column duracao_segundos type text using duracao_segundos::text;
alter table public.ugc_roteiro_cenas
  rename column duracao_segundos to faixa_tempo;

-- Atualiza a função de "apaga e reinsere as cenas" pra gravar faixa_tempo
-- (texto) no lugar de duracao_segundos (número).
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
    coalesce(array(select jsonb_array_elements_text(c->'referencias_imagens')), '{}')
  from jsonb_array_elements(p_cenas) as c;
end;
$$;
