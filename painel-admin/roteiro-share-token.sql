-- ==========================================================================
-- roteiro-share-token.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Token secreto usado pra montar o link público de leitura de um roteiro
-- (função roteiro-publico, chamada pela página /roteiro/). Sem o token não
-- dá pra montar a URL, então ele funciona como senha de acesso ao roteiro
-- sem exigir login da marca.
alter table public.ugc_roteiros
  add column if not exists share_token uuid not null default gen_random_uuid();
