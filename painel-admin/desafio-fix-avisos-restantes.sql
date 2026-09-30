-- ---------------------------------------------------------------------
-- Arruma os avisos "menores" que sobraram na checagem de segurança do
-- Supabase (projeto Desafio UGC Bruna), nenhum deles é o alerta
-- crítico que veio por e-mail (esse já foi resolvido antes).
-- ---------------------------------------------------------------------

-- is_owner() sem search_path fixo: sem isso, alguém com permissão de
-- criar objetos no schema public poderia, em teoria, criar uma função
-- ou tabela com nome ambíguo pra "sequestrar" a busca de objetos
-- dentro da function. Fixar o search_path fecha essa brecha.
create or replace function public.is_owner()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'medeirosbru6@gmail.com';
$$;

-- desafio_criar_perfil() é function de trigger (dispara sozinha a
-- cada cadastro em auth.users) — não deveria estar chamável direto
-- via API por ninguém. Revogar o EXECUTE não quebra o trigger: o
-- Postgres invoca triggers internamente, sem passar pela checagem de
-- EXECUTE que vale pra chamada direta via RPC.
revoke execute on function public.desafio_criar_perfil() from public, anon, authenticated;
