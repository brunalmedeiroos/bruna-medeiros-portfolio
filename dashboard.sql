-- dashboard.sql
-- Dashboard: checklist do dia e Nota rápida. Rodar no projeto principal
-- (trfoymytrvdbslwizfqs), no SQL Editor do Supabase, colando este arquivo
-- inteiro de uma vez. É seguro rodar de novo. O checklist é separado do
-- Calendário e não sincroniza com o Google Agenda.

-- 1) Checklist do dia (uma linha por tarefa; o painel só mostra as de hoje)
create table if not exists public.painel_checklist_dia (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  data date not null,
  texto text not null,
  feito boolean not null default false
);

create index if not exists painel_checklist_dia_data_idx on public.painel_checklist_dia (data);

alter table public.painel_checklist_dia enable row level security;

drop policy if exists "Painel: leitura autenticada do checklist do dia" on public.painel_checklist_dia;
create policy "Painel: leitura autenticada do checklist do dia"
  on public.painel_checklist_dia for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada do checklist do dia" on public.painel_checklist_dia;
create policy "Painel: escrita autenticada do checklist do dia"
  on public.painel_checklist_dia for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada do checklist do dia" on public.painel_checklist_dia;
create policy "Painel: atualização autenticada do checklist do dia"
  on public.painel_checklist_dia for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada do checklist do dia" on public.painel_checklist_dia;
create policy "Painel: exclusão autenticada do checklist do dia"
  on public.painel_checklist_dia for delete to authenticated using (public.is_owner());

-- 2) Notas rápidas (o texto inteiro fica em "conteudo"; o título é a 1ª linha)
create table if not exists public.painel_notas_rapidas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  conteudo text not null default ''
);

alter table public.painel_notas_rapidas enable row level security;

drop policy if exists "Painel: leitura autenticada de notas rápidas" on public.painel_notas_rapidas;
create policy "Painel: leitura autenticada de notas rápidas"
  on public.painel_notas_rapidas for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada de notas rápidas" on public.painel_notas_rapidas;
create policy "Painel: escrita autenticada de notas rápidas"
  on public.painel_notas_rapidas for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada de notas rápidas" on public.painel_notas_rapidas;
create policy "Painel: atualização autenticada de notas rápidas"
  on public.painel_notas_rapidas for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada de notas rápidas" on public.painel_notas_rapidas;
create policy "Painel: exclusão autenticada de notas rápidas"
  on public.painel_notas_rapidas for delete to authenticated using (public.is_owner());
