# Painel Administrativo — brunamedeiros.com

Painel de administração estático (HTML, CSS e JavaScript puro, sem build) para acompanhar os números do portfólio, usando Supabase como backend.

## Passo a passo

1. **Rode o SQL**: abra o SQL Editor do seu projeto Supabase e execute o conteúdo de [setup.sql](setup.sql). Isso cria as tabelas `portfolio_events` e `portfolio_leads`, liga o RLS e permite leitura para usuários autenticados.

2. **Crie seu usuário de login**: no painel do Supabase, vá em **Authentication > Users > Add user** (ou **Invite**), cadastre seu e-mail e senha. É esse e-mail e senha que você vai usar em `login.html`.

3. **Teste localmente**: como os arquivos usam `fetch`/módulos do Supabase, abra a pasta com um servidor local simples (não funciona bem com duplo clique em `file://`). Exemplo com Python: `python -m http.server 8080` dentro da pasta do projeto, depois acesse `http://localhost:8080/login.html`.

4. **Publique no GitHub Pages**: crie um repositório, suba estes arquivos (`login.html`, `painel.html`, `js/`, `css/`), ative o GitHub Pages em **Settings > Pages** apontando para a branch principal. *Ou* publique na Vercel: importe o repositório e faça deploy como projeto estático (sem build command).

5. **Ligue ao seu domínio**: se quiser que o login apareça em `brunamedeiros.com/`, publique este projeto num subdomínio ou subpasta (ex: `admin.brunamedeiros.com` ou `brunamedeiros.com/admin/`) e configure o DNS/roteamento do seu domínio para apontar para lá. O painel funciona em qualquer URL, não precisa estar na raiz.

6. **Ligue a gravação de eventos no site**: o painel só lê dados. Configure o site do portfólio para gravar em `portfolio_events` e `portfolio_leads` a partir do seu servidor (com a `service_role key` do Supabase, nunca a chave anon no navegador do público) — veja o comentário no final de [setup.sql](setup.sql).

## Estrutura de arquivos

```
painel-admin/
├── login.html      # Tela de login
├── painel.html      # Painel protegido (menu lateral com 2 abas)
├── setup.sql         # SQL para rodar no Supabase
├── js/
│   ├── auth.js       # Cliente Supabase + funções de autenticação (window.Auth)
│   └── painel.js      # Lógica de dados e renderização do painel
└── css/
    └── style.css       # Design system e layout
```

## Resumo

- **Testar localmente**: rode um servidor estático simples (ex: `python -m http.server 8080`) na pasta do projeto e abra `login.html`.
- **Criar seu login**: no Supabase, em Authentication > Users, adicione seu e-mail e uma senha.
- **Publicar**: suba a pasta para um repositório GitHub e ative o GitHub Pages, ou importe o repositório na Vercel como site estático.
