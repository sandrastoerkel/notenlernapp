// Paket „Dreiklänge und Quintenzirkel“: sechs Stufen und zwei Lerntafeln (Klasse 9 bis 12)
import {
  N, dia, midi, pc, gName, helm, staffPos, triad, invert, INVERSIONS, TRIAD_TYPES,
  MAJOR_KEYS, relativeMinorOf, fifthUp, fifthDown, degreeTriad, ROMAN, triadName,
} from "../music.js";
import { staffSvg, noteSvg, BOTTOM, S, ACC_DY } from "../staff.js";

const r2 = (v) => Math.round(v * 100) / 100;
const yOf = (p) => BOTTOM - p * (S / 2);

/* ---------- Akkord als Säule ganzer Noten ---------- */

// Maße in Linienabständen (LA) nach Verovio 6.4.1 / Bravura, gemessen an Akkorden aus ganzen Noten
// (Fis-Dur, Es-Dur, c vermindert, Des-Dur-Sextakkord, As-Dur-Quartsextakkord, A-Dur über der Zeile
// und 40 Paaren/Dreiergruppen aus ♯ und ♭ im Abstand Terz bis Septime):
// - Hilfslinien: eine gemeinsame Linie je Lage, 0,27 LA links und 0,25 LA rechts über den Kopf
//   (ganze Note 1,71 LA breit) → halbe Länge 1,12 LA.
// - Vorzeichen: das oberste steht in der ersten Spalte (0,25 LA vor dem Kopf), dann das unterste,
//   zuletzt das mittlere. Ein Vorzeichen weicht nach links aus, wenn es einem schon gesetzten zu nahe
//   kommt; zwischen zwei Spalten bleiben 0,16 LA.
const HEAD_HALF = 10.28; // halbe Breite der ganzen Note (staff.js, OPEN_HEADS[1])
const LEDGER_HALF = r2(1.12 * S);
const ACC_GAP = 0.25 * S; // Abstand des ersten Vorzeichens zum Kopf
// Noto Music bei 44px (staff.js): rechte Kante der Glyphe ab x und Breite der Tinte
const ACC_RIGHT = { sharp: 12.1, flat: 11.0 };
const ACC_W = { sharp: 9.84, flat: 8.76 };
// Bravura ist etwas breiter als Noto Music; teilweise Einrückungen werden mit diesem Verhältnis übernommen
const WIDTH_RATIO = 0.82;
// Hilfslinien-Freiraum wie in staff.js (ACC_LEDGER_SHIFT): ragt ein Vorzeichen der ersten Spalte senkrecht
// in eine Hilfslinie des Akkords, rückt es 1,9 (0,16 LA) weiter nach links. Verovio 6.4.1/Bravura,
// nachgemessen am 06.11.2026 (cis'-e'-gis', c'-eis'-g', E-Gis-H, a''-cis'''-e''', ces'-g', as''-c''',
// ges''-b'', fes''-a'', his'' über f''): ♯ 1,24 → 1,39 LA, ♭ 1,15 → 1,29 LA (linke Kante zur Kopfkante).
// ♯ ist symmetrisch und berührt Hilfslinien bis zwei halbe Stufen darüber oder darunter; ♭ reicht nach
// oben, es berührt Hilfslinien auf seiner Stufe und bis zwei halbe Stufen darüber (es'' unter a'' und
// es' über c' bleiben frei).
const ACC_LEDGER_SHIFT = 1.9;
export const accTouchesLedger = (kind, p, q) => (kind === "sharp" ? Math.abs(q - p) <= 2 : q - p >= 0 && q - p <= 2);

// Wie weit muss das Vorzeichen `low` (tiefer) gegenüber `up` (höher) ausweichen?
// d = Abstand in halben Stufen. Ergebnis: { full: Lücke in LA } (ganz links daneben),
// { part: Einrückung in LA } (rechte Kanten um so viel versetzt) oder null (gleiche Spalte).
// Werte aus Verovio (Bravura): Tabelle im Kommentar oben, Messung vom 06.11.2026.
export function accClash(up, low, d) {
  if (up === "sharp" && low === "sharp") return d <= 3 ? { full: 0.16 } : d === 4 ? { full: 0 } : d === 5 ? { full: -0.13 } : null;
  if (up === "flat" && low === "sharp") return d <= 3 ? { full: 0.16 } : d === 4 ? { full: 0 } : null;
  if (up === "sharp" && low === "flat") return d <= 3 ? { full: 0.16 } : d === 4 ? { full: 0.03 } : d === 5 ? { part: 0.51 } : d === 6 ? { part: 0.37 } : null;
  // beide ♭: der Bauch des unteren passt teilweise unter das obere
  return d <= 2 ? { full: 0.16 } : d <= 5 ? { part: 0.41 } : null;
}

