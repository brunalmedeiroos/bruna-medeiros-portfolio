import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CORES } from "./identidade";
import { SAFE_AREA, WIDTH } from "./config";
import { F, useFontes } from "./Estilos";
import { DURACAO_S, LEGENDA } from "./reel04-data";
import { ParedeGiz, type Parede } from "./Giz";
import { CAMA, JANELA, PENTEADEIRA, PISO, TV } from "./reel04-paredes";
import { T, TV as TN } from "./reel04-tempo";
import { siOpenai, siPinterest } from "simple-icons";

// Reels 04 · Diário de reforma ep. 1 (só B-roll + narração + giz nas paredes)
export const reel04Defaults = { showSafeArea: false };

const R = (n: string) => staticFile(`reforma/${n}`);

// ---------- peças ----------
const Clip: React.FC<{ n: string; de: number; zoom?: number }> = ({ n, de, zoom = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const z = interpolate(frame, [0, durationInFrames], [zoom, zoom + 0.04]);
  return (
    <AbsoluteFill style={{ transform: `scale(${z})` }}>
      <OffthreadVideo src={R(`${n}.mp4`)} startFrom={Math.round(de * fps)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

// foto com zoom lento (Ken Burns): de [cx, cy, z] até [cx, cy, z], coordenadas da foto
const FotoKB: React.FC<{ n: string; W: number; H: number; a: [number, number, number]; b: [number, number, number] }> = ({ n, W, H, a, b }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const k = frame / durationInFrames;
  const [cx, cy, z] = a.map((v, i) => v + (b[i] - v) * k);
  const s = (height / H) * z;
  const x0 = Math.min(Math.max(cx - width / 2 / s, 0), W - width / s);
  const y0 = Math.min(Math.max(cy - height / 2 / s, 0), H - height / s);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={R(n)} style={{ position: "absolute", width: W, height: H, transformOrigin: "0 0", transform: `scale(${s}) translate(${-x0}px, ${-y0}px)` }} />
    </AbsoluteFill>
  );
};

// ---------- "juntei referências do Pinterest com fotos do meu quarto e mandei pro ChatGPT" ----------
const Logo: React.FC<{ path: string; cor: string; fundo: string; tam: number }> = ({ path, cor, fundo, tam }) => (
  <div style={{ width: tam, height: tam, borderRadius: tam, background: fundo, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 14px 40px rgba(0,0,0,0.35)" }}>
    <svg viewBox="0 0 24 24" width={tam * 0.62} height={tam * 0.62}>
      <path d={path} fill={cor} />
    </svg>
  </div>
);

const QUARTO = ["parede-cama.jpg", "parede-penteadeira.jpg", "parede-janela.jpg", "parede-tv.jpg"];
const PINS = ["pin-1.jpg", "pin-2.jpg", "pin-3.jpg", "pin-4.jpg", "pin-5.jpg"];
const PIN_AR = [1264 / 736, 1308 / 736, 678 / 735, 1177 / 736, 1119 / 736];
// tempos (segundos da narração)
const J = {
  toque: 16.12, // dedo no ícone do Pinterest
  abre: [16.28, 16.5] as [number, number],
  rola: [16.5, 17.62] as [number, number],
  fotos: [17.62, 18.5] as [number, number], // fotos do quarto rapidinho
  junta: [18.5, 18.95] as [number, number], // refs + fotos viram um painel
  envia: [19.45, 19.95] as [number, number], // painel entra no ChatGPT
};
const C_GPT = [540, 960];
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Dedo: React.FC<{ x: number; y: number; op: number; s?: number }> = ({ x, y, op, s = 1 }) => (
  <div style={{ position: "absolute", left: x - 55, top: y - 55, width: 110, height: 110, borderRadius: 110, background: "rgba(255,255,255,0.55)", border: "5px solid rgba(255,255,255,0.95)", boxShadow: "0 6px 24px rgba(0,0,0,0.3)", opacity: op, transform: `scale(${s})` }} />
);

const Juntei: React.FC<{ t0: number }> = ({ t0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = TN(t0 + frame / fps); // tempo da narração antiga
  const f = (x: number) => Math.round((T(x) - t0) * fps);

  // A) ícone do app + toque
  if (t < J.abre[1]) {
    const pop = spring({ frame, fps, config: { damping: 12, stiffness: 170 } });
    const aperta = t >= J.toque ? interpolate(t, [J.toque, J.toque + 0.08, J.abre[0]], [1, 0.88, 1], cl) : 1;
    const abre = interpolate(t, J.abre, [0, 1], { ...cl, easing: (x) => x * x });
    return (
      <AbsoluteFill style={{ background: CORES.escuro }}>
        <Img src={R("parede-cama.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.5)", transform: "scale(1.2)" }} />
        <div style={{ position: "absolute", left: 540 - 140, top: 820 - 140, width: 280, height: 280, borderRadius: 66, background: `#${siPinterest.hex}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 50px rgba(0,0,0,0.4)", transform: `scale(${pop * aperta})` }}>
          <svg viewBox="0 0 24 24" width={180} height={180}><path d={siPinterest.path} fill="#fff" /></svg>
        </div>
        <div style={{ position: "absolute", top: 820 + 170, width: WIDTH, textAlign: "center", fontFamily: F.titulo, fontWeight: 700, fontSize: 46, color: CORES.claro, opacity: pop }}>Pinterest</div>
        {t >= J.toque - 0.06 ? <Dedo x={560} y={840} op={interpolate(t, [J.toque - 0.06, J.toque, J.abre[1]], [0, 1, 0], cl)} s={interpolate(t, [J.toque - 0.06, J.toque], [1.3, 1], cl)} /> : null}
        {/* app abrindo a partir do ícone */}
        <div style={{ position: "absolute", inset: 0, background: "#fff", clipPath: `circle(${abre * 1200}px at 540px 820px)` }} />
      </AbsoluteFill>
    );
  }

  // B) feed do Pinterest rolando  ·  C) fotos do quarto  ·  D) painel  ·  E) ChatGPT
  if (t < J.fotos[0]) {
    const rola = interpolate(t, J.rola, [0, 1], { ...cl, easing: (x) => 1 - Math.pow(1 - x, 2.2) });
    const colW = 507;
    const cols: { f: string; h: number }[][] = [[], []];
    const alt = [0, 0];
    for (let k = 0; k < 12; k++) {
      const i = k % PINS.length;
      const c = alt[0] <= alt[1] ? 0 : 1;
      const h = colW * PIN_AR[i];
      cols[c].push({ f: PINS[i], h });
      alt[c] += h + 18;
    }
    return (
      <AbsoluteFill style={{ background: "#fff" }}>
        <div style={{ position: "absolute", top: 300 - rola * 2100, left: 24, right: 24, display: "flex", gap: 18 }}>
          {cols.map((col, c) => (
            <div key={c} style={{ width: colW, display: "flex", flexDirection: "column", gap: 18, marginTop: c === 1 ? 70 : 0 }}>
              {col.map((it, j) => (
                <Img key={j} src={R(it.f)} style={{ width: colW, height: it.h, objectFit: "cover", borderRadius: 30, display: "block" }} />
              ))}
            </div>
          ))}
        </div>
        {/* barra de busca */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 290, background: "#fff", display: "flex", alignItems: "flex-end", padding: "0 34px 28px", gap: 22 }}>
          <svg viewBox="0 0 24 24" width={74} height={74}><path d={siPinterest.path} fill={`#${siPinterest.hex}`} /></svg>
          <div style={{ flex: 1, height: 84, borderRadius: 84, background: "#efefef", display: "flex", alignItems: "center", padding: "0 34px", fontFamily: F.titulo, fontWeight: 600, fontSize: 38, color: "#555" }}>quarto azul e branco</div>
        </div>
        <Dedo x={720} y={interpolate(t, J.rola, [1500, 700], cl)} op={interpolate(t, [J.rola[0], J.rola[0] + 0.08, J.rola[1] - 0.15, J.rola[1]], [0, 1, 1, 0], cl)} />
      </AbsoluteFill>
    );
  }
  if (t < J.junta[0]) {
    const cada = (J.fotos[1] - J.fotos[0]) / QUARTO.length;
    const i = Math.min(QUARTO.length - 1, Math.floor((t - J.fotos[0]) / cada));
    const k = (t - J.fotos[0] - i * cada) / cada;
    return (
      <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
        <Img src={R(QUARTO[i])} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.12 - 0.08 * k})` }} />
        <AbsoluteFill style={{ background: "#fff", opacity: interpolate(k, [0, 0.25], [0.5, 0], cl) }} />
      </AbsoluteFill>
    );
  }
  // D) painel: refs (esquerda) + fotos do quarto (direita) se juntando em 3x3
  const tiles = [PINS[0], QUARTO[0], PINS[1], QUARTO[1], PINS[2], QUARTO[2], PINS[3], QUARTO[3], PINS[4]];
  const envia = interpolate(t, J.envia, [0, 1], { ...cl, easing: (x) => x * x });
  const gpt = spring({ frame: frame - f(J.envia[1] - 0.05), fps, config: { damping: 10, stiffness: 180 } });
  const tw = 318, th = 420, gap = 16, top = 330;
  return (
    <AbsoluteFill style={{ background: "#f3eee6" }}>
      {envia < 1
        ? tiles.map((tf, n) => {
            const r = Math.floor(n / 3), c = n % 3;
            const ex = 540 + (c - 1) * (tw + gap);
            const ey = top + r * (th + gap) + th / 2;
            const ehRef = tf.startsWith("pin");
            const sp = spring({ frame: frame - f(J.junta[0] + n * 0.035), fps, config: { damping: 15, stiffness: 170 } });
            const sx = ehRef ? -400 : 1480;
            const x = sx + (ex - sx) * sp;
            const x2 = x + (C_GPT[0] - x) * envia;
            const y2 = ey + (C_GPT[1] - ey) * envia;
            return (
              <div key={n} style={{ position: "absolute", left: x2 - tw / 2, top: y2 - th / 2, width: tw, height: th, borderRadius: 26, overflow: "hidden", boxShadow: "0 10px 30px rgba(75,57,53,0.25)", transform: `rotate(${(1 - sp) * (ehRef ? -14 : 14)}deg) scale(${1 - 0.9 * envia})`, opacity: 1 - envia * 0.5 }}>
                <Img src={R(tf)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            );
          })
        : null}
      {t >= J.envia[1] - 0.05 ? (
        <div style={{ position: "absolute", left: 0, width: WIDTH, top: C_GPT[1] - 150, display: "flex", justifyContent: "center", transform: `scale(${gpt})` }}>
          <Logo path={siOpenai.path} cor="#fff" fundo="#0d0d0d" tam={300} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- "esse é o projeto": as 4 paredes já desenhadas, bem rápido ----------
const Projeto: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ps = [CAMA, PENTEADEIRA, TV, JANELA];
  const i = Math.min(ps.length - 1, Math.floor((frame / durationInFrames) * ps.length));
  return <ParedeGiz p={ps[i]} t0={ps[i].ate + 1} />;
};


// ---------- efeitos sonoros ----------
const JA = { de: 59.88, ate: 61.4, texto: "JÁ COMEÇOU!", digita: 0.4 };
const S = (n: string) => staticFile(`sfx/${n}`);
// sons de verdade (CC0: Meta Open Sound + free-sfx-download) e o brilho que a Bru mandou
// [segundo da narração, arquivo, volume, duração máx. em s]
const UI_SONS: [number, string, number, number?][] = [
  [0.0, "brilho.wav", 0.25], // título
  [2.94, "pop-1.wav", 0.45], // durmo
  [3.3, "pop-2.wav", 0.45], // trabalho
  [3.8, "pop-3.wav", 0.45], // e gravo
  [6.2, "toin.wav", 0.95], // não tá nem um pouco bonito (toin, da Bru)
  [8.7, "obra.wav", 0.32], // reformar (martelinho de leve)
  [8.94, "obra.wav", 0.22],
  [11.0, "brilho.wav", 0.22], // gravação
  [12.74, "camera.wav", 0.6], // bora lá (flash)
  [J.toque, "click.wav", 0.5], // toque no ícone do Pinterest
  [J.rola[0], "whoosh.wav", 0.12], // rolando o feed
  ...[0, 1, 2, 3].map((i): [number, string, number] => [J.fotos[0] + (i * (J.fotos[1] - J.fotos[0])) / 4, "click.wav", 0.32]), // fotos do quarto
  [J.junta[0], "whoosh.wav", 0.12], // painel se juntando
  [J.envia[0], "whoosh.wav", 0.14], // indo pro ChatGPT
  [J.envia[1], "click.wav", 0.45], // logo do ChatGPT
  [22.54, "brilho2.wav", 0.25, 1.5], // amei (brilho 2, da Bru)
  [41.02, "toin.wav", 0.95], // que eu ainda não tenho a TV (toin, da Bru)
  ...[0, 1, 2, 3].map((i): [number, string, number] => [58.42 + i * 0.27, "click.wav", 0.3]), // "esse é o projeto"
  [JA.de, "teclado-bru.wav", 0.9, JA.digita + 0.2], // "já começou" digitando
];
// giz de verdade (gravação que a Bru mandou, 7,6 s): cada desenho pega um trecho diferente
const GIZ_SONS = [CAMA, PENTEADEIRA, TV, JANELA].flatMap((p) => p.elementos.filter((e) => !e.led)).concat([PISO]);
const Sons: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {GIZ_SONS.map((e, i) => {
        const dur = Math.round(Math.min(T(e.t + e.dur) - T(e.t) + 0.1, 3) * fps);
        return (
          <Sequence key={`g${i}`} from={Math.round(T(e.t) * fps)} durationInFrames={dur}>
            <Audio
              src={S("giz-real.wav")}
              startFrom={Math.round(((i * 1.37) % 4.3) * fps)}
              volume={(fr) => 0.13 * interpolate(fr, [0, 3, dur - 5, dur], [0, 1, 1, 0], cl)}
            />
          </Sequence>
        );
      })}
      {UI_SONS.map(([t, n, v, max], i) => {
        if (i > 0 && T(t) < 0) return null;
        const dur = Math.round((max ?? 1.4) * fps);
        return (
          <Sequence key={`u${i}`} from={Math.max(0, Math.round(T(t) * fps))} durationInFrames={dur}>
            <Audio src={S(n)} volume={(fr) => v * interpolate(fr, [0, dur - 6, dur], [1, 1, 0], cl)} />
          </Sequence>
        );
      })}
    </>
  );
};

// ---------- "bora lá": flash quente ----------
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 2, 4, 13], [0, 1, 0.9, 0], cl);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background: "radial-gradient(circle at 50% 45%, #fff8e6 0%, #ffd08a 38%, #ff9a4d 75%, #e8743a 100%)",
        mixBlendMode: "screen",
      }}
    />
  );
};

// ---------- "já começou" no meio da tela, digitando ----------
const JaComecou: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const n = Math.floor(interpolate(t, [0, JA.digita], [0, JA.texto.length], cl));
  const pisca = t > JA.digita && Math.floor(t * 2.5) % 2 === 1 ? 0 : 1;
  const sai = interpolate(t, [durationInFrames / fps - 0.18, durationInFrames / fps], [1, 0], cl);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: sai }}>
      <div
        style={{
          fontFamily: F.legenda,
          fontSize: 96,
          color: CORES.claro,
          whiteSpace: "pre",
          textShadow: "0 3px 6px rgba(40,30,28,0.6), 0 6px 26px rgba(40,30,28,0.65)",
        }}
      >
        {JA.texto.slice(0, n)}
        <span style={{ color: CORES.destaque, opacity: pisca }}>|</span>
        <span style={{ opacity: 0 }}>{JA.texto.slice(n)}</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------- título ----------
const Titulo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const b = spring({ frame: frame - 7, fps, config: { damping: 13, stiffness: 120 } });
  const saida = interpolate(frame / fps, [1.45, 1.68], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: SAFE_AREA.top + 60, left: 0, width: WIDTH, textAlign: "center", opacity: saida, textShadow: "0 6px 28px rgba(75,57,53,0.55)" }}>
      <div style={{ fontFamily: F.titulo, fontWeight: 700, fontSize: 112, letterSpacing: -3, color: CORES.claro, lineHeight: 1, transform: `translateY(${(1 - a) * -80}px) scale(${0.8 + a * 0.2})`, opacity: a }}>
        DIÁRIO DE REFORMA
      </div>
      <div style={{ fontFamily: F.script, fontSize: 130, color: CORES.destaque, lineHeight: 1.15, transform: `scale(${b}) rotate(${(1 - b) * -10 - 3}deg)` }}>ep. 1</div>
    </div>
  );
};

// ---------- legenda palavra por palavra, toda branca ----------
const Legenda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const atual = LEGENDA.find((c) => s >= c.s && s < c.e);
  if (!atual || (s >= T(JA.de) && s < T(JA.ate))) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_AREA.sides + 40,
        right: SAFE_AREA.sides + 40,
        bottom: SAFE_AREA.bottom + 430,
        textAlign: "center",
        fontFamily: F.legenda,
        fontSize: 76,
        lineHeight: 1.1,
        textShadow: "0 2px 4px rgba(40,30,28,0.55), 0 4px 18px rgba(40,30,28,0.6)",
      }}
    >
      {atual.w.map((w, i) => (
        <span key={i} style={{ color: CORES.claro, opacity: s >= w.s ? 1 : 0 }}>
          {w.t}
          {i < atual.w.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};

// ---------- mapa de cenas (segundos da narração) ----------
type Cena = [number, number, (t0: number) => React.ReactNode];
const v = (n: string, de: number, zoom = 1) => () => <Clip n={n} de={de} zoom={zoom} />;
const giz = (p: Parede) => (t0: number) => <ParedeGiz p={p} t0={t0} conv={TN} />;
const PISO_P: Parede = { foto: "", W: 1080, H: 1920, de: 56.75, ate: 58.42, cam: [[0, 540, 960, 1]], elementos: [PISO] };

export const CENAS: Cena[] = [
  [0.0, 1.88, v("IMG_2890", 0.3)], // talvez eu esteja me metendo em uma loucura
  [1.88, 2.94, v("IMG_2891", 0.0, 1.05)], // mas esse é o quarto onde
  [2.94, 3.3, v("IMG_2890", 4.7)], // eu durmo
  [3.3, 3.8, v("copy_DDDA", 0.3)], // trabalho
  [3.8, 4.54, v("IMG_2727", 18)], // e gravo
  [4.54, 5.24, v("IMG_2727", 61, 1.08)], // todos os meus conteúdos
  [5.24, 6.3, () => <FotoKB n="parede-tv.jpg" W={1620} H={2880} a={[760, 1350, 1.15]} b={[760, 1350, 1.3]} />], // convenhamos
  [6.3, 7.7, () => <FotoKB n="parede-janela.jpg" W={3556} H={2000} a={[600, 1000, 1.0]} b={[700, 1000, 1.12]} />], // não tá nem um pouco bonito
  [7.7, 9.56, v("IMG_2893", 0.3)], // por isso eu resolvi reformar o meu quarto
  [9.56, 10.5, v("IMG_2727", 95)], // e transformar também
  [10.5, 11.46, v("IMG_2727", 125, 1.08)], // no meu espaço de gravação
  [11.46, 12.74, v("IMG_2699", 35.5)], // e vocês vão acompanhar tudo
  [12.74, 13.3, v("IMG_2890", 6.6)], // bora lá?
  [13.3, 14.7, v("copy_DDDA", 0.9)], // pra começar eu tinha que ter (trecho contínuo, sem o corte do clipe)
  [14.7, 15.94, v("copy_DDDA", 6.75, 1.08)], // uma ideia de como eu queria
  [15.94, 21.28, (t0) => <Juntei t0={t0} />], // Pinterest + fotos do quarto juntando + ChatGPT
  [21.28, 22.5, v("IMG_2890", 2.2)], // e olha, não é por nada
  [22.5, 23.6, v("IMG_2890", 5.2, 1.06)], // mas eu amei o projeto (rindo na cama)
  [23.6, 24.5, v("IMG_2699", 37.2)], // que a gente criou, tá?
  [24.5, 25.54, v("IMG_2891", 2.6)], // então vamos para a ideia
  [CAMA.de, CAMA.ate, giz(CAMA)],
  [PENTEADEIRA.de, PENTEADEIRA.ate, giz(PENTEADEIRA)],
  [TV.de, TV.ate, giz(TV)],
  [JANELA.de, JANELA.ate, giz(JANELA)],
  [
    56.75,
    58.42,
    (t0) => (
      <>
        <Clip n="IMG_2896" de={0.2} />
        <AbsoluteFill style={{ background: "rgba(40,30,28,0.28)" }} />
        <ParedeGiz p={PISO_P} t0={t0} conv={TN} semFoto />
      </>
    ),
  ], // também quero mudar o piso
  [58.42, 59.5, () => <Projeto />], // esse é o projeto (as 4 paredes desenhadas)
  [59.5, 61.4, v("IMG_2896", 1.95, 1.06)], // a reforma começou já esta semana
  [61.4, 62.95, v("IMG_2699", 2.0)], // mas isso vai ficar pro próximo vídeo
  [62.95, 70, v("IMG_2699", 39.4)], // é isso, beijo!
];

// tudo em "tempo da narração" (segundos do áudio original)
const Conteudo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {CENAS.map(([de, ate, el], i) => {
        // cenas marcadas na narração antiga, convertidas para a fala nova
        const from = Math.max(0, Math.round(T(de) * fps));
        const dur = Math.round(T(ate) * fps) - from;
        if (dur <= 0) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={30}>
            {el(from / fps)}
          </Sequence>
        );
      })}
      <Sequence from={Math.round(T(12.74) * fps)} durationInFrames={14}>
        <Flash />
      </Sequence>
      <Sequence from={Math.round(T(JA.de) * fps)} durationInFrames={Math.round((T(JA.ate) - T(JA.de)) * fps)}>
        <JaComecou />
      </Sequence>
      <Sequence durationInFrames={Math.round(1.7 * fps)}>
        <Titulo />
      </Sequence>
      <Legenda />
      <Audio src={R("narracao2.wav")} />
      <Sons />
    </AbsoluteFill>
  );
};

export const REEL04_FRAMES = Math.ceil(DURACAO_S * 30);

export const Reel04: React.FC<{ showSafeArea: boolean }> = ({ showSafeArea }) => {
  useFontes();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Conteudo />
      {showSafeArea ? (
        <AbsoluteFill style={{ border: "2px dashed red", top: SAFE_AREA.top, bottom: SAFE_AREA.bottom, left: SAFE_AREA.sides, right: SAFE_AREA.sides }} />
      ) : null}
    </AbsoluteFill>
  );
};
