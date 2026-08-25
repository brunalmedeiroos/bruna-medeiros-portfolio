// ==========================================================================
// js/auth.js — Autenticação compartilhada (login.html e painel.html)
// ==========================================================================
// Este arquivo cria o único cliente Supabase da aplicação e expõe as
// funções de autenticação em window.Auth. Ele depende do script do
// Supabase (carregado via CDN) já estar presente na página ANTES deste
// arquivo ser incluído.

// ---- Configuração do projeto Supabase ----
// Troque estas duas constantes apenas se for usar outro projeto Supabase.
const SUPABASE_URL = 'https://trfoymytrvdbslwizfqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZm95bXl0cnZkYnNsd2l6ZnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzg1MjksImV4cCI6MjA5OTg1NDUyOX0.fG-ACsRsLw_QeACvgSkrY1qWpctIBq5_LYonJ6hMBKE';

// Cliente único do Supabase, usado por toda a aplicação.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- API pública de autenticação ----
window.Auth = {
  // Cliente Supabase exposto para as telas que precisam consultar tabelas
  // (o painel usa Auth.sb para ler portfolio_events e portfolio_leads).
  sb,

  // Faz login com e-mail e senha. Lança um Error com mensagem amigável
  // em caso de falha, ou retorna o usuário autenticado em caso de sucesso.
  async login(email, senha) {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('E-mail ou senha incorretos.');
      }
      throw new Error(error.message);
    }

    return data.user;
  },

  // Retorna a sessão atual (ou null), sem redirecionar.
  async getSession() {
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },

  // Guarda de autenticação: roda no topo de páginas protegidas.
  // Se não houver sessão, redireciona para /login/ e retorna null.
  // Se houver, retorna o usuário logado.
  // Usa caminho absoluto (começando com /) porque o painel e o login
  // vivem em pastas diferentes do site (/painel-admin/ e /login/).
  async checkAuth() {
    const session = await this.getSession();

    if (!session) {
      window.location.href = '/login/';
      return null;
    }

    return session.user;
  },

  // Encerra a sessão e volta para a tela de login.
  async logout() {
    await sb.auth.signOut();
    window.location.href = '/login/';
  },

  // Envia o e-mail de recuperação de senha do Supabase Auth.
  async recuperarSenha(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message);
    }
  },
};