// Rechte Kanten der Vorzeichen relativ zur Kopfmitte. accs: [{ p, kind }] (beliebige Reihenfolge).
// Liefert dieselben Objekte mit r (rechte Kante, negativ = links vom Kopf).
// ledgers: Stufen der Hilfslinien des Akkords (z. B. [-2]); berührte Vorzeichen halten Abstand.
export function placeAccidentals(accs, ledgers = []) {
  const sorted = accs.slice().sort((a, b) => b.p - a.p);
  // Reihenfolge: oberstes, unterstes, dann von außen nach innen
  const order = [];
  let i = 0, j = sorted.length - 1;
  while (i <= j) { order.push(sorted[i++]); if (i <= j) order.push(sorted[j--]); }
  const placed = [];
  for (const a of order) {
    let r = -HEAD_HALF - ACC_GAP - (ledgers.some((q) => accTouchesLedger(a.kind, a.p, q)) ? ACC_LEDGER_SHIFT : 0);
    for (const b of placed) {
      const up = a.p > b.p ? a : b, low = a.p > b.p ? b : a;
      const c = accClash(up.kind, low.kind, Math.abs(a.p - b.p));
      if (!c) continue;
      // Teilweise einrücken darf nur das tiefere Zeichen; muss das höhere ausweichen, geht es ganz daneben
      const full = c.full !== undefined ? c.full : a.p > b.p ? 0.16 : null;
      const bound = full !== null ? b.r - ACC_W[b.kind] - full * S : b.r - c.part * S * WIDTH_RATIO;
      r = Math.min(r, bound);
    }
    a.r = r2(r);
    placed.push(a);
  }
  return accs;
}

// Vorzeichen eines Buchstabens in der Vorzeichnung (sig ♯ positiv, ♭ negativ)
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "H"];
const FLAT_ORDER = ["H", "E", "A", "D", "G", "C", "F"];
export const keyAcc = (letter, sig) => (sig > 0 ? (SHARP_ORDER.indexOf(letter) < sig ? 1 : 0) : sig < 0 ? (FLAT_ORDER.indexOf(letter) < -sig ? -1 : 0) : 0);

// Akkord: ganze Noten übereinander an x, eine gemeinsame Hilfslinien-Reihe, Vorzeichen versetzt.
// opts.keySig: Vorzeichnung; Töne, die ihr entsprechen, bekommen kein Vorzeichen.
// Abweichungen von der Vorzeichnung (Auflösungszeichen) kommen in diesem Paket nicht vor.
export function chordSvg(notes, clef, x, opts = {}) {
  const sig = opts.keySig || 0;
  const ps = notes.map((n) => staffPos(n, clef));
  let s = `<g class="chord">`;
  const lo = Math.min(...ps), hi = Math.max(...ps), ledgers = [];
  for (let q = -2; q >= lo; q -= 2) ledgers.push(q);
  for (let q = 10; q <= hi; q += 2) ledgers.push(q);
  for (const q of ledgers) s += `<line class="ledger" x1="${r2(x - LEDGER_HALF)}" x2="${r2(x + LEDGER_HALF)}" y1="${yOf(q)}" y2="${yOf(q)}"/>`;
  const accs = [];
  notes.forEach((n, i) => {
    if (n.acc !== keyAcc(n.letter, sig)) {
      if (n.acc === 0) throw new Error("Auflösungszeichen nicht vorgesehen: " + helm(n));
      accs.push({ p: ps[i], kind: n.acc > 0 ? "sharp" : "flat" });
    }
    // Kopf aus staff.js ohne eigene Hilfslinien und ohne Vorzeichen
    s += noteSvg(N(n.letter, n.octave, 0), clef, x, "", { value: 1 }).replace(/<line class="ledger"[^>]*\/>/g, "");
  });
  placeAccidentals(accs, ledgers).forEach((a) => {
    s += `<text class="acc" x="${r2(x + a.r - ACC_RIGHT[a.kind])}" y="${yOf(a.p) + ACC_DY[a.kind]}">${a.kind === "sharp" ? "♯" : "♭"}</text>`;
  });
  return s + "</g>";
}

