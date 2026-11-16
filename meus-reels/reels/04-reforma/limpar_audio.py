#!/usr/bin/env python3
"""Tira o ruído da narração (v2, com vento): passa-alta íngreme 140 Hz (vento grave),
declick, redução de ruído adaptativa forte (noisereduce, 2 passadas), afftdn, portão suave
nas pausas e loudnorm.  Uso: python3 limpar_audio.py entrada saida.wav"""
import subprocess, sys, tempfile, soundfile as sf, noisereduce as nr
src, out = sys.argv[1], sys.argv[2]
t1, t2 = tempfile.mktemp(suffix=".wav"), tempfile.mktemp(suffix=".wav")
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-vn","-ac","1","-ar","48000","-af",
  "highpass=f=140:p=2,highpass=f=140:p=2,adeclick=w=55:o=75:t=2,lowpass=f=12500",t1],check=True)
a, sr = sf.read(t1)
b = nr.reduce_noise(y=a, sr=sr, stationary=False, prop_decrease=0.92, time_constant_s=1.0, n_fft=2048, freq_mask_smooth_hz=300)
b = nr.reduce_noise(y=b, sr=sr, stationary=True, prop_decrease=0.45, n_fft=2048)
sf.write(t2, b, sr)
subprocess.run(["ffmpeg","-v","error","-y","-i",t2,"-af",
  "afftdn=nr=12:nf=-45:tn=1,agate=threshold=0.005:ratio=2:attack=8:release=250:range=0.45,deesser=i=0.3,loudnorm=I=-16:TP=-1.5:LRA=11",
  "-ar","48000",out],check=True)
