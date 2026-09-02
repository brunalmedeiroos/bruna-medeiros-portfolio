-- ---------------------------------------------------------------------
-- radar-reformulacao.sql — Rode UMA VEZ no SQL Editor do Supabase, antes
-- de eu publicar a Edge Function e o painel reformulados.
-- ---------------------------------------------------------------------
-- O Radar de Notícias deixa de ser 4 "agentes" fixos (Marketing Digital,
-- Criação de Conteúdo, UGC e Creator Economy, IA e Tecnologia) e vira um
-- radar único, cuja curadoria é guiada pelo perfil da Bruna em vez de um
-- tema fixo por pipeline. Este arquivo:
--
--   1. Renomeia agente -> categoria e derruba o check fixo nos 4 valores
--      (agora é uma etiqueta livre, escolhida pela IA por achado, não
--      mais uma identidade de pipeline).
--   2. Adiciona relevancia (por que é relevante pra ela) e adaptacao
--      (como transformar em conteúdo) — separando o que hoje estava
--      tudo misturado no campo insight.
--   3. Copia o conteúdo de insight pra adaptacao nas linhas já
--      existentes, pra não perder nada do histórico, e só depois derruba
--      a coluna insight.
--   4. Troca o índice único de (agente, link) pra (link) — antes existia
--      pra permitir a mesma notícia aparecer uma vez por agente; agora só
--      existe um pipeline, então um link nunca deve se repetir.
-- ---------------------------------------------------------------------

alter table public.radar_noticias
  rename column agente to categoria;

-- Deriva o nome do check constraint em vez de cravar
-- "radar_noticias_agente_check" (nome padrão que o Postgres teria dado,
-- mas evita quebrar a migração se algum dia esse nome mudar).
do $$
declare
  nome_constraint text;
begin
  select con.conname into nome_constraint
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum = any(con.conkey)
  where con.conrelid = 'public.radar_noticias'::regclass
    and con.contype = 'c'
    and att.attname = 'categoria';

  if nome_constraint is not null then
    execute format('alter table public.radar_noticias drop constraint %I', nome_constraint);
  end if;
end $$;

alter table public.radar_noticias
  alter column categoria drop not null;

alter table public.radar_noticias
  add column if not exists relevancia text,
  add column if not exists adaptacao text;

update public.radar_noticias
set adaptacao = insight
where adaptacao is null and insight is not null;

alter table public.radar_noticias
  drop column if exists insight;

drop index if exists radar_noticias_agente_link_unq;
create unique index if not exists radar_noticias_link_unq on public.radar_noticias (link);
