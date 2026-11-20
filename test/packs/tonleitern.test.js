import { test } from "node:test";
import assert from "node:assert/strict";
import tonleitern, { oddQuestion, fitsKey, lowestY, LABEL_DESC,
  TONICS, KEYS_2, KEYS_4, ITEMS_1, ITEMS_2, ITEMS_3, ITEMS_4, ITEMS_5, ITEMS_6,
  scaleNotes, scaleSvg, scaleX, sigList, sigChoices, fifthsOf, pickStep, usualNote, keyName,
  STEP_WHOLE, STEP_HALF, HALF_P, SCALE_W, SHARP_ORDER, FLAT_ORDER,
} from "../../src/packs/tonleitern.js";
import { PACKS } from "../../src/packs/index.js";
import { N, dia, midi, pc, gName, majorScale } from "../../src/music.js";
import { feedbackText, makeRound, choicesClass, svgResultClass } from "../../src/engine.js";
import { staffSvg } from "../../src/staff.js";

const L = tonleitern.levels;
const ITEMS = [ITEMS_1, ITEMS_2, ITEMS_3, ITEMS_4, ITEMS_5, ITEMS_6];
const many = (l, n = 300) => { const out = []; let prev = null; for (let i = 0; i < n; i++) { prev = l.question(prev); out.push(prev); } return out; };
const steps = (notes) => notes.slice(1).map((n, i) => midi(n) - midi(notes[i]));
const PLAN = [2, 2, 1, 2, 2, 2, 1];

test("Paket ist registriert und steht zwischen Notenwerten und Intervallen", () => {
  assert.deepEqual(PACKS.map((p) => p.id), ["noten", "notenwerte", "tonleitern", "intervalle", "akkorde"]);
  assert.equal(tonleitern.title, "Tonleitern");
  assert.equal(tonleitern.subtitle, "Dur-Tonleitern bauen und lesen");
  assert.equal(tonleitern.grade, "Klasse 5–6");
  assert.equal(tonleitern.blitz, null);
});

test("sechs Stufen mit eindeutigen IDs", () => {
  assert.deepEqual(L.map((l) => l.id), ["tonleitern-1", "tonleitern-2", "tonleitern-3", "tonleitern-4", "tonleitern-5", "tonleitern-6"]);
  L.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.ok(l.title && l.hint && l.subtitle, l.id);
    assert.ok(l.example.startsWith("<svg"), l.id);
  });
  assert.deepEqual(L.map((l) => l.input), ["choices", "choices", "letters", "letters", "choices", "choices"]);
  assert.ok(L[2].acc && L[3].acc);
});

test("Anzahl der Aufgaben je Stufe (festgehalten)", () => {
  assert.deepEqual(ITEMS.map((p) => p.length), [14, 28, 30, 108, 68, 18]);
  assert.deepEqual(ITEMS_5.filter((it) => it.clef === "treble").length, 34);
  assert.ok(L[4].subtitle.includes("68 Aufgaben"));
  L.forEach((l, i) => {
    assert.equal(l.items, ITEMS[i]);
    assert.equal(new Set(l.items.map((it) => it.key)).size, l.items.length, l.id);
    assert.ok(l.items.length >= 8, l.id);
  });
});

test("Tonarten: bis 2 Vorzeichen C G D F B, bis 4 dazu A E Es As", () => {
  assert.deepEqual(KEYS_2.map((k) => fifthsOf(TONICS.treble[k])), [0, 1, 2, -1, -2]);
  assert.deepEqual(KEYS_4.map((k) => fifthsOf(TONICS.treble[k])), [0, 1, 2, 3, 4, -1, -2, -3, -4]);
  assert.deepEqual(KEYS_4.map((k) => keyName(TONICS.bass[k])), ["C-Dur", "G-Dur", "D-Dur", "A-Dur", "E-Dur", "F-Dur", "B-Dur", "Es-Dur", "As-Dur"]);
  assert.deepEqual(new Set(ITEMS_3.map((it) => it.k)), new Set(KEYS_2));
  assert.deepEqual(new Set(ITEMS_2.map((it) => it.k)), new Set(["G", "D", "F", "B"]));
  assert.ok(ITEMS_1.every((it) => it.k === "C") && ITEMS_3.every((it) => it.clef === "treble") && ITEMS_2.every((it) => it.clef === "treble"));
});

