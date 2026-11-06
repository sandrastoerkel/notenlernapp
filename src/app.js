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

/* ---------- Offline-Cache und Updates ---------- */

// true, sobald du „Neu laden“ getippt hast; nur dann lädt controllerchange die Seite neu
// (bei der ersten Installation übernimmt der Worker per clients.claim ebenfalls, ohne Neuladen)
let updateRequested = false;

// Hinweis „Neue Version verfügbar“: Ein neuer Service Worker wartet, bis du „Neu laden“ tippst.
// Erst dann übernimmt er (SKIP_WAITING), und die Seite lädt einmal neu.
function showUpdate(reg) {
  const bar = $("#updateBar");
  bar.hidden = false;
  $("#updateLater").onclick = () => { bar.hidden = true; };
  $("#updateReload").onclick = () => {
    updateRequested = true;
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    else location.reload(); // der neue Worker ist schon aktiv
  };
}

function watchUpdates(reg) {
  // Beim Öffnen wartet schon ein neuer Worker (zum Beispiel aus einem früheren Besuch)
  if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
  reg.addEventListener("updatefound", () => {
    const sw = reg.installing;
    if (!sw) return;
    sw.addEventListener("statechange", () => {
      // ohne controller ist es die erste Installation: dann gibt es nichts neu zu laden
      if (sw.state === "installed" && navigator.serviceWorker.controller) showUpdate(reg);
    });
  });
  // Wer die App aus dem Hintergrund zurückholt, bekommt so ebenfalls das Update
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reg.update().catch(() => {});
  });
}

// Service Worker nur über https oder auf dem eigenen Rechner (localhost)
if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname))) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateRequested || reloaded) return;
    reloaded = true;
    location.reload();
  });
  const register = () => navigator.serviceWorker.register("./sw.js", { scope: "./" })
    .then(watchUpdates)
    .catch((err) => console.warn("Service Worker nicht registriert:", err));
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}

/* ---------- Start ---------- */
audio.setMuted(ctx.state.muted);
Object.values(VIEWS).forEach((v) => v.init(ctx));
show("home");
