// Tests für src/repeat.js: Karteikasten (Wiederholung über Tage, Welle 11, Schritt 4)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ABSTAENDE, FAECHER, RUNDE_WIEDERHOLEN, RUNDE_GRUNDLAGEN, MAX_STUFEN, MIN_AUFGABEN_RATEN,
  inBox, boxIds, enter, due, nextDue, reviewPlan, passed, applyReview, afterRound, dueText, dayText, withGuess, verdictOf,
  needsOf, stepNeedsOf, skillOf, needsText,
  basicsPlan, basicsOffer, afterBasics, afterBasicsLevels, MIN_AUFGABEN_GRUNDLAGE, gapsOf, LUECKE_AB,
} from "../src/repeat.js";
import { fresh, addDays, UMSTELLUNG_JE_TAG, reset, migrateWiederholen } from "../src/store.js";
import { PACKS } from "../src/packs/index.js";

const T = "2026-11-25";
const level = (id) => PACKS.flatMap((p) => p.levels).find((l) => l.id === id);

// Kleine Pakete für reviewPlan (unabhängig von den echten Paketen)
const FAKE = [
  { id: "a", levels: [{ id: "a-1" }, { id: "a-2", guess: true }, { id: "a-3" }] },
  { id: "b", levels: [{ id: "b-1", helps: ["tabelle"] }, { id: "b-2", guess: true }, { id: "b-3" }, { id: "b-4", guess: true }] },
];
const withRep = (rep) => ({ ...fresh(), rep });
const dueOn = (ids, day = T) => withRep(Object.fromEntries(ids.map((id) => [id, { fach: 1, faellig: day, zuletzt: null }])));

test("Konstanten nach Sandras Entscheidung (24.11.2026)", () => {
  assert.deepEqual(ABSTAENDE, [1, 3, 7, 14, 30]);
  assert.equal(FAECHER, 5);
  assert.equal(RUNDE_WIEDERHOLEN, 10);
  assert.equal(RUNDE_GRUNDLAGEN, 6);
  assert.equal(MAX_STUFEN, 3);
  assert.equal(MIN_AUFGABEN_RATEN, 4);
  // die Umstellung in store.js verteilt je Tag so viele Stufen, wie eine Runde fasst
  assert.equal(UMSTELLUNG_JE_TAG, MAX_STUFEN);
});

test("inBox und boxIds: nur Stufen ohne Hilfen, in der Reihenfolge der Pakete", () => {
  assert.ok(inBox(level("noten-1")));
  assert.ok(inBox(level("intervall-2")));
  assert.ok(!inBox(level("intervall-1")));
  assert.ok(!inBox(level("notenwerte-4")));
  assert.ok(inBox({ id: "x", helps: [] }));
  assert.ok(!inBox(null));
  const ids = boxIds(PACKS);
  for (const id of ids) assert.ok(inBox(level(id)), id);
  for (const p of PACKS) for (const l of p.levels) assert.equal(ids.includes(l.id), !(l.helps && l.helps.length), l.id);
  // Reihenfolge: Pakete wie PACKS, innerhalb in Stufenfolge
  const order = PACKS.flatMap((p) => p.levels.map((l) => l.id));
  assert.deepEqual(ids, order.filter((id) => ids.includes(id)));
  assert.deepEqual(ids.slice(0, 9), ["noten-1", "noten-2", "noten-3", "noten-4", "noten-5", "noten-6", "noten-7", "noten-8", "notenwerte-3"]);
});

test("enter: Fach 1, fällig morgen, nur ohne vorhandenen Eintrag", () => {
  const s = fresh();
  assert.deepEqual(enter(s, "noten-3", T), { fach: 1, faellig: "2026-11-26", zuletzt: T });
  s.rep["noten-3"].fach = 4;
  assert.equal(enter(s, "noten-3", "2026-12-01"), null);
  assert.equal(s.rep["noten-3"].fach, 4);
  // ohne rep (alter Stand) legt enter das Feld an
  const o = { ...fresh(), rep: undefined };
  enter(o, "noten-1", T);
  assert.ok(o.rep["noten-1"]);
});

test("due: fällig bis heute, am längsten fällig zuerst, bei Gleichstand Grundlagen zuerst", () => {
  const s = withRep({
    "tonleitern-5": { fach: 2, faellig: "2026-11-25", zuletzt: null },
    "noten-7": { fach: 2, faellig: "2026-11-25", zuletzt: null },
    "intervall-4": { fach: 1, faellig: "2026-11-25", zuletzt: null },
    "noten-3": { fach: 1, faellig: "2026-11-25", zuletzt: null },
    "akkorde-1": { fach: 3, faellig: "2026-11-20", zuletzt: null }, // am längsten fällig
    "notenwerte-5": { fach: 1, faellig: "2026-11-26", zuletzt: null }, // morgen: nicht fällig
    "intervall-3": { fach: 1, faellig: "2026-11-20", zuletzt: null }, // mit Hilfen: nie im Kasten
    "gibt-es-nicht": { fach: 1, faellig: "2026-11-20", zuletzt: null },
  });
  assert.deepEqual(due(s, PACKS, T), ["akkorde-1", "noten-3", "noten-7", "intervall-4", "tonleitern-5"]);
  assert.deepEqual(due(s, PACKS, "2026-11-19"), []);
  assert.deepEqual(due(fresh(), PACKS, T), []);
  assert.deepEqual(due({ ...fresh(), rep: undefined }, PACKS, T), []);
});

test("nextDue: frühester künftiger Tag oder null", () => {
  const s = withRep({
    "noten-3": { fach: 1, faellig: "2026-11-25", zuletzt: null },
    "noten-6": { fach: 3, faellig: "2026-12-02", zuletzt: null },
    "noten-7": { fach: 2, faellig: "2026-11-28", zuletzt: null },
  });
  assert.equal(nextDue(s, T), "2026-11-28");
  assert.equal(nextDue(s, "2026-12-02"), null);
  assert.equal(nextDue(fresh(), T), null);
});

test("reviewPlan: höchstens drei Stufen, 10 / 5 + 5 / 4 + 3 + 3, Reihenfolge wie due", () => {
  assert.deepEqual(reviewPlan(fresh(), PACKS, T), []);
  assert.deepEqual(reviewPlan(dueOn(["noten-3"]), PACKS, T), [{ id: "noten-3", n: 10 }]);
  assert.deepEqual(reviewPlan(dueOn(["intervall-2", "noten-3"]), PACKS, T), [{ id: "noten-3", n: 5 }, { id: "intervall-2", n: 5 }]);
  assert.deepEqual(reviewPlan(dueOn(["tonleitern-5", "intervall-2", "noten-3", "noten-7", "akkorde-1"]), PACKS, T),
    [{ id: "noten-3", n: 4 }, { id: "noten-7", n: 3 }, { id: "intervall-2", n: 3 }]);
  for (const ids of [["a-1"], ["a-1", "a-3"], ["a-1", "a-3", "b-3"], ["a-2", "b-2", "b-4"], ["a-1", "a-2", "a-3", "b-2"]]) {
    const plan = reviewPlan(dueOn(ids), FAKE, T);
    assert.equal(plan.reduce((a, e) => a + e.n, 0), RUNDE_WIEDERHOLEN, ids.join());
    assert.ok(plan.length <= MAX_STUFEN);
    for (const e of plan) assert.ok(e.n >= 3, `${e.id}: mindestens drei Aufgaben`);
  }
});

