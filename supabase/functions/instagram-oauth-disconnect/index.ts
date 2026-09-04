// ==========================================================================
// supabase/functions/instagram-oauth-disconnect/index.ts
// ==========================================================================
// Chamada pelo painel quando a Bruna clica em "Desconectar" na aba
// Instagram. Apaga o token guardado — a próxima vez que ela conectar de
// novo, o Instagram pede autorização do zero (necessário depois de
// adicionar um escopo novo, já que o token antigo não ganha a permissão
// nova sozinho).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { ehDono } from "../_shared/dono.ts";
import { apagarSegredo } from "../_shared/vault.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    const { data: linha, error: erroLeitura } = await ctx.supabaseAdmin
      .from("instagram_tokens")
      .select("access_token")
      .eq("id", 1)
      .maybeSingle();
    if (erroLeitura) return jsonResponse({ ok: false, error: erroLeitura.message }, 500);

    const { error } = await ctx.supabaseAdmin.from("instagram_tokens").delete().eq("id", 1);
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    // Apaga o segredo do Vault também — não só a referência — senão o nome
    // fica preso e a próxima conexão falha com "duplicate key". Best-effort:
    // se isso falhar, a desconexão em si (o que importa pra usuária agora)
    // já foi concluída com sucesso.
    if (linha?.access_token) {
      try {
        await apagarSegredo(ctx.supabaseAdmin, linha.access_token);
      } catch (e) {
        console.error("Erro ao apagar segredo do Vault do Instagram:", e);
      }
    }

    return jsonResponse({ ok: true });
  }),
};
