#!/usr/bin/env python3
"""Sintetiza o som de giz riscando na parede (3 variações de 2 s) em public/sfx/giz-N.wav.
Giz = ruído agudo filtrado (1,5-8 kHz) com "agarra-solta" (stick-slip ~90-160 Hz irregular),
traços curtos de 0,12-0,35 s com ataque rápido, e um toquinho grave no começo de cada traço."""
import numpy as np, soundfile as sf, os
from scipy.signal import butter, sosfilt
SR = 48000
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/sfx")
def bp(x, lo, hi, o=4): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
for v in range(3):
    rng = np.random.default_rng(10 + v)
    n = int(2.0 * SR); y = np.zeros(n)
    t = 0.0
    while t < 1.95:
        d = rng.uniform(0.12, 0.35); a = int(t * SR); m = min(int(d * SR), n - a)
        if m <= 0: break
        k = np.arange(m) / SR
        ruido = bp(rng.standard_normal(m), 1500, 8000)
        # agarra-solta: pulsos irregulares
        f0 = rng.uniform(90, 160); fase = np.cumsum(2 * np.pi * (f0 + 25 * rng.standard_normal(m)) / SR)
        gr = (0.5 + 0.5 * np.sin(fase)) ** 3
        env = np.minimum(1, k / 0.012) * np.minimum(1, (d - k) / 0.04) * rng.uniform(0.6, 1.0)
        traco = ruido * (0.35 + 0.65 * gr) * env
        # toquinho do giz encostando
        tq = bp(rng.standard_normal(min(m, 900)), 300, 1800) * np.exp(-np.arange(min(m, 900)) / 120) * 0.6
        traco[: len(tq)] += tq
        y[a:a + m] += traco
        t += d + rng.uniform(0.02, 0.09)
    y = bp(y, 1200, 9000, 2)
    y = y / np.max(np.abs(y)) * 0.7
    sf.write(os.path.join(out, f"giz-{v+1}.wav"), y.astype(np.float32), SR)
print("ok")
