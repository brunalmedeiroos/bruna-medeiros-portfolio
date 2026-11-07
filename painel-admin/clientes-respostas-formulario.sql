-- ==========================================================================
-- clientes-respostas-formulario.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Campo pra colar as respostas do formulário (Google Forms) de cada cliente
-- direto na ficha, em vez de ficar procurando na planilha depois. Aditivo:
-- não mexe em mais nada.

alter table public.clientes add column if not exists respostas_formulario text;
