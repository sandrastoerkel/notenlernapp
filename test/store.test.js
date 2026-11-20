import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEY_V1, KEY_V2, fresh, load, save, migrateV1, today, touchStreak, isUnlocked,
  starsFor, recordRound, recordAnswer, recordBlitz, reset, accuracy, unlockedBy, unlocks,
  migrateIntervalle, MIGRATION_INTERVALLE,
} from "../src/store.js";
import noten from "../src/packs/noten.js";
import intervalle from "../src/packs/intervalle.js";
import tonleitern from "../src/packs/tonleitern.js";
import { FENSTER, ZEIT_DECKEL } from "../src/adapt.js";

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

// Paket mit requires wie im früheren Paket „Intervalle 7–12“ (Stufe 7 nach 1, dann jede nach der vorigen);
// seit „Intervalle neu“ nutzt kein Paket requires mehr, die Logik bleibt erhalten und getestet
const REQ = { levels: Array.from({ length: 12 }, (_, i) => ({ id: `r-${i + 1}`, no: i + 1, ...(i >= 6 ? { requires: `r-${i === 6 ? 1 : i}` } : {}) })) };

test("Freischaltung mit requires", () => {
  const s = fresh();
  const open = (id) => isUnlocked(s, REQ, id);
  assert.ok(open("r-1"));
  assert.ok(!open("r-2") && !open("r-7") && !open("r-8"));
  s.levels["r-1"] = { stars: 2, best: 8, played: 1 };
  assert.ok(open("r-2") && open("r-7"));
  assert.ok(!open("r-8"));
  // Stufe 7 hängt nicht an Stufe 6
  s.levels["r-6"] = { stars: 3, best: 10, played: 1 };
  s.levels["r-1"].best = 7;
  assert.ok(!open("r-7") && !open("r-2"));
  s.levels["r-1"].best = 8;
  s.levels["r-7"] = { stars: 2, best: 8, played: 1 };
  assert.ok(open("r-8") && !open("r-9"));
  s.unlockAll = true;
  assert.ok(open("r-12"));
  assert.equal(unlockedBy(REQ, "r-1"), null);
  assert.equal(unlockedBy(REQ, "r-2").id, "r-1");
  assert.equal(unlockedBy(REQ, "r-7").id, "r-1");
  assert.equal(unlockedBy(REQ, "r-12").id, "r-11");
  assert.equal(unlockedBy(REQ, "gibt-es-nicht"), null);
  assert.deepEqual(unlocks(REQ, "r-1").map((l) => l.id), ["r-2", "r-7"]);
  assert.deepEqual(unlocks(REQ, "r-6").map((l) => l.id), []);
  assert.deepEqual(unlocks(REQ, "r-7").map((l) => l.id), ["r-8"]);
  assert.deepEqual(unlocks(noten, "noten-1").map((l) => l.id), ["noten-2"]);
});

test("Freischaltung: Intervalle und Tonleitern der Reihe nach", () => {
  const s = fresh();
  assert.ok(isUnlocked(s, intervalle, "intervall-1") && !isUnlocked(s, intervalle, "intervall-2"));
  s.levels["intervall-1"] = { stars: 2, best: 8, played: 1 };
  assert.ok(isUnlocked(s, intervalle, "intervall-2") && !isUnlocked(s, intervalle, "intervall-3"));
  assert.ok(!isUnlocked(s, tonleitern, "tonleitern-7"));
  s.levels["tonleitern-6"] = { stars: 2, best: 8, played: 1 };
  assert.ok(isUnlocked(s, tonleitern, "tonleitern-7") && !isUnlocked(s, tonleitern, "tonleitern-8"));
});

test("Freischaltung: eine schon gespielte Stufe bleibt offen", () => {
  const s = fresh();
  s.levels["noten-5"] = { stars: 0, best: 3, played: 1 };
  assert.ok(isUnlocked(s, noten, "noten-5") && !isUnlocked(s, noten, "noten-6"));
  s.levels["noten-6"] = { stars: 0, best: 0, played: 0 };
  assert.ok(!isUnlocked(s, noten, "noten-6"));
});

test("Freischaltung: unbekanntes requires bleibt gesperrt, außer mit unlockAll", () => {
  const pack = { levels: [{ id: "x-1" }, { id: "x-2", requires: "x-9" }, { id: "x-3", requires: "x-1" }, { id: "x-4", requires: "x-4b" }] };
  const s = fresh();
  s.levels["x-1"] = { best: 10 }; s.levels["x-9"] = { best: 10 };
  assert.ok(isUnlocked(s, pack, "x-1"));
  assert.ok(!isUnlocked(s, pack, "x-2"));
  assert.ok(isUnlocked(s, pack, "x-3"));
  assert.ok(!isUnlocked(s, pack, "x-4"));
  assert.equal(unlockedBy(pack, "x-2"), null);
  // auch eine erste Stufe mit unbekanntem requires bleibt zu
  assert.ok(!isUnlocked(s, { levels: [{ id: "y-1", requires: "y-0" }] }, "y-1"));
  s.unlockAll = true;
  assert.ok(isUnlocked(s, pack, "x-2") && isUnlocked(s, pack, "x-4"));
});

