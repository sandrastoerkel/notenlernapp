// Wiederholung über Tage (Welle 11): Karteikasten nach Leitner mit fünf Fächern, je Stufe ohne Hilfen.
// Reines Modul ohne DOM und ohne Speicher: Die Funktionen lesen den übergebenen Zustand (state.rep) und die
// übergebenen Pakete; nur enter, applyReview und afterRound verändern state.rep. Tage sind Texte "JJJJ-MM-TT"
// (örtliches Datum, store.today). Nichts hier sperrt eine Stufe (Leitsatz: nichts Gelerntes wird je gesperrt).
import { addDays, dayDiff } from "./store.js";

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

// Ist ein Eintrag des Kastens heute fällig?
export const isDueEntry = (e, heute) => !!e && typeof e.faellig === "string" && e.faellig <= heute;

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

// Plan für die nächste Runde „Wiederholen“: [{ id, n, guess? }] aus den am längsten fälligen Stufen (Reihenfolge wie due),
// höchstens MAX_STUFEN, zusammen RUNDE_WIEDERHOLEN Aufgaben. Eine Stufe mit nur zwei Knöpfen (level.guess) bekommt
// den größten Anteil und mindestens MIN_AUFGABEN_RATEN Aufgaben. Reicht das bei drei Stufen nicht für alle
// (zwei oder drei Ratestufen: 4 + 4 + 2 ließe einer Stufe nur zwei Aufgaben), kommen nur die ersten zwei Stufen
// in die Runde (5 + 5); die dritte bleibt fällig und kommt in der nächsten Runde. Leer, wenn nichts fällig ist.
// guess: true steht nur an Ratestufen (für das strengere Urteil in passed, Korrektur W-B1).
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
  return ids.map((id) => (isGuess(id) ? { id, n: n[id], guess: true } : { id, n: n[id] }));
}

// Urteil „sitzt“: bei n Aufgaben höchstens ⌊n / 5⌋ Fehler (3 oder 4: alle richtig; 5: einer daneben; 10: zwei).
// Ratestufen (guess, nur zwei Knöpfe; Korrektur W-B1): höchstens 2 · ⌊n / 10⌋ Fehler (4 und 5 Aufgaben: alle
// richtig, 10: zwei daneben). Wer nur rät, besteht so höchstens in 6,3 % der Runden (4 Aufgaben: 1/16; 5: 1/32;
// 10: 56/1024 = 5,5 %, so selten wie die Freischaltung mit 8 von 10); mit ⌊5 / 5⌋ waren es bei 5 Aufgaben 18,8 %.
export const passed = (n, fehler, guess = false) => fehler <= (guess ? 2 * Math.floor(n / 10) : Math.floor(n / 5));

// Ergebnis der gemischten Runde (engine: [{ id, n, ok }]) mit guess aus dem Plan (reviewPlan) ergänzen
export const withGuess = (perLevel, plan) => perLevel.map((e) => {
  const p = (plan || []).find((x) => x.id === e.id);
  return p && p.guess ? { ...e, guess: true } : e;
});

// Urteil je Stufe (Korrektur nach der Prüfung, W-B2): "sitzt" (passed), "fast" (genau ein Fehler, aber nicht
// bestanden – bei 3 oder 4 Aufgaben bzw. bei Ratestufen mit 4 oder 5) oder "wacklig" (zwei und mehr Fehler über der
// Grenze). Ein einzelner Fehler stuft damit nie zurück: Wer 90 % kann, bekäme sonst bei 4 + 3 + 3 Aufgaben in zwei
// von drei Runden ein „noch wacklig“. Bei 5 und mehr Aufgaben gilt ⌊n / 5⌋ unverändert (ein Fehler sitzt dort ohnehin).
// „fast“ erst ab 3 Aufgaben (bei 1 oder 2 wäre ein Fehler die Hälfte und mehr; reviewPlan plant nie weniger als 3).
export function verdictOf(n, fehler, guess = false) {
  if (passed(n, fehler, guess)) return "sitzt";
  return fehler === 1 && n >= 3 ? "fast" : "wacklig";
}

