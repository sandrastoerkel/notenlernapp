import { test } from "node:test";
import assert from "node:assert/strict";
import intervalle, {
  POOL_1, POOL_2, POOL_3, POOL_4, POOL_5, POOL_6, POOL_7, POOL_8, POOL_9, POOL_10, BUILD_UP, BUILD_DOWN,
  X_LOW, X_HIGH, NOTE_VALUE, LEARN_ROWS, TYPES_RKG, TYPES_ALL, TYPES_NO_PRIME, ALLOWED_NAMES, QUALITY_ORDER,
  SIZE_ORDER, SIZE_NAMES, stepsText, frameText, qualityChoices, twoStepQuestion, frameTable, semitoneTable,
  HELP_TEXT, HELP_TEXT_1, VERDICTS, VERDICT_OK, VERDICT_NUM, VERDICT_MORE, VERDICT_LESS,
  buildSvg, buildRevealSvg, buildHeight, checkBuild, usualNote, upperNote, pairExtra, intervalSvg, describe,
} from "../../src/packs/intervalle.js";
import { PACKS } from "../../src/packs/index.js";
import { N, dia, midi, gName, helm, intervalSemitones, lowerNote, semitonesFor, intervalNumber, intervalName, INTERVAL_NAMES, intervalLabel } from "../../src/music.js";
import { feedbackText, stepsFeedback, helpsHtml, makeRound } from "../../src/engine.js";
import { staffSvg, noteSvg } from "../../src/staff.js";

const L = intervalle.levels;
const many = (l, n = 300) => { const out = []; let prev = null; for (let i = 0; i < n; i++) { prev = l.question(prev); out.push(prev); } return out; };
const FORBIDDEN = /Fehler!|falsch|mühelos|Held|Champion|\bSie\b|Klasse \d/;
const inTreble = (n) => dia(n) >= dia(N("C", 4)) && dia(n) <= dia(N("A", 5));
const inBass = (n) => dia(n) >= dia(N("E", 2)) && dia(n) <= dia(N("C", 4));
const inRange = (it) => (it.clef === "treble" ? inTreble(it.low) && inTreble(it.high) : inBass(it.low) && inBass(it.high));
const RARE = (n) => ["E1", "H1", "C-1", "F-1"].includes(n.letter + n.acc) || Math.abs(n.acc) > 1;
const TWO_STEP = L.slice(2, 7);
const POOLS = [POOL_1, POOL_2, POOL_3, POOL_4, POOL_5, POOL_6, POOL_7, POOL_8, POOL_9, POOL_10];

test("Paket ist registriert, ohne Tonarten", () => {
  assert.ok(PACKS.some((p) => p.id === "intervalle"));
  assert.equal(intervalle.title, "Intervalle");
  // Paketangabe bleibt allgemein (wird nirgends angezeigt), an den Stufen steht keine Klasse
  assert.equal(intervalle.grade, "Klasse 5–9");
  assert.ok(!L.some((l) => /Tonart|Moll|Dur\b/.test(l.title)));
});

test("zehn Stufen intervall-1 … -10, der Reihe nach frei, Eingabearten", () => {
  assert.deepEqual(L.map((l) => l.id), Array.from({ length: 10 }, (_, i) => `intervall-${i + 1}`));
  L.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.ok(l.title && l.hint && l.subtitle, l.id);
    assert.ok(l.example.startsWith("<svg"), l.id);
    assert.equal(l.requires, undefined, l.id);
  });
  assert.deepEqual(L.map((l) => l.input), ["choices", "choices", "choices", "choices", "choices", "choices", "choices", "letters", "letters", "choices"]);
  assert.deepEqual(L.map((l) => !!l.namesOnly), [false, false, false, false, false, false, false, true, true, false]);
  assert.deepEqual(L.map((l) => !!l.digits), [true, true, true, true, true, true, true, false, false, false]);
  // „Ganzton oder Halbton?“ gibt es hier nicht mehr (steht in Tonleitern 1–2)
  assert.ok(!L.some((l) => /Ganzton|Halbton\?/.test(l.title)));
});

