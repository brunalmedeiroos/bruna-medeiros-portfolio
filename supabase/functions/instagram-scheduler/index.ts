// ==========================================================================
// supabase/functions/instagram-scheduler/index.ts
// ==========================================================================
// O "carteiro" das automações do Instagram. Roda via pg_cron a cada 1
// minuto (protegido pelo mesmo segredo já usado antes pra
// instagram-automacao-processar — ver instagram-automacoes-fluxo.sql) e
// também pode ser chamado manualmente pelo botão do painel. Duas
// tarefas:
//  1) Esvazia a instagram_fila_envio — itens que não conseguiram ficha
//     do freio na hora, tenta de novo agora.
//  2) Dispara os passos de instagram_agendados (delay) que já venceram.
//
// Também aproveita a chamada pra manter o token do Instagram fresco:
// obterAccessTokenValido() só efetivamente renova quando falta menos de
// 3 dias pra expirar, então rodar isso a cada minuto é barato.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { obterAccessTokenValido } from "../_shared/instagram.ts";
import { processarAgendados, processarFilaEnvio } from "../_shared/instagram-fluxo.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const authHeader = req.headers.get("Authorization") || "";
    const segredoCron = Deno.env.get("INSTAGRAM_AUTOMACAO_CRON_SECRET") ?? "";
    const ehCron = !!segredoCron && authHeader === `Bearer ${segredoCron}`;
    if (!ehCron) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data } = await ctx.supabaseAdmin.auth.getUser(token);
      if (!data.user) return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    try {
      const tokenInfo = await obterAccessTokenValido(ctx.supabaseAdmin);
      if (!tokenInfo) return jsonResponse({ ok: true, conectado: false });

      const [fila, agendados] = await Promise.all([
        processarFilaEnvio(ctx.supabaseAdmin, tokenInfo.ig_user_id, tokenInfo.access_token),
        processarAgendados(ctx.supabaseAdmin, tokenInfo.ig_user_id, tokenInfo.access_token),
      ]);

      return jsonResponse({ ok: true, conectado: true, fila, agendados });
    } catch (e) {
      console.error("Erro no instagram-scheduler:", e);
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
