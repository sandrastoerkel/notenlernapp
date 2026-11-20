// Paket „Tonleitern“: Dur-Tonleitern bis 4 Vorzeichen (Stufen 1–6), Tonart aus den Vorzeichen und
// parallele Molltonart (Stufen 7 und 8, bis 20.11.2026 im Paket „Intervalle“), vier Lerntafeln.
// Grundlage: docs/PLAN.md, Abschnitt „Paket Tonleitern“; LehrplanPLUS Gymnasium Musik Kl. 5
// (Dur-Tonleitern mit verschiedenen Grundtönen, Ganz- und Halbtonschritt).
// Stufen 1–6: nur Dur, keine Doppelvorzeichen, keine Eis/His/Ces/Fes. Moll-Tonleitern folgen später als tonleitern-9 ff.
import { N, midi, pc, SEMI, gName, helm, majorScale, staffPos, majorKeyFromKeySig, majorName, minorName } from "../music.js";
import { staffSvg, noteSvg, TOP, S } from "../staff.js";

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

/* ---------- Stufe 1 und 2: Ganz- oder Halbtonschritt ---------- */

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

// Halbtöne mit Wahrscheinlichkeit 0,4 (sonst kämen sie nur 2 von 7 Mal)
export function pickStep(items, prev, rnd = Math.random) {
  const half = rnd() < HALF_P;
  const cand = items.filter((it) => it.half === half && (!prev || it.key !== prev.key));
  return cand.length ? cand[Math.floor(rnd() * cand.length)] : pickItem(items, prev);
}

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
    clef: it.clef,
    statKey: `${it.half ? "Halbton" : "Ganzton"} ${low(a)}–${low(b)}`,
  };
}

/* ---------- Stufe 3 und 4: Welcher Ton fehlt? ---------- */

function gapPool(clefs, keys) {
  const out = [];
  for (const clef of clefs) for (const k of keys) {
    const notes = scaleNotes(TONICS[clef][k]);
    for (let i = 1; i <= 6; i++) out.push({ key: `${clef}:${k}:${i}`, clef, k, notes, i });
  }
  return out;
}

export const ITEMS_3 = gapPool(["treble"], KEYS_2);
export const ITEMS_4 = gapPool(["treble", "bass"], KEYS_4);

function gapQuestion(it) {
  const n = it.notes[it.i], key = keyName(it.notes[0]);
  const where = `${key}, ${degree(it.i)}`;
  return {
    key: it.key,
    svg: scaleSvg(it.notes, it.clef, { gap: it.i, height: labelHeight(it.notes, it.clef) }),
    revealSvg: scaleSvg(it.notes, it.clef, { cls: { [it.i]: "ok" }, label: { i: it.i, text: gName(n) } }),
    keepRow: true,
    prompt: "Welcher Ton fehlt?",
    answer: { letter: n.letter, acc: n.acc },
    note: n,
    display: `${gName(n)} (${where})`,
    reveal: `Richtig wäre: ${gName(n)} (${where}).`,
    play: scalePlay(it.notes),
    clef: it.clef,
    statKey: `${where} (Lücke)`,
  };
}

// Mit der Klaviatur zählt die Tonklasse (wie in „Noten lesen“: Fis = Ges)
export function checkGap(q, value) {
  if (typeof value === "number") return pc(midi(q.note)) === pc(value);
  return !!value && value.letter === q.answer.letter && value.acc === q.answer.acc;
}

/* ---------- Stufe 5: Welcher Ton passt nicht? ---------- */

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

export const ITEMS_5 = oddPool(["treble", "bass"], KEYS_4);

export function oddQuestion(it) {
  const key = keyName(it.notes[0]), right = gName(it.notes[it.i]), answer = gName(it.moved);
  return {
    key: it.key,
    svg: scaleSvg(it.shown, it.clef, { height: labelHeight(it.notes, it.clef) }),
    revealSvg: scaleSvg(it.notes, it.clef, { cls: { [it.i]: "ok" }, label: { i: it.i, text: right } }),
    keepRow: true,
    prompt: `Welcher Ton passt nicht in ${key}?`,
    answer,
    choices: it.shown.slice(1, 7).map(gName),
    display: `${answer} passt nicht: In ${key} heißt die ${degree(it.i)} ${right}.`,
    reveal: `In ${key} heißt die ${degree(it.i)} ${right}, nicht ${answer}.`,
    play: scalePlay(it.notes),
    clef: it.clef,
    statKey: `${key}, ${degree(it.i)} (Suchen)`,
  };
}

/* ---------- Stufe 6: Tonleiter und Vorzeichen ---------- */

