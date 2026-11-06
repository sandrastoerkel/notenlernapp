import { test } from "node:test";
import assert from "node:assert/strict";
import { startLabel } from "../../src/views/practice.js";

test("Startknopf: in allen Eingabearten „10 Aufgaben“", () => {
  assert.equal(startLabel({ input: "letters" }), "Runde starten · 10 Aufgaben");
  assert.equal(startLabel({}), "Runde starten · 10 Aufgaben");
  assert.equal(startLabel({ input: "choices" }), "Runde starten · 10 Aufgaben");
});
