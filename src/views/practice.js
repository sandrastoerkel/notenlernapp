// Üben: Startkarte der Stufe, Runde über engine.js, Ergebniskarte
import { isUnlocked, unlockedBy, unlocks, today, starsFor } from "../store.js";
import * as engine from "../engine.js";
import { needsOf, skillOf, basicsPlan, basicsOffer, afterBasics, afterBasicsLevels, gapsOf, RUNDE_GRUNDLAGEN,
  reviewPlan, applyReview, afterRound, dueText, inBox, withGuess } from "../repeat.js";
import { packShort } from "./home.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

const current = () => engine.findLevel(ctx.packs, ctx.state.current);

// Beschriftung des Startknopfs (rein, getestet): in allen Paketen „10 Aufgaben“
export const startLabel = () => `Runde starten · ${engine.ROUND_LENGTH} Aufgaben`;

// Hinweis auf der Startkarte (rein, getestet): bei zweischrittigen Stufen (level.twoSteps) mit dem Zusatz,
// dass ein Teilerfolg (nur der erste Schritt daneben) nicht als richtig zählt
export const TWO_STEPS_NOTE = "Beide Schritte müssen stimmen.";
// Zeile der Ergebniskarte: „+12 XP · Ø 2,3 s pro Note“ (Dezimalkomma; „pro Note“ nur in „Noten lesen“,
// sonst „pro Aufgabe“ – Welle 10, B15)
export const avgText = (avg) => avg.toFixed(1).replace(".", ",");
export const resultLine = (pack, gained, avg) => `+${gained} XP · Ø ${avgText(avg)} s pro ${pack && pack.id === "noten" ? "Note" : "Aufgabe"}`;
// level.hint darf eine Funktion (ctx) => Text sein (Merksprüche, Welle 10, Schritt 4); ctx: { state }.
// Eingesetzt wird der Hinweis per textContent (eigene Sprüche bleiben Text).
export const startHint = (level, ctx) => {
  const hint = engine.textOf(level.hint, ctx);
  // mehrzeilige Hinweise (Tonleitern 10: Reihenfolge und Sprüche) bekommen den Zusatz in eine eigene Zeile
  return level.twoSteps ? `${hint}${hint.includes("\n") ? "\n" : " "}${TWO_STEPS_NOTE}` : hint;
};

// Tastatur-Hinweis auf der Startkarte (rein, getestet): ohne Vorzeichen Buchstaben, mit Namensraster
// der ganze Name und Enter
const kbd = (t) => `<span class="kbd">${t}</span>`;
// Stufen mit level.digits (Grobbestimmung Prime … Oktave): Ziffern 1 bis 8
export const keysHint = (level) => (level && level.digits
  ? `Tastatur: ${kbd("1")} Prime, ${kbd("2")} Sekunde … ${kbd("8")} Oktave`
  : engine.usesNames(level)
  ? `Tastatur: Namen tippen, z. B. ${kbd("fis")} ${kbd("es")} ${kbd("b")}, dann ${kbd("Enter")}. ${kbd("⌫")} löscht, ${kbd("Esc")} leert.`
  : `Tastatur: ${kbd("C")} ${kbd("D")} ${kbd("E")} … ${kbd("H")}`);

// Beschriftung der Wahl Buchstaben/Klaviatur (rein, getestet): mit Namensraster „Namen“
export const lettersLabel = (level) => (engine.usesNames(level) ? "Namen" : "Buchstaben");

// Ergebniskarte (rein, getestet, Welle 10, A7): nächste Stufe der Reihe nach (Knopf nur, wenn sie offen
// ist) und eine eigene, gut lesbare Zeile zur Freischaltung (note). Die Regel bleibt: beste Runde ≥ 8 in
// der Stufe, die freischaltet (store.js, isUnlocked).
// - Stufen, die diese Stufe freischaltet und die noch zu sind, bei weniger als 8 Richtigen:
//   k = 8 − Richtige; k = 1: „Noch eine richtige Antwort, dann öffnet sich Stufe 3.“,
//   k = 2 oder 3: „Noch 2 richtige Antworten, dann öffnet sich Stufe 3.“,
//   ab k = 4: „Ab 8 von 10 öffnet sich Stufe 3.“ (zwei Stufen: „… öffnen sich die Stufen 2 und 7.“)
// - sonst, wenn sie offen sind: „Stufe 3 ist offen.“ („Die Stufen 2 und 7 sind offen.“)
// - ist die nächste Stufe zu und hängt an einer anderen Stufe: „Stufe 7 öffnet sich ab 8 von 10 in Stufe 1.“
// - letzte Stufe eines Pakets ohne weitere Freischaltung: keine Zeile
const andList = (nos) => (nos.length < 2 ? `${nos[0]}` : `${nos.slice(0, -1).join(", ")} und ${nos[nos.length - 1]}`);
const stufen = (ls) => (ls.length > 1 ? `die Stufen ${andList(ls.map((l) => l.no))}` : `Stufe ${ls[0].no}`);
const cap = (t) => t[0].toUpperCase() + t.slice(1);
export const missingText = (k) => (k === 1 ? "Noch eine richtige Antwort" : `Noch ${k} richtige Antworten`);
export function resultInfo(state, pack, level, correct) {
  const next = engine.nextLevel(pack, level);
  const nextOpen = !!next && isUnlocked(state, pack, next.id);
  const mine = unlocks(pack, level.id);
  const closed = mine.filter((l) => !isUnlocked(state, pack, l.id));
  const open = mine.filter((l) => isUnlocked(state, pack, l.id));
  const notes = [];
  if (correct < 8 && closed.length) {
    const k = 8 - correct, verb = closed.length > 1 ? "öffnen" : "öffnet";
    notes.push(k >= 4 ? `Ab 8 von 10 ${verb} sich ${stufen(closed)}.` : `${missingText(k)}, dann ${verb} sich ${stufen(closed)}.`);
  } else if (closed.length === 0 && open.length) {
    notes.push(`${cap(stufen(open))} ${open.length > 1 ? "sind" : "ist"} offen.`);
  }
  if (next && !nextOpen && !mine.includes(next)) {
    const by = unlockedBy(pack, next.id);
    if (by) notes.push(`Stufe ${next.no} öffnet sich ab 8 von 10 in Stufe ${by.no}.`);
  }
  return { next, nextOpen, note: notes.join(" ") };
}

