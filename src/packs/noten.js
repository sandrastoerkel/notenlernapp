// Paket „Noten lesen“: 15 Stufen im Violin- und Bassschlüssel, erst mit Hilfen, dann ohne (Welle 12, PLAN
// Abschnitt 2). Rechenkern in noten-lage.js, Hilfen in noten-hilfen.js, Vorführungen und Lerntafeln in
// noten-demo.js. Seit Schritt 3: Die acht Stufen mit Hilfen fragen in zwei Denkschritten (q.steps, PLAN
// Abschnitt 1 und 6) – Lage → Name (1, 2, 6, 7), Bezugston → Zählen (4, 9), Stammton → Vorzeichen (11, 13);
// die übrigen sieben bleiben einschrittig („Wie heißt die Note?“), ihre Auflösung nennt den Weg.
import { N, range, same, midi, pc, gName, helm, staffPos } from "../music.js";
import { staffSvg, noteSvg, S, BOTTOM, X0, X1, H } from "../staff.js";
import { pickWeighted } from "../adapt.js";
import { today } from "../store.js";
import { spruch, teileZu, wahlHtml, showHtml, esc } from "../sprueche.js";
import { displayName, lageText, spruchId, bezug, lage, stammton } from "./noten-lage.js";
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

// Zählweg außerhalb der Zeile (PLAN Abschnitt 6), z. B. „von der untersten Linie abwärts: E – D – C“; in der
// Zeile null. Die Namen sind die Stammtöne von der Bezugslinie bis zur Note (bezug, lückenlos im Alphabet).
const wegNamen = (b) => b.weg.map((x) => x.letter).join(" – ");
export function zaehlWeg(n, clef) {
  const b = bezug(n, clef);
  return b ? `von der ${b.linie === "unterste" ? "untersten" : "obersten"} Linie ${b.richtung}: ${wegNamen(b)}` : null;
}

// Rückmeldung bei „daneben“: Name, Lage und bei Linien und Zwischenräumen der gewählte Spruch, z. B.
// „Das war ein G (g') – 2. Linie von unten (Es Geht Hurtig Durch Fleiß).“; außerhalb der Zeile mit dem Zählweg
// (Welle 12): „Das war ein C (c') – auf der Hilfslinie unter der Zeile (von der untersten Linie abwärts: E – D – C).“
// Wird per textContent gezeigt.
export function revealText(n, clef, state) {
  return revealParts(n, clef, state).map((x) => x.t).join("");
}

// Dieselbe Rückmeldung in Teilen ({ t, mark }): Das Wort des Spruchs zur Stelle der Note ist markiert
// (Abschlussprüfung Welle 10, wortZu/teileZu), z. B. „… – 2. Linie von unten (Es [Geht] Hurtig Durch Fleiß).“
// Die Engine setzt die Teile als Text ein (textContent), das markierte Wort in ein eigenes Element.
export function revealParts(n, clef, state) {
  const id = spruchId(n, clef);
  const head = `Das war ein ${displayName(n)} – ${lageText(n, clef)}`;
  const weg = zaehlWeg(n, clef);
  if (weg) return [{ t: `${head} (${weg}).` }];
  if (!id) return [{ t: `${head}.` }];
  const p = staffPos(n, clef), [vor, wort, nach] = teileZu(state, id, Math.floor(p / 2));
  return [{ t: `${head} (${vor}` }, { t: wort, mark: true }, { t: `${nach}).` }].filter((x) => x.t);
}

export const PROMPT = "Wie heißt die Note?";

// Merkspruch zur Stelle der Note für die Vorführung „So liest du eine Note“ (noten-demo.js, Schritt 5): Die Engine
// ruft level.demo(q) ohne Spielstand, deshalb trägt die Aufgabe den gewählten Spruch als reinen Text mit:
// q.spruch = spruch(state, spruchId(note, clef)) – der Spruch, der für die Linien bzw. Zwischenräume des Schlüssels
// gilt (eigener Text des Kindes: nur als Text bzw. mit esc einsetzen). Ohne ctx.state der voreingestellte Spruch.
// Fehlt bei Noten außerhalb der Zeile und mit Vorzeichen (spruchId null: dort gibt es keinen Spruch).
export function spruchZu(n, clef, state) {
  const id = spruchId(n, clef);
  return id ? spruch(state, id) : null;
}

