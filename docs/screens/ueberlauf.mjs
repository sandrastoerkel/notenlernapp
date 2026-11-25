// Überlauf-Prüfung im Browser: findet jedes sichtbare Element (und jede Textzeile), dessen Kasten waagrecht
// über den eigenen Rahmen hinausragt. Rahmen ist der nächste Vorfahr mit sichtbarem Rand, eigener
// Hintergrundfläche oder abschneidendem overflow (Karte, Bild im Rahmen, Rollbereich), dazu das Fenster;
// Teile eines SVG werden gegen ihr SVG geprüft. Gewollte Rollbereiche (overflow-x: auto/scroll) dürfen
// breiteren Inhalt haben, absolut gesetzte Marken mit negativem Abstand (✓/✗ am Knopf) dürfen überstehen.
//
// Geprüft werden bei 320 px (dunkel) und 420 px (hell): Startseite, alle Stufen aller Pakete (Startkarte,
// Aufgabe mit offenen Hilfen, nach jeder Antwort – abwechselnd richtig und daneben –, jede Vorführung Bild
// für Bild), „Lernen“ je Reiter und Schlüssel mit allen Vorführungen, Blitz und Statistik.
// In jedem Zustand zählt außerdem ein zweiter sichtbarer Knopf „Nächste Aufgabe“ als Treffer (W2, Welle 11).
//
// Playwright ist KEINE Abhängigkeit der App (siehe screenshots.mjs). Aufruf bei laufendem Server:
//   python3 -m http.server 8080 &
//   node docs/screens/ueberlauf.mjs              (oder: BASE=… BREITEN=320,360,420 RUNDEN=4 node …)
// Ende mit Code 1, wenn es Treffer oder Konsolenfehler gibt. Läuft nicht in `npm test` (braucht einen Browser).
import { createRequire } from "node:module";
import { join } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}
const BASE = process.env.BASE || "http://localhost:8080/";
const WIDTHS = (process.env.BREITEN || "320,420").split(",").map(Number);
const ROUNDS = +(process.env.RUNDEN || 4);

// läuft in der Seite: Liste der Treffer
const FIND = () => {
  const TOL = 1;
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
  const hidden = (e) => { for (let a = e; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a);
    if (s.display === 'none' || s.visibility === 'hidden') return true; if (a.tagName === 'DETAILS' && !a.open && e !== a && !e.closest('summary')) return true; } return false; };
  const isFrame = (a) => {
    const s = getComputedStyle(a);
    if (a instanceof SVGElement) return a.tagName.toLowerCase() === 'svg';
    if (s.display === 'inline' || s.display === 'contents') return false;
    const clip = ['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX);
    const border = ['Left', 'Right'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(s['border' + k + 'Color']));
    const bg = !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) || s.backgroundImage !== 'none';
    return clip || border || (bg && a !== document.body && a !== document.documentElement);
  };
  const sel = (e) => { const p = []; for (let a = e; a && a.nodeType === 1 && p.length < 4; a = a.parentElement) {
    p.unshift(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList && a.classList.length ? '.' + [...a.classList].join('.') : '')); } return p.join(' > '); };
  const hits = [], seen = new Set();
  const test = (e, r, what) => {
    if (r.width < 0.5) return;
    // Fenster
    if (r.left < -TOL || r.right > document.documentElement.clientWidth + TOL) {
      // in einem gewollten Rollbereich? dann unten über den Rahmen geprüft
      let sc = false; for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) { sc = true; break; } }
      if (!sc) push(e, what, 'Fenster', r, { left: 0, right: document.documentElement.clientWidth });
    }
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (!isFrame(a)) { continue; }
      const f = a.getBoundingClientRect();
      const s = getComputedStyle(a);
      const scroll = ['auto', 'scroll'].includes(s.overflowX);
      if (r.left < f.left - TOL || r.right > f.right + TOL) {
        if (scroll) return;            // gewollter Rollbereich: Inhalt darf breiter sein; der Bereich selbst wird als Element geprüft
        push(e, what, sel(a), r, f, ['hidden', 'clip'].includes(s.overflowX) ? 'abgeschnitten' : 'ragt hinaus');
        return;
      }
      if (scroll || ['hidden', 'clip'].includes(s.overflowX)) return;
    }
  };
  const push = (e, what, frame, r, f, kind = 'ragt hinaus') => {
    const key = sel(e) + '|' + frame + '|' + what; if (seen.has(key)) return; seen.add(key);
    hits.push({ el: sel(e), what, frame, kind, links: Math.max(0, +(f.left - r.left).toFixed(1)), rechts: Math.max(0, +(r.right - f.right).toFixed(1)), text: (e.textContent || '').trim().slice(0, 40) });
  };
  const root = document.querySelector('main') || document.body;
  for (const e of root.querySelectorAll('*')) {
    if (!vis(e) || hidden(e)) continue;
    const s = getComputedStyle(e);
    if (e.closest('[aria-hidden="true"].sr, .sr-only, .visually-hidden')) continue;
    if (s.position === 'absolute' && (parseFloat(s.right) < 0 || parseFloat(s.left) < 0 || parseFloat(s.top) < 0)) continue; // gewollt überstehende Marken (✓ am Knopf)
    if (s.clip !== 'auto' || s.clipPath !== 'none') continue;
    if (e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') {
      if (!e.getBBox || ['g', 'defs', 'title', 'desc', 'tspan'].includes(e.tagName.toLowerCase())) continue;
      const svg = e.ownerSVGElement; if (!svg) continue;
      const r = e.getBoundingClientRect(), f = svg.getBoundingClientRect();
      if (r.left < f.left - TOL || r.right > f.right + TOL) push(e, 'svg-Teil', sel(svg), r, f, getComputedStyle(svg).overflow === 'visible' ? 'ragt hinaus' : 'abgeschnitten');
      continue;
    }
    test(e, e.getBoundingClientRect(), 'Kasten');
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) test(e, r, 'Text');
    }
  }
  return hits;
};

