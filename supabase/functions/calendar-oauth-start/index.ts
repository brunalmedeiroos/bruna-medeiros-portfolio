// ==========================================================================
// supabase/functions/calendar-oauth-start/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) quando a Bruna clica em "Conectar
// Google Agenda". Gera um "state" (proteção contra CSRF), guarda no banco e
// devolve a URL de autorização do Google pro navegador redirecionar.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { CALENDAR_SCOPES, credenciaisGoogleCalendar } from "../_shared/calendar.ts";
import { ehDono } from "../_shared/dono.ts";

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

    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    const state = crypto.randomUUID();
    const { error } = await ctx.supabaseAdmin.from("calendar_oauth_states").insert({ state });
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    const { clientId, redirectUri } = credenciaisGoogleCalendar();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", CALENDAR_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    return jsonResponse({ ok: true, url: url.toString() });
  }),
};
