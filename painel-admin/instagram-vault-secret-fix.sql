-- ---------------------------------------------------------------------
-- instagram-vault-secret-fix.sql — Rode UMA VEZ no SQL Editor.
-- ---------------------------------------------------------------------
-- Corrige o erro "duplicate key value violates unique constraint
-- secrets_name_idx" ao reconectar o Instagram depois de desconectar: o
-- botão Desconectar apagava só a referência (instagram_tokens.access_token),
-- não o segredo em si dentro do Vault — o nome "instagram_access_token"
-- ficava preso, e a próxima conexão não conseguia criar um segredo novo
-- com o mesmo nome.

-- 1) Função "porteira" nova: apaga um segredo do Vault (só service_role
--    pode chamar — mesmo padrão de vault_read_secret/vault_upsert_secret
--    já criados em encrypt-oauth-tokens.sql).
create or replace function public.vault_delete_secret(secret_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from vault.secrets where id = secret_id;
$$;

revoke all on function public.vault_delete_secret(uuid) from public, anon, authenticated;
grant execute on function public.vault_delete_secret(uuid) to service_role;

-- 2) Limpa agora o segredo órfão que ficou preso quando você desconectou
--    (sem isso, reconectar vai continuar dando o mesmo erro). Seguro
--    rodar mesmo que já tenha sido limpo — sem efeito se não achar nada.
delete from vault.secrets where name = 'instagram_access_token';
