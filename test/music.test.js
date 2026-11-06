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
