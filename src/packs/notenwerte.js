// Paket „Notenwerte und Pausen“ (seit Welle 9 „Notenwerte gehirngerecht“, docs/PLAN.md): zehn Stufen, erst mit
// Hilfen, dann ohne (Klasse 5/6). Die zwei Denkschritte (Schritt 1 violett, Schritt 2 grün): Notenwert = Kopf,
// dann Hals und Fähnchen; Dauer = Notenwert, dann Schläge; Takt füllen = Zählen, dann Wert wählen.
// Alle Noten stehen auf dem h' im Violinschlüssel (Mittellinie, Hals nach unten), damit nur der Wert zählt.
import { N, VALUES, beats, beatsText, beatsLabel, valueName, staffPos } from "../music.js";
import { staffSvg, noteSvg, restSvg, glyphSvg, S, TOP, BOTTOM, X1 } from "../staff.js";

const CLEF = "treble";
export const PITCH = N("H", 4);
const MID = TOP + 2 * S;
const r2 = (v) => Math.round(v * 100) / 100;

/* ---------- Zeichnen ---------- */

/* Maße gegen Verovio 6.4.1 mit Bravura gemessen (12 px pro Linienabstand, LA), Leipzig zur Kontrolle:
   - Punkt: Durchmesser 0,4 LA (Bravura augmentationDot), linke Kante 0,30 LA rechts vom Kopf
     (Kopf 1,18 breit → Punktmitte 0,59 + 0,30 + 0,20 = 1,09 LA rechts der Kopfmitte). Liegt der Kopf
     auf einer Linie, steht der Punkt im Zwischenraum darüber, sonst auf Höhe des Kopfes.
   - Taktangabe: jede Ziffer genau zwei Zwischenräume hoch (obere Ziffer von der obersten bis zur
     Mittellinie, untere von der Mittellinie bis zur untersten Linie), 1,0 LA hinter dem Schlüssel;
     der erste Notenkopf 1,5 LA hinter der Taktangabe.
   - Taktstrich: 0,15 LA stark (Verovio barLineWidth), über die ganze Höhe der Zeile.
   - Abstände im Takt wie bei Verovio: Abstand = c · Dauer^0,6 (gemessen: Achtel 0,65, punktierte Viertel
     1,28, halbe 1,52 einer Viertel), Pausen beginnen dort, wo der Notenkopf beginnen würde. */
export const DOT = { r: 2.4, dx: 13.1 };
// Notenkopf: halbe Breite (Bravura 1,18 LA) bzw. bei der ganzen Note 1,7 LA
const HEAD_HALF = { 1: 10.2, 2: 7.1, 4: 7.1, 8: 7.1, 16: 7.1 };

// Punkt hinter einer Note an der Kopfmitte x
export function dotSvg(n, x) {
  const p = staffPos(n, CLEF), cy = BOTTOM - p * (S / 2);
  const y = p % 2 === 0 ? cy - S / 2 : cy;
  return `<circle class="notehead aug" cx="${r2(x + DOT.dx)}" cy="${y}" r="${DOT.r}"/>`;
}

// Ziffern der Taktangabe: Noto Music, Ziffernhöhe 718/1000 em → 2 LA = 24 px bei 33,4 px Schriftgröße;
// linke Kante der „4“ bei 21/1000 em, Breite 531/1000 em (17,7 px = 1,48 LA; Bravura 1,72, Leipzig 1,54).
export const TIME = { size: 33.4, left: 21 / 1000, width: 531 / 1000, x: 67.3 };
export function timeSigSvg(top = 4, bottom = 4) {
  const x = r2(TIME.x - TIME.left * TIME.size);
  const digit = (d, y) => glyphSvg(String(d), x, y, TIME.size).replace("<text ", `<text font-weight="700" `);
  return `<g class="timesig">${digit(top, MID)}${digit(bottom, BOTTOM)}</g>`;
}
// Rechte Kante der Taktangabe; der erste Kopf beginnt 1,5 LA dahinter
const CONTENT_X = TIME.x + TIME.width * TIME.size + 1.5 * S;

