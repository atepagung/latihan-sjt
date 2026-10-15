# Progres pembangunan

Diperbarui oleh Claude Code di setiap akhir fase. Sesi baru membaca file ini lebih dulu.

| Fase | Status | Tanggal | Catatan |
|---|---|---|---|
| 0 Persiapan | selesai | 2026-10-15 | validate lolos (151 soal), repo git lokal `main` dibuat |
| 1 Kerangka, tema, manifest | selesai | 2026-10-15 | semua rute bisa dibuka, tema dan ukuran teks tersimpan, manifest valid |
| 2 Data, skor, penyimpanan, selftest | selesai | 2026-10-15 | selftest 22/22 PASS (browser dan Node), Beranda 151 soal (KMK 36, AKH 50, MNJ 56, SK 9) |
| 3 Layar dan alur lengkap | belum | | |
| 4 Mode offline dan pembaruan | belum | | |
| 5 Uji lokal lengkap | belum | | |
| 6 Publikasi GitHub Pages | belum | | |
| 7 Pasang di HP | belum | | Dikerjakan pengguna |

## Info lingkungan

- Sistem operasi: Windows 11 Pro (10.0.26200), shell PowerShell dan Git Bash
- Python: 3.14.2. Pakai `py`. Sejak Fase 1, `python` di Git Bash kadang mengarah ke pintasan
  Microsoft Store (WindowsApps) dan gagal
- Git: 2.55.0.windows.3, identitas global sudah terisi
- Node: v24.21.0 (opsional, bisa untuk `node dev/selftest.mjs`)
- Folder proyek: `C:\dev\latihan-sjt` (bukan folder OneDrive)

## Alamat aplikasi

- Lokal: http://localhost:8080
- GitHub Pages: (diisi di Fase 6)

## Catatan dan keputusan

<!-- Tambahkan catatan singkat: keputusan desain, masalah yang ditemukan, hal yang perlu diingat -->

- Fase 0: validate menampilkan 3 peringatan normal (manifest, sw.js, config.js belum ada).
  `PROGRESS.md` diisi sebelum commit awal supaya status Fase 0 ikut tercatat di commit yang sama.
- Fase 1:
  - `js/views.js` sudah dibuat sekarang (render layar), jadi `app.js` cukup berisi router dan pengaturan.
  - Pengaturan sementara dibaca dan ditulis di `app.js` (`readSettings`, `saveSettings`, `applySettings`).
    Di Fase 2 baca/tulisnya dipindah ke `store.js`; `applySettings` boleh tetap di `app.js`.
  - Saat tema dipaksa Terang/Gelap, kedua `meta theme-color` disamakan supaya warna bilah status HP ikut tema.
  - Pengaturan yang berhasil disimpan ditandai toast "Pengaturan disimpan".
  - Rute tidak dikenal dialihkan ke `#/` dengan `location.replace`.
  - Beranda sementara berisi tautan ke semua layar, termasuk contoh `#/sesi` dan `#/hasil/contoh`.
  - `.claude/launch.json` berisi konfigurasi server `serve` (`py tools/serve.py 8080`) untuk browser bawaan
    Claude Code.
- Fase 2:
  - Nama kompetensi bisa sama di dua kategori (Integritas di KMK dan MNJ). Kompetensi selalu dikenali dari
    `competencyKey(kategori, kompetensi)` = `"KMK|Integritas"`, baik di filter maupun ringkasan.
  - Fungsi tambahan di `quiz.js`:
    - `percent`, `competencyKey`
    - `pickIds(pool, count, rng)`: ambil N teratas lalu acak
    - `pickQuick(ids, byId, rng, limit)`: untuk Ulangi/Ditandai
    - `emptyProgress`, `normalizeProgress(obj, knownIds)`: merapikan data dari localStorage atau impor
  - `buildPool` menerima parameter ke-4 `rng`.
  - Konstanta baru di `config.js`: `QUICK_SESSION_LIMIT = 30` dan `DEFAULT_SETTINGS`.
  - `store.load()` hanya menganggap data rusak bila JSON gagal dibaca atau bukan objek. Data Fase 1 yang
    hanya berisi settings tetap terbaca. `load()` mengembalikan `{ recovered }`, lalu `app.js` yang
    menampilkan toast.
  - Impor dibagi dua: `readProgressFile(text)` untuk memeriksa (dipakai sebelum dialog konfirmasi), lalu
    `importProgress(text, knownIds)` untuk mengganti seluruh isi, termasuk settings dari file.
  - `resetProgress()` mempertahankan pengaturan tampilan.
  - `requestPersist()` sudah ada, tetapi baru dipanggil di Fase 4.
  - Urutan `sessions` dan riwayat `attempts` per soal: terlama di depan, terbaru di belakang.
- Langkah berikutnya: Fase 3 (layar dan alur lengkap).
