-- ==========================================================================
-- clientes-respostas-privado.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Separa as respostas do formulário em dois campos: o que já existia
-- (respostas_formulario) passa a ser só o que vai pro prompt do portfólio;
-- este campo novo guarda o que é só pra você (plano, valor, termos,
-- autorização de divulgação, contato pessoal da cliente). Aditivo.

alter table public.clientes add column if not exists respostas_privado text;
