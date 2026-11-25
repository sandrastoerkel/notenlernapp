// Paket „Notenwerte und Pausen“ (seit Welle 9 „Notenwerte gehirngerecht“, docs/PLAN.md): zehn Stufen, erst mit
// Hilfen, dann ohne (Klasse 5/6). Die zwei Denkschritte (Schritt 1 violett, Schritt 2 grün): Notenwert = Kopf,
// dann Hals und Fähnchen; Dauer = Notenwert, dann Schläge; Takt füllen = Zählen, dann Wert wählen.
// Alle Noten stehen auf dem h' im Violinschlüssel (Mittellinie, Hals nach unten), damit nur der Wert zählt.
import { N, VALUES, beats, beatsText, beatsLabel, valueName, staffPos } from "../music.js";
import { staffSvg, noteSvg, restSvg, glyphSvg, beamSvg, S, TOP, BOTTOM, X1 } from "../staff.js";
import { tileTable } from "../grid.js";
import { demoHtml, mountDemo } from "../demo.js";

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

// Ink-Mitte der Pausen relativ zu x in restSvg (Noto Music bei 48 px bzw. Rechteck)
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
// Ausnahme (Prüfung Schritt 5): Eine Sechzehntel direkt vor der Lücke steht in der Aufgabe mit Fähnchen
// (ihre Gruppe trägt dort keinen Balken). Das Fähnchen ist 1,15 LA breit, der Kasten der Lücke beginnt 5 vor
// der Stelle der Lücke; mit dem Abstand c · Dauer^0,6 (knapp 19) berührte das Fähnchen den Kasten. Diese eine
// Note bekommt deshalb mindestens GAP_FLAG_ADVANCE, den Rest teilen sich die anderen Zeichen wie bisher.
// Frage und Auflösung rechnen mit demselben Aufruf, die Abstände bleiben also gleich.
export const GAP_FLAG_ADVANCE = 23; // 13,8 (Fähnchen) + 5 (Kasten) + 4,2 frei (0,35 LA)
export function layoutBar(els, gap = -1) {
  const w = els.map((el, i) => Math.pow(i === gap ? 1 : beatsOf(el), 0.6));
  const total = X1 - CONTENT_X, sum = w.reduce((a, b) => a + b, 0);
  const tight = gap > 0 && !els[gap - 1].rest && els[gap - 1].v === 16 && (total / sum) * w[gap - 1] < GAP_FLAG_ADVANCE ? gap - 1 : -1;
  const c = tight < 0 ? total / sum : (total - GAP_FLAG_ADVANCE) / (sum - w[tight]);
  let left = CONTENT_X;
  return w.map((wi, i) => { const l = r2(left); left += i === tight ? GAP_FLAG_ADVANCE : c * wi; return l; });
}

/* --- Balken (Welle 10, Schritt 5) ---
   Gebalkt werden nur Achtel und Sechzehntel, die innerhalb desselben Schlags aufeinander folgen. Kein Balken
   über eine Pause oder eine Schlaggrenze; eine einzelne Achtel in ihrem Schlag behält das Fähnchen.
   Sandra (24.11.2026): je Schlag (2 + 2), auch in „2 8 8 8 8“ – nicht vier Achtel einer Takthälfte unter
   einem Balken. Als Konstante: Länge einer Balkeneinheit in Schlägen. */
export const BEAM_UNIT = 1;
const beamable = (e) => !e.rest && e.v >= 8;
// Einsatzzeiten (in Schlägen) der Elemente eines Takts
export const onsetsOf = (els) => { let t = 0; return els.map((e) => { const a = t; t += beatsOf(e); return a; }); };
// Balkengruppen: Listen von Indizes (je mindestens zwei Noten), aus den Einsatzzeiten gerechnet
export function beamGroups(els) {
  const on = onsetsOf(els), groups = [];
  let cur = [];
  const close = () => { if (cur.length > 1) groups.push(cur); cur = []; };
  els.forEach((e, i) => {
    const unit = Math.floor(on[i] / BEAM_UNIT + 1e-9), end = on[i] + beatsOf(e);
    // die Note muss ganz im Schlag liegen, in dem sie beginnt
    const fits = end <= (unit + 1) * BEAM_UNIT + 1e-9;
    if (!beamable(e) || !fits) { close(); return; }
    if (cur.length && Math.floor(on[cur[0]] / BEAM_UNIT + 1e-9) !== unit) close();
    cur.push(i);
  });
  close();
  return groups;
}
// Zweiter Balken in einer Gruppe: zusammenhängende Sechzehntel als [von, bis] (Positionen in der Gruppe)
export function secondaryBeams(els, group) {
  const runs = [];
  let start = -1;
  group.forEach((idx, k) => {
    const sixteenth = els[idx].v === 16 && !els[idx].dot;
    if (sixteenth && start < 0) start = k;
    if (!sixteenth && start >= 0) { runs.push([start, k - 1]); start = -1; }
  });
  if (start >= 0) runs.push([start, group.length - 1]);
  return runs;
}
// Bräuchte die Gruppe einen Teilbalken (Stummel)? Eine einzelne Sechzehntel im Balken oder eine punktierte
// Note darin (z. B. „16 8 16“, „8. 16“). Solche Gruppen zeichnet beamSvg nicht; in BARS kommen sie nicht vor.
export function needsStub(els, group) {
  if (group.some((i) => els[i].dot)) return true;
  return secondaryBeams(els, group).some(([a, b]) => a === b);
}

// Ganzer 4/4-Takt mit Taktangabe und Taktstrich; gap = Index der Lücke (oder -1).
// filled = true zeichnet statt des Kastens den fehlenden Wert in die Lücke (Auflösung nach der Antwort);
// die Abstände bleiben wie in der Aufgabe, damit nichts verrutscht.
// Balken: In der Aufgabe steht eine Gruppe, in der die Lücke liegt, ganz mit Fähnchen (ein Balken zu den
// Nachbarn verriete den fehlenden Wert); in der Auflösung stehen alle Gruppen des vollen Takts mit Balken.
// opts.mark (nur Vorführung): Index eines Zeichens, das violett erscheint (Klasse nw-s1, Schritt 1 „Zählen“)
export function barBeams(els, gap = -1, filled = false) {
  return beamGroups(els).filter((g) => filled || !g.includes(gap));
}

/* --- Zählzeiten unter den Noten (Welle 10, Schritt 6, Top 2; Regel nach Sandra, 24.11.2026) ---
   Gezählt wird in Achteln: „1 + 2 + 3 + 4 +“ (COUNT_SYLLABLES, Silbe i beginnt bei i Achteln).
   Regel je Zeichen (Einsatz a, Ende b, in Achteln):
   1. Einsatzsilbe: Beginnt das Zeichen genau auf einer Silbe (a ganzzahlig), steht diese Silbe darunter –
      bei einer Note ohne Klammer, bei einer Pause in Klammern. Eine Sechzehntel, die zwischen zwei Silben
      beginnt (a = ½, 1½ …), bekommt keine Silbe.
   2. Gehaltene Schläge: Jede Schlagzahl (1, 2, 3, 4), die nach dem Einsatz, aber vor dem Ende liegt
      (a < Schlag < b), steht in Klammern dahinter. Gehaltene „+“ werden unter den Noten nicht gezeigt (sonst
      stünde unter einer ganzen Note „1 (+) (2) (+) …“); in der Zählleiste darunter stehen sie, siehe countLabels.
   Damit steht jede Schlagzahl des Takts genau einmal unter den Noten, ein „+“ nur dort, wo etwas beginnt.
   Beispiele: halbe Note auf 1 → „1 (2)“, punktierte Viertel auf 1 → „1 (2)“, Viertelpause auf 3 → „(3)“,
   Achtelpause auf „+“ → „(+)“, halbe Pause auf 3 → „(3) (4)“, ganze Note → „1 (2) (3) (4)“. */
export const COUNT_SYLLABLES = ["1", "+", "2", "+", "3", "+", "4", "+"];
const isBeatSyllable = (i) => i % 2 === 0;
// Silben je Zeichen: [[{ text, hold }] …]; hold = in Klammern (gehaltener Schlag oder Pause)
export function countSyllables(els) {
  const on = onsetsOf(els);
  return els.map((e, i) => {
    const a = on[i] * 2, b = a + beatsOf(e) * 2, out = [];
    if (Math.abs(a - Math.round(a)) < 1e-9) out.push({ text: COUNT_SYLLABLES[Math.round(a)], hold: e.rest });
    for (let j = Math.floor(a) + 1; j < b - 1e-9; j++) if (isBeatSyllable(j)) out.push({ text: COUNT_SYLLABLES[j], hold: true });
    return out;
  });
}
// Als Text je Zeichen: „1 (2)“, „(3)“, „+“, „“ (Sechzehntel zwischen zwei Silben)
export const countLabelText = (els) => countSyllables(els).map((ss) => ss.map((s) => (s.hold ? `(${s.text})` : s.text)).join(" "));

