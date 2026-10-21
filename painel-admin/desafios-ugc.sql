-- ==========================================================================
-- desafios-ugc.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Aba "Nos Desafiando a Viver do UGC" (Gestão): central da comunidade gratuita
-- de criadoras de UGC. Cria as tabelas de participantes, desafios (ciclos de
-- 15 dias), atividades, entregas, pontuação, anotações, conquistas e premiações.
-- Tudo é só seu: cada tabela só deixa a conta dona do painel ler e escrever.
-- A pontuação total e os rankings não ficam guardados: o painel calcula sempre
-- a partir dos lançamentos válidos (comunidade_pontos).
-- É seguro rodar de novo (nada é apagado).

-- ---------------------------------------------------------------- participantes
create table if not exists public.comunidade_participantes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  instagram_usuario text,
  instagram_link text,
  data_entrada date,
  etapa text not null default 'Começando',
  portfolio_situacao text not null default 'Sem portfólio',
  portfolio_link text,
  experiencia_conteudo text,
  experiencia_marcas text,
  dificuldade_principal text,
  objetivo text,
  status text not null default 'ativa' check (status in ('ativa', 'pausada', 'saiu')),
  arquivada boolean not null default false,
  observacoes text
);

-- ---------------------------------------------------------------- desafios
create table if not exists public.comunidade_desafios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  descricao text,
  objetivo text,
  data_inicio date not null,
  data_fim date not null,
  regras text,
  criterios_pontuacao text,
  desempate text not null default 'entregas' check (desempate in ('entregas', 'antiga', 'nome')),
  status text not null default 'planejado' check (status in ('planejado', 'em_andamento', 'encerrado')),
  vencedora_id uuid references public.comunidade_participantes(id) on delete set null
);

-- quem participa de cada desafio
create table if not exists public.comunidade_inscricoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  desafio_id uuid not null references public.comunidade_desafios(id) on delete cascade,
  participante_id uuid not null references public.comunidade_participantes(id) on delete cascade,
  unique (desafio_id, participante_id)
);

-- atividades (tarefas) de cada desafio: semana1, semana2 ou fechamento (último dia)
create table if not exists public.comunidade_atividades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  desafio_id uuid not null references public.comunidade_desafios(id) on delete cascade,
  titulo text not null,
  descricao text,
  semana text not null default 'semana1' check (semana in ('semana1', 'semana2', 'fechamento')),
  prazo date,
  ordem int not null default 0
);

-- entrega de uma participante numa atividade
create table if not exists public.comunidade_entregas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  desafio_id uuid not null references public.comunidade_desafios(id) on delete cascade,
  atividade_id uuid not null references public.comunidade_atividades(id) on delete cascade,
  participante_id uuid not null references public.comunidade_participantes(id) on delete cascade,
  status text not null default 'nao_iniciada' check (status in ('nao_iniciada', 'em_andamento', 'enviada', 'concluida', 'ajustes')),
  link_conteudo text,
  observacao text,
  unique (atividade_id, participante_id)
);

-- motivos de pontuação que você cadastra (globais ou de um desafio só)
create table if not exists public.comunidade_motivos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  pontos_padrao int not null default 0,
  desafio_id uuid references public.comunidade_desafios(id) on delete cascade,
  ativo boolean not null default true
);

-- lançamentos de pontos. Corrigir = anular o antigo (valido = false) e criar um novo
-- que aponta pro antigo (substitui_id): o histórico fica inteiro.
create table if not exists public.comunidade_pontos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participante_id uuid not null references public.comunidade_participantes(id) on delete cascade,
  desafio_id uuid references public.comunidade_desafios(id) on delete set null,
  motivo_id uuid references public.comunidade_motivos(id) on delete set null,
  motivo text not null,
  pontos int not null,
  observacao text,
  valido boolean not null default true,
  substitui_id uuid references public.comunidade_pontos(id) on delete set null,
  anulado_em timestamptz,
  anulado_motivo text
);

