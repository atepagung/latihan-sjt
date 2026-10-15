// Layar mengerjakan soal (satu soal per layar) dan grid Daftar soal untuk simulasi.
import { MAX_SCORE, OPTION_CODES, answeredCount, scoreOf } from '../quiz.js';
import { el, formatDuration } from '../ui.js';
import { categoryChip, progressBar, scoreBadge, srOnly, tag } from './common.js';

// Huruf di layar mengikuti posisi tampil, bukan kode asli di JSON
const LETTERS = ['A', 'B', 'C', 'D'];

function bookmarkButton(bookmarked, onToggle) {
  return el('button', {
    type: 'button',
    class: 'icon-btn bookmark',
    'aria-pressed': String(bookmarked),
    'aria-label': 'Tandai soal',
    'data-focus': 'bookmark',
    onclick: onToggle,
  }, bookmarked ? '★' : '☆');
}

function sessionTop({ session, question, bookmarked, remaining, handlers }) {
  const total = session.ids.length;
  const position = session.index + 1;
  const isSimulation = session.mode === 'simulasi';
  return el('div', { class: 'session-top' },
    el('div', { class: 'session-row' },
      el('h1', { class: 'question-title' }, `Soal ${position} dari ${total}`),
      isSimulation
        ? el('span', {
          class: `timer${remaining < 60 ? ' is-warning' : ''}`,
          role: 'timer',
          'data-timer': '',
          'aria-label': 'Sisa waktu',
        }, formatDuration(remaining))
        : null,
    ),
    progressBar(position, total, 'Posisi soal'),
    el('div', { class: 'session-meta' },
      categoryChip(question.kategori),
      el('span', { class: 'competency' }, question.kompetensi),
      bookmarkButton(bookmarked, handlers.onToggleBookmark),
    ),
    isSimulation
      ? el('div', { class: 'session-tools' },
        el('span', { class: 'muted small' }, `Dijawab ${answeredCount(session)} dari ${total}`),
        el('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: handlers.onOpenGrid }, 'Daftar soal'),
        el('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: handlers.onFinish }, 'Selesai'),
      )
      : null,
  );
}

// Satu tombol opsi. Di latihan yang sudah dijawab, opsi terkunci dan menampilkan skor serta label.
function optionButton({ option, letter, isSimulation, chosen, revealed, onAnswer }) {
  const isChosen = chosen === option.kode;
  const isBest = option.skor === MAX_SCORE;
  const classes = ['option'];
  if (revealed) {
    classes.push('is-locked');
    if (isChosen) classes.push('is-chosen');
    if (isBest) classes.push('is-best');
  }
  return el('button', {
    type: 'button',
    class: classes.join(' '),
    'data-focus': `option-${option.kode}`,
    'aria-pressed': isSimulation ? String(isChosen) : null,
    'aria-disabled': revealed ? 'true' : null,
    onclick: () => {
      if (!revealed) onAnswer(option.kode);
    },
  },
  el('span', { class: 'option-letter' }, letter),
  el('span', { class: 'option-body' },
    el('span', { class: 'option-text' }, option.teks),
    revealed
      ? el('span', { class: 'option-meta' },
        scoreBadge(option.skor),
        isChosen ? tag('Pilihan Anda', 'tag-chosen') : null,
        isBest ? tag('Terbaik', 'tag-best') : null,
      )
      : null,
  ),
  );
}

function feedback(question, chosen) {
  const skor = scoreOf(question, chosen);
  return el('div', { class: 'feedback' },
    el('p', { class: `feedback-score s${skor}` }, 'Skor Anda ', el('strong', {}, `${skor} dari ${MAX_SCORE}`)),
    el('section', { class: 'card explanation', 'aria-labelledby': 'explanation-title' },
      el('h2', { id: 'explanation-title' }, 'Pembahasan'),
      el('p', {}, question.pembahasan),
    ),
  );
}

function actionBar({ session, revealed, handlers }) {
  const isLast = session.index === session.ids.length - 1;
  if (session.mode === 'simulasi') {
    return el('div', { class: 'action-bar' },
      el('button', {
        type: 'button', class: 'btn btn-secondary', disabled: session.index === 0, onclick: handlers.onPrev,
      }, 'Sebelumnya'),
      isLast
        ? el('button', { type: 'button', class: 'btn btn-primary', onclick: handlers.onFinish }, 'Selesai')
        : el('button', { type: 'button', class: 'btn btn-primary', onclick: handlers.onNext }, 'Berikutnya'),
    );
  }
  return el('div', { class: 'action-bar' },
    el('a', { class: 'btn btn-secondary', href: '#/' }, 'Beranda'),
    revealed
      ? el('button', {
        type: 'button', class: 'btn btn-primary', 'data-focus': 'next', onclick: handlers.onNext,
      }, isLast ? 'Lihat hasil' : 'Lanjut')
      : null,
  );
}

export function renderSession({ session, question, bookmarked, remaining, handlers }) {
  const isSimulation = session.mode === 'simulasi';
  const chosen = session.answers[question.id] || null;
  const revealed = !isSimulation && Boolean(session.revealed[question.id]);
  const order = session.optionOrder[question.id] || OPTION_CODES;

  return el('div', { class: 'session' },
    sessionTop({ session, question, bookmarked, remaining, handlers }),
    el('p', { class: 'scenario' }, question.skenario),
    el('div', { class: 'options', role: 'group', 'aria-label': 'Pilihan jawaban' },
      order.map((kode, i) => optionButton({
        option: question.opsi.find((o) => o.kode === kode),
        letter: LETTERS[i],
        isSimulation,
        chosen,
        revealed,
        onAnswer: handlers.onAnswer,
      })),
    ),
    revealed ? feedback(question, chosen) : null,
    actionBar({ session, revealed, handlers }),
  );
}

// Isi dialog Daftar soal: nomor yang sudah dijawab dibedakan warnanya, nomor yang sedang dibuka diberi garis.
export function renderQuestionGrid({ session, onJump }) {
  return el('div', {},
    el('div', { class: 'grid-legend small' },
      el('span', {}, el('span', { class: 'legend-box answered', 'aria-hidden': 'true' }), 'Sudah dijawab'),
      el('span', {}, el('span', { class: 'legend-box', 'aria-hidden': 'true' }), 'Belum dijawab'),
    ),
    el('div', { class: 'question-grid' },
      session.ids.map((id, i) => {
        const answered = Boolean(session.answers[id]);
        const current = i === session.index;
        return el('button', {
          type: 'button',
          class: `qnum${answered ? ' answered' : ''}${current ? ' current' : ''}`,
          autofocus: current,
          'aria-current': current ? 'true' : null,
          onclick: () => onJump(i),
        }, String(i + 1), srOnly(answered ? ', sudah dijawab' : ', belum dijawab'));
      }),
    ),
  );
}
