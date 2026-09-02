// ==========================================================================
// supabase/functions/_shared/radar.ts
// ==========================================================================
// Funções compartilhadas pela Edge Function radar-atualizar. Busca notícias
// de feeds RSS gratuitos (sem custo, sem chave de API) e usa o Gemini
// (também gratuito, dentro da cota grátis do Google AI Studio) pra escolher
// as mais relevantes pro perfil da Bruna e explicar cada uma.

export interface ItemRss {
  titulo: string;
  link: string;
  dataPublicacao: string | null;
  resumo: string;
  fonte: string;
}

export interface NoticiaSelecionada {
  titulo: string;
  categoria: string;
  fonte: string;
  link: string;
  data_publicacao: string | null;
  resumo: string;
  relevancia: string;
  adaptacao: string;
  pilar_sugerido: string;
}

// Todos os feeds do radar, num pool só — antes eram 4 grupos (um por
// "agente"), cada um só alimentando a busca daquele tema. Agora a
// curadoria não depende mais de qual feed a notícia veio: é o Gemini que
// decide relevância olhando pro perfil da Bruna, não pro tema do feed.
export const FEEDS: Array<{ url: string; fonte: string }> = [
  // Marketing
  { url: "https://www.marketingdive.com/feeds/news/", fonte: "Marketing Dive" },
  { url: "https://www.socialmediatoday.com/rss.xml", fonte: "Social Media Today" },
  { url: "https://www.meioemensagem.com.br/feed", fonte: "Meio & Mensagem" },
  { url: "https://www.propmark.com.br/feed/", fonte: "Propmark" },
  // Criação de conteúdo
  { url: "https://contentmarketinginstitute.com/feed/", fonte: "Content Marketing Institute" },
  { url: "https://www.socialmediaexaminer.com/feed/", fonte: "Social Media Examiner" },
  { url: "https://later.com/blog/feed/", fonte: "Later Blog" },
  { url: "https://rockcontent.com/br/blog/feed/", fonte: "Rock Content" },
  // UGC e creator economy
  { url: "https://techcrunch.com/tag/creator-economy/feed/", fonte: "TechCrunch" },
  { url: "https://influencermarketinghub.com/feed/", fonte: "Influencer Marketing Hub" },
  { url: "https://www.b9.com.br/feed/", fonte: "B9" },
  // IA e tecnologia
  { url: "https://techcrunch.com/tag/artificial-intelligence/feed/", fonte: "TechCrunch AI" },
  { url: "https://venturebeat.com/category/ai/feed/", fonte: "VentureBeat AI" },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", fonte: "MIT Technology Review" },
  { url: "https://canaltech.com.br/rss/", fonte: "Canaltech" },
  { url: "https://olhardigital.com.br/feed/", fonte: "Olhar Digital" },
];

// Máximo de achados por rodada — poucos e muito relevantes, não muitos e
// genéricos (pedido explícito da Bruna).
const MAX_ITENS = 6;

