# Trilha original, leve e clean (beauty/UGC). 104 bpm, C - G - Am - F.
# --suave: 88 bpm, sem bateria (só piano elétrico, baixo e dedilhado), mais calma.
import numpy as np, wave, sys
sr=44100; SUAVE='--suave' in sys.argv; bpm=88 if SUAVE else 104; beat=60/bpm; dur=float(sys.argv[2]); n=int(dur*sr)
out=np.zeros((n,2)); rng=np.random.default_rng(11)
def note(m): return 440*2**((m-69)/12)
def add(x,start,pan=0.0,g=1.0):
    i=int(start*sr); j=min(n,i+len(x))
    if i>=n: return
    out[i:j,0]+=x[:j-i]*g*(1-pan)/1; out[i:j,1]+=x[:j-i]*g*(1+pan)/1
def ep(f,d):  # piano elétrico suave
    t=np.arange(int(d*sr))/sr
    x=np.sin(2*np.pi*f*t+0.6*np.sin(2*np.pi*f*t)*np.exp(-t*3))*np.exp(-t*1.6)
    return x*(1-np.exp(-t*200))
def pluck(f,d=0.5):
    t=np.arange(int(d*sr))/sr
    return (np.sin(2*np.pi*f*t)+0.3*np.sin(4*np.pi*f*t))*np.exp(-t*7)*(1-np.exp(-t*800))
def kick():
    t=np.arange(int(0.35*sr))/sr
    return np.sin(2*np.pi*np.cumsum(50+90*np.exp(-t*30))/sr)*np.exp(-t*9)
def hat():
    t=np.arange(int(0.06*sr))/sr; x=rng.standard_normal(len(t)); x=np.diff(np.concatenate([[0],x]))
    return x*np.exp(-t*80)
def clap():
    t=np.arange(int(0.2*sr))/sr; return rng.standard_normal(len(t))*np.exp(-t*25)
def bass(f,d):
    t=np.arange(int(d*sr))/sr; return np.sin(2*np.pi*f*t)*np.exp(-t*2.5)*(1-np.exp(-t*300))
prog=[(48,[60,64,67,72]),(43,[59,62,67,71]),(45,[60,64,69,72]),(41,[60,65,69,72])]
arp=[0,2,1,3,2,1,3,2]
bar=4*beat; nbars=int(dur/bar)+1
for b in range(nbars):
    root,ch=prog[b%4]; t0=b*bar
    for m in ch: add(ep(note(m),bar*0.95),t0,0,0.10)
    add(bass(note(root),bar*0.9),t0,0,0.35)
    if b>=1:
        for k in range(8): add(pluck(note(ch[arp[k]]+12)),t0+k*beat/2,0.35*(1 if k%2 else -1),0.045 if SUAVE else 0.07)
    if b>=2 and not SUAVE:
        for k in range(4):
            if k in (0,2): add(kick(),t0+k*beat,0,0.45)
            if k in (1,3): add(clap(),t0+k*beat,0,0.07)
        if not SUAVE:
          for k in range(8): add(hat(),t0+k*beat/2+(0.02 if k%2 else 0),0.2,0.12)
# reverb simples
ir=rng.standard_normal(int(1.2*sr))*np.exp(-np.arange(int(1.2*sr))/sr*4)*0.03
for c in range(2): out[:,c]+=np.convolve(out[:,c],ir)[:n]
t=np.arange(n)/sr; env=np.minimum(1,t/1.5)*np.minimum(1,(dur-t)/2.0)
out*=env[:,None]; out/=np.max(np.abs(out)); out*=0.9
w=wave.open(sys.argv[1],"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out*32767).astype(np.int16).tobytes())
