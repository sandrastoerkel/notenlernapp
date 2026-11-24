// Lernen: Notenzeile zum Antippen, alle Namen einblenden, Lerntafeln der Pakete
import { fromDia, same, gName, helm, staffPos } from "../music.js";
import { staffSvg, noteSvg, noteheadSvg, BOTTOM, S } from "../staff.js";
import { play } from "../audio.js";
import { stopDemos } from "../demo.js";
import { MERKHILFEN, waehle, setzeEigen, checkSpruch, meldung, aktiv, spruch } from "../sprueche.js";

const $ = (s) => document.querySelector(s);
let ctx = null;
let lClef = "treble", lSel = null, lAll = false;

export function init(c) {
  ctx = c;
  $("#lTreble").addEventListener("click", () => { lClef = "treble"; lSel = null; render(); });
  $("#lBass").addEventListener("click", () => { lClef = "bass"; lSel = null; render(); });
  $("#lPlay").addEventListener("click", () => { if (lSel) play(lSel); });
  $("#lShowAll").addEventListener("click", () => { lAll = !lAll; render(false); });
  // Klick auf eine Linie oder einen Zwischenraum (Delegation)
  // Merkspruch-Wahl (Delegation am Bereich der Lerntafeln; ctx.state wird beim Zurücksetzen ersetzt)
  wireSprueche($("#lLegend"), { get state() { return ctx.state; }, save: () => ctx.save() });
  $("#lStaff").addEventListener("click", (e) => {
    const r = e.target.closest(".hit[data-d]");
    if (!r) return;
    lSel = fromDia(+r.dataset.d); play(lSel); render(false);
  });
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Lerntafeln aller Pakete (rein, getestet): Tafeln mit Schlüssel nur für den gewählten, Tafeln ohne
// Schlüssel immer. Der Titel einer Tafel steht als Überschrift über ihrem Inhalt (ganze Breite des Rasters).
// c (optional): { state } geht an card.render (gewählte Merksprüche, Welle 10, Schritt 4).
export const learnCardsHtml = (packs, clef, c) => packs.flatMap((p) => p.learn || [])
  .filter((card) => !card.clef || card.clef === clef)
  .map((card) => (card.title ? `<h3 class="legend-title">${esc(card.title)}</h3>` : "") + card.render(c))
  .join("");
const legendHtml = () => learnCardsHtml(ctx.packs, lClef, { state: ctx.state });

// Merkspruch-Wahl in den Lerntafeln (sprueche.wahlHtml): Vorschlag antippen → gespeichert; „Eigener Spruch“
// wird beim Tippen geprüft und nur gespeichert, wenn die Anfangsbuchstaben passen. Danach zeigen alle
// Stellen mit data-spruch-show den geltenden Spruch (textContent: der eigene Text bleibt Text).
export function refreshSprueche(root, state) {
  root.querySelectorAll("[data-spruch-show]").forEach((el) => { el.textContent = spruch(state, el.dataset.spruchShow); });
  root.querySelectorAll("[data-spruch-wahl]").forEach((fs) => {
    const a = aktiv(state, fs.dataset.spruchWahl);
    fs.querySelectorAll("input[type=radio]").forEach((r) => {
      const on = String(a) === r.value;
      r.checked = on;
      r.closest(".spruch-opt").classList.toggle("on", on);
    });
  });
}

export function wireSprueche(root, c) {
  const msg = (fs, text) => { const p = fs.querySelector(".spruch-msg"); if (p) p.textContent = text; };
  root.addEventListener("change", (e) => {
    const r = e.target.closest("input[type=radio]"), fs = r && r.closest("[data-spruch-wahl]");
    if (!fs) return;
    const id = fs.dataset.spruchWahl, field = fs.querySelector(".spruch-eigen");
    if (r.value === "eigen") {
      const res = setzeEigen(c.state, id, field.value);
      if (res.ok) c.save(); else field.focus();
      msg(fs, meldung(res));
    } else if (waehle(c.state, id, +r.value)) {
      c.save(); msg(fs, "");
    }
    refreshSprueche(root, c.state);
  });
  root.addEventListener("input", (e) => {
    const field = e.target.closest(".spruch-eigen"), fs = field && field.closest("[data-spruch-wahl]");
    if (!fs) return;
    const id = fs.dataset.spruchWahl;
    if (!MERKHILFEN[id]) return;
    const res = field.value.trim() ? setzeEigen(c.state, id, field.value) : checkSpruch(id, "");
    if (res.ok) c.save();
    msg(fs, meldung(res));
    refreshSprueche(root, c.state);
  });
}
// Tafeln mit mount (z. B. die Vorführung bei „Intervalle“) verdrahten ihre Knöpfe nach dem Einsetzen
export const mountCards = (packs, clef, root) => packs.flatMap((p) => p.learn || [])
  .filter((card) => (!card.clef || card.clef === clef) && card.mount)
  .forEach((card) => card.mount(root));

// legend: false beim Antippen der Notenzeile und bei „Alle Namen zeigen“ – die Lerntafeln (und eine
// laufende Vorführung) bleiben dann stehen; beim Öffnen der Ansicht und beim Wechsel des Schlüssels neu
export function render(legend = true) {
  $("#lTreble").classList.toggle("on", lClef === "treble"); $("#lBass").classList.toggle("on", lClef === "bass");
  const base = lClef === "treble" ? 30 : 18;
  let inner = "";
  for (let p = -4; p <= 12; p++) {
    const n = fromDia(base + p), cy = BOTTOM - p * (S / 2);
    inner += `<rect class="hit ${lSel && same(lSel, n) ? "on" : ""}" data-d="${base + p}" x="60" y="${cy - 3}" width="236" height="6" rx="2"/>`;
  }
  if (lAll) {
    // Notenreihe von der unteren Hilfslinie bis über die Zeile, Namen darunter
    for (let p = -2; p <= 10; p++) {
      const n = fromDia(base + p), cy = BOTTOM - p * (S / 2), x = 78 + (p + 2) * 17.5;
      let g = `<g class="note ghost">`;
      for (let q = -2; q >= p; q -= 2) g += `<line class="ledger" x1="${x - 9}" x2="${x + 9}" y1="${BOTTOM - q * (S / 2)}" y2="${BOTTOM - q * (S / 2)}"/>`;
      for (let q = 10; q <= p; q += 2) g += `<line class="ledger" x1="${x - 9}" x2="${x + 9}" y1="${BOTTOM - q * (S / 2)}" y2="${BOTTOM - q * (S / 2)}"/>`;
      // derselbe Kopf wie bei noteSvg (Maße nach Bravura), nur ohne Hals
      g += noteheadSvg(x, cy);
      g += `<text class="note-label" x="${x}" y="${BOTTOM + 28}" text-anchor="middle">${helm(n)}</text></g>`;
      inner += g;
    }
  } else if (lSel) inner += noteSvg(lSel, lClef, 170, "ghost");
  $("#lStaff").innerHTML = staffSvg(lClef, inner);
  const pos = lSel ? staffPos(lSel, lClef) : 0;
  $("#lName").textContent = lSel ? gName(lSel) : "–";
  $("#lHelm").textContent = lSel ? `${helm(lSel)} · ${pos % 2 === 0 ? "auf einer Linie" : "im Zwischenraum"}${Math.abs(pos - 4) > 4 ? " · Hilfslinie" : ""}` : "Tippe auf eine Linie oder einen Zwischenraum.";
  $("#lShowAll").textContent = lAll ? "Namen ausblenden" : "Alle Namen zeigen";
  if (legend) {
    stopDemos();
    $("#lLegend").innerHTML = legendHtml();
    mountCards(ctx.packs, lClef, $("#lLegend"));
  }
  ctx.renderTop();
}
