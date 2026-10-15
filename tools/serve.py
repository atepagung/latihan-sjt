"""Server lokal untuk menguji aplikasi di laptop.

Pemakaian (dari folder mana pun):
    python tools/serve.py            -> http://localhost:8080
    python tools/serve.py 8090       -> pakai port lain bila 8080 terpakai

Kenapa tidak cukup `python -m http.server`?
- Di sebagian laptop Windows, file .js dikirim dengan tipe text/plain sehingga
  modul JavaScript (import/export) gagal dimuat. Server ini memaksa tipe yang benar.
- Server ini mengirim header "Cache-Control: no-store" supaya setiap perubahan
  file langsung terlihat saat halaman dimuat ulang.

Hanya memakai pustaka standar Python. Tekan Ctrl+C untuk berhenti.
"""
import functools
import http.server
import socketserver
import sys
from pathlib import Path

# Folder proyek = satu tingkat di atas folder tools/
ROOT = Path(__file__).resolve().parent.parent

TIPE_FILE = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".md": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TIPE_FILE}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def copyfile(self, source, outputfile):
        # Browser kadang membatalkan unduhan di tengah jalan; itu normal, jangan tampilkan error
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def log_message(self, format, *args):
        # Log ringkas: metode, path, kode status
        sys.stderr.write("  %s\n" % (format % args))


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def buat_server(port=8080, host="127.0.0.1"):
    handler = functools.partial(Handler, directory=str(ROOT))
    return Server((host, port), handler)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    try:
        httpd = buat_server(port)
    except OSError:
        print(f"Port {port} sedang dipakai. Coba: python tools/serve.py {port + 10}")
        sys.exit(1)
    print(f"Menyajikan folder: {ROOT}")
    print(f"Buka di Chrome  : http://localhost:{port}/")
    print("Berhenti        : tekan Ctrl+C")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")


if __name__ == "__main__":
    main()
