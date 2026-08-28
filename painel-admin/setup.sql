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

create policy "Painel: exclusão autenticada de mensagens"
  on public.portfolio_leads
  for delete
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

-- ---------------------------------------------------------------------
-- Tabela: painel_tarefas
-- Entregas e pendências da própria dona do painel (aba Calendário).
-- Só quem faz login no painel lê e escreve aqui — não tem relação com o
-- site público, por isso a policy libera leitura E escrita autenticada.
-- ---------------------------------------------------------------------
create table if not exists public.painel_tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'Compromisso',
  data date not null,
  hora_inicio time,
  hora_fim time,
  feito boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists painel_tarefas_data_idx on public.painel_tarefas (data);

alter table public.painel_tarefas enable row level security;

create policy "Painel: leitura autenticada de tarefas"
  on public.painel_tarefas
  for select
  to authenticated
  using (true);

create policy "Painel: escrita autenticada de tarefas"
  on public.painel_tarefas
  for insert
  to authenticated
  with check (true);

create policy "Painel: atualização autenticada de tarefas"
  on public.painel_tarefas
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Painel: exclusão autenticada de tarefas"
  on public.painel_tarefas
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- Tabelas: email_tokens e email_oauth_states (aba E-mail)
-- Guardam o token OAuth do Gmail e o "state" (CSRF) do fluxo de conexão.
-- Propositalmente SEM nenhuma policy pra authenticated/anon: só as Edge
-- Functions (via service_role, que ignora RLS) acessam essas tabelas. O
-- navegador nunca lê o token, nem estando logada no painel.
-- ---------------------------------------------------------------------
create table if not exists public.email_tokens (
  id smallint primary key default 1,
  access_token text,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint email_tokens_singleton check (id = 1)
);

alter table public.email_tokens enable row level security;

create table if not exists public.email_oauth_states (
  state text primary key,
  created_at timestamptz not null default now()
);

alter table public.email_oauth_states enable row level security;

-- ---------------------------------------------------------------------
-- Tabelas: instagram_tokens e instagram_oauth_states (aba Instagram)
-- Guardam o token de acesso da Página do Facebook vinculada à conta
-- Business do Instagram, e o "state" (CSRF) do fluxo de conexão. Assim
-- como as tabelas de e-mail, sem nenhuma policy pra authenticated/anon:
-- só as Edge Functions (via service_role) acessam.
-- ---------------------------------------------------------------------
create table if not exists public.instagram_tokens (
  id smallint primary key default 1,
  access_token text not null,
  ig_user_id text not null,
  ig_username text,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint instagram_tokens_singleton check (id = 1)
);

alter table public.instagram_tokens enable row level security;

create table if not exists public.instagram_oauth_states (
  state text primary key,
  created_at timestamptz not null default now()
);

alter table public.instagram_oauth_states enable row level security;

