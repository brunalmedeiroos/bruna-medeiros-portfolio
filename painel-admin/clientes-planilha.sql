-- ---------------------------------------------------------------------
-- clientes-planilha.sql — Rode este arquivo UMA VEZ no SQL Editor do seu
-- projeto Supabase (depois do clientes-tabela.sql, que você já rodou).
-- Pode rodar de novo sem medo: não apaga nem sobrescreve nada que você
-- já editou.
-- ---------------------------------------------------------------------
-- O que ele faz, pras 4 sub-abas da aba Clientes (Visão geral, Clientes,
-- Modelos, Links e mensagens):
--   1. Acrescenta as colunas novas na tabela clientes (@, plano, 1º e 2º
--      pagamento, formulário, etapa, link do site e do repositório).
--   2. Cria clientes_modelos: os 5 modelos de portfólio (nome, prévia, ficha).
--   3. Cria clientes_textos: parte fixa do prompt, o card Personalizado,
--      os 3 links e as 5 mensagens da conversa. Tudo editável pelo painel.

-- 1. Colunas novas em clientes -------------------------------------------
-- (o bloco só roda se a coluna "etapa" ainda não existe; é nele que os
-- clientes antigos ganham uma etapa a partir do status que já tinham)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'etapa'
  ) then
    alter table public.clientes
      add column instagram text,
      add column plano text check (plano in ('Portfólio', 'Completo', 'Personalizado')),
      add column pagamento1_pago boolean not null default false,
      add column pagamento2_pago boolean not null default false,
      add column formulario_data date,
      add column etapa text not null default 'conversa' check (etapa in (
        'conversa', 'pagou_50', 'formulario', 'banco', 'site', 'previa', 'entregue'
      )),
      add column site_url text,
      add column repo_url text;

    update public.clientes set etapa = case status
      when 'Fechado' then 'pagou_50'
      when 'Em produção' then 'site'
      when 'Entregue' then 'entregue'
      else 'conversa'
    end;
  end if;
end $$;

create index if not exists clientes_etapa_idx on public.clientes (etapa);

-- 2. Modelos de portfólio -------------------------------------------------
create table if not exists public.clientes_modelos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ordem int not null default 0,
  nome text not null,
  previa_url text,
  ficha text not null default ''
);

alter table public.clientes_modelos enable row level security;

drop policy if exists "Painel: leitura autenticada de modelos" on public.clientes_modelos;
drop policy if exists "Painel: escrita autenticada de modelos" on public.clientes_modelos;
drop policy if exists "Painel: atualização autenticada de modelos" on public.clientes_modelos;
drop policy if exists "Painel: exclusão autenticada de modelos" on public.clientes_modelos;
create policy "Painel: leitura autenticada de modelos"
  on public.clientes_modelos for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de modelos"
  on public.clientes_modelos for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de modelos"
  on public.clientes_modelos for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de modelos"
  on public.clientes_modelos for delete to authenticated using (public.is_owner());

