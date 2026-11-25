// Jahrgang über den Lehrkraft-Link (Welle 11, Schritt 11). Reines Modul: keine Seite, kein Speicher.
// Die Einstellung kommt nur über einen Link der Lehrkraft auf das Gerät (#klasse=6, #klasse=6&zweig=mug,
// #klasse=6&dran=intervalle:6,akkorde:1, #klasse=keine) und wird erst nach einer Bestätigung gespeichert
// (app.js, store.setKlasse). Leitsatz: Der Jahrgang ordnet und öffnet, er sperrt nie etwas.

export const JAHRGAENGE = [5, 6, 7, 8, 9, 10, 11, 12, 13];
export const ZWEIGE = ["mug"]; // Musisches Gymnasium; sonst zweig = null

// „dran bis Stufe n“ je Paket-ID (0 = noch nichts aus dem Paket). Jeder Jahrgang enthält alles Frühere.
// Quelle: LehrplanPLUS Gymnasium Bayern, Fachlehrplan Musik, Lernbereich 4 „Musik und ihre Grundlagen“, abgerufen
// am 25.11.2026 (Zitate und Begründung in docs/PLAN.md, Welle 11, Abschnitt 4):
// - 5 (Mu5): „Tonhöhen im Violin- und Bassschlüssel, Kreuz- und b-Vorzeichen …“ → Noten lesen 1–8;
//   „Noten- und Pausenwerte bis zum Sechzehntelwert“ → Notenwerte 1–5, dazu 6–10 (Punktierung, Takt füllen; nicht
//   wörtlich genannt, [OFFEN Sandra]); „diatonische Intervalle“ → Intervalle 1–2; „Ganz- und Halbtonschritt“,
//   „Dur-Tonleitern mit unterschiedlichen Grundtönen“ → Tonleitern 1–9; „Dur-Dreiklang (Grundform)“ hat keine eigene
//   Stufe (Dreiklänge 1 fragt Dur oder Moll) → 0 [OFFEN Sandra].
// - 6 (Mu6): „Intervalle bis zur Oktave: rein, groß und klein“ → Intervalle 1–4; nur MuG „übermäßige und verminderte
//   Intervalle“ → Intervalle 1–10; „Tonleitern und Dreiklänge in Dur und Moll; Dreiklangsumkehrung“ → Tonleitern
//   1–13 (10–11 und die parallele Molltonart als Auslegung, [OFFEN Sandra]), Dreiklänge 1–4 (Stufe 2 vermindert und
//   übermäßig wird mitgezogen, [OFFEN Sandra]).
// - 7 (Mu7): „Einfache Kadenz, Haupt- und Nebenstufen“ → Dreiklänge 1–6 (Stufe 5 Quintenzirkel wird mitgezogen,
//   [OFFEN Sandra]).
// - 8 bis 13 (Mu8 bis Mu13): keine weiteren Inhalte aus dem Umfang der App; alles ist Wiederholung. Intervalle 5–10
//   bleiben außerhalb des MuG „Darüber hinaus“ [OFFEN Sandra].
const D5 = { noten: 8, notenwerte: 10, intervalle: 2, tonleitern: 9, akkorde: 0 };
const D6 = { noten: 8, notenwerte: 10, intervalle: 4, tonleitern: 13, akkorde: 4 };
const D7 = { noten: 8, notenwerte: 10, intervalle: 4, tonleitern: 13, akkorde: 6 };
const mug = (d, j) => (j >= 6 ? { ...d, intervalle: 10 } : { ...d });

export const DRAN = Object.freeze(Object.fromEntries(JAHRGAENGE.map((j) =>
  [j, Object.freeze({ ...(j === 5 ? D5 : j === 6 ? D6 : D7) })])));
export const DRAN_MUG = Object.freeze(Object.fromEntries(JAHRGAENGE.map((j) =>
  [j, Object.freeze(mug(DRAN[j], j))])));

// Voreinstellung eines Jahrgangs (neues Objekt); null für einen Jahrgang außerhalb 5 … 13
export function dranFor(jahrgang, zweig = null) {
  const t = zweig === "mug" ? DRAN_MUG : DRAN;
  return t[jahrgang] ? { ...t[jahrgang] } : null;
}

