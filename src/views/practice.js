// Üben: Startkarte der Stufe, Runde über engine.js, Ergebniskarte
import { isUnlocked, unlockedBy, unlocks } from "../store.js";
import * as engine from "../engine.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

const current = () => engine.findLevel(ctx.packs, ctx.state.current);

// Beschriftung des Startknopfs (rein, getestet): in allen Paketen „10 Aufgaben“
export const startLabel = () => `Runde starten · ${engine.ROUND_LENGTH} Aufgaben`;

// Tastatur-Hinweis auf der Startkarte (rein, getestet): ohne Vorzeichen Buchstaben, mit Namensraster
// der ganze Name und Enter
const kbd = (t) => `<span class="kbd">${t}</span>`;
// Stufen mit level.digits (Rahmenintervall Prime … Oktave): Ziffern 1 bis 8
export const keysHint = (level) => (level && level.digits
  ? `Tastatur: ${kbd("1")} Prime, ${kbd("2")} Sekunde … ${kbd("8")} Oktave (Rahmenintervall)`
  : engine.usesNames(level)
  ? `Tastatur: Namen tippen, z. B. ${kbd("fis")} ${kbd("es")} ${kbd("b")}, dann ${kbd("Enter")}. ${kbd("⌫")} löscht, ${kbd("Esc")} leert.`
  : `Tastatur: ${kbd("C")} ${kbd("D")} ${kbd("E")} … ${kbd("H")}`);

// Beschriftung der Wahl Buchstaben/Klaviatur (rein, getestet): mit Namensraster „Namen“
export const lettersLabel = (level) => (engine.usesNames(level) ? "Namen" : "Buchstaben");

// Ergebniskarte (rein, getestet): nächste Stufe der Reihe nach (Knopf nur, wenn sie offen ist) und ein
// Zusatz, der requires folgt. Unter 8 Richtigen: „Stufe 2 und 7 öffnen sich ab 8 Richtigen“ (die Stufen,
// die diese Stufe freischaltet und die noch zu sind). Sonst: weitere offene Stufen, die diese Stufe
// freischaltet („Stufe 7 ist offen“). Ist die nächste Stufe zu und hängt an einer anderen Stufe:
// „Stufe 7 ist frei nach Stufe 1“.
const andList = (nos) => (nos.length < 2 ? `${nos[0]}` : `${nos.slice(0, -1).join(", ")} und ${nos[nos.length - 1]}`);
export function resultInfo(state, pack, level, correct) {
  const next = engine.nextLevel(pack, level);
  const nextOpen = !!next && isUnlocked(state, pack, next.id);
  const mine = unlocks(pack, level.id);
  const closed = mine.filter((l) => !isUnlocked(state, pack, l.id));
  const notes = [];
  if (correct < 8 && closed.length) notes.push(`Stufe ${andList(closed.map((l) => l.no))} ${closed.length > 1 ? "öffnen" : "öffnet"} sich ab 8 Richtigen`);
  const extra = mine.filter((l) => l !== next && isUnlocked(state, pack, l.id));
  if (extra.length) notes.push(`Stufe ${andList(extra.map((l) => l.no))} ${extra.length > 1 ? "sind" : "ist"} offen`);
  if (next && !nextOpen && !mine.includes(next)) {
    const by = unlockedBy(pack, next.id);
    if (by) notes.push(`Stufe ${next.no} ist frei nach Stufe ${by.no}`);
  }
  return { next, nextOpen, note: notes.join(" · ") };
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
  $("#pHint").textContent = level.hint;
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
      <p class="small muted num">+${gained} XP · Ø ${avg.toFixed(1)} s pro Note${note ? ` · ${note}` : ""}</p>
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
