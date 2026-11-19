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
import { DURACAO_S, LEGENDA } from "./reel05-data";

// dourado mais quente que o da identidade: o #f5e1b4 sumia na toalha branca e nos envelopes kraft
const OURO = "#ffcf5a";

// Reels 05 · "O melhor presente de Natal" (caso criminal com a mãe; vídeo e áudio já prontos da Bruna)
export const REEL05_FRAMES = Math.floor(Math.min(DURACAO_S, 31.7) * 30);
export const reel05Defaults = { showSafeArea: false };

const TITULO: [number, number] = [0, 3.5]; // gancho: até "caso criminal"

const Titulo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [, ate] = TITULO;
  if (t > ate) return null;
  const a = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const b = spring({ frame: frame - 7, fps, config: { damping: 13, stiffness: 120 } });
  const saida = interpolate(t, [ate - 0.25, ate], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 80,
        left: 0,
        width: WIDTH,
        textAlign: "center",
        opacity: saida,
        textShadow: "0 6px 30px rgba(40,28,26,0.7), 0 2px 6px rgba(40,28,26,0.55)",
      }}
    >
      <div
        style={{
          fontFamily: F.titulo,
          fontWeight: 700,
          fontSize: 112,
          letterSpacing: -3,
          color: CORES.claro,
          lineHeight: 1,
          transform: `translateY(${(1 - a) * -80}px) scale(${0.8 + a * 0.2})`,
          opacity: a,
        }}
      >
        O MELHOR
        <br />
        PRESENTE
      </div>
      <div
        style={{
          fontFamily: F.script,
          fontSize: 175,
          color: OURO,
          textShadow: "0 4px 18px rgba(40,28,26,0.9), 0 2px 4px rgba(40,28,26,0.9)",
          lineHeight: 1.1,
          marginTop: -4,
          transform: `scale(${b}) rotate(${(1 - b) * -10 - 3}deg)`,
        }}
      >
        de Natal
      </div>
    </div>
  );
};

// legenda palavra por palavra (1-3), branca, palavras-chave em dourado, sem animação
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
        fontSize: 80,
        lineHeight: 1.1,
        textShadow: "0 3px 14px rgba(40,28,26,0.75), 0 1px 3px rgba(40,28,26,0.8)",
      }}
    >
      {atual.w.map((w, i) => (
        <span key={i} style={{ color: w.k ? OURO : CORES.claro, opacity: s >= w.s ? 1 : 0 }}>
          {w.t}
          {i < atual.w.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};

// sons da lista da Bruna (public/sfx/bru, fora do Git), presos à palavra
const SONS: [number, string, number][] = [
  [0.25, "bru/brilho.wav", 0.6], // título "de Natal"
  [9.3, "click.wav", 0.75], // foto
  [9.46, "bru/suspeito.wav", 0.14], // suspeito
  [10.24, "click.wav", 0.75], // depoimento
  [11.02, "click.wav", 0.75], // jornal
  [18.44, "bru/toin.wav", 0.8], // não é mais ninguém
  [23.64, "bru/brilho2.wav", 0.4], // a melhor experiência
];
const Efeitos: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {SONS.map(([t, som, vol], i) => (
        <Sequence key={i} from={Math.round(t * fps)} durationInFrames={Math.round(1.6 * fps)}>
          <Audio src={staticFile(`sfx/${som}`)} volume={vol} />
        </Sequence>
      ))}
    </>
  );
};

export const Reel05: React.FC<{ showSafeArea: boolean }> = ({ showSafeArea }) => {
  useFontes();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: CORES.escuro }}>
      <OffthreadVideo src={staticFile("originais/natal.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Efeitos />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 900,
          background: "linear-gradient(rgba(60,44,40,0.7), rgba(60,44,40,0.35) 55%, transparent)",
          opacity: interpolate(frame, [90, 105], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 900,
          background: "linear-gradient(transparent, rgba(75,57,53,0.45))",
        }}
      />
      <Titulo />
      <Legenda />
      {showSafeArea ? (
        <div
          style={{
            position: "absolute",
            top: SAFE_AREA.top,
            bottom: SAFE_AREA.bottom,
            left: SAFE_AREA.sides,
            right: SAFE_AREA.sides,
            border: "3px dashed rgba(255,0,80,0.7)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
