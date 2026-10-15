# Playbook: Aplikasi Latihan SJT Offline untuk Android

Dokumen ini dipakai dua pihak. **Bagian 0** untuk Anda: cara menyiapkan laptop dan menjalankan Claude Code.
**Bagian 1** adalah spesifikasi aplikasi yang menjadi acuan Claude Code. **Bagian 2** berisi fase kerja,
masing-masing dengan perintah yang tinggal Anda tempel ke Claude Code dan checkpoint untuk dicek.

Hasil akhirnya adalah aplikasi latihan 151 soal SJT yang terpasang di Samsung Galaxy S26+ seperti aplikasi
biasa, bisa dibuka tanpa internet, menyimpan progres latihan di HP, dan bisa diperbarui kapan saja.

---

## 0. Mulai di sini (untuk Anda)

### 0.1 Isi folder awal

| File/folder | Fungsi | Siapa yang mengubah |
|---|---|---|
| `CLAUDE.md` | Aturan proyek. Dibaca otomatis oleh Claude Code setiap sesi dimulai | Anda, bila ingin mengubah aturan |
| `PLAYBOOK.md` | Dokumen ini | Anda |
| `PROGRESS.md` | Catatan fase yang sudah selesai | Claude Code |
| `data/bank_soal_sjt_kemenkeu.json` | 151 soal beserta bobot dan pembahasan | Hanya atas permintaan Anda |
| `icons/` | Ikon aplikasi 192 px, 512 px, dan maskable | Tetap |
| `tools/serve.py` | Server lokal untuk uji coba di laptop | Tetap (sudah diuji) |
| `tools/validate.py` | Pemeriksa data, manifest, service worker, path, versi | Tetap (sudah diuji) |
| `tools/bump_version.py` | Menaikkan versi aplikasi | Tetap (sudah diuji) |
| `.gitignore` | Daftar file yang tidak ikut ke Git | Tetap |

### 0.2 Prasyarat (cukup sekali)

| Kebutuhan | Cara cek di PowerShell | Catatan |
|---|---|---|
| Claude Code | `claude --version` | Butuh langganan Pro, Max, Team, Enterprise, atau akun Console. Pasang lewat PowerShell: `irm https://claude.ai/install.ps1 \| iex`, lalu buka jendela terminal baru |
| Python 3.9 atau lebih baru | `python --version` atau `py --version` | Unduh dari python.org. Saat memasang, centang **Add python.exe to PATH** |
| Git for Windows | `git --version` | Unduh dari git-scm.com. Dipakai untuk mengunggah ke GitHub, dan Claude Code memakai Git Bash darinya |
| Google Chrome di laptop | | Untuk uji coba dan DevTools |
| Akun GitHub | | Gratis, daftar di github.com |
| Chrome di HP | | Perbarui ke versi terbaru lewat Play Store |
| Kabel USB data | | Opsional, untuk uji di HP sebelum publikasi dan untuk debugging |

RAM 8 GB cukup. Claude Code, Python, dan server lokal ringan. Proyek ini sengaja tidak memakai npm,
framework, emulator, atau Android Studio.

### 0.3 Cara menjalankan

1. Ekstrak zip ke folder biasa, misalnya `C:\Proyek\latihan-sjt`. Hindari folder yang disinkronkan
   OneDrive karena proses sinkronisasi bisa mengunci file saat sedang diubah.
2. Buka folder itu di File Explorer, klik kanan di area kosong, pilih **Open in Terminal**.
3. Ketik `claude` lalu Enter. Login bila diminta.
4. Tempel perintah Fase 0 dari tabel 0.4.
5. Di awal tiap fase, Claude Code akan menampilkan rencana. Balas `lanjut` bila setuju, atau tulis koreksi.
6. Claude Code akan meminta izin sebelum menjalankan perintah atau mengubah file. Baca sekilas lalu setujui.
7. Di akhir fase, Claude Code berhenti di checkpoint dan menyebutkan apa yang perlu Anda cek. Setelah beres,
   tempel perintah fase berikutnya.
8. Boleh berhenti kapan saja. Untuk melanjutkan di lain waktu, jalankan `claude` lagi di folder yang sama
   dan ketik: `Baca PROGRESS.md lalu lanjutkan dari fase terakhir.`

Tips: bila percakapan dengan Claude Code sudah sangat panjang, keluar lalu jalankan `claude` lagi.
`CLAUDE.md` dan `PROGRESS.md` membuat sesi baru tetap tahu konteksnya.

### 0.4 Daftar fase dan perintah

| Fase | Hasil | Perintah untuk ditempel ke Claude Code |
|---|---|---|
| 0 | Laptop siap, data tervalidasi, repo git lokal | `Baca CLAUDE.md dan PLAYBOOK.md, lalu kerjakan Fase 0.` |
| 1 | Kerangka halaman, tema, manifest | `Kerjakan Fase 1 sesuai PLAYBOOK.md.` |
| 2 | Logika data, skor, penyimpanan, selftest | `Kerjakan Fase 2 sesuai PLAYBOOK.md.` |
| 3 | Semua layar dan alur latihan/simulasi | `Kerjakan Fase 3 sesuai PLAYBOOK.md.` |
| 4 | Mode offline dan banner pembaruan | `Kerjakan Fase 4 sesuai PLAYBOOK.md.` |
| 5 | Uji lokal lengkap, opsional uji di HP via USB | `Kerjakan Fase 5 sesuai PLAYBOOK.md.` |
| 6 | Terbit di GitHub Pages | `Kerjakan Fase 6 sesuai PLAYBOOK.md. Username GitHub saya: ISI_USERNAME.` |
| 7 | Terpasang di HP | Dikerjakan sendiri, lihat Fase 7 |
| 8 | Pembaruan soal atau fitur | `Kerjakan Fase 8 sesuai PLAYBOOK.md untuk perubahan berikut: ...` |

---

## 1. Spesifikasi (acuan Claude Code)

### 1.1 Tujuan dan batasan

- Aplikasi latihan SJT pribadi untuk satu pengguna. Target utama Chrome di Android (Galaxy S26+).
  Di laptop tetap nyaman dipakai: konten di tengah dengan lebar maksimal 680 px.
- Berjalan penuh tanpa internet setelah dibuka sekali saat online dan dipasang.
- Tanpa login, tanpa server, tanpa mengirim data ke mana pun. Semua progres tersimpan di perangkat.
- Bukan aplikasi resmi. Di layar Pengaturan bagian Tentang, tampilkan: "Soal latihan disusun sendiri untuk
  persiapan pribadi. Bukan soal resmi dan bukan aplikasi resmi Kementerian Keuangan." Jangan memakai logo
  instansi mana pun.