test("Hilfen nur in Stufe 1, 3, 5 und 8", () => {
  assert.deepEqual(L.filter((l) => l.helps).map((l) => l.no), [1, 3, 5, 8]);
  for (const l of L.filter((x) => x.helps)) {
    assert.deepEqual(l.helps, ["klaviatur", "tabelle"]);
    assert.ok(l.helpTable.startsWith("<table") && l.helpText, l.id);
    assert.ok(/Hilfen/.test(l.subtitle), l.id);
  }
  for (const l of L.filter((x) => !x.helps)) assert.ok(!/mit Hilfen/.test(l.subtitle), l.id);
  assert.equal(L[0].helpText, HELP_TEXT_1);
  for (const i of [2, 4, 7]) assert.equal(L[i].helpText, "Die Zahl kommt aus den Notenstufen, die Klaviatur brauchst du nur für die Halbtöne.");
  // Stufe 1: nur Rahmenintervalle, ohne Halbtöne
  const t1 = L[0].helpTable;
  assert.equal(t1, frameTable());
  assert.equal((t1.match(/<tr><td>/g) || []).length, 8);
  assert.ok(t1.includes("<tr><td>Prime</td><td class=\"num\">1</td></tr>") && t1.includes("<tr><td>Oktave</td><td class=\"num\">8</td></tr>"));
  assert.ok(!/Halbt/.test(t1));
  // Stufe 3: rein, klein, groß
  assert.equal(L[2].helpTable, semitoneTable(TYPES_RKG));
  assert.ok(L[2].helpTable.includes("<th class=\"num\">klein</th><th class=\"num\">rein</th><th class=\"num\">groß</th>"));
  assert.ok(L[2].helpTable.includes("<tr><td>Terz</td><td class=\"num\">3</td><td class=\"num\"></td><td class=\"num\">4</td></tr>"));
  assert.ok(!/vermindert|übermäßig/.test(L[2].helpTable));
  // Stufe 5 und 8: mit vermindert und übermäßig (Abkürzungen mit Erklärung)
  for (const i of [4, 7]) {
    const t = L[i].helpTable;
    assert.ok(t.includes("v = vermindert") && t.includes("ü = übermäßig"), L[i].id);
    assert.ok(t.includes("<tr><td>Quarte</td><td class=\"num\">4</td><td class=\"num\"></td><td class=\"num\">5</td><td class=\"num\"></td><td class=\"num\">6</td></tr>"), L[i].id);
    assert.ok(t.includes("<tr><td>Septime</td><td class=\"num\">9</td><td class=\"num\">10</td><td class=\"num\"></td><td class=\"num\">11</td><td class=\"num\"></td></tr>"), L[i].id);
  }
});

test("Tabelle aus semitonesFor berechnet, nicht abgetippt", () => {
  const t = semitoneTable(TYPES_ALL);
  for (const ty of TYPES_ALL) assert.equal(ty.semitones, semitonesFor(ty.num, ty.quality));
  const rows = [...t.matchAll(/<tr><td>([A-Za-z]+)<\/td>((?:<td class="num">\d*<\/td>)+)<\/tr>/g)];
  assert.equal(rows.length, 8);
  for (const [, name, cells] of rows) {
    const num = INTERVAL_NAMES.indexOf(name) + 1;
    const vals = [...cells.matchAll(/<td class="num">(\d*)<\/td>/g)].map((m) => m[1]);
    QUALITY_ORDER.forEach((q, i) => {
      const allowed = TYPES_ALL.some((x) => x.num === num && x.quality === q);
      assert.equal(vals[i], allowed ? String(semitonesFor(num, q)) : "", `${name} ${q}`);
    });
  }
});

test("Erlaubte Intervalle: rein/klein/groß und die sieben verminderten bzw. übermäßigen", () => {
  assert.deepEqual(TYPES_RKG.map((t) => t.name), ["reine Prime", "kleine Sekunde", "große Sekunde", "kleine Terz", "große Terz", "reine Quarte", "reine Quinte", "kleine Sexte", "große Sexte", "kleine Septime", "große Septime", "reine Oktave"]);
  const extra = TYPES_ALL.filter((t) => !TYPES_RKG.some((r) => r.name === t.name)).map((t) => t.name);
  assert.deepEqual(extra.sort(), ["übermäßige Prime", "übermäßige Sekunde", "verminderte Quarte", "übermäßige Quarte", "verminderte Quinte", "übermäßige Quinte", "verminderte Septime"].sort());
  for (const name of ["verminderte Sekunde", "verminderte Terz", "übermäßige Terz", "verminderte Sexte", "übermäßige Sexte", "übermäßige Septime", "verminderte Oktave", "übermäßige Oktave"]) assert.ok(!ALLOWED_NAMES.includes(name), name);
  assert.deepEqual(TYPES_ALL.map((t) => t.semitones), [0, 1, 1, 2, 3, 3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 9, 10, 11, 12]);
  assert.ok(TYPES_NO_PRIME.every((t) => t.num > 1) && TYPES_NO_PRIME.length === 17);
  assert.deepEqual(qualityChoices(4, TYPES_ALL), ["verminderte Quarte", "reine Quarte", "übermäßige Quarte"]);
  assert.deepEqual(qualityChoices(7, TYPES_ALL), ["verminderte Septime", "kleine Septime", "große Septime"]);
  assert.deepEqual(qualityChoices(1, TYPES_ALL), ["reine Prime", "übermäßige Prime"]);
  assert.deepEqual(qualityChoices(2, TYPES_RKG), ["kleine Sekunde", "große Sekunde"]);
  assert.deepEqual(qualityChoices(8, TYPES_ALL), ["reine Oktave"]);
  assert.deepEqual(qualityChoices(5, TYPES_RKG), ["reine Quinte"]);
});

