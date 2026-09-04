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

    const { error } = await ctx.supabaseAdmin.from("instagram_tokens").delete().eq("id", 1);
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    return jsonResponse({ ok: true });
  }),
};
