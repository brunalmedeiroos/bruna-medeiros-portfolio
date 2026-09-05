// ==========================================================================
// supabase/functions/roteiro-publico/index.ts
// ==========================================================================
// Endpoint público (auth: "none") chamado pela página /roteiro/ do site pra
// mostrar um roteiro específico pra marca aprovar, sem exigir login.
//
// SEGURANÇA: o acesso é protegido pelo "share_token" (uuid aleatório) que
// mora na própria linha de ugc_roteiros — só quem tem o link (id + token)
// consegue ler, e só enquanto share_expira_em não tiver passado. O select
// abaixo lista explicitamente cada coluna retornada (nunca "select *") e
// nunca devolve o share_token, share_expira_em, observações internas ou o
// trabalho_id vinculado — só o que a marca precisa ver pra aprovar.

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

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const token = url.searchParams.get("token");
    if (!id || !token) return jsonResponse({ ok: false, error: "link inválido" }, 400);

    const { data: roteiro, error } = await ctx.supabaseAdmin
      .from("ugc_roteiros")
      .select("marca, produto, campanha, tipo_conteudo, duracao_prevista, objetivo, share_token, share_expira_em")
      .eq("id", id)
      .maybeSingle();

    if (error) return jsonResponse({ ok: false, error: error.message }, 500);
    if (!roteiro || roteiro.share_token !== token) return jsonResponse({ ok: false, error: "link inválido" }, 404);
    if (roteiro.share_expira_em && new Date(roteiro.share_expira_em) < new Date()) {
      return jsonResponse({ ok: false, error: "link expirado" }, 410);
    }

    const { data: cenas, error: erroCenas } = await ctx.supabaseAdmin
      .from("ugc_roteiro_cenas")
      .select("ordem, fala, o_que_fazer, cena_broll")
      .eq("roteiro_id", id)
      .order("ordem", { ascending: true });

    if (erroCenas) return jsonResponse({ ok: false, error: erroCenas.message }, 500);

    // Best-effort: registra que a marca abriu o link, pra Bruna ver isso no
    // painel. Se falhar, não impede a marca de ver o roteiro.
    const { error: erroVisualizacao } = await ctx.supabaseAdmin
      .from("ugc_roteiro_visualizacoes")
      .insert({ roteiro_id: id });
    if (erroVisualizacao) console.error("Erro ao registrar visualização do roteiro:", erroVisualizacao.message);

    const { share_token: _descartado, share_expira_em: _tambemDescartado, ...roteiroSeguro } = roteiro;
    return jsonResponse({ ok: true, roteiro: roteiroSeguro, cenas });
  }),
};
