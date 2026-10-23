-- ---------------------------------------------------------------------
-- roteiro-formato-video.sql — Rode este arquivo UMA VEZ no SQL Editor do
-- Supabase (projeto trfoymytrvdbslwizfqs). É seguro rodar de novo.
-- ---------------------------------------------------------------------
-- UGC/Publi > Roteiros > "Formato de vídeo": a lista de formatos que você
-- monta (Unboxing, Tutorial...) fica salva aqui, e cada roteiro guarda o
-- formato escolhido.

alter table public.ugc_roteiros add column if not exists formato_video text;

create table if not exists public.ugc_formatos_video (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null
);

alter table public.ugc_formatos_video enable row level security;

drop policy if exists "Painel: leitura de formatos de vídeo" on public.ugc_formatos_video;
drop policy if exists "Painel: criação de formatos de vídeo" on public.ugc_formatos_video;
drop policy if exists "Painel: atualização de formatos de vídeo" on public.ugc_formatos_video;
drop policy if exists "Painel: exclusão de formatos de vídeo" on public.ugc_formatos_video;

create policy "Painel: leitura de formatos de vídeo"
  on public.ugc_formatos_video for select to authenticated using (public.is_owner());
create policy "Painel: criação de formatos de vídeo"
  on public.ugc_formatos_video for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização de formatos de vídeo"
  on public.ugc_formatos_video for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão de formatos de vídeo"
  on public.ugc_formatos_video for delete to authenticated using (public.is_owner());
