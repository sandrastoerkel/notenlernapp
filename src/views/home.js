// Startseite: Begrüßung, Trefferquote, Pakete mit ihren Stufen
import { isUnlocked, accuracy } from "../store.js";
import { findLevel, starsHtml } from "../engine.js";

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

function levelHtml(s, pack, l) {
  const st = s.levels[l.id] || {}, open = isUnlocked(s, pack, l.id);
  return `<button class="level ${open ? "" : "locked"} ${l.id === s.current ? "current" : ""}" data-id="${l.id}" ${open ? "" : "disabled"}>
        <span class="level-no ${st.stars >= 2 ? "done" : ""}">${open ? l.no : "🔒"}</span>
        <span><span class="level-title">${l.title}</span><br><span class="small muted">${l.subtitle || ""}${st.played ? ` · beste Runde ${st.best}/10` : ""}</span></span>
        ${starsHtml(st.stars || 0)}
      </button>`;
}

export function render() {
  const s = ctx.state;
  ctx.renderTop();
  const acc = accuracy(s);
  $("#homeAccuracy").textContent = acc === null ? "–" : acc + " %";
  const { level } = findLevel(ctx.packs, s.current);
  $("#homeContinue").textContent = (s.levels[level.id] ? "Weiter üben: " : "Starten: ") + "Stufe " + level.no;
  $("#homeSub").textContent = s.dayStreak >= 2 ? `${s.dayStreak} Tage in Folge geübt. Eine Runde heute hält die Serie am Leben.` : "Eine Runde dauert etwa zwei Minuten. Zehn Noten, dann gibt es Sterne.";
  $("#unlockAll").textContent = s.unlockAll ? "Demo-Freischaltung aufheben" : "Alle Stufen öffnen (Demo)";
  // Je Paket ein Abschnitt: Überschrift, dann die Stufen
  $("#levelList").innerHTML = ctx.packs.map((pack) => `<section class="levels" data-pack="${pack.id}">
      <h2>${pack.title}</h2>
      ${pack.levels.map((l) => levelHtml(s, pack, l)).join("")}
    </section>`).join("");
}
