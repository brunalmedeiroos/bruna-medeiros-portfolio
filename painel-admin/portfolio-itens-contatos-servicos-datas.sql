-- ==========================================================================
-- portfolio-itens-contatos-servicos-datas.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Depois do portfolio-itens-nichos-textos-fotos.sql: libera mais 3 tipos
-- (contatos, serviços e datas comemorativas), cria as colunas extras
-- (nome em inglês e dia/mês das datas) e cadastra os 3 serviços que já
-- existem no site. É seguro rodar de novo.

alter table public.portfolio_itens
  add column if not exists titulo_en text,
  add column if not exists data_mes int,
  add column if not exists data_dia int;

alter table public.portfolio_itens drop constraint if exists portfolio_itens_tipo_check;
alter table public.portfolio_itens
  add constraint portfolio_itens_tipo_check
  check (tipo in ('video', 'feedback', 'marca', 'nicho', 'texto', 'foto', 'contato', 'servico', 'data'));

insert into public.portfolio_itens (tipo, titulo, titulo_en, texto_pt, texto_en, ordem)
select * from (values
  ('servico', 'UGC', 'UGC', 'Vídeos no estilo depoimento real para gerar conexão orgânica. Roteiro próprio + variações por entrega.', 'Testimonial-style videos to build organic connection. Original script, with variations per delivery.', 1),
  ('servico', 'Publicidade no meu perfil', 'Advertising on my profile', 'Conteúdo publicado para minha audiência com alcance orgânico real.', 'Content published to my audience with real organic reach.', 2),
  ('servico', 'Fotos UGC', 'UGC Photos', 'Fotografia de produto e lifestyle com direção de estética, imagens prontas pra feed, ads e catálogo.', 'Product and lifestyle photography with art direction — images ready for feed, ads, and catalog.', 3)
) as v(tipo, titulo, titulo_en, texto_pt, texto_en, ordem)
where not exists (select 1 from public.portfolio_itens where tipo = 'servico');
