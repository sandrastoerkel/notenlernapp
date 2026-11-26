// Vorführungen und Lerntafeln „Noten lesen“ (Welle 12, PLAN Abschnitte 4 und 5). Die Bilder sind rein (in node
// testbar), src/demo.js zeigt sie. Format einer Vorführung siehe src/demo.js. Alle Lagen kommen aus staffPos
// (über noten-lage.js), die Namen aus gName; die Farben der Markierungen nur über die Klassen s1/s2 bzw. nl-s1/
// nl-s2 (css/style.css, Abschnitt „Noten lesen: Vorführung“, Tokens --step1…/--step2…).
import { N, dia, fromDia, staffPos, gName, midi, pc } from "../music.js";
import { staffSvg, noteSvg, pianoSvg, TOP, BOTTOM, S, X0, X1 } from "../staff.js";
import { teileZu, esc } from "../sprueche.js";
import { demoHtml, mountDemo } from "../demo.js";
import { SCHRITTE, displayName, lage, stammton, spruchId } from "./noten-lage.js";
import { vorzeichenRegel } from "./noten-hilfen.js";

export const DEMO_X = 170;
export const DEMO_PROMPT = "Wie heißt die Note?";
const r2 = (v) => Math.round(v * 100) / 100;
const yOf = (p) => BOTTOM - p * (S / 2);
const staffBox = (svg) => `<div class="demo-staff">${svg}</div>`;

/* ---------- Merkspruch der Vorführung ---------- */

// Die Engine ruft level.demo(q) ohne Spielstand. Der gewählte Merkspruch kommt deshalb aus der Aufgabe:
// q.spruch = der geltende Spruch (Text) für die Stelle der Note, also spruch(state, spruchId(note, clef)).
// Erlaubt sind auch ein Spielstand ({ sprueche }) oder nichts (dann der erste Vorschlag aus sprueche.js).
// Ein Text, dessen Anfangsbuchstaben nicht passen, gilt nicht (sprueche.js prüft ihn): dann die Voreinstellung.
const asState = (src, id) => {
  if (typeof src === "string") return { sprueche: { [id]: { eigen: src } } };
  return src && typeof src === "object" ? src : undefined;
};
// [davor, Wort, danach] des Spruchs um das Wort zur Stelle der Note (Text, noch nicht maskiert)
export function spruchTeile(n, clef, src) {
  const id = spruchId(n, clef);
  if (!id) return null;
  return teileZu(asState(src, id), id, Math.floor(staffPos(n, clef) / 2));
}

/* ---------- Bausteine der Bilder ---------- */

// Ring um den Notenkopf bzw. um das Vorzeichen (Rahmen in der Farbe des Schritts)
const headRing = (n, clef, step, x = DEMO_X) => `<ellipse class="nl-ring s${step}" cx="${x}" cy="${yOf(staffPos(n, clef))}" rx="12" ry="9"/>`;
// Lage des Vorzeichens vor dem Kopf (staff.js: ♯ ab x − 22, ♭ ab x − 21, rechte Kante 0,25 LA vor dem Kopf;
// mit Hilfslinie 1,9 weiter links). Der Rahmen umschließt die Glyphe mit etwas Luft.
export function accBox(n, clef, x = DEMO_X) {
  const p = staffPos(n, clef), cy = yOf(p), shift = p <= -2 || p >= 10 ? 1.9 : 0;
  return n.acc > 0
    ? { x: r2(x - 25 - shift), y: cy - 18, w: 18, h: 36 }
    : { x: r2(x - 24 - shift), y: cy - 26, w: 17, h: 35 };
}
const accRing = (n, clef, step) => { const b = accBox(n, clef); return `<rect class="nl-ring s${step}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="5"/>`; };

// Nummern der Linien bzw. Zwischenräume von unten bis zur Note, links neben ihr; die der Note violett.
export const NUM_X = 132;
export function lageNums(n, clef) {
  const l = lage(n, clef);
  let s = `<g class="nl-nums">`;
  for (let k = 1; k <= l.nr; k++) {
    const p = l.art === "linie" ? 2 * (k - 1) : 2 * k - 1, y = yOf(p), on = k === l.nr;
    // Kreis hinter jeder Nummer, damit die Linie die Ziffer nicht durchstreicht (Abstand der Stellen: 12)
    s += `<g class="nl-num${on ? " on" : ""}" data-nr="${k}" data-pos="${p}">`
      + `<circle cx="${NUM_X}" cy="${y}" r="${on ? 6.5 : 5.8}"/>`
      + `<text x="${NUM_X}" y="${r2(y + 4)}" text-anchor="middle">${k}</text></g>`;
  }
  return s + "</g>";
}
const lageWort = (l) => (l.art === "linie" ? `${l.nr}. Linie` : `${l.nr}. Zwischenraum`);
const lageSatz = (l) => (l.art === "linie" ? `Zähle von unten: Die Note liegt auf der ${l.nr}. Linie.` : `Zähle von unten: Die Note liegt im ${l.nr}. Zwischenraum.`);

