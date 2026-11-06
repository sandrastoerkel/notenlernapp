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

/* ---------- Dreiklänge, Quintenzirkel, Stufen ---------- */
import {
  semis, spell, triad, triadQuality, triadRoot, triadTypeOf, invert, inversionOf, INVERSIONS,
  fifthUp, fifthDown, majorTonic, MAJOR_KEYS, relativeMinorOf, triadName, majorScale, degreeTriad, ROMAN,
} from "../src/music.js";

const names = (ns) => ns.map(helm).join("-");

test("spell und semis", () => {
  assert.equal(semis(N("C", 4), N("E", 4)), 4);
  assert.deepEqual(spell(N("D", 4), 2, 4), N("F", 4, 1));
  assert.deepEqual(spell(N("H", 4), 2, 3), N("D", 5));
  assert.equal(spell(N("H", 4), 4, 8), null); // fisis wäre nötig
});

test("triad: bekannte Beispiele", () => {
  assert.equal(names(triad(N("C", 4), "dur")), "c'-e'-g'");
  assert.equal(names(triad(N("A", 3), "moll")), "a-c'-e'");
  assert.equal(names(triad(N("H", 3), "vermindert")), "h-d'-f'");
  assert.equal(names(triad(N("C", 4), "uebermaessig")), "c'-e'-gis'");
  assert.equal(names(triad(N("F", 4, 1), "dur")), "fis'-ais'-cis''");
  assert.equal(names(triad(N("E", 4, -1), "dur")), "es'-g'-b'");
  assert.equal(names(triad(N("C", 4), "moll")), "c'-es'-g'");
  assert.equal(names(triad(N("C", 4), "vermindert")), "c'-es'-ges'");
  assert.equal(names(triad(N("A", 4, -1), "uebermaessig")), "as'-c''-e''");
  assert.equal(triad(N("E", 4, -1), "vermindert"), null); // es-ges-heses
  assert.equal(triad(N("H", 4), "uebermaessig"), null); // h-dis-fisis
});

test("triadQuality und triadTypeOf", () => {
  assert.equal(triadQuality(4, 3), "dur");
  assert.equal(triadQuality(3, 4), "moll");
  assert.equal(triadQuality(3, 3), "vermindert");
  assert.equal(triadQuality(4, 4), "uebermaessig");
  assert.equal(triadQuality(5, 3), null);
  assert.equal(triadTypeOf([N("C", 4), N("E", 4), N("G", 4)]), "dur");
  assert.equal(triadTypeOf([N("A", 3), N("C", 4), N("E", 4)]), "moll");
  assert.equal(triadTypeOf([N("H", 3), N("D", 4), N("F", 4)]), "vermindert");
  assert.equal(triadTypeOf([N("C", 4), N("E", 4), N("G", 4, 1)]), "uebermaessig");
  // in Umkehrung
  assert.equal(triadTypeOf([N("E", 4), N("G", 4), N("C", 5)]), "dur");
  assert.equal(triadTypeOf([N("E", 4), N("A", 4), N("C", 5)]), "moll");
  assert.equal(triadRoot([N("G", 4), N("C", 5), N("E", 5)]).letter, "C");
  assert.equal(triadRoot([N("C", 4), N("D", 4), N("E", 4)]), null);
});

test("invert und inversionOf", () => {
  const c = triad(N("C", 4), "dur");
  assert.equal(names(invert(c, 1)), "e'-g'-c''");
  assert.equal(names(invert(c, 2)), "g'-c''-e''");
  assert.equal(names(invert(triad(N("C", 3), "dur"), 1)), "e-g-c'");
  assert.equal(names(invert(triad(N("C", 3), "dur"), 2)), "g-c'-e'");
  assert.equal(inversionOf([N("E", 3), N("G", 3), N("C", 4)]), 1);
  assert.equal(inversionOf([N("G", 3), N("C", 4), N("E", 4)]), 2);
  assert.equal(inversionOf(c), 0);
  assert.deepEqual(INVERSIONS, ["Grundstellung", "Sextakkord", "Quartsextakkord"]);
});

test("Quintenzirkel: Tonarten und Nachbarn", () => {
  assert.deepEqual(MAJOR_KEYS.map((k) => k.name), ["Ces-Dur", "Ges-Dur", "Des-Dur", "As-Dur", "Es-Dur", "B-Dur", "F-Dur",
    "C-Dur", "G-Dur", "D-Dur", "A-Dur", "E-Dur", "H-Dur", "Fis-Dur", "Cis-Dur"]);
  assert.deepEqual(MAJOR_KEYS.map((k) => k.sig), [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(gName(fifthUp(N("C", 4))), "G");
  assert.equal(gName(fifthUp(N("H", 4))), "Fis");
  assert.equal(gName(fifthDown(N("F", 4))), "B");
  assert.equal(gName(fifthDown(N("D", 4, -1))), "Ges");
  assert.equal(gName(majorTonic(-3)), "Es");
  assert.equal(gName(majorTonic(5)), "H");
  const minors = MAJOR_KEYS.map((k) => relativeMinorOf(k.tonic).name);
  assert.deepEqual(minors, ["as-Moll", "es-Moll", "b-Moll", "f-Moll", "c-Moll", "g-Moll", "d-Moll",
    "a-Moll", "e-Moll", "h-Moll", "fis-Moll", "cis-Moll", "gis-Moll", "dis-Moll", "ais-Moll"]);
});

test("triadName: Schulschreibweise", () => {
  assert.equal(triadName(N("C", 4), "dur"), "C-Dur");
  assert.equal(triadName(N("A", 3), "moll"), "a-Moll");
  assert.equal(triadName(N("H", 3), "vermindert"), "h vermindert");
  assert.equal(triadName(N("E", 4, -1), "dur"), "Es-Dur");
  assert.equal(triadName(N("F", 4, 1), "moll"), "fis-Moll");
});

test("Tonleiter und Stufenakkorde in Dur", () => {
  assert.deepEqual(majorScale(N("G", 4)).map(gName), ["G", "A", "H", "C", "D", "E", "Fis"]);
  assert.deepEqual(majorScale(N("E", 4, -1)).map(gName), ["Es", "F", "G", "As", "B", "C", "D"]);
  assert.deepEqual(majorScale(N("C", 4, -1)).map(gName), ["Ces", "Des", "Es", "Fes", "Ges", "As", "B"]);
  const g = N("G", 3);
  assert.equal(names(degreeTriad(g, 6)), "e'-g'-h'");
  assert.equal(names(degreeTriad(g, 7)), "fis'-a'-c''");
  const types = [1, 2, 3, 4, 5, 6, 7].map((d) => triadTypeOf(degreeTriad(N("C", 4), d)));
  assert.deepEqual(types, ["dur", "moll", "moll", "dur", "dur", "moll", "vermindert"]);
  for (const k of MAJOR_KEYS) {
    const t = [1, 2, 3, 4, 5, 6, 7].map((d) => triadTypeOf(degreeTriad(k.tonic, d)));
    assert.deepEqual(t, ["dur", "moll", "moll", "dur", "dur", "moll", "vermindert"], k.name);
  }
  assert.deepEqual(ROMAN, ["I", "II", "III", "IV", "V", "VI", "VII"]);
});
