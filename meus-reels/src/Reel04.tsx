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

// fotos que caem uma por cima da outra, como fotos impressas
const Cartas: React.FC<{ fotos: string[]; fundo: string; legendaAlta?: boolean }> = ({ fotos, fundo }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const cada = durationInFrames / fotos.length;
  const atual = Math.min(fotos.length - 1, Math.floor(frame / cada));
  return (
    <AbsoluteFill style={{ background: CORES.escuro }}>
      <Img src={R(fundo)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.55)", transform: "scale(1.15)" }} />
      {fotos.map((f, i) => {
        if (i > atual) return null;
        const sp = spring({ frame: frame - i * cada, fps, config: { damping: 15, stiffness: 190 } });
        const rot = [-4, 3, -2, 4, -3][i % 5];
        const dx = [-30, 40, -10, 25, 0][i % 5];
        return (
          <div
            key={f}
            style={{
              position: "absolute",
              left: 70 + dx,
              right: 70 - dx,
              top: 560 + i * 18,
              background: "#fbfaf6",
              padding: "22px 22px 70px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              transform: `translateY(${(1 - sp) * 900}px) rotate(${rot + (1 - sp) * 12}deg)`,
            }}
          >
            <Img src={R(f)} style={{ width: "100%", maxHeight: 900, objectFit: "cover", display: "block" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fotos = ["ref-cama.jpg", "ref-penteadeira.jpg", "ref-tv.jpg", "ref-janela.jpg"];
  return (
    <AbsoluteFill style={{ background: CORES.escuro, padding: "330px 50px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignContent: "start" }}>
      {fotos.map((f, i) => {
        const sp = spring({ frame: frame - i * 3, fps, config: { damping: 14, stiffness: 200 } });
        return (
          <div key={f} style={{ background: "#fbfaf6", padding: 12, transform: `scale(${sp}) rotate(${[-2, 2, 1.5, -1.5][i]}deg)`, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
            <Img src={R(f)} style={{ width: "100%", height: 560, objectFit: "cover", display: "block" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
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
  [13.3, 14.7, v("copy_DDDA", 1.2)], // pra começar eu tinha que ter
  [14.7, 15.94, v("copy_DDDA", 6.6, 1.08)], // uma ideia de como eu queria
  [15.94, 18.8, () => <Cartas fotos={["parede-cama.jpg", "parede-janela.jpg", "parede-penteadeira.jpg", "parede-tv.jpg"]} fundo="parede-cama.jpg" />], // referências + fotos do quarto
  [18.8, 20.0, v("IMG_2892", 0.2)], // e mandei pro meu querido arquiteto
  [20.0, 21.28, v("copy_DDDA", 3.0)], // chatGPT
  [21.28, 24.5, () => <Cartas fotos={["ref-cama.jpg", "ref-penteadeira.jpg", "ref-tv.jpg", "ref-janela.jpg"]} fundo="ref-cama.jpg" />], // eu amei o projeto
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
  [58.42, 59.5, () => <Grade />], // esse é o projeto
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
