-- ---------------------------------------------------------------------
-- instagram-automacoes-fluxo.sql — Rode este arquivo UMA VEZ no SQL
-- Editor do seu projeto Supabase antes de publicar a versão do painel
-- com o novo motor de Automações do Instagram (conversa com botões,
-- link em tempo real via webhook, freio de envio e fila).
--
-- Este arquivo SUBSTITUI o motor simples criado em
-- instagram-automacoes-tabela.sql (uma regra = uma palavra = uma
-- mensagem única) por um motor de conversa com botões (estilo
-- ManyChat): cada automação guarda um "fluxo" (flow, jsonb) com uma ou
-- várias mensagens, cada uma podendo ter botões que abrem um link ou
-- avançam pra outra mensagem.
--
-- SEGURO RODAR MESMO JÁ TENDO RODADO instagram-automacoes-tabela.sql
-- antes: usa "add column if not exists" e migra os dados antigos
-- (palavra_gatilho, media_id, mensagem) pro novo formato antes de
-- remover essas colunas. Nada é perdido.
-- ---------------------------------------------------------------------

-- ============================================================
-- 1) instagram_automacoes: acrescenta o fluxo e os campos novos
-- ============================================================

alter table public.instagram_automacoes
  add column if not exists match_any boolean not null default false,
  add column if not exists media_ids text[] not null default '{}',
  add column if not exists flow jsonb,
  add column if not exists resposta_comentario text,
  add column if not exists resposta_comentario_variantes text[] not null default '{}',
  add column if not exists asset_ids text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

-- Migra as automações antigas (mensagem única) pro formato de fluxo:
-- um fluxo com só o passo 1, sem botão (a pessoa edita e adiciona o
-- botão depois, pelo editor novo).
update public.instagram_automacoes
set
  flow = jsonb_build_object('steps', jsonb_build_array(jsonb_build_object('id', 1, 'message', mensagem, 'buttons', '[]'::jsonb))),
  media_ids = case when media_id is not null then array[media_id] else '{}' end
where flow is null;

-- As colunas antigas somem: a partir de agora tudo mora em "flow".
alter table public.instagram_automacoes
  drop column if exists mensagem,
  drop column if exists media_id;

comment on column public.instagram_automacoes.palavra_gatilho is
  'Palavras-gatilho separadas por vírgula. Ignorado quando match_any = true.';
comment on column public.instagram_automacoes.flow is
  'A conversa inteira: { steps: [ { id, message, buttons: [{title, next?, url?}], assets?, collect?, delay? }, ... ] }. O passo 0 do array é sempre a Mensagem 1.';

-- ============================================================
-- 2) instagram_leads: passa a rastrear pelo ig_user_id (o id que
--    chega nos eventos do webhook) e guarda em que passo da conversa
--    a pessoa está, além de dados capturados (email, telefone).
-- ============================================================

alter table public.instagram_leads
  add column if not exists ig_user_id text,
  add column if not exists flow_step text,
  add column if not exists expecting jsonb,
  add column if not exists link_enviado boolean not null default false,
  add column if not exists tags text[] not null default '{}',
  add column if not exists email text,
  add column if not exists telefone text;

-- Único por ig_user_id quando ele existe (novos leads, vindos do
-- webhook); leads antigos, sem ig_user_id, continuam só com o índice
-- por conta que já existia.
create unique index if not exists instagram_leads_ig_user_id_idx
  on public.instagram_leads (ig_user_id) where ig_user_id is not null;

comment on column public.instagram_leads.ig_user_id is
  'O IGSID (id numérico da conta no Instagram) que vem nos eventos do webhook. É a chave real de rastreio da conversa — "conta" (username) é só pra exibição e nem sempre vem preenchido pela Meta.';

-- ============================================================
-- 3) instagram_fila_envio: fila do freio de envio. Toda vez que uma
--    resposta privada por comentário não consegue ficha na hora, cai
--    aqui pra o instagram-scheduler tentar de novo minuto a minuto.
-- ============================================================

create table if not exists public.instagram_fila_envio (
  id uuid primary key default gen_random_uuid(),
  comentario_id text unique,
  automacao_id uuid references public.instagram_automacoes(id) on delete set null,
  ig_user_id text not null,
  username text,
  payload jsonb not null,
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'erro', 'expirado')),
  tentativas int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text
);

create index if not exists instagram_fila_envio_status_idx on public.instagram_fila_envio (status);

alter table public.instagram_fila_envio enable row level security;

