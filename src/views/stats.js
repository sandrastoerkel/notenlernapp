// Statistik: Kacheln, schwache Noten, Stufen, Zurücksetzen
import { reset, accuracy } from "../store.js";
import { starsHtml } from "../engine.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

export function init(c) { ctx = c; }

export function render() {
  const s = ctx.state;
  const acc = accuracy(s);
  const starsTotal = Object.values(s.levels).reduce((a, st) => a + (st.stars || 0), 0);
  const allLevels = ctx.packs.flatMap((p) => p.levels);
  $("#sTiles").innerHTML = [
    ["Noten beantwortet", s.answered], ["Trefferquote", acc === null ? "–" : acc + " %"], ["Sterne", `${starsTotal} / ${allLevels.length * 3}`],
    ["Tage in Folge", s.dayStreak], ["Blitz-Rekord", s.blitzRecord], ["Längste Serie", s.bestCombo],
  ].map(([k, v]) => `<div class="tile"><p class="eyebrow">${k}</p><p class="big num">${v}</p></div>`).join("");
  const weak = Object.entries(s.notes).filter(([, n]) => n.bad > 0).sort((a, b) => b[1].bad - a[1].bad).slice(0, 6);
  const max = weak.length ? weak[0][1].bad : 1;
  $("#sWeak").innerHTML = weak.length ? weak.map(([k, n]) => `<div class="list-row"><b>${k}</b><div class="bar"><i style="width:${Math.round((100 * n.bad) / max)}%"></i></div><span class="small muted num">${n.bad}× falsch</span></div>`).join("") : `<p class="muted">Noch keine Fehler. Das ist entweder sehr gut, oder du hast noch nicht geübt.</p>`;
  $("#sLevels").innerHTML = allLevels.map((l) => { const st = s.levels[l.id] || {}; const pct = st.best ? st.best * 10 : 0; return `<div class="list-row"><span class="small">Stufe ${l.no} · ${l.title}</span><div class="bar ok"><i style="width:${pct}%"></i></div>${starsHtml(st.stars || 0)}</div>`; }).join("");
  // Zurücksetzen mit Rückfrage direkt in der Karte (wie in der ersten Fassung)
  $("#sResetRow").innerHTML = `<button class="btn ghost" id="sReset">Fortschritt zurücksetzen</button>`;
  $("#sReset").addEventListener("click", () => {
    $("#sResetRow").innerHTML = `<span class="small">Wirklich alles löschen?</span><button class="btn bad" id="sYes" style="border-color:var(--bad);color:var(--bad)">Ja, löschen</button><button class="btn ghost" id="sNo">Abbrechen</button>`;
    $("#sYes").addEventListener("click", () => { ctx.state = reset(ctx.state); ctx.save(); render(); });
    $("#sNo").addEventListener("click", render);
  });
  ctx.renderTop();
}
