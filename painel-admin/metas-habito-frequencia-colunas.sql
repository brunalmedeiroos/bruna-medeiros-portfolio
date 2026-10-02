-- ==========================================================================
-- Hábitos: troca "meta semanal" por um tipo de frequência de verdade
-- ==========================================================================
-- Substitui a coluna meta_semanal (de metas-habito-meta-semanal-coluna.sql,
-- ainda sem uso real) por um modelo que cobre diário, N vezes por semana,
-- N vezes por mês, ou dias específicos da semana — cada hábito é
-- acompanhado de um jeito diferente conforme o tipo escolhido.

alter table public.painel_habitos drop column if exists meta_semanal;

alter table public.painel_habitos add column if not exists tipo_frequencia text not null default 'diario'
  check (tipo_frequencia in ('diario', 'semana', 'mes', 'dias_especificos'));

-- Nx por semana (tipo "semana") ou Nx por mês (tipo "mes"); null pros outros tipos.
alter table public.painel_habitos add column if not exists frequencia_valor integer;

-- Só pro tipo "dias_especificos": dias da semana escolhidos (0=domingo … 6=sábado).
alter table public.painel_habitos add column if not exists dias_semana integer[];
