// Gemeinsame Bausteine der Browser-Skripte (ueberlauf.mjs, pruefung.mjs, uhr40.mjs; Welle 11, Schritt 13):
// Playwright laden, Spielstand und Zufall vorbereiten, Aufgaben gezielt richtig oder daneben beantworten,
// zur nächsten Aufgabe weitergehen.
//
// Playwright ist KEINE Abhängigkeit der App (package.json bleibt ohne dependencies); es muss nur für diese Skripte
// da sein, z. B. global installiert (siehe screenshots.mjs). Ein eigener Browser geht über CHROME=/pfad/zum/browser.
import { createRequire } from "node:module";
import { join } from "node:path";
import { execSync } from "node:child_process";

export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require("playwright"); } catch {
    return require(join(execSync("npm root -g").toString().trim(), "playwright"));
  }
}

export const BASE = process.env.BASE || "http://localhost:8080/";
export const KEY = "notenheld.v2";

export const launch = (pw) => pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

// Für addInitScript: Spielstand einmal je Kontext setzen (Neuladen behält, was die App seitdem gespeichert hat)
export const SEED_STATE = ({ key, state }) => {
  try {
    if (!sessionStorage.getItem("notenheld-seeded")) {
      if (state === null) localStorage.removeItem(key); else localStorage.setItem(key, state);
      sessionStorage.setItem("notenheld-seeded", "1");
    }
  } catch (e) { /* ohne Speicher */ }
};

