// Hilfen „Noten lesen“ (Welle 12, PLAN Abschnitt 3): Merkleiste, Namensleiste, Vorzeichen-Regel. Reine
// Funktionen, HTML für level.helpTable (die Engine setzt es in .help-table-wrap ein). Vor der Antwort hebt keine
// Hilfe etwas hervor: jede Ausgabe hängt nur von Schlüssel, Art und Spielstand ab (nicht von der Aufgabe), alle
// Zeilen sehen gleich aus. Farben fest nach den Denkschritten (wie im Baukasten, nicht je Aufgabe): die Lage
// (Schritt 1) violett, der Anfangsbuchstabe = Notenname (Schritt 2) grün. Der Merkspruch kommt immer aus
// sprueche.js (gewählter Vorschlag oder eigener Spruch); Text des Kindes nur über esc.
import { spruch, wortZu, esc } from "../sprueche.js";
import { tileTable } from "../grid.js";
import { pianoSvg } from "../staff.js";
import { N, fromDia, dia } from "../music.js";

// Kennung des Merkspruchs: clef "treble" | "bass", art "linien" | "raeume"
export const merkId = (clef, art) => `${clef === "treble" ? "violin" : "bass"}-${art === "linien" ? "linien" : "raeume"}`;

// Unterste Stelle der Zeile als Note (staffPos 0): e' im Violin-, G im Bassschlüssel
const UNTEN = { treble: N("E", 4), bass: N("G", 2) };

// Stellen der Merkleiste von unten: { pos, nr, label } – Linien pos 0, 2 … 8 (1. bis 5. Linie), Zwischenräume
// pos 1, 3 … 7 (1. bis 4. Zwischenraum)
export function stellen(art) {
  const linien = art === "linien";
  return Array.from({ length: linien ? 5 : 4 }, (_, i) => ({
    pos: linien ? 2 * i : 2 * i + 1,
    nr: i + 1,
    label: `${i + 1}. ${linien ? "Linie" : "Zwischenraum"}`,
  }));
}

// Note an einer Stelle der Zeile (ohne Vorzeichen), aus staffPos zurückgerechnet
export const noteAn = (clef, pos) => fromDia(dia(UNTEN[clef === "treble" ? "treble" : "bass"]) + pos);

// Bezugston des Schlüssels an seiner Linie (nur Merkleiste der Linien; Wortlaut PLAN Abschnitt 3, Inhalt wie in
// LEGEND: der Kringel umschließt die G-Linie, die zwei Punkte die F-Linie). pos: Stelle in der Zeile.
export const SCHLUESSEL_BEZUG = Object.freeze({
  treble: Object.freeze({ pos: 2, text: "hier sitzt der Schlüssel: g'" }),
  bass: Object.freeze({ pos: 6, text: "zwischen den beiden Punkten: f" }),
});

// Wort des Spruchs mit fettem Anfangsbuchstaben; Zeichen vor dem ersten Buchstaben (z. B. „(“) bleiben davor.
// Jeder Teil einzeln maskiert (eigener Spruch).
const LETTER = /\p{L}/u;
function wortHtml(w) {
  const m = w.match(LETTER);
  if (!m) return esc(w);
  const i = m.index, len = m[0].length;
  return `${esc(w.slice(0, i))}<b class="nl-anf">${esc(w.slice(i, i + len))}</b>${esc(w.slice(i + len))}`;
}

// Merkleiste: Tabelle in der Reihenfolge der Notenzeile (oben die höchste Stelle), je Stelle eine Zeile
// „5. Linie | Fleiß“; senkrecht, weil ein eigener Spruch lange Wörter haben kann. Darüber der ganze Spruch.
// clef "treble" | "bass", art "linien" | "raeume", state: Spielstand (für den gewählten Spruch; ohne: Voreinstellung)
export function merkleiste(clef, art, state) {
  const id = merkId(clef, art);
  const bez = art === "linien" ? SCHLUESSEL_BEZUG[clef === "treble" ? "treble" : "bass"] : null;
  const rows = stellen(art).map((st, i) => {
    const w = wortZu(state, id, i);
    // geschütztes Leerzeichen nach dem Doppelpunkt: der Ton bleibt beim Wort davor
    const extra = bez && bez.pos === st.pos ? `<span class="nl-bezug">${bez.text.replace(": ", ":\u00a0")}</span>` : "";
    return { label: `<span class="nl-lage">${st.label}</span>${extra}`, cells: [{ text: `<span class="nl-wort">${wortHtml(w)}</span>` }] };
  }).reverse();
  const was = art === "linien" ? "Linien" : "Zwischenräume";
  return `<figure class="nl-merkleiste" data-nl-help="merkleiste">`
    + `<figcaption class="nl-cap">${was} von unten: ${esc(spruch(state, id))}</figcaption>`
    + tileTable({ head: [], rows, cls: "nl-merk" })
    + `</figure>`;
}

// Namensleiste: die Notennamen der Reihe nach als Kästchen, darüber die Richtung; mit clef darunter die Zeile
// „Linien von unten: <Merkspruch>“ (PLAN Abschnitt 3, Stufen 4 und 9). Ohne clef nur die Leiste.
export const NAMEN_REIHE = Object.freeze(["C", "D", "E", "F", "G", "A", "H", "C"]);
export const RICHTUNG = Object.freeze(["← tiefer", "höher →"]);
export function namensleiste(clef, state) {
  const table = tileTable({ head: [], rows: [{ label: "", cells: NAMEN_REIHE.map((t) => ({ text: t })) }], cls: "nl-reihe" });
  const linien = clef === "treble" || clef === "bass"
    ? `<p class="nl-cap nl-linien">Linien von unten: ${esc(spruch(state, merkId(clef, "linien")))}</p>` : "";
  return `<figure class="nl-namensleiste" data-nl-help="namensleiste" role="group" aria-label="Notennamen der Reihe nach: ${NAMEN_REIHE.join(" ")}">`
    + `<div class="nl-richtung" aria-hidden="true"><span>${RICHTUNG[0]}</span><span>${RICHTUNG[1]}</span></div>`
    + table + linien + `</figure>`;
}

// Vorzeichen-Regel (Wortlaut aus PLAN Abschnitt 3): drei Spalten, zwei Zeilen; darunter eine Oktave Klaviatur ab
// c' ohne Markierung (sie verriete den Stammton). opts.klaviatur false: nur die Tabelle (z. B. für eine Lerntafel).
export const REGEL = Object.freeze([
  Object.freeze(["♯ Kreuz", "einen Halbton höher", "„-is“: F → Fis"]),
  Object.freeze(["♭ Be", "einen Halbton tiefer", "„-es“: D → Des · aber E → Es, A → As, H → B"]),
]);
export const REGEL_KLAVIATUR = Object.freeze({ from: 60, octaves: 1, interactive: false });
export function vorzeichenRegel(opts = {}) {
  const { klaviatur = true } = opts;
  const rows = REGEL.map(([zeichen, wirkung, name]) => `<tr><th scope="row" class="nl-zeichen">${zeichen}</th><td class="nl-wirkung">${wirkung}</td><td class="nl-endung">${name}</td></tr>`).join("");
  const table = `<table class="nl-regel"><tbody>${rows}</tbody></table>`;
  const keys = klaviatur ? `<div class="help-keys nl-regel-keys">${pianoSvg({ ...REGEL_KLAVIATUR })}</div>` : "";
  return `<div class="nl-vorzeichen" data-nl-help="vorzeichen">${table}${keys}</div>`;
}
