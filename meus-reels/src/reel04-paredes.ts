import { staticFile } from "remotion";
import type { Elemento, Forma, Parede } from "./Giz";

// Desenhos a giz de cada parede, baseados nas fotos "referencia parede ..." (projeto da Bruna).
// Coordenadas em pixels da foto original (cama/janela 4032x2268, penteadeira/tv 2268x4032).
// Cada elemento começa na palavra em que ela fala dele (tempos da narração limpa).

const ripas = (x0: number, x1: number, y0: number, y1: number, passo: number): Forma[] => {
  const f: Forma[] = [];
  for (let x = x0; x <= x1; x += passo) f.push({ k: "linha", p: [[x, y0], [x, y1]] });
  return f;
};
const vaso = (x: number, yBase: number, w = 100, h = 90, cip = 300): Forma[] => [
  { k: "ret", x: x - w / 2, y: yBase - h, w, h },
  { k: "elipse", cx: x - 30, cy: yBase - h - 30, w: 70, h: 45 },
  { k: "elipse", cx: x + 30, cy: yBase - h - 35, w: 70, h: 45 },
  { k: "elipse", cx: x, cy: yBase - h - 60, w: 60, h: 50 },
  { k: "curva", p: [[x - w / 2, yBase - h + 10], [x - w / 2 - 40, yBase + cip * 0.4], [x - w / 2 - 10, yBase + cip * 0.75], [x - w / 2 - 35, yBase + cip]] },
  { k: "curva", p: [[x + w / 2, yBase - h + 10], [x + w / 2 + 35, yBase + cip * 0.3], [x + w / 2 + 10, yBase + cip * 0.6]] },
];
const mickey = (cx: number, cy: number, r = 48): Forma[] => [
  { k: "elipse", cx, cy, w: r * 2, h: r * 2 },
  { k: "elipse", cx: cx - r * 0.85, cy: cy - r * 1.05, w: r, h: r },
  { k: "elipse", cx: cx + r * 0.85, cy: cy - r * 1.05, w: r, h: r },
];
const livros = (x: number, yBase: number, w = 150): Forma[] => [
  { k: "ret", x, y: yBase - 18, w, h: 18 },
  { k: "ret", x: x + 8, y: yBase - 36, w: w - 16, h: 18 },
  { k: "ret", x: x + 3, y: yBase - 52, w: w - 10, h: 16 },
];
const quadro = (x: number, y: number, w: number, h: number): Forma[] => [
  { k: "ret", x, y, w, h },
  { k: "ret", x: x + w * 0.14, y: y + h * 0.12, w: w * 0.72, h: h * 0.76 },
];
const difusor = (x: number, yBase: number): Forma[] => [
  { k: "ret", x: x - 25, y: yBase - 80, w: 50, h: 80 },
  { k: "linha", p: [[x - 5, yBase - 80], [x - 40, yBase - 200]] },
  { k: "linha", p: [[x, yBase - 80], [x + 5, yBase - 210]] },
  { k: "linha", p: [[x + 5, yBase - 80], [x + 45, yBase - 195]] },
];
const abajurMesa = (cx: number, yBase: number): Forma[] => [
  { k: "path", d: `M ${cx - 60} ${yBase - 60} Q ${cx} ${yBase - 150} ${cx + 60} ${yBase - 60} Z` },
  { k: "linha", p: [[cx, yBase - 60], [cx, yBase]] },
  { k: "linha", p: [[cx - 30, yBase], [cx + 30, yBase]] },
];
const mesinha = (x: number, y: number, w: number, h: number): Forma[] => [
  { k: "ret", x, y, w, h },
  { k: "linha", p: [[x, y + h * 0.48], [x + w, y + h * 0.48]] },
  { k: "linha", p: [[x + w / 2 - 20, y + h * 0.25], [x + w / 2 + 20, y + h * 0.25]] },
  { k: "linha", p: [[x + 20, y + h], [x + 10, y + h + 60]] },
  { k: "linha", p: [[x + w - 20, y + h], [x + w - 10, y + h + 60]] },
];