/* --- Zwei Denkschritte (Welle 12, Schritt 3; PLAN Abschnitt 1 und 6) ---
   Schritt 1 als Auswahl (Lage: 1. bis 5. Linie bzw. 1. bis 4. Zwischenraum, Ziffern) oder mit Buchstaben
   (Bezugston, Stammton), Schritt 2 mit Buchstaben bzw. Namensraster (set.note, engine.stepInput/checkStep). Die
   Texte nach Schritt 1 (ok/bad) und der Prompt von Schritt 2 nennen nie die Antwort von Schritt 2 (auch keinen
   Spruch). display = beide Schritte, partial = nur Schritt 1 daneben, reveal/revealParts wie in den Stufen ohne
   Hilfen (revealText). Nach der Antwort zeigt die Zeile beide Schritte in ihren Farben (revealSvg): Schritt 1
   violett an der Zeile und links in der Beschriftung, Schritt 2 grün rechts daneben; die Note selbst wird wie in
   allen Stufen von „Noten lesen“ grün bzw. rot (kein keepRow). */
export const ARTEN = ["lage", "zaehlen", "vorzeichen"];
const LAGE_WORT = { linie: "Linie", zwischenraum: "Zwischenraum" };
const LAGE_ART = { linie: "die", zwischenraum: "der" };
export const LAGE_PROMPT = {
  linie: "Auf welcher Linie liegt die Note? Zähle von unten.",
  zwischenraum: "In welchem Zwischenraum liegt die Note? Zähle von unten.",
};
export const LAGE_CHOICES = { linie: ["1.", "2.", "3.", "4.", "5."], zwischenraum: ["1.", "2.", "3.", "4."] };
// „nächstgelegene“ statt „nächste“ (Korrektur nach der Prüfung aus drei Perspektiven, L-C1/J-C5: „nächste“ lässt
// sich als „die folgende Linie“ lesen)
export const BEZUG_PROMPT = "Bezugston: Wie heißt die nächstgelegene Linie der Zeile?";
export const STAMM_PROMPT = "Stammton: Wie heißt die Note ohne ihr Vorzeichen?";
// Schritt 2 nennt das Ergebnis von Schritt 1 (Korrektur nach der Prüfung, J-B3: nach dem Wechsel stand „dort“
// nirgends mehr), nie die Antwort von Schritt 2: „4. Linie – wie heißt die Note?“, „Zähle vom E weiter: Wie heißt
// die Note?“, „Stammton F – und mit dem Vorzeichen?“
export const lageNamePrompt = (ort) => `${ort} – wie heißt die Note?`;
export const zaehlPrompt = (ref) => `Zähle vom ${ref.letter} weiter: Wie heißt die Note?`;
export const vzPrompt = (st) => `Stammton ${st.letter} – und mit dem Vorzeichen?`;
const stepTexts = (fact, badFact = fact) => ({ ok: `Richtig: ${fact}`, bad: `Nicht ganz: ${badFact}` });
const letterOf = (n) => ({ letter: n.letter, acc: 0 });
// Längstes Wort des Spruchs, das die Beschriftung der Auflösung noch zeigt (eigene Sprüche: bis 80 Zeichen)
export const WORT_MAX = 12;

