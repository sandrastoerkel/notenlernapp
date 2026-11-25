// Tests für src/repeat.js: Karteikasten (Wiederholung über Tage, Welle 11, Schritt 4)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ABSTAENDE, FAECHER, RUNDE_WIEDERHOLEN, RUNDE_GRUNDLAGEN, MAX_STUFEN, MIN_AUFGABEN_RATEN,
  inBox, boxIds, enter, due, nextDue, reviewPlan, passed, applyReview, afterRound, dueText, dayText,
} from "../src/repeat.js";
import { fresh, addDays, UMSTELLUNG_JE_TAG } from "../src/store.js";
import { PACKS } from "../src/packs/index.js";

const T = "2026-11-25";
const level = (id) => PACKS.flatMap((p) => p.levels).find((l) => l.id === id);

// Kleine Pakete für reviewPlan (guess wird erst in Schritt 5 in den echten Paketen gesetzt)
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
  assert.deepEqual(reviewPlan(dueOn(["a-1", "a-2", "a-3"]), FAKE, T), [{ id: "a-1", n: 3 }, { id: "a-2", n: 4 }, { id: "a-3", n: 3 }]);
  // zwei Ratestufen unter drei fälligen: 4 + 4 + 2 ließe der dritten nur zwei Aufgaben → nur die ersten zwei (5 + 5)
  assert.deepEqual(reviewPlan(dueOn(["a-1", "a-2", "b-2"]), FAKE, T), [{ id: "a-1", n: 5 }, { id: "a-2", n: 5 }]);
  assert.deepEqual(reviewPlan(dueOn(["a-2", "b-2", "b-4"]), FAKE, T), [{ id: "a-2", n: 5 }, { id: "b-2", n: 5 }]);
  // zwei Stufen: 5 + 5 reicht auch für zwei Ratestufen
  assert.deepEqual(reviewPlan(dueOn(["b-2", "a-3"]), FAKE, T), [{ id: "a-3", n: 5 }, { id: "b-2", n: 5 }]);
  // die Stufe mit Hilfen (b-1) kommt nie in die Runde
  assert.deepEqual(reviewPlan(dueOn(["b-1"]), FAKE, T), []);
});

test("passed: höchstens ⌊n / 5⌋ Fehler", () => {
  assert.ok(passed(3, 0)); assert.ok(!passed(3, 1));
  assert.ok(passed(4, 0)); assert.ok(!passed(4, 1));
  assert.ok(passed(5, 1)); assert.ok(!passed(5, 2));
  assert.ok(passed(10, 2)); assert.ok(!passed(10, 3)); // 8 von 10
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
  const res = applyReview(s, [{ id: "noten-7", n: 4, ok: 3 }, { id: "noten-3", n: 3, ok: 0 }], T);
  assert.deepEqual(res, [
    { id: "noten-7", sitzt: false, fach: 2, inTagen: 1 },
    { id: "noten-3", sitzt: false, fach: 1, inTagen: 1 },
  ]);
  assert.deepEqual(s.rep["noten-7"], { fach: 2, faellig: "2026-11-26", zuletzt: T });
  assert.deepEqual(s.rep["noten-3"], { fach: 1, faellig: "2026-11-26", zuletzt: T });
  // 5 Aufgaben, eine daneben: sitzt
  assert.equal(applyReview(s, [{ id: "noten-7", n: 5, ok: 4 }], T)[0].sitzt, true);
  // beschädigter Eintrag gilt als Fach 1
  const b = withRep({ "noten-1": { fach: "x", faellig: T } });
  assert.deepEqual(applyReview(b, [{ id: "noten-1", n: 10, ok: 10 }], T)[0], { id: "noten-1", sitzt: true, fach: 2, inTagen: 3 });
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
  assert.equal(afterRound(s, level("intervall-2"), 2, T), null);
  assert.deepEqual(s.rep["intervall-2"], { fach: 1, faellig: "2026-11-26", zuletzt: T });
  // fällig und ≥ 8: wie bestanden
  assert.deepEqual(afterRound(s, level("intervall-2"), 8, "2026-11-26"), { id: "intervall-2", sitzt: true, fach: 2, inTagen: 3 });
  // fällig und < 8: wie nicht bestanden
  assert.deepEqual(afterRound(s, level("intervall-2"), 7, "2026-11-30"), { id: "intervall-2", sitzt: false, fach: 1, inTagen: 1 });
  assert.deepEqual(s.rep["intervall-2"], { fach: 1, faellig: "2026-12-01", zuletzt: "2026-11-30" });
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
