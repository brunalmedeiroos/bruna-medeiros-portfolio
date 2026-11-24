#!/usr/bin/env python3
"""/modelocapcut: prepara a pasta do editor de cortes para um vídeo/áudio bruto.
Uso: python3 preparar.py <bruto> <palavras.json do transcrever.py> <saida_dir> [mapa.json com [ini,fim,...] do corte automático]
Gera <saida>/audio.mp3, <saida>/dados.json e copia editor.html. Publicar como Artifact com capabilities {db:{}};
os cortes salvos ficam no doc cortes/<id> (ajustar DOC no editor.html) e são lidos com ArtifactData."""
import json, os, shutil, subprocess, sys, tempfile, wave
import numpy as np
src, pal, out = sys.argv[1:4]; mapa = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(out, exist_ok=True)
tmp = tempfile.mktemp(suffix=".wav")
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-vn","-ac","1","-ar","48000",tmp],check=True)
subprocess.run(["ffmpeg","-v","error","-y","-i",tmp,"-c:a","libmp3lame","-b:a","128k",os.path.join(out,"audio.mp3")],check=True)
w = wave.open(tmp); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float)/32768
n = int(len(a)/sr*50); hop = len(a)//n
picos = [round(float(np.abs(a[i*hop:(i+1)*hop]).max()),3) for i in range(n)]
palavras = [[x[0].strip(), x[1], x[2]] for x in json.load(open(pal))]
trechos = [[m[0], m[1]] for m in json.load(open(mapa))] if mapa else [[0, len(a)/sr]]
json.dump({"dur": len(a)/sr, "picosPorSeg": 50, "picos": picos, "palavras": palavras, "trechos": trechos}, open(os.path.join(out,"dados.json"),"w"), ensure_ascii=False)
shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)),"editor.html"), out)
print("ok", out)
