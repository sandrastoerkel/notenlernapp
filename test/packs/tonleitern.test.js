import { test } from "node:test";
import assert from "node:assert/strict";
import tonleitern, { oddQuestion, fitsKey, lowestY, LABEL_DESC,
  TONICS, KEYS_2, KEYS_4, ITEMS_1, ITEMS_2, ITEMS_3, ITEMS_4, ITEMS_5, ITEMS_6, ITEMS_7, ITEMS_8, ITEMS_9,
  ITEMS_10, ITEMS_11, ITEMS_12, ITEMS_13,
  scaleNotes, scaleSvg, scaleX, sigList, sigChoices, fifthsOf, pickStep, usualNote, keyName,
  STEP_WHOLE, STEP_HALF, HALF_P, GAP_HALF_P, SCALE_W, SHARP_ORDER, FLAT_ORDER, SHARPS_7, FLATS_7,
  FIFTHS, keyChoices, keyChoicesFixed, minorChoices, sigText, sigSentence, nameChoices, gapStepQuestion,
  signStep, majorSinglePrompt, decisiveSign, keyWay, planTable, scaleDemo, stepDemo, keyDemo, minorDemo, buildSteps, stemNotes, sigDemoSvg,
  DEMO_STEPS_SCALE, DEMO_STEPS_KEY, DEMO_STEP_KEY_ONLY, DEMO_STEPS_MINOR, BOARDS, circleTable, HELP_TEXT_PLAN, PLAN_COLS, MINOR_VARIANTS, stemChoices, minorTonicOf, majorTonicOf, minorWay, PLAN, NO_SIGNS,
  PLAN_SHORT, PLAN_NOTE, PLAN_TEXT, sigWay, HELP_TEXT_MINOR, DECISIVE_PROMPT,
} from "../../src/packs/tonleitern.js";
import { PACKS } from "../../src/packs/index.js";
import { N, dia, midi, pc, SEMI, LETTERS, gName, helm, majorScale, majorName, minorName, majorKeyFromKeySig, relativeMinor } from "../../src/music.js";
import { textOf, feedbackText, makeRound, choicesClass, svgResultClass, choiceSet, stepsFeedback, stepsResult, helpsHtml, hasHelps, waitsForNext, helpFrom, HELP_OCTAVES } from "../../src/engine.js";
import { staffSvg } from "../../src/staff.js";
import { demoHtml } from "../../src/demo.js";

const L = tonleitern.levels;
// Stufen 1–9: Dur-Tonleitern; 10–13: Tonarten (Welle 8, 20.11.2026)
const DUR = L.slice(0, 9), KEYS = L.slice(9);
const ITEMS = [ITEMS_1, ITEMS_2, ITEMS_3, ITEMS_4, ITEMS_5, ITEMS_6, ITEMS_7, ITEMS_8, ITEMS_9];
const ALL_ITEMS = [...ITEMS, ITEMS_10, ITEMS_11, ITEMS_12, ITEMS_13];
const byId = (n) => L[n - 1];
const many = (l, n = 300) => { const out = []; let prev = null; for (let i = 0; i < n; i++) { prev = l.question(prev); out.push(prev); } return out; };
const steps = (notes) => notes.slice(1).map((n, i) => midi(n) - midi(notes[i]));

test("Paket ist registriert und steht zwischen Intervallen und Dreiklängen (seit Welle 11)", () => {
  assert.deepEqual(PACKS.map((p) => p.id), ["noten", "notenwerte", "intervalle", "tonleitern", "akkorde"]);
  assert.equal(tonleitern.title, "Tonleitern");
  assert.equal(tonleitern.subtitle, "Dur-Tonleitern bauen und lesen");
  // seit die Tonarten-Stufen (bis 7 Vorzeichen) hier stehen: Klasse 5–9 (wird nirgends angezeigt)
  assert.equal(tonleitern.grade, "Klasse 5–9");
  assert.equal(tonleitern.blitz, null);
});

test("13 Stufen mit eindeutigen IDs, der Reihe nach frei, Eingabearten", () => {
  assert.deepEqual(L.map((l) => l.id), Array.from({ length: 13 }, (_, i) => `tonleitern-${i + 1}`));
  assert.deepEqual(KEYS.map((l) => l.title), ["Tonart aus den Vorzeichen", "Tonart aus den Vorzeichen ohne Hilfen", "Parallele Molltonart", "Parallele Molltonart ohne Hilfen"]);
  assert.ok(L.every((l) => l.requires === undefined));
  L.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.ok(l.title && textOf(l.hint) && l.subtitle, l.id);
    assert.ok(l.example.startsWith("<svg"), l.id);
  });
  assert.deepEqual(L.map((l) => l.input), ["choices", "choices", "choices", "choices", "letters", "choices", "choices", "choices", "choices", "choices", "choices", "choices", "choices"]);
  assert.ok(byId(5).acc && !byId(5).namesOnly);
  // Stufen mit Hilfen tragen das im Untertitel, die ohne Hilfen nicht
  const helped = [1, 2, 4, 6, 8, 10, 12];
  L.forEach((l) => assert.equal(l.subtitle.includes("mit Hilfen"), helped.includes(l.no), l.id));
});

test("Anzahl der Aufgaben je Stufe (festgehalten)", () => {
  assert.deepEqual(ALL_ITEMS.map((p) => p.length), [14, 28, 126, 30, 108, 34, 68, 9, 18, 15, 30, 15, 30]);
  L.forEach((l, i) => {
    assert.equal(l.items, ALL_ITEMS[i], l.id);
    assert.equal(new Set(l.items.map((it) => it.key)).size, l.items.length, l.id);
    assert.ok(l.items.length >= 8, l.id);
  });
  // Stufe 6 = alle Violin-Aufgaben von Stufe 7, Stufe 8 = die Violin-Aufgaben von Stufe 9
  assert.deepEqual(ITEMS_6.map((it) => it.key), ITEMS_7.filter((it) => it.clef === "treble").map((it) => it.key));
  assert.deepEqual(ITEMS_8.map((it) => it.key), ITEMS_9.filter((it) => it.clef === "treble").map((it) => it.key));
  assert.ok(byId(7).subtitle.includes("68 Aufgaben") && byId(3).subtitle.includes("126 Schritte"));
  for (const items of [ITEMS_4, ITEMS_6, ITEMS_8, ITEMS_10, ITEMS_12]) assert.ok(items.every((it) => it.clef === "treble"));
});

test("Tonarten: bis 2 Vorzeichen C G D F B, bis 4 dazu A E Es As", () => {
  assert.deepEqual(KEYS_2.map((k) => fifthsOf(TONICS.treble[k])), [0, 1, 2, -1, -2]);
  assert.deepEqual(KEYS_4.map((k) => fifthsOf(TONICS.treble[k])), [0, 1, 2, 3, 4, -1, -2, -3, -4]);
  assert.deepEqual(KEYS_4.map((k) => keyName(TONICS.bass[k])), ["C-Dur", "G-Dur", "D-Dur", "A-Dur", "E-Dur", "F-Dur", "B-Dur", "Es-Dur", "As-Dur"]);
  assert.deepEqual(new Set(ITEMS_4.map((it) => it.k)), new Set(KEYS_2));
  assert.deepEqual(new Set(ITEMS_2.map((it) => it.k)), new Set(["G", "D", "F", "B"]));
  assert.deepEqual(new Set(ITEMS_3.map((it) => it.k)), new Set(KEYS_4));
  assert.deepEqual(new Set(ITEMS_3.map((it) => it.clef)), new Set(["treble", "bass"]));
  assert.ok(ITEMS_1.every((it) => it.k === "C") && ITEMS_2.every((it) => it.clef === "treble"));
});

test("jede Tonleiter: acht Noten, Bauplan Ganz Ganz Halb Ganz Ganz Ganz Halb, übliche Vorzeichen", () => {
  assert.deepEqual(PLAN, [2, 2, 1, 2, 2, 2, 1]);
  for (const clef of ["treble", "bass"]) for (const k of KEYS_4) {
    const notes = scaleNotes(TONICS[clef][k]);
    assert.equal(notes.length, 8);
    assert.deepEqual(steps(notes), PLAN, `${clef} ${k}`);
    notes.slice(1).forEach((n, i) => assert.equal(dia(n) - dia(notes[i]), 1));
    assert.equal(midi(notes[7]) - midi(notes[0]), 12);
    assert.ok(notes.every(usualNote), `${clef} ${k}`);
    assert.ok(!(notes.some((n) => n.acc > 0) && notes.some((n) => n.acc < 0)));
  }
  // in allen Aufgaben der Tonleiter-Stufen: Halbtöne genau bei 3–4 und 7–8, keine unerlaubten Namen
  for (const it of ITEMS.flat()) {
    assert.deepEqual(steps(it.notes), PLAN, it.key);
    assert.ok((it.shown || it.notes).every(usualNote), it.key);
    const names = (it.shown || it.notes).map(gName);
    assert.ok(names.every((n) => !["Eis", "His", "Ces", "Fes"].includes(n)), it.key);
  }
});

test("Lage: Violin c' bis a' (B-Dur b), Bass C und D klein, sonst groß; höchstens eine Hilfslinie", () => {
  const t = TONICS.treble, b = TONICS.bass;
  assert.ok(["C", "G", "D", "A", "E", "F", "Es", "As"].every((k) => t[k].octave === 4));
  assert.deepEqual(t.B, N("H", 3, -1));
  assert.ok(["C", "D"].every((k) => b[k].octave === 3));
  assert.ok(["E", "F", "G", "A", "B", "Es", "As"].every((k) => b[k].octave === 2));
  const allNotes = (clef) => KEYS_4.flatMap((k) => scaleNotes(TONICS[clef][k]));
  const range = (clef) => { const d = allNotes(clef).map(dia); return [Math.min(...d), Math.max(...d)]; };
  assert.deepEqual(range("treble"), [dia(N("H", 3)), dia(N("A", 5))]);
  assert.deepEqual(range("bass"), [dia(N("E", 2)), dia(N("D", 4))]);
  for (const [clef, [lo, hi]] of [["treble", range("treble")], ["bass", range("bass")]]) {
    for (const it of ITEMS.flat().filter((x) => x.clef === clef)) {
      for (const n of it.shown || it.notes) assert.ok(dia(n) >= lo && dia(n) <= hi);
    }
  }
});

