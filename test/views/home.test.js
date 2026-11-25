// Startseite (Welle 11, Schritt 8): Karte „Heute“ und „↻ wieder dran“ an fälligen Stufen (reine Teile)
import { test } from "node:test";
import assert from "node:assert/strict";
import { todayCard, continueText, reviewListText, levelHtml, againHtml, packShort, streakText, BOX_EMPTY_TEXT, REVIEW_START } from "../../src/views/home.js";
import { PACKS } from "../../src/packs/index.js";
import { fresh, recordRound } from "../../src/store.js";
import { afterRound, applyReview, reviewPlan, due } from "../../src/repeat.js";
import { findLevel } from "../../src/engine.js";

const NB = " ";
const T = "2026-11-25";
const pack = (id) => PACKS.find((p) => p.id === id);
const lv = (id) => findLevel(PACKS, id).level;
const st = (rep, extra = {}) => Object.assign(fresh(), { rep }, extra);

test("Kurzname der Pakete: „Notenwerte“, „Dreiklänge“, sonst der Titel", () => {
  assert.deepEqual(PACKS.map(packShort), ["Noten lesen", "Notenwerte", "Intervalle", "Tonleitern", "Dreiklänge"]);
});

test("„Weiter üben“ nennt Paket und Stufe, nie gespielt: „Starten“", () => {
  assert.equal(continueText(fresh(), PACKS), `Starten: Noten lesen, Stufe${NB}1`);
  const s = Object.assign(fresh(), { current: "tonleitern-6", levels: { "tonleitern-6": { played: 1, best: 6, stars: 1 } } });
  assert.equal(continueText(s, PACKS), `Weiter üben: Tonleitern, Stufe${NB}6`);
  assert.equal(continueText(Object.assign(fresh(), { current: "akkorde-2" }), PACKS), `Starten: Dreiklänge, Stufe${NB}2`);
});

test("todayCard: etwas fällig – „Wiederholen“, Aufzählung mit „und“, Hauptknopf „Wiederholung starten“", () => {
  const s = st({
    "intervall-4": { fach: 2, faellig: "2026-11-20", zuletzt: "2026-11-17" },
    "tonleitern-5": { fach: 1, faellig: "2026-11-21", zuletzt: "2026-11-20" },
    "noten-7": { fach: 3, faellig: "2026-11-22", zuletzt: "2026-11-15" },
    "noten-8": { fach: 1, faellig: "2026-11-30", zuletzt: "2026-11-24" },
  }, { current: "tonleitern-6", levels: { "tonleitern-6": { played: 1, best: 5, stars: 1 } } });
  const c = todayCard(s, PACKS, T);
  assert.equal(c.title, "Wiederholen");
  assert.equal(c.line, `10 Aufgaben aus Intervalle${NB}4, Tonleitern${NB}5 und Noten lesen${NB}7`);
  assert.equal(c.review, REVIEW_START);
  assert.equal(c.review, "Wiederholung starten");
  assert.equal(c.cont, `Weiter üben: Tonleitern, Stufe${NB}6`);
  assert.equal(c.small, "");
  // zwei fällige Stufen, eine fällige Stufe
  assert.equal(reviewListText(PACKS, [{ id: "akkorde-1", n: 5 }, { id: "notenwerte-5", n: 5 }]), `10 Aufgaben aus Dreiklänge${NB}1 und Notenwerte${NB}5`);
  assert.equal(reviewListText(PACKS, [{ id: "noten-3", n: 10 }]), `10 Aufgaben aus Noten lesen${NB}3`);
  // lange Pause: viele fällig, die Karte nennt nur die nächste Runde (höchstens drei Stufen), keine Zahl des Versäumten
  const many = {};
  for (const id of ["noten-1", "noten-2", "noten-3", "noten-4", "noten-5", "noten-6", "noten-7"]) many[id] = { fach: 2, faellig: "2026-10-01", zuletzt: "2026-09-28" };
  const m = todayCard(st(many), PACKS, T);
  assert.equal(m.line, `10 Aufgaben aus Noten lesen${NB}1, Noten lesen${NB}2 und Noten lesen${NB}3`);
  assert.ok(!/7|sieben|überfällig|versäumt/i.test(Object.values(m).join(" ")));
});

