// Tests für src/repeat.js: Karteikasten (Wiederholung über Tage, Welle 11, Schritt 4)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ABSTAENDE, FAECHER, RUNDE_WIEDERHOLEN, RUNDE_GRUNDLAGEN, MAX_STUFEN, MIN_AUFGABEN_RATEN,
  inBox, boxIds, enter, due, nextDue, reviewPlan, passed, applyReview, afterRound, dueText, dayText,
  needsOf, stepNeedsOf, skillOf, needsText,
} from "../src/repeat.js";
import { fresh, addDays, UMSTELLUNG_JE_TAG } from "../src/store.js";
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
    [{ id: "noten-3", n: 3 }, { id: "intervall-2", n: 3 }, { id: "akkorde-1", n: 4 }]);
});