export const barlineSvg = (x = X1) => `<line class="staff-line barline" x1="${x}" x2="${x}" y1="${TOP}" y2="${BOTTOM}" style="stroke-width:1.8"/>`;

// Ein Element: { v: 1|2|4|8|16, dot: bool, rest: bool }
export const beatsOf = (el) => beats(el.v, el.dot);
export const nameOf = (el) => valueName(el.v, el.rest, el.dot);

// Ink-Mitte der Pausen relativ zu x in restSvg (Noto Music bei 48 px bzw. Balken)
const REST_CX = { 1: 18.8, 2: 18.8, 4: 8.6, 8: 8.9, 16: 10.3 };
// Linke Kante der Pause relativ zu x in restSvg
const REST_LEFT = { 1: 11.8, 2: 11.8, 4: 2.4, 8: 2.4, 16: 2.4 };

// Element mittig an x (Einzelanzeige in den Stufen 1 bis 7)
export function elementAt(el, x) {
  if (el.rest) return restSvg(el.v, r2(x - REST_CX[el.v]));
  return noteSvg(PITCH, CLEF, x, "", { value: el.v }) + (el.dot ? dotSvg(PITCH, x) : "");
}

// Element, dessen linke Kante bei left liegt (im Takt)
function elementFrom(el, left) {
  if (el.rest) return restSvg(el.v, r2(left - REST_LEFT[el.v]));
  return elementAt(el, r2(left + HEAD_HALF[el.v]));
}

// Lücke: gestrichelter Kasten mit Fragezeichen, Farben über die Tokens
function gapSvg(left) {
  const x = r2(left - 5), w = 26;
  return `<g class="gap"><rect x="${x}" y="${TOP - 10}" width="${w}" height="${4 * S + 20}" rx="5" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.5;stroke-dasharray:4 3"/>`
    + `<text x="${r2(x + w / 2)}" y="${MID + 7}" text-anchor="middle" style="fill:var(--accent);font-family:var(--display);font-weight:700;font-size:20px">?</text></g>`;
}

// Abstände im Takt (wie Verovio): c · Dauer^0,6; die Lücke bekommt immer den Platz einer Viertel,
// damit ihre Breite nichts über den fehlenden Wert verrät.
export function layoutBar(els, gap = -1) {
  const w = els.map((el, i) => Math.pow(i === gap ? 1 : beatsOf(el), 0.6));
  const c = (X1 - CONTENT_X) / w.reduce((a, b) => a + b, 0);
  let left = CONTENT_X;
  return w.map((wi) => { const l = r2(left); left += c * wi; return l; });
}

// Ganzer 4/4-Takt mit Taktangabe und Taktstrich; gap = Index der Lücke (oder -1).
// filled = true zeichnet statt des Kastens den fehlenden Wert in die Lücke (Auflösung nach der Antwort);
// die Abstände bleiben wie in der Aufgabe, damit nichts verrutscht.
export function barSvg(els, gap = -1, filled = false) {
  const xs = layoutBar(els, gap);
  const at = (el, i) => (i !== gap ? elementFrom(el, xs[i]) : filled ? `<g class="filled">${elementFrom(el, xs[i])}</g>` : gapSvg(xs[i]));
  const inner = timeSigSvg() + els.map(at).join("") + barlineSvg();
  return staffSvg(CLEF, inner);
}

// Einzelnes Element in der Zeile, wahlweise mit Taktangabe
const singleSvg = (el, time) => staffSvg(CLEF, (time ? timeSigSvg() : "") + elementAt(el, 170));

/* ---------- Aufgaben ---------- */

const el = (v, dot = false, rest = false) => ({ v, dot, rest });
const NOTES = VALUES.map((v) => el(v));
const RESTS = VALUES.map((v) => el(v, false, true));

