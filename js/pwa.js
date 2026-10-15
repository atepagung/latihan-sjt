// Mendaftarkan service worker, memberi tahu saat siap offline, dan menawarkan pembaruan.
export async function setupPwa({ onOfflineReady, onUpdateReady }) {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.register('./sw.js');

  // Resolve saat ada service worker aktif, artinya seluruh file sudah tersimpan di cache
  navigator.serviceWorker.ready.then(() => onOfflineReady());

  let userAcceptedUpdate = false;
  const offerUpdate = (worker) =>
    onUpdateReady(() => {
      userAcceptedUpdate = true;
      worker.postMessage('SKIP_WAITING');
    });

  // Versi baru sudah terunduh dan menunggu sejak kunjungan sebelumnya
  if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      // controller sudah ada berarti ini pembaruan, bukan pemasangan pertama
      if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
    });
  });

  // Muat ulang hanya bila pengguna yang meminta, bukan saat pemasangan pertama
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (userAcceptedUpdate) window.location.reload();
  });

  // Cek pembaruan saat aplikasi dibuka kembali dan sedang online, paling sering 30 menit sekali
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine && Date.now() - lastCheck > 30 * 60 * 1000) {
      lastCheck = Date.now();
      registration.update().catch(() => {});
    }
  });
}
