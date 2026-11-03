#!/usr/bin/env python3
"""Transcreve um arquivo (video/audio) em trechos de fala.
Uso: python3 transcrever.py <arquivo> <saida_prefixo> [--palavras]
Gera <prefixo>_trechos.txt (cada trecho de fala com tempo + texto, para escolher a ULTIMA versao de cada frase)
e, com --palavras, <prefixo>_palavras.json (palavra, inicio, fim) da transcricao completa.
Requer: pip install faster-whisper av ; ffmpeg. Transcrever em partes de ate 2 min se travar.
"""
import json, subprocess, sys, tempfile, wave
import numpy as np
from faster_whisper import WhisperModel

src, prefixo = sys.argv[1], sys.argv[2]
tmp = tempfile.mktemp(suffix=".wav")
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-vn","-ac","1","-ar","16000",tmp],check=True)
w = wave.open(tmp); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768
dur = len(a)/16000
# silencios -> trechos de fala
r = subprocess.run(["ffmpeg","-hide_banner","-i",tmp,"-af","silencedetect=n=-38dB:d=0.3","-f","null","-"],capture_output=True,text=True).stderr
import re
t = [float(x) for x in re.findall(r"silence_(?:start|end): ([0-9.]+)", r)]
sil = [(t[i], t[i+1]) for i in range(0, len(t)-1, 2)]
fala, cur = [], 0.0
for s, e in sil:
    if s > cur: fala.append((cur, s))
    cur = e
if cur < dur: fala.append((cur, dur))
m = WhisperModel("small", compute_type="int8")
linhas = []
for s, e in fala:
    if e - s < 0.35: continue
    seg = a[int(max(0, s-0.1)*16000): int((e+0.1)*16000)]
    segs, _ = m.transcribe(seg, language="pt", vad_filter=False, beam_size=5)
    linhas.append(f"{s:7.2f}-{e:7.2f}  " + " ".join(x.text.strip() for x in segs))
open(prefixo+"_trechos.txt","w").write("\n".join(linhas))
print("\n".join(linhas))
if "--palavras" in sys.argv:
    segs, _ = m.transcribe(a, language="pt", word_timestamps=True, vad_filter=True)
    out = [(x.word, round(x.start,2), round(x.end,2)) for s in segs for x in s.words]
    json.dump(out, open(prefixo+"_palavras.json","w"), ensure_ascii=False)
