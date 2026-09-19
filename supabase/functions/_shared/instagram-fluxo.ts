// ==========================================================================
// supabase/functions/_shared/instagram-fluxo.ts
// ==========================================================================
// Motor de conversa com botões (estilo ManyChat) das automações do
// Instagram. Usado pelo instagram-webhook (dispara o passo 1 a partir
// de um comentário/DM e avança a conversa a cada toque de botão) e
// pelo instagram-scheduler (esvazia a fila do freio e os passos com
// atraso).
//
// Formato do campo "flow" de instagram_automacoes:
//   { steps: [ { id, message, buttons: [{title, next?, url?}],
//                assets?: string[], collect?: {field, next},
//                delay?: {seconds, next} }, ... ] }
// O primeiro item do array é sempre a Mensagem 1. Um botão tem OU
// "next" (avança pro passo com esse id) OU "url" (abre um link) —
// nunca os dois. Um botão sem os dois não é enviado (é o "encerrar").

import { chamarGraphPost } from "./instagram.ts";

export interface Botao {
  title: string;
  next?: number;
  url?: string;
}

export interface Passo {
  id: number;
  message: string;
  buttons?: Botao[];
  assets?: string[];
  collect?: { field: string; next: number };
  delay?: { seconds: number; next: number };
}

export interface Flow {
  steps: Passo[];
}

// O payload que vai dentro do botão de postback / quick_reply — carrega
// o id da automação, pra duas automações com o mesmo texto de botão
// nunca se misturarem.
export function payloadPostback(automacaoId: string, stepId: number): string {
  return `STEP:${automacaoId}:${stepId}`;
}

const RE_PAYLOAD = /^STEP:([0-9a-fA-F-]+):(-?\d+)$/;

export function interpretarPayload(payload: string): { automacaoId: string; stepId: number } | null {
  const m = RE_PAYLOAD.exec(payload || "");
  if (!m) return null;
  return { automacaoId: m[1], stepId: Number(m[2]) };
}

export function acharPasso(flow: Flow | null | undefined, stepId: number): Passo | undefined {
  return flow?.steps?.find((s) => s.id === stepId);
}

export function primeiroPasso(flow: Flow | null | undefined): Passo | undefined {
  return flow?.steps?.[0];
}

// Escolhe uma variante A/B ao acaso (ou o texto único, se não houver
// variantes cadastradas).
export function escolherResposta(texto: string | null | undefined, variantes: string[] | null | undefined): string {
  const opcoes = (variantes || []).filter((v) => v && v.trim());
  if (opcoes.length === 0) return texto || "";
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

function botoesValidos(passo: Passo): Botao[] {
  return (passo.buttons || []).filter((b) => !!b.url || typeof b.next === "number");
}

export interface ResultadoEnvio {
  ok: boolean;
  tipo: "template" | "quick_reply" | "texto";
  erro?: string;
  falhaGrave?: boolean;
  mid?: string;
}

// Manda um passo do fluxo pro destinatário (recipient = {comment_id} pra
// a primeira resposta privada de um comentário, ou {id: igsid} pra
// qualquer mensagem dentro da janela de 24h já aberta). Tenta o botão
// ANEXADO (button template, até 3 botões) primeiro; se o Instagram
// recusar, cai pra quick_reply (só funciona se nenhum botão for link,
// já que quick_reply não abre URL); se ainda falhar, manda texto puro
// (com o link escrito, se houver um botão de link).
export async function enviarPasso(
  contaId: string,
  accessToken: string,
  recipient: { comment_id?: string; id?: string },
  automacaoId: string,
  passo: Passo,
): Promise<ResultadoEnvio> {
  const botoes = botoesValidos(passo);

  if (botoes.length > 0) {
    try {
      const resp = await chamarGraphPost(`/${contaId}/messages`, accessToken, {
        recipient,
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: passo.message,
              buttons: botoes.slice(0, 3).map((b) =>
                b.url
                  ? { type: "web_url", url: b.url, title: b.title.slice(0, 20) }
                  : { type: "postback", title: b.title.slice(0, 20), payload: payloadPostback(automacaoId, b.next as number) },
              ),
            },
          },
        },
      });
      return { ok: true, tipo: "template", mid: resp.message_id };
    } catch (e) {
      console.error("Botão anexado recusado pelo Instagram, tentando fallback:", (e as Error).message);
    }

    // Fallback 1: quick_reply — só serve se TODOS os botões forem "avançar"
    // (quick_reply não tem tipo de botão que abre link).
    const todosAvancam = botoes.every((b) => typeof b.next === "number");
    if (todosAvancam) {
      try {
        const resp = await chamarGraphPost(`/${contaId}/messages`, accessToken, {
          recipient,
          message: {
            text: passo.message,
            quick_replies: botoes.slice(0, 13).map((b) => ({
              content_type: "text",
              title: b.title.slice(0, 20),
              payload: payloadPostback(automacaoId, b.next as number),
            })),
          },
        });
        return { ok: true, tipo: "quick_reply", mid: resp.message_id };
      } catch (e) {
        console.error("Quick reply também recusado, caindo pro texto puro:", (e as Error).message);
      }
    }
  }

  // Fallback final (ou caminho direto, se o passo não tem botão nenhum):
  // texto puro, com o link do botão escrito na mensagem se houver um.
  const botaoLink = botoes.find((b) => b.url);
  const texto = botaoLink ? `${passo.message}\n\n${botaoLink.title}: ${botaoLink.url}` : passo.message;
  try {
    const resp = await chamarGraphPost(`/${contaId}/messages`, accessToken, { recipient, message: { text: texto } });
    return { ok: true, tipo: "texto", mid: resp.message_id };
  } catch (e) {
    const msg = (e as Error).message;
    // Erros de limite/bloqueio da Meta contêm esses códigos — trata como
    // "falha grave" pro disjuntor do freio pausar os envios.
    const falhaGrave = /"code":\s*(4|32|368|10)\b/.test(msg) || /rate limit|blocked|spam/i.test(msg);
    return { ok: false, tipo: "texto", erro: msg, falhaGrave };
  }
}

