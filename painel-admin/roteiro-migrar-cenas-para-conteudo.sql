-- Rode este arquivo UMA VEZ no SQL Editor do Supabase.
--
-- Junta o que já estava escrito nas Cenas (fala, o que fazer, detalhes,
-- função da cena) de cada roteiro dentro do novo campo único "conteudo"
-- (o campo "Roteiro" do painel) — a tela de Cenas foi removida do painel,
-- mas os dados continuavam intactos na tabela ugc_roteiro_cenas; isso só
-- traz esse texto pra dentro do editor novo, na ordem das cenas.
--
-- Se o roteiro já tinha algo em "conteudo" (por causa da migração antiga
-- de Objetivo/Pontos importantes/Sugestão de legenda), o texto das cenas
-- é ACRESCENTADO depois, com um separador — nada é sobrescrito.
--
-- Não roda duas vezes: rodar de novo duplicaria o texto das cenas no
-- conteúdo. Se rodar sem querer, é só apagar manualmente a parte
-- duplicada no editor.

with cenas_texto as (
  select
    roteiro_id,
    string_agg(
      '<p><strong>Cena ' || (ordem + 1)::text ||
        case when funcao_cena is not null and funcao_cena <> '' then ' — ' || funcao_cena else '' end ||
      ':</strong></p>' ||
      case when fala is not null and fala <> '' then
        '<p><strong>Fala:</strong> ' || replace(replace(replace(fala, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>'
      else '' end ||
      case when o_que_fazer is not null and o_que_fazer <> '' then
        '<p><strong>O que fazer:</strong> ' || replace(replace(replace(o_que_fazer, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>'
      else '' end ||
      case when descricao_cena is not null and descricao_cena <> '' then
        '<p><strong>Detalhes:</strong> ' || replace(replace(replace(descricao_cena, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>'
      else '' end,
      ''
      order by ordem
    ) as html
  from public.ugc_roteiro_cenas
  group by roteiro_id
)
update public.ugc_roteiros r
set conteudo =
  coalesce(r.conteudo, '') ||
  case when coalesce(r.conteudo, '') <> '' then '<p><strong>— Cenas —</strong></p>' else '' end ||
  ct.html
from cenas_texto ct
where ct.roteiro_id = r.id;
