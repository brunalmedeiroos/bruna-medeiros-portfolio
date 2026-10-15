-- Avisos automáticos (compromissos do Calendário e tarefas pendentes às 8h).
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Não apaga nada: só adiciona uma coluna pro texto da notificação.

alter table public.painel_avisos add column if not exists corpo text;
