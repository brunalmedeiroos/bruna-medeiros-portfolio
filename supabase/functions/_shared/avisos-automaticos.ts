// ==========================================================================
// supabase/functions/_shared/avisos-automaticos.ts
// ==========================================================================
// Avisos que o painel cria sozinho, sem ela apertar o sininho:
//  1) Compromissos do Calendário de hoje (painel_tarefas) avisam na hora de começar
//     (sem horário, às 8h).
//  2) Tarefas do checklist do Dashboard que ficaram sem check em dias anteriores
//     (painel_checklist_dia) avisam todo dia às 8h enquanto estiverem pendentes.
// Cada aviso vira uma linha em painel_avisos com chave única, então nunca duplica e,
// se ela já tinha desligado ou mexido naquele item, a linha existente vale.
// Os horários do painel são de Fortaleza (UTC-3, sem horário de verão).

const FUSO = "America/Fortaleza";
const DESLOCAMENTO = "-03:00";
const HORA_PADRAO = "08:00";
const JANELA_COMPROMISSO_MS = 5 * 60 * 1000; // só avisa se o horário foi agora há pouco (não de tarefa criada depois)
const MAX_PENDENTES_INDIVIDUAIS = 3;

export interface TarefaCalendario {
  id: string;
  titulo: string;
  hora_inicio: string | null;
}

export interface TarefaPendente {
  id: string;
  texto: string;
  data: string;
}

export interface NovoAviso {
  chave: string;
  titulo: string;
  quando: string;
  ativo: boolean;
  corpo: string;
}

export function agoraFortaleza(agora: Date) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

export function diasEntre(hoje: string, antes: string) {
  const paraMs = (s: string) => {
    const [a, m, d] = s.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((paraMs(hoje) - paraMs(antes)) / 86400000);
}

export function textoPendente(texto: string, dataTarefa: string, hoje: string) {
  const dias = diasEntre(hoje, dataTarefa);
  const [, mes, dia] = dataTarefa.split("-");
  const desde = dias <= 1 ? "ontem" : `${dia}/${mes}, há ${dias} dias`;
  return `Oii Bru, você tem ${texto} pendente de ${desde}. Vamos fazer?`;
}

// Parte pura (sem banco): decide quais avisos criar agora.
export function montarAvisosAutomaticos(agora: Date, tarefas: TarefaCalendario[], pendentes: TarefaPendente[]): NovoAviso[] {
  const { data: hoje, minutos } = agoraFortaleza(agora);
  const novos: NovoAviso[] = [];

  for (const t of tarefas) {
    const hora = t.hora_inicio ? String(t.hora_inicio).slice(0, 5) : null;
    const inicio = new Date(`${hoje}T${hora ?? HORA_PADRAO}:00${DESLOCAMENTO}`);
    const atraso = agora.getTime() - inicio.getTime();
    if (atraso < 0 || atraso > JANELA_COMPROMISSO_MS) continue;
    novos.push({
      chave: `tarefa:${t.id}`,
      titulo: t.titulo,
      quando: inicio.toISOString(),
      ativo: true,
      corpo: hora ? `Compromisso das ${hora}` : "Compromisso de hoje",
    });
  }

  // Pendências: uma rodada por dia, logo às 8h (a janela de 10 minutos cobre uma rodada do relógio que falhe).
  const minutosOito = 8 * 60;
  if (minutos >= minutosOito && minutos < minutosOito + 10) {
    pendentes.slice(0, MAX_PENDENTES_INDIVIDUAIS).forEach((p) => {
      novos.push({
        chave: `pendente:${p.id}:${hoje}`,
        titulo: "Tarefa pendente",
        quando: agora.toISOString(),
        ativo: true,
        corpo: textoPendente(p.texto, p.data, hoje),
      });
    });
    const resto = pendentes.length - MAX_PENDENTES_INDIVIDUAIS;
    if (resto > 0) {
      novos.push({
        chave: `pendente-resumo:${hoje}`,
        titulo: "Tarefas pendentes",
        quando: agora.toISOString(),
        ativo: true,
        corpo: `Oii Bru, você tem mais ${resto} ${resto === 1 ? "tarefa pendente" : "tarefas pendentes"}. Vamos fazer?`,
      });
    }
  }
  return novos;
}

// deno-lint-ignore no-explicit-any
export async function criarAvisosAutomaticos(admin: any, agora: Date) {
  const { data: hoje, minutos } = agoraFortaleza(agora);

  const { data: tarefas, error: erroTarefas } = await admin.from("painel_tarefas").select("id, titulo, hora_inicio").eq("data", hoje).eq("feito", false);
  if (erroTarefas) throw erroTarefas;

  let pendentes: TarefaPendente[] = [];
  if (minutos >= 8 * 60 && minutos < 8 * 60 + 10) {
    const { data, error } = await admin
      .from("painel_checklist_dia")
      .select("id, texto, data")
      .lt("data", hoje)
      .eq("feito", false)
      .order("data", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    pendentes = data || [];
  }

  const novos = montarAvisosAutomaticos(agora, tarefas || [], pendentes);
  if (novos.length) {
    // ignoreDuplicates: se a chave já existe (aviso manual, desligado ou já enviado), não mexe.
    const { error } = await admin.from("painel_avisos").upsert(novos, { onConflict: "chave", ignoreDuplicates: true });
    if (error) throw error;
  }

  // Faxina: avisos enviados há mais de 7 dias não servem mais pra nada.
  await admin.from("painel_avisos").delete().lt("enviado_em", new Date(agora.getTime() - 7 * 86400000).toISOString());
  return novos.length;
}
