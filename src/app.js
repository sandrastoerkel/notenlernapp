// Navigation und Verdrahtung: Zustand laden, Ansichten starten, Tabs, Kopfzeile, Tastatur
import * as store from "./store.js";
import * as audio from "./audio.js";
import { PACKS } from "./packs/index.js";
import { boxIds } from "./repeat.js";
import * as home from "./views/home.js";
import * as practice from "./views/practice.js";
import * as learn from "./views/learn.js";
import * as blitz from "./views/blitz.js";
import * as stats from "./views/stats.js";
import * as lehrkraft from "./views/lehrkraft.js";
import { stopDemos } from "./demo.js";
import { isKlasseLink, parseLink, sameKlasse, klasseText } from "./klasse.js";

const $ = (s) => document.querySelector(s);
// lehrkraft: Seite „Für Lehrkräfte“ (Welle 11, Schritt 12), nur über #lehrkraft, ohne Reiter in der unteren Leiste
const VIEWS = { home, practice, learn, blitz, stats, lehrkraft };
const TEACHER_HASH = "#lehrkraft";
let view = "home";

// Gemeinsamer Kontext für alle Ansichten. ctx.state wird beim Zurücksetzen ersetzt,
// deshalb lesen die Ansichten den Zustand immer über ctx.state.
const ctx = {
  // Stufen ohne Hilfen für die einmalige Umstellung „wiederholen“ (Karteikasten, repeat.js)
  state: store.load(undefined, new Date(), boxIds(PACKS)),
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

// arg (optional) geht an render der Ansicht, z. B. { tab } für „Lernen“ (Welle 11, Schritt 2)
function show(v, arg) {
  if (!VIEWS[v]) v = "home";
  // Laufende Runden beenden, bevor die Ansicht wechselt
  practice.stop();
  blitz.stop();
  stopDemos();
  view = v;
  // Wer die Seite „Für Lehrkräfte“ verlässt, verliert die Angabe in der Adresszeile (sonst löste der Textlink
  // „Für Lehrkräfte“ beim nächsten Mal kein hashchange aus)
  if (v !== "lehrkraft" && location.hash === TEACHER_HASH) history.replaceState(null, "", location.pathname + location.search);
  Object.keys(VIEWS).forEach((x) => { $("#view-" + x).hidden = x !== v; });
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.view === v));
  VIEWS[v].render(arg);
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
  // offene Bestätigung (Jahrgang) oder großer QR-Code: Tasten gehören dem Dialog
  if ($("#klasseDialog").open || $("#qrBig").open) return;
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

/* ---------- Jahrgang über den Lehrkraft-Link (Welle 11, Schritt 11) ---------- */

// Die Angabe aus der Adresszeile nehmen (ohne neuen Eintrag im Verlauf und ohne hashchange), damit ein Neuladen
// nicht noch einmal fragt
const clearHash = () => history.replaceState(null, "", location.pathname + location.search);

// Hinweis bei einem Link, der nicht passt (Leiste wie der Update-Hinweis); der Spielstand bleibt unberührt
function showLinkHint() {
  const bar = $("#klasseBar");
  bar.hidden = false;
  $("#klasseBarClose").onclick = () => { bar.hidden = true; };
}

// Bestätigung im Dialog: k ist das Ergebnis von parseLink (Setzen) oder { keine: true } (Entfernen).
// Erst „Übernehmen“ bzw. „Entfernen“ schreibt den Stand (store.setKlasse / clearKlasse); Escape und „Nicht …“
// lassen alles, wie es war.
function askKlasse(k) {
  const dlg = $("#klasseDialog"), old = ctx.state.klasse;
  const remove = !!k.keine;
  $("#klasseTitle").textContent = remove ? "Jahrgang entfernen?" : "Einstellung deiner Lehrkraft übernehmen?";
  $("#klasseWhat").textContent = remove ? "" : klasseText(k);
  $("#klasseWhat").hidden = remove;
  $("#klasseNote").textContent = remove ? "Dein Fortschritt bleibt, es schließt sich nichts."
    : "Alles bis dahin ist dann sofort offen. Dein Fortschritt bleibt, es schließt sich nichts.";
  $("#klasseBisher").textContent = old ? `Bisher: ${klasseText(old)}.` : "";
  $("#klasseBisher").hidden = !old;
  $("#klasseYes").textContent = remove ? "Entfernen" : "Übernehmen";
  $("#klasseNo").textContent = remove ? "Nicht entfernen" : "Nicht übernehmen";
  dlg.returnValue = "";
  dlg.onclose = () => {
    clearHash();
    if (dlg.returnValue !== "ja") return;
    if (remove) store.clearKlasse(ctx.state); else store.setKlasse(ctx.state, k);
    ctx.save();
    show("home");
  };
  // schon offen (zweiter Link bei offener Frage): nur der Inhalt wechselt. Kein close() – dessen Ereignis käme
  // verspätet und nähme die neue Angabe aus der Adresszeile, bevor geantwortet ist
  if (!dlg.open) dlg.showModal();
  $("#klasseYes").focus();
}

// Beim Start und bei hashchange: #klasse=… (bzw. eine Angabe mit zweig oder dran) prüfen
function readKlasseLink() {
  if (!isKlasseLink(location.hash)) return;
  const k = parseLink(location.hash, PACKS);
  if (!k) { clearHash(); showLinkHint(); return; }
  // dieselbe Einstellung ist schon gesetzt bzw. es gibt nichts zu entfernen: nicht fragen
  if (k.keine ? !ctx.state.klasse : sameKlasse(k, ctx.state.klasse)) { clearHash(); return; }
  askKlasse(k);
}

// #lehrkraft öffnet die Seite „Für Lehrkräfte“; verschwindet die Angabe (Zurück im Browser), geht es zur Startseite
function readViewHash() {
  if (location.hash === TEACHER_HASH) { if (view !== "lehrkraft") show("lehrkraft"); }
  else if (view === "lehrkraft" && !isKlasseLink(location.hash)) show("home");
}

window.addEventListener("hashchange", () => { readViewHash(); readKlasseLink(); });

/* ---------- Start ---------- */
audio.setMuted(ctx.state.muted);
Object.values(VIEWS).forEach((v) => v.init(ctx));
show(location.hash === TEACHER_HASH ? "lehrkraft" : "home");
readKlasseLink();
