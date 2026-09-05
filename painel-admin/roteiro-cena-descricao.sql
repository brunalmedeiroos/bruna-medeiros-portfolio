-- ==========================================================================
-- roteiro-cena-descricao.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- 1) Novo campo "descricao_cena" (texto livre) — o seletor "tipo_cena"
--    (Cena falada / B-roll com narração / etc.) fica pra dizer COMO é a
--    cena; esse campo novo é pra descrever O QUE aparece/acontece nela.
--    Os dois convivem juntos no formulário, um não substitui o outro.
alter table public.ugc_roteiro_cenas
  add column if not exists descricao_cena text;

-- 2) Recupera o texto que estava em "Cena/B-roll" antes da coluna virar
--    tipo_cena — um teste meu (Claude) sobrescreveu e depois limpou esse
--    campo por engano. Texto restaurado a partir do que já tinha sido lido
--    nesta mesma sessão (link público e cards do roteiro), pro roteiro
--    "Imersão - Lara Dam | roteiro 2" (id 7877d272-216e-4cde-936f-a1b9bc700617).
update public.ugc_roteiro_cenas set descricao_cena =
  case id
    when '7dd1d5e9-575a-40e8-a308-c7972dcdcb14' then 'Cena falada: pegar o ipad e deixar na aba da imersão aberta aparecendo'
    when '1a06e12b-f53e-497c-8fff-94b6618c104b' then 'Cena falada: mostrar portfolio pronto.'
    when '6cac2b05-6335-4899-8f79-588a7115738b' then 'Cena falada: Mostrar painel e a empolgação com o resultado, b-rolls dele por dentro.'
    when '7e62d7c0-1777-4ecd-99c2-be84e770db38' then 'Cena falada: Mostrar a aba UGC/Publi'
    when 'ee6f3310-0a8e-4cfd-8aa2-99f1c2bbc658' then 'Cena falada: Segurar o ipad enquanto falo'
    when 'b2380b76-1d0d-455c-9878-b4182eab4c66' then 'Cena falada: Falar mais próximo da câmera trazendo a novidade das vagas'
  end
where id in (
  '7dd1d5e9-575a-40e8-a308-c7972dcdcb14',
  '1a06e12b-f53e-497c-8fff-94b6618c104b',
  '6cac2b05-6335-4899-8f79-588a7115738b',
  '7e62d7c0-1777-4ecd-99c2-be84e770db38',
  'ee6f3310-0a8e-4cfd-8aa2-99f1c2bbc658',
  'b2380b76-1d0d-455c-9878-b4182eab4c66'
);

-- 3) Atualiza a função de "apaga e reinsere as cenas" pra também gravar
--    descricao_cena.
create or replace function public.ugc_substituir_cenas(p_roteiro_id uuid, p_cenas jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.ugc_roteiro_cenas where roteiro_id = p_roteiro_id;

  insert into public.ugc_roteiro_cenas (roteiro_id, ordem, fala, o_que_fazer, tipo_cena, descricao_cena, cena_gravada, cena_conferida, duracao_segundos, funcao_cena)
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
    c->>'funcao_cena'
  from jsonb_array_elements(p_cenas) as c;
end;
$$;
