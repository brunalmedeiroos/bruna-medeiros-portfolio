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
import { LEGENDA as LEG_G2 } from "./reel03-g2-data";

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
  destaque: {
    de: number;
    ate: number;
    linhas: { t: string; verde?: boolean }[];
    top?: number;
    fonte?: number;
  };
  // quadros da Bruna recortada (fundo removido) para a frase ficar ATRÁS dela
  recorte: { pasta: string; quadros: number };
  // o miolo é igual nos dois vídeos: desloc = quanto o miolo começa depois do que no vídeo 1
  desloc: number;
  link: number; // "clica no link abaixo"
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
  desloc: 0,
  link: 56.02,
};

export const GANCHO_2: Gancho = {
  video: "originais/blant-g2.mp4",
  legenda: LEG_G2,
  duracao: 59.23,
  destaque: {
    de: 0.58, // "deixa eu adivinhar"
    ate: 7.2,
    linhas: [
      { t: "deixa eu adivinhar…" },
      { t: "unhas frágeis no", verde: true },
      { t: "emagrecimento acelerado?", verde: true },
    ],
    top: SAFE_AREA.top + 6, // enquadramento mais fechado: cabeça mais alta que no vídeo 1
    fonte: 54,
  },
  recorte: { pasta: "recorte-03g2", quadros: 225 },
  desloc: 1.4,
  link: 57.22,
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
  const { de, ate, linhas, top = SAFE_AREA.top + 50, fonte = 66 } = g.destaque;
  if (t < de || t > ate) return null;
  const saida = interpolate(t, [ate - 0.2, ate], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top, // logo acima da cabeça: a Bruna recortada passa na frente
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
        const e = spring({
          frame: frame - de * fps,
          fps,
          config: { damping: 14, stiffness: 170 },
        });
        return (
          <div
            key={i}
            style={{
              background: l.verde ? BLANT.verde : BLANT.branco,
              color: l.verde ? BLANT.branco : BLANT.verde,
              fontFamily: FONTE,
              fontWeight: 800,
              fontSize: fonte,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
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
        fontSize: 52,
        lineHeight: 1.15,
        textShadow: SOMBRA,
      }}
    >
      {atual.w.map((w, i) => (
        <span
          key={i}
          style={{
            color: BLANT.branco,
            opacity: s >= w.s ? 1 : 0,
          }}
        >
          {w.t}
          {i < atual.w.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};

// ---------- momentos presos à fala (segundos, no vídeo 1) ----------
// o miolo do vídeo é igual nos dois ganchos; no vídeo 2 tudo é somado de gancho.desloc
const T = {
  fragil: 12.26,
  fina: 13.04,
  quebradica: 13.6,
  fimFotos: 14.3,
  combo: 15.9, // "montou o combo"
  fimCombo: 19.5,
};
const PRODUTOS = [
  { nome: "Maximus Nail 10x1", sub: "fortalecimento", de: 23.56, ate: 26.6 },
  { nome: "Esmaltes Coretrat", sub: "cor + tratamento", de: 32.36, ate: 38.6 }, // entra no "pintar"
  { nome: "Caneta Booster", sub: "hidratação", de: 43.02, ate: 45.8 },
];

const Desloc = React.createContext(0);
const useT = (t: number) => t + React.useContext(Desloc);

const Som: React.FC<{
  de: number;
  som: string;
  vol: number;
  abs?: boolean;
}> = ({ de, som, vol, abs }) => {
  const d = useT(0);
  return (
    <Sequence from={Math.round((abs ? de : de + d) * 30)} durationInFrames={30}>
      <Audio src={staticFile(`sfx/${som}.wav`)} volume={vol} />
    </Sequence>
  );
};

const useEntrada = (de0: number, ate0: number) => {
  const de = useT(de0);
  const ate = useT(ate0);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const e = spring({
    frame: frame - de * fps,
    fps,
    config: { damping: 14, stiffness: 170 },
  });
  const saida = interpolate(t, [ate - 0.2, ate], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { visivel: t >= de && t <= ate, e, saida };
};

// foto de unha (polaroid); "zoom"/"foco" mostram partes diferentes da mesma foto
const Polaroid: React.FC<{
  w: number;
  rot: number;
  rotulo?: string;
  zoom?: number;
  foco?: string;
}> = ({ w, rot, rotulo, zoom = 1, foco = "50% 50%" }) => (
  <div
    style={{
      background: BLANT.branco,
      padding: 12,
      paddingBottom: rotulo ? 10 : 12,
      borderRadius: 14,
      boxShadow: "0 14px 34px rgba(0,0,0,0.3)",
      transform: `rotate(${rot}deg)`,
      width: w,
    }}
  >
    <div
      style={{
        width: w - 24,
        height: (w - 24) * 0.75,
        overflow: "hidden",
        borderRadius: 8,
      }}
    >
      <Img
        src={staticFile("blant/unha-fragil.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom})`,
          transformOrigin: foco,
        }}
      />
    </div>
    {rotulo ? (
      <div
        style={{
          fontFamily: FONTE,
          fontWeight: 800,
          fontSize: 36,
          color: BLANT.verde,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {rotulo}
      </div>
    ) : null}
  </div>
);

// "frágil, fina e quebradiça": uma foto por palavra, na hora da fala
const FotosFrageis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = React.useContext(Desloc);
  const t = frame / fps - d; // tempo no relógio do vídeo 1
  if (t < T.fragil || t > T.fimFotos) return null;
  const saida = interpolate(t, [T.fimFotos - 0.2, T.fimFotos], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const fotos: [string, number, number, number, string][] = [
    ["frágil", T.fragil, -6, 1.0, "50% 50%"],
    ["fina", T.fina, 4, 1.9, "52% 62%"],
    ["quebradiça", T.quebradica, -3, 1.8, "72% 45%"],
  ];
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 30,
        left: 0,
        width: WIDTH,
        display: "flex",
        justifyContent: "center",
        gap: 18,
        opacity: saida,
      }}
    >
      {fotos.map(([rot, de, r, z, foco]) => {
        const e = spring({
          frame: frame - (de + d) * fps,
          fps,
          config: { damping: 13, stiffness: 180 },
        });
        return (
          <div
            key={rot}
            style={{ opacity: t >= de ? 1 : 0, transform: `scale(${e})` }}
          >
            <Polaroid w={310} rot={r} rotulo={rot} zoom={z} foco={foco} />
          </div>
        );
      })}
    </div>
  );
};

// "montou o combo": nome do combo em destaque
const Combo: React.FC = () => {
  const { visivel, e, saida } = useEntrada(T.combo, T.fimCombo);
  if (!visivel) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 60,
        left: 0,
        width: WIDTH,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: saida,
        transform: `scale(${e})`,
      }}
    >
      <div
        style={{
          ...ETIQUETA,
          background: BLANT.branco,
          color: BLANT.verde,
          fontSize: 46,
          rotate: "-2deg",
        }}
      >
        combo
      </div>
      <div
        style={{
          ...ETIQUETA,
          background: BLANT.verde,
          color: BLANT.branco,
          fontSize: 64,
          rotate: "1.5deg",
        }}
      >
        Emagrecimento Acelerado
      </div>
    </div>
  );
};

const ETIQUETA: React.CSSProperties = {
  fontFamily: FONTE,
  fontWeight: 800,
  lineHeight: 1.1,
  padding: "12px 30px",
  borderRadius: 22,
  boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
  whiteSpace: "nowrap",
};

// cartão com o nome do produto quando ela fala
const CartaoProduto: React.FC<{
  nome: string;
  sub: string;
  de: number;
  ate: number;
}> = ({ nome, sub, de, ate }) => {
  const { visivel, e, saida } = useEntrada(de, ate);
  if (!visivel) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 60,
        left: 0,
        width: WIDTH,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: saida,
        transform: `scale(${e}) rotate(${(1 - e) * -8}deg)`,
      }}
    >
      <div
        style={{
          ...ETIQUETA,
          background: BLANT.verde,
          color: BLANT.branco,
          fontSize: 64,
        }}
      >
        {nome}
      </div>
      <div
        style={{
          ...ETIQUETA,
          background: BLANT.branco,
          color: BLANT.verde,
          fontSize: 38,
          fontWeight: 700,
        }}
      >
        {sub}
      </div>
    </div>
  );
};