test("question liefert gültige Aufgaben mit display, reveal, statKey und play", () => {
  for (const l of DUR) {
    for (const q of many(l, 200)) {
      assert.ok(q.svg.startsWith("<svg") && q.prompt && q.display && q.reveal && q.statKey && q.key, l.id);
      assert.ok(q.reveal.endsWith("."), l.id);
      assert.notEqual(feedbackText(q, false), feedbackText(q, true));
      assert.ok(Array.isArray(q.play) && q.play.length >= 2, l.id);
      if (l.no >= 4) {
        assert.equal(q.play.length, 8, l.id);
        assert.ok(q.play.every((p) => p.beats === 0.5 && p.note), l.id);
        assert.deepEqual(steps(q.play.map((p) => p.note)), PLAN, l.id);
        assert.ok(q.revealSvg.startsWith("<svg"), l.id);
      }
      if (l.input === "choices") {
        assert.ok(q.choices.includes(q.answer), l.id);
        assert.equal(new Set(q.choices).size, q.choices.length, l.id);
        assert.ok(l.check(q, q.answer), l.id);
        q.choices.filter((c) => c !== q.answer).forEach((c) => assert.ok(!l.check(q, c), l.id));
        assert.ok(!l.check(q, undefined));
      }
    }
  }
});

test("Stufe 1 bis 3: Ganz- oder Halbton, zwei Knöpfe, Halbtöne mit Wahrscheinlichkeit 0,4", () => {
  for (const l of [byId(1), byId(2), byId(3)]) {
    for (const q of many(l, 200)) {
      assert.deepEqual(q.choices, [STEP_WHOLE, STEP_HALF]);
      const [a, b] = q.play;
      assert.equal(q.answer, midi(b) - midi(a) === 1 ? STEP_HALF : STEP_WHOLE);
      assert.equal(dia(b) - dia(a), 1);
      assert.match(q.statKey, /^(Halbton|Ganzton) [a-z]+–[a-z]+$/);
      assert.ok(q.svg.includes('class="note mark"') && q.svg.includes('class="bracket"'));
      assert.equal((q.svg.match(/class="note mark"/g) || []).length, 2);
      assert.ok(!q.steps && !q.keepRow);
    }
  }
  for (const it of [...ITEMS_1, ...ITEMS_2, ...ITEMS_3]) assert.equal(it.half, it.i === 2 || it.i === 6);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  let prev = null, half = 0; const n = 4000;
  for (let i = 0; i < n; i++) { prev = pickStep(ITEMS_1, prev, rnd); if (prev.half) half++; }
  assert.ok(Math.abs(half / n - HALF_P) < 0.03, String(half / n));
  const ef = ITEMS_1.find((it) => it.clef === "treble" && it.i === 2);
  assert.equal(ef.notes[2].letter + ef.notes[3].letter, "EF");
  // Stufe 3: g'–as' in Es-Dur ist ein Halbton
  const es = ITEMS_3.find((it) => it.key === "treble:Es:2");
  assert.equal(es.half, true);
  assert.equal(gName(es.notes[3]), "As");
});

test("Stufe 4: zwei Schritte – Ganz oder Halb, dann der Name aus 2 oder 3 Knöpfen", () => {
  const SETS = { C: ["C", "Cis"], D: ["D", "Dis", "Des"], E: ["E", "Es"], F: ["F", "Fis"], G: ["G", "Gis", "Ges"], A: ["A", "Ais", "As"], H: ["H", "B"] };
  for (const l of LETTERS) assert.deepEqual(nameChoices(N(l, 4)), SETS[l], l);
  // für alle 30 Aufgaben nachgerechnet
  for (const it of ITEMS_4) {
    const q = gapStepQuestion(it);
    assert.equal(q.steps.length, 2);
    const [s1, s2] = q.steps;
    assert.deepEqual(s1.choices, [STEP_WHOLE, STEP_HALF]);
    const semi = midi(it.notes[it.i]) - midi(it.notes[it.i - 1]);
    assert.equal(s1.answer, semi === 1 ? STEP_HALF : STEP_WHOLE, it.key);
    assert.equal(s1.answer === STEP_HALF, it.i === 3, it.key);
    assert.ok(s2.choices.length === 2 || s2.choices.length === 3, it.key);
    assert.ok(s2.choices.includes(s2.answer) && s2.answer === gName(it.notes[it.i]), it.key);
    assert.deepEqual(s2.choices, SETS[it.notes[it.i].letter]);
    // keine zwei Knöpfe klingen gleich
    const pcs = s2.choices.map((c) => { const n = [0, 1, -1].map((acc) => N(it.notes[it.i].letter, 4, acc)).find((x) => gName(x) === c); return pc(midi(n)); });
    assert.equal(new Set(pcs).size, pcs.length, it.key);
    assert.equal(q.answer, s2.answer);
    assert.equal(choiceSet(q, 1), s2);
    assert.equal(q.keepRow, true);
    assert.ok(q.svg.includes('class="gap"') && q.revealSvg.includes('class="note ok"'));
    assert.match(q.statKey, /^[A-H][a-z]*-Dur, [2-7]\. Stufe \(Lücke\)$/);
    assert.ok(s1.ok.startsWith("Richtig: ") && s1.bad.startsWith("Nicht ganz: "));
    assert.equal(s2.prompt, "Welcher Ton?");
    // Rückmeldung nennt beide Denkschritte
    assert.ok(q.display.includes(s1.answer) && q.display.includes(`${semi} Halbt`) && q.display.endsWith(`→ ${s2.answer}`), q.display);
    assert.equal(stepsFeedback(q, [true, true]), `Richtig! ${q.display}`);
    assert.equal(stepsFeedback(q, [false, true]), q.partial);
    assert.ok(q.partial.startsWith("Der Ton stimmt, der Schritt nicht: "));
    assert.equal(stepsFeedback(q, [true, false]), q.reveal);
    assert.equal(stepsFeedback(q, [false, false]), q.reveal);
  }
  assert.equal(ITEMS_4.filter((it) => it.half).length, 5);
  const g = gapStepQuestion(ITEMS_4.find((it) => it.key === "treble:G:6"));
  assert.equal(g.display, "6.→7. Stufe: Ganztonschritt · e''–fis'': 2 Halbtöne → Fis");
  assert.equal(g.prompt, "Von der Note davor zur Lücke: Ganz- oder Halbtonschritt?");
  // Halbtonschritt mit Wahrscheinlichkeit 1/3
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  let prev = null, half = 0; const n = 6000;
  for (let i = 0; i < n; i++) { prev = pickStep(ITEMS_4, prev, rnd, GAP_HALF_P); if (prev.half) half++; }
  assert.ok(Math.abs(half / n - 1 / 3) < 0.03, String(half / n));
});

test("Stufe 5: Lücke, Antwort { letter, acc }, Klaviatur zählt die Tonklasse", () => {
  const l = byId(5);
  for (const q of many(l, 300)) {
    assert.ok(q.svg.includes('class="gap"') && q.svg.includes(">?<"));
    assert.ok(!q.revealSvg.includes('class="gap"') && q.revealSvg.includes('class="note ok"'));
    assert.equal(q.keepRow, true);
    assert.equal(svgResultClass(q, true), "");
    assert.equal(svgResultClass(q, false), "");
    assert.equal((q.revealSvg.match(/class="note ok"/g) || []).length, 1);
    const lab = [...q.revealSvg.matchAll(/<text class="note-label ok" x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]+)<\/text>/g)];
    assert.equal(lab.length, 1);
    assert.equal(lab[0][3], gName(q.note));
    const it = l.items.find((x) => x.key === q.key);
    assert.equal(+lab[0][1], scaleX(it.i));
    assert.ok(l.check(q, { letter: q.answer.letter, acc: q.answer.acc }));
    assert.ok(!l.check(q, { letter: q.answer.letter, acc: q.answer.acc === 0 ? 1 : 0 }));
    assert.ok(!l.check(q, null));
    const semi = pc(midi(q.note));
    assert.ok(l.check(q, semi));
    assert.ok(!l.check(q, pc(semi + 1)));
    assert.match(q.statKey, /^[A-H][a-z]*-Dur, [2-7]\. Stufe \(Lücke\)$/);
    assert.match(q.reveal, /^Richtig wäre: [A-H][a-z]* \([A-H][a-z]*-Dur, [2-7]\. Stufe\)\. [1-6]\.→[2-7]\. Stufe: (Ganz|Halb)tonschritt · .+ → [A-H][a-z]*\.$/);
    assert.ok(/Ganztonschritt|Halbtonschritt/.test(q.display) && /Halbt(on|öne) →/.test(q.display), q.display);
  }
  assert.ok([...ITEMS_4, ...ITEMS_5].every((it) => it.i >= 1 && it.i <= 6));
  const q = l.question(null);
  const fis = { ...q, note: N("F", 4, 1), answer: { letter: "F", acc: 1 } };
  assert.ok(l.check(fis, 6) && l.check(fis, 18) && !l.check(fis, 5));
  assert.ok(!l.check(fis, { letter: "G", acc: -1 }));
});

