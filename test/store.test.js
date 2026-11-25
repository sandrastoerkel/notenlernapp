import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEY_V1, KEY_V2, fresh, load, save, migrateV1, today, touchStreak, isUnlocked,
  starsFor, recordRound, recordAnswer, recordBlitz, reset, accuracy, unlockedBy, unlocks,
  migrateIntervalle, MIGRATION_INTERVALLE, migrateTonleitern, MIGRATION_TONLEITERN, RENAMED_TONLEITERN, migrateAll,
  migrateNotenwerte, MIGRATION_NOTENWERTE, RENAMED_NOTENWERTE,
  MIGRATION_WIEDERHOLEN, UMSTELLUNG_JE_TAG, migrateWiederholen, localDay, addDays, dayDiff,
} from "../src/store.js";
import noten from "../src/packs/noten.js";
import intervalle from "../src/packs/intervalle.js";
import tonleitern from "../src/packs/tonleitern.js";
import notenwerte from "../src/packs/notenwerte.js";
import akkorde from "../src/packs/akkorde.js";
import { PACKS } from "../src/packs/index.js";
import { findLevel } from "../src/engine.js";
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
  assert.ok(!isUnlocked(s, tonleitern, "tonleitern-10"));
  s.levels["tonleitern-9"] = { stars: 2, best: 8, played: 1 };
  assert.ok(isUnlocked(s, tonleitern, "tonleitern-10") && !isUnlocked(s, tonleitern, "tonleitern-11"));
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

test("Umstellung: alter Spielstand mit intervalle-1 … -12, über load danach auch die Tonleitern", () => {
  const storage = memStorage({ [KEY_V2]: JSON.stringify(OLD_V2()) });
  const s = load(storage);
  // erst migrateIntervalle (intervalle-5/-6 → tonleitern-7/-8), dann migrateTonleitern (7 → 11, 8 → 13, 6 → 9)
  assert.deepEqual(s.levels["tonleitern-11"], { stars: 3, best: 9, played: 2 });
  assert.deepEqual(s.levels["tonleitern-13"], { stars: 1, best: 6, played: 1 });
  assert.deepEqual(s.levels["tonleitern-9"], { stars: 1, best: 6, played: 2 });
  assert.deepEqual(Object.keys(s.levels).sort(), ["noten-1", "tonleitern-11", "tonleitern-13", "tonleitern-9"]);
  assert.deepEqual(s.levels["noten-1"], { stars: 3, best: 10, played: 4 });
  assert.equal(s.current, "tonleitern-11");
  assert.deepEqual(s.notes, OLD_V2().notes);
  assert.equal(s.xp, 1200);
  assert.deepEqual(s.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE]);
  assert.deepEqual(JSON.parse(storage.data[KEY_V2]), s);
  // gespielte Stufen bleiben offen, obwohl die Stufen davor nicht geschafft sind; 10 ist zu (9 hat best 6),
  // 12 offen (11 hat best 9)
  assert.ok(isUnlocked(s, tonleitern, "tonleitern-11") && isUnlocked(s, tonleitern, "tonleitern-13") && isUnlocked(s, tonleitern, "tonleitern-9"));
  assert.ok(!isUnlocked(s, tonleitern, "tonleitern-10") && isUnlocked(s, tonleitern, "tonleitern-12"));
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
  first.levels["tonleitern-11"].played = 5;
  save(first, storage);
  const again = load(storage);
  assert.deepEqual(again, first);
  assert.equal(migrateIntervalle(again), false);
  assert.equal(migrateTonleitern(again), false);
  assert.deepEqual(again.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE]);
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
  assert.deepEqual(fresh().migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_WIEDERHOLEN]);
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
  assert.deepEqual(s3.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE]);
  // gab es tonleitern-7 schon (z. B. mit Demo-Freischaltung gespielt), werden beide zusammengeführt
  const s4 = Object.assign(fresh(), { migrated: [], levels: { "tonleitern-7": { stars: 1, best: 6, played: 1 }, "intervalle-5": { stars: 2, best: 8, played: 3 } } });
  migrateIntervalle(s4);
  assert.deepEqual(s4.levels, { "tonleitern-7": { stars: 2, best: 8, played: 4 } });
});

/* ---------- Umstellung „Tonleitern gehirngerecht“ (Welle 8, 20.11.2026) ---------- */

const OLD_TL = () => ({
  xp: 500, current: "tonleitern-3", migrated: [MIGRATION_INTERVALLE],
  levels: Object.fromEntries([...Array.from({ length: 8 }, (_, i) => [`tonleitern-${i + 1}`, { stars: 1, best: i + 1, played: i + 1 }]),
    ["noten-2", { stars: 2, best: 8, played: 3 }], ["intervall-1", { stars: 1, best: 5, played: 1 }]]),
  notes: { "G-Dur, 7. Stufe (Lücke)": { ok: 2, bad: 1 }, "Dur zu 3 ♯ (Violin)": { ok: 1, bad: 0 } },
});

