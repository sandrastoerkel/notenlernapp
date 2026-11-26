// Paket „Noten lesen“: 15 Stufen im Violin- und Bassschlüssel, erst mit Hilfen, dann ohne (Welle 12, PLAN
// Abschnitt 2). Rechenkern in noten-lage.js, Hilfen in noten-hilfen.js, Vorführungen und Lerntafeln in
// noten-demo.js. Stand Schritt 2: alle Stufen noch einschrittig („Wie heißt die Note?“); die zwei Denkschritte,
// Hilfen und Vorführungen füllen die Schritte 3 bis 5.
import { N, range, same, midi, pc, gName, helm, staffPos } from "../music.js";
import { staffSvg, noteSvg } from "../staff.js";
import { pickWeighted } from "../adapt.js";
import { today } from "../store.js";
import { spruch, teileZu, wahlHtml, showHtml, esc } from "../sprueche.js";
import { displayName, lageText, spruchId, bezug } from "./noten-lage.js";
import { merkleiste, namensleiste, vorzeichenRegel } from "./noten-hilfen.js";
import { lageDemo, zaehlDemo, vorzeichenDemo, boards } from "./noten-demo.js";

// Aus noten-lage.js hierher weitergereicht (vorhandene Aufrufer und Tests)
export { displayName, lageText, spruchId };

const pool = (clef, notes) => notes.map((n) => ({ n, clef }));
const clefLabel = (clef) => (clef === "both" ? "Beide Schlüssel" : clef === "treble" ? "Violinschlüssel" : "Bassschlüssel");

// Schlüssel für die Liste der schwachen Noten, z. B. "Fis (fis', Violin)"
export const statKey = (n, clef) => `${gName(n)} (${helm(n)}, ${clef === "treble" ? "Violin" : "Bass"})`;

// Zufällige Aufgabe aus dem Vorrat, nie dieselbe Note im selben Schlüssel wie prev
export function pick(items, prev) {
  const cand = prev ? items.filter((it) => !(same(it.n, prev.note || prev.n) && it.clef === prev.clef)) : items;
  const list = cand.length ? cand : items;
  return list[Math.floor(Math.random() * list.length)];
}

// Schlüssel für Vorrats-Einträge ({ n, clef }) und Aufgaben ({ note, clef }) gleichermaßen
const itemKey = (x) => statKey(x.n || x.note, x.clef);

// Rückmeldung bei „daneben“: Name, Lage und bei Linien und Zwischenräumen der gewählte Spruch, z. B.
// „Das war ein G (g') – 2. Linie von unten (Es Geht Hurtig Durch Fleiß).“ Wird per textContent gezeigt.
export function revealText(n, clef, state) {
  return revealParts(n, clef, state).map((x) => x.t).join("");
}

// Dieselbe Rückmeldung in Teilen ({ t, mark }): Das Wort des Spruchs zur Stelle der Note ist markiert
// (Abschlussprüfung Welle 10, wortZu/teileZu), z. B. „… – 2. Linie von unten (Es [Geht] Hurtig Durch Fleiß).“
// Die Engine setzt die Teile als Text ein (textContent), das markierte Wort in ein eigenes Element.
export function revealParts(n, clef, state) {
  const id = spruchId(n, clef);
  const head = `Das war ein ${displayName(n)} – ${lageText(n, clef)}`;
  if (!id) return [{ t: `${head}.` }];
  const p = staffPos(n, clef), [vor, wort, nach] = teileZu(state, id, Math.floor(p / 2));
  return [{ t: `${head} (${vor}` }, { t: wort, mark: true }, { t: `${nach}).` }].filter((x) => x.t);
}

export const PROMPT = "Wie heißt die Note?";

function makeQuestion(it, state) {
  return {
    svg: staffSvg(it.clef, noteSvg(it.n, it.clef, 170)),
    prompt: PROMPT,
    answer: { letter: it.n.letter, acc: it.n.acc },
    display: displayName(it.n),
    reveal: revealText(it.n, it.clef, state),
    revealParts: revealParts(it.n, it.clef, state),
    play: [it.n],
    note: it.n,
    clef: it.clef,
    statKey: statKey(it.n, it.clef),
  };
}

// value bei "letters": { letter, acc }; bei "keys": Halbtonzahl (Vergleich nach Tonklasse, Fis = Ges)
export function checkNote(q, value) {
  if (typeof value === "number") return pc(midi(q.note)) === pc(value);
  return !!value && value.letter === q.note.letter && value.acc === q.note.acc;
}

