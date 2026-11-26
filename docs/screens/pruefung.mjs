// Bildschirmfotos für die Prüfung aus drei Perspektiven (Welle 11, Schritt 13): jede Ansicht der App, auch die
// neuen aus Welle 11, bei 420 px hell und 320 px dunkel, jeweils die ganze Seite. Feste Uhr (page.clock.setFixedTime,
// Donnerstag 26.11.2026, 10:00 Uhr in Europe/Berlin), fester Zufall (beide Farbschemata zeigen dieselben Aufgaben),
// vorbereitete Spielstände über addInitScript. Nichts davon landet im Repo.
//
// Ergebnis: OUT/420-hell/NNN-name.png und OUT/320-dunkel/NNN-name.png (gleiche Nummern in beiden Ordnern) und
// OUT/index.md mit Name und Inhalt jedes Bildes. OUT ist /tmp/notenheld-pruefung-w11/, wenn nicht anders gesetzt.
//
// Playwright ist KEINE Abhängigkeit der App (siehe spiel.mjs). Aufruf bei laufendem Server:
//   python3 -m http.server 8080 &
//   node docs/screens/pruefung.mjs           (oder: BASE=… OUT=… SKALA=2 SEED=7 NUR=lehrkraft node …)
// SKALA: Pixel je CSS-Pixel (Vorgabe 1); NUR: nur Szenen, deren Name passt (zum Nachholen; Nummern weichen dann ab).
// Ende mit Code 1, wenn eine erwartete Ansicht fehlt oder die Seite einen Fehler meldet.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { loadPlaywright, launch, BASE, KEY, SEED_STATE, SEED_RANDOM, HOLD_TIMERS, vis, CUR, answerQuestion, goOn } from "./spiel.mjs";
import { fresh, addDays, starsFor } from "../../src/store.js";
import { dranFor } from "../../src/klasse.js";
import { PACKS } from "../../src/packs/index.js";
import { HEAT_NOTES, statKey } from "../../src/packs/noten.js";

const playwright = loadPlaywright();
const OUT = process.env.OUT || "/tmp/notenheld-pruefung-w11/";
const TZ = "Europe/Berlin";
const HEUTE = "2026-11-26";
const UHR = new Date("2026-11-26T10:00:00+01:00");
const SEED = +(process.env.SEED || 7);
const SKALA = +(process.env.SKALA || 1);
const NUR = process.env.NUR ? new RegExp(process.env.NUR) : null;
const LOOKS = [
  { width: 420, scheme: "light", dir: "420-hell" },
  { width: 320, scheme: "dark", dir: "320-dunkel" },
];

/* ---------- Spielstände (Form wie fresh() in src/store.js; Zahlen erfunden für die Bilder) ---------- */

const d = (n) => addDays(HEUTE, n);
const lv = (best, played = 1, day = d(-1)) => ({ stars: starsFor(best), best, played, last: best, day });
const base = () => ({ ...fresh(), muted: true });
const LEER = base();
const withKlasse = (s, jahrgang, zweig = null) => ({ ...s, klasse: { jahrgang, zweig, dran: dranFor(jahrgang, zweig) } });

// Notenkarte: einige Antworten je Note, zuletzt meist richtig, ein paar Noten unsicher oder langsam
function someNotes() {
  const notes = {};
  const all = [...HEAT_NOTES.treble, ...HEAT_NOTES.bass, ...HEAT_NOTES.acc];
  all.forEach((it, i) => {
    if (i % 5 === 4) return; // ein Teil noch neu
    const bad = i % 7 === 2 ? 4 : i % 3 === 0 ? 1 : 0, ok = 6 + (i % 4);
    const hist = ("1".repeat(ok) + "0".repeat(bad)).slice(-10);
    const slow = i % 6 === 1;
    notes[statKey(it.n, it.clef)] = { ok, bad, sec: (slow ? 4.6 : 1.8) * ok, timed: ok, last: d(-1), hist, hsec: Array(Math.min(ok, 10)).fill(slow ? 4.6 : 1.8) };
  });
  return notes;
}

