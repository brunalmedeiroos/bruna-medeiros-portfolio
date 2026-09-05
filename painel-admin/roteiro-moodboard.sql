-- ==========================================================================
-- roteiro-moodboard.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Moodboard geral do roteiro: referências que valem pro vídeo inteiro
-- (cenário, vibe, paleta...), separadas das referências de cada cena
-- (que continuam em ugc_roteiro_cenas.referencias_imagens, opcionais por
-- cena). Mesmo formato jsonb: array de {url, rotulo}.
alter table public.ugc_roteiros
  add column if not exists moodboard_imagens jsonb not null default '[]'::jsonb;
