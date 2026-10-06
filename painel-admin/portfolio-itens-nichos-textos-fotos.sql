-- ==========================================================================
-- portfolio-itens-nichos-textos-fotos.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Depois do portfolio-itens-tabela.sql: libera mais 3 tipos na mesma tabela
-- (nichos, textos e fotos do site) e cadastra os 4 nichos que já existem.
-- É seguro rodar de novo.

alter table public.portfolio_itens drop constraint if exists portfolio_itens_tipo_check;
alter table public.portfolio_itens
  add constraint portfolio_itens_tipo_check
  check (tipo in ('video', 'feedback', 'marca', 'nicho', 'texto', 'foto'));

-- Nichos: titulo = nome em português, texto_en = nome em inglês, categoria = código usado nos vídeos.
insert into public.portfolio_itens (tipo, titulo, categoria, texto_en, ordem)
select * from (values
  ('nicho', 'Tech', 'tech', 'Tech', 1),
  ('nicho', 'Beleza', 'beleza', 'Beauty', 2),
  ('nicho', 'Entretenimento', 'entretenimento', 'Entertainment', 3),
  ('nicho', 'Experiência', 'experiencia', 'Experience', 4)
) as v(tipo, titulo, categoria, texto_en, ordem)
where not exists (select 1 from public.portfolio_itens where tipo = 'nicho');
