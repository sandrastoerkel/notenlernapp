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
// Oben stehen reine Hilfsfunktionen (getestet in test/engine.test.js), unten der DOM-Teil.
import { LETTERS, NAME_ACCS, N, gName, parseNoteName, midi } from "./music.js";
import { pianoSvg } from "./staff.js";
import { recordRound, recordAnswer } from "./store.js";
import { play, playChord, isMuted } from "./audio.js";
import { mountDemo, stopDemos } from "./demo.js";

export const ROUND_LENGTH = 10;
// Pause nach einer richtigen Antwort, bevor die nächste Aufgabe von selbst erscheint (nur Stufen ohne Hilfen
// und kurze Rückmeldung, siehe waitsAfter). Nach „daneben“ gibt es keinen Zeitgeber mehr (Welle 10).
export const DELAY_OK = 800;
// Pause zwischen erstem und zweitem Schritt (q.steps), nur wenn Schritt 1 richtig war; daneben wartet die
// Runde auf „Weiter zu Schritt 2“
export const DELAY_STEP_OK = 700;
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

export const starsHtml = (k) => `<span class="stars">${"★".repeat(k)}<span class="off">${"★".repeat(3 - k)}</span></span>`;

// Eingabeart: die Wahl „Klaviatur“ (state.input === "keys") ersetzt "letters"; andere Arten bleiben.
// namesOnly (optional, level.namesOnly, seit Paket „Intervalle 7–12“): die Schreibweise zählt
// (gis ist nicht as), deshalb bleibt es beim Namensraster, auch wenn „Klaviatur“ gewählt ist
export const effectiveInput = (levelInput, pref, namesOnly = false) => ((levelInput || "letters") === "letters" && pref === "keys" && !namesOnly ? "keys" : levelInput || "letters");

// Zehn Aufgaben nacheinander erzeugen, jede verschieden von der vorherigen.
// ctx (optional, z. B. { notes: state.notes }) geht als zweiter Parameter an question;
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

export function resultMessage(stars) {
  if (stars === 3) return "Stark, fast alles richtig.";
  if (stars === 2) return "Gut. Noch eine Runde und der dritte Stern ist drin.";
  if (stars === 1) return "Solide Basis. Was noch unsicher ist, kannst du in „Lernen“ nachschauen.";
  return "Noch wackelig. Übe zuerst in „Lernen“ mit den Lerntafeln.";
}

// Fortschrittspunkte: results[i] ist true (richtig), false (daneben) oder "part" (Teilerfolg, zählt als daneben)
const dotClass = (v) => (v === "part" ? "part" : v ? "ok" : "bad");
export const dotsHtml = (results, idx, total) => Array.from({ length: total }, (_, i) =>
  `<span class="dot ${i < idx ? dotClass(results[i]) : i === idx ? "cur" : ""}"></span>`).join("");

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
// Überschrift des Bereichs (ui.helpsTitle, das <summary>): nennt nur, was die Stufe wirklich zeigt. Mit Klaviatur
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
// Hilfen → nur bei einem Rückmeldetext länger als AUTO_OK_MAX, sonst nach answerDelay von selbst weiter.
export const waitsAfter = (level, ok, text) => waitsForNext(level) || !ok || String(text || "").length > AUTO_OK_MAX;
export function helpsHtml(level, q) {
  if (!hasHelps(level)) return "";
  const text = level.helpText ? `<p class="small help-text">${level.helpText}</p>` : "";
  let out = level.demo
    ? `<div class="help-head">${text}<span class="demo-go"><button class="btn" data-demo-btn disabled title="${DEMO_WAIT}">${DEMO_LABEL}</button><span class="small muted demo-wait" data-demo-wait>${DEMO_WAIT_SHORT}</span></span></div>`
    : text;
  let grid = "";
  if (level.helps.includes("klaviatur")) {
    const marks = (q.helpMarks || []).map(midi);
    grid += `<div class="help-keys">${pianoSvg({ from: helpFrom(q), octaves: HELP_OCTAVES, marks, interactive: false })}</div>`;
  }
  if (level.helps.includes("tabelle") && level.helpTable) grid += `<div class="help-table-wrap">${level.helpTable}</div>`;
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
  run.input = effectiveInput(run.level.input, pref, !!run.level.namesOnly);
  applyInput(run);
}

function applyInput(r) {
  const { answers, typed, piano } = r.ui;
  const keys = r.input === "keys";
  if (answers) answers.hidden = keys;
  // Getippte Namen gehen auch bei der Klaviatur; die Zeile gibt es nur bei Stufen mit Namensraster
  if (typed) typed.hidden = !usesNames(r.level);
  if (piano) piano.hidden = !keys;
}

