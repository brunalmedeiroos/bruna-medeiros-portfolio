// ==========================================================================
// supabase/functions/_shared/instagram-automacao.ts
// ==========================================================================
// Motor da automação "comentário → resposta privada": busca comentários
// novos nos posts recentes, casa com as regras ativas (instagram_automacoes)
// e manda a resposta privada via Graph API.
//
// NÃO usa webhook — receber aviso em tempo real de comentário exige o app
// do Meta em modo "Live" com Advanced Access aprovado, mesmo sendo só pra
// conta da própria dona do painel. Em vez disso, é chamado periodicamente
// (cron a cada 10 min — ver instagram-automacoes-tabela.sql) e cada
// chamada "confere o que mudou desde a última vez", usando só o Standard
// Access que o app já tem (suficiente quando o app só serve a própria
// conta do dono, sem App Review).
//
// Regras da API do Instagram que isso respeita (developers.facebook.com/
// docs/instagram-platform/private-replies):
//  - Resposta privada só funciona até 7 dias depois do comentário.
//  - Só uma resposta privada por comentário — nunca reenvia se já tentou.

import { chamarGraph, GRAPH_API } from "./instagram.ts";

const JANELA_RESPOSTA_MS = 7 * 24 * 60 * 60 * 1000;
const LIMITE_POSTS = 15;

async function chamarGraphPost(caminho: string, accessToken: string, corpo: unknown) {
  const url = new URL(`${GRAPH_API}${caminho}`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro na API do Instagram (${res.status}): ${JSON.stringify(data.error || data)}`);
  }
  return data;
}

interface Automacao {
  id: string;
  palavra_gatilho: string;
  media_id: string | null;
  mensagem: string;
}

interface Comentario {
  id: string;
  text?: string;
  username?: string;
  timestamp: string;
}

// deno-lint-ignore no-explicit-any
export async function processarAutomacoes(supabaseAdmin: any, igUserId: string, accessToken: string) {
  const resultado = { comentariosVistos: 0, respostasEnviadas: 0, erros: [] as string[] };

  const { data: automacoes } = await supabaseAdmin
    .from("instagram_automacoes")
    .select("id, palavra_gatilho, media_id, mensagem")
    .eq("ativo", true);
  if (!automacoes || automacoes.length === 0) return resultado;

  let midias: Array<{ id: string; timestamp: string }> = [];
  try {
    const resp = await chamarGraph("/me/media", {
      fields: "id,timestamp",
      limit: String(LIMITE_POSTS),
      access_token: accessToken,
    });
    midias = resp.data || [];
  } catch (e) {
    resultado.erros.push(`buscar posts: ${(e as Error).message}`);
    return resultado;
  }

  const agora = Date.now();
  // Um post com mais de 7 dias não pode mais gerar resposta privada válida
  // pra nenhum comentário novo nele — nem vale a pena olhar seus comentários.
  const midiasRecentes = midias.filter((m) => agora - new Date(m.timestamp).getTime() < JANELA_RESPOSTA_MS);

  for (const midia of midiasRecentes) {
    let comentarios: Comentario[] = [];
    try {
      const resp = await chamarGraph(`/${midia.id}/comments`, {
        fields: "id,text,username,timestamp",
        access_token: accessToken,
      });
      comentarios = resp.data || [];
    } catch (e) {
      resultado.erros.push(`buscar comentários de ${midia.id}: ${(e as Error).message}`);
      continue;
    }

    for (const comentario of comentarios) {
      resultado.comentariosVistos++;

      // Idempotência: tenta "reservar" este comentário. Se já foi
      // processado antes (unique violation), pula sem reprocessar.
      const { error: erroInsert } = await supabaseAdmin
        .from("instagram_comentarios_processados")
        .insert({ comentario_id: comentario.id });
      if (erroInsert) continue;

      const texto = (comentario.text || "").toLowerCase();
      const automacao = (automacoes as Automacao[]).find(
        (a) => texto.includes(a.palavra_gatilho.toLowerCase()) && (!a.media_id || a.media_id === midia.id),
      );
      if (!automacao) continue;

      const conta = comentario.username || "desconhecida";
      const dentroDaJanela = agora - new Date(comentario.timestamp).getTime() < JANELA_RESPOSTA_MS;

      let recebeu = false;
      if (dentroDaJanela) {
        try {
          await chamarGraphPost(`/${igUserId}/messages`, accessToken, {
            recipient: { comment_id: comentario.id },
            message: { text: automacao.mensagem },
          });
          recebeu = true;
          resultado.respostasEnviadas++;
        } catch (e) {
          resultado.erros.push(`resposta privada pra @${conta}: ${(e as Error).message}`);
        }
      }

      const { data: existente } = await supabaseAdmin
        .from("instagram_leads")
        .select("id, interacoes, recebeu")
        .eq("conta", conta)
        .maybeSingle();

      if (existente) {
        await supabaseAdmin
          .from("instagram_leads")
          .update({
            origem: "Comentário",
            palavra: automacao.palavra_gatilho,
            automacao_id: automacao.id,
            recebeu: recebeu || existente.recebeu,
            interacoes: existente.interacoes + 1,
            ultima_vez: comentario.timestamp,
          })
          .eq("id", existente.id);
      } else {
        await supabaseAdmin.from("instagram_leads").insert({
          conta,
          origem: "Comentário",
          palavra: automacao.palavra_gatilho,
          automacao_id: automacao.id,
          recebeu,
          interacoes: 1,
          ultima_vez: comentario.timestamp,
        });
      }
    }
  }

  return resultado;
}