// Schritte, Texte und Beschriftung der Auflösung je Art: { steps, display, partial, marks: [Schritt 1, Schritt 2] }
function zweiSchritte(art, n, clef, state) {
  const name = displayName(n);
  if (art === "lage") {
    const l = lage(n, clef), wort = LAGE_WORT[l.art], ort = `${l.nr}. ${wort}`;
    const w = teileZu(state, spruchId(n, clef), Math.floor(staffPos(n, clef) / 2))[1];
    return {
      steps: [
        { prompt: LAGE_PROMPT[l.art], choices: LAGE_CHOICES[l.art].slice(), digits: true, answer: `${l.nr}.`,
          ...stepTexts(`${ort} von unten.`, `Es ist ${LAGE_ART[l.art]} ${ort} von unten.`) },
        { prompt: lageNamePrompt(ort), note: "letters", answer: letterOf(n) },
      ],
      display: `${ort} → ${name}`,
      partial: `Der Name stimmt, ${LAGE_ART[l.art]} ${wort} nicht: ${ort} → ${name}.`,
      marks: [ort, w && w.length <= WORT_MAX ? `${w} → ${n.letter}` : n.letter],
    };
  }
  if (art === "zaehlen") {
    const b = bezug(n, clef), linie = `${b.linie} Linie ${b.ref.letter}`;
    const fact = `Die ${b.linie} Linie ist das ${b.ref.letter}.`;
    const way = `${linie} · ${b.richtung} ${wegNamen(b)} → ${name}`;
    return {
      steps: [
        { prompt: BEZUG_PROMPT, note: "letters", answer: letterOf(b.ref), ...stepTexts(fact) },
        { prompt: zaehlPrompt(b.ref), note: "letters", answer: letterOf(n) },
      ],
      display: way,
      partial: `Der Name stimmt, der Bezugston nicht: ${way}.`,
      marks: [linie, wegNamen(b)],
    };
  }
  // Vorzeichen: Stammton, dann der ganze Name (♯ „-is“, ♭ „-es“; aus H wird B)
  const st = stammton(n), zeichen = n.acc > 0 ? "♯" : "♭";
  const way = `Stammton ${st.letter} · ${zeichen} ${n.acc > 0 ? "erhöht" : "erniedrigt"} → ${name}`;
  return {
    steps: [
      { prompt: STAMM_PROMPT, note: "letters", answer: letterOf(st), ...stepTexts(`Ohne Vorzeichen ist das ein ${st.letter}.`) },
      { prompt: vzPrompt(st), note: "names", answer: { letter: n.letter, acc: n.acc } },
    ],
    display: way,
    partial: `Der Name stimmt, der Stammton nicht: ${way}.`,
    marks: [`Stammton ${st.letter}`, `${zeichen} → ${gName(n)}`],
  };
}

// Auflösung der zweischrittigen Stufen: dieselbe Zeile (gleiche Höhe, nichts springt), Schritt 1 violett an der
// Zeile (Linie bzw. Zwischenraum der Note, bei Noten außerhalb der Zeile die Bezugslinie), darunter die beiden
// Schritte als Beschriftung (marks; violett · grün). Klassen im CSS-Abschnitt „Noten lesen: Schritte“.
const yOf = (p) => BOTTOM - p * (S / 2);
export const MARK_Y = H - 8;
function revealSvgFor(art, n, clef, marks) {
  let under = "";
  if (art === "lage") {
    const p = staffPos(n, clef);
    under = p % 2 === 0
      ? `<line class="nl-s1-line" x1="${X0}" x2="${X1}" y1="${yOf(p)}" y2="${yOf(p)}"/>`
      : `<rect class="nl-s1-band" x="${X0}" y="${yOf(p + 1) + 1}" width="${X1 - X0}" height="${S - 2}"/>`;
  } else if (art === "zaehlen") {
    const y = yOf(bezug(n, clef).linie === "unterste" ? 0 : 8);
    under = `<line class="nl-s1-line" x1="${X0}" x2="${X1}" y1="${y}" y2="${y}"/>`;
  }
  const label = `<text class="nl-steps" x="170" y="${MARK_Y}" text-anchor="middle"><tspan class="nl-s1">${esc(marks[0])}</tspan><tspan class="nl-sep"> · </tspan><tspan class="nl-s2">${esc(marks[1])}</tspan></text>`;
  // Die Linie bzw. der Zwischenraum liegt unter der Note (zuerst gezeichnet)
  return staffSvg(clef, under + noteSvg(n, clef, 170) + label, { cls: `nl-reveal ${ZWEI}` });
}

// Klasse an der Zeile der zweischrittigen Aufgaben (Frage und Auflösung): Daran richtet der CSS-Abschnitt „Noten
// lesen: Schritte“ den Antwortbereich aus, damit beim Wechsel Auswahl → Buchstaben nichts springt
export const ZWEI = "nl-zwei";

