#!/usr/bin/env python3
"""Mapa de tempo: segundos da narração antiga (v1, onde estão as cenas/giz/sons) -> segundos da narração nova (v2).
Gera ../../src/reel04-tempo.ts com pontos [antigo, novo] (palavras iguais nas duas falas)."""
import json, os, re, difflib, unicodedata
D = os.path.dirname(os.path.abspath(__file__))
n = lambda s: unicodedata.normalize("NFKD", re.sub(r"[^\w]", "", s.lower())).encode("ascii", "ignore").decode()
old = [[p.strip(), a, b] for p, a, b in json.load(open(os.path.join(D, "limpa_palavras.json")))]
new = json.load(open(os.path.join(D, "v2/palavras-final.json")))
sm = difflib.SequenceMatcher(None, [n(x[0]) for x in old], [n(x[0]) for x in new], autojunk=False)
pts = []
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op == "equal":
        for k in range(i2 - i1): pts.append((old[i1 + k][1], new[j1 + k][1]))
pts.sort(); mono = []
for a, b in pts:  # só pontos crescentes nas duas
    if not mono or (a > mono[-1][0] + 0.05 and b > mono[-1][1] + 0.03): mono.append((round(a, 2), round(b, 2)))
fim_old, fim_new = old[-1][2] + 0.6, new[-1][2] + 0.6
mono.append((round(fim_old, 2), round(fim_new, 2)))
open(os.path.join(D, "../../src/reel04-tempo.ts"), "w").write(
"""// gerado por reels/04-reforma/tempo_v2.py: [segundo na narração antiga, segundo na narração nova]
const P: [number, number][] = %s;
const lin = (x: number, a: 0 | 1, b: 0 | 1) => {
  if (x <= P[0][a]) return P[0][b] + (x - P[0][a]);
  for (let i = 1; i < P.length; i++) {
    if (x <= P[i][a]) {
      const [p, q] = [P[i - 1], P[i]];
      return p[b] + ((x - p[a]) * (q[b] - p[b])) / (q[a] - p[a]);
    }
  }
  const l = P[P.length - 1];
  return l[b] + (x - l[a]);
};
// antigo -> novo
export const T = (x: number) => lin(x, 0, 1);
// novo -> antigo
export const TV = (x: number) => lin(x, 1, 0);
""" % json.dumps(mono))
print(len(mono), "pontos"); print(mono[:6], mono[-4:])
