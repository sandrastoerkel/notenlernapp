// Paket „Noten lesen“: acht Stufen im Violin- und Bassschlüssel (aus dem ersten Prototyp übernommen)
import { N, range, same, midi, pc, gName, helm, staffPos } from "../music.js";
import { staffSvg, noteSvg } from "../staff.js";
import { pickWeighted } from "../adapt.js";
import { spruch, teileZu, wahlHtml, showHtml, esc } from "../sprueche.js";

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

// Name mit Oktave für die Rückmeldung: „G (g')“; große Oktave „G (großes G)“ statt „G (G)“ (Welle 10, B3)
export const displayName = (n) => (n.octave === 2 ? `${gName(n)} (großes ${gName(n)})` : `${gName(n)} (${helm(n)})`);

// Lage einer Note in der Zeile (rein, Welle 10, B3), aus staffPos: 0, 2 … 8 Linien, 1 … 7 Zwischenräume
// (je von unten gezählt), −1/9 unter/über der Zeile ohne Hilfslinie, −2/10 auf der Hilfslinie. Weiter außen
// (kommt in den Stufen nicht vor) mit der Zahl der Hilfslinien. Bei Vorzeichen: „…, mit ♯: aus F wird Fis“
// bzw. „…, mit ♭: aus H wird B“.
export function lageText(n, clef) {
  const p = staffPos(n, clef);
  let t;
  if (p >= 0 && p <= 8) t = p % 2 === 0 ? `${p / 2 + 1}. Linie von unten` : `${(p + 1) / 2}. Zwischenraum von unten`;
  else if (p === -1) t = "unter der Zeile, ohne Hilfslinie";
  else if (p === 9) t = "über der Zeile, ohne Hilfslinie";
  else if (p === -2) t = "auf der Hilfslinie unter der Zeile";
  else if (p === 10) t = "auf der Hilfslinie über der Zeile";
  else {
    const below = p < 0, k = Math.floor((below ? -p : p - 8) / 2);
    const where = below ? "unter" : "über";
    t = (below ? -p : p - 8) % 2 === 0 ? `auf der ${k}. Hilfslinie ${where} der Zeile` : `${where} der ${k}. Hilfslinie ${where} der Zeile`;
  }
  // Vorzeichen: Stammton und neuer Name (Abschlussprüfung Welle 10), z. B. „…, mit ♭: aus H wird B“
  if (n.acc) t += `, mit ${n.acc > 0 ? "♯" : "♭"}: aus ${n.letter} wird ${gName(n)}`;
  return t;
}

// Kennung des Merkspruchs zu einer Stelle (Linie oder Zwischenraum in der Zeile, ohne Vorzeichen), sonst null
export function spruchId(n, clef) {
  const p = staffPos(n, clef);
  if (n.acc || p < 0 || p > 8) return null;
  return `${clef === "treble" ? "violin" : "bass"}-${p % 2 === 0 ? "linien" : "raeume"}`;
}

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

const RAW = [
  { clef: "treble", title: "Linien im Violinschlüssel", hint: (c) => `Die fünf Linien von unten nach oben: E G H D F. Merkspruch: „${spruch(c && c.state, "violin-linien")}“.`, items: pool("treble", [N("E", 4), N("G", 4), N("H", 4), N("D", 5), N("F", 5)]) },
  { clef: "treble", title: "Zwischenräume im Violinschlüssel", hint: (c) => `Die vier Zwischenräume von unten nach oben: F A C E. Merkspruch: „${spruch(c && c.state, "violin-raeume")}“.`, items: pool("treble", [N("F", 4), N("A", 4), N("C", 5), N("E", 5)]) },
  { clef: "treble", title: "Violinschlüssel mit Hilfslinien", hint: "Jetzt kommen Noten über und unter der Zeile dazu. Das c' liegt auf einer Hilfslinie unter der Zeile.", items: pool("treble", range(N("C", 4), N("A", 5))) },
  { clef: "bass", title: "Linien im Bassschlüssel", hint: (c) => `Dieselbe Linie wie im Violinschlüssel heißt im Bassschlüssel zwei Notennamen weiter: Aus E wird G, aus G wird H.\nDie Linien von unten: G H D F A.\nMerkspruch: „${spruch(c && c.state, "bass-linien")}“.\nDie beiden Punkte des Schlüssels umschließen das F.`, items: pool("bass", [N("G", 2), N("H", 2), N("D", 3), N("F", 3), N("A", 3)]) },
  { clef: "bass", title: "Zwischenräume im Bassschlüssel", hint: (c) => `Die Zwischenräume von unten: A C E G. Merkspruch: „${spruch(c && c.state, "bass-raeume")}“.`, items: pool("bass", [N("A", 2), N("C", 3), N("E", 3), N("G", 3)]) },
  { clef: "bass", title: "Bassschlüssel mit Hilfslinien", hint: "Das c' liegt im Bassschlüssel auf einer Hilfslinie über der Zeile, das E ganz unten.", items: pool("bass", range(N("E", 2), N("C", 4))) },
  { clef: "treble", title: "Vorzeichen ♯ und ♭", hint: "♯ erhöht um einen Halbton und hängt „-is“ an: aus F wird Fis, ebenso Cis, Gis, Dis.\n♭ erniedrigt um einen Halbton: aus E wird Es, aus A wird As, aus D wird Des – und aus H wird B.\nTippe den ganzen Namen an oder schreib ihn, z. B. „fis“ und Enter.", acc: true, items: pool("treble", [N("F", 4, 1), N("C", 5, 1), N("G", 4, 1), N("D", 5, 1), N("H", 4, -1), N("E", 5, -1), N("A", 4, -1), N("D", 5, -1)]) },
  { clef: "both", title: "Alles gemischt", hint: "Beide Schlüssel, alle Lagen, hin und wieder ein Vorzeichen. Schau zuerst auf den Schlüssel. Die Namen ohne Vorzeichen stehen in der obersten Reihe.", acc: true, items: [] },
];
RAW[7].items = [...RAW[2].items, ...RAW[5].items, ...RAW[6].items];

