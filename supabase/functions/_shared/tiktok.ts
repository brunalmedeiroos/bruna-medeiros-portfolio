// ==========================================================================
// supabase/functions/_shared/tiktok.ts
// ==========================================================================
// Funções compartilhadas pelas Edge Functions tiktok-oauth-start,
// tiktok-oauth-callback e tiktok-metrics. Nada aqui é exposto diretamente
// ao navegador — só outras Edge Functions importam este arquivo.
//
// Usa o "Login Kit" do TikTok (OAuth v2). Pro fluxo web (servidor trocando
// o code, como aqui) o TikTok não exige PKCE — só o "state" de uso único,
// igual ao Instagram. As variáveis TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET
// só existem depois que o app passar pela aprovação do TikTok for
// Developers; até lá, credenciaisTiktok() lança um erro com uma mensagem
// amigável que o painel mostra pra Bruna.

import { gravarSegredo, lerSegredo } from "./vault.ts";

export const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";

// user.info.basic: @usuário e avatar. user.info.stats: seguidores, curtidas
// e nº de vídeos (conta geral, sem granularidade por vídeo). video.list:
// pra mais pra frente, somar o view_count de cada vídeo ("views somadas").
export const TIKTOK_SCOPES = ["user.info.basic", "user.info.stats", "video.list"].join(",");

export class TiktokNaoConfiguradoError extends Error {
  constructor() {
    super("A integração do TikTok ainda não está disponível — o app está aguardando aprovação do TikTok for Developers.");
    this.name = "TiktokNaoConfiguradoError";
  }
}

function env(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) throw new TiktokNaoConfiguradoError();
  return valor;
}

export function credenciaisTiktok() {
  return {
    clientKey: env("TIKTOK_CLIENT_KEY"),
    clientSecret: env("TIKTOK_CLIENT_SECRET"),
    redirectUri: env("TIKTOK_REDIRECT_URI"),
  };
}

// Troca o "code" pelo token de acesso (~24h) + refresh_token (~365 dias).
export async function trocarCodePorToken(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Falha ao trocar code no TikTok: ${JSON.stringify(data)}`);
  }
  return data as {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;
    open_id: string;
    scope: string;
  };
}

// Renova o access_token usando o refresh_token (o access_token do TikTok
// dura só ~24h, bem menos que o do Instagram — precisa renovar com mais
// frequência).
export async function renovarToken(refreshToken: string) {
  const { clientKey, clientSecret } = credenciaisTiktok();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Falha ao renovar token do TikTok: ${JSON.stringify(data)}`);
  }
  return data as { access_token: string; expires_in: number; refresh_token: string; refresh_expires_in: number };
}

// Busca @usuário + estatísticas gerais da própria conta (a autenticada
// pelo token). O TikTok muda nomes de campo de vez em quando — por isso
// os campos vêm todos numa lista só e o que não existir some.
export async function buscarPerfilTiktok(accessToken: string) {
  const campos = ["open_id", "display_name", "avatar_url", "follower_count", "following_count", "likes_count", "video_count"];
  const url = new URL(USER_INFO_URL);
  url.searchParams.set("fields", campos.join(","));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || data.error?.code && data.error.code !== "ok") {
    throw new Error(`Erro na API do TikTok (${res.status}): ${JSON.stringify(data.error || data)}`);
  }
  return data.data?.user as {
    open_id: string;
    display_name?: string;
    avatar_url?: string;
    follower_count?: number;
    following_count?: number;
    likes_count?: number;
    video_count?: number;
  };
}

// Lê o token guardado e renova sozinho se estiver perto de vencer (o
// access_token do TikTok dura só ~24h — bem menos folga do que o do
// Instagram, por isso a margem de renovação é em horas, não em dias).
// deno-lint-ignore no-explicit-any
export async function obterAccessTokenValidoTiktok(supabaseAdmin: any) {
  const { data: linha, error } = await supabaseAdmin
    .from("tiktok_tokens")
    .select("access_token, refresh_token, tiktok_open_id, tiktok_username, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Erro lendo tiktok_tokens: ${error.message}`);
  if (!linha) return null;

  const accessTokenAtual = (await lerSegredo(supabaseAdmin, linha.access_token)) as string;
  const refreshTokenAtual = (await lerSegredo(supabaseAdmin, linha.refresh_token)) as string;

  const expiraEm = new Date(linha.expires_at).getTime();
  const margemMs = 2 * 60 * 60 * 1000; // renova com 2h de folga

  if (expiraEm - margemMs > Date.now()) {
    return { ...linha, access_token: accessTokenAtual, refresh_token: refreshTokenAtual } as {
      access_token: string;
      refresh_token: string;
      tiktok_open_id: string;
      tiktok_username: string | null;
      expires_at: string;
    };
  }

  const renovado = await renovarToken(refreshTokenAtual);
  const novoAccessTokenId = await gravarSegredo(supabaseAdmin, linha.access_token, renovado.access_token, "tiktok_access_token");
  const novoRefreshTokenId = await gravarSegredo(supabaseAdmin, linha.refresh_token, renovado.refresh_token, "tiktok_refresh_token");
  const novoExpiraEm = new Date(Date.now() + renovado.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("tiktok_tokens")
    .update({ access_token: novoAccessTokenId, refresh_token: novoRefreshTokenId, expires_at: novoExpiraEm, updated_at: new Date().toISOString() })
    .eq("id", 1);

  return {
    access_token: renovado.access_token,
    refresh_token: renovado.refresh_token,
    tiktok_open_id: linha.tiktok_open_id,
    tiktok_username: linha.tiktok_username,
    expires_at: novoExpiraEm,
  };
}
