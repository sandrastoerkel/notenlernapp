import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  starsHtml, effectiveInput, makeRound, findLevel, nextLevel, countAnswer, feedbackText,
  resultMessage, dotsHtml, lettersHtml, namesHtml, usesNames, nameKey, typedText, NAME_MAX,
  choicesHtml, choicesClass, choiceCols, keyAction, blitzPoints, notesToPlay,
  playMode, revealedSvg, svgResultClass, playSchedule, rhythmEnd, answerDelay, PLAY_GAP, BEAT_MS, RHYTHM_TAIL, DELAY_OK, DELAY_BAD,
  choiceSet, setClass, stepsFeedback, digitAction, helpsHtml, hasHelps, HELP_FROM, helpFrom, helpsTitle, DELAY_STEP_OK, DELAY_STEP_BAD,
  startRound, stop, handleKey, ROUND_LENGTH, isWaiting, DEMO_LABEL, DEMO_WAIT, DEMO_READY, DEMO_NEXT, waitsForNext, silenceTones,
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
  assert.ok(h.startsWith('<p class="small help-text">T</p><div class="help-grid"><div class="help-keys">'));
  assert.ok(h.includes('data-midi="36" data-id="w0"') && h.includes('data-midi="60" data-id="w14"'));
  assert.deepEqual([...h.matchAll(/class="[wb]key mark" data-midi="(\d+)"/g)].map((m) => +m[1]), [40, 48]);
  assert.ok(!h.includes("<table"));
  assert.ok(helpsHtml({ helps: ["tabelle"], helpTable: "<table></table>" }, {}).includes("<table></table>"));
  // ohne level.demo kein Knopf „Vorführen“; mit demo gesperrt (verriete die Antwort)
  assert.ok(!h.includes("data-demo"));
  const d = helpsHtml({ ...level, demo: () => null }, { clef: "treble" });
  assert.ok(d.startsWith(`<div class="help-head"><p class="small help-text">T</p><button class="btn" data-demo-btn disabled title="${DEMO_WAIT}">${DEMO_LABEL}</button></div>`));
  assert.ok(d.indexOf("data-demo-btn") < d.indexOf("help-grid"), "Knopf über Klaviatur und Tabelle");
});

test("helpsHtml: q.helpFrom (optional) verschiebt die Klaviatur, ohne das Feld wie bisher", () => {
  const level = { helps: ["klaviatur"] };
  assert.equal(helpFrom({ clef: "bass" }), 36);
  assert.equal(helpFrom({ clef: "treble" }), 60);
  assert.equal(helpFrom({}), 60);
  assert.equal(helpFrom({ clef: "treble", helpFrom: 48 }), 48);
  const h = helpsHtml(level, { clef: "treble", helpFrom: 48, helpMarks: [N("H", 3, -1)] });
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
    // Stufe mit Hilfen: kein Weitergehen nach der Pause, die Runde wartet auf „Nächste Aufgabe“
    assert.equal(r.ui.count.textContent, "1 / 10"); assert.equal(isWaiting(), true); assert.equal(r.ui.next.hidden, false);
    r.next();
    assert.equal(r.ui.next.hidden, true);
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
    mock.timers.tick(DELAY_BAD); r.next();
    assert.equal(r.ui.helps.open, true, "Hilfen bleiben offen, wenn du sie geöffnet hast");
    // 3. Aufgabe: Zahl richtig per Ziffer, Qualität daneben
    const e = { key: "3", preventDefault() {} };
    assert.equal(handleKey(e), true);
    mock.timers.tick(DELAY_STEP_OK);
    assert.equal(handleKey({ key: "1", preventDefault() {} }), false, "Ziffern nur im ersten Schritt");
    r.click("große Terz");
    assert.equal(r.state.answered, 3); assert.equal(r.state.correct, 1);
    assert.equal(r.ui.feedback.textContent, item.reveal);
    mock.timers.tick(DELAY_BAD); r.next();
    // Rest der Runde richtig
    for (let i = 3; i < ROUND_LENGTH; i++) {
      r.click("Terz"); mock.timers.tick(DELAY_STEP_OK); r.click("kleine Terz"); mock.timers.tick(DELAY_OK); r.next();
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
    click("Terz");
    assert.equal(btn.disabled, true, "nach dem ersten Schritt noch gesperrt");
    mock.timers.tick(DELAY_STEP_OK);
    click("kleine Terz");
    assert.equal(btn.disabled, false, "nach der Antwort frei");
    assert.equal(btn.title, DEMO_READY);
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
    mock.timers.tick(DELAY_BAD * 100);
    assert.equal(r.ui.count.textContent, "1 / 10"); assert.equal(isWaiting(), true); assert.equal(r.ui.next.hidden, false);
    assert.equal(key(digit), false, "während des Wartens keine Antwort");
    assert.equal(key("x"), false);
    // Enter auf einem Knopf der Vorführung bleibt bei diesem Knopf
    assert.equal(key("Enter", { closest: (s) => (s.includes("[data-act]") ? {} : null) }), false);
    assert.equal(key("Enter"), true);
    assert.equal(r.ui.count.textContent, "2 / 10"); assert.equal(isWaiting(), false); assert.equal(r.ui.next.hidden, true);
    key(digit); mock.timers.tick(DELAY_BAD * 100);
    assert.equal(key(" "), true, "Leertaste geht ebenfalls weiter");
    for (let i = 2; i < ROUND_LENGTH - 1; i++) { key(digit); r.next(); }
    assert.equal(r.done(), null, "nach der letzten Antwort noch nicht beendet");
    assert.equal(r.ui.next.hidden, true);
    key(digit); mock.timers.tick(DELAY_BAD * 100);
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
