// Versi aplikasi. Ubah lewat: python tools/bump_version.py patch
export const APP_VERSION = '1.0.0';
export const STORAGE_KEY = 'sjt.v1';
export const DATA_URL = './data/bank_soal_sjt_kemenkeu.json';
export const SESSION_HISTORY_LIMIT = 30;
export const ATTEMPTS_PER_QUESTION = 5;
export const SECONDS_PER_QUESTION = 60;

// Batas jumlah soal untuk mode Ulangi dan Ditandai, yang langsung mulai tanpa layar atur
export const QUICK_SESSION_LIMIT = 30;

// Pengaturan bawaan untuk pengguna baru, atau bila nilai tersimpan tidak dikenali
export const DEFAULT_SETTINGS = Object.freeze({ theme: 'system', textSize: 'normal', shuffleOptions: true });
