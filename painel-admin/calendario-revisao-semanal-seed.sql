-- ---------------------------------------------------------------------
-- calendario-revisao-semanal-seed.sql — Rode UMA VEZ no SQL Editor,
-- depois de calendario-recorrencia-checklist.sql e
-- calendario-checklist-rpc.sql já terem sido rodados.
-- ---------------------------------------------------------------------
-- Cria a tarefa recorrente semanal "Revisão da semana" (toda semana,
-- aos domingos, começando em 06/09/2026) com os 3 subitens já prontos
-- como checklist. Da próxima vez que o Calendário for aberto, o
-- reabastecimento automático de ocorrências (toparOcorrenciasDasSeries)
-- gera sozinho as próximas semanas, clonando os mesmos 3 itens
-- (sempre desmarcados) em cada uma.
--
-- Rodar duas vezes cria duas séries duplicadas — se precisar refazer,
-- apague a tarefa pelo painel primeiro (excluir a série inteira).

with nova_tarefa as (
  insert into public.painel_tarefas (titulo, tipo, data, recorrencia, serie_id)
  values ('Revisão da semana', 'Reunião', '2026-09-06', 'semanal', gen_random_uuid())
  returning id
)
insert into public.painel_tarefas_checklist (tarefa_id, texto, ordem)
select nova_tarefa.id, itens.texto, itens.ordem
from nova_tarefa, (values
  ('UGC/Publi: tem entrega ou trabalho travado essa semana?', 0),
  ('Planejador: quais ideias estão "ROTEIRO PRONTO" pra gravar?', 1),
  ('Calendário: os blocos de gravação e estudo da semana estão criados?', 2)
) as itens(texto, ordem);
