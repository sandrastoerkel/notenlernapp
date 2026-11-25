#!/usr/bin/env python3
# Gegenprobe für src/qr.js (Welle 11, Schritt 10) mit einem unabhängigen Leser – NICHT Teil von npm test.
#
# Ablauf: node erzeugt mit qrSvg() die SVGs für mehrere Links (Version 1 bis 10), Playwright (Chromium)
# rendert sie samt einem Rand der Seitenfläche als PNG – hell und dunkel (prefers-color-scheme: dark, dunkler Seitenhintergrund), dazu die
# Tokens --qr-dark/--qr-light so, wie die App sie setzt (schwarz auf weiß) –, und unabhängige Leser lesen
# die Bilder:
#   cv2      cv2.QRCodeDetector (klassischer OpenCV-Leser)
#   aruco    cv2.QRCodeDetectorAruco (OpenCV, anderer Suchmuster-Finder)
#   wechat   cv2.wechat_qrcode.WeChatQRCode (OpenCV contrib, ohne Modelldateien)
#   zbar     libzbar.so.0 über ctypes, falls im System vorhanden (eigene Implementierung, nicht OpenCV)
# Bestanden, wenn kein Leser einen falschen Text liefert und mindestens zwei Leser den Text genau lesen.
# Hinweis: Der klassische cv2.QRCodeDetector findet bei einzelnen gültigen Codes die Suchmuster nicht
# (abhängig von Daten, Maske und Bildgröße, gehäuft bei Version 8; die anderen Leser lesen dieselben Bilder) –
# das wird angezeigt, ist aber kein Fehler des Codes: In der Prüfung von Schritt 10 fiel er bei Codes aus
# OpenCVs eigenem Encoder genauso oft aus (94 von 624 Bildern gegenüber 88 von 624 bei qr.js).
# Dazu ein Vergleich Modul für Modul mit cv2.QRCodeEncoder (Byte-Modus, M, gleiche Maske): Alle Module müssen
# gleich sein – außer den 7 Restbits der Versionen 2 bis 6 (dort setzt OpenCV einzelne Bits anders; Restbits
# tragen keine Daten).
#
# Aufruf im Repo:   python3 docs/screens/qr-gegenprobe.py        (Bilder: BILDER=/pfad, sonst ein Temp-Ordner)
# Braucht: node, Python-Paket playwright mit Chromium, opencv-python (cv2). Ende mit Code 1 bei einem Fehler.
import json
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np

import ctypes
import ctypes.util

from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BASIS = "https://sandrastoerkel.github.io/notenlernapp/"

LINKS = [
    BASIS + "#klasse=6",
    BASIS + "#klasse=keine",
    BASIS + "#klasse=13&zweig=mug",
    BASIS + "#klasse=6&dran=intervalle:6,akkorde:1",
    BASIS + "#klasse=8&zweig=mug&dran=noten:8,notenwerte:10,intervalle:4,tonleitern:5,akkorde:6",
    "Notenheld",  # Version 1
    "Übung: Fis, Es, c', c''",  # UTF-8
]
# längere #dran=…-Varianten bis an die Grenze von Version 10 (213 Bytes)
for ziel in (122, 152, 180, 213):
    l = BASIS + "#klasse=7&dran=noten:8,notenwerte:10,intervalle:4,tonleitern:5,akkorde:6"
    i = 0
    while len(l.encode()) < ziel:
        l += (",x" if i else "&x=") + str(i % 10)
        i += 1
    LINKS.append(l[: ziel] if len(l.encode()) > ziel else l)

JS = """
import { qrSvg, qrMatrix } from "./src/qr.js";
const links = JSON.parse(process.argv[1]);
console.log(JSON.stringify(links.map((t) => ({ t, v: qrMatrix(t)?.version, svg: qrSvg(t, { scale: 6 }) }))));
"""

JS_MASKE = """
import { qrMatrix } from "./src/qr.js";
const [texte, masken] = JSON.parse(process.argv[1]);
console.log(JSON.stringify(texte.map((t, i) => qrMatrix(t, { mask: masken[i] }).modules.map((r) => r.map((c) => (c ? 1 : 0))))));
"""


def format_m(maske):
    rest = maske
    for _ in range(10):
        rest = (rest << 1) ^ ((rest >> 9) * 0x537)
    return ((maske << 10) | rest) ^ 0x5412


