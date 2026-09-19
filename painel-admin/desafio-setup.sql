-- ==========================================================================
-- desafio-setup.sql — Rode este script no SQL Editor do projeto Supabase
-- DO DESAFIO (projeto separado do painel interno — ver decisão no chat:
-- um site público com cadastro aberto não deveria dividir o mesmo projeto
-- Auth do Creator Center).
-- ==========================================================================
-- Cria as tabelas, o storage e as policies usadas pelo site do desafio
-- "Dia X nos desafiando a viver do UGC" (brunamedeiros.com/desafio).
--
-- Aqui QUALQUER pessoa pode criar conta e logar — não é só a sua conta.
-- Por isso quase toda tabela tem uma policy "cada um só vê/mexe no que é
-- seu", com uma exceção pra você (is_owner()) que enxerga tudo, pra poder
-- publicar desafio e dar feedback.

-- ---------------------------------------------------------------------
-- is_owner(): identifica você pelo e-mail do token (auth.jwt()), não por
-- UID fixo — nesse projeto novo sua conta ainda nem existe quando este
-- script roda. Se um dia trocar o e-mail de login, troque aqui também
-- (e em desafio/js/auth.js, na constante OWNER_EMAIL).
-- ---------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'medeirosbru6@gmail.com';
$$;

-- ---------------------------------------------------------------------
-- Tabela: desafio_perfis
-- Um por participante (1:1 com auth.users). Criada sozinha quando a
-- pessoa se cadastra, puxando nome/instagram/fase do que veio no signUp.
-- ---------------------------------------------------------------------
create table if not exists public.desafio_perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  instagram text not null default '',
  fase text,
  foto_url text,
  indicado_por uuid references public.desafio_perfis(id),
  created_at timestamptz not null default now()
);

alter table public.desafio_perfis enable row level security;

create policy "perfis - select proprio ou dona" on public.desafio_perfis
  for select to authenticated
  using (auth.uid() = id or public.is_owner());

-- Update liberado só pra trocar a própria foto (nome/instagram/fase
-- também, se um dia tiver tela de editar perfil) — mas nunca indicado_por,
-- id ou created_at. Trava por COLUNA (não só por linha), então mesmo
-- que a policy de RLS libere a própria linha, ninguém consegue mudar
-- quem indicou ela depois do cadastro.
create policy "perfis - update proprio" on public.desafio_perfis
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.desafio_perfis from authenticated;
grant update (nome, instagram, fase, foto_url) on public.desafio_perfis to authenticated;

-- Cria a linha em desafio_perfis automaticamente a cada novo cadastro,
-- já gravando quem indicou (se veio um ?ref= válido no link de convite).
-- security definer pq auth.users não é acessível por policy comum.
create or replace function public.desafio_criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_raw text := new.raw_user_meta_data->>'indicado_por';
  ref_uuid uuid;
begin
  if ref_raw is not null and ref_raw <> '' then
    begin
      ref_uuid := ref_raw::uuid;
    exception when others then
      ref_uuid := null;
    end;
    -- ignora se o código não corresponde a ninguém, ou se é a própria pessoa
    if ref_uuid is not null and not exists (select 1 from public.desafio_perfis where id = ref_uuid) then
      ref_uuid := null;
    end if;
    if ref_uuid = new.id then
      ref_uuid := null;
    end if;
  end if;

  insert into public.desafio_perfis (id, nome, instagram, fase, indicado_por)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'instagram', ''),
    new.raw_user_meta_data->>'fase',
    ref_uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_desafio on auth.users;
create trigger on_auth_user_created_desafio
  after insert on auth.users
  for each row execute function public.desafio_criar_perfil();

-- ---------------------------------------------------------------------
-- Tabela: desafio_dias
-- Um desafio por dia do calendário do desafio (Dia 1 a Dia 16). Só você
-- publica; todo participante logado pode ler.
-- ---------------------------------------------------------------------
create table if not exists public.desafio_dias (
  id uuid primary key default gen_random_uuid(),
  numero_dia int not null unique,
  titulo text not null,
  descricao text not null,
  pede_video boolean not null default false,
  publicado_em timestamptz not null default now()
);

alter table public.desafio_dias enable row level security;

create policy "dias - select autenticado" on public.desafio_dias
  for select to authenticated
  using (true);

