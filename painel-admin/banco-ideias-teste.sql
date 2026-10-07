-- ---------------------------------------------------------------------
-- Banco de ideias (teste): Quadros, Séries e Conteúdos organizados em pastas.
--
-- NÃO mexe no Banco de ideias atual: usa tabelas novas e separadas
-- (ideias_pastas e ideias_conteudos). planejador_pilares e planejador_ideias
-- ficam exatamente como estão.
--
-- ideias_pastas.grupo diz de qual das três pastas principais ela faz parte:
--   'quadro' = Quadros   (ex: "Como eu faria um vídeo para...")
--   'serie'  = Séries    (ex: "Minha jornada com o cabelo")
--   'tema'   = Conteúdos (ex: "Beleza", "Tech & Praticidade")
--
-- ideias_conteudos tem os mesmos campos da ideia do banco atual (título,
-- formato, status, roteiro breve, roteiro completo, já gravado), então o
-- mesmo editor de roteiro serve pros dois.
--
-- Pode rodar mais de uma vez sem problema (if not exists / drop policy).
-- ---------------------------------------------------------------------

create table if not exists public.ideias_pastas (
  id uuid primary key default gen_random_uuid(),
  grupo text not null check (grupo in ('quadro', 'serie', 'tema')),
  nome text not null,
  descricao text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ideias_conteudos (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.ideias_pastas(id) on delete cascade,
  titulo text not null,
  formato text,
  status text not null default 'Não iniciado',
  roteiro_breve text,
  roteiro_completo text,
  gravado boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ideias_pastas_grupo_idx on public.ideias_pastas (grupo);
create index if not exists ideias_conteudos_pasta_idx on public.ideias_conteudos (pasta_id);

alter table public.ideias_pastas enable row level security;
alter table public.ideias_conteudos enable row level security;

drop policy if exists "Painel: leitura de pastas de ideias" on public.ideias_pastas;
drop policy if exists "Painel: criação de pastas de ideias" on public.ideias_pastas;
drop policy if exists "Painel: atualização de pastas de ideias" on public.ideias_pastas;
drop policy if exists "Painel: exclusão de pastas de ideias" on public.ideias_pastas;

create policy "Painel: leitura de pastas de ideias"
  on public.ideias_pastas for select to authenticated using (public.is_owner());
create policy "Painel: criação de pastas de ideias"
  on public.ideias_pastas for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização de pastas de ideias"
  on public.ideias_pastas for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão de pastas de ideias"
  on public.ideias_pastas for delete to authenticated using (public.is_owner());

drop policy if exists "Painel: leitura de conteúdos de ideias" on public.ideias_conteudos;
drop policy if exists "Painel: criação de conteúdos de ideias" on public.ideias_conteudos;
drop policy if exists "Painel: atualização de conteúdos de ideias" on public.ideias_conteudos;
drop policy if exists "Painel: exclusão de conteúdos de ideias" on public.ideias_conteudos;

create policy "Painel: leitura de conteúdos de ideias"
  on public.ideias_conteudos for select to authenticated using (public.is_owner());
create policy "Painel: criação de conteúdos de ideias"
  on public.ideias_conteudos for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização de conteúdos de ideias"
  on public.ideias_conteudos for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão de conteúdos de ideias"
  on public.ideias_conteudos for delete to authenticated using (public.is_owner());
