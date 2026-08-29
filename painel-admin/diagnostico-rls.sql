-- Diagnóstico: lista todas as políticas de acesso (RLS) realmente ativas
-- hoje em cada tabela de negócio, e confirma se o RLS está ligado.
-- Só LEITURA — não altera nada.

select
  n.nspname as schema,
  c.relname as tabela,
  c.relrowsecurity as rls_ligado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relname in (
  'portfolio_events', 'portfolio_leads', 'painel_tarefas',
  'planejador_pilares', 'planejador_ideias', 'planejador_achados',
  'planejador_cronograma', 'planejador_cronograma_dias',
  'radar_noticias', 'ugc_trabalhos', 'ugc_trabalho_entregaveis',
  'ugc_roteiros', 'ugc_roteiro_cenas', 'ugc_prospeccao',
  'ugc_contratos', 'ugc_precos'
)
order by c.relname;

select
  schemaname as schema,
  tablename as tabela,
  policyname as politica,
  cmd as comando,
  roles,
  qual as usando,
  with_check as verifica
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, policyname;
