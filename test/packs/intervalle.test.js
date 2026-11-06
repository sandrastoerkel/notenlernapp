import { test } from "node:test";
import assert from "node:assert/strict";
import intervalle, {
  POOL_1, POOL_2, POOL_3, POOL_4, POOL_5, POOL_6, FIFTHS, X_LOW, X_HIGH, NOTE_VALUE, LEARN_ROWS,
  usualNote, upperNote, intervalSvg, numberChoices, minorMajorChoices, perfectChoices, keyChoices, minorChoices, sigText, describe,
} from "../../src/packs/intervalle.js";
import { PACKS } from "../../src/packs/index.js";
import { N, dia, midi, intervalNumber, intervalName, INTERVAL_NAMES, majorName, minorName, intervalLabel } from "../../src/music.js";
import { staffSvg, noteSvg } from "../../src/staff.js";

const L = intervalle.levels;
const many = (l, n = 300) => { const out = []; let prev = null; for (let i = 0; i < n; i++) { prev = l.question(prev); out.push(prev); } return out; };

test("Paket ist registriert", () => {
  assert.ok(PACKS.some((p) => p.id === "intervalle"));
  assert.equal(intervalle.title, "Intervalle und Tonarten");
  assert.equal(intervalle.grade, "Klasse 7–9");
});

test("sechs Stufen mit eindeutigen IDs", () => {
  assert.deepEqual(L.map((l) => l.id), ["intervalle-1", "intervalle-2", "intervalle-3", "intervalle-4", "intervalle-5", "intervalle-6"]);
  assert.equal(new Set(L.map((l) => l.id)).size, 6);
  L.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.equal(l.input, "choices");
    assert.ok(l.title && l.hint && l.subtitle);
    assert.ok(l.example.startsWith("<svg"));
  });
});

test("Texte: keine verbotenen Wörter, Anrede du", () => {
  const texts = L.flatMap((l) => [l.title, l.subtitle, l.hint]).concat(intervalle.learn.map((c) => c.render()));
  for (const t of texts) assert.ok(!/Fehler!|falsch|mühelos|Held|Champion|\bSie\b/.test(t), t);
});

test("mindestens 8 unterschiedliche Aufgaben je Stufe", () => {
  assert.deepEqual([POOL_1, POOL_2, POOL_3, POOL_4, POOL_5, POOL_6].map((p) => p.length), [76, 76, 147, 133, 30, 30]);
  L.forEach((l) => {
    assert.ok(l.items.length >= 8, l.id);
    const seen = new Set(many(l, 400).map((q) => q.svg + q.prompt));
    assert.ok(seen.size >= 8, l.id);
  });
});

test("question liefert gültige Aufgaben, check erkennt richtig und falsch", () => {
  for (const l of L) {
    for (const q of many(l, 200)) {
      assert.ok(q.svg.startsWith("<svg") && q.prompt && q.display && q.statKey, l.id);
      assert.ok(q.choices.length >= 4 && q.choices.length <= 6, l.id);
      assert.equal(new Set(q.choices).size, q.choices.length, l.id);
      assert.ok(q.choices.includes(q.answer), l.id);
      assert.ok(l.check(q, q.answer));
      q.choices.filter((c) => c !== q.answer).forEach((c) => assert.ok(!l.check(q, c)));
      assert.ok(!l.check(q, undefined));
    }
  }
});

test("nie zweimal dieselbe Aufgabe hintereinander", () => {
  for (const l of L) {
    let prev = l.question(null);
    for (let i = 0; i < 100; i++) {
      const q = l.question(prev);
      assert.ok(!(q.svg === prev.svg && q.prompt === prev.prompt), l.id);
      prev = q;
    }
  }
});

