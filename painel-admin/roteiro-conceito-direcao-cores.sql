-- ==========================================================================
-- roteiro-conceito-direcao-cores.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Três campos novos pro redesenho do link de aprovação (Roteiro de
-- Gravação): conceito (a ideia central do vídeo), direção de cena (cenário,
-- luz, figurino, edição — como um todo, não por cena) e cores (paleta do
-- produto/vídeo, vários tons com rótulo, diferente de marca_cor que é só
-- UM tom usado como identidade visual da página).
alter table public.ugc_roteiros
  add column if not exists conceito text;

alter table public.ugc_roteiros
  add column if not exists direcao_cena text;

alter table public.ugc_roteiros
  add column if not exists cores jsonb not null default '[]'::jsonb;
