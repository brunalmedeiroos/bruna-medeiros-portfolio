// ==========================================================================
// supabase/functions/instagram-oauth-callback/index.ts
// ==========================================================================
// Pra onde a Meta redireciona depois da tela de permissão do Facebook. Não
// tem autenticação do painel aqui (é uma navegação normal do navegador) —
// a segurança vem de validar o "state" de uso único gerado em
// instagram-oauth-start.
//
// Fluxo (documentado pela Meta em "Facebook Login for Business"):
//   1. Troca o "code" por um token de usuário de curta duração.
//   2. Troca esse token por um de longa duração (~60 dias).
//   3. Lista as Páginas do Facebook que a Bruna administra (/me/accounts) —
//      cada uma já vem com seu próprio Page Access Token.
//   4. Acha a Página que tem uma conta Business do Instagram vinculada.
//   5. Guarda o Page Access Token: ele NÃO expira enquanto a Bruna
//      continuar sendo admin da Página e não revogar o acesso do app —
//      diferente do Gmail, não precisa de refresh_token/renovação.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { chamarGraph, credenciaisMeta } from "../_shared/instagram.ts";

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
    const erroMeta = url.searchParams.get("error_message") || url.searchParams.get("error");

    if (erroMeta) {
      return paginaHtml("Conexão cancelada", "Você cancelou a autorização no Facebook. Pode fechar esta aba.");
    }
    if (!code || !state) {
      return paginaHtml("Erro", "Faltou informação na resposta da Meta. Tente conectar de novo pelo painel.");
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
      const { appId, appSecret, redirectUri } = credenciaisMeta();

      // 1) code -> token de usuário de curta duração
      const tokenCurto = await chamarGraph("/oauth/access_token", {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      });

      // 2) token curto -> token de usuário de longa duração (~60 dias)
      const tokenLongo = await chamarGraph("/oauth/access_token", {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: tokenCurto.access_token,
      });

      // 3) Páginas que ela administra, cada uma com seu Page Access Token
      const paginas = await chamarGraph("/me/accounts", {
        access_token: tokenLongo.access_token,
      });
      const listaPaginas: Array<{ id: string; access_token: string; name: string }> = paginas.data || [];

      if (listaPaginas.length === 0) {
        return paginaHtml(
          "Nenhuma Página encontrada",
          "Seu usuário do Facebook não administra nenhuma Página. O Instagram Business precisa estar vinculado a uma Página do Facebook que você administra. Confira isso e tente de novo.",
        );
      }

      // 4) Acha a primeira Página com conta Business do Instagram vinculada
      let paginaEncontrada: { id: string; access_token: string; igUserId: string } | null = null;
      for (const p of listaPaginas) {
        const detalhe = await chamarGraph(`/${p.id}`, {
          fields: "instagram_business_account",
          access_token: p.access_token,
        });
        if (detalhe.instagram_business_account?.id) {
          paginaEncontrada = { id: p.id, access_token: p.access_token, igUserId: detalhe.instagram_business_account.id };
          break;
        }
      }

      if (!paginaEncontrada) {
        return paginaHtml(
          "Instagram não encontrado",
          "Nenhuma das suas Páginas do Facebook tem uma conta Business/Criador do Instagram vinculada. Vincule sua conta do Instagram à Página nas configurações da Página e tente conectar de novo.",
        );
      }

      const perfilIg = await chamarGraph(`/${paginaEncontrada.igUserId}`, {
        fields: "username",
        access_token: paginaEncontrada.access_token,
      });

      const { error } = await ctx.supabaseAdmin.from("instagram_tokens").upsert({
        id: 1,
        access_token: paginaEncontrada.access_token,
        ig_user_id: paginaEncontrada.igUserId,
        ig_username: perfilIg.username || null,
        page_id: paginaEncontrada.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);

      return paginaHtml("Instagram conectado!", "Pode fechar esta aba e voltar ao painel, na aba Instagram.");
    } catch (e) {
      return paginaHtml("Erro ao conectar", `Algo deu errado: ${(e as Error).message}. Tente de novo pelo painel.`);
    }
  }),
};
