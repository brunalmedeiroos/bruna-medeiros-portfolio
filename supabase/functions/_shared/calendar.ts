// ==========================================================================
// supabase/functions/_shared/calendar.ts
// ==========================================================================
// Funções compartilhadas pelas Edge Functions calendar-oauth-start,
// calendar-oauth-callback, calendar-oauth-disconnect, calendar-push-evento,
// calendar-push-excluir e calendar-pull. Nada aqui é exposto diretamente ao
// navegador — só outras Edge Functions importam este arquivo.
//
// Reaproveita GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (o mesmo Client OAuth já
// usado pro Gmail) e trocarPorToken() já implementado em _shared/gmail.ts —
// só o escopo pedido e o redirect_uri mudam.

import { trocarPorToken } from "./gmail.ts";
import { gravarSegredo, lerSegredo } from "./vault.ts";

export const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// Escopo amplo (não só ".../calendar.events") porque calendars.insert (criar
// a agenda "Creator Center" na primeira conexão) exige o escopo completo.
export const CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar";

export const NOME_AGENDA_CREATOR_CENTER = "Creator Center";

// App de uma dona só, no Brasil — sem preferência de fuso guardada em
// lugar nenhum do painel, então fixo aqui mesmo.
export const FUSO_HORARIO = "America/Sao_Paulo";

// Chave da extendedProperty.private que todo evento criado a partir de uma
// tarefa do painel carrega — é o que permite reconhecer, ao puxar do
// Google, se um evento é "nosso" (e então decidir se é eco da própria
// gravação ou uma edição de verdade feita direto no Google) ou realmente
// estranho ao painel (criado direto na Google Agenda).
export const PROPRIEDADE_TAREFA_ID_CHAVE = "painel_tarefas_id";

function env(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

export function credenciaisGoogleCalendar() {
  return {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    redirectUri: env("CALENDAR_REDIRECT_URI"),
  };
}

// Lê o token guardado no banco e devolve um access_token válido, renovando
// via refresh_token se estiver perto de expirar. Retorna null se a Google
// Agenda ainda não foi conectada. Mesmo desenho de obterAccessTokenValido()
// em _shared/gmail.ts, só que lendo/gravando calendar_tokens.
// deno-lint-ignore no-explicit-any
export async function obterAccessTokenValido(supabaseAdmin: any): Promise<string | null> {
  const { data: linha, error } = await supabaseAdmin
    .from("calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Erro lendo calendar_tokens: ${error.message}`);
  if (!linha) return null;

  const expiraEm = new Date(linha.expires_at).getTime();
  const margemMs = 60_000; // renova 1 minuto antes de expirar
  if (linha.access_token && expiraEm - margemMs > Date.now()) {
    return await lerSegredo(supabaseAdmin, linha.access_token);
  }

  const refreshToken = await lerSegredo(supabaseAdmin, linha.refresh_token);
  const { clientId, clientSecret } = credenciaisGoogleCalendar();
  const tokens = await trocarPorToken({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken as string,
    grant_type: "refresh_token",
  });

  const novoAccessTokenId = await gravarSegredo(supabaseAdmin, linha.access_token, tokens.access_token, "calendar_access_token");
  const novoExpiraEm = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("calendar_tokens")
    .update({ access_token: novoAccessTokenId, expires_at: novoExpiraEm, updated_at: new Date().toISOString() })
    .eq("id", 1);

  return tokens.access_token;
}

export async function chamarCalendar(accessToken: string, caminho: string, init: RequestInit = {}) {
  const res = await fetch(`${CALENDAR_API}${caminho}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  if (res.status === 204) return null; // ex: DELETE bem-sucedido, sem corpo
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Erro na API do Google Agenda (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

// Devolve o id da agenda "Creator Center" já criada, ou cria uma agora (só
// acontece uma vez — o id fica guardado em calendar_tokens.google_calendar_id
// depois da primeira chamada).
// deno-lint-ignore no-explicit-any
export async function obterOuCriarCalendarioCreatorCenter(supabaseAdmin: any, accessToken: string): Promise<string> {
  const { data: linha } = await supabaseAdmin
    .from("calendar_tokens")
    .select("google_calendar_id")
    .eq("id", 1)
    .maybeSingle();
  if (linha?.google_calendar_id) return linha.google_calendar_id;

  const novaAgenda = await chamarCalendar(accessToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({ summary: NOME_AGENDA_CREATOR_CENTER, timeZone: FUSO_HORARIO }),
  });

  await supabaseAdmin
    .from("calendar_tokens")
    .update({ google_calendar_id: novaAgenda.id, updated_at: new Date().toISOString() })
    .eq("id", 1);

  return novaAgenda.id as string;
}

function somarUmDia(dataISO: string): string {
  const d = new Date(`${dataISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Traduz uma linha de painel_tarefas pro corpo de evento que a API do Google
// Agenda espera. "feito"/checklist nunca entram aqui — não têm equivalente
// no Google e continuam só no painel.
export function tarefaParaEventoGoogle(tarefa: {
  id: string;
  titulo: string;
  tipo: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
}) {
  // deno-lint-ignore no-explicit-any
  const evento: Record<string, any> = {
    summary: tarefa.titulo,
    description: `Tipo: ${tarefa.tipo}`,
    extendedProperties: { private: { [PROPRIEDADE_TAREFA_ID_CHAVE]: tarefa.id } },
  };

  if (tarefa.hora_inicio) {
    evento.start = { dateTime: `${tarefa.data}T${tarefa.hora_inicio}`, timeZone: FUSO_HORARIO };
    evento.end = { dateTime: `${tarefa.data}T${tarefa.hora_fim || tarefa.hora_inicio}`, timeZone: FUSO_HORARIO };
  } else {
    // Evento de dia inteiro: end.date é o dia SEGUINTE ao início, por
    // convenção da API do Google (mesmo pra um evento de 1 dia só).
    evento.start = { date: tarefa.data };
    evento.end = { date: somarUmDia(tarefa.data) };
  }

  return evento;
}

// Traduz um evento do Google de volta pros campos de painel_tarefas que têm
// equivalente lá (título/dia/horário). "tipo" fica por conta de quem chama
// (eventos estranhos ao painel não têm tipo — usar um padrão como
// "Compromisso"; eventos que já eram nossos mantêm o tipo que já tinham).
// deno-lint-ignore no-explicit-any
export function eventoGoogleParaTarefaParcial(evento: any) {
  const diaInteiro = !!evento.start?.date;
  const data = diaInteiro ? evento.start.date : (evento.start?.dateTime || "").slice(0, 10);
  const horaInicio = diaInteiro ? null : (evento.start?.dateTime || "").slice(11, 19) || null;
  const horaFim = diaInteiro ? null : (evento.end?.dateTime || "").slice(11, 19) || null;

  return {
    titulo: evento.summary || "(Sem título)",
    data,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
  };
}
