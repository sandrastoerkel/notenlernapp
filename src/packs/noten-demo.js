// Vorführungen und Lerntafeln „Noten lesen“ (Welle 12, PLAN Abschnitte 4 und 5). Die Bilder sind rein (in node
// testbar), src/demo.js zeigt sie. Gerüst aus Schritt 2: Die Namen der Exporte sind endgültig, die Ausgaben sind
// schon gültige Vorführungen (Frage → Ergebnis), aber noch ohne die Bilder der beiden Denkschritte; die baut
// Schritt 5. Format einer Vorführung siehe src/demo.js.
import { staffSvg, noteSvg } from "../staff.js";
import { SCHRITTE, displayName } from "./noten-lage.js";

const DEMO_X = 170;
export const DEMO_PROMPT = "Wie heißt die Note?";
const bild = (n, clef) => `<div class="demo-staff">${staffSvg(clef, noteSvg(n, clef, DEMO_X))}</div>`;

// Gerüst: Frage (Schritt 0) und Ergebnis (Schritt steps.length + 1) mit dem Namen der Note und ihrem Ton
function schlicht(steps, n, clef) {
  return {
    steps: steps.slice(),
    frames: [
      { step: 0, text: DEMO_PROMPT, body: bild(n, clef) },
      { step: steps.length + 1, tones: [n], result: { title: displayName(n), chips: [] }, body: bild(n, clef) },
    ],
  };
}

// 1. „So liest du eine Note“ (Stufen 1, 2, 6, 7): Lage → Name. state für den gewählten Merkspruch (Schritt 5).
export function lageDemo(n, clef, state) {
  return schlicht(SCHRITTE.lage, n, clef);
}

// 2. „So zählst du vom Bezugston“ (Stufen 4, 9): ref = Bezugsnote, n = gesuchte Note
export function zaehlDemo(ref, n, clef) {
  return schlicht(SCHRITTE.zaehlen, n, clef);
}

// 3. „So liest du eine Note mit Vorzeichen“ (Stufen 11, 13): Stammton → Vorzeichen
export function vorzeichenDemo(n, clef) {
  return schlicht(SCHRITTE.vorzeichen, n, clef);
}

// Lerntafeln des Reiters „Tonhöhen“ in ihrer Reihenfolge, je Schlüssel eine Tafel. merkhilfen(clef, state) liefert
// die Tafel „Merkhilfen“ (noten.js, legendHtml). Endgültige Reihenfolge (Schritt 5, PLAN Abschnitt 5): So liest
// du eine Note · Merkhilfen · So zählst du vom Bezugston · Vorzeichen ♯ und ♭ · So liest du eine Note mit
// Vorzeichen. Im Gerüst nur die Merkhilfen (wie bisher), damit der Reiter keine leeren Tafeln zeigt.
export const CLEFS = ["treble", "bass"];
export function boards(merkhilfen) {
  return CLEFS.map((clef) => ({ title: "Merkhilfen", clef, render(ctx) { return merkhilfen(clef, ctx && ctx.state); } }));
}