// Feedback: display nach richtiger Antwort („Richtig! Viertelnote (1 Schlag)“), reveal als ganzer Satz
// nach falscher Antwort. Alle Begriffe sind weiblich (die Note, die Pause), daher „eine“.
// Zahl und „Schlag“ bleiben in einer Zeile (geschütztes Leerzeichen)
const beatsNb = (e) => beatsLabel(beatsOf(e)).replace(" ", "\u00a0");
// Nach „Richtig!“ beginnt ein neuer Satz, daher groß: „Richtig! Ganze Note (4 Schläge)“.
const withBeats = (e) => `${nameOf(e)} (${beatsNb(e)})`;
export const displayOf = (e) => { const t = withBeats(e); return t[0].toUpperCase() + t.slice(1); };
// Stufen 2, 3 und 7 (Name gefragt): „Das war eine Viertelnote (1 Schlag).“
export const revealName = (e) => `Das war eine ${withBeats(e)}.`;
// Stufen 5 und 7 (Dauer gefragt): „Richtig wäre: 1½ Schläge, denn das ist eine punktierte Viertelnote.“
export const revealBeats = (e) => `Richtig wäre: ${beatsNb(e)}, denn das ist eine ${nameOf(e)}.`;
// Stufe 9: „Richtig wäre eine Viertelnote, denn es fehlt noch 1 Schlag.“ / „… es fehlen noch 2 Schläge.“
export const revealFill = (e) => `Richtig wäre eine ${nameOf(e)}, denn es ${beatsOf(e) > 1 ? "fehlen" : "fehlt"} noch ${beatsNb(e)}.`;
const keyOf = (e) => `${e.rest ? "r" : "n"}${e.v}${e.dot ? "." : ""}`;

// Zufällig aus dem Vorrat, nie dieselbe Aufgabe (key) wie prev
export function pick(items, prev) {
  const cand = prev ? items.filter((it) => it.key !== prev.key) : items;
  const list = cand.length ? cand : items;
  return list[Math.floor(Math.random() * list.length)];
}

const NOTE_NAMES = NOTES.map(nameOf);
const REST_NAMES = RESTS.map(nameOf);
const BEAT_CHOICES = NOTES.map((e) => beatsText(beatsOf(e))); // 4 2 1 ½ ¼

// Großer Anfangsbuchstabe (nach „Richtig!“ beginnt ein neuer Satz)
const upperFirst = (t) => t[0].toUpperCase() + t.slice(1);
// Schläge mit geschütztem Leerzeichen („1½ Schläge“ bleibt in einer Zeile)
const nbBeats = (b) => beatsLabel(b).replace(" ", " ");

/* --- Zweischrittige Antworten (q.steps, seit Welle 9 „Notenwerte gehirngerecht“) ---
   Jede zweischrittige Aufgabe trägt way: beide Denkschritte als ein Satzteil. display = way (groß),
   reveal = „Richtig wäre: way.“, partial = „Der … stimmt, der … nicht: way.“. Die Texte nach Schritt 1
   (ok/bad) nennen nur Schritt 1, nie die Antwort von Schritt 2. */
function twoStep(base, way, partialHead) {
  return Object.assign(base, { display: upperFirst(way), reveal: `Richtig wäre: ${way}.`, partial: `${partialHead}: ${way}.` });
}
const stepTexts = (fact) => ({ ok: `Richtig: ${fact}`, bad: `Nicht ganz: ${fact}` });

// Merkmale je Notenwert: Schritt 1 der Kopf, Schritt 2 Hals und Fähnchen
export const HEAD_OPEN = "hohl", HEAD_BLACK = "schwarz";
export const headOf = (e) => (e.v <= 2 ? HEAD_OPEN : HEAD_BLACK);
const FEATURE = { 1: "ohne Hals", 2: "mit Hals", 4: "kein Fähnchen", 8: "1 Fähnchen", 16: "2 Fähnchen" };
export const featureOf = (e) => FEATURE[e.v];
// Werte je Kopfform (Schritt 2 der Stufe 1 bietet nur diese an)
export const VALUES_BY_HEAD = { [HEAD_OPEN]: NOTES.filter((e) => headOf(e) === HEAD_OPEN), [HEAD_BLACK]: NOTES.filter((e) => headOf(e) === HEAD_BLACK) };
// „Kopf schwarz · 1 Fähnchen → Achtelnote (½ Schlag)“
export const valueWay = (e) => `Kopf ${headOf(e)} · ${featureOf(e)} → ${nameOf(e)} (${nbBeats(beatsOf(e))})`;

