-- ==========================================================================
-- banco-ideias-pilar-publico.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- No Banco de ideias & Roteiros, cada conteúdo ganha duas marcações:
--  - pilar_conteudo: Autoridade, Desejo, Conexão ou Oferta;
--  - publico: marcas, comunidade ou ambos (os dois).
-- Os conteúdos que já existem ficam sem marcação (vazio). É seguro rodar de novo.

alter table public.ideias_conteudos add column if not exists pilar_conteudo text;
alter table public.ideias_conteudos add column if not exists publico text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ideias_conteudos_pilar_conteudo_check') then
    alter table public.ideias_conteudos
      add constraint ideias_conteudos_pilar_conteudo_check
      check (pilar_conteudo is null or pilar_conteudo in ('Autoridade', 'Desejo', 'Conexão', 'Oferta'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ideias_conteudos_publico_check') then
    alter table public.ideias_conteudos
      add constraint ideias_conteudos_publico_check
      check (publico is null or publico in ('marcas', 'comunidade', 'ambos'));
  end if;
end
$$;
