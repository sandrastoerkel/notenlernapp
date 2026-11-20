// Fortschritt: Zustand, Freischaltung, Serie, Persistenz.
// Alle Funktionen außer load und save sind rein bis auf das Verändern des übergebenen
// Zustands; nur load und save greifen auf localStorage zu.
import { FENSTER, ZEIT_DECKEL } from "./adapt.js";

export const KEY_V1 = "notenheld.v1";
export const KEY_V2 = "notenheld.v2";

// Einmalige Umstellungen alter Spielstände (migrated, siehe migrateIntervalle). Ein frischer Stand
// braucht keine: er trägt alle Marker schon.
export const MIGRATION_INTERVALLE = "intervalle-neu";
export const MIGRATION_TONLEITERN = "tonleitern-neu";
export const MIGRATION_NOTENWERTE = "notenwerte-neu";

export const fresh = () => ({
  xp: 0, dayStreak: 0, lastDay: null, levels: {}, notes: {}, answered: 0, correct: 0,
  bestCombo: 0, blitzRecord: 0, unlockAll: false, muted: false, input: "letters", current: "noten-1",
  migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE],
});

// Alte Daten (Stufen 1 bis 8 als Zahl) in das Format mit Stufen-IDs übernehmen
export function migrateV1(v1) {
  const s = Object.assign(fresh(), v1 || {});
  const levels = {};
  Object.entries((v1 && v1.levels) || {}).forEach(([k, v]) => { levels["noten-" + k] = v; });
  s.levels = levels;
  s.current = typeof (v1 && v1.current) === "number" ? "noten-" + v1.current : "noten-1";
  return s;
}

// Einmalige Umstellungen alter Spielstände. Jede trägt sich in s.migrated ein und läuft danach nie wieder.
// "intervalle-neu" (20.11.2026, Paket „Intervalle“ neu): die Tonarten-Stufen intervalle-5 und -6 heißen jetzt
// tonleitern-7 und -8 (Fortschritt bleibt), die übrigen alten Intervall-Stufen intervalle-1 … -12 entfallen
// (die neuen heißen intervall-1 … -10). Zeigte s.current auf eine entfallene Stufe, geht es mit
// intervall-1 weiter. Die Statistik je Aufgabe (s.notes) bleibt unverändert.
export const RENAMED_INTERVALLE = { "intervalle-5": "tonleitern-7", "intervalle-6": "tonleitern-8" };
const OLD_INTERVALLE = /^intervalle-\d+$/;

// Zwei Einträge einer Stufe zusammenführen (falls es die neue ID schon gibt): bester Wert, Runden zusammen
const mergeLevel = (a, b) => (!a ? b : !b ? a : {
  stars: Math.max(a.stars || 0, b.stars || 0), best: Math.max(a.best || 0, b.best || 0), played: (a.played || 0) + (b.played || 0),
});

// Gibt true zurück, wenn etwas geändert wurde (dann speichert load den Zustand)
export function migrateIntervalle(s) {
  const done = Array.isArray(s.migrated) ? s.migrated : [];
  if (done.includes(MIGRATION_INTERVALLE)) return false;
  const levels = {};
  for (const [id, st] of Object.entries(s.levels || {})) {
    if (RENAMED_INTERVALLE[id]) levels[RENAMED_INTERVALLE[id]] = mergeLevel(levels[RENAMED_INTERVALLE[id]], st);
    else if (!OLD_INTERVALLE.test(id)) levels[id] = mergeLevel(levels[id], st);
  }
  s.levels = levels;
  if (RENAMED_INTERVALLE[s.current]) s.current = RENAMED_INTERVALLE[s.current];
  else if (OLD_INTERVALLE.test(s.current || "")) s.current = "intervall-1";
  s.migrated = [...done, MIGRATION_INTERVALLE];
  return true;
}

// "tonleitern-neu" (20.11.2026, Welle 8 „Tonleitern gehirngerecht“): aus 8 werden 13 Stufen, neu sind 3, 6, 8,
// 10 und 12 (mit Hilfen bzw. „Ganz- und Halbtonschritte ohne Hilfen“). Die alten Stufen rücken nach:
// 1→1, 2→2, 3→4, 4→5, 5→7, 6→9, 7→11, 8→13; s.current entsprechend, s.notes und die statKeys bleiben.
// Läuft nach migrateIntervalle (die macht aus intervalle-5/-6 erst tonleitern-7/-8, die hier zu 11/13 werden).
export const RENAMED_TONLEITERN = Object.fromEntries([[1, 1], [2, 2], [3, 4], [4, 5], [5, 7], [6, 9], [7, 11], [8, 13]]
  .map(([a, b]) => [`tonleitern-${a}`, `tonleitern-${b}`]));

