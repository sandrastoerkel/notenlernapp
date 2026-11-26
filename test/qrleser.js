// Kleiner QR-Leser nur für Tests (Welle 11, Schritt 10; ausgelagert in Schritt 12, damit auch die Seite
// „Für Lehrkräfte“ ihre Codes zurücklesen kann). Eigene Formulierung, nicht aus src/qr.js übernommen.
// lies(q) nimmt { modules, size, version } und gibt { text, maske } zurück; svgModule(svg) liest die Module aus
// einem SVG von qrSvg() zurück (Pfad aus Rechtecken, Ruhezone abgezogen).
import assert from "node:assert/strict";
export const bin = (x, n) => x.toString(2).padStart(n, "0");

// ---------- kleiner Leser (nur Test) ----------

// Lage der Ausrichtungsmuster, für den Leser eigens aufgeschrieben (ISO/IEC 18004, Anhang E)
export const MITTEN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
// Blöcke bei M: [Anzahl, Datenbytes] und Prüfbytes je Block
export const M_BLOCK = {
  1: [[[1, 16]], 10], 2: [[[1, 28]], 16], 3: [[[1, 44]], 26], 4: [[[2, 32]], 18], 5: [[[2, 43]], 24],
  6: [[[4, 27]], 16], 7: [[[4, 31]], 18], 8: [[[2, 38], [2, 39]], 22], 9: [[[3, 36], [2, 37]], 22], 10: [[[4, 43], [1, 44]], 26],
};