### 1.2 Kontrak data soal

File: `data/bank_soal_sjt_kemenkeu.json` (sekitar 258 KB). Struktur:

```json
{
  "judul": "Bank Soal Situational Judgement Test (SJT) ASN Kementerian Keuangan",
  "versi": "1.0",
  "tanggal": "2026-10-14",
  "sasaran": "Pelaksana dan pejabat fungsional",
  "format_penilaian": { "jumlah_opsi": 4, "skor_min": 1, "skor_maks": 4, "keterangan": "..." },
  "kategori": [
    { "kode": "KMK", "nama": "Nilai-nilai Kementerian Keuangan", "dasar": "...", "jumlah_soal": 36 },
    { "kode": "AKH", "nama": "Core Values ASN BerAKHLAK", "dasar": "...", "jumlah_soal": 50 },
    { "kode": "MNJ", "nama": "Kompetensi Manajerial", "dasar": "...", "jumlah_soal": 56 },
    { "kode": "SK",  "nama": "Kompetensi Sosial Kultural", "dasar": "...", "jumlah_soal": 9 }
  ],
  "jumlah_soal": 151,
  "soal": [
    {
      "id": "KMK-001",
      "kategori": "KMK",
      "kategori_nama": "Nilai-nilai Kementerian Keuangan",
      "kompetensi": "Integritas",
      "indikator": "Bersikap jujur, tulus, dan dapat dipercaya",
      "skenario": "Anda bertugas di seksi layanan ... Apa yang Anda lakukan?",
      "opsi": [
        { "kode": "A", "teks": "...", "skor": 2 },
        { "kode": "B", "teks": "...", "skor": 4 },
        { "kode": "C", "teks": "...", "skor": 1 },
        { "kode": "D", "teks": "...", "skor": 3 }
      ],
      "jawaban_terbaik": "B",
      "pembahasan": "..."
    }
  ]
}
```

Hal yang dijamin `tools/validate.py`:

- Setiap soal punya tepat 4 opsi berkode A sampai D dengan skor 1, 2, 3, 4 masing-masing sekali.
- `jawaban_terbaik` selalu kode opsi yang berskor 4.
- `id` unik dengan format `<KODE_KATEGORI>-NNN`.
- Pembahasan tidak menyebut huruf opsi, sehingga urutan opsi aman diacak.

Field `versi` adalah versi bank soal (teks bebas), berbeda dari versi aplikasi.

### 1.3 Layar, rute, dan fitur

Navigasi memakai hash (`#/...`) supaya tombol kembali di Android berfungsi dan aplikasi bisa jalan di subfolder.

| Rute | Layar | Isi |
|---|---|---|
| `#/` | Beranda | Judul, chip status offline, kartu "Lanjutkan sesi" (bila ada sesi aktif), kartu progres, tombol mode |
| `#/mulai/latihan` | Atur latihan | Pilihan kategori, kompetensi, jumlah soal, prioritas soal baru |
| `#/mulai/simulasi` | Atur simulasi | Pilihan kategori dan jumlah soal; durasi dihitung otomatis |
| `#/sesi` | Mengerjakan soal | Satu soal per layar |
| `#/hasil/<idSesi>` | Hasil sesi | Skor, rincian, daftar soal dengan pembahasan |
| `#/statistik` | Statistik | Capaian per kategori dan kompetensi, riwayat sesi |
| `#/pengaturan` | Pengaturan | Tampilan, data progres, info aplikasi, tentang |

**Beranda**

- Kartu progres: soal yang sudah pernah dijawab `x / 151` dengan progress bar, rata-rata skor (persen),
  jumlah soal "perlu diulang".
- Tombol utama: **Latihan** dan **Simulasi**.
- Tombol sekunder: **Ulangi yang belum terbaik (n)** (nonaktif bila n = 0), **Ditandai (n)**, **Statistik**,
  **Pengaturan**.
- Bila ada sesi aktif: kartu "Lanjutkan sesi" berisi mode, posisi (misalnya soal 7 dari 20), dan sisa waktu
  untuk simulasi. Ada tombol Lanjutkan dan Akhiri.
- Bagian bawah: versi aplikasi.

**Mode Latihan** (umpan balik langsung)

- Pengaturan: kategori (pilihan ganda berbentuk chip, default semua), kompetensi (opsional, daftarnya
  mengikuti kategori terpilih), jumlah soal 10/20/30/Semua (default 20), sakelar "Utamakan soal yang belum
  pernah dikerjakan" (default aktif).
- Urutan pengambilan soal bila sakelar aktif: soal yang belum pernah dijawab (diacak), lalu soal yang
  sudah dijawab dengan skor terakhir terendah lebih dulu. Ambil sejumlah N, lalu acak urutan tampilnya.
- Saat pengguna mengetuk opsi, jawaban terkunci dan langsung tampil:
  - lencana skor di setiap opsi (angka 1 sampai 4 dengan warna skor),
  - label "Pilihan Anda" pada opsi yang dipilih dan label "Terbaik" pada opsi berskor 4,
  - kalimat "Skor Anda 3 dari 4" di area `aria-live`,
  - kartu Pembahasan,
  - tombol **Lanjut** (di soal terakhir: **Lihat hasil**).
- Setiap jawaban langsung disimpan ke riwayat soal.
- Bila soal yang cocok dengan filter lebih sedikit dari jumlah yang dipilih, pakai semua yang ada dan beri
  tahu lewat toast. Bila tidak ada sama sekali, tombol Mulai nonaktif dengan keterangan.

**Mode Ulangi** dan **Mode Ditandai** memakai alur yang sama dengan Latihan. Kumpulan soalnya adalah soal
dengan skor terakhir di bawah 4 (Ulangi) atau soal yang ditandai bintang (Ditandai), diacak, maksimal 30 soal
per sesi. Kedua mode langsung mulai tanpa layar atur.

**Mode Simulasi** (tanpa umpan balik, ada waktu)

- Pengaturan: kategori (default semua), jumlah soal 20/30/50 (default 30). Durasi = jumlah soal × 60 detik,
  ditampilkan sebelum mulai. Soal diambil acak dari kategori terpilih. Bila soal tersedia lebih sedikit,
  berlaku aturan yang sama dengan Latihan.
- Pengatur waktu tampil di atas (mm:ss) dan berwarna peringatan saat sisa kurang dari 1 menit.
  Batas waktu disimpan sebagai jam selesai (`deadline`), sehingga waktu tetap berjalan saat aplikasi ditutup.
