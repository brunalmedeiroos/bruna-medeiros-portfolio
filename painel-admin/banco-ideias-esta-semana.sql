-- ==========================================================================
-- banco-ideias-esta-semana.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- "Esta semana", no topo da Visão geral de Meus conteúdos: até 5 conteúdos
-- que você escolhe puxar pra focar agora (marcando com o 📌 no card). Aditivo:
-- não mexe em mais nada.

alter table public.ideias_conteudos add column if not exists esta_semana boolean not null default false;
