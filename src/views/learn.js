// Lernen: Reiter je Inhalt (Welle 11, W3); im Reiter „Tonhöhen“ die Notenzeile zum Antippen und „Alle Namen
// zeigen“, in jedem Reiter die Lerntafeln, die zu ihm gehören
import { fromDia, same, gName, helm, staffPos } from "../music.js";
import { staffSvg, noteSvg, noteheadSvg, BOTTOM, S } from "../staff.js";
import { play } from "../audio.js";
import { findLevel } from "../engine.js";
import { stopDemos } from "../demo.js";
import { MERKHILFEN, waehle, setzeEigen, checkSpruch, meldung, aktiv, spruch } from "../sprueche.js";

const $ = (s) => document.querySelector(s);
let ctx = null;
// lTab: gewählter Reiter, gemerkt in der Sitzung (wie lClef); nach dem Neuladen wieder „Tonhöhen“
let lClef = "treble", lSel = null, lAll = false, lTab = "noten";

// Reiter (rein, getestet). Reihenfolge wie PACKS (seit Welle 11, Schritt 3 Intervalle vor Tonleitern; der Test prüft das);
// „Takt“ steht hinter „Notenwerte“. Ein Reiter mit der id eines Pakets zeigt dessen Tafeln ohne eigenes tab.
export const LEARN_TABS = [
  { id: "noten", label: "Tonhöhen" },
  { id: "notenwerte", label: "Notenwerte" },
  { id: "takt", label: "Takt" },
  { id: "intervalle", label: "Intervalle" },
  { id: "tonleitern", label: "Tonleitern" },
  { id: "akkorde", label: "Dreiklänge" },
];
const TAB_IDS = LEARN_TABS.map((t) => t.id);

// Nächster Reiter für eine Taste (rein, getestet): Pfeile umlaufend, Pos1/Ende; null bei anderen Tasten
export function nextTab(ids, cur, key) {
  const i = Math.max(0, ids.indexOf(cur)), n = ids.length;
  if (key === "ArrowRight") return ids[(i + 1) % n];
  if (key === "ArrowLeft") return ids[(i - 1 + n) % n];
  if (key === "Home") return ids[0];
  if (key === "End") return ids[n - 1];
  return null;
}

// Reiter, den „Erst anschauen“ für eine Stufe öffnet (rein, getestet): level.learnTab, sonst der Reiter des
// Pakets. So führt „Takt füllen“ (Paket Notenwerte) zu „So zählst du einen Takt“ im Reiter „Takt“.
export function learnTabOf(packs, levelId) {
  const { pack, level } = findLevel(packs, levelId);
  return level.learnTab || pack.id;
}

export function init(c) {
  ctx = c;
  $("#lTreble").addEventListener("click", () => { lClef = "treble"; lSel = null; draw(); });
  $("#lBass").addEventListener("click", () => { lClef = "bass"; lSel = null; draw(); });
  $("#lPlay").addEventListener("click", () => { if (lSel) play(lSel); });
  $("#lShowAll").addEventListener("click", () => { lAll = !lAll; draw(false); });
  // Reiter: ARIA-Muster „Tabs“ mit Aktivierung beim Fokus und wanderndem Tabindex. Der Tastatur-Handler hängt
  // an der Leiste, nicht an document: die Tasten der anderen Ansichten bleiben unberührt.
  const bar = $("#lTabs");
  bar.innerHTML = LEARN_TABS.map((t) => `<button class="ltab" role="tab" id="ltab-${t.id}" data-tab="${t.id}" aria-controls="lPanel" aria-selected="false" tabindex="-1">${t.label}</button>`).join("");
  bar.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) selectTab(b.dataset.tab); });
  bar.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = nextTab(TAB_IDS, lTab, e.key);
    if (!t) return;
    e.preventDefault();
    selectTab(t, true);
  });
  // Klick auf eine Linie oder einen Zwischenraum (Delegation)
  // Merkspruch-Wahl (Delegation am Bereich der Lerntafeln; ctx.state wird beim Zurücksetzen ersetzt)
  wireSprueche($("#lLegend"), { get state() { return ctx.state; }, save: () => ctx.save() });
  $("#lStaff").addEventListener("click", (e) => {
    const r = e.target.closest(".hit[data-d]");
    if (!r) return;
    lSel = fromDia(+r.dataset.d); play(lSel); draw(false);
  });
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Lerntafeln aller Pakete (rein, getestet): Tafeln mit Schlüssel nur für den gewählten, Tafeln ohne
// Schlüssel immer. Der Titel einer Tafel steht als Überschrift über ihrem Inhalt (ganze Breite des Rasters).
// c (optional): { state } geht an card.render (gewählte Merksprüche, Welle 10, Schritt 4).
// tab (optional, Welle 11): nur die Tafeln dieses Reiters (card.tab, sonst die id des Pakets).
const cardsOf = (packs, tab) => packs.flatMap((p) => (p.learn || []).filter((card) => tab === undefined || (card.tab || p.id) === tab));
export const learnCardsHtml = (packs, clef, c, tab) => cardsOf(packs, tab)
  .filter((card) => !card.clef || card.clef === clef)
  .map((card) => (card.title ? `<h3 class="legend-title">${esc(card.title)}</h3>` : "") + card.render(c))
  .join("");
