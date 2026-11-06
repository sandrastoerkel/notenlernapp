// Üben: Startkarte der Stufe, Runde über engine.js, Ergebniskarte
import { isUnlocked } from "../store.js";
import * as engine from "../engine.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

const current = () => engine.findLevel(ctx.packs, ctx.state.current);

// Beschriftung des Startknopfs (rein, getestet): in allen Paketen „10 Aufgaben“
export const startLabel = () => `Runde starten · ${engine.ROUND_LENGTH} Aufgaben`;

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
  $("#view-practice .seg").hidden = !letters;
  $("#pKeys").hidden = !letters;
  $("#pStart").textContent = startLabel(level);
  markInput();
  ctx.renderTop();
}

function startRound() {
  const { level } = current();
  $("#pIntro").hidden = true; $("#pResult").hidden = true; $("#pPlay").hidden = false;
  engine.startRound(level, {
    staff: $("#pStaff"), feedback: $("#pFeedback"), count: $("#pCount"), dots: $("#pDots"),
    answers: $("#pAnswers"), mods: $("#pMods"), piano: $("#pPiano"),
  }, { state: ctx.state, save: ctx.save, onFinish: showResult });
}

function showResult(res) {
  const { pack, level } = current();
  const { correct: c, stars, gained, avg } = res;
  const next = engine.nextLevel(pack, level);
  const nextOpen = next && isUnlocked(ctx.state, pack, next.id);
  $("#pPlay").hidden = true;
  $("#pResult").hidden = false;
  $("#pResult").innerHTML = `
      <p class="eyebrow">Runde beendet</p>
      ${engine.starsHtml(stars)}
      <p class="big num">${c} / ${res.total}</p>
      <p class="muted">${engine.resultMessage(stars)}</p>
      <p class="small muted num">+${gained} XP · Ø ${avg.toFixed(1)} s pro Note${c < 8 && next && !nextOpen ? ` · Stufe ${next.no} öffnet sich ab 8 Richtigen` : ""}</p>
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
