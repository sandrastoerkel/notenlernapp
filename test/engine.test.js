import { test } from "node:test";
import assert from "node:assert/strict";
import {
  starsHtml, effectiveInput, makeRound, findLevel, nextLevel, countAnswer, feedbackText,
  resultMessage, dotsHtml, lettersHtml, choicesHtml, choicesClass, choiceCols, keyAction, blitzPoints, notesToPlay,
} from "../src/engine.js";
import { PACKS } from "../src/packs/index.js";
import noten from "../src/packs/noten.js";
import { fresh } from "../src/store.js";
import { N, same } from "../src/music.js";

const key = (k, mods = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, ...mods });

test("starsHtml", () => {
  assert.equal(starsHtml(2), `<span class="stars">★★<span class="off">★</span></span>`);
  assert.equal(starsHtml(0), `<span class="stars"><span class="off">★★★</span></span>`);
});

test("effectiveInput: Klaviatur ersetzt nur Buchstaben", () => {
  assert.equal(effectiveInput("letters", "letters"), "letters");
  assert.equal(effectiveInput("letters", "keys"), "keys");
  assert.equal(effectiveInput("choices", "keys"), "choices");
  assert.equal(effectiveInput("keys", "letters"), "keys");
  assert.equal(effectiveInput(undefined, "keys"), "keys");
});

test("makeRound: zehn Aufgaben, nie zweimal dieselbe hintereinander", () => {
  for (let k = 0; k < 20; k++) {
    const r = makeRound(noten.levels[1]);
    assert.equal(r.length, 10);
    for (let i = 1; i < r.length; i++) assert.ok(!(same(r[i].note, r[i - 1].note) && r[i].clef === r[i - 1].clef));
  }
});

test("findLevel und nextLevel", () => {
  const f = findLevel(PACKS, "noten-3");
  assert.equal(f.pack.id, "noten"); assert.equal(f.level.no, 3); assert.equal(f.index, 2);
  assert.equal(findLevel(PACKS, "gibtsnicht").level.id, "noten-1");
  assert.equal(findLevel(PACKS, 3).level.id, "noten-1");
  assert.equal(nextLevel(noten, noten.levels[0]).id, "noten-2");
  assert.equal(nextLevel(noten, noten.levels[7]), null);
});

test("countAnswer zählt und vermerkt schwache Noten", () => {
  const s = fresh();
  countAnswer(s, { statKey: "Fis (fis', Violin)" }, false);
  countAnswer(s, { statKey: "Fis (fis', Violin)" }, true);
  countAnswer(s, {}, true);
  assert.equal(s.answered, 3); assert.equal(s.correct, 2);
  assert.deepEqual(s.notes, { "Fis (fis', Violin)": { ok: 1, bad: 1 } });
});

test("Feedback- und Ergebnistexte", () => {
  const q = { display: "Fis (fis')" };
  assert.equal(feedbackText(q, true), "Richtig! Fis (fis')");
  assert.equal(feedbackText(q, false), "Das war ein Fis (fis').");
  // reveal ersetzt nur den Satz bei falscher Antwort
  const k = { display: "A-Dur", reveal: "Richtig wäre: A-Dur." };
  assert.equal(feedbackText(k, false), "Richtig wäre: A-Dur.");
  assert.equal(feedbackText(k, true), "Richtig! A-Dur");
  assert.equal(feedbackText({ display: "A-Dur", reveal: "" }, false), "Das war ein A-Dur.");
  assert.equal(resultMessage(3), "Stark, fast fehlerfrei.");
  // Tippfehler aus dem Prototyp („die dritte Sterne“) hier korrigiert
  assert.equal(resultMessage(2), "Gut. Noch eine Runde und der dritte Stern ist drin.");
  assert.ok(resultMessage(1).startsWith("Solide Basis"));
  assert.ok(resultMessage(0).startsWith("Noch wackelig"));
});

test("dotsHtml", () => {
  const h = dotsHtml([true, false], 2, 4);
  assert.equal(h, `<span class="dot ok"></span><span class="dot bad"></span><span class="dot cur"></span><span class="dot "></span>`);
});

test("Antwortknöpfe", () => {
  assert.equal((lettersHtml().match(/data-letter/g) || []).length, 7);
  assert.ok(lettersHtml().includes(`data-letter="H"`));
  assert.equal(choicesHtml(["a<b", "2"]), `<button class="btn" data-choice="0">a&lt;b</button><button class="btn" data-choice="1">2</button>`);
});

test("Raster für Auswahlknöpfe", () => {
  assert.equal(choicesClass(["Sechzehntelpause", "Achtelpause"]), "choices");
  assert.equal(choicesClass(["übermäßige Quarte", "reine Quarte", "verminderte Quinte"]), "choices");
  assert.equal(choicesClass(["4", "2", "1", "½", "¼"]), "choices short");
  assert.equal(choicesClass(["I", "II", "III", "IV", "V", "VI", "VII"]), "choices short");
  assert.equal(choicesClass(["Dur", "Moll"]), "choices short");
  assert.equal(choicesClass(["G-Dur", "D-Dur"]), "choices");
  assert.equal(choicesClass([]), "choices");
  assert.equal(choicesClass(undefined), "choices");
  assert.equal(choiceCols(["4", "2", "1", "½", "¼"]), 5);
  assert.equal(choiceCols(["I", "II", "III", "IV", "V", "VI", "VII"]), 4);
  assert.equal(choiceCols(["Dur", "Moll"]), 2);
});

test("keyAction", () => {
  assert.deepEqual(keyAction(key("c")), { letter: "C" });
  assert.deepEqual(keyAction(key("H")), { letter: "H" });
  assert.deepEqual(keyAction(key("+")), { acc: 1 });
  assert.deepEqual(keyAction(key("#")), { acc: 1 });
  assert.deepEqual(keyAction(key("-")), { acc: -1 });
  assert.deepEqual(keyAction(key("b")), { acc: -1 });
  assert.equal(keyAction(key("B")), null);
  assert.deepEqual(keyAction(key("0")), { acc: 0 });
  assert.equal(keyAction(key("x")), null);
  assert.equal(keyAction(key("c", { ctrlKey: true })), null);
  assert.equal(keyAction(key("c", { metaKey: true })), null);
  assert.equal(keyAction(key("c", { altKey: true })), null);
});

test("blitzPoints: Bonus ab fünf in Folge", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(blitzPoints), [1, 1, 1, 1, 2, 2]);
});

test("notesToPlay", () => {
  const n = N("C", 4);
  assert.deepEqual(notesToPlay({ play: [n, n] }), [n, n]);
  assert.deepEqual(notesToPlay({ note: n }), [n]);
  assert.deepEqual(notesToPlay({}), []);
});
