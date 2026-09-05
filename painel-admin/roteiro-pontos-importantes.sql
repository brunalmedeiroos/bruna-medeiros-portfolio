-- ==========================================================================
-- roteiro-pontos-importantes.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Novo campo pra registrar pontos importantes do briefing (coisas que a
-- marca pediu e precisam aparecer no vídeo). Diferente de "observações"
-- (uso interno, nunca sai do painel), esse campo é mostrado pra marca no
-- link de aprovação — ver roteiro-publico/index.ts.
alter table public.ugc_roteiros
  add column if not exists pontos_importantes text;
