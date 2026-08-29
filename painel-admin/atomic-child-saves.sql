-- ==========================================================================
-- atomic-child-saves.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Corrige o achado da auditoria: salvar um Trabalho ou Roteiro apagava e
-- reinseria os entregáveis/cenas em duas chamadas separadas — se a rede
-- caísse bem entre elas, os itens filhos sumiam mesmo com o pai salvo.
--
-- Essas duas funções fazem o "apaga e reinsere" dentro de uma única
-- transação de banco: se qualquer parte falhar, nada muda (nem o delete
-- fica valendo sozinho). São chamadas pelo painel via Auth.sb.rpc(...) e
-- rodam com a permissão de quem chama (não têm acesso extra nenhum) — a
-- segurança continua sendo a mesma policy de RLS (is_owner()) de sempre.

create or replace function public.ugc_substituir_entregaveis(p_trabalho_id uuid, p_entregaveis jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.ugc_trabalho_entregaveis where trabalho_id = p_trabalho_id;

  insert into public.ugc_trabalho_entregaveis (trabalho_id, servico, quantidade, ordem)
  select
    p_trabalho_id,
    e->>'servico',
    coalesce((e->>'quantidade')::int, 1),
    (e->>'ordem')::int
  from jsonb_array_elements(p_entregaveis) as e;
end;
$$;

create or replace function public.ugc_substituir_cenas(p_roteiro_id uuid, p_cenas jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.ugc_roteiro_cenas where roteiro_id = p_roteiro_id;

  insert into public.ugc_roteiro_cenas (roteiro_id, ordem, fala, o_que_fazer, cena_broll, cena_gravada, cena_conferida)
  select
    p_roteiro_id,
    (c->>'ordem')::int,
    c->>'fala',
    c->>'o_que_fazer',
    c->>'cena_broll',
    coalesce((c->>'cena_gravada')::boolean, false),
    coalesce((c->>'cena_conferida')::boolean, false)
  from jsonb_array_elements(p_cenas) as c;
end;
$$;
