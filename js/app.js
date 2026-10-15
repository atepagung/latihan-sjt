// Titik masuk aplikasi: memuat progres dan bank soal, menerapkan tampilan, dan mengatur pindah layar
// lewat hash (#/...). Hash dipakai karena tombol kembali Android tetap berfungsi dan aplikasi bisa
// jalan di subfolder GitHub Pages.
import { APP_VERSION } from './config.js';
import { loadBank } from './data.js';
import { latestStats } from './quiz.js';
import * as store from './store.js';
import { showToast } from './ui.js';
import * as views from './views.js';

// Warna bilah status HP untuk tiap tema, sama dengan meta theme-color di index.html
const THEME_COLORS = { light: '#0F4C81', dark: '#171C22' };

const app = document.getElementById('app');

// Bank soal yang sudah dimuat (lihat data.js). Diisi sekali saat aplikasi dibuka.
let bank = null;

// ---------- Tampilan ----------

// Atribut di <html> yang dibaca CSS. "Ikuti sistem" berarti atributnya dilepas.
function applySettings(settings) {
  const root = document.documentElement;
  if (settings.theme === 'light' || settings.theme === 'dark') {
    root.setAttribute('data-theme', settings.theme);
  } else {
    root.removeAttribute('data-theme');
  }
  if (settings.textSize === 'large') {
    root.setAttribute('data-text-size', 'large');
  } else {
    root.removeAttribute('data-text-size');
  }
  // Bila tema dipaksa, kedua meta theme-color disamakan agar warna bilah status HP ikut tema
  const [lightMeta, darkMeta] = document.querySelectorAll('meta[name="theme-color"]');
  if (lightMeta && darkMeta) {
    const forced = THEME_COLORS[settings.theme];
    lightMeta.content = forced || THEME_COLORS.light;
    darkMeta.content = forced || THEME_COLORS.dark;
  }
}

function handleSettingsChange(patch) {
  applySettings(store.updateSettings(patch));
  showToast('Pengaturan disimpan');
}

// ---------- Router ----------

function homeView() {
  const { attempts } = store.getState();
  return views.renderHome({ version: APP_VERSION, bank, stats: latestStats(attempts, bank.byId) });
}

// Setiap rute: pola path dan fungsi yang membuat layarnya. Bagian dalam kurung pada pola
// (misalnya id sesi) diteruskan sebagai argumen.
const routes = [
  { pattern: /^\/$/, render: homeView },
  { pattern: /^\/mulai\/latihan$/, render: () => views.renderPlaceholder('Atur latihan') },
  { pattern: /^\/mulai\/simulasi$/, render: () => views.renderPlaceholder('Atur simulasi') },
  { pattern: /^\/sesi$/, render: () => views.renderPlaceholder('Mengerjakan soal') },
  { pattern: /^\/hasil\/([\w-]+)$/, render: (id) => views.renderPlaceholder('Hasil sesi', `Sesi: ${id}`) },
  { pattern: /^\/statistik$/, render: () => views.renderPlaceholder('Statistik') },
  {
    pattern: /^\/pengaturan$/,
    render: () => views.renderSettings({
      settings: store.getState().settings,
      version: APP_VERSION,
      onChange: handleSettingsChange,
    }),
  },
];

function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

// Pasang layar baru, gulir ke atas, lalu pindahkan fokus ke judul
// supaya pembaca layar langsung membacakan layar yang baru.
function showView(view) {
  app.replaceChildren(view);
  window.scrollTo(0, 0);
  const heading = app.querySelector('h1');
  const target = heading || app;
  if (heading) heading.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

function router() {
  const path = currentPath();
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      showView(route.render(...match.slice(1)));
      return;
    }
  }
  // Rute tidak dikenal: ganti dengan Beranda tanpa menambah riwayat tombol kembali
  location.replace('#/');
}

// ---------- Mulai ----------

async function init() {
  const { recovered } = store.load();
  applySettings(store.getState().settings);

  try {
    bank = await loadBank();
  } catch (error) {
    console.error(error);
    showView(views.renderLoadError());
    return;
  }

  if (recovered) {
    showToast('Data progres rusak dan tidak bisa dibaca. Aplikasi mulai dari awal.', 6000);
  }
  window.addEventListener('hashchange', router);
  router();
}

init();
