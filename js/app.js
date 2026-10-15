// Titik masuk aplikasi: memuat progres dan bank soal, menerapkan tampilan, mengatur pindah layar
// lewat hash (#/...), menjalankan alur sesi, dan pengatur waktu simulasi.
// Hash dipakai karena tombol kembali Android tetap berfungsi dan aplikasi bisa jalan di subfolder.
import { APP_VERSION } from './config.js';
import { loadBank } from './data.js';
import {
  MAX_SCORE, answeredCount, buildPool, createSession, finishSession, latestStats, pickIds, pickQuick,
  remainingSeconds, scoreOf, shuffle,
} from './quiz.js';
import * as store from './store.js';
import { announce, closeDialog, confirmDialog, formatDuration, showDialog, showToast } from './ui.js';
import * as views from './views.js';

// Warna bilah status HP untuk tiap tema, sama dengan meta theme-color di index.html
const THEME_COLORS = { light: '#0F4C81', dark: '#171C22' };

// Peringatan sisa waktu simulasi yang dibacakan pembaca layar (detik)
const TIME_WARNINGS = [300, 60];

const app = document.getElementById('app');

// Bank soal yang sudah dimuat (lihat data.js). Diisi sekali saat aplikasi dibuka.
let bank = null;

// Pengatur waktu simulasi yang sedang berjalan, dan peringatan yang sudah dibacakan untuk sesi ini
let timerId = null;
let warned = { sessionId: null, levels: new Set() };

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

// Pindah rute. replace = true menimpa riwayat, sehingga tombol kembali tidak membuka layar sebelumnya.
// Bila hash tujuan sama dengan sekarang, hashchange tidak terjadi, jadi router dipanggil langsung.
function navigate(hash, { replace = false } = {}) {
  if (location.hash === hash) {
    router();
  } else if (replace) {
    location.replace(hash);
  } else {
    location.hash = hash;
  }
}

// ---------- Sesi ----------

// Menyelesaikan sesi aktif dan menyimpan hasilnya ke riwayat. Jawaban simulasi baru dicatat di sini.
// keepEmpty = false: sesi yang belum dijawab sama sekali cukup dibuang (misalnya tombol Akhiri).
function finishActive({ keepEmpty }) {
  const { active } = store.getState();
  if (!active) return null;
  if (!keepEmpty && answeredCount(active) === 0) {
    store.clearActive();
    return null;
  }
  const result = finishSession(active, bank.byId, Date.now());
  if (active.mode === 'simulasi') {
    for (const item of result.items) {
      if (item.kode) store.recordAttempt(item.id, item.kode, item.skor, 'simulasi', result.finishedAt);
    }
  }
  store.clearActive();
  if (result.items.length === 0) return null;
  store.addSession(result);
  return result;
}

// Memulai sesi baru. Bila masih ada sesi yang belum selesai, minta konfirmasi lalu akhiri sesi itu.
async function startSession(mode, ids, { replace }) {
  if (ids.length === 0) {
    showToast('Tidak ada soal untuk sesi ini.');
    return;
  }
  if (store.getState().active) {
    const ok = await confirmDialog({
      title: 'Akhiri sesi sebelumnya?',
      message: 'Masih ada sesi yang belum selesai. Sesi itu akan diakhiri dan jawabannya dinilai.',
      confirmText: 'Mulai baru',
    });
    if (!ok) return;
    finishActive({ keepEmpty: false });
  }
  const session = createSession({ mode, ids, shuffleOptions: store.getState().settings.shuffleOptions });
  store.setActive(session);
  navigate('#/sesi', { replace });
}

function startPractice(filter) {
  const pool = buildPool(bank.questions, filter, store.getState().attempts);
  if (Number.isFinite(filter.count) && pool.length < filter.count) {
    showToast(`Hanya ada ${pool.length} soal yang cocok. Semuanya dipakai.`);
  }
  startSession('latihan', pickIds(pool, filter.count), { replace: true });
}

