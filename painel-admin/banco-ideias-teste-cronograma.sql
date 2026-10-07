-- ---------------------------------------------------------------------
-- Banco de ideias (teste): integração com o Cronograma de postagem.
--
-- Guarda o dia marcado no calendário em cada conteúdo do teste, igual ao
-- que o Banco de ideias de sempre faz. Só mexe na tabela do teste
-- (ideias_conteudos); planejador_ideias fica como está.
--
-- Pode rodar mais de uma vez sem problema.
-- ---------------------------------------------------------------------

alter table public.ideias_conteudos
  add column if not exists data_agendada date;

create index if not exists ideias_conteudos_data_agendada_idx
  on public.ideias_conteudos (data_agendada);
