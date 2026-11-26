import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  starsHtml, effectiveInput, makeRound, findLevel, nextLevel, countAnswer, feedbackText,
  resultMessage, dotsHtml, markAnswer, clearMark, MARK_LABEL, lettersHtml, namesHtml, usesNames, nameKey, typedText, NAME_MAX,
  choicesHtml, choicesClass, choiceCols, keyAction, blitzPoints, notesToPlay,
  playMode, revealedSvg, svgResultClass, playSchedule, rhythmEnd, answerDelay, PLAY_GAP, BEAT_MS, RHYTHM_TAIL, DELAY_OK, AUTO_OK_MAX, waitsAfter, NEXT_STEP, DEMO_WAIT_SHORT, stepsResult,
  choiceSet, setClass, stepsFeedback, digitAction, helpsHtml, hasHelps, HELP_FROM, helpFrom, helpsTitle, DELAY_STEP_OK,
  startRound, stop, handleKey, ROUND_LENGTH, isWaiting, DEMO_LABEL, DEMO_WAIT, DEMO_READY, DEMO_NEXT, waitsForNext, silenceTones,
  makeMixed, startMixed, originText, perLevelOf, currentQuestion, RESULT_HEAD, ALL_RIGHT, keepTogether,
} from "../src/engine.js";
import { mock } from "node:test";
import { setMuted } from "../src/audio.js";
import intervalle, * as intervalleMod from "../src/packs/intervalle.js";
import { toneEnd } from "../src/audio.js";
import { PACKS } from "../src/packs/index.js";
import noten from "../src/packs/noten.js";
import { fresh } from "../src/store.js";
import { N, same, gName, LETTERS, midi } from "../src/music.js";
import akkorde from "../src/packs/akkorde.js";
import notenwerte, { ITEMS_8 } from "../src/packs/notenwerte.js";

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
  // namesOnly: die Schreibweise zählt, die Klaviatur ersetzt das Namensraster nicht
  assert.equal(effectiveInput("letters", "keys", true), "letters");
  assert.equal(effectiveInput("letters", "letters", true), "letters");
  assert.equal(effectiveInput("letters", "keys", false), "keys");
  assert.equal(effectiveInput("choices", "keys", true), "choices");
});

test("effectiveInput: beide Aufrufe im Ablauf geben namesOnly der Stufe weiter", () => {
  const src = readFileSync(new URL("../src/engine.js", import.meta.url), "utf8");
  const calls = src.match(/effectiveInput\([^)]*\)/g).filter((c) => !c.startsWith("effectiveInput(levelInput"));
  assert.equal(calls.length, 2, calls.join());
  calls.forEach((c) => assert.match(c, /namesOnly/, c));
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
  const e = s.notes["Fis (fis', Violin)"];
  assert.equal(e.ok, 1); assert.equal(e.bad, 1);
  assert.equal(Object.keys(s.notes).length, 1);
});

test("countAnswer reicht die Zeit durch; ohne Zeit (Blitz) bleibt sie leer", () => {
  const s = fresh();
  countAnswer(s, { statKey: "G (g', Violin)" }, true, 2.5);
  countAnswer(s, { statKey: "G (g', Violin)" }, true);
  assert.equal(s.notes["G (g', Violin)"].sec, 2.5);
  assert.equal(s.notes["G (g', Violin)"].timed, 1);
});

test("makeRound gibt ctx an question weiter; Pakete ohne zweiten Parameter laufen weiter", () => {
  const seen = [];
  let k = 0;
  const lens = [];
  const level = { question(prev, ctx) { seen.push(ctx); lens.push(ctx.round.length); return { id: k++ }; } };
  const ctx = { notes: {} };
  assert.equal(makeRound(level, 3, ctx).length, 3);
  assert.ok(seen.every((c) => c.notes === ctx.notes && Array.isArray(c.round)));
  assert.deepEqual(lens, [0, 1, 2]);
  assert.equal(makeRound({ question: () => ({}) }, 2).length, 2);
  for (const p of PACKS) for (const l of p.levels) assert.equal(makeRound(l, 3, { notes: {} }).length, 3, l.id);
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
  assert.ok(resultMessage(0).startsWith("Noch wacklig"));
});

// Korrektur nach der Prüfung Welle 11 (J-B2, L-B1, J-B7/W-B6): bei 10 von 10 „alles richtig“, kurzer Satz ohne
// Sterne-Versprechen bzw. ohne Verweis auf „Lernen“
test("Ergebnissatz: 10 von 10 „Stark, alles richtig.“, kurze Fassung nur der erste Teil", () => {
  assert.equal(ALL_RIGHT, "Stark, alles richtig.");
  assert.equal(resultMessage(3, { correct: 10 }), "Stark, alles richtig.");
  assert.equal(resultMessage(3, { correct: 10, short: true }), "Stark, alles richtig.");
  assert.equal(resultMessage(3, { correct: 9 }), "Stark, fast alles richtig.");
  assert.equal(resultMessage(3, { correct: 6, total: 6 }), "Stark, alles richtig.");
  assert.deepEqual(RESULT_HEAD, ["Noch wacklig.", "Solide Basis.", "Gut.", "Stark."]);
  assert.deepEqual([0, 1, 2, 3].map((k) => resultMessage(k, { correct: [3, 5, 8, 9][k], short: true })), RESULT_HEAD);
  // die kurze Fassung verspricht keinen Stern und schickt nicht nach „Lernen“
  for (let c = 0; c <= 10; c++) {
    const k = c >= 9 ? 3 : c >= 7 ? 2 : c >= 5 ? 1 : 0;
    assert.ok(!/Stern|Lernen/.test(resultMessage(k, { correct: c, short: true })), String(c));
  }
  // beide Ergebniskarten übergeben die Zahl der Richtigen
  const src = readFileSync(new URL("../src/views/practice.js", import.meta.url), "utf8");
  assert.ok(!/resultMessage\(stars\)/.test(src), "resultMessage ohne Zahl");
  assert.match(src, /resultMessage\(stars, \{ correct: res\.correct, total: res\.total, short: true \}\)/);
});

test("dotsHtml", () => {
  const h = dotsHtml([true, false], 2, 4);
  const dot = (c, i, label) => `<span class="dot ${c}" role="img" aria-label="Aufgabe ${i}: ${label}"></span>`;
  assert.equal(h, dot("ok", 1, "richtig") + dot("bad", 2, "daneben") + dot("cur", 3, "jetzt") + dot("", 4, "noch offen"));
  // Teilerfolg: eigene Klasse und eigener Text (nicht nur Farbe, Welle 10, B14)
  assert.equal(dotsHtml([true, "part", false], 3, 3), dot("ok", 1, "richtig") + dot("part", 2, "teilweise richtig") + dot("bad", 3, "daneben"));
});