// Ergebnis einer Wiederholung eintragen. perLevel = [{ id, n, ok, guess? }] (n Aufgaben, ok davon richtig).
// sitzt: ein Fach weiter (höchstens FAECHER), fällig nach dem Abstand des neuen Fachs. fast: Fach bleibt, morgen
// wieder fällig. wacklig: ein Fach zurück (nicht unter 1), morgen wieder fällig. Fach 5 bleibt 5 und kommt alle 30
// Tage wieder. Gibt je Stufe { id, n, richtig, urteil, sitzt, fach, inTagen, faellig } zurück (für die Ergebniskarte;
// sitzt = urteil === "sitzt").
export function applyReview(state, perLevel, heute) {
  const rep = repOf(state);
  return perLevel.map(({ id, n, ok, guess }) => {
    const alt = rep[id] ? clampFach(rep[id].fach) : 1;
    const urteil = verdictOf(n, n - ok, guess === true);
    const sitzt = urteil === "sitzt";
    const fach = sitzt ? Math.min(FAECHER, alt + 1) : urteil === "fast" ? alt : Math.max(1, alt - 1);
    const inTagen = sitzt ? ABSTAENDE[fach - 1] : 1;
    const faellig = addDays(heute, inTagen);
    rep[id] = { fach, faellig, zuletzt: heute };
    return { id, n, richtig: ok, urteil, sitzt, fach, inTagen, faellig };
  });
}

// Nach einer normalen Runde (10 Aufgaben) in level mit correct Richtigen:
// - Stufe mit Hilfen: nichts (null);
// - noch nicht im Kasten: ab 8 Richtigen in Fach 1, fällig morgen ({ id, sitzt: true, fach: 1, inTagen: 1, neu: true });
// - im Kasten und fällig: zählt wie eine Wiederholung mit 10 Aufgaben (sitzt ab 8 Richtigen, sonst ein Fach zurück;
//   „fast“ gibt es bei 10 Aufgaben nicht, ein Fehler sitzt);
// - im Kasten, nicht fällig, ab 8 Richtigen: nichts (viel Üben am selben Tag soll den Abstand nicht verlängern);
// - im Kasten, nicht fällig, unter 8 Richtigen (Korrektur W-B7): ein deutliches Vergessen wird nicht übergangen –
//   die Stufe ist morgen wieder fällig (faellig = min(faellig, morgen)), das Fach bleibt (die Wiederholung morgen
//   entscheidet). Ergebnis { id, n, richtig, sitzt: false, fach, inTagen: 1, faellig, vorgezogen: true }.
export function afterRound(state, level, correct, heute) {
  if (!inBox(level)) return null;
  const e = (state.rep || {})[level.id];
  if (!e) {
    if (correct < 8) return null;
    enter(state, level.id, heute);
    return { id: level.id, sitzt: true, fach: 1, inTagen: ABSTAENDE[0], neu: true };
  }
  if (!isDueEntry(e, heute)) {
    if (correct >= 8) return null;
    const morgen = addDays(heute, 1);
    const fach = clampFach(e.fach);
    // nicht fällig heißt hier: faellig liegt nach heute, also mindestens morgen
    const faellig = typeof e.faellig === "string" && e.faellig < morgen ? e.faellig : morgen;
    state.rep[level.id] = { ...e, fach, faellig };
    return { id: level.id, n: RUNDE_WIEDERHOLEN, richtig: correct, sitzt: false, fach, inTagen: dayDiff(heute, faellig), faellig, vorgezogen: true };
  }
  return applyReview(state, [{ id: level.id, n: RUNDE_WIEDERHOLEN, ok: correct, guess: level.guess === true }], heute)[0];
}

/* ---------- Voraussetzungen (Welle 11, Schritt 5) ----------
Jede Stufe kennt ihre direkten Voraussetzungen (level.needs, Tabelle in docs/PLAN.md, Abschnitt 1). Ohne das
Feld gilt die Voreinstellung: die nächste frühere Stufe ohne Hilfen im selben Paket (gibt es keine: keine).
Ein gesetztes needs ersetzt die Voreinstellung ganz (needs: [] = keine). Ziele sind immer Stufen ohne Hilfen,
weiter vorn im selben Paket oder in einem früheren Paket (Tests in test/repeat.test.js); der Graph hat damit
keinen Kreis. Nichts davon sperrt eine Stufe: Voraussetzungen ordnen und bieten an. */

// Direkte Voraussetzungen der Stufe levelId: Liste von Stufen-IDs (leer, wenn keine oder die Stufe unbekannt ist)
export function needsOf(packs, levelId) {
  const pos = position(packs, levelId);
  if (!pos) return [];
  const [p, i] = pos, lv = packs[p].levels[i];
  if (Array.isArray(lv.needs)) return lv.needs.slice();
  for (let j = i - 1; j >= 0; j--) if (inBox(packs[p].levels[j])) return [packs[p].levels[j].id];
  return [];
}

