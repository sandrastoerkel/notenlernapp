// Rechenkern „Noten lesen“ (Welle 12, PLAN Abschnitt 1 und 12, Schritt 2): Lage einer Note in der Zeile,
// Bezugston außerhalb der Zeile, Stammton, Namen und Texte. Rein, ohne DOM. Eigene Datei, damit noten.js,
// noten-hilfen.js und noten-demo.js sie gemeinsam benutzen, ohne dass ein Kreis zwischen den Dateien entsteht.
// Alles hier wird aus music.js (staffPos, dia, fromDia) gerechnet; die Schritte 3 bis 5 benutzen es nur.
import { N, gName, helm, staffPos, dia, fromDia } from "../music.js";

// Namen der beiden Denkschritte je Art (Marken der Vorführungen, PLAN Abschnitt 4)
export const SCHRITTE = Object.freeze({
  lage: Object.freeze(["1 · Lage", "2 · Name"]),
  zaehlen: Object.freeze(["1 · Bezugston", "2 · Zählen"]),
  vorzeichen: Object.freeze(["1 · Stammton", "2 · Vorzeichen"]),
});

// Stellen der Zeile (staffPos): 0, 2 … 8 Linien, 1, 3 … 7 Zwischenräume, je von unten
export const UNTERSTE = 0, OBERSTE = 8;

// Name mit Oktave für die Rückmeldung: „G (g')“; große Oktave „G (großes G)“ statt „G (G)“ (Welle 10, B3)
export const displayName = (n) => (n.octave === 2 ? `${gName(n)} (großes ${gName(n)})` : `${gName(n)} (${helm(n)})`);

// Die Note ohne ihr Vorzeichen (gleiche Stelle in der Zeile)
export const stammton = (n) => N(n.letter, n.octave, 0);

// Lage in der Zeile: { pos, art, nr }. art "linie" (nr 1 … 5) bzw. "zwischenraum" (nr 1 … 4), je von unten
// gezählt; außerhalb der Zeile art "unter" bzw. "ueber" und nr null (dort gilt der Bezugston, siehe bezug).
export function lage(n, clef) {
  const pos = staffPos(n, clef);
  if (pos >= UNTERSTE && pos <= OBERSTE) {
    return pos % 2 === 0 ? { pos, art: "linie", nr: pos / 2 + 1 } : { pos, art: "zwischenraum", nr: (pos + 1) / 2 };
  }
  return { pos, art: pos < UNTERSTE ? "unter" : "ueber", nr: null };
}

// Bezugston einer Note außerhalb der Zeile (PLAN Abschnitt 1, Frage 2 a): die nächste äußere Linie der Zeile
// (unter der Zeile die unterste, darüber die oberste). { linie: "unterste" | "oberste", ref, richtung: "abwärts" |
// "aufwärts", weg }: ref ist die Note auf dieser Linie (ohne Vorzeichen), weg die Stammtöne Stelle für Stelle von
// ref bis zur Note (beide eingeschlossen). In der Zeile null.
export function bezug(n, clef) {
  const { pos } = lage(n, clef);
  if (pos >= UNTERSTE && pos <= OBERSTE) return null;
  const unten = pos < UNTERSTE;
  const linePos = unten ? UNTERSTE : OBERSTE;
  const d0 = dia(n) - pos + linePos, d1 = dia(n), step = unten ? -1 : 1;
  const weg = [];
  for (let d = d0; d !== d1 + step; d += step) weg.push(fromDia(d));
  return { linie: unten ? "unterste" : "oberste", ref: fromDia(d0), richtung: unten ? "abwärts" : "aufwärts", weg };
}

// Lage als Text (rein, Welle 10, B3), aus staffPos: 0, 2 … 8 Linien, 1 … 7 Zwischenräume (je von unten
// gezählt), −1/9 unter/über der Zeile ohne Hilfslinie, −2/10 auf der Hilfslinie. Weiter außen (kommt in den
// Stufen nicht vor) mit der Zahl der Hilfslinien. Bei Vorzeichen: „…, mit ♯: aus F wird Fis“ bzw. „…, mit ♭:
// aus H wird B“.
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