// Voraussetzungen (Welle 11, Tabelle in docs/PLAN.md, Abschnitt 1) je Stufennummer:
// needs = direkte Voraussetzungen (fehlt das Feld: die nächste frühere Stufe ohne Hilfen im selben Paket),
// stepNeeds = Voraussetzung je Denkschritt, skill = was man in der Stufe kann („Dafür brauchst du: …“),
// guess = nur zwei Antwortknöpfe (Raten; mehr Aufgaben in der Runde „Wiederholen“). Siehe src/repeat.js.
const VORAUSSETZUNGEN = {
  1: { skill: "Linien im Violinschlüssel" },
  2: { needs: [], skill: "Zwischenräume im Violinschlüssel" },
  3: { needs: ["noten-1", "noten-2"], skill: "Noten im Violinschlüssel" },
  4: { needs: [], skill: "Linien im Bassschlüssel" },
  5: { needs: [], skill: "Zwischenräume im Bassschlüssel" },
  6: { needs: ["noten-4", "noten-5"], skill: "Noten im Bassschlüssel" },
  7: { needs: ["noten-3"], skill: "Noten mit Vorzeichen" },
  8: { needs: ["noten-3", "noten-6", "noten-7"], skill: "Noten in beiden Schlüsseln" },
};

const levels = RAW.map((r, i) => ({
  id: "noten-" + (i + 1),
  no: i + 1,
  title: r.title,
  subtitle: `${clefLabel(r.clef)} · ${r.items.length} Noten`,
  hint: r.hint,
  input: "letters",
  acc: !!r.acc,
  clef: r.clef,
  items: r.items,
  // Feste Beispielnote für die Startkarte der Stufe
  example: makeQuestion(r.items[0]).svg,
  // Mit ctx.notes (Fortschritt je Note) öfter die Noten, die noch nicht sitzen; sonst gleichverteilt
  // ctx.state: Spielstand für den gewählten Merkspruch in der Rückmeldung (nur über sprueche.js)
  question(prev, ctx) {
    return makeQuestion(ctx && ctx.notes ? pickWeighted(r.items, itemKey, ctx.notes, prev) : pick(r.items, prev), ctx && ctx.state);
  },
  check: checkNote,
  ...(VORAUSSETZUNGEN[i + 1] || {}),
}));

export const BLITZ_POOL = [...RAW[2].items, ...RAW[5].items];

// Noten für die Notenkarte in der Statistik: Stammtöne aus Stufe 3 (Violin) und 6 (Bass),
// Vorzeichen-Noten aus Stufe 7
export const HEAT_NOTES = { treble: RAW[2].items, bass: RAW[5].items, acc: RAW[6].items };
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
export const legendHtml = (clef, state) => LEGEND[clef].map(([k, v]) => `<div><span class="muted">${k}</span><b>${legendValue(v, state)}</b></div>`).join("")
  + `<div class="spruch-board"><p class="small muted">Wähle deinen Merkspruch oder schreib einen eigenen. Die Anfangsbuchstaben müssen zu den Noten passen.</p>${LEGEND_WAHL[clef].map((id) => wahlHtml(state, id)).join("")}</div>`;

export default {
  id: "noten",
  title: "Noten lesen",
  subtitle: "Violin- und Bassschlüssel",
  grade: "Klasse 5–7",
  levels,
  // Lerntafeln: Inhalt für den Bereich „Merkhilfen“, je Schlüssel eine Tafel
  learn: [
    // ctx: { state } (learn.js), für die gewählten Merksprüche
    { title: "Merkhilfen", clef: "treble", render(ctx) { return legendHtml("treble", ctx && ctx.state); } },
    { title: "Merkhilfen", clef: "bass", render(ctx) { return legendHtml("bass", ctx && ctx.state); } },
  ],
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
