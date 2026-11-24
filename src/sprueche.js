// Merksprüche (Welle 10, Schritt 4): Vorschläge und eigener Spruch je Merkhilfe, Prüfung der
// Anfangsbuchstaben, Wahl im Spielstand (state.sprueche). Rein, ohne DOM: Pakete und Ansichten lesen den
// Spielstand nur über dieses Modul. Vorschläge laut KONZEPT-gehirngerecht (Sandra, 20. und 24.11.2026);
// nichts dazuerfinden. Der erste Vorschlag ist die Voreinstellung.
//
// Spielstand: state.sprueche[id] = { wahl: <Nummer des Vorschlags> } oder { eigen: "<Text>" }.
// Ein eigener Text kommt vom Kind: überall nur als Text einsetzen (textContent bzw. esc), nie als HTML.

// Höchstlänge eines eigenen Spruchs (Zeichen)
export const SPRUCH_MAX = 80;

// buchstaben: verlangte Anfangsbuchstaben; reihe: was der Spruch abdeckt, so wie die App es zeigt.
// „Geh Du Alter Esel Hole Fische“: Wortlaut verbreitet, regional verschieden [OFFEN Sandra].
// Nicht abgedeckt: die siebte Tonart (Cis-Dur, Ces-Dur) und das sechste und siebte Be (Ces, Fes) – dort zeigt
// die App die Reihe selbst.
export const MERKHILFEN = {
  "violin-linien": { wofuer: "Linien im Violinschlüssel", buchstaben: ["E", "G", "H", "D", "F"], reihe: "E G H D F",
    vorschlaege: ["Es Geht Hurtig Durch Fleiß"] },
  "violin-raeume": { wofuer: "Zwischenräume im Violinschlüssel", buchstaben: ["F", "A", "C", "E"], reihe: "F A C E",
    vorschlaege: ["Fritz Aß Citronen-Eis"] },
  "bass-linien": { wofuer: "Linien im Bassschlüssel", buchstaben: ["G", "H", "D", "F", "A"], reihe: "G H D F A",
    vorschlaege: ["Gute Hunde Dürfen Fast Alles"] },
  "bass-raeume": { wofuer: "Zwischenräume im Bassschlüssel", buchstaben: ["A", "C", "E", "G"], reihe: "A C E G",
    vorschlaege: ["Alle Clowns Essen Gern"] },
  kreuze: { wofuer: "Reihenfolge der Kreuze", buchstaben: ["F", "C", "G", "D", "A", "E", "H"], reihe: "Fis Cis Gis Dis Ais Eis His",
    vorschlaege: ["Fünf Cowboys Gehen Durch Alle Einkaufs-Hallen", "Frische Croissants Gibt's Donnerstags Am Ersten Haus", "Fritz Christian Geht Durch Alle Ecken Heim"] },
  "kreuz-tonarten": { wofuer: "Dur-Tonarten mit 1 bis 6 ♯", buchstaben: ["G", "D", "A", "E", "H", "F"], reihe: "G D A E H Fis",
    vorschlaege: ["Geh Du Alter Esel Hole Fische"] },
  "be-tonarten": { wofuer: "Dur-Tonarten mit 1 bis 6 ♭", buchstaben: ["F", "B", "E", "A", "D", "G"], reihe: "F B Es As Des Ges",
    vorschlaege: ["Frische Brezen Essen Asse Des Gesangs"] },
  // abgeleitet: Spruch von be-tonarten ohne das erste Wort, keine eigene Wahl
  bes: { wofuer: "Reihenfolge der Be", buchstaben: ["B", "E", "A", "D", "G"], reihe: "B Es As Des Ges", von: "be-tonarten" },
};

// Wörter: an Leerzeichen und Bindestrichen getrennt („Citronen-Eis“ sind zwei Wörter), ein Apostroph gehört
// zum Wort („Gibt's“). Teile ohne Buchstaben (z. B. ein „–“ oder ein Punkt allein) zählen nicht.
const SPLIT = /[^\s\-‐‑]+/gu;
const LETTER = /\p{L}/u;
const words = (text) => [...String(text || "").normalize("NFC").matchAll(SPLIT)].filter((m) => LETTER.test(m[0]));

// Anfangsbuchstaben in Großschreibung; Umlaute bleiben Umlaute (Ä ist nicht A)
export const initials = (text) => words(text).map((m) => m[0].match(LETTER)[0].toUpperCase());

// Prüfung eines Spruchs: { ok, soll, ist, stelle, grund }. stelle ist das erste Wort (ab 1), das nicht passt
// oder fehlt bzw. zu viel ist; null, wenn alles passt. grund: "leer", "lang", "buchstabe", "fehlt", "zuviel".
export function checkSpruch(id, text) {
  const m = MERKHILFEN[id];
  const soll = m ? m.buchstaben : [];
  // NFC wie in words(): „A“ + Trema (zerlegt, z. B. eingefügter Text) zählt als Ä und als ein Zeichen
  const t = String(text || "").normalize("NFC").trim();
  const ist = initials(t);
  const res = (grund, stelle) => ({ ok: !grund, soll, ist, stelle, grund });
  if (!m) return res("unbekannt", null);
  if (!ist.length) return res("leer", 1);
  if (t.length > SPRUCH_MAX) return res("lang", null);
  const n = Math.min(soll.length, ist.length);
  for (let i = 0; i < n; i++) if (ist[i] !== soll[i]) return res("buchstabe", i + 1);
  if (ist.length < soll.length) return res("fehlt", ist.length + 1);
  if (ist.length > soll.length) return res("zuviel", soll.length + 1);
  return res(null, null);
}

