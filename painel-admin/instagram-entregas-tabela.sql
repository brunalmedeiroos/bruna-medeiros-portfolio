-- ---------------------------------------------------------------------
-- instagram-entregas-tabela.sql — Rode UMA VEZ no SQL Editor do seu
-- projeto Supabase.
-- ---------------------------------------------------------------------
-- Cria um log simples de cada tentativa de envio (resposta privada por
-- comentário, passo de fluxo, resposta pública no comentário), sucesso
-- ou falha, pra alimentar o card "Saúde do envio" da Visão Geral do
-- Instagram. Sem esse log, a gente só sabia quando um envio ficava na
-- fila (instagram_fila_envio) — não tinha como ver quantos deram erro,
-- nem qual foi o erro.

create table if not exists public.instagram_entregas (
  id bigserial primary key,
  automacao_id uuid references public.instagram_automacoes(id) on delete set null,
  ig_user_id text,
  canal text not null check (canal in ('privado', 'comentario_publico')),
  tipo text,
  status text not null check (status in ('ok', 'erro')),
  erro text,
  created_at timestamptz not null default now()
);

create index if not exists instagram_entregas_created_idx on public.instagram_entregas (created_at);

alter table public.instagram_entregas enable row level security;

drop policy if exists "Painel: leitura autenticada das entregas do Instagram" on public.instagram_entregas;
create policy "Painel: leitura autenticada das entregas do Instagram"
  on public.instagram_entregas for select to authenticated using (public.is_owner());
