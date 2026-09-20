// ==========================================================================
// supabase/functions/enviar-emails/index.ts
// ==========================================================================
// Dispara um lote de e-mails de prospecção pelo Resend, um por um, com
// pausa entre cada envio pra respeitar o ritmo seguro da conta. Chamada
// pela aba E-mail do painel, sempre autenticada e só pra dona da conta
// (ver _shared/dono.ts) — a chave do Resend nunca passa pelo painel, fica
// só no segredo RESEND_API_KEY desta função, configurado no Supabase.
//
// Recebe no máximo 250 destinatários por chamada (o painel já manda em
// lotes de 100, isso aqui é só o limite de segurança final). Cada
// destinatário vira UMA linha em email_envios, com sucesso ou erro — é
// assim que a aba sabe quem já recebeu se um disparo parar no meio.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { ehDono } from "../_shared/dono.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MAX_DESTINATARIOS = 250;
const PAUSA_ENTRE_ENVIOS_MS = 200;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function dormir(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Primeiro nome da marca, pra usar em {{nome}} — "Loja Bela Estética" vira
// "Loja". Marca sem espaço usa ela inteira.
function primeiroNome(marca: string): string {
  return marca.trim().split(/\s+/)[0] || marca;
}

function substituirVariaveis(texto: string, marca: string): string {
  return texto
    .replace(/\{\{\s*nome\s*\}\}/gi, primeiroNome(marca))
    .replace(/\{\{\s*marca\s*\}\}/gi, marca);
}

interface Destinatario {
  email: string;
  marca: string;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    if (req.method !== "POST") return jsonResponse({ ok: false, error: "method not allowed" }, 405);

    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return jsonResponse({ ok: false, error: "RESEND_API_KEY não configurada nos segredos da função" }, 500);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "JSON inválido" }, 400);
    }

    const assunto = typeof body.assunto === "string" ? body.assunto.trim() : "";
    const corpoHtml = typeof body.corpoHtml === "string" ? body.corpoHtml : "";
    const remetente = typeof body.remetente === "string" ? body.remetente.trim() : "";
    const replyTo = typeof body.replyTo === "string" ? body.replyTo.trim() : "";
    const destinatariosBrutos = Array.isArray(body.destinatarios) ? (body.destinatarios as Destinatario[]) : [];

    if (!assunto) return jsonResponse({ ok: false, error: "assunto obrigatório" }, 400);
    if (!corpoHtml) return jsonResponse({ ok: false, error: "corpoHtml obrigatório" }, 400);
    if (!remetente) return jsonResponse({ ok: false, error: "remetente obrigatório" }, 400);
    if (!replyTo) return jsonResponse({ ok: false, error: "replyTo obrigatório" }, 400);
    if (destinatariosBrutos.length === 0) return jsonResponse({ ok: false, error: "nenhum destinatário" }, 400);
    if (destinatariosBrutos.length > MAX_DESTINATARIOS) {
      return jsonResponse({ ok: false, error: `no máximo ${MAX_DESTINATARIOS} destinatários por chamada` }, 400);
    }

    // Dedup defensivo por e-mail (o painel já manda deduplicado, isso aqui
    // é só uma segunda trava pra nunca mandar duas vezes na mesma chamada).
    const vistos = new Set<string>();
    const destinatarios = destinatariosBrutos.filter((d) => {
      const email = (d.email || "").trim().toLowerCase();
      if (!email || vistos.has(email)) return false;
      vistos.add(email);
      return true;
    });

    const { data: optoutData, error: erroOptout } = await ctx.supabaseAdmin.from("email_optout").select("email");
    if (erroOptout) {
      return jsonResponse({ ok: false, error: "não foi possível conferir a lista de descadastro" }, 500);
    }
    const descadastrados = new Set((optoutData || []).map((o: { email: string }) => o.email.toLowerCase()));

    let enviados = 0;
    let falhas = 0;
    let pulados = 0;
    let cotaEsgotada = false;

    for (let i = 0; i < destinatarios.length; i++) {
      const destinatario = destinatarios[i];
      const email = (destinatario.email || "").trim().toLowerCase();
      const marca = destinatario.marca || email;

      if (!email || descadastrados.has(email)) {
        pulados++;
        continue;
      }

      const htmlPersonalizado = substituirVariaveis(corpoHtml, marca);
      const assuntoPersonalizado = substituirVariaveis(assunto, marca);

      try {
        const resposta = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: remetente,
            to: [email],
            reply_to: replyTo,
            subject: assuntoPersonalizado,
            html: htmlPersonalizado,
            headers: {
              "List-Unsubscribe": `<mailto:${replyTo}?subject=SAIR>`,
            },
          }),
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
          const nomeErro = resultado?.name || "";
          const mensagemErro = resultado?.message || JSON.stringify(resultado);

          await ctx.supabaseAdmin.from("email_envios").insert({
            email,
            assunto: assuntoPersonalizado,
            status: "erro",
            erro: mensagemErro,
          });
          falhas++;

          // Cota diária do Resend esgotada: para na hora, sem tentar o
          // resto da lista, e avisa quantos ficaram faltando.
          if (nomeErro === "daily_quota_exceeded" || /daily quota/i.test(mensagemErro)) {
            cotaEsgotada = true;
            break;
          }
        } else {
          await ctx.supabaseAdmin.from("email_envios").insert({
            email,
            assunto: assuntoPersonalizado,
            status: "ok",
            resend_id: resultado?.id || null,
          });
          enviados++;
        }
      } catch (e) {
        await ctx.supabaseAdmin.from("email_envios").insert({
          email,
          assunto: assuntoPersonalizado,
          status: "erro",
          erro: (e as Error).message,
        });
        falhas++;
      }

      if (i < destinatarios.length - 1) await dormir(PAUSA_ENTRE_ENVIOS_MS);
    }

    const restantes = destinatarios.length - enviados - falhas - pulados;

    return jsonResponse({
      ok: true,
      enviados,
      falhas,
      pulados,
      cotaEsgotada,
      restantes: restantes > 0 ? restantes : 0,
    });
  }),
};
