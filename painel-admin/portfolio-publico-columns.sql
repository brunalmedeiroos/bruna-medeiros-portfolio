-- ==========================================================================
-- portfolio-publico-columns.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Campos usados pra marcar um Trabalho como visível no portfólio público do
-- site. A função pública portfolio-publico só lê marca + esses 3 campos —
-- nunca valor, contato, observações ou qualquer outro dado sensível.
alter table public.ugc_trabalhos
  add column if not exists publicavel boolean not null default false,
  add column if not exists portfolio_youtube_id text,
  add column if not exists portfolio_categoria text check (portfolio_categoria in ('tech', 'beleza', 'entretenimento', 'experiencia'));
