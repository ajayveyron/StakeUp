(() => {
  const resetKey = "pact-raven-admin-sw-reset-v1";

  async function resetServiceWorkers() {
    if (!("serviceWorker" in navigator)) return;

    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) return;

    if (window.sessionStorage.getItem(resetKey) === "done") return;
    window.sessionStorage.setItem(resetKey, "done");

    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }

    window.location.reload();
  }

  resetServiceWorkers().catch(() => {});
})();
