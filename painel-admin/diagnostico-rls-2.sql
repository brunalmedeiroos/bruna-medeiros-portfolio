-- Mostra, pra cada política de negócio, se is_owner() está realmente
-- aplicado (numa coluna sim/não fácil de ler, sem precisar rolar a tela).
select
  tablename as tabela,
  policyname as politica,
  cmd as comando,
  (coalesce(qual, '') like '%is_owner%' or coalesce(with_check, '') like '%is_owner%') as tem_is_owner
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in (
    'portfolio_events', 'portfolio_leads', 'painel_tarefas',
    'planejador_pilares', 'planejador_ideias', 'planejador_achados',
    'planejador_cronograma', 'planejador_cronograma_dias',
    'radar_noticias', 'ugc_trabalhos', 'ugc_trabalho_entregaveis',
    'ugc_roteiros', 'ugc_roteiro_cenas', 'ugc_prospeccao',
    'ugc_contratos', 'ugc_precos', 'objects'
  )
order by tem_is_owner asc, tabela, politica;
