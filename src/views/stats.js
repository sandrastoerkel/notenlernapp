// Statistik: Kacheln, Notenkarte, schwache Noten, Ergebnisse je Stufe (nach Paketen), Zurücksetzen
import { reset, accuracy } from "../store.js";
import { starsHtml } from "../engine.js";
import { gName, helm } from "../music.js";
import { staffSvg, noteSvg } from "../staff.js";
import { status, MIN_ANTWORTEN, QUOTE_SICHER, LANGSAM_SEK } from "../adapt.js";
import { HEAT_NOTES, statKey } from "../packs/noten.js";

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

// Notenkarte: Klasse des Notenkopfs je Zustand (Farbe nur über Tokens in css/style.css)
export const HEAT_CLS = { sicher: "ok", langsam: "warn", unsicher: "bad", neu: "ghost" };
// Legende in der Reihenfolge der Anzeige
export const HEAT_LEGEND = [
  ["sicher", "sicher"],
  ["langsam", `langsam (über ${LANGSAM_SEK} s)`],
  ["unsicher", `unsicher (unter ${Math.round(QUOTE_SICHER * 100)} % richtig)`],
  ["neu", `neu (unter ${MIN_ANTWORTEN} Antworten)`],
];

const sec1 = (v) => v.toFixed(1).replace(".", ",");

// Eine Zelle der Notenkarte zu einer Note im Schlüssel clef ("treble" oder "bass").
// pct ist die Trefferquote in Prozent oder null, avg die mittlere Zeit richtiger Antworten oder null.
export function heatCell(n, clef, entry) {
  const e = entry || {};
  const ok = e.ok || 0, total = ok + (e.bad || 0), timed = e.timed || 0;
  const st = status(e), key = statKey(n, clef);
  const pct = total ? Math.round((100 * ok) / total) : null;
  const avg = timed ? (e.sec || 0) / timed : null;
  const detail = total
    ? `${key}: ${ok} von ${total} richtig${avg === null ? "" : `, im Schnitt ${sec1(avg)} s`}`
    : `${key}: noch nicht geübt`;
  return { key, n, clef, name: gName(n), helm: helm(n), status: st, cls: HEAT_CLS[st], ok, total, pct, avg, detail };
}

// Zeilen der Notenkarte je Schlüssel: alle Stammtöne aus „Noten lesen“ von tief nach hoch,
// höchstens perRow Noten je Zeile (bei 13 Noten 7 + 6, damit es bei 420 px lesbar bleibt).
export function heatRows(notes, clef, perRow = 7) {
  const cells = HEAT_NOTES[clef].map((it) => heatCell(it.n, it.clef, (notes || {})[statKey(it.n, it.clef)]));
  const rows = [];
  for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow));
  return rows;
}

// Vorzeichen-Noten (Stufe 7) als Liste in der Reihenfolge der Stufe
export const heatAccList = (notes) => HEAT_NOTES.acc.map((it) => heatCell(it.n, it.clef, (notes || {})[statKey(it.n, it.clef)]));

// x-Position der Note i in einer Zeile der Notenkarte (Einheiten des viewBox, Breite 320);
// gleicher Abstand in allen Zeilen, damit die Noten untereinander stehen
export const heatX = (i) => 88 + i * (200 / 6);

/* ---------- Ansicht ---------- */

export function init(c) {
  ctx = c;
  // Antippen einer Note in der Notenkarte zeigt die Einzelwerte (Delegation, Liste entsteht bei render neu)
  $("#sHeat").addEventListener("click", (e) => {
    const b = e.target.closest("[data-detail]");
    if (!b) return;
    $("#sHeat").querySelectorAll("[data-detail].on").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    $("#sHeatDetail").textContent = b.dataset.detail;
  });
}

const attr = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const pctText = (c) => (c.pct === null ? "–" : c.pct + " %");

// Eine Zeile der Notenkarte: Notenzeile mit farbigen Köpfen, darunter Name (Helmholtz, damit c' und c''
// unterscheidbar sind) und Trefferquote zum Antippen
function heatRowHtml(row) {
  const notes = row.map((c, i) => noteSvg(c.n, c.clef, heatX(i), c.cls, { stemless: true })).join("");
  const labels = row.map((c, i) => `<button type="button" class="heat-cell" data-detail="${attr(c.detail)}" aria-label="${attr(c.detail)}" style="left:${((100 * heatX(i)) / 320).toFixed(2)}%"><b>${c.helm}</b><span class="num">${pctText(c)}</span></button>`).join("");
  return `<div class="heat-row">${staffSvg(row[0].clef, notes)}<div class="heat-labels">${labels}</div></div>`;
}

function heatHtml(notes) {
  const legend = HEAT_LEGEND.map(([st, label]) => `<span class="heat-key"><i class="heat-dot ${HEAT_CLS[st]}"></i>${label}</span>`).join("");
  const acc = heatAccList(notes).map((c) => `<button type="button" class="list-row heat-acc" data-detail="${attr(c.detail)}"><b><i class="heat-dot ${c.cls}"></i>${c.name} (${c.helm})</b><span class="small muted">${c.status}</span><span class="small num">${pctText(c)}</span></button>`).join("");
  return `<div class="row between"><h3>Notenkarte</h3><span class="small muted">Trefferquote je Note</span></div>
    <p class="eyebrow">Violinschlüssel</p>${heatRows(notes, "treble").map(heatRowHtml).join("")}
    <p class="eyebrow">Bassschlüssel</p>${heatRows(notes, "bass").map(heatRowHtml).join("")}
    <p class="small heat-detail" id="sHeatDetail" aria-live="polite">Tippe auf eine Note für die Einzelwerte.</p>
    <div class="heat-legend">${legend}</div>
    <p class="eyebrow">Vorzeichen (Stufe 7)</p><div class="list">${acc}</div>`;
}

export function render() {
  const s = ctx.state;
  const acc = accuracy(s);
  const starsTotal = Object.values(s.levels).reduce((a, st) => a + (st.stars || 0), 0);
  const allLevels = ctx.packs.flatMap((p) => p.levels);
  $("#sTiles").innerHTML = [
    ["Aufgaben beantwortet", s.answered], ["Trefferquote", acc === null ? "–" : acc + " %"], ["Sterne", `${starsTotal} / ${allLevels.length * 3}`],
    ["Tage in Folge", s.dayStreak], ["Blitz-Rekord", s.blitzRecord], ["Längste Serie", s.bestCombo],
  ].map(([k, v]) => `<div class="tile"><p class="eyebrow">${k}</p><p class="big num">${v}</p></div>`).join("");
  $("#sHeat").innerHTML = heatHtml(s.notes);
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
