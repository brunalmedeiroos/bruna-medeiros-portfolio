-- ==========================================================================
-- roteiro-status-visualizacoes.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Status do roteiro (Rascunho/Enviado/Aprovado/Ajustes pedidos) + registro de
-- quando a marca abre o link público (ugc_roteiro_visualizacoes), pra saber
-- se ela já viu sem precisar perguntar.

alter table public.ugc_roteiros
  add column if not exists status text not null default 'Rascunho'
  check (status in ('Rascunho', 'Enviado', 'Aprovado', 'Ajustes pedidos'));

-- created_at (não "visualizado_em") de propósito: o painel carrega toda
-- tabela de UGC com uma função genérica (buscarTudo) que sempre ordena por
-- created_at, então toda tabela nova do módulo usa esse nome de coluna.
create table if not exists public.ugc_roteiro_visualizacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  roteiro_id uuid not null references public.ugc_roteiros(id) on delete cascade
);

create index if not exists ugc_roteiro_visualizacoes_roteiro_id_idx
  on public.ugc_roteiro_visualizacoes (roteiro_id, created_at desc);

alter table public.ugc_roteiro_visualizacoes enable row level security;

create policy "Painel: leitura autenticada de visualizações de roteiro"
  on public.ugc_roteiro_visualizacoes for select to authenticated using (public.is_owner());

-- Sem policy de insert pra authenticated/anon: só a Edge Function
-- roteiro-publico grava aqui, usando a service role (supabaseAdmin), que
-- ignora RLS. Ninguém de fora consegue forjar uma visualização.
