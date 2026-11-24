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
// Auflösungszeichen ♮ (Welle 10, A3): Noto Music reicht bis 226/1000 em (bei NAT_SIZE 46px: 10,4).
// Verovio 6.4.1/Bravura setzt ♮ wie ♯ und ♭ mit 0,245 LA Abstand zum Kopf (Leipzig 0,25; gemessen an
// d', e', h', c'', e'' und c' als ganze, halbe und Viertelnote): rechte Kante bei −7,13 − 2,94 → x −20,5.
const ACC_X = { sharp: -22, flat: -21, natural: -20.5 };
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

/* Balken (Welle 10, Schritt 5). Gemessen an Verovio 6.4.1 mit Bravura (Leipzig gleich) an h' mit Hals nach
   unten in den Gruppen „8 8“, „16 16 8“ und „8 16 16“ (Referenz bei 180 Einheiten pro LA):
   - Balkendicke 0,50 LA, Abstand zwischen den beiden Balken 0,25 LA (Verovio setzt damit die SMuFL-
     engravingDefaults beamThickness 0,5 und beamSpacing 0,25 von Bravura um).
   - Der Balken liegt waagrecht; seine Außenkante 3,25 LA unter der Kopfmitte, 0,08 LA näher am Kopf als
     das Halsende einer einzelnen Viertel oder Achtel (3,33). Mit zwei Balken wird der Hals nicht länger:
     der erste Balken bleibt außen, der zweite liegt 0,25 LA weiter innen.
   - Die Hälse enden 0,10 LA vor der Außenkante, also im Balken.
   - Der Balken reicht von der Außenkante des ersten bis zur Außenkante des letzten Halses. Der zweite
     Balken endet am Gruppenende ebenso an der Halskante, innen in der Gruppe in der Halsmitte.
   Unsere Hälse sind 3,5 LA lang (bewusste Abweichung, ARCHITEKTUR); damit gebalkte und einzelne Hälse
   zueinander stehen wie bei Verovio, liegt die Außenkante 0,08 LA (1 Einheit) vor unserem Halsende. */
export const BEAM = { thick: 0.5 * S, gap: 0.25 * S, outer: STEM_LEN - 1, stemIn: 0.1 * S };

// Halsmitte (x) einer Note mit Kopfmitte x; up = Hals nach oben
export const stemX = (x, up) => r2(up ? x + STEM_DX : x - STEM_DX);

// Waagrechte Balken unter (Hals nach unten) bzw. über (Hals nach oben) einer Gruppe.
// xs: Kopfmitten der Noten, cy: Höhe der Köpfe (alle gleich), up: Halsrichtung,
// levels: [[i, j], …] Bereiche (Indizes in xs) für den zweiten Balken (Sechzehntel); cls: Klasse am <g>.
export function beamSvg(xs, cy, up = false, levels = [], cls = "") {
  const sx = xs.map((x) => stemX(x, up)), last = xs.length - 1, half = STEM_W / 2;
  const dir = up ? -1 : 1, outer = cy + dir * BEAM.outer;
  const rect = (x1, x2, edge) => {
    const y = up ? edge : edge - BEAM.thick;
    return `<rect class="beam" x="${r2(x1)}" y="${r2(y)}" width="${r2(x2 - x1)}" height="${BEAM.thick}"/>`;
  };
  let s = `<g class="beam-group${cls ? " " + cls : ""}">` + rect(sx[0] - half, sx[last] + half, outer);
  const edge2 = outer - dir * (BEAM.thick + BEAM.gap);
  for (const [i, j] of levels) s += rect(i === 0 ? sx[0] - half : sx[i], j === last ? sx[last] + half : sx[j], edge2);
  return s + "</g>";
}
// y des Halsendes einer gebalkten Note (endet im Balken)
export const beamStemEnd = (cy, up = false) => r2(cy + (up ? -1 : 1) * (BEAM.outer - BEAM.stemIn));

