-- Achados: marca o que é post (foto ou carrossel), pra não oferecer "Transcrever" nesses.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Não apaga nada: só adiciona uma coluna.

alter table public.planejador_achados add column if not exists post boolean not null default false;
