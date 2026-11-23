// ==========================================================================
// supabase/functions/_shared/planejamento.ts
// ==========================================================================
// Agente de sugestão semanal: olha o próprio banco da Bruna (achados ainda
// não usados, ideias já salvas, o que já foi postado, e as notícias do
// Radar ainda não usadas como "tendências") e pede pro Gemini (mesma cota
// grátis já usada pelo Radar de Notícias) montar até 6 sugestões pra semana
// — ideias de conteúdo novas, ou achados parados que valem reaproveitar.

export interface AchadoDisponivel {
  id: string;
  conteudo: string;
  coluna: string;
  como_usar: string | null;
}

export interface IdeiaResumo {
  titulo: string;
  status: string;
}

export interface TendenciaResumo {
  titulo: string;
  categoria: string | null;
  adaptacao: string | null;
}

export interface SugestaoSemanal {
  tipo: "ideia" | "achado";
  titulo: string;
  descricao: string;
  pilar_sugerido: string;
  achado_id: string | null;
}

const MAX_SUGESTOES = 6;

// A instrução fala sobre QUEM é a Bruna, igual ao Radar de Notícias — mas
// aqui o material não vem de fora, vem do próprio banco dela.
function construirInstrucao(nomesPilares: string[], temAchados: boolean): string {
  const instrucaoPilar = nomesPilares.length > 0
    ? `Se algum destes pilares de conteúdo fizer sentido pra uma sugestão, preencha "pilar_sugerido" com o nome ` +
      `EXATO de um deles — copie a grafia igualzinha, sem traduzir nem ajustar. Se nenhum encaixar bem, deixe em ` +
      `branco. Pilares existentes: ${nomesPilares.join(", ")}.\n\n`
    : "Deixe o campo \"pilar_sugerido\" sempre em branco (ela ainda não tem nenhum pilar cadastrado).\n\n";

  const instrucaoAchado = temAchados
    ? "Pra cada sugestão do tipo \"achado\" (reaproveitar algo que ela já guardou), preencha \"achado_numero\" com " +
      "o número EXATO da lista de achados abaixo (1, 2, 3...). Pra sugestões do tipo \"ideia\" (algo novo, não ligado " +
      "a nenhum achado da lista), deixe \"achado_numero\" como 0.\n\n"
    : "Não há achados disponíveis agora — toda sugestão deve ser do tipo \"ideia\", com \"achado_numero\" igual a 0.\n\n";

  return (
    "Você é a assistente de estratégia de conteúdo de Bruna, uma creator de 20 anos, de Fortaleza (CE). " +
    "Ela não é \"UGC Creator\" — é creator completa: criação de conteúdo, estratégia, posicionamento, construção de " +
    "autoridade digital. Nichos atuais do portfólio: Tecnologia, Beleza, Entretenimento, Experiências. Também fala " +
    "sobre bastidores de criação, marketing/estratégia de conteúdo e IA aplicada à criação e venda de conteúdo. " +
    "Publica no TikTok, Instagram e YouTube Shorts. Tom: natural, estratégico, jovem, direto, humano — sem linguagem " +
    "corporativa, sem clichê, sem postura de guru. Conteúdo dela nunca é genérico: sempre tem ângulo específico, " +
    "opinião real ou observação prática.\n\n" +
    "Sua tarefa agora é montar o planejamento de conteúdo da semana dela, olhando só pro material que ela mesma já " +
    "guardou (acompanha abaixo: achados salvos ainda não usados, ideias que já estão no banco, o que ela já postou " +
    "recentemente, e notícias do Radar que ainda não viraram ideia). Monte até " + MAX_SUGESTOES + " sugestões — " +
    "poucas e muito boas, não muitas e genéricas. Cada sugestão é de um tipo:\n" +
    "- \"ideia\": um conteúdo novo que ela ainda não tem no banco, bem específico (não repita nada que já está nas " +
    "ideias existentes nem no que já foi postado recentemente).\n" +
    "- \"achado\": aponta um achado específico da lista (gancho, frase, formato, carrossel, música, CTA) que está " +
    "parado e faz sentido ela reaproveitar agora, explicando como adaptar.\n\n" +
    "Pra cada sugestão, preencha: \"titulo\" (curto, direto, o nome da ideia ou do que reaproveitar), " +
    "\"descricao\" (2-4 frases: por que essa sugestão faz sentido pra ela agora, e como executar na prática — um " +
    "ângulo, um gancho, ou um jeito concreto de transformar em vídeo), \"tipo\" (\"ideia\" ou \"achado\"). " +
    instrucaoAchado +
    instrucaoPilar +
    "IMPORTANTE: responda sempre em português do Brasil."
  );
}

