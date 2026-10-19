-- ==========================================================================
-- ugc-orcamento-observacao.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs), depois do ugc-orcamento-pagina-v3.sql.
-- ==========================================================================
-- Libera o quarto jeito de um item aparecer na página de orçamento:
-- "observação" (um bloco só de texto, sem serviços e sem valor).
-- Os pacotes, avulsos e adicionais que já existem não mudam. É seguro rodar de novo.

alter table public.ugc_pacotes drop constraint if exists ugc_pacotes_tipo_check;
alter table public.ugc_pacotes add constraint ugc_pacotes_tipo_check check (tipo in ('pacote', 'avulso', 'adicional', 'observacao'));
