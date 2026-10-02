-- ==========================================================================
-- painel-admin/bio-tabelas.sql
-- ==========================================================================
-- Instagram > Link na bio: guarda a configuração da página /bio (um JSON só,
-- linha única) e os eventos de visita/clique usados nos números do painel.
-- É seguro rodar de novo (if not exists / create or replace / drop policy).
--
-- A página pública NÃO lê essas tabelas direto: ela fala com a Edge Function
-- "bio-publico" (que usa service_role). Por isso as tabelas só têm acesso
-- do dono (is_owner) pelo painel.

-- ---------- Configuração da página ----------
create table if not exists public.bio_config (
  id int primary key default 1,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint bio_config_singleton check (id = 1)
);

alter table public.bio_config enable row level security;

drop policy if exists "Painel: leitura da config do link na bio" on public.bio_config;
drop policy if exists "Painel: criação da config do link na bio" on public.bio_config;
drop policy if exists "Painel: atualização da config do link na bio" on public.bio_config;

create policy "Painel: leitura da config do link na bio"
  on public.bio_config for select to authenticated using (public.is_owner());
create policy "Painel: criação da config do link na bio"
  on public.bio_config for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização da config do link na bio"
  on public.bio_config for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

grant select, insert, update on public.bio_config to authenticated;
grant select, insert, update on public.bio_config to service_role;

-- ---------- Eventos (visitas e cliques) ----------
create table if not exists public.bio_eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('view', 'click')),
  -- 'pagina' nas visitas; nos cliques o identificador do elemento
  -- (concierge, solicitar_portfolio, portfolio_profissional, equipamentos, whatsapp...)
  elemento text not null check (elemento ~ '^[a-z0-9_]{1,40}$'),
  visitante text not null check (visitante ~ '^[A-Za-z0-9_-]{8,64}$'),
  created_at timestamptz not null default now()
);

create index if not exists bio_eventos_created_idx on public.bio_eventos (created_at);
create index if not exists bio_eventos_tipo_elemento_idx on public.bio_eventos (tipo, elemento, created_at);

alter table public.bio_eventos enable row level security;

drop policy if exists "Painel: leitura dos eventos do link na bio" on public.bio_eventos;
create policy "Painel: leitura dos eventos do link na bio"
  on public.bio_eventos for select to authenticated using (public.is_owner());

grant select on public.bio_eventos to authenticated;
grant select, insert on public.bio_eventos to service_role;

-- ---------- Resumo pro painel ----------
-- p_dias: 1 = hoje, 7, 30; 0 (ou null) = tudo. Dias contados no horário de
-- Brasília. Devolve também o período anterior (mesmo tamanho) pra comparar.
create or replace function public.bio_resumo(p_dias int default 7)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  tz constant text := 'America/Sao_Paulo';
  hoje date := (now() at time zone tz)::date;
  ini timestamptz;
  ini_ant timestamptz;
  tudo boolean := (p_dias is null or p_dias <= 0);
  vis int; ace int; cli int;
  vis_ant int; cli_ant int;
  por_elemento jsonb;
  serie jsonb;
  primeiro_dia date;
begin
  if tudo then
    select coalesce(min(created_at), now()) into ini from public.bio_eventos;
    ini_ant := null;
  else
    ini := ((hoje - (p_dias - 1))::timestamp) at time zone tz;
    ini_ant := ((hoje - (2 * p_dias - 1))::timestamp) at time zone tz;
  end if;

  select
    count(distinct visitante) filter (where tipo = 'view'),
    count(*) filter (where tipo = 'view'),
    count(*) filter (where tipo = 'click')
  into vis, ace, cli
  from public.bio_eventos
  where created_at >= ini;

  if ini_ant is not null then
    select
      count(distinct visitante) filter (where tipo = 'view'),
      count(*) filter (where tipo = 'click')
    into vis_ant, cli_ant
    from public.bio_eventos
    where created_at >= ini_ant and created_at < ini;
  end if;

  select coalesce(jsonb_object_agg(elemento, n), '{}'::jsonb) into por_elemento
  from (
    select elemento, count(*) as n
    from public.bio_eventos
    where tipo = 'click' and created_at >= ini
    group by elemento
  ) t;

  if p_dias = 1 then
    select coalesce(jsonb_agg(jsonb_build_object(
      'rotulo', lpad(h::text, 2, '0') || 'h',
      'visitantes', coalesce(v.vis, 0),
      'cliques', coalesce(v.cli, 0)
    ) order by h), '[]'::jsonb) into serie
    from generate_series(0, 23) as h
    left join (
      select extract(hour from created_at at time zone tz)::int as hh,
             count(distinct visitante) filter (where tipo = 'view') as vis,
             count(*) filter (where tipo = 'click') as cli
      from public.bio_eventos
      where created_at >= ini
      group by 1
    ) v on v.hh = h;
  else
    primeiro_dia := (ini at time zone tz)::date;
    select coalesce(jsonb_agg(jsonb_build_object(
      'rotulo', to_char(d.dia, 'YYYY-MM-DD'),
      'visitantes', coalesce(v.vis, 0),
      'cliques', coalesce(v.cli, 0)
    ) order by d.dia), '[]'::jsonb) into serie
    from generate_series(primeiro_dia::timestamp, hoje::timestamp, interval '1 day') as d(dia)
    left join (
      select (created_at at time zone tz)::date as dia,
             count(distinct visitante) filter (where tipo = 'view') as vis,
             count(*) filter (where tipo = 'click') as cli
      from public.bio_eventos
      where created_at >= ini
      group by 1
    ) v on v.dia = d.dia::date;
  end if;

  return jsonb_build_object(
    'visitantes', vis,
    'acessos', ace,
    'cliques', cli,
    'visitantes_anterior', vis_ant,
    'cliques_anterior', cli_ant,
    'por_elemento', por_elemento,
    'serie', serie
  );
end;
$$;

grant execute on function public.bio_resumo(int) to authenticated;

-- ---------- Imagens (foto de perfil, ícone do card de equipamentos) ----------
insert into storage.buckets (id, name, public)
values ('bio-imagens', 'bio-imagens', true)
on conflict (id) do nothing;

drop policy if exists "Painel: escrita das imagens do link na bio" on storage.objects;
create policy "Painel: escrita das imagens do link na bio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bio-imagens' and public.is_owner());
drop policy if exists "Painel: atualização das imagens do link na bio" on storage.objects;
create policy "Painel: atualização das imagens do link na bio"
  on storage.objects for update to authenticated
  using (bucket_id = 'bio-imagens' and public.is_owner())
  with check (bucket_id = 'bio-imagens' and public.is_owner());
drop policy if exists "Painel: exclusão das imagens do link na bio" on storage.objects;
create policy "Painel: exclusão das imagens do link na bio"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bio-imagens' and public.is_owner());
