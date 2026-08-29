// ==========================================================================
// supabase/functions/gmail-unmark/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) pra tirar o marcador (GMAIL_LABEL_NAME)
// de uma mensagem, fazendo ela sumir da lista da aba E-mail. Não apaga nem
// arquiva a mensagem no Gmail — só remove esse marcador específico.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  chamarGmail,
  nomeMarcador,
  obterAccessTokenValido,
  resolverIdMarcador,
} from "../_shared/gmail.ts";
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

    // withSupabase({ auth: "user" }) só confirma que existe uma sessão válida
    // — não que é especificamente a dona da conta.
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
      const labelId = await resolverIdMarcador(accessToken, nomeMarcador());
      if (!labelId) return jsonResponse({ ok: false, error: "marcador não encontrado" }, 404);

      await chamarGmail(accessToken, `/messages/${messageId}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeLabelIds: [labelId] }),
      });

      return jsonResponse({ ok: true });
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
