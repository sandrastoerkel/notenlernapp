// QR-Code-Modul (Welle 11, Schritt 10): Bezugswerte aus ISO/IEC 18004, Struktur je Version und
// Selbstprüfung durch Rücklesen mit einem kleinen Leser, der nur im Test lebt (test/qrleser.js).
// Ehrlich: Rücklesen findet keinen Fehler, den Schreiber und Leser gemeinsam haben. Die unabhängige
// Gegenprobe (OpenCV) liegt außerhalb von npm test in docs/screens/qr-gegenprobe.py.
import { test } from "node:test";
import assert from "node:assert/strict";
import { qrMatrix, qrSvg, rsRemainder, formatBits, versionBits, strafe, DATENBYTES, KAPAZITAET, MAX_VERSION } from "../src/qr.js";
import { bin, MITTEN, istFunktion, leseFormat, FORMAT_M, syndrome, lies } from "./qrleser.js";

const BASIS = "https://sandrastoerkel.github.io/notenlernapp/";

test("Formatangabe für M, Maske 0 bis 7", () => {
  for (let m = 0; m < 8; m++) assert.equal(bin(formatBits(m), 15), FORMAT_M[m]);
});

test("Versionsangabe für Version 7 bis 10", () => {
  assert.equal(bin(versionBits(7), 18), "000111110010010100");
  assert.equal(bin(versionBits(8), 18), "001000010110111100");
  assert.equal(bin(versionBits(9), 18), "001001101010011001");
  assert.equal(bin(versionBits(10), 18), "001010010011010011");
});

test("Reed-Solomon: Beispiel „HELLO WORLD“, Version 1-M", () => {
  const d = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(rsRemainder(d, 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  assert.ok(syndrome([...d, 196, 35, 39, 119, 235, 215, 231, 226, 93, 23], 10).every((s) => s === 0));
});

test("Tabellen: Datenbytes und nutzbare Bytes je Version bei M", () => {
  assert.equal(MAX_VERSION, 10);
  assert.deepEqual(DATENBYTES, [16, 28, 44, 64, 86, 108, 124, 154, 182, 216]);
  assert.deepEqual(KAPAZITAET, [14, 26, 42, 62, 84, 106, 122, 152, 180, 213]);
});

test("Kapazität: n Bytes → Version, ein Byte mehr → nächste Version, 214 → null", () => {
  const kap = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
  kap.forEach((k, i) => {
    assert.equal(qrMatrix("a".repeat(k)).version, i + 1);
    const mehr = qrMatrix("a".repeat(k + 1));
    if (i < 9) assert.equal(mehr.version, i + 2); else assert.equal(mehr, null);
  });
  assert.equal(qrSvg("a".repeat(214)), null);
  // UTF-8 zählt Bytes, nicht Zeichen: „ä“ hat 2 Bytes
  assert.equal(qrMatrix("ä".repeat(7)).version, 1);
  assert.equal(qrMatrix("ä".repeat(7) + "a").version, 2);
});

// ---------- Struktur ----------

function pruefeStruktur(q) {
  const { modules: m, size: n, version: v } = q;
  assert.equal(m.length, n);
  for (const r of m) assert.equal(r.length, n);
  // Suchmuster mit Trennern
  for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r, cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const abstand = Math.max(Math.abs(r - 3), Math.abs(c - 3)); // 4 = Trenner, 3 = Rahmen, 2 = heller Ring
        const soll = abstand !== 4 && abstand !== 2;
        assert.equal(m[rr][cc], soll, `Suchmuster V${v} bei ${rr}/${cc}`);
      }
    }
  }
  // Taktlinien
  for (let i = 8; i < n - 8; i++) { assert.equal(m[6][i], i % 2 === 0); assert.equal(m[i][6], i % 2 === 0); }
  // dunkles Modul
  assert.equal(m[n - 8][8], true);
  // Ausrichtungsmuster
  const a = MITTEN[v];
  for (const ar of a) for (const ac of a) {
    if ((ar === 6 && ac === 6) || (ar === 6 && ac === a.at(-1)) || (ar === a.at(-1) && ac === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      assert.equal(m[ar + dr][ac + dc], Math.max(Math.abs(dr), Math.abs(dc)) !== 1, `Ausrichtung V${v} ${ar}/${ac}`);
    }
  }
  // Versionsangabe ab 7 (beide Kopien)
  if (v >= 7) {
    const bits = versionBits(v);
    for (let i = 0; i < 18; i++) {
      const b = ((bits >> i) & 1) === 1;
      assert.equal(m[Math.floor(i / 3)][n - 11 + (i % 3)], b);
      assert.equal(m[n - 11 + (i % 3)][Math.floor(i / 3)], b);
    }
  }
  // Formatangabe passt zu mask
  assert.equal(bin(leseFormat(m), 15), FORMAT_M[q.mask]);
}

