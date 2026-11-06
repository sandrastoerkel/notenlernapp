import { test } from "node:test";
import assert from "node:assert/strict";
import notenwerte, { BARS, parseBar, beatsOf, nameOf, fillChoices, barSvg, dotSvg, timeSigSvg, layoutBar, learnHtml, PITCH, DOT, TIME } from "../../src/packs/notenwerte.js";
import { N } from "../../src/music.js";
import { TOP, S, BOTTOM, X1 } from "../../src/staff.js";

const MID = TOP + 2 * S;
const sum = (els) => els.reduce((a, e) => a + beatsOf(e), 0);
const count = (s, re) => (s.match(re) || []).length;
const L = notenwerte.levels;

test("sechs Stufen mit eindeutigen IDs", () => {
  assert.equal(notenwerte.id, "notenwerte");
  assert.ok(notenwerte.title && notenwerte.subtitle && notenwerte.grade);
  assert.deepEqual(L.map((l) => l.id), [1, 2, 3, 4, 5, 6].map((n) => "notenwerte-" + n));
  assert.equal(new Set(L.map((l) => l.id)).size, 6);
  L.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.equal(l.input, "choices");
    assert.ok(l.title && l.hint && l.subtitle);
    assert.ok(l.example.startsWith("<svg"));
  });
});