drop policy if exists "Painel: leitura autenticada da fila do Instagram" on public.instagram_fila_envio;
create policy "Painel: leitura autenticada da fila do Instagram"
  on public.instagram_fila_envio for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada da fila do Instagram" on public.instagram_fila_envio;
create policy "Painel: escrita autenticada da fila do Instagram"
  on public.instagram_fila_envio for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ============================================================
-- 4) instagram_agendados: passos da conversa com atraso (delay), que
--    o instagram-scheduler dispara sozinho quando a hora chega.
-- ============================================================

create table if not exists public.instagram_agendados (
  id uuid primary key default gen_random_uuid(),
  ig_user_id text not null,
  automacao_id uuid references public.instagram_automacoes(id) on delete cascade,
  step_id int not null,
  send_at timestamptz not null,
  enviado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists instagram_agendados_pendentes_idx
  on public.instagram_agendados (send_at) where enviado = false;

alter table public.instagram_agendados enable row level security;

drop policy if exists "Painel: leitura autenticada dos agendados do Instagram" on public.instagram_agendados;
create policy "Painel: leitura autenticada dos agendados do Instagram"
  on public.instagram_agendados for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada dos agendados do Instagram" on public.instagram_agendados;
create policy "Painel: escrita autenticada dos agendados do Instagram"
  on public.instagram_agendados for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ============================================================
-- 5) instagram_freio: o "balde de fichas" do freio de envio. Sem
--    essa tabela e as duas funções abaixo, NENHUMA resposta privada
--    por comentário sai (o freio falha fechado por segurança).
-- ============================================================

create table if not exists public.instagram_freio (
  id text primary key,
  min_contagem int not null default 0,
  min_inicio timestamptz not null default now(),
  hora_contagem int not null default 0,
  hora_inicio timestamptz not null default now(),
  dia_contagem int not null default 0,
  dia_inicio timestamptz not null default now(),
  falhas_seguidas int not null default 0,
  teto_minuto int not null default 6,
  teto_hora int not null default 60,
  teto_dia int not null default 180,
  pausado_ate timestamptz
);

alter table public.instagram_freio enable row level security;

drop policy if exists "Painel: leitura autenticada do freio do Instagram" on public.instagram_freio;
create policy "Painel: leitura autenticada do freio do Instagram"
  on public.instagram_freio for select to authenticated using (public.is_owner());

insert into public.instagram_freio (id) values ('privado') on conflict (id) do nothing;

-- Tenta pegar uma ficha de envio pra "chave" p_chave (ex: 'privado').
-- Respeita os tetos por minuto/hora/dia e o disjuntor (pausado_ate).
-- Retorna true se pode enviar agora, false se deve esperar/entrar na fila.
create or replace function public.instagram_tirar_ficha(p_chave text)
returns boolean
language plpgsql
as $$
declare
  linha record;
  agora timestamptz := now();
begin
  insert into public.instagram_freio (id) values (p_chave) on conflict (id) do nothing;

  select * into linha from public.instagram_freio where id = p_chave for update;

  if linha.pausado_ate is not null and linha.pausado_ate > agora then
    return false;
  end if;

  if agora - linha.min_inicio >= interval '1 minute' then
    linha.min_contagem := 0;
    update public.instagram_freio set min_contagem = 0, min_inicio = agora where id = p_chave;
  end if;
  if agora - linha.hora_inicio >= interval '1 hour' then
    linha.hora_contagem := 0;
    update public.instagram_freio set hora_contagem = 0, hora_inicio = agora where id = p_chave;
  end if;
  if agora - linha.dia_inicio >= interval '1 day' then
    linha.dia_contagem := 0;
    update public.instagram_freio set dia_contagem = 0, dia_inicio = agora where id = p_chave;
  end if;

  if linha.min_contagem >= linha.teto_minuto
     or linha.hora_contagem >= linha.teto_hora
     or linha.dia_contagem >= linha.teto_dia then
    return false;
  end if;

  update public.instagram_freio
    set min_contagem = min_contagem + 1,
        hora_contagem = hora_contagem + 1,
        dia_contagem = dia_contagem + 1
    where id = p_chave;

  return true;
end;
$$;

