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
      categoria: "Produto",
      nome: "Uma participação pontual.",
      paragrafo: "Sua marca entra com um produto específico que fará parte do quarto, através de uma entrega, sendo um vídeo UGC ou uma participação pontual na minha reforma. Produto e cachê de produção.",
      inclui: [
        "1 vídeo, sendo UGC para a marca ou participação em um conteúdo da reforma",
        "Produto integrado ao quarto",
        "2 fotos do produto no ambiente",
        "Sequência de 3 Stories com link para o produto"
      ],
      nota: "Ideal para marcas que querem inserir um produto no projeto e testar uma primeira parceria.",
      cta: "Quero esse formato"
    },
    {
      numero: "02",
      categoria: "Ambiente",
      nome: "Uma área inteira do quarto.",
      paragrafo: "Sua marca participa da transformação de um espaço específico, tornando-se parte da construção daquele ambiente e aparecendo ao longo desse projeto. Produto e cachê de produção.",
      inclui: [
        "Produtos necessários para o ambiente",
        "2 a 3 conteúdos dedicados ao ambiente",
        "Story da chegada dos produtos",
        "Conteúdo mostrando a transformação",
        "Presença da marca nos conteúdos relacionados ao ambiente",
        "Fotos do ambiente finalizado em alta resolução",
        "Direito de uso por 3 meses"
      ],
      cta: "Quero esse formato"
    },
    {
      numero: "03",
      categoria: "Projeto",
      nome: "Uma parceria contínua durante a reforma.",
      paragrafo: "Sua marca se torna uma das parceiras da transformação e acompanha diferentes momentos da reforma, desde a escolha até o resultado final. Produto e cachê de produção.",
      inclui: [
        "4 a 6 conteúdos dedicados",
        "Presença em diferentes momentos da reforma",
        "Presença nas três fases: escolha, transformação e resultado",
        "Série de Stories acompanhando a parceria",
        "Presença natural da marca nos conteúdos da reforma",
        "Fotos do ambiente finalizado em alta resolução",
        "Direito de uso e posicionamento por 6 meses",
        "Exclusividade na categoria durante a reforma"
      ],
      cta: "Quero esse formato"
    }
  ],

  /* ---------------------------------------------------------------
     DUAS FRENTES DE CONTEÚDO
  --------------------------------------------------------------- */
  frentes: [
    {
      titulo: "Conteúdo para a marca",
      texto: "Conteúdos produzidos para a sua marca utilizar em seus próprios canais, como vídeos UGC, fotos, anúncios, site e outros formatos combinados."
    },
    {
      titulo: "Conteúdo no meu perfil",
      texto: "A marca entra na narrativa da minha reforma através dos conteúdos publicados no meu TikTok, Instagram e Stories, fazendo parte do diário de transformação do quarto."
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
