# Automações do Instagram (conversa com botões) — como colocar no ar

Este documento explica os passos pra ligar de verdade o novo motor de automações do
Instagram (o "ManyChat"): comentário/DM dispara uma conversa com botões, em tempo real,
com freio de envio pra não tomar bloqueio da Meta.

A aba **Instagram > Automações** já está pronta no painel (lista, editor visual com prévia
ao vivo, construtor de conversa). O que falta é ligar o backend: banco, segredos e o
webhook no Meta for Developers.

---

## 0) O que mudou

- A automação antiga (uma regra = uma palavra = uma mensagem única, verificada a cada 10
  minutos) foi **substituída** por um motor de conversa com botões, em tempo real.
- Antes: `instagram-automacao-processar` rodava via cron a cada 10 min, olhando comentários
  "na mão".
- Agora: a Meta chama a Edge Function `instagram-webhook` na hora que alguém comenta ou
  manda mensagem/toca em botão. Um novo cron (`instagram-scheduler`, a cada 1 min) só cuida
  da fila do freio de envio e dos passos agendados (delay).
- Toda automação agora guarda uma **conversa** (`flow`), não mais uma mensagem única — os
  dados das automações antigas foram migrados automaticamente pro novo formato (sem botão).

---

## 1) Rodar o SQL novo

No SQL Editor do seu projeto Supabase, rode o arquivo:

```
painel-admin/instagram-automacoes-fluxo.sql
```

Antes de rodar, troque `<PROJECT_REF>` (no fim do arquivo, no agendamento do cron) pela
referência do seu projeto Supabase (aparece na URL do painel do Supabase).

Esse script:
- Acrescenta o campo `flow` (a conversa) nas automações e migra as antigas.
- Cria as tabelas do freio de envio (`instagram_freio`), da fila (`instagram_fila_envio`),
  dos passos agendados (`instagram_agendados`), do ledger de envios do bot
  (`instagram_envios_bot`) e da biblioteca de arquivos (`instagram_arquivos`).
- Cria as funções `instagram_tirar_ficha` e `instagram_registrar_envio` (o freio).
- Troca o cron antigo (`instagram-automacao-processar`, a cada 10 min) pelo novo
  (`instagram-scheduler`, a cada 1 min), reaproveitando o mesmo segredo que já existia.

**Sem esse SQL, nenhuma DM sai** — o freio falha fechado por segurança.

---

## 2) Segredos novos das Edge Functions

Além dos que você já tinha (`INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`,
`INSTAGRAM_REDIRECT_URI`, `INSTAGRAM_AUTOMACAO_CRON_SECRET`), configure estes novos:

```bash
supabase secrets set INSTAGRAM_VERIFY_TOKEN=uma_senha_que_voce_inventa
supabase secrets set INSTAGRAM_APP_SECRET_ENFORCE=false
supabase secrets set INSTAGRAM_TEST_ACCOUNTS=
```

- `INSTAGRAM_VERIFY_TOKEN`: uma senha qualquer, você inventa. É o "aperto de mão" que o Meta
  usa pra confirmar que a URL do webhook é sua, na hora de cadastrar.
- `INSTAGRAM_APP_SECRET_ENFORCE`: comece com `false` (modo teste: assinatura inválida só
  gera aviso no log). Depois que tudo estiver funcionando, mude pra `true` (passo 7).
- `INSTAGRAM_TEST_ACCOUNTS`: ids numéricos (IGSID) de contas de teste, separados por
  vírgula, opcional. Essas contas ignoram a regra de "1 DM por dia" — útil pra você testar
  à vontade. Pode deixar vazio por enquanto e preencher depois, se precisar.

`INSTAGRAM_AUTOMACAO_CRON_SECRET` (já existente) é reaproveitado pelo novo
`instagram-scheduler` — não precisa criar de novo.

---

## 3) Publicar as Edge Functions

```bash
supabase functions deploy instagram-webhook --no-verify-jwt
supabase functions deploy instagram-scheduler --no-verify-jwt
supabase functions deploy instagram-media
```

(As outras funções do Instagram que já existiam — `instagram-metrics`,
`instagram-oauth-*` — não precisam de novo deploy só por essa mudança, a menos que você
rode `supabase functions deploy` sem nome, que publica todas de uma vez, o que também
funciona.)