test("Umstellung Tonleitern: 1→1, 2→2, 3→4, 4→5, 5→7, 6→9, 7→11, 8→13 in einem Durchgang", () => {
  assert.deepEqual(RENAMED_TONLEITERN, {
    "tonleitern-1": "tonleitern-1", "tonleitern-2": "tonleitern-2", "tonleitern-3": "tonleitern-4", "tonleitern-4": "tonleitern-5",
    "tonleitern-5": "tonleitern-7", "tonleitern-6": "tonleitern-9", "tonleitern-7": "tonleitern-11", "tonleitern-8": "tonleitern-13",
  });
  const s = OLD_TL();
  assert.equal(migrateTonleitern(s), true);
  // keine Verkettung (3→4 und danach 4→5): jede alte Stufe landet genau einmal am neuen Platz
  assert.deepEqual(s.levels, {
    "tonleitern-1": { stars: 1, best: 1, played: 1 }, "tonleitern-2": { stars: 1, best: 2, played: 2 },
    "tonleitern-4": { stars: 1, best: 3, played: 3 }, "tonleitern-5": { stars: 1, best: 4, played: 4 },
    "tonleitern-7": { stars: 1, best: 5, played: 5 }, "tonleitern-9": { stars: 1, best: 6, played: 6 },
    "tonleitern-11": { stars: 1, best: 7, played: 7 }, "tonleitern-13": { stars: 1, best: 8, played: 8 },
    "noten-2": { stars: 2, best: 8, played: 3 }, "intervall-1": { stars: 1, best: 5, played: 1 },
  });
  assert.equal(s.current, "tonleitern-4");
  assert.deepEqual(s.notes, OLD_TL().notes);
  assert.deepEqual(s.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN]);
  // nur einmal
  assert.equal(migrateTonleitern(s), false);
  assert.equal(s.levels["tonleitern-4"].best, 3);
  for (const [cur, want] of [["tonleitern-1", "tonleitern-1"], ["tonleitern-5", "tonleitern-7"], ["tonleitern-8", "tonleitern-13"], ["noten-3", "noten-3"], ["intervall-2", "intervall-2"]]) {
    const t = { ...OLD_TL(), current: cur };
    migrateTonleitern(t);
    assert.equal(t.current, want, cur);
  }
});

test("Umstellung Tonleitern: über load nach migrateIntervalle, auch bei v1 und frischem Stand", () => {
  // Stand, in dem Intervalle schon umgestellt waren (live seit 20.11.2026): nur die Tonleitern rücken nach
  const st = memStorage({ [KEY_V2]: JSON.stringify(OLD_TL()) });
  const s = load(st);
  assert.equal(s.levels["tonleitern-13"].best, 8);
  assert.equal(s.levels["tonleitern-8"], undefined);
  assert.equal(s.current, "tonleitern-4");
  assert.deepEqual(JSON.parse(st.data[KEY_V2]).migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE]);
  // ganz alter Stand ohne Marker: alte Intervalle und alte Tonleitern gemischt, beide Umstellungen nacheinander
  const mixed = { current: "intervalle-6", levels: { "tonleitern-6": { stars: 2, best: 8, played: 2 }, "intervalle-5": { stars: 1, best: 6, played: 1 }, "intervalle-6": { stars: 3, best: 10, played: 2 }, "intervalle-9": { stars: 1, best: 5, played: 1 } } };
  const s2 = load(memStorage({ [KEY_V2]: JSON.stringify(mixed) }));
  assert.deepEqual(s2.levels, { "tonleitern-9": { stars: 2, best: 8, played: 2 }, "tonleitern-11": { stars: 1, best: 6, played: 1 }, "tonleitern-13": { stars: 3, best: 10, played: 2 } });
  assert.equal(s2.current, "tonleitern-13");
  // umgekehrte Reihenfolge wäre falsch: dann landete intervalle-5 auf tonleitern-7 („Welcher Ton passt nicht?“)
  const wrong = { ...mixed, levels: { ...mixed.levels }, migrated: [] };
  migrateTonleitern(wrong); migrateIntervalle(wrong);
  assert.ok(wrong.levels["tonleitern-7"]);
  const right = { ...mixed, levels: { ...mixed.levels }, migrated: [] };
  assert.equal(migrateAll(right), true);
  assert.deepEqual(right.levels, s2.levels);
  assert.equal(migrateAll(right), false);
  // ein Durchgang ändert nur eine Umstellung: trotzdem wird gespeichert
  const half = { ...OLD_TL() };
  assert.equal(migrateAll(half), true);
  // frischer Stand und v1: beide Marker, nichts umgestellt
  assert.equal(migrateAll(fresh()), false);
  const v1 = memStorage({ [KEY_V1]: JSON.stringify({ xp: 50, levels: { 3: { stars: 2, best: 8, played: 1 } }, current: 3 }) });
  const s3 = load(v1);
  assert.deepEqual(s3.levels, { "noten-3": { stars: 2, best: 8, played: 1 } });
  assert.deepEqual(s3.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE]);
});

test("Umstellung Tonleitern: Freischaltung danach (bewusst hingenommene Folgen)", () => {
  // (a) alte Stufe 3 war offen (alte 2 mit 8 geschafft), aber nie gespielt: jetzt Stufe 4, erst offen, wenn die
  // neue Stufe 3 mit 8 geschafft ist; die neue Stufe 3 ist sofort offen
  const a = { ...fresh(), migrated: [MIGRATION_INTERVALLE], levels: { "tonleitern-1": { stars: 3, best: 10, played: 1 }, "tonleitern-2": { stars: 2, best: 8, played: 1 } } };
  migrateAll(a);
  assert.ok(isUnlocked(a, tonleitern, "tonleitern-2") && isUnlocked(a, tonleitern, "tonleitern-3"));
  assert.ok(!isUnlocked(a, tonleitern, "tonleitern-4"));
  a.levels["tonleitern-3"] = { stars: 2, best: 8, played: 1 };
  assert.ok(isUnlocked(a, tonleitern, "tonleitern-4") && !isUnlocked(a, tonleitern, "tonleitern-5"));
  // (b) Tonarten früher im Paket „Intervalle“ gespielt, alte 6 nicht geschafft: 11 offen, 10 zu; 12 offen,
  // sobald 11 best ≥ 8 hat
  const b = { ...fresh(), migrated: [], current: "intervalle-5", levels: { "intervalle-5": { stars: 1, best: 6, played: 2 } } };
  migrateAll(b);
  assert.deepEqual(b.levels, { "tonleitern-11": { stars: 1, best: 6, played: 2 } });
  assert.equal(b.current, "tonleitern-11");
  assert.ok(isUnlocked(b, tonleitern, "tonleitern-11") && !isUnlocked(b, tonleitern, "tonleitern-10") && !isUnlocked(b, tonleitern, "tonleitern-12"));
  b.levels["tonleitern-11"].best = 8;
  assert.ok(isUnlocked(b, tonleitern, "tonleitern-12") && !isUnlocked(b, tonleitern, "tonleitern-10"));
  // nichts Gespieltes wird gesperrt; „Alle Stufen freischalten“ bleibt
  const d = OLD_TL(); migrateAll(d);
  for (const id of Object.keys(d.levels).filter((k) => k.startsWith("tonleitern-"))) assert.ok(isUnlocked(d, tonleitern, id), id);
  d.unlockAll = true;
  assert.ok(tonleitern.levels.every((l) => isUnlocked(d, tonleitern, l.id)));
});

