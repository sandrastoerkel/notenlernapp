import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import notenwerte, {
  BARS, parseBar, beatsOf, nameOf, fillChoices, barSvg, dotSvg, timeSigSvg, layoutBar, GAP_FLAG_ADVANCE, learnHtml, PITCH, DOT, TIME, rhythmOf,
  MISSING_CHOICES, BEAT_CHOICES_4, ITEMS_8, ITEMS_1, ITEMS_4, ITEMS_6, BOARDS, valueDemo, beatsDemo, barDemo, countLabels,
  DEMO_STEPS_VALUE, DEMO_STEPS_BEATS, DEMO_STEPS_BAR, pyramidSvg, featureTable, restTable, countTable, COUNT_SYLLABLES, REST_FEATURES,
  REST_SHAPE, HELP_TEXT_REST, countSyllables, countLabelText, countMarks, syllableWidth, COUNT_Y, COUNT_FONT, gapSentence, gapPlace, PYR,
  sumBarSvg, countBarSvg, COUNT_EXPLAIN, dotPyr, PYR_DOT_NOTE,
  beamGroups, secondaryBeams, needsStub, onsetsOf, barBeams, BEAM_UNIT, HELP_TEXT_BEAM, BEAM_PICTURES, beamPictureSvg,
} from "../../src/packs/notenwerte.js";
import { N, beatsLabel } from "../../src/music.js";
import { helpsHtml, helpsTitle, waitsForNext, hasHelps } from "../../src/engine.js";
import { TOP, S, BOTTOM, X1, BEAM, beamSvg, stemX } from "../../src/staff.js";

const MID = TOP + 2 * S;
const r2t = (v) => Math.round(v * 100) / 100;
const hitBoxes = (body) => boxIdx(body, "hit");
const addBoxes = (body) => boxIdx(body, "add");
// "Zeile:Index" der Kästchen mit der Klasse cls
function boxIdx(body, cls) {
  const out = [];
  const svg = body.match(/<svg class="nw-pyr"[\s\S]*?<\/svg>/)[0];
  for (const m of svg.matchAll(/<g class="nw-pyr-row[^"]*" data-row="(\d)">([\s\S]*?)<text class="nw-pyr-num"/g)) {
    [...m[2].matchAll(/<rect class="nw-pyr-box([^"]*)"/g)].forEach((b, i) => { if (b[1].trim() === cls) out.push(`${m[1]}:${i}`); });
  }
  return out.join(",");
}
const sum = (els) => els.reduce((a, e) => a + beatsOf(e), 0);
const count = (s, re) => (s.match(re) || []).length;
const L = notenwerte.levels;

const ALL = (l) => l.items.map((it) => Object.assign(it.make(), { key: it.key }));
const nb = (t) => String(t).replace(/ /g, " ");
const TWO_STEP = [1, 4, 6, 8];
const HELP_LEVELS = [1, 2, 4, 6, 8];

test("zehn Stufen mit eindeutigen IDs", () => {
  assert.equal(notenwerte.id, "notenwerte");
  assert.ok(notenwerte.title && notenwerte.subtitle && notenwerte.grade);
  assert.deepEqual(L.map((l) => l.id), Array.from({ length: 10 }, (_, i) => "notenwerte-" + (i + 1)));
  assert.equal(new Set(L.map((l) => l.id)).size, 10);
  L.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.equal(l.input, "choices");
    assert.ok(l.title && l.hint && l.subtitle);
    assert.ok(l.example.startsWith("<svg"));
    // keine Jahrgangsstufen an den Stufen
    assert.ok(!/Klasse/.test(l.title + l.subtitle), l.id);
  });
});

test("question liefert gültige Aufgaben, check erkennt richtig und falsch", () => {
  for (const l of L) {
    for (let i = 0; i < 200; i++) {
      const q = l.question(null);
      assert.ok(q.svg.startsWith("<svg") && q.svg.endsWith("</svg>"), l.id);
      assert.ok(q.prompt && q.display && q.reveal && q.key, l.id);
      assert.ok(q.choices.length >= 2 && q.choices.length <= 6, l.id);
      assert.equal(new Set(q.choices).size, q.choices.length, l.id);
      assert.ok(q.choices.includes(q.answer), l.id);
      assert.ok(l.check(q, q.answer));
      q.choices.filter((c) => c !== q.answer).forEach((c) => assert.ok(!l.check(q, c), `${l.id}: ${c}`));
      assert.ok(!l.check(q, undefined));
      // zwei Schritte genau in den Stufen 1, 4, 6, 8
      assert.equal(!!q.steps, TWO_STEP.includes(l.no), l.id);
    }
  }
});

test("nie zweimal dieselbe Aufgabe hintereinander", () => {
  for (const l of L) {
    let prev = l.question(null);
    for (let i = 0; i < 300; i++) {
      const q = l.question(prev);
      assert.notEqual(q.key, prev.key, l.id);
      prev = q;
    }
  }
});

test("Vorrat je Stufe (festgehalten)", () => {
  // Stufe 1 und 2 haben nur die fünf Notenwerte bzw. Pausenwerte (ganze bis Sechzehntel), Stufe 6 die drei
  // punktierbaren Werte mit und ohne Punkt. Alle Noten stehen auf derselben Höhe, damit nur der Wert zählt.
  assert.deepEqual(L.map((l) => l.items.length), [5, 5, 10, 10, 10, 6, 12, 91, 91, 123]);
  L.forEach((l) => assert.equal(new Set(l.items.map((it) => it.key)).size, l.items.length, l.id));
  // Gemischt = Stufen 3, 5, 7 und 9 (die Stufen ohne Hilfen), Schlüssel wie dort
  assert.deepEqual(L[9].items.map((it) => it.key), [L[2], L[4], L[6], L[8]].flatMap((l) => l.items.map((it) => it.key)));
  // gleicher Inhalt, gleicher Schlüssel wie vor Welle 9: Stufe 3 = alt 1 + 2, 5 = alt 3, 7 = alt 4, 9 = alt 5
  assert.deepEqual(L[2].items.map((it) => it.key.split(":")[0]), [..."1111122222"]);
  assert.ok(L[4].items.every((it) => it.key.startsWith("3:")));
  assert.ok(L[6].items.every((it) => it.key.startsWith("4:")));
  assert.ok(L[8].items.every((it) => it.key.startsWith("5:")));
});

test("Stufen ohne Hilfen: Begriffe, Schläge und Auflösung wie bisher", () => {
  const q3 = ALL(L[2]);
  assert.deepEqual(q3.map((q) => q.answer), ["ganze Note", "halbe Note", "Viertelnote", "Achtelnote", "Sechzehntelnote", "ganze Pause", "halbe Pause", "Viertelpause", "Achtelpause", "Sechzehntelpause"]);
  assert.deepEqual(q3.map((q) => q.prompt), [...Array(5).fill("Welcher Notenwert ist das?"), ...Array(5).fill("Welche Pause ist das?")]);
  // die Namen der Sorte
  assert.deepEqual(q3[0].choices, q3.slice(0, 5).map((q) => q.answer));
  assert.deepEqual(q3[7].choices, q3.slice(5).map((q) => q.answer));
  assert.deepEqual(ALL(L[4]).map((q) => q.answer), ["4", "2", "1", "½", "¼", "4", "2", "1", "½", "¼"]);
  assert.deepEqual(L[4].question(null).choices, ["4", "2", "1", "½", "¼"]);
  const q7 = Object.fromEntries(ALL(L[6]).map((q) => [q.key, q.answer]));
  assert.equal(q7["4:b:n2."], "3");
  assert.equal(q7["4:b:n4."], "1½");
  assert.equal(q7["4:b:n8."], "¾");
  assert.equal(q7["4:b:n2"], "2");
  assert.equal(q7["4:n:n2."], "punktierte halbe Note");
  assert.equal(q7["4:n:n4."], "punktierte Viertelnote");
  assert.equal(q7["4:n:n8."], "punktierte Achtelnote");
  // Punkt nur bei punktierten Noten; ganze und halbe Pause als Balken, Viertel bis Sechzehntel als Glyphe
  ALL(L[6]).forEach((q) => assert.equal(count(q.svg, /class="notehead aug"/g), q.key.endsWith(".") ? 1 : 0, q.key));
  ALL(L[1]).forEach((q, i) => assert.equal(count(q.svg, /<rect class="rest"/g), i < 2 ? 1 : 0));
  // Taktangabe ab den Schlägen, nicht beim Erkennen
  for (const l of [L[0], L[1], L[2]]) assert.ok(ALL(l).every((q) => !q.svg.includes("timesig")), l.id);
  for (const l of [L[3], L[4], L[5], L[6]]) assert.ok(ALL(l).every((q) => q.svg.includes("timesig")), l.id);
});

test("Feedback ohne Hilfen: ganze Sätze mit „eine“, Dauer im richtigen Numerus", () => {
  const sp = (q) => Object.assign(q, { display: nb(q.display), reveal: nb(q.reveal) });
  for (const l of L) for (const it of l.items) { const q = it.make(); assert.ok(/\d Schl|[¼½¾] Schl/.test(q.reveal), q.reveal); }
  const all = (l) => l.items.map((it) => sp(it.make()));
  const q2 = all(L[1]), q3 = all(L[2]), q5 = all(L[4]);
  // Stufen 1–3: Schläge mit „im 4/4-Takt“ (dort noch nicht eingeführt, Welle 10)
  assert.equal(q3[2].display, "Viertelnote (1 Schlag im 4/4-Takt)");
  assert.equal(q3[2].reveal, "Das war eine Viertelnote (1 Schlag im 4/4-Takt).");
  assert.equal(q3[0].reveal, "Das war eine ganze Note (4 Schläge im 4/4-Takt).");
  assert.equal(q3[0].display, "Ganze Note (4 Schläge im 4/4-Takt)");
  assert.equal(q2[3].reveal, "Das war eine Achtelpause (½ Schlag im 4/4-Takt).");
  for (const q of [...q2, ...q3, ...all(L[0])]) assert.ok(q.display.includes("im 4/4-Takt") && q.reveal.includes("im 4/4-Takt"), q.display);
  for (const q of [...q5, ...all(L[6]), ...all(L[8])]) assert.ok(!q.display.includes("im 4/4-Takt"), q.display);
  assert.equal(q5[1].reveal, "Richtig wäre: 2 Schläge, denn das ist eine halbe Note.");
  assert.equal(q5[9].reveal, "Richtig wäre: ¼ Schlag, denn das ist eine Sechzehntelpause.");
  const q7 = Object.fromEntries(L[6].items.map((it) => [it.key, sp(it.make())]));
  assert.equal(q7["4:b:n4."].reveal, "Richtig wäre: 1½ Schläge, denn das ist eine punktierte Viertelnote.");
  assert.equal(q7["4:n:n2."].reveal, "Das war eine punktierte halbe Note (3 Schläge).");
  assert.equal(q7["4:n:n2."].display, "Punktierte halbe Note (3 Schläge)");
  assert.equal(q7["4:b:n8."].reveal, "Richtig wäre: ¾ Schlag, denn das ist eine punktierte Achtelnote.");
  const q9 = Object.fromEntries(L[8].items.map((it) => [it.key, sp(it.make())]));
  const b = (s) => BARS.indexOf(s);
  assert.equal(q9[`5:${b("2. 4")}:1`].reveal, "Richtig wäre eine Viertelnote, denn es fehlt noch 1 Schlag.");
  assert.equal(q9[`5:${b("2. 4")}:0`].reveal, "Richtig wäre eine punktierte halbe Note, denn es fehlen noch 3 Schläge.");
  assert.equal(q9[`5:${b("4 4 r2")}:2`].reveal, "Richtig wäre eine halbe Pause, denn es fehlen noch 2 Schläge.");
  assert.equal(q9[`5:${b("4 r8 8 2")}:1`].reveal, "Richtig wäre eine Achtelpause, denn es fehlt noch ½ Schlag.");
  // jede Aufgabe hat reveal, kein „Das war ein “ mit falschem Artikel, kein Doppelpunkt-Notbehelf, Numerus
  for (const l of L) for (const it of l.items) {
    const q = it.make(), t = nb([q.reveal, q.display, q.partial || "", ...(q.steps || []).flatMap((s) => [s.ok || "", s.bad || ""])].join(" | "));
    assert.ok(q.reveal.endsWith("."), it.key);
    assert.ok(!/Das war ein |Notenwert:|Pausenwert:/.test(t), it.key);
    assert.ok(!/(?<![\d¼½¾])1 Schläge|(?<![\d¼½¾])[2-4] Schlag\b|(?<!\d)[¼½¾] Schläge|fehlen (noch )?(?<![\d])[¼½¾1] Schlag\b|fehlt (noch )?\S+ Schläge|stehen 1 Schlag|steht [2-4]/.test(t), t);
  }
});

