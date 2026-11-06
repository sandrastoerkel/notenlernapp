// Navigation und Verdrahtung: Zustand laden, Ansichten starten, Tabs, Kopfzeile, Tastatur
import * as store from "./store.js";
import * as audio from "./audio.js";
import { PACKS } from "./packs/index.js";
import * as home from "./views/home.js";
import * as practice from "./views/practice.js";
import * as learn from "./views/learn.js";
import * as blitz from "./views/blitz.js";
import * as stats from "./views/stats.js";

const $ = (s) => document.querySelector(s);
const VIEWS = { home, practice, learn, blitz, stats };
let view = "home";

// Gemeinsamer Kontext für alle Ansichten. ctx.state wird beim Zurücksetzen ersetzt,
// deshalb lesen die Ansichten den Zustand immer über ctx.state.
const ctx = {
  state: store.load(),
  save: () => store.save(ctx.state),
  show,
  renderTop,
  packs: PACKS,
};

function renderTop() {
  $("#xpVal").textContent = ctx.state.xp;
  $("#streakVal").textContent = ctx.state.dayStreak;
  $("#muteBtn").textContent = ctx.state.muted ? "🔇" : "🔊";
  audio.setMuted(ctx.state.muted);
}

function show(v) {
  if (!VIEWS[v]) v = "home";
  // Laufende Runden beenden, bevor die Ansicht wechselt
  practice.stop();
  blitz.stop();
  view = v;
  Object.keys(VIEWS).forEach((x) => { $("#view-" + x).hidden = x !== v; });
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.view === v));
  VIEWS[v].render();
  window.scrollTo({ top: 0 });
}

document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => show(t.dataset.view)));

$("#muteBtn").addEventListener("click", () => {
  ctx.state.muted = !ctx.state.muted;
  audio.setMuted(ctx.state.muted);
  ctx.save(); renderTop();
});

// Tastatur: an die aktive Ansicht weitergeben (ohne Strg, Alt, Cmd)
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const v = VIEWS[view];
  if (v && v.handleKey) v.handleKey(e);
});

/* ---------- Start ---------- */
audio.setMuted(ctx.state.muted);
Object.values(VIEWS).forEach((v) => v.init(ctx));
show("home");
