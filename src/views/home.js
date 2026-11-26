// Startseite: Karte „Heute“ (Wiederholung über Tage, Weiter üben), Pakete mit ihren Stufen
import { isUnlocked, unlockedBy, today, dayDiff, addDays } from "../store.js";
import { findLevel, starsHtml, keepStufe } from "../engine.js";
import { due, nextDue, reviewPlan, dueText } from "../repeat.js";
import { learnTabOf } from "./learn.js";
import { countUnsure } from "../adapt.js";
import { NOTE_KEYS } from "../packs/noten.js";
import { sections, nextUp, klasseText } from "../klasse.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

export function init(c) {
  ctx = c;
  // „Weiter üben“: mit Jahrgang die nächste Stufe aus „Jetzt dran“ (klasse.nextUp), sonst die aktuelle Stufe
  $("#homeContinue").addEventListener("click", () => {
    const id = continueId(ctx.state, ctx.packs);
    if (id !== ctx.state.current) { ctx.state.current = id; ctx.save(); }
    ctx.show("practice");
  });
  // Runde „Wiederholen“ (Welle 11, Schritt 8): der Plan entsteht beim Start aus dem Karteikasten (repeat.reviewPlan)
  $("#homeReview").addEventListener("click", () => ctx.show("practice", { mode: "wiederholen" }));
  // „Erst anschauen“ öffnet in „Lernen“ den Reiter zur aktuellen Stufe (Welle 11, Schritt 2): den des Pakets,
  // bei „Takt füllen“ den Reiter „Takt“ (learnTabOf)
  $("#homeLearn").addEventListener("click", () => ctx.show("learn", { tab: learnTabOf(ctx.packs, continueId(ctx.state, ctx.packs)) }));
  $("#unlockAll").addEventListener("click", () => { ctx.state.unlockAll = !ctx.state.unlockAll; ctx.save(); render(); });
  // Klick auf eine Stufe (Delegation, weil die Liste bei jedem render neu entsteht)
  $("#levelList").addEventListener("click", (e) => {
    const b = e.target.closest(".level[data-id]");
    if (!b || b.disabled) return;
    ctx.state.current = b.dataset.id; ctx.save(); ctx.show("practice");
  });
}

// Zusatz für gesperrte Stufen (rein, getestet, Welle 10, A7): immer die Regel „frei ab 8/10 in Stufe n“
// mit n = unlockedBy (requires oder die Stufe davor). Leer nur, wenn keine Stufe freischaltet (erste
// Stufe oder ein requires, das es im Paket nicht gibt)
export function lockText(pack, l) {
  const by = unlockedBy(pack, l.id);
  return by ? `frei ab 8/10 in Stufe ${by.no}` : "";
}

// Kurzname eines Pakets für Aufzählungen: „Dreiklänge“ statt „Dreiklänge und Quintenzirkel“ (pack.short)
export const packShort = (pack) => (pack ? pack.short || pack.title : "");

// Marke an fälligen Stufen (Welle 11, Schritt 8): sichtbarer Text, das Zeichen wird nicht vorgelesen
export const AGAIN_TEXT = "wieder dran";
export const againHtml = () => `<span class="again"><span aria-hidden="true">↻</span>\u00a0${AGAIN_TEXT}</span>`;

// Eine Stufenkarte; dueSet: IDs der fälligen Stufen (repeat.due); withPack: Paketname vorn in der Unterzeile
// (Abschnitt „Jetzt dran“, Stufen aus mehreren Paketen)
export function levelHtml(s, pack, l, dueSet = new Set(), withPack = false) {
  const st = s.levels[l.id] || {}, open = isUnlocked(s, pack, l.id);
  const lock = open ? "" : lockText(pack, l);
  const again = dueSet.has(l.id) ? ` · ${againHtml()}` : "";
  return `<button class="level ${open ? "" : "locked"} ${l.id === s.current ? "current" : ""}" data-id="${l.id}" ${open ? "" : "disabled"}>
        <span class="level-no ${st.stars >= 2 ? "done" : ""}">${open ? l.no : "🔒"}</span>
        <span><span class="level-title">${l.title}</span><br><span class="small muted">${withPack ? `${packShort(pack)} · ` : ""}${l.subtitle || ""}${lock ? ` · ${keepStufe(lock)}` : ""}${st.played ? ` · beste Runde ${st.best}/10` : ""}${again}</span></span>
        ${starsHtml(st.stars || 0)}
      </button>`;
}

// Hinweis auf der Karte „Noten lesen“, wenn Noten noch unsicher sind (Anzahl aus countUnsure in adapt.js)
export const unsureText = (k) => (k === 1
  ? "1 Note sitzt noch nicht. Sie kommt in den Runden öfter dran."
  : `${k} Noten sitzen noch nicht. Sie kommen in den Runden öfter dran.`);

/* ---------- Karte „Heute“ (Welle 11, Schritt 8; rein, getestet) ---------- */