test("markAnswer/clearMark: Klasse und Stand im aria-label, danach wieder wie vorher", () => {
  const btn = () => {
    const attrs = {}, cls = new Set();
    return { tagName: "BUTTON", textContent: " Fis ", dataset: {}, attrs,
      classList: { add: (c) => cls.add(c), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c) },
      getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: (k) => { delete attrs[k]; } };
  };
  const b = btn();
  markAnswer(b, "ok");
  assert.ok(b.classList.contains("ok"));
  assert.equal(b.attrs["aria-label"], "Fis, richtig");
  clearMark(b);
  assert.ok(!b.classList.contains("ok") && !("aria-label" in b.attrs));
  // vorhandenes aria-label bleibt Grundlage und kommt zurück
  const c = btn(); c.attrs["aria-label"] = "Ton Fis";
  markAnswer(c, "bad"); assert.equal(c.attrs["aria-label"], "Ton Fis, daneben");
  clearMark(c); assert.equal(c.attrs["aria-label"], "Ton Fis");
  // Tasten der Klaviatur (kein <button>): nur die Klasse
  const k = { ...btn(), tagName: "rect" }; markAnswer(k, "bad"); assert.ok(!("aria-label" in k.attrs));
  assert.deepEqual(MARK_LABEL, { ok: "richtig", bad: "daneben" });
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
  // Vorzeichen-Tasten gibt es nicht mehr (Namen werden bei Stufen mit Vorzeichen getippt)
  for (const k of ["+", "#", "-", "b", "B", "0"]) assert.equal(keyAction(key(k)), null, k);
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
  // nur noch für richtige Antworten (nach „daneben“ wartet die Runde, siehe waitsAfter)
  assert.equal(answerDelay({}), DELAY_OK);
  assert.equal(answerDelay({ play: [h, h, h] }), DELAY_OK);
  assert.equal(answerDelay(bar), 2400 + RHYTHM_TAIL);
  assert.equal(answerDelay({ play: [{ note: h, beats: 0.5 }] }), DELAY_OK);
  // ohne Ton keine Wartezeit für den Rhythmus
  assert.equal(answerDelay(bar, true), DELAY_OK);
  // DELAY_BAD und DELAY_STEP_BAD gibt es nicht mehr
  const src = readFileSync(new URL("../src/engine.js", import.meta.url), "utf8");
  assert.ok(!/DELAY_BAD|DELAY_STEP_BAD/.test(src));
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

test("svgResultClass: ganze Zeile ok/bad, mit keepRow keine Klasse", () => {
  assert.equal(svgResultClass({}, true), "ok");
  assert.equal(svgResultClass({}, false), "bad");
  assert.equal(svgResultClass({ keepRow: false }, false), "bad");
  assert.equal(svgResultClass({ keepRow: true }, true), "");
  assert.equal(svgResultClass({ keepRow: true }, false), "");
  // Teilerfolg: Zeile nicht rot
  assert.equal(svgResultClass({}, false, true), "");
});

test("keepRow: nur Tonleitern Stufe 4 bis 7 und Intervalle 8 und 9 (Bauen), alle anderen Stufen färben die ganze Zeile", () => {
  const keep = ["tonleitern-4", "tonleitern-5", "tonleitern-6", "tonleitern-7", "intervall-8", "intervall-9"];
  for (const pack of PACKS) for (const level of pack.levels) {
    let prev = null;
    for (let i = 0; i < 30; i++) {
      prev = level.question(prev, { notes: {} });
      assert.equal(!!prev.keepRow, keep.includes(level.id), level.id);
    }
  }
});

test("keepRow: im Ablauf bekommt das <svg> keine Klasse ok/bad", () => {
  const src = readFileSync(new URL("../src/engine.js", import.meta.url), "utf8");
  // Der DOM-Teil setzt die Klasse nur über svgResultClass
  assert.match(src, /rc = svgResultClass\(q, ok, part\)/);
  assert.ok(!/svg\.classList\.add\(ok \?/.test(src));
});

test("revealedSvg: nach der Antwort revealSvg, sonst svg", () => {
  assert.equal(revealedSvg({ svg: "<svg>a</svg>" }), "<svg>a</svg>");
  assert.equal(revealedSvg({ svg: "<svg>a</svg>", revealSvg: "<svg>b</svg>" }), "<svg>b</svg>");
  assert.equal(revealedSvg({ svg: "<svg>a</svg>", revealSvg: "" }), "<svg>a</svg>");
});

test("namesHtml: 21 Namen in drei Reihen, Spalten nach Stammton", () => {
  const h = namesHtml();
  const btns = [...h.matchAll(/<button class="btn" data-letter="([A-H])" data-acc="(-?\d)">([^<]+)<\/button>/g)];
  assert.equal(btns.length, 21);
  assert.equal((h.match(/<button/g) || []).length, 21);
  assert.deepEqual(btns.map((m) => m[3]), [
    "C", "D", "E", "F", "G", "A", "H",
    "Cis", "Dis", "Eis", "Fis", "Gis", "Ais", "His",
    "Ces", "Des", "Es", "Fes", "Ges", "As", "B",
  ]);
  btns.forEach((m, i) => {
    assert.equal(m[1], LETTERS[i % 7], "Spalte " + i);
    assert.equal(+m[2], [0, 1, -1][Math.floor(i / 7)], "Reihe " + i);
    assert.equal(m[3], gName(N(m[1], 4, +m[2])));
  });
});

test("usesNames: Namensraster nur bei Buchstaben-Stufen mit Vorzeichen", () => {
  assert.equal(usesNames({ input: "letters", acc: true }), true);
  assert.equal(usesNames({ acc: true }), true);
  assert.equal(usesNames({ input: "letters", acc: false }), false);
  assert.equal(usesNames({ input: "choices", acc: true }), false);
  assert.equal(usesNames(null), false);
  assert.deepEqual(noten.levels.filter(usesNames).map((l) => l.id), ["noten-7", "noten-8"]);
  assert.deepEqual(akkorde.levels.filter(usesNames).map((l) => l.id), ["akkorde-3"]);
});

test("Stufen mit Namensraster: jede Antwort hat einen Knopf, Feedback mit deutschem Namen", () => {
  const h = namesHtml();
  for (const pack of PACKS) for (const level of pack.levels.filter(usesNames)) {
    for (let k = 0; k < 60; k++) {
      const q = level.question(null), a = q.answer;
      assert.ok(h.includes(`data-letter="${a.letter}" data-acc="${a.acc}"`), `${level.id}: ${a.letter} ${a.acc}`);
      assert.ok(q.display.includes(gName(N(a.letter, 4, a.acc))), q.display);
      assert.ok(level.check(q, { letter: a.letter, acc: a.acc }));
    }
  }
});

test("nameKey: Name tippen, Enter bestätigt", () => {
  let st = { buf: "" };
  for (const c of ["F", "i", "s"]) st = nameKey(st.buf, key(c));
  assert.deepEqual(st, { buf: "fis" });
  assert.deepEqual(nameKey("fis", key("Enter")), { buf: "", answer: { letter: "F", acc: 1 } });
  assert.deepEqual(nameKey("b", key("Enter")), { buf: "", answer: { letter: "H", acc: -1 } });
  assert.deepEqual(nameKey("es", key("Enter")), { buf: "", answer: { letter: "E", acc: -1 } });
  assert.deepEqual(nameKey("h", key("Enter")), { buf: "", answer: { letter: "H", acc: 0 } });
  // ungültig: Hinweis, Puffer bleibt, keine Antwort
  assert.deepEqual(nameKey("hes", key("Enter")), { buf: "hes", invalid: true });
  assert.deepEqual(nameKey("eses", key("Enter")), { buf: "eses", invalid: true });
  // Backspace, Escape
  assert.deepEqual(nameKey("fis", key("Backspace")), { buf: "fi" });
  assert.deepEqual(nameKey("fis", key("Escape")), { buf: "" });
  // leerer Puffer: Enter, Backspace, Escape bleiben unbenutzt
  for (const k of ["Enter", "Backspace", "Escape"]) assert.equal(nameKey("", key(k)), null, k);
  // höchstens NAME_MAX Zeichen
  assert.deepEqual(nameKey("eses", key("s")), { buf: "eses" });
  assert.equal(NAME_MAX, 4);
  // andere Tasten und Kombinationen
  for (const k of ["1", "+", "#", " ", "ArrowLeft", "Shift", "ä"]) assert.equal(nameKey("f", key(k)), null, k);
  assert.equal(nameKey("f", key("i", { ctrlKey: true })), null);
  assert.equal(nameKey("f", key("i", { metaKey: true })), null);
  assert.equal(nameKey(undefined, key("c")).buf, "c");
});

test("typedText: Anzeige und neutraler Hinweis", () => {
  assert.equal(typedText(""), "");
  assert.equal(typedText("fis"), "Eingabe: fis");
  const t = typedText("hes", true);
  assert.equal(t, "„hes“ ist kein Notenname. Beispiele: fis, es, b");
  assert.ok(!/falsch|fehler/i.test(t));
});

/* ---------- Zweischrittige Aufgaben und Hilfen (seit „Intervalle neu“) ---------- */

test("choiceSet, setClass: Knopfsatz je Schritt, feste Spalten mit cols", () => {
  const q = { choices: ["a", "b"], answer: "a" };
  assert.equal(choiceSet(q), q);
  const st = { steps: [{ choices: ["x"], cols: 4, answer: "x" }, { choices: ["y", "z"], cols: 2, answer: "y" }] };
  assert.equal(choiceSet(st, 0), st.steps[0]);
  assert.equal(choiceSet(st, 1), st.steps[1]);
  assert.equal(setClass({ choices: ["Prime", "Sekunde"], cols: 4 }), "choices cols");
  assert.equal(setClass({ choices: ["Prime", "Sekunde"] }), "choices");
  assert.equal(setClass({ choices: ["½", "¼"] }), "choices short");
});

test("stepsFeedback: richtig, nur Zahl daneben (partial), sonst reveal", () => {
  const q = { display: "D", reveal: "R.", partial: "P." };
  assert.equal(stepsFeedback(q, [true, true]), "Richtig! D");
  assert.equal(stepsFeedback(q, [false, true]), "P.");
  assert.equal(stepsFeedback(q, [true, false]), "R.");
  assert.equal(stepsFeedback(q, [false, false]), "R.");
  assert.equal(stepsFeedback({ display: "D", reveal: "R." }, [false, true]), "R.");
  // ein einziger Schritt (steps.length === 1): richtig oder reveal, nie partial
  assert.equal(stepsFeedback(q, [true]), "Richtig! D");
  assert.equal(stepsFeedback(q, [false]), "R.");
});

test("stepsResult: Klasse je Fall (ok, part, bad)", () => {
  const q = { display: "D", reveal: "R.", partial: "P." };
  assert.equal(stepsResult(q, [true, true]), "ok");
  assert.equal(stepsResult(q, [false, true]), "part");
  assert.equal(stepsResult(q, [true, false]), "bad");
  assert.equal(stepsResult(q, [false, false]), "bad");
  assert.equal(stepsResult({ display: "D", reveal: "R." }, [false, true]), "bad", "ohne q.partial kein Teilerfolg");
  assert.equal(stepsResult(q, [true]), "ok");
  assert.equal(stepsResult(q, [false]), "bad");
});

test("waitsAfter: Hilfen, daneben, richtig mit kurzem oder langem Text", () => {
  const helps = { helps: ["klaviatur"] }, plain = {};
  const short = "x".repeat(AUTO_OK_MAX), long = "x".repeat(AUTO_OK_MAX + 1);
  assert.equal(AUTO_OK_MAX, 45);
  // Stufe mit Hilfen: immer warten
  assert.equal(waitsAfter(helps, true, "kurz"), true);
  assert.equal(waitsAfter(helps, false, "kurz"), true);
  // daneben: immer warten
  assert.equal(waitsAfter(plain, false, ""), true);
  assert.equal(waitsAfter(plain, false, short), true);
  // richtig ohne Hilfen: Grenze AUTO_OK_MAX
  assert.equal(waitsAfter(plain, true, short), false);
  assert.equal(waitsAfter(plain, true, long), true);
  assert.equal(waitsAfter(plain, true, undefined), false);
  // waitsForNext bleibt der Sonderfall „Stufe mit Hilfen“
  assert.equal(waitsForNext(helps), true); assert.equal(waitsForNext(plain), false);
  // Noten lesen: alle richtigen Rückmeldungen sind kurz, die Runde läuft weiter wie bisher
  for (const level of noten.levels) {
    let prev = null;
    for (let i = 0; i < 60; i++) {
      prev = level.question(prev, { notes: {}, round: [] });
      assert.equal(waitsAfter(level, true, feedbackText(prev, true)), false, `${level.id}: ${feedbackText(prev, true)}`);
    }
  }
});

test("Abschlussprüfung Welle 10: Weiterlaufen nach „richtig“ je Stufe, nicht je Text", async () => {
  const { PACKS } = await import("../src/packs/index.js");
  const { okWaits, okTextsMax, OK_SAMPLE } = await import("../src/engine.js");
  const want = { "notenwerte-3": false, "notenwerte-10": false, "notenwerte-5": false, "tonleitern-3": false, "tonleitern-11": true, "akkorde-3": true, "akkorde-4": false, "akkorde-5": true, "akkorde-6": true, "intervall-2": false };
  for (const p of PACKS) for (const level of p.levels) {
    if (hasHelps(level)) continue;
    const w = okWaits(level);
    // gleiche Entscheidung mit größerer Stichprobe
    // (Stufen mit level.autoNext sind festgelegt: Notenwerte 3 und 10 laufen weiter, längster Text 48 Zeichen)
    if (typeof level.autoNext === "boolean") { assert.equal(w, !level.autoNext, level.id); assert.ok(okTextsMax(level) <= 48, level.id); }
    else assert.equal(okTextsMax(level, OK_SAMPLE * 4) > AUTO_OK_MAX, w, level.id);
    // innerhalb der Stufe einheitlich: jede richtige Antwort wartet oder keine, egal wie lang der Text ist
    let prev = null;
    for (let i = 0; i < 40; i++) {
      prev = level.question(prev, { notes: {}, round: [] });
      assert.equal(waitsAfter(level, true, feedbackText(prev, true)), w, level.id);
    }
    if (level.id in want) assert.equal(w, want[level.id], level.id);
    if (level.id.startsWith("noten-")) assert.equal(w, false, `${level.id}: Noten lesen läuft weiter`);
  }
  // level.autoNext setzt es fest
  assert.equal(waitsAfter({ autoNext: true, question: () => ({ display: "x".repeat(99) }) }, true, "x".repeat(99)), false);
  assert.equal(waitsAfter({ autoNext: false, question: () => ({ display: "x" }) }, true, "x"), true);
});

test("digitAction: Ziffern nur bei digits, innerhalb der Knöpfe, ohne Strg/Alt/Cmd", () => {
  const set = { choices: ["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"], digits: true };
  const k = (key, extra = {}) => ({ key, ...extra });
  assert.equal(digitAction(k("1"), set), 0);
  assert.equal(digitAction(k("8"), set), 7);
  assert.equal(digitAction(k("9"), set), null);
  assert.equal(digitAction(k("0"), set), null);
  assert.equal(digitAction(k("a"), set), null);
  assert.equal(digitAction(k("3", { ctrlKey: true }), set), null);
  assert.equal(digitAction(k("3"), { choices: set.choices }), null);
  assert.equal(digitAction(k("3"), null), null);
});

test("helpsHtml: nur mit level.helps, Klaviatur ab c' bzw. C", () => {
  assert.equal(hasHelps({}), false);
  assert.equal(helpsHtml({}, { clef: "treble" }), "");
  assert.deepEqual(HELP_FROM, { treble: 60, bass: 36 });
  const level = { helps: ["klaviatur"], helpText: "T" };
  const h = helpsHtml(level, { clef: "bass", helpMarks: [N("E", 2), N("C", 3)] });
  assert.ok(h.startsWith('<p class="small help-text">T</p><div class="help-grid"><div class="help-keys">'));
  // zwei markierte Töne: nur der nötige Ausschnitt (fit) – D bis C, je eine weiße Taste Rand, 8 weiße Tasten
  assert.ok(h.includes('data-midi="38" data-id="w1"') && h.includes('data-midi="48" data-id="w7"') && h.includes('data-id="w8"'));
  assert.ok(!h.includes('data-id="w0"') && !h.includes('data-id="w9"'));
  assert.deepEqual([...h.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]), [40, 48]);
  assert.ok(!h.includes("<table"));
  assert.ok(helpsHtml({ helps: ["tabelle"], helpTable: "<table></table>" }, {}).includes("<table></table>"));
  // ohne level.demo kein Knopf „Vorführen“; mit demo gesperrt (verriete die Antwort)
  assert.ok(!h.includes("data-demo"));
  const d = helpsHtml({ ...level, demo: () => null }, { clef: "treble" });
  assert.ok(d.startsWith(`<div class="help-head"><p class="small help-text">T</p><span class="demo-go"><button class="btn" data-demo-btn disabled title="${DEMO_WAIT}">${DEMO_LABEL}</button><span class="small muted demo-wait" data-demo-wait>${DEMO_WAIT_SHORT}</span></span></div>`));
  // der sichtbare Zusatz nur bei level.demo
  assert.equal(DEMO_WAIT_SHORT, "nach deiner Antwort");
  assert.ok(!h.includes(DEMO_WAIT_SHORT));
  assert.ok(d.indexOf("data-demo-btn") < d.indexOf("help-grid"), "Knopf über Klaviatur und Tabelle");
});

test("helpsHtml: q.helpFrom (optional) verschiebt die Klaviatur, ohne das Feld wie bisher", () => {
  const level = { helps: ["klaviatur"] };
  assert.equal(helpFrom({ clef: "bass" }), 36);
  assert.equal(helpFrom({ clef: "treble" }), 60);
  assert.equal(helpFrom({}), 60);
  assert.equal(helpFrom({ clef: "treble", helpFrom: 48 }), 48);
  const h = helpsHtml(level, { clef: "treble", helpFrom: 48, helpMarks: [N("H", 3, -1)] });
  // ein markierter Ton: beide Oktaven ohne Ausschnitt
  assert.ok(h.includes('data-midi="48" data-id="w0"') && h.includes('data-midi="72" data-id="w14"'));
  assert.deepEqual([...h.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]), [58]);
  assert.equal(helpsHtml(level, { clef: "treble", helpMarks: [] }), helpsHtml(level, { clef: "treble", helpFrom: 60, helpMarks: [] }));
});

test("helpsTitle: nennt nur, was die Stufe zeigt; alle Stufen mit Klaviatur und Tabelle wie bisher", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const fixed = html.match(/<summary>([^<]+)<\/summary>/)[1];
  assert.equal(fixed, "Hilfen: Klaviatur und Tabelle");
  const other = [];
  for (const pack of PACKS) for (const level of pack.levels) {
    if (!hasHelps(level)) continue;
    if (helpsTitle(level) !== fixed) other.push([level.id, helpsTitle(level)]);
  }
  assert.deepEqual(other, [
    ["notenwerte-1", "Hilfen: Merkmale"], ["notenwerte-2", "Hilfen: Pausen"], ["notenwerte-4", "Hilfen: Notenwert-Pyramide"],
    ["notenwerte-6", "Hilfen: Notenwert-Pyramide"], ["notenwerte-8", "Hilfen: Zählleiste und Pyramide"], ["tonleitern-12", "Hilfen: Klaviatur"],
  ]);
  assert.equal(helpsTitle({ helps: ["tabelle"], helpTable: "<table></table>" }), "Hilfen: Tabelle");
  assert.equal(helpsTitle({ helps: ["klaviatur", "tabelle"] }), "Hilfen: Klaviatur", "Tabelle ohne helpTable wird nicht gezeigt");
  assert.equal(helpsTitle({ helps: ["klaviatur"], helpsTitle: "Hilfen: Tasten" }), "Hilfen: Tasten");
  assert.equal(helpsTitle({}), "Hilfen");
});

test("startRound setzt die Überschrift der Hilfen (ui.helpsTitle, optional); ohne Hilfen bleibt sie stehen", () => {
  setMuted(true);
  const tl = PACKS.find((p) => p.id === "tonleitern");
  const ui = () => ({ staff: fakeEl(), feedback: fakeEl(), count: fakeEl(), dots: fakeEl(), answers: fakeEl(), typed: fakeEl(), piano: fakeEl(), helps: fakeEl(), helpsTitle: fakeEl(), helpsBody: fakeEl(), next: fakeEl() });
  const hooks = { state: fresh(), save() {}, onFinish() {} };
  const a = ui(); a.helpsTitle.textContent = "Hilfen: Klaviatur und Tabelle";
  startRound(tl.levels[11], a, hooks);
  assert.equal(a.helpsTitle.textContent, "Hilfen: Klaviatur");
  startRound(tl.levels[9], a, hooks);
  assert.equal(a.helpsTitle.textContent, "Hilfen: Klaviatur und Tabelle");
  startRound(tl.levels[12], a, hooks);
  assert.equal(a.helps.hidden, true);
  assert.equal(a.helpsTitle.textContent, "Hilfen: Klaviatur und Tabelle", "Stufe ohne Hilfen: Bereich verborgen, Text unberührt");
  // ohne ui.helpsTitle läuft die Runde wie bisher
  const b = ui(); delete b.helpsTitle;
  startRound(tl.levels[11], b, hooks);
  assert.equal(b.helps.hidden, false);
  stop();
});

