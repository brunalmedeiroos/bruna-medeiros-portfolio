-- ==========================================================================
-- Metas: adiciona a coluna "icone"
-- ==========================================================================
-- A tabela painel_metas já existe. Isto só adiciona um emoji opcional por
-- meta, mostrado como ícone no card (em vez de só a cor da categoria).

alter table public.painel_metas add column if not exists icone text;
