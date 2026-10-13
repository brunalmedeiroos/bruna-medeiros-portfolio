-- Roteiros: guarda a capa do vídeo (imagem pequena) junto de cada roteiro.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.

alter table public.roteiros add column if not exists capa text;
