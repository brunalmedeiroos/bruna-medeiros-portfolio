import { loadFont } from "@remotion/fonts";
import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CORES } from "./identidade";
import { HEIGHT, SAFE_AREA, WIDTH } from "./config";

const F = {
  titulo: "Open Sauce One",
  script: "Pinyon Script",
  legenda: "Bootzy TM",
};

const useFontes = () => {
  const [handle] = useState(() => delayRender("fontes"));
  useEffect(() => {
    Promise.all([
      loadFont({
        family: F.titulo,
        url: staticFile("fontes/open-sauce-one-latin-700-normal.woff2"),
        weight: "700",
      }),
      loadFont({
        family: F.script,
        url: staticFile("fontes/pinyon-script-latin-400-normal.woff2"),
      }),
      loadFont({
        family: F.legenda,
        url: staticFile("fontes/BootzyTM.woff2"),
      }).catch(() => undefined),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

// Frase de exemplo, alinhada pela "fala" (segundos). destaque = palavra-chave.
const FALA = [
  { t: 0.0, fim: 1.0, texto: "oi, gente" },
  { t: 1.0, fim: 2.5, texto: "hoje eu vou mostrar" },
  { t: 2.5, fim: 3.7, texto: "tudo que eu já" },
  { t: 3.7, fim: 5.0, texto: "vendi", destaque: true },
];

type Estilo = {
  fundo: (cena: number) => string;
  corTexto: string;
  corDestaque: string;
  sombra: string;
  marcaTexto: boolean;
};

const Legenda: React.FC<{ estilo: Estilo }> = ({ estilo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const atual = FALA.find((f) => s >= f.t && s < f.fim);
  if (!atual) return null;
  const local = (s - atual.t) * fps;
  const op = interpolate(local, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(local, [0, 4], [14, 0], { extrapolateRight: "clamp" });
  const cor = atual.destaque ? estilo.corDestaque : estilo.corTexto;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_AREA.sides + 40,
        right: SAFE_AREA.sides + 40,
        bottom: SAFE_AREA.bottom + 230,
        textAlign: "center",
        opacity: op,
        transform: `translateY(${y}px)`,
      }}
    >
      <span
        style={{
          fontFamily: F.legenda,
          fontSize: 96,
          lineHeight: 1.1,
          color: estilo.marcaTexto && atual.destaque ? CORES.escuro : cor,
          background:
            estilo.marcaTexto && atual.destaque
              ? CORES.destaque
              : "transparent",
          padding: estilo.marcaTexto && atual.destaque ? "0 18px" : 0,
          textShadow: estilo.sombra,
        }}
      >
        {atual.texto}
      </span>
    </div>
  );
};

// Pessoa de mentirinha só para dar noção de enquadramento
const Silhueta: React.FC<{ cor: string }> = ({ cor }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        width: 620,
        height: 1000,
        background: cor,
        borderRadius: "310px 310px 0 0",
        opacity: 0.55,
      }}
    />
  </div>
);

const Cena: React.FC<{ bg: string; children?: React.ReactNode }> = ({
  bg,
  children,
}) => <AbsoluteFill style={{ background: bg }}>{children}</AbsoluteFill>;

const Base: React.FC<{
  estilo: Estilo;
  extra?: React.ReactNode;
  cortes: number[];
}> = ({ estilo, extra, cortes }) => {
  useFontes();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {cortes.map((c, i) => (
        <Sequence
          key={c}
          from={Math.round(c * fps)}
          durationInFrames={Math.round(((cortes[i + 1] ?? 5) - c) * fps)}
        >
          <Cena bg={estilo.fundo(i)}>
            <Silhueta cor={CORES.escuro} />
          </Cena>
        </Sequence>
      ))}
      {extra}
      <Legenda estilo={estilo} />
    </AbsoluteFill>
  );
};

const Cartao: React.FC<{ de: number; texto: string }> = ({ de, texto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [de * fps, de * fps + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA.top + 40,
        left: 110,
        width: 460,
        padding: "34px 30px",
        background: CORES.claro,
        color: CORES.escuro,
        fontFamily: F.titulo,
        fontWeight: 700,
        fontSize: 40,
        borderRadius: 24,
        boxShadow: "0 14px 40px rgba(75,57,53,0.22)",
        transform: `rotate(${-6 + (1 - p) * 20}deg) scale(${p})`,
        opacity: p,
      }}
    >
      {texto}
    </div>
  );
};

// A — Suave: tons claros, legenda clara com sombra suave, corte a cada ~2,5 s
export const EstiloA: React.FC = () => (
  <Base
    cortes={[0, 2.5]}
    estilo={{
      fundo: (i) =>
        i === 0
          ? `linear-gradient(${CORES.claro}, ${CORES.azul})`
          : `linear-gradient(${CORES.azul}, ${CORES.claro})`,
      corTexto: CORES.claro,
      corDestaque: CORES.destaque,
      sombra: "0 4px 18px rgba(75,57,53,0.28)",
      marcaTexto: false,
    }}
    extra={
      <div
        style={{
          position: "absolute",
          top: SAFE_AREA.top + 60,
          width: WIDTH,
          textAlign: "center",
          fontFamily: F.script,
          fontSize: 130,
          color: CORES.escuro,
        }}
      >
        meu jeito
      </div>
    }
  />
);

// B — Marca-texto: azul chapado, palavra-chave com marca-texto dourado, cartão de print
export const EstiloB: React.FC = () => (
  <Base
    cortes={[0, 2, 3.7]}
    estilo={{
      fundo: (i) => [CORES.azul, CORES.claro, CORES.azul][i],
      corTexto: CORES.claro,
      corDestaque: CORES.destaque,
      sombra: "0 4px 18px rgba(75,57,53,0.28)",
      marcaTexto: false,
    }}
    extra={<Cartao de={2.5} texto="print de resultado" />}
  />
);

// C — Contraste: fundo escuro, palavra gigante em script dourada, legenda clara
export const EstiloC: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const gigante = s >= 3.7;
  return (
    <Base
      cortes={[0, 2, 3.7]}
      estilo={{
        fundo: (i) =>
          [
            CORES.escuro,
            `linear-gradient(${CORES.escuro}, #6b524c)`,
            CORES.escuro,
          ][i],
        corTexto: CORES.claro,
        corDestaque: CORES.destaque,
        sombra: "0 4px 18px rgba(0,0,0,0.25)",
        marcaTexto: false,
      }}
      extra={
        gigante ? (
          <div
            style={{
              position: "absolute",
              top: HEIGHT / 2 - 330,
              width: WIDTH,
              textAlign: "center",
              fontFamily: F.script,
              fontSize: 330,
              color: CORES.destaque,
              opacity: 0.9,
            }}
          >
            vendi
          </div>
        ) : null
      }
    />
  );
};
