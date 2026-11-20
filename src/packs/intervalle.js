// Paket „Intervalle“: zehn Stufen und drei Lerntafeln (neu seit 20.11.2026, docs/PLAN.md, Welle 7).
// Unterrichtsweg (Sandra): erst mit Hilfen (Klaviatur und Tabelle zum Aufklappen), dann ohne. Immer zuerst
// das Rahmenintervall (die Zahl aus den Notenstufen), dann die Feinbestimmung (die Qualität aus den
// Halbtönen). Vermindert und übermäßig gehören dazu (musisches Gymnasium), Jahrgangsstufen stehen an keiner Stufe.
// Stufen: 1–2 Rahmenintervall, 3–6 zweischrittig (rein/klein/groß, dann mit vermindert/übermäßig),
// 7 abwärts, 8–9 bauen, 10 Fehler finden. Freischaltung der Reihe nach.
// Die Tonarten-Stufen (bis 20.11.2026 intervalle-5 und -6) stehen jetzt im Paket „Tonleitern“ (7 und 8).
// Intervallzahl aus dem diatonischen Abstand, Qualität aus der Halbtonzahl (src/music.js).
import {
  N, dia, fromDia, midi, same, helm, gName, staffPos, lowerNote,
  INTERVAL_NAMES, intervalNumber, intervalSemitones, intervalQuality, intervalLabel, intervalName, semitonesFor, isPerfectNumber,
} from "../music.js";
import { staffSvg, noteSvg, pianoSvg, BOTTOM, S, H } from "../staff.js";
import { tileTable } from "../grid.js";
import { demoHtml, mountDemo } from "../demo.js";

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
// Zwei Noten an beliebigen Stellen (abwärts: links die obere, rechts die untere)
const pairSvg = (clef, left, right, opts) => staffSvg(clef, noteSvg(left, clef, X_LOW, "", { value: NOTE_VALUE }) + noteSvg(right, clef, X_HIGH, "", { value: NOTE_VALUE }), opts);
const pairText = (a, b) => `${helm(a)}–${helm(b)}`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ---------- Erlaubte Intervalle (Sandra, 20.11.2026) ---------- */

// Qualitäten in der Reihenfolge der Größe (für Knöpfe und Tabellen)
export const QUALITY_ORDER = ["vermindert", "klein", "rein", "groß", "übermäßig"];
const type = ([num, quality]) => ({ num, quality, name: intervalLabel(num, quality), semitones: semitonesFor(num, quality) });

// Rein, klein, groß von der Prime bis zur Oktave (Stufen 3 und 4): zwölf Intervalle
export const TYPES_RKG = [[1, "rein"], [2, "klein"], [2, "groß"], [3, "klein"], [3, "groß"], [4, "rein"], [5, "rein"],
  [6, "klein"], [6, "groß"], [7, "klein"], [7, "groß"], [8, "rein"]].map(type);
// Dazu übermäßige Prime und Sekunde, verminderte und übermäßige Quarte und Quinte, verminderte Septime
// (ab Stufe 5): 19 Intervalle. Nicht dabei: verminderte Sekunde (klingt wie die Prime), verminderte und
// übermäßige Terz und Sexte, übermäßige Septime, verminderte Prime und Oktave, übermäßige Oktave.
export const TYPES_ALL = [[1, "rein"], [1, "übermäßig"], [2, "klein"], [2, "groß"], [2, "übermäßig"], [3, "klein"], [3, "groß"],
  [4, "vermindert"], [4, "rein"], [4, "übermäßig"], [5, "vermindert"], [5, "rein"], [5, "übermäßig"],
  [6, "klein"], [6, "groß"], [7, "vermindert"], [7, "klein"], [7, "groß"], [8, "rein"]].map(type);
export const ALLOWED_NAMES = TYPES_ALL.map((t) => t.name);
// Abwärts und beim Bauen ohne Prime (eine Prime abwärts oder „über“ einer Note zu bauen ergibt wenig Sinn)
export const TYPES_NO_PRIME = TYPES_ALL.filter((t) => t.num > 1);

// Knöpfe im zweiten Schritt: die zur Zahl passenden Intervalle aus types, der Größe nach
export const qualityChoices = (num, types) => types.filter((t) => t.num === num)
  .sort((a, b) => QUALITY_ORDER.indexOf(a.quality) - QUALITY_ORDER.indexOf(b.quality)).map((t) => t.name);

/* ---------- Vorrat ---------- */

const TREBLE = [N("C", 4), N("A", 5)], BASS = [N("E", 2), N("C", 4)];
const RANGE = { treble: TREBLE, bass: BASS };

// Stufe 1 und 2: alle Paare aus Stammtönen von Prime bis Oktave im Bereich from…to
function numberPool(clef, from, to) {
  const out = [];
  for (let d = dia(from); d <= dia(to); d++) {
    for (let k = 0; k <= 7 && d + k <= dia(to); k++) out.push({ clef, low: fromDia(d), high: fromDia(d + k), num: k + 1 });
  }
  return out;
}

// Untere Töne mit üblichen Vorzeichen im Bereich from…to
function lowNotes(from, to) {
  const out = [];
  for (let d = dia(from); d <= dia(to); d++) for (const acc of [0, 1, -1]) { const n = fromDia(d, acc); if (usualNote(n)) out.push(n); }
  return out;
}

// Alle gültig geschriebenen Intervalle aus types (aufwärts), beide Noten im Bereich des Schlüssels.
// ♯ und ♭ dürfen gemischt vorkommen (es'–fis' ist eine übermäßige Sekunde); nur „Fehler finden“ schließt das aus.
function qualityPool(clef, types) {
  const [from, to] = RANGE[clef], out = [];
  for (const low of lowNotes(from, to)) for (const t of types) {
    const high = upperNote(low, t.num, t.quality);
    if (high && dia(high) <= dia(to)) out.push({ clef, low, high, num: t.num, quality: t.quality });
  }
  return out;
}
const bothClefs = (types) => [...qualityPool("treble", types), ...qualityPool("bass", types)];

