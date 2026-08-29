-- ==========================================================================
-- radar-unique-index.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Evita notícia duplicada (mesmo agente + link) quando o cron diário e o
-- clique manual em "Atualizar notícias" rodam quase ao mesmo tempo.
create unique index if not exists radar_noticias_agente_link_unq on public.radar_noticias (agente, link);