// Kleines Ersatz-DOM für den Ablauf: Knöpfe entstehen aus innerHTML (data-choice), Klassen werden gemerkt
function fakeEl() {
  const el = {
    innerHTML: "", textContent: "", className: "", hidden: false, open: true, style: { setProperty() {}, removeProperty() {} },
    classList: { set: new Set(), add(...c) { c.forEach((x) => this.set.add(x)); }, remove(...c) { c.forEach((x) => this.set.delete(x)); }, toggle(c, on) { if (on) this.set.add(c); else this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    _btns: null, _html: null,
    querySelector() { return null; },
    querySelectorAll(sel) {
      if (!/data-choice|\.btn|rect/.test(sel)) return [];
      if (el._html !== el.innerHTML) {
        el._html = el.innerHTML;
        el._btns = [...el.innerHTML.matchAll(/data-choice="(\d+)"/g)].map((m) => {
          const cls = new Set();
          return { dataset: { choice: m[1] }, classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), has: (c) => cls.has(c) }, closest() { return this; } };
        });
      }
      return sel.includes("rect") ? [] : el._btns;
    },
  };
  return el;
}

function runLevel(level, items) {
  const ui = { staff: fakeEl(), feedback: fakeEl(), count: fakeEl(), dots: fakeEl(), answers: fakeEl(), typed: fakeEl(), piano: fakeEl(), helps: fakeEl(), helpsBody: fakeEl(), next: fakeEl() };
  const state = fresh(); let finished = null;
  const lv = { ...level, question: (() => { let i = 0; return () => items[i++ % items.length]; })() };
  startRound(lv, ui, { state, save() {}, onFinish(res) { finished = res; } });
  const click = (text) => {
    const btn = ui.answers.querySelectorAll(".btn[data-choice]").find((b) => choiceSetFor(ui, b) === text);
    assert.ok(btn, `Knopf ${text}`);
    ui.answers.onclick({ target: btn });
    return btn;
  };
  const choiceSetFor = (u, b) => u.answers.innerHTML.match(new RegExp(`data-choice="${b.dataset.choice}">([^<]+)<`))[1];
  // „Nächste Aufgabe“ tippen (Stufen mit Hilfen warten darauf)
  const next = () => ui.next.onclick();
  return { ui, state, click, next, done: () => finished, buttons: () => ui.answers.querySelectorAll(".btn[data-choice]").map((b) => choiceSetFor(ui, b)) };
}

test("Ablauf zweischrittig: richtig/richtig, Zahl daneben/dann Qualität, einmal gezählt", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const level = intervalle.levels[4]; // intervall-5, Hilfen
    const q = level.items.find((it) => it.num === 3 && it.quality === "klein" && it.low.letter === "E" && it.low.acc === 0 && it.low.octave === 4);
    const { twoStepQuestion } = intervalleMod;
    const item = twoStepQuestion(q, intervalleMod.TYPES_ALL);
    const r = runLevel(level, [item]);
    // Hilfen: sichtbar, zugeklappt, Inhalt mit Klaviatur
    assert.equal(r.ui.helps.hidden, false); assert.equal(r.ui.helps.open, false);
    assert.ok(r.ui.helpsBody.innerHTML.includes("keys-static"));
    assert.equal(r.ui.feedback.textContent, "Grobbestimmung: Welches Intervall?");
    assert.deepEqual(r.buttons(), ["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"]);
    assert.ok(r.ui.answers.classList.contains("cols"));
    // 1. Aufgabe: richtig, richtig
    r.click("Terz");
    assert.equal(r.ui.feedback.textContent, keepTogether("Richtig: e'–g': 3 Stufen → Terz."));
    assert.equal(r.state.answered, 0, "nach Schritt 1 noch nicht gezählt");
    r.click("Quarte"); // gesperrt während der Pause: zählt nicht
    mock.timers.tick(DELAY_STEP_OK);
    assert.deepEqual(r.buttons(), ["kleine Terz", "große Terz"]);
    assert.equal(r.ui.feedback.textContent, "e'–g': 3 Stufen → Terz. Welche Terz? Zähle die Halbtöne.");
    r.click("kleine Terz");
    assert.equal(r.state.answered, 1); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, keepTogether("Richtig! e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz"));
    mock.timers.tick(DELAY_OK);
    // Stufe mit Hilfen: kein Weitergehen nach der Pause, die Runde wartet auf „Nächste Aufgabe“
    assert.equal(r.ui.count.textContent, "1 / 10"); assert.equal(isWaiting(), true); assert.equal(r.ui.next.hidden, false);
    r.next();
    assert.equal(r.ui.next.hidden, true);
    // Hilfen bleiben, wie sie waren (hier: zu), Inhalt neu
    assert.equal(r.ui.helps.open, false);
    // 2. Aufgabe: Zahl daneben, dann trotzdem die Qualitäten der richtigen Zahl; zählt als daneben
    r.ui.helps.open = true;
    r.click("Quarte");
    assert.equal(r.ui.feedback.textContent, keepTogether("Nicht ganz: e'–g': 3 Stufen → Terz."));
    // Schritt 1 daneben: kein Zeitgeber, „Weiter zu Schritt 2“
    mock.timers.tick(100000);
    assert.equal(r.buttons().length, 8, "noch die Knöpfe von Schritt 1");
    assert.equal(isWaiting(), true); assert.equal(r.ui.next.hidden, false); assert.equal(r.ui.next.textContent, NEXT_STEP);
    r.next();
    assert.equal(r.ui.next.hidden, true); assert.equal(isWaiting(), false);
    assert.deepEqual(r.buttons(), ["kleine Terz", "große Terz"]);
    r.click("kleine Terz");
    assert.equal(r.state.answered, 2); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, keepTogether(item.partial));
    // Teilerfolg: eigene Klasse, Zeile nicht rot, eigener Fortschrittspunkt; zählt als daneben
    assert.equal(r.ui.feedback.className, "feedback part");
    assert.deepEqual(r.state.notes["kleine Terz"].hist, "10");
    assert.equal(r.ui.next.textContent, DEMO_NEXT, "danach wieder „Nächste Aufgabe“");
    r.next();
    assert.ok(r.ui.dots.innerHTML.startsWith('<span class="dot ok" role="img" aria-label="Aufgabe 1: richtig"></span><span class="dot part" role="img" aria-label="Aufgabe 2: teilweise richtig"></span><span class="dot cur"'));
    assert.equal(r.ui.helps.open, true, "Hilfen bleiben offen, wenn du sie geöffnet hast");
    // 3. Aufgabe: Zahl richtig per Ziffer, Qualität daneben
    const e = { key: "3", preventDefault() {} };
    assert.equal(handleKey(e), true);
    mock.timers.tick(DELAY_STEP_OK);
    assert.equal(handleKey({ key: "1", preventDefault() {} }), false, "Ziffern nur im ersten Schritt");
    r.click("große Terz");
    assert.equal(r.state.answered, 3); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, keepTogether(item.reveal));
    assert.equal(r.ui.feedback.className, "feedback bad");
    r.next();
    // Rest der Runde richtig
    for (let i = 3; i < ROUND_LENGTH; i++) {
      r.click("Terz"); mock.timers.tick(DELAY_STEP_OK); r.click("kleine Terz"); mock.timers.tick(DELAY_OK); r.next();
    }
    const res = r.done();
    assert.ok(res);
    assert.equal(res.correct, 8); assert.equal(res.total, 10);
    assert.deepEqual(res.results.slice(0, 3), [true, false, false], "Teilerfolg zählt als daneben");
    assert.equal(r.state.answered, 10);
    const { day, ...lv5 } = r.state.levels["intervall-5"];
    assert.deepEqual(lv5, { stars: 2, best: 8, played: 1, last: 8 }); assert.match(day, /^\d{4}-\d\d-\d\d$/);
    // Rundenprotokoll (Welle 11, Schritt 6): je Aufgabe Stufe, Ergebnis und Ergebnis je Schritt
    assert.equal(res.log.length, 10);
    assert.deepEqual(res.log.slice(0, 3), [
      { id: "intervall-5", ok: true, oks: [true, true] },
      { id: "intervall-5", ok: false, oks: [false, true] },
      { id: "intervall-5", ok: false, oks: [true, false] },
    ]);
    assert.equal(res.perLevel, undefined, "perLevel nur in der gemischten Runde");
  } finally { stop(); mock.timers.reset(); }
});

test("Ablauf: Stufe ohne Hilfen versteckt den Bereich, Stufe 1 einschrittig mit Ziffern", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const l2 = intervalle.levels[1];
    const r = runLevel(l2, [l2.question(null)]);
    assert.equal(r.ui.helps.hidden, true);
    stop();
    const l1 = intervalle.levels[0];
    const q = l1.question(null);
    const r1 = runLevel(l1, [q]);
    assert.equal(r1.ui.helps.hidden, false);
    const idx = ["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"].indexOf(q.answer);
    assert.equal(handleKey({ key: String(idx + 1), preventDefault() {} }), true);
    assert.equal(r1.state.answered, 1); assert.equal(r1.state.correct, 1);
  } finally { stop(); mock.timers.reset(); }
});

// Ersatz-Element mit beliebigen Unterelementen (querySelector legt sie bei Bedarf an), für die Vorführung
function anyEl() {
  const kids = new Map();
  return {
    innerHTML: "", textContent: "", hidden: false, disabled: false, isConnected: true, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    querySelector(sel) { if (!kids.has(sel)) kids.set(sel, anyEl()); return kids.get(sel); },
    querySelectorAll() { return []; }, contains() { return true; },
  };
}
const target = (sel) => ({ closest: (s) => (s === sel ? {} : null) });

test("Ablauf: „Vorführen“ erst nach der Antwort, die Runde wartet, „Nächste Aufgabe“ geht weiter", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const level = intervalle.levels[2]; // intervall-3, Hilfen
    const it = level.items.find((x) => x.num === 3 && x.quality === "klein" && x.low.letter === "E" && x.low.acc === 0);
    const item = intervalleMod.twoStepQuestion(it, intervalleMod.TYPES_RKG);
    const ui = { staff: fakeEl(), feedback: fakeEl(), count: fakeEl(), dots: fakeEl(), answers: fakeEl(), typed: fakeEl(), piano: fakeEl(), helps: fakeEl(), helpsBody: anyEl(), next: fakeEl() };
    const state = fresh();
    startRound({ ...level, question: () => item }, ui, { state, save() {}, onFinish() {} });
    assert.ok(ui.helpsBody.innerHTML.includes("data-demo-btn disabled"), "vor der Antwort gesperrt");
    const btn = ui.helpsBody.querySelector("[data-demo-btn]"); btn.disabled = true;
    // vor der Antwort: Klick bewirkt nichts
    ui.helpsBody.onclick({ target: target("[data-demo-btn]") });
    assert.equal(isWaiting(), false);
    const click = (text) => {
      const b = ui.answers.querySelectorAll(".btn[data-choice]").find((x) => ui.answers.innerHTML.match(new RegExp(`data-choice="${x.dataset.choice}">([^<]+)<`))[1] === text);
      ui.answers.onclick({ target: b });
    };
    assert.equal(ui.helpsBody.querySelector("[data-demo-wait]").hidden, false, "vor der Antwort sichtbar: „nach deiner Antwort“");
    click("Terz");
    assert.equal(btn.disabled, true, "nach dem ersten Schritt noch gesperrt");
    mock.timers.tick(DELAY_STEP_OK);
    click("kleine Terz");
    assert.equal(btn.disabled, false, "nach der Antwort frei");
    assert.equal(btn.title, DEMO_READY);
    assert.equal(ui.helpsBody.querySelector("[data-demo-wait]").hidden, true, "„nach deiner Antwort“ ist weg");
    assert.equal(isWaiting(), true, "Stufe mit Hilfen wartet schon ohne Vorführen");
    // Zuklappen der Hilfen ohne Vorführung geht nicht weiter
    ui.helps.open = false; ui.helps.ontoggle();
    assert.equal(ui.count.textContent, "1 / 10");
    // Vorführen: die Runde wartet weiter
    ui.helpsBody.onclick({ target: target("[data-demo-btn]") });
    assert.equal(isWaiting(), true);
    const box = ui.helpsBody.querySelector(".help-demo");
    assert.equal(box.hidden, false);
    assert.ok(box.innerHTML.includes(DEMO_NEXT));
    assert.equal(ui.next.hidden, true, "„Nächste Aufgabe“ nur einmal: der Knopf unter den Antworten ist weg");
    const root = box.querySelector("[data-demo-root]");
    assert.ok(root.innerHTML.includes('<span class="small muted num demo-count">1 / 8</span>'));
    mock.timers.tick(DELAY_OK * 5);
    assert.equal(ui.count.textContent, "1 / 10");
    assert.equal(state.answered, 1);
    // Nächste Aufgabe, Knopf wieder gesperrt
    ui.helpsBody.onclick({ target: target("[data-demo-next]") });
    assert.equal(isWaiting(), false);
    assert.equal(ui.count.textContent, "2 / 10");
    assert.equal(ui.next.hidden, true);
    assert.ok(ui.helpsBody.innerHTML.includes("data-demo-btn disabled"));
    // Zuklappen der Hilfen während der Vorführung geht ebenfalls weiter
    click("Terz"); mock.timers.tick(DELAY_STEP_OK); click("kleine Terz");
    ui.helpsBody.onclick({ target: target("[data-demo-btn]") });
    assert.equal(isWaiting(), true);
    ui.helps.open = false; ui.helps.ontoggle();
    assert.equal(ui.count.textContent, "3 / 10");
  } finally { stop(); mock.timers.reset(); }
});

