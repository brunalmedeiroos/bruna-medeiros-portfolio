// ==========================================================================
// supabase/functions/_shared/gmail.ts
// ==========================================================================
// Funções compartilhadas pelas Edge Functions gmail-oauth-start,
// gmail-oauth-callback, gmail-inbox e gmail-reply. Nada aqui é exposto
// diretamente ao navegador — só outras Edge Functions importam este arquivo.

import { gravarSegredo, lerSegredo } from "./vault.ts";

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// Escopos: gmail.modify cobre ler, marcar como lida e gerenciar marcadores;
// gmail.send é separado e cobre só o envio (resposta).
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

function env(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

export function credenciaisGoogle() {
  return {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    redirectUri: env("GMAIL_REDIRECT_URI"),
  };
}

export function nomeMarcador(): string {
  return Deno.env.get("GMAIL_LABEL_NAME") || "Propostas";
}

// Troca o "code" do Google (ou um refresh_token) por um access_token novo.
export async function trocarPorToken(params: Record<string, string>) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao trocar token no Google: ${JSON.stringify(data)}`);
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

// Lê o token guardado no banco e devolve um access_token válido, renovando
// via refresh_token se estiver perto de expirar. Retorna null se a conta
// do Gmail ainda não foi conectada.
//
// access_token/refresh_token são guardados como UUID de um segredo no
// Supabase Vault, não como texto puro — lerSegredo() busca o valor real.
export async function obterAccessTokenValido(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
): Promise<string | null> {
  const { data: linha, error } = await supabaseAdmin
    .from("email_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Erro lendo email_tokens: ${error.message}`);
  if (!linha) return null;

  const expiraEm = new Date(linha.expires_at).getTime();
  const margemMs = 60_000; // renova 1 minuto antes de expirar
  if (linha.access_token && expiraEm - margemMs > Date.now()) {
    return await lerSegredo(supabaseAdmin, linha.access_token);
  }

  const refreshToken = await lerSegredo(supabaseAdmin, linha.refresh_token);
  const { clientId, clientSecret } = credenciaisGoogle();
  const tokens = await trocarPorToken({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken as string,
    grant_type: "refresh_token",
  });

  const novoAccessTokenId = await gravarSegredo(supabaseAdmin, linha.access_token, tokens.access_token, "email_access_token");
  const novoExpiraEm = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("email_tokens")
    .update({ access_token: novoAccessTokenId, expires_at: novoExpiraEm, updated_at: new Date().toISOString() })
    .eq("id", 1);

  return tokens.access_token;
}

// Resolve o nome do marcador (ex: "Propostas") pro ID interno que a API do
// Gmail exige em removeLabelIds/addLabelIds.
export async function resolverIdMarcador(accessToken: string, nome: string): Promise<string | null> {
  const resposta = await chamarGmail(accessToken, "/labels");
  const labels: Array<{ id: string; name: string }> = resposta.labels || [];
  const encontrada = labels.find((l) => l.name === nome);
  return encontrada ? encontrada.id : null;
}

export async function chamarGmail(accessToken: string, caminho: string, init: RequestInit = {}) {
  const res = await fetch(`${GMAIL_API}${caminho}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Erro na API do Gmail (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

// ---- Base64url (usado tanto pra decodificar corpos de mensagem quanto
// pra montar o e-mail cru enviado na resposta) ----

export function base64UrlParaTexto(base64url: string): string {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export function textoParaBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pegarHeader(headers: Array<{ name: string; value: string }>, nome: string): string {
  const h = headers.find((h) => h.name.toLowerCase() === nome.toLowerCase());
  return h ? h.value : "";
}

// Extrai o texto simples do corpo de uma mensagem do Gmail (procura a parte
// text/plain; se só tiver text/html, remove as tags de forma bem simples).
// deno-lint-ignore no-explicit-any
function extrairCorpo(payload: any): string {
  if (!payload) return "";

  function achar(parte: any, tipoAlvo: string): string | null {
    if (parte.mimeType === tipoAlvo && parte.body?.data) {
      return base64UrlParaTexto(parte.body.data);
    }
    for (const sub of parte.parts || []) {
      const achado = achar(sub, tipoAlvo);
      if (achado) return achado;
    }
    return null;
  }

  const texto = achar(payload, "text/plain");
  if (texto) return texto;

  const html = achar(payload, "text/html");
  if (html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  if (payload.body?.data) return base64UrlParaTexto(payload.body.data);
  return "";
}

// deno-lint-ignore no-explicit-any
export function resumirMensagem(msg: any) {
  const headers = msg.payload?.headers || [];
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: pegarHeader(headers, "From"),
    subject: pegarHeader(headers, "Subject"),
    date: pegarHeader(headers, "Date"),
    snippet: msg.snippet || "",
  };
}

// deno-lint-ignore no-explicit-any
export function detalharMensagem(msg: any) {
  const headers = msg.payload?.headers || [];
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: pegarHeader(headers, "From"),
    to: pegarHeader(headers, "To"),
    subject: pegarHeader(headers, "Subject"),
    date: pegarHeader(headers, "Date"),
    messageIdHeader: pegarHeader(headers, "Message-ID") || pegarHeader(headers, "Message-Id"),
    references: pegarHeader(headers, "References"),
    body: extrairCorpo(msg.payload),
  };
}

// Extrai só o endereço de dentro de um campo "Nome <email@dominio.com>".
export function extrairEndereco(campoDe: string): string {
  const m = campoDe.match(/<([^>]+)>/);
  return m ? m[1] : campoDe.trim();
}

export function montarEmailCru(params: {
  de: string;
  para: string;
  assunto: string;
  corpo: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const linhas = [
    `From: ${params.de}`,
    `To: ${params.para}`,
    `Subject: ${params.assunto}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
  ];
  if (params.inReplyTo) linhas.push(`In-Reply-To: ${params.inReplyTo}`);
  if (params.references) linhas.push(`References: ${params.references}`);
  linhas.push("", params.corpo);
  return textoParaBase64Url(linhas.join("\r\n"));
}
