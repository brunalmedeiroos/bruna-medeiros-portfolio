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
import { DURACAO_S, LEGENDA, PECAS } from "./reel01-data";

export const REEL01_FRAMES = Math.ceil(DURACAO_S * 30);

export const reel01Defaults = { showSafeArea: false };

// ---------- vídeo falado (cortes alinhados pela fala) ----------
const Pecas: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {PECAS.map((p, i) => {
        const from = Math.round(p.inicio * fps);
        const to =
          i + 1 < PECAS.length
            ? Math.round(PECAS[i + 1].inicio * fps)
            : REEL01_FRAMES;
        const zoom = i % 2 === 0 ? 1.0 : 1.12; // zoom alternado disfarça o corte seco
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={Math.max(1, to - from)}
            premountFor={fps}
          >
            <AbsoluteFill
              style={{ overflow: "hidden", background: CORES.escuro }}
            >
              <OffthreadVideo
                src={staticFile(`originais/${p.video}.mp4`)}
                startFrom={Math.round(p.de * fps)}
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${zoom})`,
                  transformOrigin: "50% 32%",
                }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
};

// ---------- legenda: 1 a 3 palavras, branquinha, destaque dourado ----------
const Legenda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const atual = LEGENDA.find((c) => s >= c.s && s < c.e);
  if (!atual) return null;
  const local = (s - atual.s) * fps;
  const op = interpolate(local, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  const sc = interpolate(local, [0, 3], [0.92, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_AREA.sides + 40,
        right: SAFE_AREA.sides + 40,
        bottom: SAFE_AREA.bottom + 230,
        textAlign: "center",
        opacity: op,
        transform: `scale(${sc})`,
        fontFamily: F.legenda,
        fontSize: 104,
        lineHeight: 1.1,
        textShadow: "0 4px 18px rgba(75,57,53,0.28)",
      }}
    >
      {atual.w.map((w, i) => (
        <span key={i} style={{ color: w.k ? CORES.destaque : CORES.claro }}>
          {w.t}
          {i < atual.w.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};

// ---------- elementos por cima (cartões presos à fala) ----------
const Cartao: React.FC<{
  de: number;
  ate: number;
  rot: number;
  children: React.ReactNode;
  top?: number;
}> = ({ de, ate, rot, children, top = 190 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < de || t > ate) return null;
  const entrada = spring({
    frame: frame - de * fps,
    fps,
    config: { damping: 14, stiffness: 160 },
  });
  const saida = interpolate(t, [ate - 0.2, ate], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width: WIDTH,
        display: "flex",
        justifyContent: "center",
        opacity: saida,
        transform: `scale(${entrada}) rotate(${rot + (1 - entrada) * 14}deg)`,
      }}
    >
      <div
        style={{
          background: CORES.claro,
          color: CORES.escuro,
          borderRadius: 40,
          padding: "34px 44px",
          boxShadow: "0 18px 50px rgba(75,57,53,0.28)",
          fontFamily: F.titulo,
          fontWeight: 700,
          fontSize: 56,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Wifi: React.FC = () => (
  <svg
    width="96"
    height="96"
    viewBox="0 0 96 96"
    fill="none"
    stroke={CORES.escuro}
    strokeWidth="9"
    strokeLinecap="round"
  >
    <path d="M10 36c22-20 54-20 76 0" />
    <path d="M24 52c14-12 34-12 48 0" />
    <path d="M38 67c6-5 14-5 20 0" />
    <circle cx="48" cy="80" r="4" fill={CORES.escuro} />
  </svg>
);

const Item: React.FC<{ quando: number; texto: string }> = ({
  quando,
  texto,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame / fps, [quando, quando + 0.18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateX(${(1 - p) * -30}px)`,
        display: "flex",
        gap: 22,
        alignItems: "center",
      }}
    >
      <span style={{ color: "#b88a2a", fontSize: 64 }}>✓</span>
      <span>{texto}</span>
    </div>
  );
};

const Elementos: React.FC = () => (
  <>
    {/* cena 4: "é o Let's View" */}
    <Cartao de={25.1} ate={28.2} rot={-4}>
      <Img
        src={staticFile("letsview.webp")}
        style={{ width: 120, height: 120, borderRadius: 28 }}
      />
      <span>Let's View</span>
    </Cartao>
    {/* cena 5: "na mesma rede de Wi-Fi" */}
    <Cartao de={30.7} ate={33.6} rot={3}>
      <Wifi />
      <span>mesma rede Wi-Fi</span>
    </Cartao>
    {/* cena 6: lista com check, um item por vez, na hora da fala */}
    <Cartao de={34.6} ate={39.4} rot={-2} top={190}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minWidth: 560,
        }}
      >
        <Item quando={35.06} texto="computador" />
        <Item quando={35.64} texto="tablet" />
        <Item quando={36.4} texto="televisão" />
      </div>
    </Cartao>
  </>
);

// efeitos sonoros: pop quando um cartão entra, click a cada item do check
const SFX_POP = [25.1, 30.7, 34.6];
const SFX_CLICK = [35.06, 35.64, 36.4];
const Efeitos: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {SFX_POP.map((t) => (
        <Sequence
          key={`p${t}`}
          from={Math.round(t * fps)}
          durationInFrames={Math.round(0.4 * fps)}
        >
          <Audio src={staticFile("sfx/click.wav")} volume={0.5} />
        </Sequence>
      ))}
      {SFX_CLICK.map((t) => (
        <Sequence
          key={`c${t}`}
          from={Math.round(t * fps)}
          durationInFrames={Math.round(0.3 * fps)}
        >
          <Audio src={staticFile("sfx/click.wav")} volume={0.5} />
        </Sequence>
      ))}
    </>
  );
};

export const Reel01: React.FC<{ showSafeArea: boolean }> = ({
  showSafeArea,
}) => {
  useFontes();
  return (
    <AbsoluteFill style={{ background: CORES.escuro }}>
      <Audio src={staticFile("narracao-limpa.wav")} />
      <Efeitos />
      <Pecas />
      {/* véu suave embaixo para a legenda branca ler bem */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 760,
          background: "linear-gradient(transparent, rgba(75,57,53,0.42))",
        }}
      />
      <Elementos />
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
