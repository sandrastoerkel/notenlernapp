// Startseite (Welle 11, Schritt 8): Karte „Heute“ und „↻ wieder dran“ an fälligen Stufen (reine Teile)
import { test } from "node:test";
import assert from "node:assert/strict";
import { todayCard, continueText, reviewListText, levelHtml, againHtml, packShort, streakText, BOX_EMPTY_TEXT, REVIEW_START } from "../../src/views/home.js";
import { PACKS } from "../../src/packs/index.js";
import { fresh, recordRound } from "../../src/store.js";
import { afterRound, applyReview, reviewPlan, due } from "../../src/repeat.js";
import { findLevel } from "../../src/engine.js";
import { homeSections, continueId, klasseHint, nothingNewText, allDoneText, SECTION_TITLES } from "../../src/views/home.js";
import { klasseNote } from "../../src/views/stats.js";
import { dranFor } from "../../src/klasse.js";

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
  c = todayCard(st({ "noten-3": { fach: 2, faellig: "2026-11-28", zuletzt: T }, "noten-6": { fach: 5, faellig: "2026-12-20", zuletzt: T } }), PACKS, T);
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

/* ---------- Abschnitte mit Jahrgang (Welle 11, Schritt 12) ---------- */

const mitKlasse = (jahrgang, zweig = null, extra = {}) => Object.assign(fresh(), { klasse: { jahrgang, zweig, dran: dranFor(jahrgang, zweig) } }, extra);
const allIds = PACKS.flatMap((p) => p.levels.map((l) => l.id));

test("homeSections: ohne Jahrgang null (Startseite wie nach Schritt 8)", () => {
  assert.equal(homeSections(fresh(), PACKS), null);
  assert.equal(continueId(Object.assign(fresh(), { current: "tonleitern-6" }), PACKS), "tonleitern-6");
});

test("homeSections: Jahrgang 5 ohne Fortschritt – alles aus „dran“ in „Jetzt dran“, der Rest „Darüber hinaus“", () => {
  const h = homeSections(mitKlasse(5), PACKS);
  assert.equal(h.hint, "Jahrgang 5 · über den Link deiner Lehrkraft");
  assert.equal(h.jetzt.title, "Jetzt dran");
  assert.equal(h.jetzt.empty, "");
  assert.equal(h.jetzt.ids.length, 8 + 10 + 2 + 9);
  assert.deepEqual(h.gewesen.groups, []);
  assert.equal(h.hinaus.title, "Darüber hinaus");
  assert.deepEqual(h.hinaus.groups.map((g) => [g.pack.id, g.ids.length]), [["intervalle", 8], ["tonleitern", 4], ["akkorde", 6]]);
  // jede Stufe genau einmal
  const shown = [...h.jetzt.ids, ...h.gewesen.groups.flatMap((g) => g.ids), ...h.hinaus.groups.flatMap((g) => g.ids)];
  assert.deepEqual([...shown].sort(), [...allIds].sort());
  // „Weiter üben“ nimmt die erste Stufe aus „Jetzt dran“
  assert.equal(continueId(mitKlasse(5, null, { current: "akkorde-3" }), PACKS), "noten-1");
  assert.equal(continueText(mitKlasse(5, null, { current: "akkorde-3" }), PACKS), `Starten: Noten lesen, Stufe${NB}1`);
});

