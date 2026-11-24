import React from "react";
import {
  AbsoluteFill,
  Audio,
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
import { LEGENDA } from "./reel07-data";

// Reels 07 · Diário de reforma ep. 2, versão cortada pela Bru (IMG_3389, já com narração e cortes).
// Só por cima: título, frases de destaque, legenda e sons. O vídeo e a voz não são mexidos.
export const reel07Defaults = { showSafeArea: false };

const S = (n: string) => staticFile(`sfx/${n}`);
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- título ----------
const TIT = { texto: "DIÁRIO DE REFORMA", digita: 0.8, ep: 0.9, fim: 2.3 };
const Titulo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const n = Math.floor(interpolate(t, [0.05, TIT.digita], [0, TIT.texto.length], cl));
  const cursor = t < TIT.ep && Math.floor(t * 4) % 2 === 0 ? 1 : 0;
  const b = spring({ frame: frame - Math.round(TIT.ep * fps), fps, config: { damping: 13, stiffness: 140 } });
  const saida = interpolate(t, [TIT.fim - 0.25, TIT.fim], [1, 0], cl);
  return (
    <div style={{ position: "absolute", top: SAFE_AREA.top + 60, left: 0, width: WIDTH, textAlign: "center", opacity: saida, textShadow: "0 6px 28px rgba(75,57,53,0.55)" }}>
      <Audio src={S("teclado-bru.wav")} volume={(fr) => 0.9 * interpolate(fr, [0, Math.round(TIT.digita * fps) - 3, Math.round(TIT.digita * fps) + 2], [1, 1, 0], cl)} />
      <Sequence from={Math.round(TIT.ep * fps)} layout="none">
        <Audio src={S("brilho.wav")} volume={0.25} />
      </Sequence>
      <div style={{ fontFamily: F.titulo, fontWeight: 700, fontSize: 112, letterSpacing: -3, color: CORES.claro, lineHeight: 1 }}>
        {TIT.texto.slice(0, n)}
        <span style={{ color: CORES.destaque, opacity: cursor }}>|</span>
        <span style={{ opacity: 0 }}>{TIT.texto.slice(n)}</span>
      </div>
      <div style={{ fontFamily: F.script, fontSize: 130, color: CORES.destaque, lineHeight: 1.15, opacity: t >= TIT.ep ? 1 : 0, transform: `scale(${b}) rotate(${(1 - b) * -10 - 3}deg)` }}>ep. 2</div>
    </div>
  );
};

// ---------- frases de destaque no meio, digitando (como o "JÁ COMEÇOU!" do ep. 1) ----------
// de/ate em segundos do vídeo; a legenda some enquanto a frase aparece
const DESTAQUES = [
  { de: 13.7, ate: 14.72, texto: "E OLHA ISSO!" },
  { de: 23.84, ate: 26.9, texto: "COMPRINHAS\n+ PINTURA" },
  { de: 30.92, ate: 32.0, texto: "COMENTA QUARTO" },
];
const DIGITA = 0.4;
const Destaque: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const n = Math.floor(interpolate(t, [0, DIGITA], [0, texto.length], cl));
  const pisca = t > DIGITA && Math.floor(t * 2.5) % 2 === 1 ? 0 : 1;
  const sai = interpolate(t, [durationInFrames / fps - 0.18, durationInFrames / fps], [1, 0], cl);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: sai }}>
      <Audio src={S("teclado-bru.wav")} volume={(fr) => 0.9 * interpolate(fr, [0, Math.round(DIGITA * fps), Math.round(DIGITA * fps) + 4], [1, 1, 0], cl)} />
      <div style={{ fontFamily: F.legenda, fontSize: 96, lineHeight: 1.1, textAlign: "center", color: CORES.claro, whiteSpace: "pre", textShadow: "0 3px 6px rgba(40,30,28,0.6), 0 6px 26px rgba(40,30,28,0.65)" }}>
        {texto.slice(0, n)}
        <span style={{ color: CORES.destaque, opacity: pisca }}>|</span>
        <span style={{ opacity: 0 }}>{texto.slice(n)}</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------- legenda palavra por palavra, toda branca ----------
const Legenda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const atual = LEGENDA.find((c) => s >= c.s && s < c.e);
  if (!atual || DESTAQUES.some((d) => s >= d.de && s < d.ate)) return null;
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

// ---------- sons (sons da Bru, mais baixos que a voz, na palavra) ----------
// [segundo, arquivo, volume, duração máx. em s]
const SONS: [number, string, number, number?][] = [
  [3.62, "toin.wav", 0.95], // estava assim (antes)
  [9.4, "obra.wav", 0.3], // a reforma começou (martelinho baixo)
  [9.66, "obra.wav", 0.2],
  [11.92, "obra.wav", 0.3], // remoção dessa porta
  [12.18, "obra.wav", 0.2],
  [15.46, "brilho2.wav", 0.25, 1.5], // apaixonada
  [20.8, "brilho.wav", 0.25], // iluminação
];
const Sons: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {SONS.map(([t, n, v, max], i) => {
        const dur = Math.round((max ?? 1.4) * fps);
        return (
          <Sequence key={i} from={Math.round(t * fps)} durationInFrames={dur}>
            <Audio src={S(n)} volume={(fr) => v * interpolate(fr, [0, dur - 6, dur], [1, 1, 0], cl)} />
          </Sequence>
        );
      })}
    </>
  );
};

export const REEL07_FRAMES = Math.floor(37.8 * 30);

export const Reel07: React.FC<{ showSafeArea: boolean }> = ({ showSafeArea }) => {
  useFontes();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile("reforma/IMG_3389.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {DESTAQUES.map((d, i) => (
        <Sequence key={i} from={Math.round(d.de * fps)} durationInFrames={Math.round((d.ate - d.de) * fps)}>
          <Destaque texto={d.texto} />
        </Sequence>
      ))}
      <Sequence durationInFrames={Math.round(TIT.fim * fps)}>
        <Titulo />
      </Sequence>
      <Legenda />
      <Sons />
      {showSafeArea ? (
        <AbsoluteFill style={{ border: "2px dashed red", top: SAFE_AREA.top, bottom: SAFE_AREA.bottom, left: SAFE_AREA.sides, right: SAFE_AREA.sides }} />
      ) : null}
    </AbsoluteFill>
  );
};
