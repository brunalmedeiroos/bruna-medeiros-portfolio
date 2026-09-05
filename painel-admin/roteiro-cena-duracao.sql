-- ==========================================================================
-- roteiro-cena-duracao.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Duração de cada cena em segundos. A faixa de tempo (ex: "0-10s", "10-17s")
-- é calculada no painel/link somando as durações das cenas anteriores —
-- não fica guardada pronta, só o valor que a Bruna digita por cena.
alter table public.ugc_roteiro_cenas
  add column if not exists duracao_segundos int;

-- Atualiza a função de "apaga e reinsere as cenas" (ver atomic-child-saves.sql)
-- pra também gravar duracao_segundos.
create or replace function public.ugc_substituir_cenas(p_roteiro_id uuid, p_cenas jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.ugc_roteiro_cenas where roteiro_id = p_roteiro_id;

  insert into public.ugc_roteiro_cenas (roteiro_id, ordem, fala, o_que_fazer, cena_broll, cena_gravada, cena_conferida, duracao_segundos)
  select
    p_roteiro_id,
    (c->>'ordem')::int,
    c->>'fala',
    c->>'o_que_fazer',
    c->>'cena_broll',
    coalesce((c->>'cena_gravada')::boolean, false),
    coalesce((c->>'cena_conferida')::boolean, false),
    (c->>'duracao_segundos')::int
  from jsonb_array_elements(p_cenas) as c;
end;
$$;
