// ==========================================================================
// supabase/functions/instagram-automacao-processar/index.ts
// ==========================================================================
// Roda o motor da automação "comentário → resposta privada". Chamada tanto
// pelo agendamento (pg_cron, a cada 10 min, com o segredo
// INSTAGRAM_AUTOMACAO_CRON_SECRET) quanto pelo botão "Processar agora" do
// painel (com a sessão da usuária logada) — mesmo padrão de
// radar-atualizar.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { obterAccessTokenValido } from "../_shared/instagram.ts";
import { processarAutomacoes } from "../_shared/instagram-automacao.ts";

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

      const resultado = await processarAutomacoes(ctx.supabaseAdmin, tokenInfo.ig_user_id, tokenInfo.access_token);
      return jsonResponse({ ok: true, conectado: true, ...resultado });
    } catch (e) {
      console.error("Erro ao processar automações do Instagram:", e);
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
