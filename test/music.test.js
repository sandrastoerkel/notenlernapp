import { test } from "node:test";
import assert from "node:assert/strict";
import { N, dia, fromDia, staffPos, midi, freq, pc, gName, helm, range, same, transpose } from "../src/music.js";

test("staffPos: Violin- und Bassschlüssel", () => {
  assert.equal(staffPos(N("E", 4), "treble"), 0);
  assert.equal(staffPos(N("E", 4), "bass"), 12);
  assert.equal(staffPos(N("G", 2), "bass"), 0);
  assert.equal(staffPos(N("G", 2), "treble"), -12);
  assert.equal(staffPos(N("C", 4), "treble"), -2);
  assert.equal(staffPos(N("C", 4), "bass"), 10);
  assert.equal(staffPos(N("F", 5), "treble"), 8);
  assert.equal(staffPos(N("A", 3), "bass"), 8);
});

test("dia und fromDia", () => {
  assert.equal(dia(N("E", 4)), 30);
  assert.equal(dia(N("G", 2)), 18);
  assert.deepEqual(fromDia(30), N("E", 4));
  assert.deepEqual(fromDia(28, 1), N("C", 4, 1));
});

test("midi, freq, pc", () => {
  assert.equal(midi(N("A", 4)), 69);
  assert.equal(midi(N("C", 4)), 60);
  assert.equal(midi(N("H", 4, -1)), 70);
  assert.equal(freq(N("A", 4)), 440);
  assert.equal(pc(-1), 11);
  assert.equal(pc(12), 0);
});

test("gName: deutsche Notennamen", () => {
  assert.equal(gName(N("F", 4, 1)), "Fis");
  assert.equal(gName(N("C", 4, 1)), "Cis");
  assert.equal(gName(N("E", 4, -1)), "Es");
  assert.equal(gName(N("A", 4, -1)), "As");
  assert.equal(gName(N("D", 4, -1)), "Des");
  assert.equal(gName(N("H", 4, -1)), "B");
  assert.equal(gName(N("H", 4)), "H");
});

test("helm: Helmholtz-Schreibweise", () => {
  assert.equal(helm(N("C", 4)), "c'");
  assert.equal(helm(N("C", 5)), "c''");
  assert.equal(helm(N("C", 3)), "c");
  assert.equal(helm(N("C", 2)), "C");
  assert.equal(helm(N("C", 1)), "C₁");
  assert.equal(helm(N("F", 4, 1)), "fis'");
  assert.equal(helm(N("H", 4, -1)), "b'");
});

test("range und same", () => {
  assert.equal(range(N("C", 4), N("A", 5)).length, 13);
  assert.equal(range(N("E", 2), N("C", 4)).length, 13);
  assert.equal(range(N("C", 4), N("C", 4)).length, 1);
  assert.ok(same(N("F", 4, 1), N("F", 4, 1)));
  assert.ok(!same(N("F", 4, 1), N("F", 4)));
  assert.ok(!same(N("F", 4), N("F", 5)));
});

test("transpose: diatonische Schritte", () => {
  assert.deepEqual(transpose(N("C", 4), 2), N("E", 4));
  assert.deepEqual(transpose(N("C", 4), -1), N("H", 3));
  assert.deepEqual(transpose(N("C", 4), 7), N("C", 5));
  assert.deepEqual(transpose(N("C", 4), 3, 1), N("F", 4, 1));
});

test("Notenwerte: Schläge im 4/4-Takt", async () => {
  const { VALUES, beats, beatsText, beatsLabel } = await import("../src/music.js");
  assert.deepEqual(VALUES, [1, 2, 4, 8, 16]);
  assert.deepEqual(VALUES.map((v) => beats(v)), [4, 2, 1, 0.5, 0.25]);
  assert.equal(beats(2, true), 3);
  assert.equal(beats(4, true), 1.5);
  assert.equal(beats(8, true), 0.75);
  assert.deepEqual([4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25].map(beatsText), ["4", "3", "2", "1½", "1", "¾", "½", "¼"]);
  assert.equal(beatsLabel(1), "1 Schlag");
  assert.equal(beatsLabel(0.5), "½ Schlag");
  assert.equal(beatsLabel(0.75), "¾ Schlag");
  assert.equal(beatsLabel(1.5), "1½ Schläge");
  assert.equal(beatsLabel(4), "4 Schläge");
});

test("Notenwerte: deutsche Fachbegriffe", async () => {
  const { valueName } = await import("../src/music.js");
  assert.deepEqual([1, 2, 4, 8, 16].map((v) => valueName(v)), ["ganze Note", "halbe Note", "Viertelnote", "Achtelnote", "Sechzehntelnote"]);
  assert.deepEqual([1, 2, 4, 8, 16].map((v) => valueName(v, true)), ["ganze Pause", "halbe Pause", "Viertelpause", "Achtelpause", "Sechzehntelpause"]);
  assert.equal(valueName(2, false, true), "punktierte halbe Note");
  assert.equal(valueName(4, false, true), "punktierte Viertelnote");
  assert.equal(valueName(8, false, true), "punktierte Achtelnote");
});