// Runde starten.
// ui: { staff, feedback, count, dots, answers, typed, piano, helps, helpsTitle, helpsBody, next } (DOM-Elemente; typed zeigt den
// getippten Namen, helps ist der aufklappbare Bereich <details>, helpsTitle (optional) sein <summary>, helpsBody sein Inhalt, next der Knopf
// „Nächste Aufgabe“ unter den Antworten, sichtbar nur, solange eine Stufe mit Hilfen wartet)
// hooks: { state, save, onFinish({ correct, total, stars, gained, avg, results }) }
export function startRound(level, ui, hooks) {
  stop();
  const r = {
    level, ui, hooks, items: makeRound(level, ROUND_LENGTH, { notes: hooks.state.notes }), idx: 0, correct: 0, results: [], marks: [], times: [],
    locked: false, buf: "", t0: 0, timers: new Set(), tones: new Set(),
    input: effectiveInput(level.input, hooks.state.input, !!level.namesOnly),
  };
  run = r;
  if (ui.answers) ui.answers.classList.remove("choices", "short", "names", "cols");
  // Hilfen: nur bei Stufen mit helps; zu Beginn der Runde zugeklappt, danach bleibt der Bereich, wie du
  // ihn gelassen hast (auf oder zu), der Inhalt wechselt mit jeder Aufgabe
  if (ui.helps) { ui.helps.hidden = !hasHelps(level); ui.helps.open = false; }
  if (ui.helpsTitle && hasHelps(level)) ui.helpsTitle.textContent = helpsTitle(level);
  if (r.level.input === "choices") {
    if (ui.answers) ui.answers.innerHTML = "";
  } else {
    if (ui.answers) ui.answers.innerHTML = usesNames(level) ? namesHtml() : lettersHtml();
    if (ui.answers) ui.answers.classList.toggle("names", usesNames(level));
    if (ui.piano) ui.piano.innerHTML = pianoSvg();
  }
  // Ereignisse per Delegation; Zuweisung ersetzt die Handler der vorigen Runde
  if (ui.answers) ui.answers.onclick = (e) => {
    const b = e.target.closest(".btn");
    if (!b || run !== r) return;
    if (b.dataset.letter) answer(r, { letter: b.dataset.letter, acc: b.dataset.acc !== undefined ? +b.dataset.acc : 0 }, b);
    else if (b.dataset.choice !== undefined) answer(r, choiceSet(r.items[r.idx], r.step).choices[+b.dataset.choice], b);
  };
  if (ui.piano) ui.piano.onclick = (e) => {
    const k = e.target.closest("rect[data-semi]");
    if (k && run === r) answer(r, +k.dataset.semi, k);
  };
  // Vorführung in den Hilfen: „Vorführen“ (nach der Antwort) hält die Runde an, „Nächste Aufgabe“ geht weiter
  if (ui.helpsBody) ui.helpsBody.onclick = (e) => {
    if (run !== r) return;
    if (e.target.closest("[data-demo-btn]")) openDemo(r);
    else if (e.target.closest("[data-demo-next]")) resume(r);
  };
  // Zuklappen der Hilfen während der Vorführung: weiter zur nächsten Aufgabe
  if (ui.helps) ui.helps.ontoggle = () => { if (run === r && r.waiting && r.demo && !ui.helps.open) resume(r); };
  if (ui.next) { ui.next.hidden = true; ui.next.onclick = () => { if (run === r) resume(r); }; }
  applyInput(r); showQuestion(r);
}

function showChoices(r) {
  const { ui } = r, set = choiceSet(r.items[r.idx], r.step);
  if (r.level.input !== "choices" || !ui.answers) return;
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
  ui.staff.innerHTML = q.svg;
  ui.feedback.textContent = q.prompt || ""; ui.feedback.className = "feedback";
  if (ui.count) ui.count.textContent = `${r.idx + 1} / ${r.items.length}`;
  if (ui.dots) ui.dots.innerHTML = dotsHtml(r.marks, r.idx, r.items.length);
  if (ui.helpsBody && hasHelps(r.level)) ui.helpsBody.innerHTML = helpsHtml(r.level, q);
  showChoices(r);
  all(ui.answers, ".btn").concat(all(ui.piano, "rect")).forEach((b) => b.classList.remove("ok", "bad"));
  r.buf = ""; showTyped(r, "");
  r.t0 = performance.now();
}

// Auswahlknopf zur richtigen Antwort des aktuellen Schritts markieren
function markRight(r, q) {
  const set = choiceSet(q, r.step), a = set.answer;
  const right = a && typeof a === "object" && a.letter
    ? letterButton(r.ui.answers, a)
    : all(r.ui.answers, ".btn[data-choice]").find((b) => set.choices && set.choices[+b.dataset.choice] === a);
  if (right) right.classList.add("ok");
}

