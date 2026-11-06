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

/* ---------- Dreiklänge, Quintenzirkel, Stufen (Paket „Dreiklänge und Quintenzirkel“) ---------- */

// Halbtonabstand von a nach b (positiv, wenn b höher klingt)
export const semis = (a, b) => midi(b) - midi(a);

// Stammton (diatonisch steps höher) mit dem Vorzeichen, das genau semi Halbtöne über n ergibt;
// null, wenn dafür ein Doppelvorzeichen nötig wäre
export function spell(n, steps, semi) {
  const base = transpose(n, steps, 0);
  const acc = midi(n) + semi - midi(base);
  return Math.abs(acc) > 1 ? null : N(base.letter, base.octave, acc);
}

// Dreiklangstypen: Halbtöne Grundton–Terz und Terz–Quinte
export const TRIAD_TYPES = {
  dur: { name: "Dur", steps: [4, 3] },
  moll: { name: "Moll", steps: [3, 4] },
  vermindert: { name: "vermindert", steps: [3, 3] },
  uebermaessig: { name: "übermäßig", steps: [4, 4] },
};

// Dreiklang in Grundstellung als gestapelte Terzen (Buchstaben Grundton, Terz, Quinte);
// null, wenn ein Ton ein Doppelvorzeichen bräuchte
export function triad(root, type) {
  const [a, b] = TRIAD_TYPES[type].steps;
  const third = spell(root, 2, a), fifth = spell(root, 4, a + b);
  return third && fifth ? [root, third, fifth] : null;
}

// Typ aus den beiden Halbtonabständen (Grundton–Terz, Terz–Quinte), sonst null
export function triadQuality(lower, upper) {
  for (const [k, t] of Object.entries(TRIAD_TYPES)) if (t.steps[0] === lower && t.steps[1] === upper) return k;
  return null;
}

// Grundton eines Dreiklangs (Töne in beliebiger Lage): der Ton, über dem die beiden anderen
// Buchstaben eine Terz und eine Quinte bilden; sonst null
export function triadRoot(notes) {
  const idx = notes.map((n) => LETTERS.indexOf(n.letter));
  for (let i = 0; i < notes.length; i++) {
    const rel = idx.map((x) => (x - idx[i] + 7) % 7).sort();
    if (notes.length === 3 && rel.join() === "0,2,4") return notes[i];
  }
  return null;
}

// Typ eines Dreiklangs in beliebiger Lage (über den Grundton bestimmt), sonst null
export function triadTypeOf(notes) {
  const root = triadRoot(notes);
  if (!root) return null;
  const ri = LETTERS.indexOf(root.letter);
  const byStep = (k) => notes.find((n) => (LETTERS.indexOf(n.letter) - ri + 7) % 7 === k);
  const t = byStep(2), f = byStep(4);
  return triadQuality(pc(semis(root, t)), pc(semis(t, f)));
}

// Umkehrung in enger Lage: k = 0 Grundstellung, 1 Sextakkord (Terz unten), 2 Quartsextakkord (Quinte unten).
// Der tiefste Ton wandert jeweils eine Oktave nach oben.
export function invert(notes, k) {
  let out = notes.slice();
  for (let i = 0; i < k; i++) { const [low, ...rest] = out; out = [...rest, N(low.letter, low.octave + 1, low.acc)]; }
  return out;
}

export const INVERSIONS = ["Grundstellung", "Sextakkord", "Quartsextakkord"];

// Umkehrung bestimmen: welcher Ton des Dreiklangs liegt unten (0 Grundton, 1 Terz, 2 Quinte); sonst -1
export function inversionOf(notes) {
  const root = triadRoot(notes);
  if (!root) return -1;
  const low = notes.reduce((a, b) => (dia(b) < dia(a) ? b : a));
  const k = (LETTERS.indexOf(low.letter) - LETTERS.indexOf(root.letter) + 7) % 7;
  return k === 0 ? 0 : k === 2 ? 1 : k === 4 ? 2 : -1;
}

// Quinte aufwärts (vier Buchstaben, sieben Halbtöne) bzw. abwärts; Oktave des Ergebnisses
// so, dass die Tonklasse zählt (für Tonarten). null bei Doppelvorzeichen.
export const fifthUp = (n) => spell(n, 4, 7);
export const fifthDown = (n) => spell(n, -4, -7);

// Grundton der Dur-Tonart mit sig Vorzeichen (♯ positiv, ♭ negativ, −7 bis 7), Oktave 4
export function majorTonic(sig) {
  let n = N("C", 4);
  for (let i = 0; i < Math.abs(sig); i++) {
    n = sig > 0 ? fifthUp(n) : fifthDown(n);
    n = N(n.letter, 4, n.acc);
  }
  return n;
}

// Die 15 Dur-Tonarten mit höchstens sieben Vorzeichen, im Quintenzirkel von Ces (7 ♭) bis Cis (7 ♯)
export const MAJOR_KEYS = Array.from({ length: 15 }, (_, i) => {
  const sig = i - 7, tonic = majorTonic(sig);
  return { sig, tonic, name: gName(tonic) + "-Dur" };
});

// Parallele Molltonart: kleine Terz unter dem Dur-Grundton (zwei Buchstaben, drei Halbtöne),
// Name klein geschrieben, z. B. C-Dur → a-Moll
export function relativeMinorOf(tonic) {
  const m = spell(tonic, -2, -3);
  return { tonic: m, name: gName(m).toLowerCase() + "-Moll" };
}

// Name eines Dreiklangs nach Schulkonvention: Dur groß („C-Dur“), Moll klein („a-Moll“),
// vermindert/übermäßig als Grundton in Kleinbuchstaben mit Typ („h vermindert“)
export function triadName(root, type) {
  const g = gName(root);
  if (type === "dur") return g + "-Dur";
  if (type === "moll") return g.toLowerCase() + "-Moll";
  return g.toLowerCase() + " " + TRIAD_TYPES[type].name;
}

// Dur-Tonleiter (sieben Töne) ab tonic: Ganz- und Halbtonschritte 2 2 1 2 2 2
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
export function majorScale(tonic) {
  return MAJOR_STEPS.map((s, i) => spell(tonic, i, s));
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Leitereigener Dreiklang auf Stufe deg (1 bis 7) in der Dur-Tonart von tonic, in Grundstellung
export function degreeTriad(tonic, deg) {
  const sc = majorScale(tonic);
  const tone = (k) => { const i = deg - 1 + k; const n = sc[i % 7]; return N(n.letter, n.octave + Math.floor(i / 7), n.acc); };
  return [tone(0), tone(2), tone(4)];
}