test("reviewPlan: Stufen mit zwei Knöpfen (guess) bekommen den größten Anteil, mindestens vier", () => {
  // eine Ratestufe unter drei: sie bekommt die 4, auch wenn sie nicht vorn steht
  assert.deepEqual(reviewPlan(dueOn(["a-1", "a-2", "a-3"]), FAKE, T), [{ id: "a-1", n: 3 }, { id: "a-2", n: 4, guess: true }, { id: "a-3", n: 3 }]);
  // zwei Ratestufen unter drei fälligen: 4 + 4 + 2 ließe der dritten nur zwei Aufgaben → nur die ersten zwei (5 + 5)
  assert.deepEqual(reviewPlan(dueOn(["a-1", "a-2", "b-2"]), FAKE, T), [{ id: "a-1", n: 5 }, { id: "a-2", n: 5, guess: true }]);
  assert.deepEqual(reviewPlan(dueOn(["a-2", "b-2", "b-4"]), FAKE, T), [{ id: "a-2", n: 5, guess: true }, { id: "b-2", n: 5, guess: true }]);
  // zwei Stufen: 5 + 5 reicht auch für zwei Ratestufen
  assert.deepEqual(reviewPlan(dueOn(["b-2", "a-3"]), FAKE, T), [{ id: "a-3", n: 5 }, { id: "b-2", n: 5, guess: true }]);
  // die Stufe mit Hilfen (b-1) kommt nie in die Runde
  assert.deepEqual(reviewPlan(dueOn(["b-1"]), FAKE, T), []);
});

test("passed: höchstens ⌊n / 5⌋ Fehler", () => {
  assert.ok(passed(3, 0)); assert.ok(!passed(3, 1));
  assert.ok(passed(4, 0)); assert.ok(!passed(4, 1));
  assert.ok(passed(5, 1)); assert.ok(!passed(5, 2));
  assert.ok(passed(10, 2)); assert.ok(!passed(10, 3)); // 8 von 10
});

// Wahrscheinlichkeit, mit Raten (jede Antwort mit Wahrscheinlichkeit q richtig) zu bestehen
const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const passChance = (n, guess, q = 0.5) => {
  let p = 0;
  for (let f = 0; f <= n; f++) if (passed(n, f, guess)) p += binom(n, f) * q ** (n - f) * (1 - q) ** f;
  return p;
};

test("passed für Ratestufen (W-B1): höchstens 2 · ⌊n / 10⌋ Fehler; Raten besteht höchstens in 6,3 %", () => {
  // 4 und 5 Aufgaben: alle richtig; 10: zwei daneben erlaubt (wie 8 von 10)
  assert.ok(passed(4, 0, true)); assert.ok(!passed(4, 1, true));
  assert.ok(passed(5, 0, true)); assert.ok(!passed(5, 1, true));
  assert.ok(passed(10, 2, true)); assert.ok(!passed(10, 3, true));
  // Zahlen aus dem Bericht Wissenschaft (B1): bisher 5 Aufgaben 18,8 %, 4 Aufgaben 6,3 %, 10 Aufgaben 5,5 %
  assert.equal(Math.round(passChance(5, false) * 1000) / 10, 18.8);
  assert.equal(Math.round(passChance(4, true) * 1000) / 10, 6.3);
  assert.equal(Math.round(passChance(5, true) * 1000) / 10, 3.1);
  assert.equal(Math.round(passChance(10, true) * 1000) / 10, 5.5);
  for (const n of [4, 5, 10]) assert.ok(passChance(n, true) <= 0.063, `${n} Aufgaben`);
  // Tonleitern 3 mit „immer Ganzton“ (Anteil der Halbtonschritte HALF_P = 0,4): bisher bei 5 Aufgaben 33,7 %, jetzt 7,8 %
  assert.equal(Math.round(passChance(5, false, 0.6) * 1000) / 10, 33.7);
  assert.equal(Math.round(passChance(5, true, 0.6) * 1000) / 10, 7.8);
  // ohne guess bleibt alles wie bisher
  assert.equal(passed(5, 1), true);
});

test("withGuess und applyReview: Ratestufe mit 5 Aufgaben und einem Fehler sitzt nicht mehr", () => {
  const plan = [{ id: "tonleitern-3", n: 5, guess: true }, { id: "noten-3", n: 5 }];
  const perLevel = withGuess([{ id: "tonleitern-3", n: 5, ok: 4 }, { id: "noten-3", n: 5, ok: 4 }], plan);
  assert.deepEqual(perLevel, [{ id: "tonleitern-3", n: 5, ok: 4, guess: true }, { id: "noten-3", n: 5, ok: 4 }]);
  const s = withRep({ "tonleitern-3": { fach: 2, faellig: T, zuletzt: null }, "noten-3": { fach: 2, faellig: T, zuletzt: null } });
  const [g, n] = applyReview(s, perLevel, T);
  assert.equal(g.sitzt, false);
  assert.equal(n.sitzt, true);
  // ohne Fehler sitzt auch die Ratestufe
  assert.equal(applyReview(s, [{ id: "tonleitern-3", n: 5, ok: 5, guess: true }], T)[0].sitzt, true);
  // echte Pakete: reviewPlan trägt guess an Tonleitern 3 und Dreiklänge 1
  const plan2 = reviewPlan(dueOn(["noten-3", "tonleitern-3"]), PACKS, T);
  assert.deepEqual(plan2, [{ id: "noten-3", n: 5 }, { id: "tonleitern-3", n: 5, guess: true }]);
  // normale Runde in einer Ratestufe: 10 Aufgaben, 8 von 10 wie bisher
  const t = withRep({ "akkorde-1": { fach: 1, faellig: T, zuletzt: null } });
  assert.equal(afterRound(t, level("akkorde-1"), 8, T).sitzt, true);
});

test("applyReview: Fach 1 → 2 → 3 → 4 → 5 mit 1, 3, 7, 14, 30 Tagen; Fach 5 bleibt und kommt nach 30 Tagen wieder", () => {
  const s = fresh();
  enter(s, "noten-3", "2026-11-24");
  let day = "2026-11-25";
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const [r] = applyReview(s, [{ id: "noten-3", n: 10, ok: 9 }], day);
    seen.push([r.fach, r.inTagen]);
    assert.equal(r.sitzt, true);
    assert.deepEqual(s.rep["noten-3"], { fach: r.fach, faellig: addDays(day, r.inTagen), zuletzt: day });
    day = s.rep["noten-3"].faellig;
  }
  assert.deepEqual(seen, [[2, 3], [3, 7], [4, 14], [5, 30], [5, 30], [5, 30]]);
});

test("applyReview: nicht bestanden → ein Fach zurück (nicht unter 1), morgen wieder", () => {
  const s = withRep({ "noten-7": { fach: 3, faellig: T, zuletzt: null }, "noten-3": { fach: 1, faellig: T, zuletzt: null } });
  const res = applyReview(s, [{ id: "noten-7", n: 4, ok: 2 }, { id: "noten-3", n: 3, ok: 0 }], T);
  assert.deepEqual(res, [
    { id: "noten-7", n: 4, richtig: 2, urteil: "wacklig", sitzt: false, fach: 2, inTagen: 1, faellig: "2026-11-26" },
    { id: "noten-3", n: 3, richtig: 0, urteil: "wacklig", sitzt: false, fach: 1, inTagen: 1, faellig: "2026-11-26" },
  ]);
  assert.deepEqual(s.rep["noten-7"], { fach: 2, faellig: "2026-11-26", zuletzt: T });
  assert.deepEqual(s.rep["noten-3"], { fach: 1, faellig: "2026-11-26", zuletzt: T });
  // 5 Aufgaben, eine daneben: sitzt
  assert.equal(applyReview(s, [{ id: "noten-7", n: 5, ok: 4 }], T)[0].sitzt, true);
  // beschädigter Eintrag gilt als Fach 1
  const b = withRep({ "noten-1": { fach: "x", faellig: T } });
  assert.deepEqual(applyReview(b, [{ id: "noten-1", n: 10, ok: 10 }], T)[0],
    { id: "noten-1", n: 10, richtig: 10, urteil: "sitzt", sitzt: true, fach: 2, inTagen: 3, faellig: "2026-11-28" });
});