/* ---------- Aufgaben-Vorrat ---------- */

// Tiefster Ton in die Lage −2 bis 4 der Zeile (Violin c' bis h', Bass E bis d): höchstens eine Hilfslinie unten
export function placeLow(letter, acc, clef) {
  const base = clef === "treble" ? 30 : 18;
  for (let o = 1; o <= 6; o++) {
    const p = dia(N(letter, o)) - base;
    if (p >= -2 && p <= 4) return N(letter, o, acc);
  }
  return null;
}

// Schreibweisen, die erst später vorkommen sollen (Eis, His, Fes, Ces)
const RARE = (n) => (n.acc === 1 && (n.letter === "E" || n.letter === "H")) || (n.acc === -1 && (n.letter === "F" || n.letter === "C"));

const ROOTS = [
  N("C", 4), N("D", 4), N("E", 4), N("F", 4), N("G", 4), N("A", 4), N("H", 4),
  N("F", 4, 1), N("C", 4, 1), N("H", 4, -1), N("E", 4, -1), N("A", 4, -1), N("D", 4, -1),
];

// Bezeichnung eines Dreiklangs im Fließtext: „C-Dur-Dreiklang“, „verminderter Dreiklang auf h“
export function triadLabel(root, type) {
  if (type === "dur" || type === "moll") return triadName(root, type) + "-Dreiklang";
  return (type === "vermindert" ? "verminderter" : "übermäßiger") + " Dreiklang auf " + gName(root).toLowerCase();
}

// Alle Dreiklänge der Typen in Grundstellung, gesetzt in den Schlüsseln; k = Umkehrung
function triadPool(types, clefs, invs = [0]) {
  const out = [];
  for (const clef of clefs) for (const type of types) for (const r of ROOTS) {
    const base = triad(r, type);
    if (!base || base.some(RARE)) continue;
    for (const k of invs) {
      const inv = invert(base, k);
      const low = placeLow(inv[0].letter, inv[0].acc, clef);
      const shift = low.octave - inv[0].octave;
      const notes = inv.map((n) => N(n.letter, n.octave + shift, n.acc));
      out.push({ clef, type, root: notes[(3 - k) % 3], inv: k, notes, key: `${clef}|${type}|${gName(r)}|${k}` });
    }
  }
  return out;
}

export function pick(items, prev) {
  const cand = prev ? items.filter((it) => it.key !== prev.key) : items;
  const list = cand.length ? cand : items;
  return list[Math.floor(Math.random() * list.length)];
}

const CHORD_X = 170;
const chordStaff = (it, sig) => staffSvg(it.clef, chordSvg(it.notes, it.clef, CHORD_X, { keySig: sig }), sig ? { keySig: sig } : undefined);
const clefLabel = (clefs) => (clefs.length === 2 ? "Beide Schlüssel" : clefs[0] === "treble" ? "Violinschlüssel" : "Bassschlüssel");

// Grundlage einer Dreiklang-Aufgabe; die Töne klingen nach der Antwort zusammen
const chordQuestion = (it, sig = 0) => ({
  svg: chordStaff(it, sig),
  prompt: "",
  play: it.notes,
  playTogether: true,
  clef: it.clef,
  key: it.key,
});

const checkChoice = (q, value) => value === q.answer;

/* Stufe 1 und 2: Dreiklangstyp */
const TYPE_NAMES = Object.fromEntries(Object.entries(TRIAD_TYPES).map(([k, t]) => [k, t.name]));
function typeLevel(no, title, hint, types, clefs, prompt) {
  const items = triadPool(types, clefs);
  const choices = types.map((t) => TYPE_NAMES[t]);
  const make = (it) => ({
    ...chordQuestion(it), prompt, answer: TYPE_NAMES[it.type], display: triadLabel(it.root, it.type), choices,
    reveal: `Richtig wäre: ${TYPE_NAMES[it.type]}. Das war ein ${triadLabel(it.root, it.type)}.`,
  });
  return {
    id: "akkorde-" + no, no, title, hint, input: "choices", items,
    subtitle: `${clefLabel(clefs)} · ${items.length} Dreiklänge`,
    example: make(items[0]).svg,
    question(prev) { return make(pick(items, prev)); },
    check: checkChoice,
  };
}

