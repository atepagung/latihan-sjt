"""Pemeriksa proyek Latihan SJT. Jalankan sebelum commit/push.

Pemakaian:
    python tools/validate.py          -> pemeriksaan statis (data, manifest, sw.js, path, versi)
    python tools/validate.py --http   -> ditambah uji unduh semua file lewat server lokal

Pemeriksaan yang belum relevan (misalnya sw.js belum dibuat) dilewati otomatis,
jadi skrip ini bisa dipakai sejak Fase 0. Keluar dengan kode 1 bila ada GAGAL.
Hanya memakai pustaka standar Python.
"""
import importlib.util
import json
import re
import sys
import threading
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "bank_soal_sjt_kemenkeu.json"
SW = ROOT / "sw.js"
CONFIG = ROOT / "js" / "config.js"
MANIFEST = ROOT / "manifest.webmanifest"
INDEX = ROOT / "index.html"

# Folder yang seluruh isinya wajib masuk APP_SHELL (di-cache untuk offline)
FOLDER_DI_CACHE = ["css", "js", "icons", "data"]

errors, warnings, oks = [], [], []


def gagal(msg):
    errors.append(msg)


def peringatan(msg):
    warnings.append(msg)


def ok(msg):
    oks.append(msg)


def rel(p):
    return p.relative_to(ROOT).as_posix()