const legendHtml = () => learnCardsHtml(ctx.packs, lClef, { state: ctx.state }, lTab);

// Gibt es im Reiter eine Tafel je Schlüssel (oder ist es „Tonhöhen“ mit der Notenzeile)? Sonst ist die
// Schlüsselwahl ausgeblendet, damit kein Schalter ohne Wirkung dasteht (rein, getestet)
export const tabHasClef = (packs, tab) => tab === "noten" || cardsOf(packs, tab).some((card) => card.clef);

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
export const mountCards = (packs, clef, root, tab) => cardsOf(packs, tab)
  .filter((card) => (!card.clef || card.clef === clef) && card.mount)
  .forEach((card) => card.mount(root));

// Reiter wechseln: Vorführungen anhalten, nur die Tafeln des Reiters neu setzen und verdrahten;
// focus: true bei der Tastatur (der Fokus geht mit dem Reiter)
function selectTab(id, focus = false) {
  if (!TAB_IDS.includes(id)) return;
  lTab = id;
  draw();
  reveal();
  if (focus) $("#ltab-" + id).focus();
}

// Leiste und Kopf zum gewählten Reiter: aria-selected, wandernder Tabindex, Überschrift, Schlüsselwahl
function drawTabs() {
  for (const t of LEARN_TABS) {
    const b = $("#ltab-" + t.id), on = t.id === lTab;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  $("#lPanel").setAttribute("aria-labelledby", "ltab-" + lTab);
  const notes = lTab === "noten";
  $("#lHead").textContent = notes ? "Tippe auf die Notenzeile" : LEARN_TABS.find((t) => t.id === lTab).label;
  $("#lStaff").hidden = !notes;
  $("#lNote").hidden = !notes;
  $("#lClefs").hidden = !tabHasClef(ctx.packs, lTab);
}

// Kleinste Rollweite der Leiste, bei der der Reiter [a, b] ganz sichtbar ist und die Leiste am Anfang eines
// Reiters einrastet (rein, getestet). starts: Anfänge aller Reiter, a/b: Kanten des gewählten, alle in px vom
// Anfang des Inhalts; pad: Innenabstand; max: größte Rollweite. Ohne Einrasten hielte scroll-snap ein
// scrollIntoView({ inline: "nearest" }) nicht: die Leiste spränge zum nächsten Einrastpunkt zurück.
export function tabScroll(starts, a, b, pos, width, pad, max) {
  if (a - pad >= pos && b + pad <= pos + width) return pos;
  if (a - pad < pos) return Math.max(0, a - pad);
  const need = b + pad - width;
  const snap = starts.map((x) => x - pad).filter((x) => x >= need).sort((x, y) => x - y)[0];
  return Math.min(max, snap === undefined ? max : snap);
}

// Nur beim Öffnen der Ansicht und beim Wechsel des Reiters: Wer die Leiste von Hand gewischt hat, dem springt
// sie beim Antippen der Notenzeile oder beim Wechsel des Schlüssels nicht zurück.
const reveal = () => showTab($("#lTabs"), $("#ltab-" + lTab));

// gewählten Reiter sichtbar machen (die Leiste rollt bei schmalen Fenstern in sich)
function showTab(bar, sel) {
  const f = bar.getBoundingClientRect(), pos = bar.scrollLeft, pad = parseFloat(getComputedStyle(bar).paddingLeft) || 0;
  const at = (el) => el.getBoundingClientRect().left - f.left - bar.clientLeft + pos;
  const starts = [...bar.children].map(at), a = at(sel), b = a + sel.getBoundingClientRect().width;
  const to = tabScroll(starts, a, b, pos, bar.clientWidth, pad, bar.scrollWidth - bar.clientWidth);
  if (Math.abs(to - pos) > 0.5) bar.scrollTo({ left: to, behavior: "instant" });
}

// Aufruf beim Öffnen der Ansicht (app.js show); arg.tab (optional): diesen Reiter zeigen („Erst anschauen“)
export function render(arg) {
  if (arg && TAB_IDS.includes(arg.tab)) lTab = arg.tab;
  draw();
  reveal();
}

// legend: false beim Antippen der Notenzeile und bei „Alle Namen zeigen“ – die Lerntafeln (und eine
// laufende Vorführung) bleiben dann stehen; beim Öffnen der Ansicht, beim Wechsel des Schlüssels und des
// Reiters neu
function draw(legend = true) {
  drawTabs();
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
    mountCards(ctx.packs, lClef, $("#lLegend"), lTab);
  }
  ctx.renderTop();
}