test("applyReview (W-B2): ein Fehler bei 3 oder 4 Aufgaben → „fast“, Fach bleibt, morgen wieder; zurück erst ab zwei", () => {
  const s = withRep({ "noten-7": { fach: 3, faellig: T, zuletzt: null }, "noten-3": { fach: 2, faellig: T, zuletzt: null },
    "intervall-2": { fach: 4, faellig: T, zuletzt: null } });
  const res = applyReview(s, [{ id: "noten-7", n: 4, ok: 3 }, { id: "noten-3", n: 3, ok: 2 }, { id: "intervall-2", n: 3, ok: 1 }], T);
  assert.deepEqual(res.map((r) => [r.id, r.urteil, r.fach, r.inTagen, r.richtig, r.n]), [
    ["noten-7", "fast", 3, 1, 3, 4],
    ["noten-3", "fast", 2, 1, 2, 3],
    ["intervall-2", "wacklig", 3, 1, 1, 3],
  ]);
  assert.deepEqual(s.rep["noten-7"], { fach: 3, faellig: "2026-11-26", zuletzt: T });
  assert.equal(res[0].sitzt, false);
  // n ≥ 5 wie bisher: ⌊n / 5⌋ Fehler sitzen, darüber ein Fach zurück (kein „fast“)
  assert.deepEqual(applyReview(s, [{ id: "noten-7", n: 5, ok: 3 }], T).map((r) => [r.urteil, r.fach]), [["wacklig", 2]]);
  assert.deepEqual(applyReview(s, [{ id: "noten-7", n: 10, ok: 7 }], T).map((r) => [r.urteil, r.fach]), [["wacklig", 1]]);
  // Fach 1 bleibt bei „fast“ Fach 1
  const t = withRep({ "noten-3": { fach: 1, faellig: T, zuletzt: null } });
  assert.deepEqual(applyReview(t, [{ id: "noten-3", n: 3, ok: 2 }], T).map((r) => [r.urteil, r.fach]), [["fast", 1]]);
  // Ratestufe: ein Fehler bei 4 oder 5 Aufgaben → „fast“ (kein Aufstieg, kein Rückschritt), zwei → zurück
  const g = withRep({ "tonleitern-3": { fach: 3, faellig: T, zuletzt: null } });
  assert.deepEqual(applyReview(g, [{ id: "tonleitern-3", n: 5, ok: 4, guess: true }], T).map((r) => [r.urteil, r.fach]), [["fast", 3]]);
  assert.deepEqual(applyReview(g, [{ id: "tonleitern-3", n: 4, ok: 2, guess: true }], T).map((r) => [r.urteil, r.fach]), [["wacklig", 2]]);
});

test("verdictOf: sitzt / fast / wacklig für n = 3, 4, 5, 10 (mit und ohne guess)", () => {
  const row = (n, guess) => Array.from({ length: n + 1 }, (_, f) => verdictOf(n, f, guess)[0]).join("");
  // s = sitzt, f = fast, w = wacklig; Index = Zahl der Fehler
  assert.equal(row(3), "sfww");
  assert.equal(row(4), "sfwww");
  assert.equal(row(5), "sswwww");
  assert.equal(row(10), "ssswwwwwwww");
  assert.equal(row(4, true), "sfwww");
  assert.equal(row(5, true), "sfwwww");
  assert.equal(row(10, true), "ssswwwwwwww");
  // bei 1 oder 2 Aufgaben kein „fast“ (ein Fehler wäre die Hälfte)
  assert.equal(verdictOf(2, 1), "wacklig");
  assert.equal(verdictOf(1, 1), "wacklig");
});

test("afterRound: normale Runde nimmt auf, zählt nur, wenn fällig", () => {
  const s = fresh();
  // mit Hilfen: nichts
  assert.equal(afterRound(s, level("intervall-1"), 10, T), null);
  assert.deepEqual(s.rep, {});
  // ohne Hilfen, unter 8: nichts
  assert.equal(afterRound(s, level("intervall-2"), 7, T), null);
  assert.deepEqual(s.rep, {});
  // ab 8: Fach 1, fällig morgen
  assert.deepEqual(afterRound(s, level("intervall-2"), 8, T), { id: "intervall-2", sitzt: true, fach: 1, inTagen: 1, neu: true });
  assert.deepEqual(s.rep["intervall-2"], { fach: 1, faellig: "2026-11-26", zuletzt: T });
  // am selben Tag noch einmal gut: nicht fällig, nichts ändert sich
  assert.equal(afterRound(s, level("intervall-2"), 10, T), null);
  assert.deepEqual(s.rep["intervall-2"], { fach: 1, faellig: "2026-11-26", zuletzt: T });
  // am selben Tag schwach: schon morgen fällig, bleibt morgen (W-B7)
  assert.deepEqual(afterRound(s, level("intervall-2"), 2, T),
    { id: "intervall-2", n: 10, richtig: 2, sitzt: false, fach: 1, inTagen: 1, faellig: "2026-11-26", vorgezogen: true });
  assert.deepEqual(s.rep["intervall-2"], { fach: 1, faellig: "2026-11-26", zuletzt: T });
  // fällig und ≥ 8: wie bestanden
  assert.deepEqual(afterRound(s, level("intervall-2"), 8, "2026-11-26"),
    { id: "intervall-2", n: 10, richtig: 8, urteil: "sitzt", sitzt: true, fach: 2, inTagen: 3, faellig: "2026-11-29" });
  // fällig und < 8: wie nicht bestanden
  assert.deepEqual(afterRound(s, level("intervall-2"), 7, "2026-11-30"),
    { id: "intervall-2", n: 10, richtig: 7, urteil: "wacklig", sitzt: false, fach: 1, inTagen: 1, faellig: "2026-12-01" });
  assert.deepEqual(s.rep["intervall-2"], { fach: 1, faellig: "2026-12-01", zuletzt: "2026-11-30" });
});

test("afterRound (W-B7): schwache normale Runde in einer nicht fälligen Stufe → morgen fällig, Fach bleibt", () => {
  // Bericht Wissenschaft B7: Fach 4, fällig in 9 Tagen, normale Runde 2 / 10 änderte nichts
  const s = withRep({ "intervall-2": { fach: 4, faellig: addDays(T, 9), zuletzt: addDays(T, -5) } });
  const v = afterRound(s, level("intervall-2"), 2, T);
  assert.deepEqual(v, { id: "intervall-2", n: 10, richtig: 2, sitzt: false, fach: 4, inTagen: 1, faellig: addDays(T, 1), vorgezogen: true });
  assert.deepEqual(s.rep["intervall-2"], { fach: 4, faellig: addDays(T, 1), zuletzt: addDays(T, -5) });
  // 7 von 10 ebenso, ab 8 nichts
  const t = withRep({ "intervall-2": { fach: 3, faellig: addDays(T, 4), zuletzt: T } });
  assert.equal(afterRound(t, level("intervall-2"), 8, T), null);
  assert.equal(t.rep["intervall-2"].faellig, addDays(T, 4));
  assert.equal(afterRound(t, level("intervall-2"), 7, T).faellig, addDays(T, 1));
  // morgen entscheidet die Wiederholung: bestanden → Fach 4 (14 Tage), nicht bestanden → Fach 2
  const tomorrow = addDays(T, 1);
  assert.deepEqual(due(t, PACKS, tomorrow), ["intervall-2"]);
  const [r] = applyReview(t, [{ id: "intervall-2", n: 10, ok: 9 }], tomorrow);
  assert.deepEqual([r.fach, r.inTagen], [4, 14]);
  // Stufe mit Hilfen: weiter nichts
  assert.equal(afterRound(t, level("intervall-1"), 0, T), null);
});

