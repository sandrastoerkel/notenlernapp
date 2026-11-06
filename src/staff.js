// SVG-Zeichner für Notenzeile, Noten, Pausen, Vorzeichen und Klaviatur.
// Alle Funktionen liefern SVG-Markup als String (kein DOM-Zugriff).
import { SEMI, staffPos } from "./music.js";

export const S = 12, TOP = 34, BOTTOM = TOP + 4 * S, W = 320, H = 122, X0 = 18, X1 = 302;

// Zeichen aus dem Unicode-Block „Musical Symbols“ (Schrift Noto Music)
export const GLYPHS = {
  treble: "\u{1D11E}",
  bass: "\u{1D122}",
  notes: { 1: "\u{1D15D}", 2: "\u{1D15E}", 4: "\u{1D15F}", 8: "\u{1D160}", 16: "\u{1D161}" },
  rests: { 1: "\u{1D13B}", 2: "\u{1D13C}", 4: "\u{1D13D}", 8: "\u{1D13E}", 16: "\u{1D13F}" },
};

const yOf = (p) => BOTTOM - p * (S / 2);

// Note mit Hals, Hilfslinien und Vorzeichen.
// cls: "", "ok", "bad" oder "ghost"; opts.value: 1, 2, 4, 8, 16 (Standard 4); opts.stemless: ohne Hals.
// Ohne opts entspricht die Ausgabe der ersten Fassung aus index.html, nur das Vorzeichen sitzt jetzt
// genau auf der Linie bzw. im Zwischenraum (vorher 3,5 bzw. 4,5 Einheiten zu tief).
export function noteSvg(n, clef, x, cls, opts = {}) {
  const value = opts.value || 4;
  const p = staffPos(n, clef), cy = yOf(p);
  let s = `<g class="note ${cls || ""}">`;
  for (let q = -2; q >= p; q -= 2) s += `<line class="ledger" x1="${x - 11}" x2="${x + 11}" y1="${yOf(q)}" y2="${yOf(q)}"/>`;
  for (let q = 10; q <= p; q += 2) s += `<line class="ledger" x1="${x - 11}" x2="${x + 11}" y1="${yOf(q)}" y2="${yOf(q)}"/>`;
  if (n.acc) s += `<text class="acc" x="${x - 22}" y="${cy + (n.acc > 0 ? ACC_DY.sharp : ACC_DY.flat)}">${n.acc > 0 ? "♯" : "♭"}</text>`;
  const up = p < 4;
  // Ganze Noten haben keinen Hals
  if (value !== 1 && !opts.stemless) {
    s += up ? `<line class="stem" x1="${x + 6}" x2="${x + 6}" y1="${cy - 1}" y2="${cy - 40}"/>` : `<line class="stem" x1="${x - 6}" x2="${x - 6}" y1="${cy + 1}" y2="${cy + 40}"/>`;
    // Fähnchen: Achtel eins, Sechzehntel zwei; immer rechts vom Hals
    const flags = value === 8 ? 1 : value === 16 ? 2 : 0;
    for (let i = 0; i < flags; i++) {
      s += up
        ? `<path class="flag" d="M${x + 6} ${cy - 40 + i * 8} c 1 7 11 9 9 21"/>`
        : `<path class="flag" d="M${x - 6} ${cy + 40 - i * 8} c 1 -7 11 -9 9 -21"/>`;
    }
  }
  // Ganze und halbe Noten: hohler Notenkopf
  const open = value === 1 || value === 2;
  s += `<ellipse class="notehead${open ? " open" : ""}" cx="${x}" cy="${cy}" rx="6.8" ry="4.6" transform="rotate(-22 ${x} ${cy})"/>`;
  return s + "</g>";
}

// Pausen-Glyphen bei Schriftgröße 48 (= 4 Linienabstände). Die Lage ergibt sich aus den
// Glyphenmaßen von Noto Music (Einheiten pro em 1000, gemessen mit fontTools):
// ganze Pause 378..512, halbe 244..378, Viertel 123..878, Achtel 269..730, Sechzehntel 147..852.
const REST_SIZE = 48;
const REST_UNIT = REST_SIZE / 1000;
const REST_BASE = {
  // Ganze Pause hängt unter der vierten Linie (von unten): Oberkante auf TOP + S
  1: TOP + S + 512 * REST_UNIT,
  // Halbe Pause sitzt auf der dritten Linie (Mittellinie): Unterkante auf TOP + 2 S
  2: TOP + 2 * S + 244 * REST_UNIT,
  // Viertelpause: mittig in der Zeile
  4: TOP + 2 * S + 500.5 * REST_UNIT,
  // UNSICHER: Achtel- und Sechzehntelpause sind nur mittig zur Mittellinie gesetzt; per Screenshot prüfen
  8: TOP + 2 * S + 499.5 * REST_UNIT,
  16: TOP + 2 * S + 499.5 * REST_UNIT,
};

