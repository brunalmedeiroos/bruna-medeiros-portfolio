// ==========================================================================
// supabase/functions/calendar-push-evento/index.ts
// ==========================================================================
// Chamada pelo painel (fire-and-forget, sem travar o salvamento) toda vez
// que uma tarefa é criada ou editada em painel_tarefas. Cria ou atualiza o
// evento correspondente na agenda "Creator Center" e grava de volta o
// google_event_id/google_updated_at na linha.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  chamarCalendar,
  obterAccessTokenValido,
  obterOuCriarCalendarioCreatorCenter,
  tarefaParaEventoGoogle,
} from "../_shared/calendar.ts";
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
    // Não conectado: não é erro, o painel só segue funcionando sem sincronizar.
    if (!accessToken) return jsonResponse({ ok: false, error: "not_connected" }, 200);

    const { tarefa_id } = await req.json().catch(() => ({}));
    if (!tarefa_id) return jsonResponse({ ok: false, error: "tarefa_id obrigatório" }, 400);

    const { data: tarefa, error: erroTarefa } = await ctx.supabaseAdmin
      .from("painel_tarefas")
      .select("id, titulo, tipo, data, hora_inicio, hora_fim, google_event_id")
      .eq("id", tarefa_id)
      .maybeSingle();
    if (erroTarefa) return jsonResponse({ ok: false, error: erroTarefa.message }, 500);
    if (!tarefa) return jsonResponse({ ok: false, error: "not_found" }, 404);

    try {
      const calendarId = await obterOuCriarCalendarioCreatorCenter(ctx.supabaseAdmin, accessToken);
      const corpo = tarefaParaEventoGoogle(tarefa);

      // deno-lint-ignore no-explicit-any
      let evento: any = null;
      if (tarefa.google_event_id) {
        try {
          evento = await chamarCalendar(
            accessToken,
            `/calendars/${encodeURIComponent(calendarId)}/events/${tarefa.google_event_id}`,
            { method: "PUT", body: JSON.stringify(corpo) },
          );
        } catch (_e) {
          // O evento pode ter sido apagado direto no Google antes desta
          // atualização chegar — recria em vez de falhar.
          evento = null;
        }
      }
      if (!evento) {
        evento = await chamarCalendar(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: "POST",
          body: JSON.stringify(corpo),
        });
      }

      const { error: erroSalvar } = await ctx.supabaseAdmin
        .from("painel_tarefas")
        .update({ google_event_id: evento.id, google_updated_at: evento.updated })
        .eq("id", tarefa_id);
      if (erroSalvar) return jsonResponse({ ok: false, error: erroSalvar.message }, 500);

      return jsonResponse({ ok: true, google_event_id: evento.id });
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
