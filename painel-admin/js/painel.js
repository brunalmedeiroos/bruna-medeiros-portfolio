// ==========================================================================
// js/painel.js — Lógica do painel administrativo
// ==========================================================================
// Depende de js/auth.js já ter sido carregado (window.Auth e window.Auth.sb).

let eventosCache = [];
let leadsCache = [];
let periodoAtual = 'all'; // 'all' | 7 | 30 | 90

const TITULOS_ABA = {
  overview: 'Menu Principal',
  portfolio: 'Portfólio',
};

// ---- Ponto de entrada: guarda de autenticação + carga inicial ----
(async function iniciar() {
  const usuario = await Auth.checkAuth();
  if (!usuario) return; // Auth.checkAuth já redirecionou para login.html

  document.getElementById('user-email').textContent = usuario.email;
  document.getElementById('painel-body').style.visibility = 'visible';

  configurarEventos();
  await carregarDados();
})();

// ==========================================================================
// Busca de dados (com paginação, para não perder linhas após o limite de
// 1000 registros por consulta que o Supabase aplica silenciosamente)
// ==========================================================================

async function buscarTudo(tabela) {
  const TAMANHO_BLOCO = 1000;
  let tudo = [];
  let inicio = 0;

  while (true) {
    const { data, error } = await Auth.sb
      .from(tabela)
      .select('*')
      .order('created_at', { ascending: false })
      .range(inicio, inicio + TAMANHO_BLOCO - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    tudo = tudo.concat(data);

    if (data.length < TAMANHO_BLOCO) break;
    inicio += TAMANHO_BLOCO;
  }

  return tudo;
}

async function carregarDados() {
  try {
    const [eventos, leads] = await Promise.all([
      buscarTudo('portfolio_events'),
      buscarTudo('portfolio_leads'),
    ]);

    eventosCache = eventos;
    leadsCache = leads;

    renderizarTudo();
  } catch (err) {
    console.error('Erro ao carregar dados do Supabase:', err);
    mostrarErroCarregamento();
  }
}

function mostrarErroCarregamento() {
  const conteudo = document.querySelector('.conteudo');
  conteudo.innerHTML =
    '<div class="card"><p class="texto-erro">Não foi possível carregar os dados agora. ' +
    'Verifique sua conexão e tente novamente em instantes.</p></div>';
}

// ==========================================================================
// Interações: abas, filtro de período, sair, menu mobile
// ==========================================================================

function configurarEventos() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => trocarAba(btn.dataset.tab));
  });

  document.querySelectorAll('.filtro-btn').forEach((btn) => {
    btn.addEventListener('click', () => trocarPeriodo(btn.dataset.periodo, btn));
  });

  document.getElementById('btn-sair').addEventListener('click', () => Auth.logout());

  // Menu mobile (gaveta)
  const btnMenu = document.getElementById('btn-menu');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function abrirMenu() {
    sidebar.classList.add('aberta');
    overlay.hidden = false;
  }

  function fecharMenu() {
    sidebar.classList.remove('aberta');
    overlay.hidden = true;
  }

  btnMenu.addEventListener('click', abrirMenu);
  overlay.addEventListener('click', fecharMenu);
  document.querySelectorAll('.nav-item').forEach((btn) => btn.addEventListener('click', fecharMenu));
}

function trocarAba(aba) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === aba));
  document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = true));
  document.getElementById('panel-' + aba).hidden = false;
  document.getElementById('titulo-topo').textContent = TITULOS_ABA[aba];
}