const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} und ${xs[xs.length - 1]}`);

// Stufe für „Weiter üben“: mit Jahrgang die nächste nicht geschaffte Stufe aus „Jetzt dran“ (klasse.nextUp),
// sonst (ohne Jahrgang oder wenn „Jetzt dran“ leer ist) die aktuelle Stufe wie bisher
export const continueId = (state, packs) => nextUp(state, packs) || state.current;

// „Weiter üben: Tonleitern, Stufe 6“ bzw. „Starten: Noten lesen, Stufe 1“ (nie gespielte Stufe)
export function continueText(state, packs) {
  const { pack, level } = findLevel(packs, continueId(state, packs));
  return keepStufe(`${(state.levels || {})[level.id] ? "Weiter üben" : "Starten"}: ${packShort(pack)}, Stufe ${level.no}`);
}

// „10 Aufgaben aus Intervalle 4, Tonleitern 5 und Noten lesen 7“ (plan aus repeat.reviewPlan)
export function reviewListText(packs, plan) {
  const total = plan.reduce((a, e) => a + e.n, 0);
  return `${total} Aufgaben aus ${andList(plan.map((e) => { const { pack, level } = findLevel(packs, e.id); return `${packShort(pack)}\u00a0${level.no}`; }))}`;
}

// Satz zur Tagesserie. Der Zusatz „Eine Runde heute hält die Serie am Leben.“ steht nur, wenn die Serie bis gestern
// reicht und heute noch nicht geübt wurde; nach der Runde von heute bleibt die Zahl ohne Zusatz. Ist die Serie
// gerissen (letzter Übetag vor gestern), steht der allgemeine Satz – kein Hinweis auf Versäumtes.
const STREAK_NONE = "Eine Runde dauert etwa zwei Minuten. Zehn Aufgaben, dann gibt es Sterne.";
export function streakText(s, heute) {
  if (!(s.dayStreak >= 2)) return STREAK_NONE;
  const n = `${s.dayStreak} Tage in Folge geübt.`;
  if (s.lastDay === heute) return n;
  if (s.lastDay === addDays(heute, -1)) return `${n} Eine Runde heute hält die Serie am Leben.`;
  return STREAK_NONE;
}
export const BOX_EMPTY_TEXT = "Was du mit 8 von 10 schaffst, kommt nach einem Tag zum Wiederholen wieder.";
export const REVIEW_START = "Wiederholung starten";

// Inhalt der Karte „Heute“ ganz oben auf der Startseite: { title, line, review, cont, small }.
// review: Beschriftung des Hauptknopfs „Wiederholung starten“ oder null (nichts fällig); cont: „Weiter üben: …“
// (Hauptknopf, wenn nichts fällig ist, sonst der zweite Knopf); small: kleine Zeile darunter oder "".
// Nichts fällig, Kasten nicht leer: „Nächste Wiederholung: morgen“; Kasten leer: wie der Kasten sich füllt.
// Kein Zähler für Versäumtes: Auch nach langer Pause nennt die Karte nur die nächste Runde.
export function todayCard(state, packs, heute) {
  const cont = continueText(state, packs);
  const plan = reviewPlan(state, packs, heute);
  if (plan.length) return { title: "Wiederholen", line: reviewListText(packs, plan), review: REVIEW_START, cont, small: "" };
  const next = nextDue(state, heute);
  return {
    title: "Bereit für eine Runde?", line: streakText(state, heute), review: null, cont,
    small: next ? `Nächste Wiederholung: ${dueText(dayDiff(heute, next))}` : BOX_EMPTY_TEXT,
  };
}

function renderToday(s, heute) {
  const c = todayCard(s, ctx.packs, heute);
  $("#homeTitle").textContent = c.title;
  $("#homeSub").textContent = c.line;
  $("#homeReview").hidden = !c.review;
  if (c.review) $("#homeReview").textContent = c.review;
  $("#homeContinue").textContent = c.cont;
  // Hauptknopf: „Wiederholung starten“, wenn etwas fällig ist, sonst „Weiter üben“
  $("#homeContinue").className = "btn" + (c.review ? "" : " primary");
  $("#homeSmall").textContent = c.small;
  $("#homeSmall").hidden = !c.small;
}

/* ---------- Abschnitte mit Jahrgang (Welle 11, Schritt 12; rein, getestet) ---------- */

export const SECTION_TITLES = { jetzt: "Jetzt dran", gewesen: "Schon dran gewesen", hinaus: "Darüber hinaus" };
// „Jahrgang 6 · über den Link deiner Lehrkraft“ (klasseText, also auch „…, Musisches Gymnasium“)
export const klasseHint = (k) => `${klasseText(k)} · über den Link deiner Lehrkraft`;
// Satz bei leerem „Jetzt dran“: Kommt im Jahrgang nichts Neues dazu (8 bis 13), oder ist das Neue geschafft?
export const nothingNewText = (k) => `In Jahrgang ${k.jahrgang} kommt nichts Neues dazu. Alles hier ist zum Wiederholen da.`;
export const allDoneText = (k) => `Was in Jahrgang ${k.jahrgang} neu ist, hast du mit 8 von 10 geschafft. Alles hier ist zum Wiederholen da.`;

// Startseite mit Jahrgang: { hint, jetzt: { title, ids, empty }, gewesen: { title, groups }, hinaus: { title, groups } }
// mit groups = [{ pack, ids }] je Paket (nur Pakete mit Stufen im Abschnitt). null ohne Jahrgang (dann bleibt die
// Startseite wie nach Schritt 8). empty: Satz, wenn „Jetzt dran“ leer ist, sonst "".
export function homeSections(state, packs) {
  const sec = sections(state, packs);
  if (!sec) return null;
  const k = state.klasse;
  const group = (ids) => packs.map((pack) => ({ pack, ids: pack.levels.map((l) => l.id).filter((id) => ids.includes(id)) }))
    .filter((g) => g.ids.length);
  // ohne Fortschritt leer → der Jahrgang bringt nichts Neues; sonst ist alles Neue geschafft
  const neu = sections({ klasse: k, levels: {} }, packs).jetzt.length > 0;
  return {
    hint: klasseHint(k),
    jetzt: { title: SECTION_TITLES.jetzt, ids: sec.jetzt, empty: sec.jetzt.length ? "" : neu ? allDoneText(k) : nothingNewText(k) },
    gewesen: { title: SECTION_TITLES.gewesen, groups: group(sec.gewesen) },
    hinaus: { title: SECTION_TITLES.hinaus, groups: group(sec.hinaus) },
  };
}

// Hinweis „… Noten sitzen noch nicht“ unter der Überschrift „Noten lesen“
const unsureHtml = (pack, unsure) => (pack.id === "noten" && unsure ? `<p class="small muted unsure-hint">${unsureText(unsure)}</p>` : "");

// Je Paket ein Abschnitt: Überschrift, dann die Stufen (ohne Jahrgang; mit Jahrgang innerhalb der Abschnitte)
function packsHtml(s, groups, dueSet, unsure, tag) {
  return groups.map(({ pack, ids }) => `<section class="levels" data-pack="${pack.id}">
      <${tag}>${pack.title}</${tag}>
      ${unsureHtml(pack, unsure)}
      ${pack.levels.filter((l) => ids.includes(l.id)).map((l) => levelHtml(s, pack, l, dueSet)).join("")}
    </section>`).join("");
}

function sectionsHtml(s, h, dueSet, unsure) {
  const findPack = (id) => findLevel(ctx.packs, id);
  // „Noten sitzen noch nicht“ in „Jetzt dran“, wenn dort Stufen aus „Noten lesen“ stehen (sonst beim Paket)
  const notenNow = h.jetzt.ids.some((id) => findPack(id).pack.id === "noten");
  const jetzt = `<section class="levels klasse-sec" data-sec="jetzt"><h2>${h.jetzt.title}</h2>
      ${notenNow && unsure ? `<p class="small muted unsure-hint">${unsureText(unsure)}</p>` : ""}
      ${h.jetzt.empty ? `<p class="muted">${h.jetzt.empty}</p>` : h.jetzt.ids.map((id) => { const { pack, level } = findPack(id); return levelHtml(s, pack, level, dueSet, true); }).join("")}
    </section>`;
  const rest = notenNow ? 0 : unsure;
  const gewesen = h.gewesen.groups.length ? `<section class="levels klasse-sec" data-sec="gewesen"><h2>${h.gewesen.title}</h2>
      ${packsHtml(s, h.gewesen.groups, dueSet, rest, "h3")}</section>` : "";
  const shownNoten = notenNow || h.gewesen.groups.some((g) => g.pack.id === "noten");
  const hinaus = h.hinaus.groups.length ? `<details class="levels klasse-sec more" data-sec="hinaus"><summary><h2>${h.hinaus.title}</h2></summary>
      <div class="levels">${packsHtml(s, h.hinaus.groups, dueSet, shownNoten ? 0 : unsure, "h3")}</div></details>` : "";
  return `<p class="small muted klasse-hint">${h.hint}</p>${jetzt}${gewesen}${hinaus}`;
}

export function render() {
  const s = ctx.state;
  ctx.renderTop();
  const heute = today();
  renderToday(s, heute);
  $("#unlockAll").textContent = s.unlockAll ? "Demo-Freischaltung aufheben" : "Alle Stufen öffnen (Demo)";
  // Ohne Jahrgang: je Paket ein Abschnitt (wie nach Schritt 8). Mit Jahrgang: „Jetzt dran“, „Schon dran gewesen“,
  // „Darüber hinaus“ (zugeklappt) aus klasse.sections (Welle 11, Schritt 12)
  const unsure = countUnsure(s.notes, NOTE_KEYS);
  const dueSet = new Set(due(s, ctx.packs, heute));
  const h = homeSections(s, ctx.packs);
  $("#levelList").innerHTML = h ? sectionsHtml(s, h, dueSet, unsure)
    : packsHtml(s, ctx.packs.map((pack) => ({ pack, ids: pack.levels.map((l) => l.id) })), dueSet, unsure, "h2");
}
