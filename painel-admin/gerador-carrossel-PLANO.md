# Gerador de Carrossel: plano de implementação

Onde fica: painel > Instagram > **✨ Gerador de Carrossel** (ao lado de Automações).
Código: `painel-admin/painel.html` (espelhado em `painel/index.html`), bloco "Instagram > Gerador de Carrossel".
Banco: `painel-admin/gerador-carrossel.sql` (rodar uma vez no SQL Editor do Supabase).

## Etapa 1: estrutura (feita)
- Sub-aba nova com 4 áreas: **Criar carrossel**, **Referências**, **Preferências e tom de voz**, **Meus carrosséis**.
- Funcionando de verdade, com dados no Supabase: referências: biblioteca visual só de imagens (até 8 por referência, enviadas do dispositivo), com "o que eu gosto" e "serve para" (visual, estrutura, tom, gancho; pode marcar mais de uma), com editar, filtrar e visualizar, preferências (tom de voz, identidade, estrutura, design, sempre/nunca, instruções pra IA), rascunhos de pedido (tema, objetivo, nº de slides, referência, estilo, observações), lista de aprendizados.
- Botão "Gerar com IA" ainda desligado de propósito.

## Etapa 2: IA que escreve os slides
Edge Function nova `carrossel-gerar` (padrão do `radar-atualizar`):
1. Só a dona entra: confere o login com `ehDono()` (`_shared/dono.ts`).
2. Lê no banco, com a service role: preferências, referências (as imagens vão junto pro Gemini ver), aprendizados e o pedido.
3. Monta o prompt com as instruções fixas dentro da função (essência das skills `bruna-creator` e `roteiro-e-storytelling`, igual ao que o radar faz) mais o campo "Instruções extras pra IA".
4. Chama o Gemini com a chave `GEMINI_API_KEY`, que já existe nos secrets do Supabase. A chave nunca vai pro navegador. Saída em JSON estruturado: título, legenda e lista de slides (tipo, título, texto, destaque, sugestão visual).
5. Repete a chamada se der 503/429 (como o radar). Salva em `carrossel_carrosseis` com status `gerado`.
6. O painel chama pelo `chamarFuncao('carrossel-gerar', { method: 'POST', body: { carrossel_id } })`.

As referências são só imagens, então a IA enxerga o design de verdade. As imagens ficam guardadas no Supabase (pasta `carrossel-referencias`) e a função lê todas elas a cada geração.

## Etapa 3: design dos slides, edição e exportação
- Renderizador de slides em HTML/CSS no formato 1080x1350 (4:5), usando as cores e fontes das preferências de design e layouts fixos (capa, texto, lista, citação, CTA).
- Editor: clicar no slide e editar texto, trocar layout, regenerar só um slide (`carrossel-gerar` com `acao: 'slide'`).
- Exportar: PNG de cada slide (html-to-image) e PDF (jsPDF), pra finalizar no Canva.

## Etapa 4: feedback que vira memória
- Nota de 1 a 5 e comentário em cada carrossel (colunas `nota` e `feedback` já existem).
- Função `carrossel-aprender`: transforma o feedback em 1 a 3 regras curtas, salva em `carrossel_aprendizados`, e a `carrossel-gerar` lê as mais recentes. Ela pode apagar qualquer aprendizado na tela de Preferências.

## Segurança
- Chaves só em secrets do Supabase. Todas as tabelas com RLS `is_owner()`.
- Imagens de referência num bucket com leitura pública (nomes aleatórios) e escrita só da dona, igual aos Achados.
