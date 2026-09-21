-- ==========================================================================
-- desafio-pagamento-setup.sql — Rode no SQL Editor do projeto Supabase DO
-- DESAFIO (gcqyhtdtsosfzcykslhb), depois de desafio-setup.sql já ter rodado.
-- ==========================================================================
-- Adiciona o controle de pagamento (Pix manual, sem gateway): cada
-- participante só enxerga o conteúdo publicado depois que a Bruna marca
-- `pago = true` pra ela no admin (desafio/admin). Ninguém além da dona
-- consegue escrever nessa coluna — nem por acidente, nem chamando a API
-- direto — porque o grant de update é combinado com uma policy que só
-- deixa passar quando `is_owner()` é verdadeiro.

alter table public.desafio_perfis
  add column if not exists pago boolean not null default false,
  add column if not exists pago_em timestamptz;

-- O grant de update em (nome, instagram, fase, foto_url) pra qualquer
-- authenticated já existe em desafio-setup.sql e continua intacto — pago
-- e pago_em vão num grant + policy SEPARADOS, restritos à dona.
create policy "perfis - update pago so dona" on public.desafio_perfis
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

grant update (pago, pago_em) on public.desafio_perfis to authenticated;

-- ---------------------------------------------------------------------
-- desafio_dias: só quem pagou (ou a dona) consegue ler os dias
-- publicados. Substitui a policy de desafio-setup.sql que liberava
-- qualquer participante logada.
-- ---------------------------------------------------------------------
drop policy if exists "dias - select publicado ou dona" on public.desafio_dias;
drop policy if exists "dias - select publicado e paga ou dona" on public.desafio_dias;
create policy "dias - select publicado e paga ou dona" on public.desafio_dias
  for select to authenticated
  using (
    (
      publicado = true
      and exists (
        select 1 from public.desafio_perfis pf
        where pf.id = auth.uid() and pf.pago = true
      )
    )
    or public.is_owner()
  );

-- ---------------------------------------------------------------------
-- desafio_conclusoes: mesma exigência no insert/update, pra ninguém
-- marcar um dia como feito sem ter pagado (mesmo sabendo um dia_id por
-- fora do que a policy acima deixaria ela ler).
-- ---------------------------------------------------------------------
drop policy if exists "conclusoes - insert proprio" on public.desafio_conclusoes;
create policy "conclusoes - insert proprio e paga" on public.desafio_conclusoes
  for insert to authenticated
  with check (
    auth.uid() = participante_id
    and exists (
      select 1 from public.desafio_perfis pf
      where pf.id = auth.uid() and pf.pago = true
    )
  );

drop policy if exists "conclusoes - update proprio" on public.desafio_conclusoes;
create policy "conclusoes - update proprio e paga" on public.desafio_conclusoes
  for update to authenticated
  using (auth.uid() = participante_id)
  with check (
    auth.uid() = participante_id
    and exists (
      select 1 from public.desafio_perfis pf
      where pf.id = auth.uid() and pf.pago = true
    )
  );