test("Anzahl der Aufgaben je Stufe (festgehalten)", () => {
  assert.deepEqual(POOLS.map((p) => p.length), [76, 152, 238, 471, 335, 660, 284, 284, 568, 873]);
  assert.deepEqual([BUILD_UP.length, BUILD_DOWN.length], [284, 284]);
  L.forEach((l, i) => {
    assert.equal(l.items, POOLS[i], l.id);
    assert.ok(l.subtitle.includes(String(POOLS[i].length)), l.id);
    assert.ok(new Set(many(l, 400).map((q) => q.svg + q.prompt)).size >= 8, l.id);
  });
});

test("Musik jeder Aufgabe: Zahl aus den Buchstaben, Qualität aus den Halbtönen, nur erlaubte Intervalle", () => {
  const typesOf = { 2: TYPES_RKG, 3: TYPES_RKG, 4: TYPES_ALL, 5: TYPES_ALL, 6: TYPES_NO_PRIME, 7: TYPES_NO_PRIME, 8: TYPES_NO_PRIME };
  POOLS.slice(2, 9).forEach((pool, k) => {
    const types = typesOf[k + 2];
    for (const it of pool) {
      assert.ok(usualNote(it.low) && usualNote(it.high) && !RARE(it.low) && !RARE(it.high));
      assert.ok(inRange(it), JSON.stringify(it));
      assert.equal(intervalNumber(it.low, it.high), dia(it.high) - dia(it.low) + 1);
      assert.equal(intervalNumber(it.low, it.high), it.num);
      assert.equal(intervalSemitones(it.low, it.high), semitonesFor(it.num, it.quality));
      const name = intervalName(it.low, it.high);
      assert.ok(types.some((t) => t.name === name), `Stufe ${k + 3}: ${name}`);
    }
    // jedes erlaubte Intervall kommt vor
    assert.deepEqual(new Set(pool.map((it) => intervalLabel(it.num, it.quality))), new Set(types.map((t) => t.name)), `Stufe ${k + 3}`);
  });
  // Schlüssel: 3, 5, 7, 8, 9 nur Violin; 4 und 6 beide
  for (const [pool, clefs] of [[POOL_3, ["treble"]], [POOL_4, ["treble", "bass"]], [POOL_5, ["treble"]], [POOL_6, ["treble", "bass"]], [POOL_7, ["treble"]], [POOL_9, ["treble"]]]) {
    assert.deepEqual(new Set(pool.map((it) => it.clef)), new Set(clefs));
  }
  // ♯ und ♭ gemischt ist erlaubt (es'–fis' übermäßige Sekunde); nur „Fehler finden“ schließt es aus
  assert.ok(POOL_5.some((it) => it.low.acc * it.high.acc < 0));
  assert.ok(POOL_5.some((it) => same(it.low, N("E", 4, -1)) && same(it.high, N("F", 4, 1))));
});
const same = (a, b) => a.letter === b.letter && a.octave === b.octave && a.acc === b.acc;