test("homeSections: Jahrgang 7 – „Jetzt dran“ = Dreiklänge 5 und 6, Früheres in „Schon dran gewesen“ je Paket", () => {
  const h = homeSections(mitKlasse(7), PACKS);
  assert.deepEqual(h.jetzt.ids, ["akkorde-5", "akkorde-6"]);
  assert.deepEqual(h.gewesen.groups.map((g) => g.pack.id), ["noten", "notenwerte", "intervalle", "tonleitern", "akkorde"]);
  assert.deepEqual(h.hinaus.groups.map((g) => [g.pack.id, g.ids]), [["intervalle", ["intervall-5", "intervall-6", "intervall-7", "intervall-8", "intervall-9", "intervall-10"]]]);
  assert.equal(continueText(mitKlasse(7), PACKS), `Starten: Dreiklänge, Stufe${NB}5`);
  // geschafft (beste Runde ≥ 8) rückt nach „Schon dran gewesen“; „Weiter üben“ nimmt die nächste
  const s = mitKlasse(7, null, { levels: { "akkorde-5": { played: 2, best: 9, stars: 3 } } });
  assert.deepEqual(homeSections(s, PACKS).jetzt.ids, ["akkorde-6"]);
  assert.equal(continueId(s, PACKS), "akkorde-6");
  // MuG: nichts darüber hinaus
  assert.deepEqual(homeSections(mitKlasse(7, "mug"), PACKS).hinaus.groups, []);
  assert.equal(homeSections(mitKlasse(7, "mug"), PACKS).hint, "Jahrgang 7, Musisches Gymnasium · über den Link deiner Lehrkraft");
});

test("homeSections: Jahrgang 9 – „Jetzt dran“ leer mit Satz; alles Neue geschafft – anderer Satz", () => {
  const h = homeSections(mitKlasse(9, null, { current: "tonleitern-6" }), PACKS);
  assert.deepEqual(h.jetzt.ids, []);
  assert.equal(h.jetzt.empty, "In Jahrgang 9 kommt nichts Neues dazu. Alles hier ist zum Wiederholen da.");
  assert.equal(h.jetzt.empty, nothingNewText({ jahrgang: 9 }));
  // ohne „Jetzt dran“ bleibt „Weiter üben“ bei der aktuellen Stufe
  assert.equal(continueId(mitKlasse(9, null, { current: "tonleitern-6" }), PACKS), "tonleitern-6");
  const done = mitKlasse(7, null, { levels: { "akkorde-5": { best: 8 }, "akkorde-6": { best: 10 } } });
  assert.equal(homeSections(done, PACKS).jetzt.empty, allDoneText({ jahrgang: 7 }));
  assert.equal(allDoneText({ jahrgang: 7 }), "Was in Jahrgang 7 neu ist, hast du mit mindestens 8 von 10 geschafft. Alles hier ist zum Wiederholen da.");
  assert.deepEqual(Object.values(SECTION_TITLES), ["Jetzt dran", "Schon dran gewesen", "Darüber hinaus"]);
  assert.equal(klasseHint({ jahrgang: 6, zweig: null, dran: dranFor(6) }), "Jahrgang 6 · über den Link deiner Lehrkraft");
});

test("Stufenkarte in „Jetzt dran“: Paketname (kurz) vorn in der Unterzeile", () => {
  const html = levelHtml(fresh(), pack("akkorde"), lv("akkorde-5"), new Set(), true);
  assert.match(html, /<span class="small muted">Dreiklänge · /);
  assert.ok(!/<span class="small muted">Dreiklänge · /.test(levelHtml(fresh(), pack("akkorde"), lv("akkorde-5"))));
});

test("Stufenkarte: hervorgehoben ist die Stufe von „Weiter üben“ (mit Jahrgang continueId), sonst die aktuelle", () => {
  const s = mitKlasse(7, null, { current: "noten-1" });
  const cur = continueId(s, PACKS);
  assert.equal(cur, "akkorde-5");
  assert.match(levelHtml(s, pack("akkorde"), lv("akkorde-5"), new Set(), true, cur), /class="level\s+current"/);
  assert.ok(!/current/.test(levelHtml(s, pack("noten"), lv("noten-1"), new Set(), false, cur)));
  // ohne Angabe wie bisher: die aktuelle Stufe
  assert.match(levelHtml(s, pack("noten"), lv("noten-1")), /class="level\s+current"/);
});

test("Statistik: Hinweis auf den Jahrgang bzw. nichts", () => {
  assert.equal(klasseNote(null), "");
  assert.equal(klasseNote({ jahrgang: 6, zweig: null, dran: dranFor(6) }), "Jahrgang 6 (über den Link deiner Lehrkraft)");
});
