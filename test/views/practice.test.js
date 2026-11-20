import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startLabel, keysHint, lettersLabel, resultInfo } from "../../src/views/practice.js";
import { lockText } from "../../src/views/home.js";
import { fresh } from "../../src/store.js";
import intervalle from "../../src/packs/intervalle.js";
import noten from "../../src/packs/noten.js";

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

const lv = (pack, no) => pack.levels[no - 1];

test("Ergebniskarte folgt requires", () => {
  const s = fresh();
  // Stufe 1 mit 6 Richtigen: Stufe 2 und 7 öffnen sich ab 8
  let r = resultInfo(s, intervalle, lv(intervalle, 1), 6);
  assert.equal(r.next.id, "intervalle-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 2 und 7 öffnen sich ab 8 Richtigen");
  // Stufe 1 mit 8 Richtigen (der Store hat best schon eingetragen): Stufe 2 anbieten, Stufe 7 nennen
  s.levels["intervalle-1"] = { stars: 2, best: 8, played: 1 };
  r = resultInfo(s, intervalle, lv(intervalle, 1), 8);
  assert.equal(r.next.id, "intervalle-2"); assert.equal(r.nextOpen, true);
  assert.equal(r.note, "Stufe 7 ist offen");
  // Stufe 7: als Nächstes Stufe 8
  r = resultInfo(s, intervalle, lv(intervalle, 7), 5);
  assert.equal(r.next.id, "intervalle-8"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 8 öffnet sich ab 8 Richtigen");
  s.levels["intervalle-7"] = { stars: 3, best: 9, played: 1 };
  r = resultInfo(s, intervalle, lv(intervalle, 7), 9);
  assert.equal(r.next.id, "intervalle-8"); assert.equal(r.nextOpen, true); assert.equal(r.note, "");
  // Stufe 6 schaltet nichts frei; Stufe 7 hängt an Stufe 1
  const t = fresh();
  t.levels["intervalle-6"] = { stars: 3, best: 10, played: 1 };
  r = resultInfo(t, intervalle, lv(intervalle, 6), 4);
  assert.equal(r.next.id, "intervalle-7"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 7 ist frei nach Stufe 1");
  // letzte Stufe: nichts danach
  r = resultInfo(s, intervalle, lv(intervalle, 12), 10);
  assert.equal(r.next, null); assert.equal(r.note, "");
  // andere Pakete wie bisher
  r = resultInfo(fresh(), noten, lv(noten, 1), 7);
  assert.equal(r.next.id, "noten-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 2 öffnet sich ab 8 Richtigen");
  r = resultInfo(fresh(), noten, lv(noten, 8), 3);
  assert.equal(r.next, null); assert.equal(r.note, "");
});

test("Startseite: „frei nach Stufe X“ nur bei requires", () => {
  assert.equal(lockText(intervalle, lv(intervalle, 7)), "frei nach Stufe 1");
  assert.equal(lockText(intervalle, lv(intervalle, 8)), "frei nach Stufe 7");
  assert.equal(lockText(intervalle, lv(intervalle, 12)), "frei nach Stufe 11");
  assert.equal(lockText(intervalle, lv(intervalle, 2)), "");
  assert.equal(lockText(noten, lv(noten, 3)), "");
  assert.equal(lockText({ levels: [{ id: "x-1" }, { id: "x-2", no: 2, requires: "x-9" }] }, { id: "x-2", no: 2, requires: "x-9" }), "");
});

test("namesOnly: keine Wahl Namen/Klaviatur auf der Startkarte", () => {
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /\.seg"\)\.hidden = !letters \|\| !!level\.namesOnly/);
});