export const ITEMS_6 = ["treble", "bass"].flatMap((clef) => KEYS_4.map((k) => {
  const notes = scaleNotes(TONICS[clef][k]);
  return { key: `${clef}:${k}`, clef, k, notes, fifths: fifthsOf(notes[0]) };
}));

// Vier Knöpfe: richtig, ein Vorzeichen mehr, eins weniger, gleiche Zahl mit der anderen Sorte.
// C-Dur: keine, Fis, B, Fis, Cis. Bei 4 Vorzeichen: eins weniger, zwei weniger, andere Sorte.
export function sigChoices(fifths) {
  if (fifths === 0) return shuffle([0, 1, -1, 2].map(sigList));
  const n = Math.abs(fifths), s = Math.sign(fifths);
  const counts = n >= 4 ? [n, n - 1, n - 2] : [n, n + 1, n - 1];
  return shuffle([...counts.map((c) => sigList(s * c)), sigList(-fifths)]);
}

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
    display: `${text} (${key})`,
    reveal: `Richtig wäre: ${text} (${key}).`,
    play: scalePlay(it.notes),
    clef: it.clef,
    statKey: `Vorzeichen von ${key}`,
  };
}

/* ---------- Stufe 7 und 8: Tonarten (bis 20.11.2026 Intervalle 5 und 6) ---------- */

// Unverändert aus dem Paket „Intervalle“ übernommen (Sandra, 20.11.2026): Tonart aus den Vorzeichen und
// parallele Molltonart, 15 Tonarten bis 7 Vorzeichen, Violin- und Bassschlüssel. Die Spielstände der
// alten Stufen intervalle-5 und -6 übernimmt src/store.js (migrateIntervalle) als tonleitern-7 und -8.

