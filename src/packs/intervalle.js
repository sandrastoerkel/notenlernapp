// Paket „Intervalle und Tonarten“: zwölf Stufen (Klasse 5 bis 9) und vier Lerntafeln.
// Stufen 1–6 aus Paket D (Klasse 7–9), Stufen 7–12 aus Paket „Intervalle 7–12“ (Klasse 5–6, Welle 6):
// Ganz-/Halbton, rein/groß/klein auf- und abwärts, Intervalle bauen, Fehler finden. Grundlage:
// docs/PLAN.md, LehrplanPLUS Gymnasium Musik Kl. 5 und 6. Die Stufen 7–12 schalten sich über requires frei
// (7 nach 1, 8 nach 7 …), damit Klasse 5–6 nicht erst die Tonarten-Stufen 5 und 6 braucht.
// Intervallzahl aus dem diatonischen Abstand, Qualität aus der Halbtonzahl (src/music.js).
import {
  N, dia, fromDia, midi, pc, SEMI, same, helm, gName, staffPos, lowerNote,
  INTERVAL_NAMES, intervalNumber, intervalSemitones, intervalQuality, intervalLabel, intervalName, semitonesFor,
  majorKeyFromKeySig, majorName, minorName,
} from "../music.js";
import { staffSvg, noteSvg, BOTTOM, S, H } from "../staff.js";

const CLEF_SHORT = { treble: "Violin", bass: "Bass" };
// Zwei ganze Noten nebeneinander, 60 Einheiten (5 Linienabstände) von Kopfmitte zu Kopfmitte: das
// Vorzeichen vor der zweiten Note hat genug Luft zum ersten Kopf (staff.js setzt Vorzeichen und
// Hilfslinien der ganzen Note nach ihrer Kopfbreite, gemessen gegen Verovio).
export const X_LOW = 145, X_HIGH = 205, NOTE_VALUE = 1;

// Vorzeichen, die in den Aufgaben vorkommen dürfen: Stammtöne, Fis Cis Gis Dis Ais und B Es As Des Ges.
// Eis, His, Ces und Fes bleiben weg, Doppelvorzeichen gibt es nicht.
const RARE = new Set(["E1", "H1", "C-1", "F-1"]);
export const usualNote = (n) => n.acc >= -1 && n.acc <= 1 && !RARE.has(n.letter + n.acc);

// Obere Note zu unterer Note, Intervallzahl und Qualität; null, wenn sie ein ungewöhnliches Vorzeichen bräuchte
export function upperNote(low, num, quality) {
  const semi = semitonesFor(num, quality);
  if (semi === null) return null;
  const top = fromDia(dia(low) + num - 1);
  const acc = midi(low) + semi - midi(top);
  if (acc < -1 || acc > 1) return null;
  const n = N(top.letter, top.octave, acc);
  return usualNote(n) ? n : null;
}

const pairKey = (it) => `${it.clef}:${dia(it.low)}/${it.low.acc}:${dia(it.high)}/${it.high.acc}`;

// Zufällige Aufgabe, nie dieselbe wie prev (gleiche Noten im gleichen Schlüssel)
export function pickItem(items, prev) {
  const cand = prev ? items.filter((it) => pairKey(it) !== pairKey(prev)) : items;
  const list = cand.length ? cand : items;
  return list[Math.floor(Math.random() * list.length)];
}

export const intervalSvg = (it, cls) => staffSvg(it.clef, noteSvg(it.low, it.clef, X_LOW, "", { value: NOTE_VALUE }) + noteSvg(it.high, it.clef, X_HIGH, "", { value: NOTE_VALUE }), cls);
const pairText = (it) => `${helm(it.low)}–${helm(it.high)}`;

/* ---------- Vorrat der Intervall-Aufgaben ---------- */

// Stufe 1 und 2: alle Paare aus Stammtönen von Prime bis Oktave im Bereich from…to
function numberPool(clef, from, to) {
  const out = [];
  for (let d = dia(from); d <= dia(to); d++) {
    for (let k = 0; k <= 7 && d + k <= dia(to); k++) out.push({ clef, low: fromDia(d), high: fromDia(d + k) });
  }
  return out;
}

// Untere Töne mit üblichen Vorzeichen im Bereich from…to
function lowNotes(from, to) {
  const out = [];
  for (let d = dia(from); d <= dia(to); d++) for (const acc of [0, 1, -1]) { const n = fromDia(d, acc); if (usualNote(n)) out.push(n); }
  return out;
}

// Stufe 3 und 4: alle gültig geschriebenen Intervalle mit den Zahlen nums und Qualitäten quals,
// beide Noten im Bereich from…to
function qualityPool(clef, from, to, nums, quals) {
  const out = [];
  for (const low of lowNotes(from, to)) for (const num of nums) for (const q of quals) {
    const high = upperNote(low, num, q);
    if (high && dia(high) <= dia(to)) out.push({ clef, low, high, num, quality: q });
  }
  return out;
}