// Hilfen aufgeklappt: so weit scrollen, dass die erste Reihe der Antwortknöpfe über der Tab-Leiste steht
// (rein, getestet). bottom: Unterkante des ersten Knopfs, limit: Oberkante der Tab-Leiste (beides im Fenster).
export const answersScroll = (bottom, limit) => (bottom > limit ? Math.ceil(bottom - limit) : 0);

function keepAnswersVisible() {
  const first = $("#pAnswers .btn");
  if (!first || $("#pPlay").hidden || !$("#pHelps").open) return;
  const tabs = document.querySelector(".tabs");
  const dy = answersScroll(first.getBoundingClientRect().bottom, window.innerHeight - (tabs ? tabs.offsetHeight : 0) - 8);
  if (dy) window.scrollBy({ top: dy, behavior: "smooth" });
}

function markInput() {
  $("#inLetters").classList.toggle("on", ctx.state.input === "letters");
  $("#inKeys").classList.toggle("on", ctx.state.input === "keys");
}

function setInput(v) {
  ctx.state.input = v; ctx.save();
  markInput();
  engine.setInput(v);
}

export function init(c) {
  ctx = c;
  $("#inLetters").addEventListener("click", () => setInput("letters"));
  $("#inKeys").addEventListener("click", () => setInput("keys"));
  $("#pStart").addEventListener("click", startRound);
  $("#pBasics").addEventListener("click", () => ctx.show("practice", { mode: "grundlagen", levelId: ctx.state.current }));
  // „Dafür brauchst du: …“: jeder Eintrag öffnet die Startkarte jener Stufe
  $("#pNeeds").addEventListener("click", (e) => {
    const b = e.target.closest("[data-need]");
    if (!b) return;
    ctx.state.current = b.dataset.need; ctx.save(); ctx.show("practice");
  });
  // Hilfen aufgeklappt: Antwortknöpfe sichtbar halten (kein Scrollen innerhalb der Hilfen)
  $("#pHelps").addEventListener("toggle", () => { if ($("#pHelps").open) requestAnimationFrame(keepAnswersVisible); });
}

// Startkarte der aktuellen Stufe (bricht eine laufende Runde ab). arg (optional, über ctx.show("practice", arg)):
// { mode: "grundlagen", levelId, only } startet „Grundlagen wiederholen“ zur Stufe levelId (only: nur diese
// Grundlage(n), nach einem Fehlermuster); { mode: "wiederholen" } startet die Runde „Wiederholen“ aus dem
// Karteikasten (repeat.reviewPlan; ist nichts fällig, geht es zur Startseite).
export function render(arg) {
  engine.stop();
  if (arg && arg.mode === "grundlagen") return startBasics(arg.levelId || ctx.state.current, arg.only || null);
  if (arg && arg.mode === "wiederholen") return startReview();
  const { pack, level } = current();
  $("#pLevelNo").textContent = "Stufe " + level.no;
  // „Vorzeichen ♯ und ♭“: das Zeichen nicht allein in der Zeile (J-C3)
  $("#pLevelTitle").textContent = engine.keepTogether(level.title);
  $("#pHint").textContent = startHint(level, { state: ctx.state });
  $("#pIntro").hidden = false; $("#pPlay").hidden = true; $("#pResult").hidden = true;
  $("#pStaff").innerHTML = level.example || "";
  // Die Wahl Buchstaben/Klaviatur und der Tastatur-Hinweis gelten nur für Stufen mit Buchstaben-Eingabe;
  // bei Auswahlknöpfen sind die Aufgaben keine einzelnen Noten
  const letters = (level.input || "letters") === "letters";
  // namesOnly: nur das Namensraster (die Schreibweise zählt), keine Wahl der Klaviatur
  $("#view-practice .seg").hidden = !letters || !!level.namesOnly;
  $("#pKeys").hidden = !letters && !level.digits;
  // Hilfen nur während der Runde (engine.startRound); Herkunftszeile nur in der gemischten Runde
  $("#pHelps").hidden = true;
  $("#pOrigin").hidden = true;
  $("#pNext").hidden = true;
  $("#pKeys").innerHTML = keysHint(level);
  $("#inLetters").textContent = lettersLabel(level);
  $("#pStart").textContent = startLabel(level);
  renderBasicsOffer(pack, level);
  markInput();
  ctx.renderTop();
}

