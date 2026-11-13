import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  Img,
  Sequence,
  delayRender,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { SAFE_AREA, WIDTH } from "./config";
import { LEGENDA as LEG_G1 } from "./reel03-g1-data";

// Reels 03 · UGC Blant (combo unhas). Vídeo já editado pela Bruna (cortes, áudio e sons);
// aqui entram só a legenda palavra por palavra e a frase de destaque do gancho.
// Identidade da MARCA, não da Bruna: branco + verde escuro, fonte Montserrat.
export const BLANT = { branco: "#ffffff", verde: "#2e6b4f" } as const;
const FONTE = "Montserrat";
const SOMBRA = "0 3px 14px rgba(0,0,0,0.38), 0 1px 3px rgba(0,0,0,0.25)";

type Palavra = { t: string; k: boolean; s: number };
type Trecho = { s: number; e: number; w: Palavra[] };

export type Gancho = {
  video: string;
  legenda: Trecho[];
  duracao: number;
  destaque: { de: number; ate: number; linhas: { t: string; verde?: boolean }[] };
  // quadros da Bruna recortada (fundo removido) para a frase ficar ATRÁS dela
  recorte: { pasta: string; quadros: number };
};

export const GANCHO_1: Gancho = {
  video: "originais/blant-g1.mp4",
  legenda: LEG_G1,
  duracao: 58.05,
  destaque: {
    de: 0,
    ate: 5.9,
    linhas: [
      { t: "unhas frágeis" },
      { t: "no emagrecimento", verde: true },
      { t: "acelerado?", verde: true },
    ],
  },
  recorte: { pasta: "recorte-03g1", quadros: 180 },
};

const useMontserrat = () => {
  const [h] = useState(() => delayRender("montserrat"));
  useEffect(() => {
    Promise.all(
      [500, 700, 800].map((w) =>
        loadFont({
          family: FONTE,
          url: staticFile(`fontes/montserrat-latin-${w}-normal.woff2`),
          weight: String(w),
        }),
      ),
    ).then(() => continueRender(h));
  }, [h]);
};

// frase de destaque do gancho: cartão branco no alto, linhas entram uma a uma
const Destaque: React.FC<{ g: Gancho }> = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { de, ate, linhas } = g.destaque;
  if (t < de || t > ate) return null;
  const saida = interpolate(t, [ate - 0.2, ate], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 50, // logo acima da cabeça: a Bruna recortada passa na frente
        left: 0,
        width: WIDTH,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        opacity: saida,
      }}
    >
      {linhas.map((l, i) => {
        const e = spring({ frame: frame - de * fps - i * 5, fps, config: { damping: 14, stiffness: 170 } });
        return (
          <div
            key={i}
            style={{
              background: l.verde ? BLANT.verde : BLANT.branco,
              color: l.verde ? BLANT.branco : BLANT.verde,
              fontFamily: FONTE,
              fontWeight: 800,
              fontSize: 66,
              lineHeight: 1.1,
              padding: "12px 30px",
              borderRadius: 22,
              boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
              transform: `scale(${e}) rotate(${i % 2 === 0 ? -2 : 1.5}deg)`,
              opacity: e,
            }}
          >
            {l.t}
          </div>
        );
      })}
    </div>
  );
};

// legenda: grupos de 1 a 3 palavras, cada palavra surge na hora da fala, sem animação
const Legenda: React.FC<{ g: Gancho }> = ({ g }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const atual = g.legenda.find((c) => s >= c.s && s < c.e);
  if (!atual) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_AREA.sides + 40,
        right: SAFE_AREA.sides + 40,
        bottom: SAFE_AREA.bottom + 430,
        textAlign: "center",
        fontFamily: FONTE,
        fontWeight: 700,
        fontSize: 62,
        lineHeight: 1.15,
        textShadow: SOMBRA,
      }}
    >
      {atual.w.map((w, i) => (
        <span
          key={i}
          style={{
            color: w.k ? BLANT.verde : BLANT.branco,
            opacity: s >= w.s ? 1 : 0,
            // verde escuro ganha um brilho claro por trás para ler sobre fundos escuros
            textShadow: w.k ? "0 0 14px rgba(255,255,255,0.85), 0 0 4px rgba(255,255,255,0.9)" : SOMBRA,
          }}
        >
          {w.t}
          {i < atual.w.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};

const Recorte: React.FC<{ g: Gancho }> = ({ g }) => {
  const frame = useCurrentFrame();
  if (frame >= g.recorte.quadros) return null;
  return (
    <Img
      src={staticFile(`${g.recorte.pasta}/f${String(frame + 1).padStart(4, "0")}.png`)}
      style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
};

export const Reel03: React.FC<{ gancho: Gancho; showSafeArea: boolean }> = ({ gancho, showSafeArea }) => {
  useMontserrat();
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <OffthreadVideo src={staticFile(gancho.video)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {/* camadas: vídeo → frase do gancho → Bruna recortada por cima → legenda */}
      <Destaque g={gancho} />
      <Recorte g={gancho} />
      <Sequence from={Math.round(gancho.destaque.de * 30)} durationInFrames={30}>
        <Audio src={staticFile("sfx/brilho.wav")} volume={0.5} />
      </Sequence>
      <Legenda g={gancho} />
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
