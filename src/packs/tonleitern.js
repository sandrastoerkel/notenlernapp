// Paket „Tonleitern“ (seit Welle 8 „Tonleitern gehirngerecht“, docs/PLAN.md): 13 Stufen, erst mit Hilfen,
// dann ohne. Dur-Tonleitern bis 4 Vorzeichen (Stufen 1–9), Tonart aus den Vorzeichen (10, 11) und parallele
// Molltonart (12, 13), je bis 7 Vorzeichen. Grundlage: LehrplanPLUS Gymnasium Musik Kl. 5 (Dur-Tonleitern
// mit verschiedenen Grundtönen, Ganz- und Halbtonschritt) und KONZEPT-gehirngerecht (Sandra, 20.11.2026).
// Die zwei Denkschritte: 1 (violett) = Bauplan Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb,
// 2 (grün) = Klaviatur: Halbtöne zählen → Vorzeichen. Bei den Tonarten: 1 = das entscheidende Vorzeichen,
// 2 = Halbton höher bzw. ablesen; bei Moll: 1 = Terz abwärts (Stammton), 2 = drei Halbtöne abwärts.
// In den Tonleitern nur Dur, keine Doppelvorzeichen, keine Eis/His/Ces/Fes (in den Vorzeichnungen bis 7
// kommen Eis, His, Ces und Fes vor). Moll-Tonleitern folgen später als tonleitern-14 ff.
import { N, LETTERS, dia, midi, pc, SEMI, gName, helm, majorScale, staffPos, majorKeyFromKeySig, relativeMinor, majorName, minorName, parseNoteName } from "../music.js";
import { staffSvg, noteSvg, pianoSvg, keySigPos, TOP, S } from "../staff.js";
import { tileTable } from "../grid.js";
import { demoHtml, mountDemo, COUNT_RULE } from "../demo.js";

const CLEF_SHORT = { treble: "Violin", bass: "Bass" };

/* ---------- Tonarten und Lage ---------- */

// Grundtöne je Schlüssel. Violinschlüssel: c' bis a' (Es es', As as'), B-Dur auf b.
// Bassschlüssel: C und D in der kleinen Oktave, E F G A B Es As in der großen.
// So braucht keine Tonleiter mehr als eine Hilfslinie.
export const TONICS = {
  treble: { C: N("C", 4), G: N("G", 4), D: N("D", 4), A: N("A", 4), E: N("E", 4), F: N("F", 4), B: N("H", 3, -1), Es: N("E", 4, -1), As: N("A", 4, -1) },
  bass: { C: N("C", 3), G: N("G", 2), D: N("D", 3), A: N("A", 2), E: N("E", 2), F: N("F", 2), B: N("H", 2, -1), Es: N("E", 2, -1), As: N("A", 2, -1) },
};
// Reihenfolge wie im Quintenzirkel: erst die Kreuz-, dann die Be-Tonarten
export const KEYS_2 = ["C", "G", "D", "F", "B"];
export const KEYS_4 = ["C", "G", "D", "A", "E", "F", "B", "Es", "As"];

// Acht Noten aufwärts: die sieben Stufen und der Grundton eine Oktave höher
export function scaleNotes(tonic) {
  const sc = majorScale(tonic);
  return [...sc, N(tonic.letter, tonic.octave + 1, tonic.acc)];
}
export const keyName = (tonic) => `${gName(tonic)}-Dur`;
// Vorzeichnung: Anzahl ♯ positiv, ♭ negativ
export const fifthsOf = (tonic) => majorScale(tonic).reduce((s, n) => s + n.acc, 0);

// Vorzeichen in der Reihenfolge der Vorzeichnung (bis 4)
export const SHARP_ORDER = ["Fis", "Cis", "Gis", "Dis"];
export const FLAT_ORDER = ["B", "Es", "As", "Des"];
export function sigList(fifths) {
  if (fifths === 0) return "keine";
  return (fifths > 0 ? SHARP_ORDER : FLAT_ORDER).slice(0, Math.abs(fifths)).join(", ");
}

// Kleine Namen ohne Oktave für Schritte: „e–fis“
const low = (n) => gName(n).toLowerCase();

/* ---------- Zeichnen ---------- */

// Breite der Tonleiter-Zeile: 368 statt 320, Noten bei x = 84 + 36·i. Bei 320 Einheiten stießen
// in Bass-D-Dur (h–cis') und Bass-E-Dur (E–Fis) die Vorzeichen an den Kopf davor.
// Mit Vorzeichnung (keySig) beginnen die Noten bei 126 im Abstand 30 (vor den Noten steht dann nichts).
export const SCALE_W = 368, SCALE_X0 = 84, SCALE_DX = 36, SIG_X0 = 126, SIG_DX = 30;
export const scaleX = (i, keySig) => (keySig === undefined ? SCALE_X0 + SCALE_DX * i : SIG_X0 + SIG_DX * i);

const MID = TOP + 2 * S, BOTTOM = TOP + 4 * S;
// Höhe der Kopfmitte, gleiche Rechnung wie staff.js (halbe Linienabstände über der untersten Linie)
const yOfNote = (n, clef) => BOTTOM - staffPos(n, clef) * (S / 2);

// Eckige Klammer unter zwei Nachbarnoten (die Hervorhebung hängt nicht nur an der Farbe)
function bracketSvg(notes, clef, i, j, keySig) {
  const xa = scaleX(i, keySig) - 8, xb = scaleX(j, keySig) + 8;
  const lowY = Math.max(yOfNote(notes[i], clef), yOfNote(notes[j], clef));
  const y0 = Math.max(BOTTOM, lowY + 5.25) + 6, y1 = y0 + 6;
  return `<path class="bracket" d="M${xa} ${y0}V${y1}H${xb}V${y0}"/>`;
}

// Lücke: gestrichelter Kasten mit „?“ auf Höhe der Mittellinie
function gapSvg(x) {
  return `<g class="gap"><rect class="gap-box" x="${x - 10}" y="${MID - 17}" width="20" height="34" rx="3"/><text class="gap-q" x="${x}" y="${MID + 7.5}" text-anchor="middle">?</text></g>`;
}

// Name unter einer Note (Auflösung der Stufen 3 bis 5): Schriftgröße in SVG-Einheiten (bei 320 px Breite
// etwa 12 px), Abstand zum tiefsten Punkt der Zeile und Platz für Unterlängen unter der Grundlinie.
export const LABEL_SIZE = 18, LABEL_GAP = 6, LABEL_ASC = 13, LABEL_DESC = 6;
// Tiefster Punkt der Zeile: unterste Linie oder der tiefste Kopf bzw. sein Vorzeichen (♯ reicht etwa
// 1,4 Linienabstände unter die Kopfmitte, ♭ und der Kopf selbst etwa einen halben)
export function lowestY(notes, clef, keySig) {
  return notes.reduce((m, n) => {
    const acc = keySig === undefined ? n.acc : 0;
    return Math.max(m, yOfNote(n, clef) + (acc > 0 ? 1.4 * S : S / 2));
  }, BOTTOM);
}

// Acht Noten in einer Zeile, schwarze Köpfe ohne Hals.
// opts: mark [i, i + 1] (oder marks: Liste solcher Paare), gap i, cls { i: "ok" }, keySig (Vorzeichnung;
// die Noten stehen dann ohne eigene Vorzeichen), svgCls (Klasse am <svg>),
// label { i, text } (Name in Grün unter Note i, Klasse "note-label ok", immer unter dem tiefsten Punkt
// der Zeile; die Höhe des SVG wächst, falls nötig).
const labelY = (notes, clef, keySig) => Math.round(lowestY(notes, clef, keySig) + LABEL_GAP + LABEL_ASC);
// Höhe einer Tonleiter-Zeile mit Namen unter einer Note
export const labelHeight = (notes, clef, keySig) => labelY(notes, clef, keySig) + LABEL_DESC;

export function scaleSvg(notes, clef, opts = {}) {
  const { keySig, gap, cls = {}, label } = opts;
  const marks = opts.marks || (opts.mark ? [opts.mark] : []);
  const marked = new Set(marks.flat());
  let inner = "";
  notes.forEach((n, i) => {
    const x = scaleX(i, keySig);
    if (i === gap) { inner += gapSvg(x); return; }
    const shown = keySig === undefined ? n : N(n.letter, n.octave, 0);
    inner += noteSvg(shown, clef, x, cls[i] || (marked.has(i) ? "mark" : ""), { stemless: true });
  });
  marks.forEach(([i, j]) => { inner += bracketSvg(notes, clef, i, j, keySig); });
  // opts.extra: zusätzliches SVG (Zahlenkreise und Klammern der Vorführung)
  if (opts.extra) inner += opts.extra;
  // opts.height: feste Höhe, z. B. für die Frage dieselbe wie für die Auflösung mit Namen
  // (labelHeight), damit die Karte beim Aufdecken nicht springt
  let height = opts.height;
  if (label) {
    const y = labelY(notes, clef, keySig);
    inner += `<text class="note-label ok" x="${scaleX(label.i, keySig)}" y="${y}" text-anchor="middle">${label.text}</text>`;
    height = y + LABEL_DESC;
  }
  return staffSvg(clef, inner, { width: SCALE_W, keySig, cls: opts.svgCls, height });
}

/* ---------- Hilfen ---------- */

const shuffle = (list) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Zufällige Aufgabe, nie dieselbe wie prev (Vergleich über key)
export function pickItem(items, prev) {
  const cand = prev ? items.filter((it) => it.key !== prev.key) : items;
  const list = cand.length ? cand : items;
  return list[Math.floor(Math.random() * list.length)];
}

const scalePlay = (notes) => notes.map((note) => ({ note, beats: 0.5 }));
const degree = (i) => `${i + 1}. Stufe`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const halftones = (n) => plural(n, "Halbton", "Halbtöne");
// Erster Buchstabe klein (für Nebensätze nach einem Doppelpunkt)
const lowerFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);

/* ---------- Bauplan ---------- */

