import { test } from "node:test";
import assert from "node:assert/strict";
import { startLabel } from "../../src/views/practice.js";

test("Startknopf: „Noten“ bei Buchstaben und Klaviatur, „Aufgaben“ bei Auswahlknöpfen", () => {
  assert.equal(startLabel({ input: "letters" }), "Runde starten · 10 Noten");
  assert.equal(startLabel({}), "Runde starten · 10 Noten");
  assert.equal(startLabel({ input: "choices" }), "Runde starten · 10 Aufgaben");
});