// Stufe 1: Notenwerte erkennen, zwei Schritte (Kopf, dann Hals und Fähnchen)
export const ITEMS_1 = NOTES.map((e) => ({ key: "k:" + keyOf(e), el: e, make: () => {
  const names = VALUES_BY_HEAD[headOf(e)].map(nameOf), head = headOf(e);
  return twoStep({
    svg: singleSvg(e, false), prompt: "Wie sieht der Notenkopf aus?", answer: nameOf(e), choices: names,
    steps: [
      { choices: [HEAD_OPEN, HEAD_BLACK], answer: head, ...stepTexts(`Der Kopf ist ${head}.`) },
      { choices: names, answer: nameOf(e), prompt: "Welcher Notenwert?" },
    ],
    el: e,
  }, valueWay(e), "Der Notenwert stimmt, der Kopf nicht");
} }));

// Stufe 2: Pausen erkennen (ein Schritt wie bisher)
export const ITEMS_2 = RESTS.map((e) => ({ key: "2:" + keyOf(e), make: () => ({
  svg: singleSvg(e, false), prompt: "Welche Pause ist das?", answer: nameOf(e), display: displayOf(e), reveal: revealName(e), choices: REST_NAMES, el: e,
}) }));

// Stufe 3: Noten und Pausen erkennen ohne Hilfen (bisher Stufe 1 und 2 getrennt; die Schlüssel bleiben)
const NAME_ITEMS = NOTES.map((e) => ({ key: "1:" + keyOf(e), make: () => ({
  svg: singleSvg(e, false), prompt: "Welcher Notenwert ist das?", answer: nameOf(e), display: displayOf(e), reveal: revealName(e), choices: NOTE_NAMES, el: e,
}) }));
export const ITEMS_3 = [...NAME_ITEMS, ...ITEMS_2];

// Dauer einer Note oder Pause: „Achtelpause → ½ Schlag“
export const beatsWay = (e) => `${nameOf(e)} → ${nbBeats(beatsOf(e))}`;

// Stufe 4: Wie viele Schläge? Zwei Schritte (Notenwert, dann Schläge)
export const ITEMS_4 = [...NOTES, ...RESTS].map((e) => ({ key: "d:" + keyOf(e), el: e, make: () => {
  const names = e.rest ? REST_NAMES : NOTE_NAMES, prompt = e.rest ? "Welche Pause?" : "Welcher Notenwert?";
  return twoStep({
    svg: singleSvg(e, true), prompt, answer: beatsText(beatsOf(e)), choices: BEAT_CHOICES,
    steps: [
      { choices: names, answer: nameOf(e), ...stepTexts(`Das ist eine ${nameOf(e)}.`) },
      { choices: BEAT_CHOICES, answer: beatsText(beatsOf(e)), prompt: "Wie viele Schläge im 4/4-Takt?" },
    ],
    el: e,
  }, beatsWay(e), "Die Schläge stimmen, der Notenwert nicht");
} }));

// Stufe 5: Wie viele Schläge? Ohne Hilfen (bisher Stufe 3)
export const ITEMS_5 = [...NOTES, ...RESTS].map((e) => ({ key: "3:" + keyOf(e), make: () => ({
  svg: singleSvg(e, true), prompt: "Wie viele Schläge im 4/4-Takt?", answer: beatsText(beatsOf(e)), display: displayOf(e), reveal: revealBeats(e), choices: BEAT_CHOICES, el: e,
}) }));

