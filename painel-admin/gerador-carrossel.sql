-- Gerador de Carrossel (Instagram > Gerador de Carrossel).
-- Rode uma vez no SQL Editor do Supabase, colando o arquivo inteiro. Pode rodar de novo sem problema.
-- Não apaga nada: só cria tabelas novas e um espaço pra guardar as imagens de referência.
--
-- carrossel_preferencias : uma linha só, com seu tom de voz, identidade, design e instruções pra IA.
-- carrossel_referencias  : biblioteca visual de imagens de design que a IA consulta toda vez que cria algo.
-- carrossel_carrosseis   : os carrosséis criados (pedido, slides, nota e feedback).
-- carrossel_aprendizados : o que o sistema aprendeu com o seu feedback e usa nas próximas criações.

create table if not exists public.carrossel_preferencias (
  id text primary key default 'principal',
  updated_at timestamptz not null default now(),
  tom_de_voz text not null default '',
  identidade text not null default '',
  estrutura text not null default '',
  design text not null default '',
  sempre text not null default '',
  nunca text not null default '',
  instrucoes_ia text not null default ''
);

create table if not exists public.carrossel_referencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  imagens text[] not null default '{}',
  nota text not null default '',
  etiquetas text[] not null default '{visual}'
);

create table if not exists public.carrossel_carrosseis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titulo text not null default '',
  tema text not null default '',
  objetivo text not null default '',
  qtd_slides integer not null default 8,
  referencia_id uuid references public.carrossel_referencias(id) on delete set null,
  estilo text not null default '',
  observacoes text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'gerado', 'pronto')),
  slides jsonb not null default '[]'::jsonb,
  nota smallint check (nota between 1 and 5),
  feedback text not null default ''
);

create table if not exists public.carrossel_aprendizados (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  texto text not null,
  carrossel_id uuid references public.carrossel_carrosseis(id) on delete set null
);

alter table public.carrossel_preferencias enable row level security;
alter table public.carrossel_referencias enable row level security;
alter table public.carrossel_carrosseis enable row level security;
alter table public.carrossel_aprendizados enable row level security;

do $$
declare t text;
begin
  foreach t in array array['carrossel_preferencias', 'carrossel_referencias', 'carrossel_carrosseis', 'carrossel_aprendizados']
  loop
    execute format('drop policy if exists "Painel: leitura de %1$s" on public.%1$I', t);
    execute format('create policy "Painel: leitura de %1$s" on public.%1$I for select to authenticated using (public.is_owner())', t);
    execute format('drop policy if exists "Painel: escrita de %1$s" on public.%1$I', t);
    execute format('create policy "Painel: escrita de %1$s" on public.%1$I for insert to authenticated with check (public.is_owner())', t);
    execute format('drop policy if exists "Painel: atualização de %1$s" on public.%1$I', t);
    execute format('create policy "Painel: atualização de %1$s" on public.%1$I for update to authenticated using (public.is_owner()) with check (public.is_owner())', t);
    execute format('drop policy if exists "Painel: exclusão de %1$s" on public.%1$I', t);
    execute format('create policy "Painel: exclusão de %1$s" on public.%1$I for delete to authenticated using (public.is_owner())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

-- Imagens de referência: leitura pública (os nomes são aleatórios), escrita só da dona do painel.
insert into storage.buckets (id, name, public)
values ('carrossel-referencias', 'carrossel-referencias', true)
on conflict (id) do nothing;

drop policy if exists "Painel: leitura das referências de carrossel" on storage.objects;
create policy "Painel: leitura das referências de carrossel"
  on storage.objects for select using (bucket_id = 'carrossel-referencias');
drop policy if exists "Painel: escrita das referências de carrossel" on storage.objects;
create policy "Painel: escrita das referências de carrossel"
  on storage.objects for insert to authenticated with check (bucket_id = 'carrossel-referencias' and public.is_owner());
drop policy if exists "Painel: atualização das referências de carrossel" on storage.objects;
create policy "Painel: atualização das referências de carrossel"
  on storage.objects for update to authenticated using (bucket_id = 'carrossel-referencias' and public.is_owner()) with check (bucket_id = 'carrossel-referencias' and public.is_owner());
drop policy if exists "Painel: exclusão das referências de carrossel" on storage.objects;
create policy "Painel: exclusão das referências de carrossel"
  on storage.objects for delete to authenticated using (bucket_id = 'carrossel-referencias' and public.is_owner());