// "clica no link abaixo": setinha pulando para baixo
const Seta: React.FC<{ link: number }> = ({ link }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < link) return null;
  const e = spring({
    frame: frame - link * fps,
    fps,
    config: { damping: 12, stiffness: 160 },
  });
  const pulo = Math.abs(Math.sin((t - link) * Math.PI * 2.2)) * 26;
  return (
    <div
      style={{
        position: "absolute",
        bottom: SAFE_AREA.bottom + 150,
        left: 0,
        width: WIDTH,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${pulo}px) scale(${e})`,
      }}
    >
      <svg
        width="200"
        height="250"
        viewBox="0 0 150 190"
        style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))" }}
      >
        <path
          d="M75 12 V150 M22 100 L75 160 L128 100"
          fill="none"
          stroke={BLANT.branco}
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M75 12 V150 M22 100 L75 160 L128 100"
          fill="none"
          stroke={BLANT.verde}
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const Recorte: React.FC<{ g: Gancho }> = ({ g }) => {
  const frame = useCurrentFrame();
  if (frame >= g.recorte.quadros) return null;
  return (
    <Img
      src={staticFile(
        `${g.recorte.pasta}/f${String(frame + 1).padStart(4, "0")}.png`,
      )}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
};

export const Reel03: React.FC<{ gancho: Gancho; showSafeArea: boolean }> = ({
  gancho,
  showSafeArea,
}) => {
  useMontserrat();
  return (
    <Desloc.Provider value={gancho.desloc}>
      <AbsoluteFill style={{ background: "black" }}>
        {/* trilha original (composta para o vídeo, sem direitos autorais), bem baixinha */}
        <Audio src={staticFile("musica/trilha-blant.wav")} volume={0.05} />
        <OffthreadVideo
          src={staticFile(gancho.video)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* camadas: vídeo → frase do gancho → Bruna recortada por cima → legenda */}
        <Destaque g={gancho} />
        <Recorte g={gancho} />
        {/* um pop só quando os cartões do gancho aparecem juntos */}
        <Som de={gancho.destaque.de} som="pop" vol={0.32} abs />
        <FotosFrageis />
        {[T.fragil, T.fina, T.quebradica].map((t) => (
          <Som key={t} de={t} som="pop" vol={0.32} />
        ))}
        <Combo />
        <Som de={T.combo} som="brilho" vol={0.45} />
        {PRODUTOS.map((p) => (
          <React.Fragment key={p.nome}>
            <CartaoProduto {...p} />
            <Som de={p.de} som="pop" vol={0.32} />
          </React.Fragment>
        ))}
        <Legenda g={gancho} />
        <Seta link={gancho.link} />
        <Som de={gancho.link} som="brilho" vol={0.5} abs />
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
    </Desloc.Provider>
  );
};