export function validarEmail(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());
}

export function validarTelefone(texto: string): boolean {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length >= 8 && digitos.length <= 15;
}

// Acha, entre as automações ativas, a primeira que casa com o texto
// (palavra-gatilho ou "qualquer palavra") e, se informado, com o post.
export function acharAutomacaoParaTexto(
  automacoes: Array<{ id: string; palavra_gatilho: string; match_any: boolean; media_ids: string[]; flow: Flow | null }>,
  texto: string,
  mediaId?: string | null,
) {
  const textoBusca = (texto || "").toLowerCase();
  return automacoes.find((a) => {
    const bateMedia = !mediaId || !a.media_ids || a.media_ids.length === 0 || a.media_ids.includes(mediaId);
    if (!bateMedia) return false;
    if (a.match_any) return true;
    const palavras = (a.palavra_gatilho || "").split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
    return palavras.some((p) => textoBusca.includes(p));
  });
}

// ==========================================================================
// A partir daqui: a orquestração usada pelo instagram-webhook e pelo
// instagram-scheduler. Cada função recebe supabaseAdmin (cliente
// service_role) já pronto — nada aqui abre conexão nova.
// ==========================================================================

interface AutomacaoRow {
  id: string;
  nome: string;
  palavra_gatilho: string;
  match_any: boolean;
  media_ids: string[];
  ativo: boolean;
  flow: Flow | null;
  resposta_comentario: string | null;
  resposta_comentario_variantes: string[] | null;
}

const COLUNAS_AUTOMACAO = "id, nome, palavra_gatilho, match_any, media_ids, ativo, flow, resposta_comentario, resposta_comentario_variantes";

function contasDeTeste(): string[] {
  return (Deno.env.get("INSTAGRAM_TEST_ACCOUNTS") || "").split(",").map((s) => s.trim()).filter(Boolean);
}

// Registra o resultado de UMA tentativa de envio (privado ou resposta
// pública no comentário) no log usado pelo card "Saúde do envio" da
// Visão Geral. Nunca lança erro — um problema aqui não pode derrubar o
// envio real.
// deno-lint-ignore no-explicit-any
async function registrarEntrega(supabaseAdmin: any, dados: {
  automacaoId?: string | null;
  igUserId?: string | null;
  canal: "privado" | "comentario_publico";
  tipo?: string;
  ok: boolean;
  erro?: string;
}) {
  await supabaseAdmin
    .from("instagram_entregas")
    .insert({
      automacao_id: dados.automacaoId || null,
      ig_user_id: dados.igUserId || null,
      canal: dados.canal,
      tipo: dados.tipo || null,
      status: dados.ok ? "ok" : "erro",
      erro: dados.erro || null,
    })
    .then(() => {}, () => {});
}