// Pause (1, 2, 4, 8, 16) an Position x
export function restSvg(value, x) {
  const v = REST_BASE[value] ? value : 4;
  const y = Math.round(REST_BASE[v] * 10) / 10;
  return `<text class="rest" x="${x}" y="${y}" font-size="${REST_SIZE}">${GLYPHS.rests[v]}</text>`;
}

// Ein Zeichen aus der Musikschrift
export function glyphSvg(char, x, y, size) {
  return `<text class="glyph" x="${x}" y="${y}" font-size="${size}">${char}</text>`;
}

// Vorzeichen als Positionen in halben Stufen über der untersten Linie (Violinschlüssel).
// Kreuze: Fis Cis Gis Dis Ais Eis His → f'' c'' g'' d'' a' e'' h'
const SHARPS_TREBLE = [8, 5, 9, 6, 3, 7, 4];
// Be: B Es As Des Ges Ces Fes → b' es'' as' des'' ges' ces'' fes'
const FLATS_TREBLE = [4, 7, 3, 6, 2, 5, 1];
// Im Bassschlüssel steht dasselbe Muster einen Zwischenraum (zwei Positionen) tiefer:
// Kreuze fis cis gis dis Ais eis His, Be B es As des Ges ces Fes – das Fes liegt im Zwischenraum unter der Zeile.
const BASS_SHIFT = -2;
// Bassschlüssel: etwas weiter rechts, damit das erste Vorzeichen nicht an den Punkten klebt.
const KEYSIG_X = { treble: 64, bass: 70 }, KEYSIG_STEP = 9;
// Senkrechter Versatz der Grundlinie gegenüber der Linie/dem Zwischenraum (gemessen an Noto Music, 24px):
// ♯ – Mitte zwischen den Querbalken liegt 3,5 über der Grundlinie; ♭ – Mitte des Bauchs 2,5 darüber.
export const KEYSIG_DY = { sharp: 3.5, flat: 2.5 };
// Vorzeichen vor einzelnen Noten haben dieselbe Schriftgröße (24px) und damit denselben Versatz.
export const ACC_DY = KEYSIG_DY;

export function keySigSvg(clef, count) {
  if (!count) return "";
  const sharp = count > 0;
  const list = (sharp ? SHARPS_TREBLE : FLATS_TREBLE).slice(0, Math.min(7, Math.abs(count)));
  const shift = clef === "bass" ? BASS_SHIFT : 0;
  const x0 = KEYSIG_X[clef] ?? KEYSIG_X.treble, dy = sharp ? KEYSIG_DY.sharp : KEYSIG_DY.flat;
  return list.map((p, i) => `<text class="keysig" x="${x0 + i * KEYSIG_STEP}" y="${yOf(p + shift) + dy}">${sharp ? "♯" : "♭"}</text>`).join("");
}

// Komplette Notenzeile mit Schlüssel; inner wird eingesetzt.
// opts darf ein String sein (zusätzliche Klasse wie in der ersten Fassung) oder
// { cls, height, keySig }: height erhöht die Höhe, keySig = Anzahl ♯ (positiv) bzw. ♭ (negativ).
export function staffSvg(clef, inner, opts) {
  const o = typeof opts === "string" ? { cls: opts } : (opts || {});
  const h = o.height && o.height > H ? o.height : H;
  let s = `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="Notenzeile" class="${o.cls || ""}">`;
  for (let i = 0; i < 5; i++) s += `<line class="staff-line" x1="${X0}" x2="${X1}" y1="${TOP + i * S}" y2="${TOP + i * S}"/>`;
  s += clef === "treble"
    ? `<text class="clef" x="22" y="${BOTTOM}" font-size="${S * 4.2}">${GLYPHS.treble}</text>`
    : `<text class="clef" x="24" y="${BOTTOM + 1}" font-size="${S * 4.2}">${GLYPHS.bass}</text>`;
  s += keySigSvg(clef, o.keySig);
  return s + inner + "</svg>";
}

/* ---------- Klaviatur ---------- */
export const WHITE = ["C", "D", "E", "F", "G", "A", "H", "C"];
export const BLACK = [{ l: "C", i: 0 }, { l: "D", i: 1 }, { l: "F", i: 3 }, { l: "G", i: 4 }, { l: "A", i: 5 }];

export function pianoSvg() {
  const kw = 38, kh = 110;
  let s = `<svg viewBox="0 0 ${kw * 8 + 2} ${kh + 2}" role="group" aria-label="Klaviatur">`;
  WHITE.forEach((l, i) => { s += `<rect class="wkey" data-semi="${SEMI[l]}" data-id="w${i}" x="${1 + i * kw}" y="1" width="${kw}" height="${kh}" rx="3"/>`; s += `<text class="klabel" x="${1 + i * kw + kw / 2}" y="${kh - 8}" text-anchor="middle">${l}</text>`; });
  BLACK.forEach((b) => { s += `<rect class="bkey" data-semi="${SEMI[b.l] + 1}" data-id="b${b.i}" x="${1 + (b.i + 1) * kw - 12}" y="1" width="24" height="${kh * 0.6}" rx="2"/>`; });
  return s + "</svg>";
}
