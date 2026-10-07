-- ---------------------------------------------------------------------
-- Banco de ideias (teste): pastas principais editáveis.
--
-- Até agora Quadros, Séries e Conteúdos eram fixas no código. Esta tabela
-- guarda as pastas da tela principal, então elas passam a poder ser criadas,
-- renomeadas, recoloridas e excluídas. Rode DEPOIS do banco-ideias-teste.sql.
--
-- Não apaga nem altera nenhum dado. As pastas e conteúdos que você já criou
-- continuam no lugar: Quadros, Séries e Conteúdos entram aqui com a mesma
-- "chave" que eles já usavam (quadro, serie, tema).
--
-- Pode rodar mais de uma vez sem problema.
-- ---------------------------------------------------------------------

create table if not exists public.ideias_grupos (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique, -- liga as pastas de dentro (ideias_pastas.grupo) a esta pasta principal
  nome text not null,
  cor text not null default '#7DB7CE',
  emoji text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- Antes só valia quadro/serie/tema; agora as pastas principais novas também
-- ganham uma chave própria.
alter table public.ideias_pastas drop constraint if exists ideias_pastas_grupo_check;

alter table public.ideias_grupos enable row level security;

drop policy if exists "Painel: leitura de pastas principais de ideias" on public.ideias_grupos;
drop policy if exists "Painel: criação de pastas principais de ideias" on public.ideias_grupos;
drop policy if exists "Painel: atualização de pastas principais de ideias" on public.ideias_grupos;
drop policy if exists "Painel: exclusão de pastas principais de ideias" on public.ideias_grupos;

create policy "Painel: leitura de pastas principais de ideias"
  on public.ideias_grupos for select to authenticated using (public.is_owner());
create policy "Painel: criação de pastas principais de ideias"
  on public.ideias_grupos for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização de pastas principais de ideias"
  on public.ideias_grupos for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão de pastas principais de ideias"
  on public.ideias_grupos for delete to authenticated using (public.is_owner());

-- As três pastas de hoje entram só na primeira vez (se você apagar uma
-- depois, ela não volta sozinha).
insert into public.ideias_grupos (chave, nome, cor, ordem)
select chave, nome, cor, ordem from (values
  ('quadro', 'Quadros', '#7DB7CE', 0),
  ('serie', 'Séries', '#04465D', 1),
  ('tema', 'Conteúdos', '#FFF7C5', 2)
) as padrao(chave, nome, cor, ordem)
where not exists (select 1 from public.ideias_grupos);