/* Stufe 3: Grundton */
function rootLevel() {
  const clefs = ["treble", "bass"];
  const items = triadPool(["dur", "moll", "vermindert", "uebermaessig"], clefs);
  const make = (it) => ({
    ...chordQuestion(it),
    prompt: "Wie heißt der Grundton?",
    answer: { letter: it.root.letter, acc: it.root.acc },
    display: `${triadLabel(it.root, it.type)} mit Grundton ${gName(it.root)}`,
    reveal: `Der Grundton ist ${gName(it.root)}. Das war ein ${triadLabel(it.root, it.type)}.`,
    note: it.root,
  });
  return {
    id: "akkorde-3", no: 3, title: "Grundton bestimmen",
    subtitle: `${clefLabel(clefs)} · ${items.length} Dreiklänge`,
    hint: "In der Grundstellung liegt der Grundton unten, darüber Terz und Quinte. Achte auf das Vorzeichen und tippe den ganzen Namen an, z. B. Fis oder B, oder schreib ihn („fis“, „b“) und drück Enter.",
    input: "letters", acc: true, items,
    example: make(items[0]).svg,
    question(prev) { return make(pick(items, prev)); },
    // Klaviatur: Vergleich nach Tonklasse (Fis = Ges)
    check(q, value) {
      if (typeof value === "number") return pc(midi(q.note)) === pc(value);
      return !!value && value.letter === q.answer.letter && value.acc === q.answer.acc;
    },
  };
}

/* Stufe 4: Umkehrungen */
function inversionLevel() {
  const clefs = ["treble", "bass"];
  const items = triadPool(["dur", "moll"], clefs, [0, 1, 2]);
  const make = (it) => ({
    ...chordQuestion(it),
    prompt: "Welche Lage?",
    answer: INVERSIONS[it.inv],
    display: it.inv === 0 ? `${triadLabel(it.root, it.type)} in Grundstellung` : `${INVERSIONS[it.inv]} von ${triadName(it.root, it.type)}`,
    choices: INVERSIONS,
    reveal: `Richtig wäre: ${INVERSIONS[it.inv]}. Unten liegt ${["der Grundton", "die Terz", "die Quinte"][it.inv]} von ${triadName(it.root, it.type)}.`,
  });
  return {
    id: "akkorde-4", no: 4, title: "Umkehrungen",
    subtitle: `${clefLabel(clefs)} · ${items.length} Akkorde`,
    hint: "Grundstellung: Grundton unten. Sextakkord: Terz unten (vom Bass zum Grundton eine Sexte). Quartsextakkord: Quinte unten (Quarte und Sexte über dem Bass).",
    input: "choices", items,
    example: make(items[0]).svg,
    question(prev) { return make(pick(items, prev)); },
    check: checkChoice,
  };
}

/* Stufe 5: Quintenzirkel */
const byPc = (n) => pc(midi(n));
const keyName = (k) => k.name;
export const keyBySig = (sig) => MAJOR_KEYS.find((k) => k.sig === sig);
export const sigLabel = (sig) => (sig === 0 ? "keine Vorzeichen" : `${Math.abs(sig)} ${sig > 0 ? "♯" : "♭"}`);

// Aufgaben: Quinte aufwärts (nicht von Cis-Dur: Gis-Dur hätte 8 ♯), Quinte abwärts (nicht von Ces-Dur:
// Fes-Dur hätte 8 ♭) und die Anzahl der Vorzeichen. Die Nachbarn ergeben sich aus fifthUp/fifthDown
// und sind immer die Tonart mit einem Vorzeichen mehr bzw. weniger (Kreuz-Seite) – im Test geprüft.
export const CIRCLE_ITEMS = [
  ...MAJOR_KEYS.filter((k) => k.sig < 7).map((k) => ({ kind: "up", k, key: "up|" + k.sig })),
  ...MAJOR_KEYS.filter((k) => k.sig > -7).map((k) => ({ kind: "down", k, key: "down|" + k.sig })),
  ...MAJOR_KEYS.map((k) => ({ kind: "count", k, key: "count|" + k.sig })),
];