// Halbtöne der sieben Schritte einer Dur-Tonleiter: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb
export const PLAN = [2, 2, 1, 2, 2, 2, 1];
// Kurzform in der Bauplan-Leiste (Sandra, 24.11.2026): 1 = Ganztonschritt, ½ = Halbtonschritt. „G“ und „H“
// gehen nicht, weil G und H auch Notennamen sind.
export const PLAN_SHORT = PLAN.map((h) => (h === 2 ? "1" : "½"));
const PLAN_WORD = { 2: "Ganz", 1: "Halb" };
// In Sätzen ausgeschrieben: „Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb“ (bricht bei 320 px um, nie abgekürzt)
export const PLAN_TEXT = PLAN.map((h) => PLAN_WORD[h]).join(" – ");
// Schritt von Stufe i + 1 zu Stufe i + 2 als Text: „6.→7. Stufe“
export const stepLabel = (i) => `${i + 1}.→${i + 2}. Stufe`;

/* ---------- Stufe 1 bis 3: Ganz- oder Halbtonschritt ---------- */

export const STEP_WHOLE = "Ganztonschritt", STEP_HALF = "Halbtonschritt";
export const HALF_P = 0.4;

function stepPool(clef, keys) {
  const out = [];
  for (const k of keys) {
    const notes = scaleNotes(TONICS[clef][k]);
    for (let i = 0; i < 7; i++) {
      const half = midi(notes[i + 1]) - midi(notes[i]) === 1;
      out.push({ key: `${clef}:${k}:${i}`, clef, k, notes, i, half });
    }
  }
  return out;
}

export const ITEMS_1 = [...stepPool("treble", ["C"]), ...stepPool("bass", ["C"])];
export const ITEMS_2 = stepPool("treble", ["G", "D", "F", "B"]);
export const ITEMS_3 = [...stepPool("treble", KEYS_4), ...stepPool("bass", KEYS_4)];

// Halbtöne mit Wahrscheinlichkeit p (Stufe 1–3: 0,4, sonst kämen sie nur 2 von 7 Mal; Stufe 4: 1/3)
export function pickStep(items, prev, rnd = Math.random, p = HALF_P) {
  const half = rnd() < p;
  const cand = items.filter((it) => it.half === half && (!prev || it.key !== prev.key));
  return cand.length ? cand[Math.floor(rnd() * cand.length)] : pickItem(items, prev);
}

// Unterstes C der Hilfe-Klaviatur (q.helpFrom, engine.js): das C auf oder unter dem Grundton
export const helpFromOf = (tonic) => 12 * Math.floor(midi(tonic) / 12);

function stepQuestion(it) {
  const a = it.notes[it.i], b = it.notes[it.i + 1];
  const answer = it.half ? STEP_HALF : STEP_WHOLE;
  const pair = `${helm(a)}–${helm(b)}`;
  return {
    key: it.key,
    svg: scaleSvg(it.notes, it.clef, { mark: [it.i, it.i + 1] }),
    prompt: "Ganzton oder Halbton?",
    answer,
    choices: [STEP_WHOLE, STEP_HALF],
    display: `${answer} (${pair})`,
    reveal: `Richtig wäre: ${answer} (${pair}).`,
    play: [a, b],
    clef: it.clef, notes: it.notes, i: it.i,
    helpMarks: [a, b], helpFrom: helpFromOf(it.notes[0]),
    statKey: `${it.half ? "Halbton" : "Ganzton"} ${low(a)}–${low(b)}`,
  };
}

/* ---------- Stufe 4 und 5: Welcher Ton fehlt? ---------- */

// Die Lücke liegt auf der 2. bis 7. Stufe; der Schritt von der Note davor zur Lücke ist nur bei der
// 4. Stufe ein Halbtonschritt (half)
function gapPool(clefs, keys) {
  const out = [];
  for (const clef of clefs) for (const k of keys) {
    const notes = scaleNotes(TONICS[clef][k]);
    for (let i = 1; i <= 6; i++) out.push({ key: `${clef}:${k}:${i}`, clef, k, notes, i, half: PLAN[i - 1] === 1 });
  }
  return out;
}

export const ITEMS_4 = gapPool(["treble"], KEYS_2);
export const ITEMS_5 = gapPool(["treble", "bass"], KEYS_4);
// Stufe 4: Aufgaben mit Halbtonschritt (5 von 30) mit Wahrscheinlichkeit 1/3 ziehen
export const GAP_HALF_P = 1 / 3;

// Beide Denkschritte zur Lücke: „6.→7. Stufe: Ganztonschritt · e''–fis'': 2 Halbtöne → Fis“
export function gapWay(it) {
  const a = it.notes[it.i - 1], b = it.notes[it.i], semi = midi(b) - midi(a);
  const kind = semi === 1 ? STEP_HALF : STEP_WHOLE;
  return { kind, semi, text: `${stepLabel(it.i - 1)}: ${kind} · ${helm(a)}–${helm(b)}: ${halftones(semi)} → ${gName(b)}` };
}

// Knöpfe im zweiten Schritt von Stufe 4: die üblichen Namen zum Stammton der Lücke, in der Reihenfolge
// Stammton, ♯-Form, ♭-Form (ohne Eis, His, Ces, Fes): D | Dis | Des, E | Es, H | B …
export const nameChoices = (n) => [0, 1, -1].map((acc) => N(n.letter, n.octave, acc)).filter(usualNote).map(gName);

const gapSvgs = (it) => ({
  svg: scaleSvg(it.notes, it.clef, { gap: it.i, height: labelHeight(it.notes, it.clef) }),
  revealSvg: scaleSvg(it.notes, it.clef, { cls: { [it.i]: "ok" }, label: { i: it.i, text: gName(it.notes[it.i]) } }),
  keepRow: true,
});

// Stufe 4: zwei Schritte, erst Ganz oder Halb (Bauplan), dann der Name (2 oder 3 Knöpfe)
export function gapStepQuestion(it) {
  const n = it.notes[it.i], key = keyName(it.notes[0]), name = gName(n), way = gapWay(it);
  const names = nameChoices(n);
  return {
    key: it.key,
    ...gapSvgs(it),
    prompt: "Von der Note davor zur Lücke: Ganz- oder Halbtonschritt?",
    answer: name,
    choices: names,
    steps: [
      { choices: [STEP_WHOLE, STEP_HALF], answer: way.kind, ok: `Richtig: ${stepLabel(it.i - 1)} ist ein ${way.kind}.`, bad: `Nicht ganz: ${stepLabel(it.i - 1)} ist ein ${way.kind}.` },
      { choices: names, answer: name, prompt: "Welcher Ton?" },
    ],
    display: way.text,
    reveal: `Richtig wäre: ${name} (${way.text}).`,
    partial: `Der Ton stimmt, der Schritt nicht: ${way.text}.`,
    note: n,
    play: scalePlay(it.notes),
    clef: it.clef, notes: it.notes, i: it.i,
    helpMarks: it.notes.filter((_, j) => j !== it.i), helpFrom: helpFromOf(it.notes[0]),
    statKey: `${key}, ${degree(it.i)} (Lücke)`,
  };
}

// Stufe 5: Namensraster wie bisher, die Rückmeldung nennt beide Denkschritte
function gapQuestion(it) {
  const n = it.notes[it.i], key = keyName(it.notes[0]), way = gapWay(it);
  const where = `${key}, ${degree(it.i)}`;
  return {
    key: it.key,
    ...gapSvgs(it),
    prompt: "Welcher Ton fehlt?",
    answer: { letter: n.letter, acc: n.acc },
    note: n,
    display: `${gName(n)} (${key}) · ${way.text}`,
    reveal: `Richtig wäre: ${gName(n)} (${where}). ${way.text}.`,
    play: scalePlay(it.notes),
    clef: it.clef, notes: it.notes, i: it.i,
    statKey: `${where} (Lücke)`,
  };
}

// Mit der Klaviatur zählt die Tonklasse (wie in „Noten lesen“: Fis = Ges)
export function checkGap(q, value) {
  if (typeof value === "number") return pc(midi(q.note)) === pc(value);
  return !!value && value.letter === q.answer.letter && value.acc === q.answer.acc;
}

/* ---------- Stufe 6 und 7: Welcher Ton passt nicht? ---------- */

// Vorzeichen, die vorkommen dürfen: keine Eis, His, Ces, Fes, keine Doppelvorzeichen
const RARE = new Set(["E1", "H1", "C-1", "F-1"]);
export const usualNote = (n) => n.acc >= -1 && n.acc <= 1 && !RARE.has(n.letter + n.acc);

// Bei genau einer Note (Stufe 2 bis 7) ist das Vorzeichen um einen Halbton verschoben:
// es fehlt, oder es steht eines zu viel. Nur Vorzeichen der eigenen Sorte: in Kreuz-Tonarten
// fehlt ein ♯ oder ein ♯ steht zu viel, in Be-Tonarten ebenso mit ♭. Ein ♭ in einer Kreuz-Tonart
// (oder umgekehrt) wäre ohne Prüfen der Schritte zu erkennen; C-Dur entfällt aus demselben Grund.
export const fitsKey = (moved, fifths) => (fifths > 0 ? moved.acc >= 0 : fifths < 0 ? moved.acc <= 0 : false);

function oddPool(clefs, keys) {
  const out = [];
  for (const clef of clefs) for (const k of keys) {
    const notes = scaleNotes(TONICS[clef][k]), fifths = fifthsOf(notes[0]);
    for (let i = 1; i <= 6; i++) for (const d of [1, -1]) {
      const n = notes[i], moved = N(n.letter, n.octave, n.acc + d);
      if (!usualNote(moved) || !fitsKey(moved, fifths)) continue;
      const shown = notes.map((x, j) => (j === i ? moved : x));
      out.push({ key: `${clef}:${k}:${i}:${d}`, clef, k, notes, shown, i, moved });
    }
  }
  return out;
}

export const ITEMS_6 = oddPool(["treble"], KEYS_4);
export const ITEMS_7 = oddPool(["treble", "bass"], KEYS_4);

// Beide Denkschritte zur unpassenden Note: Der Schritt von der Note davor passt nicht zum Bauplan
// (die Note davor stimmt immer, die verschobene Note ändert den Abstand um einen Halbton):
// „6.→7. Stufe: e''–f'': 1 Halbton, der Bauplan will Ganz → Fis“
export function oddWay(it) {
  const a = it.shown[it.i - 1], b = it.shown[it.i], semi = midi(b) - midi(a), want = PLAN[it.i - 1];
  return { semi, want, text: `${stepLabel(it.i - 1)}: ${helm(a)}–${helm(b)}: ${halftones(semi)}, der Bauplan will ${PLAN_WORD[want]} → ${gName(it.notes[it.i])}` };
}

