// Fortschritt: Zustand, Freischaltung, Serie, Persistenz.
// Alle Funktionen außer load und save sind rein bis auf das Verändern des übergebenen
// Zustands; nur load und save greifen auf localStorage zu.

export const KEY_V1 = "notenheld.v1";
export const KEY_V2 = "notenheld.v2";

export const fresh = () => ({
  xp: 0, dayStreak: 0, lastDay: null, levels: {}, notes: {}, answered: 0, correct: 0,
  bestCombo: 0, blitzRecord: 0, unlockAll: false, muted: false, input: "letters", current: "noten-1",
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

const defaultStorage = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

// Zustand laden: zuerst v2, sonst v1 übernehmen und als v2 speichern (v1 bleibt unverändert)
export function load(storage = defaultStorage()) {
  try {
    if (!storage) return fresh();
    const raw = storage.getItem(KEY_V2);
    if (raw) return Object.assign(fresh(), JSON.parse(raw));
    const old = storage.getItem(KEY_V1);
    if (old) {
      const s = migrateV1(JSON.parse(old));
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

// Erste Stufe eines Pakets ist offen; jede weitere ab best >= 8 in der vorherigen Stufe oder mit unlockAll
export function isUnlocked(s, pack, levelId) {
  const i = pack.levels.findIndex((l) => l.id === levelId);
  if (i < 0) return false;
  if (i === 0 || s.unlockAll) return true;
  return ((s.levels[pack.levels[i - 1].id] || {}).best || 0) >= 8;
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

// Eine Antwort zählen und in der Liste der schwachen Noten vermerken
export function recordAnswer(s, key, ok) {
  s.answered++; if (ok) s.correct++;
  s.notes[key] = s.notes[key] || { ok: 0, bad: 0 };
  s.notes[key][ok ? "ok" : "bad"]++;
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
