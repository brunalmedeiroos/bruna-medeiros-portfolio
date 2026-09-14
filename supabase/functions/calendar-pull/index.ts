// ==========================================================================
// supabase/functions/calendar-pull/index.ts
// ==========================================================================
// Chamada pelo painel ao abrir o Calendário e pelo botão "Sincronizar
// agora". Busca o que mudou na agenda "Creator Center" desde a última vez
// (via o "sync token" incremental do Google — eficiente, não rebusca tudo)
// e atualiza painel_tarefas: evento novo lá vira tarefa nova aqui, editado
// lá atualiza aqui, apagado lá remove aqui. Nunca mexe em "feito"/checklist.
//
// singleEvents=true é o que faz o Google expandir qualquer evento recorrente
// em instâncias individuais antes de devolver — evita ter que interpretar
// RRULE aqui (nunca guardamos recorrência no lado do Google, só no painel).
//
// Anti-eco: todo evento que o painel cria carrega
// extendedProperties.private.painel_tarefas_id (ver tarefaParaEventoGoogle
// em _shared/calendar.ts). Se o "updated" que o Google devolve pra esse
// evento já é <= o que guardamos da última vez que NÓS escrevemos nele, é
// eco da nossa própria gravação — ignora. Só aplica a mudança quando
// "updated" é mais novo, o que só acontece se ela editou direto no Google.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  chamarCalendar,
  eventoGoogleParaTarefaParcial,
  obterAccessTokenValido,
  obterOuCriarCalendarioCreatorCenter,
  PROPRIEDADE_TAREFA_ID_CHAVE,
} from "../_shared/calendar.ts";
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

    const { data: linhaToken } = await ctx.supabaseAdmin
      .from("calendar_tokens")
      .select("sync_token")
      .eq("id", 1)
      .maybeSingle();

    const calendarId = await obterOuCriarCalendarioCreatorCenter(ctx.supabaseAdmin, accessToken);
    const syncToken: string | null = linhaToken?.sync_token || null;

    // deno-lint-ignore no-explicit-any
    let eventos: any[] = [];
    let novoSyncToken: string | null = null;

    try {
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams();
        params.set("singleEvents", "true");
        params.set("maxResults", "250");
        if (pageToken) params.set("pageToken", pageToken);
        if (syncToken) {
          params.set("syncToken", syncToken);
        } else {
          // Primeira sincronização: sem syncToken ainda, então limita por
          // uma janela de tempo razoável (1 ano atrás até 2 anos à frente)
          // em vez de trazer o histórico inteiro da agenda.
          const agora = new Date();
          const inicio = new Date(agora);
          inicio.setFullYear(inicio.getFullYear() - 1);
          const fim = new Date(agora);
          fim.setFullYear(fim.getFullYear() + 2);
          params.set("timeMin", inicio.toISOString());
          params.set("timeMax", fim.toISOString());
        }

        const resposta = await chamarCalendar(
          accessToken,
          `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        );
        eventos = eventos.concat(resposta.items || []);
        pageToken = resposta.nextPageToken;
        if (resposta.nextSyncToken) novoSyncToken = resposta.nextSyncToken;
      } while (pageToken);
    } catch (e) {
      const msg = (e as Error).message;
      if (syncToken && msg.includes("410")) {
        // Sync token expirado/inválido no Google — descarta e pede pra
        // tentar de novo (da próxima vez, faz uma varredura completa).
        await ctx.supabaseAdmin.from("calendar_tokens").update({ sync_token: null }).eq("id", 1);
        return jsonResponse({ ok: false, error: "sync_token_expirado_tente_novamente" }, 200);
      }
      return jsonResponse({ ok: false, error: msg }, 500);
    }

    let importados = 0;
    let atualizados = 0;
    let removidos = 0;

    for (const evento of eventos) {
      const tarefaIdMarcada: string | null = evento.extendedProperties?.private?.[PROPRIEDADE_TAREFA_ID_CHAVE] || null;

      if (evento.status === "cancelled") {
        const { data: existente } = await ctx.supabaseAdmin
          .from("painel_tarefas")
          .select("id")
          .eq("google_event_id", evento.id)
          .maybeSingle();
        if (existente) {
          await ctx.supabaseAdmin.from("painel_tarefas").delete().eq("id", existente.id);
          removidos++;
        }
        continue;
      }

      if (tarefaIdMarcada) {
        const { data: linha } = await ctx.supabaseAdmin
          .from("painel_tarefas")
          .select("id, google_updated_at")
          .eq("id", tarefaIdMarcada)
          .maybeSingle();

        if (!linha) {
          // A tarefa foi apagada no painel mas o push de exclusão não
          // chegou a tempo (ou falhou) — reconcilia apagando no Google.
          try {
            await chamarCalendar(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${evento.id}`, {
              method: "DELETE",
            });
          } catch (_e) {
            // best-effort
          }
          continue;
        }

        const jaConhecido = linha.google_updated_at && new Date(evento.updated) <= new Date(linha.google_updated_at);
        if (jaConhecido) continue; // eco da nossa própria última gravação

        const parcial = eventoGoogleParaTarefaParcial(evento);
        await ctx.supabaseAdmin
          .from("painel_tarefas")
          .update({ ...parcial, google_event_id: evento.id, google_updated_at: evento.updated })
          .eq("id", linha.id);
        atualizados++;
        continue;
      }

      // Evento genuinamente estranho ao painel — criado direto no Google.
      const { data: jaExiste } = await ctx.supabaseAdmin
        .from("painel_tarefas")
        .select("id")
        .eq("google_event_id", evento.id)
        .maybeSingle();
      const parcial = eventoGoogleParaTarefaParcial(evento);

      if (jaExiste) {
        await ctx.supabaseAdmin
          .from("painel_tarefas")
          .update({ ...parcial, google_updated_at: evento.updated })
          .eq("id", jaExiste.id);
        atualizados++;
      } else {
        await ctx.supabaseAdmin.from("painel_tarefas").insert({
          ...parcial,
          tipo: "Compromisso",
          origem: "google",
          google_event_id: evento.id,
          google_updated_at: evento.updated,
        });
        importados++;
      }
    }

    if (novoSyncToken) {
      await ctx.supabaseAdmin
        .from("calendar_tokens")
        .update({ sync_token: novoSyncToken, updated_at: new Date().toISOString() })
        .eq("id", 1);
    }

    return jsonResponse({ ok: true, importados, atualizados, removidos });
  }),
};