export function neighbour(k, dir) {
  const t = dir === "up" ? fifthUp(k.tonic) : fifthDown(k.tonic);
  return MAJOR_KEYS.find((m) => m.tonic.letter === t.letter && m.tonic.acc === t.acc) || null;
}

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Ablenker ohne Enharmonik: keine zwei Knöpfe, die gleich klingen (Fis/Ges, Cis/Des, H/Ces), und
// nicht die gefragte Tonart selbst (auch nicht enharmonisch, z. B. Fis-Dur bei der Frage nach Ges-Dur)
function keyChoices(answer, near, asked) {
  const out = [answer];
  const free = (m) => m && byPc(m.tonic) !== byPc(asked.tonic) && !out.some((o) => byPc(o.tonic) === byPc(m.tonic));
  for (const m of [...near, ...shuffle(MAJOR_KEYS)]) { if (out.length >= 4) break; if (free(m)) out.push(m); }
  return shuffle(out).map(keyName);
}

function sigChoices(sig) {
  const near = [sig + 1, sig - 1, -sig].filter((s) => s !== sig && s >= -7 && s <= 7);
  const all = shuffle(Array.from({ length: 15 }, (_, i) => i - 7).filter((s) => s !== sig && !near.includes(s)));
  return shuffle([sig, ...near, ...all].slice(0, 4)).map(sigLabel);
}

// Tonika-Dreiklang einer Dur-Tonart im Violinschlüssel
const tonicItem = (k) => {
  const r = placeLow(k.tonic.letter, k.tonic.acc, "treble");
  return { clef: "treble", notes: triad(r, "dur") };
};

function circleQuestion(it) {
  const { k } = it;
  if (it.kind === "count") {
    return {
      svg: staffSvg("treble", chordSvg(tonicItem(k).notes, "treble", CHORD_X)),
      prompt: `Wie viele Vorzeichen hat ${k.name}?`,
      answer: sigLabel(k.sig),
      display: `${k.name} hat ${sigLabel(k.sig)}`,
      reveal: `Richtig wäre: ${sigLabel(k.sig)}. So viele Vorzeichen hat ${k.name}.`,
      choices: sigChoices(k.sig),
      key: it.key,
    };
  }
  const ans = neighbour(k, it.kind), other = neighbour(k, it.kind === "up" ? "down" : "up");
  const dir = it.kind === "up" ? "eine Quinte höher" : "eine Quinte tiefer";
  return {
    svg: staffSvg("treble", chordSvg(tonicItem(k).notes, "treble", CHORD_X, { keySig: k.sig }), { keySig: k.sig }),
    prompt: `${k.name}: Welche Dur-Tonart liegt im Quintenzirkel ${dir}?`,
    answer: ans.name,
    display: `${ans.name} liegt ${dir} als ${k.name}`,
    reveal: `Richtig wäre: ${ans.name}, ${dir} als ${k.name}.`,
    choices: keyChoices(ans, other ? [other] : [], k),
    key: it.key,
  };
}

function circleLevel() {
  return {
    id: "akkorde-5", no: 5, title: "Quintenzirkel",
    subtitle: `Dur-Tonarten bis 7 Vorzeichen · ${CIRCLE_ITEMS.length} Aufgaben`,
    hint: "Im Uhrzeigersinn geht es eine Quinte aufwärts, jedes Mal kommt ein ♯ dazu (C, G, D, A, E, H, Fis, Cis). Gegen den Uhrzeigersinn kommt je ein ♭ dazu (F, B, Es, As, Des, Ges, Ces).",
    input: "choices", items: CIRCLE_ITEMS,
    example: circleQuestion(CIRCLE_ITEMS[7]).svg,
    question(prev) { return circleQuestion(pick(CIRCLE_ITEMS, prev)); },
    check: checkChoice,
  };
}

