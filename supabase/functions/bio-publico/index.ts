// ==========================================================================
// supabase/functions/bio-publico/index.ts
// ==========================================================================
// Endpoint público (auth: "none") da página /bio do site.
//   GET  -> devolve a configuração salva no painel (Instagram > Link na bio).
//   POST -> registra uma visita ou um clique ({ tipo, elemento, visitante }).
//
// SEGURANÇA: a config é pública por natureza (é o conteúdo da própria página).
// Os eventos são validados com regex estrito e só entram em bio_eventos pelo
// service_role; nenhuma leitura de eventos é exposta aqui.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extra },
  });
}

const RE_ELEMENTO = /^[a-z0-9_]{1,40}$/;
const RE_VISITANTE = /^[A-Za-z0-9_-]{8,64}$/;

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    if (req.method === "GET") {
      const { data, error } = await ctx.supabaseAdmin
        .from("bio_config")
        .select("config, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse(
        { ok: true, config: data?.config ?? {}, updated_at: data?.updated_at ?? null },
        200,
        { "Cache-Control": "public, max-age=15" },
      );
    }

    if (req.method === "POST") {
      let corpo: Record<string, unknown>;
      try {
        corpo = JSON.parse(await req.text());
      } catch {
        return jsonResponse({ ok: false, error: "json inválido" }, 400);
      }
      const tipo = corpo.tipo;
      const visitante = corpo.visitante;
      const elemento = tipo === "view" ? "pagina" : corpo.elemento;
      if (tipo !== "view" && tipo !== "click") return jsonResponse({ ok: false, error: "tipo inválido" }, 400);
      if (typeof elemento !== "string" || !RE_ELEMENTO.test(elemento)) {
        return jsonResponse({ ok: false, error: "elemento inválido" }, 400);
      }
      if (typeof visitante !== "string" || !RE_VISITANTE.test(visitante)) {
        return jsonResponse({ ok: false, error: "visitante inválido" }, 400);
      }

      const { error } = await ctx.supabaseAdmin.from("bio_eventos").insert({ tipo, elemento, visitante });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "method not allowed" }, 405);
  }),
};