// W2 (Welle 11): „Nächste Aufgabe“ steht zu jedem Zeitpunkt höchstens einmal da, in allen Stufen aller Pakete.
// Beantwortet wird die erste Aufgabe daneben (wo möglich), Schritt für Schritt.
function nextOnceRun(level) {
  const qs = [];
  const lv = { ...level, question: (p, c) => { const q = level.question(p, c); qs.push(q); return q; } };
  const ui = { staff: fakeEl(), feedback: fakeEl(), count: fakeEl(), dots: fakeEl(), answers: fakeEl(), typed: fakeEl(), piano: fakeEl(), helps: fakeEl(), helpsBody: anyEl(), next: fakeEl() };
  ui.next.hidden = true;
  ui.feedback.append = () => {}; // Auflösung mit markierten Teilen (revealParts)
  startRound(lv, ui, { state: fresh(), save() {}, onFinish() {} });
  const q = qs[0];
  const steps = q.steps ? q.steps.length : 1;
  for (let s = 0; s < steps; s++) {
    const set = choiceSet(q, s);
    const right = (v) => (q.steps ? (v && typeof v === "object" ? same(N(v.letter, 4, v.acc), N(set.answer.letter, 4, set.answer.acc || 0)) : v === set.answer) : !!level.check(q, v));
    let target;
    if (level.input === "choices") {
      const i = Math.max(0, set.choices.findIndex((c) => !right(c)));
      target = ui.answers.querySelectorAll(".btn[data-choice]").find((b) => +b.dataset.choice === i);
    } else {
      const l = LETTERS.find((x) => !right({ letter: x, acc: 0 })) || "C";
      target = { dataset: { letter: l, acc: "0" }, classList: { add() {}, remove() {} }, closest() { return this; } };
    }
    assert.ok(target, `${level.id}: Antwortknopf`);
    ui.answers.onclick({ target });
    if (s < steps - 1) {
      mock.timers.tick(DELAY_STEP_OK);
      if (!ui.next.hidden) { assert.equal(ui.next.textContent, NEXT_STEP); ui.next.onclick(); }
    }
  }
  return { ui, q };
}
// Ersatz für document.createElement/createTextNode (Auflösung mit markierten Teilen), nur während der Tests unten
const withDoc = (fn) => {
  const had = "document" in globalThis;
  if (!had) globalThis.document = { createElement: () => ({}), createTextNode: (t) => ({ t }) };
  try { return fn(); } finally { if (!had) delete globalThis.document; }
};
const demoNexts = (html) => (String(html).match(/data-demo-next/g) || []).length;

test("Nächste Aufgabe steht nur einmal da (alle Pakete)", () => withDoc(() => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    let withDemo = 0, without = 0;
    for (const pack of PACKS) for (const level of pack.levels) {
      const { ui } = nextOnceRun(level);
      const box = ui.helpsBody.querySelector(".help-demo");
      assert.equal(demoNexts(ui.helpsBody.innerHTML), 0, `${level.id}: kein Knopf in den Hilfen`);
      if (level.demo) {
        withDemo++;
        assert.equal(ui.count.textContent, "1 / 10", `${level.id}: wartet`);
        assert.equal(ui.next.hidden, false, `${level.id}: vor „Vorführen“ der Knopf unter den Antworten`);
        assert.equal(ui.next.textContent, DEMO_NEXT);
        assert.equal(demoNexts(box.innerHTML), 0, `${level.id}: Vorführung noch zu`);
        ui.helpsBody.onclick({ target: target("[data-demo-btn]") });
        assert.equal(ui.next.hidden, true, `${level.id}: bei offener Vorführung kein Knopf unter den Antworten`);
        assert.equal(demoNexts(box.innerHTML), 1, `${level.id}: genau ein Knopf am Ende der Vorführung`);
        ui.helpsBody.onclick({ target: target("[data-demo-next]") });
        assert.equal(ui.count.textContent, "2 / 10", `${level.id}: nächste Aufgabe`);
        assert.equal(ui.next.hidden, true, `${level.id}: danach kein Knopf`);
        assert.equal(demoNexts(ui.helpsBody.innerHTML), 0);
      } else {
        without++;
        // daneben (bzw. Stufe mit Hilfen): ein Knopf unter den Antworten, keiner in den Hilfen
        if (ui.count.textContent === "1 / 10") {
          assert.equal(ui.next.hidden, false, `${level.id}: nach „daneben“ ist „Nächste Aufgabe“ da`);
          assert.equal(ui.next.textContent, DEMO_NEXT);
        }
        assert.equal(demoNexts(box.innerHTML), 0, `${level.id}: keine Vorführung, kein zweiter Knopf`);
        ui.helpsBody.onclick({ target: target("[data-demo-btn]") });
        assert.equal(demoNexts(box.innerHTML), 0, `${level.id}: „Vorführen“ gibt es nicht`);
      }
      stop();
    }
    assert.equal(withDemo, 15, "Notenwerte 1, 4, 6, 8; Intervalle 1, 3, 5, 8; Tonleitern 1, 2, 4, 6, 8, 10, 12");
    assert.ok(without > 0);
  } finally { stop(); mock.timers.reset(); }
}));

test("Nächste Aufgabe: Fokus geht auf „Abspielen“ und danach auf den Antwortbereich, nie auf <body>", () => withDoc(() => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const level = intervalle.levels[2]; // intervall-3, Vorführung
    const { ui } = nextOnceRun(level);
    let focused = null;
    const doc = { body: {}, activeElement: {} }; // Fokus auf „Vorführen“ (in den Hilfen)
    ui.helpsBody.ownerDocument = doc;
    const box = ui.helpsBody.querySelector(".help-demo");
    box.querySelector('[data-act="play"]').focus = () => { focused = "play"; };
    ui.answers.focus = (o) => { focused = "answers"; assert.deepEqual(o, { preventScroll: true }); };
    ui.answers.hidden = false;
    ui.helpsBody.onclick({ target: target("[data-demo-btn]") });
    assert.equal(focused, "play", "„Vorführen“ verschwindet, der Fokus geht auf „Abspielen“");
    ui.helpsBody.onclick({ target: target("[data-demo-next]") });
    assert.equal(ui.count.textContent, "2 / 10");
    assert.equal(focused, "answers", "„Nächste Aufgabe“ verschwindet, der Fokus geht auf den Antwortbereich");
    // ohne Fokus in den Hilfen (Maus, Tippen): kein Verschieben des Fokus
    stop();
    const b = nextOnceRun(level); focused = null;
    b.ui.helpsBody.ownerDocument = { body: {}, activeElement: null };
    b.ui.answers.focus = () => { focused = "answers"; };
    b.ui.helpsBody.onclick({ target: target("[data-demo-btn]") });
    b.ui.helpsBody.onclick({ target: target("[data-demo-next]") });
    assert.equal(focused, null);
  } finally { stop(); mock.timers.reset(); }
}));

test("index.html und style.css: Antwortbereich als Fokusziel, Notenzeile mit Abstand zur Kopfleiste", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  // mit Namen: Der Antwortbereich bekommt nach „Nächste Aufgabe“ den Fokus, ein Vorleseprogramm sagt „Antworten“
  assert.match(html, /<div class="answers" id="pAnswers" role="group" aria-label="Antworten" tabindex="-1">/);
  assert.match(css, /#pStaff \{ scroll-margin-top: \d+px; \}/);
});

test("Ablauf: Stufe mit Hilfen wartet beliebig lange auf „Nächste Aufgabe“ (Knopf, Enter, Leertaste), die letzte Aufgabe beendet danach die Runde", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const l1 = intervalle.levels[0]; // intervall-1, Hilfen, einschrittig mit Ziffern
    assert.equal(waitsForNext(l1), true);
    const q = l1.question(null);
    const r = runLevel(l1, [q]);
    const key = (k, target) => handleKey({ key: k, target, preventDefault() {} });
    const digit = String(["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"].indexOf(q.answer) + 1);
    assert.equal(r.ui.next.hidden, true, "vor der Antwort kein Knopf");
    assert.equal(key("Enter"), false, "Enter vor der Antwort bewirkt nichts");
    assert.equal(key(digit), true);
    mock.timers.tick(DELAY_OK * 100);
    assert.equal(r.ui.count.textContent, "1 / 10"); assert.equal(isWaiting(), true); assert.equal(r.ui.next.hidden, false);
    assert.equal(key(digit), false, "während des Wartens keine Antwort");
    assert.equal(key("x"), false);
    // Enter auf einem Knopf der Vorführung bleibt bei diesem Knopf
    assert.equal(key("Enter", { closest: (s) => (s.includes("[data-act]") ? {} : null) }), false);
    assert.equal(key("Enter"), true);
    assert.equal(r.ui.count.textContent, "2 / 10"); assert.equal(isWaiting(), false); assert.equal(r.ui.next.hidden, true);
    key(digit); mock.timers.tick(DELAY_OK * 100);
    assert.equal(key(" "), true, "Leertaste geht ebenfalls weiter");
    for (let i = 2; i < ROUND_LENGTH - 1; i++) { key(digit); r.next(); }
    assert.equal(r.done(), null, "nach der letzten Antwort noch nicht beendet");
    assert.equal(r.ui.next.hidden, true);
    key(digit); mock.timers.tick(DELAY_OK * 100);
    assert.equal(r.done(), null); assert.equal(isWaiting(), true);
    r.next();
    assert.ok(r.done()); assert.equal(r.done().correct, ROUND_LENGTH);
  } finally { stop(); mock.timers.reset(); }
});

test("Ablauf: Stufe ohne Hilfen geht wie bisher nach der Pause von selbst weiter, ohne Knopf „Nächste Aufgabe“", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const l2 = intervalle.levels[1]; // intervall-2, ohne Hilfen
    assert.equal(waitsForNext(l2), false);
    const q = l2.question(null);
    const r = runLevel(l2, [q]);
    const digit = String(["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"].indexOf(q.answer) + 1);
    for (let i = 0; i < ROUND_LENGTH; i++) {
      assert.equal(r.ui.count.textContent, `${i + 1} / 10`);
      assert.equal(handleKey({ key: digit, preventDefault() {} }), true);
      assert.equal(isWaiting(), false); assert.equal(r.ui.next.hidden, true);
      assert.equal(handleKey({ key: "Enter", preventDefault() {} }), false, "Enter springt nicht vor");
      mock.timers.tick(answerDelay(q, true, true) - 1);
      assert.equal(r.ui.count.textContent, `${i + 1} / 10`, "vor Ablauf der Pause noch dieselbe Aufgabe");
      mock.timers.tick(1);
    }
    assert.ok(r.done()); assert.equal(r.done().correct, ROUND_LENGTH);
  } finally { stop(); mock.timers.reset(); }
});

/* ---------- Rhythmus verstummt beim Weitergehen (Welle 9, Notenwerte Stufe 8) ---------- */

test("silenceTones: löscht die noch offenen Töne, auch aus r.timers", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const fired = [];
    const r = { timers: new Set(), tones: new Set() };
    for (const ms of [100, 200]) { const id = setTimeout(() => fired.push(ms), ms); r.timers.add(id); r.tones.add(id); }
    const other = setTimeout(() => fired.push("weiter"), 300); r.timers.add(other);
    silenceTones(r);
    assert.equal(r.tones.size, 0); assert.deepEqual([...r.timers], [other]);
    mock.timers.tick(500);
    assert.deepEqual(fired, ["weiter"]);
    assert.doesNotThrow(() => silenceTones(null));
    assert.doesNotThrow(() => silenceTones({ timers: new Set() }));
  } finally { mock.timers.reset(); }
  // im Ablauf: beim Weitergehen (r.advance) und beim Öffnen der Vorführung
  const src = readFileSync(new URL("../src/engine.js", import.meta.url), "utf8");
  assert.match(src, /r\.advance = \(\) => \{[^}]*silenceTones\(r\)/);
  assert.match(src, /function openDemo\(r\) \{[\s\S]*?silenceTones\(r\)[\s\S]*?\n\}/);
});

test("Ablauf Notenwerte Stufe 8: sofort „Nächste Aufgabe“ – der Rest des Rhythmus klingt nicht weiter", () => {
  let started = 0;
  const node = () => ({ connect: () => node(), gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: {}, start() {}, stop() {} });
  class FakeAudio { constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; } createOscillator() { started++; return node(); } createGain() { return node(); } resume() {} }
  const hadWindow = "window" in globalThis, oldWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudio };
  setMuted(false);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const level = notenwerte.levels[7];
    assert.equal(waitsForNext(level), true);
    const mk = (bar, gap) => Object.assign(ITEMS_8.find((it) => it.bar === bar && it.gap === gap).make(), { key: `${bar}:${gap}` });
    // vier Viertel: Töne bei 0, 600, 1200, 1800 ms
    const r = runLevel(level, [mk("4 4 4 4", 3), mk("2 2", 0)]);
    r.click("1"); mock.timers.tick(DELAY_STEP_OK); r.click("Viertelnote");
    assert.equal(started, 1, "der erste Ton klingt sofort");
    r.next();
    mock.timers.tick(5000);
    assert.equal(started, 1, "die übrigen drei Töne sind gelöscht");
    // ohne Weitergehen klingt der ganze Takt (zweite Aufgabe: zwei halbe Noten)
    r.click("2"); mock.timers.tick(DELAY_STEP_OK); r.click("halbe Note");
    mock.timers.tick(5000);
    assert.equal(started, 3);
  } finally {
    stop(); mock.timers.reset(); setMuted(true);
    if (hadWindow) globalThis.window = oldWindow; else delete globalThis.window;
  }
});

