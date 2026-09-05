-- ==========================================================================
-- roteiro-comentarios-excluir.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- roteiro-comentarios.sql só criou policy de LEITURA pra ugc_roteiro_comentarios
-- (só a Edge Function grava, via service role). Mas isso também bloqueava
-- a Bruna de excluir um comentário de teste ou spam pelo próprio painel —
-- a exclusão falhava silenciosamente (RLS sem policy = 0 linhas afetadas,
-- sem erro). Esta policy corrige isso.
create policy "Painel: exclusão autenticada de comentários de roteiro"
  on public.ugc_roteiro_comentarios for delete to authenticated using (public.is_owner());