test("Stufe 6 und 7: genau eine Note weicht um einen Halbton ab und ist die Antwort", () => {
  for (const it of ITEMS_7) {
    const diff = it.shown.map((n, j) => midi(n) - midi(it.notes[j]));
    const idx = diff.map((d, j) => (d ? j : -1)).filter((j) => j >= 0);
    assert.deepEqual(idx, [it.i]);
    assert.equal(Math.abs(diff[it.i]), 1);
    assert.ok(it.i >= 1 && it.i <= 6);
    assert.equal(it.shown[it.i].letter, it.notes[it.i].letter);
    assert.ok(it.shown.every(usualNote));
    assert.notDeepEqual(steps(it.shown), PLAN);
    // der Schritt von der Note davor passt nie zum Bauplan (Rückmeldung nennt ihn)
    assert.notEqual(midi(it.shown[it.i]) - midi(it.shown[it.i - 1]), PLAN[it.i - 1], it.key);
  }
  for (const l of [byId(6), byId(7)]) for (const q of many(l, 300)) {
    assert.equal(q.choices.length, 6);
    assert.ok(choicesClass(q.choices).includes("short"));
    const it = l.items.find((x) => x.key === q.key);
    assert.deepEqual(q.choices, it.shown.slice(1, 7).map(gName));
    assert.equal(q.answer, gName(it.moved));
    assert.match(q.prompt, /^Welcher Ton passt nicht in [A-H][a-z]*-Dur\?$/);
    assert.match(q.statKey, /^[A-H][a-z]*-Dur, [2-7]\. Stufe \(Suchen\)$/);
    assert.equal((q.revealSvg.match(/class="note ok"/g) || []).length, 1);
    assert.equal(q.keepRow, true);
    assert.equal(svgResultClass(q, false), "");
    const lab = [...q.revealSvg.matchAll(/<text class="note-label ok" x="([\d.]+)"[^>]*>([^<]+)<\/text>/g)];
    assert.equal(lab.length, 1);
    assert.equal(lab[0][2], gName(it.notes[it.i]));
    assert.equal(+lab[0][1], scaleX(it.i));
  }
  const g = ITEMS_6.find((x) => x.key === "treble:G:6:-1");
  assert.equal(gName(g.moved), "F");
  const gq = oddQuestion(g);
  assert.equal(gq.prompt, "Welcher Ton passt nicht in G-Dur?");
  assert.equal(gq.answer, "F");
  assert.equal(gq.reveal, "In G-Dur heißt die 7. Stufe Fis, nicht F: 6.→7. Stufe: e''–f'': 1 Halbton, der Bauplan will Ganz → Fis.");
  assert.equal(gq.display, "F passt nicht in G-Dur: 6.→7. Stufe: e''–f'': 1 Halbton, der Bauplan will Ganz → Fis.");
});

test("Stufe 6 und 7: nur Vorzeichen der eigenen Sorte, ohne C-Dur", () => {
  assert.ok(!ITEMS_7.some((it) => it.k === "C"));
  assert.deepEqual(new Set(ITEMS_7.map((it) => it.k)), new Set(KEYS_4.filter((k) => k !== "C")));
  for (const it of ITEMS_7) {
    const f = fifthsOf(it.notes[0]);
    if (f > 0) assert.ok(it.moved.acc >= 0, it.key);
    else assert.ok(f < 0 && it.moved.acc <= 0, it.key);
    const right = it.notes[it.i];
    if (it.moved.acc === 0) assert.notEqual(right.acc, 0, it.key);
    else assert.equal(right.acc, 0, it.key);
    assert.ok(!(it.shown.some((n) => n.acc > 0) && it.shown.some((n) => n.acc < 0)), it.key);
  }
  assert.equal(fitsKey(N("F", 4, -1), 1), false);
  assert.equal(fitsKey(N("F", 4, 1), -1), false);
  assert.equal(fitsKey(N("F", 4, 1), 0), false);
  assert.equal(fitsKey(N("F", 4, 0), 0), false);
  assert.equal(fitsKey(N("F", 4, 0), 1), true);
  assert.equal(fitsKey(N("A", 4, -1), -1), true);
  assert.ok(ITEMS_7.find((x) => x.key === "treble:G:6:-1"));
  assert.ok(ITEMS_7.find((x) => x.key === "treble:B:5:-1"));
  assert.ok(!ITEMS_7.find((x) => x.key === "treble:D:4:-1"));
  assert.ok(!ITEMS_7.find((x) => x.key === "bass:F:5:1"));
});

test("scaleSvg: Name unter der Note, unter dem tiefsten Punkt, Höhe wächst mit", () => {
  for (const clef of ["treble", "bass"]) for (const k of KEYS_4) {
    const notes = scaleNotes(TONICS[clef][k]);
    const svg = scaleSvg(notes, clef, { cls: { 3: "ok" }, label: { i: 3, text: gName(notes[3]) } });
    const m = svg.match(/<text class="note-label ok" x="([\d.]+)" y="([\d.]+)" text-anchor="middle">([^<]+)<\/text>/);
    assert.ok(m, `${clef} ${k}`);
    assert.equal(+m[1], scaleX(3));
    assert.equal(m[3], gName(notes[3]));
    const y = +m[2], h = +svg.match(/viewBox="0 0 368 ([\d.]+)"/)[1];
    assert.ok(y - 13 >= lowestY(notes, clef) + 5, `${clef} ${k}`);
    assert.ok(h >= 122 && h >= y + LABEL_DESC, `${clef} ${k}`);
  }
  const notes = scaleNotes(TONICS.treble.D);
  assert.ok(scaleSvg(notes, "treble").startsWith('<svg viewBox="0 0 368 122"'));
  assert.ok(!scaleSvg(notes, "treble", { cls: { 2: "ok" } }).includes("note-label"));
});

test("Stufe 8 und 9: Vorzeichen in der Reihenfolge der Vorzeichnung, vier Knöpfe", () => {
  assert.deepEqual(SHARP_ORDER, ["Fis", "Cis", "Gis", "Dis"]);
  assert.deepEqual(FLAT_ORDER, ["B", "Es", "As", "Des"]);
  assert.equal(sigList(0), "keine");
  assert.equal(sigList(2), "Fis, Cis");
  assert.equal(sigList(4), "Fis, Cis, Gis, Dis");
  assert.equal(sigList(-2), "B, Es");
  for (const it of ITEMS_9) {
    const accs = majorScale(it.notes[0]).filter((n) => n.acc).map(gName);
    const text = sigList(it.fifths);
    if (!accs.length) { assert.equal(text, "keine"); continue; }
    const list = text.split(", ");
    assert.deepEqual([...list].sort(), [...accs].sort());
    const order = it.fifths > 0 ? SHARP_ORDER : FLAT_ORDER;
    assert.deepEqual(list, order.slice(0, list.length));
  }
  assert.deepEqual([...sigChoices(0)].sort(), ["B", "Fis", "Fis, Cis", "keine"].sort());
  assert.deepEqual([...sigChoices(1)].sort(), ["B", "Fis", "Fis, Cis", "keine"].sort());
  assert.deepEqual([...sigChoices(-3)].sort(), ["B, Es", "B, Es, As", "B, Es, As, Des", "Fis, Cis, Gis"].sort());
  assert.deepEqual([...sigChoices(4)].sort(), ["B, Es, As, Des", "Fis, Cis", "Fis, Cis, Gis", "Fis, Cis, Gis, Dis"].sort());
  assert.deepEqual([...sigChoices(-4)].sort(), ["B, Es", "B, Es, As", "B, Es, As, Des", "Fis, Cis, Gis, Dis"].sort());
  for (const l of [byId(8), byId(9)]) for (const q of many(l, 200)) {
    assert.equal(q.choices.length, 4);
    assert.equal(q.prompt, "Welche Vorzeichen stehen vorne?");
    assert.match(q.statKey, /^Vorzeichen von [A-H][a-z]*-Dur$/);
    const it = l.items.find((x) => x.key === q.key);
    assert.equal((q.revealSvg.match(/class="keysig"/g) || []).length, Math.abs(it.fifths));
    assert.ok(!q.revealSvg.includes('class="acc"'));
    assert.ok(!q.keepRow && !q.revealSvg.includes("note-label"));
    assert.equal(svgResultClass(q, true), "ok");
    assert.equal(svgResultClass(q, false), "bad");
    assert.ok(q.display.includes("Bauplan Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb"), q.display);
  }
  const d = byId(9).question({ key: "x" });
  assert.ok(d.reveal.startsWith("Richtig wäre: "));
  const dq = makeRound(byId(8), 30).find((q) => q.key === "treble:D");
  if (dq) assert.equal(dq.display, "Fis, Cis (D-Dur): der Bauplan Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb braucht Fis und Cis");
});

test("nie dieselbe Aufgabe zweimal hintereinander", () => {
  for (const l of L) {
    const qs = many(l, 400);
    qs.slice(1).forEach((q, i) => assert.notEqual(q.key, qs[i].key, l.id));
    const r = makeRound(l, 10, { notes: {} });
    r.slice(1).forEach((q, i) => assert.notEqual(q.key, r[i].key, l.id));
    assert.ok(new Set(qs.map((q) => q.key)).size >= 8, l.id);
  }
});

test("scaleSvg: Breite 368, Noten bei 84 + 36·i, mit Vorzeichnung ab 126 im Abstand 30", () => {
  assert.equal(SCALE_W, 368);
  assert.deepEqual([0, 7].map((i) => scaleX(i)), [84, 336]);
  assert.deepEqual([0, 7].map((i) => scaleX(i, 2)), [126, 336]);
  const notes = scaleNotes(TONICS.treble.D);
  const svg = scaleSvg(notes, "treble");
  assert.ok(svg.startsWith('<svg viewBox="0 0 368 122"'));
  assert.ok(svg.includes('x2="350"'));
  assert.equal((svg.match(/<ellipse class="notehead"/g) || []).length, 8);
  assert.ok(!svg.includes('class="stem"'));
  assert.equal((svg.match(/class="acc"/g) || []).length, 2);
  const marked = scaleSvg(notes, "treble", { mark: [2, 3] });
  assert.equal((marked.match(/class="bracket"/g) || []).length, 1);
  const gap = scaleSvg(notes, "treble", { gap: 4 });
  assert.equal((gap.match(/<ellipse class="notehead"/g) || []).length, 7);
});

test("staffSvg: Breite optional, ohne Angabe unverändert", () => {
  for (const clef of ["treble", "bass"]) {
    const a = staffSvg(clef, "<g/>"), b = staffSvg(clef, "<g/>", { width: 320 });
    assert.equal(a, b);
    assert.ok(a.startsWith('<svg viewBox="0 0 320 122"'));
    assert.ok(a.includes('x1="18" x2="302"'));
    assert.equal(staffSvg(clef, "", "x"), staffSvg(clef, "", { cls: "x" }));
  }
  assert.ok(staffSvg("bass", "", { width: 400, keySig: -2 }).startsWith('<svg viewBox="0 0 400 122"'));
});

