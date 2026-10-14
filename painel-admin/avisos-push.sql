-- Avisos no celular (notificações push do painel).
-- Rode uma vez no SQL Editor do Supabase, colando o arquivo inteiro. Pode rodar de novo sem problema.
-- Não apaga nada: só cria duas tabelas e o "relógio" que confere os avisos a cada minuto.
--
-- 1) painel_push_assinaturas: um registro por aparelho que ativou as notificações.
-- 2) painel_avisos: um registro por item do Dashboard marcado como "Importante – notificar".
-- 3) Um agendamento (pg_cron) chama a função push-avisos a cada minuto. Ele usa o mesmo segredo
--    do agendador do Instagram (instagram_automacao_cron_secret), que já existe no seu projeto.

create table if not exists public.painel_push_assinaturas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text
);

create table if not exists public.painel_avisos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  chave text not null,            -- identifica o item do Dashboard (ex.: tarefa:<id>, check:<id>)
  titulo text not null,           -- o nome do item, que aparece na notificação
  quando timestamptz not null,    -- data e hora em que ela quer ser avisada
  ativo boolean not null default true,
  enviado_em timestamptz          -- preenchido quando a notificação já foi enviada
);

create unique index if not exists painel_avisos_chave_idx on public.painel_avisos (chave);
create index if not exists painel_avisos_pendentes_idx on public.painel_avisos (quando) where ativo and enviado_em is null;

alter table public.painel_push_assinaturas enable row level security;
alter table public.painel_avisos enable row level security;

drop policy if exists "Painel: leitura das assinaturas push" on public.painel_push_assinaturas;
create policy "Painel: leitura das assinaturas push"
  on public.painel_push_assinaturas for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita das assinaturas push" on public.painel_push_assinaturas;
create policy "Painel: escrita das assinaturas push"
  on public.painel_push_assinaturas for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização das assinaturas push" on public.painel_push_assinaturas;
create policy "Painel: atualização das assinaturas push"
  on public.painel_push_assinaturas for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão das assinaturas push" on public.painel_push_assinaturas;
create policy "Painel: exclusão das assinaturas push"
  on public.painel_push_assinaturas for delete to authenticated using (public.is_owner());

drop policy if exists "Painel: leitura dos avisos" on public.painel_avisos;
create policy "Painel: leitura dos avisos"
  on public.painel_avisos for select to authenticated using (public.is_owner());
drop policy if exists "Painel: escrita dos avisos" on public.painel_avisos;
create policy "Painel: escrita dos avisos"
  on public.painel_avisos for insert to authenticated with check (public.is_owner());
drop policy if exists "Painel: atualização dos avisos" on public.painel_avisos;
create policy "Painel: atualização dos avisos"
  on public.painel_avisos for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Painel: exclusão dos avisos" on public.painel_avisos;
create policy "Painel: exclusão dos avisos"
  on public.painel_avisos for delete to authenticated using (public.is_owner());

grant select, insert, update, delete on public.painel_push_assinaturas to authenticated;
grant select, insert, update, delete on public.painel_push_assinaturas to service_role;
grant select, insert, update, delete on public.painel_avisos to authenticated;
grant select, insert, update, delete on public.painel_avisos to service_role;

-- O relógio: a cada minuto pergunta à função push-avisos se tem aviso vencendo.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'push-avisos-periodico') then
    perform cron.unschedule('push-avisos-periodico');
  end if;
end $$;

select cron.schedule(
  'push-avisos-periodico',
  '* * * * *', -- a cada 1 minuto
  $$
  select net.http_post(
    url := 'https://trfoymytrvdbslwizfqs.supabase.co/functions/v1/push-avisos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_automacao_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