/* ---------- Welle 10: Warten nach „daneben“, Weiter zu Schritt 2, Ein-Schritt-Aufgaben ---------- */

test("Ablauf: Stufe ohne Hilfen wartet nach „daneben“ (kein Zeitgeber, ui.next sichtbar), kurze richtige Antwort läuft weiter", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const l2 = intervalle.levels[1]; // intervall-2, ohne Hilfen, einschrittig mit Ziffern
    const q = l2.question(null);
    const r = runLevel(l2, [q]);
    const names = ["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"];
    const right = names.indexOf(q.answer), wrong = (right + 1) % 8;
    assert.equal(handleKey({ key: String(wrong + 1), preventDefault() {} }), true);
    assert.equal(r.ui.feedback.className, "feedback bad");
    mock.timers.tick(100000);
    assert.equal(r.ui.count.textContent, "1 / 10", "die Auflösung bleibt stehen");
    assert.equal(isWaiting(), true); assert.equal(r.ui.next.hidden, false); assert.equal(r.ui.next.textContent, DEMO_NEXT);
    assert.equal(handleKey({ key: " ", preventDefault() {} }), true);
    assert.equal(r.ui.count.textContent, "2 / 10"); assert.equal(r.ui.next.hidden, true);
    // richtig mit kurzem Text: von selbst weiter
    assert.ok(feedbackText(q, true).length <= AUTO_OK_MAX);
    handleKey({ key: String(right + 1), preventDefault() {} });
    assert.equal(isWaiting(), false); assert.equal(r.ui.next.hidden, true);
    mock.timers.tick(DELAY_OK);
    assert.equal(r.ui.count.textContent, "3 / 10");
  } finally { stop(); mock.timers.reset(); }
});

test("Ablauf: Stufe ohne Hilfen, richtig mit langem Text wartet ebenfalls", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const l4 = intervalle.levels[3]; // intervall-4, ohne Hilfen, zwei Schritte
    const it = l4.items.find((x) => x.num === 3 && x.quality === "klein");
    const item = intervalleMod.twoStepQuestion(it, intervalleMod.TYPES_RKG);
    const r = runLevel(l4, [item]);
    r.click("Terz"); mock.timers.tick(DELAY_STEP_OK); r.click("kleine Terz");
    assert.ok(r.ui.feedback.textContent.length > AUTO_OK_MAX);
    assert.equal(r.ui.feedback.className, "feedback ok");
    mock.timers.tick(100000);
    assert.equal(r.ui.count.textContent, "1 / 10"); assert.equal(isWaiting(), true); assert.equal(r.ui.next.hidden, false);
    r.next();
    assert.equal(r.ui.count.textContent, "2 / 10");
  } finally { stop(); mock.timers.reset(); }
});

test("Ablauf: Schritt 1 daneben → „Weiter zu Schritt 2“ per Enter und Leertaste, auch ohne Hilfen", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const l4 = intervalle.levels[3];
    const it = l4.items.find((x) => x.num === 3 && x.quality === "groß");
    const item = intervalleMod.twoStepQuestion(it, intervalleMod.TYPES_RKG);
    const r = runLevel(l4, [item]);
    const key = (k) => handleKey({ key: k, preventDefault() {} });
    for (const k of ["Enter", " "]) {
      assert.equal(key("4"), true, "Quarte statt Terz");
      assert.equal(r.ui.feedback.className, "feedback bad");
      mock.timers.tick(100000);
      assert.equal(r.ui.next.hidden, false); assert.equal(r.ui.next.textContent, NEXT_STEP);
      assert.equal(key("3"), false, "während des Wartens keine Antwort");
      assert.equal(key(k), true);
      assert.equal(r.ui.next.hidden, true);
      assert.deepEqual(r.buttons(), ["kleine Terz", "große Terz"]);
      assert.equal(r.state.answered, k === "Enter" ? 0 : 1, "Schritt 1 zählt noch nicht");
      r.click("große Terz");
      assert.equal(r.ui.feedback.className, "feedback part");
      assert.equal(r.ui.next.textContent, DEMO_NEXT);
      r.next();
    }
    assert.equal(r.state.answered, 2); assert.equal(r.state.correct, 0);
  } finally { stop(); mock.timers.reset(); }
});

test("Ablauf: Ein-Schritt-Aufgabe (Intervalle 3, Quinte) endet nach Schritt 1", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const l3 = intervalle.levels[2];
    const it = l3.items.find((x) => x.num === 5 && x.low.letter === "C" && x.low.acc === 0);
    const item = intervalleMod.twoStepQuestion(it, intervalleMod.TYPES_RKG);
    assert.equal(item.steps.length, 1);
    const r = runLevel(l3, [item]);
    r.click("Quinte");
    assert.equal(r.state.answered, 1); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, keepTogether(`Richtig! ${item.display}`));
    assert.match(r.ui.feedback.textContent, /5\u00a0Stufen → Quinte · hier rein: 7\u00a0Halbtöne$/);
    assert.equal(isWaiting(), true, "Stufe mit Hilfen wartet");
    r.next();
    r.click("Quarte");
    assert.equal(r.state.answered, 2); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, keepTogether(item.reveal));
    assert.equal(r.ui.feedback.className, "feedback bad");
  } finally { stop(); mock.timers.reset(); }
});

test("Kein Antwortsatz mit nur einem Knopf: alle Pakete, alle Stufen, jeder Schritt (Welle 10, B10)", () => {
  for (const pack of PACKS) for (const level of pack.levels) {
    if (level.input !== "choices") continue;
    for (let k = 0; k < 30; k++) for (const q of makeRound(level, ROUND_LENGTH, { notes: {} })) {
      for (const set of q.steps || [q]) assert.ok(set.choices.length >= 2, `${level.id}: ${set.choices.join(" | ")}`);
    }
  }
});

test("level.twoSteps passt zu den Aufgaben (q.steps mit zwei Schritten)", () => {
  for (const pack of PACKS) for (const level of pack.levels) {
    let seen = false;
    for (let k = 0; k < 8 && !seen; k++) seen = makeRound(level, ROUND_LENGTH, { notes: {} }).some((q) => q.steps && q.steps.length > 1);
    assert.equal(!!level.twoSteps, seen, level.id);
  }
});

/* ---------- Gemischte Runde (Welle 11, Schritt 6) ---------- */

const lvl = (id) => findLevel(PACKS, id);
// Eine Aufgabe der Stufe id wie aus makeMixed (q.from, q.fromPack); pred (optional) wählt eine passende Aufgabe
function mixedItem(id, pred = () => true) {
  const { pack, level } = lvl(id);
  assert.equal(level.id, id);
  for (let i = 0; i < 500; i++) {
    const q = level.question(null, { notes: {}, round: [] });
    if (pred(q)) return { ...q, from: level, fromPack: pack };
  }
  throw new Error(`keine passende Aufgabe in ${id}`);
}
function mixedUi() {
  const ui = { staff: fakeEl(), feedback: fakeEl(), count: fakeEl(), dots: fakeEl(), answers: fakeEl(), typed: fakeEl(), piano: fakeEl(), helps: fakeEl(), helpsBody: anyEl(), next: fakeEl(), origin: fakeEl() };
  ui.feedback.append = () => {};
  ui.helps.hidden = false; ui.origin.hidden = true;
  return ui;
}
const btnText = (ui, b) => ui.answers.innerHTML.match(new RegExp(`data-choice="${b.dataset.choice}">([^<]+)<`))[1];
const letterBtns = (ui) => [...ui.answers.innerHTML.matchAll(/data-letter="([A-H])"/g)].length;
const accBtns = (ui) => [...ui.answers.innerHTML.matchAll(/data-acc=/g)].length;
const letterTarget = (a) => ({ dataset: { letter: a.letter, acc: String(a.acc || 0) }, classList: { add() {}, remove() {} }, closest() { return this; } });
const clickChoice = (ui, text) => {
  const b = ui.answers.querySelectorAll(".btn[data-choice]").find((x) => btnText(ui, x) === text);
  assert.ok(b, `Knopf ${text}`);
  ui.answers.onclick({ target: b });
};
// weiter zur nächsten Aufgabe: „Nächste Aufgabe“, wenn die Runde wartet, sonst die Pause abwarten
const advance = (ui) => { if (isWaiting()) ui.next.onclick(); else mock.timers.tick(5000); };

test("makeMixed: Anzahl je Stufe, q.from, prev und ctx.round innerhalb der Stufe, nie zweimal dieselbe Stufe hintereinander", () => {
  const seen = [];
  const mk = (id) => ({ id, no: 1, question(prev, c) { const q = { id, prev, roundLen: c.round.length, notes: c.notes }; seen.push(q); return q; } });
  const packs = [{ id: "p", title: "P", levels: [mk("a"), mk("b")] }, { id: "q", title: "Q", levels: [mk("c")] }];
  const ctx = { notes: { x: 1 } };
  const out = makeMixed(packs, [{ id: "a", n: 4 }, { id: "b", n: 3 }, { id: "c", n: 3 }], ctx, () => 0);
  assert.equal(out.length, 10);
  const count = (id) => out.filter((q) => q.from.id === id).length;
  assert.deepEqual([count("a"), count("b"), count("c")], [4, 3, 3]);
  for (let i = 1; i < out.length; i++) assert.notEqual(out[i].from.id, out[i - 1].from.id, `Stelle ${i}`);
  assert.ok(out.every((q) => q.from.id === q.id && q.fromPack === (q.id === "c" ? packs[1] : packs[0])));
  assert.ok(out.every((q) => q.notes === ctx.notes), "ctx geht an question");
  assert.equal(ctx.round, undefined, "ctx selbst bleibt unverändert");
  // prev und ctx.round je Stufe: die erste Aufgabe einer Stufe ohne prev, jede weitere mit der vorigen derselben Stufe
  for (const id of ["a", "b", "c"]) {
    const qs = seen.filter((q) => q.id === id);
    assert.equal(qs[0].prev, null);
    qs.slice(1).forEach((q, i) => { assert.equal(q.prev, qs[i]); assert.equal(q.roundLen, i + 1); });
  }
  // Kopien: die Aufgaben der Pakete bekommen kein from
  assert.ok(seen.every((q) => !("from" in q)));
  // Ungleich verteilt: so wenige Nachbarn derselben Stufe wie möglich (5 + 1: a b a a a a)
  const un = makeMixed(packs, [{ id: "a", n: 5 }, { id: "b", n: 1 }], {}, () => 0.99);
  assert.deepEqual(un.map((q) => q.from.id), ["a", "b", "a", "a", "a", "a"]);
  // n = 0 entfällt, doppelte Einträge zählen zusammen, unbekannte ID ist ein Fehler
  assert.equal(makeMixed(packs, [{ id: "a", n: 0 }, { id: "b", n: 2 }], {}).length, 2);
  assert.equal(makeMixed(packs, [{ id: "a", n: 2 }, { id: "a", n: 1 }], {}).length, 3);
  assert.throws(() => makeMixed(packs, [{ id: "zz", n: 2 }], {}), /Unbekannte Stufe: zz/);
  // Gleichstand per rand: mit 0 die erste, mit 0,99 die letzte Stufe zuerst
  assert.equal(makeMixed(packs, [{ id: "a", n: 1 }, { id: "c", n: 1 }], {}, () => 0)[0].from.id, "a");
  assert.equal(makeMixed(packs, [{ id: "a", n: 1 }, { id: "c", n: 1 }], {}, () => 0.99)[0].from.id, "c");
});

test("makeMixed mit echten Stufen: 4 + 3 + 3 aus drei Paketen, jede Aufgabe stellbar", () => {
  for (let k = 0; k < 20; k++) {
    const out = makeMixed(PACKS, [{ id: "noten-7", n: 4 }, { id: "notenwerte-5", n: 3 }, { id: "intervall-4", n: 3 }], { notes: {}, state: fresh() });
    assert.equal(out.length, 10);
    for (let i = 1; i < out.length; i++) assert.notEqual(out[i].from.id, out[i - 1].from.id);
    assert.ok(out.every((q) => q.svg && q.from && q.fromPack.levels.includes(q.from)));
  }
});

test("originText: Paket (Kurzname, J-C4) · Stufe, „Stufe 4“ bricht nicht um", () => {
  assert.equal(originText(lvl("intervall-4").pack, lvl("intervall-4").level), "Intervalle · Stufe 4");
  assert.equal(originText(lvl("akkorde-6").pack, lvl("akkorde-6").level), "Dreiklänge · Stufe 6");
});

test("perLevelOf: Ergebnis je Stufe, Reihenfolge des Plans, weitere Stufen nach erstem Auftreten", () => {
  const log = [{ id: "b", ok: true }, { id: "a", ok: false }, { id: "b", ok: false }, { id: "c", ok: true }, { id: "a", ok: true }];
  assert.deepEqual(perLevelOf(log, ["a", "b"]), [{ id: "a", n: 2, ok: 1 }, { id: "b", n: 2, ok: 1 }, { id: "c", n: 1, ok: 1 }]);
  assert.deepEqual(perLevelOf(log), [{ id: "b", n: 2, ok: 1 }, { id: "a", n: 2, ok: 1 }, { id: "c", n: 1, ok: 1 }]);
  assert.deepEqual(perLevelOf([], ["a"]), [], "Stufen ohne Aufgabe entfallen");
});

test("startMixed: unbekannte Art und Aufgaben ohne q.from sind Fehler", () => {
  const ui = mixedUi(), hooks = { state: fresh(), save() {}, onFinish() {} };
  assert.throws(() => startMixed({ kind: "blitz", items: [mixedItem("noten-3")] }, ui, hooks), /Unbekannte Art/);
  assert.throws(() => startMixed({ kind: "grundlagen", items: [] }, ui, hooks), /ohne Aufgaben/);
  assert.throws(() => startMixed({ kind: "grundlagen", items: [noten.levels[2].question(null)] }, ui, hooks), /q\.from/);
  stop();
});