// ---------------- parede da cama (foto deitada) ----------------
const listras: Forma[] = [];
for (let i = 0; i < 12; i++) {
  const x = 700 + i * 196;
  listras.push(i % 2 === 0 ? { k: "ret", x, y: 410, w: 196, h: 725, hach: 26, ang: -60 } : { k: "linha", p: [[x + 196, 410], [x + 196, 1135]] });
}

export const CAMA: Parede = {
  foto: staticFile("reforma/parede-cama.jpg"),
  W: 4032,
  H: 2268,
  de: 25.54,
  ate: 34.1,
  cam: [
    [25.54, 1850, 1134, 1],
    [27.1, 1750, 1134, 1],
    [28.4, 1250, 1134, 1],
    [29.8, 2450, 1134, 1],
    [31.2, 1700, 1134, 1],
    [32.2, 1810, 1134, 1],
    [34.1, 1810, 1134, 1.04],
  ],
  elementos: [
    { t: 27.1, dur: 1.2, formas: [...ripas(720, 1240, 1200, 1990, 58), ...ripas(1298, 2340, 1200, 1575, 58), ...ripas(2398, 3040, 1200, 1990, 58)] }, // ripado
    { t: 27.85, dur: 0.6, formas: [{ k: "ret", x: 690, y: 1140, w: 2370, h: 45 }] }, // prateleira
    { t: 28.55, dur: 1.4, formas: listras }, // listras
    {
      t: 30.1,
      dur: 1.4,
      formas: [
        ...vaso(910, 1140),
        ...livros(1350, 1140),
        { k: "elipse", cx: 1180, cy: 1080, w: 70, h: 115 },
        ...mickey(1760, 1085),
        ...quadro(2150, 920, 180, 220),
        ...vaso(2560, 1140),
        ...difusor(2830, 1140),
      ],
    }, // decorações
    { t: 31.55, dur: 0.5, led: true, formas: [{ k: "linha", p: [[700, 1205], [3050, 1205]] }] }, // LED
    {
      t: 32.0,
      dur: 0.75,
      formas: [
        { k: "ret", x: 1230, y: 1760, w: 1150, h: 560 },
        { k: "ret", x: 1320, y: 1590, w: 440, h: 170 },
        { k: "ret", x: 1830, y: 1590, w: 450, h: 170 },
        { k: "ret", x: 1650, y: 1690, w: 300, h: 110 },
        { k: "linha", p: [[1230, 1960], [2380, 1960]] },
        { k: "linha", p: [[1230, 2040], [2380, 2040]] },
      ],
    }, // cama
    {
      t: 32.7,
      dur: 0.9,
      formas: [...mesinha(1000, 1760, 215, 230), ...abajurMesa(1107, 1760), ...mesinha(2400, 1760, 215, 230), ...abajurMesa(2507, 1760)],
    }, // mesinhas de cabeceira
  ],
};

// ---------------- parede da penteadeira (foto em pé) ----------------
const lampadas: Forma[] = [];
for (const x of [450, 570, 690, 810, 930]) lampadas.push({ k: "elipse", cx: x, cy: 1745, w: 36, h: 36 });
for (const y of [1850, 1960, 2070]) {
  lampadas.push({ k: "elipse", cx: 395, cy: y, w: 36, h: 36 });
  lampadas.push({ k: "elipse", cx: 1045, cy: y, w: 36, h: 36 });
}

export const PENTEADEIRA: Parede = {
  foto: staticFile("reforma/parede-penteadeira.jpg"),
  W: 2268,
  H: 4032,
  de: 34.1,
  ate: 39.8,
  cam: [
    [34.1, 1134, 2016, 1],
    [39.8, 1000, 2000, 1.1],
  ],
  elementos: [
    {
      t: 35.65,
      dur: 1.0,
      formas: [
        { k: "ret", x: 320, y: 2190, w: 770, h: 40 },
        { k: "ret", x: 330, y: 2230, w: 750, h: 370 },
        { k: "linha", p: [[760, 2230], [760, 2600]] },
        { k: "linha", p: [[760, 2320], [1080, 2320]] },
        { k: "linha", p: [[760, 2410], [1080, 2410]] },
        { k: "linha", p: [[760, 2500], [1080, 2500]] },
        { k: "ret", x: 390, y: 1720, w: 660, h: 430 },
        ...lampadas,
      ],
    }, // penteadeira
    { t: 36.95, dur: 0.6, formas: [{ k: "ret", x: 330, y: 1560, w: 1420, h: 40 }] }, // prateleira
    {
      t: 37.55,
      dur: 0.9,
      formas: [...vaso(470, 1560, 100, 90, 260), ...livros(700, 1560), ...mickey(1050, 1500), ...quadro(1200, 1290, 200, 265), ...quadro(1450, 1350, 170, 205)],
    }, // decoração
    { t: 38.33, dur: 0.45, led: true, formas: [{ k: "linha", p: [[330, 1615], [1750, 1615]] }] }, // LED
    { t: 38.82, dur: 0.9, formas: [...quadro(1180, 1780, 280, 400), ...quadro(1540, 1760, 240, 250), ...quadro(1540, 2080, 240, 250)] }, // quadrinhos
  ],
};