const TREBLE = [N("C", 4), N("A", 5)], BASS = [N("E", 2), N("C", 4)];
export const POOL_1 = numberPool("treble", ...TREBLE);
export const POOL_2 = numberPool("bass", ...BASS);
export const POOL_3 = qualityPool("treble", ...TREBLE, [2, 3, 6, 7], ["groß", "klein"]);
// Stufe 4: Quarte und Quinte rein, vermindert, übermäßig; von der Oktave nur die reine
export const POOL_4 = qualityPool("treble", ...TREBLE, [4, 5, 8], ["vermindert", "rein", "übermäßig"])
  .filter((it) => it.num !== 8 || it.quality === "rein");

/* ---------- Auswahlknöpfe ---------- */

// Stufe 1 und 2: fünf aufeinanderfolgende Intervallzahlen, die die richtige enthalten
export function numberChoices(num, rnd = Math.random) {
  const lo = Math.max(1, Math.min(num - Math.floor(rnd() * 5), 4));
  return INTERVAL_NAMES.slice(lo - 1, lo + 4);
}

// Stufe 3: groß und klein der Zahl und ihres Nachbarn (Sekunde ↔ Terz, Sexte ↔ Septime)
const NEIGHBOUR_3 = { 2: 3, 3: 2, 6: 7, 7: 6 };
export function minorMajorChoices(num) {
  return [num, NEIGHBOUR_3[num]].sort((a, b) => a - b).flatMap((n) => [intervalLabel(n, "klein"), intervalLabel(n, "groß")]);
}

// Stufe 4: bei Quarte und Quinte die drei Qualitäten der Zahl und das gleich klingende Nachbarintervall
// (übermäßige Quarte ↔ verminderte Quinte). Die Oktave kommt nur rein vor: dazu die große Septime und
// die reine Quinte und Quarte, wie in Stufe 1 bis 3 der Größe nach geordnet
const EXTRA_4 = { 4: intervalLabel(5, "vermindert"), 5: intervalLabel(4, "übermäßig") };
const OCTAVE_4 = [intervalLabel(4, "rein"), intervalLabel(5, "rein"), intervalLabel(7, "groß"), intervalLabel(8, "rein")];
export function perfectChoices(num) {
  if (num === 8) return OCTAVE_4.slice();
  return [...["vermindert", "rein", "übermäßig"].map((q) => intervalLabel(num, q)), EXTRA_4[num]];
}

/* ---------- Intervall-Aufgaben ---------- */

function numberQuestion(it, rnd) {
  const num = intervalNumber(it.low, it.high);
  const answer = INTERVAL_NAMES[num - 1];
  return {
    svg: intervalSvg(it),
    prompt: "Welches Intervall?",
    answer,
    display: `Intervall ${pairText(it)}: ${answer}`,
    reveal: `Richtig wäre: ${answer} (${pairText(it)}).`,
    choices: numberChoices(num, rnd),
    play: [it.low, it.high],
    low: it.low, high: it.high, clef: it.clef,
    statKey: `${answer} (${CLEF_SHORT[it.clef]})`,
  };
}

function qualityQuestion(it, choices) {
  const answer = intervalName(it.low, it.high);
  return {
    svg: intervalSvg(it),
    prompt: "Welches Intervall?",
    answer,
    display: `Intervall ${pairText(it)}: ${answer}`,
    reveal: `Richtig wäre: ${answer} (${pairText(it)}).`,
    choices,
    play: [it.low, it.high],
    low: it.low, high: it.high, clef: it.clef,
    statKey: answer,
  };
}

// Stufe 4: erst die Zahl, dann die Qualität gleich wahrscheinlich, damit „rein“ nicht überwiegt;
// Kombinationen ohne Aufgaben im Vorrat (verminderte, übermäßige Oktave) werden neu gezogen
function pickQuality(pool, prev, nums, quals) {
  for (let i = 0; i < 20; i++) {
    const num = nums[Math.floor(Math.random() * nums.length)], q = quals[Math.floor(Math.random() * quals.length)];
    const cand = pool.filter((it) => it.num === num && it.quality === q);
    if (cand.length) {
      const it = pickItem(cand, prev);
      if (!prev || pairKey(it) !== pairKey(prev)) return it;
    }
  }
  return pickItem(pool, prev);
}

/* ---------- Stufen 7 bis 12 (Paket „Intervalle 7–12“, Klasse 5–6) ---------- */

// Zwei Noten an beliebigen Stellen (Stufe 9: links die obere, rechts die untere)
const pairSvg = (clef, left, right, opts) => staffSvg(clef, noteSvg(left, clef, X_LOW, "", { value: NOTE_VALUE }) + noteSvg(right, clef, X_HIGH, "", { value: NOTE_VALUE }), opts);

// Stufe 7: nur Stammtöne und Fis, Cis, B, Es (beide Noten)
const STEP_ACC = new Set(["F1", "C1", "H-1", "E-1"]);
export const stepNote = (n) => n.acc === 0 || STEP_ACC.has(n.letter + n.acc);

export const STEP_WHOLE = "Ganztonschritt", STEP_HALF = "Halbtonschritt";
export const HALF_P_7 = 0.5;