// Depois de mandar um passo com sucesso: se ele tem "collect", guarda o
// que a próxima mensagem de texto da pessoa deve alimentar; se tem
// "delay", agenda o próximo passo pra sair sozinho, sem precisar de
// toque em botão.
// deno-lint-ignore no-explicit-any
async function aplicarEfeitosPosEnvio(supabaseAdmin: any, igUserId: string, automacaoId: string, passo: Passo) {
  if (passo.collect) {
    await supabaseAdmin.from("instagram_leads").update({ expecting: passo.collect }).eq("ig_user_id", igUserId);
  }
  if (passo.delay && passo.delay.seconds > 0) {
    await supabaseAdmin.from("instagram_agendados").insert({
      ig_user_id: igUserId,
      automacao_id: automacaoId,
      step_id: passo.delay.next,
      send_at: new Date(Date.now() + passo.delay.seconds * 1000).toISOString(),
    });
  }
}

// Tenta uma ficha do freio; se conseguir, manda o passo na hora. Se não
// conseguir, guarda na fila pro instagram-scheduler tentar depois. Nos
// dois casos "vai sair" (agora ou na fila) — só quando o envio de fato
// falha (erro da API) é que nada acontece.
// deno-lint-ignore no-explicit-any
async function entregarPasso(
  supabaseAdmin: any,
  contaId: string,
  accessToken: string,
  recipient: { comment_id?: string; id?: string },
  automacao: AutomacaoRow,
  passo: Passo,
  igUserId: string,
  username: string | null,
  comentarioId?: string,
): Promise<{ garantido: boolean; enviadoAgora: boolean }> {
  const { data: temFicha } = await supabaseAdmin.rpc("instagram_tirar_ficha", { p_chave: "privado" });

  if (!temFicha) {
    await supabaseAdmin.from("instagram_fila_envio").insert({
      comentario_id: comentarioId || null,
      automacao_id: automacao.id,
      ig_user_id: igUserId,
      username,
      payload: { recipient, automacaoId: automacao.id, stepId: passo.id },
    });
    return { garantido: true, enviadoAgora: false };
  }

  const resultado = await enviarPasso(contaId, accessToken, recipient, automacao.id, passo);
  await supabaseAdmin.rpc("instagram_registrar_envio", { p_chave: "privado", p_ok: resultado.ok, p_falha_grave: !!resultado.falhaGrave });
  await registrarEntrega(supabaseAdmin, { automacaoId: automacao.id, igUserId, canal: "privado", tipo: resultado.tipo, ok: resultado.ok, erro: resultado.erro });

  if (!resultado.ok) {
    console.error(`Falha ao entregar passo ${passo.id} da automação ${automacao.id}:`, resultado.erro);
    return { garantido: false, enviadoAgora: false };
  }

  if (resultado.mid) await supabaseAdmin.from("instagram_envios_bot").insert({ mid: resultado.mid }).then(() => {}, () => {});
  await aplicarEfeitosPosEnvio(supabaseAdmin, igUserId, automacao.id, passo);
  return { garantido: true, enviadoAgora: true };
}

// deno-lint-ignore no-explicit-any
async function upsertLead(supabaseAdmin: any, dados: {
  igUserId: string;
  username: string | null;
  origem: "Comentário" | "Direct";
  palavra: string | null;
  automacaoId: string;
  recebeu: boolean;
  flowStep: string;
}) {
  const { data: existente } = await supabaseAdmin
    .from("instagram_leads")
    .select("id, interacoes, recebeu")
    .eq("ig_user_id", dados.igUserId)
    .maybeSingle();

  const linha = {
    conta: dados.username || dados.igUserId,
    ig_user_id: dados.igUserId,
    origem: dados.origem,
    palavra: dados.palavra,
    automacao_id: dados.automacaoId,
    flow_step: dados.flowStep,
    ultima_vez: new Date().toISOString(),
  };

  if (existente) {
    await supabaseAdmin
      .from("instagram_leads")
      .update({ ...linha, recebeu: dados.recebeu || existente.recebeu, interacoes: existente.interacoes + 1 })
      .eq("id", existente.id);
  } else {
    await supabaseAdmin.from("instagram_leads").insert({ ...linha, recebeu: dados.recebeu, interacoes: 1 });
  }
}

