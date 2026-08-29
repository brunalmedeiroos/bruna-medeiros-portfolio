// ==========================================================================
// supabase/functions/portfolio-publico/index.ts
// ==========================================================================
// Endpoint público (auth: "none") chamado pelo site pra listar os trabalhos
// que a usuária marcou como "publicável" no painel, com vídeo do YouTube.
//
// SEGURANÇA: o select abaixo lista explicitamente cada coluna retornada —
// nunca "select *". ugc_trabalhos guarda dado sensível (valor, contato,
// observações, briefing) que NUNCA pode chegar num visitante do site. Se
// algum dia adicionar um campo novo em ugc_trabalhos, ele só aparece aqui
// se for explicitamente incluído nessa lista.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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
    if (req.method !== "GET") return jsonResponse({ ok: false, error: "method not allowed" }, 405);

    const { data, error } = await ctx.supabaseAdmin
      .from("ugc_trabalhos")
      .select("marca, portfolio_youtube_id, portfolio_categoria")
      .eq("publicavel", true)
      .not("portfolio_youtube_id", "is", null)
      .order("data_entrega", { ascending: false });

    if (error) return jsonResponse({ ok: false, error: error.message }, 500);
    return jsonResponse({ ok: true, itens: data });
  }),
};
