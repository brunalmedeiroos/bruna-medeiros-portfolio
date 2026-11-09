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
import { DURACAO_S, LEGENDA } from "./reel02-data";

// recorte da Bruna (fundo removido) para a checklist ficar ATRÁS dela
// quadros em public/recorte-02/f0001.png... a partir de 5,5 s (fora do Git)
const RECORTE = { inicio: 5.5, quadros: 159 };

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

const Recorte: React.FC<{ zoom: (f: number) => number }> = ({ zoom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const de = Math.round(RECORTE.inicio * fps);
  const i = frame - de;
  if (i < 0 || i >= RECORTE.quadros) return null;
  return (
    <Img
      src={staticFile(`recorte-02/f${String(i + 1).padStart(4, "0")}.png`)}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${zoom(frame)})`,
      }}
    />
  );
};

const segundos = () => useCurrentFrame() / useVideoConfig().fps;

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
  const local = (s - atual.s) * fps;
  const op = interpolate(local, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  const sc = interpolate(local, [0, 3], [0.92, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_AREA.sides + 40,
        right: SAFE_AREA.sides + 40,
        bottom: SAFE_AREA.bottom + 330,
        textAlign: "center",
        opacity: op,
        transform: `scale(${sc})`,
        fontFamily: F.legenda,
        fontSize: 88,
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

const Item: React.FC<{ quando: number; texto: string; x?: boolean }> = ({ quando, texto, x }) => {
  const t = segundos();
  const p = interpolate(t, [quando, quando + 0.18], [0, 1], {
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
        textDecoration: x ? "line-through" : undefined,
        color: x ? "rgba(75,57,53,0.55)" : undefined,
      }}
    >
      <span style={{ color: x ? "#b5574b" : "#b88a2a", fontSize: 60 }}>{x ? "✗" : "✓"}</span>
      <span>{texto}</span>
    </div>
  );
};

// ---------- virada: palavra gigante (estilo C) ----------
const Gigante: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [de, ate] = T.gigante;
  if (t < de || t > ate) return null;
  const e = spring({ frame: frame - de * fps, fps, config: { damping: 10, stiffness: 170 } });
  const op = interpolate(t, [ate - 0.2, ate], [1, 0], { extrapolateLeft: "clamp" });
  const tremor = interpolate(frame - de * fps, [0, 3, 6, 9], [0, 10, -6, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <AbsoluteFill style={{ background: CORES.escuro, opacity: 0.62 * e }} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `translateX(${tremor}px)`,
        }}
      >
        <div
          style={{
            fontFamily: F.titulo,
            fontWeight: 700,
            fontSize: 250,
            color: CORES.claro,
            lineHeight: 0.9,
            whiteSpace: "nowrap",
            textAlign: "center",
            transform: `scale(${0.4 + e * 0.6})`,
          }}
        >
          300 mil
        </div>
        <div
          style={{
            fontFamily: F.script,
            fontSize: 210,
            color: CORES.destaque,
            marginTop: 10,
            transform: `scale(${e}) rotate(-4deg)`,
          }}
        >
          vezes
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Checklist: React.FC = () => (
  <Cartao de={T.lista[0]} ate={T.lista[1]} rot={-2}>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 520 }}>
      <Rotulo>antes de gravar</Rotulo>
      <Item quando={T.itens[0]} texto="me arrumar" />
      <Item quando={T.itens[1]} texto="cenário" />
      <Item quando={T.itens[2]} texto="equipamentos" />
    </div>
  </Cartao>
);

const Elementos: React.FC = () => (
  <>
    <Cartao de={T.espelho[0]} ate={T.espelho[1]} rot={3}>
      <span style={{ fontSize: 80 }}>📱</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Rotulo>dica</Rotulo>
        <span>espelhar a tela</span>
      </div>
    </Cartao>
    <Cartao de={T.controle[0]} ate={T.controle[1]} rot={-3}>
      <span style={{ fontSize: 80 }}>🎮</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Rotulo>dica</Rotulo>
        <span>controle do tripé</span>
      </div>
    </Cartao>
    <Cartao de={T.angulos[0]} ate={T.angulos[1]} rot={2}>
      <span style={{ fontSize: 80 }}>🎬</span>
      <span>
        mesma cena,
        <br />
        vários ângulos
      </span>
    </Cartao>
    <Cartao de={T.troca[0]} ate={T.troca[1]} rot={-2}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 520 }}>
        <Rotulo>plano B</Rotulo>
        <Item quando={T.trocaItens[0]} texto="penteadeira" x />
        <Item quando={T.trocaItens[1]} texto="escrivaninha" />
      </div>
    </Cartao>
    <Gigante />
    <Cartao de={T.perfil[0]} ate={T.perfil[1]} rot={3}>
      <span style={{ fontSize: 80 }}>✨</span>
      <span>
        resultado
        <br />
        no meu perfil
      </span>
    </Cartao>
  </>
);

// ---------- efeitos sonoros ----------
const SONS: [number, string, number][] = [
  [0, "whoosh", 0.55],
  [0.23, "whoosh", 0.35],
  [T.lista[0], "click", 0.5],
  ...T.itens.map((t) => [t, "click", 0.5] as [number, string, number]),
  [T.espelho[0], "click", 0.5],
  [T.controle[0], "click", 0.5],
  [T.angulos[0], "click", 0.5],
  [T.troca[0], "click", 0.5],
  [T.trocaItens[1], "click", 0.5],
  [T.gigante[0], "impacto", 0.6],
  [T.perfil[0], "click", 0.5],
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
  const zoom = zoomDe(frame);
  return (
    <AbsoluteFill style={{ background: CORES.escuro }}>
      <OffthreadVideo
        src={staticFile("originais/img2624.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
      />
      {/* camadas: vídeo → checklist → Bruna recortada por cima → véus */}
      <Checklist />
      <Recorte zoom={zoomDe} />
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