/* ---------- Umstellung „Notenwerte gehirngerecht“ (Welle 9, 20.11.2026) ---------- */

const ALL3 = [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE];
// Stand vor Welle 9: Intervalle und Tonleitern schon umgestellt, Notenwerte noch mit sechs Stufen
const OLD_NW = () => ({
  xp: 300, current: "notenwerte-5", migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN],
  levels: Object.fromEntries([...Array.from({ length: 6 }, (_, i) => [`notenwerte-${i + 1}`, { stars: 1, best: i + 3, played: i + 1 }]),
    ["noten-1", { stars: 3, best: 10, played: 2 }], ["tonleitern-4", { stars: 2, best: 8, played: 1 }]]),
  notes: { "Fis (Violin)": { ok: 3, bad: 1 } },
});

test("Umstellung Notenwerte: 1→1, 2→2, 3→5, 4→7, 5→9, 6→10 in einem Durchgang", () => {
  assert.deepEqual(RENAMED_NOTENWERTE, {
    "notenwerte-1": "notenwerte-1", "notenwerte-2": "notenwerte-2", "notenwerte-3": "notenwerte-5",
    "notenwerte-4": "notenwerte-7", "notenwerte-5": "notenwerte-9", "notenwerte-6": "notenwerte-10",
  });
  // jede alte Stufe landet auf der neuen Stufe gleichen Inhalts; 3–6 auf Stufen ohne Hilfen, 1 und 2 bleiben
  // (gleicher Inhalt, jetzt mit Hilfen; Stufe 1 in zwei Schritten)
  for (const [from, to] of Object.entries(RENAMED_NOTENWERTE)) {
    const level = notenwerte.levels.find((l) => l.id === to);
    assert.ok(level, to);
    assert.equal(!!level.helps, from === "notenwerte-1" || from === "notenwerte-2", `${from} → ${to}`);
  }
  const s = OLD_NW();
  assert.equal(migrateNotenwerte(s), true);
  // keine Verkettung (3→5 und danach 5→9)
  assert.deepEqual(s.levels, {
    "notenwerte-1": { stars: 1, best: 3, played: 1 }, "notenwerte-2": { stars: 1, best: 4, played: 2 },
    "notenwerte-5": { stars: 1, best: 5, played: 3 }, "notenwerte-7": { stars: 1, best: 6, played: 4 },
    "notenwerte-9": { stars: 1, best: 7, played: 5 }, "notenwerte-10": { stars: 1, best: 8, played: 6 },
    "noten-1": { stars: 3, best: 10, played: 2 }, "tonleitern-4": { stars: 2, best: 8, played: 1 },
  });
  assert.equal(s.current, "notenwerte-9");
  assert.deepEqual(s.notes, OLD_NW().notes);
  assert.deepEqual(s.migrated, ALL3);
  assert.equal(migrateNotenwerte(s), false, "nur einmal");
  assert.equal(s.levels["notenwerte-9"].best, 7);
  for (const [cur, want] of [["notenwerte-1", "notenwerte-1"], ["notenwerte-3", "notenwerte-5"], ["notenwerte-6", "notenwerte-10"], ["tonleitern-4", "tonleitern-4"], ["noten-2", "noten-2"]]) {
    const t = { ...OLD_NW(), current: cur };
    migrateNotenwerte(t);
    assert.equal(t.current, want, cur);
  }
});

test("Umstellung Notenwerte: über load, auch zusammen mit alten Intervall- und Tonleiter-Ständen", () => {
  const st = memStorage({ [KEY_V2]: JSON.stringify(OLD_NW()) });
  const s = load(st);
  assert.equal(s.levels["notenwerte-10"].best, 8);
  assert.equal(s.levels["notenwerte-6"], undefined);
  assert.equal(s.current, "notenwerte-9");
  assert.deepEqual(JSON.parse(st.data[KEY_V2]).migrated, ALL3);
  // ganz alter Stand ohne Marker: alte Intervalle, alte Tonleitern und alte Notenwerte gemischt
  const mixed = { current: "notenwerte-4", levels: {
    "intervalle-5": { stars: 1, best: 6, played: 1 }, "intervalle-2": { stars: 1, best: 5, played: 1 }, "tonleitern-3": { stars: 2, best: 8, played: 2 },
    "notenwerte-3": { stars: 2, best: 8, played: 2 }, "notenwerte-5": { stars: 3, best: 9, played: 3 }, "notenwerte-6": { stars: 1, best: 5, played: 1 },
  } };
  const s2 = load(memStorage({ [KEY_V2]: JSON.stringify(mixed) }));
  assert.deepEqual(s2.levels, {
    "tonleitern-11": { stars: 1, best: 6, played: 1 }, "tonleitern-4": { stars: 2, best: 8, played: 2 },
    "notenwerte-5": { stars: 2, best: 8, played: 2 }, "notenwerte-9": { stars: 3, best: 9, played: 3 }, "notenwerte-10": { stars: 1, best: 5, played: 1 },
  });
  assert.equal(s2.current, "notenwerte-7");
  assert.deepEqual(s2.migrated, ALL3);
  // wo migrateNotenwerte läuft, ist gleich (die anderen beiden fassen notenwerte-* nicht an)
  const other = { ...mixed, levels: { ...mixed.levels }, migrated: [] };
  migrateNotenwerte(other); migrateIntervalle(other); migrateTonleitern(other);
  assert.deepEqual(other.levels, s2.levels);
  // migrateAll: jede Umstellung läuft, auch wenn nur die dritte etwas ändert
  const onlyNw = { ...OLD_NW(), levels: { ...OLD_NW().levels } };
  assert.equal(migrateAll(onlyNw), true);
  assert.deepEqual(onlyNw.migrated, ALL3);
  assert.equal(migrateAll(onlyNw), false);
  const noMarker = { ...fresh(), migrated: [] };
  assert.equal(migrateAll(noMarker), true);
  assert.deepEqual(noMarker.migrated, ALL3);
  assert.equal(migrateAll(fresh()), false);
  // v1-Stand: alle drei Marker, nichts umgestellt
  const v1 = load(memStorage({ [KEY_V1]: JSON.stringify({ xp: 10, levels: { 2: { stars: 1, best: 6, played: 1 } }, current: 2 }) }));
  assert.deepEqual(v1.levels, { "noten-2": { stars: 1, best: 6, played: 1 } });
  assert.deepEqual(v1.migrated, ALL3);
});

