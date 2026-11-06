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