- Opsi bisa dipilih dan diganti. Tombol **Sebelumnya**, **Berikutnya**, dan **Daftar soal** (grid nomor yang
  membedakan soal terjawab dan belum terjawab, bisa diketuk untuk lompat).
- **Selesai** membuka dialog konfirmasi yang menyebut jumlah soal belum dijawab.
- Saat waktu habis, sesi otomatis selesai. Soal yang tidak dijawab bernilai 0.
- Jawaban baru dicatat ke riwayat soal saat sesi selesai.

**Di layar soal (semua mode)**

- Bagian atas: progress bar dan teks "Soal 7 dari 20", chip kategori, nama kompetensi, tombol bintang
  (tandai/batal tandai), dan pengatur waktu untuk simulasi.
- Isi: teks skenario, lalu empat tombol opsi berlabel A sampai D sesuai posisi tampil.
- Bar aksi menempel di bawah layar.
- Saat pindah soal, fokus keyboard dipindah ke judul soal dan halaman digulir ke atas.

**Hasil sesi**

- Skor total dan maksimal, persentase, durasi pengerjaan.
- Rincian per kategori berupa bar horizontal (CSS saja) dan tabel per kompetensi: jumlah soal,
  rata-rata skor, persentase jawaban terbaik.
- Daftar soal dengan filter **Semua** atau **Belum terbaik**. Setiap soal bisa dibuka untuk melihat skenario,
  jawaban Anda beserta skornya, jawaban terbaik, dan pembahasan.
- Tombol **Latihan ulang soal yang belum terbaik** (membuat sesi latihan dari soal sesi ini yang skornya
  di bawah 4) dan **Ke beranda**.

**Statistik** (dihitung dari jawaban terakhir setiap soal)

- Total soal yang pernah dikerjakan dari 151.
- Per kategori dan per kompetensi: jumlah dikerjakan, rata-rata skor (skala 1 sampai 4), persentase terbaik.
- Sorot tiga kompetensi dengan rata-rata terendah (hanya yang sudah dikerjakan minimal 3 soal).
- Riwayat 30 sesi terakhir: tanggal, mode, persentase skor. Ketuk untuk membuka hasilnya.

**Pengaturan**

- Tampilan: tema (Ikuti sistem, Terang, Gelap), ukuran teks (Normal, Besar), sakelar "Acak urutan opsi"
  (default aktif).
- Data:
  - **Ekspor progres**: mengunduh file `sjt-progres-YYYYMMDD.json`.
  - **Impor progres**: memilih file, memvalidasinya, lalu dialog konfirmasi bahwa progres sekarang akan
    diganti.
  - **Hapus semua progres**: dialog konfirmasi dengan tombol merah.
- Info: versi aplikasi, versi bank soal dan jumlah soal, status penyimpanan persisten (Aktif/Tidak aktif),
  status offline (Siap/Belum siap).
- Tentang: kalimat penafian dari §1.1.

**Elemen global**

- Banner pembaruan: "Versi baru tersedia" dengan tombol **Muat ulang** (Fase 4).
- Chip status di Beranda: "Siap offline" bila service worker aktif, dan "Sedang offline" saat tidak ada koneksi.
- Toast singkat untuk konfirmasi, misalnya "Progres diekspor" atau "Soal ditandai".
- Status muat data: tampilan memuat saat JSON diambil, dan pesan galat yang jelas bila gagal
  ("Gagal memuat soal. Buka aplikasi sekali saat online.").

**Perilaku tombol kembali (Android)**

- Saat memulai sesi dari layar atur, pakai `location.replace('#/sesi')` agar tombol kembali dari sesi menuju
  Beranda, bukan layar atur.
- Saat sesi selesai, pakai `location.replace('#/hasil/<id>')` agar kembali dari hasil menuju Beranda.
- Keluar dari layar soal tidak menghapus sesi. Sesi tetap tersimpan sebagai sesi aktif dan bisa dilanjutkan.

### 1.4 Aturan skor

- Skor satu soal = bobot opsi yang dipilih (1 sampai 4). Soal simulasi yang tidak dijawab = 0.
- Persentase sesi = total skor ÷ (4 × jumlah soal) × 100, dibulatkan ke bilangan bulat.
- Rata-rata skor = rata-rata bobot pada soal yang dijawab, skala 1 sampai 4, dua angka desimal.
- Persentase terbaik = jumlah jawaban berskor 4 ÷ jumlah soal yang dijawab.
- "Perlu diulang" = soal yang jawaban terakhirnya berskor di bawah 4.
- Pengacakan memakai algoritma Fisher-Yates. Huruf A sampai D di layar mengikuti posisi tampil,
  sedangkan yang disimpan selalu `kode` asli dari JSON.

### 1.5 Struktur file

```
latihan-sjt/
├── index.html              Kerangka halaman, meta tag, wadah aplikasi, banner, dialog, toast
├── manifest.webmanifest    Identitas aplikasi untuk dipasang di HP
├── sw.js                   Service worker. Wajib di folder utama agar cakupannya seluruh aplikasi
├── .nojekyll               File kosong agar GitHub Pages menyajikan file apa adanya
├── css/
│   └── style.css           Variabel warna, tema terang/gelap, tata letak, komponen
├── js/
│   ├── config.js           APP_VERSION, STORAGE_KEY, DATA_URL, konstanta lain
│   ├── data.js             Memuat JSON soal dan membuat indeks per id, kategori, kompetensi
│   ├── store.js            Baca/tulis localStorage, ekspor/impor, permintaan penyimpanan persisten
│   ├── quiz.js             Fungsi murni tanpa DOM: acak, pilih soal, hitung skor, ringkasan
│   ├── ui.js               Helper DOM kecil: buat elemen, dialog, toast, format waktu
│   ├── views.js            Fungsi render untuk setiap layar
│   ├── pwa.js              Pendaftaran service worker, banner pembaruan, status offline
│   └── app.js              Titik masuk: inisialisasi, router hash, pengatur waktu simulasi
├── data/bank_soal_sjt_kemenkeu.json    (sudah ada)
├── icons/                              (sudah ada)
├── dev/
│   ├── selftest.mjs        Pengujian fungsi quiz.js dan validasi impor
│   └── selftest.html       Halaman yang menjalankan selftest.mjs dan menampilkan hasilnya
└── tools/                              (sudah ada)
```