-- ---------------------------------------------------------------------
-- Tabelas: planejador_pilares, planejador_ideias e planejador_achados
-- (aba Planejador de Conteúdo)
-- Só quem faz login no painel lê e escreve aqui — mesmo padrão de
-- painel_tarefas (leitura e escrita autenticada, sem Edge Function).
-- ---------------------------------------------------------------------
create table if not exists public.planejador_pilares (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.planejador_ideias (
  id uuid primary key default gen_random_uuid(),
  pilar_id uuid not null references public.planejador_pilares(id) on delete cascade,
  titulo text not null,
  formato text,
  status text not null default 'Não iniciado',
  roteiro_breve text,
  roteiro_completo text,
  data_agendada date, -- dia marcado no calendário do Cronograma de Postagem, se houver
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists planejador_ideias_pilar_idx on public.planejador_ideias (pilar_id);

-- "Achados": pilares fixos (gancho, frase, formato, música, CTA), diferente
-- do Banco de Ideias onde os pilares são livres/criados pela Bruna.
create table if not exists public.planejador_achados (
  id uuid primary key default gen_random_uuid(),
  coluna text not null check (coluna in ('Gancho', 'Frase', 'Formato', 'Música', 'CTA')),
  conteudo text not null,
  observacoes text, -- espaço livre pra escrever o que viu, contexto, link, etc.
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.planejador_pilares enable row level security;
alter table public.planejador_ideias enable row level security;
alter table public.planejador_achados enable row level security;

create policy "Painel: leitura autenticada de pilares"
  on public.planejador_pilares for select to authenticated using (true);
create policy "Painel: escrita autenticada de pilares"
  on public.planejador_pilares for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de pilares"
  on public.planejador_pilares for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de pilares"
  on public.planejador_pilares for delete to authenticated using (true);

create policy "Painel: leitura autenticada de ideias"
  on public.planejador_ideias for select to authenticated using (true);
create policy "Painel: escrita autenticada de ideias"
  on public.planejador_ideias for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de ideias"
  on public.planejador_ideias for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de ideias"
  on public.planejador_ideias for delete to authenticated using (true);

create policy "Painel: leitura autenticada de achados"
  on public.planejador_achados for select to authenticated using (true);
create policy "Painel: escrita autenticada de achados"
  on public.planejador_achados for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de achados"
  on public.planejador_achados for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de achados"
  on public.planejador_achados for delete to authenticated using (true);

-- Pilares iniciais do Banco de Ideias (a Bruna pode renomear/excluir/criar novos pelo painel).
insert into public.planejador_pilares (nome, ordem)
select nome, ordem from (values
  ('Criação de conteúdo', 0),
  ('Edição e Audiovisual', 1),
  ('UGC', 2),
  ('Lifestyle de creator', 3)
) as padrao(nome, ordem)
where not exists (select 1 from public.planejador_pilares);

-- ---------------------------------------------------------------------
-- Tabela: planejador_cronograma (página "Cronograma de postagem")
-- Diz qual pilar postar em cada dia da semana; a tela de calendário do
-- painel só projeta essa relação nos dias reais do mês.
-- ---------------------------------------------------------------------
create table if not exists public.planejador_cronograma (
  id uuid primary key default gen_random_uuid(),
  pilar text not null,
  dia_semana text not null check (dia_semana in ('Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo')),
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.planejador_cronograma enable row level security;

create policy "Painel: leitura autenticada de cronograma"
  on public.planejador_cronograma for select to authenticated using (true);
create policy "Painel: escrita autenticada de cronograma"
  on public.planejador_cronograma for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de cronograma"
  on public.planejador_cronograma for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de cronograma"
  on public.planejador_cronograma for delete to authenticated using (true);

-- Cronograma inicial (a Bruna pode editar tudo pelo painel).
insert into public.planejador_cronograma (pilar, dia_semana, ordem)
select pilar, dia_semana, ordem from (values
  ('Autoridade', 'Segunda', 0),
  ('Conexão', 'Terça', 1),
  ('Desejo', 'Quarta', 2),
  ('Autoridade', 'Quinta', 3),
  ('Oferta (ou repetir outro)', 'Sexta', 4)
) as padrao(pilar, dia_semana, ordem)
where not exists (select 1 from public.planejador_cronograma);

-- ---------------------------------------------------------------------
-- Campo extra dos Achados: observações livres (o que viu, contexto, link)
-- (rode isto se a tabela planejador_achados já existia sem essa coluna)
-- ---------------------------------------------------------------------
alter table public.planejador_achados add column if not exists observacoes text;

-- ---------------------------------------------------------------------
-- Tabela: radar_noticias (aba Radar de Notícias)
-- Guarda as notícias já selecionadas e roteirizadas pelos 4 agentes
-- (Marketing Digital, Criação de Conteúdo, UGC/Creator Economy, IA e
-- Tecnologia). Quem escreve aqui é a Edge Function radar-atualizar
-- (via service_role); o painel só lê, marca como usada e exclui.
-- ---------------------------------------------------------------------
create table if not exists public.radar_noticias (
  id uuid primary key default gen_random_uuid(),
  agente text not null check (agente in ('Marketing Digital', 'Criação de Conteúdo', 'UGC e Creator Economy', 'IA e Tecnologia')),
  titulo text not null,
  resumo text,
  fonte text,
  link text,
  data_publicacao timestamptz,
  insight text, -- roteiro de reels (ou ideia de conteúdo/oferta, no caso do agente de IA) escrito pelo Gemini
  usada boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists radar_noticias_created_at_idx on public.radar_noticias (created_at desc);

alter table public.radar_noticias enable row level security;

create policy "Painel: leitura autenticada do radar"
  on public.radar_noticias for select to authenticated using (true);
create policy "Painel: escrita autenticada do radar"
  on public.radar_noticias for insert to authenticated with check (true);
create policy "Painel: atualização autenticada do radar"
  on public.radar_noticias for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada do radar"
  on public.radar_noticias for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- Aba UGC / Publi: acompanhamento de trabalhos de UGC e publicidade,
-- da prospecção até entrega e pagamento.
-- ---------------------------------------------------------------------

-- Tabela: ugc_trabalhos
create table if not exists public.ugc_trabalhos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  marca text not null,
  campanha text,
  produto text,
  tipo_trabalho text not null check (tipo_trabalho in ('UGC', 'Publicidade')),
  contato_email text,
  contato_whatsapp text,
  origem text check (origem in ('Inbound', 'Outbound', 'Indicação', 'Direto com a marca', 'Agência', 'Plataforma', 'Outro')),
  plataforma text, -- texto livre: ela pode cadastrar novas plataformas pelo painel, sem check fixo
  status text not null default 'Negociando' check (status in (
    'Negociando', 'Fechado', 'Aguardando briefing', 'Aguardando produto', 'Roteiro', 'Gravação',
    'Edição', 'Aprovação', 'Entregue', 'Aguardando pagamento', 'Pago', 'Cancelado'
  )),
  data_entrega date,
  valor numeric(10, 2),
  status_pagamento text not null default 'Pendente' check (status_pagamento in ('Pendente', 'Recebido')),
  forma_pagamento text,
  data_prevista_pagamento date,
  briefing_arquivo_path text,
  briefing_link text,
  briefing_recebido boolean not null default false,
  produto_recebido boolean not null default false,
  roteiro_criado boolean not null default false,
  roteiro_aprovado boolean not null default false,
  gravacao_feita boolean not null default false,
  edicao_feita boolean not null default false,
  conteudo_enviado_aprovacao boolean not null default false,
  alteracoes_feitas boolean not null default false,
  conteudo_entregue boolean not null default false
);

create index if not exists ugc_trabalhos_status_idx on public.ugc_trabalhos (status);
create index if not exists ugc_trabalhos_data_entrega_idx on public.ugc_trabalhos (data_entrega);

alter table public.ugc_trabalhos enable row level security;

create policy "Painel: leitura autenticada de trabalhos UGC"
  on public.ugc_trabalhos for select to authenticated using (true);
create policy "Painel: escrita autenticada de trabalhos UGC"
  on public.ugc_trabalhos for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de trabalhos UGC"
  on public.ugc_trabalhos for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de trabalhos UGC"
  on public.ugc_trabalhos for delete to authenticated using (true);

-- Tabela: ugc_roteiros (biblioteca de roteiros; trabalho_id é opcional —
-- pode existir roteiro solto, ainda não vinculado a um trabalho)
create table if not exists public.ugc_roteiros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trabalho_id uuid references public.ugc_trabalhos(id) on delete set null,
  marca text,
  produto text,
  campanha text,
  tipo_conteudo text,
  duracao_prevista text,
  objetivo text,
  observacoes text
);

create index if not exists ugc_roteiros_trabalho_id_idx on public.ugc_roteiros (trabalho_id);

alter table public.ugc_roteiros enable row level security;

create policy "Painel: leitura autenticada de roteiros UGC"
  on public.ugc_roteiros for select to authenticated using (true);
create policy "Painel: escrita autenticada de roteiros UGC"
  on public.ugc_roteiros for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de roteiros UGC"
  on public.ugc_roteiros for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de roteiros UGC"
  on public.ugc_roteiros for delete to authenticated using (true);

-- Tabela: ugc_roteiro_cenas (cenas de cada roteiro, na ordem de criação)
create table if not exists public.ugc_roteiro_cenas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  roteiro_id uuid not null references public.ugc_roteiros(id) on delete cascade,
  ordem int not null default 0,
  fala text,
  o_que_fazer text,
  cena_broll text,
  cena_gravada boolean not null default false,
  cena_conferida boolean not null default false
);

create index if not exists ugc_roteiro_cenas_roteiro_id_idx on public.ugc_roteiro_cenas (roteiro_id, ordem);

alter table public.ugc_roteiro_cenas enable row level security;

create policy "Painel: leitura autenticada de cenas UGC"
  on public.ugc_roteiro_cenas for select to authenticated using (true);
create policy "Painel: escrita autenticada de cenas UGC"
  on public.ugc_roteiro_cenas for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de cenas UGC"
  on public.ugc_roteiro_cenas for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de cenas UGC"
  on public.ugc_roteiro_cenas for delete to authenticated using (true);

-- Tabela: ugc_prospeccao (trabalho_id é preenchido quando a negociação
-- é convertida em trabalho, pelo botão "Transformar em trabalho")
create table if not exists public.ugc_prospeccao (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  marca text not null,
  contato text,
  origem text check (origem in ('Inbound', 'Outbound')),
  tipo_trabalho text check (tipo_trabalho in ('UGC', 'Publicidade')),
  data_contato date,
  status text not null default 'Para abordar' check (status in (
    'Para abordar', 'Contato enviado', 'Aguardando resposta', 'Respondeu', 'Negociação',
    'Proposta enviada', 'Fechado', 'Recusado', 'Sem resposta', 'Follow-up'
  )),
  valor_proposto numeric(10, 2),
  proximo_followup date,
  observacoes text,
  trabalho_id uuid references public.ugc_trabalhos(id) on delete set null
);

create index if not exists ugc_prospeccao_status_idx on public.ugc_prospeccao (status);

alter table public.ugc_prospeccao enable row level security;

create policy "Painel: leitura autenticada de prospecção UGC"
  on public.ugc_prospeccao for select to authenticated using (true);
create policy "Painel: escrita autenticada de prospecção UGC"
  on public.ugc_prospeccao for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de prospecção UGC"
  on public.ugc_prospeccao for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de prospecção UGC"
  on public.ugc_prospeccao for delete to authenticated using (true);

-- Tabela: ugc_contratos
create table if not exists public.ugc_contratos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trabalho_id uuid references public.ugc_trabalhos(id) on delete set null,
  marca text not null,
  campanha text,
  tipo_trabalho text check (tipo_trabalho in ('UGC', 'Publicidade')),
  data date,
  status text not null default 'Pendente assinatura' check (status in ('Pendente assinatura', 'Enviado', 'Assinado', 'Encerrado')),
  arquivo_path text,
  link text
);

create index if not exists ugc_contratos_status_idx on public.ugc_contratos (status);

alter table public.ugc_contratos enable row level security;

create policy "Painel: leitura autenticada de contratos UGC"
  on public.ugc_contratos for select to authenticated using (true);
create policy "Painel: escrita autenticada de contratos UGC"
  on public.ugc_contratos for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de contratos UGC"
  on public.ugc_contratos for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de contratos UGC"
  on public.ugc_contratos for delete to authenticated using (true);

-- Tabela: ugc_precos (catálogo editável; a categoria distingue as 3
-- seções mostradas na página Preços: UGC / Publicidade / Adicionais —
-- "Adicionais" é exibido no painel como "Condições/Direitos")
create table if not exists public.ugc_precos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  categoria text not null check (categoria in ('UGC', 'Publicidade', 'Adicionais')),
  servico text not null,
  valor numeric(10, 2),
  observacoes text,
  ordem int not null default 0
);