function trocarPeriodo(periodo, btn) {
  periodoAtual = periodo === 'all' ? 'all' : Number(periodo);
  document.querySelectorAll('.filtro-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderizarTudo(); // refiltra o que já está em memória, sem buscar de novo
}

// ==========================================================================
// Filtro de período (aplicado sobre os dados já carregados em memória)
// ==========================================================================

function filtrarPorPeriodo(lista) {
  if (periodoAtual === 'all') return lista;

  const limite = new Date();
  limite.setDate(limite.getDate() - periodoAtual);

  return lista.filter((item) => new Date(item.created_at) >= limite);
}

function renderizarTudo() {
  const eventos = filtrarPorPeriodo(eventosCache);
  const leads = filtrarPorPeriodo(leadsCache);

  renderizarOverview(eventos, leads);
  renderizarPortfolio(eventos, leads);
}

// ==========================================================================
// Aba: Menu Principal
// ==========================================================================

function renderizarOverview(eventos, leads) {
  const pageViews = eventos.filter((e) => e.event_type === 'page_view');
  const buttonClicks = eventos.filter((e) => e.event_type === 'button_click');
  const videoViews = eventos.filter((e) => e.event_type === 'video_view');

  const visitantesUnicos = new Set(pageViews.map((e) => e.session_id)).size;
  const cliquesContato = buttonClicks.filter((e) => e.event_name && e.event_name.startsWith('contact_')).length;

  document.getElementById('num-visitas').textContent = formatarNumero(pageViews.length);
  document.getElementById('num-visitantes').textContent = formatarNumero(visitantesUnicos);
  document.getElementById('num-cliques').textContent = formatarNumero(buttonClicks.length);
  document.getElementById('num-videos').textContent = formatarNumero(videoViews.length);
  document.getElementById('num-mensagens').textContent = formatarNumero(leads.length);
  document.getElementById('num-contato').textContent = formatarNumero(cliquesContato);

  renderizarGraficoVisitas(pageViews);
}

function renderizarGraficoVisitas(pageViews) {
  const container = document.getElementById('grafico-visitas');
  container.innerHTML = '';

  if (pageViews.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhuma visita registrada ainda.</p>';
    return;
  }

  // Monta os últimos 14 dias (incluindo hoje)
  const dias = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    dias.push(d);
  }

  const contagens = dias.map((dia) => {
    const proximoDia = new Date(dia);
    proximoDia.setDate(proximoDia.getDate() + 1);
    return pageViews.filter((e) => {
      const dataEvento = new Date(e.created_at);
      return dataEvento >= dia && dataEvento < proximoDia;
    }).length;
  });

  const maximo = Math.max(...contagens, 1);

  dias.forEach((dia, i) => {
    const contagem = contagens[i];
    const altura = contagem > 0 ? Math.max((contagem / maximo) * 100, 6) : 2;

    const barraWrap = document.createElement('div');
    barraWrap.className = 'barra-wrap';

    const barra = document.createElement('div');
    barra.className = 'barra';
    barra.style.height = altura + '%';
    barra.title = formatarDataCurta(dia) + ': ' + contagem + (contagem === 1 ? ' visita' : ' visitas');

    const label = document.createElement('span');
    label.className = 'barra-label';
    label.textContent = String(dia.getDate()).padStart(2, '0');

    barraWrap.appendChild(barra);
    barraWrap.appendChild(label);
    container.appendChild(barraWrap);
  });
}

// ==========================================================================
// Aba: Portfólio
// ==========================================================================

function renderizarPortfolio(eventos, leads) {
  const videoViews = eventos.filter((e) => e.event_type === 'video_view');
  const buttonClicks = eventos.filter((e) => e.event_type === 'button_click');
  const contatoClicks = buttonClicks.filter((e) => e.event_name && e.event_name.startsWith('contact_'));

  renderizarVideos(videoViews);
  renderizarBotoes(buttonClicks);
  renderizarContato(contatoClicks);
  renderizarMensagens(leads);
}

// Agrupa uma lista de eventos por event_name, contando ocorrências.
function agruparPorNome(lista) {
  const mapa = new Map();

  lista.forEach((e) => {
    const nome = e.event_name || '(sem nome)';
    if (!mapa.has(nome)) {
      mapa.set(nome, { nome, contagem: 0, metadata: e.metadata || {} });
    }
    mapa.get(nome).contagem++;
  });

  return Array.from(mapa.values()).sort((a, b) => b.contagem - a.contagem);
}

function renderizarVideos(videoViews) {
  const container = document.getElementById('lista-videos');
  container.innerHTML = '';

  if (videoViews.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhum vídeo visto ainda.</p>';
    return;
  }

  const agrupados = agruparPorNome(videoViews);
  const maximo = agrupados[0].contagem;

  agrupados.forEach((video) => {
    const id = video.nome;
    const titulo = (video.metadata && video.metadata.title) || id;
    const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
    const linkYoutube = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    const largura = Math.max((video.contagem / maximo) * 100, 4);

    const item = document.createElement('div');
    item.className = 'video-item';
    item.innerHTML = `
      <a href="${linkYoutube}" target="_blank" rel="noopener noreferrer" class="video-thumb-link">
        <img src="${thumb}" alt="${escapeHtml(titulo)}" class="video-thumb" loading="lazy">
      </a>
      <div class="video-info">
        <a href="${linkYoutube}" target="_blank" rel="noopener noreferrer" class="video-titulo">${escapeHtml(titulo)}</a>
        <div class="barra-horizontal-wrap">
          <div class="barra-horizontal" style="width:${largura}%"></div>
        </div>
      </div>
      <span class="video-contagem">${formatarNumero(video.contagem)}</span>
    `;
    container.appendChild(item);
  });
}

