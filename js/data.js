// Memuat bank soal JSON dan menyiapkan indeks supaya pencarian soal cepat.
import { DATA_URL } from './config.js';
import { competencyKey } from './quiz.js';

export async function loadBank(url = DATA_URL) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Bank soal tidak bisa diambil (HTTP ${response.status})`);
  return indexBank(await response.json());
}

// Mengubah isi JSON mentah menjadi bentuk yang dipakai aplikasi:
// - byId: Map id → soal, untuk mengambil soal dari id yang tersimpan di progres
// - categories: urutan dan nama kategori sesuai JSON, dengan jumlah soal sebenarnya
// - competenciesByCategory: { KMK: [{ key, kategori, kompetensi, count }], ... } untuk filter latihan
export function indexBank(raw) {
  const questions = raw.soal;
  const byId = new Map(questions.map((q) => [q.id, q]));

  const competenciesByCategory = {};
  const competencyIndex = new Map();
  for (const q of questions) {
    const key = competencyKey(q.kategori, q.kompetensi);
    if (!competencyIndex.has(key)) {
      const entry = { key, kategori: q.kategori, kompetensi: q.kompetensi, count: 0 };
      competencyIndex.set(key, entry);
      (competenciesByCategory[q.kategori] ||= []).push(entry);
    }
    competencyIndex.get(key).count += 1;
  }

  const categories = raw.kategori.map((k) => ({
    kode: k.kode,
    nama: k.nama,
    count: questions.filter((q) => q.kategori === k.kode).length,
  }));

  return {
    meta: { judul: raw.judul, versi: raw.versi, tanggal: raw.tanggal, jumlah: questions.length },
    questions,
    byId,
    categories,
    competenciesByCategory,
  };
}