Bila `views.js` melebihi sekitar 400 baris, boleh dipecah menjadi `js/views/*.js`. Semua file baru di `js/`
wajib masuk `APP_SHELL`. Folder `dev/` dan `tools/` tidak di-cache.

Isi `js/config.js` minimal:

```js
// Versi aplikasi. Ubah lewat: python tools/bump_version.py patch
export const APP_VERSION = '1.0.0';
export const STORAGE_KEY = 'sjt.v1';
export const DATA_URL = './data/bank_soal_sjt_kemenkeu.json';
export const SESSION_HISTORY_LIMIT = 30;
export const ATTEMPTS_PER_QUESTION = 5;
export const SECONDS_PER_QUESTION = 60;
```

Fungsi yang wajib ada di `js/quiz.js` (nama boleh disesuaikan, perilakunya tidak):

| Fungsi | Perilaku |
|---|---|
| `shuffle(array, rng = Math.random)` | Mengembalikan array baru teracak (Fisher-Yates). Parameter `rng` memudahkan pengujian |
| `buildPool(questions, filter, attempts)` | Daftar id sesuai kategori, kompetensi, dan prioritas soal baru (§1.3) |
| `createSession({ mode, ids, shuffleOptions, now, rng })` | Objek sesi aktif sesuai §1.6, termasuk `optionOrder` dan `deadline` untuk simulasi |
| `scoreOf(question, kode)` | Bobot opsi, atau 0 bila `kode` kosong |
| `summarize(items, questionsById)` | Total, maksimal, persen, rincian per kategori dan per kompetensi |
| `latestStats(attempts, questionsById)` | Statistik dari jawaban terakhir setiap soal dan daftar id "perlu diulang" |
| `validateProgress(obj)` | Memeriksa file impor: `{ ok: true }` atau `{ ok: false, reason }` |

### 1.6 Penyimpanan di perangkat

Satu kunci `localStorage`: `sjt.v1`. Isinya satu objek JSON:

```json
{
  "schema": 1,
  "settings": { "theme": "system", "textSize": "normal", "shuffleOptions": true },
  "attempts": {
    "KMK-001": [ { "t": 1760500000000, "kode": "B", "skor": 4, "mode": "latihan" } ]
  },
  "bookmarks": ["AKH-012"],
  "sessions": [
    {
      "id": "s-1760500000000",
      "mode": "latihan",
      "startedAt": 1760500000000,
      "finishedAt": 1760500900000,
      "items": [ { "id": "KMK-001", "kode": "B", "skor": 4 } ],
      "total": 72,
      "max": 80
    }
  ],
  "active": {
    "id": "s-1760501000000",
    "mode": "simulasi",
    "startedAt": 1760501000000,
    "deadline": 1760502800000,
    "ids": ["KMK-001", "MNJ-014"],
    "optionOrder": { "KMK-001": ["C", "A", "D", "B"] },
    "answers": { "KMK-001": "B" },
    "revealed": {},
    "index": 1
  }
}
```

- `settings.theme` berisi `system`, `light`, atau `dark`. `settings.textSize` berisi `normal` atau `large`.
- `mode` berisi salah satu dari `latihan`, `simulasi`, `ulangi`, `ditandai`. Untuk simulasi,
  `deadline = startedAt + jumlah soal × SECONDS_PER_QUESTION × 1000`. Untuk mode lain `deadline` bernilai `null`.
- Simpan setiap kali ada perubahan, misalnya setelah menjawab, pindah soal, atau menandai.
- `attempts` per soal disimpan maksimal 5 terakhir. `sessions` maksimal 30 terakhir.
- Bila isi `localStorage` rusak dan gagal dibaca: salin teks aslinya ke kunci `sjt.v1.rusak`, mulai dengan
  data kosong, lalu tampilkan toast.
- File ekspor berisi objek yang sama ditambah `exportedAt` dan `appVersion`.
- Impor: tolak bila bukan objek, `schema` bukan 1, atau `attempts` bukan objek. Abaikan id yang tidak ada
  di bank soal. Mengimpor berarti mengganti, bukan menggabungkan.
- Setiap kali aplikasi dibuka dan data berhasil dimuat: bila `navigator.storage.persisted()` masih `false`,
  panggil `navigator.storage.persist()` (bila tersedia) agar Chrome tidak menghapus progres saat memori HP
  hampir penuh. Chrome biasanya baru mengabulkannya setelah aplikasi dipasang, karena itu permintaan diulang
  setiap kali dibuka. Tampilkan statusnya di Pengaturan.

### 1.7 Tampilan

- Mobile-first. Konten di tengah dengan lebar maksimal 680 px, padding samping 16 px. Tidak boleh ada
  gulir horizontal pada lebar 360 px.
- Font sistem: `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`.
  Ukuran dasar 17 px (Besar: 19 px), `line-height` 1.55.
- Target sentuh minimal 48 px. Tombol opsi selebar layar, rata kiri, dengan lingkaran huruf di kiri.
- Bar aksi menempel di bawah dengan `padding-bottom: calc(12px + env(safe-area-inset-bottom))`.
- Warna sebagai variabel CSS di `:root`. Atribut `data-theme` di `<html>` diisi `light` atau `dark` sesuai
  pilihan pengguna, dan tidak dipasang saat "Ikuti sistem". CSS: nilai gelap ditulis di
  `[data-theme="dark"]` dan juga di `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }`.
  Ukuran teks lewat `data-text-size="large"`.

| Variabel | Terang | Gelap |
|---|---|---|
| `--bg` | `#F7F8FA` | `#0F1318` |
| `--surface` | `#FFFFFF` | `#171C22` |
| `--text` | `#1B1F24` | `#E8EBEF` |
| `--muted` | `#5B6470` | `#9AA4AF` |
| `--border` | `#DDE1E6` | `#2A313A` |
| `--primary` | `#0F4C81` | `#7FB3E6` |
| `--on-primary` | `#FFFFFF` | `#0F1318` |
| `--accent` | `#FFC43D` | `#FFC43D` |
| `--score-4` | `#1B7F3B` | `#5CC98A` |
| `--score-3` | `#1F6FB2` | `#79B4EA` |
| `--score-2` | `#A86200` | `#F0B260` |
| `--score-1` | `#B3261E` | `#F2847C` |

- Lencana skor: latar warna skor. Teks putih di tema terang, teks `#0F1318` di tema gelap.
  Selalu tampilkan angkanya, jangan mengandalkan warna saja.
- Status tombol opsi yang harus tampak berbeda: normal, ditekan, terpilih (simulasi), terkunci,
  "Pilihan Anda", dan "Terbaik".
