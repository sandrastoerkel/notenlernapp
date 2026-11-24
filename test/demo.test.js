// Vorführung (src/demo.js): reine Teile; der DOM-Teil wird im Browser geprüft
import { test } from "node:test";
import assert from "node:assert/strict";
import { demoHtml, marksHtml, markState, sayHtml, resultHtml, countText, playLabel, FRAME_MS } from "../src/demo.js";

const demo = {
  steps: ["1 · Erst", "2 · Dann"],
  frames: [
    { step: 0, body: "<i>0</i>", text: "Frage" },
    { step: 1, body: "<i>1</i>", text: "Schritt eins" },
    { step: 2, body: "<i>2</i>", text: "Schritt zwei" },
    { step: 3, body: "<i>3</i>", result: { title: "Ergebnis", chips: [{ step: 1, text: "3 Stufen" }, { step: 2, text: "3 Halbtöne" }] } },
  ],
};

test("Schritt-Marken: an, erledigt, noch nicht", () => {
  assert.deepEqual(demo.frames.map((f) => [markState(f, 1), markState(f, 2)]), [["", ""], ["on", ""], ["done", "on"], ["done", "done"]]);
  assert.equal(marksHtml(demo, 1), '<span class="demo-mark s1 on">1 · Erst</span><span class="demo-mark s2">2 · Dann</span>');
});

test("demoHtml: Knöpfe Zurück/Abspielen/Weiter › (aria-label „Nächster Schritt“), Zähler, Satz in der Farbe des Schritts, Bühne", () => {
  const first = demoHtml(demo, 0);
  assert.ok(first.includes('<button class="btn" data-act="prev" disabled>Zurück</button>'));
  assert.ok(first.includes('<button class="btn primary" data-act="play">Abspielen</button>'));
  assert.ok(first.includes('<button class="btn" data-act="next" aria-label="Nächster Schritt">Weiter ›</button>'));
  assert.ok(first.includes('<span class="small muted num demo-count">1 / 4</span>'));
  assert.ok(first.includes('<p class="demo-text s0">Frage</p>') && first.includes('<div class="demo-stage"><i>0</i></div>'));
  const mid = demoHtml(demo, 2, true);
  assert.ok(mid.includes('data-act="prev">Zurück') && mid.includes('data-act="next" aria-label="Nächster Schritt">Weiter ›') && mid.includes(">Pause<"));
  assert.ok(mid.includes('<p class="demo-text s2">Schritt zwei</p>'));
  const last = demoHtml(demo, 3);
  assert.ok(last.includes('data-act="next" aria-label="Nächster Schritt" disabled') && last.includes("4 / 4"));
  assert.ok(last.includes(resultHtml(demo.frames[3].result)));
  assert.equal(resultHtml(demo.frames[3].result), '<div class="demo-result"><p class="demo-result-title">Ergebnis</p><p class="demo-chips"><span class="demo-chip s1">3 Stufen</span><span class="demo-chip s2">3 Halbtöne</span></p></div>');
  assert.equal(sayHtml({ step: 1 }), '<p class="demo-text s1"></p>');
  assert.equal(countText(demo, 1), "2 / 4");
  assert.deepEqual([playLabel(false), playLabel(true)], ["Abspielen", "Pause"]);
  assert.equal(FRAME_MS, 1000);
});

test("Ergebniskarte: optionaler Satz (note) unter den Marken", () => {
  const r = { title: "T", chips: [{ step: 1, text: "a" }], note: "Die Lücke steht auf „3“." };
  assert.ok(resultHtml(r).endsWith('</p><p class="demo-result-note">Die Lücke steht auf „3“.</p></div>'));
  assert.ok(!resultHtml({ title: "T", chips: [] }).includes("demo-result-note"));
});
