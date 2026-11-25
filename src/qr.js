// QR-Code-Modul (Welle 11, Schritt 10): eigener kleiner Encoder, ohne Abhängigkeit, ohne Netz, ohne DOM.
// Umfang: QR-Code Modell 2, Byte-Modus (UTF-8), Fehlerkorrektur M, Versionen 1 bis 10 (bis 213 Bytes).
// Längerer Text → null (die Seite zeigt dann nur den Link).
//
// Alle festen Tabellen und Verfahren nach ISO/IEC 18004 (QR-Code Modell 2): Blockaufteilung bei M
// (Tabelle 9), Restbits, Ausrichtungsmuster (Anhang E), Formatangabe (BCH 15/5, Generator 0x537, Maske 0x5412),
// Versionsangabe (BCH 18/6, Generator 0x1F25), Reed-Solomon über GF(256) mit 0x11D, Datenlage im Zickzack,
// acht Masken und die vier Strafregeln.
//
// Matrix: modules[zeile][spalte], true = dunkel.

// Fehlerkorrektur M, Versionen 1 bis 10 (ISO/IEC 18004, Tabelle 9): Fehlerkorrektur-Bytes je Block und
// Blöcke als [Anzahl, Datenbytes je Block]; kürzere Blöcke zuerst.
const EC_JE_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOECKE = [
  [[1, 16]], [[1, 28]], [[1, 44]], [[2, 32]], [[2, 43]], [[4, 27]], [[4, 31]],
  [[2, 38], [2, 39]], [[3, 36], [2, 37]], [[4, 43], [1, 44]],
];
// Datenbytes je Version bei M: 16, 28, 44, 64, 86, 108, 124, 154, 182, 216
export const DATENBYTES = BLOECKE.map((g) => g.reduce((s, [n, k]) => s + n * k, 0));
// Restbits nach den Codewörtern: Version 2 bis 6 je 7, sonst 0
const RESTBITS = [0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
// Mitten der Ausrichtungsmuster (ISO/IEC 18004, Anhang E)
const AUSRICHTUNG = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

export const MAX_VERSION = 10;

// Längenfeld im Byte-Modus: 8 Bit bis Version 9, 16 Bit ab Version 10
const laengenBits = (v) => (v <= 9 ? 8 : 16);
// Nutzbare Bytes im Byte-Modus: 14, 26, 42, 62, 84, 106, 122, 152, 180, 213
export const KAPAZITAET = DATENBYTES.map((d, i) => Math.floor((d * 8 - 4 - laengenBits(i + 1)) / 8));

// ---------- Reed-Solomon über GF(256), Polynom x^8 + x^4 + x^3 + x^2 + 1 (0x11D) ----------

function gfMul(a, b) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((b >>> i) & 1) * a;
  }
  return z;
}

// Generatorpolynom (ohne führende 1) für `grad` Prüfbytes: Produkt (x − α^i), i = 0 … grad − 1, α = 2
function rsDivisor(grad) {
  const r = new Array(grad).fill(0);
  r[grad - 1] = 1;
  let wurzel = 1;
  for (let i = 0; i < grad; i++) {
    for (let j = 0; j < grad; j++) {
      r[j] = gfMul(r[j], wurzel);
      if (j + 1 < grad) r[j] ^= r[j + 1];
    }
    wurzel = gfMul(wurzel, 0x02);
  }
  return r;
}

// Prüfbytes (Rest der Polynomdivision) für einen Datenblock
export function rsRemainder(daten, grad) {
  const div = rsDivisor(grad);
  const r = new Array(grad).fill(0);
  for (const b of daten) {
    const f = b ^ r.shift();
    r.push(0);
    for (let i = 0; i < grad; i++) r[i] ^= gfMul(div[i], f);
  }
  return r;
}

// ---------- Format- und Versionsangabe ----------

