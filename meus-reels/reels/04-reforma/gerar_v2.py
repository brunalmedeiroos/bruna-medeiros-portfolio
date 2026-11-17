#!/usr/bin/env python3
"""Legenda da narração v2: texto certo (roteiro falado) alinhado aos tempos do Whisper (n2_palavras.json), áudio 1,1x mais rápido.
Gera ../../src/reel04-data.ts"""
import json, os, re, difflib, unicodedata
D = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(D, "v2"); VEL = 1.1
TEXTO = """Esse é o quarto onde eu durmo, trabalho e gravo todos os meus conteúdos e convenhamos que isso aqui não está nem um pouco bonito.
Por isso, eu resolvi reformar o meu quarto e transformar também no meu estúdio de gravação. E vocês vão acompanhar todo o processo. Bora lá?
Para começar, eu tinha que ter uma ideia de mais ou menos como eu queria. Então, eu juntei referências do Pinterest com fotos do meu quarto hoje e eu mandei para o meu querido arquiteto ChatGPT.
E olha, não é por nada não, mas eu amei o projeto que a gente criou. Então, vamos para a ideia:
Na parede da cama, eu pensei em um ripado com uma prateleira e uma pintura de listras em cima, algumas decorações na prateleira, LED, minha cama e duas mesinhas de cabeceira.
Na parede da penteadeira, vai a penteadeira, mais uma prateleira com decoração, LED e uns quadrinhos.
Na parede da TV, que eu ainda não tenho a TV, vai a TV, um móvel embaixo de apoio que junta com a minha escrivaninha, uma prateleira com decoração, um ripado e LED.
Já na parede da janela, a gente vai tirar essa porta e colocar uma nova janela, uma escrivaninha em L, prateleiras, uma poltrona, abajur e uma plantinha.
E eu também quero mudar o piso do quarto. Esse é o projeto e a reforma já começou esta semana. Mas isso vai ficar para o próximo vídeo. É isso. Beijo!"""
n = lambda s: unicodedata.normalize("NFKD", re.sub(r"[^\w]", "", s.lower())).encode("ascii", "ignore").decode()
ws = json.load(open(os.path.join(V, "n2_palavras.json")))
ws = [[p.strip(), a / VEL, b / VEL] for p, a, b in ws]
sc = TEXTO.split()
sm = difflib.SequenceMatcher(None, [n(x) for x in sc], [n(x[0]) for x in ws], autojunk=False)
tm = [None] * len(sc)
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op == "equal":
        for k in range(i2 - i1): tm[i1 + k] = (ws[j1 + k][1], ws[j1 + k][2])
    elif op == "replace" and j2 > j1:
        a, b = ws[j1][1], ws[j2 - 1][2]
        for k in range(i2 - i1): tm[i1 + k] = (a + (b - a) * k / (i2 - i1), a + (b - a) * (k + 1) / (i2 - i1))
for i in range(len(sc)):  # palavras sem tempo: entre as vizinhas
    if tm[i] is None:
        p = next(tm[j] for j in range(i - 1, -1, -1) if tm[j]); q = next((tm[j] for j in range(i + 1, len(sc)) if tm[j]), (p[1] + 0.2, p[1] + 0.3))
        tm[i] = (p[1], max(p[1] + 0.05, q[0]))
pal = [[w, a, b] for w, (a, b) in zip(sc, tm)]
grupos, cur = [], []
for p in pal:
    cur.append(p)
    if re.search(r"[,.?!:]$", p[0]) or len(cur) == 3 or len(" ".join(x[0] for x in cur)) > 15:
        grupos.append(cur); cur = []
if cur: grupos.append(cur)
leg = []
KEEP = ("TV", "LED", "ChatGPT", "Pinterest", "L")
for k, g in enumerate(grupos):
    s = g[0][1]; e = grupos[k + 1][0][1] if k + 1 < len(grupos) else g[-1][2] + 0.4
    e = min(e, g[-1][2] + 0.6)
    leg.append({"s": round(s, 2), "e": round(e, 2), "w": [{"t": (lambda t: t if t in KEEP else t.lower())(re.sub(r"[,.:]$", "", x[0])), "s": round(x[1], 2)} for x in g]})
json.dump(pal, open(os.path.join(V, "palavras-final.json"), "w"), ensure_ascii=False)
dur = round(pal[-1][2] + 0.6, 2)
open(os.path.join(D, "../../src/reel04-data.ts"), "w").write(
    "// gerado por reels/04-reforma/gerar_v2.py (narração v2 de 2026-11-17, 1,1x)\n"
    f"export const LEGENDA = {json.dumps(leg, ensure_ascii=False)};\nexport const DURACAO_S = {dur};\n")
print(dur); print(" | ".join(" ".join(x["t"] for x in g["w"]) + f"@{g['s']}" for g in leg))