export function oddQuestion(it) {
  const key = keyName(it.notes[0]), right = gName(it.notes[it.i]), answer = gName(it.moved), way = oddWay(it);
  return {
    key: it.key,
    svg: scaleSvg(it.shown, it.clef, { height: labelHeight(it.notes, it.clef) }),
    revealSvg: scaleSvg(it.notes, it.clef, { cls: { [it.i]: "ok" }, label: { i: it.i, text: right } }),
    keepRow: true,
    prompt: `Welcher Ton passt nicht in ${key}?`,
    answer,
    choices: it.shown.slice(1, 7).map(gName),
    display: `${answer} passt nicht in ${key}: ${way.text}.`,
    reveal: `In ${key} heißt die ${degree(it.i)} ${right}, nicht ${answer}: ${way.text}.`,
    play: scalePlay(it.notes),
    clef: it.clef, notes: it.notes, shown: it.shown, i: it.i,
    // Hilfe: alle Noten, wie sie dastehen (auch die unpassende)
    helpMarks: it.shown, helpFrom: helpFromOf(it.notes[0]),
    statKey: `${key}, ${degree(it.i)} (Suchen)`,
  };
}

/* ---------- Stufe 8 und 9: Tonleiter und Vorzeichen ---------- */

const sigPool = (clefs) => clefs.flatMap((clef) => KEYS_4.map((k) => {
  const notes = scaleNotes(TONICS[clef][k]);
  return { key: `${clef}:${k}`, clef, k, notes, fifths: fifthsOf(notes[0]) };
}));
export const ITEMS_8 = sigPool(["treble"]);
export const ITEMS_9 = sigPool(["treble", "bass"]);

// Vier Knöpfe: richtig, ein Vorzeichen mehr, eins weniger, gleiche Zahl mit der anderen Sorte.
// C-Dur: keine, Fis, B, Fis, Cis. Bei 4 Vorzeichen: eins weniger, zwei weniger, andere Sorte.
export function sigChoices(fifths) {
  if (fifths === 0) return shuffle([0, 1, -1, 2].map(sigList));
  const n = Math.abs(fifths), s = Math.sign(fifths);
  const counts = n >= 4 ? [n, n - 1, n - 2] : [n, n + 1, n - 1];
  return shuffle([...counts.map((c) => sigList(s * c)), sigList(-fifths)]);
}

// Beide Denkschritte: Der Bauplan verlangt auf der Klaviatur genau diese Vorzeichen
export const sigWay = (fifths) => (fifths === 0
  ? `der Bauplan ${PLAN_TEXT} passt ohne Vorzeichen`
  : `der Bauplan ${PLAN_TEXT} braucht ${sigList(fifths).replace(/, ([^,]+)$/, " und $1")}`);

function sigQuestion(it) {
  const key = keyName(it.notes[0]), answer = sigList(it.fifths);
  const text = it.fifths === 0 ? "keine Vorzeichen" : answer;
  return {
    key: it.key,
    svg: scaleSvg(it.notes, it.clef),
    revealSvg: scaleSvg(it.notes, it.clef, { keySig: it.fifths }),
    prompt: "Welche Vorzeichen stehen vorne?",
    answer,
    choices: sigChoices(it.fifths),
    display: `${text} (${key}): ${sigWay(it.fifths)}`,
    reveal: `Richtig wäre: ${text} (${key}).`,
    play: scalePlay(it.notes),
    clef: it.clef, notes: it.notes, fifths: it.fifths,
    helpMarks: it.notes, helpFrom: helpFromOf(it.notes[0]),
    statKey: `Vorzeichen von ${key}`,
  };
}

/* ---------- Stufe 10 bis 13: Tonarten (bis 20.11.2026 Intervalle 5 und 6, dann Tonleitern 7 und 8) ---------- */

// 15 Tonarten bis 7 Vorzeichen. Die Spielstände der alten Stufen übernimmt src/store.js
// (migrateIntervalle, dann migrateTonleitern) als tonleitern-11 und -13.

