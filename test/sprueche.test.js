// Merksprüche wählbar (Welle 10, Schritt 4): Modul sprueche.js, Spielstand, Anzeige in Hinweisen,
// Rückmeldung (B3) und Lerntafeln, Sicherheit des eigenen Texts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MERKHILFEN, SPRUCH_MAX, initials, checkSpruch, meldung, spruch, wortZu, aktiv, waehle, setzeEigen, wahlHtml, showHtml, esc } from "../src/sprueche.js";
import { fresh, load, save, reset, KEY_V2 } from "../src/store.js";
import { N, staffPos, helm } from "../src/music.js";
import { textOf, makeRound, feedbackText, helpsHtml } from "../src/engine.js";
import noten, { lageText, revealText, displayName, PROMPT, LEGEND, legendHtml } from "../src/packs/noten.js";
import tonleitern, { SHARPS_ALL, FLATS_ALL, circleBoard } from "../src/packs/tonleitern.js";
import { learnCardsHtml } from "../src/views/learn.js";
import { startHint } from "../src/views/practice.js";
import { PACKS } from "../src/packs/index.js";
import akkorde, { circleRing, circleHtml } from "../src/packs/akkorde.js";

const memStorage = (init = {}) => {
  const data = { ...init }; let writes = 0;
  return { data, get writes() { return writes; }, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { writes++; data[k] = String(v); } };
};

test("Tabelle der Merkhilfen wie im Plan (Kennungen, Buchstaben, Vorschläge)", () => {
  assert.deepEqual(Object.keys(MERKHILFEN), ["violin-linien", "violin-raeume", "bass-linien", "bass-raeume", "kreuze", "kreuz-tonarten", "be-tonarten", "bes"]);
  const L = (id) => MERKHILFEN[id].buchstaben.join(" ");
  assert.equal(L("violin-linien"), "E G H D F");
  assert.equal(L("violin-raeume"), "F A C E");
  assert.equal(L("bass-linien"), "G H D F A");
  assert.equal(L("bass-raeume"), "A C E G");
  assert.equal(L("kreuze"), "F C G D A E H");
  assert.equal(L("kreuz-tonarten"), "G D A E H F");
  assert.equal(L("be-tonarten"), "F B E A D G");
  assert.equal(L("bes"), "B E A D G");
  assert.deepEqual(MERKHILFEN["bass-linien"].vorschlaege, ["Gute Hunde Dürfen Fast Alles"]);
  assert.deepEqual(MERKHILFEN["bass-raeume"].vorschlaege, ["Alle Clowns Essen Gern"]);
  assert.deepEqual(MERKHILFEN["be-tonarten"].vorschlaege, ["Frische Brezen Essen Asse Des Gesangs"]);
  assert.deepEqual(MERKHILFEN["kreuz-tonarten"].vorschlaege, ["Geh Du Alter Esel Hole Fische"]);
  assert.equal(MERKHILFEN.kreuze.vorschlaege.length, 3);
  assert.equal(MERKHILFEN.bes.von, "be-tonarten");
});

test("Jeder Vorschlag passt Wort für Wort zu seinen Buchstaben", () => {
  for (const [id, m] of Object.entries(MERKHILFEN)) for (const v of m.vorschlaege || []) {
    const r = checkSpruch(id, v);
    assert.ok(r.ok, `${id}: ${v} → ${r.ist.join(" ")}`);
    assert.deepEqual(r.ist, m.buchstaben, v);
    assert.equal(r.stelle, null);
  }
  // die abgeleitete Reihe der Be passt ebenso
  assert.ok(checkSpruch("bes", spruch(fresh(), "bes")).ok);
});

test("initials: Leerzeichen und Bindestrich trennen, Apostroph gehört zum Wort, Umlaut bleibt Umlaut", () => {
  assert.deepEqual(initials("Fritz Aß Citronen-Eis"), ["F", "A", "C", "E"]);
  assert.deepEqual(initials("Fünf Cowboys Gehen Durch Alle Einkaufs-Hallen"), ["F", "C", "G", "D", "A", "E", "H"]);
  assert.deepEqual(initials("Frische Croissants Gibt's Donnerstags Am Ersten Haus"), ["F", "C", "G", "D", "A", "E", "H"]);
  assert.deepEqual(initials("es geht hurtig durch fleiß"), ["E", "G", "H", "D", "F"]);
  assert.deepEqual(initials("  „Es  Geht – Hurtig“ "), ["E", "G", "H"]);
  assert.deepEqual(initials("Äpfel Öl Übung"), ["Ä", "Ö", "Ü"]);
  assert.deepEqual(initials(""), []);
  assert.deepEqual(initials(null), []);
});

