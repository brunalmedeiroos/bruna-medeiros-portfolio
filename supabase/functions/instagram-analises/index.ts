// ==========================================================================
// supabase/functions/instagram-analises/index.ts
// ==========================================================================
// Aba "Análises" do Instagram: seguidores/alcance/engajamento por período
// (7, 30 ou 90 dias) e o ranking dos melhores posts nesse período. Só é
// chamada quando a pessoa aperta "Atualizar" no painel — nunca automático —
// porque analisar cada post custa 1 chamada extra à API do Instagram
// (curtidas/comentários já vêm de graça, mas salvos e visualizações não),
// então rodar isso sozinho de tempos em tempos arriscaria bater no limite
// de uso da API.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGraph, insightDeConta, insightDeContaPorDia, insightDeMidia, obterAccessTokenValido } from "../_shared/instagram.ts";
import { ehDono } from "../_shared/dono.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MAX_POSTS = 12;
const TAMANHO_JANELA_DIAS = 30; // period=day da Graph API não aceita qualquer intervalo de uma vez

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

function dataISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

// Quebra o período pedido em janelas de até 30 dias, da mais recente pra
// mais antiga, pra nunca mandar um intervalo maior do que a Graph API aceita.
function janelasDoPeriodo(diasTotal: number): Array<{ desde: string; ate: string }> {
  const janelas: Array<{ desde: string; ate: string }> = [];
  let restante = diasTotal;
  let offset = 0;
  while (restante > 0) {
    const tamanho = Math.min(TAMANHO_JANELA_DIAS, restante);
    janelas.push({ desde: dataISO(offset + tamanho - 1), ate: dataISO(offset) });
    offset += tamanho;
    restante -= tamanho;
  }
  return janelas;
}

async function somaInsightPeriodo(
  igUserId: string,
  accessToken: string,
  metricas: string[],
  diasTotal: number,
  erros: string[],
): Promise<number | null> {
  let soma = 0;
  let algumaFuncionou = false;
  for (const janela of janelasDoPeriodo(diasTotal)) {
    const valor = await insightDeConta(igUserId, accessToken, metricas, janela.desde, janela.ate, erros);
    if (valor !== null) {
      soma += valor;
      algumaFuncionou = true;
    }
  }
  return algumaFuncionou ? soma : null;
}

async function seriePorDiaPeriodo(
  igUserId: string,
  accessToken: string,
  metricas: string[],
  diasTotal: number,
  erros: string[],
): Promise<Array<{ data: string; valor: number }> | null> {
  let serie: Array<{ data: string; valor: number }> = [];
  let algumaFuncionou = false;
  for (const janela of janelasDoPeriodo(diasTotal)) {
    const trecho = await insightDeContaPorDia(igUserId, accessToken, metricas, janela.desde, janela.ate, erros);
    if (trecho) {
      serie = serie.concat(trecho);
      algumaFuncionou = true;
    }
  }
  if (!algumaFuncionou) return null;
  serie.sort((a, b) => a.data.localeCompare(b.data));
  return serie;
}

async function buscarMelhoresPosts(accessToken: string, diasTotal: number, erros: string[]) {
  const resposta = await chamarGraph("/me/media", {
    fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
    limit: "50",
    access_token: accessToken,
  });

  const desdeMs = Date.now() - diasTotal * 24 * 60 * 60 * 1000;
  const doPeriodo = (resposta.data || []).filter(
    (m: Record<string, unknown>) => new Date(m.timestamp as string).getTime() >= desdeMs,
  );

  // Pré-seleciona pelos sinais que já vêm de graça (curtidas/comentários),
  // pra só gastar a chamada extra de insights (salvos/visualizações) nos
  // posts que realmente vão entrar no ranking.
  const candidatos = doPeriodo
    .map((m: Record<string, unknown>) => ({
      id: m.id as string,
      legenda: (m.caption as string) || "",
      capa: (m.thumbnail_url as string) || (m.media_url as string) || null,
      permalink: (m.permalink as string) || null,
      timestamp: m.timestamp as string,
      ehVideo: m.media_type === "VIDEO" || m.media_product_type === "REELS",
      curtidas: Number(m.like_count) || 0,
      comentarios: Number(m.comments_count) || 0,
    }))
    .sort((a, b) => (b.curtidas + b.comentarios) - (a.curtidas + a.comentarios))
    .slice(0, MAX_POSTS);

  const posts = await Promise.all(
    candidatos.map(async (post: Record<string, unknown>) => {
      const [salvos, vistos] = await Promise.all([
        insightDeMidia(post.id as string, accessToken, ["saved"], erros),
        post.ehVideo ? insightDeMidia(post.id as string, accessToken, ["views", "plays", "video_views"], erros) : Promise.resolve(null),
      ]);
      const curtidas = post.curtidas as number;
      const comentarios = post.comentarios as number;
      return {
        id: post.id,
        legenda: post.legenda,
        capa: post.capa,
        permalink: post.permalink,
        timestamp: post.timestamp,
        curtidas,
        comentarios,
        salvos: salvos ?? 0,
        vistos,
        score: curtidas + comentarios * 2 + (salvos ?? 0) * 3,
      };
    }),
  );

  return posts.sort((a, b) => b.score - a.score);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    if (!(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    const url = new URL(req.url);
    const periodoParam = Number(url.searchParams.get("periodo"));
    const periodoDias = [7, 30, 90].includes(periodoParam) ? periodoParam : 30;

    let token: Awaited<ReturnType<typeof obterAccessTokenValido>>;
    try {
      token = await obterAccessTokenValido(ctx.supabaseAdmin);
    } catch (e) {
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
    if (!token) return jsonResponse({ ok: true, conectado: false });

    const { access_token: accessToken } = token;
    const erros: string[] = [];

    let seguidores: number | null = null;
    try {
      const dados = await chamarGraph("/me", { fields: "followers_count", access_token: accessToken });
      seguidores = dados.followers_count ?? null;
    } catch (e) {
      erros.push(`seguidores: ${(e as Error).message}`);
    }

    const [alcancePorDia, novosSeguidores, contasEngajadas, interacoes] = await Promise.all([
      seriePorDiaPeriodo("me", accessToken, ["reach"], periodoDias, erros),
      somaInsightPeriodo("me", accessToken, ["follower_count"], periodoDias, erros),
      somaInsightPeriodo("me", accessToken, ["accounts_engaged"], periodoDias, erros),
      somaInsightPeriodo("me", accessToken, ["total_interactions"], periodoDias, erros),
    ]);
    const alcance = alcancePorDia ? alcancePorDia.reduce((soma, d) => soma + d.valor, 0) : null;

    let posts: Awaited<ReturnType<typeof buscarMelhoresPosts>> = [];
    try {
      posts = await buscarMelhoresPosts(accessToken, periodoDias, erros);
    } catch (e) {
      erros.push(`melhores posts: ${(e as Error).message}`);
    }

    return jsonResponse({
      ok: true,
      conectado: true,
      periodoDias,
      seguidores,
      novosSeguidores,
      alcance,
      contasEngajadas,
      interacoes,
      alcancePorDia,
      posts,
      atualizadoEm: new Date().toISOString(),
      erros: erros.length ? erros : undefined,
    });
  }),
};