test("Stufe 1 und 2: Rahmenintervall, Stammtöne, acht Knöpfe in zwei Reihen", () => {
  for (const [l, pool, clefs] of [[L[0], POOL_1, ["treble"]], [L[1], POOL_2, ["treble", "bass"]]]) {
    assert.ok(pool.every((it) => it.low.acc === 0 && it.high.acc === 0 && inRange(it)));
    assert.deepEqual(new Set(pool.map((it) => it.clef)), new Set(clefs));
    assert.deepEqual([...new Set(pool.map((it) => intervalNumber(it.low, it.high)))].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
    const qs = many(l, 1600), by = {};
    for (const q of qs) {
      const num = dia(q.high) - dia(q.low) + 1;
      assert.equal(q.answer, INTERVAL_NAMES[num - 1]);
      assert.deepEqual(q.choices, INTERVAL_NAMES);
      assert.equal(q.cols, 4);
      assert.ok(q.digits && !q.steps);
      assert.ok(l.check(q, q.answer) && !l.check(q, INTERVAL_NAMES[num % 8]));
      assert.deepEqual(q.play, [q.low, q.high]);
      assert.deepEqual(q.helpMarks, [q.low, q.high]);
      assert.equal(q.svg, staffSvg(q.clef, noteSvg(q.low, q.clef, X_LOW, "", { value: NOTE_VALUE }) + noteSvg(q.high, q.clef, X_HIGH, "", { value: NOTE_VALUE })));
      assert.equal(q.statKey, `${q.answer} (${q.clef === "treble" ? "Violin" : "Bass"})`);
      by[q.answer] = (by[q.answer] || 0) + 1;
    }
    // jede Zahl etwa gleich oft
    Object.values(by).forEach((n) => assert.ok(n > 120 && n < 290, String(n)));
  }
  const q = many(L[0], 2000).find((x) => same(x.low, N("C", 4)) && same(x.high, N("E", 4)));
  assert.equal(q.reveal, "Richtig wäre: Terz (c'–e': 3 Stufen → Terz).");
  assert.equal(frameText(N("C", 4), N("C", 4)), "c'–c': 1 Stufe → Prime");
});

test("Stufe 3 bis 7: zwei Schritte, erst die Zahl, dann die passenden Qualitäten", () => {
  const typesOf = [TYPES_RKG, TYPES_RKG, TYPES_ALL, TYPES_ALL, TYPES_ALL];
  TWO_STEP.forEach((l, k) => {
    const qs = many(l, 1500), by = {};
    for (const q of qs) {
      const num = intervalNumber(q.low, q.high);
      assert.equal(q.steps.length, 2, l.id);
      const [s1, s2] = q.steps;
      assert.deepEqual(s1.choices, INTERVAL_NAMES);
      assert.equal(s1.cols, 4); assert.ok(s1.digits);
      assert.equal(s1.answer, INTERVAL_NAMES[num - 1]);
      assert.equal(q.answer, intervalName(q.low, q.high));
      assert.equal(s2.answer, q.answer);
      assert.deepEqual(s2.choices, qualityChoices(num, typesOf[k]));
      assert.equal(s2.cols, s2.choices.length);
      assert.ok(s2.choices.includes(q.answer) && s2.choices.every((c) => c.endsWith(INTERVAL_NAMES[num - 1])));
      // Mehrere Intervalle zur Zahl: Frage; nur eines (z. B. reine Quinte in Stufe 3): Bestätigung mit Halbtonzahl
      if (s2.choices.length > 1) assert.ok(s2.prompt.includes(`Welche ${INTERVAL_NAMES[num - 1]}?`) && q.partial);
      else {
        const semi = intervalSemitones(q.low, q.high);
        assert.ok(s2.prompt.includes(`Die ${INTERVAL_NAMES[num - 1]} ist hier rein: ${semi} Halbt`), s2.prompt);
        assert.ok(s2.prompt.endsWith("Zähle nach."));
        assert.equal(q.quality, "rein"); assert.equal(q.partial, undefined);
      }
      assert.ok(s1.ok.startsWith("Richtig") && s1.bad && !FORBIDDEN.test(s1.bad));
      assert.equal(q.display, stepsText(q.down ? q.high : q.low, q.down ? q.low : q.high));
      assert.ok(q.reveal.includes(q.answer), l.id);
      assert.equal(q.statKey, q.down ? `${q.answer} abwärts` : q.answer);
      assert.deepEqual(q.helpMarks, [q.low, q.high]);
      by[q.answer] = (by[q.answer] || 0) + 1;
    }
    // jedes Intervall gleich wahrscheinlich
    const n = Object.keys(by).length, avg = qs.length / n;
    assert.equal(n, l.no === 7 ? TYPES_NO_PRIME.length : typesOf[k].length, l.id);
    Object.values(by).forEach((c) => assert.ok(c > avg * 0.55 && c < avg * 1.5, `${l.id} ${c}`));
  });
  assert.equal(stepsText(N("E", 4), N("G", 4)), "e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz");
  assert.equal(stepsText(N("F", 4), N("H", 4)), "f'–h': 4 Stufen → Quarte · 6 Halbtöne → übermäßige Quarte");
  assert.equal(stepsText(N("H", 4), N("F", 5)), "h'–f'': 5 Stufen → Quinte · 6 Halbtöne → verminderte Quinte");
  assert.equal(stepsText(N("G", 4), N("E", 4)), "g'–e': 3 Stufen → Terz · 3 Halbtöne → kleine Terz");
  // nicht erlaubte Intervalle werden nicht benannt
  assert.equal(stepsText(N("F", 4), N("A", 4, 1)), "f'–ais': 3 Stufen → Terz · 5 Halbtöne");
});

test("Stufe 7: abwärts, obere Note links und zuerst gespielt, ohne Prime", () => {
  for (const q of many(L[6], 400)) {
    assert.ok(q.down && dia(q.high) > dia(q.low));
    assert.deepEqual(q.play, [q.high, q.low]);
    assert.equal(q.svg, staffSvg("treble", noteSvg(q.high, "treble", X_LOW, "", { value: NOTE_VALUE }) + noteSvg(q.low, "treble", X_HIGH, "", { value: NOTE_VALUE })));
    assert.match(q.prompt, /Abwärts/);
    assert.ok(q.display.startsWith(`${helm(q.high)}–${helm(q.low)}: `));
  }
});

test("twoStepQuestion: nur ein Intervall zur Zahl → zweiter Schritt als Bestätigung", () => {
  // Stufe 3 und 4: die Quinte gibt es nur rein
  const q = twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("G", 4), num: 5, quality: "rein" }, TYPES_RKG);
  assert.deepEqual(q.steps[1].choices, ["reine Quinte"]);
  assert.equal(q.steps[1].prompt, "c'–g': 5 Stufen → Quinte. Die Quinte ist hier rein: 7 Halbtöne. Zähle nach.");
  assert.equal(stepsFeedback(q, [true, true]), "Richtig! c'–g': 5 Stufen → Quinte · 7 Halbtöne → reine Quinte");
  // Zahl daneben, dann bestätigt: keine Rückmeldung „Die Halbtöne stimmen“, sondern die Auflösung
  assert.equal(stepsFeedback(q, [false, true]), "Richtig wäre: reine Quinte (c'–g': 5 Stufen → Quinte · 7 Halbtöne → reine Quinte).");
  // Prime: Einzahl-/Mehrzahlform der Halbtöne
  const p = twoStepQuestion({ clef: "treble", low: N("F", 4), high: N("F", 4), num: 1, quality: "rein" }, TYPES_RKG);
  assert.equal(p.steps[1].prompt, "f'–f': 1 Stufe → Prime. Die Prime ist hier rein: 0 Halbtöne. Zähle nach.");
  // Mit vermindert/übermäßig hat die Quinte drei Knöpfe, nur die Oktave bleibt Bestätigung
  assert.equal(twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("G", 4), num: 5, quality: "rein" }, TYPES_ALL).steps[1].choices.length, 3);
  const o = twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("C", 5), num: 8, quality: "rein" }, TYPES_ALL);
  assert.deepEqual(o.steps[1].choices, ["reine Oktave"]);
  assert.ok(o.steps[1].prompt.includes("Die Oktave ist hier rein: 12 Halbtöne."));
});

