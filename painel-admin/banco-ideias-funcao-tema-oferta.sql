-- ==========================================================================
-- banco-ideias-funcao-tema-oferta.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- Reorganização de "Meus conteúdos" (Banco de ideias & Roteiros): cada
-- conteúdo ganha Função (obrigatória, única escolha), Oferta (sim/não) e
-- Tema (etiqueta livre, no lugar de ser pasta). Tudo aditivo: nenhuma coluna,
-- tabela ou dado existente é alterado ou apagado. pilar_conteudo, publico e
-- a estrutura de pastas continuam exatamente como estão.
--
-- funcao_sugerida e funcao_sugerida_incerta só existem pra apoiar a tela de
-- revisão em lotes dos conteúdos antigos (Fase 6): guardam a sugestão sem
-- gravar no campo oficial. Nada é decidido sozinho aqui.
--
-- Pode rodar mais de uma vez sem problema (if not exists).
-- ==========================================================================

alter table public.ideias_conteudos add column if not exists funcao text;
alter table public.ideias_conteudos add column if not exists oferta boolean not null default false;
alter table public.ideias_conteudos add column if not exists tema text;
alter table public.ideias_conteudos add column if not exists funcao_sugerida text;
alter table public.ideias_conteudos add column if not exists funcao_sugerida_incerta boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ideias_conteudos_funcao_check') then
    alter table public.ideias_conteudos
      add constraint ideias_conteudos_funcao_check
      check (funcao is null or funcao in ('Mostra meu trabalho', 'Conecta', 'Ensina'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ideias_conteudos_funcao_sugerida_check') then
    alter table public.ideias_conteudos
      add constraint ideias_conteudos_funcao_sugerida_check
      check (funcao_sugerida is null or funcao_sugerida in ('Mostra meu trabalho', 'Conecta', 'Ensina'));
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Preenche "tema" com o nome da pasta (e subpasta, ex: "Beleza/Unhas") pros
-- conteúdos da pasta-raiz "Conteúdos Instagram" que NÃO estão dentro de
-- "Séries" nem "Quadros" (em qualquer profundidade). Quem está em
-- Séries/Quadros fica com tema vazio, como combinado. Não move nenhum
-- conteúdo de pasta — só preenche o campo novo.
-- ---------------------------------------------------------------------

with recursive raiz as (
  select id, id as raiz_id, nome as raiz_nome
  from public.ideias_pastas
  where pai_id is null
  union all
  select p.id, r.raiz_id, r.raiz_nome
  from public.ideias_pastas p
  join raiz r on r.id = p.pai_id
)
update public.ideias_conteudos c
set tema = case when pai.nome is not null then pai.nome || '/' || p.nome else p.nome end
from public.ideias_pastas p
join public.ideias_grupos g on g.chave = p.grupo and g.nome = 'Conteúdos Instagram'
left join public.ideias_pastas pai on pai.id = p.pai_id
join raiz on raiz.id = p.id
where c.pasta_id = p.id
  and raiz.raiz_nome not in ('Séries', 'Quadros');
