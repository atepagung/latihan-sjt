// Layar Statistik: dihitung dari jawaban terakhir setiap soal, ditambah riwayat sesi.
import { SESSION_HISTORY_LIMIT } from '../config.js';
import { percent } from '../quiz.js';
import { el } from '../ui.js';
import {
  MODE_LABELS, formatAverage, formatDateTime, progressBar, screenHeader, section, stat,
} from './common.js';
import { competencyTable } from './result.js';

function overviewCard(bank, stats) {
  return el('div', { class: 'card' },
    el('p', { class: 'progress-count' },
      el('strong', {}, `${stats.answeredCount} dari ${bank.meta.jumlah}`),
      ' soal pernah dikerjakan',
    ),
    progressBar(stats.answeredCount, bank.meta.jumlah, 'Soal yang pernah dikerjakan'),
    el('div', { class: 'stat-grid' },
      stat('Rata-rata skor (1–4)', stats.answeredCount > 0 ? formatAverage(stats.average) : '–'),
      stat('Jawaban terbaik', stats.answeredCount > 0 ? `${stats.bestRate}%` : '–'),
    ),
  );
}

function weakestCard(stats) {
  if (stats.weakest.length === 0) {
    return el('div', { class: 'card' },
      el('p', { class: 'muted' }, 'Belum cukup data. Kompetensi baru dinilai setelah minimal 3 soalnya dikerjakan.'),
    );
  }
  return el('div', { class: 'card card-highlight' },
    el('ol', { class: 'weak-list' },
      stats.weakest.map((c) => el('li', {},
        el('span', {}, el('strong', {}, c.kompetensi), el('span', { class: 'muted small' }, ` · ${c.kategori}`)),
        el('span', { class: 'muted small' }, `rata-rata ${formatAverage(c.average)} dari ${c.answered} soal`),
      )),
    ),
  );
}

function categoryTable(bank, stats) {
  return el('table', { class: 'data-table' },
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col' }, 'Kategori'),
      el('th', { scope: 'col', class: 'num' }, 'Dikerjakan'),
      el('th', { scope: 'col', class: 'num' }, 'Rata-rata'),
      el('th', { scope: 'col', class: 'num' }, 'Terbaik'),
    )),
    el('tbody', {}, bank.categories.map((c) => {
      const row = stats.byCategory.find((r) => r.kode === c.kode);
      return el('tr', {},
        el('td', {}, el('span', { class: 'table-chip' }, c.kode), ' ', c.nama),
        el('td', { class: 'num' }, `${row ? row.answered : 0}/${c.count}`),
        el('td', { class: 'num' }, row && row.answered > 0 ? formatAverage(row.average) : '–'),
        el('td', { class: 'num' }, row && row.answered > 0 ? `${row.bestRate}%` : '–'),
      );
    })),
  );
}

// Semua kompetensi di bank soal, termasuk yang belum dikerjakan, supaya terlihat apa yang belum disentuh
function competencyRows(bank, stats) {
  const rows = [];
  for (const c of bank.categories) {
    for (const comp of bank.competenciesByCategory[c.kode] || []) {
      const row = stats.byCompetency.find((r) => r.key === comp.key);
      rows.push({
        kategori: comp.kategori,
        kompetensi: comp.kompetensi,
        answered: row ? row.answered : 0,
        average: row ? row.average : 0,
        bestRate: row ? row.bestRate : 0,
        countText: `${row ? row.answered : 0}/${comp.count}`,
      });
    }
  }
  return rows;
}

function historyList(sessions) {
  const recent = sessions.slice(-SESSION_HISTORY_LIMIT).reverse();
  if (recent.length === 0) return el('p', { class: 'muted' }, 'Belum ada sesi yang selesai.');
  return el('ul', { class: 'history-list' },
    recent.map((s) => el('li', {},
      el('a', { class: 'card card-link history-item', href: `#/hasil/${s.id}` },
        el('span', {},
          el('strong', {}, MODE_LABELS[s.mode] || s.mode),
          el('span', { class: 'muted small history-date' }, formatDateTime(s.finishedAt)),
        ),
        el('span', { class: 'history-percent' }, `${percent(s.total, s.max)}%`),
      ),
    )),
  );
}

export function renderStats({ bank, stats, sessions }) {
  return el('div', {},
    screenHeader('Statistik', 'Dihitung dari jawaban terakhir setiap soal'),
    overviewCard(bank, stats),
    section('Kompetensi terlemah', weakestCard(stats)),
    section('Per kategori', el('div', { class: 'card table-card' }, categoryTable(bank, stats))),
    section('Per kompetensi', el('div', { class: 'card table-card' },
      competencyTable(competencyRows(bank, stats), { countLabel: 'Dikerjakan' }))),
    section(`Riwayat ${SESSION_HISTORY_LIMIT} sesi terakhir`, historyList(sessions)),
    el('a', { class: 'btn btn-secondary btn-block', href: '#/' }, 'Kembali ke Beranda'),
  );
}
