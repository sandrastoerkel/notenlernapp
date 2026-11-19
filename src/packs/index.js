// Registry aller Themenpakete; noch nicht gebaute Pakete sind null und werden herausgefiltert
import noten from "./noten.js";
import notenwerte from "./notenwerte.js";
import tonleitern from "./tonleitern.js";
import intervalle from "./intervalle.js";
import akkorde from "./akkorde.js";

export const PACKS = [noten, notenwerte, tonleitern, intervalle, akkorde].filter(Boolean);
