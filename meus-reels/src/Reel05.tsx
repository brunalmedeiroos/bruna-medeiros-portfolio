import React, { useEffect, useState } from "react";
import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CORES } from "./identidade";
import { SAFE_AREA, WIDTH } from "./config";
import { useFontes } from "./Estilos";
import { DURACAO_S, LEGENDA } from "./reel05-data";


// Reels 05 · "O melhor presente de Natal" (caso criminal com a mãe; vídeo e áudio já prontos da Bruna)
export const REEL05_FRAMES = Math.floor(Math.min(DURACAO_S, 31.7) * 30);
export const reel05Defaults = { showSafeArea: false };

const TITULO: [number, number] = [0, 3.5]; // gancho: até "caso criminal"
const FRASE = ["O MELHOR", "PRESENTE", "DE NATAL"];
const DIGITA = 1.3; // segundos digitando a frase toda
const TOTAL_LETRAS = FRASE.join("").length;

// gancho digitando: frase inteira em Montserrat 800, branca, letra por letra
const Titulo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [, ate] = TITULO;
  if (t > ate) return null;
  const visiveis = Math.floor(interpolate(t, [0.1, 0.1 + DIGITA], [0, TOTAL_LETRAS], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const saida = interpolate(t, [ate - 0.25, ate], [1, 0], { extrapolateLeft: "clamp" });
  let n = 0;
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 90,
        left: 0,
        width: WIDTH,
        textAlign: "center",
        opacity: saida,
        fontFamily: "Montserrat",
        fontWeight: 800,
        fontSize: 118,
        letterSpacing: -2,
        lineHeight: 1.05,
        color: CORES.claro,
        textShadow: "0 6px 30px rgba(40,28,26,0.75), 0 2px 6px rgba(40,28,26,0.6)",
      }}
    >
      {FRASE.map((linha, li) => (
        <div key={li}>
          {linha.split("").map((ch, ci) => {
            const on = n++ < visiveis;
            return (
              <span key={ci} style={{ opacity: on ? 1 : 0 }}>
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// legenda palavra por palavra (1-3), toda branca em Montserrat, sem destaque e sem animação
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
        fontFamily: "Montserrat",
        fontWeight: 700,
        fontSize: 62,
        lineHeight: 1.15,
        textShadow: "0 3px 14px rgba(40,28,26,0.75), 0 1px 3px rgba(40,28,26,0.8)",
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

// sons da lista da Bruna (public/sfx/bru, fora do Git), presos à palavra
const SONS: [number, string, number, number?][] = [
  [0.1, "bru/teclado-bru.wav", 0.9, DIGITA + 0.15], // gancho digitando
  [9.3, "click.wav", 0.75], // foto dos suspeitos (trocar pelo click 2 dela)
  [9.46, "bru/suspeito.wav", 0.07], // suspeitos (mais baixo)
  [10.24, "click.wav", 0.75], // depoimento
  [11.02, "click.wav", 0.75], // jornal
  [8.46, "bru/pop-bru.wav", 0.35], // dois envelopes
  [18.44, "bru/toin.wav", 0.8], // não é mais ninguém
  [21.5, "bru/pop-bru.wav", 0.35], // quatro horas
  [23.64, "bru/brilho2.wav", 0.4], // a melhor experiência
  [27.42, "bru/pop-bru.wav", 0.35], // o próximo
  [31.33, "bru/brilho.wav", 0.6], // as duas batem as mãos no final
];
const Efeitos: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {SONS.map(([t, som, vol, dur], i) => (
        <Sequence key={i} from={Math.round(t * fps)} durationInFrames={Math.round((dur ?? 1.6) * fps)}>
          <Audio
            src={staticFile(`sfx/${som}`)}
            volume={(f) => (dur ? vol * interpolate(f, [dur * fps - 5, dur * fps], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : vol)}
          />
        </Sequence>
      ))}
    </>
  );
};

const useMontserrat = () => {
  const [h] = useState(() => delayRender("montserrat"));
  useEffect(() => {
    Promise.all(
      [700, 800].map((w) =>
        loadFont({ family: "Montserrat", url: staticFile(`fontes/montserrat-latin-${w}-normal.woff2`), weight: String(w) }),
      ),
    ).then(() => continueRender(h));
  }, [h]);
};

export const Reel05: React.FC<{ showSafeArea: boolean }> = ({ showSafeArea }) => {
  useFontes();
  useMontserrat();
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
