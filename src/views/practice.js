// Üben: Startkarte der Stufe, Runde über engine.js, Ergebniskarte
import { isUnlocked, unlockedBy, unlocks } from "../store.js";
import * as engine from "../engine.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

const current = () => engine.findLevel(ctx.packs, ctx.state.current);

// Beschriftung des Startknopfs (rein, getestet): in allen Paketen „10 Aufgaben“
export const startLabel = () => `Runde starten · ${engine.ROUND_LENGTH} Aufgaben`;

// Hinweis auf der Startkarte (rein, getestet): bei zweischrittigen Stufen (level.twoSteps) mit dem Zusatz,
// dass ein Teilerfolg (nur der erste Schritt daneben) nicht als richtig zählt
export const TWO_STEPS_NOTE = "Beide Schritte müssen stimmen.";
// Zeile der Ergebniskarte: „+12 XP · Ø 2,3 s pro Note“ (Dezimalkomma; „pro Note“ nur in „Noten lesen“,
// sonst „pro Aufgabe“ – Welle 10, B15)
export const avgText = (avg) => avg.toFixed(1).replace(".", ",");
export const resultLine = (pack, gained, avg) => `+${gained} XP · Ø ${avgText(avg)} s pro ${pack && pack.id === "noten" ? "Note" : "Aufgabe"}`;
// level.hint darf eine Funktion (ctx) => Text sein (Merksprüche, Welle 10, Schritt 4); ctx: { state }.
// Eingesetzt wird der Hinweis per textContent (eigene Sprüche bleiben Text).
export const startHint = (level, ctx) => {
  const hint = engine.textOf(level.hint, ctx);
  // mehrzeilige Hinweise (Tonleitern 10: Reihenfolge und Sprüche) bekommen den Zusatz in eine eigene Zeile
  return level.twoSteps ? `${hint}${hint.includes("\n") ? "\n" : " "}${TWO_STEPS_NOTE}` : hint;
};

// Tastatur-Hinweis auf der Startkarte (rein, getestet): ohne Vorzeichen Buchstaben, mit Namensraster
// der ganze Name und Enter
const kbd = (t) => `<span class="kbd">${t}</span>`;
// Stufen mit level.digits (Grobbestimmung Prime … Oktave): Ziffern 1 bis 8
export const keysHint = (level) => (level && level.digits
  ? `Tastatur: ${kbd("1")} Prime, ${kbd("2")} Sekunde … ${kbd("8")} Oktave`
  : engine.usesNames(level)
  ? `Tastatur: Namen tippen, z. B. ${kbd("fis")} ${kbd("es")} ${kbd("b")}, dann ${kbd("Enter")}. ${kbd("⌫")} löscht, ${kbd("Esc")} leert.`
  : `Tastatur: ${kbd("C")} ${kbd("D")} ${kbd("E")} … ${kbd("H")}`);

// Beschriftung der Wahl Buchstaben/Klaviatur (rein, getestet): mit Namensraster „Namen“
export const lettersLabel = (level) => (engine.usesNames(level) ? "Namen" : "Buchstaben");

// Ergebniskarte (rein, getestet, Welle 10, A7): nächste Stufe der Reihe nach (Knopf nur, wenn sie offen
// ist) und eine eigene, gut lesbare Zeile zur Freischaltung (note). Die Regel bleibt: beste Runde ≥ 8 in
// der Stufe, die freischaltet (store.js, isUnlocked).
// - Stufen, die diese Stufe freischaltet und die noch zu sind, bei weniger als 8 Richtigen:
//   k = 8 − Richtige; k = 1: „Noch eine richtige Antwort, dann öffnet sich Stufe 3.“,
//   k = 2 oder 3: „Noch 2 richtige Antworten, dann öffnet sich Stufe 3.“,
//   ab k = 4: „Ab 8 von 10 öffnet sich Stufe 3.“ (zwei Stufen: „… öffnen sich die Stufen 2 und 7.“)
// - sonst, wenn sie offen sind: „Stufe 3 ist offen.“ („Die Stufen 2 und 7 sind offen.“)
// - ist die nächste Stufe zu und hängt an einer anderen Stufe: „Stufe 7 öffnet sich ab 8 von 10 in Stufe 1.“
// - letzte Stufe eines Pakets ohne weitere Freischaltung: keine Zeile
const andList = (nos) => (nos.length < 2 ? `${nos[0]}` : `${nos.slice(0, -1).join(", ")} und ${nos[nos.length - 1]}`);
const stufen = (ls) => (ls.length > 1 ? `die Stufen ${andList(ls.map((l) => l.no))}` : `Stufe ${ls[0].no}`);
const cap = (t) => t[0].toUpperCase() + t.slice(1);
export const missingText = (k) => (k === 1 ? "Noch eine richtige Antwort" : `Noch ${k} richtige Antworten`);
export function resultInfo(state, pack, level, correct) {
  const next = engine.nextLevel(pack, level);
  const nextOpen = !!next && isUnlocked(state, pack, next.id);
  const mine = unlocks(pack, level.id);
  const closed = mine.filter((l) => !isUnlocked(state, pack, l.id));
  const open = mine.filter((l) => isUnlocked(state, pack, l.id));
  const notes = [];
  if (correct < 8 && closed.length) {
    const k = 8 - correct, verb = closed.length > 1 ? "öffnen" : "öffnet";
    notes.push(k >= 4 ? `Ab 8 von 10 ${verb} sich ${stufen(closed)}.` : `${missingText(k)}, dann ${verb} sich ${stufen(closed)}.`);
  } else if (closed.length === 0 && open.length) {
    notes.push(`${cap(stufen(open))} ${open.length > 1 ? "sind" : "ist"} offen.`);
  }
  if (next && !nextOpen && !mine.includes(next)) {
    const by = unlockedBy(pack, next.id);
    if (by) notes.push(`Stufe ${next.no} öffnet sich ab 8 von 10 in Stufe ${by.no}.`);
  }
  return { next, nextOpen, note: notes.join(" ") };
}

