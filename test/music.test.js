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

/* ---------- Intervalle und Tonarten (Paket D) ---------- */
import {
  INTERVAL_NAMES, intervalNumber, intervalSemitones, intervalQuality, intervalName, intervalLabel, semitonesFor,
  majorKeyFromKeySig, relativeMinor, majorName, minorName,
} from "../src/music.js";

test("Intervallzahl aus dem diatonischen Abstand", () => {
  assert.equal(INTERVAL_NAMES.length, 8);
  assert.equal(intervalNumber(N("C", 4), N("C", 4)), 1);
  assert.equal(intervalNumber(N("C", 4), N("E", 4)), 3);
  assert.equal(intervalNumber(N("H", 3), N("F", 4)), 5);
  assert.equal(intervalNumber(N("C", 4), N("C", 5)), 8);
  // Vorzeichen ändern die Zahl nicht
  assert.equal(intervalNumber(N("C", 4, 1), N("E", 4, -1)), 3);
  assert.equal(intervalSemitones(N("C", 4), N("G", 4)), 7);
});

test("alle 14 Halbtonzahlen über c'", () => {
  const cases = [
    ["reine Prime", N("C", 4), 0], ["kleine Sekunde", N("D", 4, -1), 1], ["große Sekunde", N("D", 4), 2],
    ["kleine Terz", N("E", 4, -1), 3], ["große Terz", N("E", 4), 4], ["reine Quarte", N("F", 4), 5],
    ["übermäßige Quarte", N("F", 4, 1), 6], ["verminderte Quinte", N("G", 4, -1), 6], ["reine Quinte", N("G", 4), 7],
    ["kleine Sexte", N("A", 4, -1), 8], ["große Sexte", N("A", 4), 9], ["kleine Septime", N("H", 4, -1), 10],
    ["große Septime", N("H", 4), 11], ["reine Oktave", N("C", 5), 12],
  ];
  for (const [name, high, semi] of cases) {
    assert.equal(intervalSemitones(N("C", 4), high), semi, name);
    assert.equal(intervalName(N("C", 4), high), name);
    const num = intervalNumber(N("C", 4), high);
    assert.equal(semitonesFor(num, intervalQuality(N("C", 4), high)), semi, name);
  }
});

test("geschriebene Intervalle mit bekannten Beispielen", () => {
  assert.equal(intervalName(N("C", 4), N("E", 4)), "große Terz");
  assert.equal(intervalName(N("H", 3), N("F", 4)), "verminderte Quinte");
  assert.equal(intervalName(N("F", 4), N("H", 4)), "übermäßige Quarte");
  assert.equal(intervalName(N("E", 4), N("F", 4)), "kleine Sekunde");
  assert.equal(intervalName(N("D", 4), N("F", 4)), "kleine Terz");
  assert.equal(intervalName(N("E", 4, -1), N("G", 4)), "große Terz");
  assert.equal(intervalName(N("C", 4, 1), N("E", 4)), "kleine Terz");
  assert.equal(intervalName(N("C", 4), N("C", 5, -1)), "verminderte Oktave");
  assert.equal(intervalName(N("C", 4), N("C", 5, 1)), "übermäßige Oktave");
  assert.equal(intervalName(N("C", 4), N("G", 4, 1)), "übermäßige Quinte");
  assert.equal(intervalName(N("C", 4, 1), N("F", 4)), "verminderte Quarte");
  assert.equal(intervalName(N("A", 3), N("C", 4)), "kleine Terz");
  assert.equal(intervalName(N("E", 4), N("C", 5)), "kleine Sexte");
  assert.equal(intervalName(N("D", 4), N("C", 5)), "kleine Septime");
  // gleicher Klang, andere Schreibung: Fis–B ist eine verminderte Quarte, Fis–Ais eine große Terz
  assert.equal(intervalName(N("F", 4, 1), N("H", 4, -1)), "verminderte Quarte");
  assert.equal(intervalName(N("F", 4, 1), N("A", 4, 1)), "große Terz");
  assert.equal(intervalLabel(5, "rein"), "reine Quinte");
});

test("außerhalb des Bereichs: null", () => {
  assert.equal(intervalName(N("E", 4), N("C", 4)), null);     // abwärts
  assert.equal(intervalName(N("C", 4), N("D", 5)), null);     // über die Oktave hinaus
  assert.equal(intervalName(N("C", 4), N("C", 4, -1)), null); // verminderte Prime (abwärts klingend)
  assert.equal(semitonesFor(3, "rein"), null);
  assert.equal(semitonesFor(5, "klein"), null);
  assert.equal(semitonesFor(1, "vermindert"), null);
  assert.equal(semitonesFor(9, "groß"), null);
});

test("Dur-Tonart aus der Vorzeichnung (15 Tonarten)", () => {
  const expected = {
    0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "H", 6: "Fis", 7: "Cis",
    [-1]: "F", [-2]: "B", [-3]: "Es", [-4]: "As", [-5]: "Des", [-6]: "Ges", [-7]: "Ces",
  };
  for (const [f, name] of Object.entries(expected)) {
    assert.equal(gName(majorKeyFromKeySig(+f)), name, f);
    assert.equal(majorName(+f), name + "-Dur");
  }
  assert.deepEqual(majorKeyFromKeySig(-2), { letter: "H", acc: -1 });
  assert.deepEqual(majorKeyFromKeySig(7), { letter: "C", acc: 1 });
  assert.deepEqual(majorKeyFromKeySig(-7), { letter: "C", acc: -1 });
});

test("parallele Molltonarten (15), klein geschrieben", () => {
  const expected = {
    0: "a", 1: "e", 2: "h", 3: "fis", 4: "cis", 5: "gis", 6: "dis", 7: "ais",
    [-1]: "d", [-2]: "g", [-3]: "c", [-4]: "f", [-5]: "b", [-6]: "es", [-7]: "as",
  };
  for (const [f, name] of Object.entries(expected)) assert.equal(minorName(+f), name + "-Moll", f);
  assert.deepEqual(relativeMinor(-6), { letter: "E", acc: -1 });
  assert.deepEqual(relativeMinor(7), { letter: "A", acc: 1 });
  // Der Moll-Grundton liegt eine kleine Terz unter dem Dur-Grundton
  for (let f = -7; f <= 7; f++) {
    const maj = majorKeyFromKeySig(f), min = relativeMinor(f);
    const low = N(min.letter, 3, min.acc), up = fromDia(dia(low) + 2, maj.acc);
    assert.equal(up.letter, maj.letter);
    assert.equal(intervalName(low, up), "kleine Terz", String(f));
  }
});
