// Service worker: menyimpan seluruh aplikasi ke cache agar bisa dibuka tanpa internet.
// Versi dinaikkan lewat: python tools/bump_version.py patch
const CACHE_VERSION = 'sjt-v1.0.0';

// Semua file yang dibutuhkan aplikasi. File baru di css/, js/, icons/, data/ wajib ditambahkan di sini.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/config.js',
  './js/data.js',
  './js/store.js',
  './js/quiz.js',
  './js/ui.js',
  './js/views.js',
  './js/views/common.js',
  './js/views/home.js',
  './js/views/setup.js',
  './js/views/session.js',
  './js/views/result.js',
  './js/views/stats.js',
  './js/views/settings.js',
  './js/pwa.js',
  './js/app.js',
  './data/bank_soal_sjt_kemenkeu.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' memaksa unduh dari server, bukan dari cache browser yang mungkin masih versi lama
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  // Hapus cache versi lama, lalu ambil alih halaman yang sedang terbuka
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('sjt-') && key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  // Aplikasi mengirim pesan ini saat pengguna mengetuk "Muat ulang" di banner pembaruan
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Membuka halaman (termasuk dari ikon di layar utama): selalu pakai index.html dari cache
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((cached) => cached || fetch(request)));
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request))
  );
});
