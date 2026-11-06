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
  // Fähnchen zum Anhängen an einen Hals: eins (Achtel) bzw. zwei (Sechzehntel) in einem Zeichen
  flags: { 8: "\u{1D16E}", 16: "\u{1D16F}" },
};

const yOf = (p) => BOTTOM - p * (S / 2);
const r2 = (v) => Math.round(v * 100) / 100;
// Mittellinie der Zeile
const MID = TOP + 2 * S;

/* Maße der Noten. Alle Werte sind an Verovio 6.4.1 mit der SMuFL-Schrift Bravura gemessen
   (Referenz-Rendering bei 12 px pro Linienabstand, Ellipsen-Fit über die Flächenmomente der Pixel,
   Messbericht 2026-11-06). Leipzig, die Standardschrift von Verovio, weicht davon höchstens 7 % ab. */
// Schwarzer Notenkopf: Halbachsen 0,638 × 0,438 Linienabstände, um 31° gekippt (Bravura noteheadBlack);
// damit ist der Kopf 1,18 breit und genau 1 Linienabstand hoch (vorher 1,08 × 0,83).
export const HEAD = { rx: 7.7, ry: 5.25, rot: -31 };
// Hohle Köpfe als Fläche mit Loch (fill-rule evenodd) statt als dünner Ring:
// halbe Note außen 0,633 × 0,453 / −31°, Loch 0,533 × 0,221 / −30° (Bravura noteheadHalf);
// ganze Note außen 0,857 × 0,505 / 0°, Loch 0,472 × 0,346 / +46° (Bravura noteheadWhole), 1,7 breit.
const OPEN_HEADS = {
  2: { outer: [7.6, 5.44, -31], hole: [6.4, 2.65, -30] },
  1: { outer: [10.28, 6.06, 0], hole: [5.66, 4.15, 46] },
};
// Hals: Strichstärke 1,8 (css/style.css). Die Außenkante des Halses schließt bündig mit der
// Außenkante des Kopfes ab (Referenz: Abstand 0,00) → Halsmitte 7,1 − 0,9 = 6,2 neben der Kopfmitte.
// Der Hals beginnt 2 Einheiten (0,17 Linienabstände, Bravura-Anker stemUpSE/stemDownNW in Verovio)
// über bzw. unter der Kopfmitte.
const STEM_W = 1.8, STEM_DX = 6.2, STEM_DY = 2;
// Halslänge: 3,5 Linienabstände ab Kopfmitte (vorher 3,33). Noten außerhalb der Zeile reichen bis zur
// Mittellinie, mit Fähnchen einen halben Linienabstand weiter (so setzt es Verovio, gemessen an a, f, c'''
// und e''' als Viertel, Achtel und Sechzehntel).
const STEM_LEN = 3.5 * S;
// Fähnchen-Glyphen aus Noto Music bei 48px (= 4 Linienabstände, Maßstab der Schrift):
// Achtel 3,0 hoch und 1,1 breit (Bravura 3,3 × 1,05, Leipzig 2,8 × 1,1), Sechzehntel 3,3 × 1,15
// (Bravura 3,3 × 1,1). Die Oberkante der Glyphe liegt 1009/1000 em über der Grundlinie, ihre linke
// Kante bei x = 0; sie sitzt auf der linken Kante des Halses (Referenz: das Fähnchen beginnt 0,1 links
// der Halsaußenkante). Bei Hals nach unten wird dieselbe Glyphe senkrecht gespiegelt: sie hängt am
// unteren Halsende und schwingt nach oben, wie Bravura flag8thDown.
const FLAG_SIZE = 48, FLAG_TOP = r2((1009 / 1000) * FLAG_SIZE);
// Vorzeichen vor der Note: rechte Kante 0,25 Linienabstände vor dem Kopf (Referenz 0,23–0,25; vorher 0,54–0,62).
// Noto Music: ♯ reicht bis 275/1000 em, ♭ bis 249/1000 em (bei 44px: 12,1 bzw. 11,0).
// Die Werte gelten für den schwarzen Kopf (halbe Breite 7,13 = 0,59 LA) und ebenso für die halbe Note.
const ACC_X = { sharp: -22, flat: -21 };
// Die ganze Note ist breiter (halbe Breite 10,28 = 0,86 LA statt 7,13): Vorzeichen rücken um die
// Differenz 3,15 weiter nach links, damit der Abstand zum Kopf gleich bleibt (Verovio 6.4.1/Bravura
// und Leipzig: 0,23–0,25 LA bei jedem Notenwert; nachgemessen an ♯/♭ vor f', g', h', es'' und f).
const BLACK_HALF_W = 7.13;
const ACC_SHIFT = { 1: r2(OPEN_HEADS[1].outer[0] - BLACK_HALF_W) };
// Hilfslinien: halbe Länge ab Kopfmitte. Verovio lässt die Hilfslinie bei jedem Notenwert 0,25–0,27 LA
// über den Kopf hinausragen (Bravura: ganze Note 2,22 LA lang, Viertel 1,70; Leipzig 2,15 bzw. 1,80).
// Schwarze und halbe Köpfe behalten 11 (1,83 LA lang, ragt 0,32 hinaus, innerhalb der Toleranz);
// die ganze Note bekommt 10,28 + 0,26 · 12 = 13,4 (2,23 LA lang), vorher 11 (ragte nur 0,06 hinaus).
const LEDGER_HALF = { 1: 13.4 };
const LEDGER_HALF_DEFAULT = 11;
// Hat die Note eine Hilfslinie (durch den Kopf oder direkt daneben, z. B. c', h, a'', h''), hält Verovio das
// Vorzeichen von der Hilfslinie frei: Abstand zum Kopf 0,38–0,40 LA statt 0,25, zur Hilfslinie 0,12–0,13
// (Bravura und Leipzig, alle Notenwerte, gemessen an 36 Fällen). Wir rücken dann um 1,9 (0,16 LA) weiter
// nach links: Abstand zum Kopf 0,38–0,41, zur Hilfslinie 0,07 (schwarz und halb, unsere Hilfslinie ragt
// 0,32 hinaus) bzw. 0,13 (ganze Note). Ohne Hilfslinie unverändert.
const ACC_LEDGER_SHIFT = 1.9;