// Fortschritt nach etwa zwei Wochen: Noten lesen ganz, Notenwerte bis 5, Intervalle bis 3, Tonleitern 1;
// im Karteikasten die geschafften Stufen ohne Hilfen, nichts fällig (nächste morgen)
function fort() {
  const s = base();
  Object.assign(s, { xp: 2140, dayStreak: 4, lastDay: d(-1), answered: 380, correct: 312, bestCombo: 14, blitzRecord: 21, current: "intervall-3" });
  s.levels = {
    "noten-1": lv(10, 3, d(-12)), "noten-2": lv(9, 2, d(-11)), "noten-3": lv(9, 2, d(-9)), "noten-4": lv(8, 2, d(-8)),
    "noten-5": lv(9, 1, d(-8)), "noten-6": lv(8, 2, d(-6)), "noten-7": lv(8, 2, d(-5)), "noten-8": lv(7, 2, d(-4)),
    "notenwerte-1": lv(10, 1, d(-10)), "notenwerte-2": lv(9, 1, d(-10)), "notenwerte-3": lv(9, 1, d(-9)),
    "notenwerte-4": lv(8, 2, d(-7)), "notenwerte-5": lv(9, 1, d(-6)),
    "intervall-1": lv(9, 2, d(-4)), "intervall-2": lv(8, 1, d(-3)), "intervall-3": lv(8, 1, d(-2)),
    "tonleitern-1": lv(8, 1, d(-2)),
  };
  s.rep = {
    "noten-1": { fach: 5, faellig: d(20), zuletzt: d(-10) }, "noten-2": { fach: 4, faellig: d(10), zuletzt: d(-4) },
    "noten-3": { fach: 3, faellig: d(5), zuletzt: d(-2) }, "noten-4": { fach: 3, faellig: d(4), zuletzt: d(-3) },
    "noten-5": { fach: 3, faellig: d(6), zuletzt: d(-1) }, "noten-6": { fach: 2, faellig: d(2), zuletzt: d(-1) },
    "noten-7": { fach: 2, faellig: d(3), zuletzt: null }, "notenwerte-3": { fach: 3, faellig: d(3), zuletzt: d(-4) },
    "notenwerte-5": { fach: 2, faellig: d(2), zuletzt: d(-1) }, "intervall-2": { fach: 1, faellig: d(1), zuletzt: d(-3) },
  };
  s.notes = someNotes();
  return s;
}
const NICHTS = fort();
// vier Stufen fällig: die Runde nimmt drei (Namensraster, Auswahlknöpfe, zwei Schritte), danach „Noch eine Wiederholung“
// mit der vierten (zwei Knöpfe)
function faellig() {
  const s = fort();
  Object.assign(s.levels, { "intervall-4": lv(8, 1, d(-3)), "tonleitern-2": lv(9, 1, d(-3)), "tonleitern-3": lv(8, 1, d(-2)) });
  Object.assign(s.rep, {
    "noten-7": { fach: 2, faellig: d(-2), zuletzt: d(-5) }, "notenwerte-5": { fach: 1, faellig: d(-1), zuletzt: d(-2) },
    "intervall-4": { fach: 2, faellig: d(0), zuletzt: d(-3) }, "tonleitern-3": { fach: 1, faellig: d(0), zuletzt: d(-2) },
  });
  return s;
}
// weiter fortgeschritten: alle Pakete gespielt; fällig Buchstaben (Noten lesen 3), nur Namensraster (Intervalle 9) und
// lange Auswahltexte (Dreiklänge 6)
function weit() {
  const s = fort();
  for (const p of PACKS) for (const l of p.levels) if (!s.levels[l.id]) s.levels[l.id] = lv(8, 1, d(-2));
  Object.assign(s.rep, {
    "noten-3": { fach: 3, faellig: d(-1), zuletzt: d(-8) }, "intervall-9": { fach: 2, faellig: d(0), zuletzt: d(-3) },
    "akkorde-6": { fach: 1, faellig: d(0), zuletzt: d(-1) },
  });
  return s;
}
// Startkarten mit „Dafür brauchst du“: alle Stufen offen (Demo), Grundlagen nie gespielt → Empfehlung „noch nicht geübt“
const OFFEN = { ...base(), unlockAll: true };
const NEEDY = ["intervall-3", "tonleitern-12", "akkorde-1", "notenwerte-6"];
// … Grundlagen geschafft (9 von 10, gestern, nicht fällig) → keine Empfehlung; mit noten-7 fällig bzw. zuletzt 6 von 10
function grundlagenOk(extra = {}) {
  const s = { ...base(), unlockAll: true };
  for (const id of ["intervall-2", "noten-7", "tonleitern-3", "intervall-4", "noten-8", "notenwerte-3", "notenwerte-5"]) {
    s.levels[id] = lv(9, 1, d(-1));
    s.rep[id] = { fach: 2, faellig: d(2), zuletzt: d(-1) };
  }
  if (extra.faellig) s.rep["noten-7"] = { fach: 2, faellig: d(0), zuletzt: d(-3) };
  if (extra.schwach) s.levels["noten-7"] = { ...lv(6, 2, d(-1)), best: 9, stars: 3 };
  return s;
}

/* ---------- Ablauf ---------- */

const names = new Map(); // Name → { no, desc }
const errors = [];
let shots = 0, tiles = 0;
const TEIL = 1200;

