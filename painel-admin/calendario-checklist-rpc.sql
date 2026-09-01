-- ---------------------------------------------------------------------
-- calendario-checklist-rpc.sql — Rode UMA VEZ no SQL Editor, depois de
-- já ter rodado calendario-recorrencia-checklist.sql.
-- ---------------------------------------------------------------------
-- Mesmo padrão de atomic-child-saves.sql (ugc_substituir_entregaveis /
-- ugc_substituir_cenas): apagar e reinserir os itens do checklist em
-- duas chamadas separadas do painel arriscaria perder os itens se a
-- rede caísse no meio. Esta função faz tudo numa única transação.

create or replace function public.painel_substituir_checklist_tarefa(p_tarefa_id uuid, p_itens jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.painel_tarefas_checklist where tarefa_id = p_tarefa_id;

  insert into public.painel_tarefas_checklist (tarefa_id, texto, feito, ordem)
  select
    p_tarefa_id,
    i->>'texto',
    coalesce((i->>'feito')::boolean, false),
    (i->>'ordem')::int
  from jsonb_array_elements(p_itens) as i;
end;
$$;