test("Texte: keine verbotenen Wörter, Anrede du", () => {
  const texts = L.flatMap((l) => [l.title, l.subtitle, textOf(l.hint)]).concat(tonleitern.learn.map((c) => c.render()));
  for (const l of L) for (const q of many(l, 50)) {
    texts.push(q.prompt, q.display, q.reveal, ...(q.choices || []));
    if (q.partial) texts.push(q.partial);
    for (const st of q.steps || []) texts.push(...st.choices, st.ok || "", st.bad || "", st.prompt || "");
  }
  for (const t of texts) assert.ok(!/Fehler!|falsch|mühelos|Held|Champion|\bSie\b/.test(t), t);
  const levelTexts = texts.filter((t) => !tonleitern.learn.some((c) => c.render() === t));
  assert.ok(levelTexts.every((t) => !/Tetrachord/.test(t)));
  assert.ok(textOf(byId(8).hint).includes("Der Grundton steht zweimal da, sein Vorzeichen zählt nur einmal."));
  assert.ok(textOf(byId(9).hint).includes("Der Grundton steht zweimal da, sein Vorzeichen zählt nur einmal."));
});

test("Stufen 4–7: Frage und Auflösung gleich hoch (Karte springt nicht)", () => {
  const hOf = (svg) => svg.match(/viewBox="0 0 \d+ (\d+(?:\.\d+)?)"/)[1];
  for (const no of [4, 5, 6, 7]) {
    for (let k = 0; k < 40; k++) {
      const q = byId(no).question();
      assert.equal(hOf(q.svg), hOf(q.revealSvg), `${no} ${q.key}`);
    }
  }
});

/* ---------- Stufe 10 bis 13: Tonarten ---------- */

const keyOf = (q) => `${q.clef}:${q.fifths}`;

test("Stufe 10 bis 13: gültige Aufgaben, nie dieselbe zweimal hintereinander, statKeys wie bisher", () => {
  for (const l of KEYS) {
    const qs = many(l, 300);
    qs.slice(1).forEach((q, i) => assert.notEqual(keyOf(q), keyOf(qs[i]), l.id));
    for (const q of qs) {
      assert.ok(q.svg.startsWith("<svg") && q.prompt && q.display && q.reveal.endsWith(".") && q.statKey, l.id);
      assert.ok(q.choices.includes(q.answer) && l.check(q, q.answer));
      q.choices.filter((c) => c !== q.answer).forEach((c) => assert.ok(!l.check(q, c)));
      assert.ok(!q.keepRow);
      assert.equal(q.svg, staffSvg(q.clef, "", { keySig: q.fifths }));
    }
  }
  const q10 = many(byId(10), 200).find((q) => q.fifths === 2);
  assert.equal(q10.statKey, "Dur zu 2 ♯ (Violin)");
  const q11 = many(byId(11), 200).find((q) => q.fifths === 2 && q.clef === "treble");
  assert.equal(q11.statKey, "Dur zu 2 ♯ (Violin)");
  for (const no of [12, 13]) assert.equal(many(byId(no), 200).find((q) => q.fifths === -3).statKey, "Moll zu Es-Dur");
});

test("Stufe 10: zwei Schritte – entscheidendes Vorzeichen, dann die Dur-Tonart (alle 15 nachgerechnet)", () => {
  assert.deepEqual(SHARPS_7, ["Fis", "Cis", "Gis", "Dis", "Ais", "Eis", "His"]);
  assert.deepEqual(FLATS_7, ["B", "Es", "As", "Des", "Ges", "Ces", "Fes"]);
  const majorPc = (f) => { const t = majorKeyFromKeySig(f); return pc(SEMI[t.letter] + t.acc); };
  const want = {
    0: [null, "C-Dur"], 1: ["Fis", "G-Dur"], 2: ["Cis", "D-Dur"], 3: ["Gis", "A-Dur"], 4: ["Dis", "E-Dur"], 5: ["Ais", "H-Dur"], 6: ["Eis", "Fis-Dur"], 7: ["His", "Cis-Dur"],
    [-1]: [null, "F-Dur"], [-2]: ["B", "B-Dur"], [-3]: ["Es", "Es-Dur"], [-4]: ["As", "As-Dur"], [-5]: ["Des", "Des-Dur"], [-6]: ["Ges", "Ges-Dur"], [-7]: ["Ces", "Ces-Dur"],
  };
  for (const f of FIFTHS) {
    assert.deepEqual([decisiveSign(f), majorName(f)], want[f], String(f));
    const s1 = signStep(f);
    // Knöpfe = die Vorzeichen der Vorzeichnung in ihrer Reihenfolge
    if (f === 0) assert.deepEqual(s1.choices, [NO_SIGNS]);
    else assert.deepEqual(s1.choices, (f > 0 ? SHARPS_7 : FLATS_7).slice(0, Math.abs(f)));
    assert.ok(s1.choices.includes(s1.answer));
    assert.equal(new Set(s1.choices).size, s1.choices.length);
    if (f > 0) {
      // ein Halbton über dem letzten Kreuz liegt der Grundton
      const n = [0, 1, -1].flatMap((a) => LETTERS.map((l) => N(l, 4, a))).find((x) => gName(x) === s1.answer);
      assert.equal(pc(midi(n) + 1), majorPc(f), String(f));
    }
    if (f < -1) assert.equal(s1.answer + "-Dur", majorName(f));
    // Ein-Knopf-Fälle: C, G, F (dort entfällt der Schritt in der Aufgabe); kein Knopf nennt die Tonart
    assert.equal(s1.choices.length === 1, [0, 1, -1].includes(f), String(f));
    assert.ok(s1.choices.every((c) => !c.includes("Dur")));
    const second = keyChoicesFixed(f);
    assert.equal(second.length, 4);
    assert.ok(second.includes(majorName(f)));
    assert.equal(new Set(second.map((name) => majorPc(FIFTHS.find((x) => majorName(x) === name)))).size, 4, second.join());
    // feste Reihenfolge nach dem Quintenzirkel
    const fs = second.map((name) => FIFTHS.find((x) => majorName(x) === name));
    assert.deepEqual(fs, [...fs].sort((a, b) => a - b));
    assert.deepEqual(keyChoicesFixed(f), second);
  }
  assert.equal(signStep(-1).ok, "Richtig: Hier steht nur ein Be. Ein einzelnes Be ist die Ausnahme, die Tonart merkst du dir.");
  assert.equal(keyWay(4), "Letztes Kreuz Dis · einen Halbton höher → E-Dur");
  assert.equal(keyWay(-3), "Vorletztes Be Es → Es-Dur");
  assert.equal(keyWay(6), "Letztes Kreuz Eis · einen Halbton höher → Fis-Dur");
  assert.equal(keyWay(7), "Letztes Kreuz His · einen Halbton höher → Cis-Dur");
  assert.equal(keyWay(-7), "Vorletztes Be Ces → Ces-Dur");
  assert.equal(majorSinglePrompt(0), "Hier steht kein Vorzeichen: welche Dur-Tonart?");
  assert.equal(majorSinglePrompt(-1), "Hier steht nur ein Be, das ist die Ausnahme: welche Dur-Tonart?");
  assert.equal(majorSinglePrompt(1), "Fis ist das einzige Kreuz, also das letzte. Einen Halbton über Fis: welche Dur-Tonart?");
  for (const q of many(byId(10), 300)) {
    // C-Dur, G-Dur, F-Dur: Der erste Schritt hätte nur einen Knopf und entfällt (Welle 10, B10)
    const single = [0, 1, -1].includes(q.fifths);
    assert.equal(q.steps.length, single ? 1 : 2, String(q.fifths));
    q.steps.forEach((st) => assert.ok(st.choices.length >= 2, String(q.fifths)));
    const last = q.steps[q.steps.length - 1];
    assert.deepEqual(q.choices, last.choices);
    assert.equal(last.answer, q.answer);
    assert.equal(q.answer, majorName(q.fifths));
    assert.equal(q.display, keyWay(q.fifths));
    assert.equal(!!q.partial, !single);
    if (single) {
      assert.equal(q.prompt, majorSinglePrompt(q.fifths));
      assert.ok(q.prompt.endsWith("welche Dur-Tonart?") && !q.prompt.includes(q.answer), q.prompt);
      assert.equal(stepsFeedback(q, [true]), `Richtig! ${keyWay(q.fifths)}`);
      assert.equal(stepsFeedback(q, [false]), q.reveal);
      assert.equal(stepsResult(q, [false]), "bad");
    } else {
      assert.deepEqual(q.steps[0].choices, signStep(q.fifths).choices);
      assert.equal(q.prompt, "Welches Vorzeichen ist entscheidend? (Entscheidendes Vorzeichen = bei Kreuzen das letzte, bei Be das vorletzte.)");
      assert.equal(stepsFeedback(q, [true, true]), `Richtig! ${keyWay(q.fifths)}`);
      assert.equal(stepsResult(q, [false, true]), "part");
    }
    assert.equal(q.clef, "treble");
  }
});

