-- ---------------------------------------------------------------------
-- clientes-vitrine.sql: Rode este arquivo UMA VEZ no SQL Editor do seu
-- projeto Supabase (depois do clientes-planilha.sql, que você já rodou).
-- Pode rodar de novo sem medo: não sobrescreve o que você já editou.
-- ---------------------------------------------------------------------
-- O que ele faz, pra aba Modelos de portfólio virar a vitrine:
--   1. Acrescenta descrição curta e imagem de prévia nos modelos.
--   2. Acrescenta em clientes a coluna dados_prompt, onde ficam os dados
--      do formulário do prompt (cidade, marcas, números, nichos etc.).
--   3. Apaga o "Letreiro UGC", cria o "Estúdio Folhagem" e coloca os
--      links de prévia e as descrições dos 5 modelos.
--   4. Troca "GitHub Pages" por "Cloudflare Pages" na parte fixa do prompt.

-- 1. Vitrine dos modelos --------------------------------------------------
alter table public.clientes_modelos
  add column if not exists descricao text,
  add column if not exists imagem_url text;

-- 2. Dados do formulário do prompt, guardados no cadastro da cliente -------
alter table public.clientes
  add column if not exists dados_prompt jsonb not null default '{}'::jsonb;

-- 3. Os 5 modelos ----------------------------------------------------------
delete from public.clientes_modelos where nome = 'Letreiro UGC';

insert into public.clientes_modelos (ordem, nome, ficha)
select 5, 'Estúdio Folhagem', 'FICHA DE ESTILO (Estúdio Folhagem)
Paleta (tokens CSS em :root):
Fontes (títulos, texto corrido e destaque):
Clima e estilo visual:
Formas e detalhes (bordas, sombras, texturas, colagens):
Movimento e animações:
Como é cada seção (Capa, Sobre, Marcas, Portfólio, Serviços, Feedbacks, Contato):
Observações:'
where not exists (select 1 from public.clientes_modelos where nome = 'Estúdio Folhagem');

update public.clientes_modelos set ordem = 1 where nome = 'Penumbra Dourada';
update public.clientes_modelos set ordem = 2 where nome = 'Água-Viva';
update public.clientes_modelos set ordem = 3 where nome = 'Recorte & Colagem';
update public.clientes_modelos set ordem = 4 where nome = 'Clube Zine Varsity';
update public.clientes_modelos set ordem = 5 where nome = 'Estúdio Folhagem';

-- Links de prévia (só entram onde ainda está vazio)
update public.clientes_modelos set previa_url = 'https://claude.ai/artifact/XELLTKSJvDuWKB6Ughu36U'
  where nome = 'Penumbra Dourada' and coalesce(previa_url, '') = '';
update public.clientes_modelos set previa_url = 'https://claude.ai/artifact/SjoLEVQChBeUbc5CWqnFpt'
  where nome = 'Água-Viva' and coalesce(previa_url, '') = '';
update public.clientes_modelos set previa_url = 'https://claude.ai/artifact/PuBjWmK4ScVp5dPbrakQUL'
  where nome = 'Recorte & Colagem' and coalesce(previa_url, '') = '';
update public.clientes_modelos set previa_url = 'https://claude.ai/artifact/MQh72dgmjegrk2TmgL97E2'
  where nome = 'Clube Zine Varsity' and coalesce(previa_url, '') = '';
update public.clientes_modelos set previa_url = 'https://claude.ai/artifact/P2asNoui5d8ViJubFE8jiq'
  where nome = 'Estúdio Folhagem' and coalesce(previa_url, '') = '';

-- Descrições curtas (só entram onde ainda está vazio; edite pelo painel)
update public.clientes_modelos set descricao = 'Escuro, cinematográfico, premium. Dourado antigo e vinho profundo no lugar do neon batido, clima de ateliê à noite.'
  where nome = 'Penumbra Dourada' and coalesce(descricao, '') = '';
update public.clientes_modelos set descricao = 'Delicado e romântico, mas maduro. Rosa empoeirado equilibrado com verde-sálvia e formas orgânicas, sem cair no clichê.'
  where nome = 'Água-Viva' and coalesce(descricao, '') = '';
update public.clientes_modelos set descricao = 'Scrapbook criativo, com papel rasgado, washi tape e molduras estilo polaroid no portfólio.'
  where nome = 'Recorte & Colagem' and coalesce(descricao, '') = '';
update public.clientes_modelos set descricao = 'Zine esportivo com letras de time, amarelo vibrante e colagem de polaroid, cheio de energia.'
  where nome = 'Clube Zine Varsity' and coalesce(descricao, '') = '';
update public.clientes_modelos set descricao = 'Verde-floresta profundo com letra serifada, clima de estúdio botânico, calmo e natural.'
  where nome = 'Estúdio Folhagem' and coalesce(descricao, '') = '';

-- 4. Parte fixa: o site agora é publicado no Cloudflare Pages --------------
update public.clientes_textos
set valor = replace(
      replace(
        valor,
        'Publicado no GitHub Pages com domínio próprio (arquivo CNAME).',
        'Publicado no Cloudflare Pages (nomedela.pages.dev ou domínio próprio), sem arquivo CNAME. O código fica no GitHub.'
      ),
      'GitHub Pages',
      'Cloudflare Pages'
    ),
    updated_at = now()
where chave = 'prompt_parte_fixa'
  and valor like '%GitHub Pages%';
