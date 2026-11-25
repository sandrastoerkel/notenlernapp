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
export const MIGRATION_WIEDERHOLEN = "wiederholen";

// Stufen je Tag bei der Umstellung "wiederholen": so viele, wie eine Wiederholungsrunde fasst
// (repeat.js MAX_STUFEN; hier als eigene Zahl, weil repeat.js dieses Modul einbindet – ein Test prüft die Gleichheit).
export const UMSTELLUNG_JE_TAG = 3;

export const fresh = () => ({
  xp: 0, dayStreak: 0, lastDay: null, levels: {}, notes: {}, answered: 0, correct: 0,
  bestCombo: 0, blitzRecord: 0, unlockAll: false, muted: false, input: "letters", current: "noten-1",
  migrated: [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_WIEDERHOLEN],
  // Gewählte Merksprüche (Welle 10, Schritt 4): je Kennung { wahl: n } oder { eigen: "…" }, siehe sprueche.js.
  // Ältere Stände ohne das Feld bekommen beim Laden {} aus fresh() und werden deshalb nicht neu gespeichert.
  sprueche: {},
  // Wiederholung über Tage (Welle 11, repeat.js): je Stufe ohne Hilfen { fach: 1…5, faellig, zuletzt } ("JJJJ-MM-TT",
  // örtliches Datum). Fortschritt: wird beim Zurücksetzen gelöscht.
  rep: {},
  // Jahrgang über den Lehrkraft-Link (Welle 11, Schritt 11): null oder { jahrgang, zweig, dran }. Einstellung der
  // Lehrkraft, kein Fortschritt: bleibt beim Zurücksetzen erhalten.
  klasse: null,
});

