-- ---------------------------------------------------------------------
-- Corrige o alerta do Supabase "User data exposed through a view"
-- (auth_users_exposed) no projeto Desafio UGC Bruna.
--
-- Causa: a view public.desafio_ranking tinha uma subquery em
-- auth.users (só pra achar seu próprio id e te excluir do ranking).
-- O linter do Supabase sinaliza QUALQUER view pública que referencie
-- auth.users, mesmo sem selecionar nenhuma coluna de lá — é uma
-- checagem estática, não olha se o dado realmente é exposto.
--
-- Fix: mover essa checagem pra dentro de uma function security
-- definer (o mesmo padrão já usado em desafio_criar_perfil(), no
-- desafio-setup.sql, pra tocar em auth.users com segurança) e a view
-- passa a usar só o resultado dela, sem tocar em auth.users direto.
-- ---------------------------------------------------------------------

create or replace function public.desafio_owner_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where email = 'medeirosbru6@gmail.com' limit 1;
$$;

revoke all on function public.desafio_owner_id() from public;
grant execute on function public.desafio_owner_id() to authenticated;

create or replace view public.desafio_ranking as
select
  p.id as participante_id,
  p.nome,
  p.instagram,
  coalesce(count(c.id), 0)
    + coalesce(sum(case when c.video_path is not null then 2 else 0 end), 0)
    + coalesce(sum(case when c.feito_em <= d.publicado_em + interval '48 hours' then 1 else 0 end), 0)
    + coalesce((select count(*) from public.desafio_perfis ref where ref.indicado_por = p.id), 0) * 2
    + case when p.foto_url is not null then 1 else 0 end
    + coalesce((select sum(b.pontos) from public.desafio_bonus b where b.participante_id = p.id), 0)
    as pontos,
  max(c.feito_em) as ultimo_desafio_em
from public.desafio_perfis p
left join public.desafio_conclusoes c on c.participante_id = p.id
left join public.desafio_dias d on d.id = c.dia_id
where p.id <> public.desafio_owner_id()
group by p.id, p.nome, p.instagram;

grant select on public.desafio_ranking to authenticated;
