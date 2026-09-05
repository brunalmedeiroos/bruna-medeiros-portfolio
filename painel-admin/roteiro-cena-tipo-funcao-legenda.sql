-- ==========================================================================
-- roteiro-cena-tipo-funcao-legenda.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- 1) cena_broll (texto livre) vira tipo_cena (escolha fixa: Cena falada,
--    B-roll com narração, B-roll sem narração, Texto na tela). Dados
--    antigos continuam na coluna — só não aparecem mais no seletor até a
--    Bruna escolher uma opção nova pra cena.
alter table public.ugc_roteiro_cenas
  rename column cena_broll to tipo_cena;

-- 2) Função da cena na estrutura do vídeo (Hook, Desenvolvimento, CTA...).
alter table public.ugc_roteiro_cenas
  add column if not exists funcao_cena text;

-- 3) Sugestão de legenda do roteiro — visível pra marca no link, junto de
--    Objetivo e Pontos importantes (ver roteiro-publico/index.ts).
alter table public.ugc_roteiros
  add column if not exists sugestao_legenda text;

-- Atualiza a função de "apaga e reinsere as cenas" (ver
-- atomic-child-saves.sql e roteiro-cena-duracao.sql) pra usar tipo_cena no
-- lugar de cena_broll e também gravar funcao_cena.
create or replace function public.ugc_substituir_cenas(p_roteiro_id uuid, p_cenas jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.ugc_roteiro_cenas where roteiro_id = p_roteiro_id;

  insert into public.ugc_roteiro_cenas (roteiro_id, ordem, fala, o_que_fazer, tipo_cena, cena_gravada, cena_conferida, duracao_segundos, funcao_cena)
  select
    p_roteiro_id,
    (c->>'ordem')::int,
    c->>'fala',
    c->>'o_que_fazer',
    c->>'tipo_cena',
    coalesce((c->>'cena_gravada')::boolean, false),
    coalesce((c->>'cena_conferida')::boolean, false),
    (c->>'duracao_segundos')::int,
    c->>'funcao_cena'
  from jsonb_array_elements(p_cenas) as c;
end;
$$;
