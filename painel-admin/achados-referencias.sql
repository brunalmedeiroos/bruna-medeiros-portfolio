-- Achados vira um banco de referências: link, capa do vídeo, como usar e como adaptar.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Não apaga nada: os achados que você já tem continuam como estão.

alter table public.planejador_achados add column if not exists url text;
alter table public.planejador_achados add column if not exists capa text;
alter table public.planejador_achados add column if not exists como_usar text;
alter table public.planejador_achados add column if not exists como_adaptar text;
