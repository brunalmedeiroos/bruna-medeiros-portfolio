-- Corrige as 2 políticas que ficaram de fora da primeira rodada — elas têm
-- nome diferente do que o script original esperava ("Painel logado pode
-- ler eventos/leads" em vez de "Painel: leitura autenticada de eventos/leads").
-- Confirmado via diagnóstico: são as únicas 2 com tem_is_owner = false.

alter policy "Painel logado pode ler eventos" on public.portfolio_events
  using (public.is_owner());

alter policy "Painel logado pode ler leads" on public.portfolio_leads
  using (public.is_owner());
