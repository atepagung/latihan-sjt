// Layar Beranda: sesi yang bisa dilanjutkan, progres, tombol mode, dan ringkasan bank soal.
import { remainingSeconds } from '../quiz.js';
import { el, formatDuration } from '../ui.js';
import { MODE_LABELS, progressBar, screenHeader, stat } from './common.js';

function activeCard(active, { onResume, onEndActive }) {
  const total = active.ids.length;
  const left = remainingSeconds(active.deadline);
  return el('section', { class: 'card card-highlight', 'aria-labelledby': 'active-title' },
    el('h2', { id: 'active-title' }, 'Lanjutkan sesi'),
    el('p', {},
      el('strong', {}, MODE_LABELS[active.mode]),
      ` · Soal ${active.index + 1} dari ${total}`,
    ),
    left !== null ? el('p', { class: 'muted' }, `Sisa waktu ${formatDuration(left)}`) : null,
    el('div', { class: 'btn-row' },
      el('button', { type: 'button', class: 'btn btn-primary', onclick: onResume }, 'Lanjutkan'),
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: onEndActive }, 'Akhiri'),
    ),
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

function modeButtons({ retryCount, bookmarkCount, onStartRetry, onStartBookmarks }) {
  return el('nav', { class: 'home-actions', 'aria-label': 'Mode latihan' },
    el('div', { class: 'btn-row' },
      el('a', { class: 'btn btn-primary btn-large', href: '#/mulai/latihan' }, 'Latihan'),
      el('a', { class: 'btn btn-primary btn-large', href: '#/mulai/simulasi' }, 'Simulasi'),
    ),
    el('div', { class: 'stack' },
      el('button', {
        type: 'button', class: 'btn btn-secondary btn-block', disabled: retryCount === 0, onclick: onStartRetry,
      }, `Ulangi yang belum terbaik (${retryCount})`),
      el('button', {
        type: 'button', class: 'btn btn-secondary btn-block', disabled: bookmarkCount === 0, onclick: onStartBookmarks,
      }, `Ditandai (${bookmarkCount})`),
      el('div', { class: 'btn-row' },
        el('a', { class: 'btn btn-secondary', href: '#/statistik' }, 'Statistik'),
        el('a', { class: 'btn btn-secondary', href: '#/pengaturan' }, 'Pengaturan'),
      ),
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

export function renderHome({ version, bank, stats, active, bookmarkCount, handlers }) {
  return el('div', { class: 'stack' },
    screenHeader('Latihan SJT ASN', 'Situational Judgement Test, bisa dipakai offline'),
    active ? activeCard(active, handlers) : null,
    progressCard(bank, stats),
    modeButtons({
      retryCount: stats.needsReview.length,
      bookmarkCount,
      onStartRetry: handlers.onStartRetry,
      onStartBookmarks: handlers.onStartBookmarks,
    }),
    categoryCard(bank),
    el('footer', { class: 'app-footer' }, `Versi ${version}`),
  );
}
