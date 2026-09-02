-- ---------------------------------------------------------------------
-- radar-pilar-sugerido.sql — Rode UMA VEZ no SQL Editor do Supabase.
-- ---------------------------------------------------------------------
-- Guarda o nome do pilar do Banco de Ideias que o Gemini sugere pra cada
-- achado do Radar, pra já vir pré-selecionado ao clicar em "Usar ideia".
alter table public.radar_noticias
  add column if not exists pilar_sugerido text;
