// Penyimpanan progres di perangkat (localStorage), ekspor/impor file, dan permintaan penyimpanan persisten.
// Semua data ada di satu kunci (STORAGE_KEY) berbentuk satu objek JSON, lihat PLAYBOOK §1.6.
import { APP_VERSION, ATTEMPTS_PER_QUESTION, SESSION_HISTORY_LIMIT, STORAGE_KEY } from './config.js';
import { emptyProgress, normalizeProgress, validateProgress } from './quiz.js';

const BROKEN_KEY = `${STORAGE_KEY}.rusak`;

let state = emptyProgress();

// Membaca progres dari localStorage. Mengembalikan { recovered: true } bila data lama rusak:
// teks aslinya disalin ke kunci .rusak agar tidak hilang, lalu aplikasi mulai dengan data kosong.
// Bagian yang hilang (misalnya data dari Fase 1 yang hanya berisi settings) cukup diisi nilai bawaan.
export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage diblokir browser: aplikasi tetap jalan, hanya tidak bisa menyimpan
    state = emptyProgress();
    return { recovered: false };
  }
  if (raw === null) {
    state = emptyProgress();
    return { recovered: false };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bukan objek');
    state = normalizeProgress(parsed);
    return { recovered: false };
  } catch {
    try {
      localStorage.setItem(BROKEN_KEY, raw);
    } catch {
      // Ruang penuh: salinan gagal dibuat, tetapi aplikasi tetap harus bisa dibuka
    }
    state = emptyProgress();
    save();
    return { recovered: true };
  }
}

// Menulis seluruh progres. Mengembalikan false bila gagal (misalnya ruang penyimpanan penuh).
export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Objek progres saat ini. Anggap hanya-baca: ubah lewat fungsi di file ini supaya selalu tersimpan.
export function getState() {
  return state;
}

// Mencatat satu jawaban. Hanya ATTEMPTS_PER_QUESTION jawaban terakhir per soal yang disimpan.
export function recordAttempt(id, kode, skor, mode, t = Date.now()) {
  const list = state.attempts[id] || [];
  list.push({ t, kode, skor, mode });
  state.attempts[id] = list.slice(-ATTEMPTS_PER_QUESTION);
  return save();
}

// Menandai atau membatalkan tanda bintang. Mengembalikan status baru (true = ditandai).
export function toggleBookmark(id) {
  const marked = state.bookmarks.includes(id);
  state.bookmarks = marked ? state.bookmarks.filter((b) => b !== id) : [...state.bookmarks, id];
  save();
  return !marked;
}

// Menyimpan sesi yang sedang dikerjakan. Dipanggil lagi setiap kali sesi berubah
// (menjawab, pindah soal), supaya sesi bisa dilanjutkan setelah aplikasi ditutup.
export function setActive(session) {
  state.active = session;
  return save();
}

export function clearActive() {
  state.active = null;
  return save();
}

// Menambah hasil sesi yang selesai ke riwayat. Hanya SESSION_HISTORY_LIMIT sesi terakhir yang disimpan.
export function addSession(result) {
  state.sessions = [...state.sessions, result].slice(-SESSION_HISTORY_LIMIT);
  return save();
}

// Mengubah sebagian pengaturan, lalu mengembalikan pengaturan lengkap yang sudah dirapikan.
export function updateSettings(patch) {
  state.settings = normalizeProgress({ settings: { ...state.settings, ...patch } }).settings;
  save();
  return state.settings;
}

// Nama file ekspor memakai tanggal lokal: sjt-progres-YYYYMMDD.json
export function exportFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `sjt-progres-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`;
}

// Mengunduh seluruh progres sebagai file JSON lewat tautan sementara.
export function exportProgress() {
  const data = { ...state, exportedAt: new Date().toISOString(), appVersion: APP_VERSION };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName();
  document.body.append(link);
  link.click();
  link.remove();
  // Diberi jeda supaya unduhan sempat dimulai sebelum alamat sementaranya dilepas
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Membaca dan memeriksa isi file impor tanpa mengubah progres.
// Dipakai sebelum dialog konfirmasi, supaya file yang salah langsung ditolak.
export function readProgressFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'File bukan JSON yang valid.' };
  }
  const check = validateProgress(parsed);
  return check.ok ? { ok: true, data: parsed } : check;
}

// Mengganti seluruh progres dengan isi file (bukan menggabungkan).
// knownIds = daftar id di bank soal; id lain diabaikan.
export function importProgress(text, knownIds = null) {
  const result = readProgressFile(text);
  if (!result.ok) return result;
  state = normalizeProgress(result.data, knownIds ? new Set(knownIds) : null);
  return save() ? { ok: true } : { ok: false, reason: 'Progres gagal disimpan di perangkat ini.' };
}

// Menghapus jawaban, tanda bintang, riwayat, dan sesi aktif. Pengaturan tampilan dipertahankan.
export function resetProgress() {
  state = { ...emptyProgress(), settings: state.settings };
  return save();
}

// Meminta Chrome agar tidak menghapus progres saat memori HP hampir penuh.
// Biasanya baru dikabulkan setelah aplikasi dipasang, jadi diulang setiap kali aplikasi dibuka.
// Mengembalikan true bila penyimpanan sudah persisten.
export async function requestPersist() {
  if (!navigator.storage || !navigator.storage.persisted) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return navigator.storage.persist ? await navigator.storage.persist() : false;
  } catch {
    return false;
  }
}
