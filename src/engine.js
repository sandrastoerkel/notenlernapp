// Generischer Rundenablauf: zehn Aufgaben, Feedback, Sterne und XP.
// Die Engine kennt kein Paket im Detail: sie ruft level.question(prev) und level.check(q, value),
// zeigt q.svg (nach der Antwort q.revealSvg, falls gesetzt) und baut die Antwort-Elemente nach der Eingabeart.
// Oben stehen reine Hilfsfunktionen (getestet in test/engine.test.js), unten der DOM-Teil.
import { LETTERS } from "./music.js";
import { pianoSvg } from "./staff.js";
import { recordRound, recordAnswer } from "./store.js";
import { play, playChord } from "./audio.js";

export const ROUND_LENGTH = 10;
export const DELAY_OK = 800, DELAY_BAD = 1600;
// Abstand zwischen mehreren Tönen aus q.play
export const PLAY_GAP = 500;

/* ---------- Reine Hilfsfunktionen ---------- */

export const starsHtml = (k) => `<span class="stars">${"★".repeat(k)}<span class="off">${"★".repeat(3 - k)}</span></span>`;

// Eingabeart: die Wahl „Klaviatur“ (state.input === "keys") ersetzt "letters"; andere Arten bleiben
export const effectiveInput = (levelInput, pref) => ((levelInput || "letters") === "letters" && pref === "keys" ? "keys" : levelInput || "letters");

// Zehn Aufgaben nacheinander erzeugen, jede verschieden von der vorherigen
export function makeRound(level, count = ROUND_LENGTH) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(level.question(i ? out[i - 1] : null));
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

// Antwort zählen; mit q.statKey auch in der Liste der schwachen Noten
export function countAnswer(s, q, ok) {
  if (q.statKey) return recordAnswer(s, q.statKey, ok);
  s.answered++; if (ok) s.correct++;
  return s;
}

// Feedback nach der Antwort. q.reveal (optional) ist ein ganzer Satz für eine falsche Antwort, z. B.
// „Richtig wäre: A-Dur.“, weil „Das war ein …“ nicht zu jedem Begriff passt; ohne reveal wie bisher.
export const feedbackText = (q, ok) => (ok ? `Richtig! ${q.display}` : q.reveal || `Das war ein ${q.display}.`);

export function resultMessage(stars) {
  if (stars === 3) return "Stark, fast fehlerfrei.";
  if (stars === 2) return "Gut. Noch eine Runde und der dritte Stern ist drin.";
  if (stars === 1) return "Solide Basis. Schau dir die Fehler in „Lernen“ an.";
  return "Noch wackelig. Übe zuerst in „Lernen“ mit den Merksprüchen.";
}

export const dotsHtml = (results, idx, total) => Array.from({ length: total }, (_, i) =>
  `<span class="dot ${i < idx ? (results[i] ? "ok" : "bad") : i === idx ? "cur" : ""}"></span>`).join("");

export const lettersHtml = () => LETTERS.map((l) => `<button class="btn" data-letter="${l}">${l}</button>`).join("");

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const choicesHtml = (choices) => (choices || []).map((c, i) => `<button class="btn" data-choice="${i}">${esc(c)}</button>`).join("");
// Raster für Auswahlknöpfe: Begriffe zweispaltig ("choices"); sind alle Texte kurz (höchstens 4 Zeichen,
// z. B. „½“, „VII“, „3 ♭“), passen mehrere in eine Reihe ("choices short"). Buchstaben behalten 7 Spalten.
export const CHOICE_SHORT = 4;
export const choicesClass = (choices) => ((choices || []).length && choices.every((c) => String(c).length <= CHOICE_SHORT) ? "choices short" : "choices");
// Spalten für kurze Texte: alle in einer Reihe, ab sieben Knöpfen zwei Reihen (I–VII: 4 + 3)
export const choiceCols = (choices) => { const n = (choices || []).length; return n <= 6 ? n : Math.ceil(n / 2); };

// Tastendruck deuten: { letter } für C D E F G A H, { acc } für + # (♯), - b (♭), 0 (♮), sonst null.
// Mit Strg, Alt oder Cmd wird nichts ausgewertet.
export function keyAction(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const k = e.key.toUpperCase();
  if (LETTERS.includes(k)) return { letter: k };
  if (e.key === "+" || e.key === "#") return { acc: 1 };
  if (e.key === "-" || e.key === "b") return { acc: -1 };
  if (e.key === "0") return { acc: 0 };
  return null;
}

