-- ==========================================================================
-- financeiro-despesas-tabela.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Nova aba Financeiro: despesas são 100% cadastro manual (não vêm mais do
-- extrato bancário via Pluggy). Cada linha é um lançamento com descrição,
-- valor, categoria (lista fixa, escolhida no painel) e data.

create table if not exists public.financeiro_despesas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  descricao text not null,
  valor numeric(10, 2) not null,
  categoria text,
  data date not null
);

alter table public.financeiro_despesas enable row level security;

drop policy if exists "Painel: leitura autenticada de despesas" on public.financeiro_despesas;
drop policy if exists "Painel: escrita autenticada de despesas" on public.financeiro_despesas;
drop policy if exists "Painel: atualização autenticada de despesas" on public.financeiro_despesas;
drop policy if exists "Painel: exclusão autenticada de despesas" on public.financeiro_despesas;

create policy "Painel: leitura autenticada de despesas"
  on public.financeiro_despesas for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de despesas"
  on public.financeiro_despesas for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de despesas"
  on public.financeiro_despesas for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de despesas"
  on public.financeiro_despesas for delete to authenticated using (public.is_owner());