// Vorräte (PLAN Welle 12, Abschnitt 2; am Code nachgezählt im Test). Benannt, damit Stufe 15, Blitz und Notenkarte
// sie mit Namen statt mit einer Nummer in RAW nennen.
const L = (letter, oct, acc = 0) => N(letter, oct, acc);
export const VORRAT = {
  violinLinien: pool("treble", [L("E", 4), L("G", 4), L("H", 4), L("D", 5), L("F", 5)]),
  violinRaeume: pool("treble", [L("F", 4), L("A", 4), L("C", 5), L("E", 5)]),
  violinZeile: pool("treble", range(N("E", 4), N("F", 5))),
  violinAussen: pool("treble", [L("D", 4), L("C", 4), L("G", 5), L("A", 5)]),
  violin: pool("treble", range(N("C", 4), N("A", 5))),
  bassLinien: pool("bass", [L("G", 2), L("H", 2), L("D", 3), L("F", 3), L("A", 3)]),
  bassRaeume: pool("bass", [L("A", 2), L("C", 3), L("E", 3), L("G", 3)]),
  bassZeile: pool("bass", range(N("G", 2), N("A", 3))),
  bassAussen: pool("bass", [L("F", 2), L("E", 2), L("H", 3), L("C", 4)]),
  bass: pool("bass", range(N("E", 2), N("C", 4))),
  // die ersten vier ♯ und die ersten vier ♭, alle in der Zeile (Frage 3 a)
  violinVorzeichen: pool("treble", [L("F", 4, 1), L("C", 5, 1), L("G", 4, 1), L("D", 5, 1), L("H", 4, -1), L("E", 5, -1), L("A", 4, -1), L("D", 5, -1)]),
  bassVorzeichen: pool("bass", [L("F", 3, 1), L("C", 3, 1), L("G", 3, 1), L("D", 3, 1), L("H", 2, -1), L("E", 3, -1), L("A", 3, -1), L("D", 3, -1)]),
};
VORRAT.gemischt = [...VORRAT.violin, ...VORRAT.bass, ...VORRAT.violinVorzeichen, ...VORRAT.bassVorzeichen];

// Hinweise der Startkarte (PLAN Abschnitt 2). Bisherige Hinweise von alt 1 bis 8 unverändert übernommen.
const merk = (c, id) => spruch(c && c.state, id);
const VZ_HINT = "♯ erhöht um einen Halbton und hängt „-is“ an: aus F wird Fis, ebenso Cis, Gis, Dis.\n♭ erniedrigt um einen Halbton: aus E wird Es, aus A wird As, aus D wird Des – und aus H wird B.\nTippe den ganzen Namen an oder schreib ihn, z. B. „fis“ und Enter.";
const ZEILE_HINT = "Linien und Zwischenräume gemischt, jetzt ohne Hilfen. Erst die Lage, dann der Name.";
const BASS_VZ_HINT = "♯ und ♭ bedeuten im Bassschlüssel dasselbe. Lies erst den Stammton im Bassschlüssel, dann das Zeichen.";
// Satz aus dem bisherigen Hinweis der Stufe „Linien im Bassschlüssel“, jetzt in der Lerntafel „Merkhilfen“ (Abschnitt 5)
export const BASS_VERGLEICH = "Dieselbe Linie wie im Violinschlüssel heißt im Bassschlüssel zwei Notennamen weiter: Aus E wird G, aus G wird H.";

// Hilfen (PLAN Abschnitt 3): Überschrift, Satz und Tabelle aus noten-hilfen.js (Gerüst bis Schritt 4)
const H_LINIEN = "Zähle die Linien von unten. Das Wort im Merkspruch beginnt mit dem Notennamen.";
const H_RAEUME = "Zähle die Zwischenräume von unten. Das Wort im Merkspruch beginnt mit dem Notennamen.";
const H_AUSSEN = "Nimm die nächste Linie der Zeile als Bezugston. Jede Stelle weiter ist ein Name weiter: nach oben vorwärts, nach unten rückwärts.";
const H_VZ = "Lies erst den Stammton (die Note ohne Vorzeichen), dann das Zeichen.";
const helps = (helpsTitle, helpText, helpTable) => ({ helps: ["tabelle"], helpsTitle, helpText, helpTable });
const mkLinien = (clef) => helps("Hilfen: Merkspruch für die Linien", H_LINIEN, (c) => merkleiste(clef, "linien", c && c.state));
const mkRaeume = (clef) => helps("Hilfen: Merkspruch für die Zwischenräume", H_RAEUME, (c) => merkleiste(clef, "raeume", c && c.state));
const mkAussen = () => helps("Hilfen: Notennamen der Reihe nach", H_AUSSEN, () => namensleiste());
const mkVz = () => helps("Hilfen: Vorzeichen", H_VZ, () => vorzeichenRegel());

