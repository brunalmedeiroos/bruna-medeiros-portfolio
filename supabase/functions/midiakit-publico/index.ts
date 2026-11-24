// ==========================================================================
// supabase/functions/midiakit-publico/index.ts
// ==========================================================================
// Endpoint público (auth: "none") chamado pela página /midiakit pra mostrar
// os números do Instagram e do TikTok ao vivo. Cada rede é buscada com
// try/catch isolado: se uma falhar (token vencido, conta desconectada), a
// outra continua aparecendo normal — nunca derruba a resposta inteira.
//
// Só números agregados (seguidores, alcance, curtidas somadas, views
// somadas) — nada sensível (tokens, ids de conta) sai daqui.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGraph, insightDeConta, insightTotalValue, obterAccessTokenValido } from "../_shared/instagram.ts";
import { buscarPerfilTiktok, obterAccessTokenValidoTiktok, somarViewsTiktok } from "../_shared/tiktok.ts";

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

function dataISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    // deno-lint-ignore no-explicit-any
    let instagram: any = null;
    // deno-lint-ignore no-explicit-any
    let tiktok: any = null;

    try {
      const token = await obterAccessTokenValido(ctx.supabaseAdmin);
      if (token) {
        const hoje = dataISO(0);
        const desde30 = dataISO(30);
        const [perfil, alcance, interacoes] = await Promise.all([
          chamarGraph("/me", { fields: "followers_count", access_token: token.access_token }).catch(() => null),
          insightDeConta("me", token.access_token, ["reach"], desde30, hoje).catch(() => null),
          insightTotalValue("me", token.access_token, "total_interactions", desde30, hoje).catch(() => null),
        ]);
        instagram = {
          seguidores: perfil?.followers_count ?? null,
          alcance,
          interacoes,
        };
      }
    } catch (e) {
      console.error("midiakit-publico: erro no Instagram:", e);
    }

    try {
      const token = await obterAccessTokenValidoTiktok(ctx.supabaseAdmin);
      if (token) {
        const [perfil, views] = await Promise.all([
          buscarPerfilTiktok(token.access_token).catch(() => null),
          somarViewsTiktok(token.access_token).catch(() => null),
        ]);
        tiktok = {
          seguidores: perfil?.follower_count ?? null,
          curtidas: perfil?.likes_count ?? null,
          views,
        };
      }
    } catch (e) {
      console.error("midiakit-publico: erro no TikTok:", e);
    }

    return jsonResponse({ ok: true, instagram, tiktok });
  }),
};