test("Umstellung Notenwerte: Freischaltung danach (bewusst hingenommen: 4 zu, 5 offen)", () => {
  // alter Stand, der alles geschafft hatte
  const s = { ...fresh(), migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN],
    levels: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`notenwerte-${i + 1}`, { stars: 3, best: 10, played: 1 }])) };
  migrateAll(s);
  const open = notenwerte.levels.filter((l) => isUnlocked(s, notenwerte, l.id)).map((l) => l.no);
  // 1, 2, 5, 7, 9, 10 gespielt; 3 offen (2 geschafft), 6 und 8 offen (5 bzw. 7 geschafft); 4 zu, bis 3 geschafft ist
  assert.deepEqual(open, [1, 2, 3, 5, 6, 7, 8, 9, 10]);
  s.levels["notenwerte-3"] = { stars: 2, best: 8, played: 1 };
  assert.ok(isUnlocked(s, notenwerte, "notenwerte-4"));
  // frischer Stand: nur Stufe 1 offen
  assert.deepEqual(notenwerte.levels.filter((l) => isUnlocked(fresh(), notenwerte, l.id)).map((l) => l.no), [1]);
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
  // (mit Liste der Stufen ohne Hilfen, sonst bleibt der Marker "wiederholen" aus, siehe unten)
  assert.deepEqual(load(memStorage({ [KEY_V2]: JSON.stringify({ xp: 5 }) }), new Date(), []), { ...fresh(), xp: 5 });
});

test("touchStreak (Verschiebung 0, wie bisher in UTC)", () => {
  const now = new Date("2026-11-06T10:00:00Z");
  assert.equal(today(now, 0), "2026-11-06");
  const s = fresh();
  touchStreak(s, now, 0);
  assert.equal(s.dayStreak, 1);
  assert.equal(s.lastDay, "2026-11-06");
  touchStreak(s, now, 0);
  assert.equal(s.dayStreak, 1);
  touchStreak(s, new Date("2026-11-07T08:00:00Z"), 0);
  assert.equal(s.dayStreak, 2);
  touchStreak(s, new Date("2026-11-09T08:00:00Z"), 0);
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
  s.rep = { "noten-3": { fach: 2, faellig: "2026-11-27", zuletzt: "2026-11-24" } };
  s.klasse = { jahrgang: 6, zweig: null, dran: { noten: 8 } };
  const r = reset(s);
  // Welle 11: der Jahrgang der Lehrkraft bleibt (Einstellung), der Karteikasten wird gelöscht (Fortschritt)
  assert.deepEqual(r.klasse, { jahrgang: 6, zweig: null, dran: { noten: 8 } });
  assert.deepEqual(r.rep, {});
  assert.ok(r.migrated.includes(MIGRATION_WIEDERHOLEN));
  assert.equal(reset(fresh()).klasse, null);
  assert.equal(r.muted, true);
  assert.equal(r.input, "keys");
  assert.equal(r.xp, 0);
  assert.deepEqual(r.levels, {});
  assert.equal(r.current, "noten-1");
});

/* ---------- Paketreihenfolge (Welle 11, Schritt 3): Intervalle vor Tonleitern ---------- */

// Reihenfolge bis Welle 10 (Tonleitern vor Intervallen), zum Vergleich
const OLD_ORDER = [noten, notenwerte, tonleitern, intervalle, akkorde];

test("Paketreihenfolge: Intervalle vor Tonleitern, dieselben Pakete und Stufen-IDs wie vorher", () => {
  assert.deepEqual(PACKS.map((p) => p.id), ["noten", "notenwerte", "intervalle", "tonleitern", "akkorde"]);
  // nur die Reihenfolge der Pakete ändert sich: jede Stufen-ID (Schlüssel im Spielstand) bleibt, auch innerhalb der Pakete
  const ids = (packs) => Object.fromEntries(packs.map((p) => [p.id, p.levels.map((l) => l.id)]));
  assert.deepEqual(ids(PACKS), ids(OLD_ORDER));
  assert.deepEqual(ids(PACKS).intervalle, Array.from({ length: 10 }, (_, i) => `intervall-${i + 1}`));
  assert.deepEqual(ids(PACKS).tonleitern, Array.from({ length: 13 }, (_, i) => `tonleitern-${i + 1}`));
});