export const POOL_1 = numberPool("treble", ...TREBLE);
export const POOL_2 = [...POOL_1, ...numberPool("bass", ...BASS)];
export const POOL_3 = qualityPool("treble", TYPES_RKG);
export const POOL_4 = bothClefs(TYPES_RKG);
export const POOL_5 = qualityPool("treble", TYPES_ALL);
export const POOL_6 = bothClefs(TYPES_ALL);
export const POOL_7 = qualityPool("treble", TYPES_NO_PRIME);

// Erst die Zahl (Stufe 1 und 2) bzw. das Intervall (ab Stufe 3) gleich wahrscheinlich, dann die Aufgabe;
// nie dieselbe wie prev. Ohne passende Aufgabe wird neu gezogen.
// Prime (rein und übermäßig) selten: Gewicht PRIME_WEIGHT statt 1 und höchstens einmal pro Runde
// (Sandra, 20.11.2026: „es wird ständig die reine Prime gestellt“). round: bisherige Aufgaben der Runde.
export const PRIME_WEIGHT = 0.25;
const isPrime = (q) => !!q && (q.num === 1 || (q.low && q.high && intervalNumber(q.low, q.high) === 1));
function pickBy(pool, prev, groupOf, keyOf = pairKey, round = []) {
  const primeDone = round.some(isPrime);
  const usable = primeDone ? pool.filter((it) => it.num !== 1) : pool;
  if (usable.length) pool = usable;
  const groups = [...new Set(pool.map(groupOf))];
  const weightOf = (g) => (pool.find((it) => groupOf(it) === g).num === 1 ? PRIME_WEIGHT : 1);
  const total = groups.reduce((sum, g) => sum + weightOf(g), 0);
  const drawGroup = () => {
    let r = Math.random() * total;
    for (const g of groups) { r -= weightOf(g); if (r < 0) return g; }
    return groups[groups.length - 1];
  };
  for (let i = 0; i < 20; i++) {
    const g = drawGroup();
    const cand = pool.filter((it) => groupOf(it) === g && (!prev || keyOf(it) !== keyOf(prev)));
    if (cand.length) return cand[Math.floor(Math.random() * cand.length)];
  }
  const cand = pool.filter((it) => !prev || keyOf(it) !== keyOf(prev));
  return cand[Math.floor(Math.random() * cand.length)];
}
const roundOf = (ctx) => (ctx && ctx.round) || [];
const byNum = (it) => it.num;
const byType = (it) => `${it.num}${it.quality}`;

/* ---------- Texte der Denkschritte ---------- */

// Der erste Denkschritt als Text: „e'–g': 3 Stufen → Terz“ (a ist die zuerst genannte Note)
export function frameText(a, b) {
  const [lo, hi] = dia(a) <= dia(b) ? [a, b] : [b, a];
  const num = intervalNumber(lo, hi);
  return `${pairText(a, b)}: ${plural(num, "Stufe", "Stufen")} → ${INTERVAL_NAMES[num - 1]}`;
}

// Beide Denkschritte: „e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz“. Benannt werden nur die
// erlaubten Intervalle (ALLOWED_NAMES); sonst bleibt es bei der Halbtonzahl (z. B. in „Fehler finden“).
export function stepsText(a, b) {
  const [lo, hi] = dia(a) <= dia(b) ? [a, b] : [b, a];
  const semi = intervalSemitones(lo, hi), name = intervalName(lo, hi), half = plural(semi, "Halbton", "Halbtöne");
  return `${frameText(a, b)} · ${ALLOWED_NAMES.includes(name) ? `${half} → ${name}` : half}`;
}

/* ---------- Stufe 1 und 2: Intervall bestimmen (nur die Zahl; „Rahmenintervall“ heißt sie erst ab Stufe 3,
   wo sie von der Feinbestimmung unterschieden wird – Sandra, 20.11.2026) ---------- */

// Acht Knöpfe Prime … Oktave in zwei Reihen zu vier; Ziffern 1 bis 8 auf der Tastatur
const NUMBER_SET = { choices: INTERVAL_NAMES, cols: 4, digits: true };

function numberQuestion(it) {
  const num = intervalNumber(it.low, it.high), answer = INTERVAL_NAMES[num - 1], frame = frameText(it.low, it.high);
  return {
    svg: intervalSvg(it),
    prompt: "Welches Intervall?",
    answer,
    choices: NUMBER_SET.choices.slice(), cols: NUMBER_SET.cols, digits: true,
    display: frame,
    reveal: `Richtig wäre: ${answer} (${frame}).`,
    play: [it.low, it.high],
    low: it.low, high: it.high, clef: it.clef,
    helpMarks: [it.low, it.high],
    statKey: `${answer} (${CLEF_SHORT[it.clef]})`,
  };
}

/* ---------- Stufe 3 bis 7: zwei Schritte ---------- */

// Schritt 1: Rahmenintervall (acht Knöpfe). Schritt 2: die zur richtigen Zahl passenden Intervalle aus
// types, auch wenn Schritt 1 daneben lag (Sandra, 20.11.2026); die Aufgabe zählt dann als daneben.
// Gibt es zur Zahl nur ein Intervall (Prime, Quarte, Quinte, Oktave in Stufe 3 und 4, sonst die Oktave),
// bleibt der zweite Schritt als Bestätigung: Der Text nennt die Halbtonzahl zum Nachzählen, der eine Knopf
// bestätigt. So bleibt der Ablauf „erst Rahmen, dann fein“ in jeder Aufgabe gleich. Ohne q.partial, weil
// es im zweiten Schritt nichts zu entscheiden gab (nach falscher Zahl gilt q.reveal).
export const finePrompt = (frame, numName, fine, semi) => (fine.length > 1
  ? `${frame}. Welche ${numName}? Zähle die Halbtöne.`
  : `${frame}. Die ${numName} ist hier rein: ${plural(semi, "Halbton", "Halbtöne")}. Zähle nach.`);
