-- ==========================================================================
-- Metas: adiciona a coluna "principal"
-- ==========================================================================
-- A tabela painel_metas já existe (rodado em metas-habitos-tabela.sql).
-- Isto só adiciona a marcação de meta principal — só as metas marcadas
-- aparecem no bloco "Principais metas" da Visão Geral.

alter table public.painel_metas add column if not exists principal boolean not null default false;
