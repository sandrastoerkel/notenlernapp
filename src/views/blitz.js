// Blitz: 60 Sekunden, nur Buchstaben; Punkte mit Serienbonus ab fünf in Folge
import { recordBlitz } from "../store.js";
import { play } from "../audio.js";
import { gName } from "../music.js";
import { countAnswer, keyAction, lettersHtml, blitzPoints } from "../engine.js";

const $ = (s) => document.querySelector(s);
export const DURATION = 60000, TICK = 200, DELAY_OK = 250, DELAY_BAD = 900, LOW = 10;

let ctx = null;
let B = null; // laufende Blitz-Runde

const pack = () => ctx.packs.find((p) => p.blitz) || null;

export function init(c) {
  ctx = c;
  $("#bStart").addEventListener("click", start);
  $("#bAnswers").onclick = (e) => {
    const b = e.target.closest(".btn[data-letter]");
    if (b) answer(b.dataset.letter, b);
  };
}

// Laufende Runde abbrechen (Tab-Wechsel): Zeitgeber löschen, nichts eintragen
export function stop() {
  if (!B) return;
  clearInterval(B.timer);
  if (B.wait) clearTimeout(B.wait);
  B = null;
}

export function render() {
  stop();
  const p = pack();
  $("#bRecord").textContent = ctx.state.blitzRecord; $("#bScore").textContent = 0; $("#bCombo").textContent = "Serie 0";
  $("#bTimer").textContent = "60"; $("#bTimer").className = "timer num";
  $("#bIntro").hidden = false; $("#bPlay").hidden = true; $("#bResult").hidden = true;
  $("#bStaff").innerHTML = p ? p.blitz.example || "" : "";
  ctx.renderTop();
}

function start() {
  const p = pack();
  if (!p) return;
  stop();
  B = { blitz: p.blitz, score: 0, combo: 0, best: 0, cur: null, end: Date.now() + DURATION, locked: false, n: 0, timer: null, wait: null };
  $("#bIntro").hidden = true; $("#bResult").hidden = true; $("#bPlay").hidden = false;
  $("#bAnswers").innerHTML = lettersHtml();
  next();
  const r = B;
  B.timer = setInterval(() => {
    if (B !== r) return;
    const left = Math.max(0, Math.ceil((B.end - Date.now()) / 1000));
    $("#bTimer").textContent = left; $("#bTimer").className = "timer num" + (left <= LOW ? " low" : "");
    if (left <= 0) finish();
  }, TICK);
}

function next() {
  B.cur = B.blitz.question(B.cur); B.n++;
  $("#bStaff").innerHTML = B.cur.svg;
  $("#bFeedback").textContent = ""; $("#bFeedback").className = "feedback";
  document.querySelectorAll("#bAnswers .btn").forEach((b) => b.classList.remove("ok", "bad"));
}

function answer(letter, btn) {
  if (!B || B.locked) return;
  const q = B.cur;
  const ok = !!B.blitz.check(q, letter);
  countAnswer(ctx.state, q, ok);
  if (ok) { B.combo++; B.best = Math.max(B.best, B.combo); B.score += blitzPoints(B.combo); } else { B.combo = 0; }
  $("#bScore").textContent = B.score; $("#bCombo").textContent = "Serie " + B.combo;
  btn.classList.add(ok ? "ok" : "bad");
  // Im Blitz nur der Name ohne Oktave, z. B. „F“
  const name = q.note ? gName(q.note) : q.display;
  const fb = $("#bFeedback");
  fb.textContent = ok ? name : `${name} wäre richtig gewesen`;
  fb.className = "feedback " + (ok ? "ok" : "bad");
  const svg = $("#bStaff svg");
  if (svg) svg.classList.add(ok ? "ok" : "bad");
  if (q.note) play(q.note, 0.15);
  B.locked = true;
  const r = B;
  B.wait = setTimeout(() => { if (!B || B !== r) return; B.wait = null; B.locked = false; next(); }, ok ? DELAY_OK : DELAY_BAD);
}

function finish() {
  const { record, gained } = recordBlitz(ctx.state, B.score, B.best);
  ctx.save();
  $("#bPlay").hidden = true; $("#bResult").hidden = false;
  $("#bResult").innerHTML = `
      <p class="eyebrow">${record ? "Neuer Rekord!" : "Zeit abgelaufen"}</p>
      <p class="big num">${B.score} Punkte</p>
      <p class="muted num">Längste Serie ${B.best} · ${B.n - 1} Noten gesehen</p>
      <p class="small muted num">+${gained} XP</p>
      <div class="row" style="justify-content:center">
        <button class="btn primary" id="bAgain">Nochmal</button>
        <button class="btn ghost" id="bHome">Übersicht</button>
      </div>`;
  $("#bAgain").addEventListener("click", () => render());
  $("#bHome").addEventListener("click", () => ctx.show("home"));
  stop();
  ctx.renderTop();
}

// Tastatur: nur Buchstaben; true, wenn die Taste verwendet wurde
export function handleKey(e) {
  if (!B || B.locked) return false;
  const a = keyAction(e);
  if (!a || !a.letter) return false;
  const btn = document.querySelector(`#bAnswers .btn[data-letter="${a.letter}"]`);
  if (!btn) return false;
  answer(a.letter, btn);
  e.preventDefault();
  return true;
}