def vergleich_encoder(texte):
    """Vergleicht qr.js Modul für Modul mit cv2.QRCodeEncoder; gibt die Zahl der Abweichungen zurück."""
    if not hasattr(cv2, "QRCodeEncoder_create"):
        print("Encoder-Vergleich übersprungen (cv2.QRCodeEncoder fehlt)")
        return 0
    masken_zu = {format_m(k): k for k in range(8)}
    bezug, masken = [], []
    for t in texte:
        par = cv2.QRCodeEncoder_Params()
        par.correction_level = cv2.QRCodeEncoder_CORRECT_LEVEL_M
        par.mode = cv2.QRCodeEncoder_MODE_BYTE
        bild = cv2.QRCodeEncoder_create(par).encode(t)
        ys, xs = np.where(bild == 0)
        m = (bild[ys.min():ys.max() + 1, xs.min():xs.max() + 1] == 0).astype(int)
        n = m.shape[0]
        bits = sum(int(m[8][n - 1 - i]) << i for i in range(8)) | sum(int(m[n - 15 + i][8]) << i for i in range(8, 15))
        bezug.append(m)
        masken.append(masken_zu.get(bits, 0))
    eigen = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", JS_MASKE, json.dumps([texte, masken])], cwd=REPO).decode())
    fehler = 0
    for t, b, e in zip(texte, bezug, eigen):
        e = np.array(e)
        n = e.shape[0]
        if e.shape != b.shape:
            print(f"FEHLER  Encoder-Vergleich: Größe {e.shape} statt {b.shape} bei {len(t.encode())} Bytes")
            fehler += 1
            continue
        v = (n - 17) // 4
        anders = [(int(y), int(x)) for y, x in np.argwhere(e != b)]
        # Restbits: die letzten 7 Module des Zickzacks (Spalten 0/1, Zeilen n − 12 bis n − 9), nur Version 2 bis 6
        erlaubt = 2 <= v <= 6 and all(x <= 1 and n - 12 <= y <= n - 9 for y, x in anders)
        if anders and not erlaubt:
            print(f"FEHLER  Encoder-Vergleich: {len(anders)} Module anders bei {len(t.encode())} Bytes (V{v})")
            fehler += 1
    print(f"Encoder-Vergleich mit cv2.QRCodeEncoder: {len(texte) - fehler} von {len(texte)} gleich")
    return fehler


SEITE = """<!doctype html><html><head><meta charset="utf-8"><style>
:root {{ --qr-dark: #000; --qr-light: #fff; color-scheme: light dark; }}
body {{ margin: 0; padding: 24px; background: {bg}; }}
@media (prefers-color-scheme: dark) {{ body {{ background: #15171c; }} }}
#q {{ display: inline-block; padding: 16px; line-height: 0; }}
</style></head><body><div id="q">{svg}</div></body></html>"""


def lies_cv2(img):
    return cv2.QRCodeDetector().detectAndDecode(img)[0] or None


def lies_aruco(img):
    return cv2.QRCodeDetectorAruco().detectAndDecode(img)[0] or None


def lies_wechat(img):
    if not hasattr(cv2, "wechat_qrcode"):
        return None
    texte = cv2.wechat_qrcode.WeChatQRCode().detectAndDecode(img)[0]
    return texte[0] if texte else None


ZBAR = None
try:
    ZBAR = ctypes.CDLL(ctypes.util.find_library("zbar") or "libzbar.so.0")
    for f in ("zbar_image_scanner_create", "zbar_image_create", "zbar_image_first_symbol"):
        getattr(ZBAR, f).restype = ctypes.c_void_p
    ZBAR.zbar_symbol_get_data.restype = ctypes.c_void_p
    ZBAR.zbar_symbol_get_data.argtypes = [ctypes.c_void_p]
    ZBAR.zbar_symbol_get_data_length.argtypes = [ctypes.c_void_p]
    ZBAR.zbar_image_first_symbol.argtypes = [ctypes.c_void_p]
    ZBAR.zbar_image_scanner_set_config.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
    ZBAR.zbar_image_set_format.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
    ZBAR.zbar_image_set_size.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_uint]
    ZBAR.zbar_image_set_data.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ulong, ctypes.c_void_p]
    ZBAR.zbar_scan_image.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    ZBAR.zbar_image_destroy.argtypes = [ctypes.c_void_p]
    ZBAR.zbar_image_scanner_destroy.argtypes = [ctypes.c_void_p]