/* ---------- „Grundlagen wiederholen“ (Welle 11, Schritt 7) ---------- */

// „· 6 Aufgaben“ bricht nicht um (bei 320 px steht „wiederholen · 6 Aufgaben“ zusammen in der zweiten Zeile)
export const BASICS_LABEL = `Grundlagen wiederholen\u00a0·\u00a0${RUNDE_GRUNDLAGEN}\u00a0Aufgaben`;
export const BASICS_SHORT = "Grundlagen wiederholen";

// „Notenstufen zählen (Prime bis Oktave)“ → „Notenstufen zählen“ (Satz zum Fehlermuster, „Dafür brauchst du“,
// Grund der Empfehlung)
const shortSkill = (t) => t.replace(/\s*\([^)]*\)\s*$/, "");

// Startkarte: „Dafür brauchst du: …“ als fortlaufende Zeile mit Kommas (J-B1/J-C1, Korrektur nach der Prüfung
// Welle 11): je Voraussetzung ein Knopf im Textfluss mit sichtbarer Stufe, z. B. „Notenstufen zählen (Intervalle 2)“
// (Kurzname des Pakets, Fähigkeit ohne Klammerzusatz); er öffnet die Startkarte jener Stufe. Das Komma hängt ohne
// Leerzeichen am Knopf (kein Komma am Zeilenanfang). Rein, getestet. Leer, wenn die Stufe keine Voraussetzungen hat.
export function needLabel(packs, id) {
  const { pack, level } = engine.findLevel(packs, id);
  return `${shortSkill(skillOf(level))} (${packShort(pack)} ${level.no})`;
}
export function needsHtml(packs, levelId) {
  const ids = needsOf(packs, levelId);
  if (!ids.length) return "";
  return "Dafür brauchst du: " + ids.map((id) => {
    const { level } = engine.findLevel(packs, id);
    return `<button type="button" class="link" data-need="${id}" title="${skillOf(level)}">${needLabel(packs, id)}</button>`;
  }).join(", ");
}

// Grund der Empfehlung auf der Startkarte (rein, getestet): reason aus repeat.basicsOffer; die Fähigkeit ohne
// Klammerzusatz wie in „Dafür brauchst du“ (kürzer, die Startknöpfe rücken nach oben). Wortlaut nach Sandra
// (26.11.2026): „Tipp:“ statt „Empfohlen:“, „in der App“ statt „hier“.
export function reasonText(packs, reason) {
  if (!reason) return "";
  const skill = shortSkill(skillOf(engine.findLevel(packs, reason.id).level));
  const rest = { nie: "hast du in der App noch nicht geübt.", faellig: "ist wieder dran.", schwach: "lag zuletzt unter 8 von 10." }[reason.kind];
  return rest ? `Tipp: „${skill}“ ${rest}` : "";
}

// Kopf der Runde: „für Intervalle, Stufe 3“ (rein, getestet)
export const basicsTitle = (packs, levelId) => {
  const { pack, level } = engine.findLevel(packs, levelId);
  return engine.keepStufe(`für ${pack.title}, Stufe ${level.no}`);
};

// Startkarte: Zeile mit den Voraussetzungen und der Knopf „Grundlagen wiederholen“. Mit Empfehlung steht er vor
// „Runde starten“, hervorgehoben, mit dem Grund darüber; sonst als ruhiger Knopf darunter. Nie Pflicht.
function renderBasicsOffer(pack, level) {
  const offer = basicsOffer(ctx.state, ctx.packs, level.id, today());
  const needs = $("#pNeeds"), btn = $("#pBasics"), why = $("#pBasicsWhy"), start = $("#pStart");
  needs.innerHTML = offer.show ? needsHtml(ctx.packs, level.id) : "";
  needs.hidden = !offer.show;
  btn.hidden = !offer.show;
  btn.textContent = BASICS_LABEL;
  why.textContent = offer.recommend ? reasonText(ctx.packs, offer.reason) : "";
  why.hidden = !offer.recommend;
  btn.className = "btn wide " + (offer.recommend ? "primary" : "ghost");
  start.className = "btn wide" + (offer.recommend ? "" : " primary");
  // Reihenfolge: Grund, Knopf, „Runde starten“ (Empfehlung) bzw. „Runde starten“, Knopf
  if (offer.recommend) { start.before(why); start.before(btn); } else start.after(btn);
}

