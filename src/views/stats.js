// Statistik: Kacheln, schwache Noten, Ergebnisse je Stufe (nach Paketen), Zurücksetzen
import { reset, accuracy } from "../store.js";
import { starsHtml } from "../engine.js";

const $ = (s) => document.querySelector(s);
let ctx = null;

/* ---------- Reine Hilfsfunktionen (ohne DOM, getestet in test/views/stats.test.js) ---------- */

// Schwache Einträge aus state.notes ({ key: { ok, bad } }): nur mit bad > 0,
// absteigend nach bad (bei Gleichstand nach Name), höchstens limit Stück.
// pct ist der Balken im Verhältnis zum größten Wert (0 bis 100).
export function weakList(notes, limit = 6) {
  const list = Object.entries(notes || {})
    .filter(([, n]) => n && n.bad > 0)
    .sort((a, b) => b[1].bad - a[1].bad || a[0].localeCompare(b[0], "de"))
    .slice(0, limit);
  const max = list.length ? list[0][1].bad : 1;
  return list.map(([key, n]) => ({ key, bad: n.bad, ok: n.ok || 0, pct: Math.round((100 * n.bad) / max) }));
}

// Eine Zeile je Stufe aus state.levels ({ "noten-1": { stars, best, played } }).
// best ist die beste Runde (richtige von 10), pct der Balken (best * 10).
export function levelRow(level, entry) {
  const e = entry || {};
  const played = e.played || 0, best = e.best || 0;
  return {
    id: level.id, no: level.no, title: level.title,
    played, best, stars: e.stars || 0,
    pct: Math.max(0, Math.min(100, best * 10)),
  };
}

// Stufen nach Paketen gruppiert, in der Reihenfolge der Registry.
// Je Paket: Zeilen aller Stufen, Anzahl gespielter Stufen, Sterne gesamt und möglich.
// Einträge in state.levels ohne passende Stufe (alte oder unbekannte IDs) werden übergangen.
export function levelGroups(packs, levels) {
  const st = levels || {};
  return packs.map((p) => {
    const rows = p.levels.map((l) => levelRow(l, st[l.id]));
    return {
      id: p.id, title: p.title, rows,
      played: rows.filter((r) => r.played > 0).length,
      stars: rows.reduce((a, r) => a + r.stars, 0),
      maxStars: rows.length * 3,
    };
  });
}

// Kurztext für eine Stufe: „8/10 · 3× gespielt“ bzw. „noch nicht gespielt“
export const levelRowText = (r) => (r.played > 0 ? `${r.best}/10 · ${r.played}× gespielt` : "noch nicht gespielt");

/* ---------- Ansicht ---------- */

export function init(c) { ctx = c; }

export function render() {
  const s = ctx.state;
  const acc = accuracy(s);
  const starsTotal = Object.values(s.levels).reduce((a, st) => a + (st.stars || 0), 0);
  const allLevels = ctx.packs.flatMap((p) => p.levels);
  $("#sTiles").innerHTML = [
    ["Aufgaben beantwortet", s.answered], ["Trefferquote", acc === null ? "–" : acc + " %"], ["Sterne", `${starsTotal} / ${allLevels.length * 3}`],
    ["Tage in Folge", s.dayStreak], ["Blitz-Rekord", s.blitzRecord], ["Längste Serie", s.bestCombo],
  ].map(([k, v]) => `<div class="tile"><p class="eyebrow">${k}</p><p class="big num">${v}</p></div>`).join("");
  const weak = weakList(s.notes, 6);
  $("#sWeak").innerHTML = weak.length ? weak.map((w) => `<div class="list-row"><b>${w.key}</b><div class="bar"><i style="width:${w.pct}%"></i></div><span class="small muted num">${w.bad}× daneben</span></div>`).join("") : `<p class="muted">Noch nichts daneben. Das ist entweder sehr gut, oder du hast noch nicht geübt.</p>`;
  // Je Stufe: nach Paketen gruppiert; nie gespielte Stufen erscheinen gedämpft
  $("#sLevels").innerHTML = levelGroups(ctx.packs, s.levels).map((g) => `<div class="stack level-group"><div class="row between"><p class="eyebrow">${g.title}</p><span class="small muted num">${g.played} / ${g.rows.length} gespielt · ${g.stars} / ${g.maxStars} Sterne</span></div>`
    + g.rows.map((r) => `<div class="list-row level-stat${r.played ? "" : " muted"}"><span class="small">Stufe ${r.no} · ${r.title}</span><div class="bar ok"><i style="width:${r.pct}%"></i></div><span class="row level-stat-end"><span class="small muted num">${levelRowText(r)}</span>${starsHtml(r.stars)}</span></div>`).join("")
    + `</div>`).join("");
  // Zurücksetzen mit Rückfrage direkt in der Karte (wie in der ersten Fassung)
  $("#sResetRow").innerHTML = `<button class="btn ghost" id="sReset">Fortschritt zurücksetzen</button>`;
  $("#sReset").addEventListener("click", () => {
    $("#sResetRow").innerHTML = `<span class="small">Wirklich alles löschen?</span><button class="btn bad" id="sYes" style="border-color:var(--bad);color:var(--bad)">Ja, löschen</button><button class="btn ghost" id="sNo">Abbrechen</button>`;
    $("#sYes").addEventListener("click", () => { ctx.state = reset(ctx.state); ctx.save(); render(); });
    $("#sNo").addEventListener("click", render);
  });
  ctx.renderTop();
}