function ellipsePath(cx, cy, rx, ry, deg) {
  const t = (deg * Math.PI) / 180, dx = rx * Math.cos(t), dy = rx * Math.sin(t);
  const a = `${r2(cx + dx)} ${r2(cy + dy)}`, b = `${r2(cx - dx)} ${r2(cy - dy)}`;
  return `M${a}A${rx} ${ry} ${deg} 1 0 ${b}A${rx} ${ry} ${deg} 1 0 ${a}Z`;
}

// Note mit Hals, Hilfslinien und Vorzeichen.
// cls: "", "ok", "bad" oder "ghost"; opts.value: 1, 2, 4, 8, 16 (Standard 4); opts.stemless: ohne Hals.
export function noteSvg(n, clef, x, cls, opts = {}) {
  const value = opts.value || 4;
  const p = staffPos(n, clef), cy = yOf(p);
  let s = `<g class="note ${cls || ""}">`;
  const lh = LEDGER_HALF[value] || LEDGER_HALF_DEFAULT;
  const ledger = (q) => `<line class="ledger" x1="${r2(x - lh)}" x2="${r2(x + lh)}" y1="${yOf(q)}" y2="${yOf(q)}"/>`;
  for (let q = -2; q >= p; q -= 2) s += ledger(q);
  for (let q = 10; q <= p; q += 2) s += ledger(q);
  if (n.acc) {
    const k = n.acc > 0 ? "sharp" : "flat";
    const shift = (ACC_SHIFT[value] || 0) + (p <= -2 || p >= 10 ? ACC_LEDGER_SHIFT : 0);
    s += `<text class="acc" x="${r2(x + ACC_X[k] - shift)}" y="${cy + ACC_DY[k]}">${n.acc > 0 ? "♯" : "♭"}</text>`;
  }
  // Hals nach oben unterhalb der Mittellinie, ab der Mittellinie nach unten
  const up = p < 4;
  // Ganze Noten haben keinen Hals
  if (value !== 1 && !opts.stemless) {
    const flagged = value === 8 || value === 16;
    const len = Math.max(STEM_LEN, Math.abs(cy - MID) + (flagged ? S / 2 : 0));
    const sx = r2(up ? x + STEM_DX : x - STEM_DX), y1 = up ? cy - STEM_DY : cy + STEM_DY, y2 = r2(up ? cy - len : cy + len);
    s += `<line class="stem" x1="${sx}" x2="${sx}" y1="${y1}" y2="${y2}"/>`;
    // Fähnchen: immer rechts vom Hals
    if (flagged) {
      const fx = r2(sx - STEM_W / 2), g = GLYPHS.flags[value];
      s += up
        ? `<text class="flag" x="${fx}" y="${r2(y2 + FLAG_TOP)}" font-size="${FLAG_SIZE}">${g}</text>`
        : `<text class="flag" transform="translate(${fx} ${y2}) scale(1 -1)" x="0" y="${FLAG_TOP}" font-size="${FLAG_SIZE}">${g}</text>`;
    }
  }
  const open = OPEN_HEADS[value];
  s += open
    ? `<path class="notehead open" d="${ellipsePath(x, cy, ...open.outer)}${ellipsePath(x, cy, ...open.hole)}"/>`
    : `<ellipse class="notehead" cx="${x}" cy="${cy}" rx="${HEAD.rx}" ry="${HEAD.ry}" transform="rotate(${HEAD.rot} ${x} ${cy})"/>`;
  return s + "</g>";
}

