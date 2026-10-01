-- ==========================================================================
-- Financeiro > Extrato bancário (Pluggy / MeuPluggy)
-- ==========================================================================
-- Guarda os lançamentos puxados do Open Finance (via MeuPluggy) pela Edge
-- Function pluggy-sync. A classificação (negócio/pessoal) é da Bruna e NUNCA
-- é sobrescrita por uma nova sincronização — só os dados que vêm do banco
-- (descrição, valor, categoria da Pluggy) são atualizados no upsert.

create table if not exists public.financeiro_transacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  pluggy_transaction_id text not null unique,
  pluggy_item_id text not null,
  pluggy_account_id text not null,
  descricao text not null,
  valor numeric not null,
  tipo text not null check (tipo in ('DEBIT', 'CREDIT')),
  data date not null,
  categoria_pluggy text,
  -- null = ainda não classificada; a Bruna marca na interface.
  -- 'ignorado' = ela escolheu não classificar (ex: não lembra o que foi) —
  -- some de todas as listas, sem entrar em negócio nem pessoal.
  classificacao text check (classificacao in ('negocio', 'pessoal', 'ignorado'))
);

create index if not exists financeiro_transacoes_data_idx on public.financeiro_transacoes (data desc);
create index if not exists financeiro_transacoes_classificacao_idx on public.financeiro_transacoes (classificacao);

alter table public.financeiro_transacoes enable row level security;

-- Só leitura e reclassificação manual pela Bruna. Inserção/exclusão ficam só
-- com a service_role (a Edge Function pluggy-sync), pra ela nunca conseguir
-- (sem querer ou não) criar/apagar um lançamento bancário na mão.
create policy "Painel: leitura autenticada de transações financeiras"
  on public.financeiro_transacoes for select to authenticated using (public.is_owner());
create policy "Painel: atualização autenticada de transações financeiras (classificação)"
  on public.financeiro_transacoes for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------
-- Agendamento: chama a Edge Function pluggy-sync todo dia às 7h00
-- (horário de Brasília = 10:00 UTC) — mesmo ritmo de atualização que o
-- MeuPluggy já usa (dados atualizam a cada 24h do lado da Pluggy).
-- Mesmo esquema de segredo dos outros agendamentos deste projeto (Radar,
-- Automação do Instagram): o Claude já deixou os dois lados configurados
-- (secret da função + Vault) — você só precisa rodar o bloco abaixo,
-- trocando <PROJECT_REF> pela referência do projeto (trfoymytrvdbslwizfqs).
-- ---------------------------------------------------------------------
select cron.schedule(
  'pluggy-sync-diario',
  '0 10 * * *', -- 10:00 UTC = 07:00 em Brasília
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/pluggy-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'pluggy_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