// Vorführungen (PLAN Abschnitt 4; Gerüst bis Schritt 5): q ist die eben gelöste Aufgabe
const D_LAGE = { demo: (q) => lageDemo(q.note, q.clef) };
const D_ZAEHLEN = { demo: (q) => zaehlDemo(bezug(q.note, q.clef).ref, q.note, q.clef) };
const D_VZ = { demo: (q) => vorzeichenDemo(q.note, q.clef) };

const RAW = [
  { clef: "treble", title: "Linien im Violinschlüssel", items: VORRAT.violinLinien, ...mkLinien("treble"), ...D_LAGE,
    hint: (c) => `Zähle die Linien von unten. Die fünf Linien von unten nach oben: E G H D F. Merkspruch: „${merk(c, "violin-linien")}“.` },
  { clef: "treble", title: "Zwischenräume im Violinschlüssel", items: VORRAT.violinRaeume, ...mkRaeume("treble"), ...D_LAGE,
    hint: (c) => `Zähle die Zwischenräume von unten. Die vier Zwischenräume von unten nach oben: F A C E. Merkspruch: „${merk(c, "violin-raeume")}“.` },
  { clef: "treble", title: "Violinschlüssel: Linien und Zwischenräume", items: VORRAT.violinZeile, hint: ZEILE_HINT },
  { clef: "treble", title: "Violinschlüssel: über und unter der Zeile", items: VORRAT.violinAussen, ...mkAussen(), ...D_ZAEHLEN,
    hint: "Neu sind vier Noten außerhalb der Zeile. Nimm die nächste Linie der Zeile als Bezugston und zähle von dort weiter: Jede Stelle ist ein Notenname weiter. Das c' liegt auf einer Hilfslinie unter der Zeile." },
  { clef: "treble", title: "Violinschlüssel mit Hilfslinien", items: VORRAT.violin,
    hint: "Jetzt kommen Noten über und unter der Zeile dazu. Das c' liegt auf einer Hilfslinie unter der Zeile." },
  { clef: "bass", title: "Linien im Bassschlüssel", items: VORRAT.bassLinien, ...mkLinien("bass"), ...D_LAGE,
    hint: (c) => `Zähle die Linien von unten.\nDie Linien von unten: G H D F A.\nMerkspruch: „${merk(c, "bass-linien")}“.\nDie beiden Punkte des Schlüssels umschließen das F.` },
  { clef: "bass", title: "Zwischenräume im Bassschlüssel", items: VORRAT.bassRaeume, ...mkRaeume("bass"), ...D_LAGE,
    hint: (c) => `Zähle die Zwischenräume von unten. Die Zwischenräume von unten: A C E G. Merkspruch: „${merk(c, "bass-raeume")}“.` },
  { clef: "bass", title: "Bassschlüssel: Linien und Zwischenräume", items: VORRAT.bassZeile, hint: ZEILE_HINT },
  { clef: "bass", title: "Bassschlüssel: über und unter der Zeile", items: VORRAT.bassAussen, ...mkAussen(), ...D_ZAEHLEN,
    hint: "Neu sind vier Noten außerhalb der Zeile. Nimm die nächste Linie der Zeile als Bezugston und zähle von dort weiter: Jede Stelle ist ein Notenname weiter. Das c' liegt auf einer Hilfslinie über der Zeile, das E auf einer Hilfslinie darunter." },
  { clef: "bass", title: "Bassschlüssel mit Hilfslinien", items: VORRAT.bass,
    hint: "Das c' liegt im Bassschlüssel auf einer Hilfslinie über der Zeile, das E ganz unten." },
  { clef: "treble", title: "Vorzeichen im Violinschlüssel", acc: true, items: VORRAT.violinVorzeichen, ...mkVz(), ...D_VZ,
    hint: `Lies erst den Stammton – die Note ohne Vorzeichen –, dann das Zeichen.\n${VZ_HINT}` },
  { clef: "treble", title: "Vorzeichen im Violinschlüssel ohne Hilfen", acc: true, items: VORRAT.violinVorzeichen, hint: VZ_HINT },
  { clef: "bass", title: "Vorzeichen im Bassschlüssel", acc: true, items: VORRAT.bassVorzeichen, ...mkVz(), ...D_VZ, hint: BASS_VZ_HINT },
  { clef: "bass", title: "Vorzeichen im Bassschlüssel ohne Hilfen", acc: true, items: VORRAT.bassVorzeichen, hint: BASS_VZ_HINT },
  { clef: "both", title: "Alles gemischt", acc: true, items: VORRAT.gemischt,
    hint: "Beide Schlüssel, alle Lagen, hin und wieder ein Vorzeichen. Schau zuerst auf den Schlüssel. Die Namen ohne Vorzeichen stehen in der obersten Reihe." },
];

