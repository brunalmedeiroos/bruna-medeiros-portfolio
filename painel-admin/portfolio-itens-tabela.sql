-- ==========================================================================
-- portfolio-itens-tabela.sql — Rode UMA VEZ no SQL Editor do Supabase.
-- ==========================================================================
-- Aba Portfólio > "Editar portfólio": guarda os vídeos, feedbacks e marcas
-- que aparecem no site (brunamedeiros.com). O site NÃO lê a tabela direto:
-- ele fala com a Edge Function "portfolio-publico" (service_role), que só
-- devolve os itens ativos. Por isso a tabela só tem acesso do dono (is_owner).
-- Os itens que já estavam fixos no site entram como ponto de partida (só
-- se a tabela estiver vazia). É seguro rodar de novo.

create table if not exists public.portfolio_itens (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('video', 'feedback', 'marca')),
  titulo text not null,
  youtube_id text,
  categoria text,
  texto_pt text,
  texto_en text,
  logo_url text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_itens_tipo_ordem_idx on public.portfolio_itens (tipo, ordem);

alter table public.portfolio_itens enable row level security;

drop policy if exists "Painel: leitura do portfólio" on public.portfolio_itens;
drop policy if exists "Painel: criação no portfólio" on public.portfolio_itens;
drop policy if exists "Painel: atualização do portfólio" on public.portfolio_itens;
drop policy if exists "Painel: exclusão no portfólio" on public.portfolio_itens;

create policy "Painel: leitura do portfólio"
  on public.portfolio_itens for select to authenticated using (public.is_owner());
create policy "Painel: criação no portfólio"
  on public.portfolio_itens for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização do portfólio"
  on public.portfolio_itens for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão no portfólio"
  on public.portfolio_itens for delete to authenticated using (public.is_owner());

grant select, insert, update, delete on public.portfolio_itens to authenticated;
grant select on public.portfolio_itens to service_role;

-- ---------- Imagens (logos das marcas e dos feedbacks) ----------
insert into storage.buckets (id, name, public)
values ('portfolio-imagens', 'portfolio-imagens', true)
on conflict (id) do nothing;

drop policy if exists "Painel: escrita das imagens do portfólio" on storage.objects;
create policy "Painel: escrita das imagens do portfólio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-imagens' and public.is_owner());
drop policy if exists "Painel: atualização das imagens do portfólio" on storage.objects;
create policy "Painel: atualização das imagens do portfólio"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-imagens' and public.is_owner())
  with check (bucket_id = 'portfolio-imagens' and public.is_owner());
drop policy if exists "Painel: exclusão das imagens do portfólio" on storage.objects;
create policy "Painel: exclusão das imagens do portfólio"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-imagens' and public.is_owner());

-- ---------- Ponto de partida: o que já estava no site ----------
insert into public.portfolio_itens (tipo, titulo, youtube_id, categoria, texto_pt, texto_en, logo_url, ordem)
select * from (values
  ('video', 'Hollyland Lark A1', 'lMDEHNtGsSs', 'tech', null, null, null, 1),
  ('video', 'Chein Rui', 'Kjs1IYVCnMc', 'entretenimento', null, null, null, 2),
  ('video', 'Fino Premium Touch', 'spKbkwGxABk', 'beleza', null, null, null, 3),
  ('video', 'Kopenhagen', 'qKJ9jTrh52k', 'experiencia', null, null, null, 4),
  ('video', 'Mercado Livre', 'p9GsOJ5geoI', 'tech', null, null, null, 5),
  ('video', 'Kindle', 'L_T7FaWzNf0', 'entretenimento', null, null, null, 6),
  ('video', 'DJI Osmo Mobile SE', 'DvWUawGPVp4', 'tech', null, null, null, 7),
  ('video', 'LetsView', '4_Y-4VKAmlc', 'tech', null, null, null, 8),
  ('video', 'Acer', 'EjLPHx5QWgU', 'tech', null, null, null, 9),
  ('video', 'Labotrat', 'sHYB8Q1_zQU', 'beleza', null, null, null, 10),
  ('video', 'Labotrat', 'UmQTL9U0_yE', 'beleza', null, null, null, 11),
  ('video', 'Eudora', '-Fh4qfVLY30', 'beleza', null, null, null, 12),
  ('video', 'Eudora', 'cct8j7zrnU0', 'beleza', null, null, null, 13),
  ('video', 'Imersão Portfólio Claude', 'x7Fd9mtw5VQ', 'experiencia', null, null, null, 14),
  ('feedback', 'Labotrat', null, null, '"Realizou uma ótima entrega, com um conteúdo bem alinhado à proposta da campanha e executado com qualidade."', '"Delivered great work, with content well aligned to the campaign''s brief and executed with quality."', 'logos/Labotrat.png', 1),
  ('feedback', 'Imersão Porfólio Claude - Lara', null, null, '"OIEEE DIVA, eu amei amei amei o vídeo, ficou muto bom, obrigadaaaaa."', '"HEEY DIVA, I loved loved loved the video, it turned out so good, thank youuuu."', null, 2),
  ('marca', 'Labotrat', null, null, null, null, 'logos/Labotrat.png', 1),
  ('marca', 'Kopenhagen', null, null, null, null, 'logos/Kopenhagen.png', 2),
  ('marca', 'Pantene', null, null, null, null, 'logos/Pantene.png', 3),
  ('marca', 'Sucré', null, null, null, null, 'logos/Secre.png', 4)
) as v(tipo, titulo, youtube_id, categoria, texto_pt, texto_en, logo_url, ordem)
where not exists (select 1 from public.portfolio_itens);
