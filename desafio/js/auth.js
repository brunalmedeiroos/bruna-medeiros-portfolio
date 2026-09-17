// ==========================================================================
// desafio/js/auth.js — Autenticação do site do desafio.
// Separado de painel-admin/js/auth.js de propósito: lá só a Bruna loga
// (redireciona sempre pra ../login/). Aqui qualquer pessoa pode criar
// conta — é o site público de quem tá participando do desafio.
// ==========================================================================

// Projeto Supabase PRÓPRIO do desafio (separado do painel interno de
// propósito — ver decisão no chat: evita misturar cadastro público de
// participante com o login único do Creator Center).
const SUPABASE_URL = 'https://gcqyhtdtsosfzcykslhb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcXlodGR0c29zZnpjeWtzbGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NDY0NzUsImV4cCI6MjEwNTIyMjQ3NX0.7M7Y48Lufn4zwHqua0N2K3_rzcvyRXm77cdI4rCaUf8';

// E-mail da conta da Bruna — mesmo valor de public.is_owner() no banco
// (ver painel-admin/desafio-setup.sql). Usado só pra decidir se mostra
// o link do admin na tela; quem garante segurança de verdade é o RLS.
const OWNER_EMAIL = 'medeirosbru6@gmail.com';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.DesafioAuth = {
  sb,
  OWNER_EMAIL,

  // Cria a conta. nome/instagram/fase/indicadoPor vão nos metadados do
  // usuário — o trigger desafio_criar_perfil() (no banco) lê isso pra
  // criar a linha em desafio_perfis sozinho, sem precisar de um segundo
  // passo. indicadoPor é o UID de quem indicou (lido do link ?ref=).
  async cadastrar({ nome, instagram, fase, email, senha, indicadoPor }) {
    const { data, error } = await sb.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, instagram, fase: fase || null, indicado_por: indicadoPor || null } },
    });
    if (error) {
      if (/already/i.test(error.message)) {
        throw new Error('Esse e-mail já tem cadastro — tenta entrar em vez de criar conta.');
      }
      throw new Error(error.message);
    }
    return data.user;
  },

  async login(email, senha) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('E-mail ou senha incorretos.');
      }
      throw new Error(error.message);
    }
    return data.user;
  },

  // Roda no topo de /desafio/painel/ e /desafio/admin/. Sem sessão,
  // manda pra tela de cadastro/login do desafio (não a do painel interno).
  async checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.href = '/desafio/';
      return null;
    }
    return session.user;
  },

  isOwner(user) {
    return !!user && user.email === OWNER_EMAIL;
  },

  async logout() {
    await sb.auth.signOut();
    window.location.href = '/desafio/';
  },
};
