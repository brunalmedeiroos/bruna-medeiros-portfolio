-- ==========================================================================
-- sql-roteiros-estrutura.sql: rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs), depois do sql-roteiros.sql.
-- ==========================================================================
-- Guarda a estrutura de cada vídeo da biblioteca de Roteiros: tipo do gancho,
-- gancho, desenvolvimento, CTA, expressões e "por que prende".
-- Os roteiros que já existem ficam com a estrutura vazia. É seguro rodar de novo.

alter table public.roteiros add column if not exists estrutura jsonb;
