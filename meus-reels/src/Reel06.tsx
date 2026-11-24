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
import { DURACAO_S, LEGENDA } from "./reel06-data";

// Reels 06 · Diário de reforma ep. 2 (só B-roll + narração, sem giz)
// Todos os tempos em segundos do áudio final (public/reforma/narracao-ep2.wav).
export const reel06Defaults = { showSafeArea: false };

const R = (n: string) => staticFile(`reforma/${n}`);
const S = (n: string) => staticFile(`sfx/${n}`);
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

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

// ---------- frase de destaque no meio, digitando (como o "JÁ COMEÇOU!" do ep. 1) ----------
const DEST = { de: 34.21, ate: 35.6, texto: "COMENTA QUARTO", digita: 0.4 };
const Destaque: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const n = Math.floor(interpolate(t, [0, DEST.digita], [0, DEST.texto.length], cl));
  const pisca = t > DEST.digita && Math.floor(t * 2.5) % 2 === 1 ? 0 : 1;
  const sai = interpolate(t, [durationInFrames / fps - 0.18, durationInFrames / fps], [1, 0], cl);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: sai }}>
      <div style={{ fontFamily: F.legenda, fontSize: 96, color: CORES.claro, whiteSpace: "pre", textShadow: "0 3px 6px rgba(40,30,28,0.6), 0 6px 26px rgba(40,30,28,0.65)" }}>
        {DEST.texto.slice(0, n)}
        <span style={{ color: CORES.destaque, opacity: pisca }}>|</span>
        <span style={{ opacity: 0 }}>{DEST.texto.slice(n)}</span>
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
  if (!atual || (s >= DEST.de && s < DEST.ate)) return null;
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

