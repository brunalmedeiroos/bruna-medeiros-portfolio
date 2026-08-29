-- ==========================================================================
-- encrypt-oauth-tokens.sql — Rode UMA VEZ no SQL Editor do seu projeto
-- Supabase, logo ANTES de eu publicar as Edge Functions atualizadas.
-- ==========================================================================
-- Corrige o achado da auditoria: os tokens do Gmail e do Instagram
-- (email_tokens.access_token/refresh_token, instagram_tokens.access_token)
-- ficavam salvos em texto puro no banco. Esse script:
--   1. Liga o Supabase Vault (criptografia gerenciada pelo próprio Supabase).
--   2. Cria duas funções "porteiras" que só o service_role (usado pelas
--      Edge Functions) pode chamar — o painel/navegador nunca tem acesso.
--   3. Move os tokens que já estão salvos pra dentro do Vault, e troca o
--      valor guardado nas colunas pelo UUID do segredo (não mais o token
--      em si).
--
-- Não precisa reconectar Gmail/Instagram depois de rodar — os tokens atuais
-- continuam funcionando, só passam a ficar criptografados.

create extension if not exists supabase_vault;

create or replace function public.vault_read_secret(secret_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where id = secret_id;
$$;

create or replace function public.vault_upsert_secret(secret_id uuid, new_secret text, secret_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  resultado uuid;
begin
  if secret_id is not null and exists (select 1 from vault.secrets where id = secret_id) then
    perform vault.update_secret(secret_id, new_secret);
    resultado := secret_id;
  else
    resultado := vault.create_secret(new_secret, secret_name);
  end if;
  return resultado;
end;
$$;

revoke all on function public.vault_read_secret(uuid) from public, anon, authenticated;
revoke all on function public.vault_upsert_secret(uuid, text, text) from public, anon, authenticated;
grant execute on function public.vault_read_secret(uuid) to service_role;
grant execute on function public.vault_upsert_secret(uuid, text, text) to service_role;

-- Migra o token do Gmail já salvo (se existir e ainda não tiver sido
-- migrado) pro Vault.
do $$
declare
  linha record;
  novo_access uuid;
  novo_refresh uuid;
begin
  select * into linha from public.email_tokens where id = 1;
  if found and (linha.refresh_token !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    if linha.access_token is not null then
      novo_access := vault.create_secret(linha.access_token, 'email_access_token');
    end if;
    novo_refresh := vault.create_secret(linha.refresh_token, 'email_refresh_token');
    update public.email_tokens
      set access_token = novo_access::text,
          refresh_token = novo_refresh::text
      where id = 1;
  end if;
end $$;

-- Idem pro Instagram.
do $$
declare
  linha record;
  novo_access uuid;
begin
  select * into linha from public.instagram_tokens where id = 1;
  if found and (linha.access_token !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    novo_access := vault.create_secret(linha.access_token, 'instagram_access_token');
    update public.instagram_tokens
      set access_token = novo_access::text
      where id = 1;
  end if;
end $$;
