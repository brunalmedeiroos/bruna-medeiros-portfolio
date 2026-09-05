-- ==========================================================================
-- roteiro-cena-migrar-descricao-antiga.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Quando a coluna "cena_broll" virou "tipo_cena" (roteiro-cena-tipo-funcao-
-- legenda.sql), todo texto livre que já existia em qualquer roteiro ficou
-- "preso" nela — só que agora tipo_cena só aceita um seletor fixo (Cena
-- falada / B-roll com narração / B-roll sem narração / Texto na tela), então
-- esse texto antigo parou de aparecer em qualquer lugar da tela (sem ter
-- sido apagado do banco).
--
-- Esta correção é geral: pega QUALQUER cena de QUALQUER roteiro cujo
-- tipo_cena não seja um dos 4 valores fixos válidos, move esse texto pra
-- descricao_cena (só se descricao_cena ainda estiver vazio, pra nunca
-- sobrescrever nada) e limpa tipo_cena. Roda de novo sem problema — depois
-- da primeira vez não sobra mais nada pra mover.
update public.ugc_roteiro_cenas
set descricao_cena = tipo_cena,
    tipo_cena = null
where descricao_cena is null
  and tipo_cena is not null
  and tipo_cena not in ('Cena falada', 'B-roll com narração', 'B-roll sem narração', 'Texto na tela');