// Punktierungen: punktierte halbe, Viertel, Achtel; zum Vergleich auch ohne Punkt
const DOTTABLE = [2, 4, 8];
const DOTTED_EL = DOTTABLE.flatMap((v) => [el(v, true), el(v)]);
export const BEAT_CHOICES_4 = ["3", "2", "1½", "1", "¾", "½"];
const NAME_CHOICES_4 = DOTTED_EL.map(nameOf); // punktierte halbe, halbe, punktierte Viertel, Viertel …
const BASE_NAMES = DOTTABLE.map((v) => nameOf(el(v)));
// Notenwert ohne den Punkt
export const baseOf = (e) => el(e.v, false, e.rest);
// „Viertelnote = 1 Schlag · Punkt: + ½ → 1½ Schläge“ bzw. „Viertelnote = 1 Schlag · kein Punkt → 1 Schlag“
export function dotWay(e) {
  const b = baseOf(e), bb = beatsOf(b), head = `${nameOf(b)} = ${nbBeats(bb)}`;
  return e.dot ? `${head} · Punkt: + ${beatsText(bb / 2)} → ${nbBeats(beatsOf(e))}` : `${head} · kein Punkt → ${nbBeats(bb)}`;
}

// Stufe 6: Punktierungen in zwei Schritten (Notenwert ohne den Punkt, dann Schläge); punktierte doppelt im Vorrat
export const ITEMS_6 = DOTTED_EL.map((e) => ({ key: "p:" + keyOf(e), dot: e.dot, el: e, make: () => {
  const base = nameOf(baseOf(e));
  return twoStep({
    svg: singleSvg(e, true), prompt: e.dot ? "Welcher Notenwert ist das ohne den Punkt?" : "Welcher Notenwert ist das?",
    answer: beatsText(beatsOf(e)), choices: BEAT_CHOICES_4,
    steps: [
      { choices: BASE_NAMES, answer: base, ...stepTexts(e.dot ? `Ohne den Punkt ist das eine ${base}.` : `Das ist eine ${base}.`) },
      { choices: BEAT_CHOICES_4, answer: beatsText(beatsOf(e)), prompt: "Wie viele Schläge dauert die Note?" },
    ],
    el: e,
  }, dotWay(e), "Die Schläge stimmen, der Notenwert nicht");
} }));
const POOL_6 = [...ITEMS_6, ...ITEMS_6.filter((it) => it.dot)];

// Stufe 7: Punktierungen ohne Hilfen (bisher Stufe 4): gefragt wird die Dauer oder der Name
export const ITEMS_7 = DOTTED_EL.flatMap((e) => [
  { key: "4:b:" + keyOf(e), dot: e.dot, make: () => ({ svg: singleSvg(e, true), prompt: "Wie viele Schläge dauert diese Note?", answer: beatsText(beatsOf(e)), display: displayOf(e), reveal: revealBeats(e), choices: BEAT_CHOICES_4, el: e }) },
  { key: "4:n:" + keyOf(e), dot: e.dot, make: () => ({ svg: singleSvg(e, true), prompt: "Wie heißt dieser Notenwert?", answer: nameOf(e), display: displayOf(e), reveal: revealName(e), choices: NAME_CHOICES_4, el: e }) },
]);
const POOL_7 = [...ITEMS_7, ...ITEMS_7.filter((it) => it.dot)];

// Takt füllen (Stufe 8 und 9). Feste Takte, jeweils genau vier Schläge; Zeichen: Zahl = Notenwert,
// "." = Punkt, "r" = Pause. Halbe Pausen nur auf Schlag 1 oder 3, keine Noten über die Taktmitte.
export const BARS = [
  "4 4 4 4", "2 4 4", "4 4 2", "2 2", "2. 4", "4. 8 4 4", "4 4 4. 8", "4. 8 2", "8 8 4 4 4", "4 8 8 2",
  "4 4 8 8 4", "2 8 8 8 8", "r4 4 4 4", "4 4 r2", "2 r4 4", "4 r4 2", "8 r8 4 2", "r2 2", "4 4 4 r4",
  "16 16 8 4 2", "2. r4", "4 r8 8 2", "4. 8 r4 4", "2 4 r8 8", "8 16 16 4 2",
];
export const parseBar = (s) => s.split(" ").map((t) => el(parseInt(t.replace("r", ""), 10), t.endsWith("."), t.startsWith("r")));

// Auswahl für die Lücke: Noten (auch punktiert) bzw. Pausen (ohne Punkt), jeweils mit anderer Dauer
const FILL_NOTES = [el(1), el(2, true), el(2), el(4, true), el(4), el(8), el(16)];
const FILL_RESTS = RESTS;
const byLength = (a, b) => beatsOf(b) - beatsOf(a);