/* Stufe 6: Stufenakkorde in Dur */
// Tonarten bis vier Vorzeichen; die Vorzeichnung steht am Zeilenanfang, die Akkorde brauchen dann keine
const DEGREE_KEYS = [0, 1, 2, 3, 4, -1, -2, -3, -4].map(keyBySig);
// Dreiklangstyp der leitereigenen Stufen in Dur: I Dur, II Moll, III Moll, IV Dur, V Dur, VI Moll, VII vermindert
export const DEGREE_TYPES = ["dur", "moll", "moll", "dur", "dur", "moll", "vermindert"];

export const DEGREE_ITEMS = (() => {
  const out = [];
  for (const clef of ["treble", "bass"]) for (const k of DEGREE_KEYS) for (let deg = 1; deg <= 7; deg++) {
    const t = degreeTriad(k.tonic, deg);
    const low = placeLow(t[0].letter, t[0].acc, clef), shift = low.octave - t[0].octave;
    const notes = t.map((n) => N(n.letter, n.octave + shift, n.acc));
    out.push({ clef, k, deg, type: DEGREE_TYPES[deg - 1], root: notes[0], notes, key: `${clef}|${k.sig}|${deg}` });
  }
  return out;
})();

function degreeLevel() {
  const items = DEGREE_ITEMS;
  const make = (it) => ({
    ...chordQuestion(it, it.k.sig),
    prompt: `Welche Stufe in ${it.k.name}?`,
    answer: ROMAN[it.deg - 1],
    display: `${triadLabel(it.root, it.type)}, Stufe ${ROMAN[it.deg - 1]}`,
    reveal: `Richtig wäre: ${ROMAN[it.deg - 1]}. Der Grundton ${gName(it.root)} ist die ${ROMAN[it.deg - 1]}. Stufe von ${it.k.name} (${triadName(it.root, it.type)}).`,
    // Alle sieben Stufen zur Wahl (Ausnahme von „4 bis 6 Knöpfe“, damit nichts durch Weglassen verraten wird)
    choices: ROMAN,
  });
  return {
    id: "akkorde-6", no: 6, title: "Stufenakkorde in Dur",
    subtitle: `Dur bis 4 Vorzeichen · beide Schlüssel · ${items.length} Akkorde`,
    hint: "Zähle vom Grundton der Tonart bis zum Grundton des Akkords. In Dur sind I, IV und V Dur-Dreiklänge, II, III und VI Moll, VII ist vermindert.",
    input: "choices", items,
    // Startkarte: VI. Stufe in G-Dur (e'-g'-h') mit Vorzeichnung
    example: make(items[12]).svg,
    question(prev) { return make(pick(items, prev)); },
    check: checkChoice,
  };
}

const levels = [
  typeLevel(1, "Dur oder Moll", "Dur: große Terz unten (4 Halbtöne), kleine oben (3). Moll: kleine Terz unten, große oben. Hör nach der Antwort genau hin.", ["dur", "moll"], ["treble", "bass"], "Dur oder Moll?"),
  typeLevel(2, "Vier Dreiklangstypen", "Zähle die Halbtöne: Dur 4 + 3, Moll 3 + 4, vermindert 3 + 3, übermäßig 4 + 4.", ["dur", "moll", "vermindert", "uebermaessig"], ["treble", "bass"], "Welcher Dreiklangstyp?"),
  rootLevel(),
  inversionLevel(),
  circleLevel(),
  degreeLevel(),
];

/* ---------- Lerntafeln ---------- */

// Die vier Typen auf c' (Violin) bzw. c (Bass) nebeneinander, darunter Name und Halbtöne
function typesSvg(clef) {
  const root = clef === "treble" ? N("C", 4) : N("C", 3);
  const types = ["dur", "moll", "vermindert", "uebermaessig"];
  let inner = "";
  types.forEach((t, i) => {
    const x = 104 + i * 58, notes = triad(root, t), [a, b] = TRIAD_TYPES[t].steps;
    inner += chordSvg(notes, clef, x);
    inner += `<text class="note-label" x="${x}" y="${BOTTOM + 30}" text-anchor="middle">${TRIAD_TYPES[t].name}</text>`;
    inner += `<text class="note-label" x="${x}" y="${BOTTOM + 43}" text-anchor="middle" style="fill:var(--muted)">${a} + ${b}</text>`;
    inner += `<text class="note-label" x="${x}" y="${BOTTOM + 56}" text-anchor="middle" style="fill:var(--muted)">${notes.map(helm).join("-")}</text>`;
  });
  return staffSvg(clef, inner, { height: BOTTOM + 66 });
}