test("Stufe 1 und 2: Stammtöne, Zahl aus dia, beide Noten erklingen", () => {
  for (const [l, pool, clef] of [[L[0], POOL_1, "treble"], [L[1], POOL_2, "bass"]]) {
    assert.ok(pool.every((it) => it.clef === clef && it.low.acc === 0 && it.high.acc === 0));
    // alle Zahlen von Prime bis Oktave kommen vor
    assert.deepEqual([...new Set(pool.map((it) => intervalNumber(it.low, it.high)))].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
    for (const q of many(l, 100)) {
      const num = dia(q.high) - dia(q.low) + 1;
      assert.equal(q.answer, INTERVAL_NAMES[num - 1]);
      assert.deepEqual(q.play, [q.low, q.high]);
      assert.equal(q.clef, clef);
      assert.equal(q.svg, staffSvg(clef, noteSvg(q.low, clef, X_LOW, "", { value: NOTE_VALUE }) + noteSvg(q.high, clef, X_HIGH, "", { value: NOTE_VALUE })));
    }
  }
  // Bereiche: Violinschlüssel c' bis a'', Bassschlüssel E bis c'
  assert.ok(POOL_1.every((it) => dia(it.low) >= dia(N("C", 4)) && dia(it.high) <= dia(N("A", 5))));
  assert.ok(POOL_2.every((it) => dia(it.low) >= dia(N("E", 2)) && dia(it.high) <= dia(N("C", 4))));
});

test("Auswahl Intervallzahl: fünf aufeinanderfolgende mit der richtigen", () => {
  for (let num = 1; num <= 8; num++) {
    for (const r of [0, 0.2, 0.5, 0.99]) {
      const c = numberChoices(num, () => r);
      assert.equal(c.length, 5);
      assert.ok(c.includes(INTERVAL_NAMES[num - 1]));
      const idx = c.map((n) => INTERVAL_NAMES.indexOf(n));
      idx.forEach((v, i) => i && assert.equal(v, idx[i - 1] + 1));
    }
  }
});

test("Stufe 3: nur Sekunde, Terz, Sexte, Septime, groß oder klein, aus den Halbtönen", () => {
  const semis = { "kleine Sekunde": 1, "große Sekunde": 2, "kleine Terz": 3, "große Terz": 4, "kleine Sexte": 8, "große Sexte": 9, "kleine Septime": 10, "große Septime": 11 };
  for (const it of POOL_3) {
    const name = intervalName(it.low, it.high);
    assert.ok(name in semis, name);
    assert.equal(midi(it.high) - midi(it.low), semis[name]);
    assert.ok(usualNote(it.low) && usualNote(it.high));
  }
  assert.deepEqual(new Set(POOL_3.map((it) => intervalName(it.low, it.high))), new Set(Object.keys(semis)));
  // mit Vorzeichen: die meisten Aufgaben haben mindestens ein Vorzeichen
  assert.ok(POOL_3.filter((it) => it.low.acc || it.high.acc).length > POOL_3.length / 2);
  for (const q of many(L[2], 100)) {
    assert.equal(q.choices.length, 4);
    assert.deepEqual(q.play, [q.low, q.high]);
    assert.equal(q.answer, intervalName(q.low, q.high));
  }
  assert.deepEqual(minorMajorChoices(3), ["kleine Sekunde", "große Sekunde", "kleine Terz", "große Terz"]);
  assert.deepEqual(minorMajorChoices(7), ["kleine Sexte", "große Sexte", "kleine Septime", "große Septime"]);
});

test("Stufe 4: Quarte, Quinte, Oktave rein, vermindert, übermäßig", () => {
  const names = new Set(POOL_4.map((it) => intervalName(it.low, it.high)));
  for (const num of [4, 5, 8]) for (const q of ["vermindert", "rein", "übermäßig"]) assert.ok(names.has(intervalLabel(num, q)), intervalLabel(num, q));
  assert.equal(names.size, 9);
  for (const it of POOL_4) {
    const d = describe({ low: it.low, high: it.high });
    assert.ok([4, 5, 8].includes(d.num));
    const base = { 4: 5, 5: 7, 8: 12 }[d.num];
    assert.equal(d.semi - base, { vermindert: -1, rein: 0, "übermäßig": 1 }[d.quality]);
    assert.ok(usualNote(it.low) && usualNote(it.high));
  }
  // Beispiele aus dem Unterricht sind im Vorrat
  const has = (low, high, name) => POOL_4.some((it) => dia(it.low) === dia(low) && it.low.acc === low.acc && dia(it.high) === dia(high) && it.high.acc === high.acc && intervalName(it.low, it.high) === name);
  assert.ok(has(N("F", 4), N("H", 4), "übermäßige Quarte"));
  assert.ok(has(N("H", 4), N("F", 5), "verminderte Quinte"));
  assert.ok(has(N("F", 4, 1), N("F", 5), "verminderte Oktave"));
  assert.ok(has(N("C", 4), N("C", 5, 1), "übermäßige Oktave"));
  // alle neun Kombinationen kommen in einer längeren Folge vor
  assert.equal(new Set(many(L[3], 600).map((q) => q.answer)).size, 9);
  assert.deepEqual(perfectChoices(4), ["verminderte Quarte", "reine Quarte", "übermäßige Quarte", "verminderte Quinte"]);
  assert.deepEqual(perfectChoices(5), ["verminderte Quinte", "reine Quinte", "übermäßige Quinte", "übermäßige Quarte"]);
  assert.deepEqual(perfectChoices(8), ["verminderte Oktave", "reine Oktave", "übermäßige Oktave", "große Septime"]);
});

test("upperNote und usualNote", () => {
  assert.deepEqual(upperNote(N("C", 4), 3, "groß"), N("E", 4));
  assert.deepEqual(upperNote(N("E", 4, -1), 3, "groß"), N("G", 4));
  assert.deepEqual(upperNote(N("C", 4, 1), 3, "klein"), N("E", 4));
  assert.deepEqual(upperNote(N("H", 3), 5, "vermindert"), N("F", 4));
  assert.equal(upperNote(N("C", 4), 8, "vermindert"), null); // Ces wird nicht verwendet
  assert.deepEqual(upperNote(N("E", 4, -1), 3, "klein"), N("G", 4, -1));
  assert.equal(upperNote(N("C", 4, 1), 3, "groß"), null);    // Cis–Eis: Eis wird nicht verwendet
  assert.ok(!usualNote(N("E", 4, 1)) && !usualNote(N("H", 4, 1)) && !usualNote(N("C", 4, -1)) && !usualNote(N("F", 4, -1)));
  assert.ok(usualNote(N("F", 4, 1)) && usualNote(N("G", 4, -1)));
});

test("Notation: zwei Viertelnoten nebeneinander, Vorzeichen vor der Note", () => {
  assert.equal(NOTE_VALUE, 4);
  const svg = intervalSvg({ clef: "treble", low: N("H", 3), high: N("F", 4) });
  // h hängt unter der c'-Hilfslinie: eine Hilfslinie
  assert.equal((svg.match(/class="ledger"/g) || []).length, 1);
  assert.equal((svg.match(/class="stem"/g) || []).length, 2);
  assert.equal((svg.match(/class="notehead"/g) || []).length, 2);
  // a'' liegt auf der ersten Hilfslinie über der Zeile, c'' in der Zeile
  assert.equal((intervalSvg({ clef: "treble", low: N("C", 5), high: N("A", 5) }).match(/class="ledger"/g) || []).length, 1);
  // Bassschlüssel: E auf der ersten Hilfslinie unter der Zeile, c' auf der ersten darüber
  assert.equal((intervalSvg({ clef: "bass", low: N("E", 2), high: N("C", 3) }).match(/class="ledger"/g) || []).length, 1);
  assert.equal((intervalSvg({ clef: "bass", low: N("E", 2), high: N("C", 4) }).match(/class="ledger"/g) || []).length, 2);
  assert.equal((intervalSvg({ clef: "bass", low: N("A", 3), high: N("C", 4) }).match(/class="ledger"/g) || []).length, 1);
  const withAcc = intervalSvg({ clef: "treble", low: N("C", 4), high: N("E", 4, -1) });
  const m = withAcc.match(/<text class="acc" x="([\d.]+)"/);
  // Kopf der ersten Note reicht bis X_LOW + 7,7 (Hals nach oben bei X_LOW + 6,2), Vorzeichen beginnt deutlich dahinter
  assert.ok(m && +m[1] < X_HIGH && +m[1] > X_LOW + 20, "Vorzeichen zwischen den Noten, ohne die erste Note zu berühren");
});

test("Stufe 5: 15 Dur-Tonarten in beiden Schlüsseln", () => {
  assert.equal(FIFTHS.length, 15);
  assert.deepEqual(new Set(POOL_5.map((it) => it.clef)), new Set(["treble", "bass"]));
  const answers = {};
  for (const q of many(L[4], 600)) {
    assert.equal(q.svg, staffSvg(q.clef, "", { keySig: q.fifths }));
    assert.equal(q.answer, majorName(q.fifths));
    assert.equal(q.choices.length, 4);
    answers[q.fifths] = q.answer;
  }
  assert.deepEqual(answers, {
    0: "C-Dur", 1: "G-Dur", 2: "D-Dur", 3: "A-Dur", 4: "E-Dur", 5: "H-Dur", 6: "Fis-Dur", 7: "Cis-Dur",
    [-1]: "F-Dur", [-2]: "B-Dur", [-3]: "Es-Dur", [-4]: "As-Dur", [-5]: "Des-Dur", [-6]: "Ges-Dur", [-7]: "Ces-Dur",
  });
  // keine gleich klingenden Tonarten als Ablenker
  assert.ok(!keyChoices(6, majorName).includes("Ges-Dur"));
  assert.ok(!keyChoices(-7, majorName).includes("H-Dur"));
  assert.ok(!keyChoices(7, majorName).includes("Des-Dur"));
  assert.equal(sigText(0), "keine Vorzeichen");
  assert.equal(sigText(3), "3 ♯");
  assert.equal(sigText(-4), "4 ♭");
});

test("Stufe 6: parallele Molltonart", () => {
  const answers = {};
  for (const q of many(L[5], 600)) {
    assert.equal(q.answer, minorName(q.fifths));
    assert.ok(q.prompt.includes(majorName(q.fifths)));
    assert.equal(q.choices.length, 4);
    assert.ok(q.choices.every((c) => /^[a-h](is|es|s)?-Moll$/.test(c)), q.choices.join());
    answers[q.fifths] = q.answer;
  }
  assert.equal(Object.keys(answers).length, 15);
  assert.equal(answers[3], "fis-Moll");
  assert.equal(answers[-6], "es-Moll");
  assert.equal(answers[-3], "c-Moll");
  // gleichnamige Molltonart als Ablenker: Es-Dur → es-Moll angeboten, c-Moll richtig
  assert.ok(minorChoices(-3).includes("es-Moll") && minorChoices(-3).includes("c-Moll"));
});

test("Lerntafeln", () => {
  assert.equal(intervalle.learn.length, 3);
  assert.deepEqual(intervalle.learn.map((c) => c.clef), ["treble", "bass", undefined]);
  // Überschriften kommen aus title (learn.js), nicht aus render()
  assert.deepEqual(intervalle.learn.map((c) => c.title), ["Intervalle über c'", "Intervalle über c", "Quintenzirkel"]);
  intervalle.learn.forEach((c) => assert.ok(!/<h[1-6]/.test(c.render()), c.title));
  assert.equal(LEARN_ROWS.length, 14);
  assert.deepEqual(LEARN_ROWS.map((r) => r.semitones), [0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10, 11, 12]);
  const t = intervalle.learn[0].render();
  assert.ok(t.includes("<svg") && t.includes("verminderte Quinte") && t.includes("c'–ges'") && t.includes("c'–fis'"));
  assert.ok(intervalle.learn[1].render().includes("c–es"));
  const q = intervalle.learn[2].render();
  const row = (sig, dur, moll) => `<tr><td>${sig}</td><td><b>${dur}</b></td><td><b>${moll}</b></td></tr>`;
  for (const r of [["keine Vorzeichen", "C-Dur", "a-Moll"], ["6 ♯", "Fis-Dur", "dis-Moll"], ["3 ♭", "Es-Dur", "c-Moll"], ["7 ♭", "Ces-Dur", "as-Moll"], ["7 ♯", "Cis-Dur", "ais-Moll"]]) assert.ok(q.includes(row(...r)), r.join());
  assert.equal((q.match(/<tr><td>/g) || []).length, 15);
  // Intervalltabelle: 14 Zeilen mit Halbtonzahl
  assert.equal((t.match(/<tr><td>/g) || []).length, 14);
  assert.ok(t.includes('<tr><td>übermäßige Quarte</td><td class="num">6</td><td><b>c\'–fis\'</b></td></tr>'));
});
