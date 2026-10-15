// Layar Atur latihan dan Atur simulasi. Pilihan disimpan di variabel lokal layar;
// jumlah soal yang cocok dihitung ulang setiap kali pilihan berubah.
import { SECONDS_PER_QUESTION } from '../config.js';
import { buildPool } from '../quiz.js';
import { el } from '../ui.js';
import { choiceGroup, screenHeader, switchRow, toggleChip } from './common.js';

function categoryField(bank, selected, onChange) {
  return el('fieldset', { class: 'field' },
    el('legend', {}, 'Kategori'),
    el('div', { class: 'chip-row' },
      bank.categories.map((c) => toggleChip({
        text: `${c.kode} · ${c.count}`,
        pressed: selected.has(c.kode),
        onToggle: (on) => {
          if (on) selected.add(c.kode);
          else selected.delete(c.kode);
          onChange();
        },
      })),
    ),
  );
}

// Bagian bawah layar atur: keterangan jumlah soal dan tombol Mulai yang menempel di bawah
function startBar(summary, startButton) {
  return el('div', { class: 'action-bar action-bar-column' }, summary, startButton);
}

export function renderPracticeSetup({ bank, attempts, onStart }) {
  const state = {
    categories: new Set(bank.categories.map((c) => c.kode)),
    competencies: new Set(),
    count: 20,
    preferNew: true,
  };
  const filter = () => ({
    categories: [...state.categories],
    competencies: [...state.competencies],
    count: state.count,
    preferNew: state.preferNew,
  });

  const summary = el('p', { class: 'setup-summary', 'aria-live': 'polite' });
  const startButton = el('button', {
    type: 'button', class: 'btn btn-primary btn-block', onclick: () => onStart(filter()),
  }, 'Mulai');
  const competencyBox = el('div', { class: 'competency-box' });

  function refresh() {
    const available = state.categories.size === 0 ? 0 : buildPool(bank.questions, filter(), attempts).length;
    if (state.categories.size === 0) {
      summary.textContent = 'Pilih minimal satu kategori.';
    } else if (available === 0) {
      summary.textContent = 'Tidak ada soal yang cocok dengan pilihan ini.';
    } else {
      const take = state.count === null ? available : Math.min(state.count, available);
      summary.textContent = `${available} soal cocok. Sesi ini berisi ${take} soal.`;
    }
    startButton.disabled = available === 0;
  }

  // Daftar kompetensi mengikuti kategori terpilih; pilihan dari kategori yang dilepas ikut dibuang
  function renderCompetencies() {
    for (const key of [...state.competencies]) {
      if (!state.categories.has(key.split('|')[0])) state.competencies.delete(key);
    }
    const groups = bank.categories
      .filter((c) => state.categories.has(c.kode))
      .map((c) => el('div', { class: 'chip-group' },
        el('p', { class: 'chip-group-title' }, c.nama),
        el('div', { class: 'chip-row' },
          (bank.competenciesByCategory[c.kode] || []).map((comp) => toggleChip({
            text: comp.kompetensi,
            pressed: state.competencies.has(comp.key),
            onToggle: (on) => {
              if (on) state.competencies.add(comp.key);
              else state.competencies.delete(comp.key);
              refresh();
            },
          })),
        ),
      ));
    competencyBox.replaceChildren(...(groups.length > 0 ? groups : [el('p', { class: 'muted small' }, 'Pilih kategori dulu.')]));
  }

  renderCompetencies();
  refresh();

  return el('div', {},
    screenHeader('Atur latihan', 'Skor dan pembahasan tampil langsung setelah menjawab'),
    el('div', { class: 'card' },
      categoryField(bank, state.categories, () => {
        renderCompetencies();
        refresh();
      }),
      el('fieldset', { class: 'field' },
        el('legend', {}, 'Kompetensi (opsional)'),
        el('p', { class: 'muted small field-help' }, 'Biarkan kosong untuk memakai semua kompetensi.'),
        competencyBox,
      ),
      choiceGroup({
        label: 'Jumlah soal',
        value: state.count,
        options: [
          { value: 10, text: '10' },
          { value: 20, text: '20' },
          { value: 30, text: '30' },
          { value: null, text: 'Semua' },
        ],
        onSelect: (count) => {
          state.count = count;
          refresh();
        },
      }),
      switchRow({
        label: 'Utamakan soal yang belum pernah dikerjakan',
        description: 'Setelah itu soal dengan skor terakhir terendah',
        checked: state.preferNew,
        onChange: (on) => {
          state.preferNew = on;
        },
      }),
    ),
    startBar(summary, startButton),
  );
}

export function renderSimulationSetup({ bank, onStart }) {
  const state = { categories: new Set(bank.categories.map((c) => c.kode)), count: 30 };

  const summary = el('p', { class: 'setup-summary', 'aria-live': 'polite' });
  const startButton = el('button', {
    type: 'button',
    class: 'btn btn-primary btn-block',
    onclick: () => onStart({ categories: [...state.categories], count: state.count }),
  }, 'Mulai simulasi');

  function refresh() {
    const available = state.categories.size === 0
      ? 0
      : buildPool(bank.questions, { categories: [...state.categories], preferNew: false }).length;
    if (state.categories.size === 0) {
      summary.textContent = 'Pilih minimal satu kategori.';
    } else if (available === 0) {
      summary.textContent = 'Tidak ada soal di kategori ini.';
    } else {
      const take = Math.min(state.count, available);
      const minutes = Math.round((take * SECONDS_PER_QUESTION) / 60);
      summary.textContent = `${take} soal, durasi ${minutes} menit.`;
    }
    startButton.disabled = available === 0;
  }

  refresh();

  return el('div', {},
    screenHeader('Atur simulasi', 'Tanpa umpan balik, dengan batas waktu satu menit per soal'),
    el('div', { class: 'card' },
      categoryField(bank, state.categories, refresh),
      choiceGroup({
        label: 'Jumlah soal',
        value: state.count,
        options: [
          { value: 20, text: '20' },
          { value: 30, text: '30' },
          { value: 50, text: '50' },
        ],
        onSelect: (count) => {
          state.count = count;
          refresh();
        },
      }),
      el('p', { class: 'muted small' },
        'Jawaban bisa diganti selama waktu masih ada. Skor dan pembahasan tampil setelah simulasi selesai.'),
    ),
    startBar(summary, startButton),
  );
}