/* ---------- Zweischrittige Stufen (q.steps) ---------- */

const stepTexts = (q) => [q.steps[0].ok, q.steps[0].bad];

test("Zwei Schritte: eindeutig, Texte nach Schritt 1 nennen die Antwort von Schritt 2 nicht", () => {
  for (const l of L.filter((x) => TWO_STEP.includes(x.no))) {
    for (const it of l.items.flatMap((x) => Array(l.no === 8 ? 3 : 10).fill(x))) {
      const q = it.make();
      assert.equal(q.steps.length, 2, it.key);
      for (const s of q.steps) {
        assert.equal(new Set(s.choices).size, s.choices.length, it.key);
        assert.equal(s.choices.filter((c) => c === s.answer).length, 1, it.key);
      }
      // Schritt 2 ist die Antwort der Aufgabe; Schritt 1 hat Texte, Schritt 2 eine Frage
      assert.equal(q.steps[1].answer, q.answer, it.key);
      assert.deepEqual(q.steps[1].choices, q.choices, it.key);
      assert.ok(q.steps[1].prompt, it.key);
      assert.equal(q.steps[0].ok.startsWith("Richtig: "), true, it.key);
      assert.equal(q.steps[0].bad, q.steps[0].ok.replace("Richtig: ", "Nicht ganz: "), it.key);
      for (const t of stepTexts(q)) {
        // die Antwort von Schritt 2 kommt nicht vor
        assert.ok(!nb(t).includes(q.steps[1].answer), `${it.key}: ${t}`);
        for (const n of ["ganze Note", "halbe Note", "Viertelnote", "Achtelnote", "Sechzehntelnote", "ganze Pause", "halbe Pause", "Viertelpause", "Achtelpause", "Sechzehntelpause"]) {
          if (l.no === 1 || l.no === 8) assert.ok(!t.includes(n), `${it.key}: ${t}`);
        }
        if (l.no === 4 || l.no === 6) assert.ok(!/Schl|→|\d|[¼½¾]/.test(t), `${it.key}: ${t}`);
        assert.ok(!t.includes("→"), `${it.key}: ${t}`);
      }
      // q.partial: Schritt 1 daneben, Schritt 2 richtig
      assert.ok(q.partial && q.partial.endsWith("."), it.key);
      assert.equal(q.reveal, `Richtig wäre: ${q.partial.slice(q.partial.indexOf(": ") + 2)}`, it.key);
    }
  }
});

test("Stufe 1: Kopf (hohl | schwarz), dann nur die Werte dieser Kopfform", () => {
  const qs = ALL(L[0]);
  assert.deepEqual(qs.map((q) => q.steps[0].answer), ["hohl", "hohl", "schwarz", "schwarz", "schwarz"]);
  qs.forEach((q) => assert.deepEqual(q.steps[0].choices, ["hohl", "schwarz"]));
  assert.deepEqual(qs.map((q) => q.steps[1].choices), [...Array(2).fill(["ganze Note", "halbe Note"]), ...Array(3).fill(["Viertelnote", "Achtelnote", "Sechzehntelnote"])]);
  assert.deepEqual(qs.map((q) => q.prompt), Array(5).fill("Wie sieht der Notenkopf aus?"));
  assert.deepEqual(qs.map((q) => q.steps[1].prompt), Array(5).fill("Welcher Notenwert?"));
  assert.equal(qs[0].steps[0].ok, "Richtig: Der Kopf ist hohl.");
  assert.equal(qs[3].steps[0].bad, "Nicht ganz: Der Kopf ist schwarz.");
  assert.deepEqual(qs.map((q) => nb(q.display)), [
    "Kopf hohl · ohne Hals → ganze Note (4 Schläge im 4/4-Takt)", "Kopf hohl · mit Hals → halbe Note (2 Schläge im 4/4-Takt)",
    "Kopf schwarz · kein Fähnchen → Viertelnote (1 Schlag im 4/4-Takt)", "Kopf schwarz · 1 Fähnchen → Achtelnote (½ Schlag im 4/4-Takt)",
    "Kopf schwarz · 2 Fähnchen → Sechzehntelnote (¼ Schlag im 4/4-Takt)",
  ]);
  assert.equal(nb(qs[1].partial), "Der Notenwert stimmt, der Kopf nicht: Kopf hohl · mit Hals → halbe Note (2 Schläge im 4/4-Takt).");
  assert.equal(nb(qs[3].reveal), "Richtig wäre: Kopf schwarz · 1 Fähnchen → Achtelnote (½ Schlag im 4/4-Takt).");
  // Kopfform am Bild: hohl bei ganzer und halber Note
  qs.forEach((q, i) => assert.equal(q.svg.includes("notehead open"), i < 2));
});

test("Stufe 4: Notenwert, dann Schläge (4 | 2 | 1 | ½ | ¼)", () => {
  const qs = ALL(L[3]);
  assert.deepEqual(qs.map((q) => q.prompt), [...Array(5).fill("Welcher Notenwert?"), ...Array(5).fill("Welche Pause?")]);
  assert.deepEqual(qs.map((q) => q.steps[0].answer), ALL(L[2]).map((q) => q.answer));
  assert.deepEqual(qs.map((q) => q.steps[0].choices), ALL(L[2]).map((q) => q.choices));
  qs.forEach((q) => { assert.deepEqual(q.steps[1].choices, ["4", "2", "1", "½", "¼"]); assert.equal(q.steps[1].prompt, "Wie viele Schläge im 4/4-Takt?"); });
  assert.deepEqual(qs.map((q) => q.answer), ["4", "2", "1", "½", "¼", "4", "2", "1", "½", "¼"]);
  assert.equal(qs[8].steps[0].ok, "Richtig: Das ist eine Achtelpause.");
  assert.equal(nb(qs[8].display), "Achtelpause → ½ Schlag");
  assert.equal(nb(qs[1].display), "Halbe Note → 2 Schläge");
  assert.equal(nb(qs[8].partial), "Die Schläge stimmen, der Notenwert nicht: Achtelpause → ½ Schlag.");
});

test("Stufe 6: Notenwert ohne den Punkt, dann Schläge (3 | 2 | 1½ | 1 | ¾ | ½), punktierte doppelt im Vorrat", () => {
  const qs = Object.fromEntries(ALL(L[5]).map((q) => [q.key, q]));
  assert.deepEqual(Object.keys(qs), ["p:n2.", "p:n2", "p:n4.", "p:n4", "p:n8.", "p:n8"]);
  for (const q of Object.values(qs)) {
    const dot = q.key.endsWith(".");
    // Frage und Texte nach Schritt 1 verraten den Punkt nicht (Welle 10, Top 5)
    assert.equal(q.prompt, "Welcher Notenwert steckt in dieser Note? Einen Punkt lässt du zuerst weg.");
    assert.deepEqual(q.steps[0].choices, ["halbe Note", "Viertelnote", "Achtelnote"]);
    assert.deepEqual(q.steps[1].choices, BEAT_CHOICES_4);
    assert.equal(q.steps[1].prompt, "Wie viele Schläge dauert die Note?");
    assert.equal(count(q.svg, /class="notehead aug"/g), dot ? 1 : 0);
  }
  assert.deepEqual(Object.values(qs).map((q) => [q.steps[0].answer, q.answer]), [
    ["halbe Note", "3"], ["halbe Note", "2"], ["Viertelnote", "1½"], ["Viertelnote", "1"], ["Achtelnote", "¾"], ["Achtelnote", "½"],
  ]);
  assert.equal(qs["p:n4."].steps[0].ok, "Richtig: Der Notenwert ist die Viertelnote.");
  assert.equal(qs["p:n4"].steps[0].bad, "Nicht ganz: Der Notenwert ist die Viertelnote.");
  // je Paar (mit und ohne Punkt): Frage, Frage von Schritt 2 und beide Texte nach Schritt 1 gleich
  for (const v of [2, 4, 8]) {
    const [a, b] = [qs[`p:n${v}.`], qs[`p:n${v}`]];
    assert.deepEqual([a.prompt, a.steps[0].ok, a.steps[0].bad, a.steps[1].prompt, a.steps[0].choices], [b.prompt, b.steps[0].ok, b.steps[0].bad, b.steps[1].prompt, b.steps[0].choices], String(v));
    for (const t of [a.prompt, a.steps[0].ok, a.steps[0].bad, a.steps[1].prompt]) assert.ok(!/Punkt|punktiert/.test(t.replace("Einen Punkt lässt du zuerst weg.", "")), t);
  }
  // den Punkt nennt erst die Rückmeldung am Ende; Rechnung mit „=“
  assert.equal(nb(qs["p:n4."].display), "Viertelnote = 1 Schlag · Punkt: 1 + ½ = 1½ Schläge");
  assert.equal(nb(qs["p:n4"].display), "Viertelnote = 1 Schlag · kein Punkt → 1 Schlag");
  assert.equal(nb(qs["p:n2."].display), "Halbe Note = 2 Schläge · Punkt: 2 + 1 = 3 Schläge");
  assert.equal(nb(qs["p:n8."].display), "Achtelnote = ½ Schlag · Punkt: ½ + ¼ = ¾ Schlag");
  // gezogen wird aus 9 (punktierte doppelt): in vielen Runden kommen punktierte etwa doppelt so oft
  let dots = 0, n = 0, prev = null;
  for (let i = 0; i < 3000; i++) { prev = L[5].question(prev); n++; if (prev.key.endsWith(".")) dots++; }
  assert.ok(dots / n > 0.55 && dots / n < 0.8, String(dots / n));
});

