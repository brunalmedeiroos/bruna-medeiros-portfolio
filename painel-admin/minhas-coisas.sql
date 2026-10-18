-- ---------------------------------------------------------------------
-- minhas-coisas.sql — Rode este arquivo UMA VEZ no SQL Editor do seu
-- projeto Supabase antes de usar o botão "Minhas coisas" da aba Clientes.
-- ---------------------------------------------------------------------
-- Cria a tabela das notas (título, texto e a lista de arquivos anexados).
-- Os arquivos em si ficam no bucket privado ugc-arquivos (o mesmo dos
-- contratos), dentro da pasta minhas-coisas/, então não precisa criar
-- bucket nem política de armazenamento nova.

create table if not exists public.minhas_coisas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  titulo text not null default '',
  conteudo text not null default '',
  arquivos jsonb not null default '[]'::jsonb  -- [{ "path", "nome", "tamanho", "tipo" }]
);

create index if not exists minhas_coisas_atualizado_idx on public.minhas_coisas (atualizado_em desc);

alter table public.minhas_coisas enable row level security;

create policy "Painel: leitura autenticada de minhas coisas"
  on public.minhas_coisas for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de minhas coisas"
  on public.minhas_coisas for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de minhas coisas"
  on public.minhas_coisas for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de minhas coisas"
  on public.minhas_coisas for delete to authenticated using (public.is_owner());