test("checkSpruch und meldung: Anzahl, Buchstabe, Bindestrich, Apostroph, Umlaut, leer, zu lang", () => {
  const r1 = checkSpruch("violin-linien", "Es Geht Langsam Durch Fleiß");
  assert.deepEqual([r1.ok, r1.stelle, r1.grund], [false, 3, "buchstabe"]);
  assert.equal(meldung(r1), "Das 3. Wort muss mit H beginnen.");
  const r2 = checkSpruch("violin-linien", "Es Geht Hurtig");
  assert.deepEqual([r2.ok, r2.stelle, r2.grund], [false, 4, "fehlt"]);
  assert.equal(meldung(r2), "Es fehlen 2 Wörter.");
  assert.equal(meldung(checkSpruch("violin-linien", "Es Geht Hurtig Durch")), "Es fehlt 1 Wort.");
  const r3 = checkSpruch("violin-raeume", "Fritz Aß Citronen Eis Gern");
  assert.equal(r3.grund, "zuviel"); assert.equal(meldung(r3), "Das ist 1 Wort zu viel.");
  // Bindestrich: zwei Wörter, auch im eigenen Spruch
  assert.ok(checkSpruch("violin-raeume", "Frau Anna-Clara Erzählt").ok);
  assert.ok(!checkSpruch("violin-raeume", "Frau Annaclara Erzählt").ok);
  // Apostroph gehört zum Wort
  assert.ok(checkSpruch("bass-raeume", "Alle Clowns Essen's Gern").ok);
  // Umlaut zählt nicht als A, O, U
  const r4 = checkSpruch("bass-raeume", "Äpfel Clowns Essen Gern");
  assert.deepEqual([r4.ok, r4.stelle], [false, 1]);
  assert.equal(meldung(r4), "Das 1. Wort muss mit A beginnen.");
  // leer und zu lang
  const r5 = checkSpruch("bass-raeume", "   ");
  assert.equal(r5.grund, "leer"); assert.equal(meldung(r5), "Schreib 4 Wörter mit den Anfangsbuchstaben A C E G.");
  const long = "Alle " + "C".repeat(70) + " Essen Gern";
  assert.ok(long.length > SPRUCH_MAX);
  assert.equal(checkSpruch("bass-raeume", long).grund, "lang");
  assert.equal(meldung(checkSpruch("bass-raeume", long)), `Höchstens ${SPRUCH_MAX} Zeichen.`);
  assert.ok(checkSpruch("bass-raeume", "Alle " + "C".repeat(SPRUCH_MAX - 16) + " Essen Gern").ok);
  // Großschreibung egal
  assert.ok(checkSpruch("bass-raeume", "alle clowns essen gern").ok);
  assert.equal(meldung(checkSpruch("bass-raeume", "Alle Clowns Essen Gern")), "Passt: A C E G. Gespeichert.");
  // unbekannte Kennung
  assert.ok(!checkSpruch("gibt-es-nicht", "A").ok);
});