test("Paketreihenfolge: gespeicherte Spielstände bleiben unverändert (Fortschritt, Freischaltung, Umstellungen)", () => {
  // Stand nach allen Umstellungen, mit Fortschritt in jedem Paket und current in den Intervallen
  const saved = {
    ...fresh(), xp: 1234, streak: 3, lastDay: "2026-11-24", answered: 300, correct: 250,
    current: "intervall-4", migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE],
    levels: {
      "noten-1": { stars: 3, best: 10, played: 4 }, "noten-2": { stars: 2, best: 8, played: 2 },
      "notenwerte-1": { stars: 2, best: 8, played: 1 },
      "intervall-1": { stars: 3, best: 9, played: 3 }, "intervall-2": { stars: 2, best: 8, played: 1 },
      "intervall-3": { stars: 1, best: 6, played: 2 },
      "tonleitern-1": { stars: 2, best: 8, played: 1 }, "tonleitern-11": { stars: 1, best: 6, played: 2 },
      "akkorde-1": { stars: 1, best: 5, played: 1 },
    },
    notes: { "treble:c'": { ok: 5, bad: 1 } },
  };
  const raw = JSON.stringify(saved);
  const st = memStorage({ [KEY_V2]: raw });
  const s = load(st);
  // nichts umgestellt, nichts neu gespeichert, alles wie gespeichert
  assert.equal(st.data[KEY_V2], raw);
  assert.deepEqual(s, saved);
  assert.equal(s.current, "intervall-4");
  assert.equal(findLevel(PACKS, s.current).level.id, "intervall-4");
  // Freischaltung jeder Stufe und die Suche nach jeder Stufe sind in alter und neuer Reihenfolge gleich
  const view = (packs) => packs.flatMap((p) => p.levels.map((l) => [l.id, isUnlocked(s, p, l.id), findLevel(packs, l.id).pack.id]))
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  assert.deepEqual(view(PACKS), view(OLD_ORDER));
  assert.ok(isUnlocked(s, intervalle, "intervall-3") && !isUnlocked(s, intervalle, "intervall-5"));
  assert.ok(isUnlocked(s, tonleitern, "tonleitern-2") && isUnlocked(s, tonleitern, "tonleitern-11") && !isUnlocked(s, tonleitern, "tonleitern-3"));
  // ein alter Stand (v1, dann alle Umstellungen) ergibt dasselbe wie vor der Umstellung der Reihenfolge
  const old = load(memStorage({ [KEY_V2]: JSON.stringify({ ...fresh(), migrated: [], current: "intervalle-6",
    levels: { "intervalle-5": { stars: 2, best: 8, played: 3 }, "intervalle-6": { stars: 1, best: 6, played: 1 }, "notenwerte-3": { stars: 1, best: 6, played: 1 } } }) }));
  assert.deepEqual(old.levels, { "tonleitern-11": { stars: 2, best: 8, played: 3 }, "tonleitern-13": { stars: 1, best: 6, played: 1 }, "notenwerte-5": { stars: 1, best: 6, played: 1 } });
  assert.equal(old.current, "tonleitern-13");
  assert.deepEqual(old.migrated.slice().sort(), [MIGRATION_INTERVALLE, MIGRATION_NOTENWERTE, MIGRATION_TONLEITERN].sort());
});

/* ---------- Welle 11, Schritt 4: örtliches Datum, Felder rep und klasse, Umstellung "wiederholen" ---------- */

// Verschiebungen wie Date#getTimezoneOffset: Kuala Lumpur, Bayern Winter (MEZ) und Sommer (MESZ), New York (EST)
const KL = -480, MEZ = -60, MESZ = -120, NY = 300;

test("localDay: fester Zeitpunkt je Zeitzone, kurz vor und nach Mitternacht Ortszeit", () => {
  // Kuala Lumpur (UTC+8): Mitternacht örtlich = 16:00 UTC des Vortags
  assert.equal(localDay(new Date("2026-11-24T15:59:00Z"), KL), "2026-11-24"); // 23:59 in KL
  assert.equal(localDay(new Date("2026-11-24T16:00:00Z"), KL), "2026-11-25"); // 00:00 in KL
  assert.equal(localDay(new Date("2026-11-24T23:59:00Z"), KL), "2026-11-25"); // 07:59 in KL – bisher (UTC) noch der 24.
  // Bayern im Winter (MEZ, UTC+1): Mitternacht = 23:00 UTC
  assert.equal(localDay(new Date("2026-11-24T22:59:00Z"), MEZ), "2026-11-24");
  assert.equal(localDay(new Date("2026-11-24T23:00:00Z"), MEZ), "2026-11-25");
  // Bayern im Sommer (MESZ, UTC+2): Mitternacht = 22:00 UTC
  assert.equal(localDay(new Date("2026-07-14T21:59:00Z"), MESZ), "2026-07-14");
  assert.equal(localDay(new Date("2026-07-14T22:00:00Z"), MESZ), "2026-07-15");
  // New York (UTC−5): Mitternacht = 05:00 UTC
  assert.equal(localDay(new Date("2026-11-25T04:59:00Z"), NY), "2026-11-24");
  assert.equal(localDay(new Date("2026-11-25T05:00:00Z"), NY), "2026-11-25");
  // Jahreswechsel und Verschiebung 0
  assert.equal(localDay(new Date("2026-12-31T16:00:00Z"), KL), "2027-01-01");
  assert.equal(localDay(new Date("2026-12-31T23:59:59Z"), 0), "2026-12-31");
  // today nimmt dieselbe Verschiebung
  assert.equal(today(new Date("2026-11-24T16:00:00Z"), KL), "2026-11-25");
});

