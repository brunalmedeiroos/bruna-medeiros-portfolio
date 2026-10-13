-- Achados: nova categoria "Carrossel" (além de Gancho, Frase, Formato, Música, CTA e Avulso).
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Não apaga nada: só troca a lista de categorias aceitas.

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.planejador_achados'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%coluna%'
  loop
    execute format('alter table public.planejador_achados drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.planejador_achados
  add constraint planejador_achados_coluna_check
  check (coluna in ('Gancho', 'Frase', 'Formato', 'Carrossel', 'Música', 'CTA', 'Avulso'));