-- Registra o resultado de um envio pra alimentar o disjuntor: falhas
-- "duras" (ex: bloqueio da Meta) seguidas pausam os envios por um
-- tempo; um envio ok zera a sequência de falhas.
create or replace function public.instagram_registrar_envio(p_chave text, p_ok boolean, p_falha_grave boolean default false)
returns void
language plpgsql
as $$
begin
  insert into public.instagram_freio (id) values (p_chave) on conflict (id) do nothing;

  if p_ok then
    update public.instagram_freio set falhas_seguidas = 0 where id = p_chave;
  elsif p_falha_grave then
    update public.instagram_freio
      set falhas_seguidas = falhas_seguidas + 1,
          pausado_ate = case when falhas_seguidas + 1 >= 3 then now() + interval '3 hours' else pausado_ate end
      where id = p_chave;
  end if;
end;
$$;

revoke execute on function public.instagram_tirar_ficha(text) from public;
revoke execute on function public.instagram_registrar_envio(text, boolean, boolean) from public;
grant execute on function public.instagram_tirar_ficha(text) to service_role, authenticated;
grant execute on function public.instagram_registrar_envio(text, boolean, boolean) to service_role, authenticated;

-- ============================================================
-- 6) instagram_envios_bot: ids das mensagens que o PRÓPRIO sistema
--    mandou (mid). O webhook grava aqui cada envio; ao receber um
--    evento de mensagem, confere essa tabela pra ignorar o "echo"
--    (aviso de que a própria conta mandou aquela mensagem) e não se
--    confundir com uma resposta manual sua.
-- ============================================================

create table if not exists public.instagram_envios_bot (
  mid text primary key,
  created_at timestamptz not null default now()
);

alter table public.instagram_envios_bot enable row level security;

drop policy if exists "Painel: leitura autenticada dos envios do bot" on public.instagram_envios_bot;
create policy "Painel: leitura autenticada dos envios do bot"
  on public.instagram_envios_bot for select to authenticated using (public.is_owner());

-- Ledger cresce pra sempre — mantém só os últimos 30 dias por padrão
-- (chame isso manualmente de vez em quando, ou agende se quiser).
create index if not exists instagram_envios_bot_created_idx on public.instagram_envios_bot (created_at);

-- ============================================================
-- 7) instagram_arquivos: biblioteca simples de anexos (imagem, áudio,
--    vídeo ou arquivo) pra usar nos passos do fluxo. Guarda só a URL
--    pública do arquivo (ex: um link do seu Supabase Storage ou de
--    onde você já hospeda mídia) — o upload em si não faz parte
--    deste painel ainda.
-- ============================================================

create table if not exists public.instagram_arquivos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('image', 'audio', 'video', 'file')),
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.instagram_arquivos enable row level security;

drop policy if exists "Painel: leitura autenticada dos arquivos do Instagram" on public.instagram_arquivos;
create policy "Painel: leitura autenticada dos arquivos do Instagram"
  on public.instagram_arquivos for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita autenticada dos arquivos do Instagram" on public.instagram_arquivos;
create policy "Painel: escrita autenticada dos arquivos do Instagram"
  on public.instagram_arquivos for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ============================================================
-- 8) Agendamento (pg_cron + pg_net, já habilitados pelo setup.sql):
--    troca o cron antigo (que chamava instagram-automacao-processar
--    a cada 10 min, por polling) pelo novo instagram-scheduler, que
--    roda a cada 1 min: esvazia a fila do freio e dispara os passos
--    agendados. A detecção de comentário/mensagem em si passa a ser
--    em tempo real, pelo instagram-webhook (configurado no Meta for
--    Developers — ver LEIA-ME).
--
-- Reaproveita o MESMO segredo já criado no Vault pra
-- instagram-automacao-processar (instagram_automacao_cron_secret) —
-- não precisa criar um segredo novo. Se por algum motivo esse
-- segredo ainda não existe no seu projeto, troque o valor de exemplo
-- abaixo pelo mesmo usado em
-- "supabase secrets set INSTAGRAM_AUTOMACAO_CRON_SECRET=...".
-- ============================================================

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'instagram_automacao_cron_secret') then
    perform vault.create_secret('COLE_O_MESMO_VALOR_DO_INSTAGRAM_AUTOMACAO_CRON_SECRET_AQUI', 'instagram_automacao_cron_secret');
  end if;
end $$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'instagram-automacao-processar-periodico') then
    perform cron.unschedule('instagram-automacao-processar-periodico');
  end if;
end $$;

select cron.schedule(
  'instagram-scheduler-periodico',
  '* * * * *', -- a cada 1 minuto
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/instagram-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_automacao_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Lembrete: troque <PROJECT_REF> pela referência do seu projeto Supabase
-- antes de rodar este arquivo (o mesmo valor que aparece na URL do seu
-- painel do Supabase, algo como "abcdefghijklmnop").
