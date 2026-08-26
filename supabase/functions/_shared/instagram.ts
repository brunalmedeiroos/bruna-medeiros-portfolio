// ==========================================================================
// supabase/functions/_shared/instagram.ts
// ==========================================================================
// Funções compartilhadas pelas Edge Functions instagram-oauth-start,
// instagram-oauth-callback e instagram-metrics. Nada aqui é exposto
// diretamente ao navegador — só outras Edge Functions importam este arquivo.
//
// A Meta muda os nomes de algumas métricas de tempos em tempos (ex:
// "impressions" foi descontinuada pra contas novas, "website_clicks" virou
// "profile_links_taps" em versões recentes). Por isso as funções de
// insights aqui tentam mais de um nome de métrica e ignoram silenciosamente
// a que não existir, em vez de quebrar a aba inteira — se um dia a Meta
// mudar de novo, o painel continua de pé só sem aquele número específico.

// Versão da Graph API. Cada versão fica válida por ~2 anos a partir do
// lançamento — se a Meta descontinuar essa, é só trocar aqui.
export const GRAPH_VERSION = "v21.0";
export const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

function env(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

export function credenciaisMeta() {
  return {
    appId: env("META_APP_ID"),
    appSecret: env("META_APP_SECRET"),
    redirectUri: env("INSTAGRAM_REDIRECT_URI"),
  };
}

export async function chamarGraph(caminho: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_API}${caminho}`);
  Object.entries(params).forEach(([chave, valor]) => url.searchParams.set(chave, valor));

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro na API da Meta (${res.status}): ${JSON.stringify(data.error || data)}`);
  }
  return data;
}

// deno-lint-ignore no-explicit-any
export async function obterTokenConectado(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("instagram_tokens")
    .select("access_token, ig_user_id, ig_username, page_id")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Erro lendo instagram_tokens: ${error.message}`);
  return data as { access_token: string; ig_user_id: string; ig_username: string | null; page_id: string } | null;
}

// Tenta pegar um valor de insight de conta testando uma lista de nomes de
// métrica em ordem (a primeira que a API aceitar "ganha"). Soma os valores
// diários do período pedido. Devolve null se nenhuma funcionar.
export async function insightDeConta(
  igUserId: string,
  accessToken: string,
  nomesPossiveis: string[],
  dataInicio: string,
  dataFim: string,
): Promise<number | null> {
  for (const metrica of nomesPossiveis) {
    try {
      const resposta = await chamarGraph(`/${igUserId}/insights`, {
        metric: metrica,
        period: "day",
        since: dataInicio,
        until: dataFim,
        access_token: accessToken,
      });
      const valores = resposta.data?.[0]?.values || [];
      return valores.reduce((soma: number, v: { value: number }) => soma + (v.value || 0), 0);
    } catch {
      // Métrica não existe pra essa versão/tipo de conta — tenta a próxima.
      continue;
    }
  }
  return null;
}

// Igual acima, mas pra insights de uma publicação específica (métricas
// diferem entre foto/carrossel e vídeo/reels).
export async function insightDeMidia(
  mediaId: string,
  accessToken: string,
  nomesPossiveis: string[],
): Promise<number | null> {
  for (const metrica of nomesPossiveis) {
    try {
      const resposta = await chamarGraph(`/${mediaId}/insights`, {
        metric: metrica,
        access_token: accessToken,
      });
      const valor = resposta.data?.[0]?.values?.[0]?.value;
      if (typeof valor === "number") return valor;
    } catch {
      continue;
    }
  }
  return null;
}