// Voraussetzung zum Denkschritt i der Aufgabe q: q.steps[i].needs, sonst level.stepNeeds[i] (gilt für alle
// Aufgaben der Stufe). null, wenn die Stufe nichts je Schritt sagt (dann zählt needsOf als Ganzes). Aufgaben
// mit nur einem Schritt in einer zweischrittigen Stufe (Intervalle: Prime, Quarte, Quinte, Oktave) haben nur
// Schritt 0 und damit dessen Eintrag.
export function stepNeedsOf(level, q, i) {
  const st = q && Array.isArray(q.steps) ? q.steps[i] : null;
  if (st && Array.isArray(st.needs)) return st.needs.slice();
  if (level && Array.isArray(level.stepNeeds) && Array.isArray(level.stepNeeds[i])) return level.stepNeeds[i].slice();
  return null;
}

// Was man in der Stufe kann (für „Dafür brauchst du: …“); ohne level.skill der Titel der Stufe
export const skillOf = (level) => (level ? level.skill || level.title || level.id || "" : "");

// „Noten mit Vorzeichen · Notenstufen zählen (Prime bis Oktave)“ – leer, wenn die Stufe keine Voraussetzungen hat
export const needsText = (packs, levelId) => needsOf(packs, levelId)
  .map((id) => skillOf(levelOf(packs, id))).filter(Boolean).join(" · ");

// „heute“, „morgen“, „in 3 Tagen“ (0 und weniger: heute)
export const dueText = (inTagen) => (inTagen <= 0 ? "heute" : inTagen === 1 ? "morgen" : `in ${inTagen} Tagen`);

// "2026-11-24" → „24.11.“ (ohne führende Null: "2026-12-05" → „5.12.“)
export function dayText(day) {
  const [, m, d] = String(day).split("-").map(Number);
  return `${d}.${m}.`;
}

/* ---------- „Grundlagen wiederholen“ und Fehlermuster (Welle 11, Schritt 7) ----------
Eine kurze Runde aus den direkten Voraussetzungen einer Stufe (gemischte Runde, engine.startMixed, Art
"grundlagen"): ohne Hilfen, ohne Sterne, ohne Freischaltung, der Karteikasten ändert sich nicht. Angeboten auf
der Startkarte jeder Stufe mit Voraussetzungen (basicsOffer) und auf der Ergebniskarte einer normalen Runde
(weniger als 5 Richtige oder ein Fehlermuster, gapsOf). Nie Pflicht. */

// Ab so vielen Fehlern zu derselben Grundlage in einer normalen Runde nennt die Ergebniskarte das Muster
export const LUECKE_AB = 3;
// „zuletzt unter 8 von 10“: Grenze wie bei der Freischaltung
const GUT = 8;

// Plan der Runde „Grundlagen wiederholen“ zur Stufe levelId: [{ id, n }] aus needsOf, n Aufgaben gleich verteilt,
// der Rest an die ersten (6 → 6 / 3+3 / 2+2+2 / 2+2+1+1). only (optional): nur diese Grundlage(n), Stufen-ID oder
// Liste (Angebot nach einem Fehlermuster). Leer, wenn es keine Voraussetzungen gibt.
export function basicsPlan(packs, levelId, n = RUNDE_GRUNDLAGEN, only = null) {
  const ids = only ? [].concat(only).filter((id) => levelOf(packs, id)) : needsOf(packs, levelId);
  if (!ids.length) return [];
  const shares = split(n, ids.length);
  return ids.map((id, i) => ({ id, n: shares[i] })).filter((e) => e.n > 0);
}