function makeQuestion(it, state, art) {
  const base = {
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
  const sp = spruchZu(it.n, it.clef, state);
  if (sp !== null) base.spruch = sp;
  if (!art) return base;
  const z = zweiSchritte(art, it.n, it.clef, state);
  return {
    ...base,
    svg: staffSvg(it.clef, noteSvg(it.n, it.clef, 170), { cls: ZWEI }),
    prompt: z.steps[0].prompt,
    steps: z.steps,
    display: z.display,
    partial: z.partial,
    revealSvg: revealSvgFor(art, it.n, it.clef, z.marks),
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
// Stufe 11 (mit Hilfen): der Weg und je ein Beispiel für ♯ und ♭ mit den drei Ausnahmen, im Wortlaut der Hilfe
// „Vorzeichen“ (REGEL in noten-hilfen.js). Korrektur nach der Prüfung aus drei Perspektiven (J-B4, L-C2, offener
// Punkt 1): vorher zehn Zeilen, „Runde starten“ bei 320 × 640 erst bei 593 px, mit Empfehlung der erste Knopf bei
// 641 px (Grenze 580). Gemessen Zeile für Zeile: Hinweis mit „Beide Schritte müssen stimmen.“ 232 → 139 px. Die ganze
// Regel steht in den Hilfen derselben Stufe, alle 21 Namen im Namensraster und in der Lerntafel.
// Pfeile mit geschütztem Leerzeichen (bei 320 px brach „F →“ sonst vor „Fis“ um).
const pf = (a, b) => `${a}\u00a0→\u00a0${b}`;
const VZ_KURZ = `Lies erst den Stammton (ohne Vorzeichen), dann das Zeichen.\n♯ Halbton höher, „-is“: ${pf("F", "Fis")}.\n♭ Halbton tiefer, „-es“: ${pf("D", "Des")}, aber ${pf("E", "Es")}, ${pf("A", "As")}, ${pf("H", "B")}.`;
// Stufe 12 mit dem Satz zur Eingabe; in Stufe 11 sagt ihn der Tastatur-Hinweis (keysHint), damit die Startkarte mit
// „Beide Schritte müssen stimmen.“ nicht länger wird (Schritt 3, gemessen bei 320 px)
// Stufe 12 (ohne Hilfen): dieselbe Regel in kürzerer Form (Schritt 7, gemessen bei 320 × 640 mit Empfehlung: erster
// Knopf vorher bei 622 px, Grenze 580; wie Sandras Entscheidung Welle 11, 20 „leicht kürzen“). „und hängt … an“
// entfällt („-is“ bleibt), ♭ beginnt mit Des, der Satz zur Eingabe hängt am ♭-Satz und nennt das Beispiel „fis“
// nicht mehr – das steht auf derselben Karte im Tastatur-Hinweis („Namen tippen, z. B. fis …, dann Enter“). Alle Namen
// des Vorrats, „-is“ und „aus H wird B“ bleiben.
const VZ_HINT = "♯ erhöht um einen Halbton, „-is“: aus F wird Fis, ebenso Cis, Gis, Dis.\n♭ erniedrigt um einen Halbton: aus D wird Des, aus E wird Es, aus A wird As, aus H wird B. Tippe den ganzen Namen an oder schreib ihn.";
const ZEILE_HINT = "Linien und Zwischenräume gemischt, jetzt ohne Hilfen. Erst die Lage, dann der Name.";
const BASS_VZ_HINT = "♯ und ♭ bedeuten im Bassschlüssel dasselbe. Lies erst den Stammton im Bassschlüssel, dann das Zeichen.";
// Satz aus dem bisherigen Hinweis der Stufe „Linien im Bassschlüssel“, jetzt in der Lerntafel „Merkhilfen“ (Abschnitt 5)
export const BASS_VERGLEICH = "Dieselbe Linie wie im Violinschlüssel heißt im Bassschlüssel zwei Notennamen weiter: Aus E wird G, aus G wird H.";

// Hilfen (PLAN Abschnitt 3): Überschrift, Satz und Tabelle aus noten-hilfen.js (Gerüst bis Schritt 4)
const H_LINIEN = "Zähle die Linien von unten. Das Wort im Merkspruch beginnt mit dem Notennamen.";
const H_RAEUME = "Zähle die Zwischenräume von unten. Das Wort im Merkspruch beginnt mit dem Notennamen.";
const H_AUSSEN = "Nimm die nächstgelegene Linie der Zeile als Bezugston. Jede Stelle weiter ist ein Name weiter: nach oben vorwärts, nach unten rückwärts.";
const H_VZ = "Lies erst den Stammton (die Note ohne Vorzeichen), dann das Zeichen.";
const helps = (helpsTitle, helpText, helpTable) => ({ helps: ["tabelle"], helpsTitle, helpText, helpTable });
const mkLinien = (clef) => helps("Hilfen: Merkspruch für die Linien", H_LINIEN, (c) => merkleiste(clef, "linien", c && c.state));
const mkRaeume = (clef) => helps("Hilfen: Merkspruch für die Zwischenräume", H_RAEUME, (c) => merkleiste(clef, "raeume", c && c.state));
// Namensleiste mit der Zeile „Linien von unten: <Merkspruch>“ des Schlüssels (noten-hilfen.js, Schritt 4)
const mkAussen = (clef) => helps("Hilfen: Notennamen der Reihe nach", H_AUSSEN, (c) => namensleiste(clef, c && c.state));
const mkVz = () => helps("Hilfen: Vorzeichen", H_VZ, () => vorzeichenRegel());

// Vorführungen (PLAN Abschnitt 4; Gerüst bis Schritt 5): q ist die eben gelöste Aufgabe
// art: die beiden Denkschritte der Stufe (zweiSchritte); keysHint ersetzt den Tastatur-Hinweis der Startkarte.
// lageDemo(q) liest q.note, q.clef und q.spruch (siehe spruchZu).
const kbd = (t) => `<span class="kbd">${t}</span>`;
// Kurz: bei 320 px eine Zeile (Startkarte nicht länger als vor Schritt 3)
const KEYS_LETTERS = `${kbd("C")} … ${kbd("H")}`;
const D_LAGE = { art: "lage", demo: (q) => lageDemo(q) };
const D_ZAEHLEN = { art: "zaehlen", demo: (q) => zaehlDemo(bezug(q.note, q.clef).ref, q.note, q.clef) };
const D_VZ = { art: "vorzeichen", demo: (q) => vorzeichenDemo(q.note, q.clef),
  keysHint: `Tastatur: ${KEYS_LETTERS}, dann Namen tippen, z. B. ${kbd("fis")} ${kbd("Enter")}` };
const K_LINIEN = { keysHint: `Tastatur: ${kbd("1")} … ${kbd("5")}, dann ${KEYS_LETTERS}` };
const K_RAEUME = { keysHint: `Tastatur: ${kbd("1")} … ${kbd("4")}, dann ${KEYS_LETTERS}` };

const RAW = [
  { clef: "treble", title: "Linien im Violinschlüssel", items: VORRAT.violinLinien, ...mkLinien("treble"), ...D_LAGE, ...K_LINIEN,
    hint: (c) => `Zähle die Linien von unten. E G H D F, Merkspruch: „${merk(c, "violin-linien")}“.` },
  { clef: "treble", title: "Zwischenräume im Violinschlüssel", items: VORRAT.violinRaeume, ...mkRaeume("treble"), ...D_LAGE, ...K_RAEUME,
    hint: (c) => `Zähle die Zwischenräume von unten. F A C E, Merkspruch: „${merk(c, "violin-raeume")}“.` },
  { clef: "treble", title: "Violinschlüssel: Linien und Zwischenräume", items: VORRAT.violinZeile, hint: ZEILE_HINT },
  { clef: "treble", title: "Violinschlüssel: über und unter der Zeile", items: VORRAT.violinAussen, ...mkAussen("treble"), ...D_ZAEHLEN,
    hint: "Neu sind vier Noten außerhalb der Zeile. Zähle vom Bezugston weiter, der nächstgelegenen Linie. Das c' liegt auf einer Hilfslinie unter der Zeile." },
  { clef: "treble", title: "Violinschlüssel mit Hilfslinien", items: VORRAT.violin,
    hint: "Alle Noten von c' bis a'' gemischt, jetzt ohne Hilfen. Das c' liegt auf einer Hilfslinie unter der Zeile." },
  { clef: "bass", title: "Linien im Bassschlüssel", items: VORRAT.bassLinien, ...mkLinien("bass"), ...D_LAGE, ...K_LINIEN,
    hint: (c) => `Zähle die Linien von unten. G H D F A, Merkspruch: „${merk(c, "bass-linien")}“.\nDie beiden Punkte des Schlüssels umschließen das F.` },
  { clef: "bass", title: "Zwischenräume im Bassschlüssel", items: VORRAT.bassRaeume, ...mkRaeume("bass"), ...D_LAGE, ...K_RAEUME,
    hint: (c) => `Zähle die Zwischenräume von unten. A C E G, Merkspruch: „${merk(c, "bass-raeume")}“.` },
  { clef: "bass", title: "Bassschlüssel: Linien und Zwischenräume", items: VORRAT.bassZeile, hint: ZEILE_HINT },
  { clef: "bass", title: "Bassschlüssel: über und unter der Zeile", items: VORRAT.bassAussen, ...mkAussen("bass"), ...D_ZAEHLEN,
    hint: "Neu sind vier Noten außerhalb der Zeile. Zähle vom Bezugston weiter, der nächstgelegenen Linie. Das c' liegt auf einer Hilfslinie über der Zeile, das E auf einer darunter." },
  { clef: "bass", title: "Bassschlüssel mit Hilfslinien", items: VORRAT.bass,
    hint: "Das c' liegt im Bassschlüssel auf einer Hilfslinie über der Zeile, das E ganz unten." },
  { clef: "treble", title: "Vorzeichen im Violinschlüssel", acc: true, items: VORRAT.violinVorzeichen, ...mkVz(), ...D_VZ,
    hint: VZ_KURZ },
  { clef: "treble", title: "Vorzeichen im Violinschlüssel ohne Hilfen", acc: true, items: VORRAT.violinVorzeichen, hint: VZ_HINT },
  { clef: "bass", title: "Vorzeichen im Bassschlüssel", acc: true, items: VORRAT.bassVorzeichen, ...mkVz(), ...D_VZ,
    hint: "♯ und ♭ bedeuten im Bassschlüssel dasselbe. Lies erst den Stammton, dann das Zeichen." },
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
  4: { stepNeeds: [["noten-3"], []] },
  5: { skill: "Noten im Violinschlüssel" },
  6: { needs: [] },
  7: { needs: [] },
  8: { needs: [], skill: "Linien und Zwischenräume im Bassschlüssel" },
  9: { stepNeeds: [["noten-8"], []] },
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
  // Untertitel: Schlüssel und Zahl der Noten, bei Stufen mit Hilfen (alle zweischrittig) „· zwei Schritte · mit
  // Hilfen“ wie in Notenwerte (PLAN Abschnitt 2)
  subtitle: `${clefLabel(r.clef)} · ${r.items.length} Noten${r.art ? " · zwei Schritte" : ""}${r.helps ? " · mit Hilfen" : ""}`,
  hint: r.hint,
  input: "letters",
  acc: !!r.acc,
  clef: r.clef,
  items: r.items,
  ...(r.helps ? { helps: r.helps, helpsTitle: r.helpsTitle, helpText: r.helpText, helpTable: r.helpTable } : {}),
  ...(r.demo ? { demo: r.demo } : {}),
  // Zweischrittig (q.steps): Startkarte „Beide Schritte müssen stimmen.“, Beschriftung der Wahl über levelNoteSteps
  ...(r.art ? { twoSteps: true, art: r.art } : {}),
  ...(r.keysHint ? { keysHint: r.keysHint } : {}),
  // Feste Beispielnote für die Startkarte der Stufe
  example: makeQuestion(r.items[0]).svg,
  // Mit ctx.notes (Fortschritt je Note) öfter die Noten, die noch nicht sitzen (Gewicht nach Tagen mit ctx.heute,
  // W-C4, ohne ctx.heute der örtliche Tag wie in „Intervalle“); sonst gleichverteilt. ctx.state: Spielstand für den gewählten Merkspruch in der Rückmeldung
  question(prev, ctx) {
    return makeQuestion(ctx && ctx.notes ? pickWeighted(r.items, itemKey, ctx.notes, prev, ctx.rand || Math.random, ctx.heute || today()) : pick(r.items, prev), ctx && ctx.state, r.art);
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