test("localDay ohne Verschiebung folgt der Zeitzone des Geräts (auch beim Wechsel der Sommerzeit)", () => {
  const old = process.env.TZ;
  try {
    process.env.TZ = "Asia/Kuala_Lumpur";
    const t = new Date("2026-11-24T16:30:00Z");
    if (t.getTimezoneOffset() !== KL) return; // ohne Zeitzonendaten nicht prüfbar
    assert.equal(localDay(t), "2026-11-25");
    assert.equal(today(t), "2026-11-25");
    process.env.TZ = "Europe/Berlin";
    // Umstellung auf Sommerzeit am 29.03.2026 um 2 Uhr: davor MEZ, danach MESZ, der Tag bleibt der 29.
    assert.equal(new Date("2026-03-29T00:30:00Z").getTimezoneOffset(), MEZ);
    assert.equal(new Date("2026-03-29T01:30:00Z").getTimezoneOffset(), MESZ);
    assert.equal(localDay(new Date("2026-03-28T22:59:00Z")), "2026-03-28");
    assert.equal(localDay(new Date("2026-03-28T23:00:00Z")), "2026-03-29");
    assert.equal(localDay(new Date("2026-03-29T21:59:00Z")), "2026-03-29");
    assert.equal(localDay(new Date("2026-03-29T22:00:00Z")), "2026-03-30");
    // Ende der Sommerzeit am 25.10.2026 um 3 Uhr
    assert.equal(localDay(new Date("2026-10-24T21:59:00Z")), "2026-10-24");
    assert.equal(localDay(new Date("2026-10-24T22:00:00Z")), "2026-10-25");
    assert.equal(localDay(new Date("2026-10-25T22:59:00Z")), "2026-10-25");
    assert.equal(localDay(new Date("2026-10-25T23:00:00Z")), "2026-10-26");
  } finally {
    if (old === undefined) delete process.env.TZ; else process.env.TZ = old;
  }
});

test("addDays und dayDiff rechnen auf dem Text des Tages", () => {
  assert.equal(addDays("2026-11-24", 1), "2026-11-25");
  assert.equal(addDays("2026-11-24", -1), "2026-11-23");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-03-01", -1), "2027-02-28");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29"); // Schaltjahr
  // über die Umstellung der Sommerzeit (in Bayern 28./29.03.2027) genau ein Tag
  assert.equal(addDays("2027-03-28", 1), "2027-03-29");
  assert.equal(addDays("2026-11-25", 30), "2026-12-25");
  assert.equal(dayDiff("2026-11-24", "2026-11-25"), 1);
  assert.equal(dayDiff("2026-11-25", "2026-11-24"), -1);
  assert.equal(dayDiff("2026-11-25", "2027-01-24"), 60);
  assert.equal(dayDiff("2027-03-27", "2027-03-30"), 3);
});

test("touchStreak mit Ortszeit: Mitternacht in Kuala Lumpur und Bayern, nicht mehr 8 bzw. 1 Uhr", () => {
  // KL: 23:30 am 24., dann 00:30 am 25. (beides in UTC noch der 24.) – zwei Tage in Folge
  const s = fresh();
  touchStreak(s, new Date("2026-11-24T15:30:00Z"), KL);
  touchStreak(s, new Date("2026-11-24T16:30:00Z"), KL);
  assert.deepEqual([s.dayStreak, s.lastDay], [2, "2026-11-25"]);
  // 07:30 und 20:00 am selben Tag in KL (in UTC zwei Tage) – derselbe Tag
  const k = fresh();
  touchStreak(k, new Date("2026-11-24T23:30:00Z"), KL); // 25.11., 07:30
  touchStreak(k, new Date("2026-11-25T12:00:00Z"), KL); // 25.11., 20:00
  assert.deepEqual([k.dayStreak, k.lastDay], [1, "2026-11-25"]);
  // Bayern (MEZ): 00:30 und 23:30 am selben Tag
  const b = fresh();
  touchStreak(b, new Date("2026-11-24T23:30:00Z"), MEZ); // 25.11., 00:30
  touchStreak(b, new Date("2026-11-25T22:30:00Z"), MEZ); // 25.11., 23:30
  assert.deepEqual([b.dayStreak, b.lastDay], [1, "2026-11-25"]);
  touchStreak(b, new Date("2026-11-26T17:00:00Z"), MEZ);
  assert.equal(b.dayStreak, 2);
  // ein Tag Pause: wieder 1
  touchStreak(b, new Date("2026-11-28T17:00:00Z"), MEZ);
  assert.equal(b.dayStreak, 1);
});

test("touchStreak: die Serie reißt beim Wechsel von UTC auf Ortszeit nicht ab", () => {
  // alter UTC-Tag = gestern (östlich von Greenwich): KL, zuletzt 25.11. 07:30 Ortszeit = 24.11. in UTC
  const kl = { ...fresh(), dayStreak: 5, lastDay: "2026-11-24" };
  touchStreak(kl, new Date("2026-11-25T12:00:00Z"), KL); // 25.11. 20:00, nach dem Update
  assert.deepEqual([kl.dayStreak, kl.lastDay], [6, "2026-11-25"]); // zählt einmalig weiter, kein Abriss
  touchStreak(kl, new Date("2026-11-26T01:00:00Z"), KL); // 26.11. 09:00
  assert.deepEqual([kl.dayStreak, kl.lastDay], [7, "2026-11-26"]);
  // Bayern, zuletzt 25.11. 00:30 MEZ = 24.11. 23:30 UTC
  const by = { ...fresh(), dayStreak: 3, lastDay: "2026-11-24" };
  touchStreak(by, new Date("2026-11-25T17:00:00Z"), MEZ);
  assert.deepEqual([by.dayStreak, by.lastDay], [4, "2026-11-25"]);
  // Bayern im Sommer (MESZ), zuletzt 15.07. 01:30 = 14.07. 23:30 UTC
  const so = { ...fresh(), dayStreak: 3, lastDay: "2026-07-14" };
  touchStreak(so, new Date("2026-07-15T16:00:00Z"), MESZ);
  assert.deepEqual([so.dayStreak, so.lastDay], [4, "2026-07-15"]);
  // alter UTC-Tag = heute: nichts ändern
  const same = { ...fresh(), dayStreak: 5, lastDay: "2026-11-25" };
  touchStreak(same, new Date("2026-11-25T12:00:00Z"), KL);
  assert.deepEqual([same.dayStreak, same.lastDay], [5, "2026-11-25"]);
  touchStreak(same, new Date("2026-11-26T12:00:00Z"), KL);
  assert.equal(same.dayStreak, 6);
  // alter UTC-Tag = morgen (westlich von Greenwich): New York, zuletzt 24.11. 21:00 Ortszeit = 25.11. 02:00 UTC
  const ny = { ...fresh(), dayStreak: 4, lastDay: "2026-11-25" };
  touchStreak(ny, new Date("2026-11-25T03:00:00Z"), NY); // 24.11. 22:00 örtlich: der Eintrag liegt in der Zukunft
  assert.deepEqual([ny.dayStreak, ny.lastDay], [4, "2026-11-25"]);
  touchStreak(ny, new Date("2026-11-26T01:00:00Z"), NY); // 25.11. 20:00 örtlich = lastDay
  assert.deepEqual([ny.dayStreak, ny.lastDay], [4, "2026-11-25"]);
  touchStreak(ny, new Date("2026-11-26T23:00:00Z"), NY); // 26.11. 18:00 örtlich: gestern war lastDay
  assert.deepEqual([ny.dayStreak, ny.lastDay], [5, "2026-11-26"]);
  // recordRound und recordBlitz nutzen ebenfalls den örtlichen Tag des Geräts (hier ohne Verschiebung: nur kein Abriss)
  const r = { ...fresh(), dayStreak: 2, lastDay: today(new Date(Date.now() - 864e5)) };
  recordRound(r, "noten-1", 9);
  assert.equal(r.dayStreak, 3);
});

