import React, { useMemo } from "react";
import rough from "roughjs";
import { Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// ---------- formas desenhadas a giz (coordenadas em pixels da foto ORIGINAL) ----------
type Base = { cor?: string; preenche?: string }; // cor do traço / cor do preenchimento (giz colorido)
export type Forma = Base &
  (
    | { k: "ret"; x: number; y: number; w: number; h: number; hach?: number; ang?: number }
    | { k: "linha"; p: [number, number][] }
    | { k: "curva"; p: [number, number][] }
    | { k: "elipse"; cx: number; cy: number; w: number; h: number; hach?: number }
    | { k: "path"; d: string }
  );
export const GIZ_BRANCO = "#f7f5ee";

export type Elemento = {
  t: number; // segundo da narração em que começa a desenhar (palavra)
  dur: number; // quanto tempo leva desenhando
  formas: Forma[];
  led?: boolean; // linha de LED (brilho quente)
  some?: number; // segundo em que o desenho some (ex.: o X da porta)
};

export type Parede = {
  foto: string; // public/
  W: number; // tamanho da foto original
  H: number;
  de: number; // segundos da narração
  ate: number;
  // câmera: [segundo, centro x, centro y, zoom]
  cam: [number, number, number, number][];
  elementos: Elemento[];
};

const gen = rough.generator();

type Traco = { d: string; cor: string; w: number };
const sketch = (f: Forma, seed: number, esp: number): Traco[] => {
  const cor = f.cor ?? GIZ_BRANCO;
  const corP = f.preenche ?? cor;
  const o = {
    seed,
    roughness: 1.5,
    bowing: 1.3,
    strokeWidth: esp,
    stroke: "#fff",
    ...("hach" in f && f.hach
      ? { fill: "#fff", fillStyle: (f.preenche ? "hachure" : "zigzag-line") as "hachure", hachureGap: f.hach, hachureAngle: "ang" in f && f.ang !== undefined ? f.ang : -42, fillWeight: f.preenche ? esp * 1.6 : esp * 0.8 }
      : {}),
  };
  let d;
  if (f.k === "ret") d = gen.rectangle(f.x, f.y, f.w, f.h, o);
  else if (f.k === "linha") d = gen.linearPath(f.p, o);
  else if (f.k === "curva") d = gen.curve(f.p, o);
  else if (f.k === "elipse") d = gen.ellipse(f.cx, f.cy, f.w, f.h, o);
  else d = gen.path(f.d, o);
  // a hachura vem antes no rough; desenhar contorno primeiro e depois o preenchimento
  const ps = gen.toPaths(d);
  const tr = ps.map((p, i) => ({ d: p.d, cor: ps.length > 1 && i === 0 ? corP : cor, w: ps.length > 1 && i === 0 ? (o.fillWeight ?? esp) : esp }));
  return tr.length > 1 ? [...tr.slice(1), tr[0]] : tr;
};

const ease = Easing.bezier(0.45, 0, 0.25, 1);

export const ParedeGiz: React.FC<{ p: Parede; t0: number; semFoto?: boolean; conv?: (s: number) => number }> = ({ p, t0, semFoto, conv }) => {
  // t0 = segundo da narração em que esta cena (Sequence) começa
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = conv ? conv(t0 + frame / fps) : t0 + frame / fps; // conv: tempo do vídeo -> tempo das marcações
  const base = height / p.H; // foto cobre a altura toda
  const esp = 8 / base; // espessura do traço ~8 px na tela (giz)

  const paths = useMemo(
    () =>
      p.elementos.map((el, i) =>
        el.formas.flatMap((f, j) => sketch(f, 7 + i * 31 + j * 7, el.led ? esp * 0.9 : esp)),
      ),
    [p, esp],
  );

  // câmera
  const ts = p.cam.map((c) => c[0]);
  const cx = interpolate(t, ts, p.cam.map((c) => c[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const cy = interpolate(t, ts, p.cam.map((c) => c[2]), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const z = interpolate(t, ts, p.cam.map((c) => c[3]), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const s = base * z;
  const halfW = width / 2 / s;
  const halfH = height / 2 / s;
  const x0 = Math.min(Math.max(cx - halfW, 0), p.W - 2 * halfW);
  const y0 = Math.min(Math.max(cy - halfH, 0), p.H - 2 * halfH);

  // a parede escurece um pouco quando o giz começa (giz branco em parede branca não aparece)
  const primeiro = p.elementos[0]?.t ?? p.de;
  const esc = interpolate(t, [primeiro - 0.5, primeiro], [1, 0.58], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: semFoto ? "transparent" : "#222" }}>
      <div
        style={{
          position: "absolute",
          width: p.W,
          height: p.H,
          transformOrigin: "0 0",
          transform: `scale(${s}) translate(${-x0}px, ${-y0}px)`,
        }}
      >
        {semFoto ? null : <Img
          src={p.foto}
          style={{ position: "absolute", width: p.W, height: p.H, filter: `brightness(${esc}) contrast(1.05) saturate(0.85)` }}
        />}
        <svg viewBox={`0 0 ${p.W} ${p.H}`} width={p.W} height={p.H} style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <filter id="giz" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
              {/* borda irregular */}
              <feTurbulence type="fractalNoise" baseFrequency={0.45 * base} numOctaves={2} seed={3} result="r" />
              <feDisplacementMap in="SourceGraphic" in2="r" scale={4.5 / base} xChannelSelector="R" yChannelSelector="G" result="d" />
              {/* grão do giz: falhas finas, meio arrastadas */}
              <feTurbulence type="fractalNoise" baseFrequency={`${0.95 * base} ${0.42 * base}`} numOctaves={2} seed={11} result="g" />
              <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -4.2 2.75" result="ga" />
              {/* pressão da mão: partes mais fortes e mais fracas */}
              <feTurbulence type="fractalNoise" baseFrequency={0.012 * base} numOctaves={1} seed={5} result="p" />
              <feColorMatrix in="p" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 0.1" result="pa" />
              <feComposite in="d" in2="ga" operator="in" result="c1" />
              <feComposite in="c1" in2="pa" operator="in" result="c2" />
              {/* pozinho de giz em volta */}
              <feGaussianBlur in="c2" stdDeviation={3 / base} result="po" />
              <feComponentTransfer in="po" result="po2">
                <feFuncA type="linear" slope="0.45" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="po2" />
                <feMergeNode in="c2" />
              </feMerge>
            </filter>
            <filter id="led" x="-10%" y="-200%" width="120%" height="500%">
              <feGaussianBlur stdDeviation={7 / base} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {p.elementos.map((el, i) => {
            const prog = interpolate(t, [el.t, el.t + el.dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            if (prog <= 0) return null;
            const op = el.some ? interpolate(t, [el.some, el.some + 0.2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
            const n = paths[i].length;
            return (
              <g key={i} filter={el.led ? "url(#led)" : "url(#giz)"} opacity={op}>
                {paths[i].map((tr, j) => {
                  const pj = Math.min(Math.max(prog * n - j, 0), 1);
                  if (pj <= 0) return null;
                  return (
                    <path
                      key={j}
                      d={tr.d}
                      pathLength={1}
                      strokeDasharray="1 1"
                      strokeDashoffset={1 - pj}
                      fill="none"
                      stroke={el.led ? "#ffd27a" : tr.cor}
                      strokeWidth={el.led ? esp * 0.8 : tr.w}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