// Voraussetzungen (PLAN Welle 12, Abschnitt 7) je Stufennummer:
// needs = direkte Voraussetzungen (fehlt das Feld: die nächste frühere Stufe ohne Hilfen im selben Paket),
// stepNeeds = Voraussetzung je Denkschritt, skill = was man in der Stufe kann („Dafür brauchst du: …“; ohne skill
// der Titel), guess = nur zwei Antwortknöpfe (setzt hier keine Stufe). Siehe src/repeat.js.
const VORAUSSETZUNGEN = {
  // 1–5: needs fehlt, die Voreinstellung ergibt schon die Tabelle (1, 2, 3: keine frühere Stufe ohne Hilfen; 4, 5:
  // noten-3). 6, 7, 8: needs leer, sonst gälte noten-5 aus dem Violinschlüssel. 9, 10: Voreinstellung noten-8.
  3: { skill: "Linien und Zwischenräume im Violinschlüssel" },
  4: { stepNeeds: [[], ["noten-3"]] },
  5: { skill: "Noten im Violinschlüssel" },
  6: { needs: [] },
  7: { needs: [] },
  8: { needs: [], skill: "Linien und Zwischenräume im Bassschlüssel" },
  9: { stepNeeds: [[], ["noten-8"]] },
  10: { skill: "Noten im Bassschlüssel" },
  11: { needs: ["noten-5"], stepNeeds: [["noten-5"], []] },
  12: { needs: ["noten-5"], skill: "Vorzeichen im Violinschlüssel" },
  13: { needs: ["noten-10", "noten-12"], stepNeeds: [["noten-10"], ["noten-12"]] },
  14: { needs: ["noten-10", "noten-12"], skill: "Vorzeichen im Bassschlüssel" },
  15: { needs: ["noten-5", "noten-10", "noten-12", "noten-14"], skill: "Noten in beiden Schlüsseln" },
};

const levels = RAW.map((r, i) => ({
  id: "noten-" + (i + 1),
  no: i + 1,
  title: r.title,
  // Untertitel: Schlüssel und Zahl der Noten, bei Stufen mit Hilfen „· mit Hilfen“ (die zwei Schritte nennt der
  // Untertitel erst, wenn es sie gibt: Schritt 3)
  subtitle: `${clefLabel(r.clef)} · ${r.items.length} Noten${r.helps ? " · mit Hilfen" : ""}`,
  hint: r.hint,
  input: "letters",
  acc: !!r.acc,
  clef: r.clef,
  items: r.items,
  ...(r.helps ? { helps: r.helps, helpsTitle: r.helpsTitle, helpText: r.helpText, helpTable: r.helpTable } : {}),
  ...(r.demo ? { demo: r.demo } : {}),
  // Feste Beispielnote für die Startkarte der Stufe
  example: makeQuestion(r.items[0]).svg,
  // Mit ctx.notes (Fortschritt je Note) öfter die Noten, die noch nicht sitzen (Gewicht nach Tagen mit ctx.heute,
  // W-C4, ohne ctx.heute der örtliche Tag wie in „Intervalle“); sonst gleichverteilt. ctx.state: Spielstand für den gewählten Merkspruch in der Rückmeldung
  question(prev, ctx) {
    return makeQuestion(ctx && ctx.notes ? pickWeighted(r.items, itemKey, ctx.notes, prev, ctx.rand || Math.random, ctx.heute || today()) : pick(r.items, prev), ctx && ctx.state);
  },
  check: checkNote,
  ...(VORAUSSETZUNGEN[i + 1] || {}),
}));

