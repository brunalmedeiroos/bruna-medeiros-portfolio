-- disparo.sql
-- Envio de e-mail em massa pra base de contatos (aba E-mail do Creator
-- Center). Rodar no projeto principal (trfoymytrvdbslwizfqs), no SQL
-- Editor do Supabase, colando este arquivo inteiro de uma vez.

-- 1) Duas colunas novas na Base de Contatos (ugc_base_contatos), sem
-- apagar nada do que já existe: "selecionada" guarda quem foi marcada à
-- mão pra um disparo (fica salva mesmo fechando o painel), e
-- "ultimo_envio_email" guarda quando essa marca recebeu o último e-mail
-- de prospecção enviado por aqui.
alter table public.ugc_base_contatos
  add column if not exists selecionada boolean not null default false;
alter table public.ugc_base_contatos
  add column if not exists ultimo_envio_email date;

-- 2) Registro de cada envio: uma linha por destinatário, sempre, mesmo
-- quando dá erro. Sem isso, se um disparo morre no meio, não tem como
-- saber quem recebeu e quem não recebeu.
create table if not exists public.email_envios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  assunto text not null,
  status text not null check (status in ('ok', 'erro')),
  erro text,
  resend_id text
);

create index if not exists email_envios_email_idx on public.email_envios (email);
create index if not exists email_envios_assunto_idx on public.email_envios (assunto);

alter table public.email_envios enable row level security;

create policy "Painel: leitura autenticada de envios de e-mail"
  on public.email_envios for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de envios de e-mail"
  on public.email_envios for insert to authenticated with check (public.is_owner());

-- 3) Lista de quem pediu pra não receber mais (respondeu "SAIR"). Nunca
-- mais entra em nenhum disparo depois de estar aqui.
create table if not exists public.email_optout (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.email_optout enable row level security;

create policy "Painel: leitura autenticada de descadastro"
  on public.email_optout for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de descadastro"
  on public.email_optout for insert to authenticated with check (public.is_owner());
create policy "Painel: exclusão autenticada de descadastro"
  on public.email_optout for delete to authenticated using (public.is_owner());

-- 4) Remetente e e-mail de contato (reply-to) do disparo, na tabela de
-- configurações que já existe (painel_configuracoes, linha única id=1).
alter table public.painel_configuracoes add column if not exists email_remetente text;
alter table public.painel_configuracoes add column if not exists email_contato text;