// Lage der Zählzeiten in der Notenzeile: Grundlinie COUNT_Y; die erste Silbe mittig unter dem Zeichen
// (Kopfmitte bzw. Mitte der Pause), weitere Silben im Abstand COUNT_STEP rechts daneben.
// Halsende (Hals nach unten) und Balken liegen bei y = 100; Ziffern 14 hoch (Oberkante der Ziffern etwa 106).
export const COUNT_FONT = { num: 14, und: 12.3 }; // = .nw-cnt (14px) und .nw-und (.88em) in css/style.css
export const COUNT_Y = 116, COUNT_STEP = 22;
// Ungefähre Breite einer Silbe (für den Abstandstest; im Browser nachgemessen, siehe Commit)
export const syllableWidth = (s) => (s.text === "+" ? 0.62 * COUNT_FONT.und : 0.6 * COUNT_FONT.num) + (s.hold ? 0.7 * COUNT_FONT.num : 0);
// Mitte des gezeichneten Zeichens, dessen linke Kante bei left liegt
export const elementCenter = (e, left) => r2(e.rest ? left - REST_LEFT[e.v] + REST_CX[e.v] : left + HEAD_HALF[e.v]);
// Ein Zählzeichen „+“ (Silbe „und“): kleiner und grau, damit es nicht wie das Rechen-Plus aussieht
const undSvg = '<tspan class="nw-und">+</tspan>';
const syllableSvg = (s) => {
  const inner = s.text === "+" ? undSvg : s.text;
  return s.hold ? `(${inner})` : inner;
};
// Positionen [{ x, s }] aller Silben eines Takts (für Zeichnung und Test)
export function countMarks(els, gap = -1) {
  const xs = layoutBar(els, gap);
  return countSyllables(els).flatMap((ss, i) => ss.map((s, k) => ({ i, x: r2(elementCenter(els[i], xs[i]) + k * COUNT_STEP), s })));
}
const countsSvg = (els, gap) => `<g class="nw-counts">${countMarks(els, gap).map(({ x, s }) => `<text class="nw-cnt${s.hold ? " hold" : ""}" x="${x}" y="${COUNT_Y}" text-anchor="middle">${syllableSvg(s)}</text>`).join("")}</g>`;

// opts.counts (nur nach der Antwort und im Ergebnis der Vorführung): Zählzeiten unter den Zeichen
export function barSvg(els, gap = -1, filled = false, opts = {}) {
  const xs = layoutBar(els, gap), groups = barBeams(els, gap, filled);
  const beamed = new Set(groups.flat());
  const one = (el, i) => (beamed.has(i)
    ? noteSvg(PITCH, CLEF, r2(xs[i] + HEAD_HALF[el.v]), "", { value: el.v, flagless: true })
    : elementFrom(el, xs[i]));
  const draw = (el, i) => (i !== gap ? one(el, i) : filled ? `<g class="filled">${one(el, i)}</g>` : gapSvg(xs[i]));
  const at = (el, i) => (i === opts.mark ? `<g class="nw-s1">${draw(el, i)}</g>` : draw(el, i));
  const beams = groups.map((g) => beamSvg(g.map((i) => r2(xs[i] + HEAD_HALF[els[i].v])), MID, false, secondaryBeams(els, g))).join("");
  const inner = timeSigSvg() + els.map(at).join("") + beams + barlineSvg() + (opts.counts ? countsSvg(els, gap) : "");
  return staffSvg(CLEF, inner);
}

// Einzelnes Element in der Zeile, wahlweise mit Taktangabe
const singleSvg = (el, time) => staffSvg(CLEF, (time ? timeSigSvg() : "") + elementAt(el, 170));

/* ---------- Aufgaben ---------- */

const el = (v, dot = false, rest = false) => ({ v, dot, rest });
const NOTES = VALUES.map((v) => el(v));
const RESTS = VALUES.map((v) => el(v, false, true));

// Feedback: display nach richtiger Antwort („Richtig! Viertelnote = 1 Schlag“), reveal als ganzer Satz
// nach falscher Antwort. Alle Begriffe sind weiblich (die Note, die Pause), daher „eine“.
// Zahl und „Schlag“ bleiben in einer Zeile (geschütztes Leerzeichen)
const beatsNb = (e) => beatsLabel(beatsOf(e)).replace(" ", "\u00a0");
// Wortlaut der Dauer (Welle 11, W1): gefragt ist, wie lange die Note dauert, gemessen in Schlägen – nicht, wie
// viele Schläge der Takt hat. Die Wendung „Schläge im 4/4-Takt“ kommt deshalb nirgends mehr vor.
// BEAT_UNIT steht in Klammern hinter jeder Frage nach der Dauer (geschützte Leerzeichen: die Klammer bricht
// nicht auseinander), BEAT_RULE in Hinweisen und Lerntafel.
export const BEAT_UNIT = "1\u00a0Schlag\u00a0=\u00a01\u00a0Viertelnote";
// Stufen 1–3 nennen die Dauer nur in der Rückmeldung („dauert ½ Schlag“); die Einheit steht im Hinweis der Startkarte
export const BEAT_NOTE = `Die Rückmeldung nennt auch die Dauer (${BEAT_UNIT}).`;
export const BEAT_RULE = "Gezählt wird in Schlägen: Im 4/4-Takt ist ein Schlag so lang wie eine Viertelnote.";
// Frage nach der Dauer (Stufen 4 Schritt 2, 5, 6 Schritt 2, 7 und 10): „Wie viele Schläge dauert diese Note?
// (1 Schlag = 1 Viertelnote)“ bzw. „… diese Pause? …“
export const beatsPrompt = (e) => `Wie viele Schläge dauert diese ${e.rest ? "Pause" : "Note"}? (${BEAT_UNIT})`;
// „(dauert ½ Schlag)“ hinter dem Namen (Stufen 1–3 und Daneben-Sätze mit dem Namen)
export const DAUERT = "dauert";
const withBeats = (e) => `${nameOf(e)} (${DAUERT} ${beatsNb(e)})`;
// Nach „Richtig!“ beginnt ein neuer Satz, daher groß. Stufen 5, 7, 9: „Richtig! Achtelnote = ½ Schlag“ (wie die
// Ergebniskarte der Vorführung); Stufen 2 und 3 (paren = true): „Richtig! Achtelnote (dauert ½ Schlag)“.
export const displayOf = (e, paren = false) => upperFirst(paren ? withBeats(e) : `${nameOf(e)} = ${beatsNb(e)}`);
// Stufen 2, 3 und 7 (Name gefragt): „Das war eine Viertelnote (dauert 1 Schlag).“
// Pausen (Abschlussprüfung Welle 10): mit dem Merkmal, z. B. „Das war eine halbe Pause (dauert 2 Schläge) –
// das Rechteck sitzt auf der Mittellinie.“ (restFeature steht weiter unten, wird erst beim Aufruf gebraucht)
export const revealName = (e) => `Das war eine ${withBeats(e)}${e.rest ? ` – ${restFeature(e)}` : ""}.`;
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
// „Kopf schwarz · 1 Fähnchen → Achtelnote (dauert ½ Schlag)“
export const valueWay = (e) => `Kopf ${headOf(e)} · ${featureOf(e)} → ${nameOf(e)} (${DAUERT} ${nbBeats(beatsOf(e))})`;

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
  svg: singleSvg(e, false), prompt: "Welche Pause ist das?", answer: nameOf(e), display: displayOf(e, true), reveal: revealName(e), choices: REST_NAMES, el: e,
}) }));

// Stufe 3: Noten und Pausen erkennen ohne Hilfen (bisher Stufe 1 und 2 getrennt; die Schlüssel bleiben)
const NAME_ITEMS = NOTES.map((e) => ({ key: "1:" + keyOf(e), make: () => ({
  svg: singleSvg(e, false), prompt: "Welcher Notenwert ist das?", answer: nameOf(e), display: displayOf(e, true), reveal: revealName(e), choices: NOTE_NAMES, el: e,
}) }));
export const ITEMS_3 = [...NAME_ITEMS, ...ITEMS_2];

// Dauer einer Note oder Pause: „Achtelpause → ½ Schlag“
export const beatsWay = (e) => `${nameOf(e)} → ${nbBeats(beatsOf(e))}`;