except OSError:
    ZBAR = None


def lies_zbar(img):
    if ZBAR is None:
        return None
    grau = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = grau.shape
    puffer = ctypes.create_string_buffer(grau.tobytes(), w * h)
    sc = ZBAR.zbar_image_scanner_create()
    ZBAR.zbar_image_scanner_set_config(sc, 0, 0, 1)  # alle Symbologien an (ZBAR_CFG_ENABLE)
    bild = ZBAR.zbar_image_create()
    y800 = ord("Y") | ord("8") << 8 | ord("0") << 16 | ord("0") << 24
    ZBAR.zbar_image_set_format(bild, y800)
    ZBAR.zbar_image_set_size(bild, w, h)
    ZBAR.zbar_image_set_data(bild, ctypes.cast(puffer, ctypes.c_void_p), w * h, None)
    text = None
    if ZBAR.zbar_scan_image(sc, bild) > 0:
        sym = ZBAR.zbar_image_first_symbol(bild)
        if sym:
            n = ZBAR.zbar_symbol_get_data_length(sym)
            text = ctypes.string_at(ZBAR.zbar_symbol_get_data(sym), n).decode("utf-8", "replace")
    ZBAR.zbar_image_destroy(bild)
    ZBAR.zbar_image_scanner_destroy(sc)
    return text


# zbar rät ohne ECI-Angabe den Zeichensatz (oft Shift-JIS) und wandelt UTF-8-Bytes falsch um. Für den
# Vergleich die Bytes zurückgewinnen und als UTF-8 lesen; die Links der App sind reines ASCII.
def zbar_bytes(t):
    for zs in ("shift_jis", "latin-1", "cp1252"):
        try:
            return t.encode(zs).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    return t


LESER = [("cv2", lies_cv2), ("aruco", lies_aruco), ("wechat", lies_wechat), ("zbar", lies_zbar)]


def main():
    erg = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", JS, json.dumps(LINKS)], cwd=REPO).decode())
    ordner = os.environ.get("BILDER") or tempfile.mkdtemp(prefix="qr-gegenprobe-")
    os.makedirs(ordner, exist_ok=True)
    fehler = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for schema, bg in (("light", "#f6f4ef"), ("dark", "#15171c")):
            seite = browser.new_page(color_scheme=schema)
            for k, e in enumerate(erg):
                if e["svg"] is None:
                    print(f"FEHLER  kein Code für {len(e['t'].encode())} Bytes")
                    fehler += 1
                    continue
                seite.set_content(SEITE.format(bg=bg, svg=e["svg"]))
                pfad = os.path.join(ordner, f"qr-{schema}-{k:02d}-v{e['v']}.png")
                seite.locator("#q").screenshot(path=pfad)
                img = cv2.imread(pfad)
                treffer, falsch, teile = 0, 0, []
                for name, leser in LESER:
                    t = leser(img)
                    if name == "zbar" and t not in (None, e["t"]):
                        t = zbar_bytes(t)
                    if t == e["t"]:
                        treffer += 1
                        teile.append(f"{name} ok")
                    elif t is None:
                        teile.append(f"{name} –")
                    else:
                        falsch += 1
                        teile.append(f"{name} FALSCH {t[:30]!r}")
                ok = falsch == 0 and treffer >= 2
                fehler += 0 if ok else 1
                print(f"{'ok    ' if ok else 'FEHLER'}  {schema:5}  V{e['v']:<2}  {len(e['t'].encode()):3} Bytes  "
                      f"{', '.join(teile)}  {e['t'][:50]}")
            seite.close()
        browser.close()
    # Modulvergleich: die Links von oben und ASCII-Texte jeder Grenzlänge (jede Version 1 bis 10)
    grenzen = [1, 14, 15, 26, 27, 42, 43, 62, 63, 84, 85, 106, 107, 122, 123, 152, 153, 180, 181, 213]
    fehler += vergleich_encoder(LINKS + [("Notenheld:" * 22)[:k] for k in grenzen])
    print(f"Bilder: {ordner}")
    print("Gegenprobe bestanden" if fehler == 0 else f"{fehler} Fehler")
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
