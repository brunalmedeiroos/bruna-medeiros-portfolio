-- ==========================================================================
-- roteiro-link-expiracao.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Data de validade do link público de um roteiro. Fica null até o link ser
-- gerado pela primeira vez (botão "Link para aprovação") — a partir daí, o
-- painel renova pra "agora + 30 dias" toda vez que o link é (re)gerado.
alter table public.ugc_roteiros
  add column if not exists share_expira_em timestamptz;