// Merkspruch mit dem Wort der Stelle (grün); eigener Text nur maskiert
const spruchHtml = ([vor, wort, nach], step) => `<p class="nl-spruch">${esc(vor)}<b class="nl-wort${step ? " s" + step : ""}">${esc(wort)}</b>${esc(nach)}</p>`;

/* ---------- 1. „So liest du eine Note“: Lage → Name (Stufen 1, 2, 6, 7) ---------- */

// lageDemo(q) mit der Aufgabe (q.note, q.clef, q.spruch) oder lageDemo(n, clef, spruch | Spielstand).
// Bild 0 Frage → 1 violett: Nummern von unten, Satz zur Lage → 2 grün: der Merkspruch, das Wort der Stelle grün
// → Ergebnis mit Ton. Noten ohne Stelle in der Zeile (mit Vorzeichen, außerhalb): die Lage des Stammtons.
export function lageDemo(a, b, c) {
  const q = a && a.note ? a : null;
  const n = q ? q.note : a, clef = q ? q.clef : b, src = q ? (q.spruch !== undefined ? q.spruch : q.state) : c;
  const st = stammton(n), l = lage(st, clef);
  const note = noteSvg(n, clef, DEMO_X);
  if (!l.nr) return schlicht(SCHRITTE.lage, n, clef);
  const teile = spruchTeile(st, clef, src), wort = teile[1], letter = n.letter;
  const staff1 = staffBox(staffSvg(clef, lageNums(st, clef) + note + headRing(st, clef, 1)));
  const frames = [
    { step: 0, text: DEMO_PROMPT, body: staffBox(staffSvg(clef, note)) },
    { step: 1, text: lageSatz(l), body: staff1 },
    { step: 2, text: `Das ${l.nr}. Wort beginnt mit ${letter}.`, body: staff1 + spruchHtml(teile, 2) },
    {
      step: 3, tones: [n],
      result: { title: displayName(n), chips: [{ step: 1, text: lageWort(l) }, { step: 2, text: `${esc(wort)} → ${letter}` }] },
      body: staff1 + spruchHtml(teile, 2),
    },
  ];
  return { steps: SCHRITTE.lage.slice(), frames };
}

/* ---------- 2. „So zählst du vom Bezugston“: Bezugston → Zählen (Stufen 4, 9) ---------- */

// Stammtöne Stelle für Stelle von ref bis n (beide eingeschlossen)
export function weg(ref, n) {
  const d0 = dia(ref), d1 = dia(n), step = d1 < d0 ? -1 : 1, out = [];
  for (let d = d0; d !== d1 + step; d += step) out.push(fromDia(d));
  return out;
}
// Art des Bezugstons: unterste bzw. oberste Linie der Zeile oder die Linie des Schlüssels (g' auf der 2. Linie
// im Violinschlüssel, f auf der 4. Linie im Bassschlüssel)
export function bezugArt(ref, clef) {
  const p = staffPos(ref, clef);
  if (p === 0) return "unterste";
  if (p === 8) return "oberste";
  if (p === (clef === "treble" ? 2 : 6)) return "schluessel";
  return "linie";
}
function bezugSatz(ref, clef) {
  const art = bezugArt(ref, clef), name = displayName(ref);
  if (art === "unterste") return `Die unterste Linie ist das ${name}.`;
  if (art === "oberste") return `Die oberste Linie ist das ${name}.`;
  if (art === "schluessel") return clef === "treble"
    ? `Der Kringel des Schlüssels umschließt die G-Linie: das ${name}.`
    : `Die zwei Punkte des Schlüssels umschließen die F-Linie: das ${name}.`;
  return `Auf der ${lage(ref, clef).nr}. Linie liegt das ${name}.`;
}
function bezugChip(ref, clef) {
  const art = bezugArt(ref, clef), L = ref.letter;
  if (art === "unterste") return `unterste Linie ${L}`;
  if (art === "oberste") return `oberste Linie ${L}`;
  if (art === "schluessel") return `Schlüssel: ${L}-Linie`;
  return `${lage(ref, clef).nr}. Linie ${L}`;
}
// Abstand der Köpfe beim Zählen; die gesuchte Note steht rechts bei DEMO_X, der Bezugston links davon
export const WEG_DX = 30;
const wegX = (w, i) => DEMO_X - (w.length - 1 - i) * WEG_DX;
// Bezugslinie (violett) über der Linie der Zeile
const refLine = (ref, clef) => { const y = yOf(staffPos(ref, clef)); return `<line class="nl-refline" x1="${X0}" x2="${X1}" y1="${y}" y2="${y}"/>`; };
// Kopf ohne Hals (mit Hilfslinien) in der Farbe des Schritts, blass
const blass = (m, clef, x, step) => `<g class="nl-weg nl-s${step}">${noteSvg(m, clef, x, "", { stemless: true })}</g>`;
// Name unter der Zeile
const LABEL_Y = BOTTOM + 32;
const nameAt = (m, x, step) => `<text class="nl-name nl-t${step}" x="${x}" y="${LABEL_Y}" text-anchor="middle">${gName(m)}</text>`;
const H_WEG = 130;

