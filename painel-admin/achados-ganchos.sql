-- ---------------------------------------------------------------------
-- achados-ganchos.sql — Rode este arquivo UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ---------------------------------------------------------------------
-- Meus conteúdos > Achados > (filtro Gancho) > "Lista de ganchos": a sua lista
-- de ganchos, separada por objetivo (gerar curiosidade, vender, conexão...).
-- Só a conta dona do painel lê e escreve. É seguro rodar de novo.

create table if not exists public.planejador_ganchos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  objetivo text not null,
  texto text not null
);

create index if not exists planejador_ganchos_objetivo_idx on public.planejador_ganchos (objetivo);

alter table public.planejador_ganchos enable row level security;

drop policy if exists "Painel: leitura de ganchos" on public.planejador_ganchos;
drop policy if exists "Painel: criação de ganchos" on public.planejador_ganchos;
drop policy if exists "Painel: atualização de ganchos" on public.planejador_ganchos;
drop policy if exists "Painel: exclusão de ganchos" on public.planejador_ganchos;

create policy "Painel: leitura de ganchos"
  on public.planejador_ganchos for select to authenticated using (public.is_owner());
create policy "Painel: criação de ganchos"
  on public.planejador_ganchos for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização de ganchos"
  on public.planejador_ganchos for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão de ganchos"
  on public.planejador_ganchos for delete to authenticated using (public.is_owner());