test("Gemischte Runde: jede Eingabeart im Wechsel (Buchstaben, Namensraster, Auswahlknöpfe, Ziffern, zwei Schritte, namesOnly), ohne Reste der vorigen Aufgabe", () => withDoc(() => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const items = [
      mixedItem("noten-3"),
      mixedItem("noten-7"),
      mixedItem("notenwerte-5"),
      mixedItem("intervall-2"),
      mixedItem("intervall-4", (q) => q.steps && q.steps.length === 2),
      mixedItem("intervall-9"),
      mixedItem("noten-3"),
      mixedItem("notenwerte-5"),
    ];
    const ui = mixedUi(), state = fresh();
    let res = null, saves = 0;
    startMixed({ kind: "grundlagen", items, plan: [{ id: "intervall-2", n: 1 }, { id: "noten-3", n: 2 }] }, ui, { state, save() { saves++; }, onFinish(x) { res = x; } });
    // ohne Hilfen, mit Herkunftszeile
    assert.equal(ui.helps.hidden, true); assert.equal(ui.helps.open, false);
    assert.equal(ui.helpsBody.innerHTML, "");
    assert.equal(ui.origin.hidden, false);
    const expectLetters = (names) => {
      assert.equal(ui.answers.classList.contains("choices"), false);
      assert.equal(ui.answers.classList.contains("names"), names);
      assert.equal(letterBtns(ui), names ? 21 : 7);
      assert.equal(accBtns(ui), names ? 21 : 0);
      assert.equal(ui.answers.hidden, false); assert.equal(ui.piano.hidden, true);
      assert.equal(ui.typed.hidden, !names);
    };
    const expectChoices = (q) => {
      assert.equal(ui.answers.classList.contains("choices"), true);
      assert.equal(ui.answers.classList.contains("names"), false);
      assert.equal(letterBtns(ui), 0);
      assert.deepEqual(ui.answers.querySelectorAll(".btn[data-choice]").map((b) => btnText(ui, b)), choiceSet(q, 0).choices);
      assert.equal(ui.typed.hidden, true); assert.equal(ui.piano.hidden, true);
    };
    // 1. noten-3: Buchstaben, Taste
    assert.equal(ui.origin.textContent, "Noten lesen · Stufe 3");
    assert.equal(currentQuestion(), items[0]);
    expectLetters(false);
    assert.equal(handleKey(key(items[0].answer.letter.toLowerCase(), { preventDefault() {} })), true);
    assert.equal(state.answered, 1); assert.equal(state.correct, 1);
    advance(ui);
    // 2. noten-7: Namensraster, Name tippen und Enter
    assert.equal(ui.count.textContent, "2 / 8");
    assert.equal(ui.origin.textContent, "Noten lesen · Stufe 7");
    expectLetters(true);
    for (const ch of gName(N(items[1].answer.letter, 4, items[1].answer.acc)).toLowerCase()) assert.equal(handleKey(key(ch, { preventDefault() {} })), true);
    assert.equal(handleKey(key("Enter", { preventDefault() {} })), true);
    assert.equal(state.answered, 2); assert.equal(state.correct, 2);
    advance(ui);
    // 3. notenwerte-5: Auswahlknöpfe ohne Ziffern; daneben → wartet auf „Nächste Aufgabe“
    assert.equal(ui.origin.textContent, "Notenwerte · Stufe 5");
    expectChoices(items[2]);
    assert.equal(handleKey(key("1", { preventDefault() {} })), false, "keine Ziffern in Notenwerte 5");
    assert.equal(handleKey(key("c", { preventDefault() {} })), false, "keine Buchstaben bei Auswahlknöpfen");
    const wrong = items[2].choices.find((c) => c !== items[2].answer);
    clickChoice(ui, wrong);
    assert.equal(state.answered, 3); assert.equal(state.correct, 2);
    assert.equal(ui.feedback.className, "feedback bad");
    mock.timers.tick(100000);
    assert.equal(ui.count.textContent, "3 / 8", "nach „daneben“ kein Zeitgeber");
    assert.equal(isWaiting(), true); assert.equal(ui.next.hidden, false); assert.equal(ui.next.textContent, DEMO_NEXT);
    ui.next.onclick();
    // 4. intervall-2: Auswahlknöpfe mit Ziffern
    assert.equal(ui.origin.textContent, "Intervalle · Stufe 2");
    expectChoices(items[3]);
    assert.ok(ui.answers.classList.contains("cols"));
    assert.equal(handleKey(key(String(items[3].choices.indexOf(items[3].answer) + 1), { preventDefault() {} })), true);
    assert.equal(state.correct, 3);
    advance(ui);
    // 5. intervall-4: zwei Schritte
    assert.equal(ui.origin.textContent, "Intervalle · Stufe 4");
    const q5 = items[4];
    expectChoices(q5);
    clickChoice(ui, q5.steps[0].answer);
    assert.equal(state.answered, 4, "nach Schritt 1 noch nicht gezählt");
    mock.timers.tick(DELAY_STEP_OK);
    assert.deepEqual(ui.answers.querySelectorAll(".btn[data-choice]").map((b) => btnText(ui, b)), q5.steps[1].choices);
    clickChoice(ui, q5.steps[1].answer);
    assert.equal(state.answered, 5); assert.equal(state.correct, 4);
    advance(ui);
    // 6. intervall-9: namesOnly, Namensraster (Klick)
    assert.equal(ui.origin.textContent, "Intervalle · Stufe 9");
    expectLetters(true);
    assert.equal(ui.answers.classList.contains("cols"), false, "keine Spalten der vorigen Auswahlknöpfe");
    ui.answers.onclick({ target: letterTarget(items[5].answer) });
    assert.equal(state.answered, 6); assert.equal(state.correct, 5);
    advance(ui);
    // 7. noten-3 nach dem Namensraster: wieder nur sieben Buchstaben
    expectLetters(false);
    ui.answers.onclick({ target: letterTarget(items[6].answer) });
    assert.equal(state.correct, 6);
    advance(ui);
    // 8. notenwerte-5 nach Buchstaben: Auswahlknöpfe ohne Reste
    expectChoices(items[7]);
    clickChoice(ui, items[7].answer);
    assert.equal(state.correct, 7);
    advance(ui);
    // Ende: Ergebnis mit perLevel (Reihenfolge des Plans, dann erstes Auftreten) und log
    assert.ok(res, "Runde beendet");
    assert.equal(res.kind, "grundlagen");
    assert.equal(res.correct, 7); assert.equal(res.total, 8);
    assert.equal(res.gained, 70, "„grundlagen“: 10 je richtige Antwort, kein Bonus");
    assert.equal(res.stars, undefined);
    assert.deepEqual(res.perLevel, [
      { id: "intervall-2", n: 1, ok: 1 }, { id: "noten-3", n: 2, ok: 2 }, { id: "noten-7", n: 1, ok: 1 },
      { id: "notenwerte-5", n: 2, ok: 1 }, { id: "intervall-4", n: 1, ok: 1 }, { id: "intervall-9", n: 1, ok: 1 },
    ]);
    assert.deepEqual(res.log.map((e) => e.id), items.map((q) => q.from.id));
    assert.deepEqual(res.log[4], { id: "intervall-4", ok: true, oks: [true, true] });
    assert.deepEqual(res.log[2], { id: "notenwerte-5", ok: false, oks: [false] });
    assert.deepEqual(res.results, [true, true, false, true, true, true, true, true]);
    // Spielstand: XP und Serie, keine Stufe eingetragen; jede Antwort in der Statistik ihrer eigenen Aufgabe
    assert.equal(state.xp, 70); assert.equal(state.dayStreak, 1);
    assert.deepEqual(state.levels, {});
    assert.equal(state.answered, 8);
    for (const q of items.filter((x) => x.statKey)) assert.ok(state.notes[q.statKey], q.statKey);
    assert.ok(saves >= 9);
    assert.equal(currentQuestion(), null);
  } finally { stop(); mock.timers.reset(); }
}));

test("Gemischte Runde mit Vorliebe „Klaviatur“: Klaviatur bei Buchstaben-Stufen, Namensraster bei namesOnly, Knöpfe bei Auswahl", () => withDoc(() => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const items = [mixedItem("noten-3"), mixedItem("notenwerte-5"), mixedItem("noten-7"), mixedItem("intervall-9")];
    const ui = mixedUi(), state = fresh();
    state.input = "keys";
    let res = null;
    startMixed({ kind: "wiederholen", items }, ui, { state, save() {}, onFinish(x) { res = x; } });
    const keyRect = (q) => ({ closest: () => ({ dataset: { semi: String(midi(q.note)) }, classList: { add() {}, remove() {} } }) });
    // noten-3: Klaviatur statt Buchstaben
    assert.equal(ui.answers.hidden, true); assert.equal(ui.piano.hidden, false);
    assert.ok(ui.piano.innerHTML.includes("<svg"));
    ui.piano.onclick({ target: keyRect(items[0]) });
    assert.equal(state.correct, 1);
    advance(ui);
    // notenwerte-5: Knöpfe, Klaviatur verborgen
    assert.equal(ui.answers.hidden, false); assert.equal(ui.piano.hidden, true);
    assert.ok(ui.answers.classList.contains("choices"));
    clickChoice(ui, items[1].answer);
    advance(ui);
    // noten-7: Klaviatur (Name tippen geht weiterhin), Zeile für den getippten Namen sichtbar
    assert.equal(ui.answers.hidden, true); assert.equal(ui.piano.hidden, false); assert.equal(ui.typed.hidden, false);
    ui.piano.onclick({ target: keyRect(items[2]) });
    assert.equal(state.correct, 3);
    advance(ui);
    // intervall-9: namesOnly – Namensraster trotz Vorliebe „Klaviatur“
    assert.equal(ui.answers.hidden, false); assert.equal(ui.piano.hidden, true);
    assert.ok(ui.answers.classList.contains("names"));
    ui.answers.onclick({ target: letterTarget(items[3].answer) });
    advance(ui);
    assert.ok(res);
    assert.equal(res.correct, 4); assert.equal(res.total, 4);
    // „wiederholen“: 10 je richtige Antwort und 20 · Sterne nach starsFor (4 Richtige: kein Stern)
    assert.equal(res.gained, 40);
    assert.deepEqual(state.levels, {});
    assert.equal(state.input, "keys", "Vorliebe bleibt");
  } finally { stop(); mock.timers.reset(); }
}));

test("Gemischte Runde: Fokus auf einem Antwortknopf fällt beim Neuaufbau nicht auf <body>, sondern geht auf den Antwortbereich", () => withDoc(() => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const items = [mixedItem("noten-3"), mixedItem("notenwerte-5"), mixedItem("noten-3")];
    const ui = mixedUi();
    let focused = 0;
    const doc = { body: {}, activeElement: null };
    ui.answers.ownerDocument = doc; ui.answers.contains = (a) => a === "knopf";
    ui.answers.focus = (o) => { focused++; assert.deepEqual(o, { preventScroll: true }); };
    startMixed({ kind: "grundlagen", items }, ui, { state: fresh(), save() {}, onFinish() {} });
    assert.equal(focused, 0, "zu Beginn kein Verschieben des Fokus");
    // Antwort per Knopf mit Fokus (Tab + Enter), die Runde geht von selbst weiter
    doc.activeElement = "knopf";
    ui.answers.onclick({ target: letterTarget(items[0].answer) });
    advance(ui);
    assert.equal(ui.count.textContent, "2 / 3");
    assert.equal(focused, 1);
    // Fokus woanders (Maus, Tippen, Tastatur ohne Fokus): nichts verschieben
    doc.activeElement = null;
    clickChoice(ui, items[1].answer);
    advance(ui);
    assert.equal(ui.count.textContent, "3 / 3");
    assert.equal(focused, 1);
  } finally { stop(); mock.timers.reset(); }
}));

test("Normale Runde nach einer gemischten: Herkunftszeile verborgen, Hilfen wie bisher", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const ui = mixedUi();
    startMixed({ kind: "grundlagen", items: [mixedItem("noten-3")] }, ui, { state: fresh(), save() {}, onFinish() {} });
    assert.equal(ui.origin.hidden, false);
    startRound(intervalle.levels[0], ui, { state: fresh(), save() {}, onFinish() {} });
    assert.equal(ui.origin.hidden, true);
    assert.equal(ui.helps.hidden, false, "Stufe mit Hilfen");
    assert.ok(ui.helpsBody.innerHTML.includes("keys-static"));
  } finally { stop(); mock.timers.reset(); }
});

// Korrektur nach der Prüfung Welle 11 (J-C3, L-C7): Zahl und Einheit, Vorzeichen und Notenpaare bleiben zusammen
test("keepTogether: geschützte Leerzeichen und Wortverbinder nur für die Anzeige", () => {
  const NB = "\u00a0", WJ = "\u2060";
  assert.equal(keepTogether("e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz"), `e'–${WJ}g': 3${NB}Stufen → Terz · 3${NB}Halbtöne → kleine Terz`);
  assert.equal(keepTogether("as–c' große Terz"), `as–${WJ}c' große Terz`);
  assert.equal(keepTogether("e''–fis'': 2 Halbtöne → Fis"), `e''–${WJ}fis'': 2${NB}Halbtöne → Fis`);
  assert.equal(keepTogether("Vorzeichen ♯ und ♭"), `Vorzeichen${NB}♯ und${NB}♭`);
  assert.equal(keepTogether("wieder in 7 Tagen"), `wieder in 7${NB}Tagen`);
  assert.equal(keepTogether("Punktierte Halbe = 3 Schläge, 2 + 1 = 3"), `Punktierte Halbe = 3${NB}Schläge, 2 + 1 = 3`);
  // nicht angefasst: Strich mit Leerzeichen, Zahlen ohne Einheit, Bauplan
  for (const t of ["Ganz – Ganz – Halb", "2 + 1 = 3", "1 1 ½ 1 1 1 ½", "Stufe 1–8"]) assert.equal(keepTogether(t), t);
});