- Hormati `prefers-reduced-motion`. Animasi cukup transisi singkat.
- Aksesibilitas: pakai elemen `<button>` untuk semua yang bisa diketuk. Opsi terpilih memakai
  `aria-pressed`. Umpan balik skor dan peringatan waktu (5 menit dan 1 menit tersisa) diumumkan lewat
  area `aria-live="polite"`, bukan setiap detik. Kontras teks minimal 4.5:1.
- Kebutuhan `index.html`:
  - `<html lang="id">`, meta charset, dan
    `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
  - Dua `<meta name="theme-color">` dengan `media="(prefers-color-scheme: light)"` (`#0F4C81`) dan
    `media="(prefers-color-scheme: dark)"` (`#171C22`).
  - `<link rel="manifest" href="./manifest.webmanifest">`, `<link rel="icon" href="./icons/icon-192.png">`,
    dan stylesheet.
  - Skrip inline kecil di `<head>` yang membaca tema dan ukuran teks dari `localStorage`, lalu memasang
    `data-theme` dan `data-text-size` di `<html>` sebelum halaman digambar, supaya layar tidak berkedip.
    Bungkus dengan try/catch.
  - Di `<body>`: `<main id="app" tabindex="-1">`, wadah banner pembaruan (`hidden`), `<dialog>`, wadah
    toast dengan `role="status"`, `<noscript>` berisi pesan, dan
    `<script type="module" src="./js/app.js"></script>`.

### 1.8 Manifest

Isi `manifest.webmanifest`:

```json
{
  "name": "Latihan SJT ASN",
  "short_name": "Latihan SJT",
  "description": "Latihan Situational Judgement Test untuk ASN, bisa dipakai offline.",
  "lang": "id",
  "id": "./",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7F8FA",
  "theme_color": "#0F4C81",
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "./icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "./icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 1.9 Offline: service worker

Strategi: semua file aplikasi diunduh ke cache saat pemasangan (precache), lalu selalu disajikan dari cache.
Versi baru terpasang di belakang layar dan baru dipakai setelah pengguna mengetuk banner.
Kode di bawah sudah diuji di Chromium untuk pemasangan pertama, buka ulang saat offline, membuka rute
langsung saat offline, dan alur pembaruan sampai cache lama terhapus. Boleh disalin apa adanya.
Daftar `APP_SHELL` harus disesuaikan bila ada file tambahan.

`sw.js`:

```js
// Service worker: menyimpan seluruh aplikasi ke cache agar bisa dibuka tanpa internet.
// Versi dinaikkan lewat: python tools/bump_version.py patch
const CACHE_VERSION = 'sjt-v1.0.0';

// Semua file yang dibutuhkan aplikasi. File baru di css/, js/, icons/, data/ wajib ditambahkan di sini.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/config.js',
  './js/data.js',
  './js/store.js',
  './js/quiz.js',
  './js/ui.js',
  './js/views.js',
  './js/pwa.js',
  './js/app.js',
  './data/bank_soal_sjt_kemenkeu.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' memaksa unduh dari server, bukan dari cache browser yang mungkin masih versi lama
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  // Hapus cache versi lama, lalu ambil alih halaman yang sedang terbuka
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('sjt-') && key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  // Aplikasi mengirim pesan ini saat pengguna mengetuk "Muat ulang" di banner pembaruan
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Membuka halaman (termasuk dari ikon di layar utama): selalu pakai index.html dari cache
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((cached) => cached || fetch(request)));
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request))
  );
});
```

`js/pwa.js`:

```js
// Mendaftarkan service worker, memberi tahu saat siap offline, dan menawarkan pembaruan.
export async function setupPwa({ onOfflineReady, onUpdateReady }) {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.register('./sw.js');

  // Resolve saat ada service worker aktif, artinya seluruh file sudah tersimpan di cache
  navigator.serviceWorker.ready.then(() => onOfflineReady());

  let userAcceptedUpdate = false;
  const offerUpdate = (worker) =>
    onUpdateReady(() => {
      userAcceptedUpdate = true;
      worker.postMessage('SKIP_WAITING');
    });

  // Versi baru sudah terunduh dan menunggu sejak kunjungan sebelumnya
  if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      // controller sudah ada berarti ini pembaruan, bukan pemasangan pertama
      if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
    });
  });

  // Muat ulang hanya bila pengguna yang meminta, bukan saat pemasangan pertama
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (userAcceptedUpdate) window.location.reload();
  });

  // Cek pembaruan saat aplikasi dibuka kembali dan sedang online, paling sering 30 menit sekali
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine && Date.now() - lastCheck > 30 * 60 * 1000) {
      lastCheck = Date.now();
      registration.update().catch(() => {});
    }
  });
}
```

`app.js` memanggil `setupPwa` setelah tampilan pertama dirender. `onOfflineReady` menyalakan chip
"Siap offline". `onUpdateReady(accept)` menampilkan banner yang tombolnya memanggil `accept()`.
Status koneksi diambil dari `navigator.onLine` serta event `online` dan `offline`.

---

## 2. Fase kerja

Setiap fase diakhiri dengan: `python tools/validate.py` (mulai Fase 4 dengan `--http`), commit git lokal,
pembaruan `PROGRESS.md`, lalu berhenti di checkpoint.

### Fase 0: Persiapan

**Langkah Claude Code**

1. Cek sistem operasi dan shell. Cek `python --version` (atau `py --version`), minimal 3.9, dan
   `git --version`. Cek `node --version` hanya sebagai info; Node tidak wajib.
2. Pastikan isi folder sesuai §0.1. Jangan mengubah apa pun.
3. Jalankan `python tools/validate.py`. Hasil yang diharapkan: data soal valid (151 soal) dan beberapa
   peringatan bahwa manifest, sw.js, dan config.js belum ada. Itu normal.
4. Bila folder belum menjadi repo git: `git init -b main`, lalu commit awal `Fase 0: starter kit`. Bila git meminta identitas, minta pengguna mengisi nama dan email untuk
   `git config user.name` dan `git config user.email`.
5. Isi `PROGRESS.md`.

**Checkpoint (Anda)**: Claude Code melaporkan versi Python dan Git, serta hasil validate yang lolos.

### Fase 1: Kerangka, tema, manifest

**Langkah Claude Code**

1. Buat `index.html` sesuai §1.7, `css/style.css` (variabel warna, tema terang/gelap, ukuran teks, tata
   letak dasar, tombol, kartu, chip, bar aksi bawah, dialog, toast, banner), dan `js/config.js` sesuai §1.5.
2. Buat `js/ui.js` berisi helper kecil: fungsi pembuat elemen, `showToast(text)`,
   `confirmDialog({ title, message, confirmText, danger })` yang mengembalikan Promise berisi true/false,
   dan `formatDuration(detik)`.
3. Buat `js/app.js` dengan router hash untuk semua rute di §1.3. Untuk sementara setiap rute menampilkan
   judul layar dan tautan kembali ke Beranda. Beranda memuat tautan ke semua layar.
4. Buat `manifest.webmanifest` persis seperti §1.8, dan file kosong `.nojekyll`.
5. Di Pengaturan, buat pilihan tema dan ukuran teks yang sudah berfungsi. Simpan langsung ke `localStorage`
   dengan kunci `sjt.v1` mengikuti bentuk `settings` di §1.6. Di Fase 2 logika penyimpanan ini dipindah ke
   `store.js`.

**Selesai bila**

- `python tools/validate.py` lolos dan menyatakan manifest valid.
- Dengan `python tools/serve.py`, halaman `http://localhost:8080` tampil tanpa error di Console.
- Semua rute bisa dibuka. Tema dan ukuran teks berubah dan tetap tersimpan setelah halaman dimuat ulang.