async function scene(browser, look, name, fn) {
  if (NUR && !NUR.test(name)) return;
  const contexts = [];
  // Neue Seite mit Spielstand (null = leerer Speicher) und Adresse (z. B. "#klasse=6")
  const page = async (state, hash = "") => {
    const ctx = await browser.newContext({
      viewport: { width: look.width, height: 900 }, deviceScaleFactor: SKALA, colorScheme: look.scheme,
      serviceWorkers: "block", locale: "de-DE", timezoneId: TZ,
    });
    contexts.push(ctx);
    await ctx.addInitScript(SEED_RANDOM, SEED);
    await ctx.addInitScript(HOLD_TIMERS);
    await ctx.addInitScript(SEED_STATE, { key: KEY, state: state === null ? null : JSON.stringify(state) });
    const pg = await ctx.newPage();
    await pg.clock.setFixedTime(UHR);
    pg.on("pageerror", (e) => errors.push(`${look.dir} ${name}: ${e}`));
    pg.on("console", (m) => { if (m.type() === "error") errors.push(`${look.dir} ${name}: ${m.text()}`); });
    await pg.goto(BASE + hash);
    await pg.evaluate(() => document.fonts.ready);
    await pg.waitForTimeout(400);
    return pg;
  };
  // Ganze Seite: das Fenster wächst auf die Höhe der Seite (so steht die feste untere Leiste wirklich unten und
  // nicht mitten über dem Inhalt, wie bei fullPage), danach wieder 900 px. Lange Seiten zusätzlich in Teilen von
  // TEIL px Höhe (mit Überlappung) in <ordner>/teile/, damit sie verkleinert lesbar bleiben. Mit offenem Dialog
  // (Bestätigung des Links, großer QR-Code) nur der Bildschirm, wie die Schülerin oder die Lehrkraft ihn sieht.
  const shot = async (pg, file, desc) => {
    const modal = await pg.evaluate(() => !!document.querySelector("dialog[open]"));
    if (!names.has(file)) names.set(file, { no: names.size + 1, desc: modal ? `${desc} (nur der Bildschirm, 900 px hoch, Dialog offen)` : desc });
    const { no } = names.get(file);
    const stem = `${String(no).padStart(3, "0")}-${file}`;
    await pg.evaluate(() => window.scrollTo(0, 0));
    if (modal) {
      await pg.waitForTimeout(150);
      await pg.screenshot({ path: join(OUT, look.dir, `${stem}.png`), animations: "disabled" });
      shots++;
      return;
    }
    const height = () => pg.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    let h = await height();
    for (let i = 0; i < 3; i++) {
      await pg.setViewportSize({ width: look.width, height: Math.max(900, h) });
      await pg.waitForTimeout(150);
      const h2 = await height();
      if (h2 <= Math.max(900, h)) break;
      h = h2;
    }
    h = Math.max(900, h);
    await pg.screenshot({ path: join(OUT, look.dir, `${stem}.png`), animations: "disabled" });
    if (h > TEIL * 1.25) {
      mkdirSync(join(OUT, look.dir, "teile"), { recursive: true });
      for (let y = 0, k = 1; y < h - 100; y += TEIL - 100, k++) {
        await pg.screenshot({ path: join(OUT, look.dir, "teile", `${stem}-${k}.png`), animations: "disabled",
          clip: { x: 0, y, width: look.width, height: Math.min(TEIL, h - y) } });
        tiles++;
      }
    }
    await pg.setViewportSize({ width: look.width, height: 900 });
    await pg.waitForTimeout(100);
    shots++;
  };
  const need = async (pg, sel, what) => { if (!(await vis(pg, sel))) { errors.push(`${look.dir} ${name}: ${what} fehlt (${sel})`); return false; } return true; };
  try {
    await fn({ page, shot, need, look });
  } catch (e) {
    errors.push(`${look.dir} ${name}: ${e.message.split("\n")[0]}`);
  }
  for (const c of contexts) await c.close();
}

// kleine Bausteine
const home = async (pg) => { await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(200); };
const openLevel = async (pg, id) => { await home(pg); await pg.click(`.level[data-id="${id}"]`); await pg.waitForTimeout(250); };
const startRound = async (pg) => { await pg.click("#pStart"); await pg.waitForSelector("#pPlay:not([hidden])"); await pg.waitForTimeout(250); };
const openHelps = async (pg) => {
  if ((await vis(pg, "#pHelps")) && !(await pg.evaluate("document.querySelector('#pHelps').open"))) { await pg.click("#pHelps summary"); await pg.waitForTimeout(250); }
};
const hold = (pg) => pg.evaluate("window.__hold = true");
const release = (pg) => pg.evaluate("window.__release()");
// sichtbare Knöpfe „Nächste Aufgabe“ (wie NEXT_COUNT in ueberlauf.mjs)
const nextCount = (pg) => pg.evaluate(() => [...document.querySelectorAll("button")].filter((b) => {
  if (b.textContent.trim() !== "Nächste Aufgabe") return false;
  for (let a = b; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === "none" || s.visibility === "hidden") return false;
    if (a.tagName === "DETAILS" && !a.open && a !== b) return false; }
  const r = b.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5;
}).length);
// Aufgabe beantworten und nach den Schritten fotografieren. shots: { [s]: [datei, beschreibung] } je Schritt (Index)
// oder "last" für den letzten Schritt. Richtige Antworten halten das Weitergehen an, bis das Foto da ist.
async function answerShot(pg, shot, right, files = {}) {
  return answerQuestion(pg, right, async (label, s) => {
    const info = await pg.evaluate("({ steps: window.__q.steps ? window.__q.steps.length : 1 })");
    const f = s === info.steps - 1 ? files.last || files[s] : files[s];
    if (f) await shot(pg, f[0], f[1]);
    await release(pg);
  }, errors, async (s, want) => { if (want) await hold(pg); });
}
// Vorführung öffnen und jedes Bild fotografieren (prefix-bild-01 …); gibt die Zahl der Bilder zurück
async function demoFrames(pg, shot, prefix, desc) {
  await pg.click("#pHelpsBody [data-demo-btn]"); await pg.waitForTimeout(350);
  let k = 1;
  await shot(pg, `${prefix}-bild-${String(k).padStart(2, "0")}`, `${desc}, Bild ${k}`);
  const next = pg.locator('#pHelpsBody .demo [data-act="next"]');
  while (k < 60 && (await next.isVisible()) && !(await next.isDisabled())) {
    await next.click(); await pg.waitForTimeout(120); k++;
    await shot(pg, `${prefix}-bild-${String(k).padStart(2, "0")}`, `${desc}, Bild ${k}`);
  }
  return k;
}
const title = (id) => { for (const p of PACKS) { const l = p.levels.find((x) => x.id === id); if (l) return `${p.title}, Stufe ${l.no} „${l.title}“`; } return id; };

