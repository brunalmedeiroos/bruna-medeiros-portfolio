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
  resolverIdMarcador,
  resumirMensagem,
} from "../_shared/gmail.ts";
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

    // withSupabase({ auth: "user" }) só confirma que existe uma sessão válida
    // — não que é especificamente a dona da conta. Sem essa checagem extra,
    // qualquer conta autenticada no projeto (não só a sua) conseguiria ler
    // sua caixa de e-mail através desta função.
    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

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

    const label = nomeMarcador();

    try {
      if (id) {
        // A listagem abaixo já filtra pela label; o detalhe de uma mensagem
        // específica também precisa checar isso — sem essa checagem, qualquer
        // chamador autenticado conseguia ler qualquer e-mail da caixa, não
        // só os rotulados "Propostas".
        const [labelId, msg] = await Promise.all([
          resolverIdMarcador(accessToken, label),
          chamarGmail(accessToken, `/messages/${id}?format=full`),
        ]);
        const labelIds: string[] = msg.labelIds || [];
        if (!labelId || !labelIds.includes(labelId)) {
          return jsonResponse({ ok: false, error: "not_found" }, 404);
        }
        return jsonResponse({ ok: true, mensagem: detalharMensagem(msg) });
      }

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