// ---------- sons (mais baixos que a voz, na palavra) ----------
// [segundo, arquivo, volume, duração máx. em s]
const SONS: [number, string, number, number?][] = [
  [3.8, "toin.wav", 0.95], // estava assim (antes, nada bonito)
  [10.48, "obra.wav", 0.3], // a reforma começou (martelinho baixo)
  [10.74, "obra.wav", 0.2],
  [13.3, "obra.wav", 0.3], // remoção dessa porta
  [13.56, "obra.wav", 0.2],
  [15.55, "suspeito.wav", 0.12], // e olha isso! (espanto)
  [17.16, "brilho2.wav", 0.25, 1.5], // apaixonada
  [22.71, "brilho.wav", 0.25], // iluminação
  [DEST.de, "teclado-bru.wav", 0.9, DEST.digita + 0.2], // COMENTA QUARTO digitando
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

// ---------- mapa de cenas ----------
type Cena = [number, number, () => React.ReactNode];
const v = (n: string, de: number, zoom = 1) => () => <Clip n={n} de={de} zoom={zoom} />;

export const CENAS: Cena[] = [
  [0.0, 0.98, v("IMG_3128", 2.4)], // eu tô reformando (quarto já com cerâmica)
  [0.98, 1.51, v("IMG_2937", 6.0, 1.05)], // o meu quarto
  [1.51, 2.19, v("ep1_IMG_2727", 18)], // que também é (ep. 1: gravando)
  [2.19, 3.29, v("ep1_IMG_2727", 61, 1.06)], // meu estúdio de gravação
  [3.29, 3.8, v("ep1_IMG_2891", 0.3)], // e que antes (ep. 1: cama)
  [3.8, 4.25, v("ep1_IMG_2892", 0.2)], // estava (ep. 1: escrivaninha)
  [4.25, 4.75, v("ep1_IMG_2893", 0.2, 1.05)], // assim (ep. 1: porta antiga)
  [4.75, 5.69, v("IMG_3355", 0.3)], // esse é o episódio 2
  [5.69, 7.03, v("ep1_IMG_2699", 2.0)], // e se você não viu o primeiro (ep. 1: na cama)
  [7.03, 7.85, v("ep1_copy_DDDA", 0.3)], // eu recomendo assistir
  [7.85, 8.67, v("ep1_IMG_2699", 35.5)], // antes e depois
  [8.67, 9.65, v("IMG_3355", 7.0)], // voltar pra esse aqui
  [9.65, 10.48, v("ep1_IMG_2896", 0.2)], // pra você entender melhor (ep. 1: quarto vazio)
  [10.48, 11.34, v("IMG_2937", 0.0)], // a reforma começou
  [11.34, 12.26, v("IMG_3029", 0.0)], // colocando as cerâmicas
  [12.26, 12.83, v("IMG_2937", 4.5, 1.05)], // na parede
  [12.83, 13.3, v("ep1_IMG_2893", 1.2)], // e depois a (porta antiga)
  [13.3, 14.1, v("IMG_3026", 0.0)], // remoção dessa porta
  [14.1, 14.66, v("IMG_3027", 0.0, 1.05)], // pra colocar a
  [14.66, 15.1, v("IMG_3129", 0.0)], // janela
  [15.1, 16.39, v("IMG_3163", 39.0)], // e olha isso!
  [16.39, 18.16, v("IMG_3163", 4.0)], // eu tô completamente apaixonada
  [18.16, 19.03, v("IMG_3163", 30.0, 1.05)], // nessa nova janela
  [19.03, 20.27, v("ep1_IMG_2727", 95)], // eu já tô imaginando os vídeos
  [20.27, 21.73, v("IMG_3355", 14.5)], // que eu vou fazer aqui de frente pra essa janela
  [21.73, 23.48, v("IMG_3355", 18.0, 1.05)], // porque olha essa iluminação
  [23.48, 24.77, v("IMG_2896", 0.0)], // foi uma semana pra fazer essa etapa
  [24.77, 25.7, v("IMG_3028", 0.0)], // e agora nós
  [25.7, 26.6, v("IMG_2937", 24.0)], // temos mais
  [26.6, 27.55, v("IMG_3128", 0.0)], // duas etapas
  [27.55, 28.96, v("IMG_2937", 13.5)], // comprar as coisas que estão faltando
  [28.96, 30.11, v("IMG_2937", 21.0, 1.05)], // e a parte da pintura
  [30.11, 31.0, v("IMG_2987", 0.0)], // olhando coisinhas
  [31.0, 31.84, v("ep1_copy_DDDA", 4.0)], // aqui na Shopee
  [31.84, 32.75, v("ep1_IMG_2727", 125, 1.06)], // pra comprar e se vocês
  [32.75, 34.21, v("IMG_3163", 48.0)], // quiserem ver tudo que eu estou escolhendo
  [34.21, 35.32, v("ep1_IMG_2699", 24.0)], // comenta QUARTO aqui
  [35.32, 36.39, v("ep1_IMG_2727", 40)], // que no próximo episódio eu trago
  [36.39, 38.37, v("IMG_3163", 49.5)], // todas as minhas escolhas pra essa reforma
  [38.37, 39.62, v("IMG_3355", 0.0)], // ai, não esquece de me seguir
  [39.62, 40.84, v("IMG_3355", 21.0)], // pra acompanhar e ver o resultado final
  [40.84, 50, v("IMG_3163", 31.0)], // é isso, beijo!
];

export const REEL06_FRAMES = Math.ceil(DURACAO_S * 30);

export const Reel06: React.FC<{ showSafeArea: boolean }> = ({ showSafeArea }) => {
  useFontes();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {CENAS.map(([de, ate, el], i) => {
        const from = Math.round(de * fps);
        const dur = Math.round(ate * fps) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={30}>
            {el()}
          </Sequence>
        );
      })}
      <Sequence from={Math.round(DEST.de * fps)} durationInFrames={Math.round((DEST.ate - DEST.de) * fps)}>
        <Destaque />
      </Sequence>
      <Sequence durationInFrames={Math.round(TIT.fim * fps)}>
        <Titulo />
      </Sequence>
      <Legenda />
      <Audio src={R("narracao-ep2.wav")} />
      <Sons />
      {showSafeArea ? (
        <AbsoluteFill style={{ border: "2px dashed red", top: SAFE_AREA.top, bottom: SAFE_AREA.bottom, left: SAFE_AREA.sides, right: SAFE_AREA.sides }} />
      ) : null}
    </AbsoluteFill>
  );
};
