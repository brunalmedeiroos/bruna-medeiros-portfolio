// ==========================================================================
// supabase/functions/planejamento-semanal/index.ts
// ==========================================================================
// Agente de sugestão semanal. Olha o banco da Bruna (achados ainda não
// usados, ideias já salvas, o que já foi postado, notícias do Radar ainda
// não usadas) e pede pro Gemini montar até 6 sugestões pra semana, gravando
// em planejamento_semanal. Chamada tanto pelo agendamento de toda segunda
// (pg_cron, com o segredo radar_cron_secret) quanto pelo botão "Gerar
// agora" do painel (com a sessão da usuária logada) — mesmo esquema de
// acesso do radar-atualizar.
//
// Depois de gravar as sugestões, cria um aviso em painel_avisos (chave
// única por semana) pra o push-avisos notificar o celular dela que o
// planejamento já está pronto.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { gerarSugestoesComGemini } from "../_shared/planejamento.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

// Segunda-feira (America/Fortaleza) da semana de "agora".
function segundaFeiraAtual(agora: Date): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Fortaleza",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  const diaSemana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[partes.weekday as string] ?? 1;
  const base = new Date(Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day)));
  const diffPraSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  base.setUTCDate(base.getUTCDate() + diffPraSegunda);
  return base.toISOString().slice(0, 10);
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

    const admin = ctx.supabaseAdmin;

    try {
      const [achadosRes, jaSugeridosRes, ideiasRes, pilaresRes, radarRes] = await Promise.all([
        admin.from("planejador_achados").select("id, conteudo, coluna, como_usar"),
        admin.from("planejamento_semanal").select("achado_id").not("achado_id", "is", null),
        admin.from("ideias_conteudos").select("titulo, status, created_at").order("created_at", { ascending: false }).limit(300),
        admin.from("planejador_pilares").select("nome"),
        admin.from("radar_noticias").select("titulo, categoria, adaptacao").eq("usada", false).order("created_at", { ascending: false }).limit(20),
      ]);
      if (achadosRes.error) throw achadosRes.error;
      if (jaSugeridosRes.error) throw jaSugeridosRes.error;
      if (ideiasRes.error) throw ideiasRes.error;
      if (pilaresRes.error) throw pilaresRes.error;
      if (radarRes.error) throw radarRes.error;

      const idsJaSugeridos = new Set((jaSugeridosRes.data || []).map((r: { achado_id: string }) => r.achado_id));
      const achados = (achadosRes.data || []).filter((a: { id: string }) => !idsJaSugeridos.has(a.id));
      const todasIdeias = ideiasRes.data || [];
      const ideiasExistentes = todasIdeias.filter((i: { status: string }) => i.status !== "Publicado").slice(0, 200);
      const postadas = todasIdeias.filter((i: { status: string }) => i.status === "Publicado").slice(0, 40);
      const nomesPilares = (pilaresRes.data || []).map((p: { nome: string }) => p.nome);
      const tendencias = radarRes.data || [];

      const sugestoes = await gerarSugestoesComGemini({
        achados,
        ideiasExistentes,
        postadas,
        tendencias,
        nomesPilares,
      });

      const semana = segundaFeiraAtual(new Date());
      let inseridas = 0;
      for (const s of sugestoes) {
        if (!s.titulo) continue;
        const { error } = await admin.from("planejamento_semanal").insert({
          semana,
          tipo: s.tipo,
          titulo: s.titulo,
          descricao: s.descricao || null,
          pilar_sugerido: s.pilar_sugerido || null,
          achado_id: s.achado_id,
          status: "pendente",
        });
        if (error) console.error("Erro ao inserir sugestão semanal:", error);
        else inseridas++;
      }

      if (inseridas > 0) {
        // Aviso único por semana (chave: planejamento:<segunda>) — se já existir
        // (rodou de novo manualmente na mesma semana), não duplica a notificação.
        await admin.from("painel_avisos").upsert(
          {
            chave: `planejamento:${semana}`,
            titulo: "Planejamento da semana pronto",
            quando: new Date().toISOString(),
            ativo: true,
            corpo: `Oii Bru, o planejamento da semana já foi montado! ${inseridas} sugestão${inseridas === 1 ? "" : "ões"} esperando você.`,
          },
          { onConflict: "chave", ignoreDuplicates: true },
        );
      }

      return jsonResponse({ ok: true, inseridas });
    } catch (e) {
      console.error("Erro no planejamento-semanal:", e);
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
