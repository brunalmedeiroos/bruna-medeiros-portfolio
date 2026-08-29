// ==========================================================================
// supabase/functions/instagram-metrics/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) pra buscar o perfil, os indicadores
// gerais (alcance, visitas ao perfil, cliques no link) e o desempenho das
// últimas publicações. Cada bloco é buscado com try/catch isolado: se um
// pedaço falhar (permissão faltando, métrica descontinuada pela Meta), o
// resto da resposta continua normal em vez de derrubar a aba inteira.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGraph, insightDeConta, insightDeMidia, obterAccessTokenValido } from "../_shared/instagram.ts";
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

function dataISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    // withSupabase({ auth: "user" }) só confirma que existe uma sessão válida
    // — não que é especificamente a dona da conta.
    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    let token: Awaited<ReturnType<typeof obterAccessTokenValido>>;
    try {
      token = await obterAccessTokenValido(ctx.supabaseAdmin);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
    if (!token) {
      return jsonResponse({ ok: true, conectado: false });
    }

    const { access_token: accessToken, ig_username: igUsername } = token;
    const desde = dataISO(7);
    const ate = dataISO(0);
    const erros: string[] = [];

    // "/me" é o jeito documentado de buscar os dados da própria conta nesse
    // fluxo — o ID numérico bruto não funciona como caminho direto.
    // ---- Perfil (seguidores, nº de publicações) ----
    let perfil = { username: igUsername, seguidores: null as number | null, publicacoes: null as number | null };
    try {
      const dados = await chamarGraph("/me", {
        fields: "username,followers_count,media_count",
        access_token: accessToken,
      });
      perfil = { username: dados.username, seguidores: dados.followers_count ?? null, publicacoes: dados.media_count ?? null };
    } catch (e) {
      console.error("Erro ao buscar perfil do Instagram:", e);
      erros.push(`perfil: ${(e as Error).message}`);
    }

    // ---- Indicadores da conta nos últimos 7 dias ----
    const [alcance, visitasPerfil, cliquesLink] = await Promise.all([
      insightDeConta("me", accessToken, ["reach"], desde, ate, erros),
      insightDeConta("me", accessToken, ["profile_views"], desde, ate, erros),
      insightDeConta("me", accessToken, ["website_clicks", "profile_links_taps"], desde, ate, erros),
    ]);

    // ---- Últimas publicações + desempenho de cada uma ----
    let posts: Array<Record<string, unknown>> = [];
    try {
      const resposta = await chamarGraph("/me/media", {
        fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
        limit: "6",
        access_token: accessToken,
      });
      const midias: Array<Record<string, unknown>> = resposta.data || [];

      posts = await Promise.all(
        midias.map(async (m) => {
          const [alcancePost, salvosPost] = await Promise.all([
            insightDeMidia(m.id as string, accessToken, ["reach"], erros),
            insightDeMidia(m.id as string, accessToken, ["saved"], erros),
          ]);
          return {
            id: m.id,
            legenda: m.caption || "",
            tipo: m.media_type,
            capa: (m.thumbnail_url as string) || (m.media_url as string) || null,
            link: m.permalink,
            data: m.timestamp,
            curtidas: m.like_count ?? null,
            comentarios: m.comments_count ?? null,
            alcance: alcancePost,
            salvos: salvosPost,
          };
        }),
      );
    } catch (e) {
      console.error("Erro ao buscar publicações do Instagram:", e);
      erros.push(`publicações: ${(e as Error).message}`);
    }

    return jsonResponse({
      ok: true,
      conectado: true,
      perfil,
      insights: { alcance, visitasPerfil, cliquesLink },
      posts,
      erros: erros.length ? erros : undefined,
    });
  }),
};
