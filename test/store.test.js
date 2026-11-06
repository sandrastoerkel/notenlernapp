import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEY_V1, KEY_V2, fresh, load, save, migrateV1, today, touchStreak, isUnlocked,
  starsFor, recordRound, recordAnswer, recordBlitz, reset, accuracy,
} from "../src/store.js";
import noten from "../src/packs/noten.js";

// Einfacher Ersatz für localStorage
function memStorage(init = {}) {
  const data = { ...init };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test("Freischaltung", () => {
  const s = fresh();
  assert.ok(isUnlocked(s, noten, "noten-1"));
  assert.ok(!isUnlocked(s, noten, "noten-2"));
  s.levels["noten-1"] = { stars: 2, best: 7, played: 1 };
  assert.ok(!isUnlocked(s, noten, "noten-2"));
  s.levels["noten-1"].best = 8;
  assert.ok(isUnlocked(s, noten, "noten-2"));
  assert.ok(!isUnlocked(s, noten, "noten-8"));
  s.unlockAll = true;
  assert.ok(isUnlocked(s, noten, "noten-8"));
});

test("starsFor", () => {
  const expect = { 4: 0, 5: 1, 6: 1, 7: 2, 8: 2, 9: 3, 10: 3 };
  Object.entries(expect).forEach(([c, st]) => assert.equal(starsFor(+c), st, `c=${c}`));
});

test("recordRound: Sterne, XP, Bestwerte", () => {
  const now = new Date("2026-11-06T10:00:00Z");
  const s = fresh();
  assert.deepEqual(recordRound(s, "noten-1", 10, now), { stars: 3, gained: 160 });
  assert.deepEqual(recordRound(s, "noten-1", 8, now), { stars: 2, gained: 120 });
  assert.deepEqual(recordRound(s, "noten-1", 0, now), { stars: 0, gained: 0 });
  assert.deepEqual(s.levels["noten-1"], { stars: 3, best: 10, played: 3 });
  assert.equal(s.xp, 280);
  assert.equal(s.dayStreak, 1);
});

test("recordAnswer", () => {
  const s = fresh();
  recordAnswer(s, "Fis (fis', Violin)", true);
  recordAnswer(s, "Fis (fis', Violin)", false);
  assert.equal(s.answered, 2);
  assert.equal(s.correct, 1);
  assert.deepEqual(s.notes["Fis (fis', Violin)"], { ok: 1, bad: 1 });
  assert.equal(accuracy(s), 50);
  assert.equal(accuracy(fresh()), null);
});

const V1 = {
  xp: 340, dayStreak: 2, lastDay: "2026-11-05",
  levels: { 1: { stars: 3, best: 10, played: 2 }, 2: { stars: 1, best: 5, played: 1 } },
  notes: { "Fis (fis', Violin)": { ok: 3, bad: 1 } },
  answered: 30, correct: 25, bestCombo: 7, blitzRecord: 12, unlockAll: false, muted: true, input: "keys", current: 3,
};

test("migrateV1", () => {
  const s = migrateV1(V1);
  assert.deepEqual(Object.keys(s.levels).sort(), ["noten-1", "noten-2"]);
  assert.equal(s.levels["1"], undefined);
  assert.deepEqual(s.levels["noten-1"], { stars: 3, best: 10, played: 2 });
  assert.equal(s.current, "noten-3");
  assert.equal(s.xp, 340);
  assert.deepEqual(s.notes, V1.notes);
  assert.equal(s.muted, true);
  assert.equal(s.input, "keys");
  assert.equal(migrateV1({ current: "x" }).current, "noten-1");
});

test("load: v1 wird übernommen und als v2 gespeichert, v1 bleibt", () => {
  const st = memStorage({ [KEY_V1]: JSON.stringify(V1) });
  const s = load(st);
  assert.equal(s.current, "noten-3");
  assert.ok(st.data[KEY_V2]);
  assert.equal(st.data[KEY_V1], JSON.stringify(V1));
  // v2 hat Vorrang
  s.xp = 999; save(s, st);
  assert.equal(load(st).xp, 999);
  // ohne Daten und ohne Speicher: frischer Zustand
  assert.deepEqual(load(memStorage()), fresh());
  assert.deepEqual(load(null), fresh());
  assert.deepEqual(load(memStorage({ [KEY_V2]: "{kaputt" })), fresh());
  // ohne Argument (in Node gibt es kein localStorage): frischer Zustand, save wirft nicht
  assert.deepEqual(load(), fresh());
  assert.doesNotThrow(() => save(fresh()));
  // fehlende Felder in v2 werden aus fresh() ergänzt
  assert.deepEqual(load(memStorage({ [KEY_V2]: JSON.stringify({ xp: 5 }) })), { ...fresh(), xp: 5 });
});

test("touchStreak (UTC)", () => {
  const now = new Date("2026-11-06T10:00:00Z");
  assert.equal(today(now), "2026-11-06");
  const s = fresh();
  touchStreak(s, now);
  assert.equal(s.dayStreak, 1);
  assert.equal(s.lastDay, "2026-11-06");
  touchStreak(s, now);
  assert.equal(s.dayStreak, 1);
  touchStreak(s, new Date("2026-11-07T08:00:00Z"));
  assert.equal(s.dayStreak, 2);
  touchStreak(s, new Date("2026-11-09T08:00:00Z"));
  assert.equal(s.dayStreak, 1);
});

test("recordBlitz", () => {
  const now = new Date("2026-11-06T10:00:00Z");
  const s = fresh();
  assert.deepEqual(recordBlitz(s, 12, 6, now), { record: true, gained: 110 });
  assert.equal(s.blitzRecord, 12);
  assert.equal(s.bestCombo, 6);
  assert.deepEqual(recordBlitz(s, 12, 3, now), { record: false, gained: 60 });
  assert.equal(s.bestCombo, 6);
  assert.equal(s.xp, 170);
});

test("reset behält nur Ton und Eingabeart", () => {
  const s = migrateV1(V1);
  const r = reset(s);
  assert.equal(r.muted, true);
  assert.equal(r.input, "keys");
  assert.equal(r.xp, 0);
  assert.deepEqual(r.levels, {});
  assert.equal(r.current, "noten-1");
});
