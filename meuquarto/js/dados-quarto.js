/* =====================================================================
   DADOS DO PROJETO / brunamedeiros.com/meuquarto
   Fonte única de verdade usada pelo tour 3D, pela galeria de paredes
   e pelo mapa de oportunidades. Editar aqui reflete no site inteiro,
   sem precisar mexer no HTML.
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
      categorias: ["conforto", "decoracao", "moveis"]
    },
    {
      id: "janela",
      numero: "02",
      nome: "Parede Janela",
      imagem: "img/projeto/parede-janela.jpg",
      resumo: "Cantinho de descanso: poltrona, puff e luminária de piso, ao lado da janela que ilumina o quarto durante as gravações.",
      categorias: ["conforto", "moveis"]
    },
    {
      id: "tv",
      numero: "03",
      nome: "Parede TV",
      imagem: "img/projeto/parede-tv.jpg",
      resumo: "Meu estúdio dentro do quarto: TV, home office em L, cadeira ergonômica e prateleiras com decoração.",
      categorias: ["eletronicos", "moveis", "tecnologia"]
    },
    {
      id: "penteadeira",
      numero: "04",
      nome: "Parede Penteadeira",
      imagem: "img/projeto/parede-penteadeira.jpg",
      resumo: "Espaço de beleza e rotina: penteadeira com espelho iluminado, gaveteiro e quadros decorativos ao lado do closet.",
      categorias: ["decoracao", "moveis"]
    }
  ],

  /* ---------------------------------------------------------------
     PLANTA BAIXA E MEDIDAS REAIS
     Não exibidas como seção no site, mas usadas para dimensionar
     o tour 3D. Fonte: medição pessoal. Não inventar portas, nichos,
     móveis ou medidas além destas.
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
     MAPA DE OPORTUNIDADES
     Cada categoria já traz os itens específicos que estou
     procurando ali dentro (mostrados ao passar o mouse ou tocar
     no card). Editar os itens aqui atualiza o card automaticamente.
  --------------------------------------------------------------- */
  oportunidades: [
    { id: "moveis",       nome: "Móveis",       icone: "sofa",  itens: ["Escrivaninha em L", "Mesa de cabeceira"] },
    { id: "decoracao",    nome: "Decoração",    icone: "frame", itens: ["Quadros", "Vasos de planta"] },
    { id: "conforto",     nome: "Conforto",     icone: "bed",   itens: ["Roupa de cama", "Poltrona", "Tapete"] },
    { id: "reforma",      nome: "Reforma",      icone: "roller",itens: ["Tinta", "Ferramentas"] },
    { id: "eletronicos",  nome: "Eletrônicos",  icone: "tv",    itens: ["Televisão"] },
    { id: "aromatizacao", nome: "Aromatização", icone: "spray", itens: ["Vela aromática", "Aromatizadores de ambiente"] },
    { id: "tecnologia",   nome: "Tecnologia",   icone: "wifi",  itens: ["Interruptor inteligente", "Alexa"] }
  ],

  /* ---------------------------------------------------------------
     PLANOS DE PARCERIA
  --------------------------------------------------------------- */
  planos: [
    {
      numero: "01",
      nome: "Produto",
      tag: "Item a item",
      paragrafo: "A marca entra com um produto específico, que é integrado naturalmente ao quarto e à história da reforma.",
      inclui: [
        "Produto integrado ao projeto",
        "1 conteúdo relacionado ao produto",
        "Fotos do produto no ambiente",
        "Menção da marca no projeto"
      ],
      cta: "Quero esse formato"
    },
    {
      numero: "02",
      nome: "Ambiente",
      tag: "Um espaço inteiro",
      paragrafo: "A marca participa da construção de uma área específica do quarto, como a penteadeira ou o home office.",
      inclui: [
        "Produtos necessários para aquele ambiente",
        "Conteúdos da transformação",
        "Fotos do ambiente finalizado",
        "Destaque da marca dentro do projeto"
      ],
      cta: "Quero esse formato"
    },
    {
      numero: "03",
      nome: "Projeto",
      tag: "Ao longo de toda a reforma",
      paragrafo: "A marca se torna uma das principais parceiras da reforma, presente em diferentes momentos da transformação.",
      inclui: [
        "Participação em uma parte relevante da reforma",
        "Conteúdos durante diferentes etapas",
        "Presença no projeto 3D",
        "Possibilidade de exclusividade na categoria"
      ],
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