// Zweischrittige Aufgabe: Schritt auswerten; nach dem letzten Schritt wie eine einfache Antwort weiter
function answerStep(r, value, el) {
  const q = r.items[r.idx], { ui } = r, set = q.steps[r.step];
  const ok = value === set.answer;
  r.oks.push(ok);
  if (el) el.classList.add(ok ? "ok" : "bad");
  if (!ok) markRight(r, q);
  if (r.step === q.steps.length - 1) return finishQuestion(r, r.oks.every(Boolean), stepsFeedback(q, r.oks), stepsResult(q, r.oks) === "part");
  r.locked = true;
  ui.feedback.textContent = (ok ? set.ok : set.bad) || "";
  ui.feedback.className = "feedback " + (ok ? "ok" : "bad");
  const toNextStep = () => {
    if (run !== r) return;
    r.advance = null; r.waiting = false;
    if (ui.next) ui.next.hidden = true;
    r.locked = false; r.step++;
    showChoices(r);
    ui.feedback.textContent = q.steps[r.step].prompt || ""; ui.feedback.className = "feedback";
  };
  // Schritt 1 richtig: kurz weiter. Daneben: kein Zeitgeber, „Weiter zu Schritt 2“ (Knopf, Enter, Leertaste)
  if (ok) { later(r, toNextStep, DELAY_STEP_OK); return; }
  r.advance = toNextStep; r.waiting = true;
  if (ui.next) { ui.next.textContent = NEXT_STEP; ui.next.hidden = false; }
}

function answer(r, value, el) {
  if (run !== r || r.locked) return;
  const q = r.items[r.idx];
  if (q.steps) return answerStep(r, value, el);
  const ok = !!r.level.check(q, value);
  if (el) el.classList.add(ok ? "ok" : "bad");
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
  if (ok) r.correct++;
  countAnswer(hooks.state, q, ok, sec);
  hooks.save();
  // q.revealSvg (optional): SVG, das nach der Antwort statt q.svg erscheint, bei richtiger und falscher
  // Antwort, z. B. der vollständige Takt mit dem fehlenden Wert in der Lücke. Ohne revealSvg bleibt q.svg
  // stehen. Die Färbung (Klasse ok/bad am <svg>) gilt in beiden Fällen für das angezeigte SVG,
  // außer bei q.keepRow (svgResultClass): dann bleibt die Zeile schwarz.
  const shown = revealedSvg(q);
  if (shown !== q.svg) ui.staff.innerHTML = shown;
  const svg = ui.staff.querySelector("svg"), rc = svgResultClass(q, ok, part);
  if (svg && rc) svg.classList.add(rc);
  ui.feedback.textContent = text;
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
  if (waitsAfter(r.level, ok, text)) {
    r.waiting = true;
    if (ui.next) { ui.next.textContent = DEMO_NEXT; ui.next.hidden = false; }
    return;
  }
  r.advanceId = later(r, () => r.advance && r.advance(), answerDelay(q, isMuted()));
}

// „Vorführen“ freigeben (nach der Antwort, nur bei Stufen mit level.demo)
function demoReady(r) {
  const body = r.ui.helpsBody;
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
  if (!r.answered || !r.advance || r.demo || !r.level.demo || !body) return;
  if (r.advanceId) { clearTimeout(r.advanceId); r.timers.delete(r.advanceId); }
  silenceTones(r);
  r.waiting = true;
  const box = body.querySelector(".help-demo");
  body.querySelectorAll(".help-grid, .help-head").forEach((el) => { el.hidden = true; });
  box.hidden = false;
  box.innerHTML = `<div data-demo-root></div><button class="btn primary wide" data-demo-next>${DEMO_NEXT}</button>`;
  r.demo = mountDemo(box.querySelector("[data-demo-root]"), r.level.demo(r.items[r.idx]));
}

function resume(r) {
  if (!r.waiting || !r.advance) return;
  if (r.demo) r.demo.stop();
  r.advance();
}

// Für Tests und die Browserprüfung: wartet die Runde gerade auf „Nächste Aufgabe“?
export const isWaiting = () => !!(run && run.waiting);

function finish(r) {
  const { hooks } = r;
  const { stars, gained } = recordRound(hooks.state, r.level.id, r.correct);
  hooks.save();
  const avg = r.times.reduce((a, b) => a + b, 0) / r.times.length;
  const result = { correct: r.correct, total: r.items.length, stars, gained, avg, results: r.results.slice() };
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
  if (run.locked) return false;
  if (r.level.input === "choices") {
    // Ziffern bei Knopfsätzen mit digits (Prime … Oktave)
    const set = choiceSet(r.items[r.idx], r.step), i = digitAction(e, set);
    if (i === null) return false;
    e.preventDefault();
    answer(r, set.choices[i], all(r.ui.answers, ".btn[data-choice]")[i]);
    return true;
  }
  if (usesNames(r.level)) {
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
