/* =====================================================================
   MEUQUARTO / interações gerais da página (fora do tour 3D)
   Lê os dados de QUARTO_DATA (js/dados-quarto.js) e monta as seções
   dinamicamente, então atualizar um plano ou uma pergunta do FAQ é
   só editar o arquivo de dados.
===================================================================== */

(function(){

  const WHATS_NUMBER = "5585992805861";
  function waLink(text){
    return `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  function catName(id){
    const c = QUARTO_DATA.oportunidades.find(c=>c.id===id);
    return c ? c.nome : id;
  }

  /* ---------------- CARROSSEL DE PAREDES ---------------- */
  function renderCarousel(){
    const el = document.getElementById("mqCarousel");
    if (!el) return;
    const paredes = QUARTO_DATA.paredes;
    let idx = 0;

    el.innerHTML = `
      <div class="mq-carousel-track mq-carousel-fade" id="mqCarTrack">
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
        <span class="mq-carousel-count" id="mqCarCount"></span>
        <div class="mq-carousel-arrows">
          <button class="mq-carousel-arrow" id="mqCarPrev" type="button" aria-label="Parede anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <button class="mq-carousel-arrow" id="mqCarNext" type="button" aria-label="Próxima parede">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    `;

    const trackEl = document.getElementById("mqCarTrack");

    function fill(){
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
      const total = String(paredes.length).padStart(2,"0");
      document.getElementById("mqCarCount").textContent = `${String(idx+1).padStart(2,"0")}/${total}`;
    }

    function goTo(newIdx){
      if (newIdx === idx) return;
      trackEl.classList.add("is-fading");
      window.setTimeout(()=>{
        idx = newIdx;
        fill();
        trackEl.classList.remove("is-fading");
      }, 260);
    }

    document.getElementById("mqCarPrev").addEventListener("click", ()=> goTo((idx - 1 + paredes.length) % paredes.length));
    document.getElementById("mqCarNext").addEventListener("click", ()=> goTo((idx + 1) % paredes.length));

    fill();
  }

  /* ---------------- MAPA DE OPORTUNIDADES (lista sempre visível) ---------------- */
  function renderOportunidades(){
    const el = document.getElementById("mqOppList");
    if (!el) return;
    el.innerHTML = QUARTO_DATA.oportunidades.map(c => `
      <div class="mq-opp-row">
        <h4>${c.nome}</h4>
        <p>${c.itens.join(", ")}</p>
      </div>
    `).join("");
  }

  /* ---------------- PLANOS DE PARCERIA ---------------- */
  function renderPlanos(){
    const el = document.getElementById("mqPlanosGrid");
    if (!el) return;
    el.innerHTML = QUARTO_DATA.planos.map(p => `
      <div class="mq-plano-card">
        <span class="mq-plano-num">${p.numero}</span>
        <div class="mq-plano-tag">${p.categoria}</div>
        <h3>${p.nome}</h3>
        <p class="mq-plano-para">${p.paragrafo}</p>
        <ul class="mq-plano-inclui">${p.inclui.map(i=>`<li>${i}</li>`).join("")}</ul>
        ${p.nota ? `<p class="mq-plano-nota">${p.nota}</p>` : ""}
        <a class="mq-plano-cta" target="_blank" rel="noopener"
           href="${waLink(`Oi, Bruna! Vi o projeto do seu quarto e quero participar no formato "${p.categoria}".`)}">
          ${p.cta} <span aria-hidden="true">↗</span>
        </a>
      </div>
    `).join("");
  }

  /* ---------------- DUAS FRENTES ---------------- */
  function renderFrentes(){
    const el = document.getElementById("mqFrentesGrid");
    if (!el) return;
    el.innerHTML = QUARTO_DATA.frentes.map(f => `
      <div class="mq-frente-card">
        <h4>${f.titulo}</h4>
        <p>${f.texto}</p>
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
    renderOportunidades();
    renderPlanos();
    renderFrentes();
    renderFaq();
    initLightbox();
    initNav();

    document.getElementById("mqYear") && (document.getElementById("mqYear").textContent = new Date().getFullYear());
  });

})();
