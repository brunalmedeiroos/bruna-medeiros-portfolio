-- ==========================================================================
-- Metas e Hábitos
-- ==========================================================================
-- "Concluída" não é uma coluna — é calculado na interface (valor_atual >=
-- valor_objetivo), pra nunca ficar dessincronizado.
-- Marcar/desmarcar um hábito como feito no dia é inserir/apagar a linha
-- correspondente em painel_habito_registros (por isso essa tabela não tem
-- policy de update).

create table if not exists public.painel_metas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nome text not null,
  categoria text not null check (categoria in ('trabalho', 'dinheiro', 'pessoal')),
  valor_atual numeric not null default 0,
  valor_objetivo numeric not null,
  unidade text,
  prazo date,
  -- só metas marcadas como principal aparecem no bloco "Principais metas" da Visão Geral.
  principal boolean not null default false,
  icone text
);

create index if not exists painel_metas_categoria_idx on public.painel_metas (categoria);

alter table public.painel_metas enable row level security;

drop policy if exists "Painel: leitura autenticada de metas" on public.painel_metas;
create policy "Painel: leitura autenticada de metas"
  on public.painel_metas for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada de metas" on public.painel_metas;
create policy "Painel: escrita autenticada de metas"
  on public.painel_metas for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada de metas" on public.painel_metas;
create policy "Painel: atualização autenticada de metas"
  on public.painel_metas for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada de metas" on public.painel_metas;
create policy "Painel: exclusão autenticada de metas"
  on public.painel_metas for delete to authenticated using (public.is_owner());

create table if not exists public.painel_habitos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null
);

alter table public.painel_habitos enable row level security;

drop policy if exists "Painel: leitura autenticada de hábitos" on public.painel_habitos;
create policy "Painel: leitura autenticada de hábitos"
  on public.painel_habitos for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada de hábitos" on public.painel_habitos;
create policy "Painel: escrita autenticada de hábitos"
  on public.painel_habitos for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada de hábitos" on public.painel_habitos;
create policy "Painel: atualização autenticada de hábitos"
  on public.painel_habitos for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada de hábitos" on public.painel_habitos;
create policy "Painel: exclusão autenticada de hábitos"
  on public.painel_habitos for delete to authenticated using (public.is_owner());

create table if not exists public.painel_habito_registros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  habito_id uuid not null references public.painel_habitos(id) on delete cascade,
  data date not null,
  unique (habito_id, data)
);

create index if not exists painel_habito_registros_habito_idx on public.painel_habito_registros (habito_id, data);

alter table public.painel_habito_registros enable row level security;

drop policy if exists "Painel: leitura autenticada de registros de hábito" on public.painel_habito_registros;
create policy "Painel: leitura autenticada de registros de hábito"
  on public.painel_habito_registros for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada de registros de hábito" on public.painel_habito_registros;
create policy "Painel: escrita autenticada de registros de hábito"
  on public.painel_habito_registros for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada de registros de hábito" on public.painel_habito_registros;
create policy "Painel: exclusão autenticada de registros de hábito"
  on public.painel_habito_registros for delete to authenticated using (public.is_owner());
