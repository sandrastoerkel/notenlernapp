// Welle 12, Schritt 4: Hilfen „Noten lesen“ (PLAN Abschnitt 3) – Merkleiste, Namensleiste, Vorzeichen-Regel.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  merkleiste, namensleiste, vorzeichenRegel, merkId, stellen, noteAn, SCHLUESSEL_BEZUG, NAMEN_REIHE, RICHTUNG, REGEL,
  REGEL_KLAVIATUR,
} from "../../src/packs/noten-hilfen.js";
import noten from "../../src/packs/noten.js";
import { N, staffPos, helm, LETTERS } from "../../src/music.js";
import { fresh } from "../../src/store.js";
import { MERKHILFEN, setzeEigen, waehle, initials } from "../../src/sprueche.js";
import { helpsHtml } from "../../src/engine.js";

const CLEFS = ["treble", "bass"], ARTEN = ["linien", "raeume"];
// Zeilen der Merkleiste: [Beschriftung, Wort ohne Tags, Anfangsbuchstabe in <b>], von oben nach unten
const rowsOf = (html) => [...html.matchAll(/<tr>(.*?)<\/tr>/g)].map((m) => {
  const label = (m[1].match(/<span class="nl-lage">(.*?)<\/span>/) || [])[1];
  const bezug = (m[1].match(/<span class="nl-bezug">(.*?)<\/span>/) || [])[1] || null;
  const wortHtml = (m[1].match(/<span class="nl-wort">(.*?)<\/span><\/span>/) || [])[1] || "";
  const anf = (wortHtml.match(/<b class="nl-anf">(.*?)<\/b>/) || [])[1];
  const unesc = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
  return { label, bezug, wort: unesc(wortHtml.replace(/<[^>]+>/g, "")), anf, wortHtml };
});
// Eigene Sprüche mit passenden Anfangsbuchstaben (Test, kein Vorschlag für die App)
const EIGEN = {
  "violin-linien": "Ein Gelber Hund Dreht Fröhlich",
  "violin-raeume": "Fünf Affen Chillen Entspannt",
  "bass-linien": "Große Hasen Dösen Faul Abends",
  "bass-raeume": "Alte Cowboys Essen Gemüse",
};

test("stellen und noteAn: Linien 0, 2 … 8, Zwischenräume 1 … 7; Noten an den Stellen gegen staffPos", () => {
  assert.deepEqual(stellen("linien").map((s) => s.pos), [0, 2, 4, 6, 8]);
  assert.deepEqual(stellen("raeume").map((s) => s.pos), [1, 3, 5, 7]);
  assert.deepEqual(stellen("linien").map((s) => s.label), ["1. Linie", "2. Linie", "3. Linie", "4. Linie", "5. Linie"]);
  assert.deepEqual(stellen("raeume").map((s) => s.label), ["1. Zwischenraum", "2. Zwischenraum", "3. Zwischenraum", "4. Zwischenraum"]);
  for (const clef of CLEFS) for (let p = 0; p <= 8; p++) assert.equal(staffPos(noteAn(clef, p), clef), p);
  assert.deepEqual([0, 2, 4, 6, 8].map((p) => noteAn("treble", p).letter), ["E", "G", "H", "D", "F"]);
  assert.deepEqual([0, 2, 4, 6, 8].map((p) => noteAn("bass", p).letter), ["G", "H", "D", "F", "A"]);
  assert.deepEqual([1, 3, 5, 7].map((p) => noteAn("bass", p).letter), ["A", "C", "E", "G"]);
});

test("Merkleiste: so viele Zeilen wie Wörter, oben die höchste Stelle, jedes Wort beginnt mit dem Namen seiner Stelle (Vorschläge und eigener Spruch)", () => {
  for (const clef of CLEFS) for (const art of ARTEN) {
    const id = merkId(clef, art), m = MERKHILFEN[id];
    const states = [];
    m.vorschlaege.forEach((_, i) => { const s = fresh(); assert.ok(waehle(s, id, i)); states.push(s); });
    const e = fresh(); assert.ok(setzeEigen(e, id, EIGEN[id]).ok, id); states.push(e);
    for (const s of states) {
      const rows = rowsOf(merkleiste(clef, art, s));
      const st = stellen(art);
      assert.equal(rows.length, st.length, id);
      assert.equal(rows.length, m.buchstaben.length, id);
      // oben die höchste Stelle
      assert.deepEqual(rows.map((r) => r.label), st.map((x) => x.label).reverse(), id);
      rows.forEach((r, k) => {
        const pos = st[st.length - 1 - k].pos;
        const name = noteAn(clef, pos).letter;
        assert.equal(r.anf.toUpperCase(), name, `${id} ${r.label}: ${r.wort}`);
        assert.equal(initials(r.wort)[0], name);
      });
    }
  }
});

