// Adaptive Auswahl: Zustand je Aufgabe aus { ok, bad, sec, timed } und gewichtete Zufallsauswahl.
// Rein, ohne DOM. Getestet in test/adapt.test.js.

// Startwerte zum Justieren nach dem Test mit Kindern, keine Forschungswerte.
// Unter MIN_ANTWORTEN Antworten gilt eine Note als neu.
export const MIN_ANTWORTEN = 6;
// Trefferquote, ab der eine Note nicht mehr unsicher ist (0,7 = 70 %).
export const QUOTE_SICHER = 0.7;
// Durchschnittliche Antwortzeit richtiger Antworten in Sekunden, über der eine Note als langsam gilt.
export const LANGSAM_SEK = 4;
// Anteil der Züge, die gleichverteilt sind, damit gemischt bleibt und auch sichere Noten wiederkommen.
export const ANTEIL_ZUFALL = 0.3;
// Gewichte je Zustand
export const GEWICHT = { neu: 2, unsicher: 4, langsam: 2, sicher: 1 };

// Zustand eines Eintrags: "neu", "unsicher", "langsam" oder "sicher".
// Einträge ohne Zeitmessung (alte Spielstände) können nicht langsam sein.
export function status(entry) {
  const ok = (entry && entry.ok) || 0, bad = (entry && entry.bad) || 0, n = ok + bad;
  if (n < MIN_ANTWORTEN) return "neu";
  if (ok / n < QUOTE_SICHER) return "unsicher";
  const timed = entry.timed || 0;
  if (timed > 0 && (entry.sec || 0) / timed > LANGSAM_SEK) return "langsam";
  return "sicher";
}

export const weight = (entry) => GEWICHT[status(entry)];

// Anzahl der Schlüssel aus keys, deren Eintrag in notes unsicher ist
export const countUnsure = (notes, keys) => keys.filter((k) => status((notes || {})[k]) === "unsicher").length;

// Eine Aufgabe aus items wählen, nie dieselbe wie prev (Vergleich über keyOf, das Aufgaben und
// prev versteht). Mit Wahrscheinlichkeit ANTEIL_ZUFALL gleichverteilt, sonst nach weight.
// rand liefert Zahlen in [0, 1); ohne Angabe Math.random.
export function pickWeighted(items, keyOf, notes, prev, rand = Math.random) {
  const pk = prev ? keyOf(prev) : null;
  const cand = items.filter((it) => keyOf(it) !== pk);
  const list = cand.length ? cand : items;
  if (!notes || rand() < ANTEIL_ZUFALL) return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  const ws = list.map((it) => weight(notes[keyOf(it)]));
  let r = rand() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= ws[i];
    if (r < 0) return list[i];
  }
  return list[list.length - 1];
}