test("spruch: leerer, alter und neuer Spielstand; Wahl, eigener Text, ungültige Einträge", () => {
  assert.equal(spruch(undefined, "violin-linien"), "Es Geht Hurtig Durch Fleiß");
  assert.equal(spruch({}, "kreuze"), "Fünf Cowboys Gehen Durch Alle Einkaufs-Hallen");
  const old = fresh(); delete old.sprueche;
  assert.equal(spruch(old, "bass-linien"), "Gute Hunde Dürfen Fast Alles");
  const s = fresh();
  assert.deepEqual(s.sprueche, {});
  assert.ok(waehle(s, "kreuze", 2));
  assert.deepEqual(s.sprueche.kreuze, { wahl: 2 });
  assert.equal(spruch(s, "kreuze"), "Fritz Christian Geht Durch Alle Ecken Heim");
  assert.equal(aktiv(s, "kreuze"), 2);
  assert.ok(!waehle(s, "kreuze", 3) && !waehle(s, "kreuze", -1) && !waehle(s, "bes", 0) && !waehle(s, "x", 0));
  // eigener Spruch: nur gespeichert, wenn er passt
  const bad = setzeEigen(s, "violin-linien", "Ein Gutes Haus");
  assert.ok(!bad.ok); assert.equal(s.sprueche["violin-linien"], undefined);
  const good = setzeEigen(s, "violin-linien", "  Elefanten Gehen Heute Draußen Feiern ");
  assert.ok(good.ok);
  assert.deepEqual(s.sprueche["violin-linien"], { eigen: "Elefanten Gehen Heute Draußen Feiern" });
  assert.equal(spruch(s, "violin-linien"), "Elefanten Gehen Heute Draußen Feiern");
  assert.equal(aktiv(s, "violin-linien"), "eigen");
  // verfälschte Einträge (von Hand im Speicher) fallen auf die Voreinstellung zurück
  s.sprueche["violin-raeume"] = { eigen: "passt nicht" };
  s.sprueche["bass-raeume"] = { wahl: 7 };
  s.sprueche["bass-linien"] = "Unsinn";
  assert.equal(spruch(s, "violin-raeume"), "Fritz Aß Citronen-Eis");
  assert.equal(spruch(s, "bass-raeume"), "Alle Clowns Essen Gern");
  assert.equal(spruch(s, "bass-linien"), "Gute Hunde Dürfen Fast Alles");
});

test("bes folgt aus be-tonarten ohne das erste Wort", () => {
  const s = fresh();
  assert.equal(spruch(s, "bes"), "Brezen Essen Asse Des Gesangs");
  assert.ok(setzeEigen(s, "be-tonarten", "Fünf-Bären Essen Am Donnerstag Gemüse").ok);
  assert.equal(spruch(s, "bes"), "Bären Essen Am Donnerstag Gemüse");
  assert.ok(checkSpruch("bes", spruch(s, "bes")).ok);
  assert.ok(!setzeEigen(s, "bes", "Bären Essen Am Donnerstag Gemüse").ok || s.sprueche.bes === undefined);
  assert.equal(s.sprueche.bes, undefined);
});

test("wortZu: das Wort zur n-ten Stelle", () => {
  const s = fresh();
  assert.equal(wortZu(s, "violin-linien", 1), "Geht");
  assert.equal(wortZu(s, "violin-raeume", 2), "Citronen");
  assert.equal(wortZu(s, "violin-raeume", 3), "Eis");
  assert.equal(wortZu(s, "kreuze", 6), "Hallen");
  assert.equal(wortZu(s, "violin-linien", 9), "");
  waehle(s, "kreuze", 1);
  assert.equal(wortZu(s, "kreuze", 2), "Gibt's");
});

test("Spielstand: fresh mit sprueche, reset behält die Wahl, alter Stand lädt unverändert und wird nicht neu gespeichert", () => {
  const s = fresh();
  waehle(s, "kreuze", 1); setzeEigen(s, "bass-raeume", "Alle Clowns Essen Gurken");
  s.xp = 120;
  const r = reset(s);
  assert.equal(r.xp, 0);
  assert.deepEqual(r.sprueche, { kreuze: { wahl: 1 }, "bass-raeume": { eigen: "Alle Clowns Essen Gurken" } });
  // alter Stand ohne das Feld
  const old = fresh(); delete old.sprueche; old.xp = 7;
  const storage = memStorage({ [KEY_V2]: JSON.stringify(old) });
  const loaded = load(storage);
  assert.equal(storage.writes, 0, "nicht neu gespeichert");
  assert.equal(storage.data[KEY_V2], JSON.stringify(old));
  assert.deepEqual(loaded.sprueche, {});
  assert.equal(loaded.xp, 7);
  // neuer Stand: Wahl bleibt nach Speichern und Laden
  waehle(loaded, "kreuze", 2); save(loaded, storage);
  assert.equal(spruch(load(storage), "kreuze"), "Fritz Christian Geht Durch Alle Ecken Heim");
});