// Alle Sekunden aufwärts (groß = Ganzton, klein = Halbton) mit erlaubten Vorzeichen im Bereich from…to
function stepPool7(clef, from, to) {
  const out = [];
  for (let d = dia(from); d <= dia(to); d++) for (const acc of [0, 1, -1]) {
    const low = fromDia(d, acc);
    if (!stepNote(low)) continue;
    for (const q of ["groß", "klein"]) {
      const high = upperNote(low, 2, q);
      if (high && stepNote(high) && dia(high) <= dia(to)) out.push({ clef, low, high, num: 2, quality: q, half: q === "klein" });
    }
  }
  return out;
}
export const POOL_7 = [...stepPool7("treble", ...TREBLE), ...stepPool7("bass", ...BASS)];

// Halbtöne mit Wahrscheinlichkeit 0,5 (sonst wären die Ganztöne in der Überzahl)
export function pickStep7(pool, prev, rnd = Math.random) {
  const half = rnd() < HALF_P_7;
  const cand = pool.filter((it) => it.half === half && (!prev || pairKey(it) !== pairKey(prev)));
  return cand.length ? cand[Math.floor(rnd() * cand.length)] : pickItem(pool, prev);
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function stepQuestion7(it) {
  const answer = it.half ? STEP_HALF : STEP_WHOLE, semi = intervalSemitones(it.low, it.high);
  const why = `${pairText(it)}: ${intervalLabel(2, it.quality)}, ${plural(semi, "Halbton", "Halbtöne")}`;
  return {
    svg: intervalSvg(it),
    prompt: "Ganzton oder Halbton?",
    answer,
    choices: [STEP_WHOLE, STEP_HALF],
    display: `${answer} (${why})`,
    reveal: `Richtig wäre: ${answer} (${why}).`,
    play: [it.low, it.high],
    low: it.low, high: it.high, clef: it.clef,
    // eigene Schlüssel, nicht dieselben wie tonleitern-1/2 („Halbton e–f“)
    statKey: `${it.half ? "Halbton" : "Ganzton"} ${gName(it.low).toLowerCase()}–${gName(it.high).toLowerCase()} (Sekunde)`,
  };
}

// Die elf Intervalle der Stufen 8 bis 12 (rein, groß, klein; Sekunde bis Oktave), der Größe nach
export const SIZE_ORDER = [[2, "klein"], [2, "groß"], [3, "klein"], [3, "groß"], [4, "rein"], [5, "rein"], [6, "klein"], [6, "groß"], [7, "klein"], [7, "groß"], [8, "rein"]]
  .map(([num, quality]) => ({ num, quality, name: intervalLabel(num, quality), semitones: semitonesFor(num, quality) }));
export const SIZE_NAMES = SIZE_ORDER.map((r) => r.name);
const NUMS_8 = [2, 3, 4, 5, 6, 7, 8], QUALS_8 = ["groß", "klein", "rein"];

// Vier Knöpfe: vier in der Größenfolge aufeinanderfolgende Namen mit der richtigen Antwort; der Anfang
// des Fensters ist unter allen möglichen gleich wahrscheinlich, damit die Antwort an jeder Stelle stehen kann
export function sizeChoices(name, rnd = Math.random) {
  const i = SIZE_NAMES.indexOf(name);
  const lo = Math.max(0, i - 3), hi = Math.min(i, SIZE_NAMES.length - 4);
  const start = lo + Math.floor(rnd() * (hi - lo + 1));
  return SIZE_NAMES.slice(start, start + 4);
}

export const POOL_8 = [...qualityPool("treble", ...TREBLE, NUMS_8, QUALS_8), ...qualityPool("bass", ...BASS, NUMS_8, QUALS_8)];
export const POOL_9 = qualityPool("treble", ...TREBLE, NUMS_8, QUALS_8);

// Erst das Intervall (eins der elf, gleich wahrscheinlich), dann die Aufgabe; nie dieselbe wie prev
function pickBySize(pool, prev, keyOf = pairKey) {
  for (let i = 0; i < 20; i++) {
    const r = SIZE_ORDER[Math.floor(Math.random() * SIZE_ORDER.length)];
    const cand = pool.filter((it) => it.num === r.num && it.quality === r.quality && (!prev || keyOf(it) !== keyOf(prev)));
    if (cand.length) return cand[Math.floor(Math.random() * cand.length)];
  }
  const cand = pool.filter((it) => !prev || keyOf(it) !== keyOf(prev));
  return cand[Math.floor(Math.random() * cand.length)];
}

// Die zwei Denkschritte als Text: „e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz“.
// a ist die zuerst genannte Note (bei abwärts die obere); Zahl und Qualität aus unterer/oberer Note.
// Kein Intervall der elf (vermindert, übermäßig): nur die Halbtonzahl, ohne Namen.
export function stepsText(a, b) {
  const [lo, hi] = dia(a) <= dia(b) ? [a, b] : [b, a];
  const num = intervalNumber(lo, hi), semi = intervalSemitones(lo, hi);
  const name = intervalName(lo, hi), half = plural(semi, "Halbton", "Halbtöne");
  // Nur rein, groß, klein werden benannt (Klasse 5–6); sonst bleibt es bei der Halbtonzahl (Stufe 12)
  return `${helm(a)}–${helm(b)}: ${num} Stufen → ${INTERVAL_NAMES[num - 1]} · ${SIZE_NAMES.includes(name) ? `${half} → ${name}` : half}`;
}

function sizeQuestion(it, down) {
  const answer = intervalName(it.low, it.high);
  const [first, second] = down ? [it.high, it.low] : [it.low, it.high];
  const steps = stepsText(first, second);
  return {
    svg: pairSvg(it.clef, first, second),
    prompt: down ? "Welches Intervall abwärts?" : "Welches Intervall?",
    answer,
    choices: sizeChoices(answer),
    display: steps,
    reveal: `Richtig wäre: ${answer} (${steps}).`,
    play: [first, second],
    low: it.low, high: it.high, clef: it.clef, down,
    statKey: down ? `${answer} abwärts` : answer,
  };
}

/* ---------- Stufe 10 und 11: Intervall bauen ---------- */

// Name unter der gebauten Note: unter dem tiefsten Punkt beider Noten (Kopf, Hilfslinie, ♯ reicht etwa
// 1,4 Linienabstände unter die Kopfmitte), Maße wie in „Tonleitern“ (18 Einheiten, grün)
export const LABEL_GAP = 6, LABEL_ASC = 13, LABEL_DESC = 6;
const yOfNote = (n, clef) => BOTTOM - staffPos(n, clef) * (S / 2);
export const lowestY = (notes, clef) => notes.reduce((m, n) => Math.max(m, yOfNote(n, clef) + (n.acc > 0 ? 1.4 * S : S / 2)), BOTTOM);
const labelY = (notes, clef) => Math.round(lowestY(notes, clef) + LABEL_GAP + LABEL_ASC);
// Höhe der Zeile mit Namen (mindestens die übliche Höhe H)
export const buildHeight = (it) => Math.max(H, labelY([it.given, it.built], it.clef) + LABEL_DESC);

// Frage: nur die gegebene Note (links). Gleiche Höhe wie die Auflösung, damit die Karte nicht springt.
export const buildSvg = (it) => staffSvg(it.clef, noteSvg(it.given, it.clef, X_LOW, "", { value: NOTE_VALUE }), { height: buildHeight(it) });
// Auflösung: beide Noten, die gebaute rechts in Grün mit ihrem Namen darunter
export function buildRevealSvg(it) {
  const y = labelY([it.given, it.built], it.clef);
  const inner = noteSvg(it.given, it.clef, X_LOW, "", { value: NOTE_VALUE }) + noteSvg(it.built, it.clef, X_HIGH, "ok", { value: NOTE_VALUE })
    + `<text class="note-label ok" x="${X_HIGH}" y="${y}" text-anchor="middle">${gName(it.built)}</text>`;
  return staffSvg(it.clef, inner, { height: buildHeight(it) });
}

// Alle Bauaufgaben: gegebene und gebaute Note mit üblichen Vorzeichen, beide in c'–a'' (Violinschlüssel).
// up: gebaute Note über der gegebenen (Stufe 10), sonst darunter (Stufe 11). Die reine Oktave bleibt drin.
function buildPool(up) {
  const [from, to] = TREBLE, out = [];
  for (const given of lowNotes(from, to)) for (const r of SIZE_ORDER) {
    const built = up ? upperNote(given, r.num, r.quality) : lowerNote(given, r.num, r.quality);
    if (!built || !usualNote(built) || dia(built) < dia(from) || dia(built) > dia(to)) continue;
    const [low, high] = up ? [given, built] : [built, given];
    out.push({ clef: "treble", given, built, low, high, num: r.num, quality: r.quality, up });
  }
  return out;
}
export const POOL_10 = buildPool(true);
export const POOL_11 = buildPool(false);
const buildKey = (it) => `${dia(it.given)}/${it.given.acc}:${it.num}${it.quality}`;

function buildQuestion(it) {
  const label = intervalLabel(it.num, it.quality), name = gName(it.built);
  const steps = stepsText(it.given, it.built);
  return {
    svg: buildSvg(it),
    revealSvg: buildRevealSvg(it),
    keepRow: true,
    prompt: `Baue eine ${label} ${it.up ? "über" : "unter"} ${helm(it.given)}.`,
    answer: { letter: it.built.letter, acc: it.built.acc },
    note: it.built,
    display: `${name} (${steps})`,
    reveal: `Richtig wäre: ${name} (${steps}).`,
    play: [it.given, it.built],
    given: it.given, built: it.built, low: it.low, high: it.high, num: it.num, quality: it.quality, up: it.up, clef: it.clef,
    key: buildKey(it),
    statKey: `${label}${it.up ? "" : " abwärts"} bauen`,
  };
}

// Bauen: Buchstabe und Vorzeichen müssen stimmen (gis ist nicht as), die Oktave wird nicht geprüft
export function checkBuild(q, value) {
  return !!value && typeof value === "object" && value.letter === q.answer.letter && value.acc === q.answer.acc;
}

/* ---------- Stufe 12: Fehler finden ---------- */

export const VERDICT_OK = "stimmt", VERDICT_NUM = "Zahl stimmt nicht (Stufen)", VERDICT_MORE = "ein Halbton zu viel", VERDICT_LESS = "ein Halbton zu wenig";
export const VERDICTS = [VERDICT_OK, VERDICT_NUM, VERDICT_MORE, VERDICT_LESS];
const isSizeName = (name) => SIZE_NAMES.includes(name);

// Zu jeder richtig gebauten Terz, Quinte … über einer Note (Violinschlüssel, aufwärts, c'–a''):
// stimmt (die richtige obere Note); Zahl (Nachbarbuchstabe, übliches Vorzeichen, das gezeigte Intervall ist
// selbst rein, groß oder klein); ein Halbton zu viel bzw. zu wenig (richtiger Buchstabe, Vorzeichen um
// eins verschoben, nur übliche Vorzeichen)
function checkPool() {
  const [from, to] = TREBLE, out = [];
  const inRange = (n) => usualNote(n) && dia(n) <= dia(to);
  for (const low of lowNotes(from, to)) for (const r of SIZE_ORDER) {
    const right = upperNote(low, r.num, r.quality);
    if (!right || !inRange(right)) continue;
    const base = { clef: "treble", low, right, num: r.num, quality: r.quality };
    out.push({ ...base, shown: right, verdict: VERDICT_OK });
    for (const d of [-1, 1]) for (const acc of [0, 1, -1]) {
      const shown = fromDia(dia(right) + d, acc);
      if (!inRange(shown) || dia(shown) <= dia(low) || !isSizeName(intervalName(low, shown))) continue;
      out.push({ ...base, shown, verdict: VERDICT_NUM });
    }
    for (const [d, verdict] of [[1, VERDICT_MORE], [-1, VERDICT_LESS]]) {
      const shown = N(right.letter, right.octave, right.acc + d);
      // Mindestens ein Halbton über der unteren Note (cis'–des' klänge gleich hoch)
      if (Math.abs(shown.acc) <= 1 && inRange(shown) && intervalSemitones(low, shown) > 0) out.push({ ...base, shown, verdict });
    }
  }
  // Keine Mischung aus ♯ und ♭ in einem Intervall (cis'–es', ges'–fis''): so schreibt in Kl. 5–6 niemand
  // (Sandra, 20.11.2026)
  return out.filter((it) => it.low.acc * it.shown.acc >= 0);
}
export const POOL_12 = checkPool();
const checkKey = (it) => `${dia(it.low)}/${it.low.acc}:${it.num}${it.quality}:${dia(it.shown)}/${it.shown.acc}`;

// Erst das Urteil (jedes gleich wahrscheinlich, also etwa ein Viertel „stimmt“), dann das Intervall, dann die Aufgabe
function pickCheck(pool, prev) {
  const verdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
  return pickBySize(pool.filter((it) => it.verdict === verdict), prev, checkKey);
}

function checkQuestion(it) {
  const label = intervalLabel(it.num, it.quality), semi = semitonesFor(it.num, it.quality);
  const steps = stepsText(it.low, it.shown);
  const wanted = `Verlangt: ${label} = ${it.num} Stufen, ${plural(semi, "Halbton", "Halbtöne")}, also ${helm(it.low)}–${helm(it.right)}`;
  const why = it.verdict === VERDICT_OK ? steps : `${steps}. ${wanted}`;
  return {
    svg: intervalSvg({ clef: it.clef, low: it.low, high: it.shown }),
    prompt: `Gebaut wurde: ${label} über ${helm(it.low)} → ${helm(it.low)}–${helm(it.shown)}. Stimmt das?`,
    answer: it.verdict,
    choices: VERDICTS.slice(),
    display: `„${it.verdict}“ – ${why}.`,
    reveal: `Richtig wäre: „${it.verdict}“ – ${why}.`,
    play: [it.low, it.shown],
    low: it.low, high: it.shown, shown: it.shown, right: it.right, num: it.num, quality: it.quality, verdict: it.verdict, clef: it.clef,
    key: checkKey(it),
    statKey: `${label} (Fehler)`,
  };
}

/* ---------- Tonarten ---------- */

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
export const POOL_5 = keyPool();
export const POOL_6 = keyPool();

const tonicPc = (f) => { const t = majorKeyFromKeySig(f); return pc(SEMI[t.letter] + t.acc); };

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

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
const find = (pool, low, high) => pool.find((it) => same(it.low, low) && same(it.high, high));

const levels = [
  {
    title: "Intervalle zählen im Violinschlüssel",
    subtitle: `Violinschlüssel · ${POOL_1.length} Intervalle`,
    hint: "Zähle beide Noten mit: von c' nach e' sind es drei Stufen (c, d, e), also eine Terz. Liegen beide Noten auf Linien oder beide in Zwischenräumen, ist die Zahl ungerade.",
    items: POOL_1,
    example: intervalSvg(find(POOL_1, N("C", 4), N("E", 4))),
    question(prev) { return numberQuestion(pickItem(POOL_1, prev)); },
  },
  {
    title: "Intervalle zählen im Bassschlüssel",
    subtitle: `Bassschlüssel · ${POOL_2.length} Intervalle`,
    hint: "Gleiches Prinzip im Bassschlüssel: Zähle die Stufen von der unteren bis zur oberen Note, beide mitgezählt.",
    items: POOL_2,
    example: intervalSvg(find(POOL_2, N("G", 2), N("D", 3))),
    question(prev) { return numberQuestion(pickItem(POOL_2, prev)); },
  },
  {
    title: "Groß oder klein",
    subtitle: `Sekunde, Terz, Sexte, Septime · ${POOL_3.length} Intervalle`,
    hint: "Erst die Zahl, dann die Halbtöne: kleine Sekunde 1, große Sekunde 2, kleine Terz 3, große Terz 4, kleine Sexte 8, große Sexte 9, kleine Septime 10, große Septime 11. Achte auf die Vorzeichen.",
    items: POOL_3,
    example: intervalSvg(find(POOL_3, N("C", 4), N("E", 4, -1))),
    question(prev) { const it = pickItem(POOL_3, prev); return qualityQuestion(it, minorMajorChoices(it.num)); },
  },
  {
    title: "Rein, vermindert, übermäßig",
    subtitle: `Quarte, Quinte, Oktave · ${POOL_4.length} Intervalle`,
    hint: "Reine Quarte 5 Halbtöne, reine Quinte 7, reine Oktave 12. Einen Halbton weniger heißt vermindert, einen mehr übermäßig. h–f' ist eine verminderte Quinte, f'–h' eine übermäßige Quarte, beide 6 Halbtöne.",
    items: POOL_4,
    example: intervalSvg(find(POOL_4, N("F", 4), N("H", 4))),
    question(prev) { const it = pickQuality(POOL_4, prev, [4, 5, 8], ["vermindert", "rein", "übermäßig"]); return qualityQuestion(it, perfectChoices(it.num)); },
  },
  {
    title: "Tonart aus den Vorzeichen",
    subtitle: "Violin- und Bassschlüssel · 15 Dur-Tonarten",
    hint: "Bei Kreuzen liegt der Grundton einen Halbton über dem letzten Kreuz (Fis → G-Dur). Bei Be-Vorzeichen ist das vorletzte Be der Grundton (B, Es → B-Dur); ein einzelnes Be steht für F-Dur.",
    items: POOL_5,
    example: keySvg({ clef: "treble", fifths: 3 }),
    question(prev) { return majorQuestion(pickKey(POOL_5, prev)); },
  },
  {
    title: "Parallele Molltonart",
    subtitle: "Violin- und Bassschlüssel · 15 Molltonarten",
    hint: "Die parallele Molltonart hat dieselben Vorzeichen. Ihr Grundton liegt eine kleine Terz unter dem Dur-Grundton: C-Dur → a-Moll, Es-Dur → c-Moll. Moll wird klein geschrieben.",
    items: POOL_6,
    example: keySvg({ clef: "bass", fifths: -3 }),
    question(prev) { return minorQuestion(pickKey(POOL_6, prev)); },
  },
  {
    title: "Ganzton oder Halbton?",
    subtitle: `Violin- und Bassschlüssel · ${POOL_7.length} Sekunden`,
    hint: "Ganztonschritt = große Sekunde = 2 Halbtöne, Halbtonschritt = kleine Sekunde = 1 Halbton. Ohne Vorzeichen liegt ein Halbton nur zwischen e und f und zwischen h und c. Vorzeichen verschieben das: e–fis ist ein Ganzton, fis–g ein Halbton.",
    requires: "intervalle-1",
    items: POOL_7,
    example: intervalSvg(find(POOL_7, N("E", 4), N("F", 4))),
    question(prev) { return stepQuestion7(pickStep7(POOL_7, prev)); },
  },
  {
    title: "Groß, klein, rein",
    subtitle: `Violin- und Bassschlüssel · ${SIZE_ORDER.length} Intervalle · ${POOL_8.length} Aufgaben`,
    hint: "Zwei Schritte: Zähle zuerst die Stufen, beide Noten mit – das ergibt die Zahl. Dann zähle die Halbtöne. Sekunde, Terz, Sexte und Septime sind groß oder klein (kleine Terz 3, große Terz 4 Halbtöne). Quarte, Quinte und Oktave heißen rein: reine Quarte 5, reine Quinte 7, reine Oktave 12 Halbtöne.",
    requires: "intervalle-7",
    items: POOL_8,
    example: intervalSvg(find(POOL_8, N("E", 4), N("G", 4))),
    question(prev) { return sizeQuestion(pickBySize(POOL_8, prev), false); },
  },
  {
    title: "Intervalle abwärts",
    subtitle: `Violinschlüssel · ${SIZE_ORDER.length} Intervalle · ${POOL_9.length} Aufgaben`,
    hint: "Jetzt steht die obere Note links, die untere rechts, und das Intervall klingt abwärts. Gezählt wird genauso: die Stufen (beide Noten mit), dann die Halbtöne. Der Name bleibt gleich: g'–e' abwärts ist eine kleine Terz.",
    requires: "intervalle-8",
    items: POOL_9,
    example: pairSvg("treble", N("G", 4), N("E", 4)),
    question(prev) { return sizeQuestion(pickBySize(POOL_9, prev), true); },
  },
  {
    title: "Intervall bauen",
    subtitle: `Violinschlüssel · aufwärts · ${POOL_10.length} Aufgaben`,
    hint: "Erst der Buchstabe: Zähle die Stufen ab der gegebenen Note, sie zählt mit – für eine Terz über e' also e, f, g. Dann die Halbtöne: Die große Terz hat 4, also Gis. Die Schreibweise zählt: Gis ist nicht As. Wähle den ganzen Namen oder tippe ihn ein.",
    input: "letters",
    acc: true,
    namesOnly: true,
    requires: "intervalle-9",
    items: POOL_10,
    example: buildSvg(POOL_10.find((it) => same(it.given, N("E", 4)) && it.num === 3 && it.quality === "groß")),
    question(prev) { return buildQuestion(pickBySize(POOL_10, prev, buildKey)); },
    check: checkBuild,
  },
  {
    title: "Intervall bauen abwärts",
    subtitle: `Violinschlüssel · abwärts · ${POOL_11.length} Aufgaben`,
    hint: "Wie beim Bauen aufwärts, nur nach unten: Zähle die Stufen ab der gegebenen Note abwärts, sie zählt mit – eine Terz unter g' ist g, f, e. Dann die Halbtöne: Die kleine Terz hat 3, e'–g' passt also. Die Schreibweise zählt.",
    input: "letters",
    acc: true,
    namesOnly: true,
    requires: "intervalle-10",
    items: POOL_11,
    example: buildSvg(POOL_11.find((it) => same(it.given, N("G", 4)) && it.num === 3 && it.quality === "klein")),
    question(prev) { return buildQuestion(pickBySize(POOL_11, prev, buildKey)); },
    check: checkBuild,
  },
  {
    title: "Fehler finden",
    subtitle: `Violinschlüssel · ${POOL_12.length} Aufgaben`,
    hint: "Jemand hat ein Intervall gebaut. Prüfe in zwei Schritten: Stimmt die Zahl? Zähle die Stufen. Stimmt sie, zähle die Halbtöne: einer zu viel, einer zu wenig oder genau richtig?",
    requires: "intervalle-11",
    items: POOL_12,
    example: intervalSvg({ clef: "treble", low: N("E", 4), high: N("G", 4) }),
    question(prev) { return checkQuestion(pickCheck(POOL_12, prev)); },
  },
].map((l, i) => ({ id: "intervalle-" + (i + 1), no: i + 1, input: "choices", check, ...l }));

/* ---------- Lerntafeln ---------- */

// Intervalle über c' (Violinschlüssel) bzw. c (Bassschlüssel), je Zeile höchstens drei Beispiele.
// Drei statt vier, damit das Vorzeichen der oberen Note nicht an den Kopf der unteren stößt. Ganze Noten:
// innerhalb eines Paars 44 Einheiten (bei 40 berührte das ♯ von fis' fast die Hilfslinie von c'), von Paar
// zu Paar 78, erstes Paar bei 78; so endet der letzte Kopf (278 + 10,3) vor dem Ende der Zeile (302).
const PAIR_DX = 44, PAIR_STEP = 78, PAIR_X0 = 78;
const TABLE = [
  [[1, "rein"], [2, "klein"], [2, "groß"]],
  [[3, "klein"], [3, "groß"], [4, "rein"]],
  [[4, "übermäßig"], [5, "vermindert"], [5, "rein"]],
  [[6, "klein"], [6, "groß"], [7, "klein"]],
  [[7, "groß"], [8, "rein"]],
];

// Obere Note über c (über c kommen nur Des Es Fis Ges As B als Vorzeichen vor)
function aboveC(c, num, quality) {
  const top = fromDia(dia(c) + num - 1);
  return N(top.letter, top.octave, midi(c) + semitonesFor(num, quality) - midi(top));
}

// Tabelle über die ganze Breite der Merkhilfen (ohne eigene Farben; .legend gestaltet nur div-Zeilen)
const TABLE_OPEN = `<table class="small" style="grid-column: 1 / -1; width: 100%; border-collapse: collapse; text-align: left">`;

export const LEARN_ROWS = TABLE.flat().map(([num, q]) => ({ num, quality: q, name: intervalLabel(num, q), semitones: semitonesFor(num, q) }));

// Die Überschrift setzt learn.js aus dem title der Tafel
function intervalBoard(clef) {
  const c = clef === "treble" ? N("C", 4) : N("C", 3);
  // Im Bassschlüssel hängt keine Note unter der Zeile (c liegt im zweiten Zwischenraum): Beschriftung 10 höher
  const ly = clef === "treble" ? 114 : 104;
  const staves = TABLE.map((row) => {
    let inner = "";
    row.forEach(([num, q], i) => {
      const x = PAIR_X0 + i * PAIR_STEP, high = aboveC(c, num, q);
      inner += noteSvg(c, clef, x, "", { value: NOTE_VALUE }) + noteSvg(high, clef, x + PAIR_DX, "", { value: NOTE_VALUE });
      // Beschriftung zweizeilig, damit lange Namen („übermäßige Quarte“) nicht ineinanderlaufen
      inner += `<text class="note-label" x="${x + PAIR_DX / 2}" y="${ly}" text-anchor="middle">${q === "groß" ? "große" : q + "e"}</text>`;
      inner += `<text class="note-label" x="${x + PAIR_DX / 2}" y="${ly + 12}" text-anchor="middle">${INTERVAL_NAMES[num - 1]}</text>`;
    });
    return staffSvg(clef, inner, { height: ly + 18 });
  }).join("");
  const rows = LEARN_ROWS.map((r) => `<tr><td>${r.name}</td><td class="num">${r.semitones}</td><td><b>${helm(c)}–${helm(aboveC(c, r.num, r.quality))}</b></td></tr>`).join("");
  return `<figure style="grid-column: 1 / -1; margin: 0">${staves}</figure>
    ${TABLE_OPEN}<thead><tr><th>Intervall</th><th>Halbtöne</th><th>Beispiel</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="small muted" style="grid-column: 1 / -1">Die Zahl ergibt sich aus den Stufen (beide Noten mitgezählt), die Qualität aus den Halbtönen. Übermäßige Quarte und verminderte Quinte klingen gleich (6 Halbtöne), werden aber verschieden geschrieben.</p>`;
}

// Lerntafel „So bestimmst du ein Intervall“ (ohne Schlüssel): zwei Schritte, Beispiel e'–g' mit Klammer,
// Tabelle der elf Intervalle (Beispiele über c'), Hinweis zur Schreibweise beim Bauen
function howBoard() {
  const e = N("E", 4), f = N("F", 4), g = N("G", 4);
  const xe = 105, xf = 180, xg = 255, y0 = BOTTOM + 8, y1 = y0 + 6;
  const inner = noteSvg(e, "treble", xe, "", { value: NOTE_VALUE }) + noteSvg(f, "treble", xf, "ghost", { value: NOTE_VALUE })
    + noteSvg(g, "treble", xg, "", { value: NOTE_VALUE })
    + `<path class="bracket" d="M${xe - 10} ${y0}V${y1}H${xg + 10}V${y0}"/>`
    + `<text class="note-label" x="${xe}" y="${y1 + 14}" text-anchor="middle">1</text>`
    + `<text class="note-label" x="${xf}" y="${y1 + 14}" text-anchor="middle">2</text>`
    + `<text class="note-label" x="${xg}" y="${y1 + 14}" text-anchor="middle">3</text>`
    + `<text class="note-label" x="${(xe + xf) / 2}" y="22" text-anchor="middle">Halbton</text>`
    + `<text class="note-label" x="${(xf + xg) / 2}" y="22" text-anchor="middle">Ganzton</text>`;
  const svg = staffSvg("treble", inner, { height: y1 + 22 });
  const c = N("C", 4);
  const rows = SIZE_ORDER.map((r) => `<tr><td>${r.name}</td><td class="num">${r.semitones}</td><td><b>${helm(c)}–${helm(aboveC(c, r.num, r.quality))}</b></td></tr>`).join("");
  return `<ol class="small" style="grid-column: 1 / -1; margin: 0; padding-left: 1.2em">
      <li><b>Stufen zählen</b>, beide Noten mit → die Zahl (Sekunde, Terz, Quarte …).</li>
      <li><b>Halbtöne zählen</b> → groß oder klein (Sekunde, Terz, Sexte, Septime) bzw. rein (Quarte, Quinte, Oktave).</li>
    </ol>
    <figure style="grid-column: 1 / -1; margin: 0">${svg}</figure>
    <p class="small muted" style="grid-column: 1 / -1">Beispiel e'–g': e, f, g sind 3 Stufen → Terz. Von e nach f ist ein Halbton, von f nach g ein Ganzton, zusammen 3 Halbtöne → kleine Terz.</p>
    ${TABLE_OPEN}<thead><tr><th>Intervall</th><th>Halbtöne</th><th>Beispiel</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="small muted" style="grid-column: 1 / -1">Fis ist nicht Ges – beim Bauen zählt der Buchstabe. Die große Terz über d' ist fis' (d, e, f: 3 Stufen). Ges' klingt gleich, aber d, e, f, g wären 4 Stufen.</p>`;
}

function circleBoard() {
  const order = [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7];
  const rows = order.map((f) => `<tr><td>${sigText(f)}</td><td><b>${majorName(f)}</b></td><td><b>${minorName(f)}</b></td></tr>`).join("");
  return `<p class="small muted" style="grid-column: 1 / -1">Vorzeichen, Dur-Tonart und parallele Molltonart. Jedes weitere ♯ führt eine Quinte höher, jedes weitere ♭ eine Quinte tiefer.</p>
    ${TABLE_OPEN}<thead><tr><th>Vorzeichen</th><th>Dur</th><th>parallele Molltonart</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export default {
  id: "intervalle",
  title: "Intervalle und Tonarten",
  subtitle: "Intervalle bestimmen, Vorzeichen lesen",
  grade: "Klasse 5–9",
  levels,
  learn: [
    { title: "So bestimmst du ein Intervall", render() { return howBoard(); } },
    { title: "Intervalle über c'", clef: "treble", render() { return intervalBoard("treble"); } },
    { title: "Intervalle über c", clef: "bass", render() { return intervalBoard("bass"); } },
    { title: "Quintenzirkel", render() { return circleBoard(); } },
  ],
  blitz: null,
};

// Für Tests: Qualität und Zahl einer Aufgabe unabhängig von den Texten
export const describe = (q) => ({ num: intervalNumber(q.low, q.high), semi: intervalSemitones(q.low, q.high), quality: intervalQuality(q.low, q.high) });