export function fillChoices(answer, rnd = Math.random) {
  const pool = (answer.rest ? FILL_RESTS : FILL_NOTES).filter((e) => beatsOf(e) !== beatsOf(answer));
  const wrong = [];
  while (wrong.length < 3) {
    const e = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    wrong.push(e);
  }
  return [answer, ...wrong].sort(byLength);
}

// Rhythmus des vollständigen Takts zum Abspielen nach der Antwort (Engine: { note, beats } bzw.
// { rest: true, beats }). Alle Töne auf einer festen Höhe, dem h' aus der Notenzeile: Es geht nur um
// die Dauern, die Tonhöhe ist bloß ein gleichbleibender Klickton.
export const rhythmOf = (els) => els.map((e) => (e.rest ? { rest: true, beats: beatsOf(e) } : { note: PITCH, beats: beatsOf(e) }));

// Stufe 8, Schritt 1: wie viele Schläge fehlen bis 4. In den 91 Aufgaben fehlen ¼, ½, 1, 1½, 2 oder 3
// Schläge, nie 4 (kein Takt besteht aus einer ganzen Note); ein Knopf „4“ wäre nie richtig.
export const MISSING_CHOICES = ["¼", "½", "1", "1½", "2", "3"];
// „Im Takt stehen 3 Schläge, es fehlt 1 Schlag“ (bei 3 fehlenden: „Im Takt steht 1 Schlag, es fehlen 3 Schläge“)
export function countWay(missing) {
  const have = 4 - missing;
  return `Im Takt ${have > 1 ? "stehen" : "steht"} ${nbBeats(have)}, es ${missing > 1 ? "fehlen" : "fehlt"} ${nbBeats(missing)}`;
}
// Beide Denkschritte: „Im Takt stehen 3 Schläge, es fehlt 1 Schlag → Viertelnote“
export const fillWay = (ans) => `${countWay(beatsOf(ans))} → ${nameOf(ans)}`;

const barItems = (prefix, make) => BARS.flatMap((bar, b) => parseBar(bar).map((ans, gap) => ({ key: `${prefix}:${b}:${gap}`, bar, gap, make: () => make(parseBar(bar), gap, ans) })));
// Gemeinsam für Stufe 8 und 9: Takt mit Lücke, nach der Antwort gefüllt, Rhythmus des ganzen Takts
const barBase = (els, gap) => ({
  svg: barSvg(els, gap),
  // nach der Antwort: derselbe Takt, die Lücke mit dem richtigen Wert gefüllt
  revealSvg: barSvg(els, gap, true),
  play: rhythmOf(els),
  bar: els, gap,
});

// Stufe 8: Takt füllen in zwei Schritten (Zählen, dann Wert wählen); die vier Werte einmal je Aufgabe gezogen
export const ITEMS_8 = barItems("z", (els, gap, ans) => {
  const opts = fillChoices(ans), names = opts.map(nameOf), missing = beatsText(beatsOf(ans));
  return twoStep({
    ...barBase(els, gap),
    prompt: "Wie viele Schläge fehlen bis 4?", answer: nameOf(ans), choices: names,
    steps: [
      { choices: MISSING_CHOICES, answer: missing, ...stepTexts(`${countWay(beatsOf(ans))}.`) },
      { choices: names, answer: nameOf(ans), prompt: ans.rest ? "Welche Pause fehlt?" : "Welche Note fehlt?" },
    ],
    options: opts,
  }, fillWay(ans), "Der Wert stimmt, die Schläge nicht");
});

// Stufe 9: Takt füllen ohne Hilfen (bisher Stufe 5)
export const ITEMS_9 = barItems("5", (els, gap, ans) => {
  const opts = fillChoices(ans);
  return {
    ...barBase(els, gap),
    prompt: ans.rest ? "Welche Pause fehlt in der Lücke?" : "Welche Note fehlt in der Lücke?",
    answer: nameOf(ans), display: displayOf(ans), reveal: revealFill(ans), choices: opts.map(nameOf),
    options: opts,
  };
});