export function twoStepQuestion(it, types, down = false) {
  const [first, second] = down ? [it.high, it.low] : [it.low, it.high];
  const num = intervalNumber(it.low, it.high), numName = INTERVAL_NAMES[num - 1];
  const answer = intervalName(it.low, it.high), frame = frameText(first, second), steps = stepsText(first, second);
  const fine = qualityChoices(num, types);
  return {
    svg: pairSvg(it.clef, first, second),
    prompt: down ? "Abwärts: Welches Rahmenintervall?" : "Welches Rahmenintervall?",
    answer,
    choices: fine,
    steps: [
      { ...NUMBER_SET, choices: NUMBER_SET.choices.slice(), answer: numName, ok: `Richtig: ${frame}.`, bad: `Nicht ganz: ${frame}.` },
      { choices: fine, cols: fine.length, answer, prompt: finePrompt(frame, numName, fine, intervalSemitones(it.low, it.high)) },
    ],
    display: steps,
    reveal: `Richtig wäre: ${answer} (${steps}).`,
    ...(fine.length > 1 ? { partial: `Die Halbtöne stimmen, die Zahl nicht: ${steps}.` } : {}),
    play: [first, second],
    low: it.low, high: it.high, clef: it.clef, down, num, quality: it.quality,
    helpMarks: [it.low, it.high],
    statKey: down ? `${answer} abwärts` : answer,
  };
}

/* ---------- Stufe 8 und 9: Intervall bauen ---------- */

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
// up: gebaute Note über der gegebenen, sonst darunter. Intervalle: alle erlaubten außer der Prime.
function buildPool(up) {
  const [from, to] = TREBLE, out = [];
  for (const given of lowNotes(from, to)) for (const r of TYPES_NO_PRIME) {
    const built = up ? upperNote(given, r.num, r.quality) : lowerNote(given, r.num, r.quality);
    if (!built || !usualNote(built) || dia(built) < dia(from) || dia(built) > dia(to)) continue;
    const [low, high] = up ? [given, built] : [built, given];
    out.push({ clef: "treble", given, built, low, high, num: r.num, quality: r.quality, up });
  }
  return out;
}
export const BUILD_UP = buildPool(true);
export const BUILD_DOWN = buildPool(false);
export const POOL_8 = BUILD_UP;
export const POOL_9 = [...BUILD_UP, ...BUILD_DOWN];
const buildKey = (it) => `${dia(it.given)}/${it.given.acc}:${it.num}${it.quality}:${it.up}`;

// Stufe 9: Richtung gleich wahrscheinlich, dann das Intervall, dann die Aufgabe
function pickBuild9(prev, round = []) {
  const up = Math.random() < 0.5;
  return pickBy(up ? BUILD_UP : BUILD_DOWN, prev, byType, buildKey, round);
}

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
    // Hilfe: nur die gegebene Note ist auf der Klaviatur markiert
    helpMarks: [it.given],
    key: buildKey(it),
    statKey: `${label}${it.up ? "" : " abwärts"} bauen`,
  };
}

// Bauen: Buchstabe und Vorzeichen müssen stimmen (gis ist nicht as), die Oktave wird nicht geprüft
export function checkBuild(q, value) {
  return !!value && typeof value === "object" && value.letter === q.answer.letter && value.acc === q.answer.acc;
}

/* ---------- Stufe 10: Fehler finden ---------- */

// Verlangt werden alle erlaubten Intervalle außer der Prime (17): rein, klein, groß und seit 20.11.2026
// (Sandra) auch übermäßige Sekunde, verminderte und übermäßige Quarte und Quinte, verminderte Septime.
// Jedes Urteil bleibt eindeutig: anderer Buchstabe → „Zahl stimmt nicht“, gleicher Buchstabe und genau
// ein Halbton mehr bzw. weniger → „ein Halbton zu viel/zu wenig“, sonst „stimmt“.
// Die Rückmeldung benennt das gezeigte Intervall, wenn es erlaubt ist (stepsText).
export const CHECK_TYPES = TYPES_NO_PRIME;
export const CHECK_NAMES = CHECK_TYPES.map((t) => t.name);
// Bei „Zahl stimmt nicht“ ist das gezeigte Intervall selbst rein, groß oder klein (Sekunde bis Oktave)
export const SIZE_ORDER = TYPES_RKG.filter((t) => t.num > 1);
export const SIZE_NAMES = SIZE_ORDER.map((r) => r.name);

export const VERDICT_OK = "stimmt", VERDICT_NUM = "Zahl stimmt nicht (Stufen)", VERDICT_MORE = "ein Halbton zu viel", VERDICT_LESS = "ein Halbton zu wenig";
export const VERDICTS = [VERDICT_OK, VERDICT_NUM, VERDICT_MORE, VERDICT_LESS];
const isSizeName = (name) => SIZE_NAMES.includes(name);

