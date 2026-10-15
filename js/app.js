// Titik masuk aplikasi: menerapkan pengaturan tampilan dan mengatur pindah layar lewat hash (#/...).
// Hash dipakai karena tombol kembali Android tetap berfungsi dan aplikasi bisa jalan di subfolder.
import { APP_VERSION, STORAGE_KEY } from './config.js';
import { showToast } from './ui.js';
import * as views from './views.js';

const DEFAULT_SETTINGS = { theme: 'system', textSize: 'normal', shuffleOptions: true };

// Warna bilah status HP untuk tiap tema, sama dengan meta theme-color di index.html
const THEME_COLORS = { light: '#0F4C81', dark: '#171C22' };

const app = document.getElementById('app');

// ---------- Pengaturan (sementara) ----------
// Fase 1 membaca dan menulis localStorage langsung. Di Fase 2 bagian ini dipindah ke store.js.

function readStored() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function readSettings() {
  return { ...DEFAULT_SETTINGS, ...readStored().settings };
}

// Hanya bagian settings yang diubah; isi lain di kunci yang sama (progres, sesi) dibiarkan.
function saveSettings(patch) {
  const data = readStored();
  data.schema = data.schema || 1;
  data.settings = { ...DEFAULT_SETTINGS, ...data.settings, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    showToast('Pengaturan gagal disimpan di perangkat ini.');
  }
  return data.settings;
}

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
  applySettings(saveSettings(patch));
  showToast('Pengaturan disimpan');
}

// ---------- Router ----------
// Setiap rute: pola path dan fungsi yang membuat layarnya. Bagian dalam kurung pada pola
// (misalnya id sesi) diteruskan sebagai argumen.
const routes = [
  { pattern: /^\/$/, render: () => views.renderHome({ version: APP_VERSION }) },
  { pattern: /^\/mulai\/latihan$/, render: () => views.renderPlaceholder('Atur latihan') },
  { pattern: /^\/mulai\/simulasi$/, render: () => views.renderPlaceholder('Atur simulasi') },
  { pattern: /^\/sesi$/, render: () => views.renderPlaceholder('Mengerjakan soal') },
  { pattern: /^\/hasil\/([\w-]+)$/, render: (id) => views.renderPlaceholder('Hasil sesi', `Sesi: ${id}`) },
  { pattern: /^\/statistik$/, render: () => views.renderPlaceholder('Statistik') },
  {
    pattern: /^\/pengaturan$/,
    render: () => views.renderSettings({ settings: readSettings(), version: APP_VERSION, onChange: handleSettingsChange }),
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

function init() {
  applySettings(readSettings());
  window.addEventListener('hashchange', router);
  router();
}

init();
