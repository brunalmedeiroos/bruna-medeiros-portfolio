-- ==========================================================================
-- roteiro-direcao-cena-subcampos.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- "Direção de cena" (texto livre, roteiro-conceito-direcao-cores.sql) vira
-- 4 campos fixos — Cenário, Luz, Figurino e beleza, Edição — igual na
-- referência de "ficha de gravação" que a Bruna usa. Ninguém salvou nada em
-- direcao_cena ainda (feature nova, 0 linhas preenchidas), então é seguro
-- só trocar a coluna em vez de migrar dado.
alter table public.ugc_roteiros
  drop column if exists direcao_cena;

alter table public.ugc_roteiros
  add column if not exists direcao_cenario text;
alter table public.ugc_roteiros
  add column if not exists direcao_luz text;
alter table public.ugc_roteiros
  add column if not exists direcao_figurino text;
alter table public.ugc_roteiros
  add column if not exists direcao_edicao text;
