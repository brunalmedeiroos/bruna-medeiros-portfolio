/* =====================================================================
   DADOS DO PROJETO — brunamedeiros.com/meuquarto
   Fonte única de verdade usada pelo tour 3D, pela seção de oportunidades
   e pela seção "o que estou procurando". Editar aqui reflete no site
   inteiro — não precisa mexer no HTML pra atualizar status de um item,
   trocar uma categoria ou ajustar o cronograma.
===================================================================== */

const QUARTO_DATA = {

  /* ---------------------------------------------------------------
     PAREDES / ESPAÇOS DO QUARTO
     A ordem abaixo segue a disposição real do ambiente (uma parede
     leva à outra, em sequência, fechando o quarto).
  --------------------------------------------------------------- */
  paredes: [
    {
      id: "cama",
      numero: "01",
      nome: "Parede Cama",
      imagem: "img/projeto/parede-cama.jpg",
      resumo: "O coração do quarto: cama de casal, cabeceira ripada em madeira, mesas de cabeceira e prateleira contínua com iluminação embutida.",
      detalhes: "Painel ripado em madeira do chão até a prateleira, faixa de LED embutida, mesas de cabeceira com luminárias, e a parede listrada azul e branco que dá o tom pro quarto inteiro.",
      categorias: ["roupa-de-cama", "iluminacao", "decoracao", "moveis"]
    },
    {
      id: "janela",
      numero: "02",
      nome: "Parede Janela",
      imagem: "img/projeto/parede-janela.jpg",
      resumo: "Cantinho de descanso: poltrona amarela, puff, luminária de piso e a janela com persiana, ao lado do ar-condicionado.",
      detalhes: "Um respiro de luz natural entre a cama e o home office, com poltrona de leitura, puff e persiana romana pra controlar a luz durante as gravações.",
      categorias: ["moveis", "iluminacao", "tecnologia", "organizacao"]
    },
    {
      id: "tv",
      numero: "03",
      nome: "Parede TV",
      imagem: "img/projeto/parede-tv.jpg",
      resumo: "Meu estúdio dentro do quarto: TV, home office em L, cadeira ergonômica e prateleiras com decoração.",
      detalhes: "Painel ripado, TV com soundbar, bancada de trabalho que vira setup de gravação, cadeira confortável pra rotina de criação de conteúdo e prateleiras pra deixar tudo organizado à vista.",
      categorias: ["tecnologia", "eletronicos", "home-office", "moveis"]
    },
    {
      id: "penteadeira",
      numero: "04",
      nome: "Parede Penteadeira",
      imagem: "img/projeto/parede-penteadeira.jpg",
      resumo: "Espaço de beleza e rotina: penteadeira com espelho iluminado, gaveteiro, puff e quadros decorativos ao lado do closet.",
      detalhes: "Espelho com luzes tipo camarim pra maquiagem e gravações de GRWM, gaveteiro pra organização de produtos de beleza, e um mural de quadros que fecha a parede ao lado do closet.",
      categorias: ["beleza", "organizacao", "decoracao", "iluminacao"]
    }
  ],

  /* ---------------------------------------------------------------
     CATEGORIAS DE OPORTUNIDADE PARA MARCAS
  --------------------------------------------------------------- */
  categorias: [
    { id: "moveis",       nome: "Móveis",        icone: "sofa" },
    { id: "decoracao",    nome: "Decoração",     icone: "frame" },
    { id: "iluminacao",   nome: "Iluminação",    icone: "bulb" },
    { id: "organizacao",  nome: "Organização",   icone: "box" },
    { id: "roupa-de-cama",nome: "Roupa de cama", icone: "bed" },
    { id: "tecnologia",   nome: "Tecnologia",    icone: "wifi" },
    { id: "eletronicos",  nome: "Eletrônicos",   icone: "tv" },
    { id: "home-office",  nome: "Home office",   icone: "desk" },
    { id: "beleza",       nome: "Beleza",        icone: "mirror" },
    { id: "aromatizacao", nome: "Aromatização",  icone: "spray" },
    { id: "plantas",      nome: "Plantas & paisagismo", icone: "plant" },
    { id: "tintas",       nome: "Tintas & acabamento", icone: "roller" }
  ],

  /* ---------------------------------------------------------------
     O QUE ESTOU PROCURANDO
     status: "procurando" (aberto) | "conversando" (em negociação) | "fechado"
     Editar esse status conforme as parcerias forem fechando.
  --------------------------------------------------------------- */
  procurando: [
    { item: "Escrivaninha em L",  categoria: "home-office",   parede: "tv",         status: "procurando" },
    { item: "Roupas de cama",     categoria: "roupa-de-cama", parede: "cama",       status: "procurando" },
    { item: "Fita de LED / iluminação", categoria: "iluminacao", parede: null, paredeLabel: "todo o quarto", status: "procurando" },
    { item: "Poltrona",           categoria: "moveis",        parede: "janela",     status: "procurando" },
    { item: "Mesa de cabeceira",  categoria: "moveis",        parede: "cama",       status: "procurando" },
    { item: "Cadeira de escritório", categoria: "home-office", parede: "tv",        status: "procurando" },
    { item: "Espelho com luz de camarim", categoria: "beleza", parede: "penteadeira", status: "procurando" },
    { item: "Tapete",             categoria: "decoracao",     parede: null, paredeLabel: "todo o quarto", status: "procurando" }
  ],

  /* ---------------------------------------------------------------
     PLANOS DE PARCERIA
  --------------------------------------------------------------- */
  planos: [
    {
      numero: "01",
      nome: "Produto",
      subtitulo: "A porta de entrada pra fazer parte da reforma",
      paraQuem: "Marcas que querem participar com um produto específico que faça sentido pro quarto.",
      exemplos: ["Luminária", "Cadeira", "Espelho", "Roupa de cama", "Decoração", "Organização", "Eletrônico", "Acessório"],
      inclui: [
        "Produto integrado ao projeto",
        "1 conteúdo relacionado ao produto",
        "Fotos do produto no ambiente",
        "Presença do produto nos conteúdos da reforma",
        "Menção da marca no projeto"
      ],
      nota: "O conteúdo pode ser produzido para o meu perfil e/ou para a marca, de acordo com a negociação.",
      cta: "Quero esse formato"
    },
    {
      numero: "02",
      nome: "Ambiente",
      subtitulo: "Fazer parte da construção de um espaço inteiro do quarto",
      paraQuem: "Marcas que querem participar de uma área específica — não só de um produto isolado.",
      exemplos: ["Home office", "Penteadeira", "Cama", "Iluminação", "Organização", "Decoração"],
      inclui: [
        "Produtos necessários para aquele ambiente",
        "2 a 3 conteúdos relacionados à transformação",
        "Fotos do ambiente finalizado",
        "Conteúdo mostrando a transformação",
        "Presença durante diferentes etapas da reforma",
        "Conteúdo no meu perfil",
        "Possibilidade de conteúdos produzidos para a marca",
        "Destaque da marca dentro do projeto"
      ],
      narrativa: ["Escolha", "Recebimento", "Montagem", "Transformação", "Resultado final", "Uso no dia a dia"],
      nota: "A marca se torna parte de uma história específica dentro da reforma.",
      cta: "Quero esse formato"
    },
    {
      numero: "03",
      nome: "Projeto",
      subtitulo: "O nível mais completo de participação na reforma",
      paraQuem: "Marcas que querem se tornar uma das principais parceiras da reforma, acompanhando diferentes momentos da transformação.",
      exemplos: ["Participação em várias etapas", "Presença no antes, durante e depois", "Presença no tour 3D"],
      inclui: [
        "Participação em uma parte relevante da reforma",
        "Conteúdos durante diferentes etapas",
        "Série de conteúdos",
        "Conteúdos produzidos para a marca",
        "Conteúdos publicados no meu perfil",
        "Fotos dos produtos no ambiente",
        "Presença no projeto 3D",
        "Destaque especial dentro do projeto",
        "Presença no antes, durante e depois",
        "Possibilidade de exclusividade dentro da categoria",
        "Conteúdos mostrando os produtos no uso real depois da reforma"
      ],
      narrativa: ["Antes", "Planejamento", "Escolha", "Recebimento", "Montagem", "Transformação", "Revelação", "Vida real"],
      nota: "Sem ranking entre os planos — esse é só o nível de participação mais completo.",
      cta: "Quero esse formato"
    }
  ],

  /* Comparativo visual entre os planos (não é tabela de preço) */
  comparativo: {
    colunas: ["Produto", "Ambiente", "Projeto"],
    linhas: [
      { label: "Produto integrado ao projeto",   valores: [true, true, true] },
      { label: "Conteúdo",                        valores: [true, true, true] },
      { label: "Fotos",                           valores: [true, true, true] },
      { label: "Conteúdo no meu perfil",          valores: [true, true, true] },
      { label: "Transformação do espaço",         valores: [false, true, true] },
      { label: "Antes / durante / depois",        valores: [false, true, true] },
      { label: "Série de conteúdos",              valores: [false, true, true] },
      { label: "Tour 3D",                         valores: ["parcial", true, true] },
      { label: "Destaque no projeto",             valores: [false, true, true] },
      { label: "Exclusividade",                   valores: [false, false, "opcional"] },
      { label: "Proposta personalizada",          valores: [true, true, true] }
    ],
    nota: "* A presença no tour 3D depende de como o produto estiver integrado ao projeto."
  },

  /* ---------------------------------------------------------------
     TIPOS DE CONTEÚDO DA REFORMA
  --------------------------------------------------------------- */
  momentosConteudo: [
    "Antes e depois", "Chegada do produto", "Montagem", "Organização",
    "Decoração", "Transformação do ambiente", "Resultado final",
    "Rotina utilizando o produto depois da reforma"
  ],

  ondeUsar: [
    "Instagram", "TikTok", "Stories", "Anúncios",
    "Site da marca", "Página de produto", "Redes sociais da marca"
  ],

  /* ---------------------------------------------------------------
     CRONOGRAMA — editar as datas conforme a reforma andar
  --------------------------------------------------------------- */
  cronograma: [
    { periodo: "[DATA/PERÍODO]", etapa: "Planejamento", descricao: "Definição do projeto, referências e parcerias em conversa." },
    { periodo: "[DATA/PERÍODO]", etapa: "Início da reforma", descricao: "Pintura, preparação das paredes e primeiras mudanças estruturais." },
    { periodo: "[DATA/PERÍODO]", etapa: "Recebimento dos produtos", descricao: "Chegada dos móveis, decoração e produtos parceiros." },
    { periodo: "[DATA/PERÍODO]", etapa: "Montagem e decoração", descricao: "Montagem dos móveis, organização dos ambientes e finalização visual." },
    { periodo: "[DATA/PERÍODO]", etapa: "Resultado final", descricao: "Quarto pronto, tour 3D atualizado e conteúdos de revelação." }
  ],

  /* ---------------------------------------------------------------
     FAQ
  --------------------------------------------------------------- */
  faq: [
    {
      pergunta: "Como funciona a parceria?",
      resposta: "A marca escolhe um dos três formatos de participação (Produto, Ambiente ou Projeto) de acordo com o quanto quer fazer parte da reforma. A partir disso, montamos juntas os detalhes: quais produtos entram, em qual espaço do quarto e quais conteúdos fazem sentido."
    },
    {
      pergunta: "Posso participar com apenas um produto?",
      resposta: "Sim! Esse é o Plano 01 — Produto. A marca entra com um item específico (uma luminária, uma roupa de cama, um espelho, por exemplo) e ele é integrado naturalmente ao projeto e à história da reforma."
    },
    {
      pergunta: "Como o produto será apresentado?",
      resposta: "De forma natural, dentro do contexto real do quarto — nas fotos do ambiente, nos conteúdos de transformação e, dependendo do plano, também no tour 3D do projeto."
    },
    {
      pergunta: "Quais conteúdos podem ser produzidos?",
      resposta: "Depende do plano e da negociação: pode incluir conteúdo para o meu perfil (TikTok, Reels, Stories), conteúdo produzido especificamente para a marca (UGC, vídeos de produto, fotos) e presença visual no próprio projeto (fotos do ambiente, antes e depois, tour 3D)."
    },
    {
      pergunta: "Posso solicitar uma proposta personalizada?",
      resposta: "Sim. Os três planos servem como estrutura inicial pra entender as possibilidades — mas toda parceria pode ser ajustada de acordo com o produto, o orçamento e os objetivos da marca."
    },
    {
      pergunta: "Como funcionam os direitos de uso?",
      resposta: "Os direitos de uso e as condições específicas de cada conteúdo são definidos individualmente em cada parceria, de acordo com onde e por quanto tempo o conteúdo será utilizado."
    },
    {
      pergunta: "Qual é o prazo para produção?",
      resposta: "Os prazos variam de acordo com o cronograma da reforma e com o formato de parceria escolhido. Isso é combinado na proposta comercial, junto com as etapas em que a marca vai aparecer."
    }
  ],

  /* ---------------------------------------------------------------
     FOTOS DO ANTES
     Pasta: img/antes/
     Pra adicionar uma foto real do quarto hoje:
     1) Coloque o arquivo dentro de meuquarto/img/antes/
     2) Adicione um objeto aqui embaixo com o nome do arquivo
     Enquanto essa lista estiver vazia, o site mostra um aviso de
     "fotos em breve" no lugar da galeria.
  --------------------------------------------------------------- */
  antesFotos: [
    // { arquivo: "quarto-antes-01.jpg", legenda: "Parede da cama, como está hoje" },
  ]
};