// Warum eine Voraussetzung empfohlen wird ("nie" | "faellig" | "schwach") oder null. seit (optional): Tag der letzten
// Grundlagen-Runde mit höchstens einem Fehler; dann zählt nur ein Auslöser, der danach neu zutraf:
// - „nie gespielt“ kann danach nicht neu zutreffen (die Grundlagen-Runde trägt keine Runde in s.levels ein);
// - „wieder dran“ nur, wenn die Stufe erst nach jenem Tag fällig wurde (faellig > seit);
// - „unter 8 von 10“ nur, wenn die letzte normale Runde der Stufe nach jenem Tag lag (day > seit). Gezählt wird
//   in ganzen Tagen: eine schwache Runde am selben Tag wie die Grundlagen-Runde weckt die Empfehlung nicht.
// „zuletzt“ ist level.last (seit Welle 11, Schritt 7); ältere Stände ohne last zählen mit der besten Runde.
// Eine über den Jahrgang geöffnete, nie gespielte Stufe zählt als „nie gespielt“.
// seit ist der spätere von zwei Tagen (Korrektur W-B4 a): der Merker der Zielstufe (state.basics[levelId]) und der
// Tag, an dem in einer Grundlagen-Runde alle Aufgaben genau dieser Voraussetzung stimmten (state.basicsOk[id],
// afterBasicsLevels) – gezeigtes Können zählt so auch für Nachbarstufen mit denselben Voraussetzungen.
function needTrigger(state, id, heute, seit) {
  const st = (state.levels || {})[id] || {};
  const e = (state.rep || {})[id];
  if (!((st.played || 0) > 0)) return seit ? null : "nie";
  if (e && typeof e.faellig === "string" && e.faellig <= heute && (!seit || e.faellig > seit)) return "faellig";
  const last = typeof st.last === "number" ? st.last : st.best || 0;
  if (last < GUT && (!seit || (typeof st.day === "string" && st.day > seit))) return "schwach";
  return null;
}

// Angebot „Grundlagen wiederholen“ auf der Startkarte von levelId: { show, recommend, reason }.
// show: die Stufe hat Voraussetzungen. recommend: eine Voraussetzung wurde nie gespielt, ist fällig (Karteikasten)
// oder lag zuletzt unter 8 von 10 – und seit der letzten Grundlagen-Runde zu dieser Stufe mit höchstens einem
// Fehler (state.basics[levelId], Tag) traf kein Auslöser neu zu (needTrigger). reason: { kind, id } zur ersten
// solchen Voraussetzung (Reihenfolge von needsOf) oder null.
export function basicsOffer(state, packs, levelId, heute) {
  const needs = needsOf(packs, levelId);
  const seit = dayOf(state.basics, levelId);
  for (const id of needs) {
    const ok = dayOf(state.basicsOk, id);
    const kind = needTrigger(state, id, heute, !seit ? ok : !ok ? seit : ok > seit ? ok : seit);
    if (kind) return { show: true, recommend: true, reason: { kind, id } };
  }
  return { show: needs.length > 0, recommend: false, reason: null };
}

// Tag aus einem Merker-Objekt (state.basics, state.basicsOk) oder null
const dayOf = (map, id) => (map && typeof map === "object" && !Array.isArray(map) && typeof map[id] === "string" ? map[id] : null);

// Nach einer Grundlagen-Runde zu levelId: mit höchstens einem Fehler den Merker state.basics[levelId] = heute setzen
// (die Empfehlung verschwindet, bis ein Auslöser neu zutrifft). Gibt true zurück, wenn der Merker gesetzt wurde.
// state.basics zählt zum Fortschritt (store.reset löscht ihn).
export function afterBasics(state, levelId, correct, total, heute) {
  if (total - correct > 1) return false;
  if (!state.basics || typeof state.basics !== "object" || Array.isArray(state.basics)) state.basics = {};
  state.basics[levelId] = heute;
  return true;
}

// Nach jeder Grundlagen-Runde (auch nur zu einem Teil der Grundlagen), je Voraussetzung (Korrektur W-B4).
// perLevel = [{ id, n, ok }] aus engine (n Aufgaben dieser Voraussetzung, ok davon richtig).
// (a) Stimmten alle ihre Aufgaben: state.basicsOk[id] = heute (basicsOffer nimmt den späteren Tag aus diesem und
//     dem Merker der Zielstufe; die Empfehlung kommt dann auch bei Nachbarstufen erst wieder, wenn danach ein
//     Auslöser neu zutrifft). Zählt zum Fortschritt (store.reset löscht ihn).
// (b) War sie im Karteikasten fällig, hatte mindestens MIN_AUFGABEN_GRUNDLAGE Aufgaben und ist bestanden (passed,
//     mit guess der Stufe): Das zählt als ihre Wiederholung (applyReview, ein Fach weiter). Nicht bestanden ändert
//     den Kasten nicht (sie bleibt fällig; die Grundlagen-Runde stuft nicht zurück).
// Gibt die Urteile aus (b) zurück ([{ id, n, richtig, urteil, … }], leer, wenn nichts eingetragen wurde).
export const MIN_AUFGABEN_GRUNDLAGE = 3;
export function afterBasicsLevels(state, packs, perLevel, heute) {
  const out = [];
  for (const e of perLevel || []) {
    if (!e || !(e.n > 0)) continue;
    if (e.ok === e.n) {
      if (!state.basicsOk || typeof state.basicsOk !== "object" || Array.isArray(state.basicsOk)) state.basicsOk = {};
      state.basicsOk[e.id] = heute;
    }
    const lv = levelOf(packs, e.id);
    const entry = (state.rep || {})[e.id];
    const guess = !!lv && lv.guess === true;
    if (lv && inBox(lv) && entry && isDueEntry(entry, heute) && e.n >= MIN_AUFGABEN_GRUNDLAGE && passed(e.n, e.n - e.ok, guess)) {
      out.push(...applyReview(state, [{ id: e.id, n: e.n, ok: e.ok, guess }], heute));
    }
  }
  return out;
}

