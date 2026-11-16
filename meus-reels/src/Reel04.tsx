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
import { siOpenai, siPinterest } from "simple-icons";

// Reels 04 · Diário de reforma ep. 1 (só B-roll + narração + giz nas paredes)
export const REEL04_FRAMES = Math.ceil(DURACAO_S * 30);
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

const FOTOS_QUARTO: { f: string; w: number; ar: number; x: number; y: number; r: number; de: number }[] = [
  { f: "parede-cama.jpg", w: 560, ar: 2000 / 3556, x: 360, y: 760, r: -7, de: 16.3 },
  { f: "parede-penteadeira.jpg", w: 330, ar: 2880 / 1620, x: 780, y: 820, r: 5, de: 16.9 },
  { f: "parede-janela.jpg", w: 560, ar: 2000 / 3556, x: 650, y: 1230, r: 4, de: 17.3 },
  { f: "parede-tv.jpg", w: 330, ar: 2880 / 1620, x: 280, y: 1250, r: -5, de: 17.7 },
];
const T_JUNTA: [number, number] = [18.15, 18.85];
const T_ENVIA: [number, number] = [19.45, 19.95];
const C_GPT = [540, 980];

const Juntei: React.FC<{ t0: number }> = ({ t0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = t0 + frame / fps;
  const f = (x: number) => Math.round((x - t0) * fps);
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const pin = spring({ frame: frame - f(15.94), fps, config: { damping: 11, stiffness: 170 } });
  const pinSai = interpolate(t, [19.2, 19.45], [1, 0], cl);
  const junta = interpolate(t, T_JUNTA, [0, 1], { ...cl, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const envia = interpolate(t, T_ENVIA, [0, 1], { ...cl, easing: (x) => x * x });
  const gpt = spring({ frame: frame - f(T_ENVIA[1] - 0.05), fps, config: { damping: 10, stiffness: 180 } });
  return (
    <AbsoluteFill style={{ background: CORES.escuro }}>
      <Img src={R("parede-cama.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.5)", transform: "scale(1.2)" }} />
      {/* logo do Pinterest em cima */}
      <div style={{ position: "absolute", top: 230, left: 0, width: WIDTH, display: "flex", justifyContent: "center", opacity: pinSai, transform: `scale(${pin})` }}>
        <Logo path={siPinterest.path} cor={`#${siPinterest.hex}`} fundo="#fff" tam={250} />
      </div>
      {/* fotos do quarto aparecendo, depois juntando numa pilha e indo pro ChatGPT */}
      {FOTOS_QUARTO.map((c, i) => {
        if (t < c.de) return null;
        const sp = spring({ frame: frame - f(c.de), fps, config: { damping: 13, stiffness: 220 } });
        const x = c.x + (C_GPT[0] - c.x) * junta;
        const y = c.y + (C_GPT[1] - c.y) * junta + i * -6 * junta;
        const r = c.r * (1 - junta) + [-3, 2, -1, 3][i] * junta;
        const esc = (0.6 + 0.4 * sp) * (1 - 0.25 * junta) * (1 - 0.92 * envia);
        if (envia >= 1) return null;
        return (
          <div
            key={c.f}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: c.w,
              background: "#fbfaf6",
              padding: 12,
              boxShadow: "0 18px 46px rgba(0,0,0,0.45)",
              opacity: Math.min(1, sp * 2) * (1 - envia * 0.6),
              transform: `translate(-50%, -50%) rotate(${r}deg) scale(${esc})`,
            }}
          >
            <Img src={R(c.f)} style={{ width: "100%", height: c.w * c.ar, objectFit: "cover", display: "block" }} />
          </div>
        );
      })}
      {/* logo do ChatGPT */}
      {t >= T_ENVIA[1] - 0.05 ? (
        <div style={{ position: "absolute", left: 0, width: WIDTH, top: C_GPT[1] - 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, transform: `scale(${gpt})` }}>
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

// ---------- título ----------
const Titulo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const b = spring({ frame: frame - 7, fps, config: { damping: 13, stiffness: 120 } });
  const saida = interpolate(frame / fps, [1.65, 1.88], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
  if (!atual) return null;
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
        textShadow: "0 4px 18px rgba(40,30,28,0.55)",
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
const giz = (p: Parede) => (t0: number) => <ParedeGiz p={p} t0={t0} />;
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
  [22.5, 23.6, v("IMG_2727", 127.6, 1.06)], // mas eu amei o projeto
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
        <ParedeGiz p={PISO_P} t0={t0} semFoto />
      </>
    ),
  ], // também quero mudar o piso
  [58.42, 59.5, () => <Projeto />], // esse é o projeto (as 4 paredes desenhadas)
  [59.5, 61.4, v("IMG_2896", 1.95, 1.06)], // a reforma começou já esta semana
  [61.4, 62.95, v("IMG_2699", 2.0)], // mas isso vai ficar pro próximo vídeo
  [62.95, DURACAO_S, v("IMG_2699", 39.4)], // é isso, beijo!
];

export const Reel04: React.FC<{ showSafeArea: boolean }> = ({ showSafeArea }) => {
  useFontes();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {CENAS.map(([de, ate, el], i) => {
        const from = Math.round(de * fps);
        const dur = Math.max(1, Math.round(ate * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={30}>
            {el(from / fps)}
          </Sequence>
        );
      })}
      <Sequence from={0} durationInFrames={Math.round(1.9 * fps)}>
        <Titulo />
      </Sequence>
      <Legenda />
      <Audio src={R("narracao.wav")} />
      {showSafeArea ? (
        <AbsoluteFill style={{ border: "2px dashed red", top: SAFE_AREA.top, bottom: SAFE_AREA.bottom, left: SAFE_AREA.sides, right: SAFE_AREA.sides }} />
      ) : null}
    </AbsoluteFill>
  );
};