// Zu jedem richtig gebauten Intervall aus CHECK_TYPES über einer Note (Violinschlüssel, aufwärts, c'–a''):
// stimmt (die richtige obere Note); Zahl (Nachbarbuchstabe, übliches Vorzeichen, das gezeigte Intervall ist
// selbst rein, groß oder klein); ein Halbton zu viel bzw. zu wenig (richtiger Buchstabe, Vorzeichen um
// eins verschoben, nur übliche Vorzeichen)
function checkPool() {
  const [from, to] = TREBLE, out = [];
  const inRange = (n) => usualNote(n) && dia(n) <= dia(to);
  for (const low of lowNotes(from, to)) for (const r of CHECK_TYPES) {
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
      // Mindestens ein Halbton über der unteren Note (cis'–des' klänge gleich hoch), keine Doppelvorzeichen
      if (Math.abs(shown.acc) <= 1 && inRange(shown) && dia(shown) > dia(low) && intervalSemitones(low, shown) > 0) out.push({ ...base, shown, verdict });
    }
  }
  // Keine Mischung aus ♯ und ♭ in einem Intervall (cis'–es', ges'–fis''), nur in dieser Stufe (Sandra, 20.11.2026)
  return out.filter((it) => it.low.acc * it.shown.acc >= 0);
}
export const POOL_10 = checkPool();
const checkKey = (it) => `${dia(it.low)}/${it.low.acc}:${it.num}${it.quality}:${dia(it.shown)}/${it.shown.acc}`;