// läuft in der Seite: Zahl der sichtbaren Knöpfe „Nächste Aufgabe“ (unter den Antworten und am Ende der Vorführung)
const NEXT_COUNT = () => [...document.querySelectorAll("button")].filter((b) => {
  if (b.textContent.trim() !== "Nächste Aufgabe") return false;
  for (let a = b; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === "none" || s.visibility === "hidden") return false;
    if (a.tagName === "DETAILS" && !a.open && a !== b) return false; }
  const r = b.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5;
}).length;

// Stufe so einhängen, dass die gestellten Aufgaben in window.__qs stehen
const PATCH = async ([pid, lid]) => {
  const m = await import("./src/packs/" + pid + ".js");
  const l = m.default.levels.find((x) => x.id === lid);
  if (!l.__orig) { l.__orig = l.question; l.question = (prev, c) => { const q = l.__orig(prev, c); window.__qs.push(q); return q; }; }
  window.__lv = l; window.__qs = [];
};
// Index eines richtigen bzw. falschen Knopfs im aktuellen Knopfsatz (Schritt s)
const PICK = ([right, s]) => {
  const q = window.__qs[window.__qs.length - 1], l = window.__lv;
  const btns = [...document.querySelectorAll("#pAnswers .btn")];
  const set = q.steps ? q.steps[Math.min(s, q.steps.length - 1)] : q;
  const val = (b) => (b.dataset.letter ? { letter: b.dataset.letter, acc: b.dataset.acc !== undefined ? +b.dataset.acc : 0 } : set.choices[+b.dataset.choice]);
  const ok = (b) => (q.steps ? val(b) === set.answer : l.check(q, val(b)));
  return btns.findIndex((b) => !b.disabled && ok(b) === right);
};
const PACK = { noten: "noten", notenwerte: "notenwerte", tonleitern: "tonleitern", intervall: "intervalle", akkorde: "akkorde" };

