// Screenshots der fünf Bereiche, hell und dunkel, für README und Release.
//
// Playwright ist KEINE Abhängigkeit der App (package.json bleibt ohne dependencies).
// Es muss nur für dieses Skript verfügbar sein, z. B. global installiert:
//   npm install -g playwright && npx playwright install chromium
//
// Aufruf aus dem Projektordner, während ein Server läuft:
//   python3 -m http.server 8080 &
//   node docs/screens/screenshots.mjs            (oder: BASE=http://localhost:8080/ node …)
//
// Ergebnis: docs/screens/<bereich>-hell.png und <bereich>-dunkel.png
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// Playwright auch aus der globalen Installation finden
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}

const OUT = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "http://localhost:8080/";

// Plausibler Fortschritt nach ein paar Tagen Üben (Form wie fresh() in src/store.js).
// Sterne folgen starsFor: 9 richtig = 3 Sterne, 8 = 2, 6 = 1.
const today = new Date().toISOString().slice(0, 10);
const STATE = {
  xp: 640, dayStreak: 3, lastDay: today,
  levels: {
    "noten-1": { stars: 3, best: 9, played: 3 },
    "noten-2": { stars: 2, best: 8, played: 2 },
    "noten-3": { stars: 1, best: 6, played: 1 },
    "notenwerte-1": { stars: 2, best: 8, played: 1 },
  },
  notes: {
    "F (f'', Violin)": { ok: 5, bad: 3 },
    "C (c'', Violin)": { ok: 6, bad: 2 },
    "H (h', Violin)": { ok: 7, bad: 1 },
  },
  answered: 70, correct: 56, bestCombo: 9, blitzRecord: 18,
  unlockAll: false, muted: true, input: "letters", current: "noten-1",
};

// Je Bereich: Tab anklicken, dann optional weitere Schritte
const SHOTS = [
  { name: "start", view: "home" },
  { name: "ueben", view: "practice", after: async (page) => { await page.click("#pStart"); await page.waitForSelector("#pPlay:not([hidden])"); } },
  { name: "lernen", view: "learn" },
  { name: "blitz", view: "blitz" },
  { name: "statistik", view: "stats" },
];

const browser = await playwright.chromium.launch();
for (const [scheme, suffix] of [["light", "hell"], ["dark", "dunkel"]]) {
  const context = await browser.newContext({
    viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, colorScheme: scheme,
    serviceWorkers: "block", locale: "de-DE",
  });
  await context.addInitScript((s) => {
    try { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("notenheld.v2", s); sessionStorage.setItem("seeded", "1"); } } catch (e) { /* ohne Speicher */ }
  }, JSON.stringify(STATE));
  const page = await context.newPage();
  await page.goto(BASE);
  await page.evaluate(() => document.fonts.ready);
  for (const shot of SHOTS) {
    await page.click(`.tab[data-view="${shot.view}"]`);
    if (shot.after) await shot.after(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const file = join(OUT, `${shot.name}-${suffix}.png`);
    await page.screenshot({ path: file });
    console.log("gespeichert:", file);
  }
  await context.close();
}
await browser.close();
