import { test } from "node:test";
import assert from "node:assert/strict";
import notenwerte, {
  BARS, parseBar, beatsOf, nameOf, fillChoices, barSvg, dotSvg, timeSigSvg, layoutBar, learnHtml, PITCH, DOT, TIME, rhythmOf,
  MISSING_CHOICES, BEAT_CHOICES_4, ITEMS_8,
} from "../../src/packs/notenwerte.js";
import { N } from "../../src/music.js";
import { TOP, S, BOTTOM, X1 } from "../../src/staff.js";

const MID = TOP + 2 * S;
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
  assert.equal(q3[2].display, "Viertelnote (1 Schlag)");
  assert.equal(q3[2].reveal, "Das war eine Viertelnote (1 Schlag).");
  assert.equal(q3[0].reveal, "Das war eine ganze Note (4 Schläge).");
  assert.equal(q3[0].display, "Ganze Note (4 Schläge)");
  assert.equal(q2[3].reveal, "Das war eine Achtelpause (½ Schlag).");
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
    "Kopf hohl · ohne Hals → ganze Note (4 Schläge)", "Kopf hohl · mit Hals → halbe Note (2 Schläge)",
    "Kopf schwarz · kein Fähnchen → Viertelnote (1 Schlag)", "Kopf schwarz · 1 Fähnchen → Achtelnote (½ Schlag)",
    "Kopf schwarz · 2 Fähnchen → Sechzehntelnote (¼ Schlag)",
  ]);
  assert.equal(nb(qs[1].partial), "Der Notenwert stimmt, der Kopf nicht: Kopf hohl · mit Hals → halbe Note (2 Schläge).");
  assert.equal(nb(qs[3].reveal), "Richtig wäre: Kopf schwarz · 1 Fähnchen → Achtelnote (½ Schlag).");
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
    assert.equal(q.prompt, dot ? "Welcher Notenwert ist das ohne den Punkt?" : "Welcher Notenwert ist das?");
    assert.deepEqual(q.steps[0].choices, ["halbe Note", "Viertelnote", "Achtelnote"]);
    assert.deepEqual(q.steps[1].choices, BEAT_CHOICES_4);
    assert.equal(q.steps[1].prompt, "Wie viele Schläge dauert die Note?");
    assert.equal(count(q.svg, /class="notehead aug"/g), dot ? 1 : 0);
  }
  assert.deepEqual(Object.values(qs).map((q) => [q.steps[0].answer, q.answer]), [
    ["halbe Note", "3"], ["halbe Note", "2"], ["Viertelnote", "1½"], ["Viertelnote", "1"], ["Achtelnote", "¾"], ["Achtelnote", "½"],
  ]);
  assert.equal(qs["p:n4."].steps[0].ok, "Richtig: Ohne den Punkt ist das eine Viertelnote.");
  assert.equal(qs["p:n4"].steps[0].bad, "Nicht ganz: Das ist eine Viertelnote.");
  assert.equal(nb(qs["p:n4."].display), "Viertelnote = 1 Schlag · Punkt: + ½ → 1½ Schläge");
  assert.equal(nb(qs["p:n4"].display), "Viertelnote = 1 Schlag · kein Punkt → 1 Schlag");
  assert.equal(nb(qs["p:n2."].display), "Halbe Note = 2 Schläge · Punkt: + 1 → 3 Schläge");
  assert.equal(nb(qs["p:n8."].display), "Achtelnote = ½ Schlag · Punkt: + ¼ → ¾ Schlag");
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
    const filled = r.match(/<g class="filled">(.*?)<\/g><(?:g class="note|text class="rest|rect class="rest|line class="staff-line barline)/)[1];
    // dasselbe Zeichen wie die anderen Elemente des Takts (elementFrom an der Stelle der Lücke)
    assert.equal(r, q.svg.replace(/<g class="gap">.*?<\/g>/, `<g class="filled">${filled}</g>`), it.key);
    if (ans.rest) assert.equal(count(filled, /class="rest"/g), 1, it.key);
    else {
      assert.equal(count(filled, /<g class="note /g), 1, it.key);
      // ganze und halbe Note: hohler Kopf; Achtel/Sechzehntel: Fähnchen; Punkt nur bei punktierten
      assert.equal(filled.includes("notehead open"), ans.v <= 2, it.key);
      assert.equal(filled.includes(`class="flag"`), ans.v >= 8, it.key);
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

test("Lerntafel", () => {
  assert.equal(notenwerte.learn.length, 1);
  const c = notenwerte.learn[0];
  assert.equal(c.clef, undefined);
  const html = c.render();
  assert.equal(html, learnHtml());
  assert.equal(count(html, /<svg/g), 13);
  for (const t of ["ganze Note", "ganze Pause", "Sechzehntelpause", "punktierte halbe Note", "punktierte Viertelnote", "punktierte Achtelnote", "Schläge im 4/4", "1½", "¾"]) assert.ok(html.includes(t), t);
  // keine <div>: .legend div hat eigene Styles
  assert.ok(!html.includes("<div"));
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
