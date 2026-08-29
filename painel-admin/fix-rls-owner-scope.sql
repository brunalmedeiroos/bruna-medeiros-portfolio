-- ==========================================================================
-- fix-rls-owner-scope.sql — Rode UMA VEZ no SQL Editor do seu projeto
-- Supabase (o mesmo onde o painel já está rodando).
-- ==========================================================================
-- Corrige o problema de segurança encontrado na auditoria: até agora,
-- toda policy de RLS deste projeto liberava acesso a QUALQUER usuário
-- autenticado (ex: uma conta nova criada agora mesmo), não só a você.
-- Confirmado ao vivo: uma conta de teste sem nenhum vínculo com a sua
-- conseguiu ver todos os dados reais do painel.
--
-- Este script não recria as tabelas nem apaga nada — ele só ajusta as
-- policies já existentes (ALTER POLICY), acrescentando a checagem de
-- dono. Depois de rodar, só a conta com este UID consegue ler/escrever
-- os dados de negócio:
--   a2323d3f-e342-458d-b7f9-7b8ef0f1025f
--
-- setup.sql (o arquivo original) também foi atualizado, então uma
-- reinstalação futura do zero já sai correta.

create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select auth.uid() = 'a2323d3f-e342-458d-b7f9-7b8ef0f1025f'::uuid;
$$;

-- ---- portfolio_events / portfolio_leads ----
alter policy "Painel: leitura autenticada de eventos" on public.portfolio_events
  using (public.is_owner());
alter policy "Painel: leitura autenticada de leads" on public.portfolio_leads
  using (public.is_owner());
alter policy "Painel: exclusão autenticada de mensagens" on public.portfolio_leads
  using (public.is_owner());

-- ---- painel_tarefas ----
alter policy "Painel: leitura autenticada de tarefas" on public.painel_tarefas
  using (public.is_owner());
alter policy "Painel: escrita autenticada de tarefas" on public.painel_tarefas
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de tarefas" on public.painel_tarefas
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de tarefas" on public.painel_tarefas
  using (public.is_owner());

-- ---- planejador_pilares ----
alter policy "Painel: leitura autenticada de pilares" on public.planejador_pilares
  using (public.is_owner());
alter policy "Painel: escrita autenticada de pilares" on public.planejador_pilares
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de pilares" on public.planejador_pilares
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de pilares" on public.planejador_pilares
  using (public.is_owner());

-- ---- planejador_ideias ----
alter policy "Painel: leitura autenticada de ideias" on public.planejador_ideias
  using (public.is_owner());
alter policy "Painel: escrita autenticada de ideias" on public.planejador_ideias
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de ideias" on public.planejador_ideias
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de ideias" on public.planejador_ideias
  using (public.is_owner());

-- ---- planejador_achados ----
alter policy "Painel: leitura autenticada de achados" on public.planejador_achados
  using (public.is_owner());
alter policy "Painel: escrita autenticada de achados" on public.planejador_achados
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de achados" on public.planejador_achados
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de achados" on public.planejador_achados
  using (public.is_owner());

-- ---- planejador_cronograma ----
alter policy "Painel: leitura autenticada de cronograma" on public.planejador_cronograma
  using (public.is_owner());
alter policy "Painel: escrita autenticada de cronograma" on public.planejador_cronograma
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de cronograma" on public.planejador_cronograma
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de cronograma" on public.planejador_cronograma
  using (public.is_owner());

-- ---- planejador_cronograma_dias ----
alter policy "Painel: leitura autenticada de pilares por dia" on public.planejador_cronograma_dias
  using (public.is_owner());
alter policy "Painel: escrita autenticada de pilares por dia" on public.planejador_cronograma_dias
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de pilares por dia" on public.planejador_cronograma_dias
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de pilares por dia" on public.planejador_cronograma_dias
  using (public.is_owner());

-- ---- radar_noticias ----
alter policy "Painel: leitura autenticada do radar" on public.radar_noticias
  using (public.is_owner());
alter policy "Painel: escrita autenticada do radar" on public.radar_noticias
  with check (public.is_owner());
alter policy "Painel: atualização autenticada do radar" on public.radar_noticias
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada do radar" on public.radar_noticias
  using (public.is_owner());

