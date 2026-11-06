import { test } from "node:test";
import assert from "node:assert/strict";
import { startLabel, keysHint, lettersLabel } from "../../src/views/practice.js";

test("Startknopf: in allen Eingabearten „10 Aufgaben“", () => {
  assert.equal(startLabel({ input: "letters" }), "Runde starten · 10 Aufgaben");
  assert.equal(startLabel({}), "Runde starten · 10 Aufgaben");
  assert.equal(startLabel({ input: "choices" }), "Runde starten · 10 Aufgaben");
});

test("Tastatur-Hinweis und Beschriftung: Buchstaben bzw. Namen mit Enter", () => {
  assert.equal(keysHint({ input: "letters" }), `Tastatur: <span class="kbd">C</span> <span class="kbd">D</span> <span class="kbd">E</span> … <span class="kbd">H</span>`);
  const h = keysHint({ input: "letters", acc: true });
  assert.ok(h.includes(`<span class="kbd">fis</span>`) && h.includes(`<span class="kbd">Enter</span>`), h);
  assert.ok(!/[+]|Vorzeichen mit/.test(h));
  assert.equal(lettersLabel({ input: "letters" }), "Buchstaben");
  assert.equal(lettersLabel({ input: "letters", acc: true }), "Namen");
});
