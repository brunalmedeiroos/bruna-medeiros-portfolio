#!/usr/bin/env python3
"""Narração v2 (2026-11-17): pega só as tomadas boas do áudio novo, corta silêncios e encurta pausas.
Gera v2/narracao2.wav e v2/mapa.json ([[ini_orig, fim_orig, ini_novo], ...]) e v2/palavras2.json (tempos já no áudio novo)."""
import json, re, subprocess, os
D = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(D, "v2")
SRC = os.path.join(V, "limpa-inteira.wav")
# tomadas que ficam (última versão de cada frase); fora: respiro antes de "Na parede da TV" (66,2-66,7), "por isso é de mim", 1as tentativas da parede da TV, ruído em 30,9-31,9
KEEP = [(0.86,6.6),(8.9,15.7),(17.35,26.3),(27.1,30.6),(32.5,43.7),(44.95,51.1),(66.8,76.45),(77.15,86.2),(87.3,89.5),(91.0,97.4)]
r = subprocess.run(["ffmpeg","-hide_banner","-i",SRC,"-af","silencedetect=n=-40dB:d=0.18","-f","null","-"],capture_output=True,text=True).stderr
t = [float(x) for x in re.findall(r"silence_(?:start|end): ([0-9.]+)", r)]
sil = [(t[i], t[i+1]) for i in range(0, len(t)-1, 2)]
ilhas = []
for a, b in KEEP:
    cur = a
    for s, e in sil:
        if e <= a or s >= b: continue
        if s > cur: ilhas.append((cur, s))
        cur = max(cur, e)
    if b > cur: ilhas.append((cur, b))
ilhas = [(a, b) for a, b in ilhas if b - a > 0.06]
HEAD, TAIL, GAP = 0.03, 0.07, 0.06
mapa, fc, lab, novo = [], [], [], 0.0
for i, (a, b) in enumerate(ilhas):
    s0, e0 = max(0, a - HEAD), b + TAIL; d = e0 - s0
    fc.append(f"[0:a]atrim={s0:.3f}:{e0:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={d-0.03:.3f}:d=0.03,apad=pad_dur={GAP}[a{i}]")
    lab.append(f"[a{i}]"); mapa.append([round(s0,3), round(e0,3), round(novo,3)]); novo += d + GAP
fc.append("".join(lab) + f"concat=n={len(ilhas)}:v=0:a=1[out]")
subprocess.run(["ffmpeg","-v","error","-y","-i",SRC,"-filter_complex",";".join(fc),"-map","[out]","-ar","48000",os.path.join(V,"narracao2.wav")],check=True)
json.dump(mapa, open(os.path.join(V,"mapa.json"),"w"))
def conv(x):
    for s0, e0, n in mapa:
        if s0 - 0.02 <= x <= e0 + 0.02: return n + min(max(x - s0, 0), e0 - s0)
    return None
w = json.load(open(os.path.join(V,"nar2_palavras.json")))
out = []
for p, a, b in w:
    na, nb = conv(a), conv(b)
    if na is None and nb is None: continue
    na = na if na is not None else nb - 0.15; nb = nb if nb is not None else na + 0.2
    if any(s0 - 0.02 <= a <= e0 + 0.02 or s0 - 0.02 <= b <= e0 + 0.02 for s0, e0, _ in mapa) and any(k[0] <= (a+b)/2 <= k[1] for k in KEEP):
        out.append([p, round(na,3), round(nb,3)])
json.dump(out, open(os.path.join(V,"palavras2.json"),"w"), ensure_ascii=False)
print(len(ilhas), "ilhas, duração", round(novo,2)); print(" ".join(x[0].strip() for x in out))