// Gemischte Runde im Üben-Bereich starten (Kopf, Eingabewahl verborgen, Runde über engine.startMixed)
function playMixed(kind, plan, head, title, onFinish) {
  const items = engine.makeMixed(ctx.packs, plan, { notes: ctx.state.notes, state: ctx.state });
  $("#pLevelNo").textContent = head;
  $("#pLevelTitle").textContent = title;
  // Die Wahl Buchstaben/Klaviatur gilt nicht für die ganze gemischte Runde
  $("#view-practice .seg").hidden = true;
  $("#pIntro").hidden = true; $("#pResult").hidden = true; $("#pPlay").hidden = false;
  engine.startMixed({ kind, items, plan }, playUi(), { state: ctx.state, save: ctx.save, onFinish });
  ctx.renderTop();
  return items;
}

function startBasics(levelId, only) {
  const plan = basicsPlan(ctx.packs, levelId, RUNDE_GRUNDLAGEN, only);
  if (!plan.length) { ctx.state.current = levelId; return render(); }
  return playMixed("grundlagen", plan, MIXED_HEAD.grundlagen, basicsTitle(ctx.packs, levelId), (res) => {
    // Der Merker gilt für alle Voraussetzungen: nach einer Runde mit nur einem Teil (Fehlermuster) bleibt die
    // Empfehlung zu den übrigen stehen
    const all = needsOf(ctx.packs, levelId);
    if (!only || all.every((id) => [].concat(only).includes(id))) afterBasics(ctx.state, levelId, res.correct, res.total, today());
    // je Voraussetzung: fehlerfrei gemerkt, eine fällige bestandene zählt als Wiederholung (Korrektur W-B4); deren
    // Urteil zeigt die Ergebniskarte in der Zeile der Grundlage (Nachprüfung)
    const counted = afterBasicsLevels(ctx.state, ctx.packs, res.perLevel, today());
    ctx.save();
    showBasicsResult(res, levelId, only, counted);
  });
}

/* ---------- Runde „Wiederholen“ (Welle 11, Schritt 8) ---------- */

// Kopf der Runde: „10 Aufgaben aus 3 Stufen“ (rein, getestet)
export function reviewTitle(plan) {
  const total = plan.reduce((a, e) => a + e.n, 0);
  return `${total} Aufgaben aus ${plan.length === 1 ? "einer Stufe" : `${plan.length} Stufen`}`;
}

// Zahl und Einheit bleiben zusammen („in 7 Tagen“, „2 von 3“)
const nb = (t) => String(t).replace(/(\d) /g, "$1\u00a0").replace(/ (\d)/g, "\u00a0$1");
// Urteil eines Eintrags (urteil aus repeat.applyReview; ältere Ergebnisse ohne urteil über sitzt)
const urteilOf = (v) => v.urteil || (v.sitzt ? "sitzt" : "wacklig");
// „noch wacklig“ bricht nicht um (bei 320 px stand sonst „↻ noch“ am Zeilenende)
export const URTEIL_TEXT = { sitzt: "sitzt", fast: "fast", wacklig: "noch\u00a0wacklig" };

// Urteil je Stufe (v aus repeat.applyReview bzw. afterRound, rein, getestet):
// „sitzt · wieder in 7 Tagen“, „fast · morgen noch einmal“, „noch wacklig · morgen noch einmal“,
// neu aufgenommen „geschafft · morgen zum Wiederholen“
export function verdictText(v) {
  if (v.neu) return nb(`geschafft · ${dueText(v.inTagen)} zum Wiederholen`);
  if (v.vorgezogen) return nb(`${dueText(v.inTagen)} noch einmal`);
  const u = urteilOf(v);
  return nb(u === "sitzt" ? `sitzt · wieder ${dueText(v.inTagen)}` : `${URTEIL_TEXT[u]} · ${dueText(v.inTagen)} noch einmal`);
}

// Zeile der Ergebniskarte „Wiederholen“ (rein, getestet; Korrektur W-B2/J-B3): mit der Zahl der Richtigen, damit
// man sieht, warum etwas „fast“ oder „noch wacklig“ ist, z. B. „Noten lesen 7 · 4 von 4 · ✓ sitzt · wieder in 7
// Tagen“, „Notenwerte 5 · 2 von 3 · ↻ fast · morgen noch einmal“. Zeichen nur zur Unterscheidung (aria-hidden, nicht
// rot), Zahl und Einheit mit geschütztem Leerzeichen. HTML (wird mit innerHTML eingesetzt; nur eigene Texte).
export function reviewLine(packs, v) {
  const { pack, level } = engine.findLevel(packs, v.id);
  const count = Number.isInteger(v.n) && Number.isInteger(v.richtig) ? ` · ${v.richtig}\u00a0von\u00a0${v.n}` : "";
  const mark = `<span aria-hidden="true">${urteilOf(v) === "sitzt" ? "✓" : "↻"}</span>\u00a0`;
  return `${packShort(pack)}\u00a0${level.no}${count} · ${mark}${verdictText(v)}`;
}

// Knopf unter „noch wacklig“ (rein, getestet): die Stufe mit Hilfen direkt davor, falls es sie gibt („Stufe 4 mit
// Hilfen üben“), sonst die Stufe selbst („Stufe 5 üben“). { id, label }
export function practiceOffer(packs, id) {
  const { pack, level } = engine.findLevel(packs, id);
  const i = pack.levels.indexOf(level);
  const before = i > 0 ? pack.levels[i - 1] : null;
  if (before && !inBox(before)) return { id: before.id, label: engine.keepStufe(`Stufe ${before.no} mit Hilfen üben`) };
  return { id: level.id, label: engine.keepStufe(`Stufe ${level.no} üben`) };
}