test("Struktur für jede Version 1 bis 10", () => {
  for (let v = 1; v <= 10; v++) {
    const q = qrMatrix("x".repeat(KAPAZITAET[v - 1]));
    assert.equal(q.version, v);
    assert.equal(q.size, 17 + 4 * v);
    assert.ok(q.mask >= 0 && q.mask <= 7);
    pruefeStruktur(q);
  }
});

test("Jede der acht Masken ergibt einen lesbaren Code", () => {
  for (const text of [BASIS + "#klasse=6", "x".repeat(200)]) {
    for (let m = 0; m < 8; m++) {
      const q = qrMatrix(text, { mask: m });
      assert.equal(q.mask, m);
      pruefeStruktur(q);
      assert.deepEqual(lies(q), { text, maske: m });
    }
  }
});

// ---------- Rücklesen ----------

const LINKS = [];
for (let j = 5; j <= 13; j++) {
  LINKS.push(BASIS + "#klasse=" + j, BASIS + "#klasse=" + j + "&zweig=mug");
  LINKS.push(BASIS + "#klasse=" + j + "&dran=intervalle:6,akkorde:1");
  LINKS.push(BASIS + "#klasse=" + j + "&zweig=mug&dran=noten:8,notenwerte:10,intervalle:4,tonleitern:5,akkorde:6");
}
LINKS.push(BASIS + "#klasse=keine");

test("Rücklesen: alle Links dieser Welle (Jahrgänge, zweig, dran, keine)", () => {
  assert.equal((BASIS + "#klasse=6").length, 55);
  assert.equal(qrMatrix(BASIS + "#klasse=6").version, 4);
  for (const l of LINKS) {
    const q = qrMatrix(l);
    assert.ok(q, l);
    pruefeStruktur(q);
    assert.equal(lies(q).text, l);
  }
});

