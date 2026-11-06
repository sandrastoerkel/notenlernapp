// Notenmodell: reine Funktionen, keine DOM-Zugriffe.
// Eine Note ist { letter, octave, acc } mit deutschen Buchstaben (H statt B),
// wissenschaftlicher Oktave (c' = C4) und acc -1 / 0 / 1 (♭ / ohne / ♯).

export const LETTERS = ["C", "D", "E", "F", "G", "A", "H"];
export const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, H: 11 };
export const N = (letter, octave, acc = 0) => ({ letter, octave, acc });
export const dia = (n) => n.octave * 7 + LETTERS.indexOf(n.letter);
// Position in halben Stufen über der untersten Linie: Violinschlüssel E4 (=30), Bassschlüssel G2 (=18)
export const staffPos = (n, clef) => dia(n) - (clef === "treble" ? 30 : 18);
export const midi = (n) => 12 * (n.octave + 1) + SEMI[n.letter] + n.acc;
export const freq = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);
export const pc = (semi) => ((semi % 12) + 12) % 12;

// Deutsche Notennamen: Fis, Cis … / Des, Es, As, B
export function gName(n) {
  if (n.acc === 0) return n.letter;
  if (n.acc > 0) return n.letter + "is";
  if (n.letter === "H") return "B";
  if (n.letter === "E") return "Es";
  if (n.letter === "A") return "As";
  return n.letter + "es";
}

// Helmholtz-Schreibweise: C (große Oktave), c (kleine), c' (eingestrichen), c'' …
export function helm(n) {
  const base = gName(n);
  if (n.octave >= 3) return base.toLowerCase() + "'".repeat(n.octave - 3);
  if (n.octave === 2) return base;
  return base + "₁".repeat(2 - n.octave);
}

export function fromDia(d, acc = 0) { return N(LETTERS[d % 7], Math.floor(d / 7), acc); }
export function range(from, to) { const out = []; for (let d = dia(from); d <= dia(to); d++) out.push(fromDia(d)); return out; }
export const same = (a, b) => a.letter === b.letter && a.octave === b.octave && a.acc === b.acc;

// Stammton um diatonische Schritte verschieben (positiv nach oben), Vorzeichen neu setzen
export const transpose = (n, steps, acc = 0) => fromDia(dia(n) + steps, acc);

/* ---------- Notenwerte (Paket „Notenwerte und Pausen“) ---------- */
// Notenwerte als Nenner: 1 ganze, 2 halbe, 4 Viertel, 8 Achtel, 16 Sechzehntel
export const VALUES = [1, 2, 4, 8, 16];

// Dauer in Schlägen, wenn die Viertelnote einen Schlag zählt (4/4-Takt):
// ganze 4, halbe 2, Viertel 1, Achtel ½, Sechzehntel ¼. Ein Punkt verlängert um die Hälfte des Wertes
// (punktierte halbe 3, punktierte Viertel 1½, punktierte Achtel ¾). Pausen dauern wie die Note.
export const beats = (value, dotted = false) => (4 / value) * (dotted ? 1.5 : 1);

// Schläge als Text mit Bruchzeichen: 4, 3, 1½, ½, ¼, ¾ … (nur Vielfache von ¼)
export function beatsText(b) {
  const q = Math.round(b * 4), whole = Math.floor(q / 4), frac = ["", "¼", "½", "¾"][q % 4];
  return whole === 0 ? frac || "0" : `${whole}${frac}`;
}

// „1 Schlag“, „½ Schlag“, „2 Schläge“, „1½ Schläge“
export const beatsLabel = (b) => `${beatsText(b)} ${b > 1 ? "Schläge" : "Schlag"}`;

// Deutscher Fachbegriff: „ganze Note“, „Viertelnote“, „Achtelpause“, „punktierte halbe Note“ …
const VALUE_WORD = { 1: ["ganze ", false], 2: ["halbe ", false], 4: ["Viertel", true], 8: ["Achtel", true], 16: ["Sechzehntel", true] };
export function valueName(value, rest = false, dotted = false) {
  const [word, joined] = VALUE_WORD[value];
  const noun = rest ? "Pause" : "Note";
  return (dotted ? "punktierte " : "") + word + (joined ? noun.toLowerCase() : noun);
}