function startSimulation({ categories, count }) {
  const pool = buildPool(bank.questions, { categories, preferNew: false });
  if (pool.length < count) {
    showToast(`Hanya ada ${pool.length} soal di kategori ini. Semuanya dipakai.`);
  }
  startSession('simulasi', pickIds(pool, count), { replace: true });
}

function startRetry() {
  const { needsReview } = latestStats(store.getState().attempts, bank.byId);
  startSession('ulangi', pickQuick(needsReview, bank.byId), { replace: false });
}

function startBookmarks() {
  startSession('ditandai', pickQuick(store.getState().bookmarks, bank.byId), { replace: false });
}

// Dari layar hasil: latihan ulang soal sesi itu yang skornya di bawah 4
function startRetryFromResult(result) {
  const ids = result.items.filter((item) => item.skor < MAX_SCORE && bank.byId.has(item.id)).map((item) => item.id);
  startSession('latihan', shuffle(ids), { replace: true });
}

function showResultOf(result) {
  if (result) navigate(`#/hasil/${result.id}`, { replace: true });
  else navigate('#/', { replace: true });
}

// ---------- Layar soal ----------

function currentQuestion(active) {
  return bank.byId.get(active.ids[active.index]);
}

function sessionView(active) {
  const question = currentQuestion(active);
  return views.renderSession({
    session: active,
    question,
    bookmarked: store.getState().bookmarks.includes(question.id),
    remaining: remainingSeconds(active.deadline),
    handlers: {
      onAnswer: (kode) => (active.mode === 'simulasi' ? selectOption(kode) : answerPractice(kode)),
      onNext: goNext,
      onPrev: () => goTo(active.index - 1),
      onToggleBookmark: toggleBookmark,
      onOpenGrid: openQuestionGrid,
      onFinish: confirmFinishSimulation,
    },
  });
}

// Menggambar ulang layar soal tanpa pindah soal: posisi gulir dipertahankan dan fokus
// dikembalikan ke elemen yang sama (misalnya opsi yang baru diketuk), supaya tidak membingungkan.
function refreshSession(focusKey) {
  const active = store.getState().active;
  if (!active) return;
  const scrollY = window.scrollY;
  app.replaceChildren(sessionView(active));
  window.scrollTo(0, scrollY);
  const target = focusKey && app.querySelector(`[data-focus="${focusKey}"]`);
  if (target) target.focus({ preventScroll: true });
}

// Mode latihan: jawaban langsung terkunci, dinilai, dan dicatat ke riwayat soal
function answerPractice(kode) {
  const active = store.getState().active;
  const question = currentQuestion(active);
  if (active.revealed[question.id]) return;
  const skor = scoreOf(question, kode);
  active.answers[question.id] = kode;
  active.revealed[question.id] = true;
  store.setActive(active);
  store.recordAttempt(question.id, kode, skor, active.mode);
  announce(`Skor Anda ${skor} dari ${MAX_SCORE}`);
  refreshSession('next');
}

// Mode simulasi: jawaban boleh diganti, belum dinilai
function selectOption(kode) {
  const active = store.getState().active;
  const question = currentQuestion(active);
  active.answers[question.id] = kode;
  store.setActive(active);
  refreshSession(`option-${kode}`);
}

function goTo(index) {
  const active = store.getState().active;
  if (!active || index < 0 || index >= active.ids.length) return;
  active.index = index;
  store.setActive(active);
  showView(sessionView(active));
}

function goNext() {
  const active = store.getState().active;
  if (active.index < active.ids.length - 1) {
    goTo(active.index + 1);
  } else {
    showResultOf(finishActive({ keepEmpty: true }));
  }
}

function toggleBookmark() {
  const active = store.getState().active;
  const marked = store.toggleBookmark(currentQuestion(active).id);
  showToast(marked ? 'Soal ditandai' : 'Tanda soal dihapus');
  refreshSession('bookmark');
}