// In einem Durchgang in ein neues levels-Objekt (nacheinander im selben Objekt würde 3→4 und danach 4→5
// verketten). Gibt true zurück, wenn etwas geändert wurde.
export function migrateTonleitern(s) {
  const done = Array.isArray(s.migrated) ? s.migrated : [];
  if (done.includes(MIGRATION_TONLEITERN)) return false;
  const levels = {};
  for (const [id, st] of Object.entries(s.levels || {})) {
    const to = RENAMED_TONLEITERN[id] || id;
    levels[to] = mergeLevel(levels[to], st);
  }
  s.levels = levels;
  if (RENAMED_TONLEITERN[s.current]) s.current = RENAMED_TONLEITERN[s.current];
  s.migrated = [...done, MIGRATION_TONLEITERN];
  return true;
}

// "notenwerte-neu" (20.11.2026, Welle 9 „Notenwerte gehirngerecht“): aus 6 werden 10 Stufen, neu sind 3, 4, 6
// und 8 (Festigung bzw. mit Hilfen). Jede alte Stufe landet auf der neuen Stufe gleichen Inhalts ohne Hilfen:
// 1→1, 2→2, 3→5, 4→7, 5→9, 6→10; s.current entsprechend, s.notes bleibt (das Paket hat keine statKeys).
// Wie migrateTonleitern in einem Durchgang in ein neues Objekt (sonst verkettet 3→5 mit 5→9).
export const RENAMED_NOTENWERTE = Object.fromEntries([[1, 1], [2, 2], [3, 5], [4, 7], [5, 9], [6, 10]]
  .map(([a, b]) => [`notenwerte-${a}`, `notenwerte-${b}`]));

export function migrateNotenwerte(s) {
  const done = Array.isArray(s.migrated) ? s.migrated : [];
  if (done.includes(MIGRATION_NOTENWERTE)) return false;
  const levels = {};
  for (const [id, st] of Object.entries(s.levels || {})) {
    const to = RENAMED_NOTENWERTE[id] || id;
    levels[to] = mergeLevel(levels[to], st);
  }
  s.levels = levels;
  if (RENAMED_NOTENWERTE[s.current]) s.current = RENAMED_NOTENWERTE[s.current];
  s.migrated = [...done, MIGRATION_NOTENWERTE];
  return true;
}

// Alle Umstellungen in der festen Reihenfolge; jede läuft (nicht mit || verketten, sonst liefe die zweite
// beim ersten Laden nicht). true, wenn eine etwas geändert hat. migrateNotenwerte fasst nur notenwerte-* an
// und steht nur der Ordnung halber als dritte.
export function migrateAll(s) {
  const a = migrateIntervalle(s), b = migrateTonleitern(s), c = migrateNotenwerte(s);
  return a || b || c;
}

const defaultStorage = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

// Zustand laden: zuerst v2, sonst v1 übernehmen und als v2 speichern (v1 bleibt unverändert).
// Danach die einmaligen Umstellungen (migrateAll: migrateIntervalle, migrateTonleitern, migrateNotenwerte); geändert
// wird nur einmal gespeichert.
export function load(storage = defaultStorage()) {
  try {
    if (!storage) return fresh();
    const raw = storage.getItem(KEY_V2);
    if (raw) {
      // Marker nur aus dem gespeicherten Stand, nicht aus fresh(): ältere Stände haben keine
      const parsed = JSON.parse(raw);
      const s = Object.assign(fresh(), parsed, { migrated: Array.isArray(parsed.migrated) ? parsed.migrated : [] });
      if (migrateAll(s)) save(s, storage);
      return s;
    }
    const old = storage.getItem(KEY_V1);
    if (old) {
      const s = migrateV1(JSON.parse(old));
      migrateAll(s);
      save(s, storage);
      return s;
    }
  } catch (e) { /* ohne Speicher weiter */ }
  return fresh();
}

export function save(s, storage = defaultStorage()) {
  try { if (storage) storage.setItem(KEY_V2, JSON.stringify(s)); } catch (e) { /* ignorieren */ }
}

// Datum als "JJJJ-MM-TT" in UTC (wie toISOString)
export const today = (now = new Date()) => now.toISOString().slice(0, 10);

// Tage in Folge: gleicher Tag ändert nichts, gestern +1, sonst wieder 1
export function touchStreak(s, now = new Date()) {
  const t = today(now);
  if (s.lastDay === t) return s;
  const y = new Date(now.getTime() - 864e5).toISOString().slice(0, 10);
  s.dayStreak = s.lastDay === y ? s.dayStreak + 1 : 1;
  s.lastDay = t;
  return s;
}

