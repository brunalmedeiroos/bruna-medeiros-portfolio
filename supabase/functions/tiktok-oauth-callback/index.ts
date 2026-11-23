// ==========================================================================
// supabase/functions/tiktok-oauth-callback/index.ts
// ==========================================================================
// Pra onde o TikTok redireciona depois da tela de permissão. Não tem
// autenticação do painel aqui (é uma navegação normal do navegador) — a
// segurança vem de validar o "state" de uso único gerado em
// tiktok-oauth-start.
//
// Fluxo (Login Kit, OAuth v2):
//   1. Troca o "code" por um access_token (~24h) + refresh_token (~365 dias).
//   2. Busca o @usuário e as estatísticas gerais pra exibir no painel.
//   3. Guarda tudo — o access_token precisa ser renovado com o
//      refresh_token bem mais frequentemente que o do Instagram (dura só
//      ~24h), a função tiktok-metrics cuida disso quando estiver pronta.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { buscarPerfilTiktok, credenciaisTiktok, trocarCodePorToken } from "../_shared/tiktok.ts";
import { gravarSegredo } from "../_shared/vault.ts";

function paginaHtml(titulo: string, mensagem: string) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${titulo}</title>
    <style>body{font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#04465D;}</style>
    </head><body><h2>${titulo}</h2><p>${mensagem}</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const erroTiktok = url.searchParams.get("error_description") || url.searchParams.get("error");

    if (erroTiktok) {
      return paginaHtml("Conexão cancelada", "Você cancelou a autorização no TikTok. Pode fechar esta aba.");
    }
    if (!code || !state) {
      return paginaHtml("Erro", "Faltou informação na resposta do TikTok. Tente conectar de novo pelo painel.");
    }

    const { data: estadoSalvo } = await ctx.supabaseAdmin
      .from("tiktok_oauth_states")
      .select("state")
      .eq("state", state)
      .maybeSingle();

    if (!estadoSalvo) {
      return paginaHtml("Erro", "Essa autorização já foi usada ou expirou. Tente conectar de novo pelo painel.");
    }
    await ctx.supabaseAdmin.from("tiktok_oauth_states").delete().eq("state", state);

    try {
      const { clientKey, clientSecret, redirectUri } = credenciaisTiktok();

      const token = await trocarCodePorToken({
        client_key: clientKey,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code,
      });

      const perfil = await buscarPerfilTiktok(token.access_token);

      const expiraEm = new Date(Date.now() + token.expires_in * 1000).toISOString();
      const accessTokenId = await gravarSegredo(ctx.supabaseAdmin, null, token.access_token, "tiktok_access_token");
      const refreshTokenId = await gravarSegredo(ctx.supabaseAdmin, null, token.refresh_token, "tiktok_refresh_token");

      const { error } = await ctx.supabaseAdmin.from("tiktok_tokens").upsert({
        id: 1,
        access_token: accessTokenId,
        refresh_token: refreshTokenId,
        tiktok_open_id: token.open_id,
        tiktok_username: perfil?.display_name || null,
        expires_at: expiraEm,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);

      return paginaHtml("TikTok conectado!", "Pode fechar esta aba e voltar ao painel, na aba TikTok.");
    } catch (e) {
      return paginaHtml("Erro ao conectar", `Algo deu errado: ${(e as Error).message}. Tente de novo pelo painel.`);
    }
  }),
};
