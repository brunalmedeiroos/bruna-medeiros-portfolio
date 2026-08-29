-- ==========================================================================
-- direitos-uso-column.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Adiciona o campo opcional "até quando a marca pode usar o conteúdo" em
-- cada Trabalho, usado pelo aviso de vencimento de direitos de uso.
alter table public.ugc_trabalhos
  add column if not exists direitos_uso_ate date;
