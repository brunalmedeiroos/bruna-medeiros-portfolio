-- ==========================================================================
-- desafio-cadastros-setup.sql — Rode no SQL Editor do projeto Supabase DO
-- DESAFIO (gcqyhtdtsosfzcykslhb).
-- ==========================================================================
-- Deixa a dona apagar o cadastro de uma participante (ex: quando ela
-- desiste). Hoje não existia NENHUMA policy de delete em desafio_perfis —
-- por isso nem a própria dona conseguia apagar uma linha. Apagar aqui
-- cascade-remove o progresso da pessoa (desafio_conclusoes, desafio_bonus),
-- pelas FKs "on delete cascade" já existentes — mas NÃO apaga o login dela
-- em auth.users (isso exigiria uma Edge Function com chave de serviço); se
-- ela tentar logar de novo depois de apagada, cai numa tela de pagamento
-- "zerada", sem precisar criar conta de novo.

create policy "perfis - delete so dona" on public.desafio_perfis
  for delete to authenticated
  using (public.is_owner());
