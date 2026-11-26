// Lauf über 40 Tage im Browser (Welle 11, Schritt 13): dieselbe Geschichte wie im reinen Lauf
// test/repeat.sim.test.js („Lauf über 40 Tage mit Ferien (Tag 12 bis 26)“), diesmal in der App mit gestellter Uhr
// (page.clock.setFixedTime, Tag für Tag vorgestellt) – einmal in Asia/Kuala_Lumpur, einmal in Europe/Berlin.
//
// - Vorbereitung: Die Stufen vor den drei Stufen des Laufs gelten als früher geschafft (ohne Eintrag im Kasten), damit
//   Noten lesen 3 (A), Notenwerte 5 (C) und Intervalle 2 (B) offen sind und der Kasten genau sie enthält.
// - Tag 0: A, C und B je mit 9 von 10 spielen → „Neu im Kasten“, Karte „Heute“: „Nächste Wiederholung: morgen“.
// - Jeden Tag die Uhr einen Tag vorstellen, die App neu laden und die Karte „Heute“ prüfen (Titel, „10 Aufgaben aus …“
//   bzw. „Nächste Wiederholung: …“, „↻ wieder dran“ genau an den fälligen Stufen). Fällige Runden über „Wiederholung
//   starten“ spielen, alles richtig; an Tag 4 liegt die erste Aufgabe aus C bewusst daneben. Ferien von Tag 12 bis 26:
//   die Karte wird angesehen, aber nicht gespielt (kein Zähler für Versäumtes).
// - Jede Ergebniskarte: Aufgaben je Stufe und Urteil („sitzt · wieder in 7 Tagen“, „noch wacklig · morgen noch einmal“).
// - Leitsatz 3: Keine Stufe, die einmal offen war, ist später zu.
// - Ende (Tag 40): Kästchen der Statistik und Fälligkeiten im Speicher gleich der Erwartung aus test/repeat.sim.test.js
//   (A und B in Fach 5, fällig an Tag 57; C in Fach 4, fällig an Tag 41; Runden an den Tagen 1, 4, 5, 8, 11, 27).
// Tag 0 beginnt jeweils um 23:30 Uhr UTC am 24.11.2026 – örtlich ist es schon der 25.11. (Kuala Lumpur 7:30 Uhr,
// Berlin 0:30 Uhr): Die App muss mit dem örtlichen Datum rechnen.
//
// Playwright ist KEINE Abhängigkeit der App (siehe spiel.mjs). Aufruf bei laufendem Server:
//   python3 -m http.server 8080 &
//   node docs/screens/uhr40.mjs              (oder: BASE=… ZONEN=Asia/Kuala_Lumpur node …)
// Ende mit Code 1 bei jeder Abweichung oder einem Fehler der Seite. Der reine Lauf bleibt Teil von `npm test`.
import { loadPlaywright, launch, BASE, KEY, SEED_STATE, SEED_RANDOM, vis, CUR, answerQuestion, goOn } from "./spiel.mjs";
import { fresh, addDays } from "../../src/store.js";
import { PACKS } from "../../src/packs/index.js";
import { ABSTAENDE, FAECHER, dueText, dayText } from "../../src/repeat.js";

const playwright = loadPlaywright();
const ZONEN = (process.env.ZONEN || "Asia/Kuala_Lumpur,Europe/Berlin").split(",");
const START = new Date("2026-11-24T23:30:00Z");
const DAY0 = "2026-11-25";
const TAGE = 40, PAUSE = [12, 26], FEHLER_TAG = 4;
const A = "noten-3", C = "notenwerte-5", B = "intervall-2";
const NAME = { [A]: "Noten lesen 3", [C]: "Notenwerte 5", [B]: "Intervalle 2" };
// Erwartung aus test/repeat.sim.test.js (Lauf mit Ferien): Tage mit Runde, Plan an Tag 27, Ende
const SIM = {
  tage: [1, 4, 5, 8, 11, 27],
  plan27: [[C, 4], [A, 3], [B, 3]],
  fach: { [A]: 5, [B]: 5, [C]: 4 },
  faellig: { [A]: 57, [B]: 57, [C]: 41 },
};
const PACK_INDEX = Object.fromEntries(PACKS.flatMap((p, i) => p.levels.map((l) => [l.id, i])));