export function zaehlDemo(ref, n, clef) {
  const w = weg(ref, n), note = noteSvg(n, clef, DEMO_X), last = w.length - 1;
  const opts = { height: H_WEG };
  const richtung = dia(n) < dia(ref) ? "abwärts" : "aufwärts";
  const names = (k) => w.slice(0, k + 1).map(gName).join(" – ");
  // Bild mit den Köpfen 0 … k: Bezugsnote violett, die weiteren grün; die gesuchte Note bleibt schwarz
  const upTo = (k) => {
    let s = refLine(ref, clef) + blass(ref, clef, wegX(w, 0), 1) + nameAt(ref, wegX(w, 0), 1);
    for (let i = 1; i <= k; i++) {
      if (i < last) s += blass(w[i], clef, wegX(w, i), 2);
      s += nameAt(w[i], wegX(w, i), 2);
    }
    return staffBox(staffSvg(clef, s + note, opts));
  };
  const frames = [
    { step: 0, text: DEMO_PROMPT, body: staffBox(staffSvg(clef, note, opts)) },
    { step: 1, text: bezugSatz(ref, clef), body: upTo(0) },
  ];
  // mehr als zwei Stellen: zwei Bilder (erst bis zur Mitte, dann bis zur Note)
  const mid = last > 2 ? Math.ceil(last / 2) : last;
  if (mid < last) frames.push({ step: 2, text: `Von ${ref.letter} ${richtung}: ${names(mid)} …`, tones: w.slice(0, mid + 1), body: upTo(mid) });
  if (last > 0) frames.push({ step: 2, text: `Von ${ref.letter} ${richtung}: ${names(last)}.`, tones: mid < last ? w.slice(mid) : w.slice(), body: upTo(last) });
  frames.push({
    step: 3, tones: [n],
    result: { title: displayName(n), chips: [{ step: 1, text: bezugChip(ref, clef) }, { step: 2, text: names(last) }] },
    body: upTo(last),
  });
  return { steps: SCHRITTE.zaehlen.slice(), frames };
}

/* ---------- 3. „So liest du eine Note mit Vorzeichen“: Stammton → Vorzeichen (Stufen 11, 13) ---------- */

// Eine Oktave Klaviatur ab c' (nur zum Anschauen): Taste des Stammtons (Schritt 1, Klasse mark) und die
// Nachbartaste der Note mit Vorzeichen (Schritt 2, Klasse count). Nur die Tonklasse zählt.
export const KEYS_FROM = 60;
export const keyOf = (n) => KEYS_FROM + pc(midi(n));
const keys = (n, step) => `<div class="demo-keys nl-keys">${pianoSvg({ from: KEYS_FROM, octaves: 1, interactive: false, marks: [keyOf(stammton(n))], counts: step >= 2 ? [[keyOf(n), ""]] : [] })}</div>`;

