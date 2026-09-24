-- abordagens.sql
-- Abordagens por marca (Base de contatos > detalhe da marca > "Abordagem").
-- Rodar no projeto principal (trfoymytrvdbslwizfqs), no SQL Editor do
-- Supabase, colando este arquivo inteiro de uma vez. É seguro rodar de novo.
-- Os modelos continuam em Ferramentas > Abordagem; aqui só fica o texto já
-- preenchido de cada marca (apagar a marca apaga as abordagens dela).

create table if not exists public.ugc_contato_abordagens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contato_id uuid not null references public.ugc_base_contatos(id) on delete cascade,
  canal text not null check (canal in ('email', 'whatsapp', 'instagram')),
  titulo text not null,
  modelo_id uuid,
  modelo_nome text,
  valores jsonb not null default '{}'::jsonb,
  conteudo text not null
);

create index if not exists ugc_contato_abordagens_contato_idx on public.ugc_contato_abordagens (contato_id);

alter table public.ugc_contato_abordagens enable row level security;

drop policy if exists "Painel: leitura autenticada de abordagens" on public.ugc_contato_abordagens;
create policy "Painel: leitura autenticada de abordagens"
  on public.ugc_contato_abordagens for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada de abordagens" on public.ugc_contato_abordagens;
create policy "Painel: escrita autenticada de abordagens"
  on public.ugc_contato_abordagens for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização autenticada de abordagens" on public.ugc_contato_abordagens;
create policy "Painel: atualização autenticada de abordagens"
  on public.ugc_contato_abordagens for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão autenticada de abordagens" on public.ugc_contato_abordagens;
create policy "Painel: exclusão autenticada de abordagens"
  on public.ugc_contato_abordagens for delete to authenticated using (public.is_owner());