test("Lerntafel: mehr Abstand, wenn ein ♯ vor Prime oder Sekunde steht", () => {
  assert.deepEqual(pairExtra(1, N("C", 4, 1)), { left: 6, right: 2 });
  assert.deepEqual(pairExtra(2, N("D", 4, 1)), { left: 6, right: 2 });
  for (const [num, high] of [[2, N("D", 4, -1)], [1, N("C", 4)], [4, N("F", 4, 1)]]) assert.deepEqual(pairExtra(num, high), { left: 0, right: 0 });
});

test("twoStepQuestion: Rückmeldungen (Beispiel e'–g')", () => {
  const q = twoStepQuestion({ clef: "treble", low: N("E", 4), high: N("G", 4), num: 3, quality: "klein" }, TYPES_ALL);
  assert.equal(q.prompt, "Welches Rahmenintervall?");
  assert.equal(q.steps[0].ok, "Richtig: e'–g': 3 Stufen → Terz.");
  assert.equal(q.steps[0].bad, "Nicht ganz: e'–g': 3 Stufen → Terz.");
  assert.equal(q.steps[1].prompt, "e'–g': 3 Stufen → Terz. Welche Terz? Zähle die Halbtöne.");
  assert.deepEqual(q.steps[1].choices, ["kleine Terz", "große Terz"]);
  assert.equal(stepsFeedback(q, [true, true]), "Richtig! e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz");
  assert.equal(stepsFeedback(q, [false, true]), "Die Halbtöne stimmen, die Zahl nicht: e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz.");
  assert.equal(stepsFeedback(q, [true, false]), "Richtig wäre: kleine Terz (e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz).");
  assert.equal(stepsFeedback(q, [false, false]), q.reveal);
});

test("upperNote und usualNote", () => {
  assert.deepEqual(upperNote(N("C", 4), 3, "groß"), N("E", 4));
  assert.deepEqual(upperNote(N("E", 4, -1), 3, "groß"), N("G", 4));
  assert.deepEqual(upperNote(N("H", 3), 5, "vermindert"), N("F", 4));
  assert.deepEqual(upperNote(N("F", 4), 1, "übermäßig"), N("F", 4, 1));
  assert.deepEqual(upperNote(N("C", 4, 1), 7, "vermindert"), N("H", 4, -1));
  assert.equal(upperNote(N("C", 4), 8, "vermindert"), null); // Ces wird nicht verwendet
  assert.equal(upperNote(N("C", 4, 1), 3, "groß"), null);    // Cis–Eis: Eis wird nicht verwendet
  assert.ok(!usualNote(N("E", 4, 1)) && !usualNote(N("H", 4, 1)) && !usualNote(N("C", 4, -1)) && !usualNote(N("F", 4, -1)));
  assert.ok(usualNote(N("F", 4, 1)) && usualNote(N("G", 4, -1)));
});