async function run(browser, width, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, serviceWorkers: "block" });
  const pg = await ctx.newPage();
  const errs = [], all = new Map();
  pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  pg.on("pageerror", (e) => errs.push(String(e)));
  await pg.goto(BASE); await pg.waitForTimeout(600);
  const chk = async (where) => {
    await pg.waitForTimeout(60);
    const hs = await pg.evaluate(FIND);
    if (await pg.evaluate("document.documentElement.scrollWidth > innerWidth")) hs.push({ el: "html", what: "Seite", frame: "Fenster", kind: "waagrechter Überlauf", links: 0, rechts: 0, text: "" });
    // W2 (Welle 11): „Nächste Aufgabe“ höchstens einmal sichtbar
    const nexts = await pg.evaluate(NEXT_COUNT);
    if (nexts > 1) hs.push({ el: "button", what: "Knopf", frame: "Seite", kind: "doppelter Knopf „Nächste Aufgabe“", links: 0, rechts: 0, text: `${nexts}×` });
    for (const h of hs) {
      const k = [h.el, h.frame, h.what].join("|"), old = all.get(k);
      if (!old) all.set(k, { ...h, wo: [where] });
      else { old.wo.push(where); old.rechts = Math.max(old.rechts, h.rechts); old.links = Math.max(old.links, h.links); }
    }
  };
  const vis = (sel) => pg.locator(sel).first().isVisible();
  // alle Vorführungen im Bereich: öffnen und Bild für Bild bis zum Ergebnis
  const demos = async (scope, where) => {
    const open = pg.locator(`${scope} [data-demo-btn]`);
    for (let i = 0; i < await open.count(); i++) {
      const b = open.nth(i);
      if (!(await b.isVisible()) || (await b.isDisabled())) continue;
      await b.click(); await pg.waitForTimeout(250); await chk(`${where} Vorführung ${i + 1} Bild 1`);
    }
    const next = pg.locator(`${scope} .demo [data-act="next"]`);
    for (let i = 0; i < await next.count(); i++) {
      for (let k = 2; k < 80 && (await next.nth(i).isVisible()) && !(await next.nth(i).isDisabled()); k++) {
        await next.nth(i).click(); await pg.waitForTimeout(25); await chk(`${where} Vorführung ${i + 1} Bild ${k}`);
      }
    }
  };
  await chk("Start (gesperrt)");
  await pg.click("#unlockAll"); await pg.waitForTimeout(300); await chk("Start (offen)");
  const levels = await pg.evaluate("[...document.querySelectorAll('.level[data-id]')].map((e) => e.dataset.id)");
  for (const lid of levels) {
    await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(120);
    await pg.evaluate(PATCH, [PACK[lid.split("-")[0]], lid]);
    await pg.click(`.level[data-id="${lid}"]`); await pg.waitForTimeout(200); await chk(`${lid} Startkarte`);
    await pg.click("#pStart"); await pg.waitForTimeout(250);
    for (let rnd = 0; rnd < ROUNDS && !(await vis("#pResult")); rnd++) {
      const w = `${lid} Aufgabe ${rnd + 1}`, right = rnd % 2 === 0;
      if ((await vis("#pHelps")) && !(await pg.evaluate("document.querySelector('#pHelps').open"))) { await pg.click("#pHelps summary"); await pg.waitForTimeout(150); }
      await chk(`${w} Frage`);
      const n = await pg.evaluate("(() => { const q = window.__qs[window.__qs.length - 1]; return q.steps ? q.steps.length : 1; })()");
      for (let s = 0; s < n; s++) {
        let i = await pg.evaluate(PICK, [right, s]);
        if (i < 0) i = await pg.evaluate(PICK, [!right, s]);
        if (i < 0) { errs.push(`${w}: kein Knopf gefunden`); break; }
        await pg.locator("#pAnswers .btn").nth(i).click(); await pg.waitForTimeout(200);
        await chk(`${w} nach Schritt ${s + 1} (${right ? "richtig" : "daneben"})`);
        if (s < n - 1) { if (await vis("#pNext")) await pg.click("#pNext"); else await pg.waitForTimeout(900); await pg.waitForTimeout(200); }
      }
      if (rnd < 2 && (await vis("#pHelps"))) await demos("#pHelpsBody", w);
      // weiter: bei offener Vorführung steht „Nächste Aufgabe“ nur am Ende der Vorführung (W2), sonst unter den Antworten
      for (let t = 0; t < 25 && !(await vis("#pResult")); t++) {
        if (await vis("#pHelpsBody [data-demo-next]")) { await pg.click("#pHelpsBody [data-demo-next]"); break; }
        if (await vis("#pNext")) { await pg.click("#pNext"); break; }
        await pg.waitForTimeout(150);
      }
      await pg.waitForTimeout(250);
    }
  }
  // „Lernen“ je Reiter (Welle 11, W3) und, wo die Schlüsselwahl sichtbar ist, je Schlüssel, mit allen Vorführungen
  await pg.click('.tab[data-view="learn"]'); await pg.waitForTimeout(300);
  const ltabs = await pg.evaluate("[...document.querySelectorAll('#lTabs [role=tab]')].map((e) => e.dataset.tab)");
  for (const t of ltabs) {
    await pg.click(`#ltab-${t}`); await pg.waitForTimeout(300);
    const clefs = (await vis("#lClefs")) ? ["lTreble", "lBass"] : [null];
    for (const clef of clefs) {
      if (clef) { await pg.click("#" + clef); await pg.waitForTimeout(400); }
      const w = `Lernen ${t}${clef ? " " + clef : ""}`;
      await chk(w); await demos("#view-learn", w);
    }
  }
  await pg.click('.tab[data-view="blitz"]'); await pg.waitForTimeout(300); await chk("Blitz Startkarte");
  await pg.click("#bStart"); await pg.waitForTimeout(300); await chk("Blitz Frage");
  await pg.locator("#bAnswers .btn").first().click(); await pg.waitForTimeout(150); await chk("Blitz nach Antwort");
  await pg.click('.tab[data-view="stats"]'); await pg.waitForTimeout(400); await chk("Statistik");
  await ctx.close();
  return { hits: [...all.values()], errs };
}

const browser = await playwright.chromium.launch();
let bad = 0;
for (const width of WIDTHS) {
  const scheme = width <= 360 ? "dark" : "light";
  const { hits, errs } = await run(browser, width, scheme);
  bad += hits.length + errs.length;
  console.log(`${width} px (${scheme === "dark" ? "dunkel" : "hell"}): ${hits.length} Treffer, ${errs.length} Konsolenfehler`);
  errs.slice(0, 10).forEach((e) => console.log(`  Fehler: ${e}`));
  hits.sort((a, b) => Math.max(b.rechts, b.links) - Math.max(a.rechts, a.links)).forEach((h) => {
    console.log(`  - [${h.kind}] ${h.what}: rechts ${h.rechts} px, links ${h.links} px\n      ${h.el}\n      Rahmen: ${h.frame}\n      „${h.text}“ (${h.wo.length}×, z. B. ${h.wo.slice(0, 3).join("; ")})`);
  });
}
await browser.close();
process.exit(bad ? 1 : 0);
