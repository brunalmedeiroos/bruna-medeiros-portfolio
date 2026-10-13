-- Achados: guardar as imagens de um post (carrossel ou foto estática).
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
-- Não apaga nada: só adiciona a coluna e o espaço de armazenamento das imagens.

alter table public.planejador_achados add column if not exists imagens text[] not null default '{}';

-- Bucket público pra leitura (os endereços têm nome aleatório), escrita só do dono do painel.
insert into storage.buckets (id, name, public)
values ('achados-imagens', 'achados-imagens', true)
on conflict (id) do nothing;

drop policy if exists "Painel: leitura pública das imagens dos achados" on storage.objects;
create policy "Painel: leitura pública das imagens dos achados"
  on storage.objects for select using (bucket_id = 'achados-imagens');
drop policy if exists "Painel: escrita das imagens dos achados" on storage.objects;
create policy "Painel: escrita das imagens dos achados"
  on storage.objects for insert to authenticated with check (bucket_id = 'achados-imagens' and public.is_owner());
drop policy if exists "Painel: atualização das imagens dos achados" on storage.objects;
create policy "Painel: atualização das imagens dos achados"
  on storage.objects for update to authenticated using (bucket_id = 'achados-imagens' and public.is_owner()) with check (bucket_id = 'achados-imagens' and public.is_owner());
drop policy if exists "Painel: exclusão das imagens dos achados" on storage.objects;
create policy "Painel: exclusão das imagens dos achados"
  on storage.objects for delete to authenticated using (bucket_id = 'achados-imagens' and public.is_owner());