test("fresh: Felder rep und klasse, alle vier Marker; ein alter Stand ohne die Felder lädt", () => {
  assert.deepEqual(fresh().rep, {});
  assert.equal(fresh().klasse, null);
  assert.deepEqual(fresh().migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_WIEDERHOLEN]);
  // Stand von Welle 10 (drei Marker, ohne rep/klasse), ohne Liste: lädt, nichts wird gespeichert
  const old = { xp: 70, dayStreak: 2, lastDay: "2026-11-24", levels: { "noten-1": { stars: 3, best: 10, played: 1 } }, notes: {},
    migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE] };
  const st = memStorage({ [KEY_V2]: JSON.stringify(old) });
  const s = load(st);
  assert.deepEqual(s.rep, {});
  assert.equal(s.klasse, null);
  assert.equal(s.xp, 70);
  assert.equal(st.data[KEY_V2], JSON.stringify(old), "ohne Liste keine Umstellung, kein Speichern");
  assert.ok(!s.migrated.includes(MIGRATION_WIEDERHOLEN));
});

// Stufen ohne Hilfen in der Reihenfolge der Pakete (wie app.js sie übergibt)
const BOX = PACKS.flatMap((p) => p.levels.filter((l) => !(l.helps && l.helps.length)).map((l) => l.id));

test("migrateWiederholen: geschaffte Stufen ohne Hilfen in Fach 1, je Tag drei, Reihenfolge der Pakete, einmal", () => {
  assert.equal(UMSTELLUNG_JE_TAG, 3);
  const s = {
    ...fresh(), migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE], rep: undefined,
    levels: {
      // absichtlich nicht in der Reihenfolge der Pakete eingetragen
      "akkorde-3": { stars: 2, best: 8, played: 1 },
      "intervall-2": { stars: 3, best: 10, played: 2 },
      "intervall-1": { stars: 3, best: 10, played: 1 }, // mit Hilfen: nicht in den Kasten
      "noten-3": { stars: 2, best: 8, played: 1 },
      "noten-1": { stars: 3, best: 9, played: 1 },
      "noten-2": { stars: 2, best: 7, played: 3 }, // nicht geschafft
      "notenwerte-5": { stars: 3, best: 9, played: 1 },
      "notenwerte-4": { stars: 3, best: 10, played: 1 }, // mit Hilfen
      "tonleitern-5": { stars: 2, best: 8, played: 1 },
      "tonleitern-11": { stars: 0, best: 4, played: 1 }, // nicht geschafft
    },
  };
  assert.equal(migrateWiederholen(s, BOX, "2026-11-25"), true);
  assert.deepEqual(s.rep, {
    "noten-1": { fach: 1, faellig: "2026-11-25", zuletzt: null },
    "noten-3": { fach: 1, faellig: "2026-11-25", zuletzt: null },
    "notenwerte-5": { fach: 1, faellig: "2026-11-25", zuletzt: null },
    "intervall-2": { fach: 1, faellig: "2026-11-26", zuletzt: null },
    "tonleitern-5": { fach: 1, faellig: "2026-11-26", zuletzt: null },
    "akkorde-3": { fach: 1, faellig: "2026-11-26", zuletzt: null },
  });
  assert.deepEqual(s.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_WIEDERHOLEN]);
  // läuft nur einmal: neue geschaffte Stufen kommen nicht mehr über die Umstellung hinzu
  s.levels["noten-6"] = { stars: 3, best: 10, played: 1 };
  assert.equal(migrateWiederholen(s, BOX, "2026-11-30"), false);
  assert.equal(s.rep["noten-6"], undefined);
  // ohne Liste: läuft nicht, kein Marker
  const t = { ...fresh(), migrated: [], levels: { "noten-1": { stars: 3, best: 10, played: 1 } } };
  assert.equal(migrateWiederholen(t, null, "2026-11-25"), false);
  assert.ok(!t.migrated.includes(MIGRATION_WIEDERHOLEN));
  // vorhandene Einträge bleiben
  const u = { ...fresh(), migrated: [], rep: { "noten-1": { fach: 3, faellig: "2026-12-01", zuletzt: "2026-11-24" } },
    levels: { "noten-1": { stars: 3, best: 10, played: 1 }, "noten-3": { stars: 3, best: 10, played: 1 } } };
  migrateWiederholen(u, BOX, "2026-11-25");
  assert.deepEqual(u.rep, { "noten-1": { fach: 3, faellig: "2026-12-01", zuletzt: "2026-11-24" }, "noten-3": { fach: 1, faellig: "2026-11-25", zuletzt: null } });
  // zehn geschaffte Stufen: 3 + 3 + 3 + 1 über vier Tage
  const many = { ...fresh(), migrated: [], levels: Object.fromEntries(BOX.slice(0, 10).map((id) => [id, { stars: 3, best: 10, played: 1 }])) };
  migrateWiederholen(many, BOX, "2026-11-30");
  const perDay = {};
  for (const e of Object.values(many.rep)) perDay[e.faellig] = (perDay[e.faellig] || 0) + 1;
  assert.deepEqual(perDay, { "2026-11-30": 3, "2026-12-01": 3, "2026-12-02": 3, "2026-12-03": 1 });
});

