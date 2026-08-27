// ==========================================================================
// supabase/functions/_shared/instagram.ts
// ==========================================================================
// Funções compartilhadas pelas Edge Functions instagram-oauth-start,
// instagram-oauth-callback e instagram-metrics. Nada aqui é exposto
// diretamente ao navegador — só outras Edge Functions importam este arquivo.
//
// Usa o fluxo "Instagram API with Instagram Login" (o mais novo da Meta):
// login direto com a conta do Instagram, sem precisar de Página do
// Facebook. Isso é DIFERENTE do antigo "Instagram Graph API via Facebook
// Login" — domínios, formato de token e nomes de permissão são outros.
//
// A Meta muda os nomes de algumas métricas de tempos em tempos. Por isso
// as funções de insights aqui tentam mais de um nome de métrica e ignoram
// silenciosamente a que não existir, em vez de quebrar a aba inteira.

export const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
export const TOKEN_URL_CURTO = "https://api.instagram.com/oauth/access_token";
export const GRAPH_API = "https://graph.instagram.com";

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

function env(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

export function credenciaisInstagram() {
  return {
    appId: env("INSTAGRAM_APP_ID"),
    appSecret: env("INSTAGRAM_APP_SECRET"),
    redirectUri: env("INSTAGRAM_REDIRECT_URI"),
  };
}

// Troca o "code" do Instagram por um token de curta duração (~1h). Esse
// endpoint exige POST com corpo x-www-form-urlencoded — diferente da Graph
// API do Facebook, que aceitava GET com querystring.
export async function trocarCodePorTokenCurto(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL_CURTO, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao trocar code no Instagram: ${JSON.stringify(data)}`);
  }
  return data as { access_token: string; user_id: string; permissions?: string[] };
}

// Troca o token curto por um de longa duração (~60 dias).
export async function trocarPorTokenLongo(tokenCurto: string, appSecret: string) {
  const url = new URL(`${GRAPH_API}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", tokenCurto);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao gerar token de longa duração: ${JSON.stringify(data)}`);
  }
  return data as { access_token: string; token_type: string; expires_in: number };
}

// Renova um token de longa duração já existente, estendendo a validade por
// mais ~60 dias. Só funciona em tokens com pelo menos 24h de vida.
export async function renovarTokenLongo(accessToken: string) {
  const url = new URL(`${GRAPH_API}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao renovar token: ${JSON.stringify(data)}`);
  }
  return data as { access_token: string; token_type: string; expires_in: number };
}

export async function chamarGraph(caminho: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_API}${caminho}`);
  Object.entries(params).forEach(([chave, valor]) => url.searchParams.set(chave, valor));

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro na API do Instagram (${res.status}): ${JSON.stringify(data.error || data)}`);
  }
  return data;
}

// Lê o token guardado no banco e devolve um access_token válido, renovando
// via refresh se estiver perto de expirar. Retorna null se ainda não
// conectou o Instagram.
// deno-lint-ignore no-explicit-any
export async function obterAccessTokenValido(supabaseAdmin: any) {
  const { data: linha, error } = await supabaseAdmin
    .from("instagram_tokens")
    .select("access_token, ig_user_id, ig_username, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Erro lendo instagram_tokens: ${error.message}`);
  if (!linha) return null;

  const expiraEm = new Date(linha.expires_at).getTime();
  const margemMs = 3 * 24 * 60 * 60 * 1000; // renova com 3 dias de folga

  if (expiraEm - margemMs > Date.now()) {
    return linha as { access_token: string; ig_user_id: string; ig_username: string | null; expires_at: string };
  }

  const renovado = await renovarTokenLongo(linha.access_token);
  const novoExpiraEm = new Date(Date.now() + renovado.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("instagram_tokens")
    .update({ access_token: renovado.access_token, expires_at: novoExpiraEm, updated_at: new Date().toISOString() })
    .eq("id", 1);

  return { ...linha, access_token: renovado.access_token, expires_at: novoExpiraEm };
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