// Erst das Urteil (jedes gleich wahrscheinlich, also etwa ein Viertel „stimmt“), dann das Intervall, dann die Aufgabe
function pickCheck(pool, prev, round = []) {
  const verdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
  return pickBy(pool.filter((it) => it.verdict === verdict), prev, byType, checkKey, round);
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

/* ---------- Übersicht: Rahmenintervall → Halbtöne (Kästchentabelle aus src/grid.js) ---------- */

const HELPS = ["klaviatur", "tabelle"];
export const HELP_TEXT = "Die Zahl kommt aus den Notenstufen, die Klaviatur brauchst du nur für die Halbtöne.";
// Stufe 1 (nur Stammtöne): die Zahl aus den Notenstufen; auf der Klaviatur sind das die weißen Tasten
export const HELP_TEXT_1 = "Die Zahl kommt aus den Notenstufen: Zähle beide Noten mit. Bei Stammtönen sind das auf der Klaviatur die weißen Tasten.";

// Spalten der Tabelle: zwei Familien – rein (Prime, Quarte, Quinte, Oktave, grau hinterlegt) und klein/groß
export const TABLE_COLS = ["klein", "rein", "groß"];
export const TABLE_NOTE_LESS = "vermindert = 1 Halbton weniger", TABLE_NOTE_MORE = "übermäßig = 1 Halbton mehr";
// Name der Zeile: Zahl und Name, z. B. „3 Terz“ (bricht nicht um, css/style.css .tt-label)
export const rowLabel = (num) => `<b class="num">${num}</b> ${INTERVAL_NAMES[num - 1]}`;
// Bezug für vermindert/übermäßig: rein bei Prime, Quarte, Quinte, Oktave; sonst klein (vermindert) bzw. groß (übermäßig)
export const baseQuality = (num, quality) => (quality === "übermäßig" ? (isPerfectNumber(num) ? "rein" : "groß")
  : quality === "vermindert" ? (isPerfectNumber(num) ? "rein" : "klein") : quality);

// Tabelle je Stufe. kind: "rahmen" (Stufe 1: nur die Rahmenintervalle, die Zahl sind die Notenstufen),
// "rkg" (Stufe 3: klein | rein | groß), "all" (Stufe 5 und 8, Vorführung, Lerntafel: dazu die Zeile
// „vermindert = 1 Halbton weniger · übermäßig = 1 Halbton mehr“). Halbtonzahlen aus semitonesFor.
// row: Zahl, deren Zeile violett leuchtet (Schritt 1); hit: { num, quality } – Treffer grün (Schritt 2), bei
// vermindert/übermäßig das Bezugs-Kästchen grün umrandet und der passende Teil der Zeile darunter grün;
// split: zwei Hälften nebeneinander (Hilfen, damit die Antwortknöpfe nah bleiben)
export function intervalTable(kind = "all", { row = null, hit = null, split = false } = {}) {
  const ref = hit ? baseQuality(hit.num, hit.quality) : null;
  const delta = hit && ref !== hit.quality ? hit.quality : null;
  const rows = INTERVAL_NAMES.map((_, i) => {
    const num = i + 1;
    const cells = kind === "rahmen" ? [] : TABLE_COLS.map((q) => {
      const semi = semitonesFor(num, q);
      if (semi === null) return null;
      return { text: semi, state: hit && hit.num === num && q === ref ? (delta ? "ref" : "hit") : undefined };
    });
    return { label: rowLabel(num), cells, hi: row === num };
  });
  const rahmen = kind === "rahmen";
  const table = tileTable({
    head: rahmen ? ["Stufen = Intervall"] : ["Rahmen", ...TABLE_COLS],
    rows, family: rahmen ? [] : [TABLE_COLS.indexOf("rein")], split, cls: rahmen ? "tt-rahmen" : "",
  });
  const on = (q) => (delta === q ? " on" : "");
  const note = kind === "all"
    ? `<p class="tt-note small"><span class="tt-less${on("vermindert")}">${TABLE_NOTE_LESS}</span> · <span class="tt-more${on("übermäßig")}">${TABLE_NOTE_MORE}</span></p>`
    : "";
  return `<div class="tt-wrap">${table}${note}</div>`;
}

/* ---------- Vorführung „So bestimmst du ein Intervall“ (src/demo.js) ---------- */

// Schritt-Marken (Farben: Schritt 1 violett, Schritt 2 grün)
export const DEMO_STEPS = ["1 · Rahmen: Stufen zählen", "2 · Fein: Halbtöne zählen"];
// Stufe 1 (nur die Zahl): ohne den Hilfsbegriff „Rahmen“
export const DEMO_STEP_ONLY = "Stufen zählen";
// Beispiele der Lerntafel: kleine Terz, große Terz, große Terz mit ♯, übermäßige Quarte, reine Quinte
export const DEMO_EXAMPLES = [[N("E", 4), N("G", 4)], [N("C", 4), N("E", 4)], [N("D", 4), N("F", 4, 1)], [N("F", 4), N("H", 4)], [N("D", 4), N("A", 4)]];

// Notenzeile der Vorführung: alle Stufen nebeneinander, höchstens 50 Einheiten Abstand, mittig zwischen
// 88 und 290 (der letzte Kopf endet vor dem Ende der Linien). Trägt die obere Note ein Vorzeichen, rückt sie 14 weiter (das ♯ stößt sonst an die Stufe davor).
// Prime: beide Noten wie in der Aufgabe (X_LOW, X_HIGH).
const DEMO_X0 = 88, DEMO_X1 = 290, DEMO_DX = 50, DEMO_ACC_GAP = 14;
const r1 = (v) => Math.round(v * 10) / 10;
export function demoXs(num, high) {
  if (num <= 1) return [X_LOW, X_HIGH];
  const extra = high.acc ? DEMO_ACC_GAP : 0;
  const dx = Math.min(DEMO_DX, (DEMO_X1 - DEMO_X0 - extra) / (num - 1));
  const span = dx * (num - 1) + extra, x0 = Math.max(DEMO_X0, (DEMO_X0 + DEMO_X1) / 2 - span / 2);
  return Array.from({ length: num }, (_, i) => r1(x0 + i * dx + (i === num - 1 ? extra : 0)));
}
// Zahlenkreise unter der Zeile: unter dem tiefsten Punkt beider Noten; Klammer darunter
const NUM_R = 8, NUM_GAP = 6, BRACKET_H = 6;
export const numY = (low, high, clef) => Math.round(lowestY([low, high], clef) + NUM_GAP + NUM_R);
const demoHeight = (low, high, clef) => numY(low, high, clef) + NUM_R + 4 + BRACKET_H + 4;
// Note der Stufe k (1 = untere Note, num = obere Note, dazwischen Stammtöne)
const stepNote = (low, high, k, num) => (k === 1 ? low : k === num ? high : fromDia(dia(low) + k - 1));
const numSvg = (x, y, k) => `<g class="dm-num"><circle cx="${x}" cy="${y}" r="${NUM_R}"/><text x="${x}" y="${y + 4}" text-anchor="middle">${k}</text></g>`;

// Notenzeile mit k gezählten Stufen (Zwischenstufen als hohle violette Köpfe, Kreise 1 … k), bracket: Klammer
export function demoStaffSvg(low, high, clef, k, bracket) {
  const num = intervalNumber(low, high), xs = demoXs(num, high), y = numY(low, high, clef);
  let inner = noteSvg(low, clef, xs[0], "", { value: NOTE_VALUE }) + noteSvg(high, clef, xs[xs.length - 1], "", { value: NOTE_VALUE });
  for (let s = 2; s <= Math.min(k, num - 1); s++) inner += noteSvg(stepNote(low, high, s, num), clef, xs[s - 1], "step1", { value: NOTE_VALUE });
  if (num <= 1) { if (k >= 1) inner += numSvg((xs[0] + xs[1]) / 2, y, 1); } else for (let s = 1; s <= k; s++) inner += numSvg(xs[s - 1], y, s);
  if (bracket) {
    const by = y + NUM_R + 4;
    inner += `<path class="dm-bracket" d="M${r1(xs[0] - 12)} ${by}V${by + BRACKET_H}H${r1(xs[xs.length - 1] + 12)}V${by}"/>`;
  }
  return staffSvg(clef, inner, { height: demoHeight(low, high, clef) });
}

// Klaviatur der Vorführung (wie die Hilfe-Klaviatur, nur zum Anschauen): ab dem C unter der unteren Note,
// eine Oktave, wenn sie reicht, sonst zwei (größere Tasten auf schmalen Bildschirmen). Beide Töne markiert,
// die ersten j Halbtöne über der unteren Note grün mit ihrer Zahl. active: false im ersten Schritt (blass).
export function demoKeysSvg(low, high, j, active) {
  const from = 12 * Math.floor(midi(low) / 12), octaves = midi(high) <= from + 12 ? 1 : 2;
  const counts = Array.from({ length: j }, (_, t) => [midi(low) + t + 1, t + 1]);
  return `<div class="demo-keys${active ? "" : " dim"}">${pianoSvg({ from, octaves, marks: [midi(low), midi(high)], counts, interactive: false })}</div>`;
}

// Ton zu einer MIDI-Nummer (nur für den Klang beim Zählen der Halbtöne, die Schreibweise spielt keine Rolle)
const pitchNote = (m) => N("C", Math.floor(m / 12) - 1, m % 12);

// Satz zum letzten Halbton: „3 Halbtöne → kleine Terz“; vermindert/übermäßig über den Bezug:
// „6 Halbtöne = rein 5 + 1 → übermäßige Quarte“, „9 Halbtöne = klein 10 − 1 → verminderte Septime“
export function fineText(low, high) {
  const num = intervalNumber(low, high), semi = intervalSemitones(low, high), q = intervalQuality(low, high);
  const half = plural(semi, "Halbton", "Halbtöne"), name = intervalName(low, high);
  if (!q) return half;
  const base = baseQuality(num, q);
  if (base === q) return `${half} → ${name}`;
  return `${half} = ${base} ${semitonesFor(num, base)} ${q === "übermäßig" ? "+" : "−"} 1 → ${name}`;
}

// Bilder der Vorführung für das Intervall low–high (aufwärts). opts: clef, table (Art der Tabelle, siehe
// intervalTable), fine (false: nur der erste Schritt, für Stufe 1). Bilder: 1 Frage + num Stufen
// + semi Halbtöne (bei der Prime ein Bild „0 Halbtöne“) + 1 Ergebnis; ohne fine 1 + num + 1.
export function intervalDemo(low, high, { clef = "treble", table = "all", fine = true } = {}) {
  const num = intervalNumber(low, high), semi = intervalSemitones(low, high), pair = pairText(low, high);
  const numName = INTERVAL_NAMES[num - 1], name = fine ? intervalName(low, high) || numName : numName;
  const quality = intervalQuality(low, high);
  const body = (k, bracket, j, keys, hit) => `<div class="demo-staff">${demoStaffSvg(low, high, clef, k, bracket)}</div>`
    + `<div class="demo-pair">${fine ? demoKeysSvg(low, high, j, keys) : ""}<div class="demo-table">${intervalTable(table, { row: bracket ? num : null, hit })}</div></div>`;
  const frames = [{
    step: 0, kind: "frage", n: 0, tones: [low, high], body: body(0, false, 0, false, null),
    text: `Welches Intervall ist ${pair}? Erst die Stufen zählen, beide Noten mit.`,
  }];
  for (let k = 1; k <= num; k++) {
    const lastStep = k === num, n = stepNote(low, high, k, num);
    const text = lastStep
      ? `${plural(num, "Stufe", "Stufen")} = ${numName}.${fine ? " Jetzt die Halbtöne auf der Klaviatur." : ""}`
      : `${helm(n)} ist Stufe ${k}.`;
    frames.push({ step: 1, kind: "stufe", n: k, tones: [n], text, body: body(k, lastStep, 0, false, null) });
  }
  const hit = quality ? { num, quality } : null;
  if (fine) {
    const count = Math.max(1, semi);
    for (let j = 1; j <= count; j++) {
      const lastSemi = j === count;
      const text = semi === 0 ? `0 Halbtöne, dieselbe Taste → ${name}`
        : lastSemi ? fineText(low, high)
        : j === 1 ? `Ab ${helm(low)} jede Taste zählen, auch die schwarzen: 1 Halbton.`
        : `${plural(j, "Halbton", "Halbtöne")}.`;
      frames.push({ step: 2, kind: "halbton", n: semi ? j : 0, tones: [semi ? pitchNote(midi(low) + j) : high], text, body: body(num, true, semi ? j : 0, true, lastSemi ? hit : null) });
    }
  }
  const chips = [{ step: 1, text: plural(num, "Stufe", "Stufen") }];
  if (fine) chips.push({ step: 2, text: plural(semi, "Halbton", "Halbtöne") });
  frames.push({
    step: fine ? 3 : 2, kind: "ergebnis", n: 0, tones: [low, high], result: { title: `${pair} = ${name}`, chips },
    body: body(num, true, fine ? semi : 0, fine, fine ? hit : null),
  });
  return { steps: fine ? DEMO_STEPS.slice() : [DEMO_STEP_ONLY], frames };
}

/* ---------- Stufen ---------- */

const check = (q, value) => value === q.answer;
const find = (pool, low, high) => pool.find((it) => same(it.low, low) && same(it.high, high));
// Hilfen: Text, Klaviatur, Tabelle (zwei Hälften) und die Vorführung der aktuellen Aufgabe (erst nach der Antwort)
const withHelps = (kind, text = HELP_TEXT) => ({
  helps: HELPS, helpText: text, helpTable: intervalTable(kind, { split: true }),
  demo: (q) => intervalDemo(q.low, q.high, { clef: q.clef, table: kind, fine: kind !== "rahmen" }),
});

const levels = [
  {
    title: "Intervall bestimmen",
    subtitle: `Violinschlüssel · mit Hilfen · ${POOL_1.length} Intervalle`,
    hint: "Zähle die Notenstufen von der unteren zur oberen Note, beide mitgezählt: c'–e' sind c, d, e, also 3 Stufen → Terz. Klaviatur und Tabelle findest du unter „Hilfen“.",
    items: POOL_1,
    example: intervalSvg(find(POOL_1, N("C", 4), N("E", 4))),
    question(prev, ctx) { return numberQuestion(pickBy(POOL_1, prev, byNum, pairKey, roundOf(ctx))); },
    digits: true,
    ...withHelps("rahmen", HELP_TEXT_1),
  },
  {
    title: "Intervall bestimmen ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · ${POOL_2.length} Intervalle`,
    hint: "Wie in Stufe 1, jetzt ohne Hilfen und auch im Bassschlüssel. Liegen beide Noten auf Linien oder beide in Zwischenräumen, ist die Zahl ungerade.",
    items: POOL_2,
    example: intervalSvg(find(POOL_2, N("G", 2), N("D", 3))),
    question(prev, ctx) { return numberQuestion(pickBy(POOL_2, prev, (it) => `${it.clef}${it.num}`, pairKey, roundOf(ctx))); },
    digits: true,
  },
  {
    title: "Rein, klein, groß",
    subtitle: `Violinschlüssel · zwei Schritte · mit Hilfen · ${POOL_3.length} Aufgaben`,
    hint: "Zwei Schritte: Erst das Rahmenintervall aus den Notenstufen, dann die Halbtöne. Prime, Quarte, Quinte und Oktave sind hier rein, Sekunde, Terz, Sexte und Septime klein oder groß.",
    items: POOL_3,
    example: intervalSvg(find(POOL_3, N("E", 4), N("G", 4))),
    question(prev, ctx) { return twoStepQuestion(pickBy(POOL_3, prev, byType, pairKey, roundOf(ctx)), TYPES_RKG); },
    digits: true,
    ...withHelps("rkg"),
  },
  {
    title: "Rein, klein, groß ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · zwei Schritte · ${POOL_4.length} Aufgaben`,
    hint: "Dasselbe ohne Hilfen, im Violin- und Bassschlüssel. Kleine Terz 3, große Terz 4, reine Quarte 5, reine Quinte 7, reine Oktave 12 Halbtöne.",
    items: POOL_4,
    example: intervalSvg(find(POOL_4, N("A", 2), N("C", 3))),
    question(prev, ctx) { return twoStepQuestion(pickBy(POOL_4, prev, byType, pairKey, roundOf(ctx)), TYPES_RKG); },
    digits: true,
  },
  {
    title: "Vermindert und übermäßig",
    subtitle: `Violinschlüssel · zwei Schritte · mit Hilfen · ${POOL_5.length} Aufgaben`,
    hint: "Ein Halbton weniger als rein oder klein heißt vermindert, einer mehr als rein oder groß übermäßig. f'–h' ist eine übermäßige Quarte, h'–f'' eine verminderte Quinte, beide 6 Halbtöne: Erst die Zahl sagt, welches es ist.",
    items: POOL_5,
    example: intervalSvg(find(POOL_5, N("F", 4), N("H", 4))),
    question(prev, ctx) { return twoStepQuestion(pickBy(POOL_5, prev, byType, pairKey, roundOf(ctx)), TYPES_ALL); },
    digits: true,
    ...withHelps("all"),
  },
  {
    title: "Vermindert und übermäßig ohne Hilfen",
    subtitle: `Violin- und Bassschlüssel · zwei Schritte · ${POOL_6.length} Aufgaben`,
    hint: "Dasselbe ohne Hilfen, im Violin- und Bassschlüssel. Die Zahl bestimmst du immer zuerst, sie kommt nur aus den Notenstufen.",
    items: POOL_6,
    example: intervalSvg(find(POOL_6, N("E", 3, -1), N("F", 3, 1))),
    question(prev, ctx) { return twoStepQuestion(pickBy(POOL_6, prev, byType, pairKey, roundOf(ctx)), TYPES_ALL); },
    digits: true,
  },
  {
    title: "Intervalle abwärts",
    subtitle: `Violinschlüssel · zwei Schritte · ${POOL_7.length} Aufgaben`,
    hint: "Die obere Note steht links und klingt zuerst. Gezählt wird genauso: erst die Notenstufen, dann die Halbtöne. g'–e' abwärts ist eine kleine Terz.",
    items: POOL_7,
    example: pairSvg("treble", N("G", 4), N("E", 4)),
    question(prev, ctx) { return twoStepQuestion(pickBy(POOL_7, prev, byType, pairKey, roundOf(ctx)), TYPES_ALL, true); },
    digits: true,
  },
  {
    title: "Intervall bauen",
    subtitle: `Violinschlüssel · aufwärts · mit Hilfen · ${POOL_8.length} Aufgaben`,
    hint: "Erst der Buchstabe: Zähle ab der gegebenen Note die Stufen, sie zählt mit – für eine Terz über e' also e, f, g. Dann die Halbtöne: Die große Terz hat 4, also gis'. Die Schreibweise zählt: Gis ist nicht As. Wähle den ganzen Namen oder tippe ihn ein.",
    input: "letters",
    acc: true,
    namesOnly: true,
    items: POOL_8,
    example: buildSvg(POOL_8.find((it) => same(it.given, N("E", 4)) && it.num === 3 && it.quality === "groß")),
    question(prev, ctx) { return buildQuestion(pickBy(POOL_8, prev, byType, buildKey, roundOf(ctx))); },
    check: checkBuild,
    ...withHelps("all"),
  },
  {
    title: "Intervall bauen auf- und abwärts",
    subtitle: `Violinschlüssel · ohne Hilfen · ${POOL_9.length} Aufgaben`,
    hint: "Auf- und abwärts gemischt, ohne Hilfen. Lies genau, ob über oder unter der Note gebaut wird: Eine kleine Terz unter g' ist e' (g, f, e und 3 Halbtöne).",
    input: "letters",
    acc: true,
    namesOnly: true,
    items: POOL_9,
    example: buildSvg(BUILD_DOWN.find((it) => same(it.given, N("G", 4)) && it.num === 3 && it.quality === "klein")),
    question(prev, ctx) { return buildQuestion(pickBuild9(prev, roundOf(ctx))); },
    check: checkBuild,
  },
  {
    title: "Fehler finden",
    subtitle: `Violinschlüssel · ${POOL_10.length} Aufgaben`,
    hint: "Jemand hat ein Intervall gebaut, auch verminderte und übermäßige. Prüfe in zwei Schritten: Stimmt die Zahl? Zähle die Notenstufen. Stimmt sie, zähle die Halbtöne: einer zu viel, einer zu wenig oder genau richtig?",
    items: POOL_10,
    example: intervalSvg({ clef: "treble", low: N("E", 4), high: N("G", 4) }),
    question(prev, ctx) { return checkQuestion(pickCheck(POOL_10, prev, roundOf(ctx))); },
  },
].map((l, i) => ({ id: "intervall-" + (i + 1), no: i + 1, input: "choices", check, ...l }));

/* ---------- Lerntafeln ---------- */

// Intervalle über c' (Violinschlüssel) bzw. c (Bassschlüssel), je Zeile höchstens drei Beispiele.
// Drei statt vier, damit das Vorzeichen der oberen Note nicht an den Kopf der unteren stößt. Ganze Noten:
// innerhalb eines Paars 44 Einheiten (bei 40 berührte das ♯ von fis' fast die Hilfslinie von c'), von Paar
// zu Paar 78, erstes Paar bei 78; so endet der letzte Kopf (278 + 10,3) vor dem Ende der Zeile (302).
// Verminderte Quarte (c–fes) und verminderte Septime (c–heses) fehlen: über c bräuchten sie Fes bzw. ein Doppel-Be.
// Steht ein ♯ vor der oberen Note einer Prime oder Sekunde (c'–cis', c'–dis'), liegt es auf Höhe des
// unteren Kopfs und berührte bei 44 beide Köpfe: Das Paar wird 8 breiter, die untere Note rückt 6 nach
// links, die obere 2 nach rechts (nach rechts weniger, damit die Hilfslinien zum nächsten Paar Abstand halten).
const PAIR_DX = 44, PAIR_STEP = 78, PAIR_X0 = 78;
export const pairExtra = (num, high) => (num <= 2 && high.acc > 0 ? { left: 6, right: 2 } : { left: 0, right: 0 });
const TABLE = [
  [[1, "rein"], [1, "übermäßig"], [2, "klein"]],
  [[2, "groß"], [2, "übermäßig"], [3, "klein"]],
  [[3, "groß"], [4, "rein"], [4, "übermäßig"]],
  [[5, "vermindert"], [5, "rein"], [5, "übermäßig"]],
  [[6, "klein"], [6, "groß"], [7, "klein"]],
  [[7, "groß"], [8, "rein"]],
];

// Obere Note über c (über c kommen nur Cis Des Dis Es Fis Ges Gis As B als Vorzeichen vor)
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
  // (Violinschlüssel 118: das ♯ vor cis' und dis' reicht unter die Hilfslinie und stieß bei 114 an die Schrift)
  const ly = clef === "treble" ? 118 : 104;
  const staves = TABLE.map((row) => {
    let inner = "";
    row.forEach(([num, q], i) => {
      const x = PAIR_X0 + i * PAIR_STEP, high = aboveC(c, num, q), wide = pairExtra(num, high);
      inner += noteSvg(c, clef, x - wide.left, "", { value: NOTE_VALUE }) + noteSvg(high, clef, x + PAIR_DX + wide.right, "", { value: NOTE_VALUE });
      // Beschriftung zweizeilig, damit lange Namen („übermäßige Quarte“) nicht ineinanderlaufen
      inner += `<text class="note-label" x="${x + PAIR_DX / 2}" y="${ly}" text-anchor="middle">${q === "groß" ? "große" : q + "e"}</text>`;
      inner += `<text class="note-label" x="${x + PAIR_DX / 2}" y="${ly + 12}" text-anchor="middle">${INTERVAL_NAMES[num - 1]}</text>`;
    });
    return staffSvg(clef, inner, { height: ly + 18 });
  }).join("");
  const rows = LEARN_ROWS.map((r) => `<tr><td>${r.name}</td><td class="num">${r.semitones}</td><td><b>${helm(c)}–${helm(aboveC(c, r.num, r.quality))}</b></td></tr>`).join("");
  return `<figure style="grid-column: 1 / -1; margin: 0">${staves}</figure>
    ${TABLE_OPEN}<thead><tr><th>Intervall</th><th>Halbtöne</th><th>Beispiel</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="small muted" style="grid-column: 1 / -1">Die Zahl ergibt sich aus den Notenstufen (beide Noten mitgezählt), die Qualität aus den Halbtönen. Übermäßige Quarte und verminderte Quinte klingen gleich (6 Halbtöne), werden aber verschieden geschrieben. Verminderte Quarte und verminderte Septime kommen über anderen Tönen vor, z. B. cis'–f' und cis'–b'.</p>`;
}

