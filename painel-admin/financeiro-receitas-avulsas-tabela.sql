-- ==========================================================================
-- financeiro-receitas-avulsas-tabela.sql — Rode UMA VEZ no SQL Editor do
-- Supabase (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Nova aba Financeiro: receita avulsa é um lançamento manual de dinheiro que
-- entrou fora de um trabalho de marca (que já vem de ugc_trabalhos). Conta
-- sempre como "recebido" no mês da data informada.

create table if not exists public.financeiro_receitas_avulsas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  descricao text not null,
  valor numeric(10, 2) not null,
  data date not null
);

alter table public.financeiro_receitas_avulsas enable row level security;

drop policy if exists "Painel: leitura autenticada de receitas avulsas" on public.financeiro_receitas_avulsas;
drop policy if exists "Painel: escrita autenticada de receitas avulsas" on public.financeiro_receitas_avulsas;
drop policy if exists "Painel: atualização autenticada de receitas avulsas" on public.financeiro_receitas_avulsas;
drop policy if exists "Painel: exclusão autenticada de receitas avulsas" on public.financeiro_receitas_avulsas;

create policy "Painel: leitura autenticada de receitas avulsas"
  on public.financeiro_receitas_avulsas for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de receitas avulsas"
  on public.financeiro_receitas_avulsas for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de receitas avulsas"
  on public.financeiro_receitas_avulsas for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de receitas avulsas"
  on public.financeiro_receitas_avulsas for delete to authenticated using (public.is_owner());
