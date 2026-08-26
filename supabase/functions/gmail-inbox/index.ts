// ==========================================================================
// supabase/functions/gmail-inbox/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) pra listar as mensagens com o marcador
// configurado (GMAIL_LABEL_NAME) ou, com ?id=, ler o conteúdo completo de
// uma mensagem específica.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  chamarGmail,
  detalharMensagem,
  nomeMarcador,
  obterAccessTokenValido,
  resumirMensagem,
} from "../_shared/gmail.ts";

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

    let accessToken: string | null;
    try {
      accessToken = await obterAccessTokenValido(ctx.supabaseAdmin);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
    if (!accessToken) {
      return jsonResponse({ ok: false, error: "not_connected" }, 200);
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    try {
      if (id) {
        const msg = await chamarGmail(accessToken, `/messages/${id}?format=full`);
        return jsonResponse({ ok: true, mensagem: detalharMensagem(msg) });
      }

      const label = nomeMarcador();
      const busca = await chamarGmail(
        accessToken,
        `/messages?maxResults=30&q=${encodeURIComponent(`label:"${label}"`)}`,
      );
      const ids: Array<{ id: string }> = busca.messages || [];

      const mensagens = await Promise.all(
        ids.map((m) =>
          chamarGmail(accessToken as string, `/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)
            .then(resumirMensagem)
        ),
      );

      return jsonResponse({ ok: true, mensagens });
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