create policy "dias - escrita so dona" on public.desafio_dias
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------
-- Tabela: desafio_conclusoes
-- Registra quando um participante marca "Feito" num dia (e, se quiser,
-- o caminho do vídeo enviado). Cada um só mexe na própria linha.
-- ---------------------------------------------------------------------
create table if not exists public.desafio_conclusoes (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.desafio_perfis(id) on delete cascade,
  dia_id uuid not null references public.desafio_dias(id) on delete cascade,
  feito_em timestamptz not null default now(),
  video_path text,
  unique (participante_id, dia_id)
);

alter table public.desafio_conclusoes enable row level security;

create policy "conclusoes - select proprio ou dona" on public.desafio_conclusoes
  for select to authenticated
  using (auth.uid() = participante_id or public.is_owner());

create policy "conclusoes - insert proprio" on public.desafio_conclusoes
  for insert to authenticated
  with check (auth.uid() = participante_id);

create policy "conclusoes - update proprio" on public.desafio_conclusoes
  for update to authenticated
  using (auth.uid() = participante_id)
  with check (auth.uid() = participante_id);

create policy "conclusoes - delete proprio" on public.desafio_conclusoes
  for delete to authenticated
  using (auth.uid() = participante_id);

-- ---------------------------------------------------------------------
-- Tabela: desafio_feedback
-- Separada de desafio_conclusoes de propósito: só você pode escrever
-- feedback (se estivesse na mesma linha que o participante edita, ele
-- poderia escrever "feedback" pra si mesmo).
-- ---------------------------------------------------------------------
create table if not exists public.desafio_feedback (
  id uuid primary key default gen_random_uuid(),
  conclusao_id uuid not null unique references public.desafio_conclusoes(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);

alter table public.desafio_feedback enable row level security;

create policy "feedback - select dono da conclusao ou dona" on public.desafio_feedback
  for select to authenticated
  using (
    public.is_owner()
    or exists (
      select 1 from public.desafio_conclusoes c
      where c.id = conclusao_id and c.participante_id = auth.uid()
    )
  );

create policy "feedback - escrita so dona" on public.desafio_feedback
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------
-- Tabela: desafio_bonus
-- Pontos extras dados por você, na mão, com motivo — pra premiar o que
-- não dá pra automatizar. Aparece no histórico do admin e no painel da
-- própria participante (ela vê por que ganhou).
-- ---------------------------------------------------------------------
create table if not exists public.desafio_bonus (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.desafio_perfis(id) on delete cascade,
  pontos int not null,
  motivo text not null,
  criado_em timestamptz not null default now()
);

alter table public.desafio_bonus enable row level security;

create policy "bonus - select proprio ou dona" on public.desafio_bonus
  for select to authenticated
  using (auth.uid() = participante_id or public.is_owner());

create policy "bonus - escrita so dona" on public.desafio_bonus
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------
-- View: desafio_ranking
-- Leaderboard (nome, instagram, pontos). É visível pra qualquer
-- participante logado de propósito — mostra o "top da semana" no
-- painel de todo mundo, não só pra você.
--
-- Fórmula dos pontos (pensada pra não empatar todo mundo que só marca
-- "feito"): 1pt por desafio feito + 2pts por enviar vídeo + 1pt por
-- fazer em até 48h da publicação (não deixa acumular pro fim) + 2pts
-- por cada amiga que ela indicou (se cadastrou pelo link dela) + 1pt
-- por ter foto de perfil + bônus manual que você decide dar.
--
-- A dona (você) é excluída de propósito: você pode marcar desafios e
-- subir vídeo igual uma participante, pra documentar sua própria
-- jornada, mas não entra no ranking — quem pontua são as alunas.
-- ---------------------------------------------------------------------
create or replace view public.desafio_ranking as
select
  p.id as participante_id,
  p.nome,
  p.instagram,
  coalesce(count(c.id), 0)
    + coalesce(sum(case when c.video_path is not null then 2 else 0 end), 0)
    + coalesce(sum(case when c.feito_em <= d.publicado_em + interval '48 hours' then 1 else 0 end), 0)
    + coalesce((select count(*) from public.desafio_perfis ref where ref.indicado_por = p.id), 0) * 2
    + case when p.foto_url is not null then 1 else 0 end
    + coalesce((select sum(b.pontos) from public.desafio_bonus b where b.participante_id = p.id), 0)
    as pontos,
  max(c.feito_em) as ultimo_desafio_em
from public.desafio_perfis p
left join public.desafio_conclusoes c on c.participante_id = p.id
left join public.desafio_dias d on d.id = c.dia_id
where not exists (
  select 1 from auth.users u
  where u.id = p.id and u.email = 'medeirosbru6@gmail.com'
)
group by p.id, p.nome, p.instagram;

grant select on public.desafio_ranking to authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket privado pros vídeos enviados nos desafios
-- Caminho de cada arquivo: {uid-do-participante}/dia-{numero}.{ext}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('desafio-videos', 'desafio-videos', false)
on conflict (id) do nothing;

create policy "desafio-videos - upload proprio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'desafio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "desafio-videos - update proprio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'desafio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "desafio-videos - select proprio ou dona" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'desafio-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_owner()
    )
  );

