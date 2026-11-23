// ==========================================================================
// supabase/functions/tiktok-metrics/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) ao abrir a aba TikTok. Por enquanto só
// diz se está conectado e devolve o @usuário + os números gerais (segue,
// curtidas, vídeos) que a API já manda de graça junto com o perfil — ainda
// não tem gráfico de crescimento nem "views somadas" (isso pede somar o
// view_count de cada vídeo da lista, fica pra quando o resto do Mídia Kit
// de métricas for montado).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { buscarPerfilTiktok, obterAccessTokenValidoTiktok } from "../_shared/tiktok.ts";

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

    try {
      const token = await obterAccessTokenValidoTiktok(ctx.supabaseAdmin);
      if (!token) return jsonResponse({ ok: true, conectado: false });

      let perfil;
      try {
        perfil = await buscarPerfilTiktok(token.access_token);
      } catch (e) {
        // Token guardado mas a chamada falhou (permissão revogada, app
        // ainda não aprovado pro escopo etc.) — mostra conectado com o
        // @usuário salvo, e o erro junto, em vez de quebrar a aba.
        return jsonResponse({
          ok: true,
          conectado: true,
          perfil: { username: token.tiktok_username },
          erros: [(e as Error).message],
        });
      }

      return jsonResponse({
        ok: true,
        conectado: true,
        perfil: {
          username: perfil?.display_name || token.tiktok_username,
          seguidores: perfil?.follower_count ?? null,
          curtidas: perfil?.likes_count ?? null,
          videos: perfil?.video_count ?? null,
        },
      });
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