export const FIFTHS = Array.from({ length: 15 }, (_, i) => i - 7);
export const sigText = (f) => (f === 0 ? "keine Vorzeichen" : `${Math.abs(f)} ${f > 0 ? "♯" : "♭"}`);
// Vorzeichen in der Reihenfolge der Vorzeichnung bis 7. Eis, His, Ces und Fes sind hier richtig und nötig:
// Das Verbot gilt nur für Töne in den Tonleitern bis 4 Vorzeichen.
export const SHARPS_7 = ["Fis", "Cis", "Gis", "Dis", "Ais", "Eis", "His"];
export const FLATS_7 = ["B", "Es", "As", "Des", "Ges", "Ces", "Fes"];
// Satzanfang für die Auflösung nach falscher Antwort: „Drei Kreuze stehen für“, „Ein Be steht für“,
// „Ohne Vorzeichen ist es“ (das Be, Mehrzahl die Be)
const COUNT_WORDS = ["", "Ein", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben"];
export function sigSentence(f) {
  if (f === 0) return "Ohne Vorzeichen ist es";
  const n = Math.abs(f), one = n === 1;
  const sign = f > 0 ? (one ? "Kreuz" : "Kreuze") : "Be";
  return `${COUNT_WORDS[n]} ${sign} ${one ? "steht" : "stehen"} für`;
}
const keyPool = (clefs) => clefs.flatMap((clef) => FIFTHS.map((fifths) => ({ key: `${clef}:${fifths}`, clef, fifths })));
export const ITEMS_10 = keyPool(["treble"]);
export const ITEMS_11 = keyPool(["treble", "bass"]);
export const ITEMS_12 = keyPool(["treble"]);
export const ITEMS_13 = keyPool(["treble", "bass"]);

const tonicPc = (f) => { const t = majorKeyFromKeySig(f); return pc(SEMI[t.letter] + t.acc); };

// Vier Tonarten (als Anzahl Vorzeichen): die richtige, ein Vorzeichen mehr und weniger, dieselbe Zahl mit
// dem anderen Vorzeichen. Gleich klingende Tonarten (Fis-Dur/Ges-Dur) stehen nie zusammen in der Auswahl:
// weder als Ablenker zur richtigen Antwort noch zwei Ablenker untereinander (Cis-Dur/Des-Dur).
export function keyPicks(fifths) {
  const picks = [fifths];
  const ok = (f) => f >= -7 && f <= 7 && !picks.some((p) => p === f || tonicPc(p) === tonicPc(f));
  for (const f of [fifths - 1, fifths + 1, -fifths, fifths - 2, fifths + 2, fifths - 3, fifths + 3, fifths - 4, fifths + 4]) {
    if (picks.length >= 4) break;
    if (ok(f)) picks.push(f);
  }
  return picks;
}
// Gemischt (Stufe 11 und 13); Dur: namer = majorName, Moll: minorName
export const keyChoices = (fifths, namer) => shuffle(keyPicks(fifths).map(namer));
// In fester Reihenfolge nach dem Quintenzirkel (Stufe 10, zweiter Schritt): von den ♭- zu den ♯-Tonarten
export const keyChoicesFixed = (fifths) => keyPicks(fifths).sort((a, b) => a - b).map(majorName);

// Stufe 13 bietet zusätzlich die gleichnamige Molltonart an (Es-Dur → es-Moll statt c-Moll), wenn es sie gibt
export function minorChoices(fifths) {
  const variant = majorName(fifths).replace("-Dur", "").toLowerCase() + "-Moll";
  const base = keyChoices(fifths, minorName);
  if (!FIFTHS.some((f) => minorName(f) === variant) || base.includes(variant)) return base;
  const answer = minorName(fifths);
  const drop = base.find((c) => c !== answer);
  return shuffle(base.map((c) => (c === drop ? variant : c)));
}

const keySvg = (it) => staffSvg(it.clef, "", { keySig: it.fifths });
const keyStat = (it) => `${sigText(it.fifths)} (${CLEF_SHORT[it.clef]})`;
const pickKey = (pool, prev) => {
  const cand = prev ? pool.filter((it) => !(it.fifths === prev.fifths && it.clef === prev.clef)) : pool;
  return cand[Math.floor(Math.random() * cand.length)];
};

// Das entscheidende Vorzeichen (Schritt 1): letztes ♯ bzw. vorletztes ♭; null bei C-Dur und F-Dur
export function decisiveSign(fifths) {
  if (fifths > 0) return SHARPS_7[fifths - 1];
  if (fifths < -1) return FLATS_7[-fifths - 2];
  return null;
}

// Beide Denkschritte zur Tonart: „Letztes Kreuz Dis · einen Halbton höher → E-Dur“,
// „Vorletztes Be Es → Es-Dur“, „Keine Vorzeichen → C-Dur“, „Ein einzelnes Be → F-Dur“
export function keyWay(fifths) {
  const name = majorName(fifths), d = decisiveSign(fifths);
  if (fifths === 0) return `Keine Vorzeichen → ${name}`;
  if (fifths === -1) return `Ein einzelnes Be → ${name}`;
  return fifths > 0 ? `Letztes Kreuz ${d} · einen Halbton höher → ${name}` : `Vorletztes Be ${d} → ${name}`;
}

// Stufe 10, Schritt 1: Knöpfe = die Vorzeichen der Vorzeichnung in ihrer Reihenfolge. Bei C-Dur („keine
// Vorzeichen“), G-Dur („Fis“) und F-Dur („B“) gäbe es nur einen Knopf: Dort entfällt der Schritt in der
// Aufgabe (majorStepQuestion, Welle 10, Befund B10: ein Knopf ist keine Entscheidung).
export const NO_SIGNS = "keine Vorzeichen";
// Frage zu Schritt 1 mit der Erklärung des Fachworts (Welle 10, B5)
export const DECISIVE_PROMPT = "Welches Vorzeichen ist entscheidend? (Entscheidendes Vorzeichen = bei Kreuzen das letzte, bei Be das vorletzte.)";
export function signStep(fifths) {
  const n = Math.abs(fifths), list = (fifths > 0 ? SHARPS_7 : FLATS_7).slice(0, n);
  if (fifths === 0) return { choices: [NO_SIGNS], answer: NO_SIGNS, ok: "Richtig: Hier steht kein Vorzeichen.", bad: "Nicht ganz: Hier steht kein Vorzeichen." };
  if (fifths === -1) return { choices: list, answer: "B", ok: "Richtig: Hier steht nur ein Be. Ein einzelnes Be ist die Ausnahme, die Tonart merkst du dir.", bad: "Nicht ganz: Hier steht nur ein Be." };
  const d = decisiveSign(fifths);
  const fact = fifths === 1 ? "Fis ist das einzige Kreuz, also das letzte." : fifths > 0 ? `Das letzte Kreuz ist ${d}.` : `Das vorletzte Be ist ${d}.`;
  return { choices: list, answer: d, ok: `Richtig: ${fact}`, bad: `Nicht ganz: ${fact}` };
}
const majorStepPrompt = (fifths) => (fifths > 0 ? `Einen Halbton über ${decisiveSign(fifths)}: welche Dur-Tonart?`
  : fifths < -1 ? "Das vorletzte Be ist der Grundton: welche Dur-Tonart?" : "Welche Dur-Tonart?");
// Frage der Aufgaben mit nur einem Schritt (C-Dur, G-Dur, F-Dur): nennt, was in der Vorzeichnung steht
export const majorSinglePrompt = (fifths) => (fifths === 0 ? "Hier steht kein Vorzeichen: welche Dur-Tonart?"
  : fifths === -1 ? "Hier steht nur ein Be, das ist die Ausnahme: welche Dur-Tonart?"
    : "Fis ist das einzige Kreuz, also das letzte. Einen Halbton über Fis: welche Dur-Tonart?");

// Stufe 10: zwei Schritte (Vorzeichen, dann Tonart). Hätte der erste Schritt nur einen Knopf (C-Dur, G-Dur,
// F-Dur), entfällt er: Die Aufgabe hat dann nur den Schritt „Tonart“ (steps.length === 1, wie bei den
// Intervallen), die Rückmeldung nennt den Weg wie sonst (keyWay).
export function majorStepQuestion(it) {
  const answer = majorName(it.fifths), way = keyWay(it.fifths), first = signStep(it.fifths);
  const second = keyChoicesFixed(it.fifths), single = first.choices.length < 2;
  return {
    key: it.key,
    svg: keySvg(it),
    prompt: single ? majorSinglePrompt(it.fifths) : DECISIVE_PROMPT,
    answer,
    choices: second,
    steps: single ? [{ choices: second, answer }] : [first, { choices: second, answer, prompt: majorStepPrompt(it.fifths) }],
    display: way,
    reveal: `Richtig wäre: ${answer} (${way}).`,
    ...(single ? {} : { partial: `Die Tonart stimmt, das Vorzeichen nicht: ${way}.` }),
    clef: it.clef, fifths: it.fifths,
    helpMarks: [], helpFrom: 60,
    statKey: `Dur zu ${keyStat(it)}`,
  };
}

// Stufe 11: einschrittig wie bisher, die Rückmeldung nennt beide Denkschritte
function majorQuestion(it) {
  const answer = majorName(it.fifths), way = keyWay(it.fifths);
  const plain = it.fifths === 0 || it.fifths === -1;
  return {
    key: it.key,
    svg: keySvg(it),
    prompt: "Welche Dur-Tonart?",
    answer,
    display: way,
    reveal: plain ? `${sigSentence(it.fifths)} ${answer}.` : `${sigSentence(it.fifths)} ${answer} (${lowerFirst(way)}).`,
    choices: keyChoices(it.fifths, majorName),
    clef: it.clef, fifths: it.fifths,
    statKey: `Dur zu ${keyStat(it)}`,
  };
}

/* ---------- Parallele Molltonart (Stufe 12 und 13) ---------- */

// Dur-Grundton in der zweigestrichenen Oktave (Klaviatur der Hilfen: drei Halbtöne darunter haben Platz)
export const majorTonicOf = (fifths) => { const t = majorKeyFromKeySig(fifths); return N(t.letter, 5, t.acc); };
// Grundton der parallelen Molltonart: zwei Buchstaben und drei Halbtöne unter dem Dur-Grundton
export const minorTonicOf = (fifths) => {
  const t = majorTonicOf(fifths), d = LETTERS.indexOf(t.letter) - 2;
  const letter = LETTERS[(d + 7) % 7], octave = t.octave + (d < 0 ? -1 : 0);
  const base = N(letter, octave, 0);
  return N(letter, octave, midi(t) - 3 - midi(base));
};
// Varianten je Stammton: alle Molltonarten der 15 Tonarten mit diesem Stammton, in der Reihenfolge
// Stammton, ♯, ♭: A: a-Moll | ais-Moll | as-Moll, H: h-Moll | b-Moll, C: c-Moll | cis-Moll …
export const MINOR_VARIANTS = Object.fromEntries(LETTERS.map((l) => [l, [0, 1, -1]
  .map((acc) => FIFTHS.find((f) => { const m = relativeMinor(f); return m.letter === l && m.acc === acc; }))
  .filter((f) => f !== undefined).map(minorName)]));

// Stufe 12, Schritt 1: drei aufeinanderfolgende Stammtöne mit dem richtigen (Anfang zufällig, damit der
// richtige nicht immer in der Mitte steht), in der Reihenfolge der Stammtöne: G | A | H, H | C | D
export function stemChoices(letter, rnd = Math.random) {
  const i = LETTERS.indexOf(letter), start = i - Math.floor(rnd() * 3);
  return [0, 1, 2].map((k) => LETTERS[(start + k + 7) % 7]);
}
// Hinweis bei Des-Dur: der Stammton H heißt mit ♭ B
const hbNote = (m) => (m.letter === "H" && m.acc === -1 ? " (H mit ♭ heißt B)" : "");
// Die drei Notenstufen abwärts, der Dur-Grundton zählt als 1: „Es, D, C“
export const thirdDownLetters = (fifths) => {
  const t = majorTonicOf(fifths), i = LETTERS.indexOf(t.letter);
  return [gName(t), LETTERS[(i + 6) % 7], LETTERS[(i + 5) % 7]];
};

// Beide Denkschritte: „Es-Dur: Terz abwärts → Stammton C · 3 Halbtöne → c-Moll“
export function minorWay(fifths) {
  const m = minorTonicOf(fifths);
  return `${majorName(fifths)}: Terz abwärts → Stammton ${m.letter} · 3 Halbtöne → ${minorName(fifths)}${hbNote(m)}`;
}

export function minorStepQuestion(it) {
  const answer = minorName(it.fifths), major = majorName(it.fifths), m = minorTonicOf(it.fifths);
  const [a, b, c] = thirdDownLetters(it.fifths), count = `${a} (1), ${b} (2), ${c} (3) → Stammton ${c}`;
  const second = MINOR_VARIANTS[m.letter].slice(), way = minorWay(it.fifths);
  return {
    key: it.key,
    svg: keySvg(it),
    prompt: `Parallele Molltonart zu ${major}. Terz abwärts vom Dur-Grundton: welcher Stammton?`,
    answer,
    choices: second,
    steps: [
      { choices: stemChoices(m.letter), answer: m.letter, ok: `Richtig: ${count}.`, bad: `Nicht ganz: ${count}.` },
      { choices: second, answer, prompt: "Drei Halbtöne abwärts: welche Molltonart?" },
    ],
    display: way,
    reveal: `Richtig wäre: ${answer} (${way}).`,
    partial: `Die Molltonart stimmt, der Stammton nicht: ${way}.`,
    clef: it.clef, fifths: it.fifths,
    // Hilfe: nur der Dur-Grundton (steht schon in der Frage), zweigestrichene Oktave, Klaviatur ab c'
    helpMarks: [majorTonicOf(it.fifths)], helpFrom: 60,
    statKey: `Moll zu ${major}`,
  };
}

// Stufe 13: einschrittig wie bisher, die Rückmeldung nennt beide Denkschritte
// („Terz abwärts: 3 Halbtöne unter Es liegt c → c-Moll“)
function minorQuestion(it) {
  const answer = minorName(it.fifths), major = majorName(it.fifths), t = majorKeyFromKeySig(it.fifths);
  const m = minorTonicOf(it.fifths), below = `3 Halbtöne unter ${gName(t)} liegt ${gName(m).toLowerCase()}`;
  return {
    key: it.key,
    svg: keySvg(it),
    prompt: `Parallele Molltonart zu ${major}?`,
    answer,
    display: `Terz abwärts: ${below} → ${answer}`,
    reveal: `Die parallele Molltonart zu ${major} ist ${answer} (Terz abwärts: ${below}).`,
    choices: minorChoices(it.fifths),
    clef: it.clef, fifths: it.fifths,
    statKey: `Moll zu ${major}`,
  };
}

/* ---------- Hilfen zum Aufklappen (level.helps, engine.js) ---------- */

// Vor der Antwort heben die Hilfen nichts hervor, was die Antwort zeigt (eine umrandete Spalte verriete in
// Stufe 1 und 2 die Antwort, in Stufe 4 den ersten Schritt). Hervorgehoben wird erst in der Vorführung.
export const HELP_TEXT_PLAN = "Der Bauplan gibt die Schritte vor, die Klaviatur zeigt, ob die Noten ihn erfüllen.";
export const HELP_TEXT_KEY = "Zum Nachschlagen: Anzahl der Vorzeichen und Dur-Tonart. Den Halbton über dem letzten Kreuz findest du auf der Klaviatur.";
export const HELP_TEXT_MINOR = `Vom Dur-Grundton drei Notenstufen abwärts, er selbst zählt als 1. Dann auf der Klaviatur drei Halbtöne abwärts: So bekommt der Stammton sein Vorzeichen. ${COUNT_RULE}`;
export const PLAN_COLS = PLAN.map((_, i) => `${i + 1}–${i + 2}`);
// Halbton-Spalten 3–4 und 7–8 (grau hinterlegt wie die Familie „rein“ bei den Intervallen)
export const PLAN_FAMILY = PLAN.map((h, i) => (h === 1 ? i : -1)).filter((i) => i >= 0);
// Geschützte Leerzeichen in den Klammern: „(1 Halbton)“ bricht bei schmaler Breite nicht auseinander
export const PLAN_NOTE = "1 = Ganztonschritt (2\u00a0Halbtöne) · ½ = Halbtonschritt (1\u00a0Halbton)";
// Zeilennamen der Bauplan-Leiste. Drei Reihen aus Ziffern (Kopf 1–2 …, Bauplan 1 1 ½ …, Halbtöne 2 2 1 …)
// sind leicht zu verwechseln: Der Kopf ist klein und heißt „Stufen“, die Bauplan-Zeile „Tonschritt“, die
// Halbton-Zeile ist grün (Welle 10, A6).
export const PLAN_ROW = "Tonschritt", PLAN_HALF_ROW = "Halbtöne", PLAN_HEAD = "Stufen";

// Bauplan-Leiste als Kästchentabelle: Kopf „Stufen 1–2 … 7–8“, Zeile „Tonschritt“ mit 1 1 ½ 1 1 1 ½.
// opts (nur Vorführung und Lerntafel): col – Spalte violett (Schritt 1), done – so viele Schritte mit
// Halbtonzahl in einer zweiten Zeile „Halbtöne“ (grün, Schritt 2), hit – Spalte, deren Bauplan-Kästchen
// grün ist (der gerade geprüfte Schritt)
export function planTable({ col = null, done = null, hit = null } = {}) {
  const rows = [{ label: PLAN_ROW, cells: PLAN_SHORT.map((t, i) => ({ text: t, state: i === hit ? "hit" : i === col ? "s1" : undefined })) }];
  if (done !== null) rows.push({ label: PLAN_HALF_ROW, cells: PLAN.map((h, i) => (i < done ? { text: h, state: "hit" } : null)) });
  const table = tileTable({ head: [PLAN_HEAD, ...PLAN_COLS], rows, family: PLAN_FAMILY, cls: "tt-plan" });
  return `<div class="tt-wrap">${table}<p class="tt-note small">${PLAN_NOTE}</p></div>`;
}

// Quintenzirkel-Kästchen: eine Zeile je Anzahl Vorzeichen 0 … 7, Spalten ♯-Tonart | ♭-Tonart (Dur, nur der
// Grundton im Kästchen, damit die Tabelle in die Hilfen passt), ohne Hervorhebung (Nachschlagehilfe; den
// Weg über das entscheidende Vorzeichen fragt Schritt 1)
export const CIRCLE_NOTE = "Alle hier sind Dur-Tonarten: 3 ♯ → A-Dur, 3 ♭ → Es-Dur.";
const tonicText = (f) => majorName(f).replace("-Dur", "");
export function circleTable({ split = false } = {}) {
  const rows = Array.from({ length: 8 }, (_, n) => ({
    label: `<b class="num">${n}</b>`,
    cells: [{ text: tonicText(n) }, { text: tonicText(-n) }],
  }));
  return `<div class="tt-wrap">${tileTable({ head: ["Anzahl", "♯-Tonart", "♭-Tonart"], rows, split, cls: "tt-wide" })}<p class="tt-note small">${CIRCLE_NOTE}</p></div>`;
}

const HELPS_BOTH = ["klaviatur", "tabelle"];
// „Vorführen“ (erst nach der Antwort): Stufe 1 und 2 das gefragte Notenpaar, Stufe 4, 6, 8 die Tonleiter der Aufgabe
const STEP_DEMO = (q) => stepDemo(q.notes, q.i, q.clef);
const SCALE_DEMO = (q) => scaleDemo(q.notes[0], q.clef);
const planHelps = (demo) => ({ helps: HELPS_BOTH, helpText: HELP_TEXT_PLAN, helpTable: planTable(), demo });
const keyHelps = () => ({ helps: HELPS_BOTH, helpText: HELP_TEXT_KEY, helpTable: circleTable({ split: true }), demo: (q) => keyDemo(q.fifths, q.clef) });
// Stufe 12: nur Klaviatur und Satz. Eine Spalte „parallel Moll“ gäbe beide Schritte durch bloßes Ablesen vor.
const minorHelps = () => ({ helps: ["klaviatur"], helpText: HELP_TEXT_MINOR, demo: (q) => minorDemo(q.fifths) });

/* ---------- Vorführungen (src/demo.js; die Bilder baut das Paket, rein und in node testbar) ---------- */

export const DEMO_STEPS_SCALE = ["1 · Bauplan", "2 · Klaviatur"];
export const DEMO_STEPS_KEY = ["1 · Entscheidendes Vorzeichen", "2 · Klaviatur"];
export const DEMO_STEP_KEY_ONLY = "Vorzeichen lesen";
export const DEMO_STEPS_MINOR = ["1 · Terz abwärts: 3 Stufen", "2 · 3 Halbtöne abwärts"];

const DM_R = 8, DM_GAP = 6;
// Zahlenkreis (violett, Schritt 1) wie bei den Intervallen
const numSvg = (x, y, k) => `<g class="dm-num"><circle cx="${x}" cy="${y}" r="${DM_R}"/><text x="${x}" y="${y + 4}" text-anchor="middle">${k}</text></g>`;
// Klammer unter zwei Noten in Grün (Schritt 2: der gerade geprüfte Schritt)
const stepBracket = (xa, xb, y) => `<path class="tl-bracket" d="M${xa - 10} ${y}V${y + 6}H${xb + 10}V${y}"/>`;
// Ton zu einer MIDI-Nummer (nur für den Klang, die Schreibweise spielt keine Rolle)
const pitchNote = (m) => N("C", Math.floor(m / 12) - 1, m % 12);
// Klaviatur der Vorführung: Töne grün (marks), gezählte Halbtöne grün mit Zahl; active false: blass;
// start: Starttaste beim Halbtöne-Zählen mit der Aufschrift „Start“ (Welle 10, B6; nur parallele Molltonart)
function keysSvg(from, octaves, marks, counts, active, start = null) {
  return `<div class="demo-keys tl-keys${active ? "" : " dim"}">${pianoSvg({ from, octaves, marks, counts, interactive: false, start })}</div>`;
}
const stageHtml = (staff, keys, table) => `<div class="demo-staff">${staff}</div>`
  + `<div class="demo-pair">${keys}${table ? `<div class="demo-table">${table}</div>` : ""}</div>`;

/* --- 1. „So baust du eine Dur-Tonleiter“ --- */

// Stammtöne der acht Stufen (nur der Grundton auf der 1 und der 8 trägt sein Vorzeichen schon: b, es, as)
export function stemNotes(tonic) {
  const out = [tonic];
  for (let k = 1; k < 7; k++) { const d = dia(tonic) + k; out.push(N(LETTERS[d % 7], Math.floor(d / 7), 0)); }
  out.push(N(tonic.letter, tonic.octave + 1, tonic.acc));
  return out;
}

// Die Klaviatur prüft jeden Schritt: Passt der Abstand nicht zum Bauplan, ändert sich immer die obere Note,
// Abstand zu klein → ♯, zu groß → ♭. Der folgende Schritt rechnet mit der berichtigten Note.
// Ergebnis: [{ i, a, b (Stammton bzw. Grundton), semi (gemessen), want, fixed (berichtigte obere Note) }]
export function buildSteps(tonic) {
  const cur = stemNotes(tonic), out = [];
  for (let i = 0; i < 7; i++) {
    const a = cur[i], b = cur[i + 1], semi = midi(b) - midi(a), want = PLAN[i];
    const fixed = N(b.letter, b.octave, b.acc + (want - semi));
    cur[i + 1] = fixed;
    out.push({ i, a, b, semi, want, fixed });
  }
  return out;
}

const scaleHeight = (notes, clef) => Math.round(lowestY(notes, clef) + DM_GAP + 2 * DM_R + 4 + 6 + 4);

// Notenzeile der Vorführung: shown (bis zu acht Noten), cls je Note, Kreise 1 … circles, Klammer pair [i, i + 1]
function scaleDemoSvg(shown, clef, { cls = {}, circles = 0, pair = null, height, ref }) {
  const y = Math.round(lowestY(ref, clef) + DM_GAP + DM_R);
  let extra = "";
  for (let k = 0; k < circles; k++) extra += numSvg(scaleX(k), y, k + 1);
  if (pair) extra += stepBracket(scaleX(pair[0]), scaleX(pair[1]), y + DM_R + 4);
  return scaleSvg(shown, clef, { cls, height, extra });
}

const keyRange = (lowM, highM) => { const from = 12 * Math.floor(lowM / 12); return { from, octaves: highM <= from + 12 ? 1 : 2 }; };

export function scaleDemo(tonic, clef = "treble") {
  const final = scaleNotes(tonic), stems = stemNotes(tonic), steps = buildSteps(tonic), key = keyName(tonic);
  const fifths = fifthsOf(tonic), ref = [...final, ...stems], height = scaleHeight(ref, clef);
  const { from, octaves } = keyRange(midi(final[0]), midi(final[7]));
  const dimKeys = keysSvg(from, octaves, [], [], false);
  const frames = [{
    step: 0, tones: [tonic],
    text: `${key} bauen: Grundton ${helm(tonic)}. Erst der Bauplan, dann die Klaviatur.`,
    body: stageHtml(scaleDemoSvg([tonic], clef, { height, ref }), dimKeys),
  }];
  // Schritt 1: je Bild eine Notenstufe (Stammton), die neue violett
  for (let k = 1; k <= 8; k++) {
    const n = stems[k - 1];
    const text = k === 1 ? `${helm(n)} ist Stufe 1, der Grundton.` : k === 8 ? `${helm(n)} ist Stufe 8, wieder der Grundton.` : `${helm(n)} ist Stufe ${k}.`;
    frames.push({ step: 1, tones: [n], text, body: stageHtml(scaleDemoSvg(stems.slice(0, k), clef, { cls: { [k - 1]: "step1" }, circles: k, height, ref }), dimKeys) });
  }
  frames.push({
    step: 1, tones: [],
    text: `Der Bauplan: ${PLAN_TEXT}. Jetzt prüft die Klaviatur jeden Schritt.`,
    body: stageHtml(scaleDemoSvg(stems, clef, { circles: 8, height, ref }), dimKeys, planTable()),
  });
  // Schritt 2: je Bild ein Schritt; berichtigte Noten grün mit ihrem Vorzeichen
  const cur = stems.slice(), cls = {};
  for (const st of steps) {
    cur[st.i + 1] = st.fixed;
    const changed = st.fixed.acc !== st.b.acc;
    if (changed) cls[st.i + 1] = "step2";
    const pair = `${helm(st.a)}–${helm(st.b)}`;
    const text = changed
      ? `${pair}: ${halftones(st.semi)}, der Bauplan will ${PLAN_WORD[st.want]} → ${helm(st.b)} wird zu ${helm(st.fixed)}`
      : `${pair}: ${halftones(st.semi)} = ${PLAN_WORD[st.want]} ✓`;
    const counts = Array.from({ length: st.want }, (_, t) => [midi(st.a) + t + 1, t + 1]);
    frames.push({
      step: 2, tones: [st.a, st.fixed], text, fix: changed ? { from: st.b, to: st.fixed } : null,
      body: stageHtml(scaleDemoSvg(cur.slice(), clef, { cls: { ...cls }, circles: 8, pair: [st.i, st.i + 1], height, ref }),
        keysSvg(from, octaves, [midi(st.a), midi(st.fixed)], counts, true), planTable({ done: st.i + 1, hit: st.i })),
    });
  }
  const n = Math.abs(fifths);
  frames.push({
    step: 3, tones: final,
    result: {
      title: `${key}: ${final.map((x) => gName(x).toLowerCase()).join(" ")}`,
      chips: [{ step: 1, text: `Bauplan ${PLAN_TEXT}` }, { step: 2, text: n ? `${n} Vorzeichen: ${sigList(fifths)}` : "kein Vorzeichen nötig" }],
    },
    body: stageHtml(scaleDemoSvg(final, clef, { cls, circles: 8, height, ref }), keysSvg(from, octaves, final.map(midi), [], true), planTable({ done: 7 })),
  });
  return { steps: DEMO_STEPS_SCALE.slice(), frames };
}

// Kurzfassung für Stufe 1 und 2: das gefragte Notenpaar. Frage → Schritt 1 (welche Stufen, Spalte des
// Bauplans violett) → Schritt 2 (Halbtöne zählen) → Ergebnis „e'–f' = Halbtonschritt“
export function stepDemo(notes, i, clef = "treble") {
  const a = notes[i], b = notes[i + 1], semi = midi(b) - midi(a), pair = `${helm(a)}–${helm(b)}`;
  const kind = semi === 1 ? STEP_HALF : STEP_WHOLE, height = scaleHeight(notes, clef);
  const { from, octaves } = keyRange(midi(notes[0]), midi(notes[7]));
  const staff = (circles, pairOn) => {
    const y = Math.round(lowestY(notes, clef) + DM_GAP + DM_R);
    let extra = circles ? numSvg(scaleX(i), y, i + 1) + numSvg(scaleX(i + 1), y, i + 2) : "";
    if (pairOn) extra += stepBracket(scaleX(i), scaleX(i + 1), y + DM_R + 4);
    return scaleSvg(notes, clef, { cls: { [i]: "mark", [i + 1]: "mark" }, height, extra });
  };
  const frames = [{
    step: 0, tones: [a, b], text: `${pair}: Ganz oder Halb? Erst die Stufen im Bauplan, dann die Halbtöne.`,
    body: stageHtml(staff(false, false), keysSvg(from, octaves, [], [], false), planTable()),
  }, {
    step: 1, tones: [a, b], text: `${helm(a)} ist Stufe ${i + 1}, ${helm(b)} Stufe ${i + 2}: Der Bauplan will ${PLAN_WORD[PLAN[i]]}.`,
    body: stageHtml(staff(true, false), keysSvg(from, octaves, [], [], false), planTable({ col: i })),
  }];
  for (let j = 1; j <= semi; j++) {
    const last = j === semi;
    const text = last ? `${halftones(semi)} = ${kind}` : `Ab ${helm(a)} jede Taste zählen, auch die schwarzen: 1 Halbton.`;
    frames.push({
      step: 2, tones: [pitchNote(midi(a) + j)], text,
      body: stageHtml(staff(true, true), keysSvg(from, octaves, [midi(a), midi(b)], Array.from({ length: j }, (_, t) => [midi(a) + t + 1, t + 1]), true),
        planTable({ col: last ? null : i, hit: last ? i : null })),
    });
  }
  frames.push({
    step: 3, tones: [a, b],
    result: { title: `${pair} = ${kind}`, chips: [{ step: 1, text: `${stepLabel(i)}: ${PLAN_WORD[PLAN[i]]}` }, { step: 2, text: halftones(semi) }] },
    body: stageHtml(staff(true, true), keysSvg(from, octaves, [midi(a), midi(b)], Array.from({ length: semi }, (_, t) => [midi(a) + t + 1, t + 1]), true), planTable({ hit: i })),
  });
  return { steps: DEMO_STEPS_SCALE.slice(), frames };
}

/* --- 2. „So findest du die Tonart“ --- */

// Vorzeichnung zum Mitzählen: weiter auseinander als in der Notenzeile (Abstand 22 statt 12), Kreise darunter,
// das entscheidende Vorzeichen violett umrandet
const SIG_DEMO_X0 = 70, SIG_DEMO_DX = 22;
const SIG_NUM_Y = BOTTOM + 22;
const nameNote = (name) => { const p = parseNoteName(name); return N(p.letter, 4, p.acc); };
const signList = (fifths) => (fifths > 0 ? SHARPS_7 : FLATS_7).slice(0, Math.abs(fifths));

export function sigDemoSvg(clef, fifths, k, decisive = null) {
  const pos = keySigPos(clef, fifths, SIG_DEMO_DX, SIG_DEMO_X0).slice(0, k);
  let inner = "";
  pos.forEach((p, i) => {
    const on = i === decisive;
    if (on) {
      const top = p.sharp ? p.line - 19 : p.line - 27, bottom = p.sharp ? p.line + 19 : p.line + 9;
      inner += `<rect class="tl-decisive" x="${p.x - 5}" y="${top}" width="22" height="${bottom - top}" rx="5"/>`;
    }
    inner += `<text class="keysig${on ? " step1" : ""}" x="${p.x}" y="${p.y}">${p.sharp ? "♯" : "♭"}</text>`;
    inner += numSvg(p.x + 6, SIG_NUM_Y, i + 1);
  });
  return staffSvg(clef, inner, { height: SIG_NUM_Y + DM_R + 4 });
}

// Taste, auf der ein Name liegt (eine Oktave ab c'): Eis auf F, His auf C, Ces auf H
const keyMidi = (name) => { const p = parseNoteName(name); return 60 + pc(SEMI[p.letter] + p.acc); };
const KEY_OF = { Eis: "F", His: "C", Ces: "H", Fes: "E" };
const onKey = (name) => (KEY_OF[name] ? ` (${name} liegt auf der Taste ${KEY_OF[name]})` : "");

export function keyDemo(fifths, clef = "treble") {
  const major = majorName(fifths), n = Math.abs(fifths), list = signList(fifths), d = decisiveSign(fifths);
  const sign = fifths > 0 ? "Kreuz" : "Be", tonic = majorKeyFromKeySig(fifths), tonicNote = N(tonic.letter, 4, tonic.acc);
  const dIndex = fifths > 0 ? n - 1 : n - 2;
  const dim = keysSvg(60, 1, [], [], false);
  const frames = [{
    step: 0, tones: [],
    text: n ? `Welche Dur-Tonart hat ${sigText(fifths)}? Erst das entscheidende Vorzeichen.` : "Welche Dur-Tonart hat keine Vorzeichen?",
    body: stageHtml(staffSvg(clef, "", { keySig: fifths, height: SIG_NUM_Y + DM_R + 4 }), dim),
  }];
  // Kurzfassung ohne zweiten Schritt: C-Dur und F-Dur
  if (fifths === 0 || fifths === -1) {
    frames.push({
      step: 1, tones: fifths ? [nameNote("B"), tonicNote] : [tonicNote],
      text: fifths ? "Ein einzelnes Be → F-Dur. Das merkst du dir." : "Keine Vorzeichen → C-Dur.",
      body: stageHtml(sigDemoSvg(clef, fifths, n), dim),
    });
    frames.push({
      step: 2, tones: [tonicNote],
      result: { title: `${fifths ? "1 ♭" : "keine Vorzeichen"} → ${major}`, chips: [{ step: 1, text: fifths ? "ein einzelnes Be → F-Dur" : "keine Vorzeichen → C-Dur" }] },
      body: stageHtml(sigDemoSvg(clef, fifths, n), keysSvg(60, 1, [midi(tonicNote)], [], true)),
    });
    return { steps: [DEMO_STEP_KEY_ONLY], frames };
  }
  for (let k = 1; k <= n; k++) {
    const last = k === n, name = list[k - 1];
    let text = `${k}. ${sign}: ${name}`;
    if (last) text += fifths > 0 ? ` – das letzte Kreuz ist entscheidend.` : ` – entscheidend ist das vorletzte Be: ${d}.`;
    frames.push({ step: 1, tones: [nameNote(name)], text, body: stageHtml(sigDemoSvg(clef, fifths, k, last ? dIndex : null), dim) });
  }
  const dm = keyMidi(d);
  const keys = fifths > 0 ? keysSvg(60, 1, [dm], [[dm + 1, 1]], true) : keysSvg(60, 1, [dm], [], true);
  const tonicName = gName(tonic);
  frames.push({
    step: 2, tones: fifths > 0 ? [pitchNote(dm), pitchNote(dm + 1)] : [pitchNote(dm)],
    text: fifths > 0 ? `${d} + 1 Halbton → ${tonicName}${onKey(d)}: ${major}` : `Das vorletzte Be ${d} ist der Grundton${onKey(d)}: ${major}`,
    body: stageHtml(sigDemoSvg(clef, fifths, n, dIndex), keys),
  });
  frames.push({
    step: 3, tones: [tonicNote],
    result: {
      title: `${sigText(fifths)} → ${major}`,
      chips: fifths > 0 ? [{ step: 1, text: `letztes Kreuz ${d}` }, { step: 2, text: `+1 Halbton → ${tonicName}` }]
        : [{ step: 1, text: `vorletztes Be ${d}` }, { step: 2, text: `${d} ist der Grundton` }],
    },
    body: stageHtml(sigDemoSvg(clef, fifths, n, dIndex), keys),
  });
  return { steps: DEMO_STEPS_KEY.slice(), frames };
}

/* --- 3. „So findest du die parallele Molltonart“ --- */

const MINOR_X = [120, 180, 240];
function minorDemoSvg(notes, k, cls = {}) {
  const y = Math.round(lowestY(notes, "treble") + DM_GAP + DM_R);
  let inner = "";
  notes.slice(0, Math.max(1, k)).forEach((n, i) => { inner += noteSvg(n, "treble", MINOR_X[i], cls[i] || "", { stemless: true }); });
  for (let i = 0; i < k; i++) inner += numSvg(MINOR_X[i], y, i + 1);
  return staffSvg("treble", inner, { height: y + DM_R + 4 });
}

export function minorDemo(fifths) {
  const t = majorTonicOf(fifths), m = minorTonicOf(fifths), major = majorName(fifths), minor = minorName(fifths);
  const i = LETTERS.indexOf(t.letter), d = dia(t);
  const stems = [t, N(LETTERS[(i + 6) % 7], Math.floor((d - 1) / 7), 0), N(LETTERS[(i + 5) % 7], Math.floor((d - 2) / 7), 0)];
  const ref = [t, stems[1], stems[2], m];
  const from = 60, octaves = 2, dim = keysSvg(from, octaves, [], [], false);
  const svg = (notes, k, cls) => minorDemoSvg(notes, k, cls);
  const frames = [{
    step: 0, tones: [t],
    text: `Parallele Molltonart zu ${major}? Erst drei Notenstufen abwärts, der Grundton ${helm(t)} zählt als 1.`,
    body: stageHtml(svg(ref.slice(0, 1), 0), dim),
  }];
  for (let k = 1; k <= 3; k++) {
    const n = stems[k - 1];
    const text = k === 3 ? `${helm(n)} ist 3 → Stammton ${n.letter}. ${COUNT_RULE}` : `${helm(n)} ist ${k}.`;
    frames.push({ step: 1, tones: [n], text, body: stageHtml(svg(stems, k, { [k - 1]: k > 1 ? "step1" : "" }), dim) });
  }
  const tm = midi(t);
  const ces = t.letter === "C" && t.acc === -1 ? " Ces liegt auf der Taste H." : "";
  for (let j = 1; j <= 3; j++) {
    const last = j === 3;
    const counts = Array.from({ length: j }, (_, s) => [tm - s - 1, s + 1]);
    let text = j === 1 ? `Von ${helm(t)} abwärts jede Taste zählen, auch die schwarzen: 1 Halbton.${ces}` : `${j} Halbtöne.`;
    if (last) {
      text = m.acc === 0 ? `3 Halbtöne: ${helm(m)} → ${minor}. Das ist eine kleine Terz.`
        : `3 Halbtöne: ${m.letter} wird zu ${gName(m)} → ${minor}${hbNote(m)}. Das ist eine kleine Terz.`;
    }
    const notes = last ? [t, stems[1], m] : stems;
    frames.push({
      step: 2, tones: [pitchNote(tm - j)], text,
      body: stageHtml(svg(notes, 3, last ? { 2: "step2" } : {}), keysSvg(from, octaves, [tm], counts, true, tm)),
    });
  }
  frames.push({
    step: 3, tones: [t, m],
    result: { title: `${major} → ${minor}`, chips: [{ step: 1, text: "3 Stufen" }, { step: 2, text: "3 Halbtöne" }] },
    body: stageHtml(svg([t, stems[1], m], 3, { 2: "step2" }), keysSvg(from, octaves, [tm, midi(m)], Array.from({ length: 3 }, (_, s) => [tm - s - 1, s + 1]), true, tm)),
  });
  return { steps: DEMO_STEPS_MINOR.slice(), frames };
}

/* ---------- Stufen ---------- */

const check = (q, value) => value === q.answer;
const find = (items, key) => items.find((it) => it.key === key);

const levels = [
  {
    title: "Ganz- und Halbtonschritte in C-Dur",
    subtitle: `Violin- und Bassschlüssel · mit Hilfen · ${ITEMS_1.length} Schritte`,
    hint: "In C-Dur liegen die Halbtonschritte zwischen e und f und zwischen h und c, also zwischen der 3. und 4. und der 7. und 8. Stufe der Tonleiter. Auf der Klaviatur: Dort liegt keine schwarze Taste dazwischen.",
    items: ITEMS_1,
    example: stepQuestion(find(ITEMS_1, "treble:C:2")).svg,
    question(prev) { return stepQuestion(pickStep(ITEMS_1, prev)); },
    ...planHelps(STEP_DEMO),
  },
  {
    title: "Bauplan der Dur-Tonleiter",
    subtitle: `G-, D-, F- und B-Dur · mit Hilfen · ${ITEMS_2.length} Schritte`,
    hint: "Jede Dur-Tonleiter hat denselben Bauplan: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb. Die Halbtöne liegen immer zwischen der 3. und 4. und der 7. und 8. Stufe der Tonleiter. Achte auf die Vorzeichen: In D-Dur ist e'–fis' ein Ganzton, fis'–g' ein Halbton.",
    items: ITEMS_2,
    example: stepQuestion(find(ITEMS_2, "treble:D:2")).svg,
    question(prev) { return stepQuestion(pickStep(ITEMS_2, prev)); },
    ...planHelps(STEP_DEMO),
  },
  {
    title: "Ganz- und Halbtonschritte ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · ${KEYS_4.length} Tonarten · ${ITEMS_3.length} Schritte`,
    hint: "Jetzt alle neun Tonarten bis 4 Vorzeichen, in beiden Schlüsseln und ohne Hilfen. Zähle die Halbtöne zwischen den beiden Noten und achte auf die Vorzeichen: In Es-Dur ist g'–as' ein Halbton.",
    items: ITEMS_3,
    example: stepQuestion(find(ITEMS_3, "bass:A:2")).svg,
    question(prev) { return stepQuestion(pickStep(ITEMS_3, prev)); },
  },
  {
    title: "Welcher Ton fehlt?",
    twoSteps: true,
    subtitle: `Violinschlüssel · bis 2 Vorzeichen · zwei Schritte · mit Hilfen · ${ITEMS_4.length} Aufgaben`,
    hint: "Zwei Schritte: Erst der Bauplan – zähle ab dem Grundton, welcher Schritt zur Lücke führt, Ganz oder Halb. Dann die Klaviatur – welcher Ton liegt so viele Halbtöne über der Note davor? Zur Wahl stehen der Stammton (Stammton = Note ohne Vorzeichen) und seine Formen mit ♯ oder ♭.",
    items: ITEMS_4,
    example: gapStepQuestion(find(ITEMS_4, "treble:G:6")).svg,
    question(prev) { return gapStepQuestion(pickStep(ITEMS_4, prev, Math.random, GAP_HALF_P)); },
    ...planHelps(SCALE_DEMO),
  },
  {
    title: "Welcher Ton fehlt? Ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · bis 4 Vorzeichen · ${ITEMS_5.length} Aufgaben`,
    hint: "Jetzt auch A-, E-, Es- und As-Dur, in beiden Schlüsseln. Geh den Bauplan bis zur Lücke durch und zähle dann die Halbtöne ab der Note davor. In einer Tonleiter kommen nur Kreuze oder nur Be vor. Wähle den ganzen Namen, z. B. Fis oder B, oder tippe ihn ein.",
    input: "letters",
    acc: true,
    items: ITEMS_5,
    example: gapQuestion(find(ITEMS_5, "bass:E:3")).svg,
    question(prev) { return gapQuestion(pickItem(ITEMS_5, prev)); },
    check: checkGap,
  },
  {
    title: "Welcher Ton passt nicht?",
    subtitle: `Violinschlüssel · mit Hilfen · ${ITEMS_6.length} Aufgaben`,
    hint: "Bei einer Note fehlt ein Vorzeichen oder es steht eines zu viel. Prüfe Schritt für Schritt: Was verlangt der Bauplan, und wie viele Halbtöne sind es auf der Klaviatur?",
    items: ITEMS_6,
    example: oddQuestion(find(ITEMS_6, "treble:G:6:-1")).svg,
    question(prev) { return oddQuestion(pickItem(ITEMS_6, prev)); },
    ...planHelps(SCALE_DEMO),
  },
  {
    title: "Welcher Ton passt nicht? Ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · ${ITEMS_7.length} Aufgaben`,
    hint: "Bei einer Note fehlt ein Vorzeichen oder es steht eines zu viel. Prüfe die Schritte von Note zu Note: Halbtöne gehören nur zwischen die 3. und 4. und die 7. und 8. Stufe der Tonleiter.",
    items: ITEMS_7,
    example: oddQuestion(find(ITEMS_7, "bass:D:2:-1")).svg,
    question(prev) { return oddQuestion(pickItem(ITEMS_7, prev)); },
  },
  {
    title: "Tonleiter und Vorzeichen",
    subtitle: `Violinschlüssel · mit Hilfen · ${KEYS_4.length} Tonarten`,
    hint: "Die Vorzeichen einer Tonart stehen vorne hinter dem Schlüssel, in fester Reihenfolge:\n♯: Fis – Cis – Gis – Dis\n♭: B – Es – As – Des\nDer Grundton steht zweimal da, sein Vorzeichen zählt nur einmal.",
    items: ITEMS_8,
    example: sigQuestion(find(ITEMS_8, "treble:D")).svg,
    question(prev) { return sigQuestion(pickItem(ITEMS_8, prev)); },
    ...planHelps(SCALE_DEMO),
  },
  {
    title: "Tonleiter und Vorzeichen ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · ${KEYS_4.length} Tonarten`,
    hint: "Dasselbe in beiden Schlüsseln, ohne Hilfen. Die Reihenfolge bleibt: Kreuze Fis, Cis, Gis, Dis, Be B, Es, As, Des. Der Grundton steht zweimal da, sein Vorzeichen zählt nur einmal.",
    items: ITEMS_9,
    example: sigQuestion(find(ITEMS_9, "bass:Es")).svg,
    question(prev) { return sigQuestion(pickItem(ITEMS_9, prev)); },
  },
  {
    title: "Tonart aus den Vorzeichen",
    twoSteps: true,
    subtitle: `Violinschlüssel · zwei Schritte · mit Hilfen · ${FIFTHS.length} Dur-Tonarten`,
    hint: "Zwei Schritte: Erst das entscheidende Vorzeichen – bei Kreuzen das letzte, bei Be das vorletzte. Dann die Tonart: einen Halbton über dem letzten Kreuz (Fis → G-Dur) bzw. das vorletzte Be selbst (B, Es → B-Dur). Ein einzelnes Be steht für F-Dur.",
    items: ITEMS_10,
    example: keySvg({ clef: "treble", fifths: 4 }),
    question(prev) { return majorStepQuestion(pickKey(ITEMS_10, prev)); },
    ...keyHelps(),
  },
  {
    title: "Tonart aus den Vorzeichen ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · ${FIFTHS.length} Dur-Tonarten`,
    hint: "Bei Kreuzen liegt der Grundton einen Halbton über dem letzten Kreuz (Fis → G-Dur). Bei Be-Vorzeichen ist das vorletzte Be der Grundton (B, Es → B-Dur); ein einzelnes Be steht für F-Dur.",
    items: ITEMS_11,
    example: keySvg({ clef: "treble", fifths: 3 }),
    question(prev) { return majorQuestion(pickKey(ITEMS_11, prev)); },
  },
  {
    title: "Parallele Molltonart",
    twoSteps: true,
    subtitle: `Violinschlüssel · zwei Schritte · mit Hilfen · ${FIFTHS.length} Molltonarten`,
    hint: "Zwei Schritte: Erst die Terz abwärts – drei Notenstufen, der Dur-Grundton zählt als 1 (Es, D, C). Das ergibt den Stammton (Stammton = Note ohne Vorzeichen). Dann drei Halbtöne abwärts, so bekommt der Stammton sein Vorzeichen: Zusammen ist das eine kleine Terz abwärts. Moll wird klein geschrieben.",
    items: ITEMS_12,
    example: keySvg({ clef: "treble", fifths: -3 }),
    question(prev) { return minorStepQuestion(pickKey(ITEMS_12, prev)); },
    ...minorHelps(),
  },
  {
    title: "Parallele Molltonart ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · ${FIFTHS.length} Molltonarten`,
    hint: "Die parallele Molltonart hat dieselben Vorzeichen. Ihr Grundton liegt eine kleine Terz unter dem Dur-Grundton: C-Dur → a-Moll, Es-Dur → c-Moll. Moll wird klein geschrieben.",
    items: ITEMS_13,
    example: keySvg({ clef: "bass", fifths: -3 }),
    question(prev) { return minorQuestion(pickKey(ITEMS_13, prev)); },
  },
].map((l, i) => ({ id: "tonleitern-" + (i + 1), no: i + 1, input: "choices", check, ...l }));

/* ---------- Lerntafeln ---------- */

const TABLE_OPEN = `<table class="small" style="grid-column: 1 / -1; width: 100%; border-collapse: collapse; text-align: left">`;
const FIG = (html) => `<figure style="grid-column: 1 / -1; margin: 0">${html}</figure>`;

// Bauplan: C-Dur mit Klammern an den beiden Halbtonschritten, darunter die Bauplan-Leiste.
// Die Überschrift setzt learn.js.
function planBoard(clef) {
  const notes = scaleNotes(TONICS[clef].C), names = notes.map(helm);
  return `${FIG(scaleSvg(notes, clef, { marks: [[2, 3], [6, 7]] }))}
    <p style="grid-column: 1 / -1; margin: 0; text-align: center"><b>Ganz Ganz Halb · Ganz · Ganz Ganz Halb</b></p>
    ${FIG(planTable())}
    <p class="small muted" style="grid-column: 1 / -1">Die Klammern zeigen die Halbtonschritte: ${names[2]}–${names[3]} und ${names[6]}–${names[7]}, also zwischen der 3. und 4. und der 7. und 8. Stufe der Tonleiter. Die Tonleiter teilt sich in zwei gleich gebaute Vierergruppen (Tetrachorde), je Ganz – Ganz – Halb: ${names.slice(0, 4).join(" ")} und ${names.slice(4).join(" ")}. Dazwischen liegt ein Ganztonschritt. Ein Tetrachord sind vier stufenweise aufeinanderfolgende Töne im Umfang einer Quarte – trotz des Namens kein Akkord.</p>`;
}

function circleBoard() {
  const order = [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7];
  const rows = order.map((f) => `<tr><td>${sigText(f)}</td><td><b>${majorName(f)}</b></td><td><b>${minorName(f)}</b></td></tr>`).join("");
  return `<p class="small muted" style="grid-column: 1 / -1">Vorzeichen, Dur-Tonart und parallele Molltonart. Jedes weitere ♯ führt eine Quinte höher, jedes weitere ♭ eine Quinte tiefer.</p>
    ${TABLE_OPEN}<thead><tr><th>Vorzeichen</th><th>Dur</th><th>parallele Molltonart</th></tr></thead><tbody>${rows}</tbody></table>
    ${FIG(circleTable())}`;
}

function keysBoard() {
  const rows = KEYS_4.map((k) => {
    const notes = scaleNotes(TONICS.treble[k]), f = fifthsOf(notes[0]);
    return `<tr><td><b>${keyName(notes[0])}</b></td><td>${notes.map(gName).join(" ")}</td><td>${f === 0 ? "keine" : sigList(f)}</td></tr>`;
  }).join("");
  return `<p class="small muted" style="grid-column: 1 / -1">Jede Dur-Tonleiter hat denselben Bauplan. Damit er stimmt, brauchen manche Tonleitern Vorzeichen. Diese stehen vorne hinter dem Schlüssel, immer in derselben Reihenfolge.</p>
    ${TABLE_OPEN}<thead><tr><th>Tonart</th><th>Töne</th><th>Vorzeichen</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// Lerntafeln mit Vorführung: Beispiel-Knöpfe, darunter die Vorführung (mountBoard verdrahtet die Knöpfe;
// eigenes Attribut data-tl-board, damit sich die Tafeln nicht mit der Intervall-Tafel in die Quere kommen)
export const BOARDS = {
  scale: {
    examples: ["C", "G", "F", "D", "B"].map((k) => ({ label: keyName(TONICS.treble[k]), make: () => scaleDemo(TONICS.treble[k], "treble") })),
    intro: "Erst der Bauplan: die Stufen 1 bis 8 und Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb. Dann die Klaviatur: Halbtöne zählen, so ergeben sich die Vorzeichen. Wähle eine Tonart, dann „Weiter ›“ oder „Abspielen“.",
    after: "Passt ein Abstand nicht zum Bauplan, ändert sich immer die obere Note: Abstand zu klein → ♯, zu groß → ♭. In As-Dur sind as'–h' 3 Halbtöne, der Bauplan will Ganz → h' wird zu b'.",
  },
  key: {
    examples: [3, -3, 7, -1, 0].map((f) => ({ label: f ? sigText(f) : "keine", make: () => keyDemo(f, "treble") })),
    intro: "Erst das entscheidende Vorzeichen: bei Kreuzen das letzte, bei Be das vorletzte. Dann die Klaviatur: Einen Halbton über dem letzten Kreuz liegt der Grundton, das vorletzte Be ist selbst der Grundton.",
    after: "Ein einzelnes Be steht für F-Dur, ohne Vorzeichen ist es C-Dur.",
  },
  minor: {
    examples: [-3, 0, 3, -5, -7].map((f) => ({ label: majorName(f), make: () => minorDemo(f) })),
    intro: "Die parallele Molltonart hat dieselben Vorzeichen. Erst drei Notenstufen abwärts, der Dur-Grundton zählt als 1. Dann drei Halbtöne abwärts. Das ist derselbe Weg wie bei den Intervallen: eine kleine Terz abwärts.",
    after: "Achtung H und B: In Des-Dur ist der Stammton H, mit ♭ heißt er B → b-Moll. Ces-Dur beginnt auf der Taste H, drei Halbtöne darunter liegt as → as-Moll.",
  },
};

export function boardHtml(id) {
  const b = BOARDS[id];
  const picks = b.examples.map((ex, i) => `<button class="btn${i ? "" : " on"}" data-ex="${i}" aria-pressed="${!i}">${ex.label}</button>`).join("");
  return `<div class="demo-board" data-tl-board="${id}">
    <p class="small">${b.intro}</p>
    <div class="row demo-pick" role="group" aria-label="Beispiel">${picks}</div>
    <div class="demo" data-demo-root>${demoHtml(b.examples[0].make(), 0)}</div>
    <p class="small muted">${b.after}</p>
  </div>`;
}

export const mountBoard = (id) => (container) => {
  const board = container.querySelector(`[data-tl-board="${id}"]`);
  if (!board) return;
  const root = board.querySelector("[data-demo-root]"), ex = BOARDS[id].examples;
  let h = mountDemo(root, ex[0].make());
  board.querySelector(".demo-pick").onclick = (e) => {
    const btn = e.target.closest("[data-ex]");
    if (!btn) return;
    h.stop();
    board.querySelectorAll("[data-ex]").forEach((x) => { x.classList.toggle("on", x === btn); x.setAttribute("aria-pressed", String(x === btn)); });
    h = mountDemo(root, ex[+btn.dataset.ex].make());
  };
};

export default {
  id: "tonleitern",
  title: "Tonleitern",
  subtitle: "Dur-Tonleitern bauen und lesen",
  grade: "Klasse 5–9",
  levels,
  learn: [
    { title: "So baust du eine Dur-Tonleiter", render() { return boardHtml("scale"); }, mount: mountBoard("scale") },
    { title: "Bauplan Dur", clef: "treble", render() { return planBoard("treble"); } },
    { title: "Bauplan Dur", clef: "bass", render() { return planBoard("bass"); } },
    { title: "Dur-Tonleitern bis 4 Vorzeichen", render() { return keysBoard(); } },
    { title: "So findest du die Tonart", render() { return boardHtml("key"); }, mount: mountBoard("key") },
    { title: "Quintenzirkel", render() { return circleBoard(); } },
    { title: "So findest du die parallele Molltonart", render() { return boardHtml("minor"); }, mount: mountBoard("minor") },
  ],
  blitz: null,
};
