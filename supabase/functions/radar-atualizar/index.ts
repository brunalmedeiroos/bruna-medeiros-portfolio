// ==========================================================================
// supabase/functions/radar-atualizar/index.ts
// ==========================================================================
// Busca notícias nos feeds RSS de cada agente, pede pro Gemini escolher as
// mais relevantes e escrever o roteiro/insight, e grava o resultado em
// radar_noticias. Chamada tanto pelo agendamento diário (pg_cron, com a
// service_role key) quanto pelo botão "Atualizar notícias" do painel (com a
// sessão da usuária logada) — por isso a verificação de acesso abaixo aceita
// as duas formas em vez de usar withSupabase({ auth: "user" }), que só
// reconheceria uma sessão de usuário de verdade.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { AGENTES, buscarFeed, selecionarNoticiasComGemini } from "../_shared/radar.ts";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ehCron = authHeader === `Bearer ${serviceRoleKey}`;
    if (!ehCron) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data } = await ctx.supabaseAdmin.auth.getUser(token);
      if (!data.user) return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    const resultadosPorAgente: Record<string, { inseridas: number; erro?: string }> = {};

    for (const [chave, agente] of Object.entries(AGENTES)) {
      try {
        const feeds = await Promise.all(agente.feeds.map((f) => buscarFeed(f.url, f.fonte)));
        const itens = feeds.flat();

        if (itens.length === 0) {
          resultadosPorAgente[chave] = { inseridas: 0, erro: "Nenhuma notícia encontrada nos feeds desse agente agora." };
          continue;
        }

        const selecionadas = await selecionarNoticiasComGemini(agente.instrucao, itens);

        let inseridas = 0;
        for (const noticia of selecionadas) {
          if (!noticia.link || !noticia.titulo) continue;

          // Evita duplicar a mesma notícia (mesmo link) pro mesmo agente.
          const { data: existente } = await ctx.supabaseAdmin
            .from("radar_noticias")
            .select("id")
            .eq("agente", agente.nome)
            .eq("link", noticia.link)
            .maybeSingle();
          if (existente) continue;

          const { error } = await ctx.supabaseAdmin.from("radar_noticias").insert({
            agente: agente.nome,
            titulo: noticia.titulo,
            resumo: noticia.resumo || null,
            fonte: noticia.fonte || null,
            link: noticia.link,
            data_publicacao: paraDataValida(noticia.data_publicacao),
            insight: noticia.insight || null,
          });
          if (!error) inseridas++;
          else console.error(`Erro ao inserir notícia do agente ${agente.nome}:`, error);
        }

        resultadosPorAgente[chave] = { inseridas };
      } catch (e) {
        console.error(`Erro no agente ${agente.nome}:`, e);
        resultadosPorAgente[chave] = { inseridas: 0, erro: (e as Error).message };
      }
    }

    return jsonResponse({ ok: true, resultados: resultadosPorAgente });
  }),
};
