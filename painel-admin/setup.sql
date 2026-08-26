-- ==========================================================================
-- setup.sql — Rode este script no SQL Editor do seu projeto Supabase
-- ==========================================================================
-- Cria as tabelas usadas pelo painel administrativo (portfolio_events e
-- portfolio_leads), liga o Row Level Security e cria a policy de leitura
-- para usuários autenticados (quem faz login no painel).

-- ---------------------------------------------------------------------
-- Tabela: portfolio_events
-- Registra eventos do site: visualizações de página, cliques em botões
-- e visualizações de vídeo.
-- ---------------------------------------------------------------------
create table if not exists public.portfolio_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,        -- 'page_view' | 'button_click' | 'video_view'
  event_name text,                 -- nome do evento (ex: 'contact_whatsapp', id do vídeo no YouTube)
  session_id text,                 -- identifica um visitante dentro de uma sessão
  page_path text,                  -- caminho da página onde o evento ocorreu
  metadata jsonb,                  -- dados extras (ex: { "title": "...", "brand": "...", "category": "..." })
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabela: portfolio_leads
-- Registra as mensagens de contato enviadas pelo site (formulário ou popup).
-- ---------------------------------------------------------------------
create table if not exists public.portfolio_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  brand text,
  budget text,
  message text,
  source text,                     -- 'contact' | 'popup'
  created_at timestamptz not null default now()
);

-- Índices para acelerar a ordenação por data, usada na paginação do painel.
create index if not exists portfolio_events_created_at_idx on public.portfolio_events (created_at desc);
create index if not exists portfolio_leads_created_at_idx on public.portfolio_leads (created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.portfolio_events enable row level security;
alter table public.portfolio_leads enable row level security;

-- Permite que usuários autenticados (quem faz login no painel) LEIAM as duas tabelas.
create policy "Painel: leitura autenticada de eventos"
  on public.portfolio_events
  for select
  to authenticated
  using (true);

create policy "Painel: leitura autenticada de leads"
  on public.portfolio_leads
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- IMPORTANTE sobre a escrita dos dados
-- ---------------------------------------------------------------------
-- Propositalmente NÃO criamos nenhuma policy de INSERT para o papel "anon"
-- (público). Isso significa que o site do portfólio não deve gravar eventos
-- e leads diretamente do navegador usando a chave anon.
--
-- A gravação deve ser feita a partir de um servidor (uma function/rota do
-- seu backend, ou uma Edge Function do Supabase) usando a "service_role
-- key", que ignora o RLS. Isso evita que qualquer pessoa mande dados falsos
-- direto pelo console do navegador do site público.