function renderizarBotoes(buttonClicks) {
  const container = document.getElementById('lista-botoes');
  container.innerHTML = '';

  if (buttonClicks.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhum clique registrado ainda.</p>';
    return;
  }

  const agrupados = agruparPorNome(buttonClicks);
  const maximo = agrupados[0].contagem;

  agrupados.forEach((botao) => {
    const largura = Math.max((botao.contagem / maximo) * 100, 4);

    const item = document.createElement('div');
    item.className = 'barra-item';
    item.innerHTML = `
      <div class="barra-item-topo">
        <span class="barra-item-nome">${escapeHtml(formatarNomeLegivel(botao.nome))}</span>
        <span class="barra-item-valor">${formatarNumero(botao.contagem)}</span>
      </div>
      <div class="barra-horizontal-wrap">
        <div class="barra-horizontal" style="width:${largura}%"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderizarContato(contatoClicks) {
  const container = document.getElementById('lista-contato');
  container.innerHTML = '';

  if (contatoClicks.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhum clique para contato ainda.</p>';
    return;
  }

  const agrupados = agruparPorNome(contatoClicks);
  const maximo = agrupados[0].contagem;

  agrupados.forEach((item) => {
    // Remove o prefixo "contact_" antes de exibir (ex: contact_whatsapp -> Whatsapp)
    const nomeLegivel = formatarNomeLegivel(item.nome.replace(/^contact_/, ''));
    const largura = Math.max((item.contagem / maximo) * 100, 4);

    const el = document.createElement('div');
    el.className = 'barra-item';
    el.innerHTML = `
      <div class="barra-item-topo">
        <span class="barra-item-nome">${escapeHtml(nomeLegivel)}</span>
        <span class="barra-item-valor">${formatarNumero(item.contagem)}</span>
      </div>
      <div class="barra-horizontal-wrap">
        <div class="barra-horizontal barra-horizontal-coral" style="width:${largura}%"></div>
      </div>
    `;
    container.appendChild(el);
  });
}

function renderizarMensagens(leads) {
  const container = document.getElementById('lista-mensagens');
  container.innerHTML = '';

  if (leads.length === 0) {
    container.innerHTML = '<p class="texto-vazio">Nenhuma mensagem por enquanto.</p>';
    return;
  }

  const ordenadas = [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  ordenadas.forEach((lead) => {
    const card = document.createElement('div');
    card.className = 'lead-card';

    const origemPopup = lead.source === 'popup';
    const origemTexto = origemPopup ? 'Popup' : 'Contato';
    const dataFormatada = new Date(lead.created_at).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const telefoneDigitos = (lead.phone || '').replace(/\D/g, '');

    card.innerHTML = `
      <button class="lead-card-topo" type="button">
        <span class="lead-selo ${origemPopup ? 'lead-selo-popup' : 'lead-selo-contato'}">${origemTexto}</span>
        <span class="lead-nome">${escapeHtml(lead.name || 'Sem nome')}</span>
        <span class="lead-data">${dataFormatada}</span>
        <span class="lead-email">${escapeHtml(lead.email || '')}</span>
        <svg class="lead-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="lead-detalhes" hidden>
        ${lead.phone ? `<p><strong>Telefone:</strong> ${escapeHtml(lead.phone)}</p>` : ''}
        ${lead.brand ? `<p><strong>Marca:</strong> ${escapeHtml(lead.brand)}</p>` : ''}
        ${lead.budget ? `<p><strong>Orçamento:</strong> ${escapeHtml(lead.budget)}</p>` : ''}
        ${lead.message ? `<p><strong>Mensagem:</strong> ${escapeHtml(lead.message)}</p>` : ''}
        <div class="lead-acoes">
          ${lead.email ? `<a class="btn-secundario" href="mailto:${encodeURIComponent(lead.email)}">Responder por e-mail</a>` : ''}
          ${telefoneDigitos ? `<a class="btn-secundario btn-whatsapp" href="https://wa.me/${telefoneDigitos}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
        </div>
      </div>
    `;

    const topo = card.querySelector('.lead-card-topo');
    const detalhes = card.querySelector('.lead-detalhes');
    topo.addEventListener('click', () => {
      detalhes.hidden = !detalhes.hidden;
      card.classList.toggle('aberto', !detalhes.hidden);
    });

    container.appendChild(card);
  });
}

// ==========================================================================
// Utilitários
// ==========================================================================

function formatarNumero(n) {
  return n.toLocaleString('pt-BR');
}

function formatarDataCurta(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Troca "_" por espaço e deixa a primeira letra de cada palavra maiúscula.
function formatarNomeLegivel(nome) {
  return nome
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Escapa texto vindo do banco antes de inserir como HTML (evita XSS,
// já que portfolio_leads recebe dados digitados por visitantes do site).
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
