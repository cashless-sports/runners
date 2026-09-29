/* Service worker de Runners Hub
 * Recibe las notificaciones push del servidor AUNQUE la app esté cerrada: el sistema (Android,
 * iOS, Windows, macOS) despierta este archivo cuando llega un aviso, lo muestra y se vuelve a dormir.
 * Debe estar en la raíz del sitio, junto a index.html.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { title: 'Runners Hub', body: event.data ? event.data.text() : '' }; }

  const title = String(d.title || 'Runners Hub').slice(0, 100);
  const options = {
    body: String(d.body || '').slice(0, 240),
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-72.png',
    tag: d.tag || undefined,
    renotify: Boolean(d.tag),
    data: { url: typeof d.url === 'string' ? d.url : './' },
  };
  if (typeof d.image === 'string' && /^https:\/\//i.test(d.image)) options.image = d.image;

  event.waitUntil((async () => {
    // Si la app está abierta y a la vista, la propia página ya avisa (evita duplicados).
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible' && w.focused)) return;
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || './';
  let target;
  try { target = new URL(raw, self.registration.scope); } catch (e) { target = new URL('./', self.registration.scope); }
  if (!/^https?:$/.test(target.protocol)) target = new URL('./', self.registration.scope);
  const sameSite = target.origin === self.location.origin;

  event.waitUntil((async () => {
    if (sameSite) {                                   // enlace interno: reutiliza la ventana abierta si existe
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if ('focus' in w) {
          await w.focus();
          if ('navigate' in w && w.url !== target.href) { try { await w.navigate(target.href); } catch (e) { /* sin permiso */ } }
          return;
        }
      }
    }
    await self.clients.openWindow(target.href);       // externo, o la app estaba cerrada
  })());
});