-- Os 5 cartões (só entram se a tabela estiver vazia). Troque nome, prévia e
-- ficha pelo painel.
insert into public.clientes_modelos (ordem, nome, ficha)
select v.ordem, v.nome, v.ficha
from (values
  (1, 'Penumbra Dourada', 'FICHA DE ESTILO (Penumbra Dourada)
Paleta (tokens CSS em :root):
Fontes (títulos, texto corrido e destaque):
Clima e estilo visual:
Formas e detalhes (bordas, sombras, texturas, colagens):
Movimento e animações:
Como é cada seção (Capa, Sobre, Marcas, Portfólio, Serviços, Feedbacks, Contato):
Observações:'),
  (2, 'Água-Viva', 'FICHA DE ESTILO (Água-Viva)
Paleta (tokens CSS em :root):
Fontes (títulos, texto corrido e destaque):
Clima e estilo visual:
Formas e detalhes (bordas, sombras, texturas, colagens):
Movimento e animações:
Como é cada seção (Capa, Sobre, Marcas, Portfólio, Serviços, Feedbacks, Contato):
Observações:'),
  (3, 'Recorte & Colagem', 'FICHA DE ESTILO (Recorte & Colagem)
Paleta (tokens CSS em :root):
Fontes (títulos, texto corrido e destaque):
Clima e estilo visual:
Formas e detalhes (bordas, sombras, texturas, colagens):
Movimento e animações:
Como é cada seção (Capa, Sobre, Marcas, Portfólio, Serviços, Feedbacks, Contato):
Observações:'),
  (4, 'Letreiro UGC', 'FICHA DE ESTILO (Letreiro UGC)
Paleta (tokens CSS em :root):
Fontes (títulos, texto corrido e destaque):
Clima e estilo visual:
Formas e detalhes (bordas, sombras, texturas, colagens):
Movimento e animações:
Como é cada seção (Capa, Sobre, Marcas, Portfólio, Serviços, Feedbacks, Contato):
Observações:'),
  (5, 'Clube Zine Varsity', 'FICHA DE ESTILO (Clube Zine Varsity)
Paleta (tokens CSS em :root):
Fontes (títulos, texto corrido e destaque):
Clima e estilo visual:
Formas e detalhes (bordas, sombras, texturas, colagens):
Movimento e animações:
Como é cada seção (Capa, Sobre, Marcas, Portfólio, Serviços, Feedbacks, Contato):
Observações:')
) as v(ordem, nome, ficha)
where not exists (select 1 from public.clientes_modelos);

-- 3. Textos editáveis (prompts, links e mensagens) ------------------------
create table if not exists public.clientes_textos (
  chave text primary key,
  valor text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.clientes_textos enable row level security;

drop policy if exists "Painel: leitura autenticada de textos de clientes" on public.clientes_textos;
drop policy if exists "Painel: escrita autenticada de textos de clientes" on public.clientes_textos;
drop policy if exists "Painel: atualização autenticada de textos de clientes" on public.clientes_textos;
drop policy if exists "Painel: exclusão autenticada de textos de clientes" on public.clientes_textos;
create policy "Painel: leitura autenticada de textos de clientes"
  on public.clientes_textos for select to authenticated using (public.is_owner());
create policy "Painel: escrita autenticada de textos de clientes"
  on public.clientes_textos for insert to authenticated with check (public.is_owner());
create policy "Painel: atualização autenticada de textos de clientes"
  on public.clientes_textos for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Painel: exclusão autenticada de textos de clientes"
  on public.clientes_textos for delete to authenticated using (public.is_owner());

-- Textos iniciais (on conflict do nothing: nunca sobrescreve o que você editou)
insert into public.clientes_textos (chave, valor) values
  ('prompt_parte_fixa', $pf$Crie um site de portfólio de [nome da cliente], criadora de conteúdo / UGC creator, em página única, com visual limpo e acolhedor, e um painel administrativo pra ela editar tudo sozinha, sem mexer em código.

### 1. Tecnologia
- Site estático: um único `index.html` com CSS e JavaScript dentro (sem framework, sem build). Publicado no Cloudflare Pages (nomedela.pages.dev ou domínio próprio), sem arquivo CNAME. O código fica no GitHub.
- Dados (vídeos, marcas, serviços, feedbacks, textos, fotos) vêm do Supabase por uma Edge Function pública de leitura chamada `portfolio-publico`. Se a função falhar, o site continua mostrando o conteúdo que já está escrito no HTML (nada de página vazia).
- Imagens enviadas pelo painel ficam no bucket público `portfolio-imagens` do Supabase Storage.
- Visitas, cliques e visualização de vídeos são enviados pra uma Edge Function `track`, que grava na tabela `portfolio_events`. O site nunca grava direto no banco.
- Painel em `painel/index.html` (um arquivo só, com login do Supabase Auth). Só a conta da dona pode ler e escrever (função `is_owner()` no banco e políticas de RLS em todas as tabelas).

### 2. Identidade visual
Siga a FICHA DE ESTILO que vem logo abaixo deste texto (paleta, fontes, clima e detalhes).

### 3. Estrutura da página (nessa ordem)
1. **Faixa de aviso no topo** (marrom, texto azul claro): mostra a próxima data comemorativa pra contratar a criadora, com um "Responder →" que leva ao contato. Entra deslizando 0,5s depois que a página abre. As datas vêm do painel.
2. **Menu** (largura total, fundo azul claro, palavras em branco off): logo, Sobre, Portfólio, Serviços, Feedbacks e o botão "Solicitar proposta". Seletor de idioma PT / EN.
3. **Capa (hero)**: foto da criadora como fundo da capa inteira (ela troca pelo painel), com um degradê escuro de marrom no lado do texto pra dar leitura. Um selo ("Creator & Estrategista de Conteúdo · Disponível 2026"), um título grande com uma palavra de destaque em cursiva amarela, botão "Solicitar proposta" e link "Ver portfólio →". Texto levemente deslocado pra direita, com sombra atrás pra ler bem.
4. **Sobre**: fundo azul escuro, texto solto (sem cartões), título com palavra em cursiva, parágrafo curto em amarelo, e uma foto simples ao lado.
5. **Faixa de marcas**: frase "marcas que confiaram no meu trabalho" sobre marrom, e logo abaixo as marcas **em bolinhas** passando em carrossel infinito. A imagem preenche a bolinha inteira. O site olha a imagem sozinho: se tem fundo de uma cor lisa, a bolinha ganha essa cor; se é foto, preenche; se é logo solto, fica no meio (e se for branco, é pintado de marrom pra aparecer).
6. **Portfólio ("conheça meus trabalhos")**: fundo azul claro. Botões de nicho (pastas) na horizontal e, embaixo, os vídeos como catálogo estilo Netflix: cards na horizontal com setas pra rolar. Clicar num card abre o vídeo do YouTube num modal (formato vertical, Shorts). Os nichos e a ordem vêm do painel.
7. **Serviços**: fundo amarelo manteiga, título azul escuro, cada serviço num cartão com o nome dentro do cartão e uma frase curta centralizada em azul claro.
8. **Faixa rolando** entre Serviços e Feedbacks, com os serviços em letreiro contínuo (ex: Roteiros estratégicos / Direção criativa / Storytelling visual / Estratégia de conteúdo / Criativos de alta performance / Fotos Lifestyle). Os textos são editáveis.
9. **Feedbacks**: fundo amarelo manteiga, carrossel horizontal. Cada feedback tem a logo (ou foto) da marca, o @ da marca e o texto **sem aspas**.
10. **Contato**: fundo azul claro, só cores (sem fotos), formulário (nome, e-mail, telefone, marca, orçamento, mensagem) e botões de WhatsApp, e-mail e Instagram.
11. **Rodapé**: nome com ponto final em amarelo, descrição curta, e-mail e ano.
12. **Pop-up** de proposta rápida, que aparece depois de um tempo, com opção de fechar.

### 4. Comportamentos importantes
- Todo texto editável tem atributo `data-texto="chave"` e versão `data-pt` / `data-en`. Toda foto editável tem `data-foto="chave"`. Todo contato tem `data-contato="..."`. Assim o painel troca sem mexer no código.
- Idioma PT / EN troca todos os textos sem recarregar a página.
- Nenhuma imagem antiga pode aparecer piscando antes da nova carregar: esconder a imagem até a versão certa chegar do banco.
- Visitas: 1 `page_view` por carregamento. Cliques em WhatsApp, e-mail, Instagram e envio do formulário: `button_click`.
- Vídeos: ao abrir um vídeo, registrar `video_view` (id do vídeo e título). Pelo player do YouTube (enablejsapi), dividir o vídeo em 10 pedaços e marcar os pedaços realmente assistidos. Ao fechar o vídeo ou sair da página, mandar **um** aviso `video_retention` com os pedaços vistos, o ponto onde parou e se chegou ao fim.
- Quando o site abre dentro do editor do painel (`/?editor=1`), não conta visita nem clique.
- Cabeçalho, faixa de aviso e seções têm seletores fixos que o painel usa: `header.navbar`, `#promoBar`, `#hero`, `#sobre`, `.brands-strip`, `#portfolio`, `#servicos`, `#feedbacks`, `#contato`, `.file-card`, `.folder-tab[data-filter]`, `.brand-tile`, `.feedback-folder`, `img[data-foto]`. Não renomear sem ajustar o painel.

### 5. Painel administrativo
- Login com e-mail e senha (Supabase Auth). Só a dona acessa.
- Aba **Portfólio**:
  - **Resumo**: visitas (14 dias), visitantes únicos, cliques em botões, cliques pra entrar em contato, vídeos mais vistos e botões mais clicados.
  - **Vídeos mais vistos**: miniatura vertical só com a capa, número de visualizações, **média assistida**, quantos chegaram ao fim, em que trecho mais gente sai e uma barrinha de 10 quadradinhos mostrando quanto cada trecho foi assistido.
  - **Mensagens** recebidas pelo formulário.
  - **Editar portfólio**: mostra o próprio site dentro do painel. Ela clica no que quer mudar (texto, foto, marca, vídeo, feedback, serviço, contato, data comemorativa) e edita na hora. Dá pra criar, reordenar, ocultar e voltar ao original.
- **Ajuste de imagem antes de enviar**: ao escolher uma foto ou logo, abre uma janela com moldura (redonda pra marcas e feedbacks, retangular pra capa, vertical pro Sobre). Ela arrasta, dá zoom, escolhe a cor de fundo (ou transparente) e confirma. Há também "Usar sem recortar".
- Painel em português e inglês.
- Se quiser vender com mais recursos: Calendário, Dashboard financeiro, Prospecção e Roteiros já existem no painel original e podem ser incluídos como pacotes à parte.

### 6. Banco de dados (Supabase)
- `portfolio_itens`: guarda vídeos, nichos, serviços, feedbacks, marcas, fotos, textos, contatos e datas comemorativas. Colunas principais: `tipo`, `titulo`, `titulo_en`, `texto_pt`, `texto_en`, `categoria`, `logo_url`, `link`, `ordem`, `ativo`.
- `portfolio_events`: `event_type` (`page_view`, `button_click`, `video_view`, `video_retention`), `event_name`, `session_id`, `page_path`, `metadata` (jsonb), `created_at`.
- `portfolio_leads`: mensagens do formulário. Cada lead novo também vira um card em Prospecção.
- Funções: `portfolio-publico` (leitura pública do conteúdo) e `track` (recebe eventos e leads, validando formato e tamanho de tudo que recebe).
- Todas as tabelas com RLS ligado e política só pro dono (`is_owner()` com o UID da cliente).

### 7. Regras de trabalho
- Fazer exatamente o que for pedido, com o mínimo de extras.
- Explicar em português simples, sem jargão.
- Antes de publicar, testar localmente. Depois de publicar, conferir o site no ar.
- Cuidado com cache: ao mudar CSS do painel, trocar o número depois de `?v=` no link do arquivo.
- SQL do banco nunca roda sozinho: entregar o arquivo e a cliente roda no Supabase. Só Edge Functions são publicadas pelo Claude.$pf$),
  ('personalizado_ficha', $t$FICHA DE ESTILO (Personalizado)
Paleta (tokens CSS em :root):
Fontes (títulos, texto corrido e destaque):
Clima e estilo visual:
Formas e detalhes (bordas, sombras, texturas, colagens):
Movimento e animações:
Como é cada seção (Capa, Sobre, Marcas, Portfólio, Serviços, Feedbacks, Contato):
Observações:$t$),
  ('personalizado_lista', $t$Peça para a cliente:
- Nome, @ do Instagram, e-mail e WhatsApp
- Referências de sites que ela gosta (links ou prints) e o que ela gosta em cada um
- Cores que ela quer e cores que ela NÃO quer
- Fontes ou clima desejado (delicado, forte, retrô, minimalista...)
- Foto da capa e foto do Sobre
- Textos: selo, título da capa, Sobre, serviços, frase do rodapé
- Marcas (logos) e feedbacks (logo, @ e texto)
- Vídeos do YouTube (link, título e nicho)$t$),
  ('personalizado_referencia', ''),
  ('link_apresentacao', ''),
  ('link_formulario', ''),
  ('link_termos', ''),
  ('msg_primeira_resposta', $t$Oi, [nome]! Tudo bem? Que bom que você me chamou 💛
Sou a Bruna e faço portfólios no mesmo estilo do meu: um site seu, com painel pra você mesma editar tudo depois, sem mexer em código.
Olha como funciona: [link da apresentação]
Quer que eu te explique os planos?$t$),
  ('msg_pix_50', $t$Perfeito, [nome]! Pra reservar a sua vaga e começar, eu peço 50% na entrada e os outros 50% quando a prévia estiver pronta.
Valor total: [valor total]
Entrada (50%): [valor da entrada]
Pix: [chave pix]
Assim que o pagamento cair eu te mando o formulário, combinado?$t$),
  ('msg_formulario', $t$Pagamento confirmado, obrigada! 🎉
Agora preciso que você preencha esse formulário com seus dados, fotos, textos e referências: [link do formulário]
Quanto mais detalhe você colocar, mais a cara da sua marca o site fica. Me avisa quando terminar!$t$),
  ('msg_prazo', $t$Recebi tudo, [nome]! Já vou começar.
O prazo de entrega da prévia é até [data do prazo]. Assim que ficar pronta eu te aviso por aqui.
Qualquer dúvida no meio do caminho é só chamar.$t$),
  ('msg_previa', $t$[nome], sua prévia ficou pronta! 🥳
Dá uma olhada: [link da prévia]
Pode me falar o que você quer ajustar. Quando estiver tudo certo, é só fazer o pagamento dos outros 50% ([valor da segunda parcela]) que eu te entrego o site final.
Pix: [chave pix]$t$)
on conflict (chave) do nothing;