// Knöpfe der Ergebniskarte „Wiederholen“ je Urteil (rein, getestet; Nachprüfung Welle 11): nur unter „noch wacklig“
// (zwei und mehr Fehler, ein Fach zurück) practiceOffer, sonst null. „fast“ (ein Fehler, Fach bleibt, morgen wieder)
// bekommt keinen Knopf: Die Wiederholung morgen entscheidet, und die Karte bleibt bei drei Stufen übersichtlich (W-B6).
export const reviewOffers = (packs, verdicts) =>
  verdicts.map((v) => (urteilOf(v) === "wacklig" ? practiceOffer(packs, v.id) : null));

// Satz auf der Ergebniskarte einer normalen Runde (v aus repeat.afterRound oder null, rein, getestet).
// Neu geschafft: „Geschafft – kommt morgen zum Wiederholen wieder.“ (Korrektur J-B8, statt „Neu im Kasten“).
// Nicht fällig, unter 8 Richtigen (W-B7): „Wiederholung: morgen noch einmal.“
export function repeatNote(v) {
  if (!v) return "";
  if (v.neu) return nb(`Geschafft – kommt ${dueText(v.inTagen)} zum Wiederholen wieder.`);
  return `Wiederholung: ${verdictText(v)}.`;
}

function startReview() {
  const plan = reviewPlan(ctx.state, ctx.packs, today());
  if (!plan.length) return ctx.show("home");
  return playMixed("wiederholen", plan, MIXED_HEAD.wiederholen, reviewTitle(plan), (res) => {
    // Urteil je Stufe in den Karteikasten (Fach weiter bzw. zurück); Sterne trägt die Runde bei keiner Stufe ein
    const verdicts = applyReview(ctx.state, withGuess(res.perLevel, plan), today());
    ctx.save();
    showReviewResult(res, verdicts);
  });
}

// Für die Konsole und die Browserprüfung (docs/screens/ueberlauf.mjs): ctx.show("practice", arg)
export const open = (arg) => ctx.show("practice", arg);

export const MIXED_HEAD = { wiederholen: "Wiederholen", grundlagen: "Grundlagen wiederholen" };

// Ergebniszeile je Stufe der gemischten Runde (rein, getestet): „Intervalle 2 · 3 von 3“; Kurzname des Pakets wie
// auf der Karte „Heute“ (J-C4): „Dreiklänge 1 · 2 von 3“
export function perLevelLine(packs, e) {
  const { pack, level } = engine.findLevel(packs, e.id);
  return `${packShort(pack)} ${level.no} · ${e.ok} von ${e.n}`;
}

// Knopf unter einer Zeile mit Fehlern auf der Karte „Grundlagen wiederholt“ (rein, getestet; J-B6, L-B4, W-B3):
// wie practiceOffer (Stufe mit Hilfen direkt davor, sonst die Stufe selbst), mit dem Kurznamen des Pakets, weil die
// Grundlagen aus anderen Paketen kommen können: „Intervalle 1 mit Hilfen üben“, „Noten lesen 7 üben“. { id, label }
export function needOffer(packs, id) {
  const o = practiceOffer(packs, id);
  const { pack, level } = engine.findLevel(packs, o.id);
  return { id: o.id, label: `${packShort(pack)}\u00a0${level.no} ${o.id === id ? "üben" : "mit Hilfen üben"}` };
}

// Inhalt der Karte „Grundlagen wiederholt“ (rein, getestet): { lines: [{ text, offer, main }], backMain }.
// - je Grundlage eine Zeile „Intervalle 2 · 0 von 3“, bei Fehlern darunter ein Knopf zum Üben (needOffer);
// - eine fällige Grundlage, deren Runde als Wiederholung zählte (counted aus repeat.afterBasicsLevels, W-B4 b), zeigt
//   wie die Karte „Wiederholen“ ihr Urteil in derselben Zeile (reviewLine: „Noten lesen 7 · 3 von 3 · ✓ sitzt ·
//   wieder in 7 Tagen“) und hat keinen Knopf zum Üben – sonst verschwände sie ohne Erklärung aus „Heute“
//   (Nachprüfung, keine eigene Zeile, die Karte bleibt knapp);
// - Hauptknopf ist dieser Knopf, wenn eine Grundlage zur Hälfte oder mehr danebenlag (bei mehreren die mit dem
//   größten Anteil, bei Gleichstand die erste);
// - „Zurück zu Stufe n“ ist Hauptknopf nur bei höchstens einem Fehler (und keiner Grundlage zur Hälfte daneben);
// - dazwischen (zwei oder mehr Fehler verteilt) gibt es keinen Hauptknopf: Üben, Zurück und Nochmal stehen gleich da.
export function basicsResultPlan(packs, res, counted = []) {
  const lines = res.perLevel.map((e) => {
    const v = (counted || []).find((x) => x.id === e.id);
    return { text: v ? reviewLine(packs, v) : perLevelLine(packs, e), offer: e.ok < e.n && !v ? needOffer(packs, e.id) : null, main: false, part: (e.n - e.ok) / e.n };
  });
  const weak = lines.filter((l) => l.part >= 0.5).sort((a, b) => b.part - a.part)[0];
  if (weak) weak.main = true;
  return { lines: lines.map(({ part, ...l }) => l), backMain: !weak && res.total - res.correct <= 1 };
}