**Checkpoint (Anda)**

1. Jalankan `python tools/serve.py` di terminal terpisah (atau minta Claude Code menjalankannya), buka
   `http://localhost:8080` di Chrome.
2. Tekan F12 untuk membuka DevTools, lalu Ctrl+Shift+M untuk tampilan HP. Pilih lebar sekitar 384 px.
3. Tab **Application → Manifest**: nama aplikasi dan ketiga ikon tampil tanpa pesan error.
4. Coba ganti tema dan ukuran teks.

### Fase 2: Data, skor, penyimpanan, selftest

**Langkah Claude Code**

1. `js/data.js`: `loadBank()` mengambil `DATA_URL` dengan `fetch`, lalu mengembalikan objek berisi
   `meta` (judul, versi, jumlah), `questions` (array), `byId` (Map), `categories` (kode, nama, jumlah), dan
   `competenciesByCategory`.
2. `js/quiz.js`: semua fungsi di tabel §1.5, tanpa menyentuh DOM atau `localStorage`.
3. `js/store.js`: `load()`, `save()`, `getState()`, `recordAttempt(id, kode, skor, mode)`,
   `toggleBookmark(id)`, `setActive(session)`, `clearActive()`, `addSession(result)`, `updateSettings(patch)`,
   `exportProgress()` (memicu unduhan file), `importProgress(text)`, `resetProgress()`, `requestPersist()`.
   Ikuti aturan §1.6, termasuk penanganan data rusak dan batas jumlah riwayat.
4. `dev/selftest.mjs`: minimal 12 pengujian dengan `rng` tetap agar hasilnya sama setiap kali. Wajib mencakup:
   `shuffle` tidak menghilangkan atau menggandakan elemen; `scoreOf` untuk tiap opsi dan untuk jawaban kosong;
   pembulatan persen; urutan prioritas `buildPool`; filter kategori dan kompetensi; `createSession` membuat
   `optionOrder` berisi A sampai D tanpa duplikat dan `deadline` sesuai jumlah soal; `latestStats` memakai
   jawaban terakhir; daftar "perlu diulang"; `validateProgress` menolak tiga contoh data buruk dan menerima
   satu contoh data baik. Gunakan data contoh kecil buatan sendiri di dalam file uji, jangan bergantung pada
   `fetch`.
5. `dev/selftest.html`: mengimpor `selftest.mjs`, menjalankannya, dan menampilkan daftar PASS/FAIL serta
   ringkasan "N lolos, M gagal". `selftest.mjs` juga bisa dijalankan dengan `node dev/selftest.mjs`.
6. Hubungkan Beranda dengan data asli: tampilkan jumlah soal per kategori dan kartu progres (masih nol).

Catatan untuk Node: bila `node dev/selftest.mjs` gagal karena sintaks `export` di file `.js`, cukup uji
lewat browser. Jangan menambah `package.json`.

**Selesai bila**

- Semua uji di `dev/selftest.html` berstatus PASS (dan di Node bila tersedia).
- Beranda menampilkan 151 soal dengan rincian KMK 36, AKH 50, MNJ 56, SK 9.
- `python tools/validate.py` lolos.

**Checkpoint (Anda)**: buka `http://localhost:8080/dev/selftest.html` dan pastikan semua PASS.
Buka Beranda dan cek angka-angkanya.

### Fase 3: Layar dan alur lengkap

**Langkah Claude Code**

1. `js/views.js`: render semua layar di §1.3 dengan aturan tampilan §1.7.
2. `js/app.js`: alur lengkap Latihan, Ulangi, Ditandai, Simulasi (termasuk pengatur waktu berbasis `deadline`
   yang dihitung ulang saat `visibilitychange`), Hasil, Statistik, Pengaturan (ekspor, impor, hapus progres,
   acak opsi), sesi aktif yang bisa dilanjutkan, serta perilaku tombol kembali di §1.3.
3. Rapikan `css/style.css` untuk semua komponen dan status tombol opsi.
4. Tinjau ulang kode sendiri terhadap daftar uji Lampiran A bagian Fungsi dan Tampilan, lalu perbaiki
   temuan sebelum melapor.

**Selesai bila**

- Semua butir Lampiran A bagian Fungsi dan Tampilan terpenuhi menurut tinjauan kode.
- Tidak ada error di Console selama alur dasar.
- `python tools/validate.py` lolos.

**Checkpoint (Anda)**: kerjakan Lampiran A bagian Fungsi dan Tampilan di Chrome laptop dengan tampilan HP.
Catat yang tidak sesuai, lalu minta Claude Code memperbaikinya sebelum lanjut.

### Fase 4: Mode offline dan pembaruan

**Langkah Claude Code**

1. Buat `sw.js` dan `js/pwa.js` sesuai §1.9. Sesuaikan `APP_SHELL` dengan file yang benar-benar ada.
2. Panggil `setupPwa` dari `app.js`. Tampilkan chip "Siap offline" dan "Sedang offline", serta banner
   pembaruan.
3. Panggil `store.requestPersist()` setelah data pertama kali berhasil dimuat. Tampilkan statusnya di
   Pengaturan.
4. Jalankan `python tools/validate.py --http`.

**Selesai bila**: `validate.py --http` lolos tanpa GAGAL.

**Checkpoint (Anda)**

