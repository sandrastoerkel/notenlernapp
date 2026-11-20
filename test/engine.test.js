import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  starsHtml, effectiveInput, makeRound, findLevel, nextLevel, countAnswer, feedbackText,
  resultMessage, dotsHtml, lettersHtml, namesHtml, usesNames, nameKey, typedText, NAME_MAX,
  choicesHtml, choicesClass, choiceCols, keyAction, blitzPoints, notesToPlay,
  playMode, revealedSvg, svgResultClass, playSchedule, rhythmEnd, answerDelay, PLAY_GAP, BEAT_MS, RHYTHM_TAIL, DELAY_OK, DELAY_BAD,
  choiceSet, setClass, stepsFeedback, digitAction, helpsHtml, hasHelps, HELP_FROM, DELAY_STEP_OK, DELAY_STEP_BAD,
  startRound, stop, handleKey, ROUND_LENGTH,
} from "../src/engine.js";
import { mock } from "node:test";
import { setMuted } from "../src/audio.js";
import intervalle, * as intervalleMod from "../src/packs/intervalle.js";
import { toneEnd } from "../src/audio.js";
import { PACKS } from "../src/packs/index.js";
import noten from "../src/packs/noten.js";
import { fresh } from "../src/store.js";
import { N, same, gName, LETTERS } from "../src/music.js";
import akkorde from "../src/packs/akkorde.js";

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
  const level = { question(prev, ctx) { seen.push(ctx); return { id: k++ }; } };
  const ctx = { notes: {} };
  assert.equal(makeRound(level, 3, ctx).length, 3);
  assert.ok(seen.every((c) => c === ctx));
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

test("svgResultClass: ganze Zeile ok/bad, mit keepRow keine Klasse", () => {
  assert.equal(svgResultClass({}, true), "ok");
  assert.equal(svgResultClass({}, false), "bad");
  assert.equal(svgResultClass({ keepRow: false }, false), "bad");
  assert.equal(svgResultClass({ keepRow: true }, true), "");
  assert.equal(svgResultClass({ keepRow: true }, false), "");
});

test("keepRow: nur Tonleitern Stufe 3 bis 5 und Intervalle 8 und 9 (Bauen), alle anderen Stufen färben die ganze Zeile", () => {
  const keep = ["tonleitern-3", "tonleitern-4", "tonleitern-5", "intervall-8", "intervall-9"];
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
  assert.match(src, /rc = svgResultClass\(q, ok\)/);
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
  assert.ok(h.startsWith('<p class="small">T</p>'));
  assert.ok(h.includes('data-midi="36" data-id="w0"') && h.includes('data-midi="60" data-id="w14"'));
  assert.deepEqual([...h.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]), [40, 48]);
  assert.ok(!h.includes("<table"));
  assert.ok(helpsHtml({ helps: ["tabelle"], helpTable: "<table></table>" }, {}).includes("<table></table>"));
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
  const ui = { staff: fakeEl(), feedback: fakeEl(), count: fakeEl(), dots: fakeEl(), answers: fakeEl(), typed: fakeEl(), piano: fakeEl(), helps: fakeEl(), helpsBody: fakeEl() };
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
  return { ui, state, click, done: () => finished, buttons: () => ui.answers.querySelectorAll(".btn[data-choice]").map((b) => choiceSetFor(ui, b)) };
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
    assert.equal(r.ui.feedback.textContent, "Welches Rahmenintervall?");
    assert.deepEqual(r.buttons(), ["Prime", "Sekunde", "Terz", "Quarte", "Quinte", "Sexte", "Septime", "Oktave"]);
    assert.ok(r.ui.answers.classList.contains("cols"));
    // 1. Aufgabe: richtig, richtig
    r.click("Terz");
    assert.equal(r.ui.feedback.textContent, "Richtig: e'–g': 3 Stufen → Terz.");
    assert.equal(r.state.answered, 0, "nach Schritt 1 noch nicht gezählt");
    r.click("Quarte"); // gesperrt während der Pause: zählt nicht
    mock.timers.tick(DELAY_STEP_OK);
    assert.deepEqual(r.buttons(), ["kleine Terz", "große Terz"]);
    assert.equal(r.ui.feedback.textContent, "e'–g': 3 Stufen → Terz. Welche Terz? Zähle die Halbtöne.");
    r.click("kleine Terz");
    assert.equal(r.state.answered, 1); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, "Richtig! e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz");
    mock.timers.tick(DELAY_OK);
    // Hilfen bleiben, wie sie waren (hier: zu), Inhalt neu
    assert.equal(r.ui.helps.open, false);
    // 2. Aufgabe: Zahl daneben, dann trotzdem die Qualitäten der richtigen Zahl; zählt als daneben
    r.ui.helps.open = true;
    r.click("Quarte");
    assert.equal(r.ui.feedback.textContent, "Nicht ganz: e'–g': 3 Stufen → Terz.");
    mock.timers.tick(DELAY_STEP_BAD);
    assert.deepEqual(r.buttons(), ["kleine Terz", "große Terz"]);
    r.click("kleine Terz");
    assert.equal(r.state.answered, 2); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, item.partial);
    assert.deepEqual(r.state.notes["kleine Terz"].hist, "10");
    mock.timers.tick(DELAY_BAD);
    assert.equal(r.ui.helps.open, true, "Hilfen bleiben offen, wenn du sie geöffnet hast");
    // 3. Aufgabe: Zahl richtig per Ziffer, Qualität daneben
    const e = { key: "3", preventDefault() {} };
    assert.equal(handleKey(e), true);
    mock.timers.tick(DELAY_STEP_OK);
    assert.equal(handleKey({ key: "1", preventDefault() {} }), false, "Ziffern nur im ersten Schritt");
    r.click("große Terz");
    assert.equal(r.state.answered, 3); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, item.reveal);
    mock.timers.tick(DELAY_BAD);
    // Rest der Runde richtig
    for (let i = 3; i < ROUND_LENGTH; i++) {
      r.click("Terz"); mock.timers.tick(DELAY_STEP_OK); r.click("kleine Terz"); mock.timers.tick(DELAY_OK);
    }
    const res = r.done();
    assert.ok(res);
    assert.equal(res.correct, 8); assert.equal(res.total, 10);
    assert.deepEqual(res.results.slice(0, 3), [true, false, false]);
    assert.equal(r.state.answered, 10);
    assert.deepEqual(r.state.levels["intervall-5"], { stars: 2, best: 8, played: 1 });
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
