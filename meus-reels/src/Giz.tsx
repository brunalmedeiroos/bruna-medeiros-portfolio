import React, { useMemo } from "react";
import rough from "roughjs";
import { Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// ---------- formas desenhadas a giz (coordenadas em pixels da foto ORIGINAL) ----------
export type Forma =
  | { k: "ret"; x: number; y: number; w: number; h: number; hach?: number; ang?: number }
  | { k: "linha"; p: [number, number][] }
  | { k: "curva"; p: [number, number][] }
  | { k: "elipse"; cx: number; cy: number; w: number; h: number; hach?: number }
  | { k: "path"; d: string };

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

const sketch = (f: Forma, seed: number, esp: number): string[] => {
  const o = {
    seed,
    roughness: 1.4,
    bowing: 1.2,
    strokeWidth: esp,
    stroke: "#fff",
    ...("hach" in f && f.hach
      ? { fill: "#fff", fillStyle: "zigzag-line" as const, hachureGap: f.hach, hachureAngle: "ang" in f && f.ang !== undefined ? f.ang : -42, fillWeight: esp * 0.75 }
      : {}),
  };
  let d;
  if (f.k === "ret") d = gen.rectangle(f.x, f.y, f.w, f.h, o);
  else if (f.k === "linha") d = gen.linearPath(f.p, o);
  else if (f.k === "curva") d = gen.curve(f.p, o);
  else if (f.k === "elipse") d = gen.ellipse(f.cx, f.cy, f.w, f.h, o);
  else d = gen.path(f.d, o);
  // a hachura vem antes no rough; desenhar contorno primeiro e depois o preenchimento
  const ps = gen.toPaths(d).map((p) => p.d);
  return ps.length > 1 ? [...ps.slice(1), ps[0]] : ps;
};

const ease = Easing.bezier(0.45, 0, 0.25, 1);

export const ParedeGiz: React.FC<{ p: Parede; t0: number; semFoto?: boolean }> = ({ p, t0, semFoto }) => {
  // t0 = segundo da narração em que esta cena (Sequence) começa
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = t0 + frame / fps;
  const base = height / p.H; // foto cobre a altura toda
  const esp = 5.2 / base; // espessura do traço ~5 px na tela

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
  const esc = interpolate(t, [primeiro - 0.5, primeiro], [1, 0.62], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
            <filter id="giz" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency={0.35 * base} numOctaves={2} seed={4} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={2.2 / base} result="d" />
              <feTurbulence type="fractalNoise" baseFrequency={1.1 * base} numOctaves={1} seed={9} result="g" />
              <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.4 1.9" result="ga" />
              <feComposite in="d" in2="ga" operator="in" result="c" />
              <feDropShadow dx="0" dy={1.5 / base} stdDeviation={2 / base} floodColor="#2a211e" floodOpacity="0.55" />
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
                {paths[i].map((d, j) => {
                  const pj = Math.min(Math.max(prog * n - j, 0), 1);
                  if (pj <= 0) return null;
                  return (
                    <path
                      key={j}
                      d={d}
                      pathLength={1}
                      strokeDasharray="1 1"
                      strokeDashoffset={1 - pj}
                      fill="none"
                      stroke={el.led ? "#ffd27a" : "#fbfaf6"}
                      strokeWidth={el.led ? esp * 1.1 : esp}
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