function showBasicsResult(res, levelId, only, counted = []) {
  const { level } = engine.findLevel(ctx.packs, levelId);
  const plan = basicsResultPlan(ctx.packs, res, counted);
  $("#pPlay").hidden = true; $("#pHelps").hidden = true; $("#pOrigin").hidden = true;
  $("#pResult").hidden = false;
  $("#pResult").innerHTML = `
      <p class="eyebrow">Grundlagen wiederholt</p>
      <p class="big num">${res.correct} / ${res.total}</p>
      <p class="small muted num">+${res.gained} XP</p>
      ${plan.lines.map((l, i) => `<div class="review-item stack">
        <p class="review-line">${l.text}</p>
        ${l.offer ? `<button class="btn${l.main ? " primary" : ""}" data-need-open="${i}">${l.offer.label}</button>` : ""}
      </div>`).join("")}
      <div class="row" style="justify-content:center">
        <button class="btn${plan.backMain ? " primary" : ""}" id="rBack">${engine.keepStufe(`Zurück zu Stufe ${level.no}`)}</button>
        <button class="btn" id="rAgain">Nochmal</button>
        <button class="btn ghost" id="rHome">Übersicht</button>
      </div>`;
  $("#pResult").querySelectorAll("[data-need-open]").forEach((b) => b.addEventListener("click", () => {
    ctx.state.current = plan.lines[+b.dataset.needOpen].offer.id; ctx.save(); ctx.show("practice");
  }));
  $("#rBack").addEventListener("click", () => { ctx.state.current = levelId; ctx.save(); ctx.show("practice"); });
  $("#rAgain").addEventListener("click", () => ctx.show("practice", { mode: "grundlagen", levelId, only }));
  $("#rHome").addEventListener("click", () => ctx.show("home"));
  ctx.renderTop();
}

// Ergebniskarte „Wiederholen“: Sterne nur als Anzeige der Runde (starsFor wie beim Bonus, die Runde hat immer
// RUNDE_WIEDERHOLEN Aufgaben), darunter nur der erste Teil des Satzes („Gut.“) – kein Versprechen eines Sterns, den
// die Runde nicht einträgt (J-B2, L-B1) –, je Stufe das Urteil, bei „noch wacklig“ ein Knopf zum Üben (reviewOffers);
// „Noch eine Wiederholung“ nur, wenn weiter etwas fällig ist
function showReviewResult(res, verdicts) {
  const stars = starsFor(res.correct);
  const more = reviewPlan(ctx.state, ctx.packs, today()).length > 0;
  const offers = reviewOffers(ctx.packs, verdicts);
  $("#pPlay").hidden = true; $("#pHelps").hidden = true; $("#pOrigin").hidden = true;
  $("#pResult").hidden = false;
  $("#pResult").innerHTML = `
      <p class="eyebrow">Wiederholung beendet</p>
      ${engine.starsHtml(stars)}
      <p class="big num">${res.correct} / ${res.total}</p>
      <p class="muted">${engine.resultMessage(stars, { correct: res.correct, total: res.total, short: true })}</p>
      <p class="small muted num">+${res.gained} XP</p>
      ${verdicts.map((v, i) => `<div class="review-item stack">
        <p class="review-line">${reviewLine(ctx.packs, v)}</p>
        ${offers[i] ? `<button class="btn" data-review-open="${i}">${offers[i].label}</button>` : ""}
      </div>`).join("")}
      <div class="row" style="justify-content:center">
        ${more ? `<button class="btn primary" id="rMore">Noch eine Wiederholung</button>` : ""}
        <button class="btn${more ? " ghost" : " primary"}" id="rHome">Übersicht</button>
      </div>`;
  $("#pResult").querySelectorAll("[data-review-open]").forEach((b) => b.addEventListener("click", () => {
    ctx.state.current = offers[+b.dataset.reviewOpen].id; ctx.save(); ctx.show("practice");
  }));
  if (more) $("#rMore").addEventListener("click", () => ctx.show("practice", { mode: "wiederholen" }));
  $("#rHome").addEventListener("click", () => ctx.show("home"));
  ctx.renderTop();
}

/* ---------- Fehlermuster auf der Ergebniskarte (rein, getestet) ---------- */

// Zahl der falschen Antworten bei einschrittigen Stufen (gapsOf meldet ab LUECKE_AB = 3): „Drei Antworten …“
const ANZAHL = { 3: "Drei", 4: "Vier", 5: "Fünf", 6: "Sechs", 7: "Sieben", 8: "Acht", 9: "Neun", 10: "Zehn" };
export const countWord = (n) => ANZAHL[n] || `${n}`;
const ORDINAL = ["erste", "zweite", "dritte"];