// fester Zufall (Mulberry32)
function zufall(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test("Rücklesen: Zufallstexte jeder Länge 1 bis 213", () => {
  const r = zufall(20261125);
  const zeichen = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~:/?#[]@!$&'()*+,;=% ";
  for (let len = 1; len <= 213; len++) {
    let t = "";
    for (let i = 0; i < len; i++) t += zeichen[Math.floor(r() * zeichen.length)];
    const q = qrMatrix(t);
    assert.ok(q, "Länge " + len);
    assert.equal(lies(q).text, t, "Länge " + len);
  }
});

test("Rücklesen: Umlaute und ß (UTF-8)", () => {
  for (const t of ["Übung macht den Meister – Größe, Fuß, Ärger, öde", "ä", "Notenheld: Fis, Es, c', c''"]) {
    assert.equal(lies(qrMatrix(t)).text, t);
  }
});

// Strafregeln: Werte von Hand nachgerechnet (21 × 21 Module).
test("Strafregeln: von Hand nachgerechnete Flächen", () => {
  const leer = () => Array.from({ length: 21 }, () => new Array(21).fill(false));
  // alles hell: Regel 1 je Zeile/Spalte 3 + 16 = 19, mal 42 = 798; Regel 2: 20 · 20 · 3 = 1200; Regel 4: 0 % → 100
  assert.equal(strafe(leer()), 798 + 1200 + 100);
  // Schachbrett: keine Läufe, keine Blöcke, 221 von 441 dunkel → 0
  assert.equal(strafe(leer().map((r, y) => r.map((_, x) => (x + y) % 2 === 0))), 0);
  // 1 0 1 1 1 0 1 am Anfang der ersten Zeile, sonst hell:
  // Regel 1: Zeile 0 nur noch Lauf 14 (12 statt 19), fünf Spalten mit Lauf 20 (18 statt 19) → 798 − 12 = 786
  // Regel 2: in den Zeilen 0/1 nur noch 13 statt 20 Blöcke → 1200 − 21 = 1179
  // Regel 3: Ruhezone davor und vier helle Module danach → 2 · 40; Regel 4: 5 von 441 dunkel → 90
  const m = leer();
  [0, 2, 3, 4, 6].forEach((x) => { m[0][x] = true; });
  assert.equal(strafe(m), 786 + 1179 + 80 + 90);
  // dasselbe Muster in der Spalte ergibt dieselbe Summe
  assert.equal(strafe(m[0].map((_, x) => m.map((r) => r[x]))), 786 + 1179 + 80 + 90);
});

test("Maskenwahl: kleinste Strafsumme, bei Gleichstand die kleinere Nummer; ungültige Maske → Wahl", () => {
  for (const t of [BASIS + "#klasse=6", BASIS + "#klasse=13&zweig=mug", "Notenheld", "x".repeat(152), "y".repeat(213)]) {
    const summen = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => strafe(qrMatrix(t, { mask: k }).modules));
    const q = qrMatrix(t);
    assert.equal(q.mask, summen.indexOf(Math.min(...summen)), t);
    for (const falsch of [8, -1, 2.5, "3", null]) assert.deepEqual(qrMatrix(t, { mask: falsch }), q);
  }
});

test("Leerer Text ergibt einen gültigen Code (Version 1)", () => {
  const q = qrMatrix("");
  assert.equal(q.version, 1);
  assert.equal(lies(q).text, "");
});

// ---------- SVG ----------

test("qrSvg: ein Pfad auf heller Fläche, Ruhezone, crispEdges, role und aria-label, Tokens", () => {
  const l = BASIS + "#klasse=6";
  const svg = qrSvg(l);
  const q = qrMatrix(l);
  const w = q.size + 8;
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(svg.includes(`viewBox="0 0 ${w} ${w}"`));
  assert.ok(svg.includes(`width="${w * 6}" height="${w * 6}"`));
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
  assert.ok(svg.includes('role="img"'));
  assert.ok(svg.includes(`aria-label="QR-Code: ${l.replace(/&/g, "&amp;")}"`));
  assert.equal(svg.match(/<path /g).length, 1);
  assert.equal(svg.match(/<rect /g).length, 1);
  assert.ok(svg.includes("fill:var(--qr-light, #fff)"));
  assert.ok(svg.includes("fill:var(--qr-dark, #000)"));
  // Pfad aus der Matrix zurückrechnen: jedes Rechteck liegt innerhalb der Ruhezone und deckt genau die dunklen Module
  const d = svg.match(/<path d="([^"]*)"/)[1];
  const dunkel = new Set();
  for (const [, x, y, len] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    assert.ok(+x >= 4 && +y >= 4 && +x + +len <= w - 4 && +y < w - 4, "innerhalb der Ruhezone");
    for (let i = 0; i < +len; i++) dunkel.add(`${+y - 4}/${+x - 4 + i}`);
  }
  assert.equal(d.replace(/M\d+ \d+h(\d+)v1h-\1z/g, ""), "", "nur Rechtecke");
  for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++) assert.equal(dunkel.has(`${r}/${c}`), q.modules[r][c]);
});

test("qrSvg: Optionen scale, margin, label; Sonderzeichen im aria-label maskiert", () => {
  const svg = qrSvg("a", { scale: 2, margin: 2, label: 'Link "<x>" & mehr' });
  assert.ok(svg.includes('viewBox="0 0 25 25"'));
  assert.ok(svg.includes('width="50" height="50"'));
  assert.ok(svg.includes('aria-label="Link &quot;&lt;x&gt;&quot; &amp; mehr"'));
  assert.ok(!svg.includes("<x>"));
});
