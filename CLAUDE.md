# Latihan SJT: aturan proyek untuk Claude Code

Proyek ini membangun aplikasi latihan Situational Judgement Test (SJT) untuk ASN Kementerian Keuangan.
Bentuknya Progressive Web App (PWA) yang berjalan offline di HP Android (Samsung Galaxy S26+, Chrome)
dan di-hosting di GitHub Pages. Aplikasi pribadi, bukan aplikasi resmi.

- Panduan kerja lengkap, spesifikasi, dan urutan fase: `PLAYBOOK.md`
- Catatan posisi terakhir pekerjaan: `PROGRESS.md`

## Tentang pengguna

- Pemilik proyek paham coding dasar (HTML, CSS, JavaScript sederhana). Jelaskan dalam bahasa Indonesia
  yang sederhana. Bila memakai istilah teknis, beri penjelasan satu kalimat.
- Laptop yang dipakai bisa hanya punya RAM 8 GB. Hindari alat berat.
- Sistem operasi kemungkinan Windows. Cek dulu, lalu pakai perintah yang cocok.

## Cara bekerja

1. Kerjakan satu fase `PLAYBOOK.md` per perintah. Jangan lanjut ke fase berikutnya tanpa diminta.
2. Awal fase: baca bagian fase itu dan bagian Spesifikasi yang dirujuknya. Tampilkan rencana singkat
   (3 sampai 8 butir: file yang dibuat atau diubah dan alasannya), lalu tunggu pengguna menjawab "lanjut".
3. Akhir fase: jalankan `python tools/validate.py` (mulai Fase 4 tambahkan `--http`), laporkan hasilnya,
   buat commit git lokal `Fase N: <ringkasan>`, perbarui `PROGRESS.md`, lalu berhenti di checkpoint dan
   sebutkan apa saja yang perlu dicek pengguna di browser.
4. Sesi baru: baca `PROGRESS.md` dulu untuk tahu posisi terakhir.
5. Bila ada keputusan desain yang tidak diatur `PLAYBOOK.md`, pilih yang paling sederhana dan sebutkan
   pilihan itu di laporan. Tanyakan hanya bila pilihannya sulit dibatalkan.

## Aturan teknis (wajib)

- HTML, CSS, dan JavaScript murni dengan ES modules. Tanpa framework, bundler, TypeScript, paket npm,
  atau langkah build.
- Tanpa CDN, Google Fonts, analytics, atau URL luar apa pun. Pakai font sistem. Semua aset ada di repo.
- Semua path relatif dan diawali `./`. GitHub Pages menyajikan aplikasi di subfolder
  (`https://<user>.github.io/latihan-sjt/`), jadi path yang diawali `/` akan rusak.
- Jangan memakai `alert()`, `confirm()`, atau `prompt()`. Pakai `<dialog>` dan toast buatan sendiri.
- Teks antarmuka berbahasa Indonesia. Nama variabel dan fungsi dalam bahasa Inggris sederhana.
  Komentar kode berbahasa Indonesia, ringkas, ditujukan untuk pembaca pemula: jelaskan alasannya,
  bukan mengulang isi kode.
- Ikuti pembagian file di Spesifikasi §1.5. Satu file satu tanggung jawab, fungsi kecil.
- `js/quiz.js` harus bebas DOM (fungsi murni) supaya bisa diuji lewat `dev/selftest.html`.
- Tools Python hanya memakai pustaka standar. Jangan memasang paket pip.
- Jangan memasang atau menjalankan: `npm install`, Playwright/Puppeteer, Docker, Android Studio, emulator.
  Node boleh dipakai hanya bila sudah terpasang, untuk menjalankan `node dev/selftest.mjs`.

## Data soal

- `data/bank_soal_sjt_kemenkeu.json` adalah sumber soal. Jangan mengubah struktur atau nama field.
  Ubah isinya hanya bila pengguna meminta.
- `id` soal (misalnya `KMK-001`) menjadi kunci progres yang tersimpan di HP. Jangan pernah mengganti atau
  menomori ulang id yang sudah ada. Soal baru memakai nomor berikutnya dalam kategorinya.
- Setelah data diubah: jalankan `python tools/validate.py`, lalu naikkan versi.

## Versi dan cache offline

- Versi aplikasi ada di dua tempat dan harus sama:
  `sw.js` → `const CACHE_VERSION = 'sjt-vX.Y.Z';` dan `js/config.js` → `export const APP_VERSION = 'X.Y.Z';`
  Ubah hanya lewat `python tools/bump_version.py patch|minor|major`.
- Setiap perubahan pada file yang di-cache (semua isi `APP_SHELL`) wajib diikuti kenaikan versi sebelum
  push. Tanpa itu HP tetap memakai versi lama. Ingatkan pengguna soal ini.
- Setiap file baru di `css/`, `js/`, `icons/`, atau `data/` wajib ditambahkan ke `APP_SHELL` di `sw.js`.
  `validate.py` akan gagal bila ada yang terlewat.
- `sw.js` tidak boleh memanggil `skipWaiting()` secara otomatis. Hanya setelah menerima pesan
  `'SKIP_WAITING'` dari aplikasi, yaitu saat pengguna mengetuk banner pembaruan.

## Minta izin pengguna dulu sebelum

- `git push`, membuat repo GitHub, atau mengubah pengaturan GitHub Pages
- menghapus file atau folder
- memasang perangkat lunak apa pun
- mengubah data soal, ikon, atau file di `tools/`

## Perintah penting (jalankan dari folder proyek)

| Keperluan | Perintah |
|---|---|
| Server lokal | `python tools/serve.py` lalu buka `http://localhost:8080` (port lain: `python tools/serve.py 8090`) |
| Pemeriksaan statis | `python tools/validate.py` |
| Pemeriksaan + uji unduh | `python tools/validate.py --http` |
| Naikkan versi | `python tools/bump_version.py patch` |
| Uji logika | buka `http://localhost:8080/dev/selftest.html`, atau `node dev/selftest.mjs` bila Node ada |

- Di Windows, bila `python` tidak dikenali, pakai `py`.
- `tools/serve.py` berjalan terus sampai dihentikan. Jalankan di latar belakang bila bisa dan hentikan
  setelah selesai menguji, atau minta pengguna menjalankannya di jendela terminal terpisah.
- Pakai `tools/serve.py`, bukan `python -m http.server`. Di sebagian laptop Windows, server bawaan
  mengirim file `.js` sebagai `text/plain` sehingga modul JavaScript gagal dimuat.