function openQuestionGrid() {
  const active = store.getState().active;
  showDialog({
    title: 'Daftar soal',
    content: views.renderQuestionGrid({
      session: active,
      onJump: (index) => {
        closeDialog();
        goTo(index);
      },
    }),
  });
}

async function confirmFinishSimulation() {
  const active = store.getState().active;
  const empty = active.ids.length - answeredCount(active);
  const ok = await confirmDialog({
    title: 'Selesaikan simulasi?',
    message: empty > 0
      ? `Masih ada ${empty} soal yang belum dijawab. Soal yang kosong bernilai 0.`
      : 'Semua soal sudah dijawab.',
    confirmText: 'Selesai',
  });
  // Sesi bisa saja sudah selesai sendiri karena waktu habis saat dialog terbuka
  if (!ok || !store.getState().active) return;
  showResultOf(finishActive({ keepEmpty: true }));
}

// ---------- Pengatur waktu simulasi ----------
// Sisa waktu selalu dihitung dari deadline, bukan dari hitungan mundur, jadi tetap benar
// walau aplikasi sempat ditutup atau HP terkunci.

function stopTimer() {
  if (timerId !== null) clearInterval(timerId);
  timerId = null;
}

function startTimer() {
  stopTimer();
  const active = store.getState().active;
  if (!active || !active.deadline) return;
  if (warned.sessionId !== active.id) warned = { sessionId: active.id, levels: new Set() };
  tick();
  timerId = setInterval(tick, 1000);
}

function tick() {
  const active = store.getState().active;
  if (!active || !active.deadline) {
    stopTimer();
    return;
  }
  const left = remainingSeconds(active.deadline);
  const timer = app.querySelector('[data-timer]');
  if (timer) {
    timer.textContent = formatDuration(left);
    timer.classList.toggle('is-warning', left < 60);
  }
  // Satu pengumuman per batas yang terlewati. Yang dibacakan sisa waktu sebenarnya, karena sesi
  // bisa saja dilanjutkan saat waktunya sudah di bawah 5 menit.
  const due = TIME_WARNINGS.filter((level) => left <= level && !warned.levels.has(level));
  if (due.length > 0 && left > 0) {
    due.forEach((level) => warned.levels.add(level));
    announce(`Sisa waktu ${Math.ceil(left / 60)} menit`);
  }
  if (left <= 0) timeUp();
}

// Waktu habis: tutup dialog yang terbuka, nilai semua jawaban, lalu tampilkan hasil
function timeUp() {
  stopTimer();
  closeDialog();
  const result = finishActive({ keepEmpty: true });
  showToast('Waktu habis. Simulasi selesai dan jawaban sudah dinilai.', 5000);
  showResultOf(result);
}

// Simulasi yang batas waktunya lewat saat aplikasi ditutup atau saat berada di layar lain
function handleExpiredSimulation() {
  const active = store.getState().active;
  if (active && active.deadline && Date.now() >= active.deadline) {
    timeUp();
    return true;
  }
  return false;
}

// ---------- Beranda, Pengaturan, dan aksi data ----------

async function endActiveFromHome() {
  const active = store.getState().active;
  const ok = await confirmDialog({
    title: 'Akhiri sesi?',
    message: active.mode === 'simulasi'
      ? 'Jawaban yang sudah dipilih akan dinilai. Soal yang kosong bernilai 0.'
      : 'Soal yang sudah dijawab tetap tersimpan di progres.',
    confirmText: 'Akhiri',
  });
  if (!ok || !store.getState().active) return;
  const result = finishActive({ keepEmpty: false });
  if (result) {
    navigate(`#/hasil/${result.id}`);
  } else {
    showToast('Sesi diakhiri');
    router();
  }
}

function handleSettingsChange(patch) {
  applySettings(store.updateSettings(patch));
  showToast('Pengaturan disimpan');
}

function handleExport() {
  store.exportProgress();
  showToast('Progres diekspor');
}

