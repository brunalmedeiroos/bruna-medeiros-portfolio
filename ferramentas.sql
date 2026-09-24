-- ferramentas.sql
-- Área "Ferramentas" do painel (pastas, ferramentas e Cofre privado).
-- Rodar no projeto principal (trfoymytrvdbslwizfqs), no SQL Editor do
-- Supabase, colando este arquivo inteiro de uma vez. É seguro rodar de
-- novo (create table if not exists). Nenhuma pasta nem ferramenta é criada
-- aqui: só a estrutura, o conteúdo é cadastrado por você no painel.

-- 1) Pastas ---------------------------------------------------------------
create table if not exists public.ferramentas_pastas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  cor text,
  ordem integer not null default 0
);

alter table public.ferramentas_pastas enable row level security;

drop policy if exists "Painel: leitura autenticada de pastas de ferramentas" on public.ferramentas_pastas;
create policy "Painel: leitura autenticada de pastas de ferramentas"
  on public.ferramentas_pastas for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada de pastas de ferramentas" on public.ferramentas_pastas;
create policy "Painel: escrita autenticada de pastas de ferramentas"
  on public.ferramentas_pastas for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada de pastas de ferramentas" on public.ferramentas_pastas;
create policy "Painel: atualização autenticada de pastas de ferramentas"
  on public.ferramentas_pastas for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada de pastas de ferramentas" on public.ferramentas_pastas;
create policy "Painel: exclusão autenticada de pastas de ferramentas"
  on public.ferramentas_pastas for delete to authenticated using (public.is_owner());

-- 2) Ferramentas (uma linha por item; apagar a pasta apaga os itens dela).
-- "dados" guarda o que cada tipo tem de próprio (itens do checklist, etapas
-- do processo), pra não obrigar todos os tipos ao mesmo formato.
create table if not exists public.ferramentas_itens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  pasta_id uuid not null references public.ferramentas_pastas(id) on delete cascade,
  tipo text not null check (tipo in ('prompt', 'prompt_campos', 'texto', 'link', 'checklist', 'processo', 'nota', 'outro')),
  nome text not null,
  descricao text,
  plataforma text,
  conteudo text,
  url text,
  dados jsonb not null default '{}'::jsonb,
  favorito boolean not null default false,
  ordem integer not null default 0
);

create index if not exists ferramentas_itens_pasta_idx on public.ferramentas_itens (pasta_id);
create index if not exists ferramentas_itens_favorito_idx on public.ferramentas_itens (favorito) where favorito;

alter table public.ferramentas_itens enable row level security;

drop policy if exists "Painel: leitura autenticada de ferramentas" on public.ferramentas_itens;
create policy "Painel: leitura autenticada de ferramentas"
  on public.ferramentas_itens for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada de ferramentas" on public.ferramentas_itens;
create policy "Painel: escrita autenticada de ferramentas"
  on public.ferramentas_itens for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada de ferramentas" on public.ferramentas_itens;
create policy "Painel: atualização autenticada de ferramentas"
  on public.ferramentas_itens for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada de ferramentas" on public.ferramentas_itens;
create policy "Painel: exclusão autenticada de ferramentas"
  on public.ferramentas_itens for delete to authenticated using (public.is_owner());

-- 3) Cofre privado ----------------------------------------------------------
-- As credenciais são cifradas NO NAVEGADOR (AES-256-GCM, chave derivada da
-- sua senha mestra com PBKDF2), antes de chegar no Supabase. O banco só
-- guarda texto cifrado: nem o Supabase, nem quem vir a tabela, consegue ler
-- as senhas sem a senha mestra. A senha mestra não é guardada em lugar
-- nenhum (se for esquecida, o conteúdo do cofre não tem como ser recuperado).

-- Linha única com o "sal" da chave e um verificador (um texto conhecido,
-- cifrado) usado só pra conferir se a senha mestra digitada está certa.
create table if not exists public.cofre_config (
  id integer primary key default 1 check (id = 1),
  created_at timestamptz not null default now(),
  salt text not null,
  iteracoes integer not null,
  verificador_iv text not null,
  verificador text not null
);

alter table public.cofre_config enable row level security;

drop policy if exists "Painel: leitura autenticada da config do cofre" on public.cofre_config;
create policy "Painel: leitura autenticada da config do cofre"
  on public.cofre_config for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada da config do cofre" on public.cofre_config;
create policy "Painel: escrita autenticada da config do cofre"
  on public.cofre_config for insert to authenticated with check (public.is_owner());

-- Cada credencial: tudo (serviço, categoria, URL, usuário, senha, observação)
-- vai junto num único bloco cifrado.
create table if not exists public.cofre_itens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  iv text not null,
  dados text not null
);

alter table public.cofre_itens enable row level security;

drop policy if exists "Painel: leitura autenticada do cofre" on public.cofre_itens;
create policy "Painel: leitura autenticada do cofre"
  on public.cofre_itens for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada do cofre" on public.cofre_itens;
create policy "Painel: escrita autenticada do cofre"
  on public.cofre_itens for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada do cofre" on public.cofre_itens;
create policy "Painel: atualização autenticada do cofre"
  on public.cofre_itens for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada do cofre" on public.cofre_itens;
create policy "Painel: exclusão autenticada do cofre"
  on public.cofre_itens for delete to authenticated using (public.is_owner());