const norm = (t) => String(t || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} und ${xs[xs.length - 1]}`);
const at = (d) => new Date(START.getTime() + d * 864e5);

// Vorbereiteter Stand vor Tag 0
function startState() {
  const s = { ...fresh(), muted: true };
  for (const id of ["noten-2", "notenwerte-4", "intervall-1"]) s.levels[id] = { stars: 3, best: 9, played: 1, last: 9, day: addDays(DAY0, -3) };
  return s;
}

async function run(browser, zone) {
  const bad = [];
  const fail = (d, t) => bad.push(`Tag ${d}: ${t}`);
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: "block", locale: "de-DE", timezoneId: zone });
  await ctx.addInitScript(SEED_RANDOM, 11);
  await ctx.addInitScript(SEED_STATE, { key: KEY, state: JSON.stringify(startState()) });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => bad.push(`Seite: ${e}`));
  pg.on("console", (m) => { if (m.type() === "error") bad.push(`Konsole: ${m.text()}`); });

  // Erwartung, Tag für Tag fortgeschrieben (Abstände 1 · 3 · 7 · 14 · 30, „noch wacklig“: ein Fach zurück, morgen)
  const model = { fach: {}, faellig: {} };
  const dueIds = (d) => [A, C, B].filter((id) => model.faellig[id] <= d)
    .sort((x, y) => model.faellig[x] - model.faellig[y] || PACK_INDEX[x] - PACK_INDEX[y]);
  const everOpen = new Set();
  const played = [];
  let checks = 0;

  const openNow = () => pg.evaluate("[...document.querySelectorAll('#levelList .level[data-id]')].filter((b) => !b.disabled).map((b) => b.dataset.id)");
  const checkOpen = async (d) => {
    const now = new Set(await openNow());
    for (const id of everOpen) if (!now.has(id)) fail(d, `Stufe ${id} war offen und ist jetzt zu (Leitsatz 3)`);
    for (const id of now) everOpen.add(id);
    checks++;
  };
  const card = () => pg.evaluate(() => ({
    title: document.querySelector("#homeTitle").textContent, line: document.querySelector("#homeSub").textContent,
    review: !document.querySelector("#homeReview").hidden, small: document.querySelector("#homeSmall").hidden ? "" : document.querySelector("#homeSmall").textContent,
    again: [...document.querySelectorAll("#levelList .level[data-id]")].filter((b) => b.querySelector(".again")).map((b) => b.dataset.id),
  }));
  // Karte „Heute“ gegen die Erwartung
  const checkCard = async (d, label = "") => {
    const c = await card(), due = dueIds(d), w = `${label}Karte „Heute“`;
    if (due.length) {
      const expect = `10 Aufgaben aus ${andList(due.map((id) => NAME[id]))}`;
      if (c.title !== "Wiederholen") fail(d, `${w}: Titel „${c.title}“ statt „Wiederholen“`);
      if (norm(c.line) !== expect) fail(d, `${w}: „${norm(c.line)}“ statt „${expect}“`);
      if (!c.review) fail(d, `${w}: kein Knopf „Wiederholung starten“`);
    } else {
      const future = [A, C, B].map((id) => model.faellig[id]).filter((f) => f > d);
      const expect = future.length ? `Nächste Wiederholung: ${dueText(Math.min(...future) - d)}` : "";
      if (c.title !== "Bereit für eine Runde?") fail(d, `${w}: Titel „${c.title}“`);
      if (c.review) fail(d, `${w}: „Wiederholung starten“, obwohl nichts fällig ist`);
      if (expect && norm(c.small) !== expect) fail(d, `${w}: „${norm(c.small)}“ statt „${expect}“`);
    }
    if ([...c.again].sort().join() !== [...due].sort().join()) fail(d, `${w}: „wieder dran“ an ${c.again.join(", ") || "keiner Stufe"} statt ${due.join(", ") || "keiner"}`);
    checks++;
  };
  // eine normale Runde mit 9 von 10 (die letzte Aufgabe daneben)
  const normalRound = async (d, id) => {
    await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(150);
    await pg.click(`.level[data-id="${id}"]`); await pg.waitForTimeout(200);
    await pg.click("#pStart"); await pg.waitForTimeout(250);
    for (let k = 0; k < 12 && !(await vis(pg, "#pResult")); k++) { await answerQuestion(pg, k !== 9, null, bad); await goOn(pg); }
    const big = norm(await pg.locator("#pResult .big").first().textContent());
    if (big !== "9 / 10") fail(d, `${id}: Ergebnis „${big}“ statt „9 / 10“`);
    const rep = (await vis(pg, "#rRepeat")) ? norm(await pg.locator("#rRepeat").textContent()) : "";
    if (rep !== "Neu im Kasten: kommt morgen zum Wiederholen wieder.") fail(d, `${id}: „${rep}“ statt „Neu im Kasten …“`);
    model.fach[id] = 1; model.faellig[id] = d + ABSTAENDE[0];
    checks += 2;
  };
  // Runde „Wiederholen“ über die Karte; an FEHLER_TAG die erste Aufgabe aus C daneben
  const reviewRound = async (d) => {
    const due = dueIds(d).slice(0, 3);
    await pg.click("#homeReview"); await pg.waitForTimeout(300);
    const head = norm(await pg.locator("#pLevelTitle").textContent());
    const expHead = `10 Aufgaben aus ${due.length === 1 ? "einer Stufe" : `${due.length} Stufen`}`;
    if (head !== expHead) fail(d, `Kopf „${head}“ statt „${expHead}“`);
    const n = {}, ok = {};
    let missed = false;
    for (let k = 0; k < 14 && !(await vis(pg, "#pResult")); k++) {
      const info = await pg.evaluate(CUR);
      if (!info) break;
      if (!due.includes(info.id)) fail(d, `Aufgabe aus ${info.id}, nicht fällig`);
      const right = !(d === FEHLER_TAG && info.id === C && !missed);
      if (!right) missed = true;
      n[info.id] = (n[info.id] || 0) + 1; ok[info.id] = (ok[info.id] || 0) + (right ? 1 : 0);
      await answerQuestion(pg, right, null, bad); await goOn(pg);
    }
    if (!(await vis(pg, "#pResult"))) { fail(d, "keine Ergebniskarte"); return; }
    const total = Object.values(n).reduce((a, b) => a + b, 0);
    if (total !== 10) fail(d, `${total} Aufgaben statt 10`);
    if (d === 27) {
      const got = due.map((id) => [id, n[id]]);
      if (JSON.stringify(got) !== JSON.stringify(SIM.plan27)) fail(d, `Plan ${JSON.stringify(got)} statt ${JSON.stringify(SIM.plan27)} (repeat.sim.test.js)`);
    }
    // Erwartete Urteile; sitzt: höchstens ⌊n / 5⌋ Fehler
    const lines = (await pg.locator("#pResult .review-line").allTextContents()).map(norm);
    const expect = due.map((id) => {
      const sitzt = n[id] - ok[id] <= Math.floor(n[id] / 5);
      model.fach[id] = sitzt ? Math.min(FAECHER, model.fach[id] + 1) : Math.max(1, model.fach[id] - 1);
      const days = sitzt ? ABSTAENDE[model.fach[id] - 1] : 1;
      model.faellig[id] = d + days;
      return `${NAME[id]} · ${sitzt ? `sitzt · wieder ${dueText(days)}` : "noch wacklig · morgen noch einmal"}`;
    });
    if (lines.join(" | ") !== expect.join(" | ")) fail(d, `Urteile „${lines.join(" | ")}“ statt „${expect.join(" | ")}“`);
    played.push(d);
    checks += 3;
  };

  // Tag 0
  await pg.clock.setFixedTime(at(0));
  await pg.goto(BASE); await pg.waitForTimeout(400);
  const today0 = await pg.evaluate(async () => (await import("./src/store.js")).today());
  if (today0 !== DAY0) fail(0, `örtlicher Tag „${today0}“ statt ${DAY0}`);
  await checkOpen(0);
  for (const id of [A, C, B]) {
    if (!everOpen.has(id)) fail(0, `${id} ist nicht offen`);
    await normalRound(0, id);
  }
  await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(200);
  await checkCard(0); await checkOpen(0);

  for (let d = 1; d <= TAGE; d++) {
    await pg.clock.setFixedTime(at(d));
    await pg.goto(BASE); await pg.waitForTimeout(250);
    const t = await pg.evaluate(async () => (await import("./src/store.js")).today());
    if (t !== addDays(DAY0, d)) fail(d, `örtlicher Tag „${t}“ statt ${addDays(DAY0, d)}`);
    await checkOpen(d);
    await checkCard(d);
    if (d >= PAUSE[0] && d <= PAUSE[1]) continue; // Ferien: nur nachsehen, nicht spielen
    while (dueIds(d).length) {
      await reviewRound(d);
      await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(200);
      await checkCard(d, "nach der Runde: "); await checkOpen(d);
    }
  }
  if (played.join() !== SIM.tage.join()) bad.push(`Runden an den Tagen ${played.join(", ")} statt ${SIM.tage.join(", ")} (repeat.sim.test.js)`);

  // Ende: Statistik und Speicher gegen die Erwartung aus repeat.sim.test.js
  await pg.click('.tab[data-view="stats"]'); await pg.waitForTimeout(400);
  const groups = await pg.evaluate(() => [...document.querySelectorAll("#sLevels .level-group")].map((g) => [...g.querySelectorAll(".level-stat")].map((r) => ({
    box: r.querySelector(".box") ? r.querySelector(".box").getAttribute("aria-label") : null,
    last: r.querySelector(".box-line > span:not(.box)") ? r.querySelector(".box-line > span:not(.box)").textContent : null,
  }))));
  const lastRound = dayText(addDays(DAY0, SIM.tage[SIM.tage.length - 1]));
  const boxes = {};
  PACKS.forEach((p, i) => p.levels.forEach((l, j) => {
    const r = (groups[i] || [])[j] || {};
    const exp = SIM.fach[l.id];
    if (exp) {
      boxes[l.id] = r.box;
      if (r.box !== `Fach ${exp} von ${FAECHER}`) bad.push(`Statistik ${l.id}: „${r.box}“ statt „Fach ${exp} von ${FAECHER}“`);
      if (norm(r.last) !== `zuletzt geübt am ${lastRound}`) bad.push(`Statistik ${l.id}: „${r.last}“ statt „zuletzt geübt am ${lastRound}“`);
    } else if (r.box) bad.push(`Statistik ${l.id}: Kästchen „${r.box}“, obwohl die Stufe nicht im Kasten ist`);
  }));
  const rep = await pg.evaluate((k) => JSON.parse(localStorage.getItem(k)).rep, KEY);
  for (const [id, day] of Object.entries(SIM.faellig)) {
    const got = rep[id] && rep[id].faellig, want = addDays(DAY0, day);
    if (got !== want) bad.push(`Speicher ${id}: fällig ${got} statt ${want} (Tag ${day})`);
    if (model.faellig[id] !== day) bad.push(`Erwartung ${id}: Tag ${model.faellig[id]} statt ${day} (Rechnung des Skripts)`);
  }
  if (Object.keys(rep).sort().join() !== [A, B, C].sort().join()) bad.push(`Kasten enthält ${Object.keys(rep).join(", ")}`);
  await ctx.close();
  return { bad, played, boxes, checks, open: everOpen.size };
}

const browser = await launch(playwright);
let errors = 0;
for (const zone of ZONEN) {
  const t0 = Date.now();
  const r = await run(browser, zone);
  errors += r.bad.length;
  console.log(`${zone}: ${r.bad.length ? `${r.bad.length} Abweichungen` : "wie erwartet"} – Runden an den Tagen ${r.played.join(", ")}; `
    + `Statistik ${Object.entries(r.boxes).map(([id, b]) => `${NAME[id]}: ${b}`).join(", ")}; ${r.checks} Prüfungen, `
    + `zuletzt ${r.open} Stufen offen (${Math.round((Date.now() - t0) / 1000)} s)`);
  r.bad.slice(0, 30).forEach((b) => console.log(`  - ${b}`));
}
await browser.close();
process.exit(errors ? 1 : 0);
