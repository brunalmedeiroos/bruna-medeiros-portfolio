-- ---------------------------------------------------------------------
-- Tabelas: tiktok_tokens e tiktok_oauth_states (aba TikTok)
-- Guardam o token de acesso da conta do TikTok e o "state" (CSRF) do
-- fluxo de conexão. Mesmo padrão das tabelas do Instagram
-- (instagram_tokens / instagram_oauth_states, em setup.sql): sem
-- nenhuma policy pra authenticated/anon — só as Edge Functions (via
-- service_role) acessam.
--
-- Rode este arquivo uma vez no SQL Editor do Supabase antes de clicar em
-- "Conectar TikTok" pela primeira vez.
-- ---------------------------------------------------------------------
create table if not exists public.tiktok_tokens (
  id smallint primary key default 1,
  access_token text not null,
  refresh_token text not null,
  tiktok_open_id text not null,
  tiktok_username text,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint tiktok_tokens_singleton check (id = 1)
);

alter table public.tiktok_tokens enable row level security;

create table if not exists public.tiktok_oauth_states (
  state text primary key,
  created_at timestamptz not null default now()
);

alter table public.tiktok_oauth_states enable row level security;
