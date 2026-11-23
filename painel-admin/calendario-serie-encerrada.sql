-- ==========================================================================
-- calendario-serie-encerrada.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Corrige o bug em que excluir "a série inteira a partir de uma data" não
-- segurava: o reabastecimento automático de ocorrências recorrentes recriava
-- as datas futuras assim que a página recarregava, porque ainda sobrava uma
-- ocorrência passada futura-o-suficiente (dentro da janela de 14 dias) pra
-- parecer "série ainda ativa". Essa coluna marca a série como encerrada pra
-- sempre, e o reabastecimento passa a respeitar isso.

alter table public.painel_tarefas
  add column if not exists serie_encerrada boolean not null default false;
