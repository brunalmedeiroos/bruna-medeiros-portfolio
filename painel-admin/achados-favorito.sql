-- ==========================================================================
-- achados-favorito.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Redesenho do Banco de Achados: cada achado pode ser marcado com um
-- coraçãozinho de favorito, pra filtrar só os melhores depois.

alter table public.planejador_achados
  add column if not exists favorito boolean not null default false;