-- ---- ugc_trabalhos ----
alter policy "Painel: leitura autenticada de trabalhos UGC" on public.ugc_trabalhos
  using (public.is_owner());
alter policy "Painel: escrita autenticada de trabalhos UGC" on public.ugc_trabalhos
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de trabalhos UGC" on public.ugc_trabalhos
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de trabalhos UGC" on public.ugc_trabalhos
  using (public.is_owner());

-- ---- ugc_trabalho_entregaveis ----
alter policy "Painel: leitura autenticada de entregáveis UGC" on public.ugc_trabalho_entregaveis
  using (public.is_owner());
alter policy "Painel: escrita autenticada de entregáveis UGC" on public.ugc_trabalho_entregaveis
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de entregáveis UGC" on public.ugc_trabalho_entregaveis
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de entregáveis UGC" on public.ugc_trabalho_entregaveis
  using (public.is_owner());

-- ---- ugc_roteiros ----
alter policy "Painel: leitura autenticada de roteiros UGC" on public.ugc_roteiros
  using (public.is_owner());
alter policy "Painel: escrita autenticada de roteiros UGC" on public.ugc_roteiros
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de roteiros UGC" on public.ugc_roteiros
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de roteiros UGC" on public.ugc_roteiros
  using (public.is_owner());

-- ---- ugc_roteiro_cenas ----
alter policy "Painel: leitura autenticada de cenas UGC" on public.ugc_roteiro_cenas
  using (public.is_owner());
alter policy "Painel: escrita autenticada de cenas UGC" on public.ugc_roteiro_cenas
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de cenas UGC" on public.ugc_roteiro_cenas
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de cenas UGC" on public.ugc_roteiro_cenas
  using (public.is_owner());

-- ---- ugc_prospeccao ----
alter policy "Painel: leitura autenticada de prospecção UGC" on public.ugc_prospeccao
  using (public.is_owner());
alter policy "Painel: escrita autenticada de prospecção UGC" on public.ugc_prospeccao
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de prospecção UGC" on public.ugc_prospeccao
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de prospecção UGC" on public.ugc_prospeccao
  using (public.is_owner());

-- ---- ugc_contratos ----
alter policy "Painel: leitura autenticada de contratos UGC" on public.ugc_contratos
  using (public.is_owner());
alter policy "Painel: escrita autenticada de contratos UGC" on public.ugc_contratos
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de contratos UGC" on public.ugc_contratos
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de contratos UGC" on public.ugc_contratos
  using (public.is_owner());

-- ---- ugc_precos ----
alter policy "Painel: leitura autenticada de preços UGC" on public.ugc_precos
  using (public.is_owner());
alter policy "Painel: escrita autenticada de preços UGC" on public.ugc_precos
  with check (public.is_owner());
alter policy "Painel: atualização autenticada de preços UGC" on public.ugc_precos
  using (public.is_owner()) with check (public.is_owner());
alter policy "Painel: exclusão autenticada de preços UGC" on public.ugc_precos
  using (public.is_owner());

-- ---- storage: bucket ugc-arquivos ----
alter policy "Painel: leitura autenticada de arquivos UGC" on storage.objects
  using (bucket_id = 'ugc-arquivos' and public.is_owner());
alter policy "Painel: escrita autenticada de arquivos UGC" on storage.objects
  with check (bucket_id = 'ugc-arquivos' and public.is_owner());
alter policy "Painel: atualização autenticada de arquivos UGC" on storage.objects
  using (bucket_id = 'ugc-arquivos' and public.is_owner()) with check (bucket_id = 'ugc-arquivos' and public.is_owner());
alter policy "Painel: exclusão autenticada de arquivos UGC" on storage.objects
  using (bucket_id = 'ugc-arquivos' and public.is_owner());

-- ==========================================================================
-- Depois de rodar: teste logando com a conta de teste que você criou
-- (brunalisn123@gmail.com, se ainda existir) — o painel deve ficar
-- vazio/bloqueado para ela. Depois, apague essa conta de teste em
-- Authentication > Users e confirme que "Allow new users to sign up"
-- está DESLIGADO em Authentication > Providers (ou Settings, dependendo
-- da versão do painel do Supabase).
-- ==========================================================================
