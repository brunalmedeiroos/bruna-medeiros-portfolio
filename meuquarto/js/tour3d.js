/* =====================================================================
   TOUR 3D / brunamedeiros.com/meuquarto
   Reconstrução fiel à planta de referência e às medidas reais medidas
   pessoalmente (não à planta antiga). O quarto tem o formato de um
   retângulo com o canto entre a parede da TV e a parede da penteadeira
   aberto, formando a passagem para o corredor de entrada, exatamente
   como no desenho de referência.

   Medidas (QUARTO_DATA.planta):
   pé-direito 2,70 m
   parede cama       4,29 m de largura, pintura
   parede janela     2,94 m de largura, pintura
   parede tv         3,31 m de largura, cerâmica
   parede penteadeira 3,00 m de largura, cerâmica

   A abertura para o corredor não teve medida exata informada: é a
   diferença entre a largura da parede da cama e da parede da tv, e
   está sinalizada como aproximada na legenda do tour.

   Depende de QUARTO_DATA (js/dados-quarto.js), carregado antes deste
   arquivo, e das bibliotecas globais THREE / THREE.OrbitControls.
===================================================================== */

(function(){

  const mount = document.getElementById("mqTourCanvas");
  if (!mount || typeof THREE === "undefined") return;

  const M = QUARTO_DATA.planta.paredes.reduce((acc,p)=>{ acc[p.id] = p; return acc; }, {});

  /* ---------------------------------------------------------------
     DIMENSÕES REAIS (metros). Origem no canto cama/janela.
     Eixo X: da parede da janela (0) até a parede da penteadeira (W).
     Eixo Z: da parede da cama (0) até a frente do quarto.
  --------------------------------------------------------------- */
  const H  = QUARTO_DATA.planta.pedDireito;   // 2.70
  const W  = M.cama.largura;                  // 4.29 (parede cama)
  const JD = M.janela.largura;                // 2.94 (parede janela = profundidade do lado esquerdo)
  const PD = M.penteadeira.largura;           // 3.00 (parede penteadeira = profundidade do lado direito)
  const TVW = M.tv.largura;                   // 3.31 (parede tv)

  const CX = W / 2;

  const HOTSPOTS = [
    { id:"roupa-cama",      wall:"cama",        pos:[CX, 0.62, 0.32],        categoria:"roupa-de-cama", titulo:"Roupa de cama",
      texto:"Jogo de cama e mantas que combinam com a parede pintada e dão o tom do quarto.", status:"procurando" },
    { id:"iluminacao-cama", wall:"cama",        pos:[CX, 1.95, 0.15],        categoria:"iluminacao", titulo:"Iluminação da cabeceira",
      texto:"Prateleira com LED embutido acima da cama, criando o clima aconchegante das referências.", status:"procurando" },
    { id:"mesa-cabeceira",  wall:"cama",        pos:[CX-1.05, 0.58, 0.45],   categoria:"moveis", titulo:"Mesa de cabeceira",
      texto:"Par de mesinhas ao lado da cama, com espaço pra luminária e objetos pessoais.", status:"procurando" },
    { id:"poltrona",        wall:"janela",      pos:[0.62, 0.5, 0.58],       categoria:"moveis", titulo:"Poltrona de leitura",
      texto:"Cantinho de descanso perto da janela, entre a cama e o home office.", status:"procurando" },
    { id:"janela-luz",      wall:"janela",      pos:[0.12, 1.75, JD*0.55],   categoria:"iluminacao", titulo:"Janela",
      texto:"Fonte de luz natural do quarto, importante pra rotina de gravação de conteúdo.", status:"aberto" },
    { id:"escrivaninha",    wall:"tv",          pos:[0.7, 0.62, JD-0.25],    categoria:"home-office", titulo:"Escrivaninha em L",
      texto:"Bancada de trabalho no canto entre a janela e a TV, que também funciona como setup de gravação.", status:"procurando" },
    { id:"tv-eletronicos",  wall:"tv",          pos:[TVW-0.9, 1.45, JD-0.18],categoria:"eletronicos", titulo:"TV e som",
      texto:"Painel com TV e som, o cantinho de entretenimento dentro do quarto.", status:"aberto" },
    { id:"espelho",         wall:"penteadeira", pos:[W-0.18, 1.25, 0.55],    categoria:"beleza", titulo:"Espelho de camarim",
      texto:"Espelho com luzes tipo camarim, perfeito pra maquiagem e conteúdos de GRWM.", status:"procurando" },
    { id:"organizacao",     wall:"penteadeira", pos:[W-0.5, 0.55, 1.35],     categoria:"organizacao", titulo:"Organização",
      texto:"Gaveteiro e organizadores pra manter produtos de beleza à mão.", status:"aberto" }
  ];

  const CAM_PRESETS = {
    geral:       { pos:[W+3.4, 4.8, PD+3.3],  target:[CX, 0.9, 1.5] },
    cama:        { pos:[CX, 3.6, PD+2.9],     target:[CX, 1.1, 0.3] },
    janela:      { pos:[W+3.9, 3.6, JD*0.5],  target:[0.3, 1.1, JD*0.5] },
    tv:          { pos:[TVW/2, 3.6, -3.1],    target:[TVW/2, 1.1, JD-0.4] },
    penteadeira: { pos:[-3.5, 3.6, PD*0.5],   target:[W-0.3, 1.1, PD*0.5] }
  };

  /* ---------------------------------------------------------------
     TEXTURAS PROCEDURAIS (canvas)
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

  const pinturaTex = makeCanvas(8,8,(ctx,w,h)=>{
    ctx.fillStyle = "#EFECE2"; ctx.fillRect(0,0,w,h);
  });

  const ceramicaTex = makeCanvas(64,64,(ctx,w,h)=>{
    ctx.fillStyle = "#E7E2D6"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "rgba(120,110,90,0.28)"; ctx.lineWidth = 2;
    ctx.strokeRect(0,0,w,h);
  });
  ceramicaTex.repeat.set(TVW/0.6, H/0.6);
  const ceramicaTexSide = makeCanvas(64,64,(ctx,w,h)=>{
    ctx.fillStyle = "#E7E2D6"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "rgba(120,110,90,0.28)"; ctx.lineWidth = 2;
    ctx.strokeRect(0,0,w,h);
  });
  ceramicaTexSide.wrapS = ceramicaTexSide.wrapT = THREE.RepeatWrapping;
  ceramicaTexSide.repeat.set(PD/0.6, H/0.6);

  const floorTex = makeCanvas(128,128,(ctx,w,h)=>{
    ctx.fillStyle = "#B98F5C"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "rgba(70,45,15,0.22)"; ctx.lineWidth = 2;
    for(let i=0;i<=w;i+=16){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke(); }
    ctx.strokeStyle = "rgba(70,45,15,0.12)";
    for(let i=0;i<=h;i+=64){ ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke(); }
  });
  floorTex.repeat.set(W*1.6, (JD+PD)*0.8);

  const rugTex = makeCanvas(32,32,(ctx,w,h)=>{
    ctx.fillStyle = "#F4EFE3"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="rgba(27,144,189,0.18)"; ctx.lineWidth=3;
    ctx.strokeRect(3,3,w-6,h-6);
  });

  /* ---------------------------------------------------------------
     SCENE / CAMERA / RENDERER
  --------------------------------------------------------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xDCEEF5);
  scene.fog = new THREE.Fog(0xDCEEF5, 13, 24);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(...CAM_PRESETS.geral.pos);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(...CAM_PRESETS.geral.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.update();

  /* lights */
  scene.add(new THREE.HemisphereLight(0xfff3d6, 0x8fb9c8, 0.55));
  const sun = new THREE.DirectionalLight(0xfff0d0, 0.65);
  sun.position.set(6, 9, 4);
  scene.add(sun);
  const warmFill = new THREE.PointLight(0xffd9a0, 0.32, 12);
  warmFill.position.set(CX, 2.2, 0.6);
  scene.add(warmFill);
  const warmFill2 = new THREE.PointLight(0xffd9a0, 0.24, 12);
  warmFill2.position.set(W-1, 2, 1.2);
  scene.add(warmFill2);

  /* ---------------------------------------------------------------
     GEOMETRIA DO CÔMODO
     Contorno (sentido horário, vista de cima):
     A(0,0) parede cama / janela
     B(W,0) parede cama / penteadeira
     C(W,PD) fim da parede penteadeira
     E(TVW,JD) fim da parede tv (abertura pro corredor entre C e E)
     D(0,JD) fim da parede janela
  --------------------------------------------------------------- */
  const room = new THREE.Group();
  scene.add(room);

  const A = [0,0], B = [W,0], C = [W,PD], E = [TVW,JD], D = [0,JD];

  function floorTriangleGeo(p1,p2,p3){
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      p1[0],0,p1[1],  p2[0],0,p2[1],  p3[0],0,p3[1]
    ]);
    const uvs = new Float32Array([
      p1[0],p1[1], p2[0],p2[1], p3[0],p3[1]
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts,3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs,2));
    geo.setIndex([0,1,2]);
    geo.computeVertexNormals();
    return geo;
  }

  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness:0.85, side: THREE.DoubleSide });
  [[A,B,C],[A,C,E],[A,E,D]].forEach(tri=>{
    const mesh = new THREE.Mesh(floorTriangleGeo(tri[0],tri[1],tri[2]), floorMat);
    room.add(mesh);
  });

  // tapete
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.6),
    new THREE.MeshStandardMaterial({ map: rugTex, roughness:0.95 })
  );
  rug.rotation.x = -Math.PI/2;
  rug.position.set(CX, 0.005, 0.85);
  room.add(rug);

  const wallGroups = { cama:new THREE.Group(), janela:new THREE.Group(), tv:new THREE.Group(), penteadeira:new THREE.Group() };
  Object.values(wallGroups).forEach(g => room.add(g));

  // parede cama (Z=0, largura W), pintura listrada
  {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: stripeTex, roughness:0.92 }));
    wall.position.set(CX, H/2, 0);
    wallGroups.cama.add(wall);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W*0.7, 0.06, 0.22), new THREE.MeshStandardMaterial({ color:0xC9A16B, roughness:0.6 }));
    shelf.position.set(CX, H*0.72, 0.16);
    wallGroups.cama.add(shelf);
  }

  // parede janela (X=0, largura JD), pintura + vidro
  {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(JD, H), new THREE.MeshStandardMaterial({ map: pinturaTex, roughness:0.95 }));
    wall.rotation.y = Math.PI/2;
    wall.position.set(0, H/2, JD/2);
    wallGroups.janela.add(wall);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(JD*0.42, 1.35), new THREE.MeshStandardMaterial({ color:0xBFE0EC, emissive:0x224455, emissiveIntensity:0.22, roughness:0.3 }));
    glass.rotation.y = Math.PI/2;
    glass.position.set(0.03, 1.55, JD*0.55);
    wallGroups.janela.add(glass);
  }

  // parede tv (Z=JD, largura TVW), cerâmica
  {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(TVW, H), new THREE.MeshStandardMaterial({ map: ceramicaTex, roughness:0.55 }));
    wall.rotation.y = Math.PI;
    wall.position.set(TVW/2, H/2, JD);
    wallGroups.tv.add(wall);
  }

  // parede penteadeira (X=W, largura PD), cerâmica
  {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(PD, H), new THREE.MeshStandardMaterial({ map: ceramicaTexSide, roughness:0.55 }));
    wall.rotation.y = -Math.PI/2;
    wall.position.set(W, H/2, PD/2);
    wallGroups.penteadeira.add(wall);
  }

  /* ---------------------------------------------------------------
     MOBILIÁRIO ESQUEMÁTICO, posicionado conforme a planta
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

  // --- cama (centrada na parede cama) ---
  wallGroups.cama.add(box(1.95, 0.55, 1.85, 0xEDE6D8, CX, 0.275, 0.98));
  wallGroups.cama.add(box(1.9, 0.28, 0.5, 0xAFC8DA, CX, 0.68, 1.68));
  wallGroups.cama.add(box(0.5, 0.48, 0.42, 0xFFFFFF, CX-1.05, 0.5, 0.5));
  wallGroups.cama.add(box(0.5, 0.48, 0.42, 0xFFFFFF, CX+1.05, 0.5, 0.5));
  wallGroups.cama.add(cyl(0.1, 0.3, 0xF5E6B8, CX-1.05, 0.9, 0.5));
  wallGroups.cama.add(cyl(0.1, 0.3, 0xF5E6B8, CX+1.05, 0.9, 0.5));

  // --- janela (poltrona no canto cama/janela) ---
  wallGroups.janela.add(box(0.72, 0.72, 0.72, 0xE8B84B, 0.55, 0.36, 0.55));
  wallGroups.janela.add(box(0.38, 0.34, 0.38, 0xF2EFE8, 0.5, 0.17, 1.15));
  wallGroups.janela.add(cyl(0.04, 1.5, 0x2E2E2E, 0.9, 0.75, 1.55));
  wallGroups.janela.add(cyl(0.22, 0.16, 0xFFF7C5, 0.9, 1.55, 1.55));

  // --- escrivaninha em L no canto janela/tv ---
  wallGroups.tv.add(box(1.35, 0.7, 0.55, 0xE7DFCC, 0.68, 0.35, JD-0.28));
  wallGroups.tv.add(box(0.55, 0.7, 1.05, 0xE7DFCC, 0.28, 0.35, JD-1.05));
  wallGroups.tv.add(box(0.46, 0.75, 0.46, 0xCFCFCF, 0.9, 0.375, JD-0.85));
  wallGroups.tv.add(box(0.46, 0.5, 0.07, 0xB9B9B9, 0.9, 0.95, JD-1.06));

  // --- tv + móvel, à direita da escrivaninha ---
  wallGroups.tv.add(box(1.7, 0.42, 0.38, 0xF2F0EA, TVW-1.1, 0.21, JD-0.2));
  wallGroups.tv.add(box(1.3, 0.75, 0.06, 0x14181C, TVW-1.1, 0.92, JD-0.14));

  // --- penteadeira, perto do canto cama/penteadeira ---
  wallGroups.penteadeira.add(box(0.5, 0.02, 1.05, 0xFFFFFF, W-0.28, 0.7, 0.55));
  wallGroups.penteadeira.add(box(0.5, 0.7, 0.95, 0xFFFFFF, W-0.28, 0.35, 0.55));
  wallGroups.penteadeira.add(box(0.05, 1.05, 0.75, 0x9FC3D6, W-0.06, 1.28, 0.55));
  for(let i=-1;i<=1;i++){
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025,10,10), new THREE.MeshStandardMaterial({ color:0xFFF3C4, emissive:0xFFE9A6, emissiveIntensity:0.9 }));
    bulb.position.set(W-0.09, 1.72, 0.55 + i*0.28);
    wallGroups.penteadeira.add(bulb);
  }
  wallGroups.penteadeira.add(cyl(0.2, 0.3, 0xE8E4D8, W-0.5, 0.15, 1.15));
  wallGroups.penteadeira.add(box(0.3, 0.5, 0.55, 0xD8C9A9, W-0.4, 0.3, 1.75)); // gaveteiro simples

  /* ---------------------------------------------------------------
     HOTSPOTS
  --------------------------------------------------------------- */
  function hotspotSprite(){
    const c = document.createElement("canvas");
    c.width = 96; c.height = 96;
    const ctx = c.getContext("2d");
    ctx.beginPath(); ctx.arc(48,48,30,0,Math.PI*2);
    ctx.fillStyle = "rgba(27,144,189,0.55)"; ctx.fill();
    ctx.beginPath(); ctx.arc(48,48,20,0,Math.PI*2);
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.beginPath(); ctx.arc(48,48,8,0,Math.PI*2);
    ctx.fillStyle = "#1B90BD"; ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map:tex, depthTest:false, transparent:true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.3,0.3,0.3);
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
