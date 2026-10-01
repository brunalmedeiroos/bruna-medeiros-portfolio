// ==========================================================================
// supabase/functions/pluggy-sync/index.ts
// ==========================================================================
// Busca os lançamentos bancários via Open Finance (conector MeuPluggy, na
// aplicação da Pluggy já autorizada pela Bruna) e grava em
// financeiro_transacoes. Chamada tanto pelo agendamento diário (pg_cron,
// com o segredo PLUGGY_CRON_SECRET) quanto pelo botão "Sincronizar agora"
// da aba Financeiro (com a sessão da usuária logada) — mesma lógica de
// autenticação dupla do radar-atualizar.
//
// A classificação (negócio/pessoal) é só da Bruna: o upsert abaixo nunca
// inclui a coluna "classificacao", então uma sincronização nova nunca
// apaga o que ela já marcou num lançamento existente.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { ehDono } from "../_shared/dono.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const PLUGGY_API = "https://api.pluggy.ai";

async function obterApiKey(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("pluggy_credenciais_ausentes");

  const resp = await fetch(`${PLUGGY_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!resp.ok) throw new Error(`pluggy_auth_falhou_${resp.status}`);
  const dados = await resp.json();
  return dados.apiKey;
}

// deno-lint-ignore no-explicit-any
async function chamarPluggy(apiKey: string, caminho: string): Promise<any> {
  const resp = await fetch(`${PLUGGY_API}${caminho}`, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!resp.ok) throw new Error(`pluggy_${resp.status}_${caminho}`);
  return resp.json();
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const authHeader = req.headers.get("Authorization") || "";
    const segredoCron = Deno.env.get("PLUGGY_CRON_SECRET") ?? "";
    const ehCron = !!segredoCron && authHeader === `Bearer ${segredoCron}`;
    if (!ehCron && !(await ehDono(req, ctx.supabaseAdmin))) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    try {
      const apiKey = await obterApiKey();

      const respostaItens = await chamarPluggy(apiKey, "/items");
      // deno-lint-ignore no-explicit-any
      const itens: any[] = Array.isArray(respostaItens) ? respostaItens : respostaItens.results || [];

      let processados = 0;
      const errosPorItem: string[] = [];

      for (const item of itens) {
        try {
          const respostaContas = await chamarPluggy(apiKey, `/accounts?itemId=${item.id}`);
          // deno-lint-ignore no-explicit-any
          const contas: any[] = respostaContas.results || [];

          for (const conta of contas) {
            let query: string | null = `accountId=${conta.id}`;
            while (query) {
              // deno-lint-ignore no-explicit-any
              const pagina: any = await chamarPluggy(apiKey, `/v2/transactions?${query}`);
              // deno-lint-ignore no-explicit-any
              const transacoes: any[] = pagina.results || [];

              for (const t of transacoes) {
                const linha = {
                  pluggy_transaction_id: t.id,
                  pluggy_item_id: item.id,
                  pluggy_account_id: conta.id,
                  descricao: t.description || t.descriptionRaw || "Sem descrição",
                  valor: t.amount,
                  tipo: t.type,
                  data: (t.date || "").slice(0, 10),
                  categoria_pluggy: t.category || null,
                  updated_at: new Date().toISOString(),
                };
                const { error } = await ctx.supabaseAdmin
                  .from("financeiro_transacoes")
                  .upsert(linha, { onConflict: "pluggy_transaction_id" });
                if (error) {
                  console.error("Erro ao gravar transação:", error);
                  continue;
                }
                processados++;
              }

              query = pagina.next || null;
            }
          }
        } catch (e) {
          console.error(`Erro ao sincronizar item ${item.id}:`, e);
          errosPorItem.push((e as Error).message);
        }
      }

      return jsonResponse({ ok: true, processados, itens: itens.length, erros: errosPorItem });
    } catch (e) {
      console.error("Erro ao sincronizar Pluggy:", e);
      return jsonResponse({ ok: false, error: (e as Error).message }, 500);
    }
  }),
};
