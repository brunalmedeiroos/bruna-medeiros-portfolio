-- ==========================================================================
-- ugc-pacotes-tabela.sql — Rode UMA VEZ no SQL Editor do Supabase
-- (projeto trfoymytrvdbslwizfqs).
-- ==========================================================================
-- UGC/Publi > Preços > Pacotes: na calculadora de proposta, o botão
-- "Criar pacote" guarda a proposta montada (itens, desconto, urgência e valor)
-- com um nome. Os pacotes aparecem na aba Preços.
-- itens guarda uma cópia do que foi escolhido: [{servico, categoria, quantidade, valor_unitario}],
-- então mudar ou apagar um serviço do catálogo depois não altera pacotes já criados.
-- É seguro rodar de novo.

create table if not exists public.ugc_pacotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  marca text,
  observacoes text,
  itens jsonb not null default '[]'::jsonb,
  desconto_pct numeric not null default 0,
  urgencia_pct numeric not null default 0,
  valor_bruto numeric not null default 0,
  valor_final numeric not null default 0
);

alter table public.ugc_pacotes enable row level security;

drop policy if exists "Painel: leitura autenticada de pacotes UGC" on public.ugc_pacotes;
drop policy if exists "Painel: escrita autenticada de pacotes UGC" on public.ugc_pacotes;
drop policy if exists "Painel: atualização autenticada de pacotes UGC" on public.ugc_pacotes;
drop policy if exists "Painel: exclusão autenticada de pacotes UGC" on public.ugc_pacotes;

create policy "Painel: leitura autenticada de pacotes UGC"
  on public.ugc_pacotes for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de pacotes UGC"
  on public.ugc_pacotes for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de pacotes UGC"
  on public.ugc_pacotes for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de pacotes UGC"
  on public.ugc_pacotes for delete to authenticated using (public.is_owner());