/* ---------- Welle 12, Schritt 0: Denkschritt mit Noteneingabe ---------- */

import { stepInput, checkStep, levelNoteSteps, NOTE_STEPS, setInput } from "../src/engine.js";

test("stepInput: Art des Antwortbereichs je Schritt; ohne q.steps die Eingabe der Stufe", () => {
  const q = { steps: [{ choices: ["1.", "2."], answer: "2." }, { note: "letters", answer: { letter: "G", acc: 0 } }, { note: "names", answer: { letter: "F", acc: 1 } }] };
  assert.deepEqual(NOTE_STEPS, ["letters", "names"]);
  assert.equal(stepInput(q, 0), "choices");
  assert.equal(stepInput(q, 1), "letters");
  assert.equal(stepInput(q, 2), "names");
  assert.equal(stepInput({ steps: [{ note: "keys", choices: ["a"] }] }, 0), "choices", "unbekannte Art: Auswahl");
  assert.equal(stepInput({}, 0, { input: "choices" }), "choices");
  assert.equal(stepInput({}, 0, { input: "letters" }), "letters");
  assert.equal(stepInput({}, 0, { input: "letters", acc: true }), "names");
  assert.equal(stepInput({}, 0), "letters");
});

test("checkStep: Auswahl genau, Noteneingabe { letter, acc } genau, Klaviatur nach Tonklasse", () => {
  const ch = { choices: ["1.", "2."], answer: "2." };
  assert.equal(checkStep(ch, "2."), true);
  assert.equal(checkStep(ch, "1."), false);
  assert.equal(checkStep(ch, { letter: "G", acc: 0 }), false);
  const g = { note: "letters", answer: { letter: "G", acc: 0 } };
  assert.equal(checkStep(g, { letter: "G", acc: 0 }), true);
  assert.equal(checkStep(g, { letter: "G" }), true, "acc fehlt = 0");
  assert.equal(checkStep(g, { letter: "G", acc: 1 }), false, "Gis ist nicht G");
  assert.equal(checkStep(g, { letter: "A", acc: 0 }), false);
  assert.equal(checkStep(g, 7), true, "Taste G (7 Halbtöne über C)");
  assert.equal(checkStep(g, 8), false);
  const fis = { note: "names", answer: { letter: "F", acc: 1 } };
  assert.equal(checkStep(fis, { letter: "F", acc: 1 }), true);
  assert.equal(checkStep(fis, { letter: "G", acc: -1 }), false, "Schreibweise zählt: Ges ist nicht Fis");
  assert.equal(checkStep(fis, { letter: "F", acc: 0 }), false);
  assert.equal(checkStep(fis, 6), true, "Klaviatur: Tonklasse wie checkNote");
  const b = { note: "names", answer: { letter: "H", acc: -1 } };
  assert.equal(checkStep(b, 10), true);
  assert.equal(checkStep(b, 11), false);
  const c = { note: "letters", answer: { letter: "C", acc: 0 } };
  assert.equal(checkStep(c, 0), true, "oberes und unteres C (data-semi 0)");
  assert.equal(checkStep(g, null), false);
  assert.equal(checkStep(null, "2."), false);
  assert.equal(checkStep({ note: "letters" }, { letter: "G", acc: 0 }), false, "ohne Antwort nie richtig");
});

// Probe-Stufen (nur für die Tests): [Auswahl mit Ziffern, Buchstaben] mit Hilfen und [Buchstaben, Namen] ohne Hilfen
const probeA = (n = N("G", 4)) => ({
  svg: "<svg></svg>", note: n, statKey: "probe:" + gName(n), display: "2. Linie → G", prompt: "Auf welcher Linie liegt die Note?",
  reveal: "Das war ein G.", partial: "Der Name stimmt, die Linie nicht.",
  steps: [
    { prompt: "Auf welcher Linie liegt die Note?", choices: ["1.", "2.", "3.", "4.", "5."], digits: true, answer: "2.", ok: "Richtig: 2. Linie.", bad: "Nicht ganz: 2. Linie." },
    { prompt: "Wie heißt die Note?", note: "letters", answer: { letter: n.letter, acc: n.acc } },
  ],
});
const probeB = () => ({
  svg: "<svg></svg>", note: N("F", 4, 1), statKey: "probe:fis", display: "F → Fis", prompt: "Stammton?",
  reveal: "Das war ein Fis.", partial: "Der Name stimmt, der Stammton nicht.",
  steps: [
    { prompt: "Stammton?", note: "letters", answer: { letter: "F", acc: 0 }, ok: "Richtig: F.", bad: "Nicht ganz: F." },
    { prompt: "Und mit dem Vorzeichen?", note: "names", answer: { letter: "F", acc: 1 } },
  ],
});
const LEVEL_A = { id: "probe-a", no: 1, title: "Probe A", input: "letters", twoSteps: true, helps: ["tabelle"],
  helpText: "Zähle von unten.", helpTable: (c) => `<table data-probe>${c && c.state ? "mit Spielstand" : ""}</table>`,
  keysHint: "Tastatur: 1 bis 5, dann C D E … H", question: () => probeA(), check: () => false };
const LEVEL_B = { id: "probe-b", no: 2, title: "Probe B", input: "letters", twoSteps: true, question: () => probeB(), check: () => false };

test("levelNoteSteps: Noteneingaben der Schritte einer Stufe; bestehende Stufen ohne", () => {
  assert.deepEqual(levelNoteSteps(LEVEL_A), ["letters"]);
  assert.deepEqual(levelNoteSteps(LEVEL_B), ["letters", "names"]);
  assert.deepEqual(levelNoteSteps({ input: "letters" }), []);
  assert.deepEqual(levelNoteSteps(null), []);
  for (const p of PACKS) for (const l of p.levels) assert.deepEqual(levelNoteSteps(l), [], l.id);
});

test("helpsHtml: level.helpTable als Funktion (ctx) => HTML; Text wie bisher; Überschrift mit „Tabelle“", () => {
  const q = probeA();
  const html = helpsHtml(LEVEL_A, q, { state: fresh() });
  assert.ok(html.includes('<div class="help-table-wrap"><table data-probe>mit Spielstand</table></div>'));
  assert.ok(helpsHtml(LEVEL_A, q).includes("<table data-probe></table>"), "ohne ctx: leeres ctx");
  assert.ok(helpsHtml({ ...LEVEL_A, helpTable: "<table>fest</table>" }, q).includes("<table>fest</table>"));
  assert.ok(!helpsHtml({ ...LEVEL_A, helpTable: () => "" }, q).includes("help-table-wrap"), "leere Tabelle: kein Rahmen");
  assert.ok(!helpsHtml({ ...LEVEL_A, helps: ["klaviatur"] }, { ...q, clef: "treble" }).includes("data-probe"), "nur mit „tabelle“");
  assert.equal(helpsTitle(LEVEL_A), "Hilfen: Tabelle");
  assert.equal(helpsTitle({ ...LEVEL_A, helpsTitle: "Hilfen: Merkspruch für die Linien" }), "Hilfen: Merkspruch für die Linien");
});

// Ersatz-DOM mit Buchstaben, Namensraster, Auswahlknöpfen und Klaviatur (Tasten aus data-semi), Fokus über ein
// Ersatz-Dokument
function noteDom() {
  const doc = { body: { isBody: true }, activeElement: null };
  doc.activeElement = doc.body;
  const marks = () => { const s = new Set(); return { set: s, add: (...c) => c.forEach((x) => s.add(x)), remove: (...c) => c.forEach((x) => s.delete(x)), toggle: (c, on) => (on ? s.add(c) : s.delete(c)), contains: (c) => s.has(c) }; };
  const attrs = () => { const a = {}; return { getAttribute: (k) => (k in a ? a[k] : null), setAttribute: (k, v) => { a[k] = v; }, removeAttribute: (k) => { delete a[k]; } }; };
  function el() {
    const e = {
      innerHTML: "", textContent: "", className: "", hidden: false, open: false, ownerDocument: doc,
      style: { props: {}, setProperty(k, v) { this.props[k] = v; }, removeProperty(k) { delete this.props[k]; } },
      classList: marks(), _html: null, _kids: [],
      focus() { doc.activeElement = e; },
      kids() {
        if (e._html !== e.innerHTML) {
          e._html = e.innerHTML;
          const btns = [...e.innerHTML.matchAll(/<button class="btn"([^>]*)>([^<]*)<\/button>/g)].map((m) => {
            const ds = {};
            for (const [, k, v] of m[1].matchAll(/data-([a-z]+)="([^"]*)"/g)) ds[k] = v;
            const b = { tagName: "BUTTON", kind: "btn", dataset: ds, textContent: m[2], classList: marks(), ...attrs(), closest() { return b; }, focus() { doc.activeElement = b; } };
            return b;
          });
          const rects = [...e.innerHTML.matchAll(/<rect[^>]*data-semi="(\d+)"/g)].map((m) => {
            const k = { tagName: "rect", kind: "rect", dataset: { semi: m[1] }, classList: marks(), ...attrs(), closest() { return k; } };
            return k;
          });
          e._kids = btns.concat(rects);
        }
        return e._kids;
      },
      contains(x) { return x === e || e.kids().includes(x); },
      querySelectorAll(sel) {
        if (sel.startsWith("rect")) return e.kids().filter((k) => k.kind === "rect");
        if (sel === ".btn[data-choice]") return e.kids().filter((k) => k.kind === "btn" && k.dataset.choice !== undefined);
        if (sel === ".btn") return e.kids().filter((k) => k.kind === "btn");
        return [];
      },
      querySelector(sel) {
        const m = sel.match(/^\.btn\[data-letter="([A-H])"\](?:\[data-acc="(-?\d)"\])?(:not\(\[data-acc\]\))?$/);
        if (!m) return null;
        return e.kids().find((k) => k.kind === "btn" && k.dataset.letter === m[1] && (m[2] !== undefined ? k.dataset.acc === m[2] : m[3] ? k.dataset.acc === undefined : true)) || null;
      },
    };
    return e;
  }
  const ui = { staff: el(), feedback: el(), count: el(), dots: el(), answers: el(), typed: el(), piano: el(), helps: el(), helpsBody: el(), next: el() };
  ui.next.hidden = true;
  return { ui, doc };
}

function runProbe(level, input = "letters") {
  const { ui, doc } = noteDom();
  const state = fresh(); state.input = input;
  let finished = null;
  startRound(level, ui, { state, save() {}, onFinish(res) { finished = res; } });
  const btns = () => ui.answers.querySelectorAll(".btn");
  const labels = () => btns().map((b) => b.textContent);
  const btn = (text) => { const b = btns().find((x) => x.textContent === text); assert.ok(b, `Knopf ${text}`); return b; };
  const click = (text) => { const b = btn(text); ui.answers.onclick({ target: b }); return b; };
  const key = (k) => handleKey({ key: k, preventDefault() {} });
  const rect = (semi) => ui.piano.querySelectorAll("rect").find((k) => k.dataset.semi === String(semi));
  const tap = (semi) => { const k = rect(semi); ui.piano.onclick({ target: k }); return k; };
  return { ui, doc, state, btns, labels, btn, click, key, rect, tap, next: () => ui.next.onclick(), done: () => finished };
}

test("Noten-Schritt [Auswahl, Buchstaben]: Reihenfolge der Antwortbereiche, Tastatur je Schritt, Teilerfolg", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const r = runProbe(LEVEL_A);
    // Schritt 1: Auswahlknöpfe in einer Reihe, keine Zeile #pTyped, keine Klaviatur
    assert.deepEqual(r.labels(), ["1.", "2.", "3.", "4.", "5."]);
    assert.ok(r.ui.answers.classList.contains("choices") && r.ui.answers.classList.contains("short"));
    assert.equal(r.ui.answers.style.props["--cols"], 5);
    assert.equal(r.ui.answers.hidden, false); assert.equal(r.ui.piano.hidden, true); assert.equal(r.ui.typed.hidden, true);
    assert.equal(r.ui.helps.hidden, false);
    assert.ok(r.ui.helpsBody.innerHTML.includes("<table data-probe>mit Spielstand</table>"));
    // Buchstabe in einem Auswahl-Schritt wird nicht gewertet
    assert.equal(r.key("G"), false);
    assert.equal(r.state.answered, 0); assert.equal(r.btns().filter((b) => b.classList.contains("ok") || b.classList.contains("bad")).length, 0);
    // 1. Aufgabe: Ziffer 2 (richtig), dann Buchstabe G (richtig)
    assert.equal(r.key("2"), true);
    assert.equal(r.ui.feedback.textContent, "Richtig: 2. Linie.");
    assert.equal(r.key("G"), false, "gesperrt in der Pause");
    mock.timers.tick(DELAY_STEP_OK);
    assert.deepEqual(r.labels(), [...LETTERS]);
    assert.ok(!r.ui.answers.classList.contains("choices") && !r.ui.answers.classList.contains("names"));
    assert.equal(r.ui.answers.style.props["--cols"], undefined);
    assert.equal(r.ui.feedback.textContent, "Wie heißt die Note?");
    assert.equal(r.key("5"), false, "Ziffern nur im Auswahl-Schritt");
    assert.equal(r.key("G"), true);
    assert.equal(r.state.answered, 1); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, keepTogether("Richtig! 2. Linie → G"));
    assert.ok(r.btn("G").classList.contains("ok"));
    assert.equal(isWaiting(), true, "Stufe mit Hilfen wartet");
    r.next();
    // 2. Aufgabe: wieder die Auswahl; Schritt 1 daneben → „Weiter zu Schritt 2“, richtiger Knopf markiert
    assert.deepEqual(r.labels(), ["1.", "2.", "3.", "4.", "5."]);
    const bad = r.click("3.");
    assert.ok(bad.classList.contains("bad")); assert.ok(r.btn("2.").classList.contains("ok"));
    assert.equal(r.ui.feedback.textContent, "Nicht ganz: 2. Linie.");
    mock.timers.tick(100000);
    assert.equal(r.ui.next.hidden, false); assert.equal(r.ui.next.textContent, NEXT_STEP);
    assert.equal(r.key("G"), false, "während des Wartens zählt kein Buchstabe");
    r.next();
    assert.deepEqual(r.labels(), [...LETTERS]);
    assert.equal(r.btns().filter((b) => b.classList.contains("ok") || b.classList.contains("bad")).length, 0, "neue Knöpfe ohne Markierung");
    r.click("G");
    assert.equal(r.state.answered, 2); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, "Der Name stimmt, die Linie nicht.");
    assert.equal(r.ui.feedback.className, "feedback part");
    r.next();
    // 3. Aufgabe: Schritt 1 richtig, Schritt 2 daneben → richtige Note markiert, Auflösung
    r.click("2."); mock.timers.tick(DELAY_STEP_OK);
    const wrong = r.click("A");
    assert.ok(wrong.classList.contains("bad")); assert.ok(r.btn("G").classList.contains("ok"));
    assert.equal(r.btn("G").getAttribute("aria-label"), "G, richtig");
    assert.equal(r.ui.feedback.textContent, "Das war ein G.");
    assert.equal(r.ui.feedback.className, "feedback bad");
    r.next();
    for (let i = 3; i < ROUND_LENGTH; i++) { r.key("2"); mock.timers.tick(DELAY_STEP_OK); r.key("G"); r.next(); }
    const res = r.done();
    assert.ok(res);
    assert.equal(res.correct, 8);
    assert.deepEqual(res.log.slice(0, 3).map((e) => e.oks), [[true, true], [false, true], [true, false]]);
    assert.deepEqual(res.results.slice(0, 3), [true, false, false]);
  } finally { stop(); mock.timers.reset(); }
});