// Ist (zeile, spalte) ein Funktionsmodul? Eigene Formulierung, nicht aus qr.js übernommen.
export function istFunktion(v, r, c) {
  const n = 17 + 4 * v;
  if (r < 9 && c < 9) return true; // Suchmuster oben links mit Trenner und Format
  if (r < 9 && c >= n - 8) return true; // oben rechts
  if (r >= n - 8 && c < 9) return true; // unten links (mit dunklem Modul)
  if (r === 6 || c === 6) return true; // Taktlinien
  if (v >= 7 && ((r < 6 && c >= n - 11 && c < n - 8) || (c < 6 && r >= n - 11 && r < n - 8))) return true;
  const a = MITTEN[v];
  for (const ar of a) {
    for (const ac of a) {
      const ecke = (ar === 6 && ac === 6) || (ar === 6 && ac === a.at(-1)) || (ar === a.at(-1) && ac === 6);
      if (!ecke && Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
    }
  }
  return false;
}

// Formatangabe lesen (erste Kopie, Bit 14 zuerst) → 15-Bit-Zahl
export function leseFormat(mod) {
  const pos = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  // pos[k] = (zeile, spalte) von Bit 14 − k
  let x = 0;
  for (const [r, c] of pos) x = (x << 1) | (mod[r][c] ? 1 : 0);
  return x;
}
export function leseFormat2(mod) {
  const n = mod.length;
  let x = 0;
  for (let k = 0; k < 7; k++) x = (x << 1) | (mod[n - 1 - k][8] ? 1 : 0); // Bit 14 … 8
  for (let k = 0; k < 8; k++) x = (x << 1) | (mod[8][n - 8 + k] ? 1 : 0); // Bit 7 … 0
  return x;
}

export const FORMAT_M = ["101010000010010", "101000100100101", "101111001111100", "101101101001011",
  "100010111111001", "100000011001110", "100111110010111", "100101010100000"];

export const MASKE = (m, r, c) => [
  (r + c) % 2 === 0, r % 2 === 0, c % 3 === 0, (r + c) % 3 === 0,
  (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, ((r * c) % 2) + ((r * c) % 3) === 0,
  (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
][m];

// GF(256) mit Tabellen (anders gebaut als im Schreiber)
export const EXP = new Array(512), LOG = new Array(256);
{ let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; }
export const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
// Syndrome S_i = C(α^i), i = 0 … ec − 1; alle 0 heißt: Block fehlerfrei
export function syndrome(block, ec) {
  const s = [];
  for (let i = 0; i < ec; i++) { let y = 0; for (const b of block) y = mul(y, EXP[i]) ^ b; s.push(y); }
  return s;
}

export function lies(q) {
  const { modules: mod, size: n, version: v } = q;
  assert.equal(n, 17 + 4 * v);
  const fmt = leseFormat(mod);
  assert.equal(fmt, leseFormat2(mod), "beide Kopien der Formatangabe gleich");
  const maske = FORMAT_M.indexOf(bin(fmt, 15));
  assert.ok(maske >= 0, "Formatangabe ist eine der acht für M");
  // Bits im Zickzack lesen, Maske abnehmen
  const bits = [];
  let hinauf = true;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c = 5;
    for (let k = 0; k < n; k++) {
      const r = hinauf ? n - 1 - k : k;
      for (const cc of [c, c - 1]) if (!istFunktion(v, r, cc)) bits.push((mod[r][cc] !== MASKE(maske, r, cc)) ? 1 : 0);
    }
    hinauf = !hinauf;
  }
  const [gruppen, ec] = M_BLOCK[v];
  const laengen = gruppen.flatMap(([anz, k]) => new Array(anz).fill(k));
  const gesamt = laengen.reduce((a, b) => a + b, 0) + ec * laengen.length;
  const rest = bits.length - gesamt * 8;
  assert.equal(rest, v >= 2 && v <= 6 ? 7 : 0, "Restbits");
  const cw = [];
  for (let i = 0; i < gesamt; i++) cw.push(parseInt(bits.slice(i * 8, i * 8 + 8).join(""), 2));
  // entschränken
  const bl = laengen.map(() => []);
  let p = 0;
  for (let i = 0; i < Math.max(...laengen); i++) laengen.forEach((k, b) => { if (i < k) bl[b].push(cw[p++]); });
  for (let i = 0; i < ec; i++) bl.forEach((b) => b.push(cw[p++]));
  for (const b of bl) assert.ok(syndrome(b, ec).every((s) => s === 0), "Reed-Solomon-Syndrome 0");
  const daten = bl.flatMap((b, i) => b.slice(0, laengen[i]));
  const db = daten.flatMap((x) => bin(x, 8).split("").map(Number));
  const nimm = (k) => { const x = parseInt(db.splice(0, k).join(""), 2); return x; };
  assert.equal(nimm(4), 0b0100, "Byte-Modus");
  const len = nimm(v <= 9 ? 8 : 16);
  const bytes = [];
  for (let i = 0; i < len; i++) bytes.push(nimm(8));
  return { text: new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes)), maske };
}

// ---------- Bezugswerte ----------

// Module aus einem SVG von qrSvg() lesen: viewBox = Breite in Modulen samt Ruhezone, der Pfad besteht aus
// Rechtecken „M x y h w v1 h-w z“. margin = Ruhezone in Modulen (Vorgabe 4). Ergebnis wie qrMatrix: { size,
// version, modules } (version aus der Größe), dazu ruhe: true, wenn in der Ruhezone kein dunkles Modul liegt.
export function svgModule(svg, margin = 4) {
  const w = Number(/viewBox="0 0 (\d+) \1"/.exec(svg)[1]);
  const size = w - 2 * margin;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  let ruhe = true;
  const d = /<path d="([^"]*)"/.exec(svg)[1];
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    const x0 = +m[1] - margin, y = +m[2] - margin, len = +m[3];
    for (let x = x0; x < x0 + len; x++) {
      if (y < 0 || y >= size || x < 0 || x >= size) ruhe = false;
      else modules[y][x] = true;
    }
  }
  assert.equal(d.replace(/M(\d+) (\d+)h(\d+)v1h-\3z/g, ""), "", "Pfad nur aus Rechtecken");
  return { size, version: (size - 17) / 4, modules, ruhe };
}
