// Pengujian fungsi murni di js/quiz.js. Bisa dijalankan dua cara:
// - browser: buka dev/selftest.html lewat tools/serve.py
// - terminal: node dev/selftest.mjs
// Semua pengacakan memakai rng berbibit tetap, jadi hasilnya sama setiap kali dijalankan.
import {
  OPTION_CODES,
  buildPool,
  competencyKey,
  createSession,
  latestStats,
  normalizeProgress,
  percent,
  pickIds,
  pickQuick,
  scoreOf,
  shuffle,
  summarize,
  validateProgress,
} from '../js/quiz.js';
import { ATTEMPTS_PER_QUESTION, SESSION_HISTORY_LIMIT } from '../js/config.js';

// ---------- Alat uji kecil ----------

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message = 'kondisi tidak terpenuhi') {
  if (!condition) throw new Error(message);
}

// Dibandingkan sebagai teks JSON, cukup untuk angka, teks, array, dan objek sederhana
function assertEqual(actual, expected, label = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label ? label + ': ' : ''}diharapkan ${e}, didapat ${a}`);
}

// Pembangkit angka acak berbibit (mulberry32): bibit sama, urutan angka sama
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sorted = (array) => [...array].sort();

// ---------- Data contoh ----------
// Sengaja ada kompetensi bernama sama di dua kategori (Integritas di KMK dan MNJ).

function makeQuestion(id, kategori, kompetensi, scores) {
  return {
    id,
    kategori,
    kategori_nama: `Kategori ${kategori}`,
    kompetensi,
    indikator: '-',
    skenario: '-',
    opsi: OPTION_CODES.map((kode, i) => ({ kode, teks: `Opsi ${kode}`, skor: scores[i] })),
    jawaban_terbaik: OPTION_CODES[scores.indexOf(4)],
    pembahasan: '-',
  };
}

const QUESTIONS = [
  makeQuestion('KMK-001', 'KMK', 'Integritas', [2, 4, 1, 3]),
  makeQuestion('KMK-002', 'KMK', 'Integritas', [4, 3, 2, 1]),
  makeQuestion('KMK-003', 'KMK', 'Sinergi', [1, 2, 3, 4]),
  makeQuestion('KMK-004', 'KMK', 'Integritas', [1, 4, 2, 3]),
  makeQuestion('MNJ-001', 'MNJ', 'Integritas', [3, 1, 4, 2]),
  makeQuestion('MNJ-002', 'MNJ', 'Komunikasi', [4, 2, 1, 3]),
  makeQuestion('AKH-001', 'AKH', 'Adaptif', [2, 3, 4, 1]),
];
const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const ALL_IDS = QUESTIONS.map((q) => q.id);

const attempt = (kode, skor, t = 1) => ({ t, kode, skor, mode: 'latihan' });

// ---------- shuffle ----------

test('shuffle tidak menghilangkan atau menggandakan elemen', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const output = shuffle(input, seededRng(7));
  assertEqual(output.length, input.length, 'panjang');
  assertEqual([...output].sort((a, b) => a - b), input, 'isi');
});

test('shuffle tidak mengubah array asli dan hasilnya tetap untuk bibit yang sama', () => {
  const input = Array.from({ length: 20 }, (_, i) => i);
  const copy = [...input];
  const first = shuffle(input, seededRng(42));
  const second = shuffle(input, seededRng(42));
  assertEqual(input, copy, 'array asli');
  assertEqual(first, second, 'bibit sama');
  assert(JSON.stringify(first) !== JSON.stringify(input), 'urutan seharusnya berubah');
});

// ---------- scoreOf dan percent ----------

test('scoreOf mengembalikan bobot setiap opsi', () => {
  const q = BY_ID.get('KMK-001');
  assertEqual(OPTION_CODES.map((kode) => scoreOf(q, kode)), [2, 4, 1, 3]);
});

test('scoreOf bernilai 0 untuk jawaban kosong atau tidak dikenal', () => {
  const q = BY_ID.get('KMK-001');
  assertEqual([scoreOf(q, ''), scoreOf(q, null), scoreOf(q, undefined), scoreOf(q, 'E')], [0, 0, 0, 0]);
});

test('percent dibulatkan ke bilangan bulat dan aman untuk pembagi 0', () => {
  assertEqual(percent(72, 80), 90, '72/80');
  assertEqual(percent(2, 3), 67, '2/3');
  assertEqual(percent(1, 3), 33, '1/3');
  assertEqual(percent(5, 8), 63, '5/8');
  assertEqual(percent(0, 0), 0, '0/0');
});

// ---------- buildPool dan pickIds ----------

test('buildPool: soal baru lebih dulu, lalu skor terakhir terendah', () => {
  const attempts = {
    'KMK-001': [attempt('B', 4)],
    'KMK-002': [attempt('D', 1)],
    'MNJ-001': [attempt('A', 3)],
  };
  const pool = buildPool(QUESTIONS, {}, attempts, seededRng(1));
  assertEqual(sorted(pool.slice(0, 4)), ['AKH-001', 'KMK-003', 'KMK-004', 'MNJ-002'], 'soal baru');
  assertEqual(pool.slice(4), ['KMK-002', 'MNJ-001', 'KMK-001'], 'soal lama');
});

test('buildPool memakai jawaban terakhir, bukan jawaban pertama', () => {
  const attempts = {
    'KMK-001': [attempt('C', 1, 1), attempt('B', 4, 2)],
    'KMK-002': [attempt('B', 3, 3)],
    'KMK-004': [attempt('B', 4, 1), attempt('A', 1, 2)],
  };
  const pool = buildPool(QUESTIONS, { categories: ['KMK'] }, attempts, seededRng(2));
  assertEqual(pool, ['KMK-003', 'KMK-004', 'KMK-002', 'KMK-001']);
});

test('buildPool menyaring kategori', () => {
  const pool = buildPool(QUESTIONS, { categories: ['AKH', 'MNJ'] }, {}, seededRng(3));
  assertEqual(sorted(pool), ['AKH-001', 'MNJ-001', 'MNJ-002']);
});

test('buildPool menyaring kompetensi tanpa tertukar dengan kategori lain', () => {
  const filter = { categories: ['KMK'], competencies: [competencyKey('KMK', 'Integritas')] };
  const pool = buildPool(QUESTIONS, filter, {}, seededRng(4));
  assertEqual(sorted(pool), ['KMK-001', 'KMK-002', 'KMK-004'], 'MNJ-001 tidak boleh ikut');
});

test('buildPool tanpa prioritas soal baru tetap memuat semua soal yang cocok', () => {
  const attempts = { 'KMK-001': [attempt('B', 4)] };
  const pool = buildPool(QUESTIONS, { preferNew: false }, attempts, seededRng(5));
  assertEqual(sorted(pool), sorted(ALL_IDS));
});

test('pickIds mengambil N soal teratas lalu mengacaknya; null berarti semua', () => {
  const pool = ['A1', 'A2', 'A3', 'A4', 'A5'];
  assertEqual(sorted(pickIds(pool, 2, seededRng(6))), ['A1', 'A2'], 'N=2');
  assertEqual(pickIds(pool, 10, seededRng(6)).length, 5, 'N melebihi jumlah');
  assertEqual(sorted(pickIds(pool, null, seededRng(6))), pool, 'semua');
});

test('pickQuick membuang id ganda dan id yang tidak ada, serta mematuhi batas', () => {
  const ids = ['KMK-001', 'KMK-001', 'ZZZ-999', 'KMK-002'];
  assertEqual(sorted(pickQuick(ids, BY_ID, seededRng(8))), ['KMK-001', 'KMK-002'], 'isi');
  assertEqual(pickQuick(ALL_IDS, BY_ID, seededRng(8), 3).length, 3, 'batas');
});

// ---------- createSession ----------

test('createSession: optionOrder berisi A sampai D tanpa duplikat untuk setiap soal', () => {
  const session = createSession({ mode: 'latihan', ids: ALL_IDS, now: 1000, rng: seededRng(9) });
  for (const id of ALL_IDS) {
    const order = session.optionOrder[id];
    assertEqual(sorted(order), OPTION_CODES, id);
  }
  assertEqual(session.id, 's-1000', 'id sesi');
  assertEqual(session.index, 0, 'index');
  assertEqual(session.deadline, null, 'latihan tanpa batas waktu');
});

test('createSession: deadline simulasi = mulai + jumlah soal x 60 detik', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `KMK-${String(i + 1).padStart(3, '0')}`);
  const now = 1_760_000_000_000;
  const session = createSession({ mode: 'simulasi', ids, now, rng: seededRng(10) });
  assertEqual(session.deadline, now + 20 * 60 * 1000);
  assertEqual(session.startedAt, now, 'startedAt');
});

test('createSession tanpa acak opsi memakai urutan asli A, B, C, D', () => {
  const session = createSession({ mode: 'latihan', ids: ['KMK-001', 'KMK-002'], shuffleOptions: false, now: 1 });
  assertEqual(session.optionOrder['KMK-001'], OPTION_CODES);
  assertEqual(session.optionOrder['KMK-002'], OPTION_CODES);
});

// ---------- summarize dan latestStats ----------

test('summarize menghitung total, persen, rata-rata, dan rincian per kategori', () => {
  const items = [
    { id: 'KMK-001', kode: 'B', skor: 4 },
    { id: 'KMK-002', kode: 'B', skor: 3 },
    { id: 'MNJ-001', kode: null, skor: 0 },
  ];
  const s = summarize(items, BY_ID);
  assertEqual([s.total, s.max, s.percent, s.answered, s.average, s.bestRate], [7, 12, 58, 2, 3.5, 50], 'keseluruhan');
  const kmk = s.byCategory.find((c) => c.kode === 'KMK');
  assertEqual([kmk.count, kmk.total, kmk.percent, kmk.average, kmk.bestRate], [2, 7, 88, 3.5, 50], 'KMK');
  const mnj = s.byCategory.find((c) => c.kode === 'MNJ');
  assertEqual([mnj.count, mnj.answered, mnj.average, mnj.bestRate], [1, 0, 0, 0], 'MNJ kosong');
  assertEqual(s.byCompetency.map((c) => c.key), ['KMK|Integritas', 'MNJ|Integritas'], 'kompetensi terpisah');
});

test('latestStats memakai jawaban terakhir dan mengabaikan id yang tidak dikenal', () => {
  const attempts = {
    'KMK-001': [attempt('C', 1, 1), attempt('B', 4, 2)],
    'KMK-002': [attempt('A', 4, 1), attempt('C', 2, 2)],
    'XXX-999': [attempt('A', 4, 1)],
  };
  const stats = latestStats(attempts, BY_ID);
  assertEqual(stats.answeredCount, 2, 'jumlah dijawab');
  assertEqual(stats.average, 3, 'rata-rata');
  assertEqual(stats.percent, 75, 'persen');
});

test('latestStats: daftar perlu diulang = jawaban terakhir di bawah 4', () => {
  const attempts = {
    'KMK-001': [attempt('C', 1, 1), attempt('B', 4, 2)],
    'KMK-002': [attempt('A', 4, 1), attempt('C', 2, 2)],
    'MNJ-001': [attempt('A', 3, 1)],
  };
  assertEqual(sorted(latestStats(attempts, BY_ID).needsReview), ['KMK-002', 'MNJ-001']);
});

test('latestStats: kompetensi terlemah hanya yang sudah dijawab minimal 3 soal', () => {
  const attempts = {
    'KMK-001': [attempt('A', 2)],
    'KMK-002': [attempt('D', 1)],
    'KMK-004': [attempt('D', 3)],
    'MNJ-001': [attempt('B', 1)],
    'MNJ-002': [attempt('C', 1)],
  };
  const { weakest } = latestStats(attempts, BY_ID);
  assertEqual(weakest.map((c) => [c.key, c.average]), [['KMK|Integritas', 2]]);
});

// ---------- validateProgress dan normalizeProgress ----------

test('validateProgress menolak data buruk', () => {
  const bad = [
    'teks biasa',
    null,
    [],
    { schema: 2, attempts: {} },
    { schema: 1 },
    { schema: 1, attempts: [] },
  ];
  for (const sample of bad) {
    const result = validateProgress(sample);
    assert(result.ok === false, `seharusnya ditolak: ${JSON.stringify(sample)}`);
    assert(typeof result.reason === 'string' && result.reason.length > 0, 'alasan penolakan wajib ada');
  }
});

test('validateProgress menerima data yang baik', () => {
  const good = {
    schema: 1,
    settings: { theme: 'dark', textSize: 'normal', shuffleOptions: true },
    attempts: { 'KMK-001': [attempt('B', 4)] },
    bookmarks: ['KMK-002'],
    sessions: [],
    active: null,
  };
  assertEqual(validateProgress(good), { ok: true });
});

test('normalizeProgress membuang id asing, isian rusak, dan memotong riwayat', () => {
  const known = new Set(ALL_IDS);
  const raw = {
    schema: 1,
    settings: { theme: 'ungu', textSize: 'large' },
    attempts: {
      'KMK-001': Array.from({ length: 7 }, (_, i) => attempt('B', 4, i)),
      'KMK-002': [attempt('B', 9)],
      'ZZZ-001': [attempt('A', 4)],
    },
    bookmarks: ['KMK-001', 'ZZZ-001', 'KMK-001'],
    sessions: Array.from({ length: 35 }, (_, i) => ({ id: `s-${i}`, items: [] })),
    active: { id: 's-x', mode: 'latihan', ids: ['ZZZ-001'] },
  };
  const p = normalizeProgress(raw, known);
  assertEqual(Object.keys(p.attempts), ['KMK-001'], 'attempts');
  assertEqual(p.attempts['KMK-001'].length, ATTEMPTS_PER_QUESTION, 'batas jawaban per soal');
  assertEqual(p.attempts['KMK-001'][0].t, 2, 'yang disimpan jawaban terakhir');
  assertEqual(p.bookmarks, ['KMK-001'], 'bookmarks');
  assertEqual(p.sessions.length, SESSION_HISTORY_LIMIT, 'batas riwayat sesi');
  assertEqual(p.sessions[0].id, 's-5', 'riwayat yang disimpan yang terbaru');
  assertEqual(p.settings, { theme: 'system', textSize: 'large', shuffleOptions: true }, 'settings');
  assertEqual(p.active, null, 'sesi aktif berisi soal asing dibuang');
});

// ---------- Menjalankan ----------

export function runTests() {
  return tests.map(({ name, fn }) => {
    try {
      fn();
      return { name, ok: true };
    } catch (error) {
      return { name, ok: false, message: error.message };
    }
  });
}

// Bila dijalankan lewat Node (tidak ada window), cetak hasil ke terminal
if (typeof window === 'undefined') {
  const results = runTests();
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      ${r.message}`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} lolos, ${failed} gagal`);
  if (failed > 0) process.exitCode = 1;
}
