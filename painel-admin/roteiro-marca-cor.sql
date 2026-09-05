-- ==========================================================================
-- roteiro-marca-cor.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Identidade visual por marca no Roteiro: um hex de cor guardado só naquele
-- roteiro (não é uma tabela de marcas reaproveitável — cada roteiro tem a
-- sua). Quando null, a página pública e o painel caem pra identidade padrão
-- da Bruna. O check abaixo é só uma trava extra caso algum dia grave direto
-- via SQL/API — o <input type="color"> do painel já garante o formato certo.
alter table public.ugc_roteiros
  add column if not exists marca_cor text;

alter table public.ugc_roteiros
  add constraint ugc_roteiros_marca_cor_formato
  check (marca_cor is null or marca_cor ~* '^#[0-9a-f]{6}$');
