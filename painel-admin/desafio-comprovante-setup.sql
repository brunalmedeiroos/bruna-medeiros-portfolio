-- ==========================================================================
-- desafio-comprovante-setup.sql — Rode no SQL Editor do projeto Supabase DO
-- DESAFIO (gcqyhtdtsosfzcykslhb), depois de desafio-pagamento-setup.sql já
-- ter rodado.
-- ==========================================================================
-- Deixa a participante anexar o comprovante do Pix na própria tela de
-- pagamento, em vez de só declarar "já paguei". O arquivo fica num bucket
-- PRIVADO (só ela e a dona conseguem ver, via link assinado) — mesmo
-- esquema de permissão já usado pra foto de perfil e vídeo dos desafios.

alter table public.desafio_perfis
  add column if not exists comprovante_path text;

-- O grant de update em (nome, instagram, fase, foto_url) continua intacto
-- (desafio-setup.sql) — comprovante_path entra nele também, porque é a
-- própria participante que grava o caminho do arquivo que ela mesma
-- acabou de subir (mesma lógica de foto_url).
grant update (comprovante_path) on public.desafio_perfis to authenticated;

insert into storage.buckets (id, name, public)
values ('desafio-comprovantes', 'desafio-comprovantes', false)
on conflict (id) do nothing;

create policy "desafio-comprovantes - upload proprio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'desafio-comprovantes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "desafio-comprovantes - update proprio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'desafio-comprovantes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "desafio-comprovantes - select proprio ou dona" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'desafio-comprovantes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_owner()
    )
  );
