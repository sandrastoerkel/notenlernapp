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
// Seit Welle 11 (Schritt 13): feste Uhr (page.clock.setFixedTime, 26.11.2026 in Europe/Berlin) und fester Zufall,
// Stand mit Jahrgang 6 (über den Link der Lehrkraft) und zwei fälligen Stufen (Karte „Heute“: „Wiederholen“).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlaywright, launch, BASE, KEY, SEED_STATE, SEED_RANDOM } from "./spiel.mjs";
import { fresh, addDays } from "../../src/store.js";
import { dranFor } from "../../src/klasse.js";

const playwright = loadPlaywright();
const OUT = dirname(fileURLToPath(import.meta.url));
const HEUTE = "2026-11-26";
const UHR = new Date("2026-11-26T16:00:00+01:00");
const d = (n) => addDays(HEUTE, n);

// Plausibler Fortschritt nach ein paar Tagen Üben (Form wie fresh() in src/store.js, mit allen Markern der
// Umstellungen). Sterne folgen starsFor: 9 richtig = 3 Sterne, 8 = 2, 6 = 1.
const STATE = {
  ...fresh(),
  xp: 640, dayStreak: 3, lastDay: d(-1),
  levels: {
    "noten-1": { stars: 3, best: 9, played: 3, last: 9, day: d(-3) },
    "noten-2": { stars: 2, best: 8, played: 2, last: 8, day: d(-1) },
    "noten-3": { stars: 1, best: 6, played: 1, last: 6, day: d(-1) },
    "notenwerte-1": { stars: 2, best: 8, played: 1, last: 8, day: d(-2) },
  },
  notes: {
    "F (f'', Violin)": { ok: 5, bad: 3 },
    "C (c'', Violin)": { ok: 6, bad: 2 },
    "H (h', Violin)": { ok: 7, bad: 1 },
  },
  answered: 70, correct: 56, bestCombo: 9, blitzRecord: 18,
  unlockAll: false, muted: true, input: "letters", current: "noten-1",
  // Karteikasten: Noten lesen 1 und 2 sind heute wieder dran
  rep: {
    "noten-1": { fach: 2, faellig: HEUTE, zuletzt: d(-3) },
    "noten-2": { fach: 1, faellig: HEUTE, zuletzt: d(-1) },
  },
  klasse: { jahrgang: 6, zweig: null, dran: dranFor(6) },
};

// Je Bereich: Tab anklicken, dann optional weitere Schritte
const SHOTS = [
  { name: "start", view: "home" },
  { name: "ueben", view: "practice", after: async (page) => { await page.click("#pStart"); await page.waitForSelector("#pPlay:not([hidden])"); } },
  { name: "lernen", view: "learn" },
  { name: "blitz", view: "blitz" },
  { name: "statistik", view: "stats" },
];

const browser = await launch(playwright);
for (const [scheme, suffix] of [["light", "hell"], ["dark", "dunkel"]]) {
  const context = await browser.newContext({
    viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, colorScheme: scheme,
    serviceWorkers: "block", locale: "de-DE", timezoneId: "Europe/Berlin",
  });
  await context.addInitScript(SEED_RANDOM, 3);
  await context.addInitScript(SEED_STATE, { key: KEY, state: JSON.stringify(STATE) });
  const page = await context.newPage();
  await page.clock.setFixedTime(UHR);
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
