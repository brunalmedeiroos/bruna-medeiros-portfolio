// ==========================================================================
// supabase/functions/_shared/dono.ts
// ==========================================================================
// withSupabase({ auth: "user" }) só confirma que existe UMA sessão válida
// — não que é especificamente a dona da conta. ehDono() fecha essa lacuna,
// usando o mesmo UID já usado nas policies de RLS do banco (is_owner() em
// painel-admin/fix-rls-owner-scope.sql). Se a conta de login mudar, troque
// o UID abaixo junto com o do banco.

const DONO_UID = "a2323d3f-e342-458d-b7f9-7b8ef0f1025f";

// deno-lint-ignore no-explicit-any
export async function ehDono(req: Request, supabaseAdmin: any): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user?.id === DONO_UID;
}