test("question liefert gültige Aufgaben, check erkennt richtig und falsch", () => {
  for (const l of L) {
    for (let i = 0; i < 200; i++) {
      const q = l.question(null);
      assert.ok(q.svg.startsWith("<svg") && q.svg.endsWith("</svg>"), l.id);
      assert.ok(q.prompt && q.display && q.key, l.id);
      assert.ok(q.choices.length >= 4 && q.choices.length <= 6, l.id);
      assert.equal(new Set(q.choices).size, q.choices.length, l.id);
      assert.ok(q.choices.includes(q.answer), l.id);
      assert.ok(l.check(q, q.answer));
      q.choices.filter((c) => c !== q.answer).forEach((c) => assert.ok(!l.check(q, c), `${l.id}: ${c}`));
      assert.ok(!l.check(q, undefined));
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

test("Vorrat je Stufe", () => {
  // Ausnahme: Stufe 1 und 2 haben nur die fünf Notenwerte bzw. Pausenwerte (ganze bis Sechzehntel).
  // Alle Noten stehen auf derselben Höhe, damit nur der Wert zählt; mehr verschiedene Aufgaben gibt es nicht.
  assert.deepEqual(L.map((l) => l.items.length), [5, 5, 10, 12, 91, 123]);
  L.forEach((l) => {
    assert.equal(new Set(l.items.map((it) => it.key)).size, l.items.length, l.id);
    if (l.no > 2) assert.ok(l.items.length >= 8, l.id);
  });
  // Gemischt = Stufe 1 bis 5
  assert.equal(L[5].items.length, L.slice(0, 5).reduce((a, l) => a + l.items.length, 0));
});

test("Stufen 1 bis 4: richtige Begriffe und Schläge", () => {
  const all = (l) => l.items.map((it) => Object.assign(it.make(), { key: it.key }));
  assert.deepEqual(all(L[0]).map((q) => q.answer), ["ganze Note", "halbe Note", "Viertelnote", "Achtelnote", "Sechzehntelnote"]);
  assert.deepEqual(all(L[1]).map((q) => q.answer), ["ganze Pause", "halbe Pause", "Viertelpause", "Achtelpause", "Sechzehntelpause"]);
  assert.deepEqual(all(L[2]).map((q) => q.answer), ["4", "2", "1", "½", "¼", "4", "2", "1", "½", "¼"]);
  assert.deepEqual(L[2].question(null).choices, ["4", "2", "1", "½", "¼"]);
  const q4 = Object.fromEntries(all(L[3]).map((q) => [q.key, q.answer]));
  assert.equal(q4["4:b:n2."], "3");
  assert.equal(q4["4:b:n4."], "1½");
  assert.equal(q4["4:b:n8."], "¾");
  assert.equal(q4["4:b:n2"], "2");
  assert.equal(q4["4:n:n2."], "punktierte halbe Note");
  assert.equal(q4["4:n:n4."], "punktierte Viertelnote");
  assert.equal(q4["4:n:n8."], "punktierte Achtelnote");
  // Punkt nur bei punktierten Noten; Ganze und halbe Pause als Balken, Viertel bis Sechzehntel als Glyphe
  all(L[3]).forEach((q) => assert.equal(count(q.svg, /class="notehead aug"/g), q.key.endsWith(".") ? 1 : 0, q.key));
  all(L[1]).forEach((q, i) => assert.equal(count(q.svg, /<rect class="rest"/g), i < 2 ? 1 : 0));
  // Taktangabe ab Stufe 3, nicht in Stufe 1 und 2
  assert.ok(!all(L[0])[0].svg.includes("timesig"));
  assert.ok(all(L[2])[0].svg.includes("timesig"));
});

test("Feedback: ganze Sätze mit „eine“, Dauer im richtigen Numerus", () => {
  // geschütztes Leerzeichen zwischen Zahl und „Schlag“, zum Vergleichen normalisiert
  const sp = (q) => Object.assign(q, { display: q.display.replace(/\u00a0/g, " "), reveal: q.reveal.replace(/\u00a0/g, " ") });
  for (const l of L) for (const it of l.items) { const q = it.make(); assert.ok(/\d\u00a0Schl|[¼½¾]\u00a0Schl/.test(q.reveal), q.reveal); }
  const all = (l) => l.items.map((it) => sp(it.make()));
  const q4display = () => sp(L[3].items.find((it) => it.key === "4:n:n2.").make()).display;
  const q1 = all(L[0]), q2 = all(L[1]), q3 = all(L[2]);
  assert.equal(q1[2].display, "Viertelnote (1 Schlag)");
  assert.equal(q1[2].reveal, "Das war eine Viertelnote (1 Schlag).");
  assert.equal(q1[0].reveal, "Das war eine ganze Note (4 Schläge).");
  assert.equal(q1[0].display, "Ganze Note (4 Schläge)");
  assert.equal(q4display(), "Punktierte halbe Note (3 Schläge)");
  assert.equal(q2[3].reveal, "Das war eine Achtelpause (½ Schlag).");
  assert.equal(q3[1].reveal, "Richtig wäre: 2 Schläge, denn das ist eine halbe Note.");
  assert.equal(q3[9].reveal, "Richtig wäre: ¼ Schlag, denn das ist eine Sechzehntelpause.");
  const q4 = Object.fromEntries(L[3].items.map((it) => [it.key, sp(it.make())]));
  assert.equal(q4["4:b:n4."].reveal, "Richtig wäre: 1½ Schläge, denn das ist eine punktierte Viertelnote.");
  assert.equal(q4["4:n:n2."].reveal, "Das war eine punktierte halbe Note (3 Schläge).");
  assert.equal(q4["4:b:n8."].reveal, "Richtig wäre: ¾ Schlag, denn das ist eine punktierte Achtelnote.");
  const q5 = Object.fromEntries(L[4].items.map((it) => [it.key, sp(it.make())]));
  const b = (s) => BARS.indexOf(s);
  assert.equal(q5[`5:${b("2. 4")}:1`].reveal, "Richtig wäre eine Viertelnote, denn es fehlt noch 1 Schlag.");
  assert.equal(q5[`5:${b("2. 4")}:0`].reveal, "Richtig wäre eine punktierte halbe Note, denn es fehlen noch 3 Schläge.");
  assert.equal(q5[`5:${b("4 4 r2")}:2`].reveal, "Richtig wäre eine halbe Pause, denn es fehlen noch 2 Schläge.");
  assert.equal(q5[`5:${b("4 r8 8 2")}:1`].reveal, "Richtig wäre eine Achtelpause, denn es fehlt noch ½ Schlag.");
  // jede Aufgabe hat reveal, kein „Das war ein “ mit falschem Artikel, kein Doppelpunkt-Notbehelf
  for (const l of L) for (const it of l.items) {
    const q = sp(it.make());
    assert.ok(q.reveal && q.reveal.endsWith("."), it.key);
    assert.ok(!/Das war ein |Notenwert:|Pausenwert:/.test(q.reveal + q.display), it.key);
    assert.ok(!/1 Schläge|[2-4] Schlag\b|(?<!\d)[¼½¾] Schläge|fehlen noch [¼½¾1] Schlag\b|fehlt noch \S+ Schläge/.test(q.reveal + q.display), q.reveal);
  }
});

test("Takt füllen: jeder Takt hat genau vier Schläge", () => {
  assert.ok(BARS.length >= 20);
  BARS.forEach((b) => assert.equal(sum(parseBar(b)), 4, b));
  assert.deepEqual(parseBar("4. 8 r4 4"), [{ v: 4, dot: true, rest: false }, { v: 8, dot: false, rest: false }, { v: 4, dot: false, rest: true }, { v: 4, dot: false, rest: false }]);
});

test("Takt füllen: die richtige Antwort ergibt 4, jede falsche nicht", () => {
  // jede Aufgabe 30-mal, weil die falschen Antworten zufällig gezogen werden
  for (const it of L[4].items.flatMap((x) => Array(30).fill(x))) {
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
  for (const it of L[4].items) {
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
  for (const l of L.slice(0, 4)) assert.equal(l.question(null).revealSvg, undefined);
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

test("Gemischt nutzt alle fünf Stufen", () => {
  const seen = new Set();
  let prev = null;
  for (let i = 0; i < 400; i++) { prev = L[5].question(prev); seen.add(prev.key.split(":")[0]); }
  assert.deepEqual([...seen].sort(), ["1", "2", "3", "4", "5"]);
});

test("Texte ohne unpassende Wörter", () => {
  const texts = [notenwerte.title, notenwerte.subtitle, ...L.flatMap((l) => [l.title, l.subtitle, l.hint]), learnHtml()];
  for (const l of L) for (const it of l.items) { const q = it.make(); texts.push(q.prompt, q.display, q.reveal, ...q.choices); }
  for (const t of texts) assert.ok(!/Fehler!|falsch|mühelos|Held|Champion/i.test(t), t);
});
