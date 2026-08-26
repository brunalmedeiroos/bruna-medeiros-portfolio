// ==========================================================================
// supabase/functions/track/index.ts
// ==========================================================================
// Endpoint público chamado pelo site (index.html) pra registrar visitas,
// cliques e mensagens de contato. Usa ctx.supabaseAdmin (chave service_role,
// injetada automaticamente pelo Supabase) pra gravar direto nas tabelas,
// ignorando o RLS — por isso o site nunca precisa ter uma chave de escrita.
//
// auth: 'none' porque quem chama isso é o navegador de qualquer visitante
// (não autenticado). A segurança aqui não vem de exigir uma chave, e sim
// de validar o formato de tudo que é aceito antes de gravar.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const TIPOS_EVENTO = ["page_view", "button_click", "video_view"];
const ORIGENS_LEAD = ["contact", "popup"];

// Corta uma string pra um tamanho máximo, evitando payloads gigantes.
function limitar(valor: unknown, tamanho: number): string | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim();
  if (!v) return null;
  return v.slice(0, tamanho);
}

function validarEvento(data: Record<string, unknown>) {
  if (!TIPOS_EVENTO.includes(data.event_type as string)) {
    return { erro: "event_type inválido" };
  }
  const session_id = limitar(data.session_id, 100);
  if (!session_id) return { erro: "session_id obrigatório" };

  let metadata: Record<string, unknown> | null = null;
  if (data.metadata && typeof data.metadata === "object") {
    // Limita o tamanho do JSON de metadata pra evitar abuso.
    const serializado = JSON.stringify(data.metadata);
    if (serializado.length <= 2000) metadata = data.metadata as Record<string, unknown>;
  }

  return {
    linha: {
      event_type: data.event_type,
      event_name: limitar(data.event_name, 200),
      session_id,
      page_path: limitar(data.page_path, 300),
      metadata,
    },
  };
}

function validarLead(data: Record<string, unknown>) {
  const name = limitar(data.name, 200);
  const email = limitar(data.email, 200);
  const source = ORIGENS_LEAD.includes(data.source as string) ? data.source : "contact";

  if (!name) return { erro: "nome obrigatório" };
  if (!email || !email.includes("@")) return { erro: "e-mail inválido" };

  return {
    linha: {
      name,
      email,
      phone: limitar(data.phone, 40),
      brand: limitar(data.brand, 200),
      budget: limitar(data.budget, 100),
      message: limitar(data.message, 5000),
      source,
    },
  };
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "method not allowed" }, 405);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "JSON inválido" }, 400);
    }

    const kind = body.kind;
    const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;

    if (kind === "event") {
      const resultado = validarEvento(data);
      if (resultado.erro) return jsonResponse({ ok: false, error: resultado.erro }, 400);

      const { error } = await ctx.supabaseAdmin.from("portfolio_events").insert(resultado.linha);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    if (kind === "lead") {
      const resultado = validarLead(data);
      if (resultado.erro) return jsonResponse({ ok: false, error: resultado.erro }, 400);

      const { error } = await ctx.supabaseAdmin.from("portfolio_leads").insert(resultado.linha);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "kind inválido (use 'event' ou 'lead')" }, 400);
  }),
};
