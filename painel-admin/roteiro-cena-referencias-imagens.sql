-- ==========================================================================
-- roteiro-cena-referencias-imagens.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Fotos de referência por cena (cenário, roupa, itens...) pra marca
-- entender como o vídeo vai ficar. Diferente do bucket "ugc-arquivos"
-- (privado, briefing/contrato com dado sensível), esse bucket é público —
-- a marca precisa ver as imagens direto no link, sem login.

alter table public.ugc_roteiro_cenas
  add column if not exists referencias_imagens text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('ugc-roteiro-referencias', 'ugc-roteiro-referencias', true)
on conflict (id) do nothing;

drop policy if exists "Painel: leitura pública de referências de roteiro" on storage.objects;
create policy "Painel: leitura pública de referências de roteiro"
  on storage.objects for select using (bucket_id = 'ugc-roteiro-referencias');
drop policy if exists "Painel: escrita autenticada de referências de roteiro" on storage.objects;
create policy "Painel: escrita autenticada de referências de roteiro"
  on storage.objects for insert to authenticated with check (bucket_id = 'ugc-roteiro-referencias' and public.is_owner());
drop policy if exists "Painel: atualização autenticada de referências de roteiro" on storage.objects;
create policy "Painel: atualização autenticada de referências de roteiro"
  on storage.objects for update to authenticated using (bucket_id = 'ugc-roteiro-referencias' and public.is_owner()) with check (bucket_id = 'ugc-roteiro-referencias' and public.is_owner());
drop policy if exists "Painel: exclusão autenticada de referências de roteiro" on storage.objects;
create policy "Painel: exclusão autenticada de referências de roteiro"
  on storage.objects for delete to authenticated using (bucket_id = 'ugc-roteiro-referencias' and public.is_owner());

-- Atualiza a função de "apaga e reinsere as cenas" pra também gravar
-- referencias_imagens.
create or replace function public.ugc_substituir_cenas(p_roteiro_id uuid, p_cenas jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.ugc_roteiro_cenas where roteiro_id = p_roteiro_id;

  insert into public.ugc_roteiro_cenas (roteiro_id, ordem, fala, o_que_fazer, tipo_cena, descricao_cena, cena_gravada, cena_conferida, duracao_segundos, funcao_cena, referencias_imagens)
  select
    p_roteiro_id,
    (c->>'ordem')::int,
    c->>'fala',
    c->>'o_que_fazer',
    c->>'tipo_cena',
    c->>'descricao_cena',
    coalesce((c->>'cena_gravada')::boolean, false),
    coalesce((c->>'cena_conferida')::boolean, false),
    (c->>'duracao_segundos')::int,
    c->>'funcao_cena',
    coalesce(array(select jsonb_array_elements_text(c->'referencias_imagens')), '{}')
  from jsonb_array_elements(p_cenas) as c;
end;
$$;