test("Stufe 8: Zählen (sechs Knöpfe), dann Wert wählen; alle 91 Takte nachgerechnet", () => {
  assert.deepEqual(MISSING_CHOICES, ["¼", "½", "1", "1½", "2", "3"]);
  const missing = {};
  for (const it of ITEMS_8) {
    const q = Object.assign(it.make(), { key: it.key }), ans = q.bar[q.gap], others = q.bar.filter((_, i) => i !== q.gap);
    // jeder Takt hat genau vier Schläge, es fehlt die Dauer der Lücke
    assert.equal(sum(q.bar), 4, it.key);
    const m = 4 - sum(others);
    assert.equal(m, beatsOf(ans), it.key);
    missing[q.steps[0].answer] = (missing[q.steps[0].answer] || 0) + 1;
    assert.equal(q.prompt, "Wie viele Schläge fehlen bis 4?");
    assert.deepEqual(q.steps[0].choices, MISSING_CHOICES);
    assert.equal(q.steps[1].prompt, ans.rest ? "Welche Pause fehlt?" : "Welche Note fehlt?");
    // Schritt 2 eindeutig: genau ein Wert mit der fehlenden Dauer, vier verschiedene Namen
    assert.equal(q.options.filter((o) => beatsOf(o) === m).length, 1, it.key);
    assert.equal(new Set(q.choices).size, 4);
    q.options.forEach((o) => assert.equal(o.rest, ans.rest));
    assert.equal(q.answer, nameOf(ans));
  }
  // jede fehlende Dauer steht in der Leiste, jeder Knopf der Leiste ist mindestens einmal richtig
  assert.deepEqual(missing, { 1: 42, "½": 22, 2: 17, "¼": 4, "1½": 4, 3: 2 });
  assert.deepEqual(Object.keys(missing).sort(), [...MISSING_CHOICES].sort());
  const q = (bar, gap) => Object.assign(ITEMS_8.find((it) => it.bar === bar && it.gap === gap).make());
  assert.equal(nb(q("4 4 4 4", 3).steps[0].ok), "Richtig: Im Takt stehen 3 Schläge, es fehlt 1 Schlag.");
  assert.equal(nb(q("4 4 4 4", 3).display), "Im Takt stehen 3 Schläge, es fehlt 1 Schlag → Viertelnote");
  assert.equal(nb(q("2. 4", 0).steps[0].bad), "Nicht ganz: Im Takt steht 1 Schlag, es fehlen 3 Schläge.");
  assert.equal(nb(q("16 16 8 4 2", 0).display), "Im Takt stehen 3¾ Schläge, es fehlt ¼ Schlag → Sechzehntelnote");
  assert.equal(nb(q("4 r8 8 2", 1).display), "Im Takt stehen 3½ Schläge, es fehlt ½ Schlag → Achtelpause");
  assert.equal(nb(q("4 r8 8 2", 1).partial), "Der Wert stimmt, die Schläge nicht: Im Takt stehen 3½ Schläge, es fehlt ½ Schlag → Achtelpause.");
  // wie Stufe 9: Auflösung, Rhythmus, Bild
  const a = q("4. 8 r4 4", 2);
  assert.ok(a.revealSvg.includes('class="filled"') && a.svg.includes('class="gap"'));
  assert.equal(a.play.reduce((x, p) => x + p.beats, 0), 4);
});

test("Takt füllen: jeder Takt hat genau vier Schläge", () => {
  assert.ok(BARS.length >= 20);
  BARS.forEach((b) => assert.equal(sum(parseBar(b)), 4, b));
  assert.deepEqual(parseBar("4. 8 r4 4"), [{ v: 4, dot: true, rest: false }, { v: 8, dot: false, rest: false }, { v: 4, dot: false, rest: true }, { v: 4, dot: false, rest: false }]);
});