test("Uhr vorgestellt und zurück (W-C1): Eintrag aus der „Zukunft“ ist heute fällig, nichts verschwindet", () => {
  // Bericht Wissenschaft C1: Wiederholung am 1.1.2030 → fällig 8.1.2030; zurück im Jahr 2026 war nichts fällig
  const s = fresh();
  enter(s, "noten-3", "2029-12-28");
  applyReview(s, [{ id: "noten-3", n: 10, ok: 10 }], "2029-12-29"); // Fach 2, fällig 1.1.2030
  applyReview(s, [{ id: "noten-3", n: 10, ok: 10 }], "2030-01-01"); // Fach 3, fällig 8.1.2030
  assert.deepEqual(s.rep["noten-3"], { fach: 3, faellig: "2030-01-08", zuletzt: "2030-01-01" });
  assert.deepEqual(due(s, PACKS, T), ["noten-3"]);
  assert.equal(nextDue(s, T), null);
  assert.deepEqual(reviewPlan(s, PACKS, T), [{ id: "noten-3", n: 10 }]);
  // nach der Wiederholung stimmt alles wieder: Fach 4, in 14 Tagen
  const [r] = applyReview(s, [{ id: "noten-3", n: 10, ok: 10 }], T);
  assert.deepEqual([r.fach, r.inTagen], [4, 14]);
  assert.deepEqual(due(s, PACKS, T), []);
  assert.equal(nextDue(s, T), addDays(T, 14));
  // faellig weiter weg als das Fach erlaubt (zuletzt nicht in der Zukunft): ebenso fällig
  const t = withRep({ "noten-7": { fach: 2, faellig: addDays(T, 20), zuletzt: addDays(T, -1) } });
  assert.deepEqual(due(t, PACKS, T), ["noten-7"]);
  // Normalfall: genau der Abstand des Fachs ist nicht verdächtig
  for (let fach = 1; fach <= FAECHER; fach++) {
    const u = withRep({ "noten-7": { fach, faellig: addDays(T, ABSTAENDE[fach - 1]), zuletzt: T } });
    assert.deepEqual(due(u, PACKS, T), [], `Fach ${fach}`);
    assert.equal(nextDue(u, T), addDays(T, ABSTAENDE[fach - 1]));
  }
  // Reise nach Westen (der örtliche Tag springt einen Tag zurück): nichts wird vorgezogen
  const w = withRep({ "noten-7": { fach: 2, faellig: addDays(T, 4), zuletzt: addDays(T, 1) } });
  assert.deepEqual(due(w, PACKS, T), []);
  // zurückgestellt ist auch „fällig“ für die Empfehlung und für die normale Runde
  const v = withRep({ "noten-3": { fach: 3, faellig: "2030-01-08", zuletzt: "2030-01-01" } });
  played(v, "noten-3", 9); played(v, "noten-6", 9); played(v, "noten-7", 9);
  assert.deepEqual(basicsOffer(v, PACKS, "noten-8", T).reason, { kind: "faellig", id: "noten-3" });
  assert.equal(afterRound(v, level("noten-3"), 9, T).fach, 4);
});

test("W-C1 und die Umstellung: verteilte Einträge (zuletzt: null) bleiben verteilt", () => {
  // alle Stufen ohne Hilfen geschafft → Umstellung verteilt je Tag 3; heute sind genau die ersten 3 fällig
  const ids = boxIds(PACKS);
  assert.ok(Math.ceil(ids.length / UMSTELLUNG_JE_TAG) - 1 <= ABSTAENDE[FAECHER - 1]);
  const s = fresh();
  s.migrated = s.migrated.filter((m) => m !== "wiederholen");
  for (const id of ids) s.levels[id] = { stars: 3, best: 9, played: 1 };
  migrateWiederholen(s, ids, T, -480);
  assert.equal(due(s, PACKS, T).length, UMSTELLUNG_JE_TAG);
  assert.equal(nextDue(s, T), addDays(T, 1));
  assert.equal(due(s, PACKS, addDays(T, 1)).length, 2 * UMSTELLUNG_JE_TAG);
  // ein Eintrag der Umstellung weiter als 30 Tage in der Zukunft (Uhr war bei der Umstellung vorgestellt): fällig
  const t = withRep({ "noten-3": { fach: 1, faellig: addDays(T, 400), zuletzt: null } });
  assert.deepEqual(due(t, PACKS, T), ["noten-3"]);
});

test("dueText und dayText", () => {
  assert.equal(dueText(0), "heute");
  assert.equal(dueText(-2), "heute");
  assert.equal(dueText(1), "morgen");
  assert.equal(dueText(3), "in 3 Tagen");
  assert.equal(dueText(30), "in 30 Tagen");
  assert.equal(dayText("2026-11-24"), "24.11.");
  assert.equal(dayText("2026-12-05"), "5.12.");
  assert.equal(dayText("2027-01-01"), "1.1.");
});

/* ---------- Voraussetzungen (Schritt 5) ---------- */

