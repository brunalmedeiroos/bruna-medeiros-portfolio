#!/usr/bin/env python3
"""Gera src/<nome>-data.ts (PECAS, LEGENDA, DURACAO_S) a partir da transcricao da narracao limpa.
Uso: python3 gerar_legenda.py narracao_palavras.json mapa-de-cenas.json src/reelNN-data.ts [duracao_s]
Legenda: 1 a 3 palavras, frases balanceadas, minusculas, palavras-chave em dourado (KEY), correcoes em FIX.
Edite KEY/FIX por video. Pecas: {inicio, video, de} = onde cada corte entra e de qual ponto do bruto (frames = s*30).
"""
import json, math, re, sys
W = json.load(open(sys.argv[1])); M = json.load(open(sys.argv[2])); dest = sys.argv[3]
dur = float(sys.argv[4]) if len(sys.argv) > 4 else M[-1]["fim"]
FIX = {}            # ex.: {"conectando": "conectados"}  (so a legenda muda, nunca a voz)
KEY = set()         # palavras que ficam na cor de destaque
ws = []
for t, s, e in W:
    t = t.strip(); p = bool(re.search(r"[,.?!]$", t))
    ws.append([re.sub(r"[,.]$", "", t), s, e, p])
ws = [[FIX.get(a, a), b, c, d] for a, b, c, d in ws]
sents, cur = [], []
for w in ws:
    cur.append(w)
    if w[3] or w[0].endswith(("?", "!")): sents.append(cur); cur = []
if cur: sents.append(cur)
chunks = []
for s in sents:
    n = len(s); k = math.ceil(n/3); base, extra = divmod(n, k); i = 0
    for j in range(k):
        sz = base+(1 if j < extra else 0); chunks.append(s[i:i+sz]); i += sz
out = []
for i, c in enumerate(chunks):
    s = c[0][1]; nxt = chunks[i+1][0][1] if i+1 < len(chunks) else None
    e = c[-1][2]+0.25
    if nxt is not None: e = nxt if nxt-c[-1][2] < 0.4 else min(e, nxt)
    out.append({"s": round(s,2), "e": round(e,2), "w": [{"t": x[0].lower(), "k": x[0] in KEY} for x in c]})
pecas = [{"inicio": m["inicio"], "video": m["origem"][0], "de": round(m["origem"][1]-0.03, 3)} for m in M]
open(dest, "w").write("export const PECAS = "+json.dumps(pecas)+";\nexport const LEGENDA = "+json.dumps(out, ensure_ascii=False)+f";\nexport const DURACAO_S = {dur};\n")
print(len(out), "trechos de legenda ->", dest)