// Lerntafel „So bestimmst du ein Intervall“ (ohne Schlüssel): die Vorführung mit fünf Beispielen,
// darunter die Hinweise zur Zahl und zur Schreibweise beim Bauen. mountBoard verdrahtet die Knöpfe (learn.js).
export function demoBoard() {
  const picks = DEMO_EXAMPLES.map(([a, b], i) => `<button class="btn${i ? "" : " on"}" data-ex="${i}" aria-pressed="${!i}">${pairText(a, b)}</button>`).join("");
  return `<div class="demo-board" data-demo-board>
    <p class="small">Erst das Rahmenintervall (die Zahl aus den Notenstufen), dann die Feinbestimmung (die Halbtöne). Wähle ein Beispiel, dann „Weiter ›“ oder „Abspielen“.</p>
    <div class="row demo-pick" role="group" aria-label="Beispiel">${picks}</div>
    <div class="demo" data-demo-root>${demoHtml(intervalDemo(...DEMO_EXAMPLES[0]), 0)}</div>
    <p class="small">${HELP_TEXT} Übermäßige Quarte (f'–h') und verminderte Quinte (h'–f'') haben beide 6 Halbtöne.</p>
    <p class="small muted">Fis ist nicht Ges – beim Bauen zählt der Buchstabe. Die große Terz über d' ist fis' (d, e, f: 3 Stufen). Ges' klingt gleich, aber d, e, f, g wären 4 Stufen.</p>
  </div>`;
}