/* ---------- Intervalle (Paket D) ---------- */
// Intervallnamen nach der Zahl 1 bis 8 (alle weiblich: die Prime, die Sekunde …)
export const INTERVAL_NAMES = ["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"];
// Halbtöne der reinen (1, 4, 5, 8) bzw. großen (2, 3, 6, 7) Intervalle
const PERFECT_SEMI = { 1: 0, 4: 5, 5: 7, 8: 12 };
const MAJOR_SEMI = { 2: 2, 3: 4, 6: 9, 7: 11 };
export const isPerfectNumber = (num) => PERFECT_SEMI[num] !== undefined;

// Intervallzahl aus dem diatonischen Abstand: 1 = Prime … 8 = Oktave (aufwärts von a nach b)
export const intervalNumber = (a, b) => dia(b) - dia(a) + 1;
// Halbtonabstand aus den MIDI-Nummern
export const intervalSemitones = (a, b) => midi(b) - midi(a);

// Halbtonzahl eines Intervalls aus Zahl und Qualität, null wenn es die Kombination nicht gibt
export function semitonesFor(num, quality) {
  if (isPerfectNumber(num)) {
    const d = { vermindert: -1, rein: 0, "übermäßig": 1 }[quality];
    if (d === undefined || (num === 1 && d < 0)) return null;
    return PERFECT_SEMI[num] + d;
  }
  if (MAJOR_SEMI[num] === undefined) return null;
  const d = { vermindert: -2, klein: -1, "groß": 0, "übermäßig": 1 }[quality];
  return d === undefined ? null : MAJOR_SEMI[num] + d;
}

// Qualität aus der Halbtonzahl: rein, groß, klein, vermindert, übermäßig.
// Nur aufwärts und bis zur Oktave; sonst null.
export function intervalQuality(a, b) {
  const num = intervalNumber(a, b), semi = intervalSemitones(a, b);
  if (num < 1 || num > 8 || semi < 0) return null;
  if (isPerfectNumber(num)) {
    return { [-1]: "vermindert", 0: "rein", 1: "übermäßig" }[semi - PERFECT_SEMI[num]] || null;
  }
  return { [-2]: "vermindert", [-1]: "klein", 0: "groß", 1: "übermäßig" }[semi - MAJOR_SEMI[num]] || null;
}

// Name aus Zahl und Qualität, z. B. „große Terz“, „verminderte Quinte“
export const intervalLabel = (num, quality) => `${quality}e ${INTERVAL_NAMES[num - 1]}`;
// Name des Intervalls von a nach b oder null
export function intervalName(a, b) {
  const q = intervalQuality(a, b);
  return q ? intervalLabel(intervalNumber(a, b), q) : null;
}

/* ---------- Tonarten aus der Vorzeichnung (Paket D) ---------- */
// fifths: Anzahl ♯ (positiv) bzw. ♭ (negativ), −7 bis 7. Grundton als { letter, acc }.
function tonicAt(fifths, letterShift, semiShift) {
  const letter = LETTERS[(((4 * fifths + letterShift) % 7) + 7) % 7];
  let acc = pc(7 * fifths + semiShift) - SEMI[letter];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  return { letter, acc };
}
// Dur: jedes ♯ eine Quinte höher, jedes ♭ eine Quinte tiefer (0 = C, 1 = G … 7 = Cis, −7 = Ces)
export const majorKeyFromKeySig = (fifths) => tonicAt(fifths, 0, 0);
// Parallele Molltonart: kleine Terz unter dem Dur-Grundton (C → a, Es → c)
export const relativeMinor = (fifths) => tonicAt(fifths, 5, -3);
// Namen: Dur groß geschrieben („Fis-Dur“), Moll klein („fis-Moll“, „es-Moll“)
export const majorName = (fifths) => gName(majorKeyFromKeySig(fifths)) + "-Dur";
export const minorName = (fifths) => gName(relativeMinor(fifths)).toLowerCase() + "-Moll";
