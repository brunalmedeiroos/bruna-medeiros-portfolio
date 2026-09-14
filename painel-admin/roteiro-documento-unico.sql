-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.
--
-- Unifica Objetivo + Pontos importantes + Sugestão de legenda num único
-- campo de texto rico (conteudo, guarda HTML simples: <p>/<strong>/<em>/
-- <u>/<ul>/<ol>/<li> — só o que a barra de formatação do editor gera).
-- Também adiciona uma Categoria (texto livre) pro roteiro.
--
-- As colunas antigas (objetivo, pontos_importantes, sugestao_legenda) NÃO
-- são apagadas — só o painel para de ler/escrever nelas. Isso preserva o
-- dado bruto original, caso precise no futuro.

alter table public.ugc_roteiros
  add column if not exists conteudo text,
  add column if not exists categoria text;

-- Migra o que já existia pros roteiros que ainda não têm "conteudo"
-- preenchido, juntando os 3 campos antigos num só, com um mini-título em
-- negrito por parte (só roda uma vez — roteiros que já tiverem "conteudo"
-- não são tocados de novo se você rodar este arquivo de novo por engano).
update public.ugc_roteiros
set conteudo = trim(
  coalesce('<p><strong>Objetivo:</strong> ' || replace(replace(replace(objetivo, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>', '') ||
  coalesce('<p><strong>Pontos importantes:</strong> ' || replace(replace(replace(pontos_importantes, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>', '') ||
  coalesce('<p><strong>Sugestão de legenda:</strong> ' || replace(replace(replace(sugestao_legenda, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>', '')
)
where conteudo is null
  and (objetivo is not null or pontos_importantes is not null or sugestao_legenda is not null);