test("Takt füllen: die richtige Antwort ergibt 4, jede falsche nicht", () => {
  // jede Aufgabe 30-mal, weil die falschen Antworten zufällig gezogen werden
  for (const it of L[8].items.flatMap((x) => Array(30).fill(x))) {
    const q = Object.assign(it.make(), { key: it.key });
    assert.equal(q.choices.length, 4);
    const others = q.bar.filter((_, i) => i !== q.gap);
    assert.equal(q.answer, nameOf(q.bar[q.gap]));
    q.options.forEach((o) => {
      const total = sum(others) + beatsOf(o);
      if (nameOf(o) === q.answer) assert.equal(total, 4, it.key);
      else assert.notEqual(total, 4, `${it.key}: ${nameOf(o)}`);
      // Noten werden durch Noten ersetzt, Pausen durch Pausen
      assert.equal(o.rest, q.bar[q.gap].rest);
    });
    assert.equal(q.prompt, q.bar[q.gap].rest ? "Welche Pause fehlt in der Lücke?" : "Welche Note fehlt in der Lücke?");
    // Genau eine Lücke, die übrigen Zeichen sind gezeichnet, Taktangabe und Taktstrich vorhanden
    assert.equal(count(q.svg, /class="gap"/g), 1);
    const notes = others.filter((e) => !e.rest).length, rests = others.length - notes;
    assert.equal(count(q.svg, /<g class="note /g), notes, it.key);
    assert.equal(count(q.svg, /class="rest"/g), rests, it.key);
    assert.equal(count(q.svg, /class="notehead aug"/g), others.filter((e) => e.dot).length);
    assert.ok(q.svg.includes("timesig") && q.svg.includes("barline"));
  }
});

test("Takt füllen: revealSvg zeigt den Takt mit dem richtigen Wert in der Lücke", () => {
  for (const it of L[8].items) {
    const q = Object.assign(it.make(), { key: it.key });
    const r = q.revealSvg, ans = q.bar[q.gap];
    assert.ok(r.startsWith("<svg") && r.endsWith("</svg>"), it.key);
    // kein Kasten mehr, dafür genau ein gefülltes Element, und zwar die Antwort
    assert.equal(count(r, /class="gap"/g), 0, it.key);
    assert.equal(count(r, /class="filled"/g), 1, it.key);
    const filled = r.match(/<g class="filled">(.*?)<\/g><(?:g class="note|g class="beam-group|text class="rest|rect class="rest|line class="staff-line barline)/)[1];
    // Liegt die Lücke in keiner Balkengruppe, ist alles andere unverändert (elementFrom an der Stelle der Lücke);
    // sonst kommt in der Auflösung der Balken dieser Gruppe dazu (Test „Balken“ unten)
    const inBeam = beamGroups(q.bar).some((g) => g.includes(q.gap));
    // (dazu nach der Antwort die Zählzeiten unter den Zeichen, im Fragebild nicht)
    const noCounts = r.replace(/<g class="nw-counts">.*?<\/g><\/svg>$/, "</svg>");
    assert.ok(!q.svg.includes("nw-counts") && !q.svg.includes("nw-cnt"), it.key);
    assert.ok(r.includes('<g class="nw-counts">'), it.key);
    if (!inBeam) assert.equal(noCounts, q.svg.replace(/<g class="gap">.*?<\/g>/, `<g class="filled">${filled}</g>`), it.key);
    if (ans.rest) assert.equal(count(filled, /class="rest"/g), 1, it.key);
    else {
      assert.equal(count(filled, /<g class="note /g), 1, it.key);
      // ganze und halbe Note: hohler Kopf; Achtel/Sechzehntel: Fähnchen; Punkt nur bei punktierten
      assert.equal(filled.includes("notehead open"), ans.v <= 2, it.key);
      // (gebalkt ohne Fähnchen)
      assert.equal(filled.includes(`class="flag"`), ans.v >= 8 && !inBeam, it.key);
    }
    assert.equal(filled.includes("notehead aug"), ans.dot, it.key);
    // vollständiger Takt: alle Noten, Pausen und Punkte gezeichnet
    const notes = q.bar.filter((e) => !e.rest).length;
    assert.equal(count(r, /<g class="note /g), notes, it.key);
    assert.equal(count(r, /class="rest"/g), q.bar.length - notes, it.key);
    assert.equal(count(r, /class="notehead aug"/g), q.bar.filter((e) => e.dot).length, it.key);
  }
  // die anderen Stufen brauchen keine Auflösung
  for (const l of L.slice(0, 7)) assert.equal(l.question(null).revealSvg, undefined);
});

test("Takt füllen: play ist der vollständige Takt als Rhythmus (vier Schläge)", () => {
  for (const it of L[8].items) {
    const q = it.make();
    assert.equal(q.play.length, q.bar.length, it.key);
    assert.equal(q.play.reduce((a, p) => a + p.beats, 0), 4, it.key);
    q.play.forEach((p, i) => {
      assert.equal(p.beats, beatsOf(q.bar[i]), it.key);
      if (q.bar[i].rest) assert.deepEqual(p, { rest: true, beats: beatsOf(q.bar[i]) });
      else assert.deepEqual(p, { note: PITCH, beats: beatsOf(q.bar[i]) });
    });
  }
  // punktierte Werte: Viertel mit Punkt 1½, Achtel ½, halbe Pause 2
  assert.deepEqual(rhythmOf(parseBar("4. 8 r2")).map((p) => p.beats), [1.5, 0.5, 2]);
  // die anderen Stufen spielen nichts
  for (const l of L.slice(0, 7)) assert.equal(l.question(null).play, undefined);
});

test("Takt: einfacher dünner Taktstrich am Ende, kein Schlussstrich", () => {
  // Ein einzelner Takt aus einem Stück endet mit einem einfachen Taktstrich (Verovio barLineWidth 0,15 LA),
  // nicht mit dem Schlussstrich (dünn + dick). Gilt für Aufgabe und Auflösung.
  for (const svg of [barSvg(parseBar("4. 8 r4 4"), 2), barSvg(parseBar("4. 8 r4 4"), 2, true), barSvg(parseBar("2 2"))]) {
    const bars = svg.match(/<line class="staff-line barline"[^>]*>/g);
    assert.equal(bars.length, 1);
    assert.ok(bars[0].includes(`x1="${X1}" x2="${X1}"`) && bars[0].includes(`y1="${TOP}" y2="${BOTTOM}"`));
    assert.ok(Math.abs(parseFloat(bars[0].match(/stroke-width:([\d.]+)/)[1]) / S - 0.15) < 1e-9);
    // keine weiteren senkrechten Striche oder Balken am Zeilenende
    const vertical = (svg.match(/<line [^>]*>/g) || []).filter((l) => /x1="([\d.]+)" x2="\1"/.test(l) && !l.includes('class="stem"'));
    assert.equal(vertical.length, 1);
    assert.ok(!/<rect [^>]*x="(29\d|30\d)/.test(svg));
  }
});

test("fillChoices: vier verschiedene Dauern, nach Länge sortiert", () => {
  for (const e of [...parseBar("2. 4. 8 16"), ...parseBar("r2 r4 r8 r16")]) {
    for (let i = 0; i < 50; i++) {
      const c = fillChoices(e);
      assert.equal(c.length, 4);
      assert.equal(new Set(c.map(beatsOf)).size, 4);
      assert.ok(c.some((o) => nameOf(o) === nameOf(e)));
      for (let k = 1; k < 4; k++) assert.ok(beatsOf(c[k - 1]) > beatsOf(c[k]));
    }
  }
});

test("Abstände im Takt: wachsen mit der Dauer, Lücke wie eine Viertel", () => {
  const xs = layoutBar(parseBar("2 4 8 8"));
  const d = xs.map((x, i) => (xs[i + 1] ?? X1) - x);
  assert.ok(d[0] > d[1] && d[1] > d[2]);
  assert.ok(Math.abs(d[2] - d[3]) < 0.02);
  // Verovio-Regel: Abstand ~ Dauer^0,6
  assert.ok(Math.abs(d[0] / d[1] - Math.pow(2, 0.6)) < 0.01);
  const g = layoutBar(parseBar("2 4 8 8"), 0), dg = g.map((x, i) => (g[i + 1] ?? X1) - x);
  assert.ok(Math.abs(dg[0] - dg[1]) < 0.02);
  assert.ok(xs[xs.length - 1] < X1 - 20);
});

test("Abstände im Takt: Fähnchen berührt weder den Kasten der Lücke noch das nächste Zeichen (alle 91 Aufgaben)", () => {
  // Breite der Fähnchen ab der linken Kopfkante (Noto Music bei 48 px: Achtel 1,1 LA, Sechzehntel 1,15 LA)
  const FLAG_W = { 8: 1.1 * S, 16: 1.15 * S }, BOX = 5, FREI = 3;
  let n = 0, weit = 0;
  for (const bar of BARS) {
    const els = parseBar(bar);
    els.forEach((_, gap) => {
      n++;
      const xs = layoutBar(els, gap), frage = new Set(barBeams(els, gap).flat());
      assert.ok(Math.abs(xs[0] - layoutBar(els)[0]) < 0.01 && xs[xs.length - 1] < X1 - 20, bar);
      els.forEach((e, i) => {
        if (i === gap || e.rest || e.v < 8 || frage.has(i)) return; // nur Noten mit Fähnchen im Fragebild
        const next = i + 1 < els.length ? xs[i + 1] - (i + 1 === gap ? BOX : 0) : X1;
        assert.ok(next - (xs[i] + FLAG_W[e.v]) >= FREI, `${bar}, Lücke ${gap}, Zeichen ${i}`);
        if (i + 1 === gap && e.v === 16) { weit++; assert.ok(Math.abs(xs[i + 1] - xs[i] - GAP_FLAG_ADVANCE) < 0.02); }
      });
    });
  }
  assert.equal(n, 91);
  assert.equal(weit, 3); // „16 ? 8“, „16 16 ?“, „8 16 ?“
  // ohne Sechzehntel vor der Lücke bleibt die Regel c · Dauer^0,6 unverändert
  const g = layoutBar(parseBar("16 16 8 4 2"), 0), d = g.map((x, i) => (g[i + 1] ?? X1) - x);
  assert.ok(Math.abs(d[2] / d[1] - Math.pow(2, 0.6)) < 0.01);
});

test("Punkt: rechts vom Kopf, auf einer Linie im Zwischenraum darüber", () => {
  // h' liegt auf der Mittellinie → Punkt im Zwischenraum darüber
  const d = dotSvg(PITCH, 170);
  assert.ok(d.includes(`cx="${170 + DOT.dx}"`) && d.includes(`cy="${MID - S / 2}"`) && d.includes(`r="${DOT.r}"`));
  // a' liegt im Zwischenraum → Punkt auf Höhe des Kopfes; g' auf der Linie → darüber
  assert.ok(dotSvg(N("A", 4), 100).includes(`cy="${BOTTOM - 3 * 6}"`));
  assert.ok(dotSvg(N("G", 4), 100).includes(`cy="${BOTTOM - 2 * 6 - 6}"`));
  // Gemessen gegen Verovio/Bravura: Durchmesser 0,4 LA, Mitte 1,09 LA rechts der Kopfmitte
  assert.ok(Math.abs((DOT.r * 2) / S - 0.4) < 1e-9);
  assert.ok(Math.abs(DOT.dx / S - 1.09) < 0.01);
});

test("Taktangabe 4/4: Ziffern je zwei Zwischenräume hoch", () => {
  const t = timeSigSvg();
  assert.equal(count(t, /class="glyph"/g), 2);
  assert.ok(t.includes(`y="${MID}"`) && t.includes(`y="${BOTTOM}"`));
  // Ziffernhöhe in Noto Music 718/1000 em
  assert.ok(Math.abs((TIME.size * 0.718) - 2 * S) < 0.1);
});

test("Lerntafeln: Reihenfolge, Tabelle mit Pyramide, drei Vorführungen mit eigenem Attribut", () => {
  assert.deepEqual(notenwerte.learn.map((c) => c.title), ["So erkennst du einen Notenwert", "Notenwerte und Pausen", "So bestimmst du die Dauer", "So zählst du einen Takt"]);
  assert.ok(notenwerte.learn.every((c) => c.clef === undefined));
  const c = notenwerte.learn[1];
  const html = c.render();
  assert.equal(html, learnHtml());
  // 13 Zeichen, Pyramide, zwei Bilder „mit Fähnchen = mit Balken“
  assert.equal(count(html, /<svg/g), 16);
  assert.ok(html.includes(pyramidSvg()));
  for (const t of ["ganze Note", "ganze Pause", "Sechzehntelpause", "punktierte halbe Note", "punktierte Viertelnote", "punktierte Achtelnote", "Schläge im 4/4", "1½", "¾", "Notenwert-Pyramide"]) assert.ok(html.includes(t), t);
  // keine <div>: .legend div hat eigene Styles
  assert.ok(!html.includes("<div"));
  for (const [i, id] of [[0, "value"], [2, "beats"], [3, "bar"]]) {
    const b = notenwerte.learn[i];
    assert.equal(typeof b.mount, "function");
    assert.ok(b.render().includes(`data-nw-board="${id}"`) && b.render().includes("data-demo-root"));
    assert.equal(count(b.render(), /data-ex="/g), BOARDS[id].examples.length);
  }
  assert.deepEqual(BOARDS.value.examples.map((x) => x.label), NAMES_ALL.slice(0, 5));
  assert.deepEqual(BOARDS.beats.examples.map((x) => x.label), ["Viertelnote", "Achtelpause", "punktierte halbe Note", "punktierte Viertelnote", "punktierte Achtelnote"]);
  // Takte der Lerntafel: aus BARS, einer mit Pause, einer mit Punkt
  const bars = BOARDS.bar.examples.map((x) => x.make());
  assert.equal(bars.length, 3);
});

test("Gemischt (Stufe 10) nutzt die vier Stufen ohne Hilfen gleich oft", () => {
  const seen = {};
  let prev = null;
  for (let i = 0; i < 4000; i++) { prev = L[9].question(prev); const k = prev.key.split(":")[0]; seen[k] = (seen[k] || 0) + 1; }
  // Schlüssel „1“ und „2“ = Stufe 3 (Erkennen), „3“ = Stufe 5, „4“ = Stufe 7, „5“ = Stufe 9
  const share = { 3: (seen[1] + seen[2]) / 4000, 5: seen[3] / 4000, 7: seen[4] / 4000, 9: seen[5] / 4000 };
  for (const [lv, p] of Object.entries(share)) assert.ok(p > 0.2 && p < 0.3, `Stufe ${lv}: ${p}`);
  assert.deepEqual(Object.keys(seen).sort(), ["1", "2", "3", "4", "5"]);
});

test("Texte ohne unpassende Wörter", () => {
  const texts = [notenwerte.title, notenwerte.subtitle, ...L.flatMap((l) => [l.title, l.subtitle, l.hint]), learnHtml()];
  for (const l of L) for (const it of l.items) {
    const q = it.make();
    texts.push(q.prompt, q.display, q.reveal, q.partial || "", ...q.choices, ...(q.steps || []).flatMap((s) => [s.prompt || "", s.ok || "", s.bad || "", ...s.choices]));
  }
  for (const t of texts) assert.ok(!/Fehler!|falsch|mühelos|Held|Champion/i.test(t), t);
});

/* ---------- Hilfen (Schritt 1) ---------- */

const NAMES_ALL = ["ganze Note", "halbe Note", "Viertelnote", "Achtelnote", "Sechzehntelnote", "ganze Pause", "halbe Pause", "Viertelpause", "Achtelpause", "Sechzehntelpause"];

test("Hilfen: nur die Stufen 1, 2, 4, 6, 8, nur als Tabelle, sie warten auf „Nächste Aufgabe“", () => {
  assert.deepEqual(L.filter(hasHelps).map((l) => l.no), HELP_LEVELS);
  for (const l of L) assert.equal(waitsForNext(l), HELP_LEVELS.includes(l.no), l.id);
  assert.deepEqual(L.filter(hasHelps).map((l) => helpsTitle(l)), ["Hilfen: Merkmale", "Hilfen: Pausen", "Hilfen: Notenwert-Pyramide", "Hilfen: Notenwert-Pyramide", "Hilfen: Zählleiste und Pyramide"]);
  for (const l of L.filter(hasHelps)) {
    assert.deepEqual(l.helps, ["tabelle"], l.id);
    assert.ok(l.helpText && l.helpTable, l.id);
    const h = helpsHtml(l, l.question(null));
    // keine Klaviatur, eine Tabelle in .help-grid; dieselbe Hilfe für jede Aufgabe (verrät nichts)
    assert.ok(!h.includes("help-keys") && h.includes('<div class="help-grid"><div class="help-table-wrap">'), l.id);
    for (let i = 0; i < 20; i++) assert.equal(helpsHtml(l, l.question(null)), h, l.id);
    // vor der Antwort nichts hervorgehoben
    assert.ok(!/class="[^"]*\b(hit|s1|ref|add)\b|tr class="hi"/.test(l.helpTable), l.id);
  }
  assert.equal(L[1].demo, undefined, "Stufe 2 ohne Vorführung");
});

test("Hilfen Stufe 1 (Merkmale): Kopf, Hals, Fähnchen je Notenwert, keine Notenbilder", () => {
  const t = featureTable();
  assert.ok(!t.includes("<svg"));
  const rows = [...t.matchAll(/<tr><td class="tt-label">([^<]+)<\/td>(.*?)<\/tr>/g)].map((m) => [m[1], [...m[2].matchAll(/<td class="tt-cell">(.*?)<\/td>/g)].map((c) => (c[1].match(/tt-box">([^<]+)</) || [0, "–"])[1])]);
  assert.deepEqual(rows, [
    ["ganze Note", ["hohl", "–", "–"]], ["halbe Note", ["hohl", "ja", "–"]], ["Viertelnote", ["schwarz", "ja", "–"]],
    ["Achtelnote", ["schwarz", "ja", "1"]], ["Sechzehntelnote", ["schwarz", "ja", "2"]],
  ]);
  assert.ok(t.includes("tt-wide"));
  assert.equal(L[0].helpText, "Erst den Kopf ansehen, dann Hals und Fähnchen.");
});

test("Hilfen Stufe 2 (Pausen): woran du sie erkennst, ohne Zeichen", () => {
  const t = restTable();
  assert.ok(!t.includes("<svg") && !/class="rest"/.test(t));
  assert.deepEqual(REST_FEATURES.map((r) => r[0]), NAMES_ALL.slice(5));
  // Form „Rechteck“ (Sandra, 24.11.2026); die ganze Pause hängt UNTER der 2. Linie von oben (= 4. von unten),
  // die halbe SITZT AUF der Mittellinie – nachgeprüft an den Rechtecken im Bild
  assert.equal(REST_SHAPE, "Rechteck");
  assert.deepEqual(REST_FEATURES.slice(0, 2), [
    ["ganze Pause", "Rechteck, hängt unter der zweiten Linie von oben (das ist die vierte Linie von unten)"],
    ["halbe Pause", "Rechteck, sitzt auf der Mittellinie"],
  ]);
  assert.ok(t.includes("zwei Haken") && t.includes("Zickzack"));
  const rect = (q) => q.svg.match(/<rect class="rest" data-value="\d+" x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/).slice(1).map(Number);
  const [whole, half] = ALL(L[1]);
  // Oberkante der ganzen Pause an der 2. Linie von oben (TOP + S, die Linie überdeckt zur Hälfte), darunter hängend
  assert.ok(Math.abs(rect(whole)[0] - (TOP + S)) <= 0.5);
  // Unterkante der halben Pause auf der Mittellinie (TOP + 2 S), darauf sitzend
  assert.equal(r2t(rect(half)[0] + rect(half)[1]), TOP + 2 * S);
  // kein „Balken“ in Texten zu Pausen
  const restTexts = [restTable(), HELP_TEXT_REST, L[1].hint, L[2].hint, L[1].helpText, ...ALL(L[1]).flatMap((q) => [q.prompt, q.display, q.reveal]),
    ...ALL(L[3]).filter((q) => q.key.startsWith("d:r")).flatMap((q) => [q.display, q.reveal, q.partial, q.steps[0].ok])];
  for (const x of restTexts) assert.ok(!/Balken/.test(x), x);
  assert.ok(L[1].hint.includes("Rechteck") && L[1].hint.includes("zweiten Linie von oben") && L[1].hint.includes("vierte Linie von unten"));
});

test("Notenwert-Pyramide: 1 + 2 + 4 + 8 + 16 Kästchen, Schläge 4 · 2 · 1 · ½ · ¼, ohne Namen und Pausen", () => {
  const p = pyramidSvg();
  assert.equal(count(p, /class="nw-pyr-box"/g), 31);
  assert.deepEqual([...p.matchAll(/class="nw-pyr-num"[^>]*>([^<]+)</g)].map((m) => m[1]), ["4", "2", "1", "½", "¼"]);
  // Zeichen in den Zeilen 1–4 (1 + 2 + 4 + 8), die Sechzehntel-Zeile nur Kästchen
  assert.equal(count(p, /<g class="note /g), 15);
  assert.equal(count(p, /notehead open/g), 3);
  assert.equal(count(p, /class="flag"/g), 8);
  for (const n of NAMES_ALL) assert.ok(!p.includes(n), n);
  assert.ok(!/\b(Note|Pause)\b/.test(p));
  assert.ok(!/class="rest"/.test(p));
  // jede Zeile gleich breit
  for (let k = 0; k < 5; k++) {
    const row = p.match(new RegExp(`data-row="${k}">(.*?)</g><g class="nw-pyr-row|data-row="${k}">(.*)</svg>`))[0];
    const xs = [...row.matchAll(/<rect class="nw-pyr-box" x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)].map((m) => [+m[1], +m[2]]);
    assert.equal(xs.length, 2 ** k);
    assert.ok(Math.abs(xs[xs.length - 1][0] + xs[xs.length - 1][1] + 1 - 250) < 0.05, `Zeile ${k}`);
  }
  assert.ok(pyramidSvg({ hit: 2 }).includes('class="nw-pyr-row hit" data-row="2"'));
  assert.ok(L[5].helpTable.includes("Punkt: + die Hälfte") && !L[3].helpTable.includes("Punkt"));
  assert.equal(L[3].helpText, "Eine Pause dauert so lang wie die Note mit demselben Wert.");
});

test("Hilfen Stufe 8: Zählleiste 1 + 2 + 3 + 4 + (Schläge grau) mit „+ heißt „und““ im Bild, darunter die Pyramide in voller Größe", () => {
  assert.deepEqual(COUNT_SYLLABLES, ["1", "+", "2", "+", "3", "+", "4", "+"]);
  const t = countTable();
  // „+“ als Zählsilbe abgesetzt (.nw-und), nicht als Rechenzeichen
  assert.deepEqual([...t.matchAll(/tt-box">(<span class="nw-und">\+<\/span>|[^<]+)</g)].map((m) => m[1].replace(/<[^>]+>/g, "")), COUNT_SYLLABLES);
  assert.equal(count(t, /<span class="nw-und">\+<\/span>/g), 4 + 1);
  assert.deepEqual([...t.matchAll(/<td class="tt-cell( fam)?">/g)].map((m) => !!m[1]), [true, false, true, false, true, false, true, false]);
  // der Satz steht im Bild der Zählleiste selbst (eine figure), keine Rechnung darin
  assert.match(t, /^<figure class="nw-count-fig">.*<figcaption class="nw-count-cap"><span class="nw-und">\+<\/span> heißt „und“/);
  assert.ok(!t.replace(/<[^>]+>/g, "").includes("="));
  assert.ok(L[7].helpTable.includes(t) && L[7].helpTable.includes('class="nw-pyr"') && !L[7].helpTable.includes("small"));
  // untereinander: Zählleiste, dann Pyramide
  assert.ok(L[7].helpTable.indexOf(t) < L[7].helpTable.indexOf("nw-pyr"));
  const css = readFileSync(new URL("../../css/style.css", import.meta.url), "utf8");
  assert.match(css, /\.nw-und \{[^}]*color: var\(--muted\)[^}]*font-size: [^;]*em/);
  assert.match(css, /\.nw-help-stack \{[^}]*grid/);
});

/* ---------- Vorführungen (Schritt 2) ---------- */

const frameOk = (d) => {
  assert.equal(d.steps.length, 2);
  d.frames.forEach((f, i) => {
    assert.ok(typeof f.body === "string" && f.body.includes("<svg"), `Bild ${i}`);
    assert.ok(f.result ? f.step === 3 : !!f.text, `Bild ${i}`);
  });
  // Schritte der Reihe nach: 0, dann 1 …, dann 2 …, zuletzt das Ergebnis
  const st = d.frames.map((f) => f.step);
  assert.deepEqual(st, [...st].sort((a, b) => a - b));
  assert.equal(st[0], 0); assert.equal(st[st.length - 1], 3);
  assert.ok(st.includes(1) && st.includes(2));
  assert.equal(d.frames.filter((f) => f.result).length, 1);
};

test("Vorführung „So erkennst du einen Notenwert“: 4 Bilder, Kopf violett, Hals/Fähnchen grün, Note unverändert", () => {
  const feats = [["hohl", "ohne Hals"], ["hohl", "mit Hals"], ["schwarz", "kein Fähnchen"], ["schwarz", "1 Fähnchen"], ["schwarz", "2 Fähnchen"]];
  ITEMS_1.forEach((it, k) => {
    const d = valueDemo(it.el), [head, feat] = feats[k];
    frameOk(d);
    assert.deepEqual(d.steps, DEMO_STEPS_VALUE);
    assert.equal(d.frames.length, 4);
    assert.deepEqual(d.frames.map((f) => [count(f.body, /nw-ring s1/g), count(f.body, /nw-ring s2/g)]), [[0, 0], [1, 0], [1, 1], [1, 1]]);
    assert.equal(d.frames[1].text, `Kopf ${head}`);
    assert.ok(d.frames[2].text.startsWith(feat[0].toUpperCase() + feat.slice(1) + " → " + NAMES_ALL[k]));
    // gestrichelt nur dort, wo kein Hals ist (ganze Note)
    assert.equal(d.frames[2].body.includes("nw-ring s2 empty"), k === 0);
    assert.deepEqual(d.frames[3].result.chips.map((c) => [c.step, c.text]), [[1, `Kopf ${head}`], [2, feat]]);
    assert.ok(nb(d.frames[3].result.title).startsWith(NAMES_ALL[k][0].toUpperCase() + NAMES_ALL[k].slice(1) + " · "));
    assert.deepEqual(d.frames[3].tones, [PITCH]);
    // die Note selbst ist in jedem Bild dieselbe (Rahmen nur darüber)
    const note = (b) => b.match(/<g class="note ">.*?<\/g>/)[0];
    d.frames.forEach((f) => assert.equal(note(f.body), note(d.frames[0].body)));
  });
  assert.equal(nb(valueDemo(ITEMS_1[3].el).frames[3].result.title), "Achtelnote · ½ Schlag im 4/4-Takt");
});

test("Vorführung „So bestimmst du die Dauer“: 4 Bilder, mit Punkt 5, die grüne Zeile der Pyramide passt", () => {
  for (const it of [...ITEMS_4, ...ITEMS_6]) {
    const e = it.el, d = beatsDemo(e);
    frameOk(d);
    assert.deepEqual(d.steps, DEMO_STEPS_BEATS);
    assert.equal(d.frames.length, e.dot ? 5 : 4, it.key);
    const row = [1, 2, 4, 8, 16].indexOf(e.v);
    assert.ok(!/nw-pyr-row (hit|add)/.test(d.frames[0].body + d.frames[1].body), it.key);
    assert.ok(d.frames[2].body.includes(`class="nw-pyr-row hit" data-row="${row}"`), it.key);
    // nicht die ganze Zeile: genau EIN Kästchen grün, das erste der Zeile (Welle 10, Top 6)
    assert.equal(count(d.frames[2].body, /nw-pyr-box hit/g), 1, it.key);
    assert.equal(hitBoxes(d.frames[2].body), `${row}:0`, it.key);
    // Schritt 1 nennt keine Schläge
    assert.ok(!/Schl|[¼½¾]|\d/.test(d.frames[1].text), d.frames[1].text);
    assert.match(d.frames[1].body, /class="nw-s1( nw-dot0)?"/);
    if (e.dot) {
      const f = d.frames[3];
      assert.ok(f.body.includes(`class="nw-pyr-row add" data-row="${row + 1}"`), it.key);
      // ein Kästchen grün, darunter EIN Kästchen der nächsten Zeile umrandet – direkt hinter dem grünen
      // (Index 2 der Zeile darunter): zusammen reicht es bis 1½ Kästchen des Notenwerts
      assert.equal(count(f.body, /nw-pyr-box hit/g), 1, it.key);
      assert.equal(count(f.body, /nw-pyr-box add/g), 1, it.key);
      assert.equal(hitBoxes(f.body), `${row}:0`, it.key);
      assert.equal(addBoxes(f.body), `${row + 1}:2`, it.key);
      const bb = beatsOf({ ...e, dot: false }), sumText = f.body.match(/class="nw-pyr-sum"[^>]*>([^<]+)</)[1];
      assert.equal(sumText, `${beatsLabel(bb).split(" ")[0]} + ${beatsLabel(bb / 2).split(" ")[0]} = ${beatsLabel(beatsOf(e)).split(" ")[0]}`, it.key);
      // Kästchen in Pyramiden-Breiten: grünes [0, w/n], umrandetes beginnt dort, wo das grüne endet
      const box = (cls) => f.body.match(new RegExp(`nw-pyr-box ${cls}" x="([\\d.]+)" y="[\\d.]+" width="([\\d.]+)"`)).slice(1).map(Number);
      const [gx, gw] = box("hit"), [ax, aw] = box("add");
      assert.ok(Math.abs(gx + gw + 2 - ax) < 0.05 && Math.abs(aw * 2 + 2 - gw) < 0.05, it.key);
      assert.ok(d.frames[1].text.startsWith("Ohne den Punkt: "));
      assert.ok(d.frames[d.frames.length - 1].body.includes("nw-pyr-box add"), it.key);
    } else assert.ok(!d.frames.some((x) => x.body.includes("nw-pyr-box add")), it.key);
    const r = d.frames[d.frames.length - 1];
    assert.equal(nb(r.result.title), `${nameOf(e)[0].toUpperCase()}${nameOf(e).slice(1)} = ${nb(beatsLabel(beatsOf(e)))}`, it.key);
    assert.deepEqual(r.tones, e.rest ? [] : [PITCH]);
  }
  assert.deepEqual(beatsDemo(parseBar("4.")[0]).frames.map((f) => nb(f.text || f.result.title)), [
    "Wie lange dauert das? Erst der Notenwert, dann die Schläge.", "Ohne den Punkt: Viertelnote", "Viertelnote = 1 Schlag",
    "Punkt: die Hälfte dazu · 1 + ½ = 1½", "Punktierte Viertelnote = 1½ Schläge",
  ]);
  assert.equal(nb(beatsDemo(parseBar("r8")[0]).frames[2].text), "Achtelpause = ½ Schlag, so lang wie die Achtelnote");
  // Punktierte Note: in Schritt 1 („ohne den Punkt“) bleibt der Punkt schwarz, im Bild „die Hälfte dazu“ ist er grün
  const dotCls = (f) => (f.body.match(/class="nw-s\d nw-dot(\d)"/) || [])[1] || null;
  assert.deepEqual(beatsDemo(parseBar("4.")[0]).frames.map(dotCls), [null, "0", "0", "2", null]);
  assert.deepEqual(beatsDemo(parseBar("4")[0]).frames.map(dotCls), [null, null, null, null]);
  const css = readFileSync(new URL("../../css/style.css", import.meta.url), "utf8");
  assert.match(css, /\.nw-dot0 \.notehead\.aug \{ fill: var\(--ink\); \}/);
  assert.match(css, /\.nw-dot2 \.notehead\.aug \{ fill: var\(--step2\); \}/);
});

const segsOf = (body) => [...body.matchAll(/class="nw-seg s(\d)" data-from="([\d.]+)" data-to="([\d.]+)"/g)].map((m) => [+m[1], +m[2], +m[3]]);

test("Vorführung „So zählst du einen Takt“: n + 4 Bilder, Summenleiste für alle 91 Aufgaben nachgerechnet", () => {
  for (const it of ITEMS_8) {
    const els = parseBar(it.bar), gap = it.gap, d = barDemo(els, gap), n = els.length, ans = els[gap];
    const missing = beatsOf(ans), have = 4 - missing;
    frameOk(d);
    assert.deepEqual(d.steps, DEMO_STEPS_BAR);
    assert.equal(d.frames.length, n + 4, it.key);
    assert.ok(d.frames.length <= 9);
    // Schritt 1: je Zeichen ein Bild, Summe wächst um dessen Dauer (Lücke: nichts), keine Zählzeiten
    let sum = 0;
    els.forEach((e, i) => {
      const f = d.frames[1 + i], segs = segsOf(f.body);
      assert.equal(f.step, 1);
      if (i !== gap) sum += beatsOf(e);
      assert.equal(segs.reduce((a, s) => a + s[2] - s[1], 0), sum * 2, `${it.key} Bild ${i + 1}`);
      assert.ok(segs.every((s) => s[0] === 1));
      assert.ok(!f.body.includes("nw-sum-label"));
      assert.equal(f.text, i === gap ? "Lücke: überspringen" : `${nameOf(e)[0].toUpperCase()}${nameOf(e).slice(1)}: ${beatsLabel(beatsOf(e)).replace(" ", "\u00a0")} · bisher ${beatsLabel(sum).replace(" ", "\u00a0")}`);
      assert.deepEqual(f.tones, i === gap || e.rest ? [] : [PITCH]);
      // das gezählte Zeichen violett (auch die Lücke)
      assert.equal(count(f.body, /class="nw-s1"/g), 1);
    });
    const sumFrame = d.frames[n + 1], pick = d.frames[n + 2], res = d.frames[n + 3];
    assert.equal(sum, have);
    assert.ok(sumFrame.body.includes("nw-sum-out s1"));
    assert.equal(nb(sumFrame.text), `Im Takt ${have > 1 ? "stehen" : "steht"} ${nb(beatsLabel(have))} · bis 4 ${missing > 1 ? "fehlen" : "fehlt"} ${nb(beatsLabel(missing))}`);
    // Schritt 2: die leeren Felder grün, die Lücke grün gefüllt
    assert.deepEqual(segsOf(pick.body).filter((s) => s[0] === 2), [[2, have * 2, 8]]);
    assert.equal(pick.step, 2);
    assert.ok(pick.body.includes('<g class="filled nw-s2">') && !pick.body.includes('class="gap"'));
    assert.equal(nb(pick.text), `${nb(beatsLabel(missing))} → ${nameOf(ans)}`);
    // Ergebnis: Zählleiste in der echten Reihenfolge, die Felder des eingesetzten Werts grün
    const start = els.slice(0, gap).reduce((a, e) => a + beatsOf(e) * 2, 0);
    assert.deepEqual(segsOf(res.body), [[2, start, start + missing * 2]]);
    const labels = [...res.body.matchAll(/class="nw-sum-label[^"]*"[^>]*>(.*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
    assert.deepEqual(labels, countLabels(els));
    assert.equal(res.result.chips[1].text, nameOf(ans));
    assert.ok(res.body.includes('<g class="filled nw-s2">'));
    // Ergebnis: Zählzeiten unter den Noten (wie nach der Antwort in Stufe 8/9), in den Bildern davor nicht
    assert.ok(res.body.includes('<g class="nw-counts">'), it.key);
    d.frames.slice(0, -1).forEach((f, i) => assert.ok(!f.body.includes("nw-counts"), `${it.key} Bild ${i}`));
    // Satz zur Lücke aus den Einsatzzeiten; Klammern und „+ heißt „und““ im Ergebnisbild erklärt
    assert.equal(res.result.note, gapSentence(els, gap));
    assert.ok(res.body.includes(COUNT_EXPLAIN) && COUNT_EXPLAIN.includes("In Klammern"), it.key);
    // Schritt 1 und 2: Summenleiste als Menge (keine Schlag-Felder, Überschrift „Summe“, Marken 0–4);
    // die Zählleiste mit den Feldern nur im Ergebnis
    d.frames.slice(0, -1).forEach((f, i) => {
      assert.ok(f.body.includes(">Summe<") && !f.body.includes("nw-sum-field") && !f.body.includes("nw-countbar"), `${it.key} Bild ${i}`);
      assert.deepEqual([...f.body.matchAll(/data-mark="(\d)"/g)].map((m) => +m[1]), [0, 1, 2, 3, 4]);
    });
    assert.ok(!res.body.includes(">Summe<") && count(res.body, /nw-sum-field/g) === 8 && res.body.includes(">Zählen<"), it.key);
  }
  // Zählleiste: alle acht Silben; ohne Klammern nur dort, wo eine Note beginnt (gehaltene Note oder Pause in Klammern)
  assert.deepEqual(countLabels(parseBar("8 r8 4 2")), ["1", "(+)", "2", "(+)", "3", "(+)", "(4)", "(+)"]);
  assert.deepEqual(countLabels(parseBar("r2 2")), ["(1)", "(+)", "(2)", "(+)", "3", "(+)", "(4)", "(+)"]);
  assert.deepEqual(countLabels(parseBar("16 16 8 4 2")), ["1", "+", "2", "(+)", "3", "(+)", "(4)", "(+)"]);
  assert.deepEqual(countLabels(parseBar("8 16 16 4 2")), ["1", "+", "2", "(+)", "3", "(+)", "(4)", "(+)"]);
  assert.deepEqual(countLabels(parseBar("4 4 4 4")), ["1", "(+)", "2", "(+)", "3", "(+)", "4", "(+)"]);
  // Zeit des eingesetzten Werts als Streifen UNTER den Feldern (verdeckt keine Silbe, auch bei Sechzehnteln)
  const r16 = barDemo(parseBar("16 16 8 4 2"), 1).frames.at(-1).body;
  const strip = r16.match(/<rect class="nw-seg s2" data-from="0.5" data-to="1" x="[\d.]+" y="([\d.]+)"/);
  const field = r16.match(/<rect class="nw-sum-field beat" x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/);
  assert.ok(strip && +strip[1] > +field[1] + +field[2], "Streifen unter den Feldern");
  // eine Sechzehntel füllt ein halbes Feld
  const d = barDemo(parseBar("16 16 8 4 2"), 4);
  assert.deepEqual(segsOf(d.frames[1].body), [[1, 0, 0.5]]);
  assert.deepEqual(segsOf(d.frames[2].body), [[1, 0, 0.5], [1, 0.5, 1]]);
});

test("„Vorführen“ in den Hilfen: jede Aufgabe der Stufen 1, 4, 6, 8 lässt sich vorführen, Stufe 2 nicht", () => {
  for (const l of L) {
    assert.equal(typeof l.demo === "function", [1, 4, 6, 8].includes(l.no), l.id);
    if (!l.demo) continue;
    for (const it of l.items) { const d = l.demo(Object.assign(it.make(), { key: it.key })); frameOk(d); }
    assert.ok(helpsHtml(l, l.question(null)).includes("data-demo-btn disabled"));
  }
});

/* ---------- Balken (Welle 10, Schritt 5) ---------- */

// Erwartete Balkengruppen je Takt (Indizes der Elemente), ausgeschrieben
const EXPECTED_BEAMS = {
  "4 4 4 4": [], "2 4 4": [], "4 4 2": [], "2 2": [], "2. 4": [], "4. 8 4 4": [], "4 4 4. 8": [], "4. 8 2": [],
  "8 8 4 4 4": [[0, 1]], "4 8 8 2": [[1, 2]], "4 4 8 8 4": [[2, 3]], "2 8 8 8 8": [[1, 2], [3, 4]],
  "r4 4 4 4": [], "4 4 r2": [], "2 r4 4": [], "4 r4 2": [], "8 r8 4 2": [], "r2 2": [], "4 4 4 r4": [],
  "16 16 8 4 2": [[0, 1, 2]], "2. r4": [], "4 r8 8 2": [], "4. 8 r4 4": [], "2 4 r8 8": [], "8 16 16 4 2": [[0, 1, 2]],
};
// Zweiter Balken (Positionen in der Gruppe)
const EXPECTED_SECOND = { "16 16 8 4 2": [[[0, 1]]], "8 16 16 4 2": [[[1, 2]]] };
const flagCount = (svg) => count(svg, /class="flag"/g);
const beamGroupsIn = (svg) => svg.match(/<g class="beam-group[^"]*">.*?<\/g>/g) || [];
const flaggedNotes = (els, beamed) => els.filter((e, i) => !e.rest && e.v >= 8 && !beamed.has(i)).length;

test("Balken: beamGroups für alle 25 Takte, je Schlag (auch „2 8 8 8 8“: 2 + 2)", () => {
  assert.equal(BARS.length, 25);
  assert.deepEqual(Object.keys(EXPECTED_BEAMS).sort(), BARS.slice().sort());
  assert.equal(BEAM_UNIT, 1);
  for (const bar of BARS) {
    const els = parseBar(bar), groups = beamGroups(els);
    assert.deepEqual(groups, EXPECTED_BEAMS[bar], bar);
    // Summe der Schläge weiter 4
    assert.equal(sum(els), 4, bar);
    const on = onsetsOf(els);
    for (const g of groups) {
      // nur Achtel und Sechzehntel, keine Pause, alles im selben Schlag
      assert.ok(g.every((i) => !els[i].rest && els[i].v >= 8), bar);
      const beat = Math.floor(on[g[0]]);
      assert.ok(g.every((i) => Math.floor(on[i]) === beat && on[i] + beatsOf(els[i]) <= beat + 1), bar);
      for (let k = 1; k < g.length; k++) assert.equal(g[k], g[k - 1] + 1, bar);
      assert.deepEqual(secondaryBeams(els, g), EXPECTED_SECOND[bar]?.[groups.indexOf(g)] ?? [], bar);
    }
  }
  // einzelne Achtel behalten das Fähnchen, kein Balken über Pause oder Schlaggrenze
  for (const bar of ["4. 8 4 4", "8 r8 4 2", "4 r8 8 2", "4. 8 r4 4", "2 4 r8 8"]) assert.deepEqual(beamGroups(parseBar(bar)), [], bar);
  assert.deepEqual(beamGroups(parseBar("4 8 8 8 8 4")), [[1, 2], [3, 4]]);
  assert.deepEqual(beamGroups(parseBar("8 4 8 2")), []);
});

test("Balken: kein Takt braucht einen Teilbalken (neuer Takt fällt auf)", () => {
  for (const bar of BARS) {
    const els = parseBar(bar);
    for (const g of beamGroups(els)) assert.equal(needsStub(els, g), false, bar);
  }
  // Gruppen mit Stummel werden erkannt
  const a = parseBar("16 8 16 4 4 4"), b = parseBar("8. 16 4 4 4");
  assert.equal(needsStub(a, beamGroups(a)[0]), true);
  assert.equal(needsStub(b, beamGroups(b)[0]), true);
});

test("Balken: Maße nach Verovio/Bravura (Dicke 0,5 LA, Abstand 0,25 LA, Außenkante vor dem Halsende)", () => {
  assert.equal(BEAM.thick, 0.5 * S);
  assert.equal(BEAM.gap, 0.25 * S);
  // Außenkante 1 Einheit (0,08 LA) vor dem Ende eines einzelnen Halses (3,5 LA), Hals endet 0,1 LA im Balken
  assert.equal(BEAM.outer, 3.5 * S - 1);
  const xs = [100, 130, 160], svg = beamSvg(xs, MID, false, [[0, 1]]);
  const rects = [...svg.matchAll(/<rect class="beam" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  assert.equal(rects.length, 2);
  const [p, q] = rects;
  // erster Balken: von der Außenkante des ersten bis zur Außenkante des letzten Halses
  assert.ok(Math.abs(p[0] - (stemX(100) - 0.9)) < 0.01 && Math.abs(p[0] + p[2] - (stemX(160) + 0.9)) < 0.01);
  assert.ok(Math.abs(p[1] + p[3] - (MID + BEAM.outer)) < 0.01);
  // zweiter Balken: 0,25 LA weiter innen, endet innen in der Halsmitte
  assert.ok(Math.abs(q[1] + q[3] - (p[1] - BEAM.gap)) < 0.01);
  assert.ok(Math.abs(q[0] + q[2] - stemX(130)) < 0.01);
});

test("Balken im Takt: Aufgabe ohne Balken an der Lücke, Auflösung mit allen Gruppen, nie Fähnchen und Balken", () => {
  let checked = 0, inGroup = 0;
  for (const it of L[7].items) {
    const q = Object.assign(it.make(), { key: it.key });
    const els = q.bar, full = beamGroups(els);
    // Fragebild: keine Gruppe enthält die Lücke
    const shown = barBeams(els, q.gap, false);
    assert.ok(shown.every((g) => !g.includes(q.gap)), it.key);
    assert.deepEqual(shown, full.filter((g) => !g.includes(q.gap)), it.key);
    assert.equal(beamGroupsIn(q.svg).length, shown.length, it.key);
    const shownSet = new Set(shown.flat()), elsNoGap = els.map((e, i) => (i === q.gap ? { ...e, rest: true } : e));
    assert.equal(flagCount(q.svg), flaggedNotes(elsNoGap, shownSet), it.key);
    // Auflösung: die Gruppen des vollen Takts, gebalkte Noten ohne Fähnchen
    assert.deepEqual(barBeams(els, q.gap, true), full, it.key);
    assert.equal(beamGroupsIn(q.revealSvg).length, full.length, it.key);
    assert.equal(flagCount(q.revealSvg), flaggedNotes(els, new Set(full.flat())), it.key);
    // zweiter Balken nur bei den Sechzehnteln
    const second = full.reduce((a, g) => a + secondaryBeams(els, g).length, 0);
    assert.equal(count(q.revealSvg, /class="beam"/g), full.length + second, it.key);
    // die Abstände ändern sich nicht: dieselben Kopfmitten in Aufgabe und Auflösung (außer an der Lücke)
    const heads = (svg) => [...svg.matchAll(/<ellipse class="notehead" cx="([\d.]+)"/g)].map((m) => m[1]);
    const qh = heads(q.svg), rh = heads(q.revealSvg);
    assert.ok(qh.every((x) => rh.includes(x)), it.key);
    if (full.some((g) => g.includes(q.gap))) inGroup++;
    checked++;
  }
  assert.equal(checked, 91);
  // Lücken in einer Balkengruppe: 8 8 (4 Takte, 2 + 2 + 2 + 4 Lücken) und je 3 in den Sechzehntel-Takten
  assert.equal(inGroup, 16);
});

test("Balken: gebalkte Hälse enden im Balken, gleiche Höhe für alle Noten der Gruppe", () => {
  const svg = barSvg(parseBar("16 16 8 4 2"), -1, true);
  const stems = [...svg.matchAll(/<line class="stem" x1="([\d.]+)" x2="[\d.]+" y1="[\d.]+" y2="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const beamRect = [...svg.matchAll(/<rect class="beam" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  const [p] = beamRect;
  // drei gebalkte Hälse: Ende 0,1 LA vor der Außenkante, also im Balken
  for (const [x, y2] of stems.slice(0, 3)) {
    assert.ok(Math.abs(y2 - (p[1] + p[3] - 0.1 * S)) < 0.01);
    assert.ok(x >= p[0] && x <= p[0] + p[2]);
  }
  // Viertel und halbe Note behalten ihre Halslänge 3,5 LA
  for (const [, y2] of stems.slice(3)) assert.equal(y2, MID + 3.5 * S);
  assert.equal(flagCount(svg), 0);
});

test("Balken in der Vorführung: Lücke mit Fähnchen, Ergebnis mit Balken; Farben in CSS", () => {
  const els = parseBar("8 16 16 4 2"), d = barDemo(els, 1);
  const first = d.frames[0].body, last = d.frames[d.frames.length - 1].body;
  assert.equal(beamGroupsIn(first).length, 0);
  assert.equal(flagCount(first), 2);
  assert.equal(beamGroupsIn(last).length, 1);
  assert.equal(flagCount(last), 0);
  assert.ok(last.includes('<g class="filled nw-s2">'));
  const css = readFileSync(new URL("../../css/style.css", import.meta.url), "utf8");
  for (const r of [/\.beam \{ fill: var\(--ink\)/, /svg\.ok \.beam \{ fill: var\(--ok\)/, /svg\.bad \.beam \{ fill: var\(--bad\)/, /\.nw-s1 \.beam \{ fill: var\(--step1\)/, /\.nw-s2 \.beam \{ fill: var\(--step2\)/]) assert.match(css, r);
});

test("Balken: Lerntafel „mit Fähnchen = mit Balken“, Satz in den Hilfen der Stufe 8, Stufen 1–7 unverändert", () => {
  assert.equal(HELP_TEXT_BEAM, "Achtel und Sechzehntel in einem Schlag hängen an einem Balken.");
  assert.ok(L[7].helpText.endsWith(HELP_TEXT_BEAM));
  const html = learnHtml();
  assert.deepEqual(BEAM_PICTURES.map((b) => b.bar), ["8 8", "8 16 16"]);
  for (const b of BEAM_PICTURES) {
    assert.ok(html.includes(b.text));
    const svg = beamPictureSvg(b.bar, b.text), n = b.bar.split(" ").length;
    // links mit Fähnchen, rechts mit Balken
    assert.equal(count(svg, /<g class="note /g), 2 * n);
    assert.equal(flagCount(svg), n);
    assert.equal(beamGroupsIn(svg).length, 1);
    assert.equal(count(svg, /class="beam"/g), b.bar.includes("16") ? 2 : 1);
  }
  assert.ok(html.includes(HELP_TEXT_BEAM));
  // Stufen 1–7: einzelne Zeichen, nie ein Balken
  for (const l of L.slice(0, 7)) for (const it of l.items) assert.ok(!it.make().svg.includes("beam"), it.key);
});

/* ---------- Zählzeiten, Wortlaut, Vorführungen, Pyramide (Welle 10, Schritt 6) ---------- */

// Zählzeiten unter den Zeichen, ausgeschrieben für alle 25 Takte. Regel (Sandra, 24.11.2026): Einsatzsilbe
// ohne Klammer (Pause: in Klammern), danach jede gehaltene Schlagzahl in Klammern; gehaltene „+“ nicht;
// eine Sechzehntel zwischen zwei Silben ohne Silbe.
const EXPECTED_COUNTS = {
  "4 4 4 4": ["1", "2", "3", "4"], "2 4 4": ["1 (2)", "3", "4"], "4 4 2": ["1", "2", "3 (4)"], "2 2": ["1 (2)", "3 (4)"],
  "2. 4": ["1 (2) (3)", "4"], "4. 8 4 4": ["1 (2)", "+", "3", "4"], "4 4 4. 8": ["1", "2", "3 (4)", "+"],
  "4. 8 2": ["1 (2)", "+", "3 (4)"], "8 8 4 4 4": ["1", "+", "2", "3", "4"], "4 8 8 2": ["1", "2", "+", "3 (4)"],
  "4 4 8 8 4": ["1", "2", "3", "+", "4"], "2 8 8 8 8": ["1 (2)", "3", "+", "4", "+"], "r4 4 4 4": ["(1)", "2", "3", "4"],
  "4 4 r2": ["1", "2", "(3) (4)"], "2 r4 4": ["1 (2)", "(3)", "4"], "4 r4 2": ["1", "(2)", "3 (4)"],
  "8 r8 4 2": ["1", "(+)", "2", "3 (4)"], "r2 2": ["(1) (2)", "3 (4)"], "4 4 4 r4": ["1", "2", "3", "(4)"],
  "16 16 8 4 2": ["1", "", "+", "2", "3 (4)"], "2. r4": ["1 (2) (3)", "(4)"], "4 r8 8 2": ["1", "(2)", "+", "3 (4)"],
  "4. 8 r4 4": ["1 (2)", "+", "(3)", "4"], "2 4 r8 8": ["1 (2)", "3", "(4)", "+"], "8 16 16 4 2": ["1", "+", "", "2", "3 (4)"],
};

test("Zählzeiten unter den Zeichen: alle 25 Takte ausgeschrieben, jede Schlagzahl genau einmal", () => {
  assert.deepEqual(Object.keys(EXPECTED_COUNTS).sort(), BARS.slice().sort());
  for (const bar of BARS) {
    const els = parseBar(bar), txt = countLabelText(els);
    assert.deepEqual(txt, EXPECTED_COUNTS[bar], bar);
    // jede Schlagzahl 1–4 kommt genau einmal vor; ein „+“ nur, wo ein Zeichen beginnt
    const syl = countSyllables(els).flat();
    assert.deepEqual(syl.filter((x) => x.text !== "+").map((x) => x.text), ["1", "2", "3", "4"], bar);
    const on = onsetsOf(els);
    els.forEach((e, i) => {
      const first = countSyllables(els)[i][0];
      // Pausen ganz in Klammern; bei Noten die erste Silbe ohne Klammer (falls die Note auf einer Silbe beginnt)
      if (e.rest) assert.ok(countSyllables(els)[i].every((x) => x.hold), bar);
      else if (Number.isInteger(on[i] * 2)) assert.equal(first.hold, false, bar);
      else assert.equal(countSyllables(els)[i].length, 0, bar);
    });
  }
  // allgemein (auch ohne Takt in BARS): ganze Note, ganze Pause, punktierte halbe auf 2
  assert.deepEqual(countLabelText(parseBar("1")), ["1 (2) (3) (4)"]);
  assert.deepEqual(countLabelText(parseBar("r1")), ["(1) (2) (3) (4)"]);
  assert.deepEqual(countLabelText(parseBar("4 2.")), ["1", "2 (3) (4)"]);
});

test("Zählzeiten: genau unter dem Zeichen, nichts berührt Hals, Balken oder die nächste Silbe; nicht im Fragebild", () => {
  for (const it of ITEMS_8) {
    const els = parseBar(it.bar), xs = layoutBar(els, it.gap), marks = countMarks(els, it.gap);
    const q = it.make();
    assert.ok(!q.svg.includes("nw-cnt"), it.key);
    const texts = [...q.revealSvg.matchAll(/<text class="nw-cnt[^"]*" x="([\d.]+)" y="([\d.]+)"/g)].map((m) => [+m[1], +m[2]]);
    assert.equal(texts.length, marks.length, it.key);
    // erste Silbe jedes Zeichens mittig unter dem Kopf (Note) bzw. unter der Pause
    // Kopfmitte = Hals (nach unten, links am Kopf) + 6,2 (stemX in staff.js)
    const heads = [...barSvg(els, it.gap, true).matchAll(/<line class="stem" x1="([\d.]+)"/g)].map((m) => +m[1] + 6.2);
    els.forEach((e, i) => {
      const m = marks.find((x) => x.i === i);
      if (!m) return;
      assert.ok(m.x > xs[i] - 1 && (i === els.length - 1 || m.x < xs[i + 1]), `${it.key}: Zeichen ${i}`);
      if (!e.rest) assert.ok(heads.some((h) => Math.abs(h - m.x) < 0.02), `${it.key}: Kopf ${i}`);
    });
    // Abstand: Silben überlappen nicht (geschätzte Breite, im Browser nachgemessen), alle vor dem Taktstrich
    for (let k = 1; k < marks.length; k++) {
      const a = marks[k - 1], b = marks[k];
      assert.ok(a.x + syllableWidth(a.s) / 2 + 2 < b.x - syllableWidth(b.s) / 2, `${it.key}: ${a.s.text} ${b.s.text}`);
    }
    const last = marks[marks.length - 1];
    assert.ok(last.x + syllableWidth(last.s) / 2 < X1 - 2, it.key);
    // Oberkante der Ziffern (etwa 0,75 der Schriftgröße über der Grundlinie, Klammern etwas höher) unter
    // Halsende und Balken (y = 100) mit Abstand; Unterkante der Klammern in der Zeile (Höhe 122)
    for (const [, y] of texts) {
      assert.equal(y, COUNT_Y);
      assert.ok(y - 0.82 * COUNT_FONT.num > MID + 3.5 * S + 3, it.key);
      assert.ok(y + 0.25 * COUNT_FONT.num < 122, it.key);
    }
  }
  // „+“ unter den Noten als Zählsilbe abgesetzt
  const r = ITEMS_8.find((it) => it.bar === "8 r8 4 2").make().revealSvg;
  assert.ok(r.includes('<text class="nw-cnt hold" x="') && r.includes('(<tspan class="nw-und">+</tspan>)'));
});

test("Vorführung 3: Satz zur Lücke aus den Einsatzzeiten (alle 91 Aufgaben)", () => {
  const U = '<span class="nw-und">+</span>';
  assert.equal(gapSentence(parseBar("4. 8 4 4"), 1), `Die Lücke steht auf „2 ${U}“, dort steht jetzt die Achtelnote.`);
  assert.equal(gapSentence(parseBar("4 4 r2"), 2), "Die Lücke steht auf „3“, dort steht jetzt die halbe Pause.");
  assert.equal(gapSentence(parseBar("16 16 8 4 2"), 1), `Die Lücke steht zwischen den Zählzeiten „1“ und „1 ${U}“, dort steht jetzt die Sechzehntelnote.`);
  assert.equal(gapSentence(parseBar("8 16 16 4 2"), 2), `Die Lücke steht zwischen den Zählzeiten „1 ${U}“ und „2“, dort steht jetzt die Sechzehntelnote.`);
  for (const it of ITEMS_8) {
    const els = parseBar(it.bar), a = onsetsOf(els)[it.gap] * 2, t = gapSentence(els, it.gap);
    assert.ok(t.endsWith(`, dort steht jetzt die ${nameOf(els[it.gap])}.`), it.key);
    // die genannte Zählzeit ist die, auf der die Lücke beginnt
    if (Number.isInteger(a)) {
      const want = a % 2 === 0 ? `${a / 2 + 1}` : `${(a - 1) / 2 + 1} ${U}`;
      assert.equal(gapPlace(a), `auf „${want}“`, it.key);
    } else assert.ok(gapPlace(a).startsWith("zwischen"), it.key);
    const d = barDemo(els, it.gap);
    assert.equal(d.frames.length, els.length + 4);
    assert.equal(d.frames.at(-1).result.note, t);
  }
});

test("Pyramide: lesbar, ganze Note größer, „Punkt: + die Hälfte“ als eigene Zeile, keine verkleinerte Fassung", () => {
  assert.ok(PYR.scale >= 0.6 && PYR.wholeScale > PYR.scale && PYR.rh >= 34);
  const p = pyramidSvg();
  assert.ok(!p.includes("small") && !p.includes("nw-pyr-dot"));
  // Zeichen in der Viertel-Zeile: Höhe (Hals bis Kopf, 48 Einheiten) passt ins Kästchen
  assert.ok(48 * PYR.scale <= PYR.rh);
  const d = pyramidSvg({ dot: true });
  assert.ok(new RegExp('<text class="nw-pyr-dot"[^>]*>Punkt: \\+ die Hälfte</text>').test(d) && PYR_DOT_NOTE === "Punkt: + die Hälfte");
  // die Zeile liegt unter den Kästchen, die Höhe der Grafik wächst mit
  const h = (svg) => +svg.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)[1];
  assert.ok(h(d) > h(p));
  assert.ok(L[5].helpTable.includes("nw-pyr-dot") && !L[3].helpTable.includes("nw-pyr-dot") && !L[7].helpTable.includes("nw-pyr-dot"));
  // Hilfen Stufe 1: leere Zellen „–“ statt „·“
  const t = featureTable();
  assert.equal(count(t, /<span class="tt-dot tt-blank">–<\/span>/g), 4);
  assert.ok(!t.includes(">·<"));
  // Vorführung 2: Rechnung als eigene Zeile, Kästchen wie in dotPyr
  assert.deepEqual(dotPyr(parseBar("2.")[0]), { hit: 1, hitBox: 0, add: 2, addBox: 2, sum: "2 + 1 = 3" });
  assert.deepEqual(dotPyr(parseBar("8.")[0]), { hit: 3, hitBox: 0, add: 4, addBox: 2, sum: "½ + ¼ = ¾" });
});

test("Rechen-Plus nur in Rechnungen mit „=“, Zählsilbe nie in derselben Zeile wie eine Rechnung", () => {
  const texts = [];
  for (const l of L) for (const it of l.items) {
    const q = it.make();
    texts.push(q.prompt, q.display, q.reveal, q.partial || "", ...(q.steps || []).flatMap((s) => [s.ok || "", s.bad || "", s.prompt || ""]));
  }
  for (const id of ["value", "beats", "bar"]) for (const ex of BOARDS[id].examples) for (const f of ex.make().frames) texts.push(f.text || "", f.result ? f.result.title : "", ...(f.result ? f.result.chips.map((c) => c.text) : []));
  for (const t of texts) {
    const plain = t.replace(/<span class="nw-und">\+<\/span>/g, "");
    // ein „+“ außerhalb der Zählsilbe steht immer in einer Rechnung mit „=“
    if (plain.includes("+")) assert.ok(plain.includes("="), t);
    if (t.includes("nw-und")) assert.ok(!t.includes("="), t);
  }
});

// Prüfung Schritt 6: Grenzfälle der Regel, die in BARS nicht vorkommen (Sandra: jeder SCHLAG wird gezeigt,
// gehaltene „+“ nicht)
test("countLabelText: Note auf „+“ über einen Schlag gehalten, punktierte Achtel, Pausen auf „+“", () => {
  assert.deepEqual(countLabelText(parseBar("8 4 8 2")), ["1", "+ (2)", "+", "3 (4)"]);
  assert.deepEqual(countLabelText(parseBar("8 4. 2")), ["1", "+ (2)", "3 (4)"]);
  assert.deepEqual(countLabelText(parseBar("8. 16 4 2")), ["1", "", "2", "3 (4)"]);
  assert.deepEqual(countLabelText(parseBar("r8 8 r4 r8 8 4")), ["(1)", "+", "(2)", "(3)", "+", "4"]);
  assert.deepEqual(countLabelText(parseBar("1")), ["1 (2) (3) (4)"]);
  assert.deepEqual(countLabelText(parseBar("r1")), ["(1) (2) (3) (4)"]);
});
