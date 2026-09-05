-- ==========================================================================
-- roteiro-zerar-visualizacoes.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Hoje só existe policy de leitura (select) autenticada em
-- ugc_roteiro_visualizacoes — a inserção é feita pela edge function
-- roteiro-publico com a service role, que ignora RLS. Pra Bruna conseguir
-- zerar o histórico de visualização de um roteiro direto no painel (botão
-- "Zerar visualizações"), falta uma policy de delete pra ela mesma (dona
-- da conta) apagar essas linhas.
create policy "Painel: apagar visualizações de roteiro"
  on public.ugc_roteiro_visualizacoes for delete
  to authenticated
  using (public.is_owner());
