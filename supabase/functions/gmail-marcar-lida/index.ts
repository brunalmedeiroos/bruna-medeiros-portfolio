// ==========================================================================
// supabase/functions/gmail-marcar-lida/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) pra marcar uma mensagem como lida —
// remove o marcador de sistema "UNREAD" do Gmail (o mesmo que some quando
// você abre o e-mail direto no Gmail). Não mexe no marcador "Propostas":
// a mensagem continua na lista, só deixa de contar como pendente.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGmail, obterAccessTokenValido } from "../_shared/gmail.ts";
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
    if (req.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);

    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "JSON inválido" }, 400);
    }

    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    if (!messageId) return jsonResponse({ ok: false, error: "messageId obrigatório" }, 400);

    let accessToken: string | null;
    try {
      accessToken = await obterAccessTokenValido(ctx.supabaseAdmin);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
    if (!accessToken) return jsonResponse({ ok: false, error: "not_connected" }, 200);

    try {
      // "UNREAD" é um marcador de sistema do Gmail — o ID dele já é essa
      // string fixa, sem precisar resolver como o marcador "Propostas".
      await chamarGmail(accessToken, `/messages/${messageId}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      });

      return jsonResponse({ ok: true });
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
