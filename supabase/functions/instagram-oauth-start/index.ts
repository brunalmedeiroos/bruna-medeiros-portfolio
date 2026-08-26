// ==========================================================================
// supabase/functions/instagram-oauth-start/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) quando a Bruna clica em "Conectar
// Instagram". Gera um "state" (proteção contra CSRF), guarda no banco e
// devolve a URL de autorização da Meta pro navegador redirecionar.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { credenciaisMeta, GRAPH_VERSION, INSTAGRAM_SCOPES } from "../_shared/instagram.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    const state = crypto.randomUUID();
    const { error } = await ctx.supabaseAdmin.from("instagram_oauth_states").insert({ state });
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    const { appId, redirectUri } = credenciaisMeta();
    const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", INSTAGRAM_SCOPES);
    url.searchParams.set("state", state);

    return jsonResponse({ ok: true, url: url.toString() });
  }),
};