test("jede Tonleiter: acht Noten, Bauplan Ganz Ganz Halb Ganz Ganz Ganz Halb, übliche Vorzeichen", () => {
  for (const clef of ["treble", "bass"]) for (const k of KEYS_4) {
    const notes = scaleNotes(TONICS[clef][k]);
    assert.equal(notes.length, 8);
    assert.deepEqual(steps(notes), PLAN, `${clef} ${k}`);
    // Buchstaben aufsteigend ohne Lücke, Grundton oben eine Oktave höher
    notes.slice(1).forEach((n, i) => assert.equal(dia(n) - dia(notes[i]), 1));
    assert.equal(midi(notes[7]) - midi(notes[0]), 12);
    assert.ok(notes.every(usualNote), `${clef} ${k}`);
    // nur Kreuze oder nur Be
    assert.ok(!(notes.some((n) => n.acc > 0) && notes.some((n) => n.acc < 0)));
  }
});

test("Lage: Violin c' bis a' (B-Dur b), Bass C und D klein, sonst groß; höchstens eine Hilfslinie", () => {
  const t = TONICS.treble, b = TONICS.bass;
  assert.ok(["C", "G", "D", "A", "E", "F", "Es", "As"].every((k) => t[k].octave === 4));
  assert.deepEqual(t.B, N("H", 3, -1));
  assert.ok(["C", "D"].every((k) => b[k].octave === 3));
  assert.ok(["E", "F", "G", "A", "B", "Es", "As"].every((k) => b[k].octave === 2));
  // Violin: von b (unter c') bis a'' (eine Hilfslinie oben); Bass: von Es/E (eine Hilfslinie unten) bis d'
  const allNotes = (clef) => KEYS_4.flatMap((k) => scaleNotes(TONICS[clef][k]));
  const range = (clef) => { const d = allNotes(clef).map(dia); return [Math.min(...d), Math.max(...d)]; };
  assert.deepEqual(range("treble"), [dia(N("H", 3)), dia(N("A", 5))]);
  assert.deepEqual(range("bass"), [dia(N("E", 2)), dia(N("D", 4))]);
  // Alle Noten aller Aufgaben liegen in diesem Bereich
  for (const [clef, [lo, hi]] of [["treble", range("treble")], ["bass", range("bass")]]) {
    for (const it of ITEMS.flat().filter((x) => x.clef === clef)) {
      for (const n of it.shown || it.notes) assert.ok(dia(n) >= lo && dia(n) <= hi);
    }
  }
});