create index if not exists ugc_precos_categoria_idx on public.ugc_precos (categoria, ordem);

alter table public.ugc_precos enable row level security;

create policy "Painel: leitura autenticada de preços UGC"
  on public.ugc_precos for select to authenticated using (true);
create policy "Painel: escrita autenticada de preços UGC"
  on public.ugc_precos for insert to authenticated with check (true);
create policy "Painel: atualização autenticada de preços UGC"
  on public.ugc_precos for update to authenticated using (true) with check (true);
create policy "Painel: exclusão autenticada de preços UGC"
  on public.ugc_precos for delete to authenticated using (true);

-- Catálogo de preços inicial (a Bruna edita tudo pelo painel depois).
insert into public.ugc_precos (categoria, servico, ordem)
select categoria, servico, ordem from (values
  ('UGC', 'Vídeo UGC', 0),
  ('UGC', 'Foto', 1),
  ('UGC', 'Pacote de vídeos', 2),
  ('UGC', 'Pacote de fotos', 3),
  ('UGC', 'B-rolls', 4),
  ('UGC', 'Roteiro', 5),
  ('UGC', 'Edição', 6),
  ('UGC', 'Outros', 7),
  ('Publicidade', 'TikTok', 0),
  ('Publicidade', 'Reels', 1),
  ('Publicidade', 'Stories', 2),
  ('Publicidade', 'Pacote de Stories', 3),
  ('Publicidade', 'Pacote de conteúdo', 4),
  ('Publicidade', 'Outros', 5),
  ('Adicionais', 'Uso em anúncios', 0),
  ('Adicionais', 'Exclusividade', 1),
  ('Adicionais', 'Urgência', 2),
  ('Adicionais', 'Uso do conteúdo por período adicional', 3),
  ('Adicionais', 'Spark Ads/Whitelisting', 4)
) as padrao(categoria, servico, ordem)
where not exists (select 1 from public.ugc_precos);

