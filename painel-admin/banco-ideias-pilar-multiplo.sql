-- ==========================================================================
-- banco-ideias-pilar-multiplo.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs), depois do banco-ideias-pilar-publico.sql.
-- ==========================================================================
-- Deixa um roteiro ter mais de um pilar. Os pilares ficam na mesma coluna
-- (pilar_conteudo), separados por vírgula, por exemplo "Autoridade,Oferta".
-- O que já estava marcado continua valendo. É seguro rodar de novo.

alter table public.ideias_conteudos drop constraint if exists ideias_conteudos_pilar_conteudo_check;
alter table public.ideias_conteudos drop constraint if exists ideias_conteudos_pilar_multiplo_check;

alter table public.ideias_conteudos
  add constraint ideias_conteudos_pilar_multiplo_check
  check (
    pilar_conteudo is null
    or pilar_conteudo ~ '^(Autoridade|Desejo|Conexão|Oferta)(,(Autoridade|Desejo|Conexão|Oferta))*$'
  );
