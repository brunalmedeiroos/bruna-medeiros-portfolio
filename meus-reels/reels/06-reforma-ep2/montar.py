#!/usr/bin/env python3
"""Ep. 2: corta silêncios/respiros da gravação crua (sem limpeza), usa a última tomada de cada frase,
acelera 1,1x e iguala volume (loudnorm linear). Gera narracao.wav, mapa.json e palavras.json (tempos no áudio final)."""
import json, re, subprocess, os
D = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(D, "cru.wav")
# fora: 1a tentativa "Ai, não esquece de me seguir pra conseguir acompanhar" (53,5-56,3)
KEEP = [(0.3, 53.3), (56.35, 61.2)]
VEL = 1.1
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
fc.append("".join(lab) + f"concat=n={len(ilhas)}:v=0:a=1,atempo={VEL},loudnorm=I=-16:TP=-1.5:LRA=11:linear=true[out]")
subprocess.run(["ffmpeg","-v","error","-y","-i",SRC,"-filter_complex",";".join(fc),"-map","[out]","-ar","48000",os.path.join(D,"narracao.wav")],check=True)
json.dump(mapa, open(os.path.join(D,"mapa.json"),"w"))
def conv(x):
    for s0, e0, n in mapa:
        if s0 - 0.02 <= x <= e0 + 0.02: return (n + min(max(x - s0, 0), e0 - s0)) / VEL
    return None
w = json.load(open(os.path.join(D,"nar_palavras.json")))
out = []
for p, a, b in w:
    if not any(k[0] <= (a+b)/2 <= k[1] for k in KEEP): continue
    na, nb = conv(a), conv(b)
    if na is None and nb is None: continue
    na = na if na is not None else nb - 0.15; nb = nb if nb is not None else na + 0.2
    out.append([p, round(na,3), round(nb,3)])
json.dump(out, open(os.path.join(D,"palavras.json"),"w"), ensure_ascii=False)
print(len(ilhas), "ilhas, duração", round(novo/VEL,2)); print(" ".join(f"{x[0].strip()}@{x[1]}" for x in out))
