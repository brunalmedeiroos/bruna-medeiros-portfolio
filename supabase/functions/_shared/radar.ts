// ==========================================================================
// supabase/functions/_shared/radar.ts
// ==========================================================================
// Funções compartilhadas pela Edge Function radar-atualizar. Busca notícias
// de feeds RSS gratuitos (sem custo, sem chave de API) e usa o Gemini
// (também gratuito, dentro da cota grátis do Google AI Studio) pra escolher
// as mais relevantes e escrever o roteiro/insight de cada uma.

export interface ItemRss {
  titulo: string;
  link: string;
  dataPublicacao: string | null;
  resumo: string;
  fonte: string;
}

export interface NoticiaSelecionada {
  titulo: string;
  fonte: string;
  link: string;
  data_publicacao: string | null;
  resumo: string;
  insight: string;
}

export interface Agente {
  nome: string;
  pergunta: string;
  feeds: Array<{ url: string; fonte: string }>;
  instrucao: string;
}

// Instrução comum a todos os agentes: escreve tudo em português (inclusive
// traduzindo título e resumo de fontes em inglês), pra nunca precisar abrir
// a fonte original só pra entender do que se trata.
const REGRA_IDIOMA =
  "IMPORTANTE: responda sempre em português do Brasil, mesmo que a notícia original esteja em inglês. " +
  "Traduza o título (campo \"titulo\") e escreva o resumo já em português — a pessoa não deve precisar abrir a " +
  "fonte original pra entender do que se trata. Mantenha o campo \"fonte\" e o \"link\" exatamente como vieram na lista.";

export const AGENTES: Record<string, Agente> = {
  marketing: {
    nome: "Marketing Digital",
    pergunta: "O que está acontecendo no marketing que eu posso transformar em conteúdo?",
    feeds: [
      { url: "https://www.marketingdive.com/feeds/news/", fonte: "Marketing Dive" },
      { url: "https://www.socialmediatoday.com/rss.xml", fonte: "Social Media Today" },
      { url: "https://www.meioemensagem.com.br/feed", fonte: "Meio & Mensagem" },
      { url: "https://www.propmark.com.br/feed/", fonte: "Propmark" },
    ],
    instrucao:
      "Você é uma analista de marketing digital que ajuda uma criadora de conteúdo. " +
      "Olhe as notícias abaixo e escolha só as 2 notícias mais relevantes e ACIONÁVEIS pra virar conteúdo sobre marketing. " +
      "Para cada uma, escreva um roteiro breve de Reels (gancho de 1 frase, desenvolvimento em 2-3 frases explicando a notícia de um jeito simples, e um CTA) no campo \"insight\". " +
      REGRA_IDIOMA,
  },
  conteudo: {
    nome: "Criação de Conteúdo",
    pergunta: "O que está mudando na maneira como as pessoas consomem e produzem conteúdo?",
    feeds: [
      { url: "https://contentmarketinginstitute.com/feed/", fonte: "Content Marketing Institute" },
      { url: "https://www.socialmediaexaminer.com/feed/", fonte: "Social Media Examiner" },
      { url: "https://later.com/blog/feed/", fonte: "Later Blog" },
      { url: "https://rockcontent.com/br/blog/feed/", fonte: "Rock Content" },
    ],
    instrucao:
      "Você é uma estrategista de conteúdo. Olhe as notícias abaixo e escolha só as 2 notícias mais relevantes sobre " +
      "mudanças em como as pessoas consomem ou produzem conteúdo (novos formatos, algoritmos, comportamento de audiência). " +
      "Para cada uma, escreva um roteiro breve de Reels (gancho, desenvolvimento, CTA) no campo \"insight\". " +
      REGRA_IDIOMA,
  },
  creator: {
    nome: "UGC e Creator Economy",
    pergunta:
      "O que está acontecendo no mercado de creators que eu deveria saber e que pode virar conteúdo ou me ajudar profissionalmente?",
    feeds: [
      { url: "https://techcrunch.com/tag/creator-economy/feed/", fonte: "TechCrunch" },
      { url: "https://influencermarketinghub.com/feed/", fonte: "Influencer Marketing Hub" },
      { url: "https://www.b9.com.br/feed/", fonte: "B9" },
    ],
    instrucao:
      "Você acompanha o mercado de UGC e Creator Economy. Olhe as notícias abaixo e escolha só as 2 notícias mais relevantes " +
      "pra uma criadora de conteúdo/UGC entender o mercado ou virar conteúdo. " +
      "Para cada uma, escreva um roteiro breve de Reels (gancho, desenvolvimento, CTA) no campo \"insight\". " +
      REGRA_IDIOMA,
  },
  ia: {
    nome: "IA e Tecnologia",
    pergunta:
      "Novidades, oportunidades, lançamentos, ferramentas e IA aplicada a negócios e criação de conteúdo — com destaque pra Anthropic/Claude.",
    feeds: [
      { url: "https://techcrunch.com/tag/artificial-intelligence/feed/", fonte: "TechCrunch AI" },
      { url: "https://venturebeat.com/category/ai/feed/", fonte: "VentureBeat AI" },
      { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", fonte: "MIT Technology Review" },
      { url: "https://canaltech.com.br/rss/", fonte: "Canaltech" },
      { url: "https://olhardigital.com.br/feed/", fonte: "Olhar Digital" },
    ],
    instrucao:
      "Você acompanha IA e tecnologia aplicadas a negócios e criação de conteúdo, com atenção especial a qualquer " +
      "notícia sobre a Anthropic ou o Claude (dê prioridade máxima a essas). Olhe as notícias abaixo e escolha só " +
      "as 2 notícias mais relevantes — não precisa ser só pra vídeo, priorize o que é útil como informação e como ideia de " +
      "conteúdo ou de oferta de produto digital pra quem usa IA pra criar e vender. " +
      "Para cada uma, escreva no campo \"insight\": um resumo prático da novidade e uma ideia de como isso pode virar " +
      "conteúdo ou uma oferta. " +
      REGRA_IDIOMA,
  },
};

function extrairTag(bloco: string, tag: string): string | null {
  const regexCdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const regexSimples = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const matchCdata = bloco.match(regexCdata);
  if (matchCdata) return matchCdata[1].trim();
  const match = bloco.match(regexSimples);
  return match ? match[1].trim() : null;
}

function limparHtml(texto: string): string {
  return texto
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// Busca um feed RSS ou Atom e devolve os itens já limpos. Nunca lança
// exceção — se o feed falhar, devolve lista vazia (um feed fora do ar não
// deve derrubar a busca dos outros).
export async function buscarFeed(url: string, nomeFonte: string): Promise<ItemRss[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarDeNoticias/1.0)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const blocos = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

    return blocos
      .map((bloco) => {
        const titulo = limparHtml(extrairTag(bloco, "title") || "");
        let link = extrairTag(bloco, "link") || "";
        if (!link || link.includes("<")) {
          const hrefMatch = bloco.match(/<link[^>]*href="([^"]+)"/i);
          if (hrefMatch) link = hrefMatch[1];
        }
        const dataPublicacao = extrairTag(bloco, "pubDate") || extrairTag(bloco, "published") || extrairTag(bloco, "updated");
        const resumoBruto = extrairTag(bloco, "description") || extrairTag(bloco, "summary") || extrairTag(bloco, "content") || "";
        const resumo = limparHtml(resumoBruto).slice(0, 500);
        return { titulo, link: link.trim(), dataPublicacao, resumo, fonte: nomeFonte };
      })
      .filter((item) => item.titulo && item.link);
  } catch (e) {
    console.error(`Erro ao buscar feed ${nomeFonte} (${url}):`, e);
    return [];
  }
}