export function vorzeichenDemo(n, clef) {
  const st = stammton(n), note = noteSvg(n, clef, DEMO_X);
  if (!n.acc) return schlicht(SCHRITTE.vorzeichen, n, clef);
  const zeichen = n.acc > 0 ? "♯" : "♭", neu = gName(n), alt = st.letter;
  const satz2 = n.acc > 0 ? `♯ erhöht um einen Halbton: Aus ${alt} wird ${neu}.` : `♭ erniedrigt um einen Halbton: Aus ${alt} wird ${neu}.`;
  const s1 = staffBox(staffSvg(clef, note + headRing(n, clef, 1)));
  const s2 = staffBox(staffSvg(clef, note + headRing(n, clef, 1) + accRing(n, clef, 2)));
  const frames = [
    { step: 0, text: DEMO_PROMPT, body: staffBox(staffSvg(clef, note)) },
    { step: 1, text: `Ohne das Vorzeichen ist das ein ${alt}.`, tones: [st], body: s1 + keys(n, 1) },
    { step: 2, text: satz2, tones: [n], body: s2 + keys(n, 2) },
    {
      step: 3, tones: [n],
      result: { title: displayName(n), chips: [{ step: 1, text: `Stammton ${alt}` }, { step: 2, text: `${zeichen} → ${neu}` }] },
      body: s2 + keys(n, 2),
    },
  ];
  return { steps: SCHRITTE.vorzeichen.slice(), frames };
}

// Rückfall für Noten, zu denen eine Vorführung nicht passt (z. B. ohne Stelle in der Zeile): Frage → Ergebnis
function schlicht(steps, n, clef) {
  const body = staffBox(staffSvg(clef, noteSvg(n, clef, DEMO_X)));
  return { steps: steps.slice(), frames: [{ step: 0, text: DEMO_PROMPT, body }, { step: steps.length + 1, tones: [n], result: { title: displayName(n), chips: [] }, body }] };
}

/* ---------- Lerntafeln des Reiters „Tonhöhen“ (PLAN Abschnitt 5) ---------- */

// Feste Beispiele je Schlüssel (PLAN Abschnitt 4; der Test prüft jede Zeile gegen staffPos). label: Knopf –
// er nennt, was das Beispiel zeigt (die Lage, den Bezug, das Zeichen), nie den Notennamen (wie die Beispiel-Knöpfe
// der anderen Pakete: „Viertelnote“, „G-Dur“).
export const BEISPIELE = {
  lage: {
    treble: [{ n: N("G", 4), label: "2. Linie" }, { n: N("C", 5), label: "3. Zwischenraum" }],
    bass: [{ n: N("F", 3), label: "4. Linie" }, { n: N("C", 3), label: "2. Zwischenraum" }],
  },
  zaehlen: {
    treble: [{ ref: N("G", 4), n: N("H", 4), label: "vom Schlüssel" }, { ref: N("E", 4), n: N("C", 4), label: "unter der Zeile" }, { ref: N("F", 5), n: N("A", 5), label: "über der Zeile" }],
    bass: [{ ref: N("F", 3), n: N("D", 3), label: "vom Schlüssel" }, { ref: N("G", 2), n: N("E", 2), label: "unter der Zeile" }, { ref: N("A", 3), n: N("C", 4), label: "über der Zeile" }],
  },
  vorzeichen: {
    treble: [{ n: N("F", 4, 1), label: "mit ♯" }, { n: N("H", 4, -1), label: "mit ♭" }],
    bass: [{ n: N("F", 3, 1), label: "mit ♯" }, { n: N("H", 2, -1), label: "mit ♭" }],
  },
};

// Vorführungen der Tafeln: ctx = { state } (gewählter Merkspruch)
const MAKE = {
  lage: (b, clef, ctx) => lageDemo(b.n, clef, ctx && ctx.state),
  zaehlen: (b, clef) => zaehlDemo(b.ref, b.n, clef),
  vorzeichen: (b, clef) => vorzeichenDemo(b.n, clef),
};
const TEXTE = {
  lage: {
    intro: "Erst die Lage: Zähle die Linien bzw. Zwischenräume von unten. Dann der Name: Das Wort deines Merkspruchs an dieser Stelle beginnt mit dem Notennamen.",
    after: "Deinen Merkspruch wählst du unter „Merkhilfen“.",
  },
  zaehlen: {
    intro: "Erst der Bezugston: eine Linie, deren Namen du kennst – die Linie des Schlüssels oder die äußere Linie der Zeile. Dann zählen: Jede Stelle (Linie, Zwischenraum, Linie …) ist ein Notenname weiter, nach oben vorwärts, nach unten rückwärts.",
    after: "Die Namen der Reihe nach: C D E F G A H, dann wieder C.",
  },
  vorzeichen: {
    intro: "Erst der Stammton: die Note ohne ihr Vorzeichen. Dann das Zeichen: ♯ einen Halbton höher, ♭ einen Halbton tiefer.",
    after: "Das Vorzeichen steht vor der Note, auf derselben Linie bzw. im selben Zwischenraum wie ihr Kopf.",
  },
};

