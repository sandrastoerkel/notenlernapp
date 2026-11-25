// Wiederholung über Tage (Welle 11): Karteikasten nach Leitner mit fünf Fächern, je Stufe ohne Hilfen.
// Reines Modul ohne DOM und ohne Speicher: Die Funktionen lesen den übergebenen Zustand (state.rep) und die
// übergebenen Pakete; nur enter, applyReview und afterRound verändern state.rep. Tage sind Texte "JJJJ-MM-TT"
// (örtliches Datum, store.today). Nichts hier sperrt eine Stufe (Leitsatz: nichts Gelerntes wird je gesperrt).
import { addDays } from "./store.js";

// Abstände je Fach in Tagen (Sandra, 24.11.2026): Fach 1 nach 1 Tag, … Fach 5 nach 30 Tagen
export const ABSTAENDE = [1, 3, 7, 14, 30];
export const FAECHER = ABSTAENDE.length;
// Aufgaben je Runde „Wiederholen“ bzw. „Grundlagen wiederholen“ (Sandra, 24.11.2026)
export const RUNDE_WIEDERHOLEN = 10;
export const RUNDE_GRUNDLAGEN = 6;
// Höchstens so viele Stufen je Wiederholungsrunde, damit je Stufe mindestens drei Aufgaben das Urteil tragen
export const MAX_STUFEN = 3;
// Stufen mit nur zwei Antwortknöpfen (level.guess, Raten) bekommen mindestens so viele Aufgaben
export const MIN_AUFGABEN_RATEN = 4;

// Gehört eine Stufe in den Kasten? Nur Stufen ohne Hilfen (dort wird abgerufen, nicht abgelesen).
export const inBox = (level) => !!level && !(Array.isArray(level.helps) && level.helps.length > 0);

// IDs aller Stufen ohne Hilfen in der Reihenfolge der Pakete (für store.load / migrateWiederholen)
export const boxIds = (packs) => packs.flatMap((p) => p.levels.filter(inBox).map((l) => l.id));

const repOf = (state) => {
  if (!state.rep || typeof state.rep !== "object" || Array.isArray(state.rep)) state.rep = {};
  return state.rep;
};

// Fach auf 1 … FAECHER begrenzen (unbekannte Werte gelten als Fach 1)
const clampFach = (f) => (Number.isInteger(f) ? Math.min(FAECHER, Math.max(1, f)) : 1);

// Stufe in Fach 1 aufnehmen, fällig morgen – nur wenn es noch keinen Eintrag gibt.
// Gibt den neuen Eintrag zurück oder null (schon im Kasten).
export function enter(state, levelId, heute) {
  const rep = repOf(state);
  if (rep[levelId]) return null;
  rep[levelId] = { fach: 1, faellig: addDays(heute, ABSTAENDE[0]), zuletzt: heute };
  return rep[levelId];
}

// Ort einer Stufe in den Paketen: [Paket-Index, Stufen-Index] oder null
function position(packs, levelId) {
  for (let p = 0; p < packs.length; p++) {
    const i = packs[p].levels.findIndex((l) => l.id === levelId);
    if (i >= 0) return [p, i];
  }
  return null;
}

// Fällige Stufen (faellig <= heute), sortiert: am längsten fällig zuerst, bei Gleichstand Grundlagen vor dem, was
// auf ihnen aufbaut (Reihenfolge der Pakete, dann der Stufen). Einträge zu Stufen, die es nicht (mehr) gibt oder
// die Hilfen haben, bleiben außen vor.
export function due(state, packs, heute) {
  const rep = state.rep || {};
  return Object.keys(rep)
    .map((id) => ({ id, f: rep[id] && rep[id].faellig, pos: position(packs, id) }))
    .filter((e) => typeof e.f === "string" && e.f <= heute && e.pos && inBox(packs[e.pos[0]].levels[e.pos[1]]))
    .sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1]))
    .map((e) => e.id);
}

// Frühester künftiger Fälligkeitstag (nach heute) oder null
export function nextDue(state, heute) {
  const days = Object.values(state.rep || {}).map((e) => e && e.faellig)
    .filter((f) => typeof f === "string" && f > heute).sort();
  return days.length ? days[0] : null;
}

const levelOf = (packs, id) => { const pos = position(packs, id); return pos ? packs[pos[0]].levels[pos[1]] : null; };

// Aufteilung von total Aufgaben auf k Stufen: gleich, der Rest an die ersten (10 → 10 / 5+5 / 4+3+3)
const split = (total, k) => Array.from({ length: k }, (_, i) => Math.floor(total / k) + (i < total % k ? 1 : 0));

