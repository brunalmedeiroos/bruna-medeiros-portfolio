/* =====================================================================
   TOUR 3D — brunamedeiros.com/meuquarto
   Visualização esquemática/conceitual do quarto, construída em Three.js
   a partir da disposição real dos ambientes (moodboard enviado pela
   Bruna). Não é uma planta arquitetônica exata — é uma representação
   estilo "casa de bonecas" pra dar noção de espaço, proporção e onde
   cada categoria de produto entraria.

   Depende de QUARTO_DATA (js/dados-quarto.js), carregado antes deste
   arquivo, e das bibliotecas globais THREE / THREE.OrbitControls
   (carregadas via CDN no index.html).
===================================================================== */

(function(){

  const mount = document.getElementById("mqTourCanvas");
  if (!mount || typeof THREE === "undefined") return;

  /* ---------------------------------------------------------------
     DIMENSÕES ESQUEMÁTICAS DO CÔMODO
     Ordem das paredes segue a sequência real informada:
     cama -> janela -> tv -> penteadeira -> (volta pra cama)
  --------------------------------------------------------------- */
  const W = 6.4;   // largura (eixo X)
  const D = 5.6;   // profundidade (eixo Z)
  const H = 2.9;   // pé-direito

  const HX = W / 2;
  const HZ = D / 2;

  const HOTSPOTS = [
    { id:"roupa-cama",      wall:"cama",        pos:[0, 0.62, -HZ+0.18],    categoria:"roupa-de-cama", titulo:"Roupa de cama",
      texto:"Jogo de cama e mantas que combinam com o azul da parede listrada e dão o tom do quarto.", status:"procurando" },
    { id:"iluminacao-cama", wall:"cama",        pos:[0, 1.85, -HZ+0.22],    categoria:"iluminacao", titulo:"Iluminação da cabeceira",
      texto:"Fita de LED embutida na prateleira acima da cama — o clima aconchegante das referências.", status:"procurando" },
    { id:"mesa-cabeceira",  wall:"cama",        pos:[-1.55, 0.58, -HZ+0.5], categoria:"moveis", titulo:"Mesa de cabeceira",
      texto:"Par de mesinhas ao lado da cama, com espaço pra luminária e objetos pessoais.", status:"procurando" },
    { id:"poltrona",        wall:"janela",      pos:[HX-0.55, 0.5, -1.55],  categoria:"moveis", titulo:"Poltrona de leitura",
      texto:"Cantinho de descanso entre a cama e o home office, com poltrona e puff.", status:"procurando" },
    { id:"janela-persiana", wall:"janela",      pos:[HX-0.15, 1.9, 0.3],    categoria:"iluminacao", titulo:"Janela & persiana",
      texto:"Controle de luz natural pra quando o quarto também vira set de gravação.", status:"aberto" },
    { id:"escrivaninha",    wall:"tv",          pos:[1.35, 0.62, HZ-0.2],   categoria:"home-office", titulo:"Escrivaninha em L",
      texto:"Bancada de trabalho que também funciona como setup de gravação de conteúdo.", status:"procurando" },
    { id:"tv-eletronicos",  wall:"tv",          pos:[-1.3, 1.55, HZ-0.22],  categoria:"eletronicos", titulo:"TV & som",
      texto:"Painel com TV e soundbar — o cantinho de entretenimento dentro do quarto.", status:"aberto" },
    { id:"espelho",         wall:"penteadeira", pos:[-HX+0.18, 1.25, 0.5],  categoria:"beleza", titulo:"Espelho de camarim",
      texto:"Espelho com luzes tipo camarim — perfeito pra maquiagem e GRWM.", status:"procurando" },
    { id:"organizacao",     wall:"penteadeira", pos:[-HX+0.5, 0.55, -0.9],  categoria:"organizacao", titulo:"Organização",
      texto:"Gaveteiro e organizadores pra manter produtos de beleza à mão.", status:"aberto" }
  ];

  const WALL_LABEL = { cama:"Parede Cama", janela:"Parede Janela", tv:"Parede TV", penteadeira:"Parede Penteadeira" };

  const CAM_PRESETS = {
    geral:       { pos:[5.6, 4.9, 6.4],  target:[0, 0.9, 0] },
    cama:        { pos:[0, 3.7, 5.9],    target:[0, 1.1, -HZ+0.4] },
    janela:      { pos:[-5.9, 3.7, 0.35],target:[HX-0.4, 1.1, 0] },
    tv:          { pos:[0, 3.7, -5.9],   target:[0, 1.1, HZ-0.4] },
    penteadeira: { pos:[5.9, 3.7, -0.35],target:[-HX+0.4, 1.1, 0] }
  };

  /* ---------------------------------------------------------------
     TEXTURAS PROCEDURAIS (canvas) — sem depender de imagens externas
  --------------------------------------------------------------- */
  function makeCanvas(w, h, draw){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  const stripeTex = makeCanvas(64, 64, (ctx,w,h)=>{
    ctx.fillStyle = "#F4F1E8"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#9CB9CE";
    const bw = w/8;
    for(let i=0;i<8;i+=2) ctx.fillRect(i*bw,0,bw,h);
  });
  stripeTex.repeat.set(W/1.3, H/2.2);

  const woodSlatTex = makeCanvas(64,64,(ctx,w,h)=>{
    ctx.fillStyle = "#B98A57"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    for(let i=0;i<w;i+=8) ctx.fillRect(i,0,2,h);
    ctx.fillStyle="rgba(255,255,255,0.08)";
    for(let i=3;i<w;i+=8) ctx.fillRect(i,0,1,h);
  });
  woodSlatTex.repeat.set(W/0.9, 1);

  const plainWallTex = makeCanvas(8,8,(ctx,w,h)=>{
    ctx.fillStyle = "#EFECE2"; ctx.fillRect(0,0,w,h);
  });

  const floorTex = makeCanvas(128,128,(ctx,w,h)=>{
    ctx.fillStyle = "#B98F5C"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "rgba(70,45,15,0.22)"; ctx.lineWidth = 2;
    for(let i=0;i<=w;i+=16){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke(); }
    ctx.strokeStyle = "rgba(90,60,25,0.10)";
    for(let i=0;i<=h;i+=64){ ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke(); }
  });
  floorTex.repeat.set(W*1.6, D*1.6);

  const rugTex = makeCanvas(32,32,(ctx,w,h)=>{
    ctx.fillStyle = "#F4EFE3"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="rgba(4,70,93,0.12)"; ctx.lineWidth=3;
    ctx.strokeRect(3,3,w-6,h-6);
  });

  /* ---------------------------------------------------------------
     SCENE / CAMERA / RENDERER
  --------------------------------------------------------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x073446);
  scene.fog = new THREE.Fog(0x073446, 14, 26);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(...CAM_PRESETS.geral.pos);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(...CAM_PRESETS.geral.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3.5;
  controls.maxDistance = 13;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.update();

  /* lights */
  scene.add(new THREE.HemisphereLight(0xfff3d6, 0x0a2733, 0.48));
  const sun = new THREE.DirectionalLight(0xfff0d0, 0.62);
  sun.position.set(6, 9, 4);
  scene.add(sun);
  const warmFill = new THREE.PointLight(0xffd9a0, 0.32, 12);
  warmFill.position.set(0, 2.2, -1.5);
  scene.add(warmFill);
  const warmFill2 = new THREE.PointLight(0xffd9a0, 0.24, 12);
  warmFill2.position.set(-2.2, 2, 1);
  scene.add(warmFill2);

  /* ---------------------------------------------------------------
     GEOMETRIA DO CÔMODO
  --------------------------------------------------------------- */
  const room = new THREE.Group();
  scene.add(room);

  // piso
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness:0.85 })
  );
  floor.rotation.x = -Math.PI/2;
  room.add(floor);

  // tapete
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.8),
    new THREE.MeshStandardMaterial({ map: rugTex, roughness:0.95 })
  );
  rug.rotation.x = -Math.PI/2;
  rug.position.set(0, 0.005, -0.6);
  room.add(rug);

  function wallMaterial(kind){
    if (kind === "stripe") return new THREE.MeshStandardMaterial({ map: stripeTex, roughness:0.92 });
    if (kind === "wood")   return new THREE.MeshStandardMaterial({ map: woodSlatTex, roughness:0.7 });
    return new THREE.MeshStandardMaterial({ map: plainWallTex, roughness:0.95 });
  }

  const wallGroups = { cama:new THREE.Group(), janela:new THREE.Group(), tv:new THREE.Group(), penteadeira:new THREE.Group() };
  Object.values(wallGroups).forEach(g => room.add(g));

  // parede cama (fundo, -Z): parte superior listrada + faixa inferior ripada
  {
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(W, H*0.62), wallMaterial("stripe"));
    upper.position.set(0, H*0.69, -HZ);
    wallGroups.cama.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H*0.42, 0.08), wallMaterial("wood"));
    lower.position.set(0, H*0.21, -HZ+0.02);
    wallGroups.cama.add(lower);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W*0.94, 0.06, 0.22), new THREE.MeshStandardMaterial({ color:0xC9A16B, roughness:0.6 }));
    shelf.position.set(0, H*0.42, -HZ+0.2);
    wallGroups.cama.add(shelf);
  }

  // parede tv (frente, +Z)
  {
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(W, H*0.62), wallMaterial("plain"));
    upper.rotation.y = Math.PI;
    upper.position.set(0, H*0.69, HZ);
    wallGroups.tv.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H*0.42, 0.08), wallMaterial("wood"));
    lower.position.set(0, H*0.21, HZ-0.02);
    wallGroups.tv.add(lower);
  }

  // parede janela (direita, +X)
  {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMaterial("plain"));
    wall.rotation.y = -Math.PI/2;
    wall.position.set(HX, H/2, 0);
    wallGroups.janela.add(wall);
  }

  // parede penteadeira (esquerda, -X)
  {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMaterial("plain"));
    wall.rotation.y = Math.PI/2;
    wall.position.set(-HX, H/2, 0);
    wallGroups.penteadeira.add(wall);
  }

  /* ---------------------------------------------------------------
     MOBILIÁRIO ESQUEMÁTICO (formas simples, sem detalhe fotorreal)
  --------------------------------------------------------------- */
  function box(w,h,d,color,x,y,z,ry){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ color, roughness:0.75 }));
    m.position.set(x,y,z);
    if (ry) m.rotation.y = ry;
    return m;
  }
  function cyl(r,h,color,x,y,z){
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20), new THREE.MeshStandardMaterial({ color, roughness:0.7 }));
    m.position.set(x,y,z);
    return m;
  }

  // --- cama ---
  wallGroups.cama.add(box(2.1, 0.55, 1.9, 0xEDE6D8, 0, 0.275, -HZ+1.1));
  wallGroups.cama.add(box(2.05, 0.28, 0.55, 0xAFC8DA, 0, 0.68, -HZ+1.85));
  wallGroups.cama.add(box(0.5, 0.48, 0.42, 0xFFFFFF, -1.55, 0.5, -HZ+0.55));
  wallGroups.cama.add(box(0.5, 0.48, 0.42, 0xFFFFFF, 1.55, 0.5, -HZ+0.55));
  wallGroups.cama.add(cyl(0.1, 0.3, 0xF5E6B8, -1.55, 0.9, -HZ+0.55));
  wallGroups.cama.add(cyl(0.1, 0.3, 0xF5E6B8, 1.55, 0.9, -HZ+0.55));

  // --- janela ---
  {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), new THREE.MeshStandardMaterial({ color:0xBFE0EC, emissive:0x224455, emissiveIntensity:0.25, roughness:0.3 }));
    glass.rotation.y = -Math.PI/2;
    glass.position.set(HX-0.03, 1.55, 0.2);
    wallGroups.janela.add(glass);
    const ac = box(0.7,0.22,0.22,0xF4F4F4, HX-0.15, 2.55, -1.4, -Math.PI/2);
    wallGroups.janela.add(ac);
    wallGroups.janela.add(box(0.75, 0.75, 0.75, 0xE8B84B, HX-0.6, 0.375, -1.6)); // poltrona
    wallGroups.janela.add(box(0.4, 0.35, 0.4, 0xF2EFE8, HX-0.6, 0.175, -0.85)); // puff
    wallGroups.janela.add(cyl(0.04, 1.5, 0x2E2E2E, HX-1.1, 0.75, -2.1));
    wallGroups.janela.add(cyl(0.22, 0.16, 0xFFF7C5, HX-1.1, 1.55, -2.1));
  }

  // --- tv ---
  {
    wallGroups.tv.add(box(2.0, 0.42, 0.4, 0xF2F0EA, -1.3, 0.21, HZ-0.22));
    wallGroups.tv.add(box(1.5, 0.85, 0.06, 0x14181C, -1.3, 0.95, HZ-0.15));
    wallGroups.tv.add(box(1.6, 0.7, 0.62, 0xE7DFCC, 1.35, 0.35, HZ-0.32));   // bancada
    wallGroups.tv.add(box(0.6, 0.7, 1.4, 0xE7DFCC, 2.35, 0.35, HZ-1.3, Math.PI/2)); // extensão em L
    wallGroups.tv.add(box(0.5, 0.75, 0.5, 0xCFCFCF, 1.35, 0.375, HZ-0.9));   // cadeira (base)
    wallGroups.tv.add(box(0.5, 0.55, 0.08, 0xB9B9B9, 1.35, 0.95, HZ-1.12));  // encosto cadeira
  }

  // --- penteadeira ---
  {
    wallGroups.penteadeira.add(box(0.5, 0.02, 1.2, 0xFFFFFF, -HX+0.28, 0.7, 0.5));
    wallGroups.penteadeira.add(box(0.5, 0.7, 1.1, 0xFFFFFF, -HX+0.28, 0.35, 0.5));
    const mirror = box(0.05, 1.1, 0.85, 0x9FC3D6, -HX+0.06, 1.3, 0.55);
    wallGroups.penteadeira.add(mirror);
    for(let i=-1;i<=1;i++){
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025,10,10), new THREE.MeshStandardMaterial({ color:0xFFF3C4, emissive:0xFFE9A6, emissiveIntensity:0.9 }));
      bulb.position.set(-HX+0.09, 1.75, 0.55 + i*0.32);
      wallGroups.penteadeira.add(bulb);
    }
    wallGroups.penteadeira.add(cyl(0.22, 0.32, 0xE8E4D8, -HX+0.5, 0.16, 1.3));
    wallGroups.penteadeira.add(box(0.35, 0.45, 0.03, 0xD8C9A9, -HX+0.06, 1.3, -0.9));
    wallGroups.penteadeira.add(box(0.35, 0.45, 0.03, 0xB9C9D6, -HX+0.06, 1.3, -1.35));
  }

  /* ---------------------------------------------------------------
     HOTSPOTS
  --------------------------------------------------------------- */
  function hotspotSprite(){
    const c = document.createElement("canvas");
    c.width = 96; c.height = 96;
    const ctx = c.getContext("2d");
    ctx.beginPath(); ctx.arc(48,48,30,0,Math.PI*2);
    ctx.fillStyle = "rgba(4,70,93,0.55)"; ctx.fill();
    ctx.beginPath(); ctx.arc(48,48,20,0,Math.PI*2);
    ctx.fillStyle = "#FFF7C5"; ctx.fill();
    ctx.beginPath(); ctx.arc(48,48,8,0,Math.PI*2);
    ctx.fillStyle = "#04465D"; ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map:tex, depthTest:false, transparent:true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.34,0.34,0.34);
    spr.renderOrder = 999;
    return spr;
  }

  const hotspotSprites = [];
  HOTSPOTS.forEach(h=>{
    const spr = hotspotSprite();
    spr.position.set(h.pos[0], h.pos[1], h.pos[2]);
    spr.userData = h;
    room.add(spr);
    hotspotSprites.push(spr);
  });

  /* ---------------------------------------------------------------
     RESIZE
  --------------------------------------------------------------- */
  function resize(){
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  }
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(mount);

  /* ---------------------------------------------------------------
     CAMERA TWEEN
  --------------------------------------------------------------- */
  let tween = null;
  function goTo(presetKey){
    const p = CAM_PRESETS[presetKey];
    if (!p) return;
    const from = { pos: camera.position.clone(), target: controls.target.clone() };
    const to = { pos: new THREE.Vector3(...p.pos), target: new THREE.Vector3(...p.target) };
    tween = { from, to, t:0, dur: 900, start: performance.now() };
  }

  function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

  /* ---------------------------------------------------------------
     INTERAÇÃO: raycaster nos hotspots
  --------------------------------------------------------------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const panel = document.getElementById("mqHotspotPanel");
  const panelClose = document.getElementById("mqHotspotClose");

  function showPanel(h){
    if (!panel) return;
    const cat = (window.QUARTO_DATA.categorias.find(c=>c.id===h.categoria) || {}).nome || h.categoria;
    panel.querySelector(".mq-tag").textContent = cat;
    panel.querySelector(".mq-status").textContent = h.status === "procurando" ? "Procurando parceira" : "Aberto a co-branding";
    panel.querySelector("h4").textContent = h.titulo;
    panel.querySelector("p").textContent = h.texto;
    panel.classList.add("is-open");
  }
  function hidePanel(){ panel && panel.classList.remove("is-open"); }
  panelClose && panelClose.addEventListener("click", hidePanel);

  function setPointerFromEvent(ev){
    const rect = renderer.domElement.getBoundingClientRect();
    const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
    const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
    pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
  }

  renderer.domElement.addEventListener("click", (ev)=>{
    setPointerFromEvent(ev);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hotspotSprites);
    if (hits.length){
      showPanel(hits[0].object.userData);
    }
  });

  renderer.domElement.addEventListener("pointermove", (ev)=>{
    setPointerFromEvent(ev);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hotspotSprites);
    renderer.domElement.style.cursor = hits.length ? "pointer" : "grab";
  });

  /* ---------------------------------------------------------------
     BOTÕES DE PAREDE / VISÃO GERAL / RESET / FULLSCREEN
  --------------------------------------------------------------- */
  const wallButtons = document.querySelectorAll("[data-wall-view]");
  wallButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      wallButtons.forEach(b=>b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const key = btn.getAttribute("data-wall-view");
      goTo(key);
      hotspotSprites.forEach(s=>{
        const match = key === "geral" || s.userData.wall === key;
        s.material.opacity = match ? 1 : 0.18;
      });
      hidePanel();
    });
  });

  const resetBtn = document.getElementById("mqTourReset");
  resetBtn && resetBtn.addEventListener("click", ()=>{
    wallButtons.forEach(b=>b.classList.remove("is-active"));
    document.querySelector('[data-wall-view="geral"]')?.classList.add("is-active");
    goTo("geral");
    hotspotSprites.forEach(s=> s.material.opacity = 1);
    hidePanel();
  });

  const fsBtn = document.getElementById("mqTourFullscreen");
  fsBtn && fsBtn.addEventListener("click", ()=>{
    const shell = mount.closest(".mq-tour-shell");
    if (!document.fullscreenElement) shell.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  /* ---------------------------------------------------------------
     LOOP
  --------------------------------------------------------------- */
  function animate(now){
    requestAnimationFrame(animate);

    if (tween){
      const t = Math.min(1, (now - tween.start) / tween.dur);
      const e = easeInOutCubic(t);
      camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
      controls.target.lerpVectors(tween.from.target, tween.to.target, e);
      if (t >= 1) tween = null;
    }

    hotspotSprites.forEach(s=>{
      s.lookAt(camera.position);
    });

    controls.update();
    renderer.render(scene, camera);
  }

  resize();
  requestAnimationFrame(animate);

  const loading = document.getElementById("mqTourLoading");
  requestAnimationFrame(()=> setTimeout(()=> loading && loading.classList.add("is-hidden"), 220));

})();