test("Sicherheit: eigener Spruch mit <b> und & wird nur als Text eingesetzt", () => {
  const s = fresh();
  const evil = `Es <b>Geht</b> Hurtig & Durch "Fleiß"`;
  // „<b>Geht</b>“ beginnt mit G? Nein: das Wort ist „<b>Geht</b>“, der erste Buchstabe ist b → gilt nicht
  assert.ok(!setzeEigen(s, "violin-linien", evil).ok);
  // so gespeichert, als hätte jemand den Speicher verändert, und mit passendem Text
  const sly = "Es Geht<b>x</b> Hurtig Durch Fleiß&amp;<img>";
  assert.ok(setzeEigen(s, "violin-linien", sly).ok, "Buchstaben passen, also gespeichert");
  for (const html of [wahlHtml(s, "violin-linien"), showHtml(s, "violin-linien"), legendHtml("treble", s),
    learnCardsHtml(PACKS, "treble", { state: s })]) {
    assert.ok(!html.includes("<b>x</b>") && !html.includes("<img"), html.slice(0, 120));
    assert.ok(html.includes("Geht&lt;b&gt;x&lt;/b&gt;") && html.includes("&amp;amp;&lt;img"), "maskiert");
  }
  assert.equal(esc(`<b>&"`), "&lt;b&gt;&amp;&quot;");
  // Hilfetexte der Tonleitern (HTML) setzen den Spruch maskiert ein
  assert.ok(setzeEigen(s, "kreuze", "Fünf <b>C</b>owboys Gehen Durch Alle Ecken Heim&").ok === false);
  s.sprueche.kreuze = { eigen: "Fünf Cowboys Gehen Durch Alle Ecken Heim<b>&</b>" };
  assert.ok(checkSpruch("kreuze", s.sprueche.kreuze.eigen).ok);
  const t8 = tonleitern.levels.find((l) => l.no === 8);
  const h = helpsHtml(t8, makeRound(t8, 1)[0], { state: s });
  assert.ok(h.includes("Heim&lt;b&gt;&amp;&lt;/b&gt;") && !h.includes("<b>&</b>"));
  // Hinweise und Rückmeldungen sind Text (textContent): dort steht der Spruch wörtlich
  assert.ok(startHint(t8, { state: s }).includes("Heim<b>&</b>"));
});

test("Auswahl-HTML: Vorschläge, eigener Spruch, Hervorhebung, zugänglich", () => {
  const s = fresh();
  let html = wahlHtml(s, "kreuze");
  assert.equal((html.match(/type="radio"/g) || []).length, 4);
  assert.equal((html.match(/spruch-opt on/g) || []).length, 1);
  assert.ok(html.includes('value="0" checked'));
  assert.ok(html.includes('maxlength="80"') && html.includes('aria-label="Eigener Spruch: Reihenfolge der Kreuze') && html.includes("aria-describedby=") && html.includes('aria-live="polite"'));
  assert.ok(html.includes("<legend>"));
  waehle(s, "kreuze", 1);
  html = wahlHtml(s, "kreuze");
  assert.ok(html.includes('value="1" checked') && !html.includes('value="0" checked'));
  setzeEigen(s, "kreuze", "Fische Clowns Gibt Das Alles Ehrlich Heute");
  html = wahlHtml(s, "kreuze");
  assert.ok(html.includes('value="eigen" checked') && html.includes('value="Fische Clowns Gibt Das Alles Ehrlich Heute"'));
  assert.equal(wahlHtml(s, "bes"), "", "bes hat keine eigene Wahl");
});