// Für addInitScript: fester Zufall (mulberry32), damit beide Farbschemata dieselben Aufgaben zeigen und ein Lauf
// wiederholbar ist. Jedes Laden beginnt wieder beim selben Wert.
export const SEED_RANDOM = (seed) => {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Für addInitScript: window.__hold = true hält Zeitgeber ab 500 ms zurück (das Weitergehen nach einer richtigen
// Antwort), bis window.__release() sie freigibt – so lässt sich die Rückmeldung „Richtig!“ in Ruhe fotografieren.
// Die App selbst bleibt unverändert; ohne __hold verhält sich setTimeout wie immer.
export const HOLD_TIMERS = () => {
  const st = window.setTimeout.bind(window);
  let held = [];
  window.__hold = false;
  window.setTimeout = (fn, ms, ...args) => {
    if (window.__hold && ms >= 500 && typeof fn === "function") { held.push(() => fn(...args)); return st(() => {}, 0); }
    return st(fn, ms, ...args);
  };
  window.__release = () => { window.__hold = false; const h = held; held = []; h.forEach((f) => st(f, 50)); };
};

export const vis = (pg, sel) => pg.locator(sel).first().isVisible();

// läuft in der Seite: aktuelle Aufgabe (engine.currentQuestion) und ihre Stufe für PICK bereitstellen – in der
// gemischten Runde q.from, sonst die gespeicherte aktuelle Stufe. false, wenn keine Runde läuft.
export const CUR = async () => {
  const e = await import("./src/engine.js");
  const q = e.currentQuestion();
  if (!q) return false;
  let l = q.from;
  if (!l) {
    const { PACKS } = await import("./src/packs/index.js");
    const st = JSON.parse(localStorage.getItem("notenheld.v2") || "{}");
    l = e.findLevel(PACKS, st.current).level;
  }
  window.__q = q; window.__lv = l; window.__e = e;
  // Art des Antwortbereichs je Schritt ("choices" | "letters" | "names", engine.stepInput) – für die Ausgabe
  const n = q.steps ? q.steps.length : 1;
  return { id: l.id, steps: n, kinds: Array.from({ length: n }, (_, i) => e.stepInput(q, i, l)) };
};

// läuft in der Seite: Ziel einer richtigen (right = true) bzw. falschen Antwort im aktuellen Knopfsatz (Schritt s) –
// { sel, i }: Auswahl über die Antwortknöpfe, bei sichtbarer Klaviatur (Eingabe „Klaviatur“) in einem Noten-Schritt
// über ihre Tasten (rect[data-semi]); i = -1, wenn es keine passende gibt. Geprüft wird wie in der Engine (Welle 12,
// Schritt 6): Aufgaben mit Schritten über engine.checkStep (Auswahl: Text gleich set.answer; Noteneingabe
// „letters“/„names“: { letter, acc } gleich, Taste nach Tonklasse), Aufgaben ohne Schritte über level.check. Die Art
// des Schritts kommt aus engine.stepInput – so geht jede Folge von Schrittarten, auch [Auswahl, Noteneingabe].
export const PICK = ([right, s]) => {
  const q = window.__q, l = window.__lv, e = window.__e;
  const i = q.steps ? Math.min(s, q.steps.length - 1) : 0;
  const set = q.steps ? q.steps[i] : q;
  const kind = e.stepInput(q, i, l);
  const ok = (v) => (q.steps ? e.checkStep(set, v) : !!l.check(q, v));
  const btns = [...document.querySelectorAll("#pAnswers .btn")];
  const shown = (el) => { for (let a = el; a && a.nodeType === 1; a = a.parentElement) if (a.hidden || getComputedStyle(a).display === "none") return false; return true; };
  const live = btns.filter((b) => !b.disabled && shown(b));
  const piano = document.querySelector("#pPiano");
  if (piano && !piano.hidden && (kind !== "choices" || !live.length)) {
    const keys = [...piano.querySelectorAll("rect[data-semi]")];
    return { sel: "#pPiano rect[data-semi]", i: keys.findIndex((k) => ok(+k.dataset.semi) === right) };
  }
  const val = (b) => (b.dataset.letter ? { letter: b.dataset.letter, acc: b.dataset.acc !== undefined ? +b.dataset.acc : 0 } : set.choices[+b.dataset.choice]);
  return { sel: "#pAnswers .btn", i: btns.findIndex((b) => live.includes(b) && ok(val(b)) === right) };
};

// läuft in der Seite: Ist der Schritt fertig gewechselt? Nach einem Schritt steht die Rückmeldung mit ok/bad in
// #pFeedback und die Markierungen an Knöpfen bzw. Tasten; im neuen Schritt sind beide weg (engine: toNextStep)
const STEP_READY = () => !document.querySelector("#pAnswers .btn.ok, #pAnswers .btn.bad, #pPiano .ok, #pPiano .bad")
  && !/\b(ok|bad)\b/.test(document.querySelector("#pFeedback").className);

// Eine Aufgabe beantworten, Schritt für Schritt. right: true/false für alle Schritte oder eine Liste je Schritt
// (z. B. [false, true] für einen Teilerfolg). after(label, s) wird nach jedem Schritt aufgerufen (Prüfung, Foto),
// before(s, want, info) davor (z. B. window.__hold setzen). Gibt die Stufe der Aufgabe zurück ({ id, steps }) oder
// null, wenn keine Runde läuft. errs: Liste für Fehler.
export async function answerQuestion(pg, right, after = null, errs = [], before = null) {
  const info = await pg.evaluate(CUR);
  if (!info) { errs.push("answerQuestion: keine laufende Runde"); return null; }
  for (let s = 0; s < info.steps; s++) {
    const want = Array.isArray(right) ? !!right[Math.min(s, right.length - 1)] : !!right;
    let p = await pg.evaluate(PICK, [want, s]);
    if (p.i < 0) p = await pg.evaluate(PICK, [!want, s]);
    if (p.i < 0) { errs.push(`${info.id}: kein Knopf gefunden`); break; }
    if (before) await before(s, want, info);
    await pg.locator(p.sel).nth(p.i).click(); await pg.waitForTimeout(200);
    if (after) await after(`nach Schritt ${s + 1} (${want ? "richtig" : "daneben"})`, s);
    if (s < info.steps - 1) {
      // Schritt 1 daneben: „Weiter zu Schritt 2“; richtig: die Runde geht nach kurzer Zeit selbst weiter
      if (await vis(pg, "#pNext")) await pg.click("#pNext");
      else await pg.waitForFunction(STEP_READY, null, { timeout: 4000 }).catch(() => errs.push(`${info.id}: Schritt ${s + 2} kam nicht`));
      await pg.waitForTimeout(150);
      await unguarded(pg);
    }
  }
  return info;
}

// läuft in der Seite: Stand nach einer Antwort (Ergebniskarte da, andere Aufgabe da, Knöpfe zum Weitergehen)
const GO_STATE = async () => {
  const e = await import("./src/engine.js");
  const shown = (sel) => { const b = document.querySelector(sel); if (!b) return false;
    for (let a = b; a && a.nodeType === 1; a = a.parentElement) if (a.hidden || getComputedStyle(a).display === "none") return false; return true; };
  return { result: !document.querySelector("#pResult").hidden, moved: e.currentQuestion() !== window.__q,
    demoNext: shown("#pHelpsBody [data-demo-next]"), next: shown("#pNext") };
};

// Weiter zur nächsten Aufgabe: bei offener Vorführung über den Knopf am Ende der Vorführung (W2), sonst „Nächste
// Aufgabe“ unter den Antworten; nach „richtig“ ohne Wartezeit geht die Runde selbst weiter. Wartet, bis die nächste
// Aufgabe oder die Ergebniskarte da ist.
export async function goOn(pg) {
  for (let t = 0; t < 60; t++) {
    const st = await pg.evaluate(GO_STATE);
    if (st.result || st.moved) break;
    if (st.demoNext) await pg.click("#pHelpsBody [data-demo-next]");
    else if (st.next) await pg.click("#pNext");
    await pg.waitForTimeout(100);
  }
  await pg.waitForTimeout(150);
  await unguarded(pg);
}

// Nach „Weiter zu Schritt 2“ bzw. „Nächste Aufgabe“ nimmt die Runde SWITCH_GUARD lang keine Antwort an (Korrektur
// nach der Prüfung Welle 12, J-B2): warten, bis die Sperre vorbei ist (engine.isGuarded)
export async function unguarded(pg) {
  // waitForFunction wartet nicht auf ein Promise (ein Promise gilt als erfüllt): das Modul vorher holen, dann
  // synchron prüfen
  await pg.evaluate(async () => { window.__e = await import("./src/engine.js"); });
  await pg.waitForFunction(() => !window.__e.isGuarded(), null, { timeout: 3000 }).catch(() => {});
}

// Ganze Runde spielen, bis die Ergebniskarte da ist. decide(info, k) → right (wie bei answerQuestion) für die k-te
// Aufgabe (ab 0); info = { id, steps } der Aufgabe. onQuestion(info, k) vor, after(label, info, k) nach jedem Schritt.
export async function playRound(pg, decide, { onQuestion = null, after = null, errs = [], max = 14 } = {}) {
  for (let k = 0; k < max && !(await vis(pg, "#pResult")); k++) {
    const info = await pg.evaluate(CUR);
    if (!info) break;
    if (onQuestion) await onQuestion(info, k);
    await answerQuestion(pg, decide(info, k), after ? (label, s) => after(label, info, k, s) : null, errs);
    await goOn(pg);
  }
  const done = await vis(pg, "#pResult");
  if (!done) errs.push("playRound: keine Ergebniskarte");
  return done;
}
