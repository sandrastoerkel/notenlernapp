// Paket „Intervalle und Tonarten“: sechs Stufen (Klasse 7 bis 9) und zwei Lerntafeln.
// Intervallzahl aus dem diatonischen Abstand, Qualität aus der Halbtonzahl (src/music.js).
import {
  N, dia, fromDia, midi, pc, SEMI, same, helm,
  INTERVAL_NAMES, intervalNumber, intervalSemitones, intervalQuality, intervalLabel, intervalName, semitonesFor,
  majorKeyFromKeySig, majorName, minorName,
} from "../music.js";
import { staffSvg, noteSvg } from "../staff.js";

const CLEF_SHORT = { treble: "Violin", bass: "Bass" };
// Zwei Viertelnoten nebeneinander, 60 Einheiten (5 Linienabstände) Abstand: das Vorzeichen vor der
// zweiten Note hat genug Luft zum ersten Kopf. Ganze Noten wären übersichtlicher, aber noteSvg setzt das
// Vorzeichen für die Breite eines schwarzen Kopfes; vor dem breiteren ganzen Kopf (1,7 LA) stößt es an
// ([OFFEN] für Paket F: Vorzeichenabstand in staff.js je Kopfbreite, dann NOTE_VALUE = 1).
export const X_LOW = 145, X_HIGH = 205, NOTE_VALUE = 4;

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
export const POOL_4 = qualityPool("treble", ...TREBLE, [4, 5, 8], ["vermindert", "rein", "übermäßig"]);

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

// Stufe 4: die drei Qualitäten der Zahl und das gleich klingende Nachbarintervall
// (übermäßige Quarte ↔ verminderte Quinte, verminderte Oktave ↔ große Septime)
const EXTRA_4 = { 4: intervalLabel(5, "vermindert"), 5: intervalLabel(4, "übermäßig"), 8: intervalLabel(7, "groß") };
export function perfectChoices(num) {
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
    choices,
    play: [it.low, it.high],
    low: it.low, high: it.high, clef: it.clef,
    statKey: answer,
  };
}

// Stufe 4: erst die Zahl, dann die Qualität gleich wahrscheinlich, damit „rein“ nicht überwiegt
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

/* ---------- Tonarten ---------- */

export const FIFTHS = Array.from({ length: 15 }, (_, i) => i - 7);
export const sigText = (f) => (f === 0 ? "keine Vorzeichen" : `${Math.abs(f)} ${f > 0 ? "♯" : "♭"}`);
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
// Gleich klingende Tonarten (Fis-Dur/Ges-Dur) sind keine Ablenker. Dur: namer = majorName, Moll: minorName.
export function keyChoices(fifths, namer) {
  const ok = (f) => f >= -7 && f <= 7 && (f === fifths || tonicPc(f) !== tonicPc(fifths));
  const picks = [fifths];
  for (const f of [fifths - 1, fifths + 1, -fifths, fifths - 2, fifths + 2, fifths - 3, fifths + 3]) {
    if (picks.length >= 4) break;
    if (ok(f) && !picks.includes(f)) picks.push(f);
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
    hint: "Bei Kreuzen liegt der Grundton einen Halbton über dem letzten Kreuz (Fis → G-Dur). Bei Be ist das vorletzte B der Grundton (B, Es → B-Dur); ein einzelnes B heißt F-Dur.",
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
].map((l, i) => ({ id: "intervalle-" + (i + 1), no: i + 1, input: "choices", check, ...l }));

/* ---------- Lerntafeln ---------- */

// Intervalle über c' (Violinschlüssel) bzw. c (Bassschlüssel), je Zeile höchstens drei Beispiele.
// Drei statt vier, damit das Vorzeichen der oberen Note nicht an den Kopf der unteren stößt.
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
  const staves = TABLE.map((row) => {
    let inner = "";
    row.forEach(([num, q], i) => {
      const x = 90 + i * 82, high = aboveC(c, num, q);
      inner += noteSvg(c, clef, x, "", { value: NOTE_VALUE }) + noteSvg(high, clef, x + 40, "", { value: NOTE_VALUE });
      // Beschriftung zweizeilig, damit lange Namen („übermäßige Quarte“) nicht ineinanderlaufen
      inner += `<text class="note-label" x="${x + 20}" y="114" text-anchor="middle">${q === "groß" ? "große" : q + "e"}</text>`;
      inner += `<text class="note-label" x="${x + 20}" y="126" text-anchor="middle">${INTERVAL_NAMES[num - 1]}</text>`;
    });
    return staffSvg(clef, inner, { height: 132 });
  }).join("");
  const rows = LEARN_ROWS.map((r) => `<tr><td>${r.name}</td><td class="num">${r.semitones}</td><td><b>${helm(c)}–${helm(aboveC(c, r.num, r.quality))}</b></td></tr>`).join("");
  return `<figure style="grid-column: 1 / -1; margin: 0">${staves}</figure>
    ${TABLE_OPEN}<thead><tr><th>Intervall</th><th>Halbtöne</th><th>Beispiel</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="small muted" style="grid-column: 1 / -1">Die Zahl ergibt sich aus den Stufen (beide Noten mitgezählt), die Qualität aus den Halbtönen. Übermäßige Quarte und verminderte Quinte klingen gleich (6 Halbtöne), werden aber verschieden geschrieben.</p>`;
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
  grade: "Klasse 7–9",
  levels,
  learn: [
    { title: "Intervalle über c'", clef: "treble", render() { return intervalBoard("treble"); } },
    { title: "Intervalle über c", clef: "bass", render() { return intervalBoard("bass"); } },
    { title: "Quintenzirkel", render() { return circleBoard(); } },
  ],
  blitz: null,
};

// Für Tests: Qualität und Zahl einer Aufgabe unabhängig von den Texten
export const describe = (q) => ({ num: intervalNumber(q.low, q.high), semi: intervalSemitones(q.low, q.high), quality: intervalQuality(q.low, q.high) });