interface ComentarioWebhook {
  id: string;
  text?: string;
  from?: { id: string; username?: string };
  media?: { id: string };
}

// Processa um evento de comentário novo: acha a automação, respeita a
// regra do "1 por dia" (exceto contas de teste), entrega o primeiro
// passo do fluxo (na hora ou pela fila) e responde no comentário.
// deno-lint-ignore no-explicit-any
export async function processarComentario(supabaseAdmin: any, contaId: string, accessToken: string, value: ComentarioWebhook) {
  if (!value?.id || !value.from?.id) return;
  if (value.from.id === contaId) return; // comentário da própria conta — ignora

  const { error: erroDedupe } = await supabaseAdmin.from("instagram_comentarios_processados").insert({ comentario_id: value.id });
  if (erroDedupe) return; // já processado antes

  const { data: automacoes } = await supabaseAdmin.from("instagram_automacoes").select(COLUNAS_AUTOMACAO).eq("ativo", true);
  const automacao = acharAutomacaoParaTexto((automacoes || []) as AutomacaoRow[], value.text || "", value.media?.id);
  if (!automacao) return;

  const passo0 = primeiroPasso(automacao.flow);
  if (!passo0) return;

  const igUserId = value.from.id;
  const username = value.from.username || null;
  const ehTeste = contasDeTeste().includes(igUserId);

  if (!ehTeste) {
    const { data: leadExistente } = await supabaseAdmin
      .from("instagram_leads")
      .select("recebeu, ultima_vez")
      .eq("ig_user_id", igUserId)
      .maybeSingle();
    if (leadExistente?.recebeu && leadExistente.ultima_vez) {
      const horasDesde = (Date.now() - new Date(leadExistente.ultima_vez).getTime()) / (1000 * 60 * 60);
      if (horasDesde < 24) return; // já recebeu uma DM nas últimas 24h — pula
    }
  }

  const { garantido, enviadoAgora } = await entregarPasso(
    supabaseAdmin,
    contaId,
    accessToken,
    { comment_id: value.id },
    automacao as AutomacaoRow,
    passo0,
    igUserId,
    username,
    value.id,
  );
  if (!garantido) return;

  try {
    const textoResposta = escolherResposta(automacao.resposta_comentario, automacao.resposta_comentario_variantes);
    if (textoResposta) {
      await chamarGraphPost(`/${value.id}/replies`, accessToken, { message: textoResposta });
      await registrarEntrega(supabaseAdmin, { automacaoId: automacao.id, igUserId, canal: "comentario_publico", ok: true });
    }
  } catch (e) {
    await registrarEntrega(supabaseAdmin, { automacaoId: automacao.id, igUserId, canal: "comentario_publico", ok: false, erro: (e as Error).message });
    console.error("Erro ao responder o comentário publicamente:", (e as Error).message);
  }

  await upsertLead(supabaseAdmin, {
    igUserId,
    username,
    origem: "Comentário",
    palavra: automacao.match_any ? "(qualquer palavra)" : automacao.palavra_gatilho,
    automacaoId: automacao.id,
    recebeu: enviadoAgora,
    flowStep: String(passo0.id),
  });
}

interface MessagingEvento {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; quick_reply?: { payload: string } };
  postback?: { payload: string };
}