// 15 Bit für Fehlerkorrektur M (Kennung 00) und Maske 0 … 7, als Zahl (höchstes Bit zuerst gelesen)
export function formatBits(maske) {
  const daten = (0b00 << 3) | maske;
  let rest = daten;
  for (let i = 0; i < 10; i++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
  return ((daten << 10) | rest) ^ 0x5412;
}

// 18 Bit ab Version 7
export function versionBits(v) {
  let rest = v;
  for (let i = 0; i < 12; i++) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
  return (v << 12) | rest;
}

// ---------- Datenstrom ----------

function codewoerter(bytes, v) {
  const kap = DATENBYTES[v - 1] * 8;
  const bits = [];
  const push = (wert, n) => { for (let i = n - 1; i >= 0; i--) bits.push((wert >>> i) & 1); };
  push(0b0100, 4); // Byte-Modus
  push(bytes.length, laengenBits(v));
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, kap - bits.length)); // Abschluss 0000 (soweit Platz)
  push(0, (8 - (bits.length % 8)) % 8); // auf volle Bytes
  const daten = [];
  for (let i = 0; i < bits.length; i += 8) daten.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; daten.length < DATENBYTES[v - 1]; pad ^= 0xec ^ 0x11) daten.push(pad); // 236, 17, …

  // in Blöcke teilen, Prüfbytes anhängen, verschränken (erst Daten, dann Fehlerkorrektur)
  const ec = EC_JE_BLOCK[v - 1];
  const bloecke = [];
  let pos = 0;
  for (const [n, k] of BLOECKE[v - 1]) {
    for (let i = 0; i < n; i++) {
      const d = daten.slice(pos, pos + k);
      pos += k;
      bloecke.push({ d, e: rsRemainder(d, ec) });
    }
  }
  const aus = [];
  const maxK = Math.max(...bloecke.map((b) => b.d.length));
  for (let i = 0; i < maxK; i++) for (const b of bloecke) if (i < b.d.length) aus.push(b.d[i]);
  for (let i = 0; i < ec; i++) for (const b of bloecke) aus.push(b.e[i]);
  return aus;
}

// ---------- Muster ----------

const MASKEN = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// Grundgerüst: alle Funktionsmuster; Format- und Versionsfelder sind vorgemerkt (fest[y][x] = true)
function geruest(v) {
  const n = 17 + 4 * v;
  const m = Array.from({ length: n }, () => new Array(n).fill(false));
  const fest = Array.from({ length: n }, () => new Array(n).fill(false));
  const setze = (x, y, dunkel) => { m[y][x] = dunkel; fest[y][x] = true; };

  // Taktlinien (Zeile 6 und Spalte 6), dunkel an geraden Stellen
  for (let i = 0; i < n; i++) { setze(6, i, i % 2 === 0); setze(i, 6, i % 2 === 0); }

  // drei Suchmuster 7 × 7 mit Trennern (1 Modul hell rundum, soweit in der Matrix)
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setze(x, y, d !== 2 && d !== 4);
      }
    }
  }

  // Ausrichtungsmuster 5 × 5, nicht dort, wo ein Suchmuster liegt
  const a = AUSRICHTUNG[v - 1];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length; j++) {
      const last = a.length - 1;
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setze(a[i] + dx, a[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  // Formatfelder vormerken, dunkles Modul
  for (let i = 0; i <= 8; i++) { fest[8][i] = true; fest[i][8] = true; }
  for (let i = 0; i < 8; i++) { fest[8][n - 1 - i] = true; fest[n - 1 - i][8] = true; }
  setze(8, n - 8, true);

  // Versionsangabe ab Version 7: 6 × 3 unten links und 3 × 6 oben rechts
  if (v >= 7) {
    const bits = versionBits(v);
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const p = n - 11 + (i % 3), q = Math.floor(i / 3);
      setze(p, q, bit);
      setze(q, p, bit);
    }
  }
  return { n, m, fest };
}

function schreibeFormat(m, n, maske) {
  const bits = formatBits(maske);
  const bit = (i) => ((bits >>> i) & 1) === 1;
  // erste Kopie um das Suchmuster oben links
  for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
  m[7][8] = bit(6);
  m[8][8] = bit(7);
  m[8][7] = bit(8);
  for (let i = 9; i < 15; i++) m[8][14 - i] = bit(i);
  // zweite Kopie: oben rechts (Bit 0 … 7) und unten links (Bit 8 … 14)
  for (let i = 0; i < 8; i++) m[8][n - 1 - i] = bit(i);
  for (let i = 8; i < 15; i++) m[n - 15 + i][8] = bit(i);
  m[n - 8][8] = true; // dunkles Modul
}

// Codewörter im Zickzack: Spaltenpaare von rechts, abwechselnd hinauf und hinunter, Spalte 6 übersprungen
function schreibeDaten(m, fest, n, cw) {
  let i = 0;
  const gesamt = cw.length * 8;
  for (let rechts = n - 1; rechts >= 1; rechts -= 2) {
    if (rechts === 6) rechts = 5;
    const hinauf = ((rechts + 1) & 2) === 0;
    for (let k = 0; k < n; k++) {
      const y = hinauf ? n - 1 - k : k;
      for (let j = 0; j < 2; j++) {
        const x = rechts - j;
        if (fest[y][x]) continue;
        // Restbits bleiben hell (0)
        m[y][x] = i < gesamt ? ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1 : false;
        i++;
      }
    }
  }
}

function maskiere(m, fest, n, maske) {
  const f = MASKEN[maske];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fest[y][x] && f(x, y)) m[y][x] = !m[y][x];
}