// Die ganze Tabelle aus docs/PLAN.md (Welle 11, Abschnitt 1) als erwartete Werte: jede der 47 Stufen, so wie
// needsOf sie liefert (gesetztes Feld oder Voreinstellung).
const NEEDS = {
  "noten-1": [], "noten-2": [], "noten-3": ["noten-1", "noten-2"], "noten-4": [], "noten-5": [],
  "noten-6": ["noten-4", "noten-5"], "noten-7": ["noten-3"], "noten-8": ["noten-3", "noten-6", "noten-7"],
  "notenwerte-1": [], "notenwerte-2": [], "notenwerte-3": [],
  "notenwerte-4": ["notenwerte-3"], "notenwerte-5": ["notenwerte-3"],
  "notenwerte-6": ["notenwerte-3", "notenwerte-5"], "notenwerte-7": ["notenwerte-5"],
  "notenwerte-8": ["notenwerte-5", "notenwerte-7"], "notenwerte-9": ["notenwerte-5", "notenwerte-7"],
  "notenwerte-10": ["notenwerte-3", "notenwerte-5", "notenwerte-7", "notenwerte-9"],
  "intervall-1": ["noten-3"], "intervall-2": ["noten-3", "noten-6"],
  "intervall-3": ["intervall-2", "noten-7"], "intervall-4": ["intervall-2", "noten-7"],
  "intervall-5": ["intervall-4"], "intervall-6": ["intervall-4"], "intervall-7": ["intervall-6"],
  "intervall-8": ["intervall-6", "noten-7"], "intervall-9": ["intervall-7", "noten-7"], "intervall-10": ["intervall-9"],
  "tonleitern-1": ["noten-3", "noten-6"], "tonleitern-2": ["noten-7"], "tonleitern-3": ["noten-6", "noten-7"],
  "tonleitern-4": ["tonleitern-3", "noten-7"], "tonleitern-5": ["tonleitern-3", "noten-7"],
  "tonleitern-6": ["tonleitern-5"], "tonleitern-7": ["tonleitern-5"],
  "tonleitern-8": ["tonleitern-5"], "tonleitern-9": ["tonleitern-5"],
  "tonleitern-10": ["tonleitern-9"], "tonleitern-11": ["tonleitern-9"],
  "tonleitern-12": ["intervall-2", "tonleitern-3"], "tonleitern-13": ["intervall-2", "tonleitern-3"],
  "akkorde-1": ["intervall-4", "noten-8"], "akkorde-2": ["akkorde-1", "intervall-4"], "akkorde-3": ["noten-8"],
  "akkorde-4": ["akkorde-1", "intervall-2"], "akkorde-5": ["tonleitern-11"], "akkorde-6": ["tonleitern-9", "akkorde-2"],
};
// Voraussetzungen je Denkschritt (zweischrittige Stufen laut Tabelle)
const STEP_NEEDS = {
  "notenwerte-4": [["notenwerte-3"], []],
  "notenwerte-6": [["notenwerte-3"], ["notenwerte-5"]],
  "notenwerte-8": [["notenwerte-5", "notenwerte-7"], ["notenwerte-5", "notenwerte-7"]],
  "intervall-3": [["intervall-2"], []], "intervall-4": [["intervall-2"], []],
  "intervall-5": [["intervall-2"], ["intervall-4"]], "intervall-6": [["intervall-2"], ["intervall-4"]],
  "intervall-7": [["intervall-2"], ["intervall-6"]],
  "tonleitern-4": [["tonleitern-3"], ["noten-7"]],
  "tonleitern-12": [["intervall-2"], ["tonleitern-3"]],
};
const SKILLS = {
  "noten-1": "Linien im Violinschlüssel", "noten-2": "Zwischenräume im Violinschlüssel", "noten-3": "Noten im Violinschlüssel",
  "noten-4": "Linien im Bassschlüssel", "noten-5": "Zwischenräume im Bassschlüssel", "noten-6": "Noten im Bassschlüssel",
  "noten-7": "Noten mit Vorzeichen", "noten-8": "Noten in beiden Schlüsseln",
  "notenwerte-3": "Notenwerte und Pausen erkennen", "notenwerte-5": "Dauer in Schlägen", "notenwerte-7": "Punktierte Noten",
  "notenwerte-9": "Takt füllen",
  "intervall-2": "Notenstufen zählen (Prime bis Oktave)", "intervall-4": "Intervalle rein, klein, groß",
  "intervall-6": "Verminderte und übermäßige Intervalle", "intervall-7": "Intervalle abwärts", "intervall-9": "Intervalle bauen",
  "tonleitern-3": "Ganz- und Halbtonschritte", "tonleitern-5": "Dur-Tonleitern", "tonleitern-9": "Vorzeichen der Dur-Tonleitern",
  "tonleitern-11": "Tonart aus den Vorzeichen", "akkorde-1": "Dur- und Moll-Dreiklang", "akkorde-2": "Dreiklangstypen",
};
const ALL = PACKS.flatMap((p, pi) => p.levels.map((l, li) => ({ l, pi, li })));
const posOf = (id) => ALL.find((e) => e.l.id === id);
// Aufgaben einer Stufe (genug, um jede Form zu sehen)
function sample(l, n = 200) {
  const out = []; let prev = null;
  for (let k = 0; k < n; k++) { prev = l.question(prev, { state: fresh(), notes: {} }); out.push(prev); }
  return out;
}

test("Voraussetzungen: die ganze Tabelle (jede der 47 Stufen)", () => {
  assert.equal(ALL.length, 47);
  assert.deepEqual(Object.keys(NEEDS).sort(), ALL.map((e) => e.l.id).sort());
  for (const { l } of ALL) assert.deepEqual(needsOf(PACKS, l.id), NEEDS[l.id], l.id);
  // stepNeeds genau an den Stufen der Tabelle
  for (const { l } of ALL) assert.deepEqual(l.stepNeeds, STEP_NEEDS[l.id], `${l.id}: stepNeeds`);
  // unbekannte Stufe: keine
  assert.deepEqual(needsOf(PACKS, "gibt-es-nicht"), []);
});

test("Voraussetzungen: needs nur, wo die Voreinstellung etwas anderes ergäbe", () => {
  for (const { l, pi, li } of ALL) {
    if (!Array.isArray(l.needs)) continue;
    const prev = PACKS[pi].levels.slice(0, li).filter(inBox).pop();
    assert.notDeepEqual(l.needs, prev ? [prev.id] : [], `${l.id}: needs gleich der Voreinstellung`);
  }
});

test("Voraussetzungen: Regeln – ID vorhanden, Ziel ohne Hilfen, früher im selben oder in einem früheren Paket", () => {
  for (const { l, pi, li } of ALL) {
    const targets = [...needsOf(PACKS, l.id), ...(l.stepNeeds || []).flat()];
    for (const id of targets) {
      const t = posOf(id);
      assert.ok(t, `${l.id} → ${id}: gibt es nicht`);
      assert.ok(inBox(t.l), `${l.id} → ${id}: Ziel hat Hilfen`);
      assert.ok(t.pi < pi || (t.pi === pi && t.li < li), `${l.id} → ${id}: nicht früher`);
      assert.ok(skillOf(t.l) === SKILLS[id] && t.l.skill === SKILLS[id], `${l.id} → ${id}: skill fehlt oder falsch`);
    }
    // keine doppelten Einträge
    assert.equal(new Set(needsOf(PACKS, l.id)).size, needsOf(PACKS, l.id).length, l.id);
  }
  // skill genau an den Stufen, auf die verwiesen wird
  const referenced = new Set(ALL.flatMap(({ l }) => [...needsOf(PACKS, l.id), ...(l.stepNeeds || []).flat()]));
  assert.deepEqual([...referenced].sort(), Object.keys(SKILLS).sort());
  for (const { l } of ALL) assert.equal(l.skill, SKILLS[l.id], `${l.id}: skill`);
});

// Kreis im Graphen der Voraussetzungen (needsOf und stepNeeds)? Gibt den ersten gefundenen Kreis zurück oder null.
function findCycle(packs) {
  const lv = Object.fromEntries(packs.flatMap((p) => p.levels).map((l) => [l.id, l]));
  const mark = {};
  const visit = (id, path) => {
    if (mark[id] === 1) return [...path, id];
    if (mark[id] === 2 || !lv[id]) return null;
    mark[id] = 1;
    for (const n of new Set([...needsOf(packs, id), ...(lv[id].stepNeeds || []).flat()])) {
      const c = visit(n, [...path, id]);
      if (c) return c;
    }
    mark[id] = 2;
    return null;
  };
  for (const id of Object.keys(lv)) { const c = visit(id, []); if (c) return c; }
  return null;
}

test("Voraussetzungen: kein Kreis (Tiefensuche über alle Kanten)", () => {
  assert.equal(findCycle(PACKS), null);
  // Gegenprobe: ein Ziel weiter hinten ergibt mit der Voreinstellung einen Kreis, die Suche findet ihn
  const loop = [{ id: "x", levels: [{ id: "x-1", needs: ["x-2"] }, { id: "x-2" }] }];
  assert.deepEqual(findCycle(loop), ["x-1", "x-2", "x-1"]);
  const step = [{ id: "y", levels: [{ id: "y-1", needs: [], stepNeeds: [["y-2"], []] }, { id: "y-2" }] }];
  assert.ok(findCycle(step));
});

test("Voraussetzungen: stepNeeds hat so viele Einträge wie die Stufe Schritte", () => {
  for (const { l } of ALL) {
    const qs = sample(l);
    const maxSteps = Math.max(...qs.map((q) => (Array.isArray(q.steps) ? q.steps.length : 1)));
    if (l.stepNeeds) {
      assert.equal(l.stepNeeds.length, maxSteps, `${l.id}: ${l.stepNeeds.length} Einträge, ${maxSteps} Schritte`);
      assert.equal(maxSteps, 2, l.id);
      for (const e of l.stepNeeds) assert.ok(Array.isArray(e), l.id);
    }
  }
});

