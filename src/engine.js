// Generischer Rundenablauf: zehn Aufgaben, Feedback, Sterne und XP.
// Die Engine kennt kein Paket im Detail: sie ruft level.question(prev, ctx) und level.check(q, value),
// zeigt q.svg (nach der Antwort q.revealSvg, falls gesetzt) und baut die Antwort-Elemente nach der Eingabeart.
// Nach der Antwort färbt sie die ganze Zeile grün bzw. rot (Klasse ok/bad am <svg>); setzt die Aufgabe
// q.keepRow = true, bleibt die Zeile schwarz und nur das Feedback darunter wird grün bzw. rot.
// Zweischrittige Aufgaben (q.steps, seit „Intervalle neu“): erst ein Satz Knöpfe, dann ein zweiter; gezählt
// wird die Aufgabe einmal, richtig nur, wenn beide Schritte stimmen. Hilfen (level.helps) zeigt die Engine
// in einem eigenen Bereich zum Aufklappen (ui.helps), mit Klaviatur und Tabelle zur Aufgabe; hat die Stufe
// level.demo(q), führt der Knopf „Vorführen“ die aktuelle Aufgabe vor – erst nach der Antwort, die Runde
// wartet dann, bis du „Nächste Aufgabe“ tippst (oder die Hilfen zuklappst).
// Seit Welle 10: Nach einer danebenliegenden Antwort wartet jede Stufe auf „Nächste Aufgabe“ (waitsAfter),
// nach einem danebenliegenden ersten Schritt erscheint „Weiter zu Schritt 2“. Teilerfolg (nur Schritt 1
// daneben, q.partial) bekommt die Klasse part statt bad und zählt weiter als daneben.
// Seit Welle 11 (Schritt 6): gemischte Runden („Wiederholen“, „Grundlagen wiederholen“). Jede Aufgabe trägt
// ihre Herkunft (q.from = Stufe, q.fromPack = Paket); Eingabe, Prüfung, Ziffern und Namensraster richten sich
// dann nach der Aufgabe, nicht nach einer Stufe der Runde (cur). Keine Hilfen, kein „Vorführen“, keine Sterne.
// Oben stehen reine Hilfsfunktionen (getestet in test/engine.test.js), unten der DOM-Teil.
import { LETTERS, NAME_ACCS, N, gName, parseNoteName, midi } from "./music.js";
import { pianoSvg } from "./staff.js";
import { recordRound, recordAnswer, recordMixedRound, MIXED_KINDS } from "./store.js";
import { play, playChord, isMuted } from "./audio.js";
import { mountDemo, stopDemos } from "./demo.js";

export const ROUND_LENGTH = 10;
// Pause nach einer richtigen Antwort, bevor die nächste Aufgabe von selbst erscheint (nur Stufen ohne Hilfen
// und kurze Rückmeldung, siehe waitsAfter). Nach „daneben“ gibt es keinen Zeitgeber mehr (Welle 10).
export const DELAY_OK = 800;
// Pause zwischen erstem und zweitem Schritt (q.steps), nur wenn Schritt 1 richtig war; daneben wartet die
// Runde auf „Weiter zu Schritt 2“
export const DELAY_STEP_OK = 700;
// Sperre nach „Weiter zu Schritt 2“ bzw. „Nächste Aufgabe“ (auch Enter, Leertaste, Knopf am Ende der Vorführung;
// Korrektur nach der Prüfung Welle 12, J-B2): So lange zählt keine Antwort (Knopf, Taste der Klaviatur, Tastatur).
// Ein Doppeltipp auf den Weiter-Knopf trifft sonst den Antwortbereich, der darunter neu erscheint, und beantwortet
// den neuen Schritt ungesehen. Nach einer Antwort ist die Runde ohnehin gesperrt (r.locked, DELAY_STEP_OK bzw.
// DELAY_OK), dort braucht es keine eigene Sperre.
export const SWITCH_GUARD = 380;
// Längster Rückmeldetext (Zeichen), nach dem eine richtige Antwort in einer Stufe ohne Hilfen von selbst
// weitergeht; längere Texte bleiben stehen, bis du tippst. Startwert, nach dem Test mit Kindern anpassen.
export const AUTO_OK_MAX = 45;
// Abstand zwischen mehreren Tönen aus q.play
export const PLAY_GAP = 500;
// Rhythmus aus q.play: ein Schlag (Viertel) dauert 600 ms, also Tempo 100 Viertel pro Minute
export const BEAT_MS = 600;
// Pause nach dem letzten Ton eines Rhythmus, bevor die nächste Aufgabe erscheint
export const RHYTHM_TAIL = 300;

/* ---------- Reine Hilfsfunktionen ---------- */

