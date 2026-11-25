// Lauf über 40 Tage mit verstellter Uhr (rein, ohne Browser; Welle 11, Schritt 4):
// Karteikasten aus repeat.js mit echten Paketen, örtlichem Datum in Kuala Lumpur und Bayern.
import { test } from "node:test";
import assert from "node:assert/strict";
import { due, reviewPlan, applyReview, afterRound, nextDue, MAX_STUFEN, RUNDE_WIEDERHOLEN } from "../src/repeat.js";
import { fresh, today, dayDiff, recordRound, isUnlocked, touchStreak } from "../src/store.js";
import { PACKS } from "../src/packs/index.js";

const KL = -480, MEZ = -60;
const level = (id) => PACKS.flatMap((p) => p.levels).find((l) => l.id === id);
const packOf = (id) => PACKS.find((p) => p.levels.some((l) => l.id === id));
const allLevels = PACKS.flatMap((p) => p.levels.map((l) => [p, l.id]));
const openSet = (s) => allLevels.filter(([p, id]) => isUnlocked(s, p, id)).map(([, id]) => id);

// Drei Stufen ohne Hilfen aus drei Paketen (A ist die Grundlage im ersten Paket)
const A = "noten-3", C = "notenwerte-5", B = "intervall-2";

// Uhr: Tag d um 10 Uhr Ortszeit (start = Tag 0 als UTC-Zeitpunkt)
function run({ start, offset, pause = null, failC = 4, days = 40 }) {
  const clock = (d) => new Date(start.getTime() + d * 864e5);
  const s = fresh();
  const day0 = today(clock(0), offset);
  // Tag 0: drei Stufen mit 9 von 10 geschafft → Fach 1, fällig an Tag 1
  for (const id of [A, C, B]) {
    recordRound(s, id, 9, clock(0));
    assert.deepEqual(afterRound(s, level(id), 9, day0), { id, sitzt: true, fach: 1, inTagen: 1, neu: true });
  }
  const open0 = openSet(s);
  const faellig = { [A]: [1], [B]: [1], [C]: [1] }; // vergebene Fälligkeiten als Tag des Laufs
  const plans = {};
  for (let d = 1; d <= days; d++) {
    const heute = today(clock(d), offset);
    assert.equal(dayDiff(day0, heute), d);
    // Leitsatz 3: zu keinem Zeitpunkt ist eine zuvor offene Stufe zu
    for (const id of open0) assert.ok(isUnlocked(s, packOf(id), id), `Tag ${d}: ${id} offen`);
    if (pause && d >= pause[0] && d <= pause[1]) continue; // Ferien: nichts gespielt
    const plan = reviewPlan(s, PACKS, heute);
    if (!plan.length) continue;
    plans[d] = { due: due(s, PACKS, heute), plan };
    assert.ok(plan.length <= MAX_STUFEN);
    assert.equal(plan.reduce((a, e) => a + e.n, 0), RUNDE_WIEDERHOLEN);
    // alles richtig, nur C liegt an Tag failC einmal daneben
    const perLevel = plan.map(({ id, n }) => ({ id, n, ok: id === C && d === failC ? n - 1 : n }));
    touchStreak(s, clock(d), offset);
    for (const r of applyReview(s, perLevel, heute)) faellig[r.id].push(dayDiff(day0, s.rep[r.id].faellig));
  }
  return { s, faellig, plans, open0, last: today(clock(days), offset), day0 };
}