// Manda a lista de notícias cruas pro Gemini escolher as mais relevantes e
// escrever o roteiro/insight de cada uma. Usa saída em JSON estruturado
// (responseSchema) pra não depender de parsear texto livre.
export async function selecionarNoticiasComGemini(instrucao: string, itens: ItemRss[]): Promise<NoticiaSelecionada[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Variável de ambiente ausente: GEMINI_API_KEY");
  const modelo = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

  const listaTexto = itens
    .slice(0, 60) // limite de segurança pra não estourar o prompt em dias com muito feed
    .map((item, i) => `${i + 1}. [${item.fonte}] ${item.titulo}\n${item.resumo}\nLink: ${item.link}\nData: ${item.dataPublicacao || "desconhecida"}`)
    .join("\n\n");

  const prompt = `${instrucao}\n\nNotícias disponíveis:\n\n${listaTexto}\n\nResponda só com as notícias escolhidas, preenchendo todos os campos pedidos. Use o link e a fonte exatamente como aparecem na lista.`;

  const schema = {
    type: "OBJECT",
    properties: {
      noticias: {
        type: "ARRAY",
        maxItems: 2,
        items: {
          type: "OBJECT",
          properties: {
            titulo: { type: "STRING", description: "Título da notícia traduzido para português do Brasil, mesmo que a fonte original esteja em inglês." },
            fonte: { type: "STRING" },
            link: { type: "STRING" },
            data_publicacao: { type: "STRING" },
            resumo: { type: "STRING" },
            insight: { type: "STRING" },
          },
          required: ["titulo", "fonte", "link", "resumo", "insight"],
        },
      },
    },
    required: ["noticias"],
  };

  // O modelo grátis do Gemini às vezes fica sobrecarregado (503) em horário
  // de pico — tenta de novo algumas vezes antes de desistir.
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

  const textoResposta = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textoResposta) throw new Error("Gemini não retornou conteúdo utilizável.");

  const json = JSON.parse(textoResposta);
  return (json.noticias || []) as NoticiaSelecionada[];
}