/* ---------- Umstellung „Intervalle neu“ (20.11.2026) ---------- */

const OLD_V2 = () => ({
  xp: 1200, dayStreak: 3, lastDay: "2026-11-19", current: "intervalle-5",
  levels: Object.fromEntries([
    ...Array.from({ length: 12 }, (_, i) => [`intervalle-${i + 1}`, { stars: 1, best: 6, played: 1 }]),
    ["noten-1", { stars: 3, best: 10, played: 4 }], ["tonleitern-6", { stars: 1, best: 6, played: 2 }],
  ].map(([k, v]) => [k, k === "intervalle-5" ? { stars: 3, best: 9, played: 2 } : v])),
  notes: { "große Terz": { ok: 4, bad: 1 }, "Ganzton e–f (Sekunde)": { ok: 1, bad: 0 }, "Dur zu 3 ♯ (Violin)": { ok: 2, bad: 1 } },
});

test("Umstellung: alter Spielstand mit intervalle-1 … -12", () => {
  const storage = memStorage({ [KEY_V2]: JSON.stringify(OLD_V2()) });
  const s = load(storage);
  // Tonarten-Stufen umbenannt, Fortschritt bleibt
  assert.deepEqual(s.levels["tonleitern-7"], { stars: 3, best: 9, played: 2 });
  assert.deepEqual(s.levels["tonleitern-8"], { stars: 1, best: 6, played: 1 });
  // alle anderen alten Intervall-Stufen entfallen, andere Pakete bleiben
  assert.deepEqual(Object.keys(s.levels).sort(), ["noten-1", "tonleitern-6", "tonleitern-7", "tonleitern-8"]);
  assert.deepEqual(s.levels["noten-1"], { stars: 3, best: 10, played: 4 });
  assert.equal(s.current, "tonleitern-7");
  assert.deepEqual(s.notes, OLD_V2().notes);
  assert.equal(s.xp, 1200);
  assert.deepEqual(s.migrated, [MIGRATION_INTERVALLE]);
  // gespeichert, und tonleitern-7/8 sind offen, obwohl tonleitern-6 nicht geschafft ist
  assert.deepEqual(JSON.parse(storage.data[KEY_V2]), s);
  assert.ok(isUnlocked(s, tonleitern, "tonleitern-7") && isUnlocked(s, tonleitern, "tonleitern-8"));
  assert.ok(isUnlocked(s, intervalle, "intervall-1") && !isUnlocked(s, intervalle, "intervall-2"));
});

test("Umstellung: s.current auf einer entfallenen Stufe → intervall-1, auf intervalle-6 → tonleitern-8", () => {
  for (const [cur, want] of [["intervalle-1", "intervall-1"], ["intervalle-12", "intervall-1"], ["intervalle-6", "tonleitern-8"], ["noten-3", "noten-3"]]) {
    const s = { ...OLD_V2(), current: cur };
    assert.equal(migrateIntervalle(s), true);
    assert.equal(s.current, want, cur);
  }
});

test("Umstellung: läuft nur einmal (Marker), bereits umgestellte Stände bleiben unverändert", () => {
  const storage = memStorage({ [KEY_V2]: JSON.stringify(OLD_V2()) });
  const first = load(storage);
  const saved = storage.data[KEY_V2];
  // später gespielt: neue Intervall-Stufen und tonleitern-7
  first.levels["intervall-1"] = { stars: 2, best: 8, played: 1 };
  first.levels["tonleitern-7"].played = 5;
  save(first, storage);
  const again = load(storage);
  assert.deepEqual(again, first);
  assert.equal(migrateIntervalle(again), false);
  assert.deepEqual(again.migrated, [MIGRATION_INTERVALLE]);
  assert.notEqual(storage.data[KEY_V2], saved);
  // auch ein Eintrag mit altem Namen bleibt nach der Umstellung, wie er ist
  const t = Object.assign(fresh(), { levels: { "intervalle-3": { stars: 1, best: 5, played: 1 } } });
  assert.equal(migrateIntervalle(t), false);
  assert.deepEqual(t.levels, { "intervalle-3": { stars: 1, best: 5, played: 1 } });
});