test("Stufe 11: 15 Dur-Tonarten in beiden Schlüsseln, Rückmeldung nennt beide Denkschritte", () => {
  assert.equal(FIFTHS.length, 15);
  assert.deepEqual(new Set(ITEMS_11.map((it) => it.clef)), new Set(["treble", "bass"]));
  const answers = {};
  for (const q of many(byId(11), 600)) {
    assert.equal(q.answer, majorName(q.fifths));
    assert.equal(q.choices.length, 4);
    assert.equal(q.display, keyWay(q.fifths));
    answers[q.fifths] = q.answer;
    if (q.fifths === 3) assert.equal(q.reveal, "Drei Kreuze stehen für A-Dur (letztes Kreuz Gis · einen Halbton höher → A-Dur).");
    if (q.fifths === 0) assert.equal(q.reveal, "Ohne Vorzeichen ist es C-Dur.");
  }
  assert.deepEqual(answers, {
    0: "C-Dur", 1: "G-Dur", 2: "D-Dur", 3: "A-Dur", 4: "E-Dur", 5: "H-Dur", 6: "Fis-Dur", 7: "Cis-Dur",
    [-1]: "F-Dur", [-2]: "B-Dur", [-3]: "Es-Dur", [-4]: "As-Dur", [-5]: "Des-Dur", [-6]: "Ges-Dur", [-7]: "Ces-Dur",
  });
  assert.ok(!keyChoices(6, majorName).includes("Ges-Dur"));
  assert.ok(!keyChoices(-7, majorName).includes("H-Dur"));
  assert.ok(!keyChoices(7, majorName).includes("Des-Dur"));
  assert.equal(sigText(0), "keine Vorzeichen");
  assert.equal(sigText(3), "3 ♯");
  assert.equal(sigText(-4), "4 ♭");
  assert.equal(sigSentence(0) + " C-Dur.", "Ohne Vorzeichen ist es C-Dur.");
  assert.equal(sigSentence(1), "Ein Kreuz steht für");
  assert.equal(sigSentence(-1), "Ein Be steht für");
  assert.equal(sigSentence(-4), "Vier Be stehen für");
});

test("Stufe 12: zwei Schritte – Stammton eine Terz abwärts, dann die Molltonart (alle 15 nachgerechnet)", () => {
  assert.deepEqual(MINOR_VARIANTS, {
    C: ["c-Moll", "cis-Moll"], D: ["d-Moll", "dis-Moll"], E: ["e-Moll", "es-Moll"], F: ["f-Moll", "fis-Moll"],
    G: ["g-Moll", "gis-Moll"], A: ["a-Moll", "ais-Moll", "as-Moll"], H: ["h-Moll", "b-Moll"],
  });
  const minorPc = (f) => { const t = relativeMinor(f); return pc(SEMI[t.letter] + t.acc); };
  for (const f of FIFTHS) {
    const t = majorTonicOf(f), m = minorTonicOf(f);
    assert.equal(t.octave, 5);
    // drei Notenstufen abwärts (Dur-Grundton = 1) und drei Halbtöne abwärts
    assert.equal(dia(t) - dia(m), 2, String(f));
    assert.equal(midi(t) - midi(m), 3, String(f));
    assert.equal(gName(m).toLowerCase() + "-Moll", minorName(f));
    const vars = MINOR_VARIANTS[m.letter];
    assert.ok(vars.length === 2 || vars.length === 3);
    assert.ok(vars.includes(minorName(f)));
    // Varianten desselben Stammtons klingen nie gleich
    const pcs = vars.map((v) => minorPc(FIFTHS.find((x) => minorName(x) === v)));
    assert.equal(new Set(pcs).size, pcs.length);
    for (const r of [0, 0.4, 0.9]) {
      const c = stemChoices(m.letter, () => r);
      assert.equal(c.length, 3);
      assert.ok(c.includes(m.letter));
      // drei aufeinanderfolgende Stammtöne
      c.slice(1).forEach((x, k) => assert.equal((LETTERS.indexOf(x) - LETTERS.indexOf(c[k]) + 7) % 7, 1));
    }
  }
  assert.deepEqual(stemChoices("A", () => 0.5), ["G", "A", "H"]);
  assert.deepEqual(stemChoices("C", () => 0.5), ["H", "C", "D"]);
  assert.equal(minorWay(-3), "Es-Dur: Terz abwärts → Stammton C · 3 Halbtöne → c-Moll");
  assert.equal(minorWay(-5), "Des-Dur: Terz abwärts → Stammton H · 3 Halbtöne → b-Moll (H mit ♭ heißt B)");
  assert.equal(minorWay(3), "A-Dur: Terz abwärts → Stammton F · 3 Halbtöne → fis-Moll");
  assert.equal(minorWay(-7), "Ces-Dur: Terz abwärts → Stammton A · 3 Halbtöne → as-Moll");
  const seen = new Set();
  for (const q of many(byId(12), 400)) {
    seen.add(q.fifths);
    const [s1, s2] = q.steps;
    assert.equal(s1.answer, minorTonicOf(q.fifths).letter);
    assert.ok(s1.choices.includes(s1.answer) && s1.choices.length === 3);
    assert.deepEqual(s2.choices, MINOR_VARIANTS[s1.answer]);
    assert.equal(s2.answer, minorName(q.fifths));
    assert.equal(q.answer, s2.answer);
    assert.ok(q.prompt.includes(majorName(q.fifths)));
    assert.equal(q.display, minorWay(q.fifths));
    assert.ok(q.partial.startsWith("Die Molltonart stimmt, der Stammton nicht: "));
    if (q.fifths === -3) assert.equal(s1.ok, "Richtig: Es (1), D (2), C (3) → Stammton C.");
  }
  assert.equal(seen.size, 15);
});

test("Stufe 13: parallele Molltonart, Rückmeldung nennt beide Denkschritte", () => {
  const answers = {};
  for (const q of many(byId(13), 600)) {
    assert.equal(q.answer, minorName(q.fifths));
    assert.ok(q.prompt.includes(majorName(q.fifths)));
    assert.equal(q.choices.length, 4);
    assert.ok(q.choices.every((c) => /^[a-h](is|es|s)?-Moll$/.test(c)), q.choices.join());
    answers[q.fifths] = q.answer;
    if (q.fifths === -3) {
      assert.equal(q.display, "Terz abwärts: 3 Halbtöne unter Es liegt c → c-Moll");
      assert.equal(q.reveal, "Die parallele Molltonart zu Es-Dur ist c-Moll (Terz abwärts: 3 Halbtöne unter Es liegt c).");
    }
  }
  assert.equal(Object.keys(answers).length, 15);
  assert.equal(answers[3], "fis-Moll");
  assert.equal(answers[-6], "es-Moll");
  assert.ok(minorChoices(-3).includes("es-Moll") && minorChoices(-3).includes("c-Moll"));
});

test("Tonarten-Auswahl: nie zwei gleich klingende Tonarten, immer vier verschiedene", () => {
  const majorPc = (f) => { const t = majorKeyFromKeySig(f); return pc(SEMI[t.letter] + t.acc); };
  const minorPc = (f) => { const t = relativeMinor(f); return pc(SEMI[t.letter] + t.acc); };
  const byMajor = new Map(FIFTHS.map((f) => [majorName(f), majorPc(f)]));
  const byMinor = new Map(FIFTHS.map((f) => [minorName(f), minorPc(f)]));
  for (const f of FIFTHS) for (let i = 0; i < 30; i++) {
    for (const [c, m] of [[keyChoices(f, majorName), byMajor], [minorChoices(f), byMinor], [keyChoicesFixed(f), byMajor]]) {
      assert.equal(c.length, 4, c.join());
      assert.equal(new Set(c.map((n) => m.get(n))).size, 4, `${f}: ${c.join()}`);
    }
  }
  const c7 = keyChoices(7, majorName);
  assert.ok(!(c7.includes("Ces-Dur") && c7.includes("H-Dur")), c7.join());
});

const board = (title, clef) => tonleitern.learn.find((b) => b.title === title && (!clef || b.clef === clef));