// Muster aus repeat.gapsOf zusammenfassen: gleiche Zahl, gleicher Schritt, gleiche Art → ein Satz
// (einschrittige Stufen mit mehreren Voraussetzungen zählen jede falsche Antwort für alle)
export function gapGroups(gaps) {
  const out = [];
  for (const g of gaps || []) {
    const key = `${g.count}|${g.step}|${g.helps ? 1 : 0}`;
    const x = out.find((o) => o.key === key);
    if (x) x.needs.push(g.need);
    else out.push({ key, needs: [g.need], count: g.count, step: g.step, helps: !!g.helps });
  }
  return out.map(({ key, ...g }) => g);
}

// „Intervalle, Stufe 2“, „Notenwerte, Stufen 3, 5 und 7“, „Intervalle, Stufe 4 und in Noten lesen, Stufe 8“
export function placesText(packs, ids) {
  const byPack = [];
  for (const id of ids) {
    const { pack, level } = engine.findLevel(packs, id);
    const x = byPack.find((b) => b.pack === pack);
    if (x) x.nos.push(level.no); else byPack.push({ pack, nos: [level.no] });
  }
  // Kurzname des Pakets wie auf der Karte „Heute“ (packShort, Welle 11, Schritt 12); mehrere Pakete: „… und in …“
  const parts = byPack.map(({ pack, nos }) => `${packShort(pack)}, ${nos.length > 1 ? "Stufen" : "Stufe"} ${andList(nos)}`);
  return parts.length < 2 ? parts.join("") : parts.slice(0, -1).join(", in ") + " und in " + parts[parts.length - 1];
}

// Satz zum Fehlermuster, ohne die Fehler nachzuzählen (Korrektur nach der Prüfung Welle 11, J-B7/W-B5/W-B6):
// - Schritt bekannt: „Der erste Schritt (Notenstufen zählen) hat oft nicht geklappt. Das übst du in Intervalle,
//   Stufe 2.“; Stufe mit Hilfen davor (Intervalle 4, zweiter Schritt): „Der zweite Schritt hat oft nicht geklappt.
//   Mit Hilfen übst du das in Stufe 3.“
// - einschrittig (oder Schritt nicht eindeutig): keine Behauptung, dass der Fehler in den Grundlagen liegt –
//   „Drei Antworten lagen daneben. Die Grundlagen dazu findest du in Noten lesen, Stufe 3.“
export function gapText(packs, group) {
  const one = group.needs.length === 1 ? engine.findLevel(packs, group.needs[0]).level : null;
  if (group.step === null || group.step === undefined) {
    return engine.keepStufe(`${countWord(group.count)} Antworten lagen daneben. Die Grundlagen dazu findest du in ${placesText(packs, group.needs)}.`);
  }
  const what = `Der ${ORDINAL[group.step] || `${group.step + 1}.`} Schritt${one && !group.helps ? ` (${shortSkill(skillOf(one))})` : ""} hat oft nicht geklappt.`;
  const where = group.helps ? `Mit Hilfen übst du das in Stufe ${one.no}.` : `Das übst du in ${placesText(packs, group.needs)}.`;
  return engine.keepStufe(`${what} ${where}`);
}

// Knopf „Stufe 2 öffnen“ (im selben Paket) bzw. „Intervalle 2 öffnen“ (anderes Paket, Kurzname); mit Hilfen „Stufe 3 mit Hilfen üben“
export function openLabel(packs, pack, id, helps = false) {
  const t = engine.findLevel(packs, id);
  if (helps) return engine.keepStufe(`Stufe ${t.level.no} mit Hilfen üben`);
  return engine.keepStufe(t.pack === pack ? `Stufe ${t.level.no} öffnen` : `${packShort(t.pack)} ${t.level.no} öffnen`);
}

// Ergebniskarte einer normalen Runde, Teil „Grundlagen“ (rein, getestet): { first, gaps, only }
// first: „Grundlagen wiederholen“ als erster Knopf (weniger als 5 Richtige, die Stufe hat Voraussetzungen und es
// gibt kein Fehlermuster). gaps: höchstens EIN Muster (J-B7/W-B6: ein nächster Schritt statt vier) –
// [{ text, needs, helps, open }]; gewählt wird der erste Denkschritt vor dem zweiten (Schritt 2 baut auf Schritt 1),
// bei gleichem Schritt das häufigere (Reihenfolge von gapsOf). open nur bei „mit Hilfen“ (Knopf „Stufe 3 mit Hilfen
// üben“); sonst übt „Grundlagen wiederholen“ genau die Grundlage(n) des Musters (only), ein Knopf „… öffnen“ mit
// demselben Inhalt entfällt.
export const BASICS_BELOW = 5;
export function resultBasics(packs, pack, level, correct, log) {
  const groups = gapGroups(gapsOf(packs, level, log));
  const rank = (g) => (g.step === null || g.step === undefined ? 99 : g.step);
  const g = groups.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).map((e) => e.x)[0];
  const gaps = g ? [{ text: gapText(packs, g), needs: g.needs, helps: g.helps, open: g.helps && g.needs.length === 1 ? g.needs[0] : null }] : [];
  const first = !gaps.length && correct < BASICS_BELOW && needsOf(packs, level.id).length > 0;
  const only = g && !g.helps ? g.needs.slice() : [];
  return { first, gaps, only };
}