test("Lauf über 40 Tage (Kuala Lumpur): Fälligkeiten 1, 4, 11, 25, nächste an Tag 55; Fehler an Tag 4", () => {
  // Tag 0: 25.11.2026, 10:00 in Kuala Lumpur
  const { s, faellig, plans, last, day0 } = run({ start: new Date("2026-11-25T02:00:00Z"), offset: KL });
  assert.equal(day0, "2026-11-25");
  // A und B: immer gewusst
  assert.deepEqual(faellig[A], [1, 4, 11, 25, 55]);
  assert.deepEqual(faellig[B], [1, 4, 11, 25, 55]);
  // C: an Tag 4 nicht bestanden (Fach 2 → 1, am Tag 5 wieder fällig), danach wieder 3, 7, 14 Tage
  assert.deepEqual(faellig[C], [1, 4, 5, 8, 15, 29, 59]);
  assert.deepEqual(Object.keys(plans).map(Number), [1, 4, 5, 8, 11, 15, 25, 29]);
  assert.deepEqual(plans[4].plan, [{ id: A, n: 4 }, { id: C, n: 3 }, { id: B, n: 3 }]); // Grundlagen zuerst
  assert.deepEqual(plans[5].plan, [{ id: C, n: 10 }]);
  assert.deepEqual(plans[25].plan, [{ id: A, n: 5 }, { id: B, n: 5 }]);
  assert.deepEqual([s.rep[A].fach, s.rep[B].fach, s.rep[C].fach], [5, 5, 5]);
  // die nächste Wiederholung liegt außerhalb des Laufs
  assert.equal(dayDiff(day0, nextDue(s, last)), 55);
});

test("Lauf über 40 Tage mit Ferien (Tag 12 bis 26): an Tag 27 ist alles fällig, eine Runde mit höchstens drei Stufen", () => {
  const { s, faellig, plans } = run({ start: new Date("2026-11-25T02:00:00Z"), offset: KL, pause: [12, 26] });
  assert.deepEqual(Object.keys(plans).map(Number), [1, 4, 5, 8, 11, 27]);
  // an Tag 27: alle drei fällig; am längsten fällig zuerst (C seit Tag 15), bei Gleichstand Grundlagen zuerst (A vor B)
  assert.deepEqual(plans[27].due, [C, A, B]);
  assert.deepEqual(plans[27].plan, [{ id: C, n: 4 }, { id: A, n: 3 }, { id: B, n: 3 }]);
  // keine Strafe für die Pause: nach bestandener Runde je ein Fach weiter, Abstand ab Tag 27
  assert.deepEqual(faellig[A], [1, 4, 11, 25, 57]);
  assert.deepEqual(faellig[C], [1, 4, 5, 8, 15, 41]);
  assert.deepEqual([s.rep[A].fach, s.rep[C].fach], [5, 4]);
});

test("Lauf in Bayern (MEZ): gleiche Fälligkeiten, Tageswechsel um Mitternacht Ortszeit", () => {
  // Tag 0: 25.11.2026, 00:30 MEZ (in UTC noch der 24.) – bis Welle 10 hätte die App hier den 24. gezählt
  const { faellig, day0 } = run({ start: new Date("2026-11-24T23:30:00Z"), offset: MEZ });
  assert.equal(day0, "2026-11-25");
  assert.deepEqual(faellig[A], [1, 4, 11, 25, 55]);
  assert.deepEqual(faellig[C], [1, 4, 5, 8, 15, 29, 59]);
});

test("nach langer Pause mit vielen fälligen Stufen: immer nur eine Runde, Grundlagen zuerst, nichts geht verloren", () => {
  const heute = "2026-12-22";
  const ids = ["tonleitern-5", "akkorde-3", "intervall-4", "noten-7", "notenwerte-9", "noten-3", "intervall-2"];
  const s = { ...fresh(), rep: Object.fromEntries(ids.map((id) => [id, { fach: 2, faellig: "2026-12-01", zuletzt: "2026-11-28" }])) };
  const rounds = [];
  while (due(s, PACKS, heute).length) {
    const plan = reviewPlan(s, PACKS, heute);
    assert.ok(plan.length >= 1 && plan.length <= MAX_STUFEN);
    rounds.push(plan.map((e) => e.id));
    applyReview(s, plan.map(({ id, n }) => ({ id, n, ok: n })), heute);
  }
  assert.deepEqual(rounds, [
    ["noten-3", "noten-7", "notenwerte-9"],
    ["intervall-2", "intervall-4", "tonleitern-5"],
    ["akkorde-3"],
  ]);
  for (const id of ids) assert.equal(s.rep[id].fach, 3);
});
