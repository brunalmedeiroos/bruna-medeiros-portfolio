-- ==========================================================================
-- roteiro-visualizacoes-fix-coluna.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Correção: a tabela ugc_roteiro_visualizacoes foi criada com a coluna
-- "visualizado_em" (versão antiga do roteiro-status-visualizacoes.sql, antes
-- de eu perceber que buscarTudo() no painel sempre ordena por "created_at").
-- Sem esse rename, a aba UGC/Publi inteira falha ao carregar.
alter table public.ugc_roteiro_visualizacoes
  rename column visualizado_em to created_at;
