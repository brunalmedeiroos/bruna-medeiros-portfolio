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
import { DURACAO_S, LEGENDA } from "./reel02-data";


// Reels 02 · bastidores de uma publi (IMG_2624, vídeo já cortado pela Bruna)
export const REEL02_FRAMES = Math.ceil(DURACAO_S * 30);
export const reel02Defaults = { showSafeArea: false };

// momentos presos à fala (segundos da transcrição)
const T = {
  titulo: [0, 2.0],
  lista: [5.72, 10.6],
  itens: [6.54, 8.0, 9.54],
  espelho: [10.98, 13.9],
  controle: [15.36, 17.0],
  angulos: [18.9, 20.9],
  troca: [24.02, 27.3],
  trocaItens: [24.02, 26.7],
  gigante: [30.44, 31.75],
  perfil: [34.02, 35.4],
};


// ---------- título de abertura ----------
const Titulo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [de, ate] = T.titulo;
  if (t > ate) return null;
  const a = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const b = spring({ frame: frame - 7, fps, config: { damping: 13, stiffness: 120 } });
  const saida = interpolate(t, [ate - 0.25, ate], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 70,
        left: 0,
        width: WIDTH,
        textAlign: "center",
        opacity: saida * (de <= t ? 1 : 0),
        textShadow: "0 6px 28px rgba(75,57,53,0.45)",
      }}
    >
      <div
        style={{
          fontFamily: F.titulo,
          fontWeight: 700,
          fontSize: 148,
          letterSpacing: -4,
          color: CORES.claro,
          lineHeight: 1,
          transform: `translateY(${(1 - a) * -80}px) scale(${0.8 + a * 0.2})`,
          opacity: a,
        }}
      >
        BASTIDORES
      </div>
      <div
        style={{
          fontFamily: F.script,
          fontSize: 150,
          color: CORES.destaque,
          lineHeight: 1.1,
          marginTop: -6,
          transform: `scale(${b}) rotate(${(1 - b) * -10 - 3}deg)`,
        }}
      >
        de uma publi
      </div>
    </div>
  );
};

// ---------- legenda: 1 a 3 palavras, branquinha, destaque dourado ----------
const Legenda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  if (s >= T.gigante[0] && s < T.gigante[1]) return null; // a palavra gigante fala por si
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
        textShadow: "0 4px 18px rgba(75,57,53,0.28)",
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

// ---------- cartões (mesmo estilo do Reels 01) ----------
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
  const entrada = spring({ frame: frame - de * fps, fps, config: { damping: 14, stiffness: 160 } });
  const saida = interpolate(t, [ate - 0.2, ate], [1, 0], { extrapolateLeft: "clamp" });
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
          padding: "30px 44px",
          boxShadow: "0 18px 50px rgba(75,57,53,0.28)",
          fontFamily: F.titulo,
          fontWeight: 700,
          fontSize: 54,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Rotulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      background: CORES.destaque,
      borderRadius: 18,
      padding: "6px 16px",
      alignSelf: "flex-start",
      fontSize: 40,
      fontWeight: 600,
    }}
  >
    {children}
  </span>
);


// ---------- "300 mil vezes" no meio da tela, palavra por palavra na fala ----------
const PALAVRAS_300: [string, number][] = [
  ["300", 30.44],
  ["mil", 30.72],
  ["vezes", 31.08],
];
const Gigante: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [de, ate] = T.gigante;
  if (t < de || t > ate) return null;
  const op = interpolate(t, [ate - 0.15, ate], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: op }}>
      <div
        style={{
          display: "flex",
          gap: 26,
          fontFamily: F.titulo,
          fontWeight: 700,
          fontSize: 124,
          color: CORES.claro,
          whiteSpace: "nowrap",
          textShadow: "0 6px 30px rgba(75,57,53,0.55)",
        }}
      >
        {PALAVRAS_300.map(([p, quando]) => {
          const e = spring({ frame: frame - quando * fps, fps, config: { damping: 11, stiffness: 220 } });
          return (
            <span key={p} style={{ opacity: t >= quando ? 1 : 0, transform: `scale(${0.5 + e * 0.5})` }}>
              {p}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- X com as mãos ("acabou"): soco de zoom + flash + tremida ----------
const X_MAOS = 33.27;
const Acabou: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ate = 34.0;
  if (t < X_MAOS || t > ate) return null;
  const e = spring({ frame: frame - X_MAOS * fps, fps, config: { damping: 10, stiffness: 220 } });
  const op = interpolate(t, [ate - 0.15, ate], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: op }}>
      <div
        style={{
          fontFamily: F.titulo,
          fontWeight: 700,
          fontSize: 150,
          color: CORES.claro,
          textShadow: "0 6px 30px rgba(75,57,53,0.55)",
          transform: `scale(${0.4 + e * 0.6}) rotate(-4deg)`,
        }}
      >
        acabou!
      </div>
    </AbsoluteFill>
  );
};

const useSocoX = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = frame - X_MAOS * fps;
  const zoom = interpolate(k, [0, 3, 12], [1, 1.14, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = interpolate(k, [0, 2, 4, 6, 8], [0, 14, -10, 6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flash = interpolate(k, [0, 1, 6], [0, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { zoom, shake, flash };
};

const Elementos: React.FC = () => (
  <>
    <Gigante />
    <Acabou />
    <Cartao de={T.perfil[0]} ate={T.perfil[1]} rot={3}>
      <span style={{ fontSize: 80 }}>✨</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span>resultado no meu tiktok</span>
        <Rotulo>@brunamedeiros</Rotulo>
      </div>
    </Cartao>
  </>
);

// ---------- efeitos sonoros ----------
const SONS: [number, string, number][] = [
  [0, "whoosh", 0.07],
  [1.48, "brilho", 0.6], // "comigo"
  [11.5, "espelhar", 0.3], // "do meu celular"

  [T.controle[0], "controle", 0.4], // "controlzinho" (só som, sem cartão)
  ...PALAVRAS_300.map(([, q]) => [q, "click", 0.6] as [number, string, number]), // um som por palavra
  [X_MAOS, "impacto", 0.55], // X com as mãos
  [T.perfil[0], "brilho", 0.6], // cartão do tiktok
];
const Efeitos: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {SONS.map(([t, som, vol], i) => (
        <Sequence key={i} from={Math.round(t * fps)} durationInFrames={Math.round(0.9 * fps)}>
          <Audio src={staticFile(`sfx/${som}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </>
  );
};

export const Reel02: React.FC<{ showSafeArea: boolean }> = ({ showSafeArea }) => {
  useFontes();
  const frame = useCurrentFrame();
  // zoom bem lento no vídeo todo para dar movimento (o vídeo já vem cortado)
  const zoomDe = (f: number) => interpolate(f, [0, REEL02_FRAMES], [1.0, 1.04]);
  const soco = useSocoX();
  const zoom = zoomDe(frame) * soco.zoom;
  return (
    <AbsoluteFill style={{ background: CORES.escuro }}>
      <OffthreadVideo
        src={staticFile("originais/img2624.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom}) translateX(${soco.shake}px)` }}
      />
      <AbsoluteFill style={{ background: "white", opacity: soco.flash }} />
      <Efeitos />
      {/* véu no alto durante o título e véu suave embaixo para a legenda */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 900,
          background: "linear-gradient(rgba(75,57,53,0.45), transparent)",
          opacity: interpolate(frame, [45, 60], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
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
      <Titulo />
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