async function handleImportFile(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    showToast('File tidak bisa dibaca.');
    return;
  }
  const check = store.readProgressFile(text);
  if (!check.ok) {
    showToast(`Impor ditolak. ${check.reason}`, 5000);
    return;
  }
  const ok = await confirmDialog({
    title: 'Ganti progres?',
    message: 'Progres di perangkat ini akan diganti seluruhnya dengan isi file. Lanjutkan?',
    confirmText: 'Ganti',
    danger: true,
  });
  if (!ok) return;
  const result = store.importProgress(text, bank.questions.map((q) => q.id));
  if (!result.ok) {
    showToast(result.reason, 5000);
    return;
  }
  applySettings(store.getState().settings);
  showToast('Progres diimpor');
  router();
}

async function handleReset() {
  const ok = await confirmDialog({
    title: 'Hapus semua progres?',
    message: 'Semua jawaban, tanda bintang, riwayat sesi, dan sesi aktif akan dihapus. Tindakan ini tidak bisa dibatalkan.',
    confirmText: 'Hapus',
    danger: true,
  });
  if (!ok) return;
  store.resetProgress();
  showToast('Semua progres dihapus');
  router();
}

// ---------- Router ----------
// Setiap rute: pola path dan fungsi yang menampilkan layarnya. Bagian dalam kurung pada pola
// (misalnya id sesi) diteruskan sebagai argumen.

function showHome() {
  const state = store.getState();
  showView(views.renderHome({
    version: APP_VERSION,
    bank,
    stats: latestStats(state.attempts, bank.byId),
    active: state.active,
    bookmarkCount: state.bookmarks.filter((id) => bank.byId.has(id)).length,
    handlers: {
      onResume: () => navigate('#/sesi'),
      onEndActive: endActiveFromHome,
      onStartRetry: startRetry,
      onStartBookmarks: startBookmarks,
    },
  }));
}

function showSessionScreen() {
  const active = store.getState().active;
  // Tanpa sesi aktif (atau soalnya tidak ada lagi di bank soal), kembali ke Beranda
  if (!active || !active.ids.every((id) => bank.byId.has(id))) {
    if (active) store.clearActive();
    navigate('#/', { replace: true });
    return;
  }
  showView(sessionView(active));
  startTimer();
}

function showResult(id) {
  const result = store.getState().sessions.find((s) => s.id === id);
  showView(views.renderResult({ result, bank, onRetryWeak: () => startRetryFromResult(result) }));
}

const routes = [
  { pattern: /^\/$/, show: showHome },
  {
    pattern: /^\/mulai\/latihan$/,
    show: () => showView(views.renderPracticeSetup({ bank, attempts: store.getState().attempts, onStart: startPractice })),
  },
  {
    pattern: /^\/mulai\/simulasi$/,
    show: () => showView(views.renderSimulationSetup({ bank, onStart: startSimulation })),
  },
  { pattern: /^\/sesi$/, show: showSessionScreen },
  { pattern: /^\/hasil\/([\w-]+)$/, show: showResult },
  {
    pattern: /^\/statistik$/,
    show: () => {
      const state = store.getState();
      showView(views.renderStats({ bank, stats: latestStats(state.attempts, bank.byId), sessions: state.sessions }));
    },
  },
  {
    pattern: /^\/pengaturan$/,
    show: () => showView(views.renderSettings({
      settings: store.getState().settings,
      version: APP_VERSION,
      bank,
      handlers: {
        onChange: handleSettingsChange,
        onExport: handleExport,
        onImportFile: handleImportFile,
        onReset: handleReset,
      },
    })),
  },
];

function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

function router() {
  stopTimer();
  if (handleExpiredSimulation()) return;
  const path = currentPath();
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      route.show(...match.slice(1));
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
  // Saat aplikasi dibuka kembali: hitung ulang sisa waktu simulasi, atau selesaikan bila sudah habis
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!handleExpiredSimulation() && timerId !== null) tick();
  });
  router();
}

init();