// Processa um evento de mensagem/postback/quick_reply do direct.
// deno-lint-ignore no-explicit-any
export async function processarMensagem(supabaseAdmin: any, contaId: string, accessToken: string, evento: MessagingEvento) {
  if (!evento?.sender?.id) return;
  if (evento.message?.is_echo) return; // é a própria conta mandando (bot ou manual) — ignora

  const igUserId = evento.sender.id;
  const payloadStr = evento.postback?.payload || evento.message?.quick_reply?.payload;

  // ---- Botão apertado (postback ou quick_reply) ----
  if (payloadStr) {
    const interpretado = interpretarPayload(payloadStr);
    if (!interpretado) return;

    const { data: automacao } = await supabaseAdmin.from("instagram_automacoes").select(COLUNAS_AUTOMACAO).eq("id", interpretado.automacaoId).maybeSingle();
    if (!automacao) return;
    const passo = acharPasso(automacao.flow, interpretado.stepId);
    if (!passo) return;

    const { enviadoAgora, garantido } = await entregarPasso(
      supabaseAdmin,
      contaId,
      accessToken,
      { id: igUserId },
      automacao as AutomacaoRow,
      passo,
      igUserId,
      null,
    );
    if (!garantido) return;

    await supabaseAdmin
      .from("instagram_leads")
      .update({ flow_step: String(passo.id), ultima_vez: new Date().toISOString() })
      .eq("ig_user_id", igUserId);
    void enviadoAgora;
    return;
  }

  // ---- Mensagem de texto solta ----
  const texto = (evento.message?.text || "").trim();
  if (!texto) return;

  const { data: lead } = await supabaseAdmin
    .from("instagram_leads")
    .select("automacao_id, expecting")
    .eq("ig_user_id", igUserId)
    .maybeSingle();

  // Um passo anterior pediu um dado (email/telefone) — esta mensagem é a resposta.
  if (lead?.expecting) {
    const { field, next } = lead.expecting as { field: string; next: number };
    const valido = field === "email" ? validarEmail(texto) : field === "telefone" ? validarTelefone(texto) : true;

    if (!valido) {
      try {
        await chamarGraphPost(`/${contaId}/messages`, accessToken, {
          recipient: { id: igUserId },
          message: { text: field === "email" ? "Esse e-mail não parece válido, pode mandar de novo?" : "Esse contato não parece válido, pode mandar de novo?" },
        });
      } catch (e) {
        console.error("Erro ao pedir o dado de novo:", (e as Error).message);
      }
      return;
    }

    await supabaseAdmin.from("instagram_leads").update({ [field]: texto, expecting: null }).eq("ig_user_id", igUserId);

    if (lead.automacao_id) {
      const { data: automacao } = await supabaseAdmin.from("instagram_automacoes").select(COLUNAS_AUTOMACAO).eq("id", lead.automacao_id).maybeSingle();
      const passo = automacao ? acharPasso(automacao.flow, next) : undefined;
      if (automacao && passo) {
        await entregarPasso(supabaseAdmin, contaId, accessToken, { id: igUserId }, automacao as AutomacaoRow, passo, igUserId, null);
        await supabaseAdmin.from("instagram_leads").update({ flow_step: String(passo.id) }).eq("ig_user_id", igUserId);
      }
    }
    return;
  }

  // Nenhum passo pendente: trata como um gatilho novo, igual um comentário
  // (mensagem direta com a palavra-chave também dispara a automação).
  const { data: automacoes } = await supabaseAdmin.from("instagram_automacoes").select(COLUNAS_AUTOMACAO).eq("ativo", true);
  const automacao = acharAutomacaoParaTexto((automacoes || []) as AutomacaoRow[], texto, null);
  if (!automacao) return; // não bate com nada — silêncio

  const passo0 = primeiroPasso(automacao.flow);
  if (!passo0) return;

  const { enviadoAgora, garantido } = await entregarPasso(supabaseAdmin, contaId, accessToken, { id: igUserId }, automacao as AutomacaoRow, passo0, igUserId, null);
  if (!garantido) return;

  await upsertLead(supabaseAdmin, {
    igUserId,
    username: null,
    origem: "Direct",
    palavra: automacao.match_any ? "(qualquer palavra)" : automacao.palavra_gatilho,
    automacaoId: automacao.id,
    recebeu: enviadoAgora,
    flowStep: String(passo0.id),
  });
}

// ---- Usado pelo instagram-scheduler ----