// Stufe 4: Dauer in Schlägen, zwei Schritte (Notenwert, dann Dauer)
export const ITEMS_4 = [...NOTES, ...RESTS].map((e) => ({ key: "d:" + keyOf(e), el: e, make: () => {
  const names = e.rest ? REST_NAMES : NOTE_NAMES, prompt = e.rest ? "Welche Pause?" : "Welcher Notenwert?";
  return twoStep({
    svg: singleSvg(e, true), prompt, answer: beatsText(beatsOf(e)), choices: BEAT_CHOICES,
    steps: [
      { choices: names, answer: nameOf(e), ...stepTexts(`Das ist eine ${nameOf(e)}.`) },
      { choices: BEAT_CHOICES, answer: beatsText(beatsOf(e)), prompt: beatsPrompt(e) },
    ],
    el: e,
  }, beatsWay(e), "Die Dauer stimmt, der Notenwert nicht");
} }));

// Stufe 5: Dauer in Schlägen ohne Hilfen (bisher Stufe 3)
export const ITEMS_5 = [...NOTES, ...RESTS].map((e) => ({ key: "3:" + keyOf(e), make: () => ({
  svg: singleSvg(e, true), prompt: beatsPrompt(e), answer: beatsText(beatsOf(e)), display: displayOf(e), reveal: revealBeats(e), choices: BEAT_CHOICES, el: e,
}) }));

// Punktierungen: punktierte halbe, Viertel, Achtel; zum Vergleich auch ohne Punkt
const DOTTABLE = [2, 4, 8];
const DOTTED_EL = DOTTABLE.flatMap((v) => [el(v, true), el(v)]);
export const BEAT_CHOICES_4 = ["3", "2", "1½", "1", "¾", "½"];
const NAME_CHOICES_4 = DOTTED_EL.map(nameOf); // punktierte halbe, halbe, punktierte Viertel, Viertel …
const BASE_NAMES = DOTTABLE.map((v) => nameOf(el(v)));
// Notenwert ohne den Punkt
export const baseOf = (e) => el(e.v, false, e.rest);
// Rechnung immer mit „=“ (Welle 10, Top 4: das Rechen-Plus nur in Rechnungen):
// „Viertelnote = 1 Schlag · Punkt: 1 + ½ = 1½ Schläge“ bzw. „Viertelnote = 1 Schlag · kein Punkt → 1 Schlag“
export const dotSum = (bb) => `${beatsText(bb)} + ${beatsText(bb / 2)} = ${beatsText(bb * 1.5)}`;
export function dotWay(e) {
  const b = baseOf(e), bb = beatsOf(b), head = `${nameOf(b)} = ${nbBeats(bb)}`;
  return e.dot ? `${head} · Punkt: ${beatsText(bb)} + ${beatsText(bb / 2)} = ${nbBeats(beatsOf(e))}` : `${head} · kein Punkt → ${nbBeats(bb)}`;
}

// Stufe 6: Punktierungen in zwei Schritten (Notenwert ohne den Punkt, dann Schläge); punktierte doppelt im Vorrat.
// Frage und Texte nach Schritt 1 sind für punktierte und nicht punktierte Noten gleich (Welle 10, Top 5):
// Sie verraten den Punkt nicht; ihn nennt erst die Rückmeldung am Ende (dotWay).
export const PROMPT_6 = "Welcher Notenwert steckt in dieser Note? Einen Punkt lässt du zuerst weg.";
export const ITEMS_6 = DOTTED_EL.map((e) => ({ key: "p:" + keyOf(e), dot: e.dot, el: e, make: () => {
  const base = nameOf(baseOf(e));
  return twoStep({
    svg: singleSvg(e, true), prompt: PROMPT_6,
    answer: beatsText(beatsOf(e)), choices: BEAT_CHOICES_4,
    steps: [
      { choices: BASE_NAMES, answer: base, ...stepTexts(`Der Notenwert ist die ${base}.`) },
      { choices: BEAT_CHOICES_4, answer: beatsText(beatsOf(e)), prompt: beatsPrompt(e) },
    ],
    el: e,
  }, dotWay(e), "Die Dauer stimmt, der Notenwert nicht");
} }));
const POOL_6 = [...ITEMS_6, ...ITEMS_6.filter((it) => it.dot)];