test("Lerntafeln: Reihenfolge, Bauplan je Schlüssel mit Bauplan-Leiste, Tabelle der Dur-Tonleitern", () => {
  assert.deepEqual(tonleitern.learn.map((b) => [b.title, b.clef]), [
    ["So baust du eine Dur-Tonleiter", undefined], ["Bauplan Dur", "treble"], ["Bauplan Dur", "bass"], ["Dur-Tonleitern bis 4 Vorzeichen", undefined],
    ["So findest du die Tonart", undefined], ["Quintenzirkel", undefined], ["So findest du die parallele Molltonart", undefined],
  ]);
  const t = board("Bauplan Dur", "treble").render();
  assert.ok(t.includes("Ganz\u00a0Ganz\u00a0Halb · Ganz · Ganz\u00a0Ganz\u00a0Halb"));
  assert.equal((t.match(/class="bracket"/g) || []).length, 2);
  assert.ok(t.includes("e'–f'") && t.includes("h'–c''") && t.includes("Vierergruppen (Tetrachorde)"));
  assert.ok(t.includes("Ein Tetrachord sind vier stufenweise aufeinanderfolgende Töne im Umfang einer Quarte – trotz des Namens kein Akkord."));
  assert.ok(t.includes(planTable()));
  assert.ok(board("Bauplan Dur", "bass").render().includes("e–f"));
  const tab = board("Dur-Tonleitern bis 4 Vorzeichen").render();
  const rows = [...tab.matchAll(/<tr><td><b>([^<]+)<\/b><\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)].map((m) => m.slice(1));
  assert.deepEqual(rows.map((r) => r[0]), ["C-Dur", "G-Dur", "D-Dur", "A-Dur", "E-Dur", "F-Dur", "B-Dur", "Es-Dur", "As-Dur"]);
  assert.deepEqual(rows[2], ["D-Dur", "D E Fis G A H Cis D", "Fis, Cis"]);
  assert.deepEqual(rows[8], ["As-Dur", "As B C Des Es F G As", "B, Es, As, Des"]);
  // Vorführungs-Tafeln: Beispiel-Knöpfe und die erste Vorführung
  for (const [title, id, n] of [["So baust du eine Dur-Tonleiter", "scale", 5], ["So findest du die Tonart", "key", 5], ["So findest du die parallele Molltonart", "minor", 5]]) {
    const h = board(title).render();
    assert.ok(h.includes(`data-tl-board="${id}"`) && h.includes("data-demo-root") && !h.includes("data-demo-board"));
    assert.equal((h.match(/data-ex="/g) || []).length, n);
    assert.ok(typeof board(title).mount === "function");
  }
  assert.ok(board("So baust du eine Dur-Tonleiter").render().includes("As-Dur sind as'–h' 3 Halbtöne, der Bauplan will Ganz → h' wird zu b'"));
});

test("Lerntafel Quintenzirkel mit Kästchentabelle", () => {
  const q = board("Quintenzirkel").render();
  const row = (sig, dur, moll) => `<tr><td>${sig}</td><td><b>${dur}</b></td><td><b>${moll}</b></td></tr>`;
  for (const r of [["keine Vorzeichen", "C-Dur", "a-Moll"], ["6 ♯", "Fis-Dur", "dis-Moll"], ["3 ♭", "Es-Dur", "c-Moll"], ["7 ♭", "Ces-Dur", "as-Moll"], ["7 ♯", "Cis-Dur", "ais-Moll"]]) assert.ok(q.includes(row(...r)), r.join());
  assert.equal((q.match(/<tr><td>/g) || []).length, 15);
  assert.ok(q.includes(circleTable()));
  assert.ok(!/<h[1-6]/.test(q));
});

/* ---------- Hilfen (Schritt 1 der Welle 8) ---------- */

const HELPED = [1, 2, 4, 6, 8, 10, 12];
const questionsOf = (l) => {
  // jede Aufgabe der Stufe einmal (über die Pakete-Funktionen, nicht zufällig)
  const out = [];
  for (let k = 0; k < l.items.length * 12; k++) out.push(l.question(out[out.length - 1] || null));
  return out;
};

test("Hilfen: nur die Stufen 1, 2, 4, 6, 8, 10, 12, sie warten auf „Nächste Aufgabe“", () => {
  for (const l of L) {
    assert.equal(hasHelps(l), HELPED.includes(l.no), l.id);
    assert.equal(waitsForNext(l), HELPED.includes(l.no), l.id);
  }
  for (const no of [1, 2, 4, 6, 8]) {
    assert.deepEqual(byId(no).helps, ["klaviatur", "tabelle"]);
    // Stufe 8: dazu die Reihenfolge der Vorzeichen mit den gewählten Merksprüchen (Welle 10, Schritt 4)
    if (no === 8) assert.ok(textOf(byId(no).helpText).startsWith(`${HELP_TEXT_PLAN} Reihenfolge der Vorzeichen: ♯ Fis – Cis – Gis – Dis („Fünf Cowboys`));
    else assert.equal(byId(no).helpText, HELP_TEXT_PLAN);
    assert.equal(byId(no).helpTable, planTable());
  }
  assert.deepEqual(byId(10).helps, ["klaviatur", "tabelle"]);
  assert.equal(byId(10).helpTable, circleTable({ split: true }));
  assert.deepEqual(byId(12).helps, ["klaviatur"]);
  assert.equal(byId(12).helpTable, undefined);
});

test("Hilfen: Bauplan-Leiste und Quintenzirkel ohne Hervorhebung", () => {
  const plan = planTable();
  assert.deepEqual(PLAN_COLS, ["1–2", "2–3", "3–4", "4–5", "5–6", "6–7", "7–8"]);
  const boxes = [...plan.matchAll(/<span class="tt-box">(1|½)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(boxes, ["1", "1", "½", "1", "1", "1", "½"]);
  assert.deepEqual(PLAN_SHORT, boxes);
  // drei Ziffernreihen nicht verwechseln: Kopf „Stufen“, Zeile „Tonschritt“, Erklärung 1 / ½
  assert.ok(plan.includes('<th class="tt-head">Stufen</th>') && plan.includes('<td class="tt-label">Tonschritt</td>'));
  assert.ok(!plan.includes('<td class="tt-label">Schritt</td>'));
  assert.ok(plan.includes(`<p class="tt-note small">${PLAN_NOTE}</p>`));
  assert.equal(PLAN_NOTE.replace(/\u00a0/g, " "), "1 = Ganztonschritt (2 Halbtöne) · ½ = Halbtonschritt (1 Halbton)");
  // mit Halbtönen (Vorführung): zweite Zeile „Halbtöne“, grün (hit)
  const done = planTable({ done: 7 });
  assert.ok(done.includes('<td class="tt-label">Halbtöne</td>'));
  assert.deepEqual([...done.matchAll(/<span class="tt-box hit">(\d)<\/span>/g)].map((m) => +m[1]), [2, 2, 1, 2, 2, 2, 1]);
  // Halbton-Spalten 3–4 und 7–8 grau hinterlegt
  const cells = [...plan.matchAll(/<td class="tt-cell( fam)?">/g)].map((m) => !!m[1]);
  assert.deepEqual(cells, [false, false, true, false, false, false, true]);
  for (const t of [plan, circleTable({ split: true })]) {
    assert.ok(!/tt-box (hit|ref|s1)|class="hi"/.test(t), t);
  }
  const circle = circleTable();
  for (const [n, sharp, flat] of [[0, "C", "C"], [3, "A", "Es"], [7, "Cis", "Ces"], [6, "Fis", "Ges"], [5, "H", "Des"]]) {
    assert.ok(circle.includes(`<tr><td class="tt-label"><b class="num">${n}</b></td><td class="tt-cell"><span class="tt-box">${sharp}</span></td><td class="tt-cell"><span class="tt-box">${flat}</span></td></tr>`), String(n));
  }
  assert.ok(!circle.includes("Moll"));
  assert.ok(circle.includes("<th class=\"tt-col\">♯-Tonart</th><th class=\"tt-col\">♭-Tonart</th>"));
});

test("Hilfen: jede markierte Note liegt auf der gezeigten Klaviatur, Markierungen je Stufe", () => {
  for (const no of HELPED) {
    const l = byId(no);
    for (const q of questionsOf(l)) {
      const from = helpFrom(q), to = from + 12 * HELP_OCTAVES;
      const marks = (q.helpMarks || []).map(midi);
      for (const m of marks) assert.ok(m >= from && m <= to, `${l.id} ${q.key}: ${m} nicht in ${from}–${to}`);
      const html = helpsHtml(l, q);
      const shown = [...html.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]).sort((a, b) => a - b);
      assert.deepEqual(shown, [...new Set(marks)].sort((a, b) => a - b), `${l.id} ${q.key}`);
      if (no <= 8) {
        // C auf oder unter dem Grundton
        assert.equal(from % 12, 0);
        assert.ok(from <= midi(q.notes[0]) && midi(q.notes[0]) - from < 12, q.key);
        // die ganze Tonleiter passt auf die Klaviatur
        assert.ok(midi(q.notes[7]) <= to, q.key);
      }
      if (no === 1 || no === 2) assert.equal(marks.length, 2);
      if (no === 4) { assert.equal(marks.length, 7); assert.ok(!marks.includes(midi(q.note))); }
      if (no === 6) assert.deepEqual(marks, q.shown.map(midi));
      if (no === 8) assert.equal(marks.length, 8);
      if (no === 10) assert.equal(marks.length, 0);
      if (no === 12) {
        assert.equal(marks.length, 1);
        assert.equal(q.helpMarks[0].octave, 5);
        assert.ok(marks[0] - 3 >= from);
      }
    }
  }
  // B-Dur im Violinschlüssel beginnt auf b (unter c'): Klaviatur ab c
  const bq = questionsOf(byId(2)).find((q) => q.key.startsWith("treble:B:"));
  assert.equal(helpFrom(bq), 48);
  const cq = questionsOf(byId(1)).find((q) => q.clef === "bass");
  assert.equal(helpFrom(cq), 48);
});

/* ---------- Vorführungen (Schritt 2 der Welle 8) ---------- */

const NAME = (n) => gName(n).toLowerCase();
const stepsOf = (d) => d.frames.map((f) => f.step);

test("Vorführung „So baust du eine Dur-Tonleiter“: 18 Bilder, jede Berichtigung richtig (9 Tonarten × 2 Schlüssel)", () => {
  for (const clef of ["treble", "bass"]) for (const k of KEYS_4) {
    const tonic = TONICS[clef][k], final = scaleNotes(tonic), d = scaleDemo(tonic, clef), id = `${clef} ${k}`;
    assert.deepEqual(d.steps, DEMO_STEPS_SCALE);
    assert.equal(d.frames.length, 18, id);
    assert.deepEqual(stepsOf(d), [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3], id);
    // Schritt 1: Stammtöne, nur der Grundton (1 und 8) mit seinem Vorzeichen
    const stems = stemNotes(tonic);
    stems.forEach((n, i) => {
      assert.equal(n.letter, final[i].letter);
      assert.equal(n.acc, i === 0 || i === 7 ? tonic.acc : 0, id);
      assert.deepEqual(d.frames[i + 1].tones, [n]);
      assert.equal((d.frames[i + 1].body.match(/class="dm-num"/g) || []).length, i + 1, id);
    });
    assert.ok(!d.frames[8].body.includes("tt-plan") && d.frames[9].body.includes("tt-plan"), "Bauplan-Leiste erscheint im 10. Bild");
    // Schritt 2: je Bild ein Schritt, Berichtigung nur bei Abweichung, immer die obere Note
    const st = buildSteps(tonic);
    assert.equal(st.length, 7);
    st.forEach((x, i) => {
      assert.deepEqual(x.fixed, final[i + 1], `${id} ${i}`);
      assert.equal(midi(x.fixed) - midi(x.a), PLAN[i], `${id} ${i}`);
      // der folgende Schritt rechnet mit der berichtigten Note
      if (i > 0) assert.deepEqual(x.a, st[i - 1].fixed);
      const delta = x.fixed.acc - x.b.acc;
      assert.equal(delta, x.want - x.semi);
      assert.ok(Math.abs(delta) <= 1, id);
      if (x.semi < x.want) assert.equal(delta, 1, "zu klein → ♯");
      if (x.semi > x.want) assert.equal(delta, -1, "zu groß → ♭");
      const f = d.frames[10 + i];
      assert.deepEqual(f.tones, [x.a, x.fixed]);
      if (delta) {
        const half = x.semi === 1 ? "1 Halbton" : `${x.semi} Halbtöne`;
        assert.equal(f.text, `${helm(x.a)}–${helm(x.b)}: ${half}, der Bauplan will ${x.want === 2 ? "Ganz" : "Halb"} → ${helm(x.b)} wird zu ${helm(x.fixed)}`);
        assert.deepEqual(f.fix, { from: x.b, to: x.fixed });
        assert.ok(f.body.includes('class="note step2'), id);
      } else {
        assert.ok(f.text.endsWith("✓") && !f.fix, f.text);
      }
      // gezählte Halbtöne auf der Klaviatur = Bauplan, beide Tasten grün
      // (ohne die Starttaste: Sie trägt „Start“ bzw. „S“ und zählt nicht mit)
      assert.equal((f.body.match(/<text class="kcount(?: on-black)?"/g) || []).length, x.want, id);
      assert.ok(f.body.includes("tl-keys") && f.body.includes('class="tl-bracket"'));
      // Bauplan-Kästchen des Schritts grün, darunter die Halbtöne bis hierher
      assert.equal((f.body.match(/tt-box hit/g) || []).length, 1 + (i + 1), id);
    });
    // nur übliche Namen, keine Doppelvorzeichen
    assert.ok(st.every((x) => usualNote(x.fixed)), id);
    const changed = st.filter((x) => x.fixed.acc !== x.b.acc).length;
    assert.equal(changed, Math.abs(fifthsOf(tonic)) - (tonic.acc ? 1 : 0), id);
    const r = d.frames[17].result;
    assert.equal(r.title, `${keyName(tonic)}: ${final.map(NAME).join(" ")}`);
    assert.deepEqual(r.chips[0], { step: 1, text: "Bauplan Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb" });
    const f = fifthsOf(tonic);
    assert.deepEqual(r.chips[1], { step: 2, text: f ? `${Math.abs(f)} Vorzeichen: ${sigList(f)}` : "kein Vorzeichen nötig" });
    assert.deepEqual(d.frames[17].tones, final);
    d.frames.forEach((fr, i) => assert.ok(demoHtml(d, i).includes("demo-stage"), id));
  }
  // die Beispiele aus dem Plan
  const g = scaleDemo(TONICS.treble.G);
  assert.equal(g.frames[15].text, "e''–f'': 1 Halbton, der Bauplan will Ganz → f'' wird zu fis''");
  assert.equal(g.frames[16].text, "fis''–g'': 1 Halbton = Halb ✓");
  assert.equal(g.frames[17].result.title, "G-Dur: g a h c d e fis g");
  assert.deepEqual(g.frames[17].result.chips.map((c) => c.text), ["Bauplan Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb", "1 Vorzeichen: Fis"]);
  assert.equal(scaleDemo(TONICS.treble.F).frames[12].text, "a'–h': 2 Halbtöne, der Bauplan will Halb → h' wird zu b'");
  assert.equal(scaleDemo(TONICS.treble.As).frames[10].text, "as'–h': 3 Halbtöne, der Bauplan will Ganz → h' wird zu b'");
  assert.ok(scaleDemo(TONICS.treble.Es).frames.some((f) => /3 Halbtöne, der Bauplan will Ganz/.test(f.text || "")));
  assert.ok(scaleDemo(TONICS.treble.C).frames.slice(10, 17).every((f) => f.text.endsWith("✓")));
});

test("Vorführung Kurzfassung (Stufe 1 und 2): Frage, Stufen, Halbtöne, Ergebnis", () => {
  for (const it of [...ITEMS_1, ...ITEMS_2]) {
    const d = stepDemo(it.notes, it.i, it.clef), semi = midi(it.notes[it.i + 1]) - midi(it.notes[it.i]);
    assert.equal(d.frames.length, 3 + semi, it.key);
    assert.deepEqual(stepsOf(d), [0, 1, ...Array(semi).fill(2), 3]);
    assert.ok(d.frames[1].body.includes("tt-box s1"), "Bauplan-Spalte violett");
    assert.equal(d.frames[d.frames.length - 1].result.title, `${it.notes[it.i] && d.frames[0].text.split(":")[0]} = ${semi === 1 ? STEP_HALF : STEP_WHOLE}`);
    assert.equal(semi === 1, it.half);
  }
  const ef = stepDemo(scaleNotes(TONICS.treble.C), 2);
  assert.equal(ef.frames[3].result.title, "e'–f' = Halbtonschritt");
  assert.equal(ef.frames[1].text, "e' ist Stufe 3, f' Stufe 4: Der Bauplan will Halb.");
});

test("Vorführung „So findest du die Tonart“: alle 15 Tonarten, Kurzfassung für C- und F-Dur", () => {
  const majorPc = (f) => { const t = majorKeyFromKeySig(f); return pc(SEMI[t.letter] + t.acc); };
  for (const clef of ["treble", "bass"]) for (const f of FIFTHS) {
    const d = keyDemo(f, clef), n = Math.abs(f), last = d.frames[d.frames.length - 1];
    if (f === 0 || f === -1) {
      assert.deepEqual(d.steps, [DEMO_STEP_KEY_ONLY]);
      assert.equal(d.frames.length, 3);
      assert.deepEqual(stepsOf(d), [0, 1, 2]);
      assert.equal(last.result.title, `${f ? "1 ♭" : "keine Vorzeichen"} → ${majorName(f)}`);
      continue;
    }
    assert.deepEqual(d.steps, DEMO_STEPS_KEY);
    assert.equal(d.frames.length, n + 3, String(f));
    assert.deepEqual(stepsOf(d), [0, ...Array(n).fill(1), 2, 3]);
    // je Bild ein Vorzeichen mehr, nummeriert; das entscheidende erst im letzten Bild von Schritt 1 umrandet
    for (let k = 1; k <= n; k++) {
      const b = d.frames[k].body;
      assert.equal((b.match(/class="keysig/g) || []).length, k);
      assert.equal((b.match(/class="dm-num"/g) || []).length, k);
      assert.equal(b.includes("tl-decisive"), k === n, `${f} ${k}`);
    }
    const dec = decisiveSign(f), sig = d.frames[n].body;
    const marked = [...sig.matchAll(/<text class="keysig( step1)?"/g)].map((m) => !!m[1]);
    assert.equal(marked.indexOf(true), f > 0 ? n - 1 : n - 2);
    // Schritt 2: vom letzten Kreuz einen Halbton höher bzw. das vorletzte Be ist der Grundton
    const p = { Fis: 6, Cis: 1, Gis: 8, Dis: 3, Ais: 10, Eis: 5, His: 0, B: 10, Es: 3, As: 8, Des: 1, Ges: 6, Ces: 11, Fes: 4 }[dec];
    assert.equal(pc(p + (f > 0 ? 1 : 0)), majorPc(f), String(f));
    assert.equal(last.result.title, `${sigText(f)} → ${majorName(f)}`);
    assert.equal(last.result.chips[0].text, `${f > 0 ? "letztes Kreuz" : "vorletztes Be"} ${dec}`);
  }
  const a = keyDemo(3);
  assert.equal(a.frames[a.frames.length - 1].result.title, "3 ♯ → A-Dur");
  assert.deepEqual(a.frames[a.frames.length - 1].result.chips.map((c) => c.text), ["letztes Kreuz Gis", "+1 Halbton → A"]);
  assert.ok(keyDemo(7).frames[8].text.includes("His liegt auf der Taste C"));
  assert.ok(keyDemo(-7).frames[8].text.includes("Ces liegt auf der Taste H"));
  assert.equal(sigDemoSvg("treble", 3, 2).match(/class="keysig"/g).length, 2);
});

test("Vorführung „So findest du die parallele Molltonart“: alle 15 Tonarten, 8 Bilder", () => {
  for (const f of FIFTHS) {
    const d = minorDemo(f), m = minorTonicOf(f), t = majorTonicOf(f), id = String(f);
    assert.deepEqual(d.steps, DEMO_STEPS_MINOR);
    assert.equal(d.frames.length, 8, id);
    assert.deepEqual(stepsOf(d), [0, 1, 1, 1, 2, 2, 2, 3]);
    // Schritt 1: drei Notenstufen abwärts, der Dur-Grundton ist 1
    assert.deepEqual(d.frames[1].tones, [t]);
    assert.equal(dia(d.frames[3].tones[0]), dia(t) - 2);
    assert.equal(d.frames[3].tones[0].acc, 0);
    assert.ok(d.frames[3].text.includes(`Stammton ${m.letter}.`), d.frames[3].text);
    // Schritt 2: drei Halbtöne abwärts, je eine Taste mehr gezählt
    for (let j = 1; j <= 3; j++) {
      assert.equal((d.frames[3 + j].body.match(/<text class="kcount(?: on-black)?"/g) || []).length, j);
      assert.equal(midi(d.frames[3 + j].tones[0]), midi(t) - j);
    }
    assert.ok(d.frames[6].text.includes(`→ ${minorName(f)}`) && d.frames[6].text.includes("kleine Terz"), d.frames[6].text);
    if (m.acc) assert.ok(d.frames[6].text.includes(`${m.letter} wird zu ${gName(m)}`), d.frames[6].text);
    assert.ok(d.frames[6].body.includes('class="note step2'));
    assert.equal(midi(t) - midi(d.frames[7].tones[1]), 3);
    assert.equal(d.frames[7].result.title, `${majorName(f)} → ${minorName(f)}`);
    assert.deepEqual(d.frames[7].result.chips.map((c) => c.text), ["3 Stufen", "3 Halbtöne"]);
  }
  assert.ok(minorDemo(-5).frames[6].text.includes("H wird zu B → b-Moll (H mit ♭ heißt B)"));
  assert.ok(minorDemo(3).frames[6].text.includes("F wird zu Fis → fis-Moll"));
  assert.ok(minorDemo(-7).frames[4].text.includes("Ces liegt auf der Taste H"));
  assert.equal(minorDemo(-3).frames[7].result.title, "Es-Dur → c-Moll");
});

test("„Vorführen“ in den Hilfen: jede Aufgabe der Stufen mit Hilfen lässt sich vorführen", () => {
  for (const no of HELPED) {
    const l = byId(no);
    assert.equal(typeof l.demo, "function", l.id);
    for (const q of many(l, 60)) {
      const d = l.demo(q);
      assert.ok(d.frames.length >= 3 && d.steps.length >= 1, l.id);
      assert.ok(d.frames[d.frames.length - 1].result, l.id);
      assert.ok(demoHtml(d, d.frames.length - 1).includes("demo-result"));
    }
  }
  for (const no of [3, 5, 7, 9, 11, 13]) assert.equal(byId(no).demo, undefined);
  // Lerntafel-Beispiele
  assert.deepEqual(BOARDS.scale.examples.map((e) => e.label), ["C-Dur", "G-Dur", "F-Dur", "D-Dur", "B-Dur"]);
  assert.deepEqual(BOARDS.minor.examples.map((e) => e.label), ["Es-Dur", "C-Dur", "A-Dur", "Des-Dur", "Ces-Dur"]);
  for (const b of Object.values(BOARDS)) for (const ex of b.examples) assert.ok(ex.make().frames.length >= 3);
});

test("Welle 10, A6: Bauplan 1 / ½, in Sätzen ausgeschrieben (sigWay alle neun Tonarten, Ergebniskarte)", () => {
  assert.deepEqual(PLAN_SHORT, ["1", "1", "½", "1", "1", "1", "½"]);
  assert.equal(PLAN_TEXT, "Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb");
  const want = { C: "passt ohne Vorzeichen", G: "braucht Fis", D: "braucht Fis und Cis", A: "braucht Fis, Cis und Gis", E: "braucht Fis, Cis, Gis und Dis",
    F: "braucht B", B: "braucht B und Es", Es: "braucht B, Es und As", As: "braucht B, Es, As und Des" };
  for (const k of KEYS_4) {
    const f = fifthsOf(TONICS.treble[k]);
    assert.equal(sigWay(f), `der Bauplan ${PLAN_TEXT} ${want[k]}`, k);
    for (const clef of ["treble", "bass"]) {
      const d = scaleDemo(TONICS[clef][k], clef), r = d.frames[d.frames.length - 1].result;
      assert.equal(r.chips[0].text, `Bauplan ${PLAN_TEXT}`, k);
      for (const fr of d.frames) assert.ok(!/G G H|\bG = |\bH = /.test((fr.text || "") + fr.body), `${k} ${clef}`);
    }
  }
  // Lerntafeln, Hilfen und Hinweise: kein G/H als Kürzel für einen Tonschritt
  const texts = [planTable(), ...tonleitern.levels.map((l) => textOf(l.hint) + (textOf(l.helpText) || "")), ...tonleitern.learn.map((b) => b.render())];
  for (const t of texts) assert.ok(!/G G H|G = Ganz|H = Halb/.test(t), t.slice(0, 80));
});

test("Welle 10, B5: Fachwörter beim ersten Auftreten erklärt (Tonleitern 4, 10, 12)", () => {
  assert.ok(textOf(byId(4).hint).includes("Stammton = Note ohne Vorzeichen"));
  assert.ok(textOf(byId(12).hint).includes("Stammton = Note ohne Vorzeichen"));
  assert.ok(textOf(byId(12).hint).includes("kleine Terz abwärts") && !textOf(byId(12).hint).includes("wie bei den Intervallen"));
  assert.ok(textOf(byId(10).hint).includes("bei Kreuzen das letzte, bei Be das vorletzte"));
  assert.ok(DECISIVE_PROMPT.includes("Entscheidendes Vorzeichen = bei Kreuzen das letzte, bei Be das vorletzte"));
  // „Tetrachord“ nur in der Lerntafel (dort erklärt), in keiner Frage
  for (const l of tonleitern.levels) for (const q of makeRound(l, 20)) assert.ok(!/Tetrachord/.test(q.prompt + JSON.stringify(q.steps || [])), l.id);
  assert.ok(tonleitern.learn.some((b) => /Tetrachord sind vier stufenweise/.test(b.render())));
});

test("Welle 10, B6/B15: Tonleitern 12 mit Start-Beschriftung an der oberen Note, Satz in den Hilfen, Stufe 8 zweizeilig", () => {
  assert.ok(HELP_TEXT_MINOR.endsWith("Stufen: Beide Noten zählen mit. Halbtöne: Die Starttaste („Start“, kurz „S“) zählt nicht, du zählst die Schritte."));
  for (const f of FIFTHS) {
    const d = minorDemo(f), tm = midi(majorTonicOf(f));
    d.frames.forEach((fr, i) => {
      const starts = [...fr.body.matchAll(/data-start="(\d+)"/g)].map((m) => +m[1]);
      if (fr.step >= 2) assert.ok(starts.length && starts.every((x) => x === tm), `${f} Bild ${i}`);
      else assert.deepEqual(starts, [], `${f} Bild ${i}`);
    });
    assert.ok(d.frames[3].text.endsWith("Halbtöne: Die Starttaste („Start“, kurz „S“) zählt nicht, du zählst die Schritte."), String(f));
  }
  assert.ok(textOf(byId(8).hint).includes("\n♯: Fis – Cis – Gis – Dis\n♭: B – Es – As – Des\n"), textOf(byId(8).hint));
  assert.ok(tonleitern.levels.filter((l) => /\d\. Stufe(?! der Tonleiter)/.test(textOf(l.hint))).length === 0, "Stufe der Tonleiter ausgeschrieben");
});

// Prüfung Schritt 2 (B6): Die Starttaste trägt in jeder Vorführung, die Halbtöne zählt, ihre Aufschrift –
// nicht nur bei der parallelen Molltonart. Sonst gälte die Regel „Die Starttaste zählt nicht“ nur an einer Stelle.
test("Prüfung Schritt 2, B6: Start-Beschriftung in allen Vorführungen, die Halbtöne zählen", () => {
  const starts = (fr) => [...fr.body.matchAll(/data-start="(\d+)"/g)].map((m) => +m[1]);
  for (const it of [...ITEMS_1, ...ITEMS_2]) {
    const d = stepDemo(it.notes, it.i, it.clef), a = midi(it.notes[it.i]);
    d.frames.forEach((fr, i) => {
      if (fr.step >= 2) assert.ok(starts(fr).length && starts(fr).every((x) => x === a), `${it.clef} ${it.k} ${it.i} Bild ${i}`);
      else assert.deepEqual(starts(fr), []);
    });
  }
  for (const clef of ["treble", "bass"]) for (const k of Object.keys(TONICS[clef])) {
    const tonic = TONICS[clef][k], d = scaleDemo(tonic, clef), steps = buildSteps(tonic);
    const counting = d.frames.filter((fr) => fr.step === 2);
    assert.equal(counting.length, 7);
    counting.forEach((fr, i) => assert.ok(starts(fr).length && starts(fr).every((x) => x === midi(steps[i].a)), `${clef} ${k} Schritt ${i}`));
    // Frage, Notenstufen und Ergebnis (alle acht Töne markiert) ohne Starttaste
    d.frames.filter((fr) => fr.step !== 2).forEach((fr) => assert.deepEqual(starts(fr), []));
  }
  // Tonart aus Kreuzen: „+ 1 Halbton“ ab dem letzten Kreuz; bei Be wird nicht gezählt
  for (let f = -7; f <= 7; f++) {
    const d = keyDemo(f), n = d.frames.filter((fr) => starts(fr).length).length;
    assert.equal(n > 0, f > 0, String(f));
  }
  assert.ok(!tonleitern.learn.some((b) => /wie bei den Intervallen/.test(b.render())), "Lerntafel ohne Verweis auf das spätere Paket");
});

// Prüfung Schritt 7 (B13): Der Ausschnitt der Hilfe-Klaviatur (fit) richtet sich nur nach den gegebenen Noten.
// Er darf die Antwort weder abschneiden noch verraten: Die Taste des fehlenden Tons und beide Nachbar-Halbtöne
// (die naheliegenden falschen Antworten) sind immer zu sehen, auch wenn die Lücke am Rand der Tonleiter liegt.
test("Welcher Ton fehlt?: Hilfe-Klaviatur zeigt die Taste der Lücke und ihre beiden Nachbar-Halbtöne", () => {
  for (const it of [...ITEMS_4, ...ITEMS_5]) {
    const q = gapStepQuestion(it), html = helpsHtml(byId(4), q), m = midi(q.note);
    for (const x of [m - 1, m, m + 1]) assert.ok(html.includes(`data-midi="${x}"`), `${it.key}: Taste ${x - m} zur Lücke fehlt`);
    assert.equal((html.match(/class="[wb]key mark/g) || []).length, 7, `${it.key}: sieben gegebene Töne markiert`);
    assert.ok(!new RegExp(`class="[wb]key mark[^"]*" data-midi="${m}"`).test(html), `${it.key}: die Lücke ist nicht markiert`);
  }
});

test("Abschlussprüfung Welle 10: Tonleitern 1–3 daneben mit Grund; Startkarten 4 und 12 in kurzen Zeilen", async () => {
  const { ITEMS_1, ITEMS_2, ITEMS_3, STEP_REASON_WHOLE, STEP_REASON_HALF } = await import("../../src/packs/tonleitern.js");
  const { midi } = await import("../../src/music.js");
  const T = (await import("../../src/packs/tonleitern.js")).default;
  for (const no of [1, 2, 3]) {
    const l = T.levels.find((x) => x.no === no);
    for (const it of [ITEMS_1, ITEMS_2, ITEMS_3][no - 1]) {
      const d = midi(it.notes[it.i + 1]) - midi(it.notes[it.i]);
      // Grund stimmt: Ganzton = 2 Halbtöne (eine Taste dazwischen), Halbton = 1 (keine Taste)
      assert.equal(d, it.half ? 1 : 2);
      let q = null;
      for (let k = 0; k < 400 && (!q || q.key !== it.key); k++) q = l.question(null);
      if (q.key !== it.key) continue;
      assert.ok(q.reveal.endsWith(`: ${it.half ? STEP_REASON_HALF : STEP_REASON_WHOLE}.`), q.reveal);
    }
  }
  for (const no of [4, 12]) {
    const h = T.levels.find((x) => x.no === no).hint;
    assert.ok(h.startsWith("Zwei Schritte:\n1. ") && h.includes("\n2. ") && h.includes("Stammton = Note ohne Vorzeichen."), h);
  }
});
