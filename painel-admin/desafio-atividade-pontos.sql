-- ---------------------------------------------------------------------
-- desafio-atividade-pontos.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs). É seguro rodar de novo.
-- ---------------------------------------------------------------------
-- Desafio UGC: cada atividade (dia) passa a ter o tipo de entrega e quantos
-- pontos vale. Lançar os pontos de uma atividade marca a entrega como feita.

alter table public.comunidade_atividades add column if not exists tipo_entrega text;
alter table public.comunidade_atividades add column if not exists pontos int not null default 0;

alter table public.comunidade_pontos
  add column if not exists atividade_id uuid references public.comunidade_atividades(id) on delete set null;