-- Storage: bucket privado pra anexos de briefing e contrato (arquivo
-- fica salvo dentro do trabalho/contrato; como pode ter dado sensível
-- de cliente, o bucket é privado — o painel gera uma signed URL na
-- hora de abrir o arquivo, não fica um link público fixo).
insert into storage.buckets (id, name, public)
values ('ugc-arquivos', 'ugc-arquivos', false)
on conflict (id) do nothing;

drop policy if exists "Painel: leitura autenticada de arquivos UGC" on storage.objects;
create policy "Painel: leitura autenticada de arquivos UGC"
  on storage.objects for select to authenticated using (bucket_id = 'ugc-arquivos');
drop policy if exists "Painel: escrita autenticada de arquivos UGC" on storage.objects;
create policy "Painel: escrita autenticada de arquivos UGC"
  on storage.objects for insert to authenticated with check (bucket_id = 'ugc-arquivos');
drop policy if exists "Painel: atualização autenticada de arquivos UGC" on storage.objects;
create policy "Painel: atualização autenticada de arquivos UGC"
  on storage.objects for update to authenticated using (bucket_id = 'ugc-arquivos') with check (bucket_id = 'ugc-arquivos');
drop policy if exists "Painel: exclusão autenticada de arquivos UGC" on storage.objects;
create policy "Painel: exclusão autenticada de arquivos UGC"
  on storage.objects for delete to authenticated using (bucket_id = 'ugc-arquivos');

-- ---------------------------------------------------------------------
-- Agendamento: chama a Edge Function radar-atualizar todo dia às 7h30
-- (horário de Brasília = 10:30 UTC). Precisa das extensões pg_cron e
-- pg_net habilitadas no projeto (Database > Extensions no Supabase).
--
-- IMPORTANTE: NUNCA cole o segredo de verdade aqui neste arquivo (ele
-- fica no git). O mesmo valor precisa estar em dois lugares:
--   1. Como secret da Edge Function: supabase secrets set RADAR_CRON_SECRET=...
--   2. No Vault do Supabase, pra o cron conseguir usar (SQL Editor, rode só
--      uma vez, com o MESMO valor do passo 1 no lugar do texto):
--
--   select vault.create_secret('COLE_O_MESMO_VALOR_DO_RADAR_CRON_SECRET_AQUI', 'radar_cron_secret');
--
-- Troque também <PROJECT_REF> pela referência do seu projeto.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'radar-noticias-diario',
  '30 10 * * *', -- 10:30 UTC = 07:30 em Brasília
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/radar-atualizar',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'radar_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