function listarAchados(achados: AchadoDisponivel[]): string {
  if (achados.length === 0) return "Nenhum achado disponível agora.";
  return achados
    .map((a, i) => `${i + 1}. [${a.coluna}] ${a.conteudo}${a.como_usar ? ` — como usar: ${a.como_usar}` : ""}`)
    .join("\n");
}

function listarIdeias(titulo: string, ideias: IdeiaResumo[]): string {
  if (ideias.length === 0) return `${titulo}: nenhuma.`;
  return `${titulo}:\n${ideias.map((i) => `- ${i.titulo} (${i.status})`).join("\n")}`;
}

function listarTendencias(tendencias: TendenciaResumo[]): string {
  if (tendencias.length === 0) return "Nenhuma tendência do Radar disponível agora.";
  return tendencias.map((t) => `- [${t.categoria || "Geral"}] ${t.titulo}${t.adaptacao ? ` — ${t.adaptacao}` : ""}`).join("\n");
}

export async function gerarSugestoesComGemini(params: {
  achados: AchadoDisponivel[];
  ideiasExistentes: IdeiaResumo[];
  postadas: IdeiaResumo[];
  tendencias: TendenciaResumo[];
  nomesPilares: string[];
}): Promise<SugestaoSemanal[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Variável de ambiente ausente: GEMINI_API_KEY");
  const modelo = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

  const { achados, ideiasExistentes, postadas, tendencias, nomesPilares } = params;

  const prompt =
    `${construirInstrucao(nomesPilares, achados.length > 0)}\n\n` +
    `Achados salvos ainda não usados:\n${listarAchados(achados)}\n\n` +
    `${listarIdeias("Ideias já no banco (não repita)", ideiasExistentes)}\n\n` +
    `${listarIdeias("Já postado recentemente (não repita)", postadas)}\n\n` +
    `Tendências do Radar ainda não usadas:\n${listarTendencias(tendencias)}\n\n` +
    "Responda só com as sugestões, preenchendo todos os campos pedidos.";

  const schema = {
    type: "OBJECT",
    properties: {
      sugestoes: {
        type: "ARRAY",
        maxItems: MAX_SUGESTOES,
        items: {
          type: "OBJECT",
          properties: {
            tipo: { type: "STRING", enum: ["ideia", "achado"] },
            titulo: { type: "STRING" },
            descricao: { type: "STRING", description: "Por que faz sentido agora e como executar na prática." },
            pilar_sugerido: { type: "STRING", description: "Nome exato de um pilar existente, ou string vazia." },
            achado_numero: { type: "INTEGER", description: "Número da lista de achados (1, 2, 3...) quando tipo é achado; 0 quando tipo é ideia." },
          },
          required: ["tipo", "titulo", "descricao", "achado_numero"],
        },
      },
    },
    required: ["sugestoes"],
  };

  const TENTATIVAS = 3;
  let res: Response | null = null;
  let data: Record<string, unknown> = {};
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      },
    );
    data = await res.json();
    if (res.ok) break;
    const podeTentarDeNovo = (res.status === 503 || res.status === 429) && tentativa < TENTATIVAS;
    if (!podeTentarDeNovo) break;
    await new Promise((resolve) => setTimeout(resolve, tentativa * 3000));
  }

  if (!res || !res.ok) {
    throw new Error(`Erro na API do Gemini (${res?.status}): ${JSON.stringify(data.error || data)}`);
  }

  const textoResposta = (data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  }).candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textoResposta) throw new Error("Gemini não retornou conteúdo utilizável.");

  const json = JSON.parse(textoResposta) as {
    sugestoes?: Array<{ tipo: string; titulo: string; descricao: string; pilar_sugerido?: string; achado_numero?: number }>;
  };

  return (json.sugestoes || []).map((s) => {
    const numero = s.achado_numero || 0;
    const achado = s.tipo === "achado" && numero >= 1 && numero <= achados.length ? achados[numero - 1] : null;
    return {
      tipo: achado ? "achado" : "ideia",
      titulo: s.titulo,
      descricao: s.descricao,
      pilar_sugerido: s.pilar_sugerido || "",
      achado_id: achado ? achado.id : null,
    };
  });
}