test("stepNeedsOf: Schritt der Aufgabe, sonst der Stufe, sonst null", () => {
  const l4 = level("intervall-4"), qs = sample(l4);
  const two = qs.find((q) => q.steps.length === 2), one = qs.find((q) => q.steps.length === 1);
  assert.ok(two && one, "Intervalle 4 hat Aufgaben mit einem und mit zwei Schritten");
  assert.deepEqual(stepNeedsOf(l4, two, 0), ["intervall-2"]);
  assert.deepEqual(stepNeedsOf(l4, two, 1), []);
  // Aufgaben mit nur einem Schritt (z. B. Quinte): nur Schritt 0 = Notenstufen zählen
  assert.deepEqual(stepNeedsOf(l4, one, 0), ["intervall-2"]);
  const t4 = level("tonleitern-4"), tq = sample(t4, 20)[0];
  assert.deepEqual(stepNeedsOf(t4, tq, 0), ["tonleitern-3"]);
  assert.deepEqual(stepNeedsOf(t4, tq, 1), ["noten-7"]);
  assert.deepEqual(stepNeedsOf(level("intervall-7"), null, 1), ["intervall-6"]);
  // einschrittige Stufe: null (dann zählt needsOf als Ganzes)
  assert.equal(stepNeedsOf(level("tonleitern-5"), sample(level("tonleitern-5"), 1)[0], 0), null);
  // die Aufgabe kann ihre Stufe überstimmen
  assert.deepEqual(stepNeedsOf(t4, { steps: [{ needs: ["noten-3"] }, {}] }, 0), ["noten-3"]);
  assert.deepEqual(stepNeedsOf(t4, { steps: [{ needs: ["noten-3"] }, {}] }, 1), ["noten-7"]);
  // die Rückgabe ist eine Kopie
  stepNeedsOf(t4, tq, 0).push("x");
  assert.deepEqual(t4.stepNeeds[0], ["tonleitern-3"]);
});

test("skillOf und needsText", () => {
  assert.equal(skillOf(level("noten-7")), "Noten mit Vorzeichen");
  assert.equal(skillOf(level("intervall-3")), "Rein, klein, groß"); // ohne skill: Titel
  assert.equal(skillOf(null), "");
  assert.equal(needsText(PACKS, "intervall-3"), "Notenstufen zählen (Prime bis Oktave) · Noten mit Vorzeichen");
  assert.equal(needsText(PACKS, "akkorde-1"), "Intervalle rein, klein, groß · Noten in beiden Schlüsseln");
  assert.equal(needsText(PACKS, "notenwerte-5"), "Notenwerte und Pausen erkennen");
  assert.equal(needsText(PACKS, "noten-1"), "");
  assert.equal(needsText(PACKS, "notenwerte-1"), "");
  // needsOf gibt eine Kopie zurück
  needsOf(PACKS, "noten-3").push("x");
  assert.deepEqual(level("noten-3").needs, ["noten-1", "noten-2"]);
});

test("guess: genau die Stufen mit zwei Antwortknöpfen (Tonleitern 1–3, Dreiklänge 1)", () => {
  const guess = ALL.filter(({ l }) => l.guess === true).map(({ l }) => l.id);
  assert.deepEqual(guess, ["tonleitern-1", "tonleitern-2", "tonleitern-3", "akkorde-1"]);
  for (const { l } of ALL) {
    const qs = sample(l, 100);
    const twoButtons = qs.every((q) => {
      const steps = Array.isArray(q.steps) ? q.steps : [q];
      return steps.length === 1 && Array.isArray(steps[0].choices) && steps[0].choices.length === 2;
    });
    assert.equal(twoButtons, l.guess === true, `${l.id}: guess`);
  }
  // in der Runde „Wiederholen“ bekommt Dreiklänge 1 den größten Anteil
  assert.deepEqual(reviewPlan(dueOn(["noten-3", "intervall-2", "akkorde-1"]), PACKS, T),
    [{ id: "noten-3", n: 3 }, { id: "intervall-2", n: 3 }, { id: "akkorde-1", n: 4, guess: true }]);
});

/* ---------- „Grundlagen wiederholen“ und Fehlermuster (Welle 11, Schritt 7) ---------- */

test("basicsPlan: 6 Aufgaben gleich verteilt für 1, 2, 3, 4 Voraussetzungen; only; ohne Voraussetzungen leer", () => {
  assert.equal(RUNDE_GRUNDLAGEN, 6);
  assert.deepEqual(basicsPlan(PACKS, "intervall-1"), [{ id: "noten-3", n: 6 }]);
  assert.deepEqual(basicsPlan(PACKS, "akkorde-1"), [{ id: "intervall-4", n: 3 }, { id: "noten-8", n: 3 }]);
  assert.deepEqual(basicsPlan(PACKS, "noten-8"), [{ id: "noten-3", n: 2 }, { id: "noten-6", n: 2 }, { id: "noten-7", n: 2 }]);
  assert.deepEqual(basicsPlan(PACKS, "notenwerte-10"),
    [{ id: "notenwerte-3", n: 2 }, { id: "notenwerte-5", n: 2 }, { id: "notenwerte-7", n: 1 }, { id: "notenwerte-9", n: 1 }]);
  assert.deepEqual(basicsPlan(PACKS, "intervall-4", 6, "intervall-2"), [{ id: "intervall-2", n: 6 }]);
  assert.deepEqual(basicsPlan(PACKS, "tonleitern-13", 6, ["intervall-2", "tonleitern-3"]), [{ id: "intervall-2", n: 3 }, { id: "tonleitern-3", n: 3 }]);
  assert.deepEqual(basicsPlan(PACKS, "noten-1"), []);
  assert.deepEqual(basicsPlan(PACKS, "gibt-es-nicht"), []);
  // jede Stufe mit Voraussetzungen: zusammen 6 Aufgaben, nur Stufen ohne Hilfen
  for (const l of PACKS.flatMap((p) => p.levels)) {
    const plan = basicsPlan(PACKS, l.id);
    if (!needsOf(PACKS, l.id).length) { assert.deepEqual(plan, [], l.id); continue; }
    assert.equal(plan.reduce((a, e) => a + e.n, 0), 6, l.id);
    assert.ok(plan.every((e) => inBox(level(e.id))), l.id);
  }
});

const played = (s, id, last, day = "2026-11-20", best = Math.max(last, 0)) => { s.levels[id] = { stars: 0, best, played: 1, last, day }; };

test("basicsOffer: show bei Voraussetzungen; Empfehlung bei nie gespielt, fällig, zuletzt unter 8", () => {
  assert.deepEqual(basicsOffer(fresh(), PACKS, "noten-1", T), { show: false, recommend: false, reason: null });
  // nie gespielt (auch eine über den Jahrgang geöffnete Stufe zählt so)
  let s = fresh();
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", T), { show: true, recommend: true, reason: { kind: "nie", id: "intervall-4" } });
  played(s, "intervall-4", 9);
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", T).reason, { kind: "nie", id: "noten-8" });
  played(s, "noten-8", 8);
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", T), { show: true, recommend: false, reason: null });
  // zuletzt unter 8 (last), nicht die beste Runde
  played(s, "noten-8", 6, "2026-11-21", 10);
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", T).reason, { kind: "schwach", id: "noten-8" });
  // ältere Stände ohne last: die beste Runde zählt
  s.levels["noten-8"] = { stars: 1, best: 7, played: 2 };
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", T).reason, { kind: "schwach", id: "noten-8" });
  s.levels["noten-8"] = { stars: 2, best: 8, played: 2 };
  assert.equal(basicsOffer(s, PACKS, "akkorde-1", T).recommend, false);
  // fällig im Karteikasten
  s.rep = { "intervall-4": { fach: 2, faellig: T, zuletzt: "2026-11-22" } };
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", T).reason, { kind: "faellig", id: "intervall-4" });
  s.rep["intervall-4"].faellig = addDays(T, 1);
  assert.equal(basicsOffer(s, PACKS, "akkorde-1", T).recommend, false);
});

