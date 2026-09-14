// ==========================================================================
// supabase/functions/calendar-oauth-callback/index.ts
// ==========================================================================
// Pra onde o Google redireciona depois da tela de consentimento. Não tem
// autenticação do painel aqui (é uma navegação normal do navegador) — a
// segurança vem de validar o "state" de uso único gerado em
// calendar-oauth-start. É aqui, logo após o primeiro token recebido com
// sucesso, que a agenda "Creator Center" é criada (uma vez só).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { credenciaisGoogleCalendar, obterOuCriarCalendarioCreatorCenter } from "../_shared/calendar.ts";
import { trocarPorToken } from "../_shared/gmail.ts";
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
    const erroGoogle = url.searchParams.get("error");

    if (erroGoogle) {
      return paginaHtml("Conexão cancelada", "Você cancelou a autorização no Google. Pode fechar esta aba.");
    }
    if (!code || !state) {
      return paginaHtml("Erro", "Faltou informação na resposta do Google. Tente conectar de novo pelo painel.");
    }

    const { data: estadoSalvo } = await ctx.supabaseAdmin
      .from("calendar_oauth_states")
      .select("state")
      .eq("state", state)
      .maybeSingle();

    if (!estadoSalvo) {
      return paginaHtml("Erro", "Essa autorização já foi usada ou expirou. Tente conectar de novo pelo painel.");
    }
    await ctx.supabaseAdmin.from("calendar_oauth_states").delete().eq("state", state);

    try {
      const { clientId, clientSecret, redirectUri } = credenciaisGoogleCalendar();
      const tokens = await trocarPorToken({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: "authorization_code",
      });

      if (!tokens.refresh_token) {
        return paginaHtml(
          "Precisa autorizar de novo",
          "O Google não enviou permissão de acesso contínuo dessa vez (isso acontece se a conta já tinha autorizado antes). Revogue o acesso em myaccount.google.com/permissions e tente conectar de novo pelo painel.",
        );
      }

      const expiraEm = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      const accessTokenId = await gravarSegredo(ctx.supabaseAdmin, null, tokens.access_token, "calendar_access_token");
      const refreshTokenId = await gravarSegredo(ctx.supabaseAdmin, null, tokens.refresh_token, "calendar_refresh_token");
      const { error } = await ctx.supabaseAdmin.from("calendar_tokens").upsert({
        id: 1,
        access_token: accessTokenId,
        refresh_token: refreshTokenId,
        expires_at: expiraEm,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);

      await obterOuCriarCalendarioCreatorCenter(ctx.supabaseAdmin, tokens.access_token);

      return paginaHtml(
        "Google Agenda conectado!",
        'Criei uma agenda chamada "Creator Center" na sua conta Google. Pode fechar esta aba e voltar ao painel, na aba Calendário.',
      );
    } catch (e) {
      return paginaHtml("Erro ao conectar", `Algo deu errado: ${(e as Error).message}. Tente de novo pelo painel.`);
    }
  }),
};