export function boardHtml(id, clef, ctx) {
  const ex = BEISPIELE[id][clef], t = TEXTE[id];
  const picks = ex.map((b, i) => `<button class="btn${i ? "" : " on"}" data-ex="${i}" aria-pressed="${!i}">${b.label}</button>`).join("");
  return `<div class="demo-board" data-nl-board="${id}" data-clef="${clef}">`
    + `<p class="small">${t.intro}</p>`
    + `<div class="row demo-pick" role="group" aria-label="Beispiel">${picks}</div>`
    + `<div class="demo" data-demo-root>${demoHtml(MAKE[id](ex[0], clef, ctx), 0)}</div>`
    + `<p class="small muted">${t.after}</p></div>`;
}

// Knöpfe der Tafel verdrahten; ein zweiter Aufruf (z. B. nach der Wahl eines anderen Merkspruchs) setzt die
// Vorführung mit dem gewählten Beispiel neu auf
export const mountBoard = (id, clef) => (container, ctx) => {
  const board = container && container.querySelector(`[data-nl-board="${id}"][data-clef="${clef}"]`);
  if (!board) return;
  const root = board.querySelector("[data-demo-root]"), ex = BEISPIELE[id][clef];
  const cur = () => { const b = board.querySelector("[data-ex].on"); return b ? +b.dataset.ex : 0; };
  if (board._nlDemo) board._nlDemo.stop();
  board._nlDemo = mountDemo(root, MAKE[id](ex[cur()], clef, ctx));
  board.querySelector(".demo-pick").onclick = (e) => {
    const btn = e.target.closest("[data-ex]");
    if (!btn) return;
    board._nlDemo.stop();
    board.querySelectorAll("[data-ex]").forEach((x) => { x.classList.toggle("on", x === btn); x.setAttribute("aria-pressed", String(x === btn)); });
    board._nlDemo = mountDemo(root, MAKE[id](ex[+btn.dataset.ex], clef, ctx));
  };
};

// Raster der 21 Namen (wie das Namensraster der Eingabe): je Stammton ohne, mit ♯, mit ♭ (aus gName)
export const NAMEN_RASTER = ["C", "D", "E", "F", "G", "A", "H"].map((l) => [0, 1, -1].map((a) => gName(N(l, 4, a))));
export const namenTabelle = () => `<table class="tt nl-namen"><thead><tr><th>ohne</th><th>mit ♯</th><th>mit ♭</th></tr></thead><tbody>`
  + NAMEN_RASTER.map((r) => `<tr>${r.map((x) => `<td class="tt-cell">${x}</td>`).join("")}</tr>`).join("")
  + `</tbody></table>`;
export const vorzeichenTafel = () => `<div class="demo-board nl-vz-board">${vorzeichenRegel()}`
  + `<p class="small muted">Alle 21 Namen:</p>${namenTabelle()}</div>`;

// Lerntafeln in ihrer Reihenfolge, je Schlüssel: So liest du eine Note · Merkhilfen · So zählst du vom Bezugston ·
// Vorzeichen ♯ und ♭ · So liest du eine Note mit Vorzeichen. merkhilfen(clef, state) liefert die Tafel
// „Merkhilfen“ (noten.js, legendHtml). spruch: true – die Tafel hängt vom gewählten Merkspruch ab (learn.js
// setzt sie nach einer neuen Wahl neu auf).
export const CLEFS = ["treble", "bass"];
export const TAFELN = ["So liest du eine Note", "Merkhilfen", "So zählst du vom Bezugston", "Vorzeichen ♯ und ♭", "So liest du eine Note mit Vorzeichen"];
export function boards(merkhilfen) {
  return CLEFS.flatMap((clef) => [
    { title: TAFELN[0], clef, spruch: true, render(ctx) { return boardHtml("lage", clef, ctx); }, mount: mountBoard("lage", clef) },
    { title: TAFELN[1], clef, render(ctx) { return merkhilfen(clef, ctx && ctx.state); } },
    { title: TAFELN[2], clef, render(ctx) { return boardHtml("zaehlen", clef, ctx); }, mount: mountBoard("zaehlen", clef) },
    { title: TAFELN[3], clef, render() { return vorzeichenTafel(); } },
    { title: TAFELN[4], clef, render(ctx) { return boardHtml("vorzeichen", clef, ctx); }, mount: mountBoard("vorzeichen", clef) },
  ]);
}