// Meldung zur Prüfung, ein ganzer Satz (für das Feld „Eigener Spruch“)
export function meldung(r) {
  const soll = r.soll.join(" ");
  switch (r.grund) {
    case null: return `Passt: ${soll}. Gespeichert.`;
    case "leer": return `Schreib ${r.soll.length} Wörter mit den Anfangsbuchstaben ${soll}.`;
    case "lang": return `Höchstens ${SPRUCH_MAX} Zeichen.`;
    case "buchstabe": return `Das ${r.stelle}. Wort muss mit ${r.soll[r.stelle - 1]} beginnen.`;
    case "fehlt": { const k = r.soll.length - r.ist.length; return k === 1 ? "Es fehlt 1 Wort." : `Es fehlen ${k} Wörter.`; }
    case "zuviel": { const k = r.ist.length - r.soll.length; return k === 1 ? "Das ist 1 Wort zu viel." : `Das sind ${k} Wörter zu viel.`; }
    default: return "";
  }
}

const entry = (state, id) => (state && state.sprueche && typeof state.sprueche === "object" ? state.sprueche[id] : null) || null;

// Aktive Wahl: Nummer des Vorschlags oder "eigen" (ungültige oder fremde Einträge → 0)
export function aktiv(state, id) {
  const m = MERKHILFEN[id], e = entry(state, id);
  if (!m || m.von) return 0;
  if (e && typeof e.eigen === "string" && checkSpruch(id, e.eigen).ok) return "eigen";
  if (e && Number.isInteger(e.wahl) && e.wahl >= 0 && e.wahl < m.vorschlaege.length) return e.wahl;
  return 0;
}

// Ohne das erste Wort (für bes aus be-tonarten); der Rest bleibt, wie er geschrieben ist
const ohneErstesWort = (text) => {
  // words() rechnet in NFC; die Stelle des zweiten Worts gilt deshalb nur im NFC-Text
  const t = String(text || "").normalize("NFC"), w = words(t);
  return w.length > 1 ? t.slice(w[1].index).trim() : "";
};

// Der Spruch, der gilt: eigener Text, gewählter Vorschlag oder Voreinstellung
export function spruch(state, id) {
  const m = MERKHILFEN[id];
  if (!m) return "";
  if (m.von) return ohneErstesWort(spruch(state, m.von));
  const a = aktiv(state, id);
  return a === "eigen" ? entry(state, id).eigen.trim() : m.vorschlaege[a];
}

// Das Wort zur n-ten Stelle (ab 0), z. B. zur 2. Linie „Geht“; leer, wenn es die Stelle nicht gibt
export function wortZu(state, id, index) {
  const w = words(spruch(state, id))[index];
  return w ? w[0] : "";
}

const slot = (state) => {
  if (!state.sprueche || typeof state.sprueche !== "object") state.sprueche = {};
  return state.sprueche;
};

// Vorschlag wählen; false bei unbekannter Kennung, abgeleiteter Merkhilfe oder ungültiger Nummer
export function waehle(state, id, n) {
  const m = MERKHILFEN[id];
  if (!m || m.von || !Number.isInteger(n) || n < 0 || n >= m.vorschlaege.length) return false;
  slot(state)[id] = { wahl: n };
  return true;
}

// Eigenen Spruch setzen: gespeichert nur, wenn checkSpruch passt; gibt das Prüfergebnis zurück
export function setzeEigen(state, id, text) {
  const m = MERKHILFEN[id];
  const r = checkSpruch(id, text);
  if (r.ok && m && !m.von) slot(state)[id] = { eigen: String(text).normalize("NFC").trim() };
  return r;
}

// HTML-Text sicher machen (der eigene Spruch kommt vom Kind)
export const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Der geltende Spruch als HTML-Stück, das die Lernen-Ansicht nach einer neuen Wahl auffrischt
// (data-spruch-show, Inhalt per textContent)
export const showHtml = (state, id) => `<span data-spruch-show="${id}">${esc(spruch(state, id))}</span>`;

// Auswahl einer Merkhilfe für die Lerntafeln: Vorschläge als Optionsfelder, dazu „Eigener Spruch“ mit Feld
// und Meldung. Die aktive Wahl ist hervorgehoben (.on). Verdrahtet wird in src/views/learn.js.
export function wahlHtml(state, id) {
  const m = MERKHILFEN[id];
  if (!m || m.von) return "";
  const a = aktiv(state, id), e = entry(state, id);
  const eigen = e && typeof e.eigen === "string" ? e.eigen : "";
  const name = `sp-${id}`;
  const opt = (value, label, on) => `<label class="spruch-opt${on ? " on" : ""}"><input type="radio" name="${name}" value="${value}"${on ? " checked" : ""}><span>${label}</span></label>`;
  const opts = m.vorschlaege.map((v, i) => opt(i, esc(v), a === i)).join("");
  return `<fieldset class="spruch-wahl" data-spruch-wahl="${id}">
    <legend>Merkspruch · ${esc(m.wofuer)}: <b>${esc(m.reihe)}</b></legend>
    ${opts}${opt("eigen", "Eigener Spruch", a === "eigen")}
    <input type="text" class="spruch-eigen" id="${name}-eigen" maxlength="${SPRUCH_MAX}" autocomplete="off" spellcheck="false"
      placeholder="${esc(m.buchstaben.map((b) => b + "…").join(" "))}"
      aria-label="Eigener Spruch: ${esc(m.wofuer)}, Anfangsbuchstaben ${esc(m.buchstaben.join(" "))}" aria-describedby="${name}-msg" value="${esc(eigen)}">
    <p class="small spruch-msg" id="${name}-msg" aria-live="polite"></p>
  </fieldset>`;
}
