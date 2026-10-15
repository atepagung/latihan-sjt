// Helper DOM kecil yang dipakai semua layar: membuat elemen, toast, dialog, format waktu.

// Membuat elemen dalam satu baris, supaya kode layar tidak penuh createElement.
// Contoh: el('a', { class: 'btn', href: '#/' }, 'Beranda')
// - kunci yang diawali "on" dan berisi fungsi menjadi event listener (onclick → click)
// - nilai null, undefined, atau false dilewati, true menjadi atribut kosong (misalnya disabled)
// - atribut aria-* yang berisi true/false harus ditulis sebagai teks: 'true' atau 'false'
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') {
      node.className = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else {
      node.setAttribute(key, value === true ? '' : value);
    }
  }
  const kids = children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
  node.append(...kids);
  return node;
}

// Pesan singkat di bawah layar yang hilang sendiri.
// Wadahnya ber-role="status", jadi pembaca layar ikut membacakannya.
export function showToast(text, duration = 3000) {
  const container = document.getElementById('toast');
  if (!container) return;
  const toast = el('div', { class: 'toast' }, text);
  container.append(toast);
  setTimeout(() => toast.remove(), duration);
}

// Dialog konfirmasi pengganti bawaan browser. Mengembalikan Promise berisi true (setuju) atau false.
// Tombol Batal diletakkan lebih dulu supaya fokus awal jatuh ke pilihan yang aman.
export function confirmDialog({ title, message, confirmText = 'Ya', cancelText = 'Batal', danger = false }) {
  const dialog = document.getElementById('dialog');
  const form = el('form', { method: 'dialog' },
    el('h2', { id: 'dialog-title' }, title),
    message ? el('p', {}, message) : null,
    el('div', { class: 'dialog-actions' },
      el('button', { type: 'submit', value: 'cancel', class: 'btn btn-secondary' }, cancelText),
      el('button', { type: 'submit', value: 'confirm', class: danger ? 'btn btn-danger' : 'btn btn-primary' }, confirmText),
    ),
  );
  dialog.replaceChildren(form);
  // Dikosongkan dulu, karena menutup dengan tombol Esc tidak mengubah returnValue lama
  dialog.returnValue = '';
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}

// Dialog berisi konten bebas dengan satu tombol Tutup, misalnya grid Daftar soal.
// Elemen di dalam content yang diberi atribut autofocus akan mendapat fokus awal.
export function showDialog({ title, content, closeText = 'Tutup' }) {
  const dialog = document.getElementById('dialog');
  dialog.replaceChildren(el('form', { method: 'dialog' },
    el('h2', { id: 'dialog-title' }, title),
    content,
    el('div', { class: 'dialog-actions' },
      el('button', { type: 'submit', value: 'close', class: 'btn btn-secondary' }, closeText),
    ),
  ));
  dialog.returnValue = '';
  dialog.showModal();
}

// Menutup dialog yang sedang terbuka (misalnya saat waktu simulasi habis).
// Dialog konfirmasi yang ditutup dengan cara ini dianggap dibatalkan.
export function closeDialog() {
  const dialog = document.getElementById('dialog');
  if (dialog && dialog.open) dialog.close();
}

// Membacakan teks lewat pembaca layar tanpa menampilkannya, melalui wadah aria-live di index.html.
// Dikosongkan dulu supaya teks yang sama tetap dibacakan ulang.
export function announce(text) {
  const region = document.getElementById('announcer');
  if (!region) return;
  region.textContent = '';
  setTimeout(() => {
    region.textContent = text;
  }, 50);
}

// Mengubah jumlah detik menjadi teks mm:ss, atau j:mm:ss bila satu jam atau lebih.
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}