// Hilfen aufgeklappt: so weit scrollen, dass die erste Reihe der Antwortknöpfe über der Tab-Leiste steht
// (rein, getestet). bottom: Unterkante des ersten Knopfs, limit: Oberkante der Tab-Leiste (beides im Fenster).
export const answersScroll = (bottom, limit) => (bottom > limit ? Math.ceil(bottom - limit) : 0);

function keepAnswersVisible() {
  const first = $("#pAnswers .btn");
  if (!first || $("#pPlay").hidden || !$("#pHelps").open) return;
  const tabs = document.querySelector(".tabs");
  const dy = answersScroll(first.getBoundingClientRect().bottom, window.innerHeight - (tabs ? tabs.offsetHeight : 0) - 8);
  if (dy) window.scrollBy({ top: dy, behavior: "smooth" });
}

function markInput() {
  $("#inLetters").classList.toggle("on", ctx.state.input === "letters");
  $("#inKeys").classList.toggle("on", ctx.state.input === "keys");
}

function setInput(v) {
  ctx.state.input = v; ctx.save();
  markInput();
  engine.setInput(v);
}

export function init(c) {
  ctx = c;
  $("#inLetters").addEventListener("click", () => setInput("letters"));
  $("#inKeys").addEventListener("click", () => setInput("keys"));
  $("#pStart").addEventListener("click", startRound);
  // Hilfen aufgeklappt: Antwortknöpfe sichtbar halten (kein Scrollen innerhalb der Hilfen)
  $("#pHelps").addEventListener("toggle", () => { if ($("#pHelps").open) requestAnimationFrame(keepAnswersVisible); });
}

// Startkarte der aktuellen Stufe (bricht eine laufende Runde ab)
export function render() {
  engine.stop();
  const { level } = current();
  $("#pLevelNo").textContent = "Stufe " + level.no;
  $("#pLevelTitle").textContent = level.title;
  $("#pHint").textContent = startHint(level, { state: ctx.state });
  $("#pIntro").hidden = false; $("#pPlay").hidden = true; $("#pResult").hidden = true;
  $("#pStaff").innerHTML = level.example || "";
  // Die Wahl Buchstaben/Klaviatur und der Tastatur-Hinweis gelten nur für Stufen mit Buchstaben-Eingabe;
  // bei Auswahlknöpfen sind die Aufgaben keine einzelnen Noten
  const letters = (level.input || "letters") === "letters";
  // namesOnly: nur das Namensraster (die Schreibweise zählt), keine Wahl der Klaviatur
  $("#view-practice .seg").hidden = !letters || !!level.namesOnly;
  $("#pKeys").hidden = !letters && !level.digits;
  // Hilfen nur während der Runde (engine.startRound)
  $("#pHelps").hidden = true;
  $("#pNext").hidden = true;
  $("#pKeys").innerHTML = keysHint(level);
  $("#inLetters").textContent = lettersLabel(level);
  $("#pStart").textContent = startLabel(level);
  markInput();
  ctx.renderTop();
}

function startRound() {
  const { level } = current();
  $("#pIntro").hidden = true; $("#pResult").hidden = true; $("#pPlay").hidden = false;
  engine.startRound(level, {
    staff: $("#pStaff"), feedback: $("#pFeedback"), count: $("#pCount"), dots: $("#pDots"),
    answers: $("#pAnswers"), typed: $("#pTyped"), piano: $("#pPiano"),
    helps: $("#pHelps"), helpsTitle: $("#pHelps summary"), helpsBody: $("#pHelpsBody"), next: $("#pNext"),
  }, { state: ctx.state, save: ctx.save, onFinish: showResult });
}

function showResult(res) {
  const { pack, level } = current();
  const { correct: c, stars, gained, avg } = res;
  const { next, nextOpen, note } = resultInfo(ctx.state, pack, level, c);
  $("#pPlay").hidden = true;
  $("#pHelps").hidden = true;
  $("#pResult").hidden = false;
  $("#pResult").innerHTML = `
      <p class="eyebrow">Runde beendet</p>
      ${engine.starsHtml(stars)}
      <p class="big num">${c} / ${res.total}</p>
      <p class="muted">${engine.resultMessage(stars)}</p>
      <p class="small muted num">${resultLine(pack, gained, avg)}</p>
      ${note ? `<p class="unlock-line" id="rUnlock">${engine.keepStufe(note)}</p>` : ""}
      <div class="row" style="justify-content:center">
        <button class="btn primary" id="rAgain">Nochmal</button>
        ${nextOpen ? `<button class="btn" id="rNext">Stufe ${next.no}</button>` : ""}
        <button class="btn ghost" id="rHome">Übersicht</button>
      </div>`;
  $("#rAgain").addEventListener("click", () => render());
  if (nextOpen) $("#rNext").addEventListener("click", () => { ctx.state.current = next.id; ctx.save(); render(); });
  $("#rHome").addEventListener("click", () => ctx.show("home"));
  ctx.renderTop();
}

// Laufende Runde beenden (Tab-Wechsel)
export const stop = () => engine.stop();

// Tastatur: true, wenn die Taste verwendet wurde
export const handleKey = (e) => engine.handleKey(e);
