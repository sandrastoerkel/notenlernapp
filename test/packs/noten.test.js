import { test } from "node:test";
import assert from "node:assert/strict";
import noten, { BLITZ_POOL, statKey, checkNote } from "../../src/packs/noten.js";
import { PACKS } from "../../src/packs/index.js";
import { N, same } from "../../src/music.js";
import { staffSvg, noteSvg } from "../../src/staff.js";

test("Registry enthält nur fertige Pakete", () => {
  // „Noten lesen“ steht vorn; weitere Pakete kommen hinzu, sobald sie gebaut sind (kein null in der Liste)
  assert.equal(PACKS[0].id, "noten");
  assert.ok(PACKS.every((p) => p && p.id && p.levels.length));
  assert.equal(new Set(PACKS.map((p) => p.id)).size, PACKS.length);
});

test("acht Stufen mit eindeutigen IDs", () => {
  assert.equal(noten.levels.length, 8);
  const ids = noten.levels.map((l) => l.id);
  assert.deepEqual(ids, ["noten-1", "noten-2", "noten-3", "noten-4", "noten-5", "noten-6", "noten-7", "noten-8"]);
  assert.equal(new Set(ids).size, 8);
  noten.levels.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.ok(l.title && l.hint && l.subtitle);
    assert.ok(l.example.startsWith("<svg"));
  });
});

test("Vorrat je Stufe", () => {
  // Ausnahme (Entscheidung der Nutzerin): Stufe 2 und 5 haben nur 4 Noten (die Zwischenräume).
  // Stufe 1 und 4 (die fünf Linien) haben ebenfalls weniger als 8 Noten; wie im Prototyp belassen.
  const sizes = noten.levels.map((l) => l.items.length);
  assert.deepEqual(sizes, [5, 4, 13, 5, 4, 13, 8, 34]);
  noten.levels.forEach((l) => {
    if (l.no !== 2 && l.no !== 5 && l.no !== 1 && l.no !== 4) assert.ok(l.items.length >= 8, l.id);
  });
  assert.equal(BLITZ_POOL.length, 26);
  // Stufe 8 = Stufe 3 + 6 + 7 (beide Schlüssel, mit Vorzeichen); Blitz = Stufe 3 + 6 (ohne Vorzeichen)
  const [l3, l6, l7, l8] = [2, 5, 6, 7].map((i) => noten.levels[i].items);
  assert.deepEqual(l8, [...l3, ...l6, ...l7]);
  assert.deepEqual(BLITZ_POOL, [...l3, ...l6]);
  assert.ok(l8.some((it) => it.clef === "treble") && l8.some((it) => it.clef === "bass"));
  assert.ok(BLITZ_POOL.every((it) => it.n.acc === 0));
  // Startkarte zeigt die erste Note des Vorrats wie im Prototyp
  noten.levels.forEach((l) => assert.equal(l.example, staffSvg(l.items[0].clef, noteSvg(l.items[0].n, l.items[0].clef, 170))));
  assert.equal(noten.blitz.example, staffSvg("treble", noteSvg(N("F", 4), "treble", 170)));
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
  const l = noten.levels[6];
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
  assert.equal(noten.learn.length, 2);
  assert.deepEqual(noten.learn.map((c) => c.clef), ["treble", "bass"]);
  noten.learn.forEach((c) => assert.ok(c.render().includes("<div")));
});