// Strafpunkte nach den vier Regeln (N1 = 3, N2 = 3, N3 = 40, N4 = 10)
export function strafe(m) {
  const n = m.length;
  let p = 0;
  const zeile = (y) => m[y];
  const spalte = (x) => m.map((r) => r[x]);
  const muster1 = [true, false, true, true, true, false, true, false, false, false, false];
  const muster2 = [false, false, false, false, true, false, true, true, true, false, true];
  for (let k = 0; k < n; k++) {
    for (const reihe of [zeile(k), spalte(k)]) {
      // Regel 1: fünf und mehr gleiche Module in Folge
      let lauf = 1;
      for (let i = 1; i <= n; i++) {
        if (i < n && reihe[i] === reihe[i - 1]) lauf++;
        else { if (lauf >= 5) p += 3 + (lauf - 5); lauf = 1; }
      }
      // Regel 3: 1 0 1 1 1 0 1 mit vier hellen Modulen davor oder danach; die Ruhezone zählt als hell mit
      // (so erkennt die Regel auch suchmusterähnliche Stellen am Rand)
      const r = [false, false, false, false, ...reihe, false, false, false, false];
      for (let i = 0; i + 11 <= r.length; i++) {
        let a = true, b = true;
        for (let j = 0; j < 11; j++) { if (r[i + j] !== muster1[j]) a = false; if (r[i + j] !== muster2[j]) b = false; }
        if (a) p += 40;
        if (b) p += 40;
      }
    }
  }
  // Regel 2: Blöcke 2 × 2 gleicher Farbe
  for (let y = 0; y + 1 < n; y++) {
    for (let x = 0; x + 1 < n; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
  }
  // Regel 4: Abweichung des Dunkelanteils von 50 % in Schritten von 5 %
  let dunkel = 0;
  for (const r of m) for (const c of r) if (c) dunkel++;
  p += 10 * Math.floor(Math.abs((dunkel * 100) / (n * n) - 50) / 5);
  return p;
}

// ---------- Schnittstelle ----------

const utf8 = (text) => Array.from(new TextEncoder().encode(String(text)));

// Kleinste Version 1 … 10 für die Zahl der Bytes, sonst null
export function versionFor(bytes) {
  const i = KAPAZITAET.findIndex((k) => bytes <= k);
  return i < 0 ? null : i + 1;
}

// qrMatrix(text) → { version, size, mask, modules } oder null (Text zu lang für Version 10).
// optionen.mask (0 … 7) erzwingt eine Maske (für Tests); sonst – auch bei einem ungültigen Wert – Wahl nach
// den Strafregeln (kleinste Summe, bei Gleichstand die kleinere Maskennummer).
export function qrMatrix(text, optionen = {}) {
  const bytes = utf8(text);
  const v = versionFor(bytes.length);
  if (v === null) return null;
  const cw = codewoerter(bytes, v);
  const { n, m, fest } = geruest(v);
  schreibeDaten(m, fest, n, cw);
  const fest1 = Number.isInteger(optionen.mask) && optionen.mask >= 0 && optionen.mask <= 7;
  const kandidaten = fest1 ? [optionen.mask] : [0, 1, 2, 3, 4, 5, 6, 7];
  let beste = null;
  for (const maske of kandidaten) {
    const k = m.map((r) => r.slice());
    maskiere(k, fest, n, maske);
    schreibeFormat(k, n, maske);
    const s = kandidaten.length > 1 ? strafe(k) : 0;
    if (!beste || s < beste.s) beste = { s, maske, k };
  }
  return { version: v, size: n, mask: beste.maske, modules: beste.k };
}

const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// qrSvg(text, { scale = 6, margin = 4, label }) → SVG-Text oder null.
// Ein <path> für die dunklen Module auf heller Fläche, Ruhezone `margin` Module (Voreinstellung 4).
// Farben über die Tokens --qr-dark und --qr-light (in hell und dunkel gleich: schwarz auf weiß; ein
// umgekehrter Code ist für viele Scanner unlesbar); ohne Tokens gelten Schwarz und Weiß.
export function qrSvg(text, { scale = 6, margin = 4, label } = {}) {
  const q = qrMatrix(text);
  if (!q) return null;
  const w = q.size + 2 * margin;
  const px = w * scale;
  let d = "";
  for (let y = 0; y < q.size; y++) {
    let x = 0;
    while (x < q.size) {
      if (!q.modules[y][x]) { x++; continue; }
      const start = x;
      while (x < q.size && q.modules[y][x]) x++;
      d += `M${start + margin} ${y + margin}h${x - start}v1h-${x - start}z`;
    }
  }
  const aria = escAttr(label ?? `QR-Code: ${text}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="qr" viewBox="0 0 ${w} ${w}" width="${px}" height="${px}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="${aria}">` +
    `<rect width="${w}" height="${w}" style="fill:var(--qr-light, #fff)"/>` +
    `<path d="${d}" style="fill:var(--qr-dark, #000)"/></svg>`;
}