test("Umstellung: wer gestern vor dem alten Tageswechsel geübt hat, behält die Serie (östlich von Greenwich, einmalig)", () => {
  // Kuala Lumpur: zuletzt am 24.11. um 07:00 Ortszeit geübt = 23.11. in UTC; nach dem Update am 25.11. um 07:00
  const kl = { ...fresh(), dayStreak: 5, lastDay: "2026-11-23", migrated: [] };
  assert.equal(migrateWiederholen(kl, BOX, "2026-11-25", KL), true);
  assert.equal(kl.lastDay, "2026-11-24");
  touchStreak(kl, new Date("2026-11-24T23:00:00Z"), KL); // 25.11., 07:00
  assert.deepEqual([kl.dayStreak, kl.lastDay], [6, "2026-11-25"]);
  // ohne den Ausgleich wäre die Serie abgerissen
  const ohne = { ...fresh(), dayStreak: 5, lastDay: "2026-11-23" };
  touchStreak(ohne, new Date("2026-11-24T23:00:00Z"), KL);
  assert.equal(ohne.dayStreak, 1);
  // läuft nur einmal: nach der Umstellung reißt eine echte Pause von einem Tag die Serie wie gewohnt ab
  const spaeter = { ...fresh(), dayStreak: 5, lastDay: "2026-11-23" };
  assert.equal(migrateWiederholen(spaeter, BOX, "2026-11-25", KL), false);
  assert.equal(spaeter.lastDay, "2026-11-23");
  // drei Tage zurück bleibt ein Abriss; gestern und heute bleiben, wie sie sind
  for (const [last, erwartet] of [["2026-11-22", "2026-11-22"], ["2026-11-24", "2026-11-24"], ["2026-11-25", "2026-11-25"], [null, null]]) {
    const s = { ...fresh(), lastDay: last, migrated: [] };
    migrateWiederholen(s, BOX, "2026-11-25", MEZ);
    assert.equal(s.lastDay, erwartet);
  }
  // westlich von Greenwich (New York) und in UTC gibt es den Fall nicht: vorgestern bleibt vorgestern
  for (const off of [NY, 0]) {
    const s = { ...fresh(), dayStreak: 5, lastDay: "2026-11-23", migrated: [] };
    migrateWiederholen(s, BOX, "2026-11-25", off);
    assert.equal(s.lastDay, "2026-11-23");
  }
  // ohne Liste läuft nichts, auch der Ausgleich nicht
  const ohneListe = { ...fresh(), lastDay: "2026-11-23", migrated: [] };
  assert.equal(migrateWiederholen(ohneListe, null, "2026-11-25", KL), false);
  assert.equal(ohneListe.lastDay, "2026-11-23");
});

test("load mit Liste: alter Stand bekommt die Umstellung einmal, danach wird nicht mehr neu gespeichert", () => {
  const old = { xp: 70, levels: { "noten-1": { stars: 3, best: 10, played: 1 }, "intervall-2": { stars: 2, best: 8, played: 1 } },
    migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE] };
  const st = memStorage({ [KEY_V2]: JSON.stringify(old) });
  // 25.11. 00:30 in Kuala Lumpur (in UTC noch der 24.): örtlicher Tag des Geräts; hier über die Verschiebung des
  // Testrechners, darum nur der Vergleich mit today()
  const now = new Date("2026-11-24T16:30:00Z");
  const s = load(st, now, BOX);
  assert.deepEqual(s.rep, {
    "noten-1": { fach: 1, faellig: today(now), zuletzt: null },
    "intervall-2": { fach: 1, faellig: today(now), zuletzt: null },
  });
  const saved = st.data[KEY_V2];
  assert.ok(JSON.parse(saved).migrated.includes(MIGRATION_WIEDERHOLEN));
  // zweites Laden: unverändert, nicht neu gespeichert
  st.setItem = () => { throw new Error("darf nicht speichern"); };
  const again = load(st, new Date("2026-12-01T10:00:00Z"), BOX);
  assert.deepEqual(again.rep, s.rep);
  // v1-Stand (nur Noten lesen): bekommt die Umstellung ebenfalls
  const v1 = memStorage({ [KEY_V1]: JSON.stringify({ xp: 50, levels: { 3: { stars: 2, best: 8, played: 1 }, 4: { stars: 1, best: 6, played: 1 } }, current: 4 }) });
  const s1 = load(v1, now, BOX);
  assert.deepEqual(Object.keys(s1.rep), ["noten-3"]);
  assert.ok(s1.migrated.includes(MIGRATION_WIEDERHOLEN));
  // frischer Stand mit Liste: nichts zu tun, nichts gespeichert
  const empty = memStorage();
  assert.deepEqual(load(empty, now, BOX), fresh());
  assert.equal(empty.data[KEY_V2], undefined);
});
