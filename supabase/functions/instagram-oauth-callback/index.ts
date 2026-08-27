// ==========================================================================
// supabase/functions/instagram-oauth-callback/index.ts
// ==========================================================================
// Pra onde o Instagram redireciona depois da tela de permissão. Não tem
// autenticação do painel aqui (é uma navegação normal do navegador) — a
// segurança vem de validar o "state" de uso único gerado em
// instagram-oauth-start.
//
// Fluxo "Instagram API with Instagram Login":
//   1. Troca o "code" por um token de curta duração (~1h) + o ID da conta.
//   2. Troca esse token por um de longa duração (~60 dias, renovável).
//   3. Busca o @usuário pra exibir no painel.
//   4. Guarda tudo — o token de longa duração é renovado automaticamente
//      pela função instagram-metrics quando estiver perto de expirar.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGraph, credenciaisInstagram, trocarCodePorTokenCurto, trocarPorTokenLongo } from "../_shared/instagram.ts";

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
    const erroInstagram = url.searchParams.get("error_message") || url.searchParams.get("error");

    if (erroInstagram) {
      return paginaHtml("Conexão cancelada", "Você cancelou a autorização no Instagram. Pode fechar esta aba.");
    }
    if (!code || !state) {
      return paginaHtml("Erro", "Faltou informação na resposta do Instagram. Tente conectar de novo pelo painel.");
    }

    const { data: estadoSalvo } = await ctx.supabaseAdmin
      .from("instagram_oauth_states")
      .select("state")
      .eq("state", state)
      .maybeSingle();

    if (!estadoSalvo) {
      return paginaHtml("Erro", "Essa autorização já foi usada ou expirou. Tente conectar de novo pelo painel.");
    }
    await ctx.supabaseAdmin.from("instagram_oauth_states").delete().eq("state", state);

    try {
      const { appId, appSecret, redirectUri } = credenciaisInstagram();

      // O Instagram manda o "code" com um "#_" grudado no final quando o
      // redirect acontece via navegador — remove isso antes de trocar.
      const codeLimpo = code.replace(/#_$/, "");

      const tokenCurto = await trocarCodePorTokenCurto({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code: codeLimpo,
      });

      const tokenLongo = await trocarPorTokenLongo(tokenCurto.access_token, appSecret);

      // "/me" é o jeito documentado de buscar os dados da própria conta
      // nesse fluxo — o ID numérico bruto não funciona como caminho direto.
      const perfil = await chamarGraph("/me", {
        fields: "username",
        access_token: tokenLongo.access_token,
      });

      const expiraEm = new Date(Date.now() + tokenLongo.expires_in * 1000).toISOString();

      const { error } = await ctx.supabaseAdmin.from("instagram_tokens").upsert({
        id: 1,
        access_token: tokenLongo.access_token,
        ig_user_id: tokenCurto.user_id,
        ig_username: perfil.username || null,
        expires_at: expiraEm,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);

      return paginaHtml("Instagram conectado!", "Pode fechar esta aba e voltar ao painel, na aba Instagram.");
    } catch (e) {
      return paginaHtml("Erro ao conectar", `Algo deu errado: ${(e as Error).message}. Tente de novo pelo painel.`);
    }
  }),
};