test("basicsOffer und afterBasics: Empfehlung verschwindet nach einer Runde mit höchstens einem Fehler und kommt wieder", () => {
  const s = fresh();
  played(s, "intervall-4", 9);
  // noten-8 nie gespielt → empfohlen
  assert.equal(basicsOffer(s, PACKS, "akkorde-1", T).recommend, true);
  // zwei Fehler: kein Merker
  assert.equal(afterBasics(s, "akkorde-1", 4, 6, T), false);
  assert.equal(s.basics["akkorde-1"], undefined);
  assert.equal(basicsOffer(s, PACKS, "akkorde-1", T).recommend, true);
  // ein Fehler: Merker, Empfehlung weg (auch wenn noten-8 weiter nie in einer normalen Runde lag)
  assert.equal(afterBasics(s, "akkorde-1", 5, 6, T), true);
  assert.equal(s.basics["akkorde-1"], T);
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", T), { show: true, recommend: false, reason: null });
  // nur für diese Stufe: akkorde-2 (braucht akkorde-1, nie gespielt) bleibt empfohlen
  assert.equal(basicsOffer(s, PACKS, "akkorde-2", T).recommend, true);
  // schwache Runde am selben Tag weckt nichts, am nächsten Tag schon
  played(s, "intervall-4", 5, T, 9);
  assert.equal(basicsOffer(s, PACKS, "akkorde-1", T).recommend, false);
  played(s, "intervall-4", 5, addDays(T, 1), 9);
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", addDays(T, 1)).reason, { kind: "schwach", id: "intervall-4" });
  // neue Grundlagen-Runde ohne Fehler am Tag darauf: wieder weg
  afterBasics(s, "akkorde-1", 6, 6, addDays(T, 1));
  assert.equal(basicsOffer(s, PACKS, "akkorde-1", addDays(T, 1)).recommend, false);
  // fällig: schon am Tag des Merkers fällig zählt nicht neu, später fällig schon
  s.rep = { "intervall-4": { fach: 1, faellig: addDays(T, 1), zuletzt: T } };
  assert.equal(basicsOffer(s, PACKS, "akkorde-1", addDays(T, 3)).recommend, false);
  s.rep["intervall-4"].faellig = addDays(T, 3);
  assert.deepEqual(basicsOffer(s, PACKS, "akkorde-1", addDays(T, 3)).reason, { kind: "faellig", id: "intervall-4" });
  // Zurücksetzen löscht den Merker (Fortschritt)
  assert.deepEqual(fresh().basics, {});
});

test("W-B4 (a): fehlerfreie Grundlage zählt auch für die Nachbarstufe (Intervalle 3 → 4), nur fehlerfrei", () => {
  // Bericht Wissenschaft B4: nach fehlerfreien Grundlagen zu Intervalle 3 empfahl Intervalle 4 sofort wieder
  // „Noten mit Vorzeichen“ hast du in der App noch nicht geübt.
  assert.deepEqual(needsOf(PACKS, "intervall-3"), needsOf(PACKS, "intervall-4"));
  const s = fresh();
  assert.equal(basicsOffer(s, PACKS, "intervall-4", T).recommend, true);
  const perLevel = [{ id: "intervall-2", n: 3, ok: 3 }, { id: "noten-7", n: 3, ok: 3 }];
  afterBasics(s, "intervall-3", 6, 6, T);
  assert.deepEqual(afterBasicsLevels(s, PACKS, perLevel, T), []);
  assert.deepEqual(s.basicsOk, { "intervall-2": T, "noten-7": T });
  assert.equal(basicsOffer(s, PACKS, "intervall-3", T).recommend, false);
  assert.deepEqual(basicsOffer(s, PACKS, "intervall-4", T), { show: true, recommend: false, reason: null });
  // nur fehlerfreie Grundlagen: noten-7 mit einem Fehler bleibt bei Intervalle 4 empfohlen („nie“)
  const t = fresh();
  afterBasics(t, "intervall-3", 5, 6, T);
  afterBasicsLevels(t, PACKS, [{ id: "intervall-2", n: 3, ok: 3 }, { id: "noten-7", n: 3, ok: 2 }], T);
  assert.deepEqual(t.basicsOk, { "intervall-2": T });
  assert.equal(basicsOffer(t, PACKS, "intervall-3", T).recommend, false); // Merker der Zielstufe (höchstens ein Fehler)
  assert.deepEqual(basicsOffer(t, PACKS, "intervall-4", T).reason, { kind: "nie", id: "noten-7" });
  // eine Runde nur zu einer Grundlage (nach einem Fehlermuster) zählt für diese eine
  afterBasicsLevels(t, PACKS, [{ id: "noten-7", n: 6, ok: 6 }], addDays(T, 1));
  assert.equal(basicsOffer(t, PACKS, "intervall-4", addDays(T, 1)).recommend, false);
  // später neu zutreffend: eine schwache normale Runde nach dem Tag weckt die Empfehlung wieder
  played(t, "noten-7", 5, addDays(T, 2));
  assert.deepEqual(basicsOffer(t, PACKS, "intervall-4", addDays(T, 2)).reason, { kind: "schwach", id: "noten-7" });
  // derselbe Merker gilt für jede Stufe mit dieser Voraussetzung (Tonleitern 2 braucht noten-7)
  const u = fresh();
  afterBasicsLevels(u, PACKS, [{ id: "noten-7", n: 6, ok: 6 }], T);
  assert.equal(basicsOffer(u, PACKS, "tonleitern-2", T).recommend, false);
  // Fortschritt: Zurücksetzen löscht ihn
  assert.deepEqual(reset(u).basicsOk, {});
});

test("W-B4 (b): fällige Grundlage mit mindestens 3 Aufgaben, bestanden → zählt als Wiederholung", () => {
  assert.equal(MIN_AUFGABEN_GRUNDLAGE, 3);
  const rep = () => ({ "noten-7": { fach: 2, faellig: T, zuletzt: "2026-11-22" }, "intervall-2": { fach: 1, faellig: T, zuletzt: "2026-11-24" } });
  // bestanden (3 von 3), fällig: ein Fach weiter; nicht bestanden (2 von 3): bleibt fällig, kein Rückschritt
  const s = withRep(rep());
  const v = afterBasicsLevels(s, PACKS, [{ id: "intervall-2", n: 3, ok: 2 }, { id: "noten-7", n: 3, ok: 3 }], T);
  assert.deepEqual(v.map((x) => [x.id, x.urteil, x.fach, x.inTagen]), [["noten-7", "sitzt", 3, 7]]);
  assert.deepEqual(s.rep["noten-7"], { fach: 3, faellig: addDays(T, 7), zuletzt: T });
  assert.deepEqual(s.rep["intervall-2"], rep()["intervall-2"]);
  assert.deepEqual(due(s, PACKS, T), ["intervall-2"]);
  // weniger als 3 Aufgaben (drei Voraussetzungen, 2 + 2 + 2): kein Urteil, bleibt fällig
  const t = withRep(rep());
  assert.deepEqual(afterBasicsLevels(t, PACKS, [{ id: "noten-7", n: 2, ok: 2 }], T), []);
  assert.deepEqual(t.rep["noten-7"], rep()["noten-7"]);
  // nicht fällig: nichts
  const u = withRep({ "noten-7": { fach: 2, faellig: addDays(T, 2), zuletzt: "2026-11-24" } });
  assert.deepEqual(afterBasicsLevels(u, PACKS, [{ id: "noten-7", n: 6, ok: 6 }], T), []);
  assert.equal(u.rep["noten-7"].faellig, addDays(T, 2));
  // nicht im Kasten: nichts (kein neuer Eintrag)
  const w = fresh();
  assert.deepEqual(afterBasicsLevels(w, PACKS, [{ id: "noten-7", n: 6, ok: 6 }], T), []);
  assert.deepEqual(w.rep, {});
  // 6 Aufgaben, ein Fehler: ⌊6 / 5⌋ = 1 → sitzt
  const x = withRep(rep());
  assert.equal(afterBasicsLevels(x, PACKS, [{ id: "noten-7", n: 6, ok: 5 }], T)[0].urteil, "sitzt");
  // Ratestufe (Tonleitern 3) mit 3 Aufgaben: nur fehlerfrei
  const g = withRep({ "tonleitern-3": { fach: 1, faellig: T, zuletzt: null } });
  assert.deepEqual(afterBasicsLevels(g, PACKS, [{ id: "tonleitern-3", n: 6, ok: 5 }], T), []);
  assert.equal(afterBasicsLevels(g, PACKS, [{ id: "tonleitern-3", n: 3, ok: 3 }], T)[0].urteil, "sitzt");
  // danach ist die Empfehlung „ist wieder dran“ weg (nicht mehr fällig)
  const y = withRep(rep());
  played(y, "noten-7", 9); played(y, "intervall-2", 9);
  assert.deepEqual(basicsOffer(y, PACKS, "intervall-3", T).reason, { kind: "faellig", id: "intervall-2" });
  afterBasicsLevels(y, PACKS, [{ id: "intervall-2", n: 3, ok: 3 }, { id: "noten-7", n: 3, ok: 3 }], T);
  assert.equal(basicsOffer(y, PACKS, "intervall-3", T).recommend, false);
});

