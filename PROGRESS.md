# Progres pembangunan

Diperbarui oleh Claude Code di setiap akhir fase. Sesi baru membaca file ini lebih dulu.

| Fase | Status | Tanggal | Catatan |
|---|---|---|---|
| 0 Persiapan | selesai | 2026-10-15 | validate lolos (151 soal), repo git lokal `main` dibuat |
| 1 Kerangka, tema, manifest | selesai | 2026-10-15 | semua rute bisa dibuka, tema dan ukuran teks tersimpan, manifest valid |
| 2 Data, skor, penyimpanan, selftest | selesai | 2026-10-15 | selftest 22/22 PASS (browser dan Node), Beranda 151 soal (KMK 36, AKH 50, MNJ 56, SK 9) |
| 3 Layar dan alur lengkap | selesai | 2026-10-15 | semua layar dan alur jalan, Lampiran A Fungsi dan Tampilan diuji di browser bawaan, selftest 26/26 |
| 4 Mode offline dan pembaruan | selesai | 2026-10-15 | `validate.py --http` lolos tanpa peringatan; uji service worker sungguhan menunggu checkpoint di Chrome |
| 5 Uji lokal lengkap | selesai | 2026-10-15 | tinjauan Lampiran A + cek kontras, 5 perbaikan, siap rilis 1.0.0 |
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
- Fase 3:
  - Layar dipecah ke `js/views/` (`common`, `home`, `setup`, `session`, `result`, `stats`, `settings`).
    `js/views.js` hanya meneruskan (re-export). Di Fase 4 semua file ini wajib masuk `APP_SHELL`.
  - Fungsi baru di `quiz.js`: `answeredCount`, `remainingSeconds`, `finishSession`.
  - Fungsi baru di `ui.js`: `showDialog`, `closeDialog`, `announce`.
  - `index.html` mendapat `<div id="announcer" aria-live="polite">` untuk pengumuman skor dan peringatan
    waktu.
  - Keputusan desain:
    - Mulai sesi baru saat ada sesi aktif: muncul dialog, lalu sesi lama diakhiri dan dinilai.
    - Tombol Akhiri di Beranda: muncul dialog, lalu Hasil tampil. Sesi tanpa jawaban sama sekali dibuang
      tanpa hasil.
    - Hasil mode latihan/ulangi/ditandai hanya berisi soal yang dijawab. Simulasi berisi semua soal
      (yang kosong bernilai 0).
    - Tombol Ditandai nonaktif bila 0. "Latihan ulang soal yang belum terbaik" membuat sesi mode `latihan`.
    - Simulasi yang batas waktunya lewat (aplikasi ditutup atau sedang di layar lain) langsung
      diselesaikan saat router berjalan atau saat aplikasi terlihat lagi.
    - Pengumuman waktu dibacakan saat melewati batas 5 dan 1 menit, berisi sisa menit sebenarnya.
    - Di layar soal latihan, bar bawah berisi Beranda dan Lanjut. Di simulasi berisi Sebelumnya dan
      Berikutnya (di soal terakhir: Selesai); Daftar soal dan Selesai ada di bagian atas.
  - `app.js` sekarang sekitar 520 baris. Bila bertambah banyak di fase berikutnya, alur sesi bisa
    dipindah ke file sendiri.
  - Catatan uji: di browser bawaan Claude Code yang tersembunyi, event `close` dialog baru jalan setelah
    frame digambar. Ini bukan bug aplikasi.
- Perbaikan setelah Fase 3: tombol tandai soal diganti menjadi pill berlabel Tandai/Ditandai dengan ikon
  SVG. Warna aktif memakai variabel `--bookmark-*` untuk tema terang dan gelap.
- Fase 4:
  - `sw.js` disalin dari §1.9. `APP_SHELL` berisi 23 entri, termasuk 7 file `js/views/*.js` dan `js/pwa.js`.
    `js/pwa.js` disalin apa adanya.
  - `app.js` punya objek `deviceStatus` `{ offlineReady, online, persisted }`. `updateStatusUI()` hanya
    mengganti `[data-status-chips]` (Beranda) dan `[data-status-info]` (Pengaturan), tidak seluruh layar.
  - `setupPwa` dipanggil setelah layar pertama tampil, juga di layar galat muat soal.
    `store.requestPersist()` dipanggil setiap kali bank soal berhasil dimuat.
  - Chip tidak tampil sebelum service worker siap. "Siap offline" dan "Sedang offline" bisa tampil bersamaan.
  - Browser bawaan Claude Code (panel Electron) tidak bisa mendaftarkan service worker ("unknown error
    when fetching the script"), walau `sw.js` tersaji benar. Uji service worker, offline, dan banner
    pembaruan harus dilakukan di Chrome. Langkah install sudah diuji manual: 23 file berhasil masuk cache.
  - `tools/bump_version.py` (dan skrip Python lain yang memakai `write_text`) menulis akhir baris CRLF
    di Windows. Git menormalkannya ke LF saat commit (`core.autocrlf=input`), jadi aman. Bila git status
    menunjukkan file berubah tanpa isi yang berbeda, jalankan `git add` atau ubah akhir baris kembali ke LF.
  - Mulai sekarang Chrome menyajikan aplikasi dari cache. Saat menguji perubahan di laptop, centang
    DevTools → Application → Service workers → **Update on reload**, atau naikkan versi.
- Fase 5 (tinjauan kode terhadap seluruh Lampiran A dan cek kontras semua pasangan warna):
  1. Ketukan ganda cepat pada Lihat hasil/Selesai bisa memicu error setelah sesi selesai. Semua aksi
     layar soal dan Akhiri kini mengecek `active` dulu.
  2. Pengatur waktu simulasi juga berjalan di Beranda: sisa waktu di kartu "Lanjutkan sesi" hidup
     (`[data-timer]`), dan sesi selesai sendiri bila waktu habis.
  3. Input file impor tanpa atribut `accept`, karena di Android file .json dari Drive/WhatsApp bisa
     tidak bisa dipilih. Isi file tetap divalidasi.
  4. `.container` memakai `env(safe-area-inset-*)` untuk mode edge-to-edge Chrome Android saat aplikasi
     terpasang.
  5. Kontras tema terang: label "Terbaik" (4,42:1) dan skor 2 oranye di kalimat umpan balik (4,48:1).
     Sekarang "Terbaik" berlatar hijau penuh dan skor di umpan balik memakai lencana. Semua pasangan
     lain lolos 4,5:1 di kedua tema. Warna §1.7 tidak diubah.
  - Perbaikan tetap di versi 1.0.0 karena aplikasi belum pernah diterbitkan.
- Langkah berikutnya: Fase 6 (publikasi GitHub Pages). Setelah rilis pertama, setiap perubahan file yang
  di-cache wajib diikuti `py tools/bump_version.py patch` sebelum push.