// ---------------- parede da TV (foto em pé) ----------------
export const TV: Parede = {
  foto: staticFile("reforma/parede-tv.jpg"),
  W: 2268,
  H: 4032,
  de: 39.8,
  ate: 48.5,
  cam: [
    [39.8, 1134, 2016, 1],
    [48.5, 1150, 1850, 1.08],
  ],
  elementos: [
    { t: 42.7, dur: 0.7, formas: [{ k: "ret", x: 650, y: 1480, w: 1000, h: 580, hach: 30, ang: -35 }] }, // TV
    {
      t: 43.3,
      dur: 0.8,
      formas: [
        { k: "ret", x: 420, y: 2230, w: 1300, h: 240 },
        { k: "linha", p: [[853, 2230], [853, 2470]] },
        { k: "linha", p: [[1286, 2230], [1286, 2470]] },
        { k: "linha", p: [[600, 2260], [680, 2260]] },
        { k: "linha", p: [[1030, 2260], [1110, 2260]] },
        { k: "linha", p: [[1460, 2260], [1540, 2260]] },
      ],
    }, // móvel embaixo
    {
      t: 45.05,
      dur: 0.7,
      formas: [
        { k: "ret", x: 1720, y: 2230, w: 560, h: 38 },
        { k: "linha", p: [[2150, 2268], [2150, 2650]] },
      ],
    }, // junta com a escrivaninha
    { t: 45.85, dur: 0.6, formas: [{ k: "ret", x: 620, y: 1220, w: 1530, h: 40 }] }, // prateleira
    {
      t: 46.6,
      dur: 0.9,
      formas: [...difusor(720, 1220), ...quadro(800, 960, 200, 255), ...quadro(1060, 1010, 190, 205), ...mickey(1500, 1170, 42), ...livros(1640, 1220), ...vaso(1930, 1220, 100, 90, 330)],
    }, // decoração
    { t: 47.38, dur: 0.7, formas: [{ k: "ret", x: 300, y: 880, w: 270, h: 1680 }, ...ripas(340, 540, 880, 2560, 40)] }, // ripado
    {
      t: 48.0,
      dur: 0.45,
      led: true,
      formas: [
        { k: "linha", p: [[620, 1275], [2150, 1275]] },
        { k: "linha", p: [[420, 2490], [1720, 2490]] },
        { k: "linha", p: [[590, 880], [590, 2560]] },
      ],
    }, // LED
  ],
};

// ---------------- parede da janela (foto deitada) ----------------
const venezianas: Forma[] = [];
for (let y = 790; y < 1400; y += 48) {
  venezianas.push({ k: "linha", p: [[1680, y], [2020, y]] });
  venezianas.push({ k: "linha", p: [[2080, y], [2420, y]] });
}