-- feedbacks, dúvidas, dificuldades e orientações de cada participante
create table if not exists public.comunidade_notas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participante_id uuid not null references public.comunidade_participantes(id) on delete cascade,
  desafio_id uuid references public.comunidade_desafios(id) on delete set null,
  tipo text not null default 'feedback' check (tipo in ('feedback', 'duvida', 'dificuldade', 'orientacao')),
  texto text not null
);

-- conquistas da evolução profissional
create table if not exists public.comunidade_conquistas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participante_id uuid not null references public.comunidade_participantes(id) on delete cascade,
  titulo text not null,
  data date not null default current_date,
  observacao text
);

-- catálogo de prêmios (ideias de premiação) e a premiação de cada desafio
create table if not exists public.comunidade_premios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  descricao text,
  criterios text,
  ativo boolean not null default true
);

create table if not exists public.comunidade_premiacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  desafio_id uuid not null references public.comunidade_desafios(id) on delete cascade,
  premio_id uuid references public.comunidade_premios(id) on delete set null,
  criterios text,
  vencedora_id uuid references public.comunidade_participantes(id) on delete set null,
  status text not null default 'a_definir' check (status in ('a_definir', 'anunciada', 'entregue')),
  data_entrega date,
  observacoes text
);

create index if not exists comunidade_pontos_part_idx on public.comunidade_pontos (participante_id);
create index if not exists comunidade_pontos_desafio_idx on public.comunidade_pontos (desafio_id);
create index if not exists comunidade_entregas_desafio_idx on public.comunidade_entregas (desafio_id);
create index if not exists comunidade_notas_part_idx on public.comunidade_notas (participante_id);

-- ---------------------------------------------------------------- acesso só seu
do $$
declare
  t text;
begin
  foreach t in array array[
    'comunidade_participantes', 'comunidade_desafios', 'comunidade_inscricoes', 'comunidade_atividades',
    'comunidade_entregas', 'comunidade_motivos', 'comunidade_pontos', 'comunidade_notas',
    'comunidade_conquistas', 'comunidade_premios', 'comunidade_premiacoes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Painel: leitura de %s" on public.%I', t, t);
    execute format('drop policy if exists "Painel: criação de %s" on public.%I', t, t);
    execute format('drop policy if exists "Painel: atualização de %s" on public.%I', t, t);
    execute format('drop policy if exists "Painel: exclusão de %s" on public.%I', t, t);
    execute format('create policy "Painel: leitura de %s" on public.%I for select to authenticated using (public.is_owner())', t, t);
    execute format('create policy "Painel: criação de %s" on public.%I for insert to authenticated with check (public.is_owner())', t, t);
    execute format('create policy "Painel: atualização de %s" on public.%I for update to authenticated using (public.is_owner()) with check (public.is_owner())', t, t);
    execute format('create policy "Painel: exclusão de %s" on public.%I for delete to authenticated using (public.is_owner())', t, t);
  end loop;
end
$$;

-- ---------------------------------------------------------------- ponto de partida
-- Motivos de pontuação e ideias de prêmio, só se as tabelas ainda estiverem vazias.
-- Você muda, apaga e cria os seus pelo painel.
insert into public.comunidade_motivos (nome, pontos_padrao)
select m.nome, m.pontos
  from (values
    ('Tarefa concluída', 10),
    ('Conteúdo publicado', 10),
    ('Entrega dentro do prazo', 5),
    ('Ajuda a outra participante', 5),
    ('Bônus do desafio', 10),
    ('Correção de pontuação', 0)
  ) as m(nome, pontos)
 where not exists (select 1 from public.comunidade_motivos);

insert into public.comunidade_premios (nome, descricao)
select p.nome, p.descricao
  from (values
    ('Criação de um portfólio', 'Portfólio profissional montado pra vencedora.'),
    ('Acesso ao meu painel de admin', 'Acesso ao painel de gestão de criadora.'),
    ('Análise de perfil', 'Análise do perfil da vencedora, com os pontos de melhoria.'),
    ('Sugestões personalizadas de conteúdo', 'Ideias de conteúdo feitas sob medida pro perfil da vencedora.')
  ) as p(nome, descricao)
 where not exists (select 1 from public.comunidade_premios);
