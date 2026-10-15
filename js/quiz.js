// Logika latihan: acak, pilih soal, hitung skor, ringkasan, dan pemeriksaan data progres.
// File ini sengaja tanpa DOM dan tanpa localStorage, supaya bisa diuji di dev/selftest
// (di browser maupun lewat Node). Semua yang acak menerima parameter rng agar hasil uji tetap.
import {
  ATTEMPTS_PER_QUESTION,
  DEFAULT_SETTINGS,
  QUICK_SESSION_LIMIT,
  SECONDS_PER_QUESTION,
  SESSION_HISTORY_LIMIT,
} from './config.js';

export const OPTION_CODES = ['A', 'B', 'C', 'D'];
export const MAX_SCORE = 4;
export const MODES = ['latihan', 'simulasi', 'ulangi', 'ditandai'];

const THEMES = ['system', 'light', 'dark'];
const TEXT_SIZES = ['normal', 'large'];

// ---------- Helper umum ----------

// Fisher-Yates: setiap urutan punya peluang yang sama. Array asli tidak diubah.
export function shuffle(array, rng = Math.random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Persen dibulatkan ke bilangan bulat; 0 bila pembaginya 0 supaya tidak muncul NaN.
export function percent(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

// Dua angka desimal, untuk rata-rata skor skala 1 sampai 4
function round2(value) {
  return Math.round(value * 100) / 100;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Nama kompetensi bisa sama di dua kategori (misalnya Integritas di KMK dan MNJ),
// jadi kompetensi selalu dikenali dari pasangan kategori dan nama.
export function competencyKey(kategori, kompetensi) {
  return `${kategori}|${kompetensi}`;
}

// Jawaban terakhir satu soal. Riwayat disimpan urut dari yang terlama.
function lastAttempt(attempts, id) {
  const list = attempts && attempts[id];
  return Array.isArray(list) && list.length > 0 ? list[list.length - 1] : null;
}

// ---------- Memilih soal ----------

// Daftar id sesuai filter. filter = { categories: [], competencies: [], preferNew: true }.
// Daftar kosong berarti semua. Bila preferNew aktif: soal yang belum pernah dijawab (diacak) lebih dulu,
// lalu soal yang sudah dijawab, skor terakhir terendah lebih dulu.
export function buildPool(questions, filter = {}, attempts = {}, rng = Math.random) {
  const categories = filter.categories || [];
  const competencies = filter.competencies || [];
  const preferNew = filter.preferNew !== false;

  const matches = questions.filter((q) =>
    (categories.length === 0 || categories.includes(q.kategori))
    && (competencies.length === 0 || competencies.includes(competencyKey(q.kategori, q.kompetensi))),
  );
  if (!preferNew) return shuffle(matches.map((q) => q.id), rng);

  const fresh = [];
  const answered = [];
  for (const q of matches) {
    const last = lastAttempt(attempts, q.id);
    if (last) answered.push({ id: q.id, skor: last.skor });
    else fresh.push(q.id);
  }
  // Diacak dulu lalu diurutkan, supaya soal dengan skor sama tidak selalu muncul dalam urutan yang sama
  const byScore = shuffle(answered, rng).sort((a, b) => a.skor - b.skor).map((a) => a.id);
  return [...shuffle(fresh, rng), ...byScore];
}

// Ambil sejumlah count dari depan daftar prioritas, lalu acak urutan tampilnya.
// count bukan angka (misalnya null untuk "Semua") berarti ambil semuanya.
export function pickIds(pool, count, rng = Math.random) {
  const n = Number.isFinite(count) ? count : pool.length;
  return shuffle(pool.slice(0, n), rng);
}

// Kumpulan soal untuk mode Ulangi dan Ditandai: id yang masih ada di bank soal, diacak, dibatasi.
export function pickQuick(ids, questionsById, rng = Math.random, limit = QUICK_SESSION_LIMIT) {
  const known = [...new Set(ids)].filter((id) => questionsById.has(id));
  return shuffle(known, rng).slice(0, limit);
}

// ---------- Sesi ----------

// Objek sesi aktif sesuai bentuk di PLAYBOOK §1.6.
// optionOrder menyimpan urutan tampil opsi per soal, supaya tetap sama saat sesi dilanjutkan.
export function createSession({ mode, ids, shuffleOptions = true, now = Date.now(), rng = Math.random }) {
  const optionOrder = {};
  for (const id of ids) {
    optionOrder[id] = shuffleOptions ? shuffle(OPTION_CODES, rng) : [...OPTION_CODES];
  }
  return {
    id: `s-${now}`,
    mode,
    startedAt: now,
    // Batas waktu disimpan sebagai jam selesai, jadi waktu tetap berjalan walau aplikasi ditutup
    deadline: mode === 'simulasi' ? now + ids.length * SECONDS_PER_QUESTION * 1000 : null,
    ids: [...ids],
    optionOrder,
    answers: {},
    revealed: {},
    index: 0,
  };
}

// ---------- Skor dan ringkasan ----------

// Bobot opsi yang dipilih, atau 0 bila belum dijawab (soal simulasi yang kosong).
export function scoreOf(question, kode) {
  if (!kode || !question) return 0;
  const option = question.opsi.find((o) => o.kode === kode);
  return option ? option.skor : 0;
}

function emptyGroup(extra) {
  return { ...extra, count: 0, answered: 0, total: 0, best: 0 };
}

function addToGroup(group, item) {
  group.count += 1;
  group.total += item.skor;
  if (item.skor > 0) group.answered += 1;
  if (item.skor === MAX_SCORE) group.best += 1;
}

// Angka turunan satu kelompok, mengikuti aturan skor PLAYBOOK §1.4:
// rata-rata hanya dari soal yang dijawab, persentase terbaik = skor 4 ÷ soal yang dijawab.
function finishGroup(group) {
  return {
    ...group,
    max: group.count * MAX_SCORE,
    percent: percent(group.total, group.count * MAX_SCORE),
    average: group.answered > 0 ? round2(group.total / group.answered) : 0,
    bestRate: percent(group.best, group.answered),
  };
}

// Ringkasan sekumpulan jawaban [{ id, kode, skor }]: total, maksimal, persen,
// serta rincian per kategori dan per kompetensi. Id yang tidak ada di bank soal dilewati.
export function summarize(items, questionsById) {
  const overall = emptyGroup({});
  const categories = new Map();
  const competencies = new Map();

  for (const item of items) {
    const q = questionsById.get(item.id);
    if (!q) continue;
    const key = competencyKey(q.kategori, q.kompetensi);
    if (!categories.has(q.kategori)) {
      categories.set(q.kategori, emptyGroup({ kode: q.kategori, nama: q.kategori_nama || q.kategori }));
    }
    if (!competencies.has(key)) {
      competencies.set(key, emptyGroup({ key, kategori: q.kategori, kompetensi: q.kompetensi }));
    }
    addToGroup(overall, item);
    addToGroup(categories.get(q.kategori), item);
    addToGroup(competencies.get(key), item);
  }

  return {
    ...finishGroup(overall),
    byCategory: [...categories.values()].map(finishGroup),
    byCompetency: [...competencies.values()].map(finishGroup),
  };
}

// Statistik dari jawaban terakhir setiap soal (untuk Beranda dan layar Statistik).
// needsReview = soal yang jawaban terakhirnya di bawah 4.
// weakest = tiga kompetensi dengan rata-rata terendah, hanya yang sudah dijawab minimal 3 soal.
export function latestStats(attempts, questionsById) {
  const items = [];
  for (const id of Object.keys(attempts || {})) {
    const last = lastAttempt(attempts, id);
    if (last && questionsById.has(id)) items.push({ id, kode: last.kode, skor: last.skor });
  }
  const summary = summarize(items, questionsById);
  const weakest = summary.byCompetency
    .filter((c) => c.answered >= 3)
    .sort((a, b) => a.average - b.average)
    .slice(0, 3);
  return {
    answeredCount: items.length,
    percent: summary.percent,
    average: summary.average,
    bestRate: summary.bestRate,
    byCategory: summary.byCategory,
    byCompetency: summary.byCompetency,
    needsReview: items.filter((item) => item.skor < MAX_SCORE).map((item) => item.id),
    weakest,
  };
}

// ---------- Data progres ----------

export function emptyProgress() {
  return { schema: 1, settings: { ...DEFAULT_SETTINGS }, attempts: {}, bookmarks: [], sessions: [], active: null };
}

// Pemeriksaan file impor. Alasan penolakan ditulis untuk dibaca pengguna.
export function validateProgress(obj) {
  if (!isPlainObject(obj)) return { ok: false, reason: 'Isi file bukan data progres Latihan SJT.' };
  if (obj.schema !== 1) return { ok: false, reason: 'Versi data progres tidak dikenali.' };
  if (!isPlainObject(obj.attempts)) return { ok: false, reason: 'Data jawaban di dalam file tidak ditemukan.' };
  return { ok: true };
}

function isValidAttempt(a) {
  return isPlainObject(a) && OPTION_CODES.includes(a.kode) && Number.isInteger(a.skor) && a.skor >= 1 && a.skor <= MAX_SCORE;
}

function normalizeSettings(settings) {
  const s = isPlainObject(settings) ? settings : {};
  return {
    theme: THEMES.includes(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
    textSize: TEXT_SIZES.includes(s.textSize) ? s.textSize : DEFAULT_SETTINGS.textSize,
    shuffleOptions: typeof s.shuffleOptions === 'boolean' ? s.shuffleOptions : DEFAULT_SETTINGS.shuffleOptions,
  };
}

function isValidActive(active, knownIds) {
  return isPlainObject(active)
    && typeof active.id === 'string'
    && MODES.includes(active.mode)
    && Array.isArray(active.ids)
    && active.ids.length > 0
    && (!knownIds || active.ids.every((id) => knownIds.has(id)));
}

// Merapikan data progres dari localStorage atau file impor: bagian yang hilang diisi nilai bawaan,
// isian yang tidak sah dibuang, riwayat dipotong sesuai batas. knownIds (Set, opsional) dipakai
// untuk membuang id soal yang tidak ada di bank soal.
export function normalizeProgress(obj, knownIds = null) {
  const source = isPlainObject(obj) ? obj : {};
  const isKnown = (id) => !knownIds || knownIds.has(id);

  const attempts = {};
  if (isPlainObject(source.attempts)) {
    for (const [id, list] of Object.entries(source.attempts)) {
      if (!isKnown(id) || !Array.isArray(list)) continue;
      const valid = list.filter(isValidAttempt).slice(-ATTEMPTS_PER_QUESTION);
      if (valid.length > 0) attempts[id] = valid;
    }
  }

  const bookmarks = Array.isArray(source.bookmarks)
    ? [...new Set(source.bookmarks.filter((id) => typeof id === 'string' && isKnown(id)))]
    : [];

  const sessions = Array.isArray(source.sessions)
    ? source.sessions
      .filter((s) => isPlainObject(s) && typeof s.id === 'string' && Array.isArray(s.items))
      .slice(-SESSION_HISTORY_LIMIT)
    : [];

  return {
    schema: 1,
    settings: normalizeSettings(source.settings),
    attempts,
    bookmarks,
    sessions,
    active: isValidActive(source.active, knownIds) ? source.active : null,
  };
}