// Note mit Hals, Hilfslinien und Vorzeichen.
// cls: "", "ok", "bad", "warn" (langsam, Notenkarte), "new" (neu, Notenkarte) oder "ghost"; opts.value: 1, 2, 4, 8, 16 (Standard 4); opts.stemless: ohne Hals;
// opts.natural: Auflösungszeichen ♮ vor der Note (nur wenn sie selbst kein Vorzeichen hat).
// opts.flagless (Balken, Welle 10): ohne Fähnchen, der Hals endet im Balken (beamStemEnd) statt nach STEM_LEN.
export function noteSvg(n, clef, x, cls, opts = {}) {
  const value = opts.value || 4;
  const p = staffPos(n, clef), cy = yOf(p);
  let s = `<g class="note ${cls || ""}">`;
  const lh = LEDGER_HALF[value] || LEDGER_HALF_DEFAULT;
  const ledger = (q) => `<line class="ledger" x1="${r2(x - lh)}" x2="${r2(x + lh)}" y1="${yOf(q)}" y2="${yOf(q)}"/>`;
  for (let q = -2; q >= p; q -= 2) s += ledger(q);
  for (let q = 10; q <= p; q += 2) s += ledger(q);
  // opts.natural: Auflösungszeichen ♮ vor einer Note ohne Vorzeichen (z. B. d' nach des' an derselben Stelle)
  const k = opts.natural && !n.acc ? "natural" : n.acc > 0 ? "sharp" : n.acc < 0 ? "flat" : null;
  if (k) {
    const shift = (ACC_SHIFT[value] || 0) + (p <= -2 || p >= 10 ? ACC_LEDGER_SHIFT : 0);
    s += `<text class="${k === "natural" ? "acc nat" : "acc"}" x="${r2(x + ACC_X[k] - shift)}" y="${cy + ACC_DY[k]}">${ACC_CHAR[k]}</text>`;
  }
  // Hals nach oben unterhalb der Mittellinie, ab der Mittellinie nach unten
  const up = p < 4;
  // Ganze Noten haben keinen Hals
  if (value !== 1 && !opts.stemless) {
    const flagged = value === 8 || value === 16;
    const len = Math.max(STEM_LEN, Math.abs(cy - MID) + (flagged ? S / 2 : 0));
    const sx = stemX(x, up), y1 = up ? cy - STEM_DY : cy + STEM_DY;
    const y2 = opts.flagless ? beamStemEnd(cy, up) : r2(up ? cy - len : cy + len);
    s += `<line class="stem" x1="${sx}" x2="${sx}" y1="${y1}" y2="${y2}"/>`;
    // Fähnchen: immer rechts vom Hals
    if (flagged && !opts.flagless) {
      const fx = r2(sx - STEM_W / 2), g = GLYPHS.flags[value];
      s += up
        ? `<text class="flag" x="${fx}" y="${r2(y2 + FLAG_TOP)}" font-size="${FLAG_SIZE}">${g}</text>`
        : `<text class="flag" transform="translate(${fx} ${y2}) scale(1 -1)" x="0" y="${FLAG_TOP}" font-size="${FLAG_SIZE}">${g}</text>`;
    }
  }
  s += noteheadSvg(x, cy, value);
  return s + "</g>";
}