const validJahrgang = (j) => Number.isInteger(j) && JAHRGAENGE.includes(j);
const validZweig = (z) => z === null || ZWEIGE.includes(z);
// Stufenzahl eines Pakets (höchste Nummer)
const levelCount = (pack) => pack.levels.length;

// Zahl ohne führende Null, nur Ziffern („0“, „7“, „12“); sonst NaN
const strictInt = (t) => (/^(0|[1-9][0-9]?)$/.test(t) ? Number(t) : NaN);

// Ist die Adresse eine Jahrgangs-Angabe (dann prüft app.js sie und zeigt bei Fehlern den Hinweis)? Gilt für jede
// Angabe mit klasse, zweig oder dran, auch in falscher Schreibweise (#Klasse=6), damit ein verunglückter Link nicht
// stillschweigend übergangen wird.
export function isKlasseLink(hash) {
  const h = String(hash || "").replace(/^[^#]*#/, "");
  return h.split("&").some((p) => /^(klasse|zweig|dran)(=|$)/i.test(p));
}

// Adresse (ganzer Link oder nur "#…") lesen. Ergebnis { jahrgang, zweig, dran } (dran vollständig je Paket),
// { keine: true } oder null. Streng: nur die Formen
//   klasse=N · klasse=N&zweig=mug · klasse=N&dran=<paket>:<n>,… · klasse=N&zweig=mug&dran=… · klasse=keine
// (Reihenfolge der Angaben beliebig). Null bei leerem Wert, unbekannter oder doppelter Angabe, unbekanntem oder
// doppeltem Paket, Zahl außerhalb 0 … Stufenzahl, Jahrgang außerhalb 5 … 13 und bei Großschreibung.
export function parseLink(hash, packs) {
  let h = String(hash || "");
  const at = h.indexOf("#");
  if (at >= 0) h = h.slice(at + 1);
  try { h = decodeURIComponent(h); } catch (e) { return null; }
  if (!h) return null;
  const params = {};
  for (const part of h.split("&")) {
    const m = /^([a-z]+)=(.*)$/.exec(part);
    if (!m || !["klasse", "zweig", "dran"].includes(m[1]) || m[1] in params || m[2] === "") return null;
    params[m[1]] = m[2];
  }
  if (!("klasse" in params)) return null;
  if (params.klasse === "keine") return Object.keys(params).length === 1 ? { keine: true } : null;
  const jahrgang = strictInt(params.klasse);
  if (!validJahrgang(jahrgang)) return null;
  let zweig = null;
  if ("zweig" in params) {
    if (!ZWEIGE.includes(params.zweig)) return null;
    zweig = params.zweig;
  }
  const dran = dranFor(jahrgang, zweig);
  if ("dran" in params) {
    const seen = new Set();
    for (const item of params.dran.split(",")) {
      const m = /^([a-z]+):([0-9]+)$/.exec(item);
      if (!m || seen.has(m[1])) return null;
      const pack = packs.find((p) => p.id === m[1]);
      const n = strictInt(m[2]);
      if (!pack || !(n >= 0 && n <= levelCount(pack))) return null;
      seen.add(m[1]);
      dran[m[1]] = n;
    }
  }
  // nur Pakete, die es gibt (die Tabelle nennt alle fünf)
  for (const id of Object.keys(dran)) if (!packs.some((p) => p.id === id)) delete dran[id];
  return { jahrgang, zweig, dran };
}

// Link für die Klasse: base + "#klasse=…". k = null oder { keine: true } → "#klasse=keine". Genannt wird nur,
// was von der Voreinstellung abweicht (zweig=mug, dran nur für abweichende Pakete, in der Reihenfolge der Pakete).
// parseLink(buildLink(base, k, packs), packs) ergibt wieder k (mit vollständigem dran).
export function buildLink(base, k, packs) {
  const b = String(base || "").replace(/#.*$/, "");
  if (!k || k.keine) return `${b}#klasse=keine`;
  if (!validJahrgang(k.jahrgang) || !validZweig(k.zweig ?? null)) throw new Error("Ungültiger Jahrgang");
  const zweig = k.zweig ?? null;
  const def = dranFor(k.jahrgang, zweig);
  const diff = packs
    .filter((p) => k.dran && k.dran[p.id] !== undefined && k.dran[p.id] !== def[p.id])
    .map((p) => {
      const n = k.dran[p.id];
      if (!Number.isInteger(n) || n < 0 || n > levelCount(p)) throw new Error(`Ungültige Stufe für ${p.id}`);
      return `${p.id}:${n}`;
    });
  return `${b}#klasse=${k.jahrgang}${zweig ? `&zweig=${zweig}` : ""}${diff.length ? `&dran=${diff.join(",")}` : ""}`;
}

// Gleiche Einstellung? (null bzw. undefined gelten als „keine“)
export function sameKlasse(a, b) {
  if (!a || !b) return !a && !b;
  if (a.jahrgang !== b.jahrgang || (a.zweig ?? null) !== (b.zweig ?? null)) return false;
  const da = a.dran || {}, db = b.dran || {};
  const keys = new Set([...Object.keys(da), ...Object.keys(db)]);
  return [...keys].every((id) => (da[id] || 0) === (db[id] || 0));
}

// Weicht dran von der Voreinstellung des Jahrgangs ab?
const eigen = (k) => {
  const def = dranFor(k.jahrgang, k.zweig ?? null) || {};
  const d = k.dran || {};
  return [...new Set([...Object.keys(def), ...Object.keys(d)])].some((id) => (d[id] || 0) !== (def[id] || 0));
};

// „Jahrgang 6“ / „Jahrgang 6, Musisches Gymnasium“ / „Jahrgang 6, eigene Auswahl“ (beides: „…, Musisches
// Gymnasium, eigene Auswahl“); "" ohne Einstellung
export function klasseText(k) {
  if (!k || !validJahrgang(k.jahrgang)) return "";
  return [`Jahrgang ${k.jahrgang}`, k.zweig === "mug" ? "Musisches Gymnasium" : "", eigen(k) ? "eigene Auswahl" : ""]
    .filter(Boolean).join(", ");
}

// „dran bis“ eines Pakets aus einer Einstellung (0, wenn nichts oder unbrauchbar)
export const dranOf = (k, packId) => {
  const n = k && k.dran ? k.dran[packId] : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
};

const geschafft = (state, id) => (((state.levels || {})[id] || {}).best || 0) >= 8;

// Abschnitte der Startseite mit Jahrgang (für Schritt 12), Listen von Stufen-IDs in der Reihenfolge der Pakete:
// - jetzt: was in diesem Jahrgang neu dazukommt (über „dran“ des Jahrgangs davor bis „dran“) und noch nicht
//   geschafft ist (beste Runde unter 8);
// - gewesen: alles bis „dran“ des Jahrgangs davor und das schon Geschaffte aus „jetzt“;
// - hinaus: alles über „dran“.
// „Davor“ ist die Voreinstellung des vorigen Jahrgangs im selben Zweig (Jahrgang 5: nichts), höchstens bis „dran“
// (bei einem eigenen Zuschnitt unter der Voreinstellung des Vorjahrs). Ohne Einstellung: null.
export function sections(state, packs) {
  const k = state && state.klasse;
  if (!k || !validJahrgang(k.jahrgang)) return null;
  const prev = dranFor(k.jahrgang - 1, k.zweig ?? null) || {};
  const out = { jetzt: [], gewesen: [], hinaus: [] };
  for (const pack of packs) {
    const bis = dranOf(k, pack.id);
    const vor = Math.min(prev[pack.id] || 0, bis);
    pack.levels.forEach((l, i) => {
      const no = l.no ?? i + 1;
      if (no > bis) out.hinaus.push(l.id);
      else if (no <= vor || geschafft(state, l.id)) out.gewesen.push(l.id);
      else out.jetzt.push(l.id);
    });
  }
  return out;
}

// Nächste Stufe aus „Jetzt dran“ (erste nicht geschaffte) oder null
export function nextUp(state, packs) {
  const s = sections(state, packs);
  return s && s.jetzt.length ? s.jetzt[0] : null;
}