export function mountBoard(container) {
  const board = container.querySelector("[data-demo-board]");
  if (!board) return;
  const root = board.querySelector("[data-demo-root]");
  let h = mountDemo(root, intervalDemo(...DEMO_EXAMPLES[0]));
  board.querySelector(".demo-pick").onclick = (e) => {
    const b = e.target.closest("[data-ex]");
    if (!b) return;
    h.stop();
    board.querySelectorAll("[data-ex]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    h = mountDemo(root, intervalDemo(...DEMO_EXAMPLES[+b.dataset.ex]));
  };
}

export default {
  id: "intervalle",
  title: "Intervalle",
  subtitle: "Rahmenintervall und Feinbestimmung, bauen, Fehler finden",
  grade: "Klasse 5–9",
  levels,
  learn: [
    { title: "So bestimmst du ein Intervall", render() { return demoBoard(); }, mount: mountBoard },
    { title: "Intervalle über c'", clef: "treble", render() { return intervalBoard("treble"); } },
    { title: "Intervalle über c", clef: "bass", render() { return intervalBoard("bass"); } },
  ],
  blitz: null,
};

// Für Tests: Qualität und Zahl einer Aufgabe unabhängig von den Texten
export const describe = (q) => ({ num: intervalNumber(q.low, q.high), semi: intervalSemitones(q.low, q.high), quality: intervalQuality(q.low, q.high) });
