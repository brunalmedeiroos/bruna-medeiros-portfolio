-- Gerador de Carrossel: o nome da referência volta.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Só acrescenta a coluna do nome (opcional) na biblioteca de referências. Não apaga nada.

alter table public.carrossel_referencias add column if not exists titulo text not null default '';