// Plan für die nächste Runde „Wiederholen“: [{ id, n }] aus den am längsten fälligen Stufen (Reihenfolge wie due),
// höchstens MAX_STUFEN, zusammen RUNDE_WIEDERHOLEN Aufgaben. Eine Stufe mit nur zwei Knöpfen (level.guess) bekommt
// den größten Anteil und mindestens MIN_AUFGABEN_RATEN Aufgaben. Reicht das bei drei Stufen nicht für alle
// (zwei oder drei Ratestufen: 4 + 4 + 2 ließe einer Stufe nur zwei Aufgaben), kommen nur die ersten zwei Stufen
// in die Runde (5 + 5); die dritte bleibt fällig und kommt in der nächsten Runde. Leer, wenn nichts fällig ist.
export function reviewPlan(state, packs, heute) {
  let ids = due(state, packs, heute).slice(0, MAX_STUFEN);
  const isGuess = (id) => (levelOf(packs, id) || {}).guess === true;
  const fits = (list) => {
    const shares = split(RUNDE_WIEDERHOLEN, list.length);
    const guesses = list.filter(isGuess).length;
    // die größten Anteile gehen an die Ratestufen; jede Ratestufe braucht MIN_AUFGABEN_RATEN
    return shares.slice(0, guesses).every((n) => n >= MIN_AUFGABEN_RATEN);
  };
  while (ids.length > 1 && !fits(ids)) ids = ids.slice(0, -1);
  const shares = split(RUNDE_WIEDERHOLEN, ids.length);
  // Anteile verteilen: zuerst die Ratestufen (in der Reihenfolge von due), dann die übrigen
  const order = [...ids.filter(isGuess), ...ids.filter((id) => !isGuess(id))];
  const n = Object.fromEntries(order.map((id, i) => [id, shares[i]]));
  return ids.map((id) => ({ id, n: n[id] }));
}

// Urteil „sitzt“: bei n Aufgaben höchstens ⌊n / 5⌋ Fehler (3 oder 4: alle richtig; 5: einer daneben; 10: zwei)
export const passed = (n, fehler) => fehler <= Math.floor(n / 5);

// Ergebnis einer Wiederholung eintragen. perLevel = [{ id, n, ok }] (n Aufgaben, ok davon richtig).
// Sitzt: ein Fach weiter (höchstens FAECHER), fällig nach dem Abstand des neuen Fachs. Sonst: ein Fach zurück
// (nicht unter 1), morgen wieder fällig. Fach 5 bleibt 5 und kommt alle 30 Tage wieder.
// Gibt je Stufe { id, sitzt, fach, inTagen } zurück (für die Ergebniskarte).
export function applyReview(state, perLevel, heute) {
  const rep = repOf(state);
  return perLevel.map(({ id, n, ok }) => {
    const alt = rep[id] ? clampFach(rep[id].fach) : 1;
    const sitzt = passed(n, n - ok);
    const fach = sitzt ? Math.min(FAECHER, alt + 1) : Math.max(1, alt - 1);
    const inTagen = sitzt ? ABSTAENDE[fach - 1] : 1;
    rep[id] = { fach, faellig: addDays(heute, inTagen), zuletzt: heute };
    return { id, sitzt, fach, inTagen };
  });
}

// Nach einer normalen Runde (10 Aufgaben) in level mit correct Richtigen:
// - Stufe mit Hilfen: nichts (null);
// - noch nicht im Kasten: ab 8 Richtigen in Fach 1, fällig morgen ({ id, sitzt: true, fach: 1, inTagen: 1, neu: true });
// - im Kasten und fällig: zählt wie eine Wiederholung mit 10 Aufgaben (sitzt ab 8 Richtigen, sonst ein Fach zurück);
// - im Kasten, nicht fällig: nichts (viel Üben am selben Tag soll den Abstand nicht verlängern).
export function afterRound(state, level, correct, heute) {
  if (!inBox(level)) return null;
  const e = (state.rep || {})[level.id];
  if (!e) {
    if (correct < 8) return null;
    enter(state, level.id, heute);
    return { id: level.id, sitzt: true, fach: 1, inTagen: ABSTAENDE[0], neu: true };
  }
  if (typeof e.faellig === "string" && e.faellig > heute) return null;
  return applyReview(state, [{ id: level.id, n: RUNDE_WIEDERHOLEN, ok: correct }], heute)[0];
}

// „heute“, „morgen“, „in 3 Tagen“ (0 und weniger: heute)
export const dueText = (inTagen) => (inTagen <= 0 ? "heute" : inTagen === 1 ? "morgen" : `in ${inTagen} Tagen`);

// "2026-11-24" → „24.11.“ (ohne führende Null: "2026-12-05" → „5.12.“)
export function dayText(day) {
  const [, m, d] = String(day).split("-").map(Number);
  return `${d}.${m}.`;
}