// Fehlermuster einer normalen Runde in level (log aus engine: je Aufgabe { id, ok, oks }). Je Aufgabe mit Schritt i
// daneben zählt jede Stufe aus stepNeedsOf(level, null, i) einmal; sagt die Stufe nichts je Schritt (einschrittige
// Stufen), zählt eine Antwort daneben für needsOf als Ganzes. Eine Aufgabe zählt je Grundlage höchstens einmal.
// Ergebnis: [{ need, count, step }] mit count >= LUECKE_AB, nach count absteigend, bei gleicher Zahl nach dem
// Schritt (erster vor zweitem), sonst in der Reihenfolge von needsOf. step: Index des Schritts, wenn alle gezählten Fehler zu dieser Grundlage aus demselben Schritt einer
// Stufe mit stepNeeds kamen, sonst null („die Antwort“).
// Sonderfall (docs/PLAN.md, Abschnitt 2, Intervalle 4): Ein Schritt ohne Grundlage (stepNeeds[i] = []) in einer
// Stufe ohne Hilfen, deren Stufe direkt davor Hilfen hat, zählt für jene Stufe; der Eintrag trägt helps: true
// („Stufe 3 mit Hilfen üben“ statt „Grundlagen wiederholen“).
export function gapsOf(packs, level, log) {
  if (!level) return [];
  const pos = position(packs, level.id);
  const before = pos && pos[1] > 0 ? packs[pos[0]].levels[pos[1] - 1] : null;
  const helpsFallback = inBox(level) && before && !inBox(before) ? before.id : null;
  const whole = needsOf(packs, level.id);
  const map = new Map();
  // seen: Grundlagen, die für diese Aufgabe schon gezählt sind (dann nur den Schritt vermerken)
  let seen = new Set();
  const add = (need, step, helps) => {
    if (!map.has(need)) map.set(need, { need, count: 0, steps: new Set(), helps });
    const x = map.get(need);
    if (!seen.has(need)) { seen.add(need); x.count++; }
    x.steps.add(step);
  };
  for (const e of log || []) {
    if (!e || e.id !== level.id || e.ok) continue;
    const oks = Array.isArray(e.oks) && e.oks.length ? e.oks : [false];
    seen = new Set();
    oks.forEach((ok, i) => {
      if (ok) return;
      const sn = stepNeedsOf(level, null, i);
      if (sn === null) { for (const n of whole) add(n, null, false); return; }
      if (!sn.length && helpsFallback) { add(helpsFallback, i, true); return; }
      for (const n of sn) add(n, i, false);
    });
  }
  const rank = (id) => { const k = whole.indexOf(id); return k < 0 ? whole.length : k; };
  // bei gleicher Zahl der erste Schritt vor dem zweiten (Intervalle 5–7: intervall-2 steht nicht in needsOf)
  const firstStep = (x) => { const st = [...x.steps].filter((v) => v !== null); return st.length ? Math.min(...st) : 99; };
  return [...map.values()].filter((x) => x.count >= LUECKE_AB)
    .sort((a, b) => b.count - a.count || firstStep(a) - firstStep(b) || rank(a.need) - rank(b.need))
    .map((x) => {
      const step = x.steps.size === 1 ? [...x.steps][0] : null;
      return x.helps ? { need: x.need, count: x.count, step, helps: true } : { need: x.need, count: x.count, step };
    });
}