test("Merkleiste: Zeile des Schlüssels nur bei den Linien (Violin 2. Linie g', Bass 4. Linie f)", () => {
  const s = fresh();
  for (const clef of CLEFS) {
    const lin = rowsOf(merkleiste(clef, "linien", s)).filter((r) => r.bezug);
    assert.equal(lin.length, 1, clef);
    const b = SCHLUESSEL_BEZUG[clef];
    assert.equal(lin[0].label, `${b.pos / 2 + 1}. Linie`);
    assert.equal(lin[0].bezug.replace(/\u00a0/g, " "), b.text);
    assert.equal(rowsOf(merkleiste(clef, "raeume", s)).filter((r) => r.bezug).length, 0, clef);
  }
  // Inhalt gegen staffPos: g' auf der 2. Linie im Violin-, f auf der 4. Linie im Bassschlüssel
  assert.equal(staffPos(N("G", 4), "treble"), SCHLUESSEL_BEZUG.treble.pos);
  assert.equal(staffPos(N("F", 3), "bass"), SCHLUESSEL_BEZUG.bass.pos);
  assert.ok(SCHLUESSEL_BEZUG.treble.text.endsWith(helm(N("G", 4))));
  assert.ok(SCHLUESSEL_BEZUG.bass.text.endsWith(helm(N("F", 3))));
  assert.equal(SCHLUESSEL_BEZUG.treble.text, "hier sitzt der Schlüssel: g'");
  assert.equal(SCHLUESSEL_BEZUG.bass.text, "zwischen den beiden Punkten: f");
});

test("Merkleiste: der ganze Spruch steht darüber; Voreinstellung ohne Spielstand", () => {
  assert.ok(merkleiste("treble", "linien", fresh()).includes("Linien von unten: Es Geht Hurtig Durch Fleiß"));
  assert.ok(merkleiste("treble", "raeume", fresh()).includes("Zwischenräume von unten: Fritz Aß Citronen-Eis"));
  assert.ok(merkleiste("bass", "linien", fresh()).includes("Gute Hunde Dürfen Fast Alles"));
  assert.ok(merkleiste("bass", "raeume", fresh()).includes("Alle Clowns Essen Gern"));
  assert.equal(merkleiste("bass", "linien"), merkleiste("bass", "linien", fresh()));
  // „Citronen-Eis“ sind zwei Wörter (sprueche.js): 3. Zwischenraum „Citronen“, 4. „Eis“
  const r = rowsOf(merkleiste("treble", "raeume", fresh()));
  assert.deepEqual(r.map((x) => x.wort), ["Eis", "Citronen", "Aß", "Fritz"]);
});

test("Merkleiste: eigener Spruch mit HTML-Zeichen wird maskiert, ein langer Spruch (80 Zeichen) bleibt vollständig", () => {
  const s = fresh();
  assert.ok(setzeEigen(s, "violin-linien", "Ein <Grüner> Hase&Co Döst \"Friedlich\"").ok);
  const h = merkleiste("treble", "linien", s);
  assert.ok(!h.includes("<Grüner>") && h.includes("&lt;Grüner&gt;"));
  assert.ok(h.includes("&quot;"));
  assert.ok(!/<(?!\/?(figure|figcaption|table|tbody|tr|td|span|b)\b)[^>]*>/.test(h), "nur eigene Tags");
  // Zeichen vor dem ersten Buchstaben bleiben vor dem fetten Buchstaben
  const top = rowsOf(h)[0];
  assert.equal(top.wort, "\"Friedlich\"");
  assert.equal(top.anf, "F");
  const lang = "Elefantenrüsselpflegeleichtigkeitsprüfungsordnung Gänsehaut Hurra Donner Fertigt";
  assert.equal(lang.length, 80);
  assert.ok(setzeEigen(s, "violin-linien", lang).ok);
  assert.deepEqual(rowsOf(merkleiste("treble", "linien", s)).map((r) => r.wort).reverse(), lang.split(" "));
});