// Pausen. Lage und Größe an Verovio 6.4.1/Bravura gemessen (Angaben in Linienabständen unter der obersten Linie).
// Viertel-, Achtel- und Sechzehntelpause sind Glyphen aus Noto Music bei 48px (= 4 Linienabstände);
// ihre Grundlinie ergibt sich aus den Glyphenmaßen (Einheiten pro em 1000, gemessen mit fontTools):
// Viertel 123..878, Achtel 269..730, Sechzehntel 147..852 – Mitte 500,5 bzw. 499,5.
const REST_SIZE = 48;
const REST_UNIT = REST_SIZE / 1000;
const REST_BASE = {
  // Viertelpause: Mitte auf der Mittellinie (Bravura 0,49..3,49, Leipzig 0,49..3,53)
  4: TOP + 2 * S + 500.5 * REST_UNIT,
  // Achtelpause: Mitte 2,13 (Bravura 2,14, Leipzig 2,12); vorher auf die Mittellinie zentriert, 0,13 zu hoch
  8: TOP + 2.13 * S + 499.5 * REST_UNIT,
  // Sechzehntelpause: Mitte 2,625 (Bravura 2,63, Leipzig 2,62); vorher auf die Mittellinie zentriert, 0,62 zu hoch
  16: TOP + 2.625 * S + 499.5 * REST_UNIT,
};
// Ganze und halbe Pause als Balken: 1,17 breit und 0,54 hoch (Bravura 1,13 × 0,55, Leipzig 1,19 × 0,50).
// Die Glyphen aus Noto Music sind 1,45 breit und tragen ein Stück Notenlinie mit sich, daher ein Rechteck.
// Die ganze Pause hängt an der vierten Linie von unten (Referenz 0,95..1,50), die halbe sitzt auf der
// Mittellinie (Referenz 1,41..1,98); der Linienstrich wird zur Hälfte mit überdeckt.
// Mitte des Balkens wie vorher bei der Glyphe 18,8 rechts von x (Noto Music: Balken 210..573 bei 48px).
const BAR_REST = { w: 14, h: 6.5, cx: 18.8, y: { 1: TOP + S - 0.5, 2: TOP + 2 * S - 6.5 } };

// Pause (1, 2, 4, 8, 16) an Position x
export function restSvg(value, x) {
  if (BAR_REST.y[value] !== undefined) {
    return `<rect class="rest" data-value="${value}" x="${r2(x + BAR_REST.cx - BAR_REST.w / 2)}" y="${BAR_REST.y[value]}" width="${BAR_REST.w}" height="${BAR_REST.h}"/>`;
  }
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
const KEYSIG_X = { treble: 64, bass: 70 }, KEYSIG_STEP = 12;
// Vorzeichen (vor Noten und in der Vorzeichnung) werden mit 44px gesetzt (css/style.css .acc, .keysig).
// Gemessen gegen Verovio/Bravura: ♯ 2,77 hoch (Bravura 2,78, Leipzig 2,77), ♭ 2,45 hoch (Bravura 2,45,
// Leipzig 2,57). Bei 40px waren beide 9 % kleiner und ein Viertel schmaler als Bravura.
export const ACC_SIZE = 44;
// Senkrechter Versatz der Grundlinie unter die Linie/den Zwischenraum (bei 44px gemessen):
// ♯ – das Innenfeld zwischen den Querbalken liegt mittig auf der Linie (wie Bravura und Leipzig);
// ♭ – Bauch und Loch liegen wie bei Bravura (Bauch-Mitte 0,13 über, Loch-Mitte 0,03 unter der Linie).
export const KEYSIG_DY = { sharp: 6, flat: 5.5 };
// Vorzeichen vor einzelnen Noten haben dieselbe Schriftgröße und damit denselben Versatz.
export const ACC_DY = KEYSIG_DY;

export function keySigSvg(clef, count) {
  if (!count) return "";
  const sharp = count > 0;
  const list = (sharp ? SHARPS_TREBLE : FLATS_TREBLE).slice(0, Math.min(7, Math.abs(count)));
  const shift = clef === "bass" ? BASS_SHIFT : 0;
  const x0 = KEYSIG_X[clef] ?? KEYSIG_X.treble, dy = sharp ? KEYSIG_DY.sharp : KEYSIG_DY.flat;
  return list.map((p, i) => `<text class="keysig" x="${x0 + i * KEYSIG_STEP}" y="${yOf(p + shift) + dy}">${sharp ? "♯" : "♭"}</text>`).join("");
}

// Bassschlüssel: die beiden Punkte liegen in den Zwischenräumen über und unter der F-Linie
// (Referenz Bravura 0,48 / 1,47, Leipzig 0,50 / 1,45 Linienabstände unter der obersten Linie).
// Mit der Grundlinie BOTTOM + 1 lagen sie bei 0,92 / 1,84, also 0,4 zu tief.
const BASS_CLEF_Y = BOTTOM - 3.9;

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
    : `<text class="clef" x="24" y="${BASS_CLEF_Y}" font-size="${S * 4.2}">${GLYPHS.bass}</text>`;
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