test("B3: Lage einer Note für alle Noten der Stufen 3 und 6", () => {
  const T = ["auf der Hilfslinie unter der Zeile", "unter der Zeile, ohne Hilfslinie", "1. Linie von unten", "1. Zwischenraum von unten",
    "2. Linie von unten", "2. Zwischenraum von unten", "3. Linie von unten", "3. Zwischenraum von unten", "4. Linie von unten",
    "4. Zwischenraum von unten", "5. Linie von unten", "über der Zeile, ohne Hilfslinie", "auf der Hilfslinie über der Zeile"];
  const want = {
    3: ["c'", "d'", "e'", "f'", "g'", "a'", "h'", "c''", "d''", "e''", "f''", "g''", "a''"],
    6: ["E", "F", "G", "A", "H", "c", "d", "e", "f", "g", "a", "h", "c'"],
  };
  for (const no of [3, 6]) {
    const l = noten.levels[no - 1];
    assert.deepEqual(l.items.map((it) => helm(it.n)), want[no]);
    l.items.forEach((it, i) => assert.equal(lageText(it.n, it.clef), T[i], `${no} ${helm(it.n)}`));
    assert.deepEqual(l.items.map((it) => staffPos(it.n, it.clef)), [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }
  // Vorzeichen
  assert.equal(lageText(N("F", 4, 1), "treble"), "1. Zwischenraum von unten, mit ♯");
  assert.equal(lageText(N("H", 4, -1), "treble"), "3. Linie von unten, mit ♭");
  // weiter außen (in keiner Stufe): mit der Zahl der Hilfslinien
  assert.equal(lageText(N("H", 3), "treble"), "unter der 1. Hilfslinie unter der Zeile");
  assert.equal(lageText(N("A", 3), "treble"), "auf der 2. Hilfslinie unter der Zeile");
  assert.equal(lageText(N("C", 6), "treble"), "auf der 2. Hilfslinie über der Zeile");
});

test("B3: Frage, Name der großen Oktave, Rückmeldung mit dem gewählten Spruch", () => {
  assert.equal(PROMPT, "Wie heißt die Note?");
  assert.equal(displayName(N("G", 2)), "G (großes G)");
  assert.equal(displayName(N("G", 4)), "G (g')");
  assert.equal(displayName(N("C", 3)), "C (c)");
  const s = fresh();
  assert.equal(revealText(N("G", 4), "treble", s), "Das war ein G (g') – 2. Linie von unten (Es Geht Hurtig Durch Fleiß).");
  assert.equal(revealText(N("A", 4), "treble", s), "Das war ein A (a') – 2. Zwischenraum von unten (Fritz Aß Citronen-Eis).");
  assert.equal(revealText(N("C", 4), "treble", s), "Das war ein C (c') – auf der Hilfslinie unter der Zeile.");
  assert.equal(revealText(N("D", 4), "treble", s), "Das war ein D (d') – unter der Zeile, ohne Hilfslinie.");
  assert.equal(revealText(N("F", 4, 1), "treble", s), "Das war ein Fis (fis') – 1. Zwischenraum von unten, mit ♯.");
  assert.equal(revealText(N("G", 2), "bass", s), "Das war ein G (großes G) – 1. Linie von unten (Gute Hunde Dürfen Fast Alles).");
  assert.equal(revealText(N("C", 3), "bass", s), "Das war ein C (c) – 2. Zwischenraum von unten (Alle Clowns Essen Gern).");
  // gewählter (eigener) Spruch in der Rückmeldung einer Runde
  setzeEigen(s, "violin-linien", "Ein Grüner Hase Döst Friedlich");
  for (const q of makeRound(noten.levels[0], 10, { notes: {}, state: s })) {
    assert.equal(q.prompt, "Wie heißt die Note?");
    assert.ok(feedbackText(q, false).includes("(Ein Grüner Hase Döst Friedlich)"), q.reveal);
    assert.ok(feedbackText(q, true).length <= 45, "richtig: kurz, läuft von selbst weiter");
  }
  // statKey und Antwortprüfung unverändert
  const q = makeRound(noten.levels[3], 1, { state: s })[0];
  assert.match(q.statKey, /^[A-H]\w* \(.+, Bass\)$/);
  assert.ok(noten.levels[3].check(q, q.answer));
});

test("Hinweise Noten 1, 2, 4, 5 mit dem gewählten Spruch; Bass mit Sandras Sprüchen", () => {
  const s = fresh();
  const H = (no, st) => textOf(noten.levels[no - 1].hint, { state: st });
  assert.ok(H(1, s).includes("Merkspruch: „Es Geht Hurtig Durch Fleiß“."));
  assert.ok(H(2, s).includes("Merkspruch: „Fritz Aß Citronen-Eis“."));
  assert.ok(H(4, s).includes("Merkspruch: „Gute Hunde Dürfen Fast Alles“."));
  assert.ok(H(5, s).includes("Merkspruch: „Alle Clowns Essen Gern“."));
  // ohne ctx: Voreinstellung
  assert.ok(textOf(noten.levels[3].hint).includes("Gute Hunde Dürfen Fast Alles"));
  setzeEigen(s, "bass-linien", "Grüne Hasen Dürfen Fast Alles");
  assert.ok(H(4, s).includes("„Grüne Hasen Dürfen Fast Alles“"));
  assert.ok(startHint(noten.levels[3], { state: s }).includes("Grüne Hasen"));
});

test("Lerntafel „Merkhilfen“: gewählter Spruch und Auswahl je Schlüssel", () => {
  const s = fresh();
  waehle(s, "kreuze", 1);
  setzeEigen(s, "violin-raeume", "Fünf Affen Chillen Entspannt");
  const t = learnCardsHtml(PACKS, "treble", { state: s }), b = learnCardsHtml(PACKS, "bass", { state: s });
  assert.ok(t.includes('<span data-spruch-show="violin-raeume">Fünf Affen Chillen Entspannt</span>'));
  assert.ok(t.includes('data-spruch-wahl="violin-linien"') && t.includes('data-spruch-wahl="violin-raeume"'));
  assert.ok(b.includes('<span data-spruch-show="bass-linien">Gute Hunde Dürfen Fast Alles</span>'));
  assert.ok(b.includes('<span data-spruch-show="bass-raeume">Alle Clowns Essen Gern</span>'));
  assert.ok(b.includes('data-spruch-wahl="bass-linien"') && !b.includes('data-spruch-wahl="violin-linien"'));
  // Quintenzirkel (ohne Schlüssel, in beiden): Kreuze, ♯- und ♭-Tonarten zur Wahl, die Be daraus abgeleitet
  for (const html of [t, b]) {
    for (const id of ["kreuze", "kreuz-tonarten", "be-tonarten"]) assert.ok(html.includes(`data-spruch-wahl="${id}"`), id);
    assert.ok(html.includes(`<span data-spruch-show="kreuze">Frische Croissants Gibt's Donnerstags Am Ersten Haus</span>`));
    assert.ok(html.includes('<span data-spruch-show="bes">Brezen Essen Asse Des Gesangs</span>'));
  }
  // LEGEND: Spruch-Zeilen tragen die Kennung
  assert.deepEqual(LEGEND.bass.filter(([k]) => k === "Merkspruch").map(([, v]) => v.spruch), ["bass-linien", "bass-raeume"]);
});

test("Tonleitern: ganze Reihenfolge (aus music.js) und Sprüche in Stufe 8, 10, 11 und im Quintenzirkel", () => {
  assert.deepEqual(SHARPS_ALL, ["Fis", "Cis", "Gis", "Dis", "Ais", "Eis", "His"]);
  assert.deepEqual(FLATS_ALL, ["B", "Es", "As", "Des", "Ges", "Ces", "Fes"]);
  // die Be-Reihe ist die Kreuz-Reihe rückwärts (Stammtöne)
  assert.deepEqual(FLATS_ALL.map((x) => x[0]), [...SHARPS_ALL].reverse().map((x) => (x[0] === "H" ? "B" : x[0])));
  const s = fresh();
  const by = (no) => tonleitern.levels.find((l) => l.no === no);
  const h10 = startHint(by(10), { state: s });
  assert.ok(h10.includes("Kreuze: Fis Cis Gis Dis Ais Eis His („Fünf Cowboys Gehen Durch Alle Einkaufs-Hallen“)"), h10);
  assert.ok(h10.includes("Be: B Es As Des Ges Ces Fes – die Kreuz-Reihe rückwärts („Brezen Essen Asse Des Gesangs“ für die ersten fünf)"), h10);
  assert.ok(h10.includes("„Geh Du Alter Esel Hole Fische“") && h10.includes("„Frische Brezen Essen Asse Des Gesangs“"));
  waehle(s, "kreuze", 2);
  setzeEigen(s, "be-tonarten", "Frische Bananen Essen Affen Den Ganzen");
  assert.ok(startHint(by(10), { state: s }).includes("(„Fritz Christian Geht Durch Alle Ecken Heim“)"));
  assert.ok(startHint(by(10), { state: s }).includes("„Bananen Essen Affen Den Ganzen“ für die ersten fünf"));
  assert.ok(startHint(by(8), { state: s }).includes("Merksprüche: ♯ „Fritz Christian Geht Durch Alle Ecken Heim“, ♭ „Bananen Essen Affen Den Ganzen“."));
  assert.ok(textOf(by(11).hint, { state: s }).includes("♭: „Frische Bananen Essen Affen Den Ganzen“"));
  const q10 = makeRound(by(10), 1)[0];
  assert.ok(helpsHtml(by(10), q10, { state: s }).includes("♭-Tonarten: „Frische Bananen Essen Affen Den Ganzen“"));
  const cb = circleBoard(s);
  assert.ok(cb.includes("Fis Cis Gis Dis Ais Eis His") && cb.includes("B Es As Des Ges Ces Fes"));
  assert.ok(cb.includes('<span data-spruch-show="be-tonarten">Frische Bananen Essen Affen Den Ganzen</span>'));
});

test("Prüfung Schritt 4: zerlegte Umlaute (NFD) – gespeichert in NFC, bes schneidet an der richtigen Stelle", () => {
  const s = fresh();
  const nfd = "Fünf Bären Essen Äpfel Die Gären".normalize("NFD");
  assert.notEqual(nfd, nfd.normalize("NFC"));
  // „Äpfel“ beginnt mit Ä, nicht mit A – auch zerlegt
  assert.equal(setzeEigen(s, "be-tonarten", nfd).grund, "buchstabe");
  const ok = "Fünf Bären Essen Alle Dünne Gräten".normalize("NFD");
  assert.ok(setzeEigen(s, "be-tonarten", ok).ok);
  assert.equal(s.sprueche["be-tonarten"].eigen, "Fünf Bären Essen Alle Dünne Gräten");
  assert.equal(spruch(s, "bes"), "Bären Essen Alle Dünne Gräten");
  // von Hand zerlegt im Speicher: bes bleibt richtig geschnitten
  s.sprueche["be-tonarten"] = { eigen: ok };
  assert.equal(spruch(s, "bes"), "Bären Essen Alle Dünne Gräten");
  // 80 Zeichen zählen im NFC-Text
  const lang = ("Ü".repeat(15) + " ").repeat(5).trim();
  assert.equal(lang.length, 79);
  assert.notEqual(checkSpruch("violin-linien", lang.normalize("NFD")).grund, "lang");
});

test("Prüfung Schritt 4: Tafel „Quintenzirkel“ der Dreiklänge zeigt die gewählten Tonarten-Sprüche zum Ring", () => {
  // Reihen im Ring: ab G im Uhrzeigersinn, ab F gegen den Uhrzeigersinn (aus circleRing, nicht abgetippt)
  const ring = circleRing().map((e) => e.major.split("/"));
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((i) => ring[i][0]), "G D A E H Fis".split(" "));
  assert.deepEqual([11, 10, 9, 8, 7, 6].map((i) => ring[i][ring[i].length - 1]), "F B Es As Des Ges".split(" "));
  const s = fresh();
  let h = circleHtml(s);
  assert.ok(h.includes("<b>G D A E H Fis</b>") && h.includes("<b>F B Es As Des Ges</b>"));
  assert.ok(h.includes('<span data-spruch-show="kreuz-tonarten">Geh Du Alter Esel Hole Fische</span>'));
  assert.ok(h.includes('<span data-spruch-show="be-tonarten">Frische Brezen Essen Asse Des Gesangs</span>'));
  s.sprueche["be-tonarten"] = { eigen: "Faule Bären Essen Abends Dicke Gurken<b>&</b>" };
  h = akkorde.learn.find((c) => c.title === "Quintenzirkel").render({ state: s });
  assert.ok(h.includes("Gurken&lt;b&gt;&amp;&lt;/b&gt;") && !h.includes("<b>&</b>"));
  assert.ok(circleHtml().includes("Geh Du Alter Esel Hole Fische"), "ohne Spielstand die Voreinstellung");
});
