import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startLabel, keysHint, lettersLabel, resultInfo, answersScroll, startHint, TWO_STEPS_NOTE } from "../../src/views/practice.js";
import { PACKS } from "../../src/packs/index.js";
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
// Paket mit requires wie im früheren Paket „Intervalle 7–12“ (Stufe 7 nach 1, dann jede nach der vorigen);
// seit „Intervalle neu“ nutzt kein Paket requires mehr, die Logik bleibt erhalten und getestet
const REQ = { levels: Array.from({ length: 12 }, (_, i) => ({ id: `r-${i + 1}`, no: i + 1, ...(i >= 6 ? { requires: `r-${i === 6 ? 1 : i}` } : {}) })) };

test("Ergebniskarte folgt requires", () => {
  const s = fresh();
  // Stufe 1 mit 6 Richtigen: Stufe 2 und 7 öffnen sich ab 8
  let r = resultInfo(s, REQ, lv(REQ, 1), 6);
  assert.equal(r.next.id, "r-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 2 und 7 öffnen sich ab 8 Richtigen");
  // Stufe 1 mit 8 Richtigen (der Store hat best schon eingetragen): Stufe 2 anbieten, Stufe 7 nennen
  s.levels["r-1"] = { stars: 2, best: 8, played: 1 };
  r = resultInfo(s, REQ, lv(REQ, 1), 8);
  assert.equal(r.next.id, "r-2"); assert.equal(r.nextOpen, true);
  assert.equal(r.note, "Stufe 7 ist offen");
  // Stufe 7: als Nächstes Stufe 8
  r = resultInfo(s, REQ, lv(REQ, 7), 5);
  assert.equal(r.next.id, "r-8"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 8 öffnet sich ab 8 Richtigen");
  s.levels["r-7"] = { stars: 3, best: 9, played: 1 };
  r = resultInfo(s, REQ, lv(REQ, 7), 9);
  assert.equal(r.next.id, "r-8"); assert.equal(r.nextOpen, true); assert.equal(r.note, "");
  // Stufe 6 schaltet nichts frei; Stufe 7 hängt an Stufe 1
  const t = fresh();
  t.levels["r-6"] = { stars: 3, best: 10, played: 1 };
  r = resultInfo(t, REQ, lv(REQ, 6), 4);
  assert.equal(r.next.id, "r-7"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 7 ist frei nach Stufe 1");
  // letzte Stufe: nichts danach
  r = resultInfo(s, REQ, lv(REQ, 12), 10);
  assert.equal(r.next, null); assert.equal(r.note, "");
  // andere Pakete wie bisher
  r = resultInfo(fresh(), noten, lv(noten, 1), 7);
  assert.equal(r.next.id, "noten-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 2 öffnet sich ab 8 Richtigen");
  r = resultInfo(fresh(), noten, lv(noten, 8), 3);
  assert.equal(r.next, null); assert.equal(r.note, "");
  // Intervalle: der Reihe nach
  r = resultInfo(fresh(), intervalle, lv(intervalle, 1), 6);
  assert.equal(r.next.id, "intervall-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 2 öffnet sich ab 8 Richtigen");
});

test("Startseite: „frei nach Stufe X“ nur bei requires", () => {
  assert.equal(lockText(REQ, lv(REQ, 7)), "frei nach Stufe 1");
  assert.equal(lockText(REQ, lv(REQ, 8)), "frei nach Stufe 7");
  assert.equal(lockText(REQ, lv(REQ, 12)), "frei nach Stufe 11");
  assert.equal(lockText(REQ, lv(REQ, 2)), "");
  assert.equal(lockText(noten, lv(noten, 3)), "");
  for (const l of intervalle.levels) assert.equal(lockText(intervalle, l), "", l.id);
  assert.equal(lockText({ levels: [{ id: "x-1" }, { id: "x-2", no: 2, requires: "x-9" }] }, { id: "x-2", no: 2, requires: "x-9" }), "");
});

test("Tastatur-Hinweis: Ziffern bei Stufen mit digits", () => {
  const h = keysHint(lv(intervalle, 1));
  assert.ok(h.includes(`<span class="kbd">1</span> Prime`) && h.includes(`<span class="kbd">8</span> Oktave`), h);
  assert.equal(keysHint(lv(intervalle, 3)), h);
  assert.ok(keysHint(lv(intervalle, 8)).includes("fis"));
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /\$\("#pKeys"\)\.hidden = !letters && !level\.digits/);
});

test("Hilfen: nur während der Runde, eigener Bereich unter der Notenzeile", () => {
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /helps: \$\("#pHelps"\), helpsTitle: \$\("#pHelps summary"\), helpsBody: \$\("#pHelpsBody"\)/);
  assert.equal((src.match(/\$\("#pHelps"\)\.hidden = true/g) || []).length, 2);
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const i = html.indexOf('id="pStaff"'), j = html.indexOf('id="pHelps"'), k = html.indexOf('id="pIntro"'), p = html.indexOf('id="pPiano"');
  assert.ok(i < j && j < k && k < p, "Hilfen zwischen Notenzeile und Startkarte, getrennt von #pPiano");
  assert.match(html, /<details class="card helps" id="pHelps" hidden>\s*<summary>Hilfen/);
});

test("namesOnly: keine Wahl Namen/Klaviatur auf der Startkarte", () => {
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /\.seg"\)\.hidden = !letters \|\| !!level\.namesOnly/);
});

test("Hilfen aufgeklappt: so weit scrollen, dass die erste Reihe der Antwortknöpfe sichtbar ist", () => {
  assert.equal(answersScroll(500, 560), 0);
  assert.equal(answersScroll(560, 560), 0);
  assert.equal(answersScroll(700.2, 560), 141);
});

test("index.html: Hilfen zwischen Notenzeile und Runde; bis 380 px rücken sie per CSS unter die Antwortknöpfe", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="pStaff"') < html.indexOf('id="pHelps"') && html.indexOf('id="pHelps"') < html.indexOf('id="pPlay"'));
  const css = readFileSync(new URL("../../css/style.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 380px\) \{\s*#pHelps \{ order: 1; \}/);
});

test("Startkarte: zweischrittige Stufen sagen „Beide Schritte müssen stimmen.“", () => {
  assert.equal(TWO_STEPS_NOTE, "Beide Schritte müssen stimmen.");
  assert.equal(startHint({ hint: "H.", twoSteps: true }), "H. Beide Schritte müssen stimmen.");
  assert.equal(startHint({ hint: "H." }), "H.");
  const two = [];
  for (const pack of PACKS) for (const level of pack.levels) {
    if (level.twoSteps) { two.push(level.id); assert.ok(startHint(level).endsWith(TWO_STEPS_NOTE), level.id); }
    else assert.equal(startHint(level), level.hint, level.id);
  }
  assert.deepEqual(two, ["notenwerte-1", "notenwerte-4", "notenwerte-6", "notenwerte-8", "tonleitern-4", "tonleitern-10", "tonleitern-12",
    "intervall-3", "intervall-4", "intervall-5", "intervall-6", "intervall-7"]);
  // die Startkarte nutzt startHint
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /\$\("#pHint"\)\.textContent = startHint\(level\)/);
});
