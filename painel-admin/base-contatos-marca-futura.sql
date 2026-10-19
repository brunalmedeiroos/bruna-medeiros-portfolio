-- ---------------------------------------------------------------------
-- base-contatos-marca-futura.sql — Rode este arquivo UMA VEZ no SQL Editor
-- do seu projeto Supabase pra liberar a situação "Marca futura" na Base de
-- contatos (Prospecção).
-- ---------------------------------------------------------------------
-- Marcas que responderam "agora não" ficam nessa situação e saem da lista
-- de Todas, ficando numa aba só delas (Marcas futuras). Não mexe em nenhum
-- contato que já existe.

alter table public.ugc_base_contatos drop constraint if exists ugc_base_contatos_situacao_check;
alter table public.ugc_base_contatos
  add constraint ugc_base_contatos_situacao_check
  check (situacao in ('Lead', 'Abordagem enviada', 'Conversando', 'Cliente', 'Parada', 'Marca futura'));