// Rundenprotokoll wie engine.finish: je Aufgabe { id, ok, oks }
const entry = (id, oks) => ({ id, ok: oks.every(Boolean), oks });
const logOf = (id, list) => list.map((oks) => entry(id, oks));

test("gapsOf: Muster aus docs/PLAN.md, Abschnitt 2 (echte Stufen)", () => {
  assert.equal(LUECKE_AB, 3);
  const g = (id, list) => gapsOf(PACKS, level(id), logOf(id, list));
  const F = [false, true], S = [true, false], B = [false, false], OK = [true, true];
  // Intervalle 4: Schritt 1 daneben → intervall-2; erst ab drei Fehlern
  assert.deepEqual(g("intervall-4", [F, F, OK, OK]), []);
  assert.deepEqual(g("intervall-4", [F, F, F, OK]), [{ need: "intervall-2", count: 3, step: 0 }]);
  // Aufgaben mit nur einem Schritt (Prime, Quarte …) zählen für Schritt 1
  assert.deepEqual(g("intervall-4", [F, [false], [false]]), [{ need: "intervall-2", count: 3, step: 0 }]);
  // Intervalle 4, Schritt 2 daneben: keine Grundlage, sondern Stufe 3 mit Hilfen
  assert.deepEqual(g("intervall-4", [S, S, S, B]), [{ need: "intervall-3", count: 4, step: 1, helps: true }]);
  // Intervalle 3 hat die Hilfen selbst: Schritt 2 ohne Angebot
  assert.deepEqual(g("intervall-3", [S, S, S]), []);
  // Intervalle 5/6: Schritt 2 → intervall-4; Intervalle 7: → intervall-6
  assert.deepEqual(g("intervall-6", [S, S, S]), [{ need: "intervall-4", count: 3, step: 1 }]);
  assert.deepEqual(g("intervall-7", [S, B, S]), [{ need: "intervall-6", count: 3, step: 1 }]);
  // Tonleitern 4: Schritt 1 → tonleitern-3, Schritt 2 → noten-7; nach Zahl geordnet
  assert.deepEqual(g("tonleitern-4", [F, F, F]), [{ need: "tonleitern-3", count: 3, step: 0 }]);
  assert.deepEqual(g("tonleitern-4", [F, F, F, S, S, S, B]),
    [{ need: "tonleitern-3", count: 4, step: 0 }, { need: "noten-7", count: 4, step: 1 }]);
  assert.deepEqual(g("tonleitern-4", [B, S, S, S, F]),
    [{ need: "noten-7", count: 4, step: 1 }]);
  // Tonleitern 5 (ein Schritt): beide als Ganzes
  assert.deepEqual(g("tonleitern-5", [[false], [false], [false]]),
    [{ need: "tonleitern-3", count: 3, step: null }, { need: "noten-7", count: 3, step: null }]);
  // Tonleitern 12: Stammton → intervall-2, Molltonart → tonleitern-3; Tonleitern 13: beide als Ganzes
  assert.deepEqual(g("tonleitern-12", [F, F, F]), [{ need: "intervall-2", count: 3, step: 0 }]);
  assert.deepEqual(g("tonleitern-12", [S, S, S]), [{ need: "tonleitern-3", count: 3, step: 1 }]);
  assert.deepEqual(g("tonleitern-13", [[false], [false], [false]]),
    [{ need: "intervall-2", count: 3, step: null }, { need: "tonleitern-3", count: 3, step: null }]);
  // Notenwerte 4 und 6: Notenwert daneben → notenwerte-3; Notenwerte 6, Dauer → notenwerte-5
  assert.deepEqual(g("notenwerte-4", [F, F, F]), [{ need: "notenwerte-3", count: 3, step: 0 }]);
  assert.deepEqual(g("notenwerte-4", [S, S, S]), [], "Notenwerte 4, Schritt 2: führt die Dauer selbst ein (mit Hilfen)");
  assert.deepEqual(g("notenwerte-6", [F, F, F, S, S, S]),
    [{ need: "notenwerte-3", count: 3, step: 0 }, { need: "notenwerte-5", count: 3, step: 1 }]);
  // Notenwerte 8: Zählen daneben → notenwerte-5 und -7; beide Schritte daneben zählt einmal
  assert.deepEqual(g("notenwerte-8", [B, B, B]),
    [{ need: "notenwerte-5", count: 3, step: null }, { need: "notenwerte-7", count: 3, step: null }]);
  assert.deepEqual(g("notenwerte-8", [F, F, F]),
    [{ need: "notenwerte-5", count: 3, step: 0 }, { need: "notenwerte-7", count: 3, step: 0 }]);
  assert.deepEqual(g("notenwerte-8", [F, S, F]),
    [{ need: "notenwerte-5", count: 3, step: null }, { need: "notenwerte-7", count: 3, step: null }]);
  // einschrittige Stufe mit einer Voraussetzung
  assert.deepEqual(g("noten-7", [[false], [true], [false], [false]]), [{ need: "noten-3", count: 3, step: null }]);
  // Stufe ohne Voraussetzungen: nichts
  assert.deepEqual(g("noten-1", [[false], [false], [false], [false]]), []);
});

test("gapsOf: nur Einträge der Stufe, richtige zählen nicht, leeres Protokoll", () => {
  const lv = level("intervall-4");
  assert.deepEqual(gapsOf(PACKS, lv, []), []);
  assert.deepEqual(gapsOf(PACKS, lv, undefined), []);
  assert.deepEqual(gapsOf(PACKS, null, []), []);
  const log = [entry("intervall-4", [false, true]), entry("intervall-5", [false, true]), entry("intervall-4", [true, true]),
    entry("intervall-4", [false, true]), entry("intervall-6", [false, true])];
  assert.deepEqual(gapsOf(PACKS, lv, log), []);
  log.push(entry("intervall-4", [false, false]));
  assert.deepEqual(gapsOf(PACKS, lv, log), [{ need: "intervall-2", count: 3, step: 0 }]);
});