// Blitz: die 26 Stammtöne beider Schlüssel (Stufe 5 und 10), gezählt wird nur der Buchstabe (Abschnitt 11)
export const BLITZ_POOL = [...VORRAT.violin, ...VORRAT.bass];

// Noten für die Notenkarte in der Statistik: Stammtöne aus Stufe 5 (Violin) und 10 (Bass), Vorzeichen-Noten aus
// Stufe 12 und 14 (16 Noten)
export const HEAT_NOTES = { treble: VORRAT.violin, bass: VORRAT.bass, acc: [...VORRAT.violinVorzeichen, ...VORRAT.bassVorzeichen] };
// Alle Schlüssel von „Noten lesen“ (für den Hinweis auf der Startseite)
export const NOTE_KEYS = [...new Set(RAW.flatMap((r) => r.items.map(itemKey)))];

// Zeilen der Lerntafeln: [Beschriftung, Wert, Note (optional)]. Zeilen mit Note nennen eine Stelle der
// Zeile; der Test prüft sie gegen staffPos (Welle 10, A2: unterste Linie im Bass ist G, darunter F).
// Zeilen mit { spruch: Kennung } zeigen den gewählten Merkspruch (sprueche.js, Welle 10, Schritt 4).
export const LEGEND = {
  treble: [["Linien (unten → oben)", "E G H D F"], ["Merkspruch", { spruch: "violin-linien" }], ["Zwischenräume", "F A C E"], ["Merkspruch", { spruch: "violin-raeume" }], ["Unter der Zeile, ohne Hilfslinie", "d'", N("D", 4)], ["Hilfslinie unten", "c' (eingestrichenes C)", N("C", 4)], ["Schlüssel-Kringel", "umschließt die G-Linie"]],
  bass: [["Linien (unten → oben)", "G H D F A"], ["Merkspruch", { spruch: "bass-linien" }], ["Zwischenräume", "A C E G"], ["Merkspruch", { spruch: "bass-raeume" }], ["Die zwei Punkte", "umschließen die F-Linie"], ["Hilfslinie oben", "c' (eingestrichenes C)", N("C", 4)], ["Unterste Linie", "G (große Oktave)", N("G", 2)], ["Unter der Zeile, ohne Hilfslinie", "F", N("F", 2)]],
};
// Merkhilfen, die die Tafel eines Schlüssels zur Wahl stellt
export const LEGEND_WAHL = { treble: ["violin-linien", "violin-raeume"], bass: ["bass-linien", "bass-raeume"] };
const legendValue = (v, state) => (v && v.spruch ? showHtml(state, v.spruch) : esc(v));
// Satz unter der Tabelle (nur Bassschlüssel): der Vergleich mit dem Violinschlüssel (PLAN Abschnitt 5)
export const LEGEND_NOTE = { bass: BASS_VERGLEICH };
export const legendHtml = (clef, state) => LEGEND[clef].map(([k, v]) => `<div><span class="muted">${k}</span><b>${legendValue(v, state)}</b></div>`).join("")
  + (LEGEND_NOTE[clef] ? `<p class="small legend-note">${LEGEND_NOTE[clef]}</p>` : "")
  + `<div class="spruch-board"><p class="small muted">Wähle deinen Merkspruch oder schreib einen eigenen. Die Anfangsbuchstaben müssen zu den Noten passen.</p>${LEGEND_WAHL[clef].map((id) => wahlHtml(state, id)).join("")}</div>`;

export default {
  id: "noten",
  title: "Noten lesen",
  subtitle: "Violin- und Bassschlüssel",
  levels,
  // Lerntafeln des Reiters „Tonhöhen“, je Schlüssel eine Tafel; Reihenfolge und Titel in noten-demo.js (boards).
  // ctx: { state } (learn.js), für die gewählten Merksprüche
  learn: boards(legendHtml),
  blitz: {
    title: "60 Sekunden, beide Schlüssel",
    items: BLITZ_POOL,
    // Feste Beispielnote (f') für die Startkarte
    example: makeQuestion(BLITZ_POOL[3]).svg,
    question(prev) { return makeQuestion(pick(BLITZ_POOL, prev)); },
    // Im Blitz zählt nur der Buchstabe; value ist { letter, acc } oder ein Buchstabe
    check(q, value) {
      const letter = typeof value === "string" ? value : value && value.letter;
      return letter === q.note.letter;
    },
  },
};