// Esvazia a fila do freio: pra cada item pendente, tenta de novo. Desiste
// (marca "expirado") de comentário mais velho que ~7 dias, fora da janela
// de resposta privada válida do Instagram.
// deno-lint-ignore no-explicit-any
export async function processarFilaEnvio(supabaseAdmin: any, contaId: string, accessToken: string) {
  const resultado = { enviados: 0, expirados: 0, aindaNaFila: 0, erros: [] as string[] };
  const { data: itens } = await supabaseAdmin
    .from("instagram_fila_envio")
    .select("id, automacao_id, ig_user_id, payload, tentativas, created_at, comentario_id")
    .eq("status", "pendente")
    .order("created_at", { ascending: true })
    .limit(200);

  for (const item of itens || []) {
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(item.created_at).getTime() > seteDiasMs) {
      await supabaseAdmin.from("instagram_fila_envio").update({ status: "expirado" }).eq("id", item.id);
      resultado.expirados++;
      continue;
    }

    const { data: temFicha } = await supabaseAdmin.rpc("instagram_tirar_ficha", { p_chave: "privado" });
    if (!temFicha) {
      resultado.aindaNaFila++;
      continue;
    }

    const { data: automacao } = await supabaseAdmin.from("instagram_automacoes").select(COLUNAS_AUTOMACAO).eq("id", item.automacao_id).maybeSingle();
    const passo = automacao ? acharPasso(automacao.flow, item.payload?.stepId) : undefined;
    if (!automacao || !passo) {
      await supabaseAdmin.from("instagram_fila_envio").update({ status: "erro", last_error: "automação ou passo não existe mais" }).eq("id", item.id);
      continue;
    }

    const envio = await enviarPasso(contaId, accessToken, item.payload.recipient, automacao.id, passo);
    await supabaseAdmin.rpc("instagram_registrar_envio", { p_chave: "privado", p_ok: envio.ok, p_falha_grave: !!envio.falhaGrave });
    await registrarEntrega(supabaseAdmin, { automacaoId: automacao.id, igUserId: item.ig_user_id, canal: "privado", tipo: envio.tipo, ok: envio.ok, erro: envio.erro });

    if (envio.ok) {
      await supabaseAdmin.from("instagram_fila_envio").update({ status: "enviado", sent_at: new Date().toISOString() }).eq("id", item.id);
      if (envio.mid) await supabaseAdmin.from("instagram_envios_bot").insert({ mid: envio.mid }).then(() => {}, () => {});
      await aplicarEfeitosPosEnvio(supabaseAdmin, item.ig_user_id, automacao.id, passo);
      await supabaseAdmin.from("instagram_leads").update({ recebeu: true, flow_step: String(passo.id) }).eq("ig_user_id", item.ig_user_id);
      resultado.enviados++;
    } else {
      await supabaseAdmin
        .from("instagram_fila_envio")
        .update({ tentativas: (item.tentativas || 0) + 1, last_error: envio.erro || "erro desconhecido" })
        .eq("id", item.id);
      resultado.erros.push(`fila ${item.id}: ${envio.erro}`);
    }
  }

  return resultado;
}

// Dispara os passos agendados (delay) que já venceram.
// deno-lint-ignore no-explicit-any
export async function processarAgendados(supabaseAdmin: any, contaId: string, accessToken: string) {
  const resultado = { enviados: 0, erros: [] as string[] };
  const { data: itens } = await supabaseAdmin
    .from("instagram_agendados")
    .select("id, ig_user_id, automacao_id, step_id")
    .eq("enviado", false)
    .lte("send_at", new Date().toISOString())
    .limit(200);

  for (const item of itens || []) {
    const { data: automacao } = await supabaseAdmin.from("instagram_automacoes").select(COLUNAS_AUTOMACAO).eq("id", item.automacao_id).maybeSingle();
    const passo = automacao ? acharPasso(automacao.flow, item.step_id) : undefined;
    if (!automacao || !passo) {
      await supabaseAdmin.from("instagram_agendados").update({ enviado: true }).eq("id", item.id);
      continue;
    }

    const envio = await enviarPasso(contaId, accessToken, { id: item.ig_user_id }, automacao.id, passo);
    await supabaseAdmin.from("instagram_agendados").update({ enviado: true }).eq("id", item.id);
    await registrarEntrega(supabaseAdmin, { automacaoId: automacao.id, igUserId: item.ig_user_id, canal: "privado", tipo: envio.tipo, ok: envio.ok, erro: envio.erro });

    if (envio.ok) {
      if (envio.mid) await supabaseAdmin.from("instagram_envios_bot").insert({ mid: envio.mid }).then(() => {}, () => {});
      await aplicarEfeitosPosEnvio(supabaseAdmin, item.ig_user_id, automacao.id, passo);
      await supabaseAdmin.from("instagram_leads").update({ flow_step: String(passo.id) }).eq("ig_user_id", item.ig_user_id);
      resultado.enviados++;
    } else {
      resultado.erros.push(`agendado ${item.id}: ${envio.erro}`);
    }
  }

  return resultado;
}