const SCENES = [
  ["startseite", async ({ page, shot, need }) => {
    let pg = await page(LEER);
    await shot(pg, "start-leer", "Startseite, leerer Spielstand: Karte „Heute“ mit „Starten: Noten lesen, Stufe 1“ und dem Satz zum Kasten, alle Pakete");
    pg = await page(faellig());
    await need(pg, "#homeReview", "Knopf „Wiederholung starten“");
    await shot(pg, "start-heute-faellig", "Startseite, vier Stufen fällig: Karte „Wiederholen“ (10 Aufgaben aus drei Stufen), „Weiter üben“, „↻ wieder dran“ an den fälligen Stufen");
    pg = await page(NICHTS);
    await shot(pg, "start-nichts-faellig", "Startseite, nichts fällig: „Bereit für eine Runde?“, Serie (4 Tage, bis gestern), „Nächste Wiederholung: morgen“");
    pg = await page(withKlasse(LEER, 5));
    await shot(pg, "start-jahrgang-5", "Startseite mit Jahrgang 5 (neu, ohne Fortschritt): „Jetzt dran“ mit Paketnamen, „Darüber hinaus“ zugeklappt");
    pg = await page(withKlasse(fort(), 7));
    await shot(pg, "start-jahrgang-7", "Startseite mit Jahrgang 7 (Fortschritt nach zwei Wochen): „Jetzt dran“ (Dreiklänge 5 und 6), „Schon dran gewesen“ je Paket");
    pg = await page(withKlasse(fort(), 9));
    await shot(pg, "start-jahrgang-9", "Startseite mit Jahrgang 9: „Jetzt dran“ leer – „In Jahrgang 9 kommt nichts Neues dazu …“");
    if (await need(pg, '#levelList [data-sec="hinaus"] > summary', "„Darüber hinaus“")) {
      await pg.click('#levelList [data-sec="hinaus"] > summary'); await pg.waitForTimeout(200);
      await shot(pg, "start-jahrgang-9-darueber-hinaus", "Startseite mit Jahrgang 9, „Darüber hinaus“ aufgeklappt");
    }
  }],
  ["startkarten", async ({ page, shot, need }) => {
    let pg = await page(OFFEN);
    for (const id of NEEDY) {
      await openLevel(pg, id); await need(pg, "#pBasicsWhy", "Grund der Empfehlung");
      await shot(pg, `startkarte-${id}-mit-empfehlung`, `Startkarte ${title(id)}: „Dafür brauchst du: …“, Empfehlung (Grundlage noch nicht geübt), „Grundlagen wiederholen“ vor „Runde starten“`);
    }
    pg = await page(grundlagenOk());
    for (const id of NEEDY) {
      await openLevel(pg, id); await need(pg, "#pNeeds", "„Dafür brauchst du“");
      await shot(pg, `startkarte-${id}-ohne-empfehlung`, `Startkarte ${title(id)}: „Dafür brauchst du: …“ ohne Empfehlung (Grundlagen geschafft), „Grundlagen wiederholen“ als ruhiger Knopf unter „Runde starten“`);
    }
    pg = await page(grundlagenOk({ faellig: true }));
    await openLevel(pg, "intervall-3");
    await shot(pg, "startkarte-intervall-3-grund-faellig", "Startkarte Intervalle 3: Empfehlung, weil „Noten mit Vorzeichen“ wieder dran ist");
    pg = await page(grundlagenOk({ schwach: true }));
    await openLevel(pg, "intervall-3");
    await shot(pg, "startkarte-intervall-3-grund-schwach", "Startkarte Intervalle 3: Empfehlung, weil „Noten mit Vorzeichen“ zuletzt unter 8 von 10 lag");
  }],
  ["wiederholen", async ({ page, shot, need }) => {
    // Runde 1: Noten lesen 7 alles richtig (sitzt), Notenwerte 5 zweimal daneben („noch wacklig“ mit Knopf zum Üben),
    // Intervalle 4 einmal Teilerfolg („fast“: ein Fehler bei 3 oder 4 Aufgaben, Korrektur W-B2; ohne Knopf, Nachprüfung)
    let pg = await page(faellig());
    await pg.click("#homeReview"); await pg.waitForTimeout(300);
    const seen = new Set(), wrong = new Set();
    let nw5 = 0;
    for (let k = 0; k < 12 && !(await vis(pg, "#pResult")); k++) {
      const info = await pg.evaluate(CUR);
      const first = !seen.has(info.id); seen.add(info.id);
      if (first) await shot(pg, `wiederholen-aufgabe-${info.id}`, `Runde „Wiederholen“, erste Aufgabe aus ${title(info.id)} (Herkunftszeile über der Notenzeile)`);
      let right = true, files = {};
      if (info.id === "notenwerte-5" && nw5++ < 2) { right = false; if (!wrong.has(info.id)) files = { last: ["wiederholen-daneben-notenwerte-5", "Runde „Wiederholen“, nach „daneben“ (Notenwerte 5): Auflösung, ✓ am richtigen Knopf, „Nächste Aufgabe“"] }; }
      if (info.id === "intervall-4" && !wrong.has(info.id)) { right = [false, true]; files = { 0: ["wiederholen-daneben-schritt-1-intervall-4", "Runde „Wiederholen“, Intervalle 4: erster Schritt daneben, „Weiter zu Schritt 2“"], last: ["wiederholen-teilerfolg-intervall-4", "Runde „Wiederholen“, Intervalle 4: nur der zweite Schritt richtig (Teilerfolg, gold)"] }; }
      if (info.id === "noten-7" && first) files = { last: ["wiederholen-richtig-noten-7", "Runde „Wiederholen“, Noten lesen 7 richtig (Namensraster)"] };
      if (right !== true) wrong.add(info.id);
      await answerShot(pg, shot, right, files);
      await goOn(pg);
    }
    if (await need(pg, "#pResult .review-line", "Urteilszeilen")) {
      await shot(pg, "wiederholen-ergebnis-sitzt-wacklig", "Ergebniskarte „Wiederholung beendet“ (je Stufe „… von …“): Noten lesen 7 „sitzt“, Notenwerte 5 „noch wacklig“ mit „Stufe 4 mit Hilfen üben“, Intervalle 4 „fast“ ohne Knopf, „Noch eine Wiederholung“");
    }
    // Runde 2 über „Noch eine Wiederholung“: nur Tonleitern 3 (zwei Knöpfe), alles richtig
    if (await need(pg, "#rMore", "„Noch eine Wiederholung“")) {
      await pg.click("#rMore"); await pg.waitForTimeout(300);
      await shot(pg, "wiederholen-2-aufgabe-tonleitern-3", "Zweite Runde „Wiederholen“ (eine Stufe, 10 Aufgaben): Tonleitern 3, zwei Antwortknöpfe");
      for (let k = 0; k < 12 && !(await vis(pg, "#pResult")); k++) { await answerQuestion(pg, true, null, errors); await goOn(pg); }
      await shot(pg, "wiederholen-2-ergebnis-sitzt", "Ergebniskarte der zweiten Runde: Tonleitern 3 „sitzt · wieder in 3 Tagen“, nur „Übersicht“");
      await home(pg);
      await shot(pg, "start-nach-wiederholung", "Startseite nach beiden Runden: nichts mehr fällig, „Nächste Wiederholung: morgen“");
    }
    // Runde 3: Buchstaben (Noten lesen 3), nur Namensraster (Intervalle 9), lange Auswahltexte (Dreiklänge 6)
    pg = await page(weit());
    await pg.click("#homeReview"); await pg.waitForTimeout(300);
    seen.clear();
    for (let k = 0; k < 12 && !(await vis(pg, "#pResult")); k++) {
      const info = await pg.evaluate(CUR);
      const first = !seen.has(info.id); seen.add(info.id);
      if (first) await shot(pg, `wiederholen-aufgabe-${info.id}`, `Runde „Wiederholen“, erste Aufgabe aus ${title(info.id)}`);
      const right = !(first && info.id === "intervall-9");
      await answerShot(pg, shot, right, right ? {} : { last: ["wiederholen-daneben-intervall-9", "Runde „Wiederholen“, Intervalle 9 daneben (nur Namensraster)"] });
      await goOn(pg);
    }
    await shot(pg, "wiederholen-3-ergebnis", "Ergebniskarte der dritten Runde: Noten lesen 3 und Dreiklänge 6 „sitzt“, Intervalle 9 „fast“");
    // Runde 4 mit der Eingabe „Klaviatur“ (Prüfung Schritt 13b): Noten lesen 3 auf der Klaviatur, Intervalle 9 bleibt
    // beim Namensraster, Dreiklänge 6 mit Auswahlknöpfen – je erste Aufgabe, dazu Noten lesen 3 nach „daneben“
    pg = await page({ ...weit(), input: "keys" });
    await pg.click("#homeReview"); await pg.waitForTimeout(300);
    seen.clear();
    for (let k = 0; k < 12 && !(await vis(pg, "#pResult")); k++) {
      const info = await pg.evaluate(CUR);
      const first = !seen.has(info.id); seen.add(info.id);
      if (first) await shot(pg, `wiederholen-klaviatur-aufgabe-${info.id}`, `Runde „Wiederholen“ mit der Eingabe „Klaviatur“, erste Aufgabe aus ${title(info.id)}${info.id === "noten-3" ? " (Klaviatur statt Buchstaben)" : info.id === "intervall-9" ? " (Namensraster bleibt)" : " (Auswahlknöpfe, keine Klaviatur)"}`);
      const right = !(first && info.id === "noten-3");
      await answerShot(pg, shot, right, right ? {} : { last: ["wiederholen-klaviatur-daneben-noten-3", "Runde „Wiederholen“ mit Klaviatur, Noten lesen 3 daneben"] });
      await goOn(pg);
    }
    await need(pg, "#pResult .review-line", "Urteilszeilen der Runde mit Klaviatur");
  }],
  ["grundlagen", async ({ page, shot, need }) => {
    const pg = await page(fort());
    await openLevel(pg, "intervall-3");
    await shot(pg, "grundlagen-startkarte-intervall-3", "Startkarte Intervalle 3 im Fortschritt nach zwei Wochen: „Dafür brauchst du“, „Grundlagen wiederholen · 6 Aufgaben“ ruhig");
    await pg.click("#pBasics"); await pg.waitForTimeout(300);
    const seen = new Set();
    let wrongShot = false;
    for (let k = 0; k < 8 && !(await vis(pg, "#pResult")); k++) {
      const info = await pg.evaluate(CUR);
      if (!seen.has(info.id)) { seen.add(info.id); await shot(pg, `grundlagen-aufgabe-${info.id}`, `Runde „Grundlagen wiederholen“ für Intervalle 3, Aufgabe aus ${title(info.id)}`); }
      const right = k % 2 === 0;
      await answerShot(pg, shot, right, !right && !wrongShot ? { last: ["grundlagen-daneben", "Runde „Grundlagen wiederholen“ nach „daneben“"] } : {});
      if (!right) wrongShot = true;
      await goOn(pg);
    }
    if (await need(pg, "#rBack", "„Zurück zu Stufe 3“")) await shot(pg, "grundlagen-ergebnis", "Ergebniskarte „Grundlagen wiederholt“: Richtige je Stufe, „Zurück zu Stufe 3“");
  }],
  ["ergebnisse", async ({ page, shot, need }) => {
    let pg = await page(fort());
    await openLevel(pg, "intervall-4"); await startRound(pg);
    for (let k = 0; k < 12 && !(await vis(pg, "#pResult")); k++) { await answerQuestion(pg, false, null, errors); await goOn(pg); }
    if (await need(pg, "#pResult .gap-line", "Fehlermuster")) await shot(pg, "ergebnis-fehlermuster", "Ergebniskarte einer normalen Runde (Intervalle 4, alles daneben) mit Fehlermuster und „Grundlagen wiederholen“");
    pg = await page(LEER);
    await openLevel(pg, "noten-1"); await startRound(pg);
    for (let k = 0; k < 12 && !(await vis(pg, "#pResult")); k++) { await answerQuestion(pg, true, null, errors); await goOn(pg); }
    if (await need(pg, "#rRepeat", "„Geschafft – kommt morgen …“")) await shot(pg, "ergebnis-geschafft", "Ergebniskarte Noten lesen 1, 10 von 10: „Geschafft – kommt morgen zum Wiederholen wieder.“, „Stufe 2 ist offen.“");
  }],
  ["lernen", async ({ page, shot }) => {
    const pg = await page(fort());
    await pg.click('.tab[data-view="learn"]'); await pg.waitForTimeout(400);
    const tabs = await pg.evaluate("[...document.querySelectorAll('#lTabs [role=tab]')].map((e) => [e.dataset.tab, e.textContent.trim()])");
    for (const [t, label] of tabs) {
      await pg.click(`#ltab-${t}`); await pg.waitForTimeout(350);
      if (await vis(pg, "#lClefs")) {
        await pg.click("#lTreble"); await pg.waitForTimeout(300);
        await shot(pg, `lernen-${t}-violin`, `Lernen, Reiter „${label}“, Violinschlüssel`);
        await pg.click("#lBass"); await pg.waitForTimeout(300);
        await shot(pg, `lernen-${t}-bass`, `Lernen, Reiter „${label}“, Bassschlüssel`);
      } else {
        await shot(pg, `lernen-${t}`, `Lernen, Reiter „${label}“ (ohne Schlüsselwahl)${t === "notenwerte" ? "; Lerntafeln „So erkennst du einen Notenwert“, „Notenwerte und Pausen“, „So bestimmst du die Dauer“" : ""}`);
      }
    }
  }],
  ["notenwerte", async ({ page, shot }) => {
    const s = fort();
    Object.assign(s.levels, { "notenwerte-6": lv(8, 1, d(-1)) });
    const pg = await page(s);
    for (const no of [4, 5, 6, 7]) {
      const id = `notenwerte-${no}`, t = title(id);
      await openLevel(pg, id);
      await shot(pg, `${id}-startkarte`, `Startkarte ${t}`);
      await startRound(pg); await openHelps(pg);
      await shot(pg, `${id}-frage`, `${t}: Frage${(await vis(pg, "#pHelps")) ? " mit offenen Hilfen" : ""}`);
      const two = (await pg.evaluate(CUR)).steps > 1;
      await answerShot(pg, shot, true, { ...(two ? { 0: [`${id}-richtig-schritt-1`, `${t}: erster Schritt richtig`] } : {}), last: [`${id}-richtig`, `${t}: Rückmeldung „Richtig!“`] });
      await goOn(pg); await openHelps(pg);
      await answerShot(pg, shot, false, { ...(two ? { 0: [`${id}-daneben-schritt-1`, `${t}: erster Schritt daneben, „Weiter zu Schritt 2“`] } : {}), last: [`${id}-daneben`, `${t}: Rückmeldung nach „daneben“ mit Auflösung`] });
      if (await vis(pg, "#pHelpsBody [data-demo-btn]")) {
        await demoFrames(pg, shot, `${id}-vorfuehrung`, `${t}: Vorführung „So bestimmst du die Dauer“ zur Aufgabe`);
      }
      await goOn(pg);
    }
  }],
  ["intervalle-3", async ({ page, shot }) => {
    const pg = await page(fort());
    await openLevel(pg, "intervall-3"); await startRound(pg); await openHelps(pg);
    await shot(pg, "intervalle-3-frage-hilfen", "Intervalle 3: Frage mit offenen Hilfen (Klaviatur, Tabelle, „Vorführen“ erst nach der Antwort)");
    await answerShot(pg, shot, true, { last: ["intervalle-3-richtig", "Intervalle 3: nach der Antwort, „Vorführen“ frei, ein Knopf „Nächste Aufgabe“"] });
    await pg.click("#pHelpsBody [data-demo-btn]"); await pg.waitForTimeout(350);
    const n = await nextCount(pg);
    if (n !== 1) errors.push(`Intervalle 3 mit offener Vorführung: ${n}× „Nächste Aufgabe“ statt 1×`);
    await shot(pg, "intervalle-3-vorfuehrung-offen", `Intervalle 3 mit offener Vorführung: genau ein Knopf „Nächste Aufgabe“ (am Ende der Vorführung, gezählt: ${n})`);
    const next = pg.locator('#pHelpsBody .demo [data-act="next"]');
    for (let k = 0; k < 60 && (await next.isVisible()) && !(await next.isDisabled()); k++) { await next.click(); await pg.waitForTimeout(80); }
    await shot(pg, "intervalle-3-vorfuehrung-ende", "Intervalle 3: letztes Bild der Vorführung mit „Nächste Aufgabe“");
  }],
  ["lehrkraft", async ({ page, shot, need }) => {
    const pg = await page(fort(), "#lehrkraft");
    await need(pg, "#view-lehrkraft", "Seite „Für Lehrkräfte“");
    await shot(pg, "lehrkraft-voreinstellung", "Seite „Für Lehrkräfte“ (Anrede „Sie“): Voreinstellung Jahrgang 5, Link und QR-Code, Link zum Entfernen");
    await pg.selectOption("#tJahrgang", "6"); await pg.check("#tMug"); await pg.waitForTimeout(150);
    await shot(pg, "lehrkraft-jahrgang-6-mug", "Seite „Für Lehrkräfte“: Jahrgang 6, Musisches Gymnasium");
    await pg.uncheck("#tMug"); await pg.selectOption("#tJahrgang", "7"); await pg.waitForTimeout(100);
    await pg.selectOption('#tDran select[data-pack="intervalle"]', "6"); await pg.selectOption('#tDran select[data-pack="akkorde"]', "3");
    await pg.waitForTimeout(150);
    await need(pg, "#tCustom", "Hinweis „Eigene Auswahl“");
    await shot(pg, "lehrkraft-eigene-auswahl", "Seite „Für Lehrkräfte“: Jahrgang 7 mit eigener Auswahl (Intervalle bis 6, Dreiklänge bis 3), Link nennt nur die Abweichungen");
    await pg.click("#tBig"); await pg.waitForTimeout(300);
    await need(pg, "#qrBig", "großer QR-Code");
    await shot(pg, "lehrkraft-qr-gross", "„QR-Code groß zeigen“: Dialog füllt die Breite (für Beamer und Tafel), „Schließen“");
  }],
  ["dialog", async ({ page, shot, need }) => {
    let pg = await page(LEER, "#klasse=6");
    if (await need(pg, "#klasseDialog", "Dialog")) await shot(pg, "dialog-jahrgang-setzen", "Link der Lehrkraft #klasse=6 auf einem neuen Gerät: „Einstellung deiner Lehrkraft übernehmen?“, „Jahrgang 6“");
    pg = await page(withKlasse(fort(), 5), "#klasse=7&zweig=mug");
    if (await need(pg, "#klasseDialog", "Dialog")) await shot(pg, "dialog-jahrgang-aendern", "Link #klasse=7&zweig=mug bei gesetztem Jahrgang 5: mit „Bisher: Jahrgang 5.“");
    pg = await page(withKlasse(fort(), 7), "#klasse=keine");
    if (await need(pg, "#klasseDialog", "Dialog")) await shot(pg, "dialog-jahrgang-entfernen", "Link #klasse=keine: „Jahrgang entfernen?“, „Entfernen“ / „Nicht entfernen“");
    pg = await page(fort(), "#klasse=99");
    if (await need(pg, "#klasseBar", "Hinweisleiste")) await shot(pg, "hinweis-link-passt-nicht", "Link #klasse=99: Leiste „Dieser Link funktioniert hier nicht. …“ (Grund, nächster Schritt, „Dein Fortschritt bleibt.“) über der unteren Leiste, Spielstand unverändert");
  }],
  ["statistik", async ({ page, shot, need }) => {
    const pg = await page(withKlasse(fort(), 6));
    await pg.click('.tab[data-view="stats"]'); await pg.waitForTimeout(400);
    await need(pg, "#sLevels .box", "Kästchen");
    await shot(pg, "statistik-faecher-jahrgang", "Statistik: Kacheln, Notenkarte, schwache Stellen, je Stufe mit Kästchen (Fach 1 bis 5) und „zuletzt geübt am“, am Ende „Jahrgang 6 (über den Link deiner Lehrkraft)“ und „Für Lehrkräfte“");
  }],
  ["blitz", async ({ page, shot }) => {
    const pg = await page(fort());
    await pg.click('.tab[data-view="blitz"]'); await pg.waitForTimeout(300);
    await shot(pg, "blitz-start", "Blitz: Startkarte");
    await pg.click("#bStart"); await pg.waitForTimeout(400);
    await shot(pg, "blitz-frage", "Blitz: erste Note");
  }],
  ["stufen", async ({ page, shot }) => {
    const pg = await page(OFFEN);
    for (const p of PACKS) for (const l of p.levels) {
      await openLevel(pg, l.id);
      // jede Startkarte mit „Dafür brauchst du“ (Prüfung Schritt 13b; die vier aus NEEDY stehen schon oben)
      if (!NEEDY.includes(l.id) && (await vis(pg, "#pNeeds"))) await shot(pg, `startkarte-${l.id}`, `Startkarte ${p.title}, Stufe ${l.no} „${l.title}“: „Dafür brauchst du: …“ mit Empfehlung (nichts gespielt, alle Stufen offen)`);
      await startRound(pg);
      await shot(pg, `stufe-${l.id}`, `${p.title}, Stufe ${l.no} „${l.title}“: erste Aufgabe${l.helps && l.helps.length ? " (Hilfen zugeklappt)" : ""}`);
    }
  }],
  // Nachprüfung (am Ende, damit die Nummern 001–181 der Berichte gleich bleiben): „Grundlagen wiederholen“ mit einer
  // fälligen Grundlage (Noten lesen 7), alles richtig → sie zählt als Wiederholung, das Urteil steht in ihrer Zeile
  ["grundlagen-wiederholung", async ({ page, shot, need }) => {
    const pg = await page(grundlagenOk({ faellig: true }));
    await openLevel(pg, "intervall-3");
    await pg.click("#pBasics"); await pg.waitForTimeout(300);
    for (let k = 0; k < 8 && !(await vis(pg, "#pResult")); k++) { await answerQuestion(pg, true, null, errors); await goOn(pg); }
    if (await need(pg, "#pResult .review-line", "Zeilen der Grundlagen")) await shot(pg, "grundlagen-ergebnis-zaehlt-als-wiederholung", "Ergebniskarte „Grundlagen wiederholt“, alles richtig: Noten lesen 7 war fällig und zählt als Wiederholung („· ✓ sitzt · wieder in 7 Tagen“ in ihrer Zeile), Intervalle 2 nur „3 von 3“, „Zurück zu Stufe 3“ als Hauptknopf");
  }],
];

