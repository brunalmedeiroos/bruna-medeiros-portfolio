-- ---------------------------------------------------------------------
-- Extensão do Calendário: recorrência (diária/semanal) e checklist de
-- subitens dentro de uma tarefa. Rode este arquivo uma vez no SQL
-- Editor do Supabase antes de publicar a versão do painel que usa
-- essas colunas/tabela.
-- ---------------------------------------------------------------------

-- ---- painel_tarefas: recorrência ----
-- serie_id agrupa todas as ocorrências geradas a partir da mesma tarefa
-- recorrente (fica null pra tarefas avulsas, sem repetição).
alter table public.painel_tarefas
  add column if not exists recorrencia text check (recorrencia in ('diaria', 'semanal')),
  add column if not exists serie_id uuid;

create index if not exists painel_tarefas_serie_id_idx on public.painel_tarefas (serie_id);

-- ---------------------------------------------------------------------
-- Tabela: painel_tarefas_checklist
-- Subitens marcáveis dentro de uma tarefa específica do Calendário
-- (cada ocorrência de uma série recorrente tem seus próprios itens).
-- ---------------------------------------------------------------------
create table if not exists public.painel_tarefas_checklist (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.painel_tarefas(id) on delete cascade,
  texto text not null,
  feito boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists painel_tarefas_checklist_tarefa_idx on public.painel_tarefas_checklist (tarefa_id, ordem);

alter table public.painel_tarefas_checklist enable row level security;

create policy "Painel: leitura autenticada de checklist de tarefas"
  on public.painel_tarefas_checklist
  for select
  to authenticated
  using (public.is_owner());

create policy "Painel: escrita autenticada de checklist de tarefas"
  on public.painel_tarefas_checklist
  for insert
  to authenticated
  with check (public.is_owner());

create policy "Painel: atualização autenticada de checklist de tarefas"
  on public.painel_tarefas_checklist
  for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Painel: exclusão autenticada de checklist de tarefas"
  on public.painel_tarefas_checklist
  for delete
  to authenticated
  using (public.is_owner());
