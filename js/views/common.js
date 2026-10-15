// Potongan tampilan yang dipakai banyak layar: judul, tombol pilihan, chip, lencana skor, format angka.
import { el } from '../ui.js';

export const MODE_LABELS = {
  latihan: 'Latihan',
  simulasi: 'Simulasi',
  ulangi: 'Ulangi',
  ditandai: 'Ditandai',
};

export const DISCLAIMER = 'Soal latihan disusun sendiri untuk persiapan pribadi. '
  + 'Bukan soal resmi dan bukan aplikasi resmi Kementerian Keuangan.';

const averageFormat = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

// Rata-rata skor skala 1 sampai 4 dengan koma desimal, misalnya 3,25
export function formatAverage(value) {
  return averageFormat.format(value);
}

export function formatDateTime(timestamp) {
  return dateTimeFormat.format(new Date(timestamp));
}

export function screenHeader(title, subtitle) {
  return el('header', { class: 'screen-header' },
    el('h1', {}, title),
    subtitle ? el('p', {}, subtitle) : null,
  );
}

export function backHomeLink(text = 'Kembali ke Beranda') {
  return el('a', { class: 'btn btn-secondary btn-block', href: '#/' }, text);
}

// Teks yang hanya dibaca pembaca layar, misalnya kata "Skor" sebelum angka di lencana
export function srOnly(text) {
  return el('span', { class: 'visually-hidden' }, text);
}

// Bar kemajuan dari CSS saja. role="progressbar" supaya pembaca layar ikut membacakan nilainya.
export function progressBar(value, max, label) {
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

export function stat(label, value) {
  return el('div', { class: 'stat' },
    el('span', { class: 'stat-value' }, value),
    el('span', { class: 'stat-label' }, label),
  );
}

export function categoryChip(kode) {
  return el('span', { class: 'chip' }, kode);
}

// Lencana angka skor berwarna. Angka selalu tampil supaya tidak bergantung pada warna saja.
export function scoreBadge(skor) {
  return el('span', { class: `score-badge s${skor}` }, srOnly('Skor '), String(skor));
}

// Label kecil seperti "Pilihan Anda" dan "Terbaik"
export function tag(text, variant) {
  return el('span', { class: `tag ${variant}` }, text);
}

// Chip yang bisa diketuk untuk memilih/batal memilih (pilihan ganda)
export function toggleChip({ text, pressed, onToggle }) {
  const button = el('button', {
    type: 'button',
    class: 'chip-toggle',
    'aria-pressed': String(pressed),
    onclick: () => {
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(next));
      onToggle(next);
    },
  }, text);
  return button;
}

// Sekelompok tombol pilihan tunggal; yang aktif ditandai aria-pressed="true".
// Tampilan tombol diperbarui di sini, lalu onSelect dipanggil untuk menyimpan.
export function choiceGroup({ label, options, value, onSelect }) {
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

// Sakelar nyala/mati. Memakai role="switch" agar pembaca layar menyebutnya "aktif/nonaktif".
export function switchRow({ label, description, checked, onChange }) {
  const button = el('button', {
    type: 'button',
    class: 'switch',
    role: 'switch',
    'aria-checked': String(checked),
    onclick: () => {
      const next = button.getAttribute('aria-checked') !== 'true';
      button.setAttribute('aria-checked', String(next));
      onChange(next);
    },
  },
  el('span', { class: 'switch-text' },
    el('span', { class: 'switch-label' }, label),
    description ? el('span', { class: 'switch-description' }, description) : null,
  ),
  el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })),
  );
  return button;
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

// Kartu berjudul bagian, misalnya "Tampilan" di Pengaturan
export function section(title, ...children) {
  return el('section', { class: 'section' },
    el('h2', { class: 'section-title' }, title),
    ...children,
  );
}
