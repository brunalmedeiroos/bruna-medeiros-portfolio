#!/usr/bin/env python3
"""Legenda do ep. 2: texto certo alinhado aos tempos do Whisper (palavras.json, já no áudio final). Gera ../../src/reel06-data.ts"""
import json, os, re, difflib, unicodedata
D = os.path.dirname(os.path.abspath(__file__))
TEXTO = """Eu tô reformando o meu quarto, que também é meu estúdio de gravação, e que antes estava assim.
Esse é o episódio 2, e se você não viu o primeiro, eu recomendo assistir antes e depois voltar pra esse aqui pra você entender melhor.
A reforma começou colocando as cerâmicas na parede, e depois a remoção dessa porta pra colocar a janela. E olha isso!
Eu tô completamente apaixonada nessa nova janela. Eu já tô imaginando os vídeos que eu vou fazer aqui de frente pra essa janela, porque olha essa iluminação!
Foi uma semana pra fazer essa etapa, e agora nós temos mais duas etapas: comprar as coisas que estão faltando e a parte da pintura.
Eu já tô olhando algumas coisinhas aqui na Shopee pra comprar, e se vocês quiserem ver tudo que eu estou escolhendo, comenta QUARTO aqui, que no próximo episódio eu trago todas as minhas escolhas pra essa reforma.
Ai, não esquece de me seguir pra acompanhar e ver o resultado final. É isso! Beijo!"""
n = lambda s: unicodedata.normalize("NFKD", re.sub(r"[^\w]", "", s.lower())).encode("ascii", "ignore").decode()
ws = [[p.strip(), a, b] for p, a, b in json.load(open(os.path.join(D, "palavras.json")))]
sc = TEXTO.split()
sm = difflib.SequenceMatcher(None, [n(x) for x in sc], [n(x[0]) for x in ws], autojunk=False)
tm = [None] * len(sc)
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op == "equal":
        for k in range(i2 - i1): tm[i1 + k] = (ws[j1 + k][1], ws[j1 + k][2])
    elif op == "replace" and j2 > j1:
        a, b = ws[j1][1], ws[j2 - 1][2]
        for k in range(i2 - i1): tm[i1 + k] = (a + (b - a) * k / (i2 - i1), a + (b - a) * (k + 1) / (i2 - i1))
for i in range(len(sc)):
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
KEEP = ("QUARTO", "Shopee")
leg = []
for k, g in enumerate(grupos):
    s = g[0][1]; e = grupos[k + 1][0][1] if k + 1 < len(grupos) else g[-1][2] + 0.4
    e = min(e, g[-1][2] + 0.6)
    leg.append({"s": round(s, 2), "e": round(e, 2), "w": [{"t": (lambda t: t if t in KEEP else t.lower())(re.sub(r"[,.:]$", "", x[0])), "s": round(x[1], 2)} for x in g]})
json.dump(pal, open(os.path.join(D, "palavras-final.json"), "w"), ensure_ascii=False)
dur = round(pal[-1][2] + 0.6, 2)
open(os.path.join(D, "../../src/reel06-data.ts"), "w").write(
    "// gerado por reels/06-reforma-ep2/gerar.py (narração ep. 2, 1,1x)\n"
    f"export const LEGENDA = {json.dumps(leg, ensure_ascii=False)};\nexport const DURACAO_S = {dur};\n")
print(dur); print(" | ".join(" ".join(x["t"] for x in g["w"]) + f"@{g['s']}" for g in leg))
