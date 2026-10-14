// Service worker do painel: só recebe as notificações push e mostra no celular.
// Não guarda nada em cache de propósito, pra o painel sempre abrir na versão mais nova.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { corpo: event.data ? event.data.text() : '' };
  }
  const titulo = dados.titulo || 'Painel';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || '',
      icon: '/painel/icons/icone-192.png',
      badge: '/painel/icons/icone-192.png',
      tag: dados.tag || undefined,
      data: { url: dados.url || '/painel/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/painel/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.includes('/painel') && 'focus' in janela) return janela.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});
