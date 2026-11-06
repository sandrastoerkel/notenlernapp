// Paket „Noten lesen“: acht Stufen im Violin- und Bassschlüssel (aus dem ersten Prototyp übernommen)
import { N, range, same, midi, pc, gName, helm } from "../music.js";
import { staffSvg, noteSvg } from "../staff.js";

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

function makeQuestion(it) {
  return {
    svg: staffSvg(it.clef, noteSvg(it.n, it.clef, 170)),
    prompt: "",
    answer: { letter: it.n.letter, acc: it.n.acc },
    display: `${gName(it.n)} (${helm(it.n)})`,
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
  { clef: "treble", title: "Linien im Violinschlüssel", hint: "Die fünf Linien von unten nach oben: E G H D F. Merkspruch: „Es Geht Hurtig Durch Fleiß“.", items: pool("treble", [N("E", 4), N("G", 4), N("H", 4), N("D", 5), N("F", 5)]) },
  { clef: "treble", title: "Zwischenräume im Violinschlüssel", hint: "Die vier Zwischenräume von unten nach oben: F A C E. Merkspruch: „Fritz Aß Citronen-Eis“.", items: pool("treble", [N("F", 4), N("A", 4), N("C", 5), N("E", 5)]) },
  { clef: "treble", title: "Violinschlüssel mit Hilfslinien", hint: "Jetzt kommen Noten über und unter der Zeile dazu. Das c' hängt an einer Hilfslinie unter der Zeile.", items: pool("treble", range(N("C", 4), N("A", 5))) },
  { clef: "bass", title: "Linien im Bassschlüssel", hint: "Im Bassschlüssel liegt alles zwei Stufen tiefer. Die Linien von unten: G H D F A. Die beiden Punkte des Schlüssels umschließen das F.", items: pool("bass", [N("G", 2), N("H", 2), N("D", 3), N("F", 3), N("A", 3)]) },
  { clef: "bass", title: "Zwischenräume im Bassschlüssel", hint: "Die Zwischenräume von unten: A C E G.", items: pool("bass", [N("A", 2), N("C", 3), N("E", 3), N("G", 3)]) },
  { clef: "bass", title: "Bassschlüssel mit Hilfslinien", hint: "Das c' liegt im Bassschlüssel auf einer Hilfslinie über der Zeile, das E ganz unten.", items: pool("bass", range(N("E", 2), N("C", 4))) },
  { clef: "treble", title: "Vorzeichen ♯ und ♭", hint: "♯ erhöht um einen Halbton (Fis, Cis, Gis). ♭ erniedrigt (B, Es, As, Des). Wähle zuerst das Vorzeichen, dann den Buchstaben.", acc: true, items: pool("treble", [N("F", 4, 1), N("C", 5, 1), N("G", 4, 1), N("D", 5, 1), N("H", 4, -1), N("E", 5, -1), N("A", 4, -1), N("D", 5, -1)]) },
  { clef: "both", title: "Alles gemischt", hint: "Beide Schlüssel, alle Lagen, hin und wieder ein Vorzeichen. Schau zuerst auf den Schlüssel.", acc: true, items: [] },
];
RAW[7].items = [...RAW[2].items, ...RAW[5].items, ...RAW[6].items];

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
  question(prev) { return makeQuestion(pick(r.items, prev)); },
  check: checkNote,
}));

export const BLITZ_POOL = [...RAW[2].items, ...RAW[5].items];

const LEGEND = {
  treble: [["Linien (unten → oben)", "E G H D F"], ["Merkspruch", "Es Geht Hurtig Durch Fleiß"], ["Zwischenräume", "F A C E"], ["Merkspruch", "Fritz Aß Citronen-Eis"], ["Hilfslinie unten", "c' (eingestrichenes C)"], ["Schlüssel-Kringel", "umschließt die G-Linie"]],
  bass: [["Linien (unten → oben)", "G H D F A"], ["Zwischenräume", "A C E G"], ["Die zwei Punkte", "umschließen die F-Linie"], ["Hilfslinie oben", "c' (eingestrichenes C)"], ["Unterste Note ohne Hilfslinie", "G (große Oktave)"]],
};
const legendHtml = (clef) => LEGEND[clef].map(([k, v]) => `<div><span class="muted">${k}</span><b>${v}</b></div>`).join("");

export default {
  id: "noten",
  title: "Noten lesen",
  subtitle: "Violin- und Bassschlüssel",
  grade: "Klasse 5–7",
  levels,
  // Lerntafeln: Inhalt für den Bereich „Merkhilfen“, je Schlüssel eine Tafel
  learn: [
    { title: "Merkhilfen", clef: "treble", render() { return legendHtml("treble"); } },
    { title: "Merkhilfen", clef: "bass", render() { return legendHtml("bass"); } },
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
