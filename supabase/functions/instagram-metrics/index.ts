// ==========================================================================
// supabase/functions/instagram-metrics/index.ts
// ==========================================================================
// Chamada pelo painel (autenticada) pra montar a Visão Geral do Instagram:
// perfil, crescimento e alcance dia a dia, saúde do envio das automações
// (últimos 30 dias), o que as pessoas mais comentam/mandam, quantos dias
// faltam pro token vencer e quantas entregas saíram nas últimas 24h. Cada
// bloco é buscado com try/catch isolado: se um pedaço falhar (permissão
// faltando, métrica descontinuada pela Meta), o resto da resposta continua
// normal em vez de derrubar a aba inteira.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGraph, insightDeContaPorDia, obterAccessTokenValido } from "../_shared/instagram.ts";
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

function dataISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

// deno-lint-ignore no-explicit-any
async function calcularSaudeEnvio(supabaseAdmin: any) {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: entregas }, { data: canceladosFila }] = await Promise.all([
    supabaseAdmin.from("instagram_entregas").select("status, erro").gte("created_at", desde),
    supabaseAdmin.from("instagram_fila_envio").select("id", { count: "exact", head: true }).eq("status", "expirado").gte("created_at", desde),
  ]);

  const linhas: Array<{ status: string; erro: string | null }> = entregas || [];
  const entregues = linhas.filter((l) => l.status === "ok").length;
  const falharam = linhas.filter((l) => l.status === "erro").length;

  const contagemErros = new Map<string, number>();
  linhas
    .filter((l) => l.status === "erro" && l.erro)
    .forEach((l) => {
      // Agrupa pelo código Graph (ex: "Erro na API do Instagram (400): ...")
      // pra não espalhar a mesma falha em N linhas diferentes por causa de
      // detalhe variável (fbtrace_id etc.) dentro da mensagem.
      const chave = (l.erro || "").split(":").slice(0, 2).join(":").trim().slice(0, 90);
      contagemErros.set(chave, (contagemErros.get(chave) || 0) + 1);
    });
  const erros = [...contagemErros.entries()]
    .map(([mensagem, total]) => ({ mensagem, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return { entregues, falharam, cancelados: (canceladosFila as unknown as { count?: number })?.count ?? 0, erros };
}

// deno-lint-ignore no-explicit-any
async function calcularOQuePessoasQuerem(supabaseAdmin: any) {
  const { data } = await supabaseAdmin.from("instagram_leads").select("palavra");
  const contagem = new Map<string, number>();
  (data || []).forEach((l: { palavra: string | null }) => {
    const chave = (l.palavra || "—").trim();
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
  });
  return [...contagem.entries()]
    .map(([palavra, total]) => ({ palavra, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    // withSupabase({ auth: "user" }) só confirma que existe uma sessão válida
    // — não que é especificamente a dona da conta.
    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    let token: Awaited<ReturnType<typeof obterAccessTokenValido>>;
    try {
      token = await obterAccessTokenValido(ctx.supabaseAdmin);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
    if (!token) {
      return jsonResponse({ ok: true, conectado: false });
    }

    const { access_token: accessToken, ig_username: igUsername, expires_at: expiresAt } = token;
    const desde15 = dataISO(15);
    const ate = dataISO(0);
    const erros: string[] = [];

    // "/me" é o jeito documentado de buscar os dados da própria conta nesse
    // fluxo — o ID numérico bruto não funciona como caminho direto.
    let perfil = { username: igUsername, seguidores: null as number | null };
    try {
      const dados = await chamarGraph("/me", { fields: "username,followers_count", access_token: accessToken });
      perfil = { username: dados.username, seguidores: dados.followers_count ?? null };
    } catch (e) {
      console.error("Erro ao buscar perfil do Instagram:", e);
      erros.push(`perfil: ${(e as Error).message}`);
    }

    const [alcancePorDia, crescimentoPorDia] = await Promise.all([
      insightDeContaPorDia("me", accessToken, ["reach"], desde15, ate, erros),
      insightDeContaPorDia("me", accessToken, ["follower_count"], desde15, ate, erros),
    ]);

    const tokenDiasRestantes = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : null;

    let leadsCaptados = 0;
    let entregas24h = 0;
    let saudeEnvio = { entregues: 0, falharam: 0, cancelados: 0, erros: [] as Array<{ mensagem: string; total: number }> };
    let oQuePessoasQuerem: Array<{ palavra: string; total: number }> = [];

    try {
      const { count } = await ctx.supabaseAdmin.from("instagram_leads").select("id", { count: "exact", head: true });
      leadsCaptados = count ?? 0;
    } catch (e) {
      erros.push(`leads captados: ${(e as Error).message}`);
    }

    try {
      const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await ctx.supabaseAdmin.from("instagram_entregas").select("id", { count: "exact", head: true }).eq("status", "ok").gte("created_at", desde24h);
      entregas24h = count ?? 0;
    } catch (e) {
      erros.push(`entregas 24h: ${(e as Error).message}`);
    }

    try {
      saudeEnvio = await calcularSaudeEnvio(ctx.supabaseAdmin);
    } catch (e) {
      erros.push(`saúde do envio: ${(e as Error).message}`);
    }

    try {
      oQuePessoasQuerem = await calcularOQuePessoasQuerem(ctx.supabaseAdmin);
    } catch (e) {
      erros.push(`o que as pessoas querem: ${(e as Error).message}`);
    }

    return jsonResponse({
      ok: true,
      conectado: true,
      perfil,
      tokenDiasRestantes,
      entregas24h,
      leadsCaptados,
      alcancePorDia,
      crescimentoPorDia,
      saudeEnvio,
      oQuePessoasQuerem,
      erros: erros.length ? erros : undefined,
    });
  }),
};
