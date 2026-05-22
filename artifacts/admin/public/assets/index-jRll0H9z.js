(() => {
  async function reset() {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }
    window.location.replace(`/?admin_reset=${Date.now()}`);
  }
  reset().catch(() => window.location.replace(`/?admin_reset=${Date.now()}`));
})();