const playUi = () => ({
  staff: $("#pStaff"), feedback: $("#pFeedback"), count: $("#pCount"), dots: $("#pDots"),
  answers: $("#pAnswers"), typed: $("#pTyped"), piano: $("#pPiano"),
  helps: $("#pHelps"), helpsTitle: $("#pHelps summary"), helpsBody: $("#pHelpsBody"), next: $("#pNext"),
  origin: $("#pOrigin"),
});

function startRound() {
  const { level } = current();
  $("#pIntro").hidden = true; $("#pResult").hidden = true; $("#pPlay").hidden = false;
  engine.startRound(level, playUi(), { state: ctx.state, save: ctx.save, onFinish: showResult });
}

// Ergebniskarte einer normalen Runde. Mit Fehlermuster (J-B7/W-B6): ein Satz zum Muster, darunter genau ein
// nächster Schritt als Hauptknopf („Grundlagen wiederholen“ bzw. „Stufe 3 mit Hilfen üben“), dazu nur „Nochmal“ und
// „Übersicht“ (höchstens drei Knöpfe); der Ergebnissatz ohne den Verweis auf „Lernen“ (das Muster ist die
// Empfehlung). Ohne Muster wie bisher: unter 5 Richtigen „Grundlagen wiederholen“ zuerst (dann ebenfalls der kurze
// Ergebnissatz), sonst „Nochmal“, „Stufe n“ (wenn offen), „Übersicht“.
function showResult(res) {
  const { pack, level } = current();
  const { correct: c, stars, gained, avg } = res;
  const { next, nextOpen, note } = resultInfo(ctx.state, pack, level, c);
  const basics = resultBasics(ctx.packs, pack, level, c, res.log || []);
  const pattern = basics.gaps[0] || null;
  const hasBasics = basics.first || basics.only.length > 0;
  // Karteikasten (Welle 11, Schritt 8): neu geschaffte Stufe ohne Hilfen in Fach 1; eine fällige Stufe zählt wie
  // eine Wiederholung; nicht fällig: nichts
  const repeated = afterRound(ctx.state, level, c, today());
  if (repeated) ctx.save();
  const rnote = repeatNote(repeated);
  const basicsBtn = `<button class="btn primary" id="rBasics">${BASICS_SHORT}</button>`;
  const action = !pattern ? "" : pattern.helps
    ? (pattern.open ? `<button class="btn primary" data-gap-open="0">${openLabel(ctx.packs, pack, pattern.open, true)}</button>` : "")
    : basicsBtn;
  $("#pPlay").hidden = true;
  $("#pHelps").hidden = true;
  $("#pResult").hidden = false;
  $("#pResult").innerHTML = `
      <p class="eyebrow">Runde beendet</p>
      ${engine.starsHtml(stars)}
      <p class="big num">${c} / ${res.total}</p>
      <p class="muted">${engine.resultMessage(stars, { correct: c, total: res.total, short: !!pattern || basics.first })}</p>
      <p class="small muted num">${resultLine(pack, gained, avg)}</p>
      ${note ? `<p class="unlock-line" id="rUnlock">${engine.keepStufe(note)}</p>` : ""}
      ${rnote ? `<p class="small" id="rRepeat">${rnote}</p>` : ""}
      ${pattern ? `<div class="gap stack">
        <p class="gap-line">${pattern.text}</p>
        ${action}
      </div>` : ""}
      <div class="row" style="justify-content:center">
        ${!pattern && hasBasics ? basicsBtn : ""}
        <button class="btn${hasBasics || pattern ? "" : " primary"}" id="rAgain">Nochmal</button>
        ${nextOpen && !pattern ? `<button class="btn" id="rNext">Stufe ${next.no}</button>` : ""}
        <button class="btn ghost" id="rHome">Übersicht</button>
      </div>`;
  $("#rAgain").addEventListener("click", () => render());
  // ein Knopf: nach einem Muster nur dessen Grundlage(n), sonst (unter 5 Richtigen) alle Voraussetzungen
  if ($("#rBasics")) $("#rBasics").addEventListener("click", () =>
    ctx.show("practice", { mode: "grundlagen", levelId: level.id, only: basics.only.length ? basics.only : null }));
  $("#pResult").querySelectorAll("[data-gap-open]").forEach((b) => b.addEventListener("click", () => {
    ctx.state.current = basics.gaps[+b.dataset.gapOpen].open; ctx.save(); ctx.show("practice");
  }));
  if (nextOpen && !pattern) $("#rNext").addEventListener("click", () => { ctx.state.current = next.id; ctx.save(); render(); });
  $("#rHome").addEventListener("click", () => ctx.show("home"));
  ctx.renderTop();
}

// Laufende Runde beenden (Tab-Wechsel)
export const stop = () => engine.stop();

// Tastatur: true, wenn die Taste verwendet wurde
export const handleKey = (e) => engine.handleKey(e);
