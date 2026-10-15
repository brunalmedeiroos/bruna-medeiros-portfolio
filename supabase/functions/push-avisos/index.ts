// ==========================================================================
// supabase/functions/push-avisos/index.ts
// ==========================================================================
// O "carteiro" dos avisos no celular. Dois jeitos de chamar:
//  1) pg_cron, a cada 1 minuto (protegido pelo mesmo segredo do instagram-scheduler):
//     procura em painel_avisos o que já venceu e ainda não foi enviado, e manda
//     a notificação push pra todos os aparelhos de painel_push_assinaturas.
//  2) O painel, logado como a dona da conta, com { acao: "testar" }: manda uma
//     notificação de teste na hora.
//
// Segredos necessários (supabase secrets set): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT e INSTAGRAM_AUTOMACAO_CRON_SECRET (esse já existe).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import webpush from "web-push";
import { ehDono } from "../_shared/dono.ts";
import { criarAvisosAutomaticos } from "../_shared/avisos-automaticos.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Aviso que passou de 6 horas sem ser enviado (ex.: ela ainda não tinha ativado as notificações)
// é considerado perdido e não dispara de surpresa depois.
const JANELA_MS = 6 * 3600 * 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

interface Assinatura {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// deno-lint-ignore no-explicit-any
async function enviarParaTodos(admin: any, assinaturas: Assinatura[], payload: Record<string, unknown>) {
  let enviadas = 0;
  let falhas = 0;
  const mortas: string[] = [];
  await Promise.all(
    assinaturas.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          JSON.stringify(payload),
          { TTL: 3600, urgency: "high" },
        );
        enviadas++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: o aparelho desfez a assinatura. Limpa pra não tentar de novo.
        if (status === 404 || status === 410) mortas.push(a.id);
        else {
          falhas++;
          console.error("Falha ao enviar push:", status, (e as Error).message);
        }
      }
    }),
  );
  if (mortas.length) await admin.from("painel_push_assinaturas").delete().in("id", mortas);
  return { enviadas, falhas, removidas: mortas.length };
}

function textoHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).format(new Date(iso));
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const admin = ctx.supabaseAdmin;
    const authHeader = req.headers.get("Authorization") || "";
    const segredoCron = Deno.env.get("INSTAGRAM_AUTOMACAO_CRON_SECRET") ?? "";
    const ehCron = !!segredoCron && authHeader === `Bearer ${segredoCron}`;
    if (!ehCron && !(await ehDono(req, admin))) return jsonResponse({ ok: false, error: "unauthorized" }, 401);

    const publica = Deno.env.get("VAPID_PUBLIC_KEY");
    const privada = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!publica || !privada) return jsonResponse({ ok: false, error: "vapid_nao_configurado" }, 500);
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "https://brunamedeiros.com", publica, privada);

    let corpo: { acao?: string } = {};
    try {
      corpo = await req.json();
    } catch (_e) {
      /* o cron manda corpo vazio */
    }

    try {
      const { data: assinaturas, error: erroAss } = await admin.from("painel_push_assinaturas").select("id, endpoint, p256dh, auth");
      if (erroAss) throw erroAss;
      const lista = (assinaturas || []) as Assinatura[];

      if (!ehCron && corpo.acao === "testar") {
        if (lista.length === 0) return jsonResponse({ ok: true, aparelhos: 0, enviadas: 0 });
        const r = await enviarParaTodos(admin, lista, {
          titulo: "Notificação de teste",
          corpo: "Deu certo! Os avisos vão chegar assim no seu celular.",
          tag: "teste",
          url: "/painel/",
        });
        return jsonResponse({ ok: true, aparelhos: lista.length, ...r });
      }

      // Rotina do relógio: sem aparelho cadastrado não tem pra quem enviar, então nem reserva os avisos.
      if (lista.length === 0) return jsonResponse({ ok: true, aparelhos: 0, avisos: 0 });

      const agora = new Date();
      // Cria os avisos automáticos desta hora (compromissos do Calendário e pendências das 8h).
      const criados = await criarAvisosAutomaticos(admin, agora);
      // Reserva os avisos vencidos num UPDATE só (evita duplicar se duas rodadas se cruzarem).
      const { data: devidos, error: erroAvisos } = await admin
        .from("painel_avisos")
        .update({ enviado_em: agora.toISOString() })
        .eq("ativo", true)
        .is("enviado_em", null)
        .lte("quando", agora.toISOString())
        .gte("quando", new Date(agora.getTime() - JANELA_MS).toISOString())
        .select("id, titulo, quando, corpo");
      if (erroAvisos) throw erroAvisos;

      let enviados = 0;
      for (const aviso of devidos || []) {
        const r = await enviarParaTodos(admin, lista, {
          titulo: aviso.titulo,
          corpo: aviso.corpo || `Importante · aviso das ${textoHora(aviso.quando)}`,
          tag: `aviso-${aviso.id}`,
          url: "/painel/",
        });
        if (r.enviadas > 0) enviados++;
        // Nenhum aparelho recebeu por falha de envio (não por assinatura morta): libera pra tentar no próximo minuto.
        else if (r.falhas > 0) await admin.from("painel_avisos").update({ enviado_em: null }).eq("id", aviso.id);
      }

      return jsonResponse({ ok: true, aparelhos: lista.length, avisos: (devidos || []).length, enviados, criados });
    } catch (e) {
      console.error("Erro no push-avisos:", e);
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
