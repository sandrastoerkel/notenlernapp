import { test } from "node:test";
import assert from "node:assert/strict";
import intervalle, {
  POOL_1, POOL_2, POOL_3, POOL_4, POOL_5, POOL_6, POOL_7, POOL_8, POOL_9, POOL_10, BUILD_UP, BUILD_DOWN,
  X_LOW, X_HIGH, NOTE_VALUE, LEARN_ROWS, TYPES_RKG, TYPES_ALL, TYPES_NO_PRIME, ALLOWED_NAMES, QUALITY_ORDER,
  needsNatural, naturalText, SIZE_ORDER, SIZE_NAMES, CHECK_NAMES, stepsText, frameText, qualityChoices, twoStepQuestion, intervalTable, TABLE_COLS,
  TABLE_NOTE_LESS, TABLE_NOTE_MORE, baseQuality, intervalDemo, fineText, demoXs, DEMO_EXAMPLES, DEMO_STEPS, DEMO_STEP_ONLY, demoBoard,
  HELP_TEXT, HELP_TEXT_1, VERDICTS, VERDICT_OK, VERDICT_NUM, VERDICT_MORE, VERDICT_LESS,
  buildSvg, buildRevealSvg, buildHeight, checkBuild, usualNote, upperNote, pairExtra, intervalSvg, describe,
  pairLayout, intervalBoard, PAIR_INNER, PAIR_OUTER, GROB_PROMPT, GROB_PROMPT_DOWN, demoKeysSvg,
  numberStat, twoStepStat, buildStat, checkStat, adaptOf, pickItem,
} from "../../src/packs/intervalle.js";
import { PACKS } from "../../src/packs/index.js";
import { N, dia, midi, gName, helm, intervalSemitones, lowerNote, semitonesFor, intervalNumber, intervalName, INTERVAL_NAMES, intervalLabel } from "../../src/music.js";
import { feedbackText, stepsFeedback, helpsHtml, makeRound, DEMO_LABEL } from "../../src/engine.js";
import { demoHtml, COUNT_RULE } from "../../src/demo.js";
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
  // Kein Jahrgang im Paket und an den Stufen (seit Welle 11, Schritt 11: der Jahrgang kommt über src/klasse.js)
  assert.equal(intervalle.grade, undefined);
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