// Stufe, deren Ergebnis eine Stufe freischaltet: das Feld requires (Stufen-ID im selben Paket, seit
// Paket „Intervalle 7–12“), sonst die Stufe davor. null für die erste Stufe (ohne requires), für
// unbekannte Stufen und für ein requires, das es im Paket nicht gibt (die Stufe bleibt dann gesperrt).
export function unlockedBy(pack, levelId) {
  const i = pack.levels.findIndex((l) => l.id === levelId);
  if (i < 0) return null;
  const req = pack.levels[i].requires;
  if (req !== undefined) return pack.levels.find((l) => l.id === req) || null;
  return i === 0 ? null : pack.levels[i - 1];
}

// Stufen, die das Ergebnis von levelId freischaltet (in der Reihenfolge des Pakets)
export const unlocks = (pack, levelId) => pack.levels.filter((l) => {
  const by = unlockedBy(pack, l.id);
  return !!by && by.id === levelId;
});

// Erste Stufe eines Pakets ist offen; jede weitere ab best >= 8 in der Stufe, die sie freischaltet
// (unlockedBy), oder mit unlockAll. Eine Stufe mit unbekanntem requires bleibt gesperrt.
// Eine schon gespielte Stufe bleibt offen (seit „Intervalle neu“: übernommener Fortschritt in
// tonleitern-7 und -8, auch wenn tonleitern-6 noch nicht geschafft ist).
export function isUnlocked(s, pack, levelId) {
  const i = pack.levels.findIndex((l) => l.id === levelId);
  if (i < 0) return false;
  if (s.unlockAll) return true;
  if (((s.levels[levelId] || {}).played || 0) > 0) return true;
  const by = unlockedBy(pack, levelId);
  if (!by) return i === 0 && pack.levels[i].requires === undefined;
  return ((s.levels[by.id] || {}).best || 0) >= 8;
}

export const starsFor = (c) => (c >= 9 ? 3 : c >= 7 ? 2 : c >= 5 ? 1 : 0);

// Ergebnis einer Runde (10 Aufgaben) eintragen; zählt auch die Tage in Folge
export function recordRound(s, levelId, correct, now = new Date()) {
  const stars = starsFor(correct);
  const st = s.levels[levelId] || { stars: 0, best: 0, played: 0 };
  st.played++; st.best = Math.max(st.best, correct); st.stars = Math.max(st.stars, stars);
  s.levels[levelId] = st;
  const gained = correct * 10 + stars * 20;
  s.xp += gained;
  touchStreak(s, now);
  return { stars, gained };
}

// Eine Antwort zählen und je Aufgabe vermerken: { ok, bad, sec, timed, last, hist, hsec }.
// sec ist die Summe der Antwortzeiten richtiger Antworten in Sekunden, timed deren Anzahl,
// last der Tag der letzten Antwort. sec (optional) zählt nur bei richtigen Antworten und
// höchstens mit ZEIT_DECKEL Sekunden. hist sind die letzten FENSTER Ergebnisse ("1"/"0"),
// hsec die letzten FENSTER gemessenen Zeiten richtiger Antworten (für den Zustand in adapt.js).
// Alte Einträge ohne diese Felder gelten als 0, null bzw. leer; keine Migration nötig.
export function recordAnswer(s, key, ok, sec, now = new Date()) {
  s.answered++; if (ok) s.correct++;
  const e = s.notes[key] || {};
  e.ok = (e.ok || 0) + (ok ? 1 : 0);
  e.bad = (e.bad || 0) + (ok ? 0 : 1);
  e.sec = e.sec || 0;
  e.timed = e.timed || 0;
  e.hist = ((typeof e.hist === "string" ? e.hist : "") + (ok ? "1" : "0")).slice(-FENSTER);
  e.hsec = Array.isArray(e.hsec) ? e.hsec : [];
  if (ok && typeof sec === "number" && Number.isFinite(sec) && sec >= 0) {
    const t = Math.round(Math.min(sec, ZEIT_DECKEL) * 100) / 100;
    e.sec = Math.round((e.sec + t) * 100) / 100;
    e.timed++;
    e.hsec = [...e.hsec, t].slice(-FENSTER);
  }
  e.last = today(now);
  s.notes[key] = e;
  return s;
}

// Ergebnis einer Blitz-Runde eintragen; zählt auch die Tage in Folge
export function recordBlitz(s, score, bestCombo, now = new Date()) {
  const record = score > s.blitzRecord;
  s.blitzRecord = Math.max(s.blitzRecord, score);
  s.bestCombo = Math.max(s.bestCombo, bestCombo);
  const gained = score * 5 + (record ? 50 : 0);
  s.xp += gained;
  touchStreak(s, now);
  return { record, gained };
}

// Zurücksetzen: nur Ton und Eingabeart bleiben erhalten
export const reset = (s) => Object.assign(fresh(), { muted: s.muted, input: s.input });

// Trefferquote in Prozent oder null, wenn noch nichts beantwortet wurde
export const accuracy = (s) => (s.answered ? Math.round((100 * s.correct) / s.answered) : null);
