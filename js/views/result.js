// Layar Hasil sesi: skor, rincian per kategori dan kompetensi, serta daftar soal beserta pembahasan.
import { MAX_SCORE, percent, summarize } from '../quiz.js';
import { el, formatDuration } from '../ui.js';
import {
  MODE_LABELS, backHomeLink, categoryChip, choiceGroup, formatAverage, formatDateTime,
  progressBar, scoreBadge, screenHeader, section, stat,
} from './common.js';

function summaryCard(result) {
  const answered = result.items.filter((item) => item.kode).length;
  const seconds = Math.round((result.finishedAt - result.startedAt) / 1000);
  return el('div', { class: 'card result-summary' },
    el('p', { class: 'result-percent' }, `${percent(result.total, result.max)}%`),
    el('div', { class: 'stat-grid' },
      stat('Skor', `${result.total} dari ${result.max}`),
      stat('Durasi', formatDuration(seconds)),
      stat('Dijawab', `${answered} dari ${result.items.length}`),
      stat('Jawaban terbaik', String(result.items.filter((item) => item.skor === MAX_SCORE).length)),
    ),
  );
}

function categoryBars(summary, bank) {
  const order = bank.categories.map((c) => c.kode);
  const rows = [...summary.byCategory].sort((a, b) => order.indexOf(a.kode) - order.indexOf(b.kode));
  return el('div', { class: 'card' },
    rows.map((c) => el('div', { class: 'bar-row' },
      el('div', { class: 'bar-label' },
        el('span', {}, categoryChip(c.kode), ' ', c.nama),
        el('strong', {}, `${c.percent}%`),
      ),
      progressBar(c.total, c.max, `Skor ${c.nama}`),
    )),
  );
}

// Tabel per kompetensi: jumlah soal, rata-rata skor, persentase jawaban terbaik
export function competencyTable(rows, { countLabel = 'Soal' } = {}) {
  return el('table', { class: 'data-table' },
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col' }, 'Kompetensi'),
      el('th', { scope: 'col', class: 'num' }, countLabel),
      el('th', { scope: 'col', class: 'num' }, 'Rata-rata'),
      el('th', { scope: 'col', class: 'num' }, 'Terbaik'),
    )),
    el('tbody', {}, rows.map((c) => el('tr', {},
      el('td', {}, el('span', { class: 'table-chip' }, c.kategori), ' ', c.kompetensi),
      el('td', { class: 'num' }, String(c.countText ?? c.count)),
      el('td', { class: 'num' }, c.answered > 0 ? formatAverage(c.average) : '–'),
      el('td', { class: 'num' }, c.answered > 0 ? `${c.bestRate}%` : '–'),
    ))),
  );
}

function optionText(question, kode) {
  const option = question.opsi.find((o) => o.kode === kode);
  return option ? option.teks : '';
}

// Satu soal di daftar hasil; dibuka dengan mengetuk ringkasannya (elemen details bawaan HTML)
function reviewItem(item, number, question) {
  const best = question.opsi.find((o) => o.skor === MAX_SCORE);
  return el('details', { class: 'review-item' },
    el('summary', {},
      el('span', { class: 'review-title' }, `${number}. `, question.kompetensi, el('span', { class: 'muted small' }, ` · ${question.kategori}`)),
      item.kode ? scoreBadge(item.skor) : el('span', { class: 'score-badge s0' }, 'Kosong'),
    ),
    el('div', { class: 'review-body' },
      el('p', { class: 'scenario' }, question.skenario),
      el('h3', {}, 'Jawaban Anda'),
      item.kode
        ? el('p', {}, optionText(question, item.kode), ' ', scoreBadge(item.skor))
        : el('p', { class: 'muted' }, 'Tidak dijawab (skor 0)'),
      el('h3', {}, 'Jawaban terbaik'),
      el('p', {}, best.teks, ' ', scoreBadge(best.skor)),
      el('h3', {}, 'Pembahasan'),
      el('p', {}, question.pembahasan),
    ),
  );
}

function reviewList(result, bank) {
  const numbered = result.items
    .map((item, i) => ({ item, number: i + 1, question: bank.byId.get(item.id) }))
    .filter((entry) => entry.question);
  const list = el('div', { class: 'review-list' });

  function show(filter) {
    const shown = filter === 'weak' ? numbered.filter((e) => e.item.skor < MAX_SCORE) : numbered;
    list.replaceChildren(...(shown.length > 0
      ? shown.map((e) => reviewItem(e.item, e.number, e.question))
      : [el('p', { class: 'muted' }, 'Semua jawaban sudah terbaik.')]));
  }
  show('all');

  return el('div', {},
    choiceGroup({
      label: 'Tampilkan',
      value: 'all',
      options: [{ value: 'all', text: 'Semua' }, { value: 'weak', text: 'Belum terbaik' }],
      onSelect: show,
    }),
    list,
  );
}

export function renderResult({ result, bank, onRetryWeak }) {
  if (!result) {
    return el('div', {},
      screenHeader('Hasil tidak ditemukan', 'Riwayat sesi ini mungkin sudah terhapus.'),
      backHomeLink('Ke beranda'),
    );
  }
  const summary = summarize(result.items, bank.byId);
  const weakCount = result.items.filter((item) => item.skor < MAX_SCORE).length;

  return el('div', {},
    screenHeader('Hasil sesi', `${MODE_LABELS[result.mode] || result.mode} · ${formatDateTime(result.finishedAt)}`),
    summaryCard(result),
    section('Per kategori', categoryBars(summary, bank)),
    section('Per kompetensi', el('div', { class: 'card table-card' }, competencyTable(summary.byCompetency))),
    section('Daftar soal', reviewList(result, bank)),
    el('div', { class: 'stack section' },
      el('button', {
        type: 'button', class: 'btn btn-primary btn-block', disabled: weakCount === 0, onclick: onRetryWeak,
      }, `Latihan ulang soal yang belum terbaik (${weakCount})`),
      backHomeLink('Ke beranda'),
    ),
  );
}