// Blitz: Punkte für eine richtige Antwort bei der Serie nach dem Hochzählen (ab fünf in Folge zwei)
export const blitzPoints = (combo) => (combo >= 5 ? 2 : 1);

// Töne einer Aufgabe: q.play (nacheinander) oder q.note
export const notesToPlay = (q) => (q.play && q.play.length ? q.play : q.note ? [q.note] : []);
// Abspielart: "together" (alle Töne gleichzeitig, bei q.playTogether und mehr als einem Ton), sonst "sequence"
export const playMode = (q) => (q.playTogether && notesToPlay(q).length > 1 ? "together" : "sequence");

// SVG nach der Antwort: q.revealSvg, falls vorhanden, sonst q.svg
export const revealedSvg = (q) => q.revealSvg || q.svg;

/* ---------- Ablauf im DOM ---------- */

let run = null; // laufende Runde

const all = (root, sel) => (root ? Array.from(root.querySelectorAll(sel)) : []);

function later(r, fn, ms) {
  const id = setTimeout(() => { r.timers.delete(id); fn(); }, ms);
  r.timers.add(id);
}

// Laufende Runde abbrechen (z. B. beim Wechsel des Tabs); offene Zeitgeber werden gelöscht
export function stop() {
  if (!run) return;
  run.timers.forEach((id) => clearTimeout(id));
  run = null;
}

export const isRunning = () => !!run;

// Vorzeichen-Auswahl (♭ ♮ ♯) setzen
export function setMod(a) {
  if (!run) return;
  run.modAcc = a;
  all(run.ui.mods, ".btn").forEach((b) => b.classList.toggle("on", +b.dataset.acc === a));
}

// Eingabeart während der Runde wechseln (Buchstaben oder Klaviatur)
export function setInput(pref) {
  if (!run) return;
  run.input = effectiveInput(run.level.input, pref);
  applyInput(run);
}

function applyInput(r) {
  const { answers, mods, piano } = r.ui;
  const keys = r.input === "keys";
  if (answers) answers.hidden = keys;
  if (mods) mods.hidden = r.input !== "letters" || !r.level.acc;
  if (piano) piano.hidden = !keys;
}

// Runde starten.
// ui: { staff, feedback, count, dots, answers, mods, piano } (DOM-Elemente)
// hooks: { state, save, onFinish({ correct, total, stars, gained, avg, results }) }
export function startRound(level, ui, hooks) {
  stop();
  const r = {
    level, ui, hooks, items: makeRound(level), idx: 0, correct: 0, results: [], times: [],
    locked: false, modAcc: 0, t0: 0, timers: new Set(),
    input: effectiveInput(level.input, hooks.state.input),
  };
  run = r;
  if (ui.answers) ui.answers.classList.remove("choices", "short");
  if (r.level.input === "choices") {
    if (ui.answers) ui.answers.innerHTML = "";
  } else {
    if (ui.answers) ui.answers.innerHTML = lettersHtml();
    if (ui.piano) ui.piano.innerHTML = pianoSvg();
  }
  // Ereignisse per Delegation; Zuweisung ersetzt die Handler der vorigen Runde
  if (ui.answers) ui.answers.onclick = (e) => {
    const b = e.target.closest(".btn");
    if (!b || run !== r) return;
    if (b.dataset.letter) answer(r, { letter: b.dataset.letter, acc: r.modAcc }, b);
    else if (b.dataset.choice !== undefined) answer(r, r.items[r.idx].choices[+b.dataset.choice], b);
  };
  if (ui.piano) ui.piano.onclick = (e) => {
    const k = e.target.closest("rect[data-semi]");
    if (k && run === r) answer(r, +k.dataset.semi, k);
  };
  if (ui.mods) ui.mods.onclick = (e) => {
    const b = e.target.closest(".btn[data-acc]");
    if (b && run === r) setMod(+b.dataset.acc);
  };
  setMod(0); applyInput(r); showQuestion(r);
}