-- ---------------------------------------------------------------------
-- Storage: bucket público pras fotos de perfil (bucket público porque é
-- uma foto de perfil, não é sensível — simplifica exibir ela em
-- qualquer lugar do site sem precisar de link assinado).
-- Caminho de cada arquivo: {uid-do-participante}/foto.{ext}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('desafio-fotos', 'desafio-fotos', true)
on conflict (id) do nothing;

create policy "desafio-fotos - upload proprio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'desafio-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "desafio-fotos - update proprio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'desafio-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Select aberta pra qualquer authenticated (o bucket já é público, então
-- isso não abre nada que não estivesse acessível de qualquer forma — mas
-- sem essa policy, upload com upsert:true falha: o Storage precisa fazer
-- um select interno pra saber se já existe um arquivo nesse caminho antes
-- de decidir entre inserir ou substituir).
create policy "desafio-fotos - select proprio ou publico" on storage.objects
  for select to authenticated
  using (bucket_id = 'desafio-fotos');

-- ---------------------------------------------------------------------
-- Tabela: desafio_processo
-- Bloco de notas livre só seu — planejamento dos 16 dias, pipeline de
-- conteúdo, ideias de reserva, "basicamente tudo" sobre o desafio antes
-- dele começar. Uma linha só (id sempre 1): não é por participante, é
-- só a sua anotação. Nunca aparece pro lado do participante.
-- ---------------------------------------------------------------------
create table if not exists public.desafio_processo (
  id int primary key default 1,
  conteudo text not null default '',
  atualizado_em timestamptz not null default now(),
  constraint desafio_processo_singleton check (id = 1)
);

alter table public.desafio_processo enable row level security;

create policy "processo - so dona" on public.desafio_processo
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

insert into public.desafio_processo (id, conteudo)
values (1, '')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Processo — colunas novas pra virar mini-dashboard de 5 abas.
-- data_publicacao/gravado_postado: usadas na "Tabela de processo" e em
-- "Desafios" (mesma data, um só lugar). roteiro_ideia_id: link solto pro
-- id de uma linha em planejador_ideias (projeto Supabase PRINCIPAL, não
-- este) — sem FK de verdade possível entre os dois projetos, resolvido
-- em tempo de leitura pelas pontes em painel-admin/painel.html.
-- ---------------------------------------------------------------------
alter table public.desafio_dias
  add column if not exists data_publicacao date,
  add column if not exists gravado_postado boolean not null default false,
  add column if not exists roteiro_ideia_id uuid;

alter table public.desafio_processo
  add column if not exists data_inicio date;

-- ---------------------------------------------------------------------
-- Rascunho vs publicado: agora dá pra pré-criar os 16 dias e escrever
-- tema/descrição com calma na Tabela de processo, sem isso aparecer
-- pra participante — só vira visível de verdade quando a Bruna passar
-- pelo assistente "Desafio do dia!" na Visão Geral (que dá
-- update publicado=true naquela linha).
--
-- Os dias que já existiam antes desta coluna existir já estavam, de
-- fato, publicados de verdade (não existia rascunho antes dela) — por
-- isso o update abaixo marca todo mundo como publicado, ANTES de criar
-- os dias que ainda faltam (esses sim nascem como rascunho).
-- ---------------------------------------------------------------------
alter table public.desafio_dias
  add column if not exists publicado boolean not null default false;

update public.desafio_dias set publicado = true;

insert into public.desafio_dias (numero_dia, titulo, descricao, pede_video, publicado)
select n, '', '', false, false
from generate_series(1, 16) as n
where not exists (select 1 from public.desafio_dias d where d.numero_dia = n);

-- A policy antiga deixava qualquer participante logada ler TODAS as
-- linhas (inclusive rascunho) via API direta — o que vazaria o tema
-- dos dias futuros antes da hora. Rascunho (publicado=false) agora só
-- a dona consegue ler.
drop policy if exists "dias - select autenticado" on public.desafio_dias;
create policy "dias - select publicado ou dona" on public.desafio_dias
  for select to authenticated
  using (publicado = true or public.is_owner());
