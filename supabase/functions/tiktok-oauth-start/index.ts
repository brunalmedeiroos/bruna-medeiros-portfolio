// ==========================================================================
// supabase/functions/tiktok-oauth-start/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) quando a Bruna clica em "Conectar
// TikTok". Gera um "state" (proteção contra CSRF), guarda no banco e
// devolve a URL de autorização do TikTok pro navegador redirecionar.
//
// Só funciona depois que o app passar pela aprovação do TikTok for
// Developers e as variáveis TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET/
// TIKTOK_REDIRECT_URI estiverem configuradas nos secrets do projeto —
// até lá, devolve um erro amigável em vez de quebrar.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { AUTHORIZE_URL, credenciaisTiktok, TIKTOK_SCOPES, TiktokNaoConfiguradoError } from "../_shared/tiktok.ts";

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

    try {
      const { clientKey, redirectUri } = credenciaisTiktok();

      const state = crypto.randomUUID();
      const { error } = await ctx.supabaseAdmin.from("tiktok_oauth_states").insert({ state });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);

      const url = new URL(AUTHORIZE_URL);
      url.searchParams.set("client_key", clientKey);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", TIKTOK_SCOPES);
      url.searchParams.set("state", state);

      return jsonResponse({ ok: true, url: url.toString() });
    } catch (e) {
      if (e instanceof TiktokNaoConfiguradoError) {
        return jsonResponse({ ok: false, error: e.message }, 503);
      }
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