// Alte Daten (Stufen 1 bis 8 als Zahl) in das Format mit Stufen-IDs übernehmen
export function migrateV1(v1) {
  const s = Object.assign(fresh(), v1 || {});
  const levels = {};
  Object.entries((v1 && v1.levels) || {}).forEach(([k, v]) => { levels["noten-" + k] = v; });
  s.levels = levels;
  s.current = typeof (v1 && v1.current) === "number" ? "noten-" + v1.current : "noten-1";
  // v1 kannte nur „Noten lesen“: die Umstellungen der anderen Pakete braucht es nicht, wohl aber "wiederholen"
  // (geschaffte Stufen kommen in den Karteikasten)
  s.migrated = s.migrated.filter((m) => m !== MIGRATION_WIEDERHOLEN);
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
// und 8 (Festigung bzw. mit Hilfen). Jede alte Stufe landet auf der neuen Stufe gleichen Inhalts: 1 und 2 bleiben
// (jetzt mit Hilfen), 3–6 kommen auf die Stufen ohne Hilfen: 1→1, 2→2, 3→5, 4→7, 5→9, 6→10; s.current
// entsprechend, s.notes bleibt (das Paket hat keine statKeys).
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

// "wiederholen" (25.11.2026, Welle 11): Jede schon geschaffte Stufe ohne Hilfen (beste Runde >= 8) kommt in Fach 1
// des Karteikastens (repeat.js). Die Fälligkeiten werden verteilt, damit nach dem Update nicht alles auf einmal
// fällig ist: in der Reihenfolge von boxIds (Pakete in der Reihenfolge PACKS, Grundlagen zuerst) je Tag
// UMSTELLUNG_JE_TAG Stufen, beginnend heute. Vorhandene Einträge bleiben. boxIds: IDs der Stufen ohne Hilfen in
// der Reihenfolge der Pakete (store.js kennt die Pakete nicht; app.js übergibt sie). Ohne Liste läuft die
// Umstellung nicht und der Marker wird nicht gesetzt. Gibt true zurück, wenn sie gelaufen ist.
// Dazu einmalig die Tagesserie (Wechsel von UTC auf Ortszeit): Östlich von Greenwich (offsetMin < 0) trägt eine
// Runde vor dem alten Tageswechsel (Kuala Lumpur vor 8 Uhr, Bayern vor 1 bzw. 2 Uhr) in lastDay den Vortag. Wer
// gestern früh geübt hat, hat deshalb „vorgestern“ im Stand – das gilt bei der Umstellung als gestern, damit die
// Serie nicht abreißt (touchStreak zählt dann wie gewohnt weiter).
export function migrateWiederholen(s, boxIds, heute = today(), offsetMin = new Date().getTimezoneOffset()) {
  const done = Array.isArray(s.migrated) ? s.migrated : [];
  if (done.includes(MIGRATION_WIEDERHOLEN) || !Array.isArray(boxIds)) return false;
  if (offsetMin < 0 && s.lastDay === addDays(heute, -2)) s.lastDay = addDays(heute, -1);
  const rep = s.rep && typeof s.rep === "object" && !Array.isArray(s.rep) ? s.rep : {};
  let k = 0;
  for (const id of boxIds) {
    if (((s.levels || {})[id] || {}).best >= 8 && !rep[id]) {
      rep[id] = { fach: 1, faellig: addDays(heute, Math.floor(k / UMSTELLUNG_JE_TAG)), zuletzt: null };
      k++;
    }
  }
  s.rep = rep;
  s.migrated = [...done, MIGRATION_WIEDERHOLEN];
  return true;
}

// Alle Umstellungen in der festen Reihenfolge; jede läuft (nicht mit || verketten, sonst liefe die zweite
// beim ersten Laden nicht). true, wenn eine etwas geändert hat. migrateNotenwerte fasst nur notenwerte-* an
// und steht nur der Ordnung halber als dritte; migrateWiederholen kommt zuletzt (braucht die neuen Stufen-IDs).
export function migrateAll(s, boxIds, heute = today(), offsetMin = new Date().getTimezoneOffset()) {
  const a = migrateIntervalle(s), b = migrateTonleitern(s), c = migrateNotenwerte(s);
  const d = migrateWiederholen(s, boxIds, heute, offsetMin);
  return a || b || c || d;
}

const defaultStorage = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

// Zustand laden: zuerst v2, sonst v1 übernehmen und als v2 speichern (v1 bleibt unverändert).
// Danach die einmaligen Umstellungen (migrateAll: migrateIntervalle, migrateTonleitern, migrateNotenwerte,
// migrateWiederholen mit boxIds und dem örtlichen Tag von now); geändert wird nur einmal gespeichert.
export function load(storage = defaultStorage(), now = new Date(), boxIds = null) {
  try {
    if (!storage) return fresh();
    const raw = storage.getItem(KEY_V2);
    if (raw) {
      // Marker nur aus dem gespeicherten Stand, nicht aus fresh(): ältere Stände haben keine
      const parsed = JSON.parse(raw);
      const s = Object.assign(fresh(), parsed, { migrated: Array.isArray(parsed.migrated) ? parsed.migrated : [] });
      if (migrateAll(s, boxIds, today(now), now.getTimezoneOffset())) save(s, storage);
      return s;
    }
    const old = storage.getItem(KEY_V1);
    if (old) {
      const s = migrateV1(JSON.parse(old));
      migrateAll(s, boxIds, today(now), now.getTimezoneOffset());
      save(s, storage);
      return s;
    }
  } catch (e) { /* ohne Speicher weiter */ }
  return fresh();
}

export function save(s, storage = defaultStorage()) {
  try { if (storage) storage.setItem(KEY_V2, JSON.stringify(s)); } catch (e) { /* ignorieren */ }
}

// Örtlicher Tag als "JJJJ-MM-TT" (seit Welle 11; bis Welle 10 galt der Tag in UTC, der in Malaysia um 8 Uhr
// morgens und in Bayern um 1 bzw. 2 Uhr nachts wechselte). offsetMin wie Date#getTimezoneOffset (Minuten
// UTC − Ortszeit: Kuala Lumpur −480, Bayern −60 im Winter und −120 im Sommer, New York +300); für Tests einstellbar.
export const localDay = (now = new Date(), offsetMin = now.getTimezoneOffset()) =>
  new Date(now.getTime() - offsetMin * 60000).toISOString().slice(0, 10);

// Heute (örtlich); offsetMin wie bei localDay
export const today = (now = new Date(), offsetMin) => localDay(now, offsetMin === undefined ? now.getTimezoneOffset() : offsetMin);

// Tag + n Tage, nur auf dem Text des Tages gerechnet (über Date.UTC, unabhängig von Sommerzeit und Zeitzone)
export function addDays(day, n) {
  const [y, m, d] = String(day).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Ganze Tage von a bis b (b − a; positiv, wenn b später ist)
export function dayDiff(a, b) {
  const t = (day) => { const [y, m, d] = String(day).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 864e5);
}

// Tage in Folge: gleicher Tag ändert nichts, gestern +1, sonst wieder 1 (örtliches Datum).
// Umstellung von UTC auf Ortszeit (Welle 11), die Serie reißt dabei nicht ab:
// - westlich von Greenwich kann der alte UTC-Tag in lastDay einen Tag *nach* dem örtlichen Tag liegen; ein Tag in
//   der Zukunft gilt als heute (nichts ändern), am Tag darauf zählt die Serie wie gewohnt weiter;
// - östlich (Kuala Lumpur, Bayern) liegt der alte UTC-Tag bei einer Runde von heute höchstens einen Tag zurück
//   und zählt als gestern (die Serie zählt dann einmalig einen Tag weiter); eine Runde von gestern früh steht als
//   „vorgestern“ im Stand – das gleicht migrateWiederholen beim ersten Laden einmalig aus.
export function touchStreak(s, now = new Date(), offsetMin) {
  const t = today(now, offsetMin);
  if (s.lastDay === t) return s;
  if (typeof s.lastDay === "string" && s.lastDay > t) return s;
  s.dayStreak = s.lastDay === addDays(t, -1) ? s.dayStreak + 1 : 1;
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

// Gemischte Runde beenden (Welle 11, Schritt 6): kind "wiederholen" (Wiederholung über Tage) oder "grundlagen"
// („Grundlagen wiederholen“). Erfahrungspunkte: 10 je richtige Antwort, bei „wiederholen“ dazu der Bonus wie in
// einer normalen Runde (20 · Sterne nach starsFor); beide zählen für die Tagesserie. Kein Eintrag in s.levels:
// keine Sterne, keine beste Runde, keine Freischaltung. Die Antworten selbst zählen schon über recordAnswer in
// der Statistik ihrer eigenen Stufe. total ist für die Ergebniskarte da und ändert die Punkte nicht.
export const MIXED_KINDS = ["wiederholen", "grundlagen"];
export function recordMixedRound(s, kind, correct, total, now = new Date()) {
  if (!MIXED_KINDS.includes(kind)) throw new Error(`Unbekannte Art der Runde: ${kind}`);
  const gained = correct * 10 + (kind === "wiederholen" ? starsFor(correct) * 20 : 0);
  s.xp += gained;
  touchStreak(s, now);
  return { gained, total };
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

// Zurücksetzen: Ton, Eingabeart, Merksprüche und der Jahrgang der Lehrkraft (klasse) bleiben erhalten
// (Einstellungen, kein Fortschritt); der Karteikasten (rep) wird gelöscht.
export const reset = (s) => Object.assign(fresh(), {
  muted: s.muted, input: s.input, sprueche: s.sprueche && typeof s.sprueche === "object" ? s.sprueche : {},
  klasse: s.klasse && typeof s.klasse === "object" ? s.klasse : null,
});

// Trefferquote in Prozent oder null, wenn noch nichts beantwortet wurde
export const accuracy = (s) => (s.answered ? Math.round((100 * s.correct) / s.answered) : null);
