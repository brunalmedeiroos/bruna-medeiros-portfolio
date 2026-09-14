-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.
--
-- 1) Categorias coloridas de tarefa (etiquetas estilo Google Agenda: nome +
--    cor, criadas livremente pela Bru na tela do Calendário).
-- 2) Liga cada tarefa a uma categoria (opcional — tarefas antigas continuam
--    sem categoria, sem quebrar nada).
-- 3) Recorrência semanal em mais de um dia da semana (ex.: toda segunda E
--    quarta E sexta), guardado como um array dos dias escolhidos.

create table if not exists public.painel_categorias_tarefa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#E07856' check (cor ~* '^#[0-9a-f]{6}$'),
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.painel_categorias_tarefa enable row level security;

create policy "Painel: leitura autenticada de categorias de tarefa"
  on public.painel_categorias_tarefa
  for select
  to authenticated
  using (public.is_owner());

create policy "Painel: escrita autenticada de categorias de tarefa"
  on public.painel_categorias_tarefa
  for insert
  to authenticated
  with check (public.is_owner());

create policy "Painel: atualização autenticada de categorias de tarefa"
  on public.painel_categorias_tarefa
  for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Painel: exclusão autenticada de categorias de tarefa"
  on public.painel_categorias_tarefa
  for delete
  to authenticated
  using (public.is_owner());

-- Cores escolhidas de propósito diferentes do coral padrão do painel
-- (#7DB7CE) usado quando uma tarefa não tem categoria — assim uma tarefa
-- "Trabalho" não fica visualmente idêntica a uma tarefa sem categoria.
insert into public.painel_categorias_tarefa (nome, cor, ordem) values
  ('Trabalho', '#6C63FF', 0),
  ('Reunião', '#E7A845', 1),
  ('Pessoal', '#4CAF7D', 2),
  ('Importante/Urgente', '#D9534F', 3);

alter table public.painel_tarefas
  add column if not exists categoria_id uuid references public.painel_categorias_tarefa(id) on delete set null;

alter table public.painel_tarefas
  add column if not exists dias_semana int[];
