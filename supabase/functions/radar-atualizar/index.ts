// ==========================================================================
// supabase/functions/radar-atualizar/index.ts
// ==========================================================================
// Busca notícias em todos os feeds do radar, pede pro Gemini escolher as
// mais relevantes pro perfil da Bruna e escrever o resumo/relevância/
// adaptação de cada uma, e grava o resultado em radar_noticias. Chamada
// tanto pelo agendamento diário (pg_cron, com o segredo RADAR_CRON_SECRET)
// quanto pelo botão "Atualizar notícias" do painel (com a sessão da
// usuária logada) — por isso a verificação de acesso abaixo aceita as duas
// formas em vez de usar withSupabase({ auth: "user" }), que só
// reconheceria uma sessão de usuário de verdade.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { FEEDS, buscarFeed, selecionarNoticiasComGemini } from "../_shared/radar.ts";

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

function paraDataValida(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const authHeader = req.headers.get("Authorization") || "";
    const segredoCron = Deno.env.get("RADAR_CRON_SECRET") ?? "";
    const ehCron = !!segredoCron && authHeader === `Bearer ${segredoCron}`;
    if (!ehCron) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data } = await ctx.supabaseAdmin.auth.getUser(token);
      if (!data.user) return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    try {
      const feeds = await Promise.all(FEEDS.map((f) => buscarFeed(f.url, f.fonte)));
      const itens = feeds.flat();

      if (itens.length === 0) {
        return jsonResponse({ ok: true, inseridas: 0, erro: "Nenhuma notícia encontrada nos feeds agora." });
      }

      const selecionadas = await selecionarNoticiasComGemini(itens);

      let inseridas = 0;
      for (const noticia of selecionadas) {
        if (!noticia.link || !noticia.titulo) continue;

        // Evita duplicar a mesma notícia usando a trava do próprio banco
        // (radar_noticias_link_unq), em vez de um select-antes-de-inserir
        // separado — seguro mesmo se o cron diário e um clique manual em
        // "Atualizar notícias" rodarem juntos.
        const { data, error } = await ctx.supabaseAdmin
          .from("radar_noticias")
          .upsert(
            {
              categoria: noticia.categoria || null,
              titulo: noticia.titulo,
              resumo: noticia.resumo || null,
              relevancia: noticia.relevancia || null,
              adaptacao: noticia.adaptacao || null,
              fonte: noticia.fonte ? noticia.fonte.replace(/^\[|\]$/g, "").trim() : null,
              link: noticia.link,
              data_publicacao: paraDataValida(noticia.data_publicacao),
            },
            { onConflict: "link", ignoreDuplicates: true },
          )
          .select("id");
        if (error) console.error("Erro ao inserir notícia do radar:", error);
        else if (data && data.length > 0) inseridas++;
      }

      return jsonResponse({ ok: true, inseridas });
    } catch (e) {
      console.error("Erro ao atualizar o radar:", e);
      return jsonResponse({ ok: false, error: (e as Error).message });
    }
  }),
};
