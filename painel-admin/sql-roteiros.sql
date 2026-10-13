-- ==========================================================================
-- sql-roteiros.sql: rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Cria a biblioteca de roteiros (Meus conteúdos > Roteiros) e a tabela de
-- configurações onde fica a chave da Supadata. Só você, logada, lê e escreve:
-- nada fica aberto pra quem não fez login. É seguro rodar de novo.

-- 1) Biblioteca de roteiros (transcrições de vídeos, seus e de outras creators)
create table if not exists public.roteiros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fonte text check (fonte in ('instagram', 'tiktok', 'youtube', 'manual')),
  url text,
  perfil text,
  de_quem text not null default 'outra' check (de_quem in ('minha', 'outra')),
  titulo text,
  transcricao text,
  legenda text,
  postado_em date,
  tags text[] not null default '{}',
  obs text,
  status text not null default 'pronto' check (status in ('processando', 'pronto', 'falhou')),
  erro text,
  segmentos jsonb
);

create index if not exists roteiros_created_at_idx on public.roteiros (created_at desc);

-- 2) Configurações do painel em formato chave e valor (guarda a chave da Supadata)
create table if not exists public.configuracoes (
  chave text primary key,
  valor text,
  updated_at timestamptz not null default now()
);

-- 3) Segurança: RLS ligado nas duas, e nada pra quem não está logada (anon).
--    Usa public.is_owner(), a mesma regra das outras tabelas do painel.
alter table public.roteiros enable row level security;
alter table public.configuracoes enable row level security;

drop policy if exists "Roteiros: leitura" on public.roteiros;
drop policy if exists "Roteiros: inserção" on public.roteiros;
drop policy if exists "Roteiros: atualização" on public.roteiros;
drop policy if exists "Roteiros: exclusão" on public.roteiros;

create policy "Roteiros: leitura" on public.roteiros
  for select to authenticated using (public.is_owner());
create policy "Roteiros: inserção" on public.roteiros
  for insert to authenticated with check (public.is_owner());
create policy "Roteiros: atualização" on public.roteiros
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Roteiros: exclusão" on public.roteiros
  for delete to authenticated using (public.is_owner());

drop policy if exists "Configurações: leitura" on public.configuracoes;
drop policy if exists "Configurações: inserção" on public.configuracoes;
drop policy if exists "Configurações: atualização" on public.configuracoes;
drop policy if exists "Configurações: exclusão" on public.configuracoes;

create policy "Configurações: leitura" on public.configuracoes
  for select to authenticated using (public.is_owner());
create policy "Configurações: inserção" on public.configuracoes
  for insert to authenticated with check (public.is_owner());
create policy "Configurações: atualização" on public.configuracoes
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Configurações: exclusão" on public.configuracoes
  for delete to authenticated using (public.is_owner());
