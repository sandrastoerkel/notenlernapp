// Lernen: Notenzeile zum Antippen, alle Namen einblenden, Lerntafeln der Pakete
import { fromDia, same, gName, helm, staffPos } from "../music.js";
import { staffSvg, noteSvg, BOTTOM, S } from "../staff.js";
import { play } from "../audio.js";

const $ = (s) => document.querySelector(s);
let ctx = null;
let lClef = "treble", lSel = null, lAll = false;

export function init(c) {
  ctx = c;
  $("#lTreble").addEventListener("click", () => { lClef = "treble"; lSel = null; render(); });
  $("#lBass").addEventListener("click", () => { lClef = "bass"; lSel = null; render(); });
  $("#lPlay").addEventListener("click", () => { if (lSel) play(lSel); });
  $("#lShowAll").addEventListener("click", () => { lAll = !lAll; render(); });
  // Klick auf eine Linie oder einen Zwischenraum (Delegation)
  $("#lStaff").addEventListener("click", (e) => {
    const r = e.target.closest(".hit[data-d]");
    if (!r) return;
    lSel = fromDia(+r.dataset.d); play(lSel); render();
  });
}

// Lerntafeln aller Pakete: Tafeln mit Schlüssel nur für den gewählten, Tafeln ohne Schlüssel immer
const legendHtml = () => ctx.packs.flatMap((p) => p.learn || []).filter((card) => !card.clef || card.clef === lClef).map((card) => card.render()).join("");

export function render() {
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
      g += `<ellipse class="notehead" cx="${x}" cy="${cy}" rx="5.6" ry="3.9" transform="rotate(-22 ${x} ${cy})"/>`;
      g += `<text class="note-label" x="${x}" y="${BOTTOM + 28}" text-anchor="middle">${helm(n)}</text></g>`;
      inner += g;
    }
  } else if (lSel) inner += noteSvg(lSel, lClef, 170, "ghost");
  $("#lStaff").innerHTML = staffSvg(lClef, inner);
  const pos = lSel ? staffPos(lSel, lClef) : 0;
  $("#lName").textContent = lSel ? gName(lSel) : "–";
  $("#lHelm").textContent = lSel ? `${helm(lSel)} · ${pos % 2 === 0 ? "auf einer Linie" : "im Zwischenraum"}${Math.abs(pos - 4) > 4 ? " · Hilfslinie" : ""}` : "Tippe auf eine Linie oder einen Zwischenraum.";
  $("#lShowAll").textContent = lAll ? "Namen ausblenden" : "Alle Namen zeigen";
  $("#lLegend").innerHTML = legendHtml();
  ctx.renderTop();
}
