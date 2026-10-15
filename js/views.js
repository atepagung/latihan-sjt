// Fungsi render untuk setiap layar. Setiap fungsi mengembalikan elemen DOM,
// lalu app.js yang memasangnya ke <main id="app">.
// Fase 1: Beranda dan Pengaturan (tema, ukuran teks) sudah berfungsi, layar lain masih sementara.
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

export function renderHome({ version }) {
  return el('div', {},
    screenHeader('Latihan SJT ASN', 'Situational Judgement Test, bisa dipakai offline'),
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
