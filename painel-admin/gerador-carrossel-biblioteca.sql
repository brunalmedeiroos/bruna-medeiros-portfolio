-- Gerador de Carrossel: a área de Referências vira uma biblioteca visual só de imagens.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- O que muda em carrossel_referencias:
--  - ganha "etiquetas" (uma referência pode servir pra mais de uma coisa: visual, estrutura, tom, gancho);
--  - perde link (tipo e url), nome (titulo) e a etiqueta única, que não existem mais na tela.
-- As imagens e a anotação "o que eu gosto" continuam como estavam.
-- Referências que eram só link (sem nenhuma imagem) são removidas, porque a opção de link acabou.

alter table public.carrossel_referencias add column if not exists etiquetas text[] not null default '{visual}';

-- guarda a etiqueta antiga, se a coluna ainda existir
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'carrossel_referencias' and column_name = 'etiqueta') then
    execute 'update public.carrossel_referencias set etiquetas = array[etiqueta] where etiqueta is not null';
  end if;
end $$;

delete from public.carrossel_referencias where coalesce(array_length(imagens, 1), 0) = 0;

alter table public.carrossel_referencias drop column if exists tipo;
alter table public.carrossel_referencias drop column if exists url;
alter table public.carrossel_referencias drop column if exists titulo;
alter table public.carrossel_referencias drop column if exists etiqueta;

alter table public.carrossel_referencias drop constraint if exists carrossel_referencias_etiquetas_validas;
alter table public.carrossel_referencias
  add constraint carrossel_referencias_etiquetas_validas
  check (etiquetas <@ array['visual', 'estrutura', 'tom', 'gancho']::text[] and array_length(etiquetas, 1) >= 1);
