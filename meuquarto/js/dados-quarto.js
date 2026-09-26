/* =====================================================================
   DADOS DO PROJETO / brunamedeiros.com/meuquarto
   Fonte única de verdade usada pelo tour 3D, pela galeria de paredes,
   pela seção de oportunidades e pela seção "o que estou procurando".
   Editar aqui reflete no site inteiro, sem precisar mexer no HTML.
===================================================================== */

const QUARTO_DATA = {

  /* ---------------------------------------------------------------
     PAREDES / ESPAÇOS DO QUARTO (galeria em carrossel)
     A ordem segue a disposição real do ambiente.
  --------------------------------------------------------------- */
  paredes: [
    {
      id: "cama",
      numero: "01",
      nome: "Parede Cama",
      imagem: "img/projeto/parede-cama.jpg",
      resumo: "O coração do quarto: cama de casal, cabeceira ripada em madeira, mesas de cabeceira e prateleira contínua com iluminação embutida.",
      categorias: ["roupa-de-cama", "iluminacao", "decoracao", "moveis"]
    },
    {
      id: "janela",
      numero: "02",
      nome: "Parede Janela",
      imagem: "img/projeto/parede-janela.jpg",
      resumo: "Cantinho de descanso: poltrona, puff e luminária de piso, ao lado da janela que ilumina o quarto durante as gravações.",
      categorias: ["moveis", "iluminacao", "tecnologia", "organizacao"]
    },
    {
      id: "tv",
      numero: "03",
      nome: "Parede TV",
      imagem: "img/projeto/parede-tv.jpg",
      resumo: "Meu estúdio dentro do quarto: TV, home office em L, cadeira ergonômica e prateleiras com decoração.",
      categorias: ["tecnologia", "eletronicos", "home-office", "moveis"]
    },
    {
      id: "penteadeira",
      numero: "04",
      nome: "Parede Penteadeira",
      imagem: "img/projeto/parede-penteadeira.jpg",
      resumo: "Espaço de beleza e rotina: penteadeira com espelho iluminado, gaveteiro e quadros decorativos ao lado do closet.",
      categorias: ["beleza", "organizacao", "decoracao", "iluminacao"]
    }
  ],

  /* ---------------------------------------------------------------
     PLANTA BAIXA E MEDIDAS REAIS
     Fonte: medição pessoal. Prevalecem sobre a planta de referência.
     Não inventar portas, nichos, móveis ou medidas além destas.
  --------------------------------------------------------------- */
  planta: {
    imagem: "img/projeto/planta-baixa.webp",
    pedDireito: 2.70,
    paredes: [
      { id: "penteadeira", nome: "Parede da Penteadeira", largura: 3.00, altura: 2.70, area: 8.10, acabamento: "Cerâmica" },
      { id: "tv",          nome: "Parede da TV",          largura: 3.31, altura: 2.70, area: 8.94, acabamento: "Cerâmica" },
      { id: "janela",      nome: "Parede da Janela",      largura: 2.94, altura: 2.70, area: 7.94, acabamento: "Pintura" },
      { id: "cama",        nome: "Parede da Cama",        largura: 4.29, altura: 2.70, area: 11.58, acabamento: "Pintura" }
    ],
    totais: [
      { acabamento: "Cerâmica", area: 17.04, referenciaCompra: 20 },
      { acabamento: "Pintura",  area: 19.52, referenciaCompra: 23 }
    ]
  },

  /* ---------------------------------------------------------------
     CATEGORIAS DE OPORTUNIDADE PARA MARCAS
     principal: true = aparece nos 6 itens iniciais do mapa
  --------------------------------------------------------------- */
  categorias: [
    { id: "moveis",       nome: "Móveis",        icone: "sofa",   principal: true },
    { id: "iluminacao",   nome: "Iluminação",    icone: "bulb",   principal: true },
    { id: "roupa-de-cama",nome: "Roupa de cama", icone: "bed",    principal: true },
    { id: "home-office",  nome: "Home office",   icone: "desk",   principal: true },
    { id: "beleza",       nome: "Beleza",        icone: "mirror", principal: true },
    { id: "decoracao",    nome: "Decoração",     icone: "frame",  principal: true },
    { id: "organizacao",  nome: "Organização",   icone: "box" },
    { id: "tecnologia",   nome: "Tecnologia",    icone: "wifi" },
    { id: "eletronicos",  nome: "Eletrônicos",   icone: "tv" },
    { id: "aromatizacao", nome: "Aromatização",  icone: "spray" },
    { id: "plantas",      nome: "Plantas e paisagismo", icone: "plant" },
    { id: "tintas",       nome: "Tintas e acabamento", icone: "roller" }
  ],

  /* ---------------------------------------------------------------
     O QUE ESTOU PROCURANDO
     status: "procurando" (aberto) | "conversando" (em negociação) | "fechado"
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
      paraQuem: "Para marcas que querem inserir um produto específico no quarto.",
      exemplos: ["Luminária", "Cadeira", "Espelho", "Roupa de cama", "Decoração", "Organização", "Tecnologia", "Acessórios"],
      inclui: [
        "Produto integrado ao projeto",
        "1 conteúdo relacionado ao produto",
        "Fotos do produto no ambiente",
        "Menção da marca no projeto"
      ],
      nota: "O conteúdo pode ser produzido para o meu perfil e/ou para a marca, de acordo com a negociação.",
      cta: "Quero esse formato"
    },
    {
      numero: "02",
      nome: "Ambiente",
      subtitulo: "Fazer parte da construção de um espaço inteiro do quarto",
      paraQuem: "Para marcas que querem participar de uma área específica do quarto.",
      exemplos: ["Home office", "Penteadeira", "Cama", "Iluminação", "Organização", "Decoração"],
      inclui: [
        "Produtos necessários para aquele ambiente",
        "Conteúdos relacionados à transformação",
        "Fotos do ambiente finalizado",
        "Presença durante diferentes etapas da reforma",
        "Destaque da marca dentro do projeto"
      ],
      narrativa: ["Escolha", "Recebimento", "Montagem", "Transformação", "Resultado final", "Uso no dia a dia"],
      nota: "A marca se torna parte de uma história específica dentro da reforma.",
      cta: "Quero esse formato"
    },
    {
      numero: "03",
      nome: "Projeto",
      subtitulo: "Participação em uma parte maior da transformação",
      paraQuem: "Para marcas que querem se tornar uma das principais parceiras da reforma.",
      exemplos: ["Planejamento", "Produto", "Chegada", "Montagem e instalação", "Conteúdo", "Transformação", "Resultado final"],
      inclui: [
        "Participação em uma parte relevante da reforma",
        "Conteúdos durante diferentes etapas",
        "Presença ao longo de toda a reforma",
        "Fotos dos produtos no ambiente",
        "Presença no projeto 3D",
        "Destaque especial dentro do projeto",
        "Possibilidade de exclusividade dentro da categoria"
      ],
      narrativa: ["Planejamento", "Produto", "Chegada", "Montagem", "Conteúdo", "Transformação", "Resultado final"],
      nota: "Sem hierarquia entre os planos: esse é só o nível de participação mais completo.",
      cta: "Quero esse formato"
    }
  ],

  /* ---------------------------------------------------------------
     TRÊS FRENTES DE CONTEÚDO
  --------------------------------------------------------------- */
  frentes: [
    {
      titulo: "Conteúdo para a marca",
      itens: ["UGC", "Vídeos de produto", "Fotos", "Vídeos para anúncios", "Conteúdo para site", "Outros formatos combinados"]
    },
    {
      titulo: "Conteúdo no meu perfil",
      itens: ["TikTok", "Reels", "Stories", "Vídeos da reforma", "Bastidores", "Rotina usando os produtos"]
    },
    {
      titulo: "Presença no projeto",
      itens: ["Produto dentro do quarto", "Tour 3D", "Fotos do ambiente", "Antes e depois", "Destaque dentro do projeto"]
    }
  ],

  /* ---------------------------------------------------------------
     MOMENTOS DE CONTEÚDO DA REFORMA
  --------------------------------------------------------------- */
  momentosConteudo: [
    "Planejamento", "Chegada do produto", "Montagem", "Organização",
    "Decoração", "Transformação do ambiente", "Resultado final",
    "Rotina utilizando o produto depois da reforma"
  ],

  /* ---------------------------------------------------------------
     ETAPAS DO PROCESSO (sem datas, sem prazos)
     A única data confirmada é o início da reforma, em outubro.
  --------------------------------------------------------------- */
  etapas: [
    { nome: "Planejamento", descricao: "Definição do projeto, referências e parcerias em conversa." },
    { nome: "Reforma",      descricao: "Pintura, cerâmica e preparação estrutural das quatro paredes." },
    { nome: "Montagem",     descricao: "Chegada e montagem dos móveis, iluminação e decoração." },
    { nome: "Produção",     descricao: "Gravação dos conteúdos de cada etapa da transformação." },
    { nome: "Resultado",    descricao: "Quarto e estúdio prontos, com o tour 3D atualizado." }
  ],
  inicioReforma: "A reforma começa em outubro.",

  /* ---------------------------------------------------------------
     FAQ
  --------------------------------------------------------------- */
  faq: [
    {
      pergunta: "Posso participar com apenas um produto?",
      resposta: "Sim. Esse é o Plano 01, Produto: a marca entra com um item específico (uma luminária, uma roupa de cama, um espelho, por exemplo) e ele é integrado naturalmente ao projeto e à história da reforma."
    },
    {
      pergunta: "Como funciona o pagamento?",
      resposta: "São duas partes. A marca entra com o produto, que é enviado ou instalado aqui e vira parte da obra, e com o cachê da produção do conteúdo. O produto é o material do projeto e o conteúdo é o meu trabalho, então cada um tem o seu valor. Fecho tudo em contrato antes de começar, com volume de entregas e prazos combinados."
    },
    {
      pergunta: "Como funcionam os direitos de uso?",
      resposta: "Os direitos de uso são definidos em contrato, de acordo com o uso combinado pela marca: redes sociais, site, anúncios, mídia paga e o período de utilização, por exemplo. Não trabalho com valores ou períodos fixos: cada proposta é ajustada conforme a necessidade da marca."
    }
  ]
};
