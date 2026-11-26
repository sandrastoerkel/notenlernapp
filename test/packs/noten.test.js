import { test } from "node:test";
import assert from "node:assert/strict";
import noten, { LEGEND, BLITZ_POOL, statKey, checkNote, HEAT_NOTES, NOTE_KEYS, VORRAT, BASS_VERGLEICH, legendHtml } from "../../src/packs/noten.js";
import { PACKS } from "../../src/packs/index.js";
import { N, same, staffPos, helm, gName } from "../../src/music.js";
import { staffSvg, noteSvg } from "../../src/staff.js";

test("Registry enthält nur fertige Pakete", () => {
  // „Noten lesen“ steht vorn; weitere Pakete kommen hinzu, sobald sie gebaut sind (kein null in der Liste)
  assert.equal(PACKS[0].id, "noten");
  assert.ok(PACKS.every((p) => p && p.id && p.levels.length));
  assert.equal(new Set(PACKS.map((p) => p.id)).size, PACKS.length);
});

test("15 Stufen mit eindeutigen IDs (Welle 12)", () => {
  assert.equal(noten.levels.length, 15);
  const ids = noten.levels.map((l) => l.id);
  assert.deepEqual(ids, Array.from({ length: 15 }, (_, i) => `noten-${i + 1}`));
  assert.equal(new Set(ids).size, 15);
  noten.levels.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.ok(l.title && l.hint && l.subtitle);
    assert.ok(l.example.startsWith("<svg"));
  });
  // Titel unterscheiden die Schlüssel (Listen „Heute“, Statistik): keine zwei gleich
  assert.equal(new Set(noten.levels.map((l) => l.title)).size, 15);
});

