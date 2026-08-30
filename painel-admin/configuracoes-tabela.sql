-- ==========================================================================
-- painel-admin/configuracoes-tabela.sql
-- ==========================================================================
-- Cria a tabela de configurações do painel (aparência, cor de ênfase,
-- idioma, fuso horário, início da semana, nome de exibição). Linha única
-- (id = 1), no mesmo espírito de outras tabelas de configuração do projeto.
-- Rode este script inteiro no SQL Editor do Supabase. É seguro rodar de novo
-- (create table if not exists / on conflict do nothing).

create table if not exists public.painel_configuracoes (
  id int primary key default 1,
  tema text not null default 'sistema' check (tema in ('claro', 'escuro', 'sistema')),
  cor_enfase text not null default '#7DB7CE',
  idioma text not null default 'pt' check (idioma in ('pt', 'en')),
  fuso_horario text not null default 'automatico',
  inicio_semana text not null default 'domingo' check (inicio_semana in ('domingo', 'segunda')),
  nome text,
  updated_at timestamptz not null default now(),
  constraint painel_configuracoes_singleton check (id = 1)
);

alter table public.painel_configuracoes enable row level security;

drop policy if exists "Painel: leitura autenticada de configurações" on public.painel_configuracoes;
drop policy if exists "Painel: escrita autenticada de configurações" on public.painel_configuracoes;
drop policy if exists "Painel: atualização autenticada de configurações" on public.painel_configuracoes;
drop policy if exists "Painel: exclusão autenticada de configurações" on public.painel_configuracoes;

create policy "Painel: leitura autenticada de configurações"
  on public.painel_configuracoes for select
  to authenticated
  using (public.is_owner());

create policy "Painel: escrita autenticada de configurações"
  on public.painel_configuracoes for insert
  to authenticated
  with check (public.is_owner());

create policy "Painel: atualização autenticada de configurações"
  on public.painel_configuracoes for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Painel: exclusão autenticada de configurações"
  on public.painel_configuracoes for delete
  to authenticated
  using (public.is_owner());

insert into public.painel_configuracoes (id) values (1)
  on conflict (id) do nothing;