// Stufe 10: Alles gemischt aus den Stufen ohne Hilfen 3, 5, 7, 9; jede der vier gleich oft
export const ITEMS_10 = [...ITEMS_3, ...ITEMS_5, ...ITEMS_7, ...ITEMS_9];
const POOLS_10 = [ITEMS_3, ITEMS_5, POOL_7, ITEMS_9];

function ask(it) { return Object.assign(it.make(), { key: it.key }); }

const RAW = [
  { title: "Notenwerte erkennen", subtitle: "5 Notenwerte · zwei Schritte · mit Hilfen", items: ITEMS_1, example: singleSvg(el(2), false),
    hint: "Zwei Schritte: Erst der Kopf – hohl oder schwarz? Dann Hals und Fähnchen. Hohl ohne Hals: ganze Note, hohl mit Hals: halbe Note. Schwarz ohne Fähnchen: Viertelnote, ein Fähnchen: Achtelnote, zwei Fähnchen: Sechzehntelnote." },
  { title: "Pausen erkennen", subtitle: "5 Pausenwerte · mit Hilfen", items: ITEMS_2, example: singleSvg(el(4, false, true), false),
    hint: "Die ganze Pause hängt an der vierten Linie von unten, die halbe Pause sitzt auf der Mittellinie. Die Achtelpause hat einen Haken, die Sechzehntelpause zwei." },
  { title: "Noten und Pausen erkennen ohne Hilfen", subtitle: "5 Notenwerte und 5 Pausen", items: ITEMS_3, example: singleSvg(el(8, false, true), false),
    hint: "Noten und Pausen gemischt, ohne Hilfen. Bei Noten erst der Kopf, dann Hals und Fähnchen; bei Pausen Form und Lage." },
  { title: "Wie viele Schläge?", subtitle: "4/4-Takt · Noten und Pausen · zwei Schritte · mit Hilfen", items: ITEMS_4, example: singleSvg(el(8), true),
    hint: "Zwei Schritte: Erst den Notenwert erkennen, dann die Schläge ablesen. Im 4/4-Takt dauert eine Viertelnote einen Schlag. Eine Pause dauert so lang wie die Note mit demselben Wert." },
  { title: "Wie viele Schläge? Ohne Hilfen", subtitle: "4/4-Takt · Noten und Pausen", items: ITEMS_5, example: singleSvg(el(16, false, true), true),
    hint: "Im 4/4-Takt dauert eine Viertelnote einen Schlag. Ganze Note 4 Schläge, halbe 2, Achtel ½, Sechzehntel ¼. Eine Pause dauert so lang wie die Note mit demselben Wert." },
  { title: "Punktierungen", subtitle: "Punktierte halbe, Viertel und Achtel · zwei Schritte · mit Hilfen", items: ITEMS_6, pool: POOL_6, example: singleSvg(el(4, true), true),
    hint: "Zwei Schritte: Erst der Notenwert ohne den Punkt, dann die Schläge. Der Punkt verlängert eine Note um die Hälfte ihres Wertes: punktierte Viertel 1 + ½ = 1½ Schläge." },
  { title: "Punktierungen ohne Hilfen", subtitle: "Punktierte halbe, Viertel und Achtel", items: ITEMS_7, pool: POOL_7, example: singleSvg(el(2, true), true),
    hint: "Der Punkt verlängert eine Note um die Hälfte ihres Wertes: punktierte halbe 2 + 1 = 3 Schläge, punktierte Viertel 1 + ½ = 1½, punktierte Achtel ½ + ¼ = ¾." },
  { title: "Takt füllen", subtitle: `4/4-Takt mit Lücke · zwei Schritte · mit Hilfen · ${ITEMS_8.length} Aufgaben`, items: ITEMS_8, example: barSvg(parseBar("4. 8 r4 4"), 2),
    hint: "Zwei Schritte: Erst zählen – die Werte im Takt zusammenzählen, die Lücke überspringen, dann: Was fehlt bis 4? Dann den Wert wählen, der genau so lang dauert." },
  { title: "Takt füllen ohne Hilfen", subtitle: `4/4-Takt mit Lücke · ${ITEMS_9.length} Aufgaben`, items: ITEMS_9, example: barSvg(parseBar("2 4 r8 8"), 3),
    hint: "Ein 4/4-Takt hat vier Schläge. Zähle zusammen, was schon im Takt steht, und überlege, wie viel bis vier fehlt." },
  { title: "Alles gemischt", subtitle: "Stufen 3, 5, 7 und 9", items: ITEMS_10, pools: POOLS_10, example: barSvg(parseBar("2 8 8 8 8"), 3),
    hint: "Notenwerte, Pausen, Schläge, Punkte und Takte aus den Stufen ohne Hilfen durcheinander." },
];

