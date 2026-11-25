// Registry aller Themenpakete; noch nicht gebaute Pakete sind null und werden herausgefiltert.
// Die Reihenfolge gilt überall (Startseite, Lernen, Statistik); seit Welle 11 (Sandra, 24.11.2026) stehen die
// Intervalle vor den Tonleitern. Spielstände hängen nicht davon ab (sie kennen nur die Stufen-IDs).
import noten from "./noten.js";
import notenwerte from "./notenwerte.js";
import intervalle from "./intervalle.js";
import tonleitern from "./tonleitern.js";
import akkorde from "./akkorde.js";

export const PACKS = [noten, notenwerte, intervalle, tonleitern, akkorde].filter(Boolean);
