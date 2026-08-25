const SUPABASE_URL = 'https://trfoymytrvdbslwizfqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZm95bXl0cnZkYnNsd2l6ZnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzg1MjksImV4cCI6MjA5OTg1NDUyOX0.fG-ACsRsLw_QeACvgSkrY1qWpctIBq5_LYonJ6hMBKE';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

window.Auth = {
  async login(email, senha) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
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

  async checkAuth() {
    const { data } = await sb.auth.getSession();

    if (!data.session) {
      window.location.href = '/login';
      return null;
    }

    return data.session.user;
  },

  async logout() {
    await sb.auth.signOut();
    window.location.href = '/login';
  },

  async recuperarSenha(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  },
};
