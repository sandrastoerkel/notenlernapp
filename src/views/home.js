// Startseite: Karte „Heute“ (Wiederholung über Tage, Weiter üben), Pakete mit ihren Stufen
import { isUnlocked, unlockedBy, today, dayDiff, addDays } from "../store.js";
import { findLevel, starsHtml, keepStufe } from "../engine.js";
import { due, nextDue, reviewPlan, dueText } from "../repeat.js";
import { learnTabOf } from "./learn.js";
import { countUnsure } from "../adapt.js";
import { NOTE_KEYS } from "../packs/noten.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

export function init(c) {
  ctx = c;
  $("#homeContinue").addEventListener("click", () => ctx.show("practice"));
  // Runde „Wiederholen“ (Welle 11, Schritt 8): der Plan entsteht beim Start aus dem Karteikasten (repeat.reviewPlan)
  $("#homeReview").addEventListener("click", () => ctx.show("practice", { mode: "wiederholen" }));
  // „Erst anschauen“ öffnet in „Lernen“ den Reiter zur aktuellen Stufe (Welle 11, Schritt 2): den des Pakets,
  // bei „Takt füllen“ den Reiter „Takt“ (learnTabOf)
  $("#homeLearn").addEventListener("click", () => ctx.show("learn", { tab: learnTabOf(ctx.packs, ctx.state.current) }));
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

// Eine Stufenkarte; dueSet: IDs der fälligen Stufen (repeat.due)
export function levelHtml(s, pack, l, dueSet = new Set()) {
  const st = s.levels[l.id] || {}, open = isUnlocked(s, pack, l.id);
  const lock = open ? "" : lockText(pack, l);
  const again = dueSet.has(l.id) ? ` · ${againHtml()}` : "";
  return `<button class="level ${open ? "" : "locked"} ${l.id === s.current ? "current" : ""}" data-id="${l.id}" ${open ? "" : "disabled"}>
        <span class="level-no ${st.stars >= 2 ? "done" : ""}">${open ? l.no : "🔒"}</span>
        <span><span class="level-title">${l.title}</span><br><span class="small muted">${l.subtitle || ""}${lock ? ` · ${keepStufe(lock)}` : ""}${st.played ? ` · beste Runde ${st.best}/10` : ""}${again}</span></span>
        ${starsHtml(st.stars || 0)}
      </button>`;
}

// Hinweis auf der Karte „Noten lesen“, wenn Noten noch unsicher sind (Anzahl aus countUnsure in adapt.js)
export const unsureText = (k) => (k === 1
  ? "1 Note sitzt noch nicht. Sie kommt in den Runden öfter dran."
  : `${k} Noten sitzen noch nicht. Sie kommen in den Runden öfter dran.`);

/* ---------- Karte „Heute“ (Welle 11, Schritt 8; rein, getestet) ---------- */

const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} und ${xs[xs.length - 1]}`);

// „Weiter üben: Tonleitern, Stufe 6“ bzw. „Starten: Noten lesen, Stufe 1“ (nie gespielte Stufe)
export function continueText(state, packs) {
  const { pack, level } = findLevel(packs, state.current);
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

export function render() {
  const s = ctx.state;
  ctx.renderTop();
  const heute = today();
  renderToday(s, heute);
  $("#unlockAll").textContent = s.unlockAll ? "Demo-Freischaltung aufheben" : "Alle Stufen öffnen (Demo)";
  // Je Paket ein Abschnitt: Überschrift, dann die Stufen. Mit Jahrgang kommen hier in Schritt 12 die Abschnitte
  // „Jetzt dran“, „Schon dran gewesen“ und „Darüber hinaus“ dazu (klasse.sections); ohne Jahrgang bleibt es so.
  const unsure = countUnsure(s.notes, NOTE_KEYS);
  const dueSet = new Set(due(s, ctx.packs, heute));
  $("#levelList").innerHTML = ctx.packs.map((pack) => `<section class="levels" data-pack="${pack.id}">
      <h2>${pack.title}</h2>
      ${pack.id === "noten" && unsure ? `<p class="small muted unsure-hint">${unsureText(unsure)}</p>` : ""}
      ${pack.levels.map((l) => levelHtml(s, pack, l, dueSet)).join("")}
    </section>`).join("");
}
