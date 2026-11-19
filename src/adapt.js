// Adaptive Auswahl: Zustand je Aufgabe aus { ok, bad, sec, timed, hist, hsec } und gewichtete Zufallsauswahl.
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
// Der Zustand kommt nur aus den letzten FENSTER Antworten, damit alte Fehler eine Note nicht lange rot halten.
export const FENSTER = 12;
// Eine einzelne Antwortzeit zählt höchstens so viele Sekunden (Wegschauen soll nicht langsam machen).
export const ZEIT_DECKEL = 10;
// Erst ab so vielen gemessenen richtigen Antworten kann eine Note langsam sein.
export const MIN_ZEITEN = 3;
// Gewichte je Zustand
export const GEWICHT = { neu: 2, unsicher: 4, langsam: 2, sicher: 1 };

// Kennzahlen, aus denen der Zustand berechnet wird: { ok, n, timed, avg }.
// Mit mindestens MIN_ANTWORTEN Einträgen im Verlauf hist ("1" richtig, "0" falsch, die letzten FENSTER)
// zählt nur der Verlauf, die Zeit aus hsec (die letzten FENSTER Zeiten richtiger Antworten).
// Sonst zählen die Gesamtwerte ok, bad, sec, timed (alte Spielstände ohne Verlauf).
// Beschädigte Einträge (hist kein Text, hsec keine Liste oder mit anderen Werten als Zahlen) ergeben nie NaN.
export function recent(entry) {
  const e = entry || {}, hist = typeof e.hist === "string" ? e.hist.slice(-FENSTER) : "";
  if (hist.length >= MIN_ANTWORTEN) {
    // beschädigte Daten: nur endliche Zahlen ab 0 zählen, höchstens FENSTER Stück
    const hsec = (Array.isArray(e.hsec) ? e.hsec : []).filter((t) => typeof t === "number" && Number.isFinite(t) && t >= 0).slice(-FENSTER);
    const ok = [...hist].filter((c) => c === "1").length;
    return { ok, n: hist.length, timed: hsec.length, avg: hsec.length ? hsec.reduce((a, b) => a + b, 0) / hsec.length : null };
  }
  const ok = e.ok || 0, timed = e.timed || 0;
  return { ok, n: ok + (e.bad || 0), timed, avg: timed ? (e.sec || 0) / timed : null };
}

// Zustand eines Eintrags: "neu", "unsicher", "langsam" oder "sicher".
// Langsam erst ab MIN_ZEITEN gemessenen Zeiten; alte Spielstände ohne Zeitmessung sind nie langsam.
export function status(entry) {
  const r = recent(entry);
  if (r.n < MIN_ANTWORTEN) return "neu";
  if (r.ok / r.n < QUOTE_SICHER) return "unsicher";
  if (r.timed >= MIN_ZEITEN && r.avg > LANGSAM_SEK) return "langsam";
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
