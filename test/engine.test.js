import { test } from "node:test";
import assert from "node:assert/strict";
import {
  starsHtml, effectiveInput, makeRound, findLevel, nextLevel, countAnswer, feedbackText,
  resultMessage, dotsHtml, lettersHtml, choicesHtml, choicesClass, choiceCols, keyAction, blitzPoints, notesToPlay,
  playMode, revealedSvg, playSchedule, rhythmEnd, answerDelay, PLAY_GAP, BEAT_MS, RHYTHM_TAIL, DELAY_OK, DELAY_BAD,
} from "../src/engine.js";
import { toneEnd } from "../src/audio.js";
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
  assert.equal(resultMessage(3), "Stark, fast alles richtig.");
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
  // Einträge mit Dauer: nur die Töne, ohne Pausen
  assert.deepEqual(notesToPlay({ play: [{ note: n, beats: 1 }, { rest: true, beats: 1 }, { note: n, beats: 2 }] }), [n, n]);
  assert.deepEqual(notesToPlay({ play: [{ rest: true, beats: 4 }] }), []);
});

test("playSchedule: einfache Noten mit PLAY_GAP wie bisher", () => {
  const c = N("C", 4), e = N("E", 4);
  assert.deepEqual(playSchedule({ play: [c, e] }), [{ note: c, at: 0, dur: null }, { note: e, at: PLAY_GAP, dur: null }]);
  assert.deepEqual(playSchedule({ note: c }), [{ note: c, at: 0, dur: null }]);
  assert.deepEqual(playSchedule({}), []);
  assert.deepEqual(playSchedule({ play: [] }), []);
  assert.equal(rhythmEnd({ play: [c, e] }), 0);
});

test("playSchedule: Rhythmus mit Dauern und Pausen", () => {
  const h = N("H", 4);
  assert.equal(BEAT_MS, 600);
  // punktierte Viertel, Achtel, Viertelpause, Viertel
  const q = { play: [{ note: h, beats: 1.5 }, { note: h, beats: 0.5 }, { rest: true, beats: 1 }, { note: h, beats: 1 }] };
  assert.deepEqual(playSchedule(q), [
    { note: h, at: 0, dur: 900 }, { note: h, at: 900, dur: 300 }, { note: null, at: 1200, dur: 600 }, { note: h, at: 1800, dur: 600 },
  ]);
  assert.equal(rhythmEnd(q), 4 * BEAT_MS);
  // Pause am Ende zählt mit
  assert.equal(rhythmEnd({ play: [{ note: h, beats: 2 }, { rest: true, beats: 2 }] }), 2400);
  assert.equal(playMode(q), "sequence");
});

test("answerDelay: wartet das Ende des Rhythmus ab", () => {
  const h = N("H", 4), bar = { play: [{ note: h, beats: 2 }, { note: h, beats: 2 }] };
  assert.equal(answerDelay({}, true), DELAY_OK);
  assert.equal(answerDelay({}, false), DELAY_BAD);
  assert.equal(answerDelay({ play: [h, h, h] }, true), DELAY_OK);
  assert.equal(answerDelay(bar, true), 2400 + RHYTHM_TAIL);
  assert.equal(answerDelay(bar, false), 2400 + RHYTHM_TAIL);
  assert.equal(answerDelay({ play: [{ note: h, beats: 0.5 }] }, false), DELAY_BAD);
  // ohne Ton keine Wartezeit für den Rhythmus
  assert.equal(answerDelay(bar, true, true), DELAY_OK);
});

test("toneEnd: Ton etwas kürzer als notiert", () => {
  assert.ok(Math.abs(toneEnd(0.6) - 0.55) < 1e-9);
  assert.equal(toneEnd(0.1), 0.08);
});

test("playMode: gleichzeitig nur mit playTogether und mehreren Tönen", () => {
  const n = N("C", 4);
  assert.equal(playMode({ play: [n, n, n], playTogether: true }), "together");
  assert.equal(playMode({ play: [n, n, n] }), "sequence");
  assert.equal(playMode({ play: [n], playTogether: true }), "sequence");
  assert.equal(playMode({ note: n, playTogether: true }), "sequence");
  assert.equal(playMode({}), "sequence");
});

test("revealedSvg: nach der Antwort revealSvg, sonst svg", () => {
  assert.equal(revealedSvg({ svg: "<svg>a</svg>" }), "<svg>a</svg>");
  assert.equal(revealedSvg({ svg: "<svg>a</svg>", revealSvg: "<svg>b</svg>" }), "<svg>b</svg>");
  assert.equal(revealedSvg({ svg: "<svg>a</svg>", revealSvg: "" }), "<svg>a</svg>");
});
