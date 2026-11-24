// Startseite: Begrüßung, Trefferquote, Pakete mit ihren Stufen
import { isUnlocked, unlockedBy, accuracy } from "../store.js";
import { findLevel, starsHtml, keepStufe } from "../engine.js";
import { countUnsure } from "../adapt.js";
import { NOTE_KEYS } from "../packs/noten.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

export function init(c) {
  ctx = c;
  $("#homeContinue").addEventListener("click", () => ctx.show("practice"));
  $("#homeLearn").addEventListener("click", () => ctx.show("learn"));
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

function levelHtml(s, pack, l) {
  const st = s.levels[l.id] || {}, open = isUnlocked(s, pack, l.id);
  const lock = open ? "" : lockText(pack, l);
  return `<button class="level ${open ? "" : "locked"} ${l.id === s.current ? "current" : ""}" data-id="${l.id}" ${open ? "" : "disabled"}>
        <span class="level-no ${st.stars >= 2 ? "done" : ""}">${open ? l.no : "🔒"}</span>
        <span><span class="level-title">${l.title}</span><br><span class="small muted">${l.subtitle || ""}${lock ? ` · ${keepStufe(lock)}` : ""}${st.played ? ` · beste Runde ${st.best}/10` : ""}</span></span>
        ${starsHtml(st.stars || 0)}
      </button>`;
}

// Hinweis auf der Karte „Noten lesen“, wenn Noten noch unsicher sind (Anzahl aus countUnsure in adapt.js)
export const unsureText = (k) => (k === 1
  ? "1 Note sitzt noch nicht. Sie kommt in den Runden öfter dran."
  : `${k} Noten sitzen noch nicht. Sie kommen in den Runden öfter dran.`);

export function render() {
  const s = ctx.state;
  ctx.renderTop();
  const acc = accuracy(s);
  $("#homeAccuracy").textContent = acc === null ? "–" : acc + " %";
  const { level } = findLevel(ctx.packs, s.current);
  $("#homeContinue").textContent = (s.levels[level.id] ? "Weiter üben: " : "Starten: ") + "Stufe " + level.no;
  $("#homeSub").textContent = s.dayStreak >= 2 ? `${s.dayStreak} Tage in Folge geübt. Eine Runde heute hält die Serie am Leben.` : "Eine Runde dauert etwa zwei Minuten. Zehn Aufgaben, dann gibt es Sterne.";
  $("#unlockAll").textContent = s.unlockAll ? "Demo-Freischaltung aufheben" : "Alle Stufen öffnen (Demo)";
  // Je Paket ein Abschnitt: Überschrift, dann die Stufen
  const unsure = countUnsure(s.notes, NOTE_KEYS);
  $("#levelList").innerHTML = ctx.packs.map((pack) => `<section class="levels" data-pack="${pack.id}">
      <h2>${pack.title}</h2>
      ${pack.id === "noten" && unsure ? `<p class="small muted unsure-hint">${unsureText(unsure)}</p>` : ""}
      ${pack.levels.map((l) => levelHtml(s, pack, l)).join("")}
    </section>`).join("");
}
