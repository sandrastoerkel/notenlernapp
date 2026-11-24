// Gehirngerechte Übersicht (gemeinsamer Baukasten, docs/ARCHITEKTUR.md, seit der Vorführung zu „Intervalle“):
// eine Zeile je Eintrag, jede Zahl in einem Kästchen (wie eine Taste), leere Stellen als blasser Punkt,
// Spalten einer „Familie“ grau hinterlegt, feine Linien zwischen den Zeilen. Hervorhebung nach den
// Denkschritten: Zeile violett (Schritt 1, Klasse hi), Treffer-Kästchen grün (Schritt 2, Klasse hit),
// Bezugs-Kästchen grün umrandet (Klasse ref, z. B. „rein 5“ bei der übermäßigen Quarte).
// Rein: liefert HTML, die Farben kommen aus den Tokens in css/style.css (.tt …).

// Ein Feld: null (leer, blasser Punkt) oder { text, state? } mit state "hit" bzw. "ref".
// blank (seit Welle 10): Zeichen für leere Felder statt des Punkts, z. B. „–“ für „kein“ (Notenwerte, Stufe 1)
const cellHtml = (c, i, family, blank) => {
  const fam = family.includes(i) ? " fam" : "";
  const inner = c === null || c === undefined
    ? (blank ? `<span class="tt-dot tt-blank">${blank}</span>` : `<span class="tt-dot" aria-hidden="true">·</span>`)
    : `<span class="tt-box${c.state ? " " + c.state : ""}">${c.text}</span>`;
  return `<td class="tt-cell${fam}">${inner}</td>`;
};

function oneTable(head, rows, family, cls, blank) {
  const th = head.length
    ? `<thead><tr>${head.map((h, i) => (i === 0 ? `<th class="tt-head">${h}</th>` : `<th class="tt-col${family.includes(i - 1) ? " fam" : ""}">${h}</th>`)).join("")}</tr></thead>`
    : "";
  const body = rows.map((r) => `<tr${r.hi ? ' class="hi"' : ""}><td class="tt-label">${r.label}</td>${(r.cells || []).map((c, i) => cellHtml(c, i, family, blank)).join("")}</tr>`).join("");
  return `<table class="tt${cls ? " " + cls : ""}">${th}<tbody>${body}</tbody></table>`;
}

// spec: { head: [Kopf der Namensspalte, Spaltenköpfe …], rows: [{ label, cells: [Feld …], hi? }],
// family: Indizes der hinterlegten Spalten (0 = erste Zahlenspalte), split: in zwei Hälften nebeneinander
// (kürzer, für die Hilfen; bei schmalen Bildschirmen stehen die Hälften wieder untereinander), cls, blank }
export function tileTable(spec) {
  const { head = [], rows = [], family = [], split = false, cls = "", blank = "" } = spec;
  if (!split || rows.length < 2) return oneTable(head, rows, family, cls, blank);
  const h = Math.ceil(rows.length / 2);
  return `<div class="tt-split">${oneTable(head, rows.slice(0, h), family, cls, blank)}${oneTable(head, rows.slice(h), family, cls ? cls + " tt-second" : "tt-second", blank)}</div>`;
}
