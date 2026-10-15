// Layar Pengaturan: tampilan, data progres (ekspor, impor, hapus), info aplikasi, dan penafian.
import { el } from '../ui.js';
import { DISCLAIMER, backHomeLink, choiceGroup, screenHeader, section, switchRow } from './common.js';

function infoRow(label, value) {
  return el('div', { class: 'info-row' },
    el('span', { class: 'muted' }, label),
    el('strong', {}, value),
  );
}

// Status penyimpanan persisten dan kesiapan offline. app.js menggantinya saat status berubah.
export function renderStatusInfo(status) {
  return el('div', { 'data-status-info': '' },
    infoRow('Penyimpanan persisten', status.persisted ? 'Aktif' : 'Tidak aktif'),
    infoRow('Status offline', status.offlineReady ? 'Siap' : 'Belum siap'),
    status.persisted
      ? null
      : el('p', { class: 'muted small info-note' }, 'Penyimpanan persisten biasanya baru aktif setelah aplikasi dipasang di HP.'),
  );
}

export function renderSettings({ settings, version, bank, status, handlers }) {
  // Input file disembunyikan; tombol "Impor progres" yang membukanya supaya tampilannya seragam
  const fileInput = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    class: 'visually-hidden',
    tabindex: '-1',
    'aria-hidden': 'true',
    onchange: () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (file) handlers.onImportFile(file);
    },
  });

  return el('div', {},
    screenHeader('Pengaturan'),

    section('Tampilan', el('div', { class: 'card' },
      choiceGroup({
        label: 'Tema',
        value: settings.theme,
        options: [
          { value: 'system', text: 'Ikuti sistem' },
          { value: 'light', text: 'Terang' },
          { value: 'dark', text: 'Gelap' },
        ],
        onSelect: (theme) => handlers.onChange({ theme }),
      }),
      choiceGroup({
        label: 'Ukuran teks',
        value: settings.textSize,
        options: [
          { value: 'normal', text: 'Normal' },
          { value: 'large', text: 'Besar' },
        ],
        onSelect: (textSize) => handlers.onChange({ textSize }),
      }),
      switchRow({
        label: 'Acak urutan opsi',
        description: 'Berlaku untuk sesi berikutnya',
        checked: settings.shuffleOptions,
        onChange: (shuffleOptions) => handlers.onChange({ shuffleOptions }),
      }),
    )),

    section('Data progres', el('div', { class: 'card stack' },
      el('p', { class: 'muted small' },
        'Progres hanya tersimpan di perangkat ini. Ekspor sesekali dan simpan filenya sebagai cadangan.'),
      el('button', { type: 'button', class: 'btn btn-secondary btn-block', onclick: handlers.onExport }, 'Ekspor progres'),
      el('button', { type: 'button', class: 'btn btn-secondary btn-block', onclick: () => fileInput.click() }, 'Impor progres'),
      fileInput,
      el('button', { type: 'button', class: 'btn btn-danger btn-block', onclick: handlers.onReset }, 'Hapus semua progres'),
    )),

    section('Info', el('div', { class: 'card' },
      infoRow('Versi aplikasi', version),
      infoRow('Bank soal', `versi ${bank.meta.versi}, ${bank.meta.jumlah} soal`),
      renderStatusInfo(status),
    )),

    section('Tentang', el('div', { class: 'card' }, el('p', {}, DISCLAIMER))),

    backHomeLink(),
  );
}