// A instrução fala sobre QUEM é a Bruna (não sobre o tema) — é isso que
// faz o radar filtrar por relevância real pro perfil dela, e não só por
// assunto. Condensado do manual de operação dela (Skill bruna-creator).
// Recebe os nomes dos pilares atuais do Banco de Ideias (Planejador) pra
// já sugerir, por achado, qual pilar existente faz mais sentido — assim
// "Usar ideia" já chega com uma sugestão pronta.
function construirInstrucao(nomesPilares: string[]): string {
  const instrucaoPilar = nomesPilares.length > 0
    ? `Se algum destes pilares de conteúdo (do Banco de Ideias dela) fizer sentido pra um achado, preencha ` +
      `"pilar_sugerido" com o nome EXATO de um deles — copie a grafia igualzinha, sem traduzir nem ajustar. ` +
      `Se nenhum encaixar bem, deixe "pilar_sugerido" em branco. Pilares existentes: ${nomesPilares.join(", ")}.\n\n`
    : "Deixe o campo \"pilar_sugerido\" sempre em branco (ela ainda não tem nenhum pilar cadastrado).\n\n";

  return (
    "Você é a assistente de estratégia de conteúdo de Bruna, uma creator de 20 anos, de Fortaleza (CE). " +
    "Ela não é \"UGC Creator\" — é creator completa: criação de conteúdo, estratégia, posicionamento, construção de " +
    "autoridade digital. Nichos atuais do portfólio: Tecnologia, Beleza, Entretenimento, Experiências. Também fala " +
    "sobre bastidores de criação, marketing/estratégia de conteúdo e IA aplicada à criação e venda de conteúdo. " +
    "Publica no TikTok, Instagram e YouTube Shorts. Tom: natural, estratégico, jovem, direto, humano — sem linguagem " +
    "corporativa, sem clichê, sem postura de guru. Conteúdo dela nunca é genérico: sempre tem ângulo específico, " +
    "opinião real ou observação prática.\n\n" +
    "Olhe a lista de notícias abaixo (marketing, redes sociais, plataformas, criação de conteúdo, creator economy, " +
    "IA) e escolha só as mais relevantes e ACIONÁVEIS pra ela — coisas que ela pode genuinamente transformar em " +
    "conteúdo, usar pra se posicionar como especialista, ou que mudam algo relevante pro trabalho dela com marcas ou " +
    "pro crescimento como creator. Dê atenção especial a novidades sobre Anthropic/Claude (ela usa no dia a dia). " +
    "Ignore notícia genérica, puramente corporativa, ou sem nenhum ângulo claro de conteúdo pra esse perfil.\n\n" +
    `Escolha até ${MAX_ITENS} notícias, as MELHORES — prefira poucas e muito relevantes a muitas e genéricas.\n\n` +
    "Pra cada notícia escolhida, preencha: " +
    "\"titulo\" (traduzido pro português do Brasil, mesmo que a fonte original esteja em inglês), " +
    "\"categoria\" (uma palavra ou expressão curta pro tema, ex: \"Marketing\", \"IA\", \"Creator Economy\", " +
    "\"Redes Sociais\", \"Criação de Conteúdo\"), " +
    "\"resumo\" — O QUE ESTÁ ACONTECENDO (2-3 frases explicando a notícia de um jeito simples e direto, sem " +
    "precisar abrir a fonte original), " +
    "\"relevancia\" — POR QUE É RELEVANTE PRA ELA (1-2 frases específicas pro perfil dela — não uma explicação " +
    "genérica, algo concreto sobre o trabalho ou posicionamento dela), " +
    "\"adaptacao\" — COMO TRANSFORMAR EM CONTEÚDO (uma ideia prática e específica: pode ser um gancho de vídeo, um " +
    "ângulo de conteúdo, uma forma de se posicionar sobre o assunto, ou uma oportunidade de oferta/produto digital). " +
    instrucaoPilar +
    "IMPORTANTE: responda sempre em português do Brasil, mesmo que a notícia original esteja em inglês. Mantenha o " +
    "campo \"fonte\" e o \"link\" exatamente como vieram na lista."
  );
}

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

// Manda a lista de notícias cruas pro Gemini escolher as mais relevantes
// pro perfil da Bruna e escrever o resumo/relevância/adaptação de cada
// uma. Usa saída em JSON estruturado (responseSchema) pra não depender de
// parsear texto livre.
export async function selecionarNoticiasComGemini(itens: ItemRss[], nomesPilares: string[]): Promise<NoticiaSelecionada[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Variável de ambiente ausente: GEMINI_API_KEY");
  const modelo = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

  const listaTexto = itens
    .slice(0, 150) // limite de segurança pra não estourar o prompt — pool único agora, então maior que antes (60 por agente)
    .map((item, i) => `${i + 1}. [${item.fonte}] ${item.titulo}\n${item.resumo}\nLink: ${item.link}\nData: ${item.dataPublicacao || "desconhecida"}`)
    .join("\n\n");

  const prompt = `${construirInstrucao(nomesPilares)}\n\nNotícias disponíveis:\n\n${listaTexto}\n\nResponda só com as notícias escolhidas, preenchendo todos os campos pedidos. Use o link e a fonte exatamente como aparecem na lista.`;

  const schema = {
    type: "OBJECT",
    properties: {
      noticias: {
        type: "ARRAY",
        maxItems: MAX_ITENS,
        items: {
          type: "OBJECT",
          properties: {
            titulo: { type: "STRING", description: "Título da notícia traduzido para português do Brasil, mesmo que a fonte original esteja em inglês." },
            categoria: { type: "STRING", description: "Uma palavra ou expressão curta pro tema da notícia." },
            fonte: { type: "STRING" },
            link: { type: "STRING" },
            data_publicacao: { type: "STRING" },
            resumo: { type: "STRING", description: "O que está acontecendo." },
            relevancia: { type: "STRING", description: "Por que é relevante especificamente pro perfil da Bruna." },
            adaptacao: { type: "STRING", description: "Ideia prática de como transformar isso em conteúdo." },
            pilar_sugerido: { type: "STRING", description: "Nome exato de um pilar existente do Banco de Ideias que combina com este achado, ou string vazia se nenhum combinar." },
          },
          required: ["titulo", "categoria", "fonte", "link", "resumo", "relevancia", "adaptacao"],
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
