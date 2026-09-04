// ==========================================================================
// supabase/functions/_shared/vault.ts
// ==========================================================================
// Lê/grava os tokens OAuth (Gmail, Instagram) no Supabase Vault em vez de
// texto puro no banco. As duas funções SQL usadas aqui (vault_read_secret e
// vault_upsert_secret) só podem ser chamadas pelo service_role — ver
// painel-admin/encrypt-oauth-tokens.sql.
//
// lerSegredo() aceita tanto um UUID do Vault quanto (por segurança de
// transição, enquanto o deploy das funções e a migração do banco não
// acontecem no mesmíssimo instante) um token de texto puro antigo — nesse
// caso devolve ele direto, sem quebrar nada.

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// deno-lint-ignore no-explicit-any
export async function lerSegredo(supabaseAdmin: any, valor: string | null): Promise<string | null> {
  if (!valor) return null;
  if (!UUID_RE.test(valor)) return valor; // token antigo, ainda não migrado pro Vault

  const { data, error } = await supabaseAdmin.rpc("vault_read_secret", { secret_id: valor });
  if (error) throw new Error(`Erro lendo segredo do Vault: ${error.message}`);
  return data as string | null;
}

// Cria um segredo novo (secretId null) ou atualiza um já existente no mesmo
// lugar — evita acumular um segredo órfão no Vault a cada renovação de token.
export async function gravarSegredo(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  secretId: string | null,
  novoValor: string,
  nome: string,
): Promise<string> {
  const idExistente = secretId && UUID_RE.test(secretId) ? secretId : null;
  const { data, error } = await supabaseAdmin.rpc("vault_upsert_secret", {
    secret_id: idExistente,
    new_secret: novoValor,
    secret_name: nome,
  });
  if (error) throw new Error(`Erro gravando segredo no Vault: ${error.message}`);
  return data as string;
}

// Apaga um segredo do Vault (ex: ao desconectar uma integração) — sem isso,
// o nome fica "preso" e a próxima tentativa de criar um segredo novo com o
// mesmo nome esbarra na constraint de unicidade do Vault. Não faz nada se
// secretId for null ou não for um UUID (token antigo em texto puro).
// deno-lint-ignore no-explicit-any
export async function apagarSegredo(supabaseAdmin: any, secretId: string | null): Promise<void> {
  if (!secretId || !UUID_RE.test(secretId)) return;
  const { error } = await supabaseAdmin.rpc("vault_delete_secret", { secret_id: secretId });
  if (error) throw new Error(`Erro apagando segredo do Vault: ${error.message}`);
}
