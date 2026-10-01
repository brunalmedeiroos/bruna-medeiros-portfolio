-- ==========================================================================
-- Financeiro > Extrato bancário: adiciona a opção "Ignorar" na classificação
-- ==========================================================================
-- A tabela financeiro_transacoes já existe (rodado em financeiro-pluggy-tabela.sql).
-- Isto só libera 'ignorado' como valor válido de classificacao — pra lançamentos
-- que você não quer marcar como negócio nem pessoal (ex: não lembra o que foi).
-- Eles saem da lista de "não classificados" e não aparecem em nenhuma aba.

alter table public.financeiro_transacoes drop constraint if exists financeiro_transacoes_classificacao_check;
alter table public.financeiro_transacoes add constraint financeiro_transacoes_classificacao_check
  check (classificacao in ('negocio', 'pessoal', 'ignorado'));
