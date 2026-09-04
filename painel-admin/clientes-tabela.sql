-- ---------------------------------------------------------------------
-- clientes-tabela.sql — Rode este arquivo UMA VEZ no SQL Editor do seu
-- projeto Supabase antes de publicar a versão do painel que tem a aba
-- Clientes.
-- ---------------------------------------------------------------------
-- Cria o controle de clientes do pacote painel+portfólio (ver Playbook
-- do Cliente Novo): uma tabela principal (clientes) e uma tabela filha
-- de links (clientes_links), cada link marcado como "privado" (uso só
-- seu) ou "cliente" (pra mandar pra pessoa).

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  status text not null default 'Negociando' check (status in (
    'Negociando', 'Fechado', 'Em produção', 'Entregue', 'Cancelado'
  )),
  contato_email text,
  contato_whatsapp text,
  template_escolhido text,
  valor numeric(10, 2),
  data_fechamento date,
  data_entrega date,
  observacoes text
);

create index if not exists clientes_status_idx on public.clientes (status);

alter table public.clientes enable row level security;

create policy "Painel: leitura autenticada de clientes"
  on public.clientes for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de clientes"
  on public.clientes for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de clientes"
  on public.clientes for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de clientes"
  on public.clientes for delete to authenticated using (public.is_owner());

-- Tabela: clientes_links (links úteis por cliente — cada um marcado como
-- "privado", uso só dela, ou "cliente", pra mandar pra pessoa)
create table if not exists public.clientes_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  rotulo text not null,
  url text not null,
  tipo text not null default 'privado' check (tipo in ('privado', 'cliente')),
  ordem int not null default 0
);

create index if not exists clientes_links_cliente_idx on public.clientes_links (cliente_id, ordem);

alter table public.clientes_links enable row level security;

create policy "Painel: leitura autenticada de links de clientes"
  on public.clientes_links for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de links de clientes"
  on public.clientes_links for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de links de clientes"
  on public.clientes_links for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de links de clientes"
  on public.clientes_links for delete to authenticated using (public.is_owner());

-- RPC: substitui todos os links de um cliente numa única transação (mesmo
-- padrão de ugc_substituir_entregaveis / painel_substituir_checklist_tarefa
-- — evita perder itens se a conexão cair no meio de apagar+reinserir).
create or replace function public.clientes_substituir_links(p_cliente_id uuid, p_links jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.clientes_links where cliente_id = p_cliente_id;

  insert into public.clientes_links (cliente_id, rotulo, url, tipo, ordem)
  select
    p_cliente_id,
    l->>'rotulo',
    l->>'url',
    coalesce(l->>'tipo', 'privado'),
    (l->>'ordem')::int
  from jsonb_array_elements(p_links) as l;
end;
$$;