test("question liefert gültige Aufgaben mit display, reveal, statKey und play", () => {
  for (const l of L) {
    for (const q of many(l, 200)) {
      assert.ok(q.svg.startsWith("<svg") && q.prompt && q.display && q.reveal && q.statKey && q.key, l.id);
      assert.ok(q.reveal.endsWith("."), l.id);
      assert.notEqual(feedbackText(q, false), feedbackText(q, true));
      assert.ok(Array.isArray(q.play) && q.play.length >= 2, l.id);
      if (l.no >= 3) {
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

test("Stufe 1 und 2: Ganz- oder Halbton, zwei Knöpfe, Halbtöne mit Wahrscheinlichkeit 0,4", () => {
  for (const l of [L[0], L[1]]) {
    for (const q of many(l, 200)) {
      assert.deepEqual(q.choices, [STEP_WHOLE, STEP_HALF]);
      const [a, b] = q.play;
      assert.equal(q.answer, midi(b) - midi(a) === 1 ? STEP_HALF : STEP_WHOLE);
      assert.equal(dia(b) - dia(a), 1);
      assert.match(q.statKey, /^(Halbton|Ganzton) [a-z]+–[a-z]+$/);
      assert.ok(q.svg.includes('class="note mark"') && q.svg.includes('class="bracket"'));
      assert.equal((q.svg.match(/class="note mark"/g) || []).length, 2);
    }
  }
  // Halbtöne genau bei der 3./4. und 7./8. Stufe
  for (const it of [...ITEMS_1, ...ITEMS_2]) assert.equal(it.half, it.i === 2 || it.i === 6);
  // Statistik der Auswahl mit festem Zufall
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  let prev = null, half = 0; const n = 4000;
  for (let i = 0; i < n; i++) { prev = pickStep(ITEMS_1, prev, rnd); if (prev.half) half++; }
  assert.ok(Math.abs(half / n - HALF_P) < 0.03, String(half / n));
  assert.equal(L[0].question(null).statKey.includes("–"), true);
  const ef = ITEMS_1.find((it) => it.clef === "treble" && it.i === 2);
  assert.equal(ef.notes[2].letter + ef.notes[3].letter, "EF");
});

test("Stufe 3 und 4: Lücke, Antwort { letter, acc }, Klaviatur zählt die Tonklasse", () => {
  for (const l of [L[2], L[3]]) {
    for (const q of many(l, 300)) {
      assert.ok(q.svg.includes('class="gap"') && q.svg.includes(">?<"));
      assert.ok(!q.revealSvg.includes('class="gap"') && q.revealSvg.includes('class="note ok"'));
      // Auflösung: nur die eingesetzte Note grün, ihr Name darunter, die Zeile bleibt schwarz
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
      // Klaviatur
      const semi = pc(midi(q.note));
      assert.ok(l.check(q, semi));
      assert.ok(!l.check(q, pc(semi + 1)));
      assert.equal(q.note.letter, q.answer.letter);
      assert.match(q.statKey, /^[A-H][a-z]*-Dur, [2-7]\. Stufe \(Lücke\)$/);
      assert.match(q.reveal, /^Richtig wäre: [A-H][a-z]* \([A-H][a-z]*-Dur, [2-7]\. Stufe\)\.$/);
    }
  }
  // Die Lücke ist nie der Grundton
  assert.ok([...ITEMS_3, ...ITEMS_4].every((it) => it.i >= 1 && it.i <= 6));
  // Gleich klingend über die Klaviatur: Fis = Ges
  const q = L[2].question(null);
  const fis = { ...q, note: N("F", 4, 1), answer: { letter: "F", acc: 1 } };
  assert.ok(L[2].check(fis, 6) && L[2].check(fis, 18) && !L[2].check(fis, 5));
  assert.ok(!L[2].check(fis, { letter: "G", acc: -1 }));
});

test("Stufe 5: genau eine Note weicht um einen Halbton ab und ist die Antwort", () => {
  for (const it of ITEMS_5) {
    const diff = it.shown.map((n, j) => midi(n) - midi(it.notes[j]));
    const idx = diff.map((d, j) => (d ? j : -1)).filter((j) => j >= 0);
    assert.deepEqual(idx, [it.i]);
    assert.equal(Math.abs(diff[it.i]), 1);
    assert.ok(it.i >= 1 && it.i <= 6);
    assert.equal(it.shown[it.i].letter, it.notes[it.i].letter);
    assert.ok(it.shown.every(usualNote));
    assert.notDeepEqual(steps(it.shown), PLAN);
  }
  for (const q of many(L[4], 300)) {
    assert.equal(q.choices.length, 6);
    assert.ok(choicesClass(q.choices).includes("short"));
    const it = ITEMS_5.find((x) => x.key === q.key);
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
  const g = ITEMS_5.find((x) => x.key === "treble:G:6:-1");
  assert.equal(gName(g.moved), "F");
  // Text der Auflösung am Beispiel G-Dur
  const gq = oddQuestion(g);
  assert.equal(gq.prompt, "Welcher Ton passt nicht in G-Dur?");
  assert.equal(gq.answer, "F");
  assert.equal(gq.reveal, "In G-Dur heißt die 7. Stufe Fis, nicht F.");
  assert.equal(gq.display, "F passt nicht: In G-Dur heißt die 7. Stufe Fis.");
});

test("Stufe 5: nur Vorzeichen der eigenen Sorte, ohne C-Dur", () => {
  assert.ok(!ITEMS_5.some((it) => it.k === "C"));
  assert.deepEqual(new Set(ITEMS_5.map((it) => it.k)), new Set(KEYS_4.filter((k) => k !== "C")));
  for (const it of ITEMS_5) {
    const f = fifthsOf(it.notes[0]);
    if (f > 0) assert.ok(it.moved.acc >= 0, it.key);
    else assert.ok(f < 0 && it.moved.acc <= 0, it.key);
    // die verschobene Note ist entweder ein Stammton (Vorzeichen fehlt) oder trägt ein Vorzeichen zu viel
    const right = it.notes[it.i];
    if (it.moved.acc === 0) assert.notEqual(right.acc, 0, it.key);
    else assert.equal(right.acc, 0, it.key);
    // in der gezeigten Tonleiter kommen nur Kreuze oder nur Be vor
    assert.ok(!(it.shown.some((n) => n.acc > 0) && it.shown.some((n) => n.acc < 0)), it.key);
  }
  assert.equal(fitsKey(N("F", 4, -1), 1), false);
  assert.equal(fitsKey(N("F", 4, 1), -1), false);
  assert.equal(fitsKey(N("F", 4, 1), 0), false);
  assert.equal(fitsKey(N("F", 4, 0), 0), false);
  assert.equal(fitsKey(N("F", 4, 0), 1), true);
  assert.equal(fitsKey(N("A", 4, -1), -1), true);
  // Beispiele: G-Dur ohne Fis (fehlt), B-Dur mit Ges (zu viel); D-Dur mit As und F-Dur mit Dis entfallen
  assert.ok(ITEMS_5.find((x) => x.key === "treble:G:6:-1"));
  assert.ok(ITEMS_5.find((x) => x.key === "treble:B:5:-1"));
  assert.ok(!ITEMS_5.find((x) => x.key === "treble:D:4:-1"));
  assert.ok(!ITEMS_5.find((x) => x.key === "bass:F:5:1"));
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
  // ohne label unverändert
  const notes = scaleNotes(TONICS.treble.D);
  assert.ok(scaleSvg(notes, "treble").startsWith('<svg viewBox="0 0 368 122"'));
  assert.ok(!scaleSvg(notes, "treble", { cls: { 2: "ok" } }).includes("note-label"));
});

test("Stufe 6: Vorzeichen in der Reihenfolge der Vorzeichnung, vier Knöpfe", () => {
  assert.deepEqual(SHARP_ORDER, ["Fis", "Cis", "Gis", "Dis"]);
  assert.deepEqual(FLAT_ORDER, ["B", "Es", "As", "Des"]);
  assert.equal(sigList(0), "keine");
  assert.equal(sigList(2), "Fis, Cis");
  assert.equal(sigList(4), "Fis, Cis, Gis, Dis");
  assert.equal(sigList(-2), "B, Es");
  // Knopftext passt zu den Vorzeichen der Tonleiter und ihrer Reihenfolge
  for (const it of ITEMS_6) {
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
  for (const q of many(L[5], 200)) {
    assert.equal(q.choices.length, 4);
    assert.equal(q.prompt, "Welche Vorzeichen stehen vorne?");
    assert.match(q.statKey, /^Vorzeichen von [A-H][a-z]*-Dur$/);
    const it = ITEMS_6.find((x) => x.key === q.key);
    // Auflösung: Vorzeichnung hinter dem Schlüssel, vor den Noten keine Vorzeichen
    assert.equal((q.revealSvg.match(/class="keysig"/g) || []).length, Math.abs(it.fifths));
    assert.ok(!q.revealSvg.includes('class="acc"'));
    // Stufe 6 unverändert: ganze Zeile grün bzw. rot, kein Name darunter
    assert.ok(!q.keepRow && !q.revealSvg.includes("note-label"));
    assert.equal(svgResultClass(q, true), "ok");
    assert.equal(svgResultClass(q, false), "bad");
  }
  const d = L[5].question({ key: "x" });
  assert.ok(d.reveal.startsWith("Richtig wäre: "));
});

test("nie dieselbe Aufgabe zweimal hintereinander", () => {
  for (const l of L) {
    const qs = many(l, 400);
    qs.slice(1).forEach((q, i) => assert.notEqual(q.key, qs[i].key, l.id));
    // eine Runde aus der Engine
    const r = makeRound(l, 10, { notes: {} });
    r.slice(1).forEach((q, i) => assert.notEqual(q.key, r[i].key, l.id));
    // mindestens 8 verschiedene Aufgaben kommen vor
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

test("Lerntafeln: Bauplan je Schlüssel, Tabelle der Dur-Tonleitern", () => {
  assert.deepEqual(tonleitern.learn.map((b) => [b.title, b.clef]), [["Bauplan Dur", "treble"], ["Bauplan Dur", "bass"], ["Dur-Tonleitern bis 4 Vorzeichen", undefined]]);
  const t = tonleitern.learn[0].render();
  assert.ok(t.includes("Ganz\u00a0Ganz\u00a0Halb · Ganz · Ganz\u00a0Ganz\u00a0Halb"));
  assert.equal((t.match(/class="bracket"/g) || []).length, 2);
  assert.ok(t.includes("e'–f'") && t.includes("h'–c''") && t.includes("Vierergruppen (Tetrachorde)"));
  assert.ok(t.includes("Ein Tetrachord sind vier stufenweise aufeinanderfolgende Töne im Umfang einer Quarte – trotz des Namens kein Akkord."));
  assert.ok(!/zwei gleich gebauten Vierergruppen/.test(t));
  assert.ok(tonleitern.learn[1].render().includes("e–f"));
  const tab = tonleitern.learn[2].render();
  const rows = [...tab.matchAll(/<tr><td><b>([^<]+)<\/b><\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)].map((m) => m.slice(1));
  assert.deepEqual(rows.map((r) => r[0]), ["C-Dur", "G-Dur", "D-Dur", "A-Dur", "E-Dur", "F-Dur", "B-Dur", "Es-Dur", "As-Dur"]);
  assert.deepEqual(rows[2], ["D-Dur", "D E Fis G A H Cis D", "Fis, Cis"]);
  assert.deepEqual(rows[8], ["As-Dur", "As B C Des Es F G As", "B, Es, As, Des"]);
});

test("Texte: keine verbotenen Wörter, Anrede du", () => {
  const texts = L.flatMap((l) => [l.title, l.subtitle, l.hint]).concat(tonleitern.learn.map((c) => c.render()));
  for (const l of L) for (const q of many(l, 50)) texts.push(q.prompt, q.display, q.reveal, ...(q.choices || []));
  for (const t of texts) assert.ok(!/Fehler!|falsch|mühelos|Held|Champion|\bSie\b/.test(t), t);
  // „Tetrachord“ nur in der Lerntafel „Bauplan Dur“, nicht in Stufen und Aufgaben
  const levelTexts = texts.filter((t) => !tonleitern.learn.some((c) => c.render() === t));
  assert.ok(levelTexts.every((t) => !/Tetrachord/.test(t)));
  assert.ok(L[5].hint.includes("Der Grundton steht zweimal da, sein Vorzeichen zählt nur einmal."));
});