function showQuestion(r) {
  const q = r.items[r.idx], { ui } = r;
  ui.staff.innerHTML = q.svg;
  ui.feedback.textContent = q.prompt || ""; ui.feedback.className = "feedback";
  if (ui.count) ui.count.textContent = `${r.idx + 1} / ${r.items.length}`;
  if (ui.dots) ui.dots.innerHTML = dotsHtml(r.results, r.idx, r.items.length);
  if (r.level.input === "choices" && ui.answers) {
    ui.answers.innerHTML = choicesHtml(q.choices);
    ui.answers.classList.add("choices");
    const short = choicesClass(q.choices).includes("short");
    ui.answers.classList.toggle("short", short);
    if (short) ui.answers.style.setProperty("--cols", choiceCols(q.choices)); else ui.answers.style.removeProperty("--cols");
  }
  all(ui.answers, ".btn").concat(all(ui.piano, "rect")).forEach((b) => b.classList.remove("ok", "bad"));
  setMod(0);
  r.t0 = performance.now();
}

function answer(r, value, el) {
  if (run !== r || r.locked) return;
  const q = r.items[r.idx], { ui, hooks } = r;
  const ok = !!r.level.check(q, value);
  r.locked = true;
  r.results.push(ok); r.times.push((performance.now() - r.t0) / 1000);
  if (ok) r.correct++;
  countAnswer(hooks.state, q, ok);
  hooks.save();
  if (el) el.classList.add(ok ? "ok" : "bad");
  if (!ok) {
    // Richtige Antwort markieren: Buchstabe bzw. Auswahlknopf
    const a = q.answer;
    const right = a && typeof a === "object" && a.letter
      ? ui.answers && ui.answers.querySelector(`.btn[data-letter="${a.letter}"]`)
      : all(ui.answers, ".btn[data-choice]").find((b) => q.choices && q.choices[+b.dataset.choice] === a);
    if (right) right.classList.add("ok");
  }
  // q.revealSvg (optional): SVG, das nach der Antwort statt q.svg erscheint, bei richtiger und falscher
  // Antwort, z. B. der vollständige Takt mit dem fehlenden Wert in der Lücke. Ohne revealSvg bleibt q.svg
  // stehen. Die Färbung (Klasse ok/bad am <svg>) gilt in beiden Fällen für das angezeigte SVG.
  const shown = revealedSvg(q);
  if (shown !== q.svg) ui.staff.innerHTML = shown;
  const svg = ui.staff.querySelector("svg");
  if (svg) svg.classList.add(ok ? "ok" : "bad");
  ui.feedback.textContent = feedbackText(q, ok);
  ui.feedback.className = "feedback " + (ok ? "ok" : "bad");
  if (playMode(q) === "together") playChord(notesToPlay(q));
  else notesToPlay(q).forEach((n, i) => { if (i === 0) play(n); else later(r, () => play(n), i * PLAY_GAP); });
  later(r, () => {
    if (run !== r) return;
    r.locked = false; r.idx++;
    if (r.idx >= r.items.length) finish(r); else showQuestion(r);
  }, ok ? DELAY_OK : DELAY_BAD);
}

function finish(r) {
  const { hooks } = r;
  const { stars, gained } = recordRound(hooks.state, r.level.id, r.correct);
  hooks.save();
  const avg = r.times.reduce((a, b) => a + b, 0) / r.times.length;
  const result = { correct: r.correct, total: r.items.length, stars, gained, avg, results: r.results.slice() };
  stop();
  if (hooks.onFinish) hooks.onFinish(result);
}

// Tastatur: true, wenn die Taste verwendet wurde. Buchstaben antworten unabhängig von der
// Eingabeart (mit dem gewählten Vorzeichen), nicht aber bei Auswahlknöpfen.
export function handleKey(e) {
  if (!run || run.locked || run.level.input === "choices") return false;
  const a = keyAction(e);
  if (!a) return false;
  if (a.letter) {
    const r = run;
    const btn = r.ui.answers ? r.ui.answers.querySelector(`.btn[data-letter="${a.letter}"]`) : null;
    answer(r, { letter: a.letter, acc: r.modAcc }, btn);
    e.preventDefault();
    return true;
  }
  setMod(a.acc);
  return true;
}
