-- ---------------------------------------------------------------------
-- roteiro-status-entregue.sql — Rode UMA VEZ no SQL Editor do Supabase.
-- É seguro rodar de novo.
-- ---------------------------------------------------------------------
-- Adiciona o status "Entregue" nos roteiros (UGC/Publi > Roteiros).

do $$
declare c record;
begin
  -- tira a regra antiga dos status, seja qual for o nome dela
  for c in
    select conname from pg_constraint
    where conrelid = 'public.ugc_roteiros'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%Rascunho%'
  loop
    execute format('alter table public.ugc_roteiros drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.ugc_roteiros
  add constraint ugc_roteiros_status_check
  check (status in ('Rascunho', 'Enviado', 'Aprovado', 'Ajustes pedidos', 'Entregue'));