test("Hilfen nur in Stufe 1, 3, 5 und 8, mit Kästchentabelle und Vorführung", () => {
  assert.deepEqual(L.filter((l) => l.helps).map((l) => l.no), [1, 3, 5, 8]);
  assert.deepEqual(L.filter((l) => l.demo).map((l) => l.no), [1, 3, 5, 8]);
  for (const l of L.filter((x) => x.helps)) {
    assert.deepEqual(l.helps, ["klaviatur", "tabelle"]);
    assert.ok(l.helpTable.startsWith('<div class="tt-wrap"><div class="tt-split">') && l.helpText, l.id);
    assert.ok(/Hilfen/.test(l.subtitle), l.id);
  }
  for (const l of L.filter((x) => !x.helps)) assert.ok(!/mit Hilfen/.test(l.subtitle), l.id);
  assert.equal(L[0].helpText, HELP_TEXT_1);
  for (const i of [2, 4, 7]) assert.equal(L[i].helpText, "Die Zahl kommt aus den Notenstufen, die Klaviatur brauchst du nur für die Halbtöne. Stufen: Beide Noten zählen mit. Halbtöne: Die Starttaste („Start“, kurz „S“) zählt nicht, du zählst die Schritte.");
  // Stufe 1: nur die Zahlen Prime … Oktave (Zahl = Stufen), keine Halbtöne
  const t1 = L[0].helpTable;
  assert.equal(t1, intervalTable("grob", { split: true }));
  assert.equal((t1.match(/class="tt-label"/g) || []).length, 8);
  assert.ok(t1.includes('<b class="num">1</b> Prime') && t1.includes('<b class="num">8</b> Oktave') && t1.includes("Stufen = Intervall"));
  assert.ok(!/class="tt-box|Halbt|vermindert/.test(t1));
  // Stufe 3: klein | rein | groß, ohne die Zeile zu vermindert/übermäßig
  assert.equal(L[2].helpTable, intervalTable("rkg", { split: true }));
  assert.ok(L[2].helpTable.includes('<th class="tt-col">klein</th><th class="tt-col fam">rein</th><th class="tt-col">groß</th>'));
  assert.ok(!/vermindert|übermäßig/.test(L[2].helpTable));
  // Stufe 5 und 8: mit der Zeile zu vermindert und übermäßig
  for (const i of [4, 7]) {
    assert.equal(L[i].helpTable, intervalTable("all", { split: true }), L[i].id);
    assert.ok(L[i].helpTable.includes(TABLE_NOTE_LESS) && L[i].helpTable.includes(TABLE_NOTE_MORE), L[i].id);
  }
  assert.equal(TABLE_NOTE_LESS + " · " + TABLE_NOTE_MORE, "vermindert = 1 Halbton weniger · übermäßig = 1 Halbton mehr");
  // keine Abkürzungen v/k/r/g/ü mehr
  for (const l of L.filter((x) => x.helps)) assert.ok(!/>[vkrgü]</.test(l.helpTable) && !/v = vermindert/.test(l.helpTable), l.id);
});

// Zeilen einer Kästchentabelle: [Zahl, Name, [{ v: Zahl oder "·", fam, st }], Zeile hervorgehoben]
const ttRows = (html) => [...html.matchAll(/<tr( class="hi")?><td class="tt-label"><b class="num">(\d)<\/b> (\w+)<\/td>((?:<td class="tt-cell[^"]*">.*?<\/td>)*)<\/tr>/g)]
  .map((m) => [+m[2], m[3], [...m[4].matchAll(/<td class="tt-cell( fam)?">(?:<span class="tt-box([^"]*)">(\d+)<\/span>|<span class="tt-dot"[^>]*>·<\/span>)<\/td>/g)].map((c) => ({ v: c[3] === undefined ? "·" : +c[3], fam: !!c[1], st: (c[2] || "").trim() })), !!m[1]]);

test("Kästchentabelle: eine Zeile je Intervall (Grobbestimmung), Werte aus semitonesFor, Familie rein hinterlegt", () => {
  assert.deepEqual(TABLE_COLS, ["klein", "rein", "groß"]);
  for (const kind of ["rkg", "all"]) for (const split of [false, true]) {
    const rows = ttRows(intervalTable(kind, { split }));
    assert.deepEqual(rows.map((r) => r[0]), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(rows.map((r) => r[1]), INTERVAL_NAMES);
    let dots = 0;
    for (const [num, , cells, hi] of rows) {
      assert.equal(hi, false);
      assert.equal(cells.length, 3);
      TABLE_COLS.forEach((q, i) => {
        const semi = semitonesFor(num, q);
        assert.equal(cells[i].v, semi === null ? "·" : semi, `${num} ${q}`);
        assert.equal(cells[i].fam, q === "rein");
        if (semi === null) dots++;
      });
    }
    assert.equal(dots, 12, "Prime, Quarte, Quinte, Oktave je zwei Punkte, die übrigen je einer");
    assert.equal((intervalTable(kind, { split }).match(/class="tt-split"/g) || []).length, split ? 1 : 0);
  }
  assert.ok(intervalTable("all").includes('<p class="tt-note small">') && !intervalTable("rkg").includes("tt-note"));
  // Hervorhebung: Zeile violett (Schritt 1), Treffer grün (Schritt 2)
  const terz = ttRows(intervalTable("all", { row: 3, hit: { num: 3, quality: "klein" } }));
  assert.deepEqual(terz.filter((r) => r[3]).map((r) => r[0]), [3]);
  assert.deepEqual(terz[2][2].map((c) => c.st), ["hit", "", ""]);
  assert.equal(terz.flatMap((r) => r[2]).filter((c) => c.st).length, 1);
  // vermindert/übermäßig: das Bezugs-Kästchen umrandet, der passende Teil der Zeile darunter grün
  const q4 = intervalTable("all", { row: 4, hit: { num: 4, quality: "übermäßig" } });
  assert.deepEqual(ttRows(q4)[3][2].map((c) => c.st), ["", "ref", ""]);
  assert.ok(q4.includes(`<span class="tt-more on">${TABLE_NOTE_MORE}</span>`) && q4.includes(`<span class="tt-less">${TABLE_NOTE_LESS}</span>`));
  const v7 = intervalTable("all", { row: 7, hit: { num: 7, quality: "vermindert" } });
  assert.deepEqual(ttRows(v7)[6][2].map((c) => c.st), ["ref", "", ""]);
  assert.ok(v7.includes(`<span class="tt-less on">`));
  assert.deepEqual([baseQuality(2, "übermäßig"), baseQuality(5, "vermindert"), baseQuality(7, "vermindert"), baseQuality(3, "klein")], ["groß", "rein", "klein", "klein"]);
  // Stufe 1: nur Namen, Zeile hervorhebbar
  assert.ok(intervalTable("grob", { row: 5 }).includes('<tr class="hi"><td class="tt-label"><b class="num">5</b> Quinte</td></tr>'));
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
  assert.deepEqual(POOLS.map((p) => p.length), [76, 152, 238, 471, 335, 660, 284, 284, 568, 1198]);
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

test("Stufe 1 und 2: Intervall bestimmen, Stammtöne, acht Knöpfe in zwei Reihen", () => {
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
    // jede Zahl etwa gleich oft, nur die Prime seltener (PRIME_WEIGHT)
    Object.entries(by).forEach(([k, n]) => assert.ok(k === "Prime" ? n < 120 : n > 120 && n < 290, `${k} ${n}`));
  }
  const q = many(L[0], 2000).find((x) => same(x.low, N("C", 4)) && same(x.high, N("E", 4)));
  assert.equal(q.reveal, "Richtig wäre: Terz (c'–e': 3 Stufen → Terz).");
  assert.equal(frameText(N("C", 4), N("C", 4)), "c'–c': 1 Stufe → Prime");
});

test("Stufe 3 bis 7: zwei Schritte, erst die Zahl, dann die passenden Qualitäten; ein Schritt bei nur einem Intervall", () => {
  const typesOf = [TYPES_RKG, TYPES_RKG, TYPES_ALL, TYPES_ALL, TYPES_ALL];
  TWO_STEP.forEach((l, k) => {
    const qs = many(l, 1500), by = {};
    assert.equal(l.twoSteps, true, l.id);
    for (const q of qs) {
      const num = intervalNumber(q.low, q.high), fine = qualityChoices(num, typesOf[k]);
      const [s1, s2] = q.steps;
      assert.deepEqual(s1.choices, INTERVAL_NAMES);
      assert.equal(s1.cols, 4); assert.ok(s1.digits);
      assert.equal(s1.answer, INTERVAL_NAMES[num - 1]);
      assert.equal(q.answer, intervalName(q.low, q.high));
      // jeder gezeigte Schritt hat mindestens zwei Knöpfe (Welle 10, B10)
      q.steps.forEach((st) => assert.ok(st.choices.length >= 2, `${l.id} ${q.answer}`));
      if (fine.length > 1) {
        assert.equal(q.steps.length, 2, l.id);
        assert.equal(s2.answer, q.answer);
        assert.deepEqual(s2.choices, fine);
        assert.equal(s2.cols, s2.choices.length);
        assert.ok(s2.choices.includes(q.answer) && s2.choices.every((c) => c.endsWith(INTERVAL_NAMES[num - 1])));
        assert.ok(s2.prompt.includes(`Welche ${INTERVAL_NAMES[num - 1]}?`) && q.partial);
        const [a, b] = q.down ? [q.high, q.low] : [q.low, q.high];
        assert.equal(q.display, needsNatural(a, b) ? `${stepsText(a, b)}. ${naturalText(a, b)}` : stepsText(a, b));
      } else {
        // Nur ein Intervall zur Zahl (z. B. reine Quinte in Stufe 3): die Aufgabe endet nach Schritt 1,
        // die Rückmeldung nennt Zahl und Halbtöne
        const semi = intervalSemitones(q.low, q.high);
        assert.equal(q.steps.length, 1, l.id);
        assert.equal(q.quality, "rein"); assert.equal(q.partial, undefined);
        assert.ok(q.display.includes(`${num} Stufe`) && q.display.endsWith(`· hier rein: ${semi} ${semi === 1 ? "Halbton" : "Halbtöne"}`), q.display);
        assert.ok(stepsFeedback(q, [true]).includes(`hier rein: ${semi} Halbt`));
        assert.ok(stepsFeedback(q, [false]).includes(`hier rein: ${semi} Halbt`));
      }
      assert.ok(s1.ok.startsWith("Richtig") && s1.bad && !FORBIDDEN.test(s1.bad));
      assert.ok(q.reveal.includes(q.answer), l.id);
      assert.equal(q.statKey, q.down ? `${q.answer} abwärts` : q.answer);
      assert.deepEqual(q.helpMarks, [q.low, q.high]);
      by[q.answer] = (by[q.answer] || 0) + 1;
    }
    // jedes Intervall gleich wahrscheinlich
    const n = Object.keys(by).length, avg = qs.length / n;
    assert.equal(n, l.no === 7 ? TYPES_NO_PRIME.length : typesOf[k].length, l.id);
    Object.entries(by).forEach(([name, c]) => assert.ok(name.endsWith("Prime") ? c < avg * 0.55 : c > avg * 0.55 && c < avg * 1.6, `${l.id} ${name} ${c}`));
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

test("twoStepQuestion: nur ein Intervall zur Zahl → kein zweiter Schritt, Rückmeldung mit Halbtonzahl", () => {
  // Stufe 3 und 4: die Quinte gibt es nur rein
  const q = twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("G", 4), num: 5, quality: "rein" }, TYPES_RKG);
  assert.equal(q.steps.length, 1);
  assert.equal(q.steps[0].answer, "Quinte");
  assert.equal(q.display, "c'–g': 5 Stufen → Quinte · hier rein: 7 Halbtöne");
  assert.equal(stepsFeedback(q, [true]), "Richtig! c'–g': 5 Stufen → Quinte · hier rein: 7 Halbtöne");
  assert.equal(stepsFeedback(q, [false]), "Richtig wäre: reine Quinte (c'–g': 5 Stufen → Quinte · hier rein: 7 Halbtöne).");
  assert.equal(q.partial, undefined);
  // Beispiel aus dem Plan: Quarte
  const f = twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("F", 4), num: 4, quality: "rein" }, TYPES_RKG);
  assert.equal(f.display, "c'–f': 4 Stufen → Quarte · hier rein: 5 Halbtöne");
  // Prime: Mehrzahlform bei 0 Halbtönen
  const p = twoStepQuestion({ clef: "treble", low: N("F", 4), high: N("F", 4), num: 1, quality: "rein" }, TYPES_RKG);
  assert.equal(p.display, "f'–f': 1 Stufe → Prime · hier rein: 0 Halbtöne");
  // Mit vermindert/übermäßig hat die Quinte drei Knöpfe, nur die Oktave endet nach Schritt 1
  assert.equal(twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("G", 4), num: 5, quality: "rein" }, TYPES_ALL).steps[1].choices.length, 3);
  const o = twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("C", 5), num: 8, quality: "rein" }, TYPES_ALL);
  assert.equal(o.steps.length, 1);
  assert.equal(o.display, "c'–c'': 8 Stufen → Oktave · hier rein: 12 Halbtöne");
  // abwärts: die obere Note zuerst
  const d = twoStepQuestion({ clef: "treble", low: N("C", 4), high: N("C", 5), num: 8, quality: "rein" }, TYPES_ALL, true);
  assert.equal(d.display, "c''–c': 8 Stufen → Oktave · hier rein: 12 Halbtöne");
});

test("Lerntafel: mehr Abstand, wenn ein ♯ vor Prime oder Sekunde steht", () => {
  assert.deepEqual(pairExtra(1, N("C", 4, 1)), { left: 6, right: 2 });
  assert.deepEqual(pairExtra(2, N("D", 4, 1)), { left: 6, right: 2 });
  for (const [num, high] of [[2, N("D", 4, -1)], [1, N("C", 4)], [4, N("F", 4, 1)]]) assert.deepEqual(pairExtra(num, high), { left: 0, right: 0 });
});

test("twoStepQuestion: Rückmeldungen (Beispiel e'–g')", () => {
  const q = twoStepQuestion({ clef: "treble", low: N("E", 4), high: N("G", 4), num: 3, quality: "klein" }, TYPES_ALL);
  assert.equal(q.prompt, "Grobbestimmung: Welches Intervall?");
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
    assert.ok(h.includes('class="keys-static') && h.includes(l.helpTable) && h.includes(l.helpText), l.id);
    // nur der nötige Ausschnitt (fit, Welle 10: B13): beide Töne, je eine weiße Taste Rand, mindestens 8 weiße
    const whites = [...h.matchAll(/class="wkey[^"]*" data-midi="(\d+)"/g)].map((m) => +m[1]);
    assert.ok(whites.length >= 8 && whites.length <= 15, `${l.id}: ${whites.length} weiße Tasten`);
    assert.ok(whites[0] <= midi(q.low) && whites.at(-1) >= midi(q.high), `${l.id}: beide Töne sichtbar`);
    assert.ok(!/data-semi/.test(h), "nicht anklickbar");
    const marked = [...h.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]).sort((a, b) => a - b);
    assert.deepEqual(marked, [...new Set([midi(q.low), midi(q.high)])].sort((a, b) => a - b), `${l.id} ${helm(q.low)}–${helm(q.high)}`);
    // die Klaviatur beginnt weiter beim C der Hilfe (data-midi der ersten Oktave), sichtbar ist der Ausschnitt
    const first = +h.match(/data-midi="(\d+)" data-id="w(\d+)"/)[1];
    assert.ok(first >= (q.clef === "treble" ? 60 : 36), l.id);
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
  // Ziele: alle erlaubten ohne Prime, also auch ü2, v4, ü4, v5, ü5, v7 (Sandra, 20.11.2026)
  assert.deepEqual(CHECK_NAMES, TYPES_NO_PRIME.map((t) => t.name));
  assert.deepEqual(CHECK_NAMES.filter((n) => !SIZE_NAMES.includes(n)).sort(), ["übermäßige Sekunde", "verminderte Quarte", "übermäßige Quarte", "verminderte Quinte", "übermäßige Quinte", "verminderte Septime"].sort());
  // Anzahl je Urteil (festgehalten): insgesamt 1198, davon 325 mit vermindertem oder übermäßigem Ziel
  const by = (pool) => VERDICTS.map((v) => pool.filter((it) => it.verdict === v).length);
  assert.deepEqual(by(POOL_10), [277, 630, 145, 146]);
  const vu = POOL_10.filter((it) => /vermindert|übermäßig/.test(it.quality));
  assert.deepEqual(by(vu), [71, 178, 35, 41]);
  // übermäßig: nie „ein Halbton zu viel“ (bräuchte Doppelkreuz, Eis oder His), vermindert nie „zu wenig“
  assert.ok(!vu.some((it) => (it.quality === "übermäßig" && it.verdict === VERDICT_MORE) || (it.quality === "vermindert" && it.verdict === VERDICT_LESS)));
  for (const n of CHECK_NAMES.filter((x) => !SIZE_NAMES.includes(x))) assert.ok(POOL_10.filter((it) => intervalLabel(it.num, it.quality) === n).length >= 18, n);
  const kinds = new Set();
  for (const it of POOL_10) {
    kinds.add(it.verdict);
    assert.ok(usualNote(it.low) && usualNote(it.shown) && !RARE(it.shown) && inTreble(it.low) && inTreble(it.shown));
    assert.ok(dia(it.shown) > dia(it.low) && intervalSemitones(it.low, it.shown) > 0);
    assert.ok(CHECK_NAMES.includes(intervalLabel(it.num, it.quality)));
    assert.deepEqual(it.right, upperNote(it.low, it.num, it.quality));
    assert.equal(intervalName(it.low, it.right), intervalLabel(it.num, it.quality));
    const semi = intervalSemitones(it.low, it.shown), want = semitonesFor(it.num, it.quality);
    const sameNum = intervalNumber(it.low, it.shown) === it.num;
    if (it.verdict === VERDICT_OK) { assert.ok(sameNum && semi === want); assert.deepEqual(it.shown, it.right); }
    if (it.verdict === VERDICT_NUM) { assert.ok(!sameNum && it.shown.letter !== it.right.letter); assert.equal(Math.abs(dia(it.shown) - dia(it.right)), 1); assert.ok(SIZE_NAMES.includes(intervalName(it.low, it.shown))); }
    if (it.verdict !== VERDICT_NUM) assert.equal(it.shown.letter, it.right.letter);
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

test("Lerntafeln: „So bestimmst du ein Intervall“ (Vorführung), Intervalle über c' und c", () => {
  assert.deepEqual(intervalle.learn.map((c) => [c.title, c.clef]), [["So bestimmst du ein Intervall", undefined], ["Intervalle über c'", "treble"], ["Intervalle über c", "bass"]]);
  intervalle.learn.forEach((c) => assert.ok(!/<h[1-6]/.test(c.render()), c.title));
  const how = intervalle.learn[0].render();
  assert.equal(how, demoBoard());
  assert.equal(typeof intervalle.learn[0].mount, "function");
  assert.ok(how.includes("data-demo-board") && how.includes("data-demo-root"));
  assert.deepEqual([...how.matchAll(/data-ex="(\d)"[^>]*>([^<]+)</g)].map((m) => m[2]), ["e'–g'", "c'–e'", "d'–fis'", "f'–h'", "d'–a'"]);
  assert.ok(how.includes(demoHtml(intervalDemo(N("E", 4), N("G", 4)), 0)));
  assert.ok(how.includes("Die Zahl kommt aus den Notenstufen, die Klaviatur brauchst du nur für die Halbtöne."));
  assert.ok(how.includes("Fis ist nicht Ges"));
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

/* ---------- Vorführung ---------- */

const count = (html, re) => (html.match(re) || []).length;
const countedKeys = (html) => [...html.matchAll(/class="[wb]key(?: mark)? count" data-midi="(\d+)"/g)].map((m) => +m[1]).sort((a, b) => a - b);

test("Vorführung: Bilder = 1 Frage + Stufen + Halbtöne + 1 Ergebnis, Nummern 1, 2, 3 …", () => {
  const all = [...DEMO_EXAMPLES.map(([low, high]) => ({ low, high, clef: "treble" })), ...POOL_3, ...POOL_5, ...POOL_8.map((it) => ({ low: it.given, high: it.built, clef: "treble" }))];
  for (const it of all) {
    const num = intervalNumber(it.low, it.high), semi = intervalSemitones(it.low, it.high), d = intervalDemo(it.low, it.high, { clef: it.clef });
    const tag = `${helm(it.low)}–${helm(it.high)}`;
    assert.deepEqual(d.steps, DEMO_STEPS);
    assert.equal(d.frames.length, 1 + num + Math.max(1, semi) + 1, tag);
    assert.deepEqual(d.frames.map((f) => f.step), [0, ...Array(num).fill(1), ...Array(Math.max(1, semi)).fill(2), 3], tag);
    d.frames.forEach((f, i) => {
      // Notenzeile: Kreise 1 … k, Zwischenstufen als hohle violette Köpfe, Klammer ab der letzten Stufe
      const k = f.step === 0 ? 0 : f.step === 1 ? f.n : num;
      const nums = [...f.body.matchAll(/<g class="dm-num"><circle[^>]*\/><text[^>]*>(\d+)<\/text><\/g>/g)].map((m) => +m[1]);
      assert.deepEqual(nums, Array.from({ length: num === 1 ? Math.min(k, 1) : k }, (_, t) => t + 1), `${tag} Bild ${i}`);
      assert.equal(count(f.body, /class="note step1"/g), Math.max(0, Math.min(k, num - 1) - 1), `${tag} Bild ${i}`);
      assert.equal(count(f.body, /class="dm-bracket"/g), k === num ? 1 : 0);
      assert.equal(count(f.body, /<tr class="hi">/g), k === num ? 1 : 0, "Zeile violett ab der letzten Stufe");
      // Klaviatur: im ersten Schritt blass, dann je Bild ein Halbton mehr (schwarze Tasten mitgezählt)
      assert.equal(f.body.includes('class="demo-keys dim"'), f.step < 2);
      const j = f.step === 2 ? f.n : f.step === 3 ? semi : 0;
      assert.deepEqual(countedKeys(f.body), Array.from({ length: j }, (_, t) => midi(it.low) + t + 1), `${tag} Bild ${i}`);
      assert.deepEqual([...f.body.matchAll(/class="kcount(?: on-black)?"[^>]*>(\d+)</g)].map((m) => +m[1]).sort((a, b) => a - b), Array.from({ length: j }, (_, t) => t + 1));
      // beide Töne der Aufgabe markiert
      for (const n of [it.low, it.high]) assert.ok(f.body.includes(`mark`) && new RegExp(`key mark( count)?" data-midi="${midi(n)}"`).test(f.body), `${tag} ${helm(n)}`);
      // Treffer grün erst im letzten Halbton-Bild und im Ergebnis
      const lit = /class="tt-box hit"|class="tt-box ref"/.test(f.body);
      assert.equal(lit, i >= d.frames.length - 2, `${tag} Bild ${i}`);
      assert.ok(f.tones.length >= 1);
    });
    const name = intervalName(it.low, it.high), last = d.frames[d.frames.length - 1];
    const nat = needsNatural(it.low, it.high) ? ` ${naturalText(it.low, it.high)}` : "";
    assert.equal(d.frames[0].text, `Welches Intervall ist ${tag}?${nat} Erst die Stufen zählen, beide Noten mit.`);
    assert.equal(d.frames[num].text, `${num} ${num === 1 ? "Stufe" : "Stufen"} = ${INTERVAL_NAMES[num - 1]}. Jetzt die Halbtöne auf der Klaviatur. ${COUNT_RULE}`);
    assert.equal(d.frames[d.frames.length - 2].text, semi === 0 ? `0 Halbtöne, dieselbe Taste → ${name}` : fineText(it.low, it.high));
    assert.deepEqual(last.result, { title: `${tag} = ${name}`, chips: [{ step: 1, text: `${num} ${num === 1 ? "Stufe" : "Stufen"}` }, { step: 2, text: `${semi} ${semi === 1 ? "Halbton" : "Halbtöne"}` }] });
    for (const f of d.frames) assert.ok(!FORBIDDEN.test(f.text || f.result.title), f.text);
  }
});

test("Vorführung: Sätze zu den Halbtönen, vermindert und übermäßig über den Bezug", () => {
  const d = intervalDemo(N("E", 4), N("G", 4));
  assert.deepEqual(d.frames.map((f) => f.text || f.result.title), [
    "Welches Intervall ist e'–g'? Erst die Stufen zählen, beide Noten mit.", "e' ist Stufe 1.", "f' ist Stufe 2.",
    `3 Stufen = Terz. Jetzt die Halbtöne auf der Klaviatur. ${COUNT_RULE}`, "Ab e' jede Taste zählen, auch die schwarzen: 1 Halbton.",
    "2 Halbtöne.", "3 Halbtöne → kleine Terz", "e'–g' = kleine Terz"]);
  assert.equal(fineText(N("F", 4), N("H", 4)), "6 Halbtöne = rein 5 + 1 → übermäßige Quarte");
  assert.equal(fineText(N("H", 4), N("F", 5)), "6 Halbtöne = rein 7 − 1 → verminderte Quinte");
  assert.equal(fineText(N("C", 4, 1), N("H", 4, -1)), "9 Halbtöne = klein 10 − 1 → verminderte Septime");
  assert.equal(fineText(N("E", 4, -1), N("F", 4, 1)), "3 Halbtöne = groß 2 + 1 → übermäßige Sekunde");
  assert.equal(fineText(N("C", 4), N("G", 4, 1)), "8 Halbtöne = rein 7 + 1 → übermäßige Quinte");
  assert.equal(fineText(N("C", 4), N("C", 4, 1)), "1 Halbton = rein 0 + 1 → übermäßige Prime");
  assert.equal(fineText(N("D", 4), N("A", 4)), "7 Halbtöne → reine Quinte");
  // Töne: je Stufe die Note der Stufe, je Halbton die Taste
  const f = intervalDemo(N("D", 4), N("F", 4, 1));
  assert.deepEqual(f.frames.slice(1, 4).map((x) => helm(x.tones[0])), ["d'", "e'", "fis'"]);
  assert.deepEqual(f.frames.slice(4, 8).map((x) => midi(x.tones[0])), [63, 64, 65, 66]);
  // Prime: ein Bild „0 Halbtöne“
  const p = intervalDemo(N("G", 4), N("G", 4));
  assert.equal(p.frames.length, 4);
  assert.equal(p.frames[2].text, "0 Halbtöne, dieselbe Taste → reine Prime");
  // Stufe 1: nur der erste Schritt, ohne Klaviatur
  const s1 = intervalDemo(N("E", 4), N("G", 4), { table: "grob", fine: false });
  assert.deepEqual(s1.steps, [DEMO_STEP_ONLY]);
  assert.equal(s1.frames.length, 1 + 3 + 1);
  assert.equal(s1.frames[3].text, "3 Stufen = Terz.");
  assert.deepEqual(s1.frames[4].result, { title: "e'–g' = Terz", chips: [{ step: 1, text: "3 Stufen" }] });
  assert.ok(s1.frames.every((x) => !x.body.includes("demo-keys") && !x.body.includes('class="tt-box')));
});

test("Vorführung: Stufen nebeneinander ohne Zusammenstoß, ♯ vor der oberen Note mit Luft", () => {
  for (let num = 2; num <= 8; num++) for (const acc of [0, 1, -1]) {
    const xs = demoXs(num, { acc });
    assert.equal(xs.length, num);
    assert.ok(xs[0] >= 88 && xs[num - 1] <= 290, `${num} ${acc}`);
    for (let i = 1; i < num; i++) assert.ok(xs[i] - xs[i - 1] >= 26, `${num}: ${xs}`);
    if (acc) assert.ok(xs[num - 1] - xs[num - 2] >= 40, `${num} ${acc}: ${xs}`);
  }
  assert.deepEqual(demoXs(1, { acc: 1 }), [X_LOW, X_HIGH]);
  // Höhe der Notenzeile bleibt in allen Bildern gleich (die Karte springt nicht)
  const d = intervalDemo(N("C", 4), N("E", 4));
  assert.equal(new Set(d.frames.map((f) => f.body.match(/viewBox="0 0 320 (\d+)"/)[1])).size, 1);
});

test("Hilfen: „Vorführen“ nur in Stufen mit Hilfen, gesperrt bis zur Antwort; Bauen zeigt das gebaute Intervall", () => {
  for (const l of L) for (const q of many(l, 30)) {
    const h = helpsHtml(l, q);
    if (!l.helps) { assert.equal(h, "", l.id); continue; }
    assert.ok(h.includes(`data-demo-btn disabled title="Vorführen geht erst nach deiner Antwort">${DEMO_LABEL}</button>`), l.id);
    assert.ok(h.includes('<div class="help-demo" hidden></div>'));
    const d = l.demo(q);
    assert.equal(d.frames[d.frames.length - 1].result.title.split(" = ")[0], `${helm(q.low)}–${helm(q.high)}`);
    if (l.no === 8) { assert.ok(same(q.low, q.given) && same(q.high, q.built)); }
    if (l.no === 1) assert.equal(d.steps.length, 1);
    else assert.ok(d.frames.some((f) => /Halbt/.test(f.text || "")));
  }
});

test("Prime selten: höchstens einmal pro Runde, über viele Runden seltener als die anderen (Sandra, 20.11.2026)", async () => {
  const { makeRound } = await import("../../src/engine.js");
  const isPrime = (q) => describe(q).num === 1;
  for (const level of intervalle.levels.filter((l) => l.items.some((it) => it.num === 1))) {
    let primes = 0, all = 0;
    for (let r = 0; r < 300; r++) {
      const round = makeRound(level, 10, {});
      const n = round.filter(isPrime).length;
      assert.ok(n <= 1, `${level.id}: ${n} Primen in einer Runde`);
      primes += n; all += round.length;
    }
    assert.ok(primes / all < 0.05, `${level.id}: Primen-Anteil ${(primes / all).toFixed(3)}`);
  }
});

/* ---------- Welle 10, A3: Auflösungszeichen ♮ ---------- */

test("needsNatural: gleiche Notenstufe, erste Note mit Vorzeichen, zweite ohne", () => {
  assert.equal(needsNatural(N("D", 4, -1), N("D", 4)), true); // des'–d'
  assert.equal(needsNatural(N("C", 4), N("C", 4, 1)), false); // c'–cis'
  assert.equal(needsNatural(N("D", 4, -1), N("D", 4, -1)), false); // des'–des' (reine Prime, beide ♭)
  assert.equal(needsNatural(N("D", 4), N("D", 5)), false); // d'–d''
  assert.equal(needsNatural(N("D", 4, -1), N("D", 5)), false); // des'–d'' (andere Stelle der Zeile)
  assert.equal(naturalText(N("D", 4, -1), N("D", 4)), "Das ♮ hebt das ♭ auf: d'.");
});

test("Aufgaben mit ♮: 9 in Stufe 5, 18 in Stufe 6, alle übermäßige Primen vom ♭-Ton", () => {
  const nat = (pool) => pool.filter((it) => needsNatural(it.low, it.high));
  assert.equal(nat(POOL_5).length, 9);
  assert.equal(nat(POOL_6).length, 18);
  for (const it of nat(POOL_6)) {
    assert.equal(it.num, 1); assert.equal(it.quality, "übermäßig"); assert.equal(it.low.acc, -1);
    const q = twoStepQuestion(it, TYPES_ALL);
    assert.equal((q.svg.match(/class="acc nat"[^>]*>♮</g) || []).length, 1, helm(it.low));
    for (const t of [q.display, q.reveal, q.partial]) assert.ok(t.endsWith(`Das ♮ hebt das ♭ auf: ${helm(it.high)}.`), t);
    const d = intervalDemo(it.low, it.high, { clef: it.clef });
    for (const f of d.frames) assert.ok(f.body.includes("♮"), helm(it.low));
  }
  // keine andere Aufgabe der Stufen 3 bis 10 bekommt ein ♮ (gleiche Stelle mit Vorzeichen kommt sonst nicht vor)
  for (const pool of [POOL_3, POOL_4, POOL_7]) for (const it of pool) if (!needsNatural(it.low, it.high)) {
    assert.ok(!twoStepQuestion(it, TYPES_ALL).svg.includes("♮"));
  }
  // reine Prime des'–des': beide ♭, kein ♮ (Voreinstellung, offen für Sandra)
  const des = POOL_5.find((it) => it.num === 1 && it.quality === "rein" && it.low.letter === "D" && it.low.acc === -1);
  const svg = twoStepQuestion(des, TYPES_ALL).svg;
  assert.equal((svg.match(/>♭</g) || []).length, 2);
  assert.ok(!svg.includes("♮"));
  // Hinweis der Stufe 5 erklärt das Zeichen
  assert.ok(L[4].hint.includes("♮") && L[4].hint.includes("des'–d'"));
  // Abschlussprüfung Welle 10: Startkarten in kurzen Zeilen, Fachwörter je eine Zeile
  assert.ok(L[4].hint.includes("\nVermindert = ein Halbton weniger als rein oder klein.\nÜbermäßig = ein Halbton mehr als rein oder groß."));
  assert.ok(L[2].hint.startsWith("Zwei Schritte:\n1. Grobbestimmung") && L[2].hint.includes("\n2. Feinbestimmung"));
});

test("Welle 10, B5: Grob- und Feinbestimmung – Fragen, Marken, Tabellenkopf, Erklärung in Stufe 3", () => {
  assert.equal(GROB_PROMPT, "Grobbestimmung: Welches Intervall?");
  assert.equal(GROB_PROMPT_DOWN, "Abwärts – Grobbestimmung: Welches Intervall?");
  for (const no of [3, 4, 5, 6]) for (const q of makeRound(L[no - 1], 20)) assert.equal(q.prompt, GROB_PROMPT, `intervall-${no}`);
  for (const q of makeRound(L[6], 20)) assert.equal(q.prompt, GROB_PROMPT_DOWN);
  assert.deepEqual(DEMO_STEPS, ["1 · Grob: Stufen zählen", "2 · Fein: Halbtöne zählen"]);
  for (const kind of ["rkg", "all"]) {
    const t = intervalTable(kind);
    assert.ok(t.includes('<th class="tt-head">Intervall</th>') && !/Rahmen/.test(t), kind);
  }
  assert.ok(intervalTable("grob").includes('class="tt tt-grob"'));
  assert.ok(L[2].hint.includes("Grobbestimmung = nur die Zahl: Prime, Sekunde, Terz …") && L[2].hint.includes("Feinbestimmung = rein, klein oder groß"));
  assert.equal(intervalle.subtitle, "Grob- und Feinbestimmung, bauen, Fehler finden");
});

test("Welle 10, B6: Satz zum Zählen in den Hilfen ab Stufe 3, „Start“ genau an der unteren Note", () => {
  for (const l of L.filter((x) => x.helps && x.no >= 3)) assert.ok(l.helpText.endsWith(COUNT_RULE), l.id);
  assert.ok(!L[0].helpText.includes(COUNT_RULE));
  assert.equal(COUNT_RULE, "Stufen: Beide Noten zählen mit. Halbtöne: Die Starttaste („Start“, kurz „S“) zählt nicht, du zählst die Schritte.");
  const all = [...DEMO_EXAMPLES.map(([low, high]) => ({ low, high, clef: "treble" })), ...POOL_3, ...POOL_5];
  for (const it of all) {
    const d = intervalDemo(it.low, it.high, { clef: it.clef }), num = intervalNumber(it.low, it.high), tag = `${helm(it.low)}–${helm(it.high)}`;
    const prime = midi(it.high) === midi(it.low);
    d.frames.forEach((f, i) => {
      const starts = [...f.body.matchAll(/data-start="(\d+)"/g)].map((m) => +m[1]);
      if (f.step >= 2 && !prime) {
        assert.ok(starts.length >= 1 && starts.every((x) => x === midi(it.low)), `${tag} Bild ${i}`);
        // weiße Taste: „Start“ (bei zwei Oktaven bis 380 px „S“ über css), schwarze Taste: „S“ (keine Ziffer)
        assert.ok(/>Start<\/text>/.test(f.body) || /kstart"[^>]*>S</.test(f.body), `${tag} Bild ${i}`);
        assert.ok(!/kstart[^"]*"[^>]*>\d</.test(f.body), `${tag} Bild ${i}: Starttaste ohne Ziffer`);
      } else assert.deepEqual(starts, [], `${tag} Bild ${i}`);
    });
    assert.ok(d.frames[num].text.endsWith(COUNT_RULE), tag);
  }
  // ohne zweiten Schritt (Stufe 1): keine Starttaste
  assert.ok(!intervalDemo(N("E", 4), N("G", 4), { table: "grob", fine: false }).frames.some((f) => f.body.includes("data-start")));
  assert.ok(!demoKeysSvg(N("E", 4), N("G", 4), 0, false).includes("data-start"));
});

test("Welle 10, B15: Intervalltafel – Paare eng, Lücken weit, Trennstrich; Knopf „anderes Intervall (Notenstufen)“", () => {
  for (const [clef, c] of [["treble", N("C", 4)], ["bass", N("C", 3)]]) {
    const svg = intervalBoard(clef);
    for (const row of [[[1, "rein"], [1, "übermäßig"], [2, "klein"]], [[2, "groß"], [2, "übermäßig"], [3, "klein"]], [[3, "groß"], [4, "rein"], [4, "übermäßig"]],
      [[5, "vermindert"], [5, "rein"], [5, "übermäßig"]], [[6, "klein"], [6, "groß"], [7, "klein"]], [[7, "groß"], [8, "rein"]]]) {
      const lay = pairLayout(row, clef, c);
      const inner = Math.max(...lay.map((p) => p.inner)), outer = Math.min(...lay.filter((p) => p.outer !== null).map((p) => p.outer));
      assert.ok(inner < outer, `${clef}: Paarabstand ${inner} < Lückenabstand ${outer}`);
      assert.ok(outer >= 2 * PAIR_INNER + 8);
      // Trennstrich mittig in der Lücke, Noten in Reihenfolge, keine Überschneidung
      lay.forEach((p, i) => {
        assert.ok(p.x2 > p.x);
        if (i) assert.ok(p.sep > lay[i - 1].x2 && p.sep < p.x, `${clef} ${i}`);
      });
    }
    assert.equal((svg.match(/class="pair-sep"/g) || []).length, 2 * 5 + 1);
    // alle Zeilen gleich breit, die Noten enden vor dem Ende der Linien
    const widths = [...svg.matchAll(/viewBox="0 0 (\d+) /g)].map((m) => +m[1]);
    assert.equal(new Set(widths).size, 1);
  }
  assert.equal(VERDICT_NUM, "anderes Intervall (Notenstufen)");
  assert.ok(L[9].hint.includes("anderes Intervall"));
  assert.ok(L[5].hint.includes("♮"), "Stufe 6 nennt das Auflösungszeichen");
});

/* ---------- Welle 11, Schritt 9: gewichtete Auswahl ---------- */

const UNSICHER = { ok: 0, bad: 8, hist: "00000000", last: "2026-11-24" };
const SICHER_HEUTE = { ok: 10, bad: 0, hist: "1111111111", last: "2026-11-25" };
const HEUTE = "2026-11-25";
// Fester Zufall (mulberry32) für die Häufigkeitstests: Die Pakete ziehen jede Auswahl über ctx.rand, deshalb
// laufen diese Tests bei jedem Aufruf gleich und können nicht zufällig scheitern.
const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// 200 Runden zu 10 Aufgaben (2000 Züge) mit Fortschritt notes, gezählt je statKey
function zuege(l, notes, runden = 200, seed = 11) {
  const count = {}, rounds = [], rand = prng(seed);
  for (let r = 0; r < runden; r++) {
    const round = makeRound(l, 10, { notes, heute: HEUTE, rand });
    rounds.push(round);
    for (const q of round) count[q.statKey] = (count[q.statKey] || 0) + 1;
  }
  return { count, rounds };
}
const pk = (q) => `${q.clef}:${dia(q.low)}/${q.low.acc}:${dia(q.high)}/${q.high.acc}`;

test("Gewichtung: Alle Aufgaben einer Gruppe tragen denselben statKey ein (sonst wirkte sie nicht)", () => {
  const same = (pool, groupOf, statOf, name) => {
    const by = new Map();
    for (const it of pool) {
      const g = groupOf(it), k = statOf(it);
      if (!by.has(g)) by.set(g, k);
      assert.equal(by.get(g), k, `${name} ${g}`);
    }
  };
  const byType = (it) => `${it.num}${it.quality}`;
  same(POOL_1, (it) => it.num, numberStat, "1");
  same(POOL_2, (it) => `${it.clef}${it.num}`, numberStat, "2");
  for (const [i, p] of [POOL_3, POOL_4, POOL_5, POOL_6].entries()) same(p, byType, (it) => twoStepStat(it), String(i + 3));
  same(POOL_7, byType, (it) => twoStepStat(it, true), "7");
  same(BUILD_UP, byType, buildStat, "8/9 auf");
  same(BUILD_DOWN, byType, buildStat, "9 ab");
  for (const v of VERDICTS) same(POOL_10.filter((it) => it.verdict === v), byType, checkStat, `10 ${v}`);
});

test("Gewichtung: statKey der Frage = statKey der Aufgabe aus dem Vorrat", () => {
  for (const it of POOL_3) assert.equal(twoStepQuestion(it, TYPES_RKG).statKey, twoStepStat(it));
  for (const it of POOL_7) assert.equal(twoStepQuestion(it, TYPES_ALL, true).statKey, twoStepStat(it, true));
  // für alle Stufen: jede gestellte Frage trägt einen statKey ein, den die Gewichtung kennt
  const stats = [numberStat, numberStat, twoStepStat, twoStepStat, twoStepStat, twoStepStat, (it) => twoStepStat(it, true), buildStat, buildStat, checkStat];
  const pools = [POOL_1, POOL_2, POOL_3, POOL_4, POOL_5, POOL_6, POOL_7, POOL_8, POOL_9, POOL_10];
  L.forEach((l, i) => {
    const known = new Set(pools[i].map((it) => stats[i](it)));
    for (const q of makeRound(l, 40, { notes: {} })) assert.ok(known.has(q.statKey), `${l.id} ${q.statKey}`);
  });
});

test("adaptOf: nur mit ctx.notes, heute aus ctx oder dem örtlichen Tag", () => {
  assert.equal(adaptOf(undefined, numberStat), null);
  assert.equal(adaptOf({ round: [] }, numberStat), null);
  const w = adaptOf({ notes: {}, heute: HEUTE }, numberStat);
  assert.equal(w.heute, HEUTE); assert.equal(w.statOf, numberStat);
  assert.match(adaptOf({ notes: {} }, numberStat).heute, /^\d{4}-\d{2}-\d{2}$/);
});

test("Gewichtung: eine unsichere Aufgabe kommt in 2000 Zügen deutlich öfter, die Regeln bleiben", () => {
  // je Stufe ein Intervall als unsicher, alle anderen sicher und heute geübt
  const cases = [[0, "Terz (Violin)"], [1, "Quinte (Bass)"], [2, "große Terz"], [3, "kleine Sexte"], [4, "übermäßige Quarte"], [5, "verminderte Quinte"],
    [6, "kleine Septime abwärts"], [7, "reine Quarte bauen"], [8, "große Sekunde abwärts bauen"], [9, "kleine Terz (Fehler)"]];
  for (const [i, key] of cases) {
    const l = L[i], base = zuege(l, {}, 60).count;
    assert.ok(base[key] > 0, `${l.id}: ${key} kommt vor`);
    const notes = Object.fromEntries(Object.keys(base).map((k) => [k, SICHER_HEUTE]));
    notes[key] = UNSICHER;
    const { count, rounds } = zuege(l, notes);
    const keys = Object.keys(count), mean = 2000 / keys.length;
    assert.ok(count[key] > 2 * mean, `${l.id}: ${key} ${count[key]} bei Mittel ${mean.toFixed(0)}`);
    // Zufallsanteil: auch sichere Aufgaben kommen weiter
    assert.equal(keys.length, Object.keys(base).length, `${l.id}: alle Aufgaben kommen weiter vor`);
    for (const round of rounds) {
      // Prime höchstens einmal je Runde, nie dieselbe Aufgabe zweimal hintereinander
      assert.ok(round.filter((q) => intervalNumber(q.low, q.high) === 1).length <= 1, `${l.id} Prime`);
      for (let j = 1; j < round.length; j++) {
        const a = round[j - 1], b = round[j];
        assert.ok(a.key || b.key ? a.key !== b.key : pk(a) !== pk(b), `${l.id} zweimal hintereinander`);
      }
    }
  }
});

test("Gewichtung: Prime als unsicher bleibt höchstens einmal je Runde und selten", () => {
  const notes = { "reine Prime": UNSICHER, "Prime (Violin)": UNSICHER };
  for (const l of [L[0], L[2]]) {
    const { count, rounds } = zuege(l, notes);
    for (const round of rounds) assert.ok(round.filter((q) => intervalNumber(q.low, q.high) === 1).length <= 1, l.id);
    const prime = count["reine Prime"] || count["Prime (Violin)"] || 0;
    assert.ok(prime <= 200, `${l.id}: Prime ${prime}`);
  }
});

test("Gewichtung: Stufe 9 und 10 behalten die Anteile von Richtung und Urteil", () => {
  const notes = { "reine Quinte bauen": UNSICHER, "große Terz (Fehler)": UNSICHER };
  const up = zuege(L[8], notes).rounds.flat().filter((q) => q.up).length;
  assert.ok(up > 850 && up < 1150, `aufwärts ${up}`);
  const ok = zuege(L[9], notes).rounds.flat().filter((q) => q.verdict === VERDICT_OK).length;
  assert.ok(ok > 380 && ok < 640, `stimmt ${ok}`);
});

test("Gewichtung: was lange nicht dran war, kommt öfter (ab 7 Tagen wie neu)", () => {
  const l = L[2], base = zuege(l, {}, 30).count;
  const notes = Object.fromEntries(Object.keys(base).map((k) => [k, SICHER_HEUTE]));
  notes["große Sexte"] = { ...SICHER_HEUTE, last: "2026-11-18" };
  // 4000 Züge, erwartet etwa das 1,55-Fache des Mittels
  const { count } = zuege(l, notes, 400), mean = 4000 / Object.keys(count).length;
  assert.ok(count["große Sexte"] > 1.3 * mean, `${count["große Sexte"]} bei Mittel ${mean.toFixed(0)}`);
  notes["große Sexte"] = { ...SICHER_HEUTE, last: "2026-11-19" };
  const c6 = zuege(l, notes, 400).count["große Sexte"];
  assert.ok(c6 < 1.3 * mean, `6 Tage: ${c6}`);
});

test("pickItem: mit w gewichtet, nie dieselbe wie prev", () => {
  const w = { notes: { "Terz (Violin)": UNSICHER }, statOf: numberStat, heute: HEUTE, rand: prng(5) };
  let terz = 0, prev = null;
  for (let i = 0; i < 2000; i++) {
    const it = pickItem(POOL_1, prev, w);
    if (prev) assert.notEqual(pk(it), pk(prev));
    if (numberStat(it) === "Terz (Violin)") terz++;
    prev = it;
  }
  const share = POOL_1.filter((it) => numberStat(it) === "Terz (Violin)").length / POOL_1.length;
  assert.ok(terz > 1.3 * share * 2000, `Terz ${terz}, gleichverteilt ${(share * 2000).toFixed(0)}`);
});
