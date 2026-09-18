// ==========================================================================
// supabase/functions/instagram-media/index.ts
// ==========================================================================
// Lista os posts recentes da conta conectada, pra alimentar o seletor
// "Em quais posts" do editor de automação (o painel busca isso quando
// abre o editor, em vez de reusar o cache de métricas, pra sempre ter a
// legenda/capa mais recente disponível).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGraph, obterAccessTokenValido } from "../_shared/instagram.ts";
import { ehDono } from "../_shared/dono.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    if (!(await ehDono(req, ctx.supabaseAdmin))) return jsonResponse({ ok: false, error: "forbidden" }, 403);

    try {
      const tokenInfo = await obterAccessTokenValido(ctx.supabaseAdmin);
      if (!tokenInfo) return jsonResponse({ ok: true, conectado: false, posts: [] });

      const resposta = await chamarGraph("/me/media", {
        fields: "id,caption,media_type,thumbnail_url,media_url,timestamp",
        limit: "30",
        access_token: tokenInfo.access_token,
      });
      const posts = (resposta.data || []).map((m: Record<string, unknown>) => ({
        id: m.id,
        legenda: (m.caption as string) || "",
        capa: (m.thumbnail_url as string) || (m.media_url as string) || null,
        data: m.timestamp,
      }));

      return jsonResponse({ ok: true, conectado: true, posts });
    } catch (e) {
      console.error("Erro ao buscar posts do Instagram:", e);
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
