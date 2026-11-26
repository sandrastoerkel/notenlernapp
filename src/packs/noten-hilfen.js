// Hilfen „Noten lesen“ (Welle 12, PLAN Abschnitt 3): Merkleiste, Namensleiste, Vorzeichen-Regel. Reine
// Funktionen, HTML für level.helpTable. Gerüst aus Schritt 2: Die Namen der Exporte sind endgültig, die Ausgaben
// sind schon gültig, aber schlicht; die Tabellen baut Schritt 4. Vor der Antwort hebt keine Hilfe etwas hervor,
// jede Ausgabe hängt nur von Schlüssel, Art und Spielstand ab (nicht von der Aufgabe). Der Merkspruch kommt immer
// aus sprueche.js (eigene Sprüche nur über esc).
import { spruch, esc } from "../sprueche.js";

// Kennung des Merkspruchs: clef "treble" | "bass", art "linien" | "raeume"
export const merkId = (clef, art) => `${clef === "treble" ? "violin" : "bass"}-${art === "linien" ? "linien" : "raeume"}`;

// Merkleiste: der gewählte Merkspruch für die Linien bzw. Zwischenräume des Schlüssels (Gerüst)
export function merkleiste(clef, art, state) {
  return `<p class="nl-merkleiste">${esc(spruch(state, merkId(clef, art)))}</p>`;
}

// Namensleiste: die Notennamen der Reihe nach (Gerüst)
export const NAMEN_REIHE = ["C", "D", "E", "F", "G", "A", "H", "C"];
export function namensleiste() {
  return `<p class="nl-namensleiste">${NAMEN_REIHE.join(" ")}</p>`;
}

// Vorzeichen-Regel (Wortlaut aus PLAN Abschnitt 3; Gerüst ohne Klaviatur)
export const REGEL = Object.freeze([
  ["♯ Kreuz", "einen Halbton höher", "„-is“: F → Fis"],
  ["♭ Be", "einen Halbton tiefer", "„-es“: D → Des · aber E → Es, A → As, H → B"],
]);
export function vorzeichenRegel() {
  return `<table class="nl-regel"><tbody>${REGEL.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
