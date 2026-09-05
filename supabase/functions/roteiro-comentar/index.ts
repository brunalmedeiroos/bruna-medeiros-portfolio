// ==========================================================================
// supabase/functions/roteiro-comentar/index.ts
// ==========================================================================
// Endpoint público (auth: "none") chamado pela página /roteiro/ pra deixar a
// marca comentar num roteiro, sem exigir login.
//
// SEGURANÇA: só aceita o comentário se id+token baterem com um roteiro cujo
// link ainda não expirou — mesma checagem da função roteiro-publico. Isso
// impede que alguém sem o link comente, ou que um link expirado continue
// recebendo comentários novos.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    if (req.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);

    let body: { id?: string; token?: string; mensagem?: string; autor?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "corpo inválido" }, 400);
    }

    const { id, token } = body;
    const mensagem = (body.mensagem || "").trim();
    const autor = (body.autor || "").trim().slice(0, 100) || null;

    if (!id || !token) return jsonResponse({ ok: false, error: "link inválido" }, 400);
    if (!mensagem) return jsonResponse({ ok: false, error: "mensagem vazia" }, 400);
    if (mensagem.length > 2000) return jsonResponse({ ok: false, error: "mensagem muito longa" }, 400);

    const { data: roteiro, error } = await ctx.supabaseAdmin
      .from("ugc_roteiros")
      .select("share_token, share_expira_em")
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonResponse({ ok: false, error: error.message }, 500);
    if (!roteiro || roteiro.share_token !== token) return jsonResponse({ ok: false, error: "link inválido" }, 404);
    if (roteiro.share_expira_em && new Date(roteiro.share_expira_em) < new Date()) {
      return jsonResponse({ ok: false, error: "link expirado" }, 410);
    }

    const { error: erroInsert } = await ctx.supabaseAdmin
      .from("ugc_roteiro_comentarios")
      .insert({ roteiro_id: id, autor, mensagem });

    if (erroInsert) return jsonResponse({ ok: false, error: erroInsert.message }, 500);
    return jsonResponse({ ok: true });
  }),
};
