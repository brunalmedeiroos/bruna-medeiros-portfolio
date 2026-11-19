"""Gera src/reel05-data.ts (legenda palavra por palavra, Reels 05 Natal).
Uso: python3 reels/05-natal/gerar.py reels/05-natal/palavras.json src/reel05-data.ts"""
import json, math, re, sys
W = json.load(open(sys.argv[1]))
FIX = {"surgiu": "surgia"}
KEY = {"desafio", "natal", "caso", "criminal", "envelopes", "suspeito", "viciada", "ninguém",
       "mentiu", "quatro", "horas", "melhor", "experiência", "próximo"}
ws = []
for t, s, e in W:
    t = t.strip(); p = bool(re.search(r"[,.?!]$", t)); t = re.sub(r"[,.!?]$", "", t)
    t = FIX.get(t, t)
    if t == "Foto": p = True  # lista: foto, suspeito, depoimento, jornal
    ws.append([t, s, e, p])
# "ele minte um depoimento" -> "ele mentiu no depoimento"
for i, w in enumerate(ws):
    if w[0] == "minte" and ws[i + 1][0] == "um":
        w[0] = "mentiu"; ws[i + 1][0] = "no"
sents, cur = [], []
for w in ws:
    cur.append(w)
    if w[3]: sents.append(cur); cur = []
if cur: sents.append(cur)
chunks = []
for s in sents:
    n = len(s); k = math.ceil(n / 3); base, extra = divmod(n, k); i = 0
    for j in range(k):
        sz = base + (1 if j < extra else 0); chunks.append(s[i:i + sz]); i += sz
out = []
for i, c in enumerate(chunks):
    s = c[0][1]; nxt = chunks[i + 1][0][1] if i + 1 < len(chunks) else None
    e = max(c[-1][2] + 0.25, c[-1][1] + 0.4)
    if nxt is not None: e = nxt if nxt - e < 0.4 else min(e, nxt)
    out.append({"s": round(s, 2), "e": round(e, 2),
                "w": [{"t": "Natal" if x[0].lower() == "natal" else x[0].lower(), "k": x[0].lower() in KEY, "s": round(x[1], 2)} for x in c]})
dur = round(W[-1][2] + 0.6, 2)
open(sys.argv[2], "w").write("// gerado por reels/05-natal/gerar.py\nexport const DURACAO_S = " + str(dur) + ";\nexport const LEGENDA = " + json.dumps(out, ensure_ascii=False) + ";\n")
for o in out: print(o["s"], " ".join(("*" + w["t"]) if w["k"] else w["t"] for w in o["w"]))