test("todayCard: nichts fällig, Kasten nicht leer – „Nächste Wiederholung: morgen / in 3 Tagen“", () => {
  let c = todayCard(st({ "noten-3": { fach: 1, faellig: "2026-11-26", zuletzt: T } }), PACKS, T);
  assert.equal(c.title, "Bereit für eine Runde?");
  assert.equal(c.review, null);
  assert.equal(c.small, "Nächste Wiederholung: morgen");
  assert.equal(c.line, streakText(fresh()));
  c = todayCard(st({ "noten-3": { fach: 2, faellig: "2026-11-28", zuletzt: T }, "noten-6": { fach: 4, faellig: "2026-12-20", zuletzt: T } }), PACKS, T);
  assert.equal(c.small, "Nächste Wiederholung: in 3 Tagen");
  // Serie
  // Serie: bis gestern geübt → mit dem Zusatz; heute schon geübt → nur die Zahl; Serie gerissen → allgemeiner Satz
  const box = { "noten-3": { fach: 1, faellig: "2026-11-26", zuletzt: T } };
  c = todayCard(st(box, { dayStreak: 4, lastDay: "2026-11-24" }), PACKS, T);
  assert.equal(c.line, "4 Tage in Folge geübt. Eine Runde heute hält die Serie am Leben.");
  c = todayCard(st(box, { dayStreak: 4, lastDay: T }), PACKS, T);
  assert.equal(c.line, "4 Tage in Folge geübt.");
  c = todayCard(st(box, { dayStreak: 4, lastDay: "2026-11-20" }), PACKS, T);
  assert.equal(c.line, streakText(fresh()));
});

test("todayCard: Kasten leer – wie bisher, dazu der Satz zum Kasten", () => {
  const c = todayCard(fresh(), PACKS, T);
  assert.equal(c.title, "Bereit für eine Runde?");
  assert.equal(c.review, null);
  assert.equal(c.cont, `Starten: Noten lesen, Stufe${NB}1`);
  assert.equal(c.small, BOX_EMPTY_TEXT);
  assert.equal(BOX_EMPTY_TEXT, "Was du mit 8 von 10 schaffst, kommt nach einem Tag zum Wiederholen wieder.");
  // Einträge zu Stufen mit Hilfen zählen nicht als fällig
  assert.equal(todayCard(st({ "intervall-3": { fach: 1, faellig: "2026-11-20", zuletzt: null } }), PACKS, T).review, null);
});

test("Stufenkarte: „↻ wieder dran“ nur an fälligen Stufen, das Zeichen wird nicht vorgelesen", () => {
  const s = st({ "noten-3": { fach: 1, faellig: T, zuletzt: null } }, { levels: { "noten-3": { played: 1, best: 9, stars: 3 } } });
  const set = new Set(due(s, PACKS, T));
  assert.ok(levelHtml(s, pack("noten"), lv("noten-3"), set).includes(againHtml()));
  assert.ok(!levelHtml(s, pack("noten"), lv("noten-2"), set).includes("wieder dran"));
  assert.ok(!levelHtml(s, pack("noten"), lv("noten-3")).includes("wieder dran"));
  assert.equal(againHtml(), `<span class="again"><span aria-hidden="true">↻</span>${NB}wieder dran</span>`);
});

test("Ablauf: normale Runde nimmt auf, morgen „Wiederholen“, nach der Wiederholung „in 3 Tagen“", () => {
  const s = fresh();
  s.current = "noten-3";
  // Runde mit 8 von 10 in einer Stufe ohne Hilfen
  recordRound(s, "noten-3", 8, new Date("2026-11-25T10:00:00"));
  const v = afterRound(s, lv("noten-3"), 8, T);
  assert.equal(v.neu, true);
  assert.equal(todayCard(s, PACKS, T).small, "Nächste Wiederholung: morgen");
  const morgen = "2026-11-26";
  const c = todayCard(s, PACKS, morgen);
  assert.equal(c.title, "Wiederholen");
  assert.equal(c.line, `10 Aufgaben aus Noten lesen${NB}3`);
  const plan = reviewPlan(s, PACKS, morgen);
  applyReview(s, plan.map((e) => ({ ...e, ok: e.n })), morgen);
  assert.equal(todayCard(s, PACKS, morgen).small, "Nächste Wiederholung: in 3 Tagen");
});
