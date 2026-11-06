import { test } from "node:test";
import assert from "node:assert/strict";
import { learnCardsHtml } from "../../src/views/learn.js";
import { PACKS } from "../../src/packs/index.js";
import noten from "../../src/packs/noten.js";

test("Lerntafeln: Titel als Überschrift, Auswahl nach Schlüssel", () => {
  const packs = [
    { learn: [{ title: "A & B", clef: "treble", render: () => "<div>v</div>" }, { title: "Bass", clef: "bass", render: () => "<div>b</div>" }] },
    { learn: [{ title: "Ohne Schlüssel", render: () => "<p>x</p>" }, { render: () => "<p>ohne Titel</p>" }] },
    {},
  ];
  assert.equal(learnCardsHtml(packs, "treble"),
    '<h3 class="legend-title">A &amp; B</h3><div>v</div><h3 class="legend-title">Ohne Schlüssel</h3><p>x</p><p>ohne Titel</p>');
  assert.equal(learnCardsHtml(packs, "bass"),
    '<h3 class="legend-title">Bass</h3><div>b</div><h3 class="legend-title">Ohne Schlüssel</h3><p>x</p><p>ohne Titel</p>');
});

test("Lerntafeln von „Noten lesen“: Überschrift „Merkhilfen“, Inhalt unverändert", () => {
  for (const clef of ["treble", "bass"]) {
    const card = noten.learn.find((c) => c.clef === clef);
    assert.ok(learnCardsHtml(PACKS, clef).startsWith(`<h3 class="legend-title">Merkhilfen</h3>${card.render()}`));
  }
});