test("Namensleiste: C D E F G A H C als Kästchen, Richtung, mit Schlüssel die Linien und der gewählte Spruch", () => {
  const h = namensleiste();
  assert.deepEqual([...h.matchAll(/<span class="tt-box">(.*?)<\/span>/g)].map((m) => m[1]), NAMEN_REIHE);
  assert.deepEqual(NAMEN_REIHE, [...LETTERS, "C"]);
  assert.ok(h.includes("C D E F G A H C"));
  assert.deepEqual(RICHTUNG, ["← tiefer", "höher →"]);
  for (const r of RICHTUNG) assert.ok(h.includes(r));
  assert.ok(!h.includes("Linien von unten"));
  const s = fresh();
  assert.ok(namensleiste("treble", s).includes("Linien von unten: Es Geht Hurtig Durch Fleiß"));
  assert.ok(namensleiste("bass", s).includes("Linien von unten: Gute Hunde Dürfen Fast Alles"));
  setzeEigen(s, "bass-linien", "Gute <Hunde> Dürfen Fast Alles");
  assert.ok(namensleiste("bass", s).includes("&lt;Hunde&gt;") && !namensleiste("bass", s).includes("<Hunde>"));
});

test("Vorzeichen-Regel: Wortlaut, nennt Fis, Des, Es, As und B; eine Oktave Klaviatur ohne Markierung", () => {
  assert.deepEqual(REGEL.map((r) => [...r]), [
    ["♯ Kreuz", "einen Halbton höher", "„-is“: F → Fis"],
    ["♭ Be", "einen Halbton tiefer", "„-es“: D → Des · aber E → Es, A → As, H → B"],
  ]);
  const h = vorzeichenRegel();
  for (const w of ["Fis", "Des", "E → Es", "A → As", "H → B"]) assert.ok(h.includes(w), w);
  assert.equal((h.match(/<tr>/g) || []).length, 2);
  assert.equal((h.match(/<tr>.*?<\/tr>/g) || []).every((r) => (r.match(/<t[hd][ >]/g) || []).length === 3), true);
  // Klaviatur: eine Oktave ab c', nicht anklickbar, nichts markiert
  assert.deepEqual({ ...REGEL_KLAVIATUR }, { from: 60, octaves: 1, interactive: false });
  assert.equal((h.match(/class="wkey/g) || []).length, 8);
  assert.equal((h.match(/class="bkey/g) || []).length, 5);
  assert.ok(!h.includes("data-semi") && !/\bmark\b/.test(h));
  assert.ok(!vorzeichenRegel({ klaviatur: false }).includes("<svg"));
});

test("Stufen mit Hilfen: keine Hervorhebung, gleiches HTML für jede Aufgabe der Stufe, Spruch aus dem Spielstand", () => {
  const s = fresh();
  setzeEigen(s, "violin-linien", EIGEN["violin-linien"]);
  const levels = noten.levels.filter((l) => l.helps);
  assert.deepEqual(levels.map((l) => l.no), [1, 2, 4, 6, 7, 9, 11, 13]);
  for (const l of levels) {
    const t = typeof l.helpTable === "function" ? l.helpTable({ state: s }) : l.helpTable;
    const tokens = [...t.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    for (const k of ["mark", "hit", "ref", "hi", "on", "s1", "s2", "done", "count"]) assert.ok(!tokens.includes(k), `${l.id}: keine Hervorhebung (${k})`);
    assert.ok(!/<mark\b|<strong\b/.test(t), l.id);
    // jede Aufgabe: dieselbe Hilfe (auch über helpsHtml der Engine)
    let prev = null; const tables = new Set(), bodies = new Set();
    for (let i = 0; i < 60; i++) {
      prev = l.question(prev, { state: s });
      bodies.add(helpsHtml(l, prev, { state: s }));
      tables.add(typeof l.helpTable === "function" ? l.helpTable({ state: s, q: prev }) : l.helpTable);
    }
    assert.equal(tables.size, 1, l.id);
    assert.equal(bodies.size, 1, l.id);
  }
  // Stufe 1 zeigt den eigenen Spruch, Stufe 6 den Bass-Vorschlag
  assert.ok(levels[0].helpTable({ state: s }).includes(EIGEN["violin-linien"]));
  assert.ok(levels[3].helpTable({ state: s }).includes("Gute Hunde Dürfen Fast Alles"));
  assert.ok(levels[4].helpTable({ state: s }).includes("Alle Clowns Essen Gern"));
});