test("Notation: zwei ganze Noten nebeneinander, Vorzeichen vor der Note", () => {
  assert.equal(NOTE_VALUE, 1);
  const svg = intervalSvg({ clef: "treble", low: N("H", 3), high: N("F", 4) });
  assert.equal((svg.match(/class="ledger"/g) || []).length, 1);
  assert.equal((svg.match(/class="stem"/g) || []).length, 0);
  assert.equal((svg.match(/class="notehead open"/g) || []).length, 2);
  assert.equal((intervalSvg({ clef: "bass", low: N("E", 2), high: N("C", 4) }).match(/class="ledger"/g) || []).length, 2);
  const m = intervalSvg({ clef: "treble", low: N("C", 4), high: N("E", 4, -1) }).match(/<text class="acc" x="([\d.]+)"/);
  assert.ok(m && +m[1] < X_HIGH && +m[1] > X_LOW + 20, "Vorzeichen zwischen den Noten, ohne die erste Note zu berühren");
});

test("Hilfen: Klaviatur zwei Oktaven je Schlüssel, Töne der Aufgabe markiert", () => {
  for (const l of [L[0], L[2], L[4]]) for (const q of many(l, 80)) {
    const h = helpsHtml(l, q);
    assert.ok(h.includes('class="keys-static"') && h.includes(l.helpTable) && h.includes(l.helpText), l.id);
    assert.equal((h.match(/class="wkey/g) || []).length, 15);
    assert.equal((h.match(/class="bkey/g) || []).length, 10);
    assert.ok(!/data-semi/.test(h), "nicht anklickbar");
    const marked = [...h.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]).sort((a, b) => a - b);
    assert.deepEqual(marked, [...new Set([midi(q.low), midi(q.high)])].sort((a, b) => a - b), `${l.id} ${helm(q.low)}–${helm(q.high)}`);
    const first = +h.match(/data-midi="(\d+)" data-id="w0"/)[1];
    assert.equal(first, q.clef === "treble" ? 60 : 36);
  }
  // Bauen: nur die gegebene Note markiert
  for (const q of many(L[7], 80)) {
    const h = helpsHtml(L[7], q);
    const marked = [...h.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]);
    assert.deepEqual(marked, [midi(q.given)]);
  }
  // Stufen ohne Hilfen: nichts
  for (const l of [L[1], L[3], L[5], L[6], L[8], L[9]]) assert.equal(helpsHtml(l, l.question(null)), "", l.id);
  // alle markierten Töne liegen auf der Klaviatur (c' bis c''' bzw. C bis c')
  for (const l of [L[0], L[2], L[4], L[7]]) for (const it of l.items) {
    const lo = it.clef === "bass" ? 36 : 60;
    for (const n of [it.low, it.high]) assert.ok(midi(n) >= lo && midi(n) <= lo + 24, `${l.id} ${helm(n)}`);
  }
});

test("Texte: keine verbotenen Wörter, Anrede du, keine Klassenangaben an den Stufen", () => {
  const texts = L.flatMap((l) => [l.title, l.subtitle, l.hint, l.helpText || "", l.helpTable || ""]).concat(intervalle.learn.map((c) => c.render()));
  for (const l of L) for (const q of many(l, 150)) {
    texts.push(q.prompt, q.display, q.reveal, q.partial || "", ...(q.choices || []));
    for (const st of q.steps || []) texts.push(st.ok || "", st.bad || "", st.prompt || "", ...st.choices);
  }
  for (const t of texts) assert.ok(!FORBIDDEN.test(t), t);
});

test("nie dieselbe Aufgabe zweimal hintereinander, auch in einer Runde der Engine", () => {
  for (const l of L) {
    let prev = l.question(null);
    for (let i = 0; i < 150; i++) {
      const q = l.question(prev);
      assert.ok(!(q.svg === prev.svg && q.prompt === prev.prompt), l.id);
      prev = q;
    }
    const r = makeRound(l, 10, { notes: {} });
    r.slice(1).forEach((q, i) => assert.ok(!(q.svg === r[i].svg && q.prompt === r[i].prompt), l.id));
  }
});

test("Feedback: ganze Sätze nach falscher Antwort (reveal)", () => {
  for (const l of L) for (const q of many(l, 60)) {
    assert.ok(q.reveal && q.reveal.endsWith("."), l.id);
    assert.ok(!/Das war ein/.test(feedbackText(q, false)), l.id);
    assert.ok(q.reveal.includes(typeof q.answer === "string" ? q.answer : gName(q.built)), l.id);
  }
});

test("lowerNote", () => {
  assert.deepEqual(lowerNote(N("G", 4), 3, "klein"), N("E", 4));
  assert.deepEqual(lowerNote(N("G", 4), 3, "groß"), N("E", 4, -1));
  assert.deepEqual(lowerNote(N("C", 5), 8, "rein"), N("C", 4));
  assert.equal(lowerNote(N("F", 4, -1), 4, "übermäßig"), null); // ceses
  for (const it of BUILD_UP) assert.deepEqual(lowerNote(it.built, it.num, it.quality), it.given);
});

test("Stufe 8 und 9: bauen, Buchstabe und Vorzeichen zählen, mit vermindert und übermäßig", () => {
  for (const [pool, up] of [[BUILD_UP, true], [BUILD_DOWN, false]]) {
    for (const it of pool) {
      assert.ok(usualNote(it.given) && usualNote(it.built) && inTreble(it.given) && inTreble(it.built));
      const [low, high] = up ? [it.given, it.built] : [it.built, it.given];
      assert.equal(intervalNumber(low, high), it.num);
      assert.equal(intervalSemitones(low, high), semitonesFor(it.num, it.quality));
      assert.ok(TYPES_NO_PRIME.some((t) => t.name === intervalName(low, high)));
    }
    assert.equal(new Set(pool.map((it) => intervalLabel(it.num, it.quality))).size, 17);
  }
  assert.ok(POOL_8.every((it) => it.up));
  for (const [l, dirs] of [[L[7], [true]], [L[8], [true, false]]]) {
    const seen = new Set();
    for (const q of many(l, 400)) {
      seen.add(q.up);
      assert.deepEqual(q.answer, { letter: q.built.letter, acc: q.built.acc });
      assert.equal(q.prompt, `Baue eine ${intervalLabel(q.num, q.quality)} ${q.up ? "über" : "unter"} ${helm(q.given)}.`);
      assert.ok(q.up ? dia(q.built) > dia(q.given) : dia(q.built) < dia(q.given));
      assert.ok(q.keepRow);
      assert.deepEqual(q.play, [q.given, q.built]);
      assert.deepEqual(q.helpMarks, [q.given]);
      assert.equal(q.statKey, `${intervalLabel(q.num, q.quality)}${q.up ? "" : " abwärts"} bauen`);
      assert.equal((q.svg.match(/class="note /g) || []).length, 1);
      assert.equal((q.revealSvg.match(/class="note /g) || []).length, 2);
      assert.ok(q.revealSvg.includes(`text-anchor="middle">${gName(q.built)}</text>`));
      assert.equal(q.svg.match(/viewBox="([^"]+)"/)[1], q.revealSvg.match(/viewBox="([^"]+)"/)[1]);
      assert.ok(l.check(q, { ...q.answer }) && !l.check(q, undefined) && !l.check(q, null));
      assert.ok(!l.check(q, { letter: q.answer.letter, acc: q.answer.acc + 1 }));
      assert.ok(!l.check(q, midi(q.built) % 12));
    }
    assert.deepEqual([...seen].sort(), dirs.sort());
  }
  const q = { answer: { letter: "G", acc: 1 } };
  assert.ok(checkBuild(q, { letter: "G", acc: 1 }) && !checkBuild(q, { letter: "A", acc: -1 }));
  // Stufe 9 etwa halb auf-, halb abwärts
  const up = many(L[8], 2000).filter((x) => x.up).length / 2000;
  assert.ok(up > 0.44 && up < 0.56, String(up));
});

test("Stufe 8 und 9: Name unter der gebauten Note liegt unter allem anderen", () => {
  for (const it of POOL_9) {
    const svg = buildRevealSvg(it);
    const y = +svg.match(/<text class="note-label ok" x="[\d.]+" y="([\d.]+)"/)[1];
    const h = +svg.match(/viewBox="0 0 \d+ ([\d.]+)"/)[1];
    assert.equal(h, buildHeight(it));
    assert.ok(y + 6 <= h);
    const ys = [...svg.matchAll(/<line class="(?:ledger|staff-line)"[^>]*y1="([\d.]+)"/g)].map((m) => +m[1]);
    assert.ok(Math.max(...ys) < y - 13, `${helm(it.given)} ${helm(it.built)}`);
  }
  assert.ok(buildSvg(POOL_8[0]).startsWith("<svg"));
});

test("Stufe 10: Fehler finden, genau die genannte Fehlerart liegt vor", () => {
  assert.deepEqual(SIZE_NAMES, ["kleine Sekunde", "große Sekunde", "kleine Terz", "große Terz", "reine Quarte", "reine Quinte", "kleine Sexte", "große Sexte", "kleine Septime", "große Septime", "reine Oktave"]);
  assert.deepEqual(SIZE_ORDER.map((r) => r.semitones), [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12]);
  const kinds = new Set();
  for (const it of POOL_10) {
    kinds.add(it.verdict);
    assert.ok(usualNote(it.low) && usualNote(it.shown) && !RARE(it.shown) && inTreble(it.low) && inTreble(it.shown));
    assert.ok(dia(it.shown) > dia(it.low) && intervalSemitones(it.low, it.shown) > 0);
    assert.ok(SIZE_NAMES.includes(intervalLabel(it.num, it.quality)));
    assert.deepEqual(it.right, upperNote(it.low, it.num, it.quality));
    const semi = intervalSemitones(it.low, it.shown), want = semitonesFor(it.num, it.quality);
    const sameNum = intervalNumber(it.low, it.shown) === it.num;
    if (it.verdict === VERDICT_OK) { assert.ok(sameNum && semi === want); assert.deepEqual(it.shown, it.right); }
    if (it.verdict === VERDICT_NUM) { assert.ok(!sameNum); assert.equal(Math.abs(dia(it.shown) - dia(it.right)), 1); assert.ok(SIZE_NAMES.includes(intervalName(it.low, it.shown))); }
    if (it.verdict === VERDICT_MORE) { assert.ok(sameNum && it.shown.letter === it.right.letter); assert.equal(semi, want + 1); }
    if (it.verdict === VERDICT_LESS) { assert.ok(sameNum && it.shown.letter === it.right.letter); assert.equal(semi, want - 1); }
    // kein Intervall mischt ♯ und ♭ (Sandra, 20.11.2026, nur in dieser Stufe)
    assert.ok(it.low.acc * it.shown.acc >= 0);
  }
  assert.deepEqual(kinds, new Set(VERDICTS));
  const qs = many(L[9], 2000);
  const ok = qs.filter((q) => q.answer === VERDICT_OK).length / qs.length;
  assert.ok(ok > 0.2 && ok < 0.3, String(ok));
  for (const q of qs) {
    assert.deepEqual(q.choices, VERDICTS);
    assert.equal(q.prompt, `Gebaut wurde: ${intervalLabel(q.num, q.quality)} über ${helm(q.low)} → ${helm(q.low)}–${helm(q.shown)}. Stimmt das?`);
    assert.ok(q.display.includes(stepsText(q.low, q.shown)));
    assert.equal(q.statKey, `${intervalLabel(q.num, q.quality)} (Fehler)`);
    // vermindert/übermäßig nur, wenn das gezeigte Intervall ein erlaubtes ist (dann richtig benannt)
    const shownName = intervalName(q.low, q.shown);
    if (/vermindert|übermäßig/.test(q.display)) assert.ok(ALLOWED_NAMES.includes(shownName) && q.display.includes(shownName), q.display);
  }
});

test("Lerntafeln: „So bestimmst du ein Intervall“, Intervalle über c' und c", () => {
  assert.deepEqual(intervalle.learn.map((c) => [c.title, c.clef]), [["So bestimmst du ein Intervall", undefined], ["Intervalle über c'", "treble"], ["Intervalle über c", "bass"]]);
  intervalle.learn.forEach((c) => assert.ok(!/<h[1-6]/.test(c.render()), c.title));
  const how = intervalle.learn[0].render();
  assert.ok(how.includes("<svg") && how.includes('class="bracket"'));
  assert.ok(how.includes("Rahmenintervall") && how.includes("Feinbestimmung"));
  assert.ok(how.includes("Die Zahl kommt aus den Notenstufen, die Klaviatur brauchst du nur für die Halbtöne."));
  assert.ok(how.includes("Fis ist nicht Ges"));
  assert.ok(how.includes("v = vermindert") && (how.match(/<tr><td>/g) || []).length === 8);
  assert.equal(LEARN_ROWS.length, 17);
  assert.deepEqual(LEARN_ROWS.map((r) => r.semitones), [0, 1, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 8, 9, 10, 11, 12]);
  assert.ok(LEARN_ROWS.every((r) => ALLOWED_NAMES.includes(r.name)));
  const t = intervalle.learn[1].render();
  assert.equal((t.match(/<tr><td>/g) || []).length, 17);
  for (const row of ["<tr><td>übermäßige Quarte</td><td class=\"num\">6</td><td><b>c'–fis'</b></td></tr>", "<tr><td>übermäßige Prime</td><td class=\"num\">1</td><td><b>c'–cis'</b></td></tr>",
    "<tr><td>übermäßige Sekunde</td><td class=\"num\">3</td><td><b>c'–dis'</b></td></tr>", "<tr><td>übermäßige Quinte</td><td class=\"num\">8</td><td><b>c'–gis'</b></td></tr>",
    "<tr><td>verminderte Quinte</td><td class=\"num\">6</td><td><b>c'–ges'</b></td></tr>"]) assert.ok(t.includes(row), row);
  // verminderte Quarte und Septime: Beispiele über cis'
  assert.ok(t.includes("cis'–f'") && t.includes("cis'–b'"));
  assert.equal(intervalName(N("C", 4, 1), N("F", 4)), "verminderte Quarte");
  assert.equal(intervalName(N("C", 4, 1), N("H", 4, -1)), "verminderte Septime");
  assert.ok(intervalle.learn[2].render().includes("c–es"));
});

test("describe", () => {
  assert.deepEqual(describe({ low: N("F", 4), high: N("H", 4) }), { num: 4, semi: 6, quality: "übermäßig" });
});
