-- ==========================================================================
-- ugc-orcamento-pagina-v3.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs), depois do ugc-orcamento-pagina-v2.sql.
-- ==========================================================================
-- Libera o terceiro jeito de um pacote aparecer na página de orçamento:
-- "adicional" (cards lado a lado, só com o texto e o valor, sem botão).
-- Os pacotes e avulsos que já existem não mudam. É seguro rodar de novo.

alter table public.ugc_pacotes drop constraint if exists ugc_pacotes_tipo_check;
alter table public.ugc_pacotes add constraint ugc_pacotes_tipo_check check (tipo in ('pacote', 'avulso', 'adicional'));