# ---------------------------------------------------------------- data soal
def cek_data():
    if not DATA.exists():
        gagal(f"{rel(DATA)} tidak ditemukan")
        return
    try:
        d = json.loads(DATA.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        gagal(f"JSON soal rusak: baris {e.lineno} kolom {e.colno}: {e.msg}")
        return
    for k in ["judul", "versi", "kategori", "jumlah_soal", "soal"]:
        if k not in d:
            gagal(f"data: kunci '{k}' hilang di tingkat atas")
    if errors:
        return
    kode_kat = {k["kode"] for k in d["kategori"]}
    soal = d["soal"]
    if d["jumlah_soal"] != len(soal):
        gagal(f"data: jumlah_soal={d['jumlah_soal']} tetapi isi soal ada {len(soal)}")
    ids = Counter(s.get("id") for s in soal)
    for i, n in ids.items():
        if n > 1:
            gagal(f"data: id ganda {i} ({n} kali)")
    per_kat = Counter()
    pola_huruf = re.compile(r"\b(opsi|pilihan|jawaban)\s+[ABCD]\b", re.I)
    for s in soal:
        sid = s.get("id", "?")
        for k in ["id", "kategori", "kompetensi", "indikator", "skenario", "opsi", "jawaban_terbaik", "pembahasan"]:
            if not s.get(k):
                gagal(f"{sid}: field '{k}' kosong/hilang")
        kat = s.get("kategori")
        if kat not in kode_kat:
            gagal(f"{sid}: kategori '{kat}' tidak ada di daftar kategori")
        elif not re.fullmatch(rf"{kat}-\d{{3}}", sid):
            gagal(f"{sid}: format id harus {kat}-NNN")
        per_kat[kat] += 1
        opsi = s.get("opsi") or []
        kode = [o.get("kode") for o in opsi]
        if sorted(kode) != ["A", "B", "C", "D"]:
            gagal(f"{sid}: kode opsi harus A, B, C, D (sekarang {kode})")
        skor = sorted(o.get("skor") for o in opsi if isinstance(o.get("skor"), int))
        if skor != [1, 2, 3, 4]:
            gagal(f"{sid}: skor opsi harus 1, 2, 3, 4 masing-masing sekali (sekarang {skor})")
        terbaik = [o.get("kode") for o in opsi if o.get("skor") == 4]
        if terbaik and s.get("jawaban_terbaik") != terbaik[0]:
            gagal(f"{sid}: jawaban_terbaik={s.get('jawaban_terbaik')} tetapi skor 4 ada di {terbaik[0]}")
        if any(not (o.get("teks") or "").strip() for o in opsi):
            gagal(f"{sid}: ada teks opsi yang kosong")
        if pola_huruf.search(s.get("pembahasan") or ""):
            peringatan(f"{sid}: pembahasan menyebut huruf opsi, padahal urutan opsi diacak")
    for k in d["kategori"]:
        if k.get("jumlah_soal") != per_kat[k["kode"]]:
            gagal(f"data: kategori {k['kode']} tertulis {k.get('jumlah_soal')} soal, isi sebenarnya {per_kat[k['kode']]}")
    if not any(e.startswith(("data", *ids)) for e in errors):
        ringkas = ", ".join(f"{k} {per_kat[k]}" for k in sorted(per_kat))
        ok(f"data soal valid: {len(soal)} soal ({ringkas}), versi bank soal {d['versi']}")


# ---------------------------------------------------------------- manifest
def cek_manifest():
    if not MANIFEST.exists():
        peringatan("manifest.webmanifest belum ada (normal sebelum Fase 1)")
        return
    try:
        m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        gagal(f"manifest.webmanifest bukan JSON valid: {e.msg} (baris {e.lineno})")
        return
    n_err = len(errors)
    for k in ["name", "short_name", "start_url", "scope", "display", "icons", "theme_color", "background_color"]:
        if k not in m:
            gagal(f"manifest: kunci '{k}' wajib ada")
    for k in ["start_url", "scope", "id"]:
        v = m.get(k)
        if isinstance(v, str) and (v.startswith("/") or v.startswith("http")):
            gagal(f"manifest: {k}='{v}' harus relatif, misalnya './' (GitHub Pages memakai subfolder)")
    if m.get("display") not in ("standalone", "fullscreen", "minimal-ui"):
        gagal("manifest: display harus 'standalone'")
    ukuran = set()
    maskable = False
    for ic in m.get("icons", []):
        src = ic.get("src", "")
        if src.startswith("/") or src.startswith("http"):
            gagal(f"manifest: ikon '{src}' harus path relatif")
        elif not (ROOT / src).exists():
            gagal(f"manifest: file ikon '{src}' tidak ada")
        ukuran.update((ic.get("sizes") or "").split())
        if "maskable" in (ic.get("purpose") or ""):
            maskable = True
    for u in ["192x192", "512x512"]:
        if u not in ukuran:
            gagal(f"manifest: wajib ada ikon {u}")
    if not maskable:
        peringatan("manifest: sebaiknya ada ikon dengan purpose 'maskable'")
    if len(errors) == n_err:
        ok("manifest valid")


# ---------------------------------------------------------------- service worker
def baca_app_shell():
    teks = SW.read_text(encoding="utf-8")
    m = re.search(r"const\s+APP_SHELL\s*=\s*\[(.*?)\]\s*;", teks, re.S)
    if not m:
        return None, teks
    isi = re.sub(r"//.*", "", m.group(1))
    return re.findall(r"['\"]([^'\"]+)['\"]", isi), teks


def cek_sw():
    if not SW.exists():
        peringatan("sw.js belum ada (normal sebelum Fase 4), pemeriksaan offline dilewati")
        return None
    shell, teks = baca_app_shell()
    n_err = len(errors)
    mv = re.search(r"const\s+CACHE_VERSION\s*=\s*['\"]sjt-v(\d+\.\d+\.\d+)['\"]", teks)
    if not mv:
        gagal("sw.js: tidak ada baris  const CACHE_VERSION = 'sjt-vX.Y.Z';")
    if shell is None:
        gagal("sw.js: tidak ada  const APP_SHELL = [ ... ];")
        return None
    dup = [e for e, n in Counter(shell).items() if n > 1]
    for e in dup:
        gagal(f"sw.js: entri APP_SHELL ganda '{e}'")
    for e in shell:
        if not e.startswith("./"):
            gagal(f"sw.js: entri APP_SHELL '{e}' harus diawali './'")
            continue
        if e == "./":
            continue
        if e == "./sw.js":
            gagal("sw.js: jangan memasukkan sw.js ke APP_SHELL")
        if not (ROOT / e[2:]).is_file():
            gagal(f"sw.js: file di APP_SHELL tidak ada: {e}")
    wajib = {"./", "./index.html", "./manifest.webmanifest"}
    for folder in FOLDER_DI_CACHE:
        for p in (ROOT / folder).rglob("*"):
            if p.is_file() and not p.name.startswith("."):
                wajib.add("./" + rel(p))
    for e in sorted(wajib - set(shell)):
        if e == "./manifest.webmanifest" and not MANIFEST.exists():
            continue
        gagal(f"sw.js: file belum masuk APP_SHELL (tidak akan tersedia offline): {e}")
    if "skipWaiting" in teks and "SKIP_WAITING" not in teks:
        peringatan("sw.js: skipWaiting() dipanggil tanpa menunggu pesan SKIP_WAITING dari aplikasi")
    if "cache: 'reload'" not in teks and 'cache: "reload"' not in teks:
        peringatan("sw.js: saat install sebaiknya pakai new Request(url, { cache: 'reload' }) agar tidak mengambil file lama")
    if len(errors) == n_err:
        ok(f"sw.js valid: {len(shell)} entri APP_SHELL, versi cache {mv.group(1) if mv else '?'}")
    return mv.group(1) if mv else None


def cek_versi(v_sw):
    if not CONFIG.exists():
        peringatan("js/config.js belum ada (normal sebelum Fase 1)")
        return
    m = re.search(r"export\s+const\s+APP_VERSION\s*=\s*['\"](\d+\.\d+\.\d+)['\"]", CONFIG.read_text(encoding="utf-8"))
    if not m:
        gagal("js/config.js: tidak ada baris  export const APP_VERSION = 'X.Y.Z';")
        return
    if v_sw and v_sw != m.group(1):
        gagal(f"versi tidak sama: sw.js {v_sw}, js/config.js {m.group(1)}. Jalankan tools/bump_version.py")
    elif v_sw:
        ok(f"versi aplikasi {m.group(1)} sama di sw.js dan js/config.js")


# ---------------------------------------------------------------- path & URL luar
POLA_URL = re.compile(r"https?://(?!www\.w3\.org/)")
POLA_ABSOLUT = [
    re.compile(r"""(?:src|href)\s*=\s*["']/(?!/)"""),
    re.compile(r"""(?:from\s+|import\s*\(\s*|fetch\s*\(\s*|register\s*\(\s*)["'`]/(?!/)"""),
    re.compile(r"""url\(\s*["']?/(?!/)"""),
]


def baris_komentar(baris):
    s = baris.strip()
    return s.startswith(("//", "*", "/*", "<!--"))


def cek_kode():
    berkas = [INDEX, SW] + sorted((ROOT / "css").rglob("*.css")) + sorted((ROOT / "js").rglob("*.js"))
    berkas = [b for b in berkas if b.exists()]
    if not berkas:
        return
    n_err = len(errors)
    for b in berkas:
        for no, baris in enumerate(b.read_text(encoding="utf-8").splitlines(), 1):
            if baris_komentar(baris):
                continue
            if POLA_URL.search(baris):
                gagal(f"{rel(b)}:{no}: memuat URL luar (CDN/font/API). Semua aset harus lokal agar jalan offline")
            for p in POLA_ABSOLUT:
                if p.search(baris):
                    gagal(f"{rel(b)}:{no}: path absolut diawali '/'. Pakai path relatif './...'")
    if INDEX.exists():
        html = INDEX.read_text(encoding="utf-8")
        if 'rel="manifest"' not in html:
            gagal("index.html: belum ada <link rel=\"manifest\" href=\"./manifest.webmanifest\">")
        if 'name="viewport"' not in html:
            gagal("index.html: belum ada <meta name=\"viewport\" ...>")
        if 'name="theme-color"' not in html:
            peringatan("index.html: sebaiknya ada <meta name=\"theme-color\">")
        if re.search(r"\b(alert|confirm|prompt)\s*\(", html):
            gagal("index.html: jangan memakai alert/confirm/prompt, pakai dialog sendiri")
    for b in sorted((ROOT / "js").rglob("*.js")):
        if re.search(r"(?<![\w.])(window\.)?(alert|confirm|prompt)\s*\(", b.read_text(encoding="utf-8")):
            gagal(f"{rel(b)}: jangan memakai alert/confirm/prompt, pakai dialog sendiri")
    if len(errors) == n_err:
        ok(f"{len(berkas)} file kode: tanpa URL luar, tanpa path absolut")


# ---------------------------------------------------------------- uji HTTP
def cek_http():
    if not SW.exists():
        peringatan("--http dilewati karena sw.js belum ada")
        return
    shell, _ = baca_app_shell()
    if not shell:
        return
    spec = importlib.util.spec_from_file_location("serve", ROOT / "tools" / "serve.py")
    serve = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(serve)
    serve.Handler.log_message = lambda *a, **k: None  # senyapkan log server saat uji
    httpd = serve.buat_server(port=0)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    # Abaikan proxy kantor untuk alamat lokal
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    n_err = len(errors)
    target = list(dict.fromkeys(shell + ["./sw.js"]))
    try:
        for e in target:
            url = f"http://127.0.0.1:{port}/{e[2:]}"
            try:
                with opener.open(url, timeout=10) as r:
                    r.read()
                    tipe = r.headers.get("Content-Type", "")
                    if e.endswith(".js") and "javascript" not in tipe:
                        gagal(f"HTTP {e}: Content-Type '{tipe}', seharusnya text/javascript")
                    if e in ("./", "./index.html") and "text/html" not in tipe:
                        gagal(f"HTTP {e}: Content-Type '{tipe}', seharusnya text/html")
            except Exception as ex:  # noqa: BLE001
                gagal(f"HTTP {e}: gagal diunduh ({ex})")
    finally:
        httpd.shutdown()
    if len(errors) == n_err:
        ok(f"HTTP: {len(target)} file berhasil diunduh dengan tipe yang benar")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    cek_data()
    cek_manifest()
    v_sw = cek_sw()
    cek_versi(v_sw)
    cek_kode()
    if "--http" in sys.argv:
        cek_http()
    for m in oks:
        print(f"[OK]          {m}")
    for m in warnings:
        print(f"[PERINGATAN]  {m}")
    for m in errors:
        print(f"[GAGAL]       {m}")
    print()
    if errors:
        print(f"HASIL: {len(errors)} masalah harus diperbaiki.")
        sys.exit(1)
    print("HASIL: semua pemeriksaan lolos.")


if __name__ == "__main__":
    main()
