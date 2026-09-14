// ==========================================================================
// supabase/functions/calendar-push-excluir/index.ts
// ==========================================================================
// Chamada pelo painel (fire-and-forget) toda vez que uma tarefa com
// google_event_id é apagada de painel_tarefas. Apaga o evento
// correspondente na agenda "Creator Center". Idempotente: se o evento já
// não existe mais no Google (404/410), conta como sucesso.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarCalendar, obterAccessTokenValido, obterOuCriarCalendarioCreatorCenter } from "../_shared/calendar.ts";
import { ehDono } from "../_shared/dono.ts";

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

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    let accessToken: string | null;
    try {
      accessToken = await obterAccessTokenValido(ctx.supabaseAdmin);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
    if (!accessToken) return jsonResponse({ ok: false, error: "not_connected" }, 200);

    const { google_event_id } = await req.json().catch(() => ({}));
    if (!google_event_id) return jsonResponse({ ok: false, error: "google_event_id obrigatório" }, 400);

    try {
      const calendarId = await obterOuCriarCalendarioCreatorCenter(ctx.supabaseAdmin, accessToken);
      try {
        await chamarCalendar(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${google_event_id}`, {
          method: "DELETE",
        });
      } catch (e) {
        const msg = (e as Error).message;
        const jaNaoExiste = msg.includes("404") || msg.includes("410") || msg.includes("Gone") || msg.includes("Not Found");
        if (!jaNaoExiste) throw e;
      }
      return jsonResponse({ ok: true });
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
