"""Menaikkan nomor versi aplikasi di dua tempat sekaligus.

Versi wajib dinaikkan setiap kali ada file yang di-cache berubah (soal, HTML,
CSS, JS, ikon, manifest). Tanpa itu, HP akan terus memakai versi lama.

Pemakaian:
    python tools/bump_version.py patch     -> 1.0.0 menjadi 1.0.1 (perbaikan kecil, update soal)
    python tools/bump_version.py minor     -> 1.0.1 menjadi 1.1.0 (fitur baru)
    python tools/bump_version.py major     -> 1.1.0 menjadi 2.0.0
    python tools/bump_version.py 1.2.3     -> set versi tertentu

File yang diubah:
    sw.js          : const CACHE_VERSION = 'sjt-v1.0.0';
    js/config.js   : export const APP_VERSION = '1.0.0';
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW = ROOT / "sw.js"
CONFIG = ROOT / "js" / "config.js"

POLA_SW = re.compile(r"(const\s+CACHE_VERSION\s*=\s*['\"]sjt-v)(\d+\.\d+\.\d+)(['\"])")
POLA_CONFIG = re.compile(r"(export\s+const\s+APP_VERSION\s*=\s*['\"])(\d+\.\d+\.\d+)(['\"])")


def baca_versi(path, pola):
    if not path.exists():
        sys.exit(f"GAGAL: {path.relative_to(ROOT)} belum ada.")
    m = pola.search(path.read_text(encoding="utf-8"))
    if not m:
        sys.exit(f"GAGAL: pola versi tidak ditemukan di {path.relative_to(ROOT)}.")
    return m.group(2)


def naikkan(versi, jenis):
    major, minor, patch = (int(x) for x in versi.split("."))
    if jenis == "major":
        return f"{major + 1}.0.0"
    if jenis == "minor":
        return f"{major}.{minor + 1}.0"
    if jenis == "patch":
        return f"{major}.{minor}.{patch + 1}"
    if re.fullmatch(r"\d+\.\d+\.\d+", jenis):
        return jenis
    sys.exit("Argumen harus patch, minor, major, atau versi seperti 1.2.3")


def tulis(path, pola, baru):
    teks = path.read_text(encoding="utf-8")
    path.write_text(pola.sub(lambda m: m.group(1) + baru + m.group(3), teks, count=1), encoding="utf-8")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    v_sw = baca_versi(SW, POLA_SW)
    v_cfg = baca_versi(CONFIG, POLA_CONFIG)
    if v_sw != v_cfg:
        print(f"PERINGATAN: versi tidak sama (sw.js {v_sw}, config.js {v_cfg}). Memakai sw.js sebagai acuan.")
    baru = naikkan(v_sw, sys.argv[1])
    tulis(SW, POLA_SW, baru)
    tulis(CONFIG, POLA_CONFIG, baru)
    print(f"Versi {v_sw} -> {baru} (sw.js dan js/config.js sudah diperbarui)")


if __name__ == "__main__":
    main()
