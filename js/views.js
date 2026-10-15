// Fungsi render untuk setiap layar. Setiap fungsi mengembalikan elemen DOM,
// lalu app.js yang memasangnya ke <main id="app">.
// Fase 2: Beranda menampilkan progres dan bank soal; Pengaturan (tema, ukuran teks) berfungsi;
// layar lain masih sementara sampai Fase 3.
import { el } from './ui.js';

const DISCLAIMER = 'Soal latihan disusun sendiri untuk persiapan pribadi. '
  + 'Bukan soal resmi dan bukan aplikasi resmi Kementerian Keuangan.';

// Daftar layar untuk Beranda sementara. Rute sesi dan hasil memakai contoh supaya bisa dicoba.
const SCREEN_LINKS = [
  { href: '#/mulai/latihan', title: 'Latihan', text: 'Atur latihan dengan umpan balik langsung' },
  { href: '#/mulai/simulasi', title: 'Simulasi', text: 'Atur simulasi dengan batas waktu' },
  { href: '#/sesi', title: 'Mengerjakan soal', text: 'Layar soal' },
  { href: '#/hasil/contoh', title: 'Hasil sesi', text: 'Contoh layar hasil' },
  { href: '#/statistik', title: 'Statistik', text: 'Capaian dan riwayat' },
  { href: '#/pengaturan', title: 'Pengaturan', text: 'Tampilan, data, dan info aplikasi' },
];

function screenHeader(title, subtitle) {
  return el('header', { class: 'screen-header' },
    el('h1', {}, title),
    subtitle ? el('p', {}, subtitle) : null,
  );
}

function backHomeLink() {
  return el('a', { class: 'btn btn-secondary btn-block', href: '#/' }, 'Kembali ke Beranda');
}

// Bar kemajuan dari CSS saja. role="progressbar" supaya pembaca layar ikut membacakan nilainya.
function progressBar(value, max, label) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return el('div', {
    class: 'progress',
    role: 'progressbar',
    'aria-label': label,
    'aria-valuemin': '0',
    'aria-valuemax': String(max),
    'aria-valuenow': String(value),
  }, el('span', { style: `width: ${(ratio * 100).toFixed(1)}%` }));
}

function stat(label, value) {
  return el('div', { class: 'stat' },
    el('span', { class: 'stat-value' }, value),
    el('span', { class: 'stat-label' }, label),
  );
}

function progressCard(bank, stats) {
  const total = bank.meta.jumlah;
  return el('section', { class: 'card', 'aria-labelledby': 'progress-title' },
    el('h2', { id: 'progress-title' }, 'Progres'),
    el('p', { class: 'progress-count' },
      el('strong', {}, `${stats.answeredCount} / ${total}`),
      ' soal sudah pernah dijawab',
    ),
    progressBar(stats.answeredCount, total, 'Soal yang sudah pernah dijawab'),
    el('div', { class: 'stat-grid' },
      stat('Rata-rata skor', `${stats.percent}%`),
      stat('Perlu diulang', String(stats.needsReview.length)),
    ),
  );
}

function categoryCard(bank) {
  return el('section', { class: 'card', 'aria-labelledby': 'category-title' },
    el('h2', { id: 'category-title' }, 'Bank soal'),
    el('ul', { class: 'category-list' },
      bank.categories.map((c) =>
        el('li', {},
          el('span', { class: 'chip' }, c.kode),
          el('span', { class: 'category-name' }, c.nama),
          el('span', { class: 'category-count' }, `${c.count} soal`),
        ),
      ),
    ),
    el('p', { class: 'muted small' }, `Total ${bank.meta.jumlah} soal, versi bank soal ${bank.meta.versi}`),
  );
}

export function renderHome({ version, bank, stats }) {
  return el('div', {},
    screenHeader('Latihan SJT ASN', 'Situational Judgement Test, bisa dipakai offline'),
    progressCard(bank, stats),
    categoryCard(bank),
    el('h2', { class: 'section-title section' }, 'Semua layar (sementara)'),
    el('nav', { class: 'stack', 'aria-label': 'Daftar layar' },
      SCREEN_LINKS.map((link) =>
        el('a', { class: 'card card-link', href: link.href },
          el('h2', {}, link.title),
          el('p', { class: 'muted small' }, link.text),
        ),
      ),
    ),
    el('footer', { class: 'app-footer' }, `Versi ${version}`),
  );
}

// Tampil bila bank soal gagal dimuat, misalnya dibuka pertama kali tanpa internet.
export function renderLoadError() {
  return el('div', {},
    screenHeader('Gagal memuat soal'),
    el('div', { class: 'card' },
      el('p', {}, 'Gagal memuat soal. Buka aplikasi sekali saat online.'),
    ),
    el('div', { class: 'section' },
      el('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => location.reload() }, 'Coba lagi'),
    ),
  );
}

// Layar sementara untuk rute yang baru dibuat di fase berikutnya.
export function renderPlaceholder(title, note) {
  return el('div', {},
    screenHeader(title, note),
    el('div', { class: 'card' },
      el('p', { class: 'muted' }, 'Layar ini dibuat di fase berikutnya.'),
    ),
    el('div', { class: 'section' }, backHomeLink()),
  );
}

// Sekelompok tombol pilihan; yang aktif ditandai aria-pressed="true".
// Tampilan tombol diperbarui di sini, lalu onSelect dipanggil untuk menyimpan.
function choiceGroup({ label, options, value, onSelect }) {
  const buttons = options.map(({ value: optionValue, text }) => {
    const button = el('button', {
      type: 'button',
      class: 'segment',
      'aria-pressed': String(optionValue === value),
      onclick: () => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        onSelect(optionValue);
      },
    }, text);
    return button;
  });
  return el('fieldset', { class: 'field' },
    el('legend', {}, label),
    el('div', { class: 'segmented' }, buttons),
  );
}

export function renderSettings({ settings, version, onChange }) {
  return el('div', {},
    screenHeader('Pengaturan'),

    el('section', { class: 'section' },
      el('h2', { class: 'section-title' }, 'Tampilan'),
      el('div', { class: 'card' },
        choiceGroup({
          label: 'Tema',
          value: settings.theme,
          options: [
            { value: 'system', text: 'Ikuti sistem' },
            { value: 'light', text: 'Terang' },
            { value: 'dark', text: 'Gelap' },
          ],
          onSelect: (theme) => onChange({ theme }),
        }),
        choiceGroup({
          label: 'Ukuran teks',
          value: settings.textSize,
          options: [
            { value: 'normal', text: 'Normal' },
            { value: 'large', text: 'Besar' },
          ],
          onSelect: (textSize) => onChange({ textSize }),
        }),
      ),
    ),

    el('section', { class: 'section' },
      el('h2', { class: 'section-title' }, 'Info'),
      el('div', { class: 'card' },
        el('p', {}, `Versi aplikasi: ${version}`),
      ),
    ),

    el('section', { class: 'section' },
      el('h2', { class: 'section-title' }, 'Tentang'),
      el('div', { class: 'card' },
        el('p', {}, DISCLAIMER),
      ),
    ),

    backHomeLink(),
  );
}
