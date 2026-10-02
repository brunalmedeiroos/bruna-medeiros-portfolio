-- ==========================================================================
-- Hábitos: adiciona a coluna "meta_semanal"
-- ==========================================================================
-- A tabela painel_habitos já existe. Isto adiciona uma meta opcional de
-- quantas vezes por semana o hábito deveria ser feito (ex: 5), usada na
-- grade semanal da Visão Geral (ex: "3/5"). Sem meta definida, mostra só
-- a contagem.

alter table public.painel_habitos add column if not exists meta_semanal integer;