test("Noten-Schritt mit Klaviatur: nur im Noten-Schritt, richtige Taste markiert, Wechsel der Eingabe mitten in Schritt 2", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const r = runProbe(LEVEL_A, "keys");
    // Schritt 1 (Auswahl): Knöpfe sichtbar, Klaviatur verborgen, eine Taste zählt nicht
    assert.equal(r.ui.answers.hidden, false); assert.equal(r.ui.piano.hidden, true);
    r.tap(7);
    assert.equal(r.state.answered, 0); assert.equal(r.ui.feedback.textContent, "Auf welcher Linie liegt die Note?");
    r.click("2."); mock.timers.tick(DELAY_STEP_OK);
    // Schritt 2: Klaviatur statt Buchstaben
    assert.equal(r.ui.answers.hidden, true); assert.equal(r.ui.piano.hidden, false); assert.equal(r.ui.typed.hidden, true);
    const k = r.tap(7);
    assert.ok(k.classList.contains("ok"));
    assert.equal(r.state.correct, 1);
    r.next();
    // neue Aufgabe: wieder Knöpfe für Schritt 1, Klaviatur ohne Markierung und verborgen
    assert.equal(r.ui.answers.hidden, false); assert.equal(r.ui.piano.hidden, true);
    assert.deepEqual(r.labels(), ["1.", "2.", "3.", "4.", "5."]);
    assert.ok(!r.rect(7).classList.contains("ok"));
    r.click("2."); mock.timers.tick(DELAY_STEP_OK);
    // daneben auf der Klaviatur: die richtige Taste (G) grün
    const w = r.tap(9);
    assert.ok(w.classList.contains("bad")); assert.ok(r.rect(7).classList.contains("ok"));
    assert.equal(r.ui.feedback.textContent, "Das war ein G.");
    r.next();
    // Wechsel der Eingabe mitten in Schritt 2: Klaviatur → Buchstaben → Antwort per Knopf
    r.click("2."); mock.timers.tick(DELAY_STEP_OK);
    assert.equal(r.ui.piano.hidden, false);
    setInput("letters");
    assert.equal(r.ui.piano.hidden, true); assert.equal(r.ui.answers.hidden, false);
    assert.deepEqual(r.labels(), [...LETTERS]);
    r.click("G");
    assert.equal(r.state.answered, 3); assert.equal(r.state.correct, 2);
    r.next();
    // und zurück: in Schritt 1 bleibt die Auswahl sichtbar, auch mit „Klaviatur“
    setInput("keys");
    assert.equal(r.ui.answers.hidden, false); assert.equal(r.ui.piano.hidden, true);
    r.click("2."); mock.timers.tick(DELAY_STEP_OK);
    assert.equal(r.ui.piano.hidden, false); assert.equal(r.ui.answers.hidden, true);
  } finally { stop(); mock.timers.reset(); }
});

test("Noten-Schritt [Buchstaben, Namen]: Namensraster, getippter Name mit Enter, ungültiger Name zählt nicht", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const r = runProbe(LEVEL_B);
    assert.equal(r.ui.helps.hidden, true);
    // Schritt 1: Buchstaben C … H, keine Zeile #pTyped
    assert.deepEqual(r.labels(), [...LETTERS]);
    assert.ok(!r.ui.answers.classList.contains("names"));
    assert.equal(r.ui.typed.hidden, true);
    assert.equal(r.key("f"), true, "ein Buchstabe antwortet sofort");
    assert.equal(r.ui.feedback.textContent, "Richtig: F.");
    mock.timers.tick(DELAY_STEP_OK);
    // Schritt 2: Namensraster mit 21 Namen, Zeile #pTyped sichtbar
    assert.equal(r.btns().length, 21);
    assert.ok(r.ui.answers.classList.contains("names"));
    assert.equal(r.ui.typed.hidden, false);
    assert.equal(r.ui.feedback.textContent, "Und mit dem Vorzeichen?");
    // ungültiger Name: Hinweis, zählt nicht
    r.key("x"); r.key("y");
    assert.equal(r.ui.typed.textContent, typedText("xy"));
    assert.equal(r.key("Enter"), true);
    assert.equal(r.ui.typed.textContent, typedText("xy", true));
    assert.equal(r.state.answered, 0);
    r.key("Escape");
    // richtiger Name: fis + Enter
    r.key("f"); r.key("i"); r.key("s");
    assert.equal(r.ui.typed.textContent, typedText("fis"));
    r.key("Enter");
    assert.equal(r.state.answered, 1); assert.equal(r.state.correct, 1);
    const fis = r.btns().find((b) => b.dataset.letter === "F" && b.dataset.acc === "1");
    assert.ok(fis.classList.contains("ok"));
    assert.equal(r.ui.feedback.textContent, keepTogether("Richtig! F → Fis"));
    // ohne Hilfen, kurze Rückmeldung: weiter von selbst; Schritt 1 wieder mit Buchstaben, ohne #pTyped
    assert.equal(isWaiting(), false);
    mock.timers.tick(DELAY_OK);
    assert.equal(r.ui.count.textContent, "2 / 10");
    assert.deepEqual(r.labels(), [...LETTERS]);
    assert.ok(!r.ui.answers.classList.contains("names"));
    assert.equal(r.ui.typed.hidden, true); assert.equal(r.ui.typed.textContent, "");
    // Schritt 1 daneben (G) → F markiert, „Weiter zu Schritt 2“; Ges ist nicht Fis
    r.click("G");
    assert.ok(r.btn("F").classList.contains("ok"));
    assert.equal(r.ui.next.textContent, NEXT_STEP);
    r.next();
    assert.equal(r.btns().length, 21);
    r.click("Ges");
    assert.equal(r.ui.feedback.textContent, "Das war ein Fis.");
    assert.ok(r.btns().find((b) => b.dataset.letter === "F" && b.dataset.acc === "1").classList.contains("ok"));
    r.next();
    // Teilerfolg über das Raster
    r.click("E"); r.next(); r.click("Fis");
    assert.equal(r.ui.feedback.textContent, "Der Name stimmt, der Stammton nicht.");
    assert.equal(r.ui.feedback.className, "feedback part");
    assert.equal(r.state.answered, 3); assert.equal(r.state.correct, 1);
  } finally { stop(); mock.timers.reset(); }
});

test("Noten-Schritt [Buchstaben, Namen] mit Klaviatur: #pTyped nur im Schritt „names“, Tippen geht auch dort", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const r = runProbe(LEVEL_B, "keys");
    assert.equal(r.ui.piano.hidden, false); assert.equal(r.ui.answers.hidden, true); assert.equal(r.ui.typed.hidden, true);
    r.tap(5); mock.timers.tick(DELAY_STEP_OK);
    assert.equal(r.ui.piano.hidden, false); assert.equal(r.ui.typed.hidden, false);
    r.key("f"); r.key("i"); r.key("s"); r.key("Enter");
    assert.equal(r.state.correct, 1);
    mock.timers.tick(DELAY_OK);
    assert.equal(r.ui.typed.hidden, true);
    // Wechsel mitten in Schritt 2 zum Namensraster
    r.tap(5); mock.timers.tick(DELAY_STEP_OK);
    setInput("letters");
    assert.equal(r.ui.answers.hidden, false); assert.equal(r.ui.piano.hidden, true); assert.equal(r.ui.typed.hidden, false);
    assert.equal(r.btns().length, 21);
    r.click("Fis");
    assert.equal(r.state.correct, 2);
  } finally { stop(); mock.timers.reset(); }
});

test("Noten-Schritt: Fokus bleibt im Antwortbereich, wenn die Knöpfe neu entstehen", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const r = runProbe(LEVEL_A);
    // Schritt 1 richtig per Knopf (Fokus auf dem Knopf), nach der Pause entstehen neue Knöpfe
    const b = r.btn("2."); b.focus();
    r.ui.answers.onclick({ target: b });
    mock.timers.tick(DELAY_STEP_OK);
    assert.equal(r.doc.activeElement, r.ui.answers, "Fokus auf dem Antwortbereich, nicht auf <body>");
    r.key("G"); r.next();
    // mit „Weiter zu Schritt 2“ (Fokus auf dem Knopf, der verschwindet)
    r.click("3."); r.ui.next.focus(); r.next();
    assert.equal(r.doc.activeElement, r.ui.answers);
    stop();
    // Klaviatur: nach Schritt 1 geht der Fokus auf die sichtbare Klaviatur
    const k = runProbe(LEVEL_A, "keys");
    const c = k.btn("2."); c.focus();
    k.ui.answers.onclick({ target: c });
    mock.timers.tick(DELAY_STEP_OK);
    assert.equal(k.doc.activeElement, k.ui.piano);
    // ohne Fokus im Antwortbereich wird nichts fokussiert
    k.tap(7); k.next();
    k.doc.activeElement = k.doc.body;
    k.click("2."); mock.timers.tick(DELAY_STEP_OK);
    assert.equal(k.doc.activeElement, k.doc.body);
  } finally { stop(); mock.timers.reset(); }
});

test("Noten-Schritt: Fokus bleibt auch zur nächsten Aufgabe im Antwortbereich (Knöpfe entstehen neu)", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    // ohne Hilfen: nach „richtig“ geht es von selbst weiter, das Namensraster wird wieder zu C … H
    const r = runProbe(LEVEL_B);
    r.click("F"); mock.timers.tick(DELAY_STEP_OK);
    const fis = r.btn("Fis"); fis.focus();
    r.ui.answers.onclick({ target: fis });
    mock.timers.tick(DELAY_OK);
    assert.deepEqual(r.labels(), [...LETTERS]);
    assert.equal(r.doc.activeElement, r.ui.answers, "Fokus auf dem Antwortbereich, nicht auf <body>");
    // mit Hilfen: Fokus auf dem Buchstaben, weiter mit Enter (der Fokus liegt nicht auf „Nächste Aufgabe“)
    stop();
    const a = runProbe(LEVEL_A);
    a.key("2"); mock.timers.tick(DELAY_STEP_OK);
    const g = a.btn("G"); g.focus();
    a.ui.answers.onclick({ target: g });
    assert.equal(a.key("Enter"), true);
    assert.deepEqual(a.labels(), ["1.", "2.", "3.", "4.", "5."]);
    assert.equal(a.doc.activeElement, a.ui.answers);
    // ohne Fokus im Antwortbereich wird nichts fokussiert
    a.doc.activeElement = a.doc.body;
    a.key("2"); mock.timers.tick(DELAY_STEP_OK); a.key("G"); a.key("Enter");
    assert.equal(a.doc.activeElement, a.doc.body);
  } finally { stop(); mock.timers.reset(); }
});

test("Bestehende Stufen mit Buchstaben: der Fokus bleibt zur nächsten Aufgabe auf dem Knopf (nichts entsteht neu)", () => {
  setMuted(true);
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const level = { id: "probe-c", no: 3, title: "Probe C", input: "letters",
      question: () => ({ svg: "<svg></svg>", note: N("G", 4), statKey: "probe:g", display: "G", reveal: "Das war ein G." }),
      check: (q, v) => (typeof v === "number" ? v === 7 : v.letter === "G") };
    const r = runProbe(level);
    const g = r.btn("G"); g.focus();
    r.ui.answers.onclick({ target: g });
    mock.timers.tick(DELAY_OK);
    assert.equal(r.ui.count.textContent, "2 / 10");
    assert.equal(r.doc.activeElement, g);
  } finally { stop(); mock.timers.reset(); }
});

test("Gemischte Runden: Stufen ohne Hilfen haben keine Schritte mit Noteneingabe", () => {
  for (const p of PACKS) for (const l of p.levels) {
    if (hasHelps(l)) continue;
    let prev = null; const round = [];
    for (let i = 0; i < 200; i++) {
      prev = l.question(prev, { notes: {}, round });
      round.push(prev);
      assert.ok(!(prev.steps || []).some((s) => NOTE_STEPS.includes(s.note)), l.id);
    }
  }
});
