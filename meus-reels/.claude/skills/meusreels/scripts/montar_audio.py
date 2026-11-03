#!/usr/bin/env python3
"""Monta a narracao limpa: so as ULTIMAS versoes de cada frase, sem pausas (~0,05 s entre frases).
Uso: python3 montar_audio.py takes.json saida_dir
takes.json = [["arquivo.mp4", inicio_s, fim_s, "rotulo"], ...]  (inicio/fim = trecho de fala escolhido em transcrever.py)
Gera saida_dir/narracao-limpa.wav e saida_dir/mapa-de-cenas.json (inicio/fim de cada trecho na narracao final + origem).
CUIDADO: afade=t=out precisa de st= (senao o audio inteiro some).  loudnorm so em passo separado.
"""
import json, os, subprocess, sys
takes = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
GAP, HEAD, TAIL = 0.05, 0.03, 0.05
inp, fc, lab, meta, t = [], [], [], [], 0.0
for i, (f, s, e, n) in enumerate(takes):
    s0, e0 = max(0, s-HEAD), e+TAIL; d = e0-s0
    gap = 0.15 if i+1 == len(takes) else GAP
    inp += ["-i", f]
    fc.append(f"[{i}:a]atrim={s0:.3f}:{e0:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={d-0.04:.3f}:d=0.04,apad=pad_dur={gap}[a{i}]")
    lab.append(f"[a{i}]"); meta.append({"cena": n, "inicio": round(t,3), "fim": round(t+d,3), "origem": [f, s, e]}); t += d+gap
fc.append("".join(lab)+f"concat=n={len(takes)}:v=0:a=1[out]")
bruta = os.path.join(out, "bruta.wav")
subprocess.run(["ffmpeg","-v","error","-y"]+inp+["-filter_complex",";".join(fc),"-map","[out]","-ar","44100",bruta],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-i",bruta,"-af","loudnorm=I=-16:TP=-1.5:LRA=11","-ar","44100",os.path.join(out,"narracao-limpa.wav")],check=True)
os.remove(bruta)
json.dump(meta, open(os.path.join(out,"mapa-de-cenas.json"),"w"), ensure_ascii=False, indent=1)
print("duracao total:", round(t,2), "s")
