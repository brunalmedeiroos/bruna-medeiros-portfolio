-- ---------------------------------------------------------------------
-- Extensão do Calendário: sincronização de verdade com o Google Agenda
-- (agenda dedicada "Creator Center", criada automaticamente na primeira
-- conexão). Rode este arquivo uma vez no SQL Editor do Supabase antes de
-- publicar a versão do painel/das Edge Functions que usam essas
-- colunas/tabelas.
-- ---------------------------------------------------------------------

-- ---- painel_tarefas: rastreio de sincronização com o Google ----
-- google_event_id: id do evento correspondente na agenda "Creator Center"
-- (null até a primeira sincronização bem-sucedida).
-- origem: de onde a linha veio — 'painel' (criada aqui, padrão) ou
-- 'google' (importada de um evento criado direto na Google Agenda).
-- google_updated_at: timestamp "updated" que o Google devolveu na última
-- vez que empurramos ou puxamos este evento — usado pra distinguir uma
-- edição de verdade feita direto no Google do eco da nossa própria
-- última gravação (evita loop de sincronização).
alter table public.painel_tarefas
  add column if not exists google_event_id text,
  add column if not exists origem text not null default 'painel' check (origem in ('painel', 'google')),
  add column if not exists google_updated_at timestamptz;

create unique index if not exists painel_tarefas_google_event_id_idx
  on public.painel_tarefas (google_event_id) where google_event_id is not null;

-- ---------------------------------------------------------------------
-- Tabelas: calendar_tokens e calendar_oauth_states (Calendário → Google Agenda)
-- Guardam o token OAuth da conexão com o Google Agenda, o id da agenda
-- "Creator Center" criada automaticamente, o "sync token" incremental do
-- Google, e o "state" (CSRF) do fluxo de conexão. Mesmo padrão de
-- email_tokens/instagram_tokens: propositalmente SEM nenhuma policy pra
-- authenticated/anon — só as Edge Functions (via service_role) acessam.
-- O navegador nunca lê o token, nem estando logada no painel.
-- ---------------------------------------------------------------------
create table if not exists public.calendar_tokens (
  id smallint primary key default 1,
  access_token text,
  refresh_token text not null,
  expires_at timestamptz not null,
  google_calendar_id text,
  sync_token text,
  updated_at timestamptz not null default now(),
  constraint calendar_tokens_singleton check (id = 1)
);

alter table public.calendar_tokens enable row level security;

create table if not exists public.calendar_oauth_states (
  state text primary key,
  created_at timestamptz not null default now()
);

alter table public.calendar_oauth_states enable row level security;