1. Muat ulang `http://localhost:8080`. Di DevTools **Application → Service workers**, status
   "activated and running". Di **Application → Cache storage** ada `sjt-v1.0.0` berisi semua file.
2. Tab **Network**, ubah "No throttling" menjadi **Offline**, lalu muat ulang. Aplikasi tetap tampil dan
   latihan bisa dikerjakan. Kembalikan ke "No throttling".
3. Uji pembaruan: minta Claude Code menjalankan `python tools/bump_version.py patch`. Muat ulang halaman
   sekali. Banner "Versi baru tersedia" muncul. Ketuk **Muat ulang**, lalu cek di Pengaturan bahwa versinya
   menjadi 1.0.1. Setelah itu minta Claude Code mengembalikan versi ke 1.0.0 dengan
   `python tools/bump_version.py 1.0.0`, lalu di DevTools **Application → Storage** klik
   **Clear site data** agar uji berikutnya bersih (tindakan ini juga menghapus progres uji coba di laptop).

### Fase 5: Uji lokal lengkap

**Langkah Claude Code**

1. Jalankan `python tools/validate.py --http` dan `node dev/selftest.mjs` (bila Node ada).
2. Tinjau kode terhadap seluruh Lampiran A dan perbaiki yang belum sesuai.
3. Siapkan uji di HP lewat kabel USB (opsional, langkah di bawah) dan jalankan server bila pengguna mau.
4. Commit `Fase 5: siap rilis 1.0.0`.

**Uji di HP sebelum publikasi (opsional, Anda)**

Cara ini memakai alamat `localhost`, yang dianggap aman oleh Chrome sehingga mode offline bisa diuji.

1. Di HP: **Pengaturan → Tentang ponsel → Informasi perangkat lunak**, ketuk **Nomor versi** 7 kali sampai
   muncul pesan mode pengembang aktif. Lalu **Pengaturan → Opsi pengembang → Debugging USB**, aktifkan.
2. Sambungkan HP ke laptop dengan kabel USB data. Di HP, izinkan debugging saat diminta.
3. Pastikan `python tools/serve.py` berjalan di laptop.
4. Di Chrome laptop buka `chrome://inspect/#devices`. Klik **Port forwarding**, isi port `8080` dan alamat
   `localhost:8080`, centang **Enable port forwarding**, lalu **Done**.
5. Di Chrome HP buka `http://localhost:8080`. Kerjakan Lampiran A bagian HP.
6. Selesai menguji, hapus aplikasi versi localhost dari HP (tekan lama ikonnya, pilih Uninstall) agar
   tidak tertukar dengan versi GitHub Pages nanti.

Saat HP tersambung, halaman yang terbuka di HP juga muncul di `chrome://inspect`. Klik **inspect** untuk
melihat Console HP dari laptop. Ini cara termudah mencari error yang hanya terjadi di HP.

**Checkpoint (Anda)**: semua butir Lampiran A yang relevan sudah dicentang.

### Fase 6: Publikasi ke GitHub Pages

Repo publik berarti isi folder ini (termasuk bank soal dan dokumen ini) bisa dilihat siapa pun yang
mengetahui alamatnya. GitHub Pages untuk repo privat butuh paket berbayar.

**Langkah Claude Code**

1. Pastikan `python tools/validate.py --http` lolos dan tidak ada perubahan yang belum di-commit.
2. Tanyakan konfirmasi pengguna: username GitHub dan nama repo `latihan-sjt` (publik). Jangan lanjut
   tanpa jawaban.
3. Minta pengguna membuat repo kosong lewat browser: github.com → **New repository** → nama `latihan-sjt`,
   pilih **Public**, jangan centang "Add a README", klik **Create repository**.
   Alternatif bila `gh` (GitHub CLI) sudah terpasang dan login: `gh repo create latihan-sjt --public --source . --remote origin`.
   Perintah ini sekaligus menambahkan remote, jadi lewati baris `git remote add` di langkah 4.
4. Setelah repo ada (dan setelah meminta izin push):
   ```
   git remote add origin https://github.com/USERNAME/latihan-sjt.git
   git push -u origin main
   ```
   Saat push pertama, jendela login GitHub dari Git Credential Manager akan terbuka. Minta pengguna login.
5. Minta pengguna mengaktifkan Pages: buka repo di github.com → **Settings → Pages** → bagian
   **Build and deployment**, Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**, klik
   **Save**. Alternatif dengan `gh`:
   `gh api -X POST repos/USERNAME/latihan-sjt/pages -f "source[branch]=main" -f "source[path]=/"`.
   Bila perintah itu gagal, pakai cara lewat browser.
6. Tunggu 1 sampai 3 menit. Alamat aplikasi: `https://USERNAME.github.io/latihan-sjt/`. Bila jaringan
   memungkinkan, cek alamat itu mengembalikan status 200.
7. Catat alamat di `PROGRESS.md`.

**Checkpoint (Anda)**: buka alamat tersebut di Chrome laptop. Aplikasi tampil, dan di DevTools
**Application → Manifest** tidak ada error.

### Fase 7: Pasang di HP (Anda)

1. Di Galaxy S26+, buka Chrome (bukan Samsung Internet) dan buka `https://USERNAME.github.io/latihan-sjt/`.
2. Tunggu sampai chip "Siap offline" muncul di Beranda.
3. Ketuk menu **⋮** → **Install app**. Di sebagian versi Chrome tulisannya **Add to home screen**, lalu pilih
   **Install**.
4. Buka aplikasi dari layar utama atau laci aplikasi. Kerjakan dua atau tiga soal latihan.
5. Uji offline: nyalakan **Mode pesawat**, tutup aplikasi dari daftar aplikasi terbaru, lalu buka lagi.
   Aplikasi harus terbuka dan progres tadi masih ada.
6. Matikan mode pesawat. Selesai.

Biasakan **Ekspor progres** dari Pengaturan sesekali dan simpan filenya (misalnya di Google Drive),
terutama sebelum mengganti HP atau menghapus data Chrome.

### Fase 8: Pemeliharaan dan pembaruan

**Memperbarui atau menambah soal**

1. Ubah `data/bank_soal_sjt_kemenkeu.json`, atau minta Claude Code mengubahnya. Contoh perintah:
   `Kerjakan Fase 8: tambahkan 5 soal kategori SK dengan topik ... Ikuti format soal yang ada.`
2. Aturan: jangan ubah atau nomori ulang `id` lama. Soal baru melanjutkan nomor terakhir di kategorinya.
   Perbarui `jumlah_soal` di tingkat atas dan di daftar `kategori`.
