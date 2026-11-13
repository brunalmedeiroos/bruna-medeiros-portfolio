"""Gera src/<saida>.ts com legenda palavra por palavra (Blant).
Uso: python3 gerar.py <palavras.json> <src/arquivo.ts>"""
import json, math, re, sys
W = json.load(open(sys.argv[1]))
FIX = {"agressimento": "emagrecimento", "Ablante": "Blant", "Blanche": "Blant", "Nile": "Nail",
       "forfalecimento": "fortalecimento", "Buster": "Booster", "Esmalta": "esmaltes", "Score": "Coretrat",
       "3": "três", "72": "72"}
DROP = {"&", "Trat"}  # "Score & Trat" vira "Coretrat"
KEY = {"frágeis", "emagrecimento", "acelerado", "trio", "nutrientes", "frágil", "fina", "quebradiça", "Blant",
       "combo", "fortalecimento", "esmaltação", "hidratação", "Maximus", "Nail", "10x1", "fortalecer", "hidratar",
       "resistência", "pintar", "tratamento", "Coretrat", "Booster", "72", "horas", "prática", "simples", "link"}
NOMES = {"Blant", "Maximus", "Nail", "10x1", "Coretrat", "Booster"}
ws = []
for t, s, e in W:
    t = t.strip(); p = bool(re.search(r"[,.?!]$", t)); t = re.sub(r"[,.!?]$", "", t)
    if t in DROP:
        if p and ws: ws[-1][3] = True
        continue
    t = FIX.get(t, t)
    if t == "em" and ws and ws[-1][0] == "alimentação": t = "e"
    if t == "caneta": t = "Caneta"
    ws.append([t, s, e, p])
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
                "w": [{"t": x[0] if x[0] in NOMES else x[0].lower(), "k": x[0] in KEY, "s": round(x[1], 2)} for x in c]})
dur = W[-1][2] + 0.5
open(sys.argv[2], "w").write("// gerado por reels/03-blant/gerar.py\nexport const LEGENDA = " + json.dumps(out, ensure_ascii=False) + ";\n")
for o in out: print(o["s"], " ".join(("*" + w["t"]) if w["k"] else w["t"] for w in o["w"]))
