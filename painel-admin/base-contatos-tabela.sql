-- Base de contatos (dentro de UGC/Publicidade > Prospecção): agenda de
-- marcas contatadas ao longo do tempo, separada do funil de negociação que
-- já existe em ugc_prospeccao. Rodar no projeto principal do Creator Center
-- (trfoymytrvdbslwizfqs), não no projeto do Desafio UGC.

create table if not exists public.ugc_base_contatos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  marca text not null,
  instagram text,
  email text,
  telefone text,
  situacao text not null default 'Lead' check (situacao in ('Lead', 'Conversando', 'Cliente', 'Parada')),
  observacao text,
  ultimo_contato date
);

create index if not exists ugc_base_contatos_situacao_idx on public.ugc_base_contatos (situacao);

alter table public.ugc_base_contatos enable row level security;

create policy "Painel: leitura autenticada de base de contatos UGC"
  on public.ugc_base_contatos for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de base de contatos UGC"
  on public.ugc_base_contatos for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de base de contatos UGC"
  on public.ugc_base_contatos for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de base de contatos UGC"
  on public.ugc_base_contatos for delete to authenticated using (public.is_owner());