export const FIFTHS = Array.from({ length: 15 }, (_, i) => i - 7);
export const sigText = (f) => (f === 0 ? "keine Vorzeichen" : `${Math.abs(f)} ${f > 0 ? "♯" : "♭"}`);
// Satzanfang für die Auflösung nach falscher Antwort: „Drei Kreuze stehen für“, „Ein Be steht für“,
// „Ohne Vorzeichen ist es“ (das Be, Mehrzahl die Be)
const COUNT_WORDS = ["", "Ein", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben"];
export function sigSentence(f) {
  if (f === 0) return "Ohne Vorzeichen ist es";
  const n = Math.abs(f), one = n === 1;
  const sign = f > 0 ? (one ? "Kreuz" : "Kreuze") : "Be";
  return `${COUNT_WORDS[n]} ${sign} ${one ? "steht" : "stehen"} für`;
}
const keyPool = () => ["treble", "bass"].flatMap((clef) => FIFTHS.map((fifths) => ({ clef, fifths })));
export const ITEMS_7 = keyPool();
export const ITEMS_8 = keyPool();

const tonicPc = (f) => { const t = majorKeyFromKeySig(f); return pc(SEMI[t.letter] + t.acc); };

// Vier Tonarten: die richtige, ein Vorzeichen mehr und weniger, dieselbe Zahl mit dem anderen Vorzeichen.
// Gleich klingende Tonarten (Fis-Dur/Ges-Dur) stehen nie zusammen in der Auswahl: weder als Ablenker zur
// richtigen Antwort noch zwei Ablenker untereinander (Cis-Dur/Des-Dur). Dur: namer = majorName, Moll: minorName.
export function keyChoices(fifths, namer) {
  const picks = [fifths];
  const ok = (f) => f >= -7 && f <= 7 && !picks.some((p) => p === f || tonicPc(p) === tonicPc(f));
  for (const f of [fifths - 1, fifths + 1, -fifths, fifths - 2, fifths + 2, fifths - 3, fifths + 3, fifths - 4, fifths + 4]) {
    if (picks.length >= 4) break;
    if (ok(f)) picks.push(f);
  }
  return shuffle(picks.map(namer));
}

// Stufe 6 bietet zusätzlich die gleichnamige Molltonart an (Es-Dur → es-Moll statt c-Moll), wenn es sie gibt
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

function majorQuestion(it) {
  const answer = majorName(it.fifths);
  return {
    svg: keySvg(it),
    prompt: "Welche Dur-Tonart?",
    answer,
    display: `${answer} (${sigText(it.fifths)})`,
    reveal: `${sigSentence(it.fifths)} ${answer}.`,
    choices: keyChoices(it.fifths, majorName),
    clef: it.clef, fifths: it.fifths,
    statKey: `Dur zu ${keyStat(it)}`,
  };
}

function minorQuestion(it) {
  const answer = minorName(it.fifths);
  return {
    svg: keySvg(it),
    prompt: `Parallele Molltonart zu ${majorName(it.fifths)}?`,
    answer,
    display: `${answer} (parallel zu ${majorName(it.fifths)}, ${sigText(it.fifths)})`,
    reveal: `Die parallele Molltonart zu ${majorName(it.fifths)} ist ${answer}.`,
    choices: minorChoices(it.fifths),
    clef: it.clef, fifths: it.fifths,
    statKey: `Moll zu ${majorName(it.fifths)}`,
  };
}


/* ---------- Stufen ---------- */

const check = (q, value) => value === q.answer;
const find = (items, key) => items.find((it) => it.key === key);

const levels = [
  {
    title: "Ganz- und Halbtonschritte in C-Dur",
    subtitle: `Violin- und Bassschlüssel · ${ITEMS_1.length} Schritte`,
    hint: "In C-Dur liegen die Halbtonschritte zwischen e und f und zwischen h und c, also zwischen der 3. und 4. und der 7. und 8. Stufe. Auf der Klaviatur: Dort liegt keine schwarze Taste dazwischen.",
    input: "choices",
    items: ITEMS_1,
    example: stepQuestion(find(ITEMS_1, "treble:C:2")).svg,
    question(prev) { return stepQuestion(pickStep(ITEMS_1, prev)); },
    check,
  },
  {
    title: "Bauplan der Dur-Tonleiter",
    subtitle: `G-, D-, F- und B-Dur · ${ITEMS_2.length} Schritte`,
    hint: "Jede Dur-Tonleiter hat denselben Bauplan: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb. Die Halbtöne liegen immer zwischen der 3. und 4. und der 7. und 8. Stufe. Achte auf die Vorzeichen: In D-Dur ist e'–fis' ein Ganzton, fis'–g' ein Halbton.",
    input: "choices",
    items: ITEMS_2,
    example: stepQuestion(find(ITEMS_2, "treble:D:2")).svg,
    question(prev) { return stepQuestion(pickStep(ITEMS_2, prev)); },
    check,
  },
  {
    title: "Welcher Ton fehlt?",
    subtitle: `Violinschlüssel · bis 2 Vorzeichen · ${ITEMS_3.length} Aufgaben`,
    hint: "Die Tonleiter beginnt mit dem Grundton. Geh den Bauplan Schritt für Schritt durch: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb. Wähle den ganzen Namen, z. B. Fis oder B, oder tippe ihn ein.",
    input: "letters",
    acc: true,
    items: ITEMS_3,
    example: gapQuestion(find(ITEMS_3, "treble:G:6")).svg,
    question(prev) { return gapQuestion(pickItem(ITEMS_3, prev)); },
    check: checkGap,
  },
  {
    title: "Welcher Ton fehlt? Bis 4 Vorzeichen",
    subtitle: `Violin- und Bassschlüssel · ${ITEMS_4.length} Aufgaben`,
    hint: "Jetzt auch A-, E-, Es- und As-Dur, in beiden Schlüsseln. Schau dir die Vorzeichen der anderen Noten an: In einer Tonleiter kommen nur Kreuze oder nur Be vor.",
    input: "letters",
    acc: true,
    items: ITEMS_4,
    example: gapQuestion(find(ITEMS_4, "bass:E:3")).svg,
    question(prev) { return gapQuestion(pickItem(ITEMS_4, prev)); },
    check: checkGap,
  },
  {
    title: "Welcher Ton passt nicht?",
    subtitle: `Violin- und Bassschlüssel · ${ITEMS_5.length} Aufgaben`,
    hint: "Bei einer Note fehlt ein Vorzeichen oder es steht eines zu viel. Prüfe die Schritte von Note zu Note: Halbtöne gehören nur zwischen die 3. und 4. und die 7. und 8. Stufe.",
    input: "choices",
    items: ITEMS_5,
    example: oddQuestion(find(ITEMS_5, "treble:G:6:-1")).svg,
    question(prev) { return oddQuestion(pickItem(ITEMS_5, prev)); },
    check,
  },
  {
    title: "Tonleiter und Vorzeichen",
    subtitle: `Violin- und Bassschlüssel · ${KEYS_4.length} Tonarten`,
    hint: "Die Vorzeichen einer Tonart stehen vorne hinter dem Schlüssel, in fester Reihenfolge: Kreuze Fis, Cis, Gis, Dis, Be B, Es, As, Des. Der Grundton steht zweimal da, sein Vorzeichen zählt nur einmal.",
    input: "choices",
    items: ITEMS_6,
    example: sigQuestion(find(ITEMS_6, "treble:D")).svg,
    question(prev) { return sigQuestion(pickItem(ITEMS_6, prev)); },
    check,
  },
  {
    title: "Tonart aus den Vorzeichen",
    subtitle: "Violin- und Bassschlüssel · 15 Dur-Tonarten",
    hint: "Bei Kreuzen liegt der Grundton einen Halbton über dem letzten Kreuz (Fis → G-Dur). Bei Be-Vorzeichen ist das vorletzte Be der Grundton (B, Es → B-Dur); ein einzelnes Be steht für F-Dur.",
    input: "choices",
    items: ITEMS_7,
    example: keySvg({ clef: "treble", fifths: 3 }),
    question(prev) { return majorQuestion(pickKey(ITEMS_7, prev)); },
    check,
  },
  {
    title: "Parallele Molltonart",
    subtitle: "Violin- und Bassschlüssel · 15 Molltonarten",
    hint: "Die parallele Molltonart hat dieselben Vorzeichen. Ihr Grundton liegt eine kleine Terz unter dem Dur-Grundton: C-Dur → a-Moll, Es-Dur → c-Moll. Moll wird klein geschrieben.",
    input: "choices",
    items: ITEMS_8,
    example: keySvg({ clef: "bass", fifths: -3 }),
    question(prev) { return minorQuestion(pickKey(ITEMS_8, prev)); },
    check,
  },
].map((l, i) => ({ id: "tonleitern-" + (i + 1), no: i + 1, ...l }));

/* ---------- Lerntafeln ---------- */

const TABLE_OPEN = `<table class="small" style="grid-column: 1 / -1; width: 100%; border-collapse: collapse; text-align: left">`;

// Bauplan: C-Dur mit Klammern an den beiden Halbtonschritten. Die Überschrift setzt learn.js.
function planBoard(clef) {
  const notes = scaleNotes(TONICS[clef].C), names = notes.map(helm);
  return `<figure style="grid-column: 1 / -1; margin: 0">${scaleSvg(notes, clef, { marks: [[2, 3], [6, 7]] })}</figure>
    <p style="grid-column: 1 / -1; margin: 0; text-align: center"><b>Ganz Ganz Halb · Ganz · Ganz Ganz Halb</b></p>
    <p class="small muted" style="grid-column: 1 / -1">Die Klammern zeigen die Halbtonschritte: ${names[2]}–${names[3]} und ${names[6]}–${names[7]}, also zwischen der 3. und 4. und der 7. und 8. Stufe. Die Tonleiter teilt sich in zwei gleich gebaute Vierergruppen (Tetrachorde), je Ganz – Ganz – Halb: ${names.slice(0, 4).join(" ")} und ${names.slice(4).join(" ")}. Dazwischen liegt ein Ganztonschritt. Ein Tetrachord sind vier stufenweise aufeinanderfolgende Töne im Umfang einer Quarte – trotz des Namens kein Akkord.</p>`;
}

function circleBoard() {
  const order = [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7];
  const rows = order.map((f) => `<tr><td>${sigText(f)}</td><td><b>${majorName(f)}</b></td><td><b>${minorName(f)}</b></td></tr>`).join("");
  return `<p class="small muted" style="grid-column: 1 / -1">Vorzeichen, Dur-Tonart und parallele Molltonart. Jedes weitere ♯ führt eine Quinte höher, jedes weitere ♭ eine Quinte tiefer.</p>
    ${TABLE_OPEN}<thead><tr><th>Vorzeichen</th><th>Dur</th><th>parallele Molltonart</th></tr></thead><tbody>${rows}</tbody></table>`;
}


function keysBoard() {
  const rows = KEYS_4.map((k) => {
    const notes = scaleNotes(TONICS.treble[k]), f = fifthsOf(notes[0]);
    return `<tr><td><b>${keyName(notes[0])}</b></td><td>${notes.map(gName).join(" ")}</td><td>${f === 0 ? "keine" : sigList(f)}</td></tr>`;
  }).join("");
  return `<p class="small muted" style="grid-column: 1 / -1">Jede Dur-Tonleiter hat denselben Bauplan. Damit er stimmt, brauchen manche Tonleitern Vorzeichen. Diese stehen vorne hinter dem Schlüssel, immer in derselben Reihenfolge.</p>
    ${TABLE_OPEN}<thead><tr><th>Tonart</th><th>Töne</th><th>Vorzeichen</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export default {
  id: "tonleitern",
  title: "Tonleitern",
  subtitle: "Dur-Tonleitern bauen und lesen",
  grade: "Klasse 5–9",
  levels,
  learn: [
    { title: "Bauplan Dur", clef: "treble", render() { return planBoard("treble"); } },
    { title: "Bauplan Dur", clef: "bass", render() { return planBoard("bass"); } },
    { title: "Dur-Tonleitern bis 4 Vorzeichen", render() { return keysBoard(); } },
    { title: "Quintenzirkel", render() { return circleBoard(); } },
  ],
  blitz: null,
};