// „Stufe 2“ und „… und 7“ nicht umbrechen (geschütztes Leerzeichen; bei 320 px stand die Zahl sonst allein in
// der Zeile). Rein, getestet; genutzt von der Startseite (gesperrte Karten) und der Ergebniskarte (Welle 10, A7)
export const keepStufe = (t) => t.replace(/(Stufen?| und) (?=\d)/g, "$1\u00a0");
// Anzeige (Korrektur nach der Prüfung Welle 11, J-C3 und L-C7): Zahl und Einheit („3 Halbtöne“, „7 Tagen“,
// „4 Stufen“) und Vorzeichen nach einem Wort („und ♭“) mit geschütztem Leerzeichen; Notenpaare („as–c'“) ohne
// Umbruch nach dem Strich (unsichtbarer Wortverbinder U+2060). Nur für die Anzeige, die Texte der Pakete bleiben.
// Rein, getestet.
export const keepTogether = (t) => String(t)
  .replace(/(\d) (?=(Halbt|Stufe|Schl[aä]g|Tag|Aufgabe|Note\b|Noten\b|Vorzeichen|Kreuz))/g, "$1\u00a0")
  .replace(/ ([♭♯♮])/g, "\u00a0$1")
  .replace(/([A-Ha-h][a-z]*'*)–(?=[A-Ha-h])/g, "$1–\u2060");

export const starsHtml = (k) => `<span class="stars">${"★".repeat(k)}<span class="off">${"★".repeat(3 - k)}</span></span>`;

// Eingabeart: die Wahl „Klaviatur“ (state.input === "keys") ersetzt "letters"; andere Arten bleiben.
// namesOnly (optional, level.namesOnly, seit Paket „Intervalle 7–12“): die Schreibweise zählt
// (gis ist nicht as), deshalb bleibt es beim Namensraster, auch wenn „Klaviatur“ gewählt ist
export const effectiveInput = (levelInput, pref, namesOnly = false) => ((levelInput || "letters") === "letters" && pref === "keys" && !namesOnly ? "keys" : levelInput || "letters");

// Zehn Aufgaben nacheinander erzeugen, jede verschieden von der vorherigen.
// ctx (optional, z. B. { notes: state.notes, state }) geht als zweiter Parameter an question (state: der
// Spielstand, z. B. für den gewählten Merkspruch in der Rückmeldung; Pakete lesen ihn nur über sprueche.js);
// Pakete ohne zweiten Parameter laufen unverändert.
// ctx.round enthält die bisher erzeugten Aufgaben dieser Runde (z. B. „Prime höchstens einmal pro Runde“).
export function makeRound(level, count = ROUND_LENGTH, ctx) {
  const out = [];
  const c = Object.assign({}, ctx, { round: out });
  for (let i = 0; i < count; i++) out.push(level.question(i ? out[i - 1] : null, c));
  return out;
}

// Stufe zu einer ID in allen Paketen suchen; sonst die erste Stufe des ersten Pakets
export function findLevel(packs, id) {
  for (const pack of packs) {
    const index = pack.levels.findIndex((l) => l.id === id);
    if (index >= 0) return { pack, level: pack.levels[index], index };
  }
  return { pack: packs[0], level: packs[0].levels[0], index: 0 };
}

// Nächste Stufe im selben Paket oder null
export function nextLevel(pack, level) {
  const i = pack.levels.findIndex((l) => l.id === level.id);
  return i >= 0 ? pack.levels[i + 1] || null : null;
}

// Gemischte Runde (Welle 11, Schritt 6), rein. plan = [{ id, n }]: Jede Stufe erzeugt n Aufgaben
// (level.question(prev, ctx), prev und ctx.round innerhalb der Stufe, damit Regeln wie „Prime höchstens einmal“
// und „nie dieselbe Aufgabe zweimal hintereinander“ je Stufe gelten). Jede Aufgabe ist eine flache Kopie mit
// q.from (Stufe) und q.fromPack (Paket); die Aufgabe selbst bleibt unverändert (Pakete dürfen Aufgaben
// wiederverwenden). Danach gemischt: nie zwei Aufgaben derselben Stufe hintereinander, solange es anders geht
// (immer die Stufe mit den meisten übrigen Aufgaben außer der zuletzt gezogenen; Gleichstand per rand).
// Eine unbekannte ID ist ein Fehler (findLevel fiele still auf die erste Stufe zurück).
export function makeMixed(packs, plan, ctx, rand = Math.random) {
  const groups = [];
  for (const { id, n } of plan || []) {
    if (!(n > 0)) continue;
    const pack = packs.find((p) => p.levels.some((l) => l.id === id));
    if (!pack) throw new Error(`Unbekannte Stufe: ${id}`);
    const level = pack.levels.find((l) => l.id === id);
    let g = groups.find((x) => x.level === level);
    if (!g) { g = { level, pack, round: [], qs: [] }; groups.push(g); }
    const c = Object.assign({}, ctx, { round: g.round });
    for (let i = 0; i < n; i++) {
      const q = level.question(g.round.length ? g.round[g.round.length - 1] : null, c);
      g.round.push(q);
      g.qs.push(Object.assign({}, q, { from: level, fromPack: pack }));
    }
  }
  const out = [];
  let last = -1;
  while (groups.some((g) => g.qs.length)) {
    let cand = groups.map((g, i) => i).filter((i) => groups[i].qs.length && i !== last);
    if (!cand.length) cand = [last];
    const max = Math.max(...cand.map((i) => groups[i].qs.length));
    const top = cand.filter((i) => groups[i].qs.length === max);
    const i = top[Math.min(top.length - 1, Math.floor(rand() * top.length))];
    out.push(groups[i].qs.shift());
    last = i;
  }
  return out;
}

// Herkunftszeile über der Notenzeile in der gemischten Runde: „Intervalle · Stufe 4“ (rein, getestet;
// „Stufe 4“ bricht nicht um)
// Kurzname des Pakets wie auf der Karte „Heute“ (J-C4): „Dreiklänge · Stufe 6“ statt „Dreiklänge und Quintenzirkel · …“
export const originText = (pack, level) => keepStufe(`${pack ? pack.short || pack.title : ""} · Stufe ${level.no}`.replace(/^ · /, ""));

// Ergebnis je Stufe aus dem Rundenprotokoll (rein): [{ id, n, ok }], zuerst in der Reihenfolge von order
// (IDs des Plans), weitere Stufen in der Reihenfolge ihres ersten Auftretens
export function perLevelOf(log, order = []) {
  const map = new Map(order.map((id) => [id, { id, n: 0, ok: 0 }]));
  for (const e of log) {
    if (!map.has(e.id)) map.set(e.id, { id: e.id, n: 0, ok: 0 });
    const x = map.get(e.id);
    x.n++; if (e.ok) x.ok++;
  }
  return [...map.values()].filter((x) => x.n > 0);
}

// Antwort zählen; mit q.statKey auch je Aufgabe, sec (optional) ist die Antwortzeit in Sekunden.
// Blitz übergibt keine Zeit, weil dort der Zeitdruck die Werte verfälschen würde.
export function countAnswer(s, q, ok, sec) {
  if (q.statKey) return recordAnswer(s, q.statKey, ok, sec);
  s.answered++; if (ok) s.correct++;
  return s;
}

// Feedback nach der Antwort. q.reveal (optional) ist ein ganzer Satz für eine falsche Antwort, z. B.
// „Richtig wäre: A-Dur.“, weil „Das war ein …“ nicht zu jedem Begriff passt; ohne reveal wie bisher.
export const feedbackText = (q, ok) => (ok ? `Richtig! ${q.display}` : q.reveal || `Das war ein ${q.display}.`);
// Rückmeldung in Teilen ({ t, mark }) statt eines Texts, wenn die Aufgabe sie mitbringt (q.revealParts, z. B.
// Noten lesen: das Wort des Merkspruchs zur Stelle der Note) und sie genau den gezeigten Text ergeben; sonst
// null. Rein, getestet. Die Teile werden nur als Text eingesetzt (Spruch des Kindes, nie HTML).
export const feedbackParts = (q, text) => (Array.isArray(q.revealParts) && q.revealParts.map((x) => x.t).join("") === text ? q.revealParts : null);
// Text der Rückmeldung setzen; markierte Teile in <b class="fb-mark"> (per textContent)
function setFeedback(el, text, parts) {
  if (!parts) { el.textContent = keepTogether(text); return; }
  el.textContent = "";
  for (const x of parts) {
    if (x.mark) { const b = document.createElement("b"); b.className = "fb-mark"; b.textContent = keepTogether(x.t); el.append(b); }
    else el.append(document.createTextNode(keepTogether(x.t)));
  }
}

// Satz der Ergebniskarte (rein, getestet). opts: { correct, total, short }.
// - alles richtig (correct = total, Vorgabe ROUND_LENGTH): „Stark, alles richtig.“ (Korrektur nach der Prüfung
//   Welle 11, J-B2/L-B1: bei 10 von 10 nicht „fast alles“)
// - short: nur der erste Teil („Stark.“, „Gut.“, „Solide Basis.“, „Noch wacklig.“) – Runde „Wiederholen“ (dort gibt
//   es keinen Stern zu holen; die Zeilen je Stufe sagen, wie es weitergeht) und Ergebniskarte mit Fehlermuster (das
//   Muster ist dann die Empfehlung, J-B7/W-B6)
export const RESULT_HEAD = ["Noch wacklig.", "Solide Basis.", "Gut.", "Stark."];
export const ALL_RIGHT = "Stark, alles richtig.";
export function resultMessage(stars, { correct = -1, total = ROUND_LENGTH, short = false } = {}) {
  if (correct >= total) return ALL_RIGHT;
  if (short) return RESULT_HEAD[stars] || RESULT_HEAD[0];
  if (stars === 3) return "Stark, fast alles richtig.";
  if (stars === 2) return "Gut. Noch eine Runde und der dritte Stern ist drin.";
  if (stars === 1) return "Solide Basis. Was noch unsicher ist, kannst du in „Lernen“ nachschauen.";
  return "Noch wacklig. Übe zuerst in „Lernen“ mit den Lerntafeln.";
}

// Fortschrittspunkte: results[i] ist true (richtig), false (daneben) oder "part" (Teilerfolg, zählt als daneben).
// Nicht nur über die Farbe (Welle 10, B14): ✓ und ✗ im Punkt, der Teilerfolg als halb gefüllter Punkt (CSS);
// für Bildschirmleser trägt jeder Punkt seinen Stand als aria-label.
const dotClass = (v) => (v === "part" ? "part" : v ? "ok" : "bad");
export const DOT_LABEL = { ok: "richtig", bad: "daneben", part: "teilweise richtig", cur: "jetzt", "": "noch offen" };
export const dotsHtml = (results, idx, total) => Array.from({ length: total }, (_, i) => {
  const c = i < idx ? dotClass(results[i]) : i === idx ? "cur" : "";
  return `<span class="dot ${c}" role="img" aria-label="Aufgabe ${i + 1}: ${DOT_LABEL[c]}"></span>`;
}).join("");

// Antwortknopf nach der Antwort markieren: Klasse ok/bad (Farbe und Zeichen ✓/✗ per CSS) und der Stand im
// aria-label („Fis, richtig“). Tasten der Klaviatur bekommen nur die Klasse; das Zeichen steht in der Rückmeldung.
export const MARK_LABEL = { ok: "richtig", bad: "daneben" };
export function markAnswer(el, cls) {
  el.classList.add(cls);
  if (el.tagName !== "BUTTON") return;
  if (el.dataset.aria === undefined) el.dataset.aria = el.getAttribute("aria-label") || "";
  el.setAttribute("aria-label", `${el.dataset.aria || el.textContent.trim()}, ${MARK_LABEL[cls]}`);
}
// Markierung zurücknehmen (neue Aufgabe mit denselben Knöpfen)
export function clearMark(el) {
  el.classList.remove("ok", "bad");
  if (el.dataset.aria === undefined) return;
  if (el.dataset.aria) el.setAttribute("aria-label", el.dataset.aria); else el.removeAttribute("aria-label");
  delete el.dataset.aria;
}

export const lettersHtml = () => LETTERS.map((l) => `<button class="btn" data-letter="${l}">${l}</button>`).join("");

// Namensraster für Stufen mit Vorzeichen (acc: true bei "letters"): drei Reihen zu je sieben Knöpfen,
// oben ohne Vorzeichen (C … H), dann mit ♯ (Cis … His), unten mit ♭ (Ces … B). Die Spalten gehören
// zum selben Stammton (H-Spalte: H, His, B). Die Beschriftung kommt aus gName.
export const namesHtml = () => NAME_ACCS.map((acc) => LETTERS.map((l) =>
  `<button class="btn" data-letter="${l}" data-acc="${acc}">${gName(N(l, 4, acc))}</button>`).join("")).join("");

// Stufe mit Namensraster und getipptem Namen?
export const usesNames = (level) => !!level && (level.input || "letters") === "letters" && !!level.acc;

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const choicesHtml = (choices) => (choices || []).map((c, i) => `<button class="btn" data-choice="${i}">${esc(c)}</button>`).join("");
// Raster für Auswahlknöpfe: Begriffe zweispaltig ("choices"); sind alle Texte kurz (höchstens 4 Zeichen,
// z. B. „½“, „VII“, „3 ♭“), passen mehrere in eine Reihe ("choices short"). Buchstaben behalten 7 Spalten.
export const CHOICE_SHORT = 4;
export const choicesClass = (choices) => ((choices || []).length && choices.every((c) => String(c).length <= CHOICE_SHORT) ? "choices short" : "choices");
// Spalten für kurze Texte: alle in einer Reihe, ab sieben Knöpfen zwei Reihen (I–VII: 4 + 3)
export const choiceCols = (choices) => { const n = (choices || []).length; return n <= 6 ? n : Math.ceil(n / 2); };

// Knöpfe einer Aufgabe im Schritt step: { choices, cols?, digits?, answer, prompt?, ok?, bad? }.
// Ohne q.steps ist es die Aufgabe selbst (choices, cols, digits, answer).
export const choiceSet = (q, step = 0) => (q.steps ? q.steps[step] : q);
// Klassen für das Raster der Auswahlknöpfe: mit cols (z. B. 4 bei Prime … Oktave) so viele Spalten,
// ohne cols wie bisher (choicesClass)
export const setClass = (set) => (set.cols ? "choices cols" : choicesClass(set.choices));

// Denkschritt mit Noteneingabe (Welle 12, Schritt 0): Ein Schritt darf statt Auswahlknöpfen die Noteneingabe
// der Stufe benutzen – set.note = "letters" (C … H, Klaviatur, Buchstaben-Tasten) oder "names" (Namensraster mit
// 21 Namen, Klaviatur, getippter Name mit Enter); set.answer ist dann { letter, acc }.
export const NOTE_STEPS = ["letters", "names"];
// Art des Antwortbereichs im Schritt i (rein, getestet): "choices" | "letters" | "names". Ohne q.steps gilt die
// Eingabe der Stufe (level, optional): Auswahlknöpfe, Namensraster (usesNames) oder Buchstaben.
export function stepInput(q, i = 0, level) {
  if (q && q.steps) {
    const set = q.steps[i];
    return set && NOTE_STEPS.includes(set.note) ? set.note : "choices";
  }
  if (level && level.input === "choices") return "choices";
  return usesNames(level) ? "names" : "letters";
}
// Antwort eines Schritts prüfen (rein, getestet). Auswahl: genau der Text von set.answer (wie bisher). Noteneingabe:
// { letter, acc } genau gleich (Buchstabe und Vorzeichen), eine Taste der Klaviatur (Zahl: Halbtöne über C) nach
// Tonklasse wie checkNote in „Noten lesen“ (Fis = Ges); bei "letters" zählt ein Name mit Vorzeichen nicht.
export function checkStep(set, value) {
  if (!set) return false;
  if (!NOTE_STEPS.includes(set.note)) return value === set.answer;
  const a = set.answer;
  if (!a || typeof a !== "object" || !a.letter) return false;
  if (typeof value === "number") return ((midi(N(a.letter, 4, a.acc || 0)) % 12) + 12) % 12 === ((value % 12) + 12) % 12;
  return !!value && typeof value === "object" && value.letter === a.letter && (value.acc || 0) === (a.acc || 0);
}
// Noteneingaben in den Schritten einer Stufe (rein, getestet, gemerkt): z. B. ["letters", "names"]. Nur Stufen mit
// Buchstaben-Eingabe und twoSteps werden befragt (eine Aufgabe als Probe; alle Aufgaben einer Stufe haben dieselben
// Schritte), sonst [].
const noteStepCache = new WeakMap();
export function levelNoteSteps(level) {
  if (!level || !level.twoSteps || (level.input || "letters") !== "letters" || typeof level.question !== "function") return [];
  if (!noteStepCache.has(level)) {
    const q = level.question(null, { notes: {}, round: [] });
    noteStepCache.set(level, q && q.steps ? [...new Set(q.steps.map((s) => s.note).filter((n) => NOTE_STEPS.includes(n)))] : []);
  }
  return noteStepCache.get(level);
}

// Zweischrittig: Rückmeldung nach dem letzten Schritt. oks = Ergebnis je Schritt. Alles richtig wie
// bisher; nur der erste Schritt daneben und der letzte richtig: q.partial (falls gesetzt); sonst q.reveal.
// Ein Satz Knöpfe genügt auch (steps.length === 1, z. B. Intervalle bei nur einem möglichen Intervall):
// Die Aufgabe endet dann nach dem ersten Schritt.
export const isPartial = (q, oks) => !!q.partial && oks.length > 1 && !oks[0] && !!oks[oks.length - 1];
export function stepsFeedback(q, oks) {
  if (oks.every(Boolean)) return feedbackText(q, true);
  if (isPartial(q, oks)) return q.partial;
  return feedbackText(q, false);
}
// Klasse der Rückmeldung (und des Fortschrittspunkts): "ok", "part" (Teilerfolg) oder "bad"
export const stepsResult = (q, oks) => (oks.every(Boolean) ? "ok" : isPartial(q, oks) ? "part" : "bad");

// Ziffer 1 bis 9 als Auswahl in einem Knopfsatz mit digits (Prime … Oktave: 1 bis 8), sonst null
export function digitAction(e, set) {
  if (e.metaKey || e.ctrlKey || e.altKey || !set || !set.digits) return null;
  if (!/^[1-9]$/.test(e.key)) return null;
  const i = +e.key - 1;
  return i < (set.choices || []).length ? i : null;
}

// Hilfen (level.helps, z. B. ["klaviatur", "tabelle"]): Klaviatur über zwei Oktaven ab C (Violinschlüssel
// c' bis c''', Bassschlüssel C bis c'), nicht anklickbar, markiert die Töne aus q.helpMarks; dazu
// level.helpText und die Tabelle level.helpTable (HTML aus dem Paket). Leer ohne helps.
export const HELP_FROM = { treble: 60, bass: 36 };
export const HELP_OCTAVES = 2;
// Unterstes C der Hilfe-Klaviatur (MIDI): q.helpFrom (optional, seit Welle 8 „Tonleitern“: B-Dur im
// Violinschlüssel beginnt auf b, D-Dur im Bassschlüssel reicht bis d'), sonst HELP_FROM[q.clef]
export const helpFrom = (q) => (typeof q.helpFrom === "number" ? q.helpFrom : HELP_FROM[q.clef] ?? HELP_FROM.treble);
export const hasHelps = (level) => !!(level && level.helps && level.helps.length);
// Überschrift des Bereichs (ui.helpsTitle, das <summary>): nennt nur, was die Stufe wirklich zeigt (eine Tabelle als
// Funktion zählt als vorhanden; geprüft wird nur das Feld). Mit Klaviatur
// und Tabelle wie bisher „Hilfen: Klaviatur und Tabelle“, nur mit Klaviatur „Hilfen: Klaviatur“ (Tonleitern
// Stufe 12). level.helpsTitle (optional) setzt einen eigenen Text.
export const HELPS_TITLE = "Hilfen";
const HELP_NAMES = { klaviatur: "Klaviatur", tabelle: "Tabelle" };
export function helpsTitle(level) {
  if (level && typeof level.helpsTitle === "string" && level.helpsTitle) return level.helpsTitle;
  if (!hasHelps(level)) return HELPS_TITLE;
  const parts = ["klaviatur", "tabelle"].filter((h) => level.helps.includes(h) && (h !== "tabelle" || level.helpTable)).map((h) => HELP_NAMES[h]);
  return parts.length ? `${HELPS_TITLE}: ${parts.join(" und ")}` : HELPS_TITLE;
}
// Aufbau: Satz und daneben der Knopf „Vorführen“ (nur mit level.demo, zu Beginn gesperrt: er verriete die
// Antwort; darunter sichtbar „nach deiner Antwort“, der Zusatz verschwindet mit demoReady), dann Klaviatur und Tabelle (.help-grid: nebeneinander, wo Platz ist),
// Platz für die Vorführung (.help-demo). Alles knapp gehalten, damit die Antwortknöpfe sichtbar bleiben.
export const DEMO_LABEL = "Vorführen", DEMO_WAIT = "Vorführen geht erst nach deiner Antwort", DEMO_READY = "Diese Aufgabe Schritt für Schritt";
export const DEMO_WAIT_SHORT = "nach deiner Antwort";
export const DEMO_NEXT = "Nächste Aufgabe";
// Aufschrift von ui.next, wenn nach einem danebenliegenden ersten Schritt der zweite folgt
export const NEXT_STEP = "Weiter zu Schritt 2";
// Stufen mit Hilfen warten nach der letzten Antwort einer Aufgabe auf „Nächste Aufgabe“ (ui.next, Enter oder
// Leertaste), damit du Auflösung, Hilfen und „Vorführen“ in Ruhe ansehen kannst (Sonderfall von waitsAfter).
export const waitsForNext = (level) => hasHelps(level);
// Warten nach einer Aufgabe (rein): Stufe mit Hilfen → ja; daneben (auch Teilerfolg) → immer; richtig ohne
// Hilfen → nur in Stufen, deren richtige Rückmeldungen länger als AUTO_OK_MAX werden können (okWaits), sonst
// nach answerDelay von selbst weiter.
// Seit der Abschlussprüfung Welle 10 gilt die Grenze je Stufe, nicht je Text: Sonst lief in Tonleitern 11 und
// Dreiklänge 3, 5, 6 nur ein Teil der richtigen Antworten von selbst weiter (unvorhersehbar). Eine Stufe ohne
// Hilfen wartet auch nach „richtig“, wenn irgendeine ihrer richtigen Rückmeldungen länger als AUTO_OK_MAX ist
// (okWaits); level.autoNext (true/false) setzt es fest. Ohne level.question (Testobjekte) gilt der Text selbst.
export const waitsAfter = (level, ok, text) => waitsForNext(level) || !ok || okWaits(level, text);
// Stichprobe je Stufe (gemerkt): so viele Aufgaben, dass jede Aufgabe der Stufe sicher vorkommt (größter Vorrat
// ohne Hilfen etwa 200 Aufgaben; test/engine.test.js prüft, dass das Ergebnis mit 20-facher Stichprobe gleich ist)
export const OK_SAMPLE = 1500;
const okWaitCache = new WeakMap();
export function okTextsMax(level, n = OK_SAMPLE) {
  let max = 0, prev = null;
  const round = [];
  for (let i = 0; i < n; i++) {
    prev = level.question(prev, { notes: {}, round });
    max = Math.max(max, feedbackText(prev, true).length);
  }
  return max;
}
export function okWaits(level, text) {
  if (level && typeof level.autoNext === "boolean") return !level.autoNext;
  if (!level || typeof level.question !== "function") return String(text || "").length > AUTO_OK_MAX;
  if (!okWaitCache.has(level)) okWaitCache.set(level, okTextsMax(level) > AUTO_OK_MAX);
  return okWaitCache.get(level);
}
// Hinweis- und Hilfetexte dürfen Funktionen sein, (ctx) => Text, z. B. mit dem gewählten Merkspruch aus
// ctx.state (Welle 10, Schritt 4); sonst der Text selbst. Rein, getestet.
export const textOf = (v, ctx) => (typeof v === "function" ? v(ctx || {}) : v);
// ctx (optional): { state } für Hilfetexte als Funktion. Ein Hilfetext ist HTML; Pakete setzen eigene Texte
// des Kindes darin mit esc ein.
export function helpsHtml(level, q, ctx) {
  if (!hasHelps(level)) return "";
  const ht = textOf(level.helpText, ctx);
  const text = ht ? `<p class="small help-text">${ht}</p>` : "";
  let out = level.demo
    ? `<div class="help-head">${text}<span class="demo-go"><button class="btn" data-demo-btn disabled title="${DEMO_WAIT}">${DEMO_LABEL}</button><span class="small muted demo-wait" data-demo-wait>${DEMO_WAIT_SHORT}</span></span></div>`
    : text;
  let grid = "";
  if (level.helps.includes("klaviatur")) {
    // Ab zwei markierten Tönen nur der nötige Ausschnitt der zwei Oktaven (fit, mindestens eine Oktave): größere
    // Tasten, lesbar bei 320 px. Mit einem Ton (Bauen, parallele Molltonart) bleiben beide Oktaven: Der gesuchte
    // Ton liegt dann außerhalb der Markierung, und ein Ausschnitt verriete die Richtung bzw. Lage.
    const marks = (q.helpMarks || []).map(midi);
    grid += `<div class="help-keys">${pianoSvg({ from: helpFrom(q), octaves: HELP_OCTAVES, marks, interactive: false, fit: marks.length > 1 ? marks : null })}</div>`;
  }
  // level.helpTable darf wie helpText eine Funktion (ctx) => HTML sein (Welle 12: Merkleiste mit dem gewählten Spruch)
  const table = level.helps.includes("tabelle") ? textOf(level.helpTable, ctx) : "";
  if (table) grid += `<div class="help-table-wrap">${table}</div>`;
  if (grid) out += `<div class="help-grid">${grid}</div>`;
  if (level.demo) out += `<div class="help-demo" hidden></div>`;
  return out;
}

// Tastendruck deuten (Stufen ohne Vorzeichen und Blitz): { letter } für C D E F G A H, sonst null.
// Mit Strg, Alt oder Cmd wird nichts ausgewertet.
export function keyAction(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const k = e.key.toUpperCase();
  if (LETTERS.includes(k)) return { letter: k };
  return null;
}

// Getippter Name (Stufen mit Namensraster): höchstens so viele Zeichen im Puffer
export const NAME_MAX = 4;
// Taste auf den Puffer anwenden. Ergebnis null (Taste nicht verwendet) oder { buf, answer?, invalid? }:
// Buchstaben a–z hängen an (klein, bis NAME_MAX), Backspace löscht das letzte Zeichen, Escape leert,
// Enter bestätigt: gültiger Name → answer { letter, acc } und leerer Puffer, sonst invalid (Puffer bleibt).
// Enter, Backspace und Escape bei leerem Puffer bleiben unbenutzt (z. B. Enter auf einem Knopf).
export function nameKey(buf, e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  buf = buf || "";
  if (e.key === "Enter") {
    if (!buf) return null;
    const answer = parseNoteName(buf);
    return answer ? { buf: "", answer } : { buf, invalid: true };
  }
  if (e.key === "Backspace") return buf ? { buf: buf.slice(0, -1) } : null;
  if (e.key === "Escape") return buf ? { buf: "" } : null;
  if (/^[a-z]$/i.test(e.key)) return { buf: buf.length < NAME_MAX ? buf + e.key.toLowerCase() : buf };
  return null;
}

// Anzeige des getippten Namens unter den Knöpfen; invalid: neutraler Hinweis, zählt nicht als Antwort
export function typedText(buf, invalid = false) {
  if (invalid) return `„${buf}“ ist kein Notenname. Beispiele: fis, es, b`;
  return buf ? `Eingabe: ${buf}` : "";
}

// Blitz: Punkte für eine richtige Antwort bei der Serie nach dem Hochzählen (ab fünf in Folge zwei)
export const blitzPoints = (combo) => (combo >= 5 ? 2 : 1);

// Einträge in q.play: entweder eine Note (wie bisher, nacheinander mit PLAY_GAP) oder ein Wert mit Dauer
// { note, beats } bzw. eine Pause { rest: true, beats }; beats in Schlägen (Viertel = 1, punktierte Viertel 1,5).
const timed = (e) => !!e && typeof e.beats === "number";
const noteOf = (e) => (timed(e) ? (e.rest ? null : e.note || null) : e);

// Töne einer Aufgabe: q.play (nacheinander, ohne Pausen) oder q.note
export const notesToPlay = (q) => (q.play && q.play.length ? q.play.map(noteOf).filter(Boolean) : q.note ? [q.note] : []);
// Abspielplan für das Nacheinander: [{ note, at, dur }] mit at und dur in ms; note ist null bei Pausen,
// dur ist null bei Einträgen ohne Dauer (dann klingt der Ton wie bisher). Einfache Noten rücken um PLAY_GAP
// weiter, Einträge mit beats um beats · BEAT_MS.
export function playSchedule(q) {
  if (!(q.play && q.play.length)) return q.note ? [{ note: q.note, at: 0, dur: null }] : [];
  let at = 0;
  return q.play.map((e) => {
    const dur = timed(e) ? e.beats * BEAT_MS : null;
    const item = { note: noteOf(e), at, dur };
    at += dur === null ? PLAY_GAP : dur;
    return item;
  });
}
// Ende des Rhythmus in ms (Ende des letzten Eintrags mit Dauer), 0 ohne Einträge mit Dauer
export const rhythmEnd = (q) => playSchedule(q).reduce((m, s) => (s.dur === null ? m : Math.max(m, s.at + s.dur)), 0);
// Wartezeit bis zur nächsten Aufgabe nach einer richtigen Antwort (nach „daneben“ wartet die Runde, siehe
// waitsAfter): DELAY_OK; klingt ein Rhythmus (und ist der Ton an), bis er vorbei ist und noch RHYTHM_TAIL dazu
export function answerDelay(q, muted = false) {
  const base = DELAY_OK, end = muted ? 0 : rhythmEnd(q);
  return end ? Math.max(base, end + RHYTHM_TAIL) : base;
}
// Abspielart: "together" (alle Töne gleichzeitig, bei q.playTogether und mehr als einem Ton), sonst "sequence"
export const playMode = (q) => (q.playTogether && notesToPlay(q).length > 1 ? "together" : "sequence");

// SVG nach der Antwort: q.revealSvg, falls vorhanden, sonst q.svg
export const revealedSvg = (q) => q.revealSvg || q.svg;
// Klasse am <svg> nach der Antwort: "ok" bzw. "bad" färbt die ganze Zeile. Mit q.keepRow (optional)
// bleibt die Zeile schwarz (""), weil das Paket selbst nur einzelne Noten färbt (z. B. „Tonleitern“,
// Stufe 3 bis 5: nur die eingesetzte bzw. berichtigte Note grün, mit Namen darunter). Bei einem Teilerfolg
// (part) bleibt die Zeile ebenfalls schwarz: Der Ton stimmt, nicht rot färben.
export const svgResultClass = (q, ok, part = false) => (q.keepRow || part ? "" : ok ? "ok" : "bad");

/* ---------- Ablauf im DOM ---------- */

let run = null; // laufende Runde

// Stufe der aktuellen Aufgabe: in der gemischten Runde die Herkunft der Aufgabe, sonst die Stufe der Runde
const cur = (r) => (r.mixed ? r.items[r.idx].from : r.level);

const all = (root, sel) => (root ? Array.from(root.querySelectorAll(sel)) : []);

function later(r, fn, ms) {
  const id = setTimeout(() => { r.timers.delete(id); fn(); }, ms);
  r.timers.add(id);
  return id;
}

// Töne des Rhythmus aus q.play laufen über Zeitgeber (r.tones, seit Welle 9 „Notenwerte“). Mit „Nächste
// Aufgabe“ kann man vor ihrem Ende weitergehen; dann und beim Öffnen der Vorführung werden die noch nicht
// erklungenen Töne gelöscht, damit sie nicht in die nächste Aufgabe klingen. Ein schon klingender Ton endet
// nach seiner Dauer.
export function silenceTones(r) {
  if (!r || !r.tones) return;
  r.tones.forEach((id) => { clearTimeout(id); if (r.timers) r.timers.delete(id); });
  r.tones.clear();
}

// Laufende Runde abbrechen (z. B. beim Wechsel des Tabs); offene Zeitgeber werden gelöscht
export function stop() {
  if (!run) return;
  run.timers.forEach((id) => clearTimeout(id));
  stopDemos();
  run = null;
}

export const isRunning = () => !!run;

// Getippten Namen anzeigen (nur bei Stufen mit Namensraster)
function showTyped(r, text) {
  if (r.ui.typed) r.ui.typed.textContent = text;
}

// Eingabeart während der Runde wechseln (Buchstaben oder Klaviatur)
export function setInput(pref) {
  if (!run) return;
  const level = cur(run);
  run.input = effectiveInput(level.input, pref, !!level.namesOnly);
  applyInput(run);
}

// Art des Antwortbereichs jetzt: Schritt der Aufgabe (q.steps, stepInput), sonst die Eingabe der Stufe
const kindNow = (r) => stepInput(r.items[r.idx], r.step || 0, cur(r));

function applyInput(r) {
  const { answers, typed, piano } = r.ui;
  const kind = kindNow(r);
  // Klaviatur nur in Noten-Schritten (Welle 12): in einem Auswahl-Schritt einer Stufe mit Buchstaben-Eingabe
  // stehen die Knöpfe da, auch wenn „Klaviatur“ gewählt ist
  const keys = r.input === "keys" && kind !== "choices";
  if (answers) answers.hidden = keys;
  // Getippte Namen gehen auch bei der Klaviatur; die Zeile gibt es nur bei Stufen bzw. Schritten mit Namensraster
  if (typed) typed.hidden = kind !== "names";
  if (piano) piano.hidden = !keys;
}

// Runde starten.
// ui: { staff, feedback, count, dots, answers, typed, piano, helps, helpsTitle, helpsBody, next, origin } (DOM-Elemente; typed zeigt den
// getippten Namen, helps ist der aufklappbare Bereich <details>, helpsTitle (optional) sein <summary>, helpsBody sein Inhalt, next der Knopf
// „Nächste Aufgabe“ unter den Antworten, sichtbar nur, solange eine Stufe mit Hilfen wartet; origin (optional) die Herkunftszeile
// der gemischten Runde, in der normalen Runde verborgen)
// hooks: { state, save, onFinish({ correct, total, stars, gained, avg, results, log }) }
// log (seit Welle 11, für die Fehlermuster): je Aufgabe { id, ok, oks } – Stufe, Ergebnis, Ergebnis je Schritt
export function startRound(level, ui, hooks) {
  stop();
  const r = newRun(ui, hooks, makeRound(level, ROUND_LENGTH, { notes: hooks.state.notes, state: hooks.state }));
  r.level = level;
  begin(r);
}

// Gemischte Runde starten (Welle 11, Schritt 6). spec = { kind: "wiederholen" | "grundlagen", items, plan? }:
// items aus makeMixed (jede Aufgabe mit q.from), plan (optional) die [{ id, n }] dazu, ordnet perLevel.
// Keine Hilfen und kein „Vorführen“; die Eingabe wird je Aufgabe neu aufgebaut. Ende über
// store.recordMixedRound (keine Sterne, kein Eintrag in s.levels); onFinish bekommt
// { kind, correct, total, gained, avg, results, perLevel: [{ id, n, ok }], log }.
export function startMixed(spec, ui, hooks) {
  if (!spec || !MIXED_KINDS.includes(spec.kind)) throw new Error(`Unbekannte Art der Runde: ${spec && spec.kind}`);
  if (!Array.isArray(spec.items) || !spec.items.length || spec.items.some((q) => !q || !q.from)) throw new Error("Gemischte Runde ohne Aufgaben bzw. ohne q.from");
  stop();
  const r = newRun(ui, hooks, spec.items.slice());
  r.mixed = true; r.kind = spec.kind; r.level = null;
  r.order = (spec.plan || []).map((p) => p.id);
  begin(r);
}

function newRun(ui, hooks, items) {
  return {
    ui, hooks, items, idx: 0, correct: 0, results: [], marks: [], times: [], log: [],
    locked: false, buf: "", t0: 0, timers: new Set(), tones: new Set(), input: "letters",
  };
}

// Antwortbereich für eine Stufe aufbauen (Buchstaben, Namensraster, Auswahlknöpfe, Klaviatur) und die
// Eingabeart setzen. Normale Runde: einmal zu Beginn; gemischte Runde: vor jeder Aufgabe, damit von der
// vorigen Aufgabe nichts übrig bleibt (Klassen, Knöpfe, Spalten).
function setupAnswers(r, level) {
  const { ui } = r;
  r.input = effectiveInput(level.input, r.hooks.state.input, !!level.namesOnly);
  // Entscheidung „wartet nach richtig?“ für die Stufe schon jetzt rechnen (Stichprobe, gemerkt), nicht erst nach
  // der ersten Antwort
  if (!hasHelps(level)) okWaits(level);
  if (ui.answers) {
    ui.answers.classList.remove("choices", "short", "names", "cols");
    if (r.mixed && ui.answers.style) ui.answers.style.removeProperty("--cols");
  }
  if (level.input === "choices") {
    if (ui.answers) ui.answers.innerHTML = "";
    r.built = null;
  } else {
    if (ui.answers) ui.answers.innerHTML = usesNames(level) ? namesHtml() : lettersHtml();
    if (ui.answers) ui.answers.classList.toggle("names", usesNames(level));
    if (ui.piano) ui.piano.innerHTML = pianoSvg();
    // was jetzt im Antwortbereich steht (Welle 12: Schritte mit Noteneingabe bauen ihn je Schritt neu)
    r.built = usesNames(level) ? "names" : "letters";
  }
}

function begin(r) {
  const { ui } = r;
  run = r;
  if (r.mixed) {
    // Gemischte Runde: ohne Hilfen (es kommen nur Stufen ohne Hilfen vor), Eingabe je Aufgabe in showQuestion
    if (ui.helps) { ui.helps.hidden = true; ui.helps.open = false; }
    if (ui.helpsBody) ui.helpsBody.innerHTML = "";
  } else {
    const { level } = r;
    // Hilfen: nur bei Stufen mit helps; zu Beginn der Runde zugeklappt, danach bleibt der Bereich, wie du
    // ihn gelassen hast (auf oder zu), der Inhalt wechselt mit jeder Aufgabe
    if (ui.helps) { ui.helps.hidden = !hasHelps(level); ui.helps.open = false; }
    if (ui.helpsTitle && hasHelps(level)) ui.helpsTitle.textContent = helpsTitle(level);
    setupAnswers(r, level);
  }
  if (ui.origin) { ui.origin.hidden = !r.mixed; ui.origin.textContent = ""; }
  // Ereignisse per Delegation; Zuweisung ersetzt die Handler der vorigen Runde
  if (ui.answers) ui.answers.onclick = (e) => {
    const b = e.target.closest(".btn");
    if (!b || run !== r) return;
    if (b.dataset.letter) answer(r, { letter: b.dataset.letter, acc: b.dataset.acc !== undefined ? +b.dataset.acc : 0 }, b);
    else if (b.dataset.choice !== undefined) answer(r, choiceSet(r.items[r.idx], r.step).choices[+b.dataset.choice], b);
  };
  if (ui.piano) ui.piano.onclick = (e) => {
    const k = e.target.closest("rect[data-semi]");
    // in einem Auswahl-Schritt zählt die (verborgene) Klaviatur nicht
    if (k && run === r && kindNow(r) !== "choices") answer(r, +k.dataset.semi, k);
  };
  // Vorführung in den Hilfen: „Vorführen“ (nach der Antwort) hält die Runde an, „Nächste Aufgabe“ geht weiter
  if (ui.helpsBody) ui.helpsBody.onclick = (e) => {
    if (run !== r || r.mixed) return;
    if (e.target.closest("[data-demo-btn]")) openDemo(r);
    else if (e.target.closest("[data-demo-next]")) resume(r);
  };
  // Zuklappen der Hilfen während der Vorführung: weiter zur nächsten Aufgabe
  if (ui.helps) ui.helps.ontoggle = () => { if (run === r && r.waiting && r.demo && !ui.helps.open) resume(r); };
  if (ui.next) { ui.next.hidden = true; ui.next.onclick = () => { if (run === r) resume(r); }; }
  if (!r.mixed) applyInput(r);
  showQuestion(r);
}

function showChoices(r) {
  const { ui } = r, set = choiceSet(r.items[r.idx], r.step);
  if (cur(r).input !== "choices") return showStepAnswers(r);
  if (!ui.answers) return;
  ui.answers.innerHTML = choicesHtml(set.choices);
  const cls = setClass(set);
  ui.answers.classList.add("choices");
  ui.answers.classList.toggle("cols", cls.includes("cols"));
  const short = cls.includes("short");
  ui.answers.classList.toggle("short", short);
  if (set.cols) ui.answers.style.setProperty("--cols", set.cols);
  else if (short) ui.answers.style.setProperty("--cols", choiceCols(set.choices));
  else ui.answers.style.removeProperty("--cols");
}

function showQuestion(r) {
  const q = r.items[r.idx], { ui } = r;
  r.step = 0; r.oks = []; r.answered = false;
  // Gemischte Runde: Eingabe für die Stufe dieser Aufgabe neu aufbauen, Herkunft über der Notenzeile
  if (r.mixed) {
    // Die Knöpfe entstehen neu: Lag der Fokus auf einem Antwortknopf (Tastatur, Bildschirmleser), fiele er auf
    // <body>. Er geht dann auf den Antwortbereich (tabindex="-1"), von dort führt Tab zu den neuen Antworten.
    const had = focusWithin(ui.answers);
    setupAnswers(r, q.from); applyInput(r);
    // #pOrigin ist aria-live="polite" (Entscheidung Schritt 7): Bildschirmleser sagen die Herkunft an, wenn die
    // Stufe wechselt – dann wechselt auch die Eingabeart. Gleicher Text wird nicht neu gesetzt (keine Ansage).
    const o = originText(q.fromPack, q.from);
    if (ui.origin && ui.origin.textContent !== o) ui.origin.textContent = o;
    if (had && ui.answers && !ui.answers.hidden) focusEl(ui.answers, { preventScroll: true });
  }
  ui.staff.innerHTML = q.svg;
  ui.feedback.textContent = q.prompt || ""; ui.feedback.className = "feedback";
  if (ui.count) ui.count.textContent = `${r.idx + 1} / ${r.items.length}`;
  if (ui.dots) ui.dots.innerHTML = dotsHtml(r.marks, r.idx, r.items.length);
  if (!r.mixed && ui.helpsBody && hasHelps(r.level)) ui.helpsBody.innerHTML = helpsHtml(r.level, q, { state: r.hooks.state });
  // Welle 12: Bei Stufen mit Noten-Schritten entstehen die Knöpfe auch zur neuen Aufgabe neu (z. B. Buchstaben →
  // Auswahl). Lag der Fokus im Antwortbereich, bleibt er dort (keepFocus), statt auf <body> zu fallen.
  const had = !r.mixed && (focusWithin(ui.answers) || focusWithin(ui.piano));
  const rebuilt = showChoices(r) === true;
  // Hatte die vorige Aufgabe zuletzt einen anderen Schritt (z. B. Namensraster, jetzt Auswahl), stimmen
  // Knöpfe/Klaviatur und die Zeile #pTyped wieder für Schritt 1 (sonst ändert sich nichts)
  if (!r.mixed) applyInput(r);
  if (rebuilt) keepFocus(r, had);
  all(ui.answers, ".btn").concat(all(ui.piano, "rect")).forEach(clearMark);
  r.buf = ""; showTyped(r, "");
  r.t0 = performance.now();
}

// Stufe mit Buchstaben-Eingabe (Welle 12, Schritt 0): Antwortbereich für den aktuellen Schritt aufbauen, wenn er
// eine andere Art braucht als das, was dasteht (r.built) – Auswahlknöpfe, Buchstaben C … H oder Namensraster.
// Stufen ohne q.steps bauen nie neu (wie bisher: einmal zu Beginn der Runde). true, wenn neu gebaut.
function showStepAnswers(r) {
  const { ui } = r, q = r.items[r.idx], kind = kindNow(r);
  if (!ui.answers || kind === r.built) return false;
  ui.answers.classList.remove("choices", "short", "names", "cols");
  if (ui.answers.style) ui.answers.style.removeProperty("--cols");
  if (kind === "choices") {
    const set = choiceSet(q, r.step);
    ui.answers.innerHTML = choicesHtml(set.choices);
    const cls = setClass(set);
    ui.answers.classList.add("choices");
    ui.answers.classList.toggle("cols", cls.includes("cols"));
    const short = cls.includes("short");
    ui.answers.classList.toggle("short", short);
    if (set.cols) ui.answers.style.setProperty("--cols", set.cols);
    else if (short) ui.answers.style.setProperty("--cols", choiceCols(set.choices));
    // Auswahlknöpfe hängen an der Aufgabe: beim nächsten Mal wieder neu bauen
    r.built = null;
  } else {
    ui.answers.innerHTML = kind === "names" ? namesHtml() : lettersHtml();
    ui.answers.classList.toggle("names", kind === "names");
    r.built = kind;
  }
  return true;
}

// Auswahlknopf zur richtigen Antwort des aktuellen Schritts markieren
function markRight(r, q) {
  const set = choiceSet(q, r.step), a = set.answer;
  const right = a && typeof a === "object" && a.letter
    ? letterButton(r.ui.answers, a)
    : all(r.ui.answers, ".btn[data-choice]").find((b) => set.choices && set.choices[+b.dataset.choice] === a);
  if (right) markAnswer(right, "ok");
  // Eingabe „Klaviatur“: die richtige Taste grün wie der richtige Knopf bei den anderen Eingaben (Korrektur nach
  // der Prüfung Welle 11, J-B4); beim oberen und unteren C beide, denn beide wären richtig gewesen
  if (r.ui.piano && !r.ui.piano.hidden) {
    // Noten-Schritt (Welle 12): die Taste zur Antwort des Schritts, nach Tonklasse (checkStep)
    if (q.steps) all(r.ui.piano, "rect[data-semi]").filter((k) => checkStep(set, +k.dataset.semi)).forEach((k) => markAnswer(k, "ok"));
    else all(r.ui.piano, "rect[data-semi]").filter((k) => cur(r).check(q, +k.dataset.semi)).forEach((k) => markAnswer(k, "ok"));
  }
}

// Zweischrittige Aufgabe: Schritt auswerten; nach dem letzten Schritt wie eine einfache Antwort weiter
function answerStep(r, value, el) {
  const q = r.items[r.idx], { ui } = r, set = q.steps[r.step];
  const ok = checkStep(set, value);
  r.oks.push(ok);
  if (el) markAnswer(el, ok ? "ok" : "bad");
  if (!ok) markRight(r, q);
  if (r.step === q.steps.length - 1) return finishQuestion(r, r.oks.every(Boolean), stepsFeedback(q, r.oks), stepsResult(q, r.oks) === "part");
  r.locked = true;
  ui.feedback.textContent = keepTogether((ok ? set.ok : set.bad) || "");
  ui.feedback.className = "feedback " + (ok ? "ok" : "bad");
  const toNextStep = () => {
    if (run !== r) return;
    r.advance = null; r.waiting = false;
    if (ui.next) ui.next.hidden = true;
    r.locked = false; r.step++;
    if (cur(r).input === "choices") showChoices(r);
    else nextNoteStep(r);
    ui.feedback.textContent = q.steps[r.step].prompt || ""; ui.feedback.className = "feedback";
  };
  // Schritt 1 richtig: kurz weiter. Daneben: kein Zeitgeber, „Weiter zu Schritt 2“ (Knopf, Enter, Leertaste)
  if (ok) { later(r, toNextStep, DELAY_STEP_OK); return; }
  r.advance = toNextStep; r.waiting = true;
  if (ui.next) { ui.next.textContent = NEXT_STEP; ui.next.hidden = false; revealNext(ui.next); }
}

// Stufe mit Buchstaben-Eingabe: Wechsel zum nächsten Schritt (Welle 12, Schritt 0). Antwortbereich je nach Art
// neu, Markierungen und getippter Name des vorigen Schritts weg, Eingabe (Knöpfe/Klaviatur, Zeile #pTyped) neu
// setzen. Lag der Fokus im Antwortbereich oder auf der Klaviatur, bleibt er im sichtbaren Antwortbereich.
function nextNoteStep(r) {
  const { ui } = r;
  const had = focusWithin(ui.answers) || focusWithin(ui.piano);
  showStepAnswers(r);
  all(ui.answers, ".btn").concat(all(ui.piano, "rect")).forEach(clearMark);
  r.buf = ""; showTyped(r, "");
  applyInput(r);
  keepFocus(r, had);
}

// Nach einem Neuaufbau des Antwortbereichs: Lag der Fokus vorher dort (had) und ist er jetzt nicht mehr im
// sichtbaren Antwortbereich (Knopf entfernt, Bereich verborgen), geht er auf diesen Bereich (tabindex="-1") –
// kein Antwortknopf selbst, damit Enter oder Leertaste nicht aus Versehen antworten. Steht er noch auf einem
// Knopf, der geblieben ist, bleibt er dort.
function keepFocus(r, had) {
  const target = [r.ui.answers, r.ui.piano].find((e) => e && !e.hidden);
  if (had && target && !focusWithin(target)) focusEl(target, { preventScroll: true });
}

function answer(r, value, el) {
  if (run !== r || r.locked || r.guarded) return;
  const q = r.items[r.idx];
  if (q.steps) return answerStep(r, value, el);
  const ok = !!cur(r).check(q, value);
  if (el) markAnswer(el, ok ? "ok" : "bad");
  if (!ok) markRight(r, q);
  finishQuestion(r, ok, feedbackText(q, ok));
}

// Ergebnis der Aufgabe zählen (einmal je Aufgabe), Auflösung zeigen, Töne spielen, weiter
// part: Teilerfolg (nur Schritt 1 daneben); zählt als daneben, wird aber nicht rot gezeigt
function finishQuestion(r, ok, text, part = false) {
  const q = r.items[r.idx], { ui, hooks } = r;
  r.locked = true; r.answered = true;
  const sec = (performance.now() - r.t0) / 1000;
  r.results.push(ok); r.marks.push(part ? "part" : ok); r.times.push(sec);
  r.log.push({ id: cur(r).id, ok, oks: q.steps ? r.oks.slice() : [ok] });
  if (ok) r.correct++;
  // Aufgaben mit Schritten (q.steps) tragen keine Zeit ein (Korrektur nach der Prüfung Welle 12, W-B2): Gemessen würde
  // vom Erscheinen bis zur letzten Antwort, mit zwei Antworten, neuem Fragetext und der Pause DELAY_STEP_OK – an der
  // Grenze für eine Antwort (adapt.LANGSAM_SEK) hieße das oft „langsam“. Richtig/daneben zählt weiter; „langsam“
  // entsteht nur aus einschrittigen Antworten (wie im Blitz, der gar keine Zeit einträgt).
  countAnswer(hooks.state, q, ok, q.steps ? undefined : sec);
  hooks.save();
  // q.revealSvg (optional): SVG, das nach der Antwort statt q.svg erscheint, bei richtiger und falscher
  // Antwort, z. B. der vollständige Takt mit dem fehlenden Wert in der Lücke. Ohne revealSvg bleibt q.svg
  // stehen. Die Färbung (Klasse ok/bad am <svg>) gilt in beiden Fällen für das angezeigte SVG,
  // außer bei q.keepRow (svgResultClass): dann bleibt die Zeile schwarz.
  const shown = revealedSvg(q);
  if (shown !== q.svg) ui.staff.innerHTML = shown;
  const svg = ui.staff.querySelector("svg"), rc = svgResultClass(q, ok, part);
  if (svg && rc) svg.classList.add(rc);
  setFeedback(ui.feedback, text, ok ? null : feedbackParts(q, text));
  ui.feedback.className = "feedback " + (part ? "part" : ok ? "ok" : "bad");
  if (playMode(q) === "together") playChord(notesToPlay(q));
  else playSchedule(q).forEach(({ note, at, dur }) => {
    if (!note) return; // Pause
    const go = () => (dur === null ? play(note) : play(note, undefined, dur / 1000));
    if (at === 0) { go(); return; }
    const id = later(r, () => { r.tones.delete(id); go(); }, at);
    r.tones.add(id);
  });
  demoReady(r);
  r.advance = () => {
    if (run !== r) return;
    r.advance = null; r.waiting = false; r.demo = null;
    silenceTones(r);
    if (ui.next) ui.next.hidden = true;
    r.locked = false; r.idx++;
    if (r.idx >= r.items.length) finish(r); else showQuestion(r);
  };
  // Stufen mit Hilfen, jede Antwort daneben und richtige Antworten mit langem Text: kein Zeitgeber, die Runde
  // wartet auf „Nächste Aufgabe“ (auch nach der letzten Aufgabe)
  if (waitsAfter(cur(r), ok, text)) {
    r.waiting = true;
    if (ui.next) { ui.next.textContent = DEMO_NEXT; ui.next.hidden = false; revealNext(ui.next); }
    return;
  }
  r.advanceId = later(r, () => r.advance && r.advance(), answerDelay(q, isMuted()));
}

// „Vorführen“ freigeben (nach der Antwort, nur bei Stufen mit level.demo). Außerdem: Teile der Hilfen mit
// data-after-answer (z. B. die Zeichen-Spalte der Pausen-Tabelle) erscheinen erst jetzt.
function demoReady(r) {
  const body = r.ui.helpsBody;
  if (r.mixed) return;
  if (body) body.querySelectorAll("[data-after-answer]").forEach((e) => { e.hidden = false; });
  if (!body || !r.level.demo) return;
  const b = body.querySelector("[data-demo-btn]");
  if (b) { b.disabled = false; b.title = DEMO_READY; }
  const w = body.querySelector("[data-demo-wait]");
  if (w) w.hidden = true;
}

// Vorführung der aktuellen Aufgabe: die Runde wartet (ein Zeitgeber zur nächsten Aufgabe wird gelöscht),
// Klaviatur und Tabelle weichen der Vorführung
function openDemo(r) {
  const body = r.ui.helpsBody;
  if (r.mixed || !r.answered || !r.advance || r.demo || !r.level.demo || !body) return;
  if (r.advanceId) { clearTimeout(r.advanceId); r.timers.delete(r.advanceId); }
  silenceTones(r);
  r.waiting = true;
  const had = focusWithin(body);
  const box = body.querySelector(".help-demo");
  body.querySelectorAll(".help-grid, .help-head").forEach((el) => { el.hidden = true; });
  box.hidden = false;
  box.innerHTML = `<div data-demo-root></div><button class="btn primary wide" data-demo-next>${DEMO_NEXT}</button>`;
  r.demo = mountDemo(box.querySelector("[data-demo-root]"), r.level.demo(r.items[r.idx]));
  // „Nächste Aufgabe“ nur einmal: Bei offener Vorführung gilt der Knopf am Ende der Vorführung (auf Handys
  // stehen die Hilfen unter den Antworten; wer die Vorführung gesehen hat, ist dort). ui.next kommt erst mit
  // der nächsten Antwort wieder.
  if (r.ui.next) r.ui.next.hidden = true;
  // Der Knopf „Vorführen“ ist jetzt verborgen: Hatte er den Fokus (Tastatur), geht er auf „Abspielen“
  if (had) focusEl(box.querySelector('[data-act="play"]'));
}

// Fokus-Hilfen (ohne DOM, etwa in den Tests, bewirken sie nichts)
function focusWithin(el) {
  const a = el && el.ownerDocument && el.ownerDocument.activeElement;
  return !!(a && a !== el.ownerDocument.body && (a === el || (el.contains && el.contains(a))));
}
function focusEl(el, opts) { if (el && typeof el.focus === "function") el.focus(opts); }

// Weiter („Nächste Aufgabe“, „Weiter zu Schritt 2“, Enter, Leertaste, Zuklappen der Hilfen während der Vorführung)
function resume(r) {
  if (!r.waiting || !r.advance) return;
  // Der gedrückte Knopf verschwindet gleich (ui.next wird verborgen, die Hilfen werden neu aufgebaut)
  const lost = focusWithin(r.ui.next) || focusWithin(r.ui.helpsBody);
  if (r.demo) r.demo.stop();
  r.advance();
  if (run !== r) return; // Runde zu Ende: die Ergebniskarte übernimmt
  guardSwitch(r);
  // Auf Handys stehen die Hilfen unter den Antworten: Wer am Ende der Vorführung weitergeht, sieht sonst die
  // neue Notenzeile nicht. Sie rückt wieder ins Bild (Abstand zur Kopfleiste: scroll-margin-top in style.css).
  showStaff(r.ui.staff);
  // Fokus nicht auf <body> fallen lassen: auf den Antwortbereich (tabindex="-1"), von dort führt Tab zu den
  // Antworten. Kein Antwortknopf selbst, damit Enter oder Leertaste nicht aus Versehen antworten.
  if (lost) focusEl([r.ui.answers, r.ui.piano].find((e) => e && !e.hidden), { preventScroll: true });
}

// Nach dem Weitergehen kurz keine Antwort annehmen (SWITCH_GUARD); ein neuer Wechsel beginnt die Sperre neu
function guardSwitch(r) {
  if (r.guardId) { clearTimeout(r.guardId); r.timers.delete(r.guardId); }
  r.guarded = true;
  r.guardId = later(r, () => { r.guarded = false; r.guardId = null; }, SWITCH_GUARD);
}

// „Nächste Aufgabe“ bzw. „Weiter zu Schritt 2“ ins Bild holen, wenn der Knopf nicht ganz zu sehen ist (Korrektur
// nach der Prüfung Welle 12, J-B1: bei 320 × 640 lag er in den Stufen mit Namensraster unter dem unteren Menü).
// Abstand zum Menü: scroll-margin-bottom von #pNext in style.css. Steht der Knopf schon ganz im Bild (breite und hohe
// Fenster), rollt nichts. Ohne Bewegung bei „Bewegung reduzieren“. Der Fokus bleibt, wo er ist (nur Rollen).
export function revealNext(el) {
  if (!el || typeof el.getBoundingClientRect !== "function" || typeof el.scrollIntoView !== "function") return false;
  const view = el.ownerDocument && el.ownerDocument.defaultView;
  if (!view) return false;
  // ganz zu sehen: im Fenster und oben wie unten nicht vom Menü verdeckt (elementFromPoint, 2 px innen: Bruchteile
  // eines Pixels Überlappung mit der Oberkante des Menüs zählen nicht)
  const box = el.getBoundingClientRect(), doc = el.ownerDocument;
  const free = (y) => { const e = typeof doc.elementFromPoint === "function" ? doc.elementFromPoint(box.left + box.width / 2, y) : el; return !!e && (e === el || (typeof el.contains === "function" && el.contains(e))); };
  if (box.top >= 0 && box.bottom <= view.innerHeight && free(box.top + 2) && free(box.bottom - 2)) return false;
  const still = typeof view.matchMedia === "function" && view.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  return true;
}

function showStaff(el) {
  if (!el || typeof el.getBoundingClientRect !== "function" || typeof el.scrollIntoView !== "function") return;
  const view = el.ownerDocument && el.ownerDocument.defaultView;
  const margin = view ? parseFloat(view.getComputedStyle(el).scrollMarginTop) || 0 : 0;
  if (el.getBoundingClientRect().top < margin) el.scrollIntoView({ block: "start" });
}

// Für Tests und die Browserprüfung: wartet die Runde gerade auf „Nächste Aufgabe“?
export const isWaiting = () => !!(run && run.waiting);
// Für die Browserprüfung (docs/screens/spiel.mjs): läuft gerade die Sperre nach dem Weitergehen (SWITCH_GUARD)?
export const isGuarded = () => !!(run && run.guarded);
// Für Tests und die Browserprüfung: die aktuelle Aufgabe (oder null)
export const currentQuestion = () => (run ? run.items[run.idx] || null : null);

function finish(r) {
  const { hooks } = r;
  const avg = r.times.reduce((a, b) => a + b, 0) / r.times.length;
  const log = r.log.map((e) => ({ ...e, oks: e.oks.slice() }));
  let result;
  if (r.mixed) {
    // Keine Sterne, keine beste Runde, keine Freischaltung; Erfahrungspunkte und Tagesserie wie vereinbart
    const { gained } = recordMixedRound(hooks.state, r.kind, r.correct, r.items.length);
    result = { kind: r.kind, correct: r.correct, total: r.items.length, gained, avg, results: r.results.slice(), perLevel: perLevelOf(log, r.order), log };
  } else {
    const { stars, gained } = recordRound(hooks.state, r.level.id, r.correct);
    result = { correct: r.correct, total: r.items.length, stars, gained, avg, results: r.results.slice(), log };
  }
  hooks.save();
  stop();
  if (hooks.onFinish) hooks.onFinish(result);
}

// Knopf zu einer Antwort { letter, acc }: im Namensraster Buchstabe und Vorzeichen, sonst nur der Buchstabe
function letterButton(root, a) {
  if (!root) return null;
  return root.querySelector(`.btn[data-letter="${a.letter}"][data-acc="${a.acc || 0}"]`)
    || root.querySelector(`.btn[data-letter="${a.letter}"]:not([data-acc])`);
}

// Tastatur: true, wenn die Taste verwendet wurde (unabhängig von der Eingabeart, nicht bei Auswahlknöpfen).
// Ohne Vorzeichen antwortet ein Buchstabe sofort. Mit Namensraster wird der Name getippt (fis, es, b)
// und mit Enter bestätigt; ein ungültiger Name zeigt einen Hinweis und zählt nicht.
export function handleKey(e) {
  if (!run) return false;
  const r = run;
  // Wartet die Runde auf „Nächste Aufgabe“: Enter oder Leertaste gehen weiter (ein fokussierter Knopf der
  // Vorführung bleibt bei seiner eigenen Taste)
  if (r.waiting) {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "Enter" && e.key !== " ")) return false;
    const t = e.target;
    if (t && t.closest && t.closest("[data-act], [data-demo-btn], summary")) return false;
    e.preventDefault();
    resume(r);
    return true;
  }
  if (run.locked || run.guarded) return false;
  const kind = kindNow(r);
  if (kind === "choices") {
    // Ziffern bei Knopfsätzen mit digits (Prime … Oktave); in einem Auswahl-Schritt zählt kein Buchstabe
    const set = choiceSet(r.items[r.idx], r.step), i = digitAction(e, set);
    if (i === null) return false;
    e.preventDefault();
    answer(r, set.choices[i], all(r.ui.answers, ".btn[data-choice]")[i]);
    return true;
  }
  if (kind === "names") {
    const k = nameKey(r.buf, e);
    if (!k) return false;
    e.preventDefault();
    r.buf = k.buf;
    if (k.answer) {
      showTyped(r, typedText(gName(N(k.answer.letter, 4, k.answer.acc)).toLowerCase()));
      answer(r, k.answer, letterButton(r.ui.answers, k.answer));
    } else showTyped(r, typedText(k.buf, !!k.invalid));
    return true;
  }
  const a = keyAction(e);
  if (!a) return false;
  answer(r, { letter: a.letter, acc: 0 }, letterButton(r.ui.answers, a));
  e.preventDefault();
  return true;
}
