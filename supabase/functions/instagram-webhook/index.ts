// ==========================================================================
// supabase/functions/instagram-webhook/index.ts
// ==========================================================================
// Recebe em tempo real os comentários e mensagens do Instagram (a Meta
// chama esta URL sozinha, sem sessão de usuária nenhuma — por isso
// verify_jwt fica desligado pra esta função, ver supabase/config.toml).
//
// Dois papéis nesta função:
//  a) GET — aperto de mão da inscrição do webhook (hub.mode=subscribe):
//     confere o INSTAGRAM_VERIFY_TOKEN e devolve o hub.challenge.
//  b) POST — evento novo: confere a assinatura (X-Hub-Signature-256) e
//     entrega cada comentário/mensagem pro motor em
//     _shared/instagram-fluxo.ts.
//
// IMPORTANTE — modo de teste: por padrão (INSTAGRAM_APP_SECRET_ENFORCE
// não definido, ou "false"), uma assinatura inválida só gera um aviso no
// log — o evento ainda é processado, pra facilitar os primeiros testes.
// Depois de confirmar que está tudo funcionando, defina
// INSTAGRAM_APP_SECRET_ENFORCE=true nos segredos da função pra travar
// de vez (só a Meta, com o segredo certo, consegue mandar eventos).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { assinaturaValida, credenciaisInstagram, obterAccessTokenValido } from "../_shared/instagram.ts";
import { processarComentario, processarMensagem } from "../_shared/instagram-fluxo.ts";

interface EntradaWebhook {
  id?: string;
  changes?: Array<{ field: string; value: unknown }>;
  messaging?: unknown[];
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const url = new URL(req.url);

    // ---- a) Aperto de mão da inscrição (GET) ----
    if (req.method === "GET") {
      const modo = url.searchParams.get("hub.mode");
      const tokenRecebido = url.searchParams.get("hub.verify_token");
      const desafio = url.searchParams.get("hub.challenge") || "";
      const tokenEsperado = Deno.env.get("INSTAGRAM_VERIFY_TOKEN") || "";

      if (modo === "subscribe" && tokenEsperado && tokenRecebido === tokenEsperado) {
        return new Response(desafio, { status: 200, headers: { "Content-Type": "text/plain" } });
      }
      return new Response("Verificação falhou", { status: 403 });
    }

    if (req.method !== "POST") {
      return new Response("Método não permitido", { status: 405 });
    }

    // ---- b) Evento novo (POST) ----
    const corpoBruto = await req.text();

    try {
      const { appSecret } = credenciaisInstagram();
      const assinaturaHeader = req.headers.get("x-hub-signature-256");
      const valida = await assinaturaValida(corpoBruto, assinaturaHeader, appSecret);
      const travarAssinatura = (Deno.env.get("INSTAGRAM_APP_SECRET_ENFORCE") || "false").toLowerCase() === "true";
      if (!valida) {
        if (travarAssinatura) {
          console.error("Assinatura do webhook inválida — recusando (INSTAGRAM_APP_SECRET_ENFORCE=true).");
          return new Response("Assinatura inválida", { status: 401 });
        }
        console.warn("Assinatura do webhook inválida — processando de qualquer jeito (modo de teste, INSTAGRAM_APP_SECRET_ENFORCE=false).");
      }
    } catch (e) {
      // Sem INSTAGRAM_APP_SECRET configurado ainda — só loga e segue (modo de teste).
      console.warn("Não foi possível confirmar a assinatura do webhook:", (e as Error).message);
    }

    // Responde 200 rápido é o ideal, mas como o processamento aqui é
    // leve (poucas chamadas à API por evento) e o painel não tem fila
    // de background jobs, processamos tudo antes de responder mesmo.
    try {
      const corpo = JSON.parse(corpoBruto || "{}");
      const entradas: EntradaWebhook[] = corpo.entry || [];
      if (entradas.length === 0) return new Response("EVENT_RECEIVED", { status: 200 });

      const tokenInfo = await obterAccessTokenValido(ctx.supabaseAdmin);
      if (!tokenInfo) return new Response("EVENT_RECEIVED", { status: 200 }); // Instagram não conectado ainda

      for (const entrada of entradas) {
        for (const mudanca of entrada.changes || []) {
          if (mudanca.field === "comments") {
            try {
              await processarComentario(ctx.supabaseAdmin, tokenInfo.ig_user_id, tokenInfo.access_token, mudanca.value as never);
            } catch (e) {
              console.error("Erro processando comentário do webhook:", (e as Error).message);
            }
          }
        }
        for (const evento of entrada.messaging || []) {
          try {
            await processarMensagem(ctx.supabaseAdmin, tokenInfo.ig_user_id, tokenInfo.access_token, evento as never);
          } catch (e) {
            console.error("Erro processando mensagem do webhook:", (e as Error).message);
          }
        }
      }
    } catch (e) {
      console.error("Erro geral processando o webhook do Instagram:", (e as Error).message);
    }

    // A Meta espera 200 mesmo quando algo interno falhou — devolver erro
    // faz ela ficar retentando o mesmo evento sem parar.
    return new Response("EVENT_RECEIVED", { status: 200 });
  }),
};
