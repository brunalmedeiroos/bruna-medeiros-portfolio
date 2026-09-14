// ==========================================================================
// supabase/functions/calendar-oauth-disconnect/index.ts
// ==========================================================================
// Chamada pelo painel quando a Bruna clica em "Desconectar" no Calendário.
// Apaga o token guardado e limpa o rastreio de sincronização de
// painel_tarefas — se ela reconectar depois, uma agenda "Creator Center"
// NOVA é criada (a antiga fica órfã na conta Google, sem ligação com o
// painel; ela pode apagá-la manualmente se quiser).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { ehDono } from "../_shared/dono.ts";
import { apagarSegredo } from "../_shared/vault.ts";

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

    const { data: linha, error: erroLeitura } = await ctx.supabaseAdmin
      .from("calendar_tokens")
      .select("access_token, refresh_token")
      .eq("id", 1)
      .maybeSingle();
    if (erroLeitura) return jsonResponse({ ok: false, error: erroLeitura.message }, 500);

    const { error } = await ctx.supabaseAdmin.from("calendar_tokens").delete().eq("id", 1);
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    // Apaga os segredos do Vault também — não só a referência — senão o
    // nome fica preso e a próxima conexão falha com "duplicate key".
    // Best-effort: se isso falhar, a desconexão em si já foi concluída.
    if (linha?.access_token) {
      try {
        await apagarSegredo(ctx.supabaseAdmin, linha.access_token);
      } catch (e) {
        console.error("Erro ao apagar segredo (access) do Google Agenda:", e);
      }
    }
    if (linha?.refresh_token) {
      try {
        await apagarSegredo(ctx.supabaseAdmin, linha.refresh_token);
      } catch (e) {
        console.error("Erro ao apagar segredo (refresh) do Google Agenda:", e);
      }
    }

    // Não apaga as tarefas em si — só o rastreio de sincronização. As linhas
    // que vieram de eventos criados direto no Google continuam existindo no
    // painel como tarefas normais, só deixam de estar ligadas a um evento.
    const { error: erroLimpeza } = await ctx.supabaseAdmin
      .from("painel_tarefas")
      .update({ google_event_id: null, google_updated_at: null, origem: "painel" })
      .not("google_event_id", "is", null);
    if (erroLimpeza) console.error("Erro ao limpar rastreio de sincronização do Calendário:", erroLimpeza);

    return jsonResponse({ ok: true });
  }),
};
