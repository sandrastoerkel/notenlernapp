// Kästchentabelle (src/grid.js): gemeinsamer Baukasten für die Übersichten
import { test } from "node:test";
import assert from "node:assert/strict";
import { tileTable } from "../src/grid.js";

const rows = [
  { label: "1 A", cells: [{ text: 1 }, null] },
  { label: "2 B", cells: [null, { text: 5, state: "hit" }], hi: true },
  { label: "3 C", cells: [{ text: 7, state: "ref" }, { text: 0 }] },
];

test("tileTable: eine Zeile je Eintrag, Kästchen, blasse Punkte, Familie, Hervorhebung", () => {
  const h = tileTable({ head: ["Name", "x", "y"], rows, family: [1] });
  assert.ok(h.startsWith('<table class="tt"><thead><tr><th class="tt-head">Name</th><th class="tt-col">x</th><th class="tt-col fam">y</th></tr></thead>'));
  assert.equal((h.match(/<tr/g) || []).length, 4);
  assert.equal((h.match(/class="tt-label"/g) || []).length, 3);
  assert.equal((h.match(/class="tt-dot" aria-hidden="true">·</g) || []).length, 2);
  assert.ok(h.includes('<td class="tt-cell"><span class="tt-box">1</span></td>'));
  assert.ok(h.includes('<td class="tt-cell fam"><span class="tt-box">0</span></td>'), "0 ist ein Wert, kein leeres Feld");
  assert.ok(h.includes('<tr class="hi"><td class="tt-label">2 B</td>'));
  assert.ok(h.includes('<td class="tt-cell fam"><span class="tt-box hit">5</span></td>'));
  assert.ok(h.includes('<span class="tt-box ref">7</span>'));
  assert.equal((h.match(/class="tt-cell fam"/g) || []).length, 3);
});

test("tileTable: in zwei Hälften (beide mit Kopf), ohne Kopf, nur Namen", () => {
  const h = tileTable({ head: ["N", "x", "y"], rows, split: true });
  assert.ok(h.startsWith('<div class="tt-split"><table class="tt">') && h.endsWith("</table></div>"));
  assert.equal((h.match(/<thead>/g) || []).length, 2);
  assert.ok(h.includes('<table class="tt tt-second">'));
  const [a, b] = h.split('<table class="tt tt-second">');
  assert.equal((a.match(/tt-label/g) || []).length, 2);
  assert.equal((b.match(/tt-label/g) || []).length, 1);
  assert.ok(!tileTable({ rows }).includes("<thead>"));
  assert.equal(tileTable({ rows: [{ label: "L" }] }), '<table class="tt"><tbody><tr><td class="tt-label">L</td></tr></tbody></table>');
  assert.ok(tileTable({ rows, cls: "x" }).startsWith('<table class="tt x">'));
});
