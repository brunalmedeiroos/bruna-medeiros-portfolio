/* =====================================================================
   MEUQUARTO / interações gerais da página (fora do tour 3D)
   Lê os dados de QUARTO_DATA (js/dados-quarto.js) e monta as seções
   dinamicamente, então atualizar o cronograma, o status de um item
   procurado ou uma pergunta do FAQ é só editar o arquivo de dados.
===================================================================== */

(function(){

  const WHATS_NUMBER = "5585992805861";
  function waLink(text){
    return `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  const ICONS = {
    sofa:   '<path d="M4 12v5a1 1 0 0 0 1 1h1v2h2v-2h8v2h2v-2h1a1 1 0 0 0 1-1v-5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12V9a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1h6V9a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    frame:  '<rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="9" cy="10" r="1.6" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M5 17l4.5-5 3 3.2L16 11l3 4.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    bulb:   '<path d="M9 18h6M10 21h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.46 1.1 1.2 1.1 2.2h5a2.4 2.4 0 0 1 1.1-2.2A6 6 0 0 0 12 3Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
    box:    '<path d="M3.5 8.5 12 4l8.5 4.5L12 13z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M3.5 8.5V16L12 20l8.5-4V8.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M12 13v7" stroke="currentColor" stroke-width="1.8"/>',
    bed:    '<path d="M3 19v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M3 19v2M21 19v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M5 14h6v-2.2A1.8 1.8 0 0 0 9.2 10H6.8A1.8 1.8 0 0 0 5 11.8Z" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    wifi:   '<path d="M4 9a13 13 0 0 1 16 0M7 12.5a8.5 8.5 0 0 1 10 0M10 16a4 4 0 0 1 4 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none"/>',
    tv:     '<rect x="3" y="5" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    desk:   '<path d="M3 8h18M5 8v11M19 8v11M9 13h4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="3" y="5" width="18" height="3" rx="1" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    mirror: '<ellipse cx="12" cy="10" rx="6" ry="7" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M9 20h6M12 17v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    spray:  '<path d="M9 3h3v3H9z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M8 6h5l1 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M15 8l2-1M16 11l2.4-.4M15 14l2.2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    plant:  '<path d="M12 21v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12c0-3.5-2.5-6-6.5-6C5.5 10 8 12 12 12ZM12 12c0-4 3-7 7.5-7C19.5 9.5 16.5 12 12 12Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>',
    roller: '<rect x="3" y="4" width="12" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M9 10v4M9 20v-4M6 20h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };

  const catIcon = id => `<svg viewBox="0 0 24 24" fill="none">${ICONS[id] || ICONS.box}</svg>`;

  function catName(id){
    const c = QUARTO_DATA.categorias.find(c=>c.id===id);
    return c ? c.nome : id;
  }

  /* ---------------- CARROSSEL DE PAREDES ---------------- */
  function renderCarousel(){
    const el = document.getElementById("mqCarousel");
    if (!el) return;
    const paredes = QUARTO_DATA.paredes;
    let idx = 0;

    el.innerHTML = `
      <div class="mq-carousel-track">
        <div class="mq-carousel-photo" id="mqCarPhoto" data-lightbox="" data-caption="">
          <span class="mq-carousel-num" id="mqCarNum"></span>
          <img id="mqCarImg" src="" alt="">
        </div>
        <div class="mq-carousel-body">
          <h3 id="mqCarTitle"></h3>
          <p id="mqCarDesc"></p>
          <div class="mq-tag-row" id="mqCarTags"></div>
        </div>
      </div>
      <div class="mq-carousel-nav">
        <button class="mq-carousel-arrow" id="mqCarPrev" type="button" aria-label="Parede anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <div class="mq-carousel-dots" id="mqCarDots"></div>
        <button class="mq-carousel-arrow" id="mqCarNext" type="button" aria-label="Próxima parede">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
    `;

    const dotsEl = document.getElementById("mqCarDots");
    dotsEl.innerHTML = paredes.map((_,i)=>`<button class="mq-carousel-dot" data-idx="${i}" aria-label="Ir para parede ${i+1}"></button>`).join("");

    function paint(){
      const p = paredes[idx];
      document.getElementById("mqCarNum").textContent = p.numero;
      const img = document.getElementById("mqCarImg");
      img.src = p.imagem;
      img.alt = `Referência visual, ${p.nome}`;
      document.getElementById("mqCarPhoto").setAttribute("data-lightbox", p.imagem);
      document.getElementById("mqCarPhoto").setAttribute("data-caption", p.nome);
      document.getElementById("mqCarTitle").textContent = p.nome;
      document.getElementById("mqCarDesc").textContent = p.resumo;
      document.getElementById("mqCarTags").innerHTML = p.categorias.map(c=>`<span class="mq-tag">${catName(c)}</span>`).join("");
      dotsEl.querySelectorAll(".mq-carousel-dot").forEach((d,i)=> d.classList.toggle("is-active", i===idx));
    }

    document.getElementById("mqCarPrev").addEventListener("click", ()=>{ idx = (idx - 1 + paredes.length) % paredes.length; paint(); });
    document.getElementById("mqCarNext").addEventListener("click", ()=>{ idx = (idx + 1) % paredes.length; paint(); });
    dotsEl.addEventListener("click", (ev)=>{
      const btn = ev.target.closest("[data-idx]");
      if (!btn) return;
      idx = Number(btn.getAttribute("data-idx"));
      paint();
    });

    paint();
  }

  /* ---------------- PLANTA BAIXA E MEDIDAS ---------------- */
  function renderPlanta(){
    const planta = QUARTO_DATA.planta;
    const pedEl = document.getElementById("mqPedireito");
    if (pedEl) pedEl.textContent = `${planta.pedDireito.toFixed(2).replace(".", ",")} m`;

    const body = document.getElementById("mqMedidasBody");
    if (body){
      body.innerHTML = planta.paredes.map(p => `
        <tr>
          <td>${p.nome}</td>
          <td>${p.largura.toFixed(2).replace(".", ",")} m</td>
          <td>${p.area.toFixed(2).replace(".", ",")} m²</td>
          <td><span class="mq-acabamento-tag ${p.acabamento === "Cerâmica" ? "ceramica" : "pintura"}">${p.acabamento}</span></td>
        </tr>
      `).join("");
    }

    const totaisEl = document.getElementById("mqPlantaTotais");
    if (totaisEl){
      totaisEl.innerHTML = planta.totais.map(t => `
        <div class="mq-planta-total">
          <b>${t.area.toFixed(2).replace(".", ",")} m²</b>
          <span>${t.acabamento}, referência de compra: ${t.referenciaCompra} m²</span>
        </div>
      `).join("");
    }
  }

  /* ---------------- OPORTUNIDADES (6 + ver todos) ---------------- */
  function renderCategorias(){
    const main = document.getElementById("mqCatGrid");
    const extra = document.getElementById("mqCatGridExtra");
    const btn = document.getElementById("mqCatMoreBtn");
    if (!main || !extra) return;

    const principais = QUARTO_DATA.categorias.filter(c => c.principal);
    const resto = QUARTO_DATA.categorias.filter(c => !c.principal);

    const card = c => `
      <div class="mq-cat-card">
        <div class="mq-cat-icon">${catIcon(c.icone)}</div>
        <span>${c.nome}</span>
      </div>
    `;

    main.innerHTML = principais.map(card).join("");
    extra.innerHTML = resto.map(card).join("");

    if (btn){
      btn.addEventListener("click", ()=>{
        const expanded = !extra.classList.contains("mq-cat-hidden");
        extra.classList.toggle("mq-cat-hidden", expanded);
        btn.textContent = expanded ? "Ver todos" : "Ver menos";
      });
    }
  }

  /* ---------------- O QUE ESTOU PROCURANDO ---------------- */
  function renderProcurando(){
    const el = document.getElementById("mqProcurandoList");
    if (!el) return;
    const statusLabel = { procurando:"Procurando", conversando:"Em conversa", fechado:"Fechado" };
    el.innerHTML = QUARTO_DATA.procurando.map(i => {
      const paredeLabel = i.paredeLabel || (QUARTO_DATA.paredes.find(p=>p.id===i.parede)||{}).nome || "";
      return `
      <div class="mq-procurando-item">
        <div class="mq-pi-main">
          <h4>${i.item}</h4>
          <p>${catName(i.categoria)}, ${paredeLabel}</p>
        </div>
        <span class="mq-status-badge mq-status-${i.status}">${statusLabel[i.status] || i.status}</span>
      </div>
    `;}).join("");
  }

  /* ---------------- PLANOS DE PARCERIA (editorial) ---------------- */
  function renderPlanos(){
    const el = document.getElementById("mqPlanosRow");
    if (!el) return;
    el.innerHTML = QUARTO_DATA.planos.map(p => `
      <div class="mq-plano-row">
        <div class="mq-plano-num">${p.numero}</div>
        <div class="mq-plano-heading">
          <h3>${p.nome}</h3>
          <div class="mq-plano-sub">${p.subtitulo}</div>
          <p class="mq-plano-para">${p.paraQuem}</p>
          <div class="mq-plano-exemplos">${p.exemplos.map(e=>`<span>${e}</span>`).join("")}</div>
        </div>
        <div class="mq-plano-body">
          <div>
            <div class="mq-plano-label">O que inclui</div>
            <ul class="mq-plano-inclui">${p.inclui.map(i=>`<li>${i}</li>`).join("")}</ul>
          </div>
          ${p.narrativa ? `
            <div>
              <div class="mq-plano-label">Como a história pode ser contada</div>
              <div class="mq-plano-narrativa" style="margin-top:8px;">${p.narrativa.map((n,idx)=>`<span>${n}</span>${idx<p.narrativa.length-1?'<span class="arrow">→</span>':''}`).join("")}</div>
            </div>
          ` : ""}
          <p class="mq-plano-note">${p.nota}</p>
          <a class="mq-btn mq-btn-primary mq-plano-cta" target="_blank" rel="noopener"
             href="${waLink(`Oi, Bruna! Vi o projeto do seu quarto e quero participar no formato "${p.numero}, ${p.nome}".`)}">
            ${p.cta}
          </a>
        </div>
      </div>
    `).join("");
  }

  /* ---------------- TRÊS FRENTES ---------------- */
  function renderFrentes(){
    const el = document.getElementById("mqFrentesGrid");
    if (!el) return;
    el.innerHTML = QUARTO_DATA.frentes.map(f => `
      <div class="mq-frente-card">
        <h4>${f.titulo}</h4>
        <ul>${f.itens.map(i=>`<li>${i}</li>`).join("")}</ul>
      </div>
    `).join("");
  }

  /* ---------------- MOMENTOS DE CONTEÚDO ---------------- */
  function renderMomentos(){
    const el = document.getElementById("mqMomentos");
    if (el) el.innerHTML = QUARTO_DATA.momentosConteudo.map(m=>`<span class="mq-chip">${m}</span>`).join("");
  }

  /* ---------------- ETAPAS DO PROCESSO ---------------- */
  function renderEtapas(){
    const note = document.getElementById("mqInicioReforma");
    if (note) note.textContent = QUARTO_DATA.inicioReforma;

    const el = document.getElementById("mqEtapas");
    if (!el) return;
    el.innerHTML = QUARTO_DATA.etapas.map((e,idx) => `
      ${idx > 0 ? `<div class="mq-etapa-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></div>` : ""}
      <div class="mq-etapa">
        <span class="mq-etapa-num">${idx+1}</span>
        <h4>${e.nome}</h4>
        <p>${e.descricao}</p>
      </div>
    `).join("");
  }

  /* ---------------- FAQ ---------------- */
  function renderFaq(){
    const el = document.getElementById("mqFaqList");
    if (!el) return;
    el.innerHTML = QUARTO_DATA.faq.map((f,idx) => `
      <div class="mq-faq-item" data-idx="${idx}">
        <button class="mq-faq-q" type="button" aria-expanded="false">
          <span>${f.pergunta}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <div class="mq-faq-a"><p>${f.resposta}</p></div>
      </div>
    `).join("");

    el.querySelectorAll(".mq-faq-item").forEach(item=>{
      const btn = item.querySelector(".mq-faq-q");
      const ans = item.querySelector(".mq-faq-a");
      btn.addEventListener("click", ()=>{
        const isOpen = item.classList.contains("is-open");
        el.querySelectorAll(".mq-faq-item.is-open").forEach(o=>{
          o.classList.remove("is-open");
          o.querySelector(".mq-faq-a").style.maxHeight = null;
          o.querySelector(".mq-faq-q").setAttribute("aria-expanded","false");
        });
        if (!isOpen){
          item.classList.add("is-open");
          ans.style.maxHeight = ans.scrollHeight + "px";
          btn.setAttribute("aria-expanded","true");
        }
      });
    });

    if (el.firstElementChild){
      el.firstElementChild.classList.add("is-open");
      const ans = el.firstElementChild.querySelector(".mq-faq-a");
      ans.style.maxHeight = ans.scrollHeight + "px";
      el.firstElementChild.querySelector(".mq-faq-q").setAttribute("aria-expanded","true");
    }
  }

  /* ---------------- LIGHTBOX ---------------- */
  function initLightbox(){
    const lb = document.getElementById("mqLightbox");
    if (!lb) return;
    const img = lb.querySelector("img");
    const caption = lb.querySelector(".mq-lightbox-caption");
    document.body.addEventListener("click", (ev)=>{
      const trigger = ev.target.closest("[data-lightbox]");
      if (trigger && trigger.getAttribute("data-lightbox")){
        img.src = trigger.getAttribute("data-lightbox");
        caption.textContent = trigger.getAttribute("data-caption") || "";
        lb.classList.add("is-open");
      }
      if (ev.target.closest(".mq-lightbox-close") || ev.target === lb){
        lb.classList.remove("is-open");
      }
    });
    window.addEventListener("keydown", ev=>{ if (ev.key === "Escape") lb.classList.remove("is-open"); });
  }

  /* ---------------- NAV: scrollspy ---------------- */
  function initNav(){
    const links = document.querySelectorAll(".mq-nav-link");
    const sections = [...links].map(l => document.querySelector(l.getAttribute("href"))).filter(Boolean);
    function onScroll(){
      const y = window.scrollY + 130;
      let current = sections[0];
      sections.forEach(s => { if (s.offsetTop <= y) current = s; });
      links.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === "#" + current?.id));
    }
    window.addEventListener("scroll", onScroll, { passive:true });
    onScroll();
  }

  /* ---------------- INIT ---------------- */
  document.addEventListener("DOMContentLoaded", ()=>{
    renderCarousel();
    renderPlanta();
    renderCategorias();
    renderProcurando();
    renderPlanos();
    renderFrentes();
    renderMomentos();
    renderEtapas();
    renderFaq();
    initLightbox();
    initNav();

    document.getElementById("mqYear") && (document.getElementById("mqYear").textContent = new Date().getFullYear());
  });

})();
