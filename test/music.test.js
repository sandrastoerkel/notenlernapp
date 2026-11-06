import { test } from "node:test";
import assert from "node:assert/strict";
import { N, dia, fromDia, staffPos, midi, freq, pc, gName, helm, range, same, transpose, parseNoteName, NAME_ACCS, LETTERS } from "../src/music.js";

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

test("parseNoteName: alle 21 deutschen Namen", () => {
  const all = {
    c: ["C", 0], d: ["D", 0], e: ["E", 0], f: ["F", 0], g: ["G", 0], a: ["A", 0], h: ["H", 0],
    cis: ["C", 1], dis: ["D", 1], eis: ["E", 1], fis: ["F", 1], gis: ["G", 1], ais: ["A", 1], his: ["H", 1],
    ces: ["C", -1], des: ["D", -1], es: ["E", -1], fes: ["F", -1], ges: ["G", -1], as: ["A", -1], b: ["H", -1],
  };
  assert.equal(Object.keys(all).length, 21);
  for (const [name, [letter, acc]] of Object.entries(all)) {
    assert.deepEqual(parseNoteName(name), { letter, acc }, name);
    assert.deepEqual(parseNoteName(name.toUpperCase()), { letter, acc }, name.toUpperCase());
    // Rückweg über gName
    assert.equal(gName(N(letter, 4, acc)).toLowerCase(), name);
  }
  assert.deepEqual(NAME_ACCS, [0, 1, -1]);
  // jede Kombination aus Stammton und Vorzeichen hat genau einen Namen
  for (const acc of NAME_ACCS) for (const l of LETTERS) assert.deepEqual(parseNoteName(gName(N(l, 4, acc))), { letter: l, acc });
});

test("parseNoteName: Groß/klein, Leerzeichen, falsche Schreibweisen", () => {
  assert.deepEqual(parseNoteName("Fis"), { letter: "F", acc: 1 });
  assert.deepEqual(parseNoteName("ais "), { letter: "A", acc: 1 });
  assert.deepEqual(parseNoteName("  B"), { letter: "H", acc: -1 });
  assert.deepEqual(parseNoteName("ES"), { letter: "E", acc: -1 });
  for (const bad of ["hes", "bes", "ees", "aes", "ass", "eses", "ases", "fisis", "x", "", "  ", "f is", "cis-", "fi", "is", "es-dur"]) {
    assert.equal(parseNoteName(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(parseNoteName("his "), { letter: "H", acc: 1 });
  assert.equal(parseNoteName(null), null);
  assert.equal(parseNoteName(undefined), null);
});
