-- ---------------------------------------------------------------------
-- instagram-automacoes-tabela.sql — Rode este arquivo UMA VEZ no SQL
-- Editor do seu projeto Supabase antes de publicar a versão do painel
-- que tem Automações/Leads na aba Instagram.
-- ---------------------------------------------------------------------
-- Cria as tabelas do motor "comentário → resposta privada": as regras
-- (instagram_automacoes), o CRM simples de quem foi impactado
-- (instagram_leads) e um controle de idempotência (
-- instagram_comentarios_processados) pra nunca processar o mesmo
-- comentário duas vezes.

create table if not exists public.instagram_automacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  palavra_gatilho text not null,
  media_id text, -- null = vale pra qualquer post; senão, só nesse post específico
  media_legenda text, -- snippet salvo na hora de criar, só pra mostrar na lista sem nova chamada à API
  mensagem text not null,
  ativo boolean not null default true
);

create index if not exists instagram_automacoes_ativo_idx on public.instagram_automacoes (ativo);

alter table public.instagram_automacoes enable row level security;

create policy "Painel: leitura autenticada de automações do Instagram"
  on public.instagram_automacoes for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de automações do Instagram"
  on public.instagram_automacoes for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de automações do Instagram"
  on public.instagram_automacoes for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de automações do Instagram"
  on public.instagram_automacoes for delete to authenticated using (public.is_owner());

-- Tabela: instagram_leads (uma linha por conta que já interagiu com
-- alguma automação — "interacoes" acumula a cada novo comentário que bate
-- com uma regra, "recebeu" fica true assim que a resposta privada sai
-- com sucesso pelo menos uma vez)
create table if not exists public.instagram_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conta text not null,
  origem text not null default 'Comentário' check (origem in ('Comentário', 'Direct')),
  palavra text,
  automacao_id uuid references public.instagram_automacoes(id) on delete set null,
  recebeu boolean not null default false,
  interacoes int not null default 1,
  ultima_vez timestamptz not null default now()
);

create unique index if not exists instagram_leads_conta_idx on public.instagram_leads (conta);

alter table public.instagram_leads enable row level security;

create policy "Painel: leitura autenticada de leads do Instagram"
  on public.instagram_leads for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de leads do Instagram"
  on public.instagram_leads for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de leads do Instagram"
  on public.instagram_leads for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de leads do Instagram"
  on public.instagram_leads for delete to authenticated using (public.is_owner());

-- Tabela: instagram_comentarios_processados (ledger de idempotência —
-- garante que um comentário nunca gera duas respostas privadas, mesmo
-- se o processamento periódico rodar em cima do mesmo comentário de
-- novo antes dele sair da janela de 7 dias)
create table if not exists public.instagram_comentarios_processados (
  comentario_id text primary key,
  processado_em timestamptz not null default now()
);

alter table public.instagram_comentarios_processados enable row level security;

create policy "Painel: leitura autenticada de comentários processados"
  on public.instagram_comentarios_processados for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de comentários processados"
  on public.instagram_comentarios_processados for insert to authenticated with check (public.is_owner());
create policy "Painel: exclusão autenticada de comentários processados"
  on public.instagram_comentarios_processados for delete to authenticated using (public.is_owner());

-- ---------------------------------------------------------------------
-- Agendamento: chama a Edge Function instagram-automacao-processar a
-- cada 10 minutos (não dá pra usar webhook em tempo real sem o app
-- estar em modo "Live" aprovado pela Meta — ver conversa no painel).
-- Mesmo esquema do cron do Radar de Notícias, já configurado no seu
-- projeto (setup.sql) — reaproveita as extensões pg_cron/pg_net que já
-- estão habilitadas.
--
-- IMPORTANTE: troque <PROJECT_REF> pela referência do seu projeto antes
-- de rodar. O segredo (instagram_automacao_cron_secret) é configurado
-- separadamente — se você recebeu esse arquivo já com o valor preenchido
-- abaixo, é porque o Claude configurou o secret da Edge Function pra
-- você nessa mesma sessão; senão, troque o texto de exemplo pelo mesmo
-- valor usado em "supabase secrets set INSTAGRAM_AUTOMACAO_CRON_SECRET=...".
select cron.schedule(
  'instagram-automacao-processar-periodico',
  '*/10 * * * *', -- a cada 10 minutos
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/instagram-automacao-processar',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_automacao_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