// PLAN Welle 12, Abschnitt 2: jede Note mit ihrer Lage (staffPos: 0, 2 … 8 Linien, 1 … 7 Zwischenräume)
const POS = (l) => l.items.map((it) => staffPos(it.n, it.clef));
const NAMES = (l) => l.items.map((it) => `${helm(it.n)}`).join(" ");
test("Vorrat je Stufe wie im Plan (Welle 12, Abschnitt 2)", () => {
  const L = noten.levels;
  assert.deepEqual(L.map((l) => l.items.length), [5, 4, 9, 4, 13, 5, 4, 9, 4, 13, 8, 8, 8, 8, 42]);
  assert.deepEqual(L.map((l) => l.clef), ["treble", "treble", "treble", "treble", "treble", "bass", "bass", "bass", "bass", "bass", "treble", "treble", "bass", "bass", "both"]);
  assert.equal(NAMES(L[0]), "e' g' h' d'' f''"); assert.deepEqual(POS(L[0]), [0, 2, 4, 6, 8]);
  assert.equal(NAMES(L[1]), "f' a' c'' e''"); assert.deepEqual(POS(L[1]), [1, 3, 5, 7]);
  assert.equal(NAMES(L[2]), "e' f' g' a' h' c'' d'' e'' f''"); assert.deepEqual(POS(L[2]), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(NAMES(L[3]), "d' c' g'' a''"); assert.deepEqual(POS(L[3]), [-1, -2, 9, 10]);
  assert.deepEqual(POS(L[4]), Array.from({ length: 13 }, (_, i) => i - 2));
  assert.equal(NAMES(L[5]), "G H d f a"); assert.deepEqual(POS(L[5]), [0, 2, 4, 6, 8]);
  assert.equal(NAMES(L[6]), "A c e g"); assert.deepEqual(POS(L[6]), [1, 3, 5, 7]);
  assert.equal(NAMES(L[7]), "G A H c d e f g a"); assert.deepEqual(POS(L[7]), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(NAMES(L[8]), "F E h c'"); assert.deepEqual(POS(L[8]), [-1, -2, 9, 10]);
  assert.deepEqual(POS(L[9]), Array.from({ length: 13 }, (_, i) => i - 2));
  assert.equal(NAMES(L[9]), "E F G A H c d e f g a h c'");
  assert.equal(NAMES(L[4]), "c' d' e' f' g' a' h' c'' d'' e'' f'' g'' a''");
  // Vorzeichen: die ersten vier ♯ und die ersten vier ♭, in beiden Schlüsseln dieselben Namen, alle in der Zeile
  const vz = (l) => l.items.map((it) => gName(it.n)).join(" ");
  for (const i of [10, 11, 12, 13]) {
    assert.equal(vz(L[i]), "Fis Cis Gis Dis B Es As Des", L[i].id);
    assert.ok(POS(L[i]).every((p) => p >= 0 && p <= 8), L[i].id);
    assert.ok(L[i].items.every((it) => it.n.acc !== 0), L[i].id);
  }
  assert.equal(NAMES(L[10]), "fis' cis'' gis' dis'' b' es'' as' des''");
  assert.equal(NAMES(L[12]), "fis cis gis dis B es as des");
  // Lagen im Bassschlüssel (Abschnitt 2): fis 4. Linie, cis 2. Zwischenraum, gis 4. Zwischenraum, dis 3. Linie,
  // B 2. Linie, es 3. Zwischenraum, as 5. Linie, des 3. Linie
  assert.deepEqual(POS(L[12]), [6, 3, 7, 4, 2, 5, 8, 4]);
  // 11 = 12, 13 = 14; 4/9 = 5/10 ohne 3/8; 3 = 1 + 2, 8 = 6 + 7 (als Menge); 15 = 5 + 10 + 12 + 14
  const key = (it) => statKey(it.n, it.clef);
  const keys = (l) => l.items.map(key);
  assert.deepEqual(keys(L[10]), keys(L[11]));
  assert.deepEqual(keys(L[12]), keys(L[13]));
  for (const [aus, alle, zeile] of [[3, 4, 2], [8, 9, 7]]) {
    assert.deepEqual([...keys(L[aus])].sort(), keys(L[alle]).filter((k) => !keys(L[zeile]).includes(k)).sort());
  }
  assert.deepEqual([...keys(L[2])].sort(), [...keys(L[0]), ...keys(L[1])].sort());
  assert.deepEqual([...keys(L[7])].sort(), [...keys(L[5]), ...keys(L[6])].sort());
  assert.deepEqual(L[14].items, [...L[4].items, ...L[9].items, ...L[11].items, ...L[13].items]);
  // keine Note doppelt, in keiner Stufe
  for (const l of L) assert.equal(new Set(keys(l)).size, l.items.length, l.id);
  // acc genau in 11–15; Hilfen genau in 1, 2, 4, 6, 7, 9, 11, 13
  assert.deepEqual(L.filter((l) => l.acc).map((l) => l.no), [11, 12, 13, 14, 15]);
  assert.deepEqual(L.filter((l) => l.helps).map((l) => l.no), [1, 2, 4, 6, 7, 9, 11, 13]);
  // benannte Vorräte
  assert.equal(VORRAT.gemischt.length, 42);
  assert.equal(BLITZ_POOL.length, 26);
  assert.deepEqual(BLITZ_POOL, [...L[4].items, ...L[9].items]);
  assert.ok(BLITZ_POOL.every((it) => it.n.acc === 0));
  // Startkarte zeigt die erste Note des Vorrats
  noten.levels.forEach((l) => assert.equal(l.example, staffSvg(l.items[0].clef, noteSvg(l.items[0].n, l.items[0].clef, 170))));
  assert.equal(noten.blitz.example, staffSvg("treble", noteSvg(N("F", 4), "treble", 170)));
});

test("Stufen mit Hilfen: Überschrift, Satz, Tabelle (Gerüst) und Vorführung; ohne Hilfen nichts davon", () => {
  const titles = { 1: "Hilfen: Merkspruch für die Linien", 6: "Hilfen: Merkspruch für die Linien", 2: "Hilfen: Merkspruch für die Zwischenräume", 7: "Hilfen: Merkspruch für die Zwischenräume", 4: "Hilfen: Notennamen der Reihe nach", 9: "Hilfen: Notennamen der Reihe nach", 11: "Hilfen: Vorzeichen", 13: "Hilfen: Vorzeichen" };
  for (const l of noten.levels) {
    if (titles[l.no]) {
      assert.deepEqual(l.helps, ["tabelle"], l.id);
      assert.equal(l.helpsTitle, titles[l.no]);
      assert.ok(typeof l.helpText === "string" && l.helpText.length > 10);
      const t = typeof l.helpTable === "function" ? l.helpTable({ state: { sprueche: {} } }) : l.helpTable;
      assert.ok(typeof t === "string" && t.startsWith("<"), l.id);
      assert.ok(l.subtitle.endsWith(" · mit Hilfen"), l.id);
      // Vorführung: gültig für jede Aufgabe der Stufe
      for (const it of l.items) {
        const d = l.demo({ note: it.n, clef: it.clef });
        assert.equal(d.steps.length, 2);
        assert.ok(d.frames.length >= 2 && d.frames.length <= 5);
        assert.equal(d.frames[0].step, 0);
        assert.equal(d.frames.at(-1).step, 3);
      }
    } else {
      assert.ok(!l.helps && !l.demo && !l.helpTable, l.id);
      assert.ok(!l.subtitle.includes("Hilfen"), l.id);
    }
  }
});

test("statKey und checkNote", () => {
  assert.equal(statKey(N("F", 4, 1), "treble"), "Fis (fis', Violin)");
  assert.equal(statKey(N("G", 2), "bass"), "G (G, Bass)");
  assert.equal(statKey(N("H", 4, -1), "treble"), "B (b', Violin)");
  assert.equal(statKey(N("C", 4), "bass"), "C (c', Bass)");
  const q = { note: N("H", 4, -1) };
  assert.ok(checkNote(q, { letter: "H", acc: -1 }));
  assert.ok(!checkNote(q, { letter: "H", acc: 0 }));
  assert.ok(!checkNote(q, null));
  // Klaviatur: B = Ais, Tonklasse 10 in jeder Oktave
  assert.ok(checkNote(q, 10));
  assert.ok(checkNote(q, 22));
  assert.ok(!checkNote(q, 11));
});

test("question liefert gültige Aufgaben", () => {
  for (const l of noten.levels) {
    const q = l.question(null);
    assert.ok(q.svg.startsWith("<svg"));
    assert.ok(q.answer && q.display && q.note && q.clef && q.statKey);
    assert.ok(l.items.some((it) => same(it.n, q.note) && it.clef === q.clef), l.id);
    assert.equal(q.svg, staffSvg(q.clef, noteSvg(q.note, q.clef, 170)));
    assert.deepEqual(q.play, [q.note]);
    assert.ok(l.check(q, q.answer));
    assert.ok(!l.check(q, { letter: "X", acc: 0 }));
    assert.ok(!l.check(q, { letter: q.note.letter, acc: q.note.acc === 0 ? 1 : 0 }));
  }
});

test("Klaviatur: Vergleich nach Tonklasse", () => {
  const l = noten.levels[10];
  let q;
  do { q = l.question(null); } while (!(q.note.letter === "F" && q.note.acc === 1));
  assert.equal(q.display, "Fis (fis')");
  assert.equal(q.statKey, "Fis (fis', Violin)");
  assert.ok(l.check(q, 6));
  assert.ok(l.check(q, 18));
  assert.ok(!l.check(q, 5));
});

test("nie zweimal dieselbe Note im selben Schlüssel", () => {
  for (const l of noten.levels) {
    let prev = l.question(null);
    for (let i = 0; i < 50; i++) {
      const q = l.question(prev);
      assert.ok(!(same(q.note, prev.note) && q.clef === prev.clef), l.id);
      prev = q;
    }
  }
});

test("Blitz", () => {
  const b = noten.blitz;
  assert.ok(b.title);
  assert.ok(b.example.startsWith("<svg"));
  assert.equal(b.items.length, 26);
  assert.equal(b.items[3].n.letter, "F");
  let prev = b.question(null);
  for (let i = 0; i < 50; i++) {
    const q = b.question(prev);
    assert.ok(q.svg.startsWith("<svg"));
    assert.ok(!(same(q.note, prev.note) && q.clef === prev.clef));
    assert.ok(b.check(q, { letter: q.note.letter, acc: 1 }));
    assert.ok(b.check(q, q.note.letter));
    assert.ok(!b.check(q, { letter: "X", acc: 0 }));
    prev = q;
  }
});

test("Lerntafeln", () => {
  // Welle 12, Schritt 5: je Schlüssel fünf Tafeln (Reihenfolge und Titel in noten-demo.js, test/packs/noten-demo.test.js)
  assert.equal(noten.learn.length, 10);
  assert.deepEqual(noten.learn.map((c) => c.clef), [...Array(5).fill("treble"), ...Array(5).fill("bass")]);
  noten.learn.forEach((c) => assert.ok(c.render().includes("<div")));
});

test("question mit ctx: gültig, nie doppelt, unsichere Note kommt öfter", () => {
  const level = noten.levels[0]; // E G H D F im Violinschlüssel
  const weak = statKey(N("G", 4), "treble");
  const notes = { [weak]: { ok: 1, bad: 9 } };
  // die anderen vier sitzen sicher
  for (const it of level.items) if (statKey(it.n, it.clef) !== weak) notes[statKey(it.n, it.clef)] = { ok: 10, bad: 0, sec: 10, timed: 10 };
  let prev = null, hits = 0;
  for (let i = 0; i < 2000; i++) {
    const q = level.question(prev, { notes });
    assert.ok(level.check(q, q.answer));
    if (prev) assert.ok(!(same(q.note, prev.note) && q.clef === prev.clef));
    if (q.statKey === weak) hits++;
    prev = q;
  }
  // gleichverteilt (ohne Wiederholung) wäre es ein Fünftel; mit Gewicht etwa 30 %
  assert.ok(hits > 2000 * 0.25, `hits=${hits}`);
});

test("question ohne ctx wie bisher", () => {
  for (const l of noten.levels) {
    const q = l.question(null);
    assert.ok(l.check(q, q.answer), l.id);
    const q2 = l.question(q, undefined);
    assert.ok(!(same(q2.note, q.note) && q2.clef === q.clef), l.id);
  }
});

test("HEAT_NOTES und NOTE_KEYS", () => {
  assert.equal(HEAT_NOTES.treble.length, 13);
  assert.ok(same(HEAT_NOTES.treble[0].n, N("C", 4)) && same(HEAT_NOTES.treble[12].n, N("A", 5)));
  assert.equal(HEAT_NOTES.bass.length, 13);
  assert.ok(same(HEAT_NOTES.bass[0].n, N("E", 2)) && same(HEAT_NOTES.bass[12].n, N("C", 4)));
  // Welle 12: Vorzeichen aus Stufe 12 und 14, beide Schlüssel
  assert.equal(HEAT_NOTES.acc.length, 16);
  assert.ok(HEAT_NOTES.acc.every((it) => it.n.acc !== 0));
  assert.deepEqual(HEAT_NOTES.acc, [...noten.levels[11].items, ...noten.levels[13].items]);
  assert.equal(new Set(HEAT_NOTES.acc.map((it) => statKey(it.n, it.clef))).size, 16);
  assert.equal(NOTE_KEYS.length, 42);
  // eindeutig, und jede Aufgabe aus allen Stufen hat einen Schlüssel
  assert.equal(new Set(NOTE_KEYS).size, NOTE_KEYS.length);
  for (const l of noten.levels) for (const it of l.items) assert.ok(NOTE_KEYS.includes(statKey(it.n, it.clef)));
});

// Welle 10, A2: Die unterste Linie im Bassschlüssel ist G (große Oktave), darunter ohne Hilfslinie F;
// im Violinschlüssel steht d' unter der Zeile. Geprüft gegen staffPos, nicht nur als Text.
test("Lerntafeln: Zeilen zu Stellen der Zeile stimmen mit staffPos", () => {
  const row = (clef, label) => LEGEND[clef].find(([k]) => k === label);
  const g = row("bass", "Unterste Linie"), f = row("bass", "Unter der Zeile, ohne Hilfslinie"), d = row("treble", "Unter der Zeile, ohne Hilfslinie");
  assert.equal(g[1], "G (große Oktave)"); assert.equal(staffPos(g[2], "bass"), 0);
  assert.equal(f[1], "F"); assert.equal(staffPos(f[2], "bass"), -1);
  assert.equal(d[1], "d'"); assert.equal(staffPos(d[2], "treble"), -1);
  assert.ok(!LEGEND.bass.some(([k]) => k === "Unterste Note ohne Hilfslinie"));
  // jede Zeile mit Note: Name passt zur Note, Lage passt zur Beschriftung
  const expect = { "Unterste Linie": 0, "Unter der Zeile, ohne Hilfslinie": -1, "Hilfslinie unten": -2 };
  for (const clef of ["treble", "bass"]) for (const [k, v, n] of LEGEND[clef]) {
    if (!n) continue;
    assert.ok(v.startsWith(helm(n)) || v.startsWith(gName(n)), `${clef} ${k}`);
    if (k in expect) assert.equal(staffPos(n, clef), expect[k], `${clef} ${k}`);
    if (k === "Hilfslinie oben") assert.equal(staffPos(n, clef), 10);
  }
  const html = noten.learn.find((c) => c.clef === "bass" && c.title === "Merkhilfen").render();
  assert.ok(html.includes("Unterste Linie") && html.includes("Unter der Zeile, ohne Hilfslinie"));
});

test("Welle 10, B15: Hinweise „mit Hilfslinien“ und „Linien im Bassschlüssel“ (seit Welle 12 Stufe 5 und 6)", async () => {
  const noten = (await import("../../src/packs/noten.js")).default;
  const { textOf } = await import("../../src/engine.js");
  const l5 = noten.levels[4], l6 = { hint: textOf(noten.levels[5].hint) };
  assert.ok(l5.hint.includes("Das c' liegt auf einer Hilfslinie unter der Zeile.") && !l5.hint.includes("hängt"), l5.hint);
  // Bezug (Abschlussprüfung Welle 10): Der Vergleich mit dem Violinschlüssel steht seit Welle 12 unverändert in der
  // Lerntafel „Merkhilfen“ des Bassschlüssels (PLAN Abschnitt 5), die Stufe beginnt mit dem Weg
  assert.equal(BASS_VERGLEICH, "Dieselbe Linie wie im Violinschlüssel heißt im Bassschlüssel zwei Notennamen weiter: Aus E wird G, aus G wird H.");
  assert.ok(legendHtml("bass", {}).includes(BASS_VERGLEICH) && !legendHtml("treble", {}).includes(BASS_VERGLEICH));
  assert.ok(l6.hint.startsWith("Zähle die Linien von unten.\n"), l6.hint);
  assert.ok(!l6.hint.includes("Dieselbe Linie") && l6.hint.includes("Die beiden Punkte des Schlüssels umschließen das F."));
  assert.ok(!l6.hint.includes("zwei Stufen tiefer"));
});

test("Welle 12: Hinweise der Startkarten wie im Plan (Abschnitt 2)", async () => {
  const { textOf } = await import("../../src/engine.js");
  const h = (no) => textOf(noten.levels[no - 1].hint, { state: { sprueche: {} } });
  for (const no of [1, 6]) assert.ok(h(no).startsWith("Zähle die Linien von unten."), no);
  for (const no of [2, 7]) assert.ok(h(no).startsWith("Zähle die Zwischenräume von unten."), no);
  for (const no of [3, 8]) assert.equal(h(no), "Linien und Zwischenräume gemischt, jetzt ohne Hilfen. Erst die Lage, dann der Name.");
  assert.ok(h(4).startsWith("Neu sind vier Noten außerhalb der Zeile. Nimm die nächste Linie der Zeile als Bezugston"));
  assert.ok(h(9).endsWith("Das c' liegt auf einer Hilfslinie über der Zeile, das E auf einer Hilfslinie darunter."));
  assert.ok(h(11).startsWith("Lies erst den Stammton – die Note ohne Vorzeichen –, dann das Zeichen."));
  assert.equal(h(11).split("\n").slice(1).join("\n"), h(12));
  for (const no of [13, 14]) assert.equal(h(no), "♯ und ♭ bedeuten im Bassschlüssel dasselbe. Lies erst den Stammton im Bassschlüssel, dann das Zeichen.");
  // Merkspruch der Startkarte aus sprueche.js
  assert.ok(h(1).includes("Es Geht Hurtig Durch Fleiß") && h(7).includes("Alle Clowns Essen Gern"));
});

test("Abschlussprüfung Welle 10: Hinweis Vorzeichen (seit Welle 12 Stufe 11 und 12) erklärt -is und „aus H wird B“, nennt Dis", async () => {
  const noten = (await import("../../src/packs/noten.js")).default;
  const { gName } = await import("../../src/music.js");
  for (const l of [noten.levels[10], noten.levels[11]]) {
    const h = l.hint;
    for (const w of ["aus F wird Fis", "Dis", "aus E wird Es", "aus A wird As", "aus H wird B"]) assert.ok(h.includes(w), w);
    // alle Namen des Vorrats stehen im Hinweis
    for (const it of l.items) assert.ok(h.includes(gName(it.n)), gName(it.n));
  }
});