// Stufe 7: Punktierungen ohne Hilfen (bisher Stufe 4): gefragt wird die Dauer oder der Name
export const ITEMS_7 = DOTTED_EL.flatMap((e) => [
  { key: "4:b:" + keyOf(e), dot: e.dot, make: () => ({ svg: singleSvg(e, true), prompt: beatsPrompt(e), answer: beatsText(beatsOf(e)), display: displayOf(e), reveal: revealBeats(e), choices: BEAT_CHOICES_4, el: e }) },
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
// Gemeinsam für Stufe 8 und 9: Takt mit Lücke, nach der Antwort gefüllt und mit den Zählzeiten unter den
// Zeichen (vorher nicht: hinter der Lücke verrieten sie den fehlenden Wert), Rhythmus des ganzen Takts
const barBase = (els, gap) => ({
  svg: barSvg(els, gap),
  // nach der Antwort: derselbe Takt, die Lücke mit dem richtigen Wert gefüllt
  revealSvg: barSvg(els, gap, true, { counts: true }),
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

/* ---------- Hilfen zum Aufklappen (level.helps = ["tabelle"], engine.js) ----------
   Vor der Antwort hebt nichts etwas hervor; die Hilfen zeigen keine Notenbilder neben Namen (das wäre die
   Antwort zum Ablesen). Hervorgehoben wird erst in der Vorführung. */

// Stufe 1 „Merkmale“: eine Zeile je Notenwert, Spalten Kopf | Hals | Fähnchen. Mit einer Spalte je Notenwert
// (Plan) wäre die Tabelle bei 320 px zu breit (Kopf „Sechzehntel“ und „schwarz“ in fünf Spalten), deshalb
// gedreht und ohne Hinterlegung (tileTable hinterlegt nur Spalten).
export function featureTable() {
  const rows = NOTES.map((e) => ({
    label: nameOf(e),
    cells: [{ text: headOf(e) }, e.v === 1 ? null : { text: "ja" }, e.v >= 8 ? { text: e.v === 8 ? "1" : "2" } : null],
  }));
  return `<div class="tt-wrap">${tileTable({ head: ["Notenwert", "Kopf", "Hals", "Fähnchen"], rows, cls: "tt-wide nw-features", blank: "–" })}</div>`;
}

// Stufe 2 „Pausen“: woran du sie erkennst (Wortlaut aus dem bisherigen Hinweis), ohne Spalte mit dem Zeichen
// Form der ganzen und halben Pause (Sandra, 24.11.2026): „Rechteck“ – „Balken“ heißt nur der Balken der
// Achtel und Sechzehntel. Die ganze Pause hängt unter der 2. Linie von oben (= 4. von unten, BAR_REST in
// staff.js: Oberkante auf TOP + S), die halbe sitzt auf der Mittellinie (Unterkante auf TOP + 2 S).
export const REST_SHAPE = "Rechteck";
export const WHOLE_REST_PLACE = "hängt unter der zweiten Linie von oben (das ist die vierte Linie von unten)";
export const HALF_REST_PLACE = "sitzt auf der Mittellinie";
export const REST_FEATURES = [
  ["ganze Pause", `${REST_SHAPE}, ${WHOLE_REST_PLACE}`],
  ["halbe Pause", `${REST_SHAPE}, ${HALF_REST_PLACE}`],
  ["Viertelpause", "Zickzack"],
  ["Achtelpause", "ein Haken"],
  ["Sechzehntelpause", "zwei Haken"],
];
// Spalte „Zeichen“ (Abschlussprüfung Welle 10): erst nach der Antwort sichtbar (data-after-answer, die Engine
// nimmt hidden weg), sonst verriete die Hilfe die Antwort. Jede Pause in einem Stück Notenzeile, damit auch
// „hängt“ und „sitzt“ zu sehen sind.
export function restTable() {
  const after = `data-after-answer hidden`;
  const sym = (e) => `<td class="nw-rest-sym" ${after}>${miniSvg(elementAt(e, 30))}</td>`;
  const rows = REST_FEATURES.map(([n, t], i) => `<tr><td class="tt-label">${softName(RESTS[i])}</td><td class="nw-rest-text">${t}</td>${sym(RESTS[i])}</tr>`).join("");
  return `<table class="tt nw-rests"><thead><tr><th class="tt-head">Pause</th><th class="tt-head">woran du sie erkennst</th><th class="tt-head" ${after}>Zeichen</th></tr></thead><tbody>${rows}</tbody></table>`;
}
// Merkmal einer Pause als Satzteil für die Rückmeldung (Stufen 2 und 3): „das Rechteck sitzt auf der
// Mittellinie“, „Zickzack“ → „ein Zickzack“
const REST_FEATURE_SENTENCE = { 1: `das ${REST_SHAPE} ${WHOLE_REST_PLACE}`, 2: `das ${REST_SHAPE} ${HALF_REST_PLACE}`, 4: "ein Zickzack", 8: "ein Haken", 16: "zwei Haken" };
export const restFeature = (e) => REST_FEATURE_SENTENCE[e.v];

// Notenwert-Pyramide: fünf Zeilen gleich breit (1 ganze, 2 halbe, 4 Viertel, 8 Achtel, 16 Sechzehntel),
// Kästchen mit Zeichen (die Sechzehntel-Zeile gebalkt, je Schlag vier), rechts die Schläge. Ohne Namen (der Name ist
// Schritt 1) und ohne Pausen. opts (nur Vorführung): hit – Zeile, in der EIN Kästchen grün ist (hitBox,
// Schritt 2: so lang dauert der Wert); add – Zeile, in der EIN Kästchen grün umrandet ist (addBox, beim Punkt:
// die Hälfte dazu, direkt hinter dem grünen Kästchen, damit die Länge 1½ zu sehen ist); sum – Rechnung als
// eigene Zeile unter der Pyramide („1 + ½ = 1½“); dot – Zeile „Punkt: + die Hälfte“ (Hilfen Stufe 6).
// Welle 10 (Top 6, Top 10): nicht mehr ganze Zeilen hervorgehoben, Zeichen größer (bei 320 px mindestens so
// hoch wie die Beschriftung der Notenzeile), ganze Note größer, keine verkleinerte Fassung mehr.
export const PYR = { w: 250, rh: 36, gap: 5, top: 16, numW: 40, scale: 0.66, wholeScale: 1.1, line: 24 };
const PYR_SYMBOL_ROWS = 4;
// Zeichen in einem Kästchen: g' (Hals nach oben), so passt es in die Höhe des Kästchens
const SYM_PITCH = N("G", 4);
const SYM_BOX = { 1: [64, 76], other: [28, 76] };
// Höhe des Notenkopfs von g' in der Notenzeile (für die Balken der Sechzehntel-Zeile)
const SYM_Y = BOTTOM - S;
function pyrSymbol(v, cx, top) {
  const s = v === 1 ? PYR.wholeScale : PYR.scale, [y0, y1] = SYM_BOX[v] || SYM_BOX.other;
  const ty = r2(top + (PYR.rh - (y1 - y0) * s) / 2 - y0 * s), tx = r2(cx - (v >= 8 ? 3 : 0) * s);
  return `<g transform="translate(${tx} ${ty}) scale(${s})">${noteSvg(SYM_PITCH, CLEF, 0, "", { value: v })}</g>`;
}
// Sechzehntel-Zeile (Abschlussprüfung Welle 10): in jedem Kästchen eine Sechzehntelnote, je vier (ein Schlag)
// an einem Balken mit zweitem Balken – Fähnchen passen nicht in die schmalen Kästchen, und Balken je Schlag ist
// die Regel der App (Sandra, 24.11.2026). cxs: Mitten der vier Kästchen eines Schlags.
function pyrBeamGroup(cxs, top) {
  const s = PYR.scale, [y0, y1] = SYM_BOX.other;
  const ty = r2(top + (PYR.rh - (y1 - y0) * s) / 2 - y0 * s), tx = r2(cxs[0]);
  const xs = cxs.map((x) => r2((x - cxs[0]) / s));
  const notes = xs.map((x) => noteSvg(SYM_PITCH, CLEF, x, "", { value: 16, flagless: true })).join("");
  return `<g transform="translate(${tx} ${ty}) scale(${s})">${notes}${beamSvg(xs, SYM_Y, true, [[0, xs.length - 1]])}</g>`;
}
export function pyramidSvg({ hit = null, hitBox = 0, add = null, addBox = 0, sum = "", dot = false } = {}) {
  const lines = [dot ? { cls: "nw-pyr-dot", text: PYR_DOT_NOTE } : null, sum ? { cls: "nw-pyr-sum", text: sum } : null].filter(Boolean);
  const width = PYR.w + PYR.numW, rowsEnd = PYR.top + VALUES.length * (PYR.rh + PYR.gap), height = rowsEnd + lines.length * PYR.line;
  let s = `<svg class="nw-pyr" viewBox="0 0 ${width} ${height}" role="img" aria-label="Notenwert-Pyramide">`;
  s += `<text class="nw-pyr-head" x="${PYR.w + PYR.numW / 2}" y="11" text-anchor="middle">Schläge</text>`;
  VALUES.forEach((v, k) => {
    const n = 2 ** k, bw = PYR.w / n, top = PYR.top + k * (PYR.rh + PYR.gap);
    const cls = k === hit ? " hit" : k === add ? " add" : "";
    const mark = k === hit ? hitBox : k === add ? addBox : -1;
    s += `<g class="nw-pyr-row${cls}" data-row="${k}">`;
    // erst alle Kästchen, dann die Zeichen (der Balken der Sechzehntel reicht über vier Kästchen)
    for (let i = 0; i < n; i++) {
      const x = r2(i * bw), on = i === mark ? (k === hit ? " hit" : " add") : "";
      s += `<rect class="nw-pyr-box${on}" x="${r2(x + 1)}" y="${top}" width="${r2(bw - 2)}" height="${PYR.rh}" rx="3"/>`;
    }
    for (let i = 0; i < n; i++) {
      if (k < PYR_SYMBOL_ROWS) s += pyrSymbol(v, r2(i * bw + bw / 2), top);
      else if (i % 4 === 0) s += pyrBeamGroup([0, 1, 2, 3].map((j) => r2((i + j) * bw + bw / 2)), top);
    }
    // Brüche (½, ¼) in der Grundschrift und größer: In Outfit sind die Bruchzeichen winzig (Prüfung Welle 10)
    const b = beats(v), frac = b < 1 ? " frac" : "";
    s += `<text class="nw-pyr-num${frac}" x="${PYR.w + PYR.numW / 2}" y="${top + PYR.rh / 2 + (frac ? 7 : 5)}" text-anchor="middle">${beatsText(b)}</text></g>`;
  });
  lines.forEach((l, i) => { s += `<text class="${l.cls}" x="${PYR.w / 2}" y="${rowsEnd + i * PYR.line + 15}" text-anchor="middle">${l.text}</text>`; });
  return s + "</svg>";
}
export const PYR_DOT_NOTE = "Punkt: + die Hälfte";
const pyramidBlock = (opts = {}) => `<div class="tt-wrap nw-pyr-wrap">${pyramidSvg(opts)}</div>`;

// Zählleiste in Achteln: „1 + 2 + 3 + 4 +“ („+“ gesprochen „und“), die Schlag-Felder grau hinterlegt.
// [OFFEN Sandra] Schreibweise „+“ (daneben „1 u 2 u“, „1 und 2 und“): nur COUNT_SYLLABLES ändern.
// Die Zählsilbe „+“ steht kleiner und grau (.nw-und), damit sie nicht wie das Rechen-Plus aussieht; der Satz
// „+ heißt ‚und‘“ steht im Bild der Zählleiste selbst (Welle 10, Top 4).
export const UND_HTML = '<span class="nw-und">+</span>';
export const syllableHtml = (t) => (t === "+" ? UND_HTML : t);
export const COUNT_NOTE = `${UND_HTML} heißt „und“: eins und zwei und drei und vier und`;
export function countTable() {
  const table = tileTable({ head: [], rows: [{ label: "Zählen", cells: COUNT_SYLLABLES.map((t) => ({ text: syllableHtml(t) })) }], family: [0, 2, 4, 6], cls: "nw-count" });
  return `<figure class="nw-count-fig">${table}<figcaption class="nw-count-cap">${COUNT_NOTE}</figcaption></figure>`;
}

export const HELP_TEXT_VALUE = "Erst den Kopf ansehen, dann Hals und Fähnchen.";
export const HELP_TEXT_REST = `Achte auf die Form und beim ${REST_SHAPE} auf die Lage.`;
export const HELP_TEXT_BEATS = "1 Schlag = 1 Viertelnote. Eine Pause dauert so lang wie die Note mit demselben Wert.";
export const HELP_TEXT_DOT = "Der Punkt verlängert eine Note um die Hälfte ihres Wertes.";
export const HELP_TEXT_BEAM = "Achtel und Sechzehntel in einem Schlag hängen an einem Balken.";
// Notensatz (PLAN Welle 10, Schritt 5; Abschlussprüfung): Die App balkt je Schlag (Sandra), in Noten steht oft
// auch eine Takthälfte unter einem Balken – damit die Regel nicht als „immer so“ gelernt wird
export const BEAM_HALF_BAR = "In Noten stehen im 4/4-Takt oft auch vier Achtel einer Takthälfte (Schlag 1–2 oder 3–4) an einem Balken; über die Taktmitte geht kein Balken. Beides ist richtig, hier steht der Balken je Schlag.";
export const HELP_TEXT_BAR = `Zähle die Werte im Takt zusammen und überspringe die Lücke. Was fehlt bis 4? ${HELP_TEXT_BEAM}`;

const tableHelps = (helpsTitle, helpText, helpTable) => ({ helps: ["tabelle"], helpsTitle, helpText, helpTable });
export const HELPS = {
  1: tableHelps("Hilfen: Merkmale", HELP_TEXT_VALUE, featureTable()),
  2: tableHelps("Hilfen: Pausen", HELP_TEXT_REST, restTable()),
  4: tableHelps("Hilfen: Notenwert-Pyramide", HELP_TEXT_BEATS, pyramidBlock()),
  6: tableHelps("Hilfen: Notenwert-Pyramide", HELP_TEXT_DOT, pyramidBlock({ dot: true })),
  8: tableHelps("Hilfen: Zählleiste und Pyramide", HELP_TEXT_BAR, `<div class="nw-help-stack">${countTable()}${pyramidBlock()}</div>`),
};

/* ---------- Vorführungen (src/demo.js; die Bilder baut das Paket, rein und in node testbar) ---------- */

export const DEMO_STEPS_VALUE = ["1 · Kopf", "2 · Hals und Fähnchen"];
export const DEMO_STEPS_BEATS = ["1 · Notenwert", "2 · Dauer"];
export const DEMO_STEPS_BAR = ["1 · Zählen", "2 · Wert wählen"];

const DEMO_X = 170;
const say = (staff, table) => `<div class="demo-staff">${staff}</div>${table ? `<div class="demo-table">${table}</div>` : ""}`;

/* --- 1. „So erkennst du einen Notenwert“ --- */

// Markierungen als Rahmen über der Note (die Note selbst bleibt unverändert). Die Note steht auf h' bei
// x = 170 (Kopfmitte, y = Mittellinie), der Hals geht nach unten (links am Kopf, bis y = 100), Fähnchen
// rechts vom Hals am unteren Ende.
export const headRing = (e, step) => `<ellipse class="nw-ring s${step}" cx="${DEMO_X}" cy="${MID}" rx="${e.v === 1 ? 15 : 12}" ry="9"/>`;
// Hals und Fähnchen; ohne Hals (ganze Note) gestrichelt an der Stelle, wo er stünde
export const stemRing = (e, step) => `<rect class="nw-ring s${step}${e.v === 1 ? " empty" : ""}" x="${DEMO_X - 12}" y="${MID + 5}" width="${e.v >= 8 ? 26 : 12}" height="${104 - MID - 5}" rx="5"/>`;

export function valueDemo(e) {
  const note = elementAt(e, DEMO_X), staff = (extra = "") => staffSvg(CLEF, note + extra);
  const head = headOf(e), feat = featureOf(e);
  const frames = [
    { step: 0, text: "Welcher Notenwert? Erst den Kopf ansehen, dann Hals und Fähnchen.", body: say(staff()) },
    { step: 1, text: `Kopf ${head}`, body: say(staff(headRing(e, 1))) },
    { step: 2, text: `${upperFirst(feat)} → ${nameOf(e)}`, body: say(staff(headRing(e, 1) + stemRing(e, 2))) },
    {
      step: 3, tones: [PITCH],
      result: { title: `${upperFirst(nameOf(e))} · ${DAUERT} ${nbBeats(beatsOf(e))}`, chips: [{ step: 1, text: `Kopf ${head}` }, { step: 2, text: feat }] },
      body: say(staff(headRing(e, 1) + stemRing(e, 2))),
    },
  ];
  return { steps: DEMO_STEPS_VALUE.slice(), frames };
}

/* --- 2. „So bestimmst du die Dauer“ --- */

const rowOf = (e) => VALUES.indexOf(e.v);
// Element in der Farbe des Schritts (Klasse nw-s1 bzw. nw-s2 färbt Kopf, Hals, Fähnchen, Punkt und Pause)
const tinted = (svg, step) => `<g class="nw-s${step}">${svg}</g>`;
// dot (nur punktierte Noten): 0 – der Punkt bleibt schwarz (Schritt 1 heißt „ohne den Punkt“), 2 – der Punkt
// grün (Bild „Punkt: die Hälfte dazu“, Schritt 2)
const dotTinted = (svg, step, dot) => `<g class="nw-s${step} nw-dot${dot}">${svg}</g>`;
const beatsStaff = (e, step, dot = 0) => {
  const note = elementAt(e, DEMO_X);
  return staffSvg(CLEF, timeSigSvg() + (!step ? note : e.dot ? dotTinted(note, step, dot) : tinted(note, step)));
};

// Pyramide in der Vorführung: ein Kästchen des Notenwerts grün; beim Punkt dazu ein Kästchen der nächsten
// Zeile umrandet, direkt hinter dem grünen (Index 2 in der Zeile darunter), daneben die Rechnung.
export const dotPyr = (e) => ({ hit: rowOf(e), hitBox: 0, add: rowOf(e) + 1, addBox: 2, sum: dotSum(beatsOf(baseOf(e))) });
export function beatsDemo(e) {
  const base = baseOf(e), bb = beatsOf(base), name = nameOf(e), baseName = nameOf(base);
  const pyr = (opts) => pyramidSvg(opts);
  const frames = [
    { step: 0, text: `Wie viele Schläge dauert diese ${e.rest ? "Pause" : "Note"}? Erst der Notenwert, dann die Dauer (${BEAT_UNIT}).`, body: say(beatsStaff(e, 0), pyr()) },
    { step: 1, text: e.dot ? `Ohne den Punkt: ${baseName}` : `Das ist eine ${name}.`, body: say(beatsStaff(e, 1), pyr()) },
    {
      step: 2,
      text: e.rest ? `${upperFirst(name)} = ${nbBeats(bb)}, so lang wie die ${nameOf(el(e.v))}` : `${upperFirst(baseName)} = ${nbBeats(bb)}`,
      body: say(beatsStaff(e, 1), pyr({ hit: rowOf(e) })),
    },
  ];
  if (e.dot) frames.push({ step: 2, text: `Punkt: die Hälfte dazu · ${dotSum(bb)}`, body: say(beatsStaff(e, 1, 2), pyr(dotPyr(e))) });
  frames.push({
    step: 3, tones: e.rest ? [] : [PITCH],
    result: {
      title: `${upperFirst(name)} = ${nbBeats(beatsOf(e))}`,
      chips: [{ step: 1, text: e.dot ? `ohne Punkt: ${baseName}` : name }, { step: 2, text: e.dot ? `${beatsText(bb)} + ${beatsText(bb / 2)} = ${nbBeats(beatsOf(e))}` : nbBeats(bb) }],
    },
    body: say(beatsStaff(e, 0), pyr(e.dot ? dotPyr(e) : { hit: rowOf(e) })),
  });
  return { steps: DEMO_STEPS_BEATS.slice(), frames };
}

/* --- 3. „So zählst du einen Takt“ --- */

// Summenleiste (Schritt 1 und 2): eine Menge, keine Zeitachse (Welle 10, Top 3). Darum anders gezeichnet als
// die Zählleiste: eine leere Leiste ohne Schlag-Felder, Überschrift „Summe“, darunter die Marken 0 bis 4.
// segs füllen die Leiste von links (Einheiten in Achteln, eine Sechzehntel = ½), out umrandet den Rest bis 4.
export const SUM = { f: 34, x0: 10, y: 18, h: 26, tick: 5 };
const sumX = (u) => r2(SUM.x0 + u * SUM.f);
const segSvg = (g, y, h) => `<rect class="nw-seg s${g.step}" data-from="${g.from}" data-to="${g.to}" x="${r2(sumX(g.from) + 2)}" y="${y}" width="${r2((g.to - g.from) * SUM.f - 4)}" height="${h}" rx="3"/>`;
export function sumBarSvg({ segs = [], out = null } = {}) {
  const w = 8 * SUM.f + 2 * SUM.x0, yb = SUM.y + SUM.h, h = yb + SUM.tick + 16;
  let s = `<svg class="nw-sum" viewBox="0 0 ${w} ${h}" role="img" aria-label="Summe der Schläge">`;
  s += `<text class="nw-sum-head" x="${SUM.x0}" y="${SUM.y - 6}">Summe</text>`;
  s += `<rect class="nw-sum-track" x="${sumX(0)}" y="${SUM.y}" width="${8 * SUM.f}" height="${SUM.h}" rx="4"/>`;
  for (const g of segs) s += segSvg(g, SUM.y + 2, SUM.h - 4);
  if (out) s += `<rect class="nw-sum-out s${out.step}" x="${r2(sumX(out.from) + 1)}" y="${SUM.y + 1}" width="${r2((out.to - out.from) * SUM.f - 2)}" height="${SUM.h - 2}" rx="4"/>`;
  for (let b = 0; b <= 4; b++) {
    const x = sumX(2 * b);
    s += `<line class="nw-sum-tick" x1="${x}" x2="${x}" y1="${yb}" y2="${yb + SUM.tick}"/>`;
    s += `<text class="nw-sum-mark" data-mark="${b}" x="${x}" y="${yb + SUM.tick + 13}" text-anchor="middle">${b}</text>`;
  }
  return s + "</svg>";
}

// Zählzeiten der Zählleiste (Ergebnis der Vorführung 3): alle acht Silben; eine Silbe steht ohne Klammern
// nur, wenn genau dort eine Note beginnt, sonst in Klammern (gehaltene Note oder Pause; Sandra, 24.11.2026:
// Schläge ohne neuen Einsatz in Klammern, je Silbe eine Klammer).
export function countLabels(els) {
  const on = onsetsOf(els);
  return COUNT_SYLLABLES.map((c, i) => (els.some((e, k) => !e.rest && Math.abs(on[k] * 2 - i) < 1e-9) ? c : `(${c})`));
}
// Zählleiste im Ergebnis: acht Felder (Schlag-Felder grau) mit den Zählzeiten; die Zeit des eingesetzten
// Werts als grüner Streifen UNTER den Feldern (so bleibt auch über einer Sechzehntel die Silbe lesbar –
// vorher lag ein halbes Feld grün über der „1“ bzw. dem „+“, Prüfung Schritt 5).
export function countBarSvg({ mark = null, labels = COUNT_SYLLABLES } = {}) {
  const w = 8 * SUM.f + 2 * SUM.x0, yb = SUM.y + SUM.h, h = yb + 12;
  let s = `<svg class="nw-sum nw-countbar" viewBox="0 0 ${w} ${h}" role="img" aria-label="Zählleiste">`;
  s += `<text class="nw-sum-head" x="${SUM.x0}" y="${SUM.y - 6}">Zählen</text>`;
  for (let i = 0; i < 8; i++) s += `<rect class="nw-sum-field${i % 2 ? "" : " beat"}" x="${sumX(i)}" y="${SUM.y}" width="${SUM.f}" height="${SUM.h}"/>`;
  labels.forEach((t, i) => {
    const inner = t.replace("+", '<tspan class="nw-und">+</tspan>');
    s += `<text class="nw-sum-label${t.startsWith("(") ? " hold" : ""}" x="${r2(sumX(i) + SUM.f / 2)}" y="${SUM.y + SUM.h / 2 + 5}" text-anchor="middle">${inner}</text>`;
  });
  if (mark) s += segSvg(mark, yb + 3, 7);
  return s + "</svg>";
}
export const COUNT_EXPLAIN = `${UND_HTML} heißt „und“. In Klammern: Zählzeiten ohne neuen Ton – die Note klingt weiter, oder es ist Pause.`;
// „Zählzeiten“, nicht „Schläge“: In der Zählleiste stehen auch „(+)“ in Klammern, und „+“ ist kein Schlag
// (Abschlussprüfung Welle 10)
const countFigure = (svg) => `<figure class="nw-count-fig">${svg}<figcaption class="nw-count-cap">${COUNT_EXPLAIN}</figcaption></figure>`;

// Zählzeit, auf der die Lücke beginnt, als Wort: „3“, „2 +“; eine Sechzehntel zwischen zwei Silben:
// „zwischen den Zählzeiten „1“ und „1 +““ (mit „Zählzeiten“, damit klar ist, dass „1“ und „1 +“ zwei Stellen
// beim Zählen sind und die Sechzehntel keine eigene Silbe hat). a = Einsatz in Achteln.
const syllableName = (i) => (isBeatSyllable(i) ? `${i / 2 + 1}` : `${(i - 1) / 2 + 1} ${UND_HTML}`);
export function gapPlace(a) {
  if (Math.abs(a - Math.round(a)) < 1e-9) return `auf „${syllableName(Math.round(a))}“`;
  return `zwischen den Zählzeiten „${syllableName(Math.floor(a))}“ und „${syllableName(Math.ceil(a))}“`;
}
// „Die Lücke steht auf „2 +“, dort steht jetzt die Achtelnote.“ (aus den Einsatzzeiten gerechnet)
export const gapSentence = (els, gap) => `Die Lücke steht ${gapPlace(onsetsOf(els)[gap] * 2)}, dort steht jetzt die ${nameOf(els[gap])}.`;

// Achtel-Einheiten eines Elements (Viertel = 2, Sechzehntel = ½)
const eighths = (e) => beatsOf(e) * 2;

export function barDemo(els, gap) {
  const ans = els[gap], missing = beatsOf(ans), have = 4 - missing;
  const tintFilled = (svg) => svg.replace('<g class="filled">', '<g class="filled nw-s2">');
  const filledBar = tintFilled(barSvg(els, gap, true));
  const segs = [];
  let sum = 0;
  const frames = [{ step: 0, text: "Wie viele Schläge fehlen? Erst zählen, dann den Wert wählen.", body: say(barSvg(els, gap), sumBarSvg()) }];
  els.forEach((e, i) => {
    let text, tones = [];
    if (i === gap) text = "Lücke: überspringen";
    else {
      segs.push({ step: 1, from: sum * 2, to: (sum + beatsOf(e)) * 2 });
      sum += beatsOf(e);
      text = `${upperFirst(nameOf(e))}: ${nbBeats(beatsOf(e))} · bisher ${nbBeats(sum)}`;
      if (!e.rest) tones = [PITCH];
    }
    frames.push({ step: 1, tones, text, body: say(barSvg(els, gap, false, { mark: i }), sumBarSvg({ segs: segs.slice() })) });
  });
  const counted = segs.slice();
  frames.push({
    step: 1, text: `Im Takt ${have > 1 ? "stehen" : "steht"} ${nbBeats(have)} · bis 4 ${missing > 1 ? "fehlen" : "fehlt"} ${nbBeats(missing)}`,
    body: say(barSvg(els, gap), sumBarSvg({ segs: counted, out: { step: 1, from: have * 2, to: 8 } })),
  });
  frames.push({
    step: 2, text: `${nbBeats(missing)} → ${nameOf(ans)}`,
    body: say(filledBar, sumBarSvg({ segs: [...counted, { step: 2, from: have * 2, to: 8 }] })),
  });
  const start = els.slice(0, gap).reduce((a, e) => a + eighths(e), 0);
  frames.push({
    step: 3,
    result: {
      title: `${upperFirst(nameOf(ans))} (${nbBeats(missing)})`,
      chips: [{ step: 1, text: `${nbBeats(have)} da · ${beatsText(missing)} ${missing > 1 ? "fehlen" : "fehlt"}` }, { step: 2, text: nameOf(ans) }],
      note: gapSentence(els, gap),
    },
    body: say(tintFilled(barSvg(els, gap, true, { counts: true })), countFigure(countBarSvg({ mark: { step: 2, from: start, to: start + eighths(ans) }, labels: countLabels(els) }))),
  });
  return { steps: DEMO_STEPS_BAR.slice(), frames };
}

const DEMOS = {
  1: { demo: (q) => valueDemo(q.el) },
  4: { demo: (q) => beatsDemo(q.el) },
  6: { demo: (q) => beatsDemo(q.el) },
  8: { demo: (q) => barDemo(q.bar, q.gap) },
};

function ask(it) { return Object.assign(it.make(), { key: it.key }); }

const RAW = [
  { twoSteps: true, title: "Notenwerte erkennen", subtitle: "5 Notenwerte · zwei Schritte · mit Hilfen", items: ITEMS_1, example: singleSvg(el(2), false),
    hint: "Zwei Schritte: 1. der Kopf – hohl oder schwarz? 2. Hals und Fähnchen.\nHohl ohne Hals: ganze Note\nHohl mit Hals: halbe Note\nSchwarz ohne Fähnchen: Viertelnote\nSchwarz, 1 Fähnchen: Achtelnote\nSchwarz, 2 Fähnchen: Sechzehntelnote\n" + BEAT_NOTE },
  { title: "Pausen erkennen", subtitle: "5 Pausenwerte · mit Hilfen", items: ITEMS_2, example: singleSvg(el(4, false, true), false),
    hint: `Ganze und halbe Pause sind ein ${REST_SHAPE}: Die ganze Pause ${WHOLE_REST_PLACE}, die halbe Pause ${HALF_REST_PLACE}. Die Achtelpause hat einen Haken, die Sechzehntelpause zwei. ${BEAT_NOTE}` },
  // autoNext (Nachprüfung): Stufen 3 und 10 laufen nach „richtig“ weiter wie die Stufen 5, 7, 9. Nur der Text
  // „Richtig! Sechzehntelpause (dauert ¼ Schlag)“ (43 Zeichen) liegt inzwischen unter AUTO_OK_MAX (45); die
  // Festlegung bleibt trotzdem, damit ein längerer Name die Stufe nicht nach jeder richtigen Antwort warten lässt.
  { autoNext: true, title: "Noten und Pausen erkennen ohne Hilfen", subtitle: "5 Notenwerte und 5 Pausen", items: ITEMS_3, example: singleSvg(el(8, false, true), false),
    hint: "Noten und Pausen gemischt, ohne Hilfen. Bei Noten erst der Kopf, dann Hals und Fähnchen; bei Pausen Form und Lage. " + BEAT_NOTE },
  { twoSteps: true, title: "Dauer in Schlägen", subtitle: "Noten und Pausen · zwei Schritte · mit Hilfen", items: ITEMS_4, example: singleSvg(el(8), true),
    hint: `Zwei Schritte: Erst den Notenwert erkennen, dann seine Dauer ablesen. ${BEAT_RULE} Eine Pause dauert so lang wie die Note mit demselben Wert.` },
  { title: "Dauer in Schlägen ohne Hilfen", subtitle: "Noten und Pausen", items: ITEMS_5, example: singleSvg(el(16, false, true), true),
    hint: `${BEAT_RULE} Die ganze Note dauert 4 Schläge, die halbe 2, die Achtel ½ Schlag, die Sechzehntel ¼ Schlag. Eine Pause dauert so lang wie die Note mit demselben Wert.` },
  { twoSteps: true, title: "Punktierungen", subtitle: "Punktierte halbe, Viertel und Achtel · zwei Schritte · mit Hilfen", items: ITEMS_6, pool: POOL_6, example: singleSvg(el(4, true), true),
    hint: "Zwei Schritte: Erst der Notenwert ohne den Punkt, dann die Dauer. Der Punkt verlängert eine Note um die Hälfte ihres Wertes: punktierte Viertel 1 + ½ = 1½ Schläge." },
  { title: "Punktierungen ohne Hilfen", subtitle: "Punktierte halbe, Viertel und Achtel", items: ITEMS_7, pool: POOL_7, example: singleSvg(el(2, true), true),
    hint: "Der Punkt verlängert eine Note um die Hälfte ihres Wertes: punktierte halbe 2 + 1 = 3 Schläge, punktierte Viertel 1 + ½ = 1½, punktierte Achtel ½ + ¼ = ¾." },
  // learnTab: Reiter in „Lernen“, den „Erst anschauen“ für diese Stufe öffnet (sonst der Reiter des Pakets)
  { learnTab: "takt", twoSteps: true, title: "Takt füllen", subtitle: `4/4-Takt mit Lücke · zwei Schritte · mit Hilfen · ${ITEMS_8.length} Aufgaben`, items: ITEMS_8, example: barSvg(parseBar("4. 8 r4 4"), 2),
    hint: "Zwei Schritte: Erst zählen – die Werte im Takt zusammenzählen, die Lücke überspringen, dann: Was fehlt bis 4? Dann den Wert wählen, der genau so lang dauert." },
  { learnTab: "takt", title: "Takt füllen ohne Hilfen", subtitle: `4/4-Takt mit Lücke · ${ITEMS_9.length} Aufgaben`, items: ITEMS_9, example: barSvg(parseBar("2 4 r8 8"), 3),
    hint: "Ein 4/4-Takt hat vier Schläge. Zähle zusammen, was schon im Takt steht, und überlege, wie viel bis vier fehlt." },
  { autoNext: true, title: "Alles gemischt", subtitle: "Stufen 3, 5, 7 und 9", items: ITEMS_10, pools: POOLS_10, example: barSvg(parseBar("2 8 8 8 8"), 3),
    hint: "Notenwerte, Pausen, Schläge, Punkte und Takte aus den Stufen ohne Hilfen durcheinander." },
];

function question(r, prev) {
  if (r.pools) {
    const pools = r.pools.filter((p) => p.some((it) => !prev || it.key !== prev.key));
    return ask(pick(pools[Math.floor(Math.random() * pools.length)], prev));
  }
  return ask(pick(r.pool || r.items, prev));
}

// Voraussetzungen (Welle 11, Tabelle in docs/PLAN.md, Abschnitt 1) je Stufennummer:
// needs = direkte Voraussetzungen (fehlt das Feld: die nächste frühere Stufe ohne Hilfen im selben Paket),
// stepNeeds = Voraussetzung je Denkschritt, skill = was man in der Stufe kann („Dafür brauchst du: …“),
// guess = nur zwei Antwortknöpfe (Raten; mehr Aufgaben in der Runde „Wiederholen“). Siehe src/repeat.js.
// Stufe 4: Schritt 2 (Dauer) hat keine frühere Grundlage, Stufe 4 führt die Dauer selbst ein.
const VORAUSSETZUNGEN = {
  3: { skill: "Notenwerte und Pausen erkennen" },
  4: { stepNeeds: [["notenwerte-3"], []] },
  5: { skill: "Dauer in Schlägen" },
  6: { needs: ["notenwerte-3", "notenwerte-5"], stepNeeds: [["notenwerte-3"], ["notenwerte-5"]] },
  7: { skill: "Punktierte Noten" },
  8: { needs: ["notenwerte-5", "notenwerte-7"], stepNeeds: [["notenwerte-5", "notenwerte-7"], ["notenwerte-5", "notenwerte-7"]] },
  9: { needs: ["notenwerte-5", "notenwerte-7"], skill: "Takt füllen" },
  10: { needs: ["notenwerte-3", "notenwerte-5", "notenwerte-7", "notenwerte-9"] },
};

const levels = RAW.map((r, i) => ({
  id: "notenwerte-" + (i + 1),
  no: i + 1,
  title: r.title,
  subtitle: r.subtitle,
  hint: r.hint,
  // Zweischrittige Stufe (q.steps): Die Startkarte sagt „Beide Schritte müssen stimmen.“
  twoSteps: !!r.twoSteps,
  ...(typeof r.autoNext === "boolean" ? { autoNext: r.autoNext } : {}),
  ...(r.learnTab ? { learnTab: r.learnTab } : {}),
  example: r.example,
  input: "choices",
  items: r.items,
  question(prev) { return question(r, prev); },
  check(q, value) { return value === q.answer; },
  ...(HELPS[i + 1] || {}),
  ...(DEMOS[i + 1] || {}),
  ...(VORAUSSETZUNGEN[i + 1] || {}),
}));
/* ---------- Lerntafel ---------- */

// Kleine Notenzeile mit einem Zeichen (Ausschnitt um x = 30)
function miniSvg(inner, w = 60) {
  let s = `<svg viewBox="0 18 ${w} 100" width="${w * 0.6}" height="60" role="img" aria-hidden="true">`;
  for (let i = 0; i < 5; i++) s += `<line class="staff-line" x1="0" x2="${w}" y1="${TOP + i * S}" y2="${TOP + i * S}"/>`;
  return s + inner + "</svg>";
}
const cellSvg = (e) => miniSvg(elementAt(e, e.dot ? 24 : 30));
const TD = `style="padding:6px 4px;border-bottom:1px solid var(--line);vertical-align:middle"`;
// Name mit weichem Trennzeichen vor „note“/„pause“ („Sechzehntel-note“): Bei 320 px liefen „Sechzehntelnote“
// und „Sechzehntelpause“ sonst ineinander (Abschlussprüfung Welle 10)
function softName(e) { return nameOf(e).replace(/(tel)(note|pause)$/, "$1\u00ad$2"); }
const cell = (e) => `<td ${TD}><span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;max-width:100%">${cellSvg(e)}<span class="small" style="hyphens:manual;overflow-wrap:break-word;max-width:100%">${softName(e)}</span></span></td>`;
const TABLE = `style="width:100%;border-collapse:collapse;table-layout:fixed"`;
const COLS = `<colgroup><col style="width:38%"><col style="width:35%"><col style="width:27%"></colgroup>`;

// Bild „mit Fähnchen = mit Balken“ (Welle 10, Schritt 5): dieselbe Gruppe links mit Fähnchen, rechts mit Balken.
// Ausschnitt der Notenzeile ohne Schlüssel, alle Noten auf h' mit Hals nach unten wie im Takt.
export const BEAM_PICTURES = [
  { bar: "8 8", text: "zwei Achtel mit Fähnchen = zwei Achtel mit Balken" },
  { bar: "8 16 16", text: "Achtel und zwei Sechzehntel: mit Fähnchen = mit Balken" },
];
const BP = { x0: 16, step: 26, eq: 32 };
export function beamPictureSvg(bar, label = "Balken") {
  const els = parseBar(bar), n = els.length;
  const left = els.map((_, i) => BP.x0 + i * BP.step);
  const eqX = left[n - 1] + BP.eq, right = left.map((x) => r2(x + (eqX - BP.x0) + BP.eq - 4));
  const w = right[n - 1] + BP.x0;
  let s = `<svg class="nw-beam-pic" viewBox="0 18 ${w} 100" width="${w}" height="100" role="img" aria-label="${label}">`;
  // zwei Stücke Notenzeile, dazwischen frei für das Gleichheitszeichen
  for (let i = 0; i < 5; i++) {
    for (const [a, b] of [[0, eqX - 14], [eqX + 14, w]]) s += `<line class="staff-line" x1="${a}" x2="${b}" y1="${TOP + i * S}" y2="${TOP + i * S}"/>`;
  }
  s += els.map((e, i) => noteSvg(PITCH, CLEF, left[i], "", { value: e.v })).join("");
  s += `<text class="nw-eq" x="${eqX}" y="${MID + 8}" text-anchor="middle">=</text>`;
  s += els.map((e, i) => noteSvg(PITCH, CLEF, right[i], "", { value: e.v, flagless: true })).join("");
  const g = els.map((_, i) => i);
  return s + beamSvg(right, MID, false, secondaryBeams(els, g)) + "</svg>";
}

// Lerntafel „Notenwerte und Pausen“ (Reiter „Notenwerte“): Tabellen Note/Pause/Dauer, punktierte Noten, Pyramide
export function valuesHtml() {
  const rows = VALUES.map((v) => `<tr>${cell(el(v))}${cell(el(v, false, true))}<td ${TD}><b>${beatsText(beats(v))}</b></td></tr>`).join("");
  const dotted = DOTTABLE.map((v) => `<tr>${cell(el(v, true))}<td ${TD} class="small muted">${beatsText(beats(v))} + ${beatsText(beats(v) / 2)}</td><td ${TD}><b>${beatsText(beats(v, true))}</b></td></tr>`).join("");
  const th = (t) => `<th style="text-align:left;padding:4px;border-bottom:1px solid var(--line);font-weight:700" class="small muted">${t}</th>`;
  return `<section style="grid-column:1/-1;min-width:0">`
    + `<table ${TABLE}>${COLS}<thead><tr>${th("Note")}${th("Pause")}${th("Dauer in Schlägen")}</tr></thead><tbody>${rows}</tbody></table>`
    + `<p class="eyebrow" style="margin:14px 0 4px">Punktierte Noten</p>`
    + `<table ${TABLE}>${COLS}<thead><tr>${th("Note")}${th("Rechnung")}${th("Dauer in Schlägen")}</tr></thead><tbody>${dotted}</tbody></table>`
    + `<p class="small muted" style="margin:8px 0 0">Gezählt wird in Schlägen: Im 4/4-Takt ist ein Schlag so lang wie eine Viertelnote, ein ganzer Takt hat vier Schläge. Der Punkt verlängert eine Note um die Hälfte ihres Wertes.</p>`
    + `<p class="eyebrow" style="margin:14px 0 4px">Notenwert-Pyramide</p>`
    + `<figure style="margin:0;display:grid;justify-items:center">${pyramidSvg()}</figure>`
    + `<p class="small muted" style="margin:8px 0 0">Jede Zeile dauert gleich lang, zusammen ein 4/4-Takt: 1 ganze = 2 halbe = 4 Viertel = 8 Achtel = 16 Sechzehntel.</p>`
    + `</section>`;
}

// Lerntafel „Balken“ (Reiter „Takt“, Welle 11, Schritt 2): bis Welle 10 ein Abschnitt in „Notenwerte und Pausen“,
// Wortlaut unverändert; die Zwischenüberschrift „Balken“ ist jetzt der Titel der Tafel
export function beamsHtml() {
  return `<section style="grid-column:1/-1;min-width:0">`
    + BEAM_PICTURES.map((b) => `<figure class="nw-beam-fig" style="margin:6px 0;display:grid;justify-items:start;gap:2px">${beamPictureSvg(b.bar, b.text)}<figcaption class="small">${b.text}</figcaption></figure>`).join("")
    + `<p class="small muted" style="margin:8px 0 0">${HELP_TEXT_BEAM} Ein Balken steht für ein Fähnchen (Achtel), zwei Balken für zwei Fähnchen (Sechzehntel). Eine einzelne Achtel in ihrem Schlag behält ihr Fähnchen.</p>`
    + `<p class="small muted" style="margin:8px 0 0">${BEAM_HALF_BAR}</p>`
    + `</section>`;
}

// beide Tafeln zusammen (für die Prüfung der Wörter und Texte in den Tests)
export const learnHtml = () => valuesHtml() + beamsHtml();

// Lerntafeln mit Vorführung: Beispiel-Knöpfe, darunter die Vorführung (mountBoard verdrahtet die Knöpfe;
// eigenes Attribut data-nw-board, siehe Welle 8 data-tl-board)
const BOARD_BARS = [["4 4 4 4", 3, "vier Viertel"], ["4 r4 2", 2, "mit Pause"], ["4. 8 4 4", 1, "mit Punkt"]];
export const BOARDS = {
  value: {
    examples: NOTES.map((e) => ({ label: nameOf(e), make: () => valueDemo(e) })),
    intro: "Erst den Kopf: hohl oder schwarz? Dann Hals und Fähnchen. Wähle einen Notenwert, dann „Weiter ›“ oder „Abspielen“.",
    after: "Hohl ohne Hals: ganze Note, hohl mit Hals: halbe Note. Schwarz ohne Fähnchen: Viertelnote, ein Fähnchen: Achtelnote, zwei Fähnchen: Sechzehntelnote.",
  },
  beats: {
    examples: [el(4), el(8, false, true), el(2, true), el(4, true), el(8, true)].map((e) => ({ label: nameOf(e), make: () => beatsDemo(e) })),
    intro: "Erst den Notenwert erkennen, bei einer punktierten Note ohne den Punkt. Dann die Dauer in der Notenwert-Pyramide ablesen (1 Schlag = 1 Viertelnote).",
    after: "Der Punkt verlängert um die Hälfte: punktierte halbe 2 + 1 = 3, punktierte Viertel 1 + ½ = 1½, punktierte Achtel ½ + ¼ = ¾ Schlag.",
  },
  bar: {
    examples: BOARD_BARS.map(([bar, gap, label]) => ({ label, make: () => barDemo(parseBar(bar), gap) })),
    intro: "Erst zählen: die Werte im Takt der Reihe nach zusammenzählen, die Lücke überspringen. Dann: Was fehlt bis 4? Diesen Wert wählst du.",
    after: `Im Ergebnis stehen die Zählzeiten unter den Noten, darunter die Zählleiste; ${UND_HTML} heißt „und“, Zählzeiten ohne neuen Ton stehen in Klammern.`,
  },
};

export function boardHtml(id) {
  const b = BOARDS[id];
  const picks = b.examples.map((ex, i) => `<button class="btn${i ? "" : " on"}" data-ex="${i}" aria-pressed="${!i}">${ex.label}</button>`).join("");
  return `<div class="demo-board" data-nw-board="${id}">
    <p class="small">${b.intro}</p>
    <div class="row demo-pick" role="group" aria-label="Beispiel">${picks}</div>
    <div class="demo" data-demo-root>${demoHtml(b.examples[0].make(), 0)}</div>
    <p class="small muted">${b.after}</p>
  </div>`;
}

export const mountBoard = (id) => (container) => {
  const board = container.querySelector(`[data-nw-board="${id}"]`);
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
  id: "notenwerte",
  title: "Notenwerte und Pausen",
  subtitle: "Dauer, Schläge und Punktierung",
  grade: "Klasse 5/6",
  levels,
  learn: [
    { title: "So erkennst du einen Notenwert", render() { return boardHtml("value"); }, mount: mountBoard("value") },
    { title: "Notenwerte und Pausen", render: valuesHtml },
    { title: "So bestimmst du die Dauer", render() { return boardHtml("beats"); }, mount: mountBoard("beats") },
    // Reiter „Takt“ in „Lernen“ (Welle 11, Schritt 2); ohne tab gilt die id des Pakets
    { title: "So zählst du einen Takt", tab: "takt", render() { return boardHtml("bar"); }, mount: mountBoard("bar") },
    { title: "Balken", tab: "takt", render: beamsHtml },
  ],
  blitz: null,
};
