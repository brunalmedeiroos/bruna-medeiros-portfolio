-- ---------------------------------------------------------------------
-- Aba Afiliação: links de afiliada organizados por plataforma (ex:
-- Hotmart, Amazon...), com botão de copiar. "plataforma" é texto livre
-- (digitado pela Bru), não um enum fixo — a tela agrupa dinamicamente
-- pelos valores que já existem. Rode este arquivo uma vez no SQL Editor
-- do Supabase antes de publicar a versão do painel que usa esta tabela.
-- ---------------------------------------------------------------------

create table if not exists public.afiliacao_links (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null,
  nome text not null,
  url text not null,
  observacoes text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists afiliacao_links_plataforma_idx on public.afiliacao_links (plataforma, ordem);

alter table public.afiliacao_links enable row level security;

create policy "Painel: leitura autenticada de links de afiliação"
  on public.afiliacao_links
  for select
  to authenticated
  using (public.is_owner());

create policy "Painel: inserção autenticada de links de afiliação"
  on public.afiliacao_links
  for insert
  to authenticated
  with check (public.is_owner());

create policy "Painel: atualização autenticada de links de afiliação"
  on public.afiliacao_links
  for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "Painel: exclusão autenticada de links de afiliação"
  on public.afiliacao_links
  for delete
  to authenticated
  using (public.is_owner());
