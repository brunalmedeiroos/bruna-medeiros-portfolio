#!/usr/bin/env python3
"""Tira o ruído da narração: passa-alta, redução de ruído adaptativa (noisereduce), afftdn leve, loudnorm.
Uso: python3 limpar_audio.py entrada saida.wav"""
import subprocess, sys, tempfile, numpy as np, soundfile as sf, noisereduce as nr
src, out = sys.argv[1], sys.argv[2]
t1, t2 = tempfile.mktemp(suffix=".wav"), tempfile.mktemp(suffix=".wav")
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-vn","-ac","1","-ar","48000","-af","highpass=f=90,adeclick=w=55:o=75:t=2,lowpass=f=13000",t1],check=True)
a, sr = sf.read(t1)
b = nr.reduce_noise(y=a, sr=sr, stationary=False, prop_decrease=0.9, time_constant_s=1.5, n_fft=2048)
sf.write(t2, b, sr)
subprocess.run(["ffmpeg","-v","error","-y","-i",t2,"-af","afftdn=nr=8:nf=-50:tn=1,deesser=i=0.3,loudnorm=I=-16:TP=-1.5:LRA=11","-ar","48000",out],check=True)
