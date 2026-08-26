// ==========================================================================
// supabase/functions/gmail-reply/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) pra responder uma mensagem, mantendo a
// conversa (thread) no Gmail.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  chamarGmail,
  extrairEndereco,
  montarEmailCru,
  obterAccessTokenValido,
} from "../_shared/gmail.ts";

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

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "JSON inválido" }, 400);
    }

    const messageId = typeof body.messageId === "string" ? body.messageId : "";
    const texto = typeof body.body === "string" ? body.body.trim() : "";
    if (!messageId) return jsonResponse({ ok: false, error: "messageId obrigatório" }, 400);
    if (!texto) return jsonResponse({ ok: false, error: "mensagem vazia" }, 400);

    let accessToken: string | null;
    try {
      accessToken = await obterAccessTokenValido(ctx.supabaseAdmin);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
    if (!accessToken) return jsonResponse({ ok: false, error: "not_connected" }, 200);

    try {
      const original = await chamarGmail(
        accessToken,
        `/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,
      );
      const headers: Array<{ name: string; value: string }> = original.payload?.headers || [];
      const pegar = (nome: string) =>
        headers.find((h) => h.name.toLowerCase() === nome.toLowerCase())?.value || "";

      const de = (await chamarGmail(accessToken, "/profile")).emailAddress;
      const para = extrairEndereco(pegar("From"));
      const assuntoOriginal = pegar("Subject");
      const assunto = /^re:/i.test(assuntoOriginal) ? assuntoOriginal : `Re: ${assuntoOriginal}`;
      const messageIdHeader = pegar("Message-ID");
      const referencesAnteriores = pegar("References");
      const references = [referencesAnteriores, messageIdHeader].filter(Boolean).join(" ");

      const raw = montarEmailCru({
        de,
        para,
        assunto,
        corpo: texto,
        inReplyTo: messageIdHeader || undefined,
        references: references || undefined,
      });

      await chamarGmail(accessToken, "/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, threadId: original.threadId }),
      });

      return jsonResponse({ ok: true });
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