export const JANELA: Parede = {
  foto: staticFile("reforma/parede-janela.jpg"),
  W: 4032,
  H: 2268,
  de: 48.5,
  ate: 56.75,
  cam: [
    [48.5, 2050, 1134, 1],
    [52.85, 2050, 1134, 1],
    [53.3, 1720, 1134, 1],
    [54.65, 1720, 1134, 1],
    [55.1, 2330, 1134, 1],
    [56.75, 2280, 1134, 1.04],
  ],
  elementos: [
    {
      t: 50.1,
      dur: 0.6,
      some: 51.55,
      formas: [
        { k: "ret", x: 1450, y: 700, w: 1270, h: 1180 },
        { k: "linha", p: [[1450, 700], [2720, 1880]] },
        { k: "linha", p: [[2720, 700], [1450, 1880]] },
      ],
    }, // tirar essa porta (X)
    {
      t: 51.6,
      dur: 1.0,
      formas: [
        { k: "ret", x: 1620, y: 720, w: 860, h: 720 },
        { k: "linha", p: [[2050, 720], [2050, 1440]] },
        { k: "ret", x: 1580, y: 1440, w: 940, h: 30 },
        ...venezianas,
      ],
    }, // nova janela
    {
      t: 52.95,
      dur: 0.9,
      formas: [
        { k: "linha", p: [[2180, 1480], [1340, 1480], [980, 1640], [1000, 1690], [1340, 1530], [2180, 1530], [2180, 1480]] },
        { k: "ret", x: 1850, y: 1530, w: 320, h: 330 },
        { k: "linha", p: [[1850, 1640], [2170, 1640]] },
        { k: "linha", p: [[1850, 1750], [2170, 1750]] },
        { k: "linha", p: [[1360, 1530], [1360, 1860]] },
        { k: "linha", p: [[1010, 1690], [1010, 1960]] },
      ],
    }, // escrivaninha em L
    {
      t: 54.0,
      dur: 0.8,
      formas: [
        { k: "linha", p: [[1040, 1060], [1310, 960], [1310, 990], [1040, 1092], [1040, 1060]] },
        { k: "linha", p: [[1040, 1250], [1310, 1150], [1310, 1180], [1040, 1282], [1040, 1250]] },
        ...vaso(1180, 1000, 70, 60, 160),
        ...livros(1090, 1225, 110),
      ],
    }, // prateleiras
    {
      t: 54.8,
      dur: 0.7,
      formas: [
        { k: "path", d: "M 2390 1660 L 2390 1460 Q 2390 1400 2450 1400 L 2590 1400 Q 2650 1400 2650 1460 L 2650 1660" },
        { k: "ret", x: 2330, y: 1580, w: 90, h: 200 },
        { k: "ret", x: 2620, y: 1580, w: 90, h: 200 },
        { k: "ret", x: 2410, y: 1660, w: 220, h: 100 },
        { k: "linha", p: [[2350, 1780], [2340, 1860]] },
        { k: "linha", p: [[2690, 1780], [2700, 1860]] },
      ],
    }, // poltrona
    {
      t: 55.47,
      dur: 0.6,
      formas: [
        { k: "path", d: "M 2800 1870 L 2800 1250 Q 2800 1130 2700 1150" },
        { k: "linha", p: [[2600, 1150], [2730, 1150], [2770, 1270], [2560, 1270], [2600, 1150]] },
        { k: "linha", p: [[2740, 1870], [2860, 1870]] },
      ],
    }, // abajur
    {
      t: 56.08,
      dur: 0.6,
      formas: [
        { k: "linha", p: [[2200, 1760], [2300, 1760], [2285, 1870], [2215, 1870], [2200, 1760]] },
        { k: "curva", p: [[2250, 1760], [2200, 1660], [2150, 1600]] },
        { k: "curva", p: [[2250, 1760], [2260, 1640], [2245, 1540]] },
        { k: "curva", p: [[2250, 1760], [2310, 1660], [2360, 1610]] },
        { k: "elipse", cx: 2160, cy: 1610, w: 60, h: 35 },
        { k: "elipse", cx: 2245, cy: 1545, w: 40, h: 60 },
        { k: "elipse", cx: 2350, cy: 1615, w: 60, h: 35 },
      ],
    }, // plantinha
  ],
};

// ---------------- piso (sobre o vídeo do quarto vazio, coordenadas da tela 1080x1920) ----------------
const pisoTabuas: Forma[] = [];
for (let xb = -700; xb <= 2200; xb += 150) {
  // linhas saindo do ponto de fuga (~ porta), começando no rodapé
  const vx = 380, vy = 1020;
  const a = (1180 - vy) / (1920 - vy);
  pisoTabuas.push({ k: "linha", p: [[vx + (xb - vx) * a, 1180], [xb, 1920]] });
}
export const PISO: Elemento = { t: 57.55, dur: 0.75, formas: pisoTabuas };
