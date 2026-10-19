-- ---------------------------------------------------------------------
-- base-contatos-abordagem-enviada.sql — Rode este arquivo UMA VEZ no SQL
-- Editor do seu projeto Supabase pra liberar a situação "Abordagem enviada"
-- na Base de contatos (Prospecção).
-- ---------------------------------------------------------------------
-- A tabela só aceitava Lead, Conversando, Cliente e Parada. Isso troca a
-- regra pra aceitar também "Abordagem enviada". Não mexe em nenhum contato.

alter table public.ugc_base_contatos drop constraint if exists ugc_base_contatos_situacao_check;
alter table public.ugc_base_contatos
  add constraint ugc_base_contatos_situacao_check
  check (situacao in ('Lead', 'Abordagem enviada', 'Conversando', 'Cliente', 'Parada'));