// nur die eigenen Ordner leeren (OUT selbst kann ein anderer Ordner sein)
for (const l of LOOKS) {
  if (!NUR) rmSync(join(OUT, l.dir), { recursive: true, force: true });
  mkdirSync(join(OUT, l.dir), { recursive: true });
}
const browser = await launch(playwright);
const t0 = Date.now();
for (const look of LOOKS) for (const [name, fn] of SCENES) await scene(browser, look, name, fn);
await browser.close();

const repo = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
let commit = "?";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: repo }).toString().trim();
  // nur, was die Bilder ändert (App und Skripte); Notizen wie LESSONS.md oder docs/PLAN.md zählen nicht
  if (execSync("git status --porcelain --untracked-files=no -- index.html css src fonts icons docs/screens", { cwd: repo }).toString().trim()) commit += " (mit nicht eingetragenen Änderungen an App oder Skripten)";
} catch { /* ohne git */ }
const rows = [...names.entries()].map(([file, { no, desc }]) => `| ${String(no).padStart(3, "0")} | ${file} | ${desc} |`);
writeFileSync(join(OUT, "index.md"), [
  "# Notenheld – Bildschirmfotos für die Prüfung (Welle 11)",
  "",
  `Stand: Commit ${commit}, erzeugt mit docs/screens/pruefung.mjs am ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.`,
  `Uhr der App: ${HEUTE}, 10:00 Uhr (${TZ}), fest. Zufall fest (SEED ${SEED}): beide Ordner zeigen dieselben Aufgaben.`,
  `Ordner: ${LOOKS.map((l) => `\`${l.dir}/\` (${l.width} px, ${l.scheme === "dark" ? "dunkel" : "hell"})`).join(", ")}; jede Datei heißt NNN-name.png, ganze Seite, ${SKALA} Pixel je CSS-Pixel.`,
  `Seiten über ${TEIL * 1.25} px Höhe zusätzlich in Teilen zu ${TEIL} px (100 px Überlappung): \`<ordner>/teile/NNN-name-1.png\`, \`-2\` … (verkleinert lesbar).`,
  `Spielstände: leer, „nach zwei Wochen“ (Noten lesen ganz, Notenwerte bis 5, Intervalle bis 3), mit fälligen Stufen, mit Jahrgang 5/7/9 (Voreinstellung nach klasse.js), einmal mit der Eingabe „Klaviatur“.`,
  `Alle Zahlen in diesen Spielständen (XP, Serie, Sterne, Trefferquoten, Notenkarte, Fächer, Tage) sind erfunden: Prüfdaten für die Darstellung, keine Ergebnisse von Schülerinnen oder Schülern.`,
  "",
  "| Nr | Name | zeigt |",
  "|---|---|---|",
  ...rows,
  "",
  errors.length ? `## Fehler beim Erzeugen\n\n${errors.map((e) => `- ${e}`).join("\n")}` : "Keine Fehler beim Erzeugen.",
  "",
].join("\n"));
console.log(`${shots} Bilder (${names.size} Ansichten × ${LOOKS.length}) und ${tiles} Teilbilder in ${OUT}, Index: ${join(OUT, "index.md")} (${Math.round((Date.now() - t0) / 1000)} s)`);
errors.forEach((e) => console.log(`  Fehler: ${e}`));
process.exit(errors.length ? 1 : 0);
