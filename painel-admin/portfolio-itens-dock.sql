-- ==========================================================================
-- portfolio-itens-dock.sql — Rode UMA VEZ no SQL Editor.
-- ==========================================================================
-- Cadastra os 9 ícones do dock do topo do site, pra você editar pelo painel
-- (Portfólio > Editar > Hero). Ficam na mesma tabela portfolio_itens como
-- tipo 'texto' com categoria 'dock': titulo = nome do ícone, logo_url = imagem,
-- texto_pt = link livre, texto_en = contato que o ícone usa (whatsapp, email,
-- instagram, tiktok). Só entram se ainda não existir nenhum. Seguro rodar de novo.

insert into public.portfolio_itens (tipo, titulo, categoria, texto_pt, texto_en, logo_url, ordem)
select * from (values
  ('texto', 'Notas', 'dock', '#sobre', null, 'icons/notas.jpg', 1),
  ('texto', 'Email', 'dock', null, 'email', 'icons/email.jpg', 2),
  ('texto', 'Câmera', 'dock', '#portfolio', null, 'icons/camera.jpg', 3),
  ('texto', 'TikTok', 'dock', null, 'tiktok', 'icons/tiktok.jpg', 4),
  ('texto', 'Instagram', 'dock', null, 'instagram', 'icons/instagram.jpg', 5),
  ('texto', 'Arquivos', 'dock', '#servicos', null, 'icons/arquivos.jpg', 6),
  ('texto', 'CapCut', 'dock', '#portfolio', null, 'icons/capcut.jpg', 7),
  ('texto', 'Chrome', 'dock', '#feedbacks', null, 'icons/chrome.jpg', 8),
  ('texto', 'WhatsApp', 'dock', null, 'whatsapp', 'icons/whatsapp.jpg', 9)
) as v(tipo, titulo, categoria, texto_pt, texto_en, logo_url, ordem)
where not exists (select 1 from public.portfolio_itens where tipo = 'texto' and categoria = 'dock');
