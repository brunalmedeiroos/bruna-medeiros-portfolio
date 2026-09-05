-- ==========================================================================
-- roteiro-comentarios.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Comentários que a marca deixa na página pública do roteiro
-- (/roteiro/?id=...&token=...), sem precisar de login. Só a Edge Function
-- roteiro-comentar grava aqui (via service role) — ela confere que o
-- share_token bate e que o link ainda não expirou antes de aceitar.
create table if not exists public.ugc_roteiro_comentarios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  roteiro_id uuid not null references public.ugc_roteiros(id) on delete cascade,
  autor text,
  mensagem text not null
);

create index if not exists ugc_roteiro_comentarios_roteiro_id_idx
  on public.ugc_roteiro_comentarios (roteiro_id, created_at desc);

alter table public.ugc_roteiro_comentarios enable row level security;

create policy "Painel: leitura autenticada de comentários de roteiro"
  on public.ugc_roteiro_comentarios for select to authenticated using (public.is_owner());

-- Sem policy de insert pra authenticated/anon: só a Edge Function grava,
-- usando a service role (supabaseAdmin), que ignora RLS.