// Nur der Notenkopf (ohne Hals, Hilfslinien, Vorzeichen) mit Mitte (x, y), wie ihn noteSvg zeichnet:
// value 4, 8, 16 schwarz (HEAD), 2 und 1 hohl (OPEN_HEADS). Die Ansicht „Lernen“ nutzt ihn für die Notenreihe.
export function noteheadSvg(x, y, value = 4) {
  const open = OPEN_HEADS[value];
  return open
    ? `<path class="notehead open" d="${ellipsePath(x, y, ...open.outer)}${ellipsePath(x, y, ...open.hole)}"/>`
    : `<ellipse class="notehead" cx="${x}" cy="${y}" rx="${HEAD.rx}" ry="${HEAD.ry}" transform="rotate(${HEAD.rot} ${x} ${y})"/>`;
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
// Ganze und halbe Pause als Rechteck: 1,17 breit und 0,54 hoch (Bravura 1,13 × 0,55, Leipzig 1,19 × 0,50).
// Die Glyphen aus Noto Music sind 1,45 breit und tragen ein Stück Notenlinie mit sich, daher ein Rechteck.
// Die ganze Pause hängt an der vierten Linie von unten (Referenz 0,95..1,50), die halbe sitzt auf der
// Mittellinie (Referenz 1,41..1,98); der Linienstrich wird zur Hälfte mit überdeckt.
// Mitte des Rechtecks wie vorher bei der Glyphe 18,8 rechts von x (Noto Music: Rechteck 210..573 bei 48px).
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
// Abstand Schlüssel → erstes Vorzeichen in beiden Schlüsseln 10,8 Einheiten (0,9 LA, im Browser gemessen):
// Violinschlüssel rechte Kante 55,3, erstes Vorzeichen ab 66,2; Punkte des Bassschlüssels (Bravura)
// bis 58,8, erstes Vorzeichen ab 69,7. Vorher (Noto-Glyphe, Punkte bis 61,3) stand der Bass bei 70.
const KEYSIG_X = { treble: 64, bass: 67.5 }, KEYSIG_STEP = 12;
// Vorzeichen (vor Noten und in der Vorzeichnung) werden mit 44px gesetzt (css/style.css .acc, .keysig).
// Gemessen gegen Verovio/Bravura: ♯ 2,77 hoch (Bravura 2,78, Leipzig 2,77), ♭ 2,45 hoch (Bravura 2,45,
// Leipzig 2,57). Bei 40px waren beide 9 % kleiner und ein Viertel schmaler als Bravura.
export const ACC_SIZE = 44;
// Senkrechter Versatz der Grundlinie unter die Linie/den Zwischenraum (bei 44px gemessen):
// ♯ – das Innenfeld zwischen den Querbalken liegt mittig auf der Linie (wie Bravura und Leipzig);
// ♭ – Bauch und Loch liegen wie bei Bravura (Bauch-Mitte 0,13 über, Loch-Mitte 0,03 unter der Linie).
export const KEYSIG_DY = { sharp: 6, flat: 5.5 };
// Vorzeichen vor einzelnen Noten haben dieselbe Schriftgröße und damit denselben Versatz.
// Auflösungszeichen ♮ (Welle 10, A3): Bravura accidentalNatural ist 2,70 LA hoch (Leipzig 2,81) und reicht
// 1,36 LA über und 1,34 LA unter die Linie (Verovio 6.4.1, Mitte 0,01 LA über der Linie). Die Glyphe aus
// Noto Music ist 707/1000 em hoch (y −221…486): bei NAT_SIZE 46px 32,5 = 2,71 LA (bei 44px nur 2,59).
// Grundlinie 6 unter der Linie: Oberkante −16,4 (−1,36 LA), Unterkante +16,2 (+1,35 LA).
export const NAT_SIZE = 46;
export const ACC_DY = { ...KEYSIG_DY, natural: 6 };
const ACC_CHAR = { sharp: "♯", flat: "♭", natural: "♮" };

// Lage der Vorzeichen einer Vorzeichnung: [{ x, y, line, sharp }] mit x links, y Grundlinie der Glyphe,
// line Höhe der Linie bzw. des Zwischenraums. step (optional, Standard KEYSIG_STEP) und x0 (optional)
// ändern nur den Abstand bzw. Anfang, z. B. für die Vorführung „So findest du die Tonart“ (Paket „Tonleitern“).
export function keySigPos(clef, count, step = KEYSIG_STEP, x0 = KEYSIG_X[clef] ?? KEYSIG_X.treble) {
  if (!count) return [];
  const sharp = count > 0;
  const list = (sharp ? SHARPS_TREBLE : FLATS_TREBLE).slice(0, Math.min(7, Math.abs(count)));
  const shift = clef === "bass" ? BASS_SHIFT : 0, dy = sharp ? KEYSIG_DY.sharp : KEYSIG_DY.flat;
  return list.map((p, i) => ({ x: x0 + i * step, y: yOf(p + shift) + dy, line: yOf(p + shift), sharp }));
}

export function keySigSvg(clef, count) {
  return keySigPos(clef, count).map((k) => `<text class="keysig" x="${k.x}" y="${k.y}">${k.sharp ? "♯" : "♭"}</text>`).join("");
}

// Bassschlüssel: Umriss der Glyphe fClef (U+E062) aus der SMuFL-Schrift Bravura 1.482
// (SIL Open Font License 1.1, Lizenz in fonts/OFL-Bravura.txt), mit fontTools ausgelesen.
// Einheiten der Schrift: 1000 pro em, nach SMuFL ist 1 em = 4 Linienabstände, also 250 pro LA;
// y zeigt nach oben, der Ursprung y = 0 liegt auf der F-Linie. Umriss: x −5..684, y −635..262,
// also −0,02..2,74 × −2,54..+1,05 LA. Der Kopf (gefüllter Kreis, x 0..229, Mitte y ≈ −5) liegt auf der
// F-Linie, die Punkte (Mitte y = ±125) in den Zwischenräumen darüber und darunter, der Bogen endet
// 2,54 LA unter der F-Linie, also knapp über der untersten Linie (wie Bravura/Verovio).
// Vorher war es die Glyphe U+1D122 aus Noto Music: Kopf 0,18 LA über der F-Linie, Ende 2,25 LA darunter.
export const BASS_CLEF_PATH = "M252 262C78 262 0 135 0 39C0 -41 42 -110 123 -110C186 -110 229 -66 229 -4C229 60 182 100 133 100C106 100 96 93 83 93C70 93 67 101 67 111C67 151 127 224 229 224C335 224 381 120 381 -37C381 -140 359 -260 297 -356C237 -449 134 -534 10 -605C1 -610 -5 -615 -5 -623C-5 -629 -1 -635 8 -635C13 -635 19 -633 25 -630C158 -565 286 -489 392 -375C479 -281 531 -159 531 -28C531 146 425 262 252 262ZM629 180C598 180 574 156 574 125C574 94 598 70 629 70C660 70 684 94 684 125C684 156 660 180 629 180ZM630 -71C599 -71 576 -94 576 -125C576 -156 599 -179 630 -179C661 -179 684 -156 684 -125C684 -94 661 -71 630 -71Z";
// Ursprung der Glyphe: x wie die linke Kante des alten Schlüssels, y auf der F-Linie (zweite Linie von oben).
export const BASS_CLEF = { x: 26, y: TOP + S, scale: S / 250 };

// Komplette Notenzeile mit Schlüssel; inner wird eingesetzt.
// opts darf ein String sein (zusätzliche Klasse wie in der ersten Fassung) oder
// { cls, height, keySig, width }: height erhöht die Höhe, keySig = Anzahl ♯ (positiv) bzw. ♭ (negativ),
// width ändert die Breite (Standard W = 320; die Linien enden dann W − X1 = 18 vor dem rechten Rand).
export function staffSvg(clef, inner, opts) {
  const o = typeof opts === "string" ? { cls: opts } : (opts || {});
  const h = o.height && o.height > H ? o.height : H;
  const w = o.width && o.width > 0 ? o.width : W, x1 = w - (W - X1);
  let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Notenzeile" class="${o.cls || ""}">`;
  for (let i = 0; i < 5; i++) s += `<line class="staff-line" x1="${X0}" x2="${x1}" y1="${TOP + i * S}" y2="${TOP + i * S}"/>`;
  s += clef === "treble"
    ? `<text class="clef" x="22" y="${BOTTOM}" font-size="${S * 4.2}">${GLYPHS.treble}</text>`
    : `<path class="clef" transform="translate(${BASS_CLEF.x} ${BASS_CLEF.y}) scale(${BASS_CLEF.scale} ${-BASS_CLEF.scale})" d="${BASS_CLEF_PATH}"/>`;
  s += keySigSvg(clef, o.keySig);
  return s + inner + "</svg>";
}

/* ---------- Klaviatur ---------- */
export const WHITE = ["C", "D", "E", "F", "G", "A", "H", "C"];
export const BLACK = [{ l: "C", i: 0 }, { l: "D", i: 1 }, { l: "F", i: 3 }, { l: "G", i: 4 }, { l: "A", i: 5 }];

// Klaviatur. Ohne Parameter wie bisher: eine Oktave C bis C (8 weiße, 5 schwarze Tasten), anklickbar,
// data-semi = Halbtöne über C (0 bis 11, das obere C wieder 0).
// Mit Parametern (Hilfen, seit „Intervalle neu“): from = MIDI-Nummer des untersten C, octaves = Anzahl
// der Oktaven (weiße Tasten bis zum C darüber), marks = MIDI-Nummern der markierten Tasten (Klasse mark),
// interactive = false: nur zum Anschauen (Klasse keys-static am <svg>, keine data-semi, größere Schrift
// über CSS). Jede Taste trägt dann data-midi.
// counts (seit der Vorführung): [[MIDI-Nummer, Beschriftung] …] – gezählte Tasten (Klasse count, Schritt 2
// grün) mit ihrer Zahl auf der Taste (weiß: unter den schwarzen Tasten, schwarz: unten in der Taste).
// start (Welle 10, B6): MIDI-Nummer der Starttaste beim Halbtöne-Zählen; sie trägt die Aufschrift „Start“
// (START_LABEL) an der Stelle der Zahlen, weil sie selbst nicht mitzählt. Auf einer schwarzen Taste ist
// dafür kein Platz: dort steht „S“ (START_SHORT; keine Ziffer, eine „0“ neben 1, 2, 3 lud zum Mitzählen ein –
// Abschlussprüfung Welle 10). Bei zwei Oktaven und schmalem Bildschirm (bis 380 px) wird „Start“ zu klein,
// dann zeigt css/style.css ebenfalls „S“ (Klasse keys-wide am <svg>).
// fit (Welle 10, B13): [tiefste, höchste MIDI-Nummer] – nur der nötige Ausschnitt der Oktaven wird gezeichnet:
// die Tasten von fit[0] bis fit[1], je eine weiße Taste Rand und mindestens FIT_MIN weiße Tasten (eine
// Oktave). Weniger Tasten heißt breitere Tasten: Namen und Zahlen bleiben bei 320 px lesbar (≥ 9 px).
// keys-wide (kleinere Bildschirme: „S“ statt „Start“) gilt dann erst ab mehr als WIDE_KEYS weißen Tasten.
export const START_LABEL = "Start", START_SHORT = "S";
export const FIT_MIN = 8, WIDE_KEYS = 10;
// Weiße Taste (Index ab from) zu einer MIDI-Nummer; schwarze Tasten: die weiße darunter (up: darüber)
const WHITE_OF = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
export function whiteIndex(from, m, up = false) {
  const d = m - from, o = Math.floor(d / 12), semi = ((d % 12) + 12) % 12;
  const black = [1, 3, 6, 8, 10].includes(semi);
  return 7 * o + WHITE_OF[semi] + (black && up ? 1 : 0);
}
// Sichtbarer Bereich [erste, letzte weiße Taste] für fit
export function fitRange(from, octaves, fit) {
  const last = octaves * 7;
  if (!fit || from === null) return [0, last];
  let lo = Math.max(0, whiteIndex(from, Math.min(...fit)) - 1), hi = Math.min(last, whiteIndex(from, Math.max(...fit), true) + 1);
  while (hi - lo + 1 < FIT_MIN && hi < last) hi++;
  while (hi - lo + 1 < FIT_MIN && lo > 0) lo--;
  return [lo, hi];
}
export function pianoSvg(opts = {}) {
  const { from = null, octaves = 1, marks = [], interactive = true, counts = [], start = null, fit = null } = opts;
  const kw = interactive ? 38 : 30, kh = interactive ? 110 : 96, bw = interactive ? 24 : 18;
  const [lo, hi] = fitRange(from, octaves, fit), x0 = 1 - lo * kw, n = hi - lo + 1;
  const whites = Array.from({ length: octaves * 7 + 1 }, (_, i) => ({ l: WHITE[i % 7], o: Math.floor(i / 7), i, last: i === octaves * 7 }))
    .filter(({ i }) => i >= lo && i <= hi);
  const blacks = Array.from({ length: octaves }, (_, o) => BLACK.map((b) => ({ ...b, o, i: b.i + 7 * o }))).flat()
    .filter((b) => b.i >= lo && b.i + 1 <= hi);
  const mk = new Set(marks);
  const keyAttr = (semi, o) => {
    if (from === null) return interactive ? ` data-semi="${semi}"` : "";
    const m = from + 12 * o + semi;
    return `${interactive ? ` data-semi="${semi}"` : ""} data-midi="${m}"`;
  };
  const isMark = (semi, o) => from !== null && mk.has(from + 12 * o + semi);
  const cnt = new Map(from === null ? [] : counts);
  const countOf = (semi, o) => cnt.get(from + 12 * o + semi);
  const keyCls = (semi, o) => `${isMark(semi, o) ? " mark" : ""}${countOf(semi, o) !== undefined ? " count" : ""}`;
  const bh = Math.round(kh * 6) / 10;
  const isStart = (semi, o) => from !== null && start !== null && from + 12 * o + semi === start;
  const staticCls = `keys-static${n > WIDE_KEYS ? " keys-wide" : ""}`;
  let s = `<svg viewBox="0 0 ${kw * n + 2} ${kh + 2}"${interactive ? "" : ` class="${staticCls}"`} role="${interactive ? "group" : "img"}" aria-label="Klaviatur">`;
  whites.forEach(({ l, o, i, last }) => {
    const semi = SEMI[l];
    // das obere C gehört zur nächsten Oktave (data-semi 0 wie bisher)
    const oo = last ? octaves : o;
    s += `<rect class="wkey${keyCls(semi, oo)}"${keyAttr(semi, oo)} data-id="w${i}" x="${x0 + i * kw}" y="1" width="${kw}" height="${kh}" rx="3"/>`;
    s += `<text class="klabel${keyCls(semi, oo)}" x="${x0 + i * kw + kw / 2}" y="${kh - 8}" text-anchor="middle">${l}</text>`;
    const c = countOf(semi, oo);
    if (c !== undefined) s += `<text class="kcount" x="${x0 + i * kw + kw / 2}" y="${Math.round(bh + 16)}" text-anchor="middle">${c}</text>`;
    if (isStart(semi, oo)) {
      const x = x0 + i * kw + kw / 2, y = Math.round(bh + 16);
      s += `<text class="kcount kstart kstart-long" data-start="${start}" x="${x}" y="${y}" text-anchor="middle">${START_LABEL}</text>`
        + `<text class="kcount kstart kstart-short" data-start="${start}" x="${x}" y="${y}" text-anchor="middle">${START_SHORT}</text>`;
    }
  });
  blacks.forEach((b) => {
    const semi = SEMI[b.l] + 1;
    s += `<rect class="bkey${keyCls(semi, b.o)}"${keyAttr(semi, b.o)} data-id="b${b.i}" x="${x0 + (b.i + 1) * kw - bw / 2}" y="1" width="${bw}" height="${bh}" rx="2"/>`;
    const c = countOf(semi, b.o);
    if (c !== undefined) s += `<text class="kcount on-black" x="${x0 + (b.i + 1) * kw}" y="${Math.round(bh - 6)}" text-anchor="middle">${c}</text>`;
    if (isStart(semi, b.o)) s += `<text class="kcount on-black kstart" data-start="${start}" x="${x0 + (b.i + 1) * kw}" y="${Math.round(bh - 6)}" text-anchor="middle">${START_SHORT}</text>`;
  });
  return s + "</svg>";
}
