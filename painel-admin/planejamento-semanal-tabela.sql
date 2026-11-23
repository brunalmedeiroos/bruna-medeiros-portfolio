-- ==========================================================================
-- planejamento-semanal-tabela.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs). Pode rodar de novo sem problema.
-- ==========================================================================
-- Agente de sugestão semanal: toda segunda de manhã (e também quando você
-- pedir pelo botão "Gerar agora"), a Edge Function planejamento-semanal
-- olha seus achados ainda não usados, as ideias já salvas, o que já foi
-- postado e as notícias do Radar ainda não usadas, e grava aqui até 6
-- sugestões (ideias novas pra criar, ou achados pra reaproveitar).
--
-- Reaproveita a GEMINI_API_KEY que o Radar de Notícias já usa — não precisa
-- configurar nenhuma chave nova. O agendamento abaixo reaproveita o mesmo
-- segredo de cron do Radar (radar_cron_secret), já configurado no Vault.

create table if not exists public.planejamento_semanal (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  semana date not null,                 -- segunda-feira da semana a que a sugestão pertence
  tipo text not null check (tipo in ('ideia', 'achado')),
  titulo text not null,
  descricao text,                       -- por que essa ideia/achado faz sentido agora, e como executar
  pilar_sugerido text,
  achado_id uuid references public.planejador_achados(id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'descartada'))
);

-- Guarda qual ideia (em ideias_conteudos) nasceu de uma sugestão do tipo
-- "ideia" quando ela é aceita, pra poder abrir de novo depois (botão Abrir).
alter table public.planejamento_semanal
  add column if not exists ideia_criada_id uuid references public.ideias_conteudos(id) on delete set null;

create index if not exists planejamento_semanal_semana_idx on public.planejamento_semanal (semana desc);
create index if not exists planejamento_semanal_status_idx on public.planejamento_semanal (status);

alter table public.planejamento_semanal enable row level security;

drop policy if exists "Painel: leitura do planejamento semanal" on public.planejamento_semanal;
create policy "Painel: leitura do planejamento semanal"
  on public.planejamento_semanal for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita do planejamento semanal" on public.planejamento_semanal;
create policy "Painel: escrita do planejamento semanal"
  on public.planejamento_semanal for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização do planejamento semanal" on public.planejamento_semanal;
create policy "Painel: atualização do planejamento semanal"
  on public.planejamento_semanal for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão do planejamento semanal" on public.planejamento_semanal;
create policy "Painel: exclusão do planejamento semanal"
  on public.planejamento_semanal for delete to authenticated using (public.is_owner());

grant select, insert, update, delete on public.planejamento_semanal to authenticated;
grant select, insert, update, delete on public.planejamento_semanal to service_role;

-- Agendamento: toda segunda às 07:30 de Brasília (10:30 UTC), chama a Edge
-- Function planejamento-semanal. Mesmo esquema do cron do Radar: troque
-- <PROJECT_REF> pela referência do seu projeto (trfoymytrvdbslwizfqs).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'planejamento-semanal-segunda') then
    perform cron.unschedule('planejamento-semanal-segunda');
  end if;
end $$;

select cron.schedule(
  'planejamento-semanal-segunda',
  '30 10 * * 1', -- 10:30 UTC = 07:30 em Brasília, só às segundas
  $$
  select net.http_post(
    url := 'https://trfoymytrvdbslwizfqs.supabase.co/functions/v1/planejamento-semanal',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'radar_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