test("Umstellung: frischer Stand, v1-Stand und schon vorhandenes tonleitern-7", () => {
  const empty = memStorage();
  const s = load(empty);
  assert.deepEqual(s, fresh());
  assert.equal(empty.data[KEY_V2], undefined);
  // ein frischer Stand trägt den Marker schon; ein Stand ohne Marker und ohne Intervalle bekommt ihn
  assert.deepEqual(fresh().migrated, [MIGRATION_INTERVALLE]);
  assert.equal(migrateIntervalle(fresh()), false);
  const s2 = { ...fresh(), migrated: undefined };
  assert.equal(migrateIntervalle(s2), true);
  assert.deepEqual(s2.levels, {});
  assert.equal(s2.current, "noten-1");
  assert.deepEqual(s2.migrated, [MIGRATION_INTERVALLE]);
  // v1 wird übernommen und gleich als umgestellt markiert
  const v1 = memStorage({ [KEY_V1]: JSON.stringify({ xp: 50, levels: { 1: { stars: 2, best: 8, played: 1 } }, current: 2 }) });
  const s3 = load(v1);
  assert.deepEqual(s3.levels, { "noten-1": { stars: 2, best: 8, played: 1 } });
  assert.equal(s3.current, "noten-2");
  assert.deepEqual(s3.migrated, [MIGRATION_INTERVALLE]);
  // gab es tonleitern-7 schon (z. B. mit Demo-Freischaltung gespielt), werden beide zusammengeführt
  const s4 = Object.assign(fresh(), { migrated: [], levels: { "tonleitern-7": { stars: 1, best: 6, played: 1 }, "intervalle-5": { stars: 2, best: 8, played: 3 } } });
  migrateIntervalle(s4);
  assert.deepEqual(s4.levels, { "tonleitern-7": { stars: 2, best: 8, played: 4 } });
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
  assert.deepEqual(s.notes["Fis (fis', Violin)"], { ok: 1, bad: 1, sec: 0, timed: 0, last: today(), hist: "10", hsec: [] });
  assert.equal(accuracy(s), 50);
  assert.equal(accuracy(fresh()), null);
});

test("recordAnswer: Zeit zählt nur bei richtigen Antworten", () => {
  const now = new Date("2026-11-19T08:00:00Z");
  const s = fresh();
  recordAnswer(s, "G (g', Violin)", true, 2.5, now);
  recordAnswer(s, "G (g', Violin)", false, 9, now);
  recordAnswer(s, "G (g', Violin)", true, 1.25, now);
  recordAnswer(s, "G (g', Violin)", true, undefined, now);
  recordAnswer(s, "G (g', Violin)", true, NaN, now);
  recordAnswer(s, "G (g', Violin)", true, -1, now);
  assert.deepEqual(s.notes["G (g', Violin)"], { ok: 5, bad: 1, sec: 3.75, timed: 2, last: "2026-11-19", hist: "101111", hsec: [2.5, 1.25] });
});

test("recordAnswer: alte Einträge ohne sec, timed und last", () => {
  const now = new Date("2026-11-19T08:00:00Z");
  const s = fresh();
  s.notes["A (a', Violin)"] = { ok: 3, bad: 2 };
  recordAnswer(s, "A (a', Violin)", true, 2, now);
  assert.deepEqual(s.notes["A (a', Violin)"], { ok: 4, bad: 2, sec: 2, timed: 1, last: "2026-11-19", hist: "1", hsec: [2] });
  s.notes["H (h', Violin)"] = { ok: 1, bad: 0 };
  recordAnswer(s, "H (h', Violin)", false, 3, now);
  assert.deepEqual(s.notes["H (h', Violin)"], { ok: 1, bad: 1, sec: 0, timed: 0, last: "2026-11-19", hist: "0", hsec: [] });
});

test("recordAnswer: Zeit höchstens ZEIT_DECKEL Sekunden", () => {
  const s = fresh();
  recordAnswer(s, "G (g', Violin)", true, 120);
  recordAnswer(s, "G (g', Violin)", true, 10);
  recordAnswer(s, "G (g', Violin)", true, 9.5);
  const e = s.notes["G (g', Violin)"];
  assert.equal(ZEIT_DECKEL, 10);
  assert.equal(e.sec, 29.5); assert.equal(e.timed, 3);
  assert.deepEqual(e.hsec, [10, 10, 9.5]);
});

test("recordAnswer: Verlauf hält nur die letzten FENSTER Antworten", () => {
  const s = fresh();
  for (let i = 0; i < 20; i++) recordAnswer(s, "C (c', Violin)", false);
  for (let i = 0; i < 15; i++) recordAnswer(s, "C (c', Violin)", true, i + 1);
  const e = s.notes["C (c', Violin)"];
  assert.equal(FENSTER, 12);
  assert.equal(e.ok, 15); assert.equal(e.bad, 20);
  assert.equal(e.hist, "1".repeat(12));
  assert.deepEqual(e.hsec, [4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10, 10]);
});

test("load: alter v2-Spielstand mit { ok, bad } lädt unverändert", () => {
  const old = { xp: 50, notes: { "C (c', Violin)": { ok: 2, bad: 5 } } };
  const st = memStorage({ [KEY_V2]: JSON.stringify(old) });
  const s = load(st);
  assert.deepEqual(s.notes, old.notes);
  assert.equal(s.xp, 50);
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