const WRAP = "grid-column:1/-1;display:block;border:0;padding:0";
const typesHtml = (clef) => `<div style="${WRAP}"><p class="eyebrow" style="margin:6px 0 2px">Halbtöne Grundton–Terz + Terz–Quinte</p>`
  + `<span style="display:block;width:100%">${typesSvg(clef)}</span></div>`;

// Quintenzirkel als Ring aus Text: außen Dur, innen die parallelen Molltonarten, ganz innen die Vorzeichen.
// Unten stehen die enharmonisch gleichen Tonarten nebeneinander (H/Ces, Fis/Ges, Cis/Des).
export function circleRing() {
  // Position i (0 = oben, im Uhrzeigersinn): Kreuz-Tonart mit i ♯ (bis 7), ♭-Tonart mit 12 − i ♭ (bis 7)
  return Array.from({ length: 12 }, (_, i) => {
    const list = [i <= 7 ? keyBySig(i) : null, i >= 5 ? keyBySig(i - 12) : null].filter(Boolean);
    return {
      major: list.map((k) => gName(k.tonic)).join("/"),
      minor: list.map((k) => gName(relativeMinorOf(k.tonic).tonic).toLowerCase()).join("/"),
      sig: list.map((k) => (k.sig ? sigLabel(k.sig).replace(" ", "") : "0")).join("/"),
    };
  });
}

function circleSvg() {
  const c = 160, ring = circleRing();
  let s = `<svg viewBox="0 0 320 320" role="img" aria-label="Quintenzirkel" style="width:100%;max-width:360px;display:block;margin:0 auto">`;
  s += `<circle cx="${c}" cy="${c}" r="148" style="fill:none;stroke:var(--line)"/><circle cx="${c}" cy="${c}" r="108" style="fill:none;stroke:var(--line)"/><circle cx="${c}" cy="${c}" r="76" style="fill:none;stroke:var(--line)"/>`;
  ring.forEach((e, i) => {
    const a = (i * 30 - 90) * Math.PI / 180, at = (r) => `x="${r2(c + r * Math.cos(a))}" y="${r2(c + r * Math.sin(a))}"`;
    s += `<text ${at(128)} text-anchor="middle" dominant-baseline="central" style="fill:var(--fg);font-family:var(--display);font-weight:700;font-size:${e.major.length > 4 ? 14 : 18}px">${e.major}</text>`;
    s += `<text ${at(92)} text-anchor="middle" dominant-baseline="central" style="fill:var(--accent);font-family:var(--display);font-weight:600;font-size:${e.minor.length > 4 ? 12 : 14}px">${e.minor}</text>`;
    s += `<text ${at(60)} text-anchor="middle" dominant-baseline="central" style="fill:var(--muted);font-family:var(--body);font-weight:700;font-size:${e.sig.length > 3 ? 9 : 11}px">${e.sig}</text>`;
  });
  return s + "</svg>";
}

const circleHtml = () => `<div style="${WRAP}"><p class="eyebrow" style="margin:6px 0 2px">Im Uhrzeigersinn eine Quinte höher: ein ♯ mehr bzw. ein ♭ weniger</p>${circleSvg()}`
  + `<p class="small muted" style="margin:4px 0 0;text-align:center">Außen Dur, <span style="color:var(--accent)">innen die parallele Molltonart</span> (kleine Terz tiefer), in der Mitte die Vorzeichen.</p></div>`;

export default {
  id: "akkorde",
  title: "Dreiklänge und Quintenzirkel",
  subtitle: "Dreiklangstypen, Umkehrungen, Stufen",
  grade: "Klasse 9–12",
  levels,
  learn: [
    { title: "Dreiklangstypen", clef: "treble", render() { return typesHtml("treble"); } },
    { title: "Dreiklangstypen", clef: "bass", render() { return typesHtml("bass"); } },
    { title: "Quintenzirkel", render() { return circleHtml(); } },
  ],
  blitz: null,
};