A função antiga `instagram-automacao-processar` foi removida do código. Se ela ainda
aparecer na lista de funções publicadas do seu projeto, pode desativá-la ou apagá-la no
painel do Supabase (Functions) — ela não é mais chamada por nada.

---

## 4) Reconectar o Instagram (permissão nova)

O motor de conversa precisa da permissão `instagram_business_manage_messages` (mandar/
receber DM), que a conexão antiga não pediu. Na aba **Instagram > Visão Geral**:

1. Clique em **Desconectar**.
2. Clique em **Conectar Instagram** de novo e autorize.

Isso troca o token guardado por um novo, já com a permissão de mensagens.

---

## 5) Cadastrar o webhook no Meta for Developers

No app do Instagram (o mesmo já usado pra `instagram-oauth-*`), na seção **Webhooks**:

- **URL de callback**: `https://<PROJECT_REF>.functions.supabase.co/instagram-webhook`
  (ou o formato `https://<PROJECT_REF>.supabase.co/functions/v1/instagram-webhook`,
  dependendo de qual o painel do Meta aceitar — os dois apontam pra mesma função).
- **Verify token**: o mesmo valor que você colocou em `INSTAGRAM_VERIFY_TOKEN` (passo 2).
- **Campos pra assinar**: `comments`, `messages` e `messaging_postbacks`. Os três — sem o
  `messaging_postbacks`, os botões que avançam a conversa não funcionam.

O app precisa estar em modo **Live** (não "Em desenvolvimento") pra receber webhook de
comentários de qualquer pessoa, com Política de Privacidade e Termos de Serviço cadastrados
nas configurações do app.

---

## 6) Testar

1. Crie uma automação simples: uma palavra-gatilho, uma Mensagem 1 com um botão que "continua
   a conversa", e uma Mensagem 2 de teste.
2. Com uma **segunda conta** do Instagram (a sua própria conta é ignorada de propósito, pra
   não gerar automação em cima dos seus próprios comentários), comente a palavra-gatilho no
   post configurado (ou em qualquer post, se "qualquer palavra"/sem post específico).
3. Confira se a resposta pública aparece no comentário e se a DM chega com o botão.
4. Toque no botão e confira se a Mensagem 2 chega.
5. Se algo não funcionar, veja os logs da função no painel do Supabase (Functions >
   instagram-webhook > Logs).

Enquanto estiver testando, pode adicionar o id numérico (IGSID) da sua conta de teste em
`INSTAGRAM_TEST_ACCOUNTS` pra não esperar 24h entre um teste e outro.

---

## 7) Travar de vez

Depois que tudo funcionar nos testes:

```bash
supabase secrets set INSTAGRAM_APP_SECRET_ENFORCE=true
```

A partir daí, o webhook só aceita chamadas com a assinatura certa (só a Meta, com o
`INSTAGRAM_APP_SECRET` correto, consegue mandar eventos).

---

## Limites e regras que o motor já respeita

- **1 DM por dia** por pessoa em gatilho de comentário (contas em `INSTAGRAM_TEST_ACCOUNTS`
  ignoram essa regra).
- **Freio de envio**: no máximo 6 por minuto, 60 por hora, 180 por dia (bem abaixo do teto
  real da Meta). Sem ficha disponível, o envio espera na fila e o `instagram-scheduler`
  tenta de novo no minuto seguinte.
- **Disjuntor**: 3 falhas "duras" (tipo bloqueio) seguidas pausam os envios por 3 horas.
- **Botão anexado**: no máximo 3 por mensagem (o editor já limita isso). Se a Meta recusar o
  formato, cai pra quick_reply (até 13, só funciona se nenhum botão for link) e por último
  pra texto puro (com o link escrito, se houver).
- **Resposta privada por comentário**: só vale até 7 dias depois do comentário.
- **Token do Instagram**: vence a cada ~60 dias. O `instagram-scheduler`, que já roda a cada
  1 minuto, aproveita a chamada pra renovar sozinho quando faltam menos de 3 dias.
- Nada de spam nem lista comprada: o sistema só responde quem comentou ou mandou mensagem —
  nunca dispara sozinho pra quem não interagiu.