function question(r, prev) {
  if (r.pools) {
    const pools = r.pools.filter((p) => p.some((it) => !prev || it.key !== prev.key));
    return ask(pick(pools[Math.floor(Math.random() * pools.length)], prev));
  }
  return ask(pick(r.pool || r.items, prev));
}

const levels = RAW.map((r, i) => ({
  id: "notenwerte-" + (i + 1),
  no: i + 1,
  title: r.title,
  subtitle: r.subtitle,
  hint: r.hint,
  example: r.example,
  input: "choices",
  items: r.items,
  question(prev) { return question(r, prev); },
  check(q, value) { return value === q.answer; },
}));
/* ---------- Lerntafel ---------- */

// Kleine Notenzeile mit einem Zeichen (Ausschnitt um x = 30)
function miniSvg(inner, w = 60) {
  let s = `<svg viewBox="0 18 ${w} 100" width="${w * 0.6}" height="60" role="img" aria-hidden="true">`;
  for (let i = 0; i < 5; i++) s += `<line class="staff-line" x1="0" x2="${w}" y1="${TOP + i * S}" y2="${TOP + i * S}"/>`;
  return s + inner + "</svg>";
}
const cellSvg = (e) => miniSvg(elementAt(e, e.dot ? 24 : 30));
const TD = `style="padding:6px;border-bottom:1px solid var(--line);vertical-align:middle"`;
const cell = (e) => `<td ${TD}><span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px">${cellSvg(e)}<span class="small">${nameOf(e)}</span></span></td>`;
const TABLE = `style="width:100%;border-collapse:collapse;table-layout:fixed"`;
const COLS = `<colgroup><col style="width:40%"><col style="width:36%"><col style="width:24%"></colgroup>`;

export function learnHtml() {
  const rows = VALUES.map((v) => `<tr>${cell(el(v))}${cell(el(v, false, true))}<td ${TD}><b>${beatsText(beats(v))}</b></td></tr>`).join("");
  const dotted = DOTTABLE.map((v) => `<tr>${cell(el(v, true))}<td ${TD} class="small muted">${beatsText(beats(v))} + ${beatsText(beats(v) / 2)}</td><td ${TD}><b>${beatsText(beats(v, true))}</b></td></tr>`).join("");
  const th = (t) => `<th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--line);font-weight:700" class="small muted">${t}</th>`;
  return `<section style="grid-column:1/-1;min-width:0">`
    + `<table ${TABLE}>${COLS}<thead><tr>${th("Note")}${th("Pause")}${th("Schläge im 4/4")}</tr></thead><tbody>${rows}</tbody></table>`
    + `<p class="eyebrow" style="margin:14px 0 4px">Punktierte Noten</p>`
    + `<table ${TABLE}>${COLS}<thead><tr>${th("Note")}${th("Rechnung")}${th("Schläge im 4/4")}</tr></thead><tbody>${dotted}</tbody></table>`
    + `<p class="small muted" style="margin:8px 0 0">Der Punkt verlängert eine Note um die Hälfte ihres Wertes. Im 4/4-Takt hat jeder Takt vier Schläge, ein Schlag ist eine Viertelnote.</p>`
    + `</section>`;
}

export default {
  id: "notenwerte",
  title: "Notenwerte und Pausen",
  subtitle: "Dauer, Schläge und Punktierung",
  grade: "Klasse 5/6",
  levels,
  learn: [{ title: "Notenwerte und Pausen", render: learnHtml }],
  blitz: null,
};