3. `python tools/validate.py` sampai lolos.
4. `python tools/bump_version.py patch`.
5. Uji di laptop (`python tools/serve.py`), lalu `python tools/validate.py --http`.
6. Commit dan push (`git add -A`, `git commit -m "Soal: ..."`, `git push`).
7. Tunggu beberapa menit. Buka aplikasi di HP saat online. Banner "Versi baru tersedia" muncul. Ketuk
   **Muat ulang**. Bila banner belum muncul, tutup aplikasi dan buka lagi beberapa menit kemudian.

**Memperbaiki tampilan atau menambah fitur**: sama seperti di atas. Pakai `bump_version.py minor` untuk
fitur baru dan `patch` untuk perbaikan kecil.

---

## 3. Pemecahan masalah

| Gejala | Penyebab yang umum | Solusi |
|---|---|---|
| `python` tidak dikenali | Python belum di PATH, atau Windows mengarah ke Microsoft Store | Pakai `py`, atau pasang ulang Python dengan centang **Add python.exe to PATH** |
| Halaman putih, Console: "Failed to load module script ... MIME type text/plain" | Memakai `python -m http.server` | Pakai `python tools/serve.py` |
| `Port 8080 sedang dipakai` | Server lama masih jalan | Tutup terminal server lama, atau `python tools/serve.py 8090` |
| Di GitHub Pages tampil putih atau 404 untuk file JS/CSS | Ada path diawali `/` | `python tools/validate.py` akan menunjuk barisnya. Ganti menjadi `./...` |
| Pilihan "Install app" tidak muncul | Manifest bermasalah, belum HTTPS, atau service worker belum aktif | Cek DevTools **Application → Manifest** dan **Service workers**. Muat ulang sekali lalu tunggu "Siap offline" |
| Offline muncul halaman dinosaurus | Aplikasi belum sempat tersimpan ke cache sebelum offline, atau file tidak ada di `APP_SHELL` | Buka sekali saat online sampai "Siap offline". Jalankan `validate.py` |
| Perubahan tidak muncul di HP | Versi belum dinaikkan, atau GitHub Pages masih menyajikan versi lama (bisa sampai sekitar 10 menit) | `bump_version.py patch`, push, tunggu, lalu buka aplikasi saat online |
| Banner pembaruan muncul terus | Versi di `sw.js` dan `config.js` berbeda | `python tools/validate.py` lalu samakan dengan `bump_version.py` |
| Progres hilang | Data Chrome dihapus atau aplikasi di-uninstall | Impor file ekspor terakhir dari Pengaturan |
| `git push` ditolak atau minta password | Belum login | Ikuti jendela login Git Credential Manager. GitHub tidak menerima password akun untuk push |
| HP tidak muncul di `chrome://inspect` | Debugging USB belum aktif, kabel hanya untuk mengisi daya, atau izin belum diberikan | Cek Opsi pengembang, ganti kabel, buka kunci layar HP dan setujui dialog izin |
| `node dev/selftest.mjs` gagal soal `export` | Versi Node lama belum mengenali modul ES di file `.js` | Uji lewat `dev/selftest.html` saja |

---

## Lampiran A: Daftar uji manual

**Fungsi**

- [ ] Beranda menampilkan 151 soal dan rincian per kategori
- [ ] Latihan 10 soal kategori AKH: semua soal berasal dari AKH
- [ ] Filter kompetensi (misalnya Integritas di KMK) hanya menampilkan soal kompetensi itu
- [ ] Mengetuk opsi menampilkan lencana skor di keempat opsi, label "Pilihan Anda" dan "Terbaik", skor, dan pembahasan
- [ ] Setelah terjawab, opsi tidak bisa diganti
- [ ] Dengan "Acak urutan opsi" aktif, urutan opsi soal yang sama berbeda antarsesi, dan skor tetap benar
- [ ] Menutup tab di tengah latihan lalu membuka lagi: Beranda menampilkan "Lanjutkan sesi" di posisi yang sama
- [ ] Simulasi 20 soal: waktu 20:00 berjalan mundur, opsi bisa diganti, Daftar soal bisa dipakai untuk lompat
- [ ] Selesai simulasi dengan beberapa soal kosong: dialog menyebut jumlahnya, soal kosong bernilai 0
- [ ] Waktu simulasi habis (uji dengan mengubah `deadline` lewat DevTools atau `SECONDS_PER_QUESTION` sementara): sesi otomatis selesai
- [ ] Hasil sesi: total, persen, rincian kategori dan kompetensi, filter "Belum terbaik", pembahasan bisa dibuka
- [ ] "Latihan ulang soal yang belum terbaik" membuat sesi dari soal yang tepat
- [ ] Menandai bintang lalu membuka mode Ditandai: soalnya muncul
- [ ] Angka di tombol Ulangi sama dengan jumlah soal berskor terakhir di bawah 4, dan sesi Ulangi hanya berisi soal-soal itu (maksimal 30)
- [ ] Statistik sesuai dengan jawaban terakhir, tiga kompetensi terlemah tersorot, riwayat sesi bisa dibuka
- [ ] Ekspor menghasilkan file JSON. Hapus semua progres. Impor file tadi. Progres kembali utuh
- [ ] Impor file sembarang (misalnya file teks lain) ditolak dengan pesan yang jelas
- [ ] Tidak ada `alert`, `confirm`, atau `prompt` bawaan browser yang muncul

**Tampilan**

- [ ] Lebar 360 px tanpa gulir horizontal
- [ ] Tema terang, gelap, dan ikuti sistem berfungsi dan tersimpan
- [ ] Ukuran teks Besar berfungsi di semua layar
- [ ] Bar aksi bawah tidak tertutup navigasi gestur HP
- [ ] Tombol kembali: dari sesi ke Beranda, dari hasil ke Beranda
- [ ] Teks skenario yang panjang tetap nyaman dibaca

**Offline dan HP**

- [ ] `python tools/validate.py --http` lolos
- [ ] Chip "Siap offline" muncul setelah pembukaan pertama
- [ ] Mode Offline di DevTools: aplikasi tetap jalan
- [ ] Banner pembaruan muncul setelah versi dinaikkan, dan versi berganti setelah diketuk
- [ ] Di HP: aplikasi bisa dipasang, terbuka tanpa bilah browser, ikon tampil rapi
- [ ] Di HP dengan mode pesawat: aplikasi terbuka setelah ditutup paksa, progres tetap ada
- [ ] Pengaturan menampilkan penyimpanan persisten "Aktif" (setelah aplikasi dipasang)
