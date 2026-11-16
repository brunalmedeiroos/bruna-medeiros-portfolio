#!/usr/bin/env python3
"""Gera src/reel04-data.ts (legenda palavra por palavra) a partir de limpa_palavras.json.
A legenda corrige o que o Whisper ouviu errado; a voz não muda."""
import json, os, re
D = os.path.dirname(os.path.abspath(__file__))
w = json.load(open(os.path.join(D, "limpa_palavras.json")))
pal = [[x[0].strip(), x[1], x[2]] for x in w]
# junta "convendo" + "-os"
out = []
for p in pal:
    if p[0].startswith("-") and out:
        out[-1][0] += p[0]; out[-1][2] = p[2]
    else:
        out.append(p)
pal = out
FIX = {"atendendo": "metendo", "burmo,": "durmo,", "convendo-os": "convenhamos", "votos": "fotos",
       "chat": "chat", "EPT.": "GPT.", "né,": "não é", "ele,": "L,", "ideia.": "ideia:"}
for p in pal:
    if p[0] in FIX: p[0] = FIX[p[0]]
# "chat de GPT" -> "chatGPT"
i = 0
while i < len(pal) - 2:
    if pal[i][0] == "chat" and pal[i+1][0] == "de" and pal[i+2][0] == "GPT.":
        pal[i] = ["chatGPT.", pal[i][1], pal[i+2][2]]; del pal[i+1:i+3]
    i += 1
# "um decoração" -> "decoração" ; "e com decoração" -> "com decoração"
pal = [p for j, p in enumerate(pal) if not (p[0] in ("um", "e") and j+1 < len(pal) and pal[j+1][0] in ("decoração,", "com") and (p[0] == "um" or pal[j+1][0] == "com"))]
grupos, cur = [], []
for j, p in enumerate(pal):
    cur.append(p)
    fim = re.search(r"[,.?!:]$", p[0]) or len(cur) == 3 or len(" ".join(x[0] for x in cur)) > 15
    if fim:
        grupos.append(cur); cur = []
if cur: grupos.append(cur)
leg = []
for k, g in enumerate(grupos):
    s = g[0][1]
    e = grupos[k+1][0][1] if k+1 < len(grupos) else g[-1][2] + 0.4
    e = min(e, g[-1][2] + 0.6)
    leg.append({"s": round(s, 2), "e": round(e, 2), "w": [{"t": (lambda t: t if t in ("TV", "LED", "chatGPT", "Pinterest", "L") else t.lower())(re.sub(r"[,.:]$", "", x[0])), "s": round(x[1], 2)} for x in g]})
dur = round(pal[-1][2] + 0.6, 2)
open(os.path.join(D, "../../src/reel04-data.ts"), "w").write(
    "// gerado por reels/04-reforma/gerar.py (legenda corrige: metendo, durmo, convenhamos, fotos, chatGPT, em L)\n"
    f"export const LEGENDA = {json.dumps(leg, ensure_ascii=False)};\nexport const DURACAO_S = {dur};\n")
print(" | ".join(" ".join(x["t"] for x in g["w"]) for g in leg)); print(dur)
