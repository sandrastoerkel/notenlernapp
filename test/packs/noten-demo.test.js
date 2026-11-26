// Vorführungen und Lerntafeln „Noten lesen“ (Welle 12, Schritt 5; PLAN Abschnitte 4 und 5)
import { test } from "node:test";
import assert from "node:assert/strict";
import { N, dia, staffPos, gName, midi, same } from "../../src/music.js";
import { SCHRITTE, displayName, dasName, lage, bezug, stammton } from "../../src/packs/noten-lage.js";
import {
  lageDemo, zaehlDemo, vorzeichenDemo, boards, weg, bezugArt, lageNums, keyOf, spruchTeile, accBox,
  BEISPIELE, TAFELN, NAMEN_RASTER, namenTabelle, boardHtml, DEMO_PROMPT,
} from "../../src/packs/noten-demo.js";
import { MERKHILFEN, spruch } from "../../src/sprueche.js";
import { marksHtml, sayHtml } from "../../src/demo.js";
import noten from "../../src/packs/noten.js";

const lv = (no) => noten.levels.find((l) => l.no === no);
const ART = { 1: "lage", 2: "lage", 6: "lage", 7: "lage", 4: "zaehlen", 9: "zaehlen", 11: "vorzeichen", 13: "vorzeichen" };
const toneKeys = (tones) => (tones || []).map((n) => `${n.letter}${n.octave}${n.acc}`);

// Gemeinsame Prüfung jeder Vorführung: höchstens 5 Bilder, Schritte 0 → 1 → 2 → Ergebnis, Ergebnis mit Ton
function frameOk(d, n, steps, msg) {
  assert.deepEqual(d.steps, [...steps], msg);
  assert.ok(d.frames.length >= 4 && d.frames.length <= 5, `${msg}: ${d.frames.length} Bilder`);
  assert.deepEqual(d.frames.map((f) => f.step).filter((s, i, a) => i === 0 || s !== a[i - 1]), [0, 1, 2, 3], msg);
  const res = d.frames.at(-1);
  assert.equal(res.result.title, displayName(n), msg);
  assert.deepEqual(res.tones, [n], msg);
  // Marken der Ergebniskarte: Schritt 1 und 2 in ihrer Farbe
  assert.deepEqual(res.result.chips.map((c) => c.step), [1, 2], msg);
  for (const f of d.frames) {
    assert.ok(typeof f.body === "string" && f.body.includes("<svg"), msg);
    if (!f.result) assert.ok(sayHtml(f).includes(`demo-text s${f.step}`), msg);
  }
  // Schritt-Marken: im Bild des Schritts „on“, danach „done“
  const i2 = d.frames.findIndex((f) => f.step === 2);
  assert.ok(marksHtml(d, i2).includes('class="demo-mark s1 done"') && marksHtml(d, i2).includes('class="demo-mark s2 on"'), msg);
  assert.equal(d.frames[0].text, DEMO_PROMPT, msg);
}

test("Stufen mit Hilfen: level.demo(q) für jede Note ihrer Stufe, die Art passt zur Stufe", () => {
  for (const [no, art] of Object.entries(ART)) {
    const l = lv(+no);
    for (const it of l.items) {
      const d = l.demo({ note: it.n, clef: it.clef });
      frameOk(d, it.n, SCHRITTE[art], `${l.id} ${gName(it.n)}`);
    }
  }
});

test("lageDemo: Nummern von unten bis zur Note, Satz zur Lage, Wort des Spruchs grün, Marken", () => {
  for (const no of [1, 2, 6, 7]) for (const it of lv(no).items) {
    const n = it.n, clef = it.clef, l = lage(n, clef), d = lageDemo({ note: n, clef });
    const [f0, f1, f2, res] = d.frames;
    assert.equal(d.frames.length, 4);
    // Bild 1: genau l.nr Nummern an den Stellen der Linien bzw. Zwischenräume von unten, die der Note „on“
    const nums = [...f1.body.matchAll(/class="nl-num( on)?" data-nr="(\d)" data-pos="(-?\d+)"/g)];
    assert.equal(nums.length, l.nr);
    nums.forEach((m, i) => {
      assert.equal(+m[2], i + 1);
      assert.equal(+m[3], l.art === "linie" ? 2 * i : 2 * i + 1);
      assert.equal(!!m[1], i + 1 === l.nr);
    });
    assert.equal(+nums.at(-1)[3], staffPos(n, clef));
    assert.ok(!f0.body.includes("nl-num"));
    assert.equal(f1.text, l.art === "linie" ? `Zähle von unten: Die Note liegt auf der ${l.nr}. Linie.` : `Zähle von unten: Die Note liegt im ${l.nr}. Zwischenraum.`);
    // nach Schritt 1 noch kein Name und kein Spruch
    assert.ok(!f1.body.includes("nl-spruch") && !f1.text.includes(` ${n.letter}.`));
    // Bild 2: der voreingestellte Spruch, das Wort der Stelle grün und mit dem Notennamen am Anfang
    const id = `${clef === "treble" ? "violin" : "bass"}-${l.art === "linie" ? "linien" : "raeume"}`;
    const wort = spruch(undefined, id).split(/[\s-]+/)[l.nr - 1];
    assert.ok(f2.body.includes(`<b class="nl-wort s2">${wort}</b>`), `${gName(n)} ${wort}`);
    assert.equal(wort[0], n.letter);
    assert.equal(f2.text, `Das ${l.nr}. Wort beginnt mit ${n.letter}.`);
    assert.deepEqual(res.result.chips.map((c) => c.text), [l.art === "linie" ? `${l.nr}. Linie` : `${l.nr}. Zwischenraum`, `„${wort}“ → ${n.letter}`]);
    assert.ok(!f0.tones && !f1.tones && !f2.tones);
  }
});

test("lageDemo: Merkspruch aus q.spruch, aus dem Spielstand oder voreingestellt; eigener Text maskiert", () => {
  const n = N("G", 4), clef = "treble";
  const eigen = "Elche <Gehen> Hinter Dem Fluss";
  const wortIn = (d) => d.frames[2].body.match(/<b class="nl-wort s2">([^<]*)<\/b>/)[1];
  // Voreinstellung
  assert.equal(wortIn(lageDemo({ note: n, clef })), "Geht");
  assert.equal(wortIn(lageDemo(n, clef)), "Geht");
  // q.spruch (Text) – so legt Schritt 3 den gewählten Spruch in die Aufgabe; eigener Text nur maskiert
  const d = lageDemo({ note: n, clef, spruch: eigen });
  assert.equal(wortIn(d), "&lt;Gehen&gt;");
  assert.ok(!d.frames.some((f) => f.body.includes("<Gehen")), "kein HTML aus dem Text des Kindes");
  assert.equal(d.frames.at(-1).result.chips[1].text, "„&lt;Gehen&gt;“ → G");
  assert.equal(spruchTeile(n, clef, eigen).join(""), eigen);
  // Spielstand mit eigenem Spruch
  const state = { sprueche: { "violin-linien": { eigen: "Elefanten Gähnen Hungrig Durch Felder" } } };
  assert.equal(wortIn(lageDemo(n, clef, state)), "Gähnen");
  assert.equal(wortIn(lageDemo({ note: n, clef, state })), "Gähnen");
  assert.equal(wortIn(lageDemo({ note: n, clef, spruch: "Elefanten Gähnen Hungrig Durch Felder" })), "Gähnen");
  // ein Text mit falschen Anfangsbuchstaben gilt nicht: Voreinstellung
  assert.equal(wortIn(lageDemo({ note: n, clef, spruch: "Alle meine Entchen schwimmen hier" })), "Geht");
  // Zwischenräume im Bass: Wort zur Stelle
  assert.equal(wortIn(lageDemo({ note: N("E", 3), clef: "bass" })), MERKHILFEN["bass-raeume"].vorschlaege[0].split(" ")[2]);
});

test("zaehlDemo: Bezugston = bezug() in Stufe 4 und 9, Zählweg lückenlos, Töne = gezählte Noten", () => {
  for (const no of [4, 9]) for (const it of lv(no).items) {
    const n = it.n, clef = it.clef, b = bezug(n, clef);
    const d = lv(no).demo({ note: n, clef });
    const w = weg(b.ref, n);
    assert.deepEqual(w, b.weg);
    // lückenlos: jede Stelle genau ein Name weiter
    for (let i = 1; i < w.length; i++) assert.equal(Math.abs(dia(w[i]) - dia(w[i - 1])), 1);
    assert.ok(same(w[0], b.ref) && same(w.at(-1), n));
    const [, f1, f2] = d.frames;
    assert.equal(f1.text, `Die ${b.linie} Linie ist ${dasName(b.ref)}.`);
    assert.ok(!/\(großes /.test(f1.text), f1.text);
    assert.ok(f1.body.includes("nl-refline"));
    assert.equal(f2.text, `Von ${b.ref.letter} ${b.richtung}: ${w.map(gName).join(" – ")}.`);
    assert.deepEqual(toneKeys(f2.tones), toneKeys(w));
    assert.deepEqual(d.frames.at(-1).result.chips.map((c) => c.text), [`${b.linie} Linie ${b.ref.letter}`, w.map(gName).join(" – ")]);
    // Namen unter der Zeile: alle Stellen des Wegs
    assert.equal((f2.body.match(/class="nl-name /g) || []).length, w.length);
  }
  // Vom Bezugston C … das Beispiel aus dem Plan: unterste Linie E, abwärts E – D – C
  const d = zaehlDemo(N("E", 4), N("C", 4), "treble");
  assert.equal(d.frames[1].text, "Die unterste Linie ist das E (e').");
  assert.equal(d.frames[2].text, "Von E abwärts: E – D – C.");
  // große Oktave: der Name steht nur einmal im Satz (Welle 12, Schritt 7)
  assert.equal(zaehlDemo(N("G", 2), N("E", 2), "bass").frames[1].text, "Die unterste Linie ist das große G.");
  // mehr als zwei Stellen: zwei Zähl-Bilder, zusammen der ganze Weg (Mitte doppelt), höchstens 5 Bilder
  const lang = zaehlDemo(N("G", 4), N("D", 5), "treble");
  assert.equal(lang.frames.length, 5);
  assert.deepEqual([...toneKeys(lang.frames[2].tones), ...toneKeys(lang.frames[3].tones).slice(1)], toneKeys(weg(N("G", 4), N("D", 5))));
});

test("vorzeichenDemo: Rahmen erst um den Kopf, dann um das Zeichen; Klaviatur Stammton → Nachbartaste", () => {
  for (const no of [11, 13]) for (const it of lv(no).items) {
    const n = it.n, clef = it.clef, st = stammton(n), d = lv(no).demo({ note: n, clef });
    const [f0, f1, f2, res] = d.frames;
    assert.equal(f1.text, `Ohne das Vorzeichen ist das ein ${st.letter}.`);
    assert.equal(f2.text, n.acc > 0 ? `♯ erhöht um einen Halbton: Aus ${st.letter} wird ${gName(n)}.` : `♭ erniedrigt um einen Halbton: Aus ${st.letter} wird ${gName(n)}.`);
    // Töne: Stammton, dann die Note mit Vorzeichen
    assert.deepEqual(toneKeys(f1.tones), toneKeys([st]));
    assert.deepEqual(toneKeys(f2.tones), toneKeys([n]));
    // Klaviatur: Stammton markiert, im Schritt 2 die Taste einen Halbton daneben grün
    assert.ok(!f0.body.includes("pianoSvg") && !f0.body.includes("nl-keys"));
    assert.ok(f1.body.includes(`class="wkey mark" data-midi="${keyOf(st)}"`), gName(n));
    assert.ok(!f1.body.includes(" count"));
    assert.match(f2.body, new RegExp(`class="bkey count" data-midi="${keyOf(n)}"`));
    assert.equal(midi(n) - midi(st), n.acc);
    assert.equal(Math.abs(keyOf(n) - keyOf(st)), 1);
    // Rahmen: Bild 1 nur um den Kopf, Bild 2 auch um das Zeichen
    assert.equal((f1.body.match(/<rect class="nl-ring s2"/g) || []).length, 0);
    assert.equal((f2.body.match(/<rect class="nl-ring s2"/g) || []).length, 1);
    assert.deepEqual(res.result.chips.map((c) => c.text), [`Stammton ${st.letter}`, `${n.acc > 0 ? "♯" : "♭"} → ${gName(n)}`]);
    // Rahmen um das Zeichen liegt links vom Kopf und umschließt die Höhe der Note
    const box = accBox(n, clef), cy = 82 - staffPos(n, clef) * 6;
    assert.ok(box.x + box.w <= 170 - 7 && box.y < cy && box.y + box.h > cy);
  }
  // aus H wird B, aus E wird Es, aus A wird As
  assert.equal(vorzeichenDemo(N("H", 4, -1), "treble").frames[2].text, "♭ erniedrigt um einen Halbton: Aus H wird B.");
  assert.equal(vorzeichenDemo(N("E", 5, -1), "treble").frames[2].text, "♭ erniedrigt um einen Halbton: Aus E wird Es.");
  assert.equal(vorzeichenDemo(N("A", 3, -1), "bass").frames[2].text, "♭ erniedrigt um einen Halbton: Aus A wird As.");
});

test("Lerntafel-Beispiele gegen staffPos (PLAN Abschnitt 4)", () => {
  const lageOf = (n, clef) => { const l = lage(n, clef); return `${l.nr}. ${l.art === "linie" ? "Linie" : "Zwischenraum"}`; };
  assert.deepEqual(BEISPIELE.lage.treble.map((b) => [gName(b.n) + b.n.octave, lageOf(b.n, "treble"), b.label]), [["G4", "2. Linie", "2. Linie"], ["C5", "3. Zwischenraum", "3. Zwischenraum"]]);
  assert.deepEqual(BEISPIELE.lage.bass.map((b) => [gName(b.n) + b.n.octave, lageOf(b.n, "bass")]), [["F3", "4. Linie"], ["C3", "2. Zwischenraum"]]);
  for (const clef of ["treble", "bass"]) for (const b of BEISPIELE.lage[clef]) assert.equal(b.label, lageOf(b.n, clef));
  // Bezugston: vom Schlüsselton (g' 2. Linie, f 4. Linie), von der untersten, von der obersten Linie
  const z = (clef) => BEISPIELE.zaehlen[clef].map((b) => [staffPos(b.ref, clef), bezugArt(b.ref, clef), staffPos(b.n, clef)]);
  assert.deepEqual(z("treble"), [[2, "schluessel", 4], [0, "unterste", -2], [8, "oberste", 10]]);
  assert.deepEqual(z("bass"), [[6, "schluessel", 4], [0, "unterste", -2], [8, "oberste", 10]]);
  assert.deepEqual(BEISPIELE.zaehlen.treble.map((b) => gName(b.n)), ["H", "C", "A"]);
  assert.deepEqual(BEISPIELE.zaehlen.bass.map((b) => gName(b.n)), ["D", "E", "C"]);
  // Noten außerhalb der Zeile: der Bezugston der Tafel ist derselbe wie in den Stufen 4 und 9
  for (const clef of ["treble", "bass"]) for (const b of BEISPIELE.zaehlen[clef].slice(1)) assert.ok(same(bezug(b.n, clef).ref, b.ref));
  const sz = zaehlDemo(N("G", 4), N("H", 4), "treble");
  assert.equal(sz.frames[1].text, "Der Kringel des Schlüssels umschließt die G-Linie: das G (g').");
  assert.equal(zaehlDemo(N("F", 3), N("D", 3), "bass").frames[1].text, "Die zwei Punkte des Schlüssels umschließen die F-Linie: das F (f).");
  assert.equal(sz.frames[2].text, "Von G aufwärts: G – A – H.");
  // Vorzeichen: fis', b' bzw. fis, B, in der Zeile
  assert.deepEqual(BEISPIELE.vorzeichen.treble.map((b) => [displayName(b.n), staffPos(b.n, "treble")]), [["Fis (fis')", 1], ["B (b')", 4]]);
  assert.deepEqual(BEISPIELE.vorzeichen.bass.map((b) => [displayName(b.n), staffPos(b.n, "bass")]), [["Fis (fis)", 6], ["B (großes B)", 2]]);
  // jede Tafel-Vorführung ist gültig
  for (const id of ["lage", "zaehlen", "vorzeichen"]) for (const clef of ["treble", "bass"]) for (const b of BEISPIELE[id][clef]) {
    const d = id === "lage" ? lageDemo(b.n, clef) : id === "zaehlen" ? zaehlDemo(b.ref, b.n, clef) : vorzeichenDemo(b.n, clef);
    frameOk(d, b.n, SCHRITTE[id], `${id} ${clef} ${gName(b.n)}`);
  }
});

test("Lerntafeln: fünf je Schlüssel in der Reihenfolge des Plans, data-nl-board, eigener Spruch maskiert", () => {
  const b = boards((clef, state) => `<div class="m">${clef}</div>`);
  for (const clef of ["treble", "bass"]) assert.deepEqual(b.filter((c) => c.clef === clef).map((c) => c.title), TAFELN);
  assert.deepEqual(TAFELN, ["So liest du eine Note", "Merkhilfen", "So zählst du vom Bezugston", "Vorzeichen ♯ und ♭", "So liest du eine Note mit Vorzeichen"]);
  assert.ok(b.every((c) => c.clef === "treble" || c.clef === "bass"));
  const ids = { 0: "lage", 2: "zaehlen", 4: "vorzeichen" };
  for (const clef of ["treble", "bass"]) {
    const cards = b.filter((c) => c.clef === clef);
    cards.forEach((c, i) => {
      const html = c.render({ state: {} });
      if (ids[i]) {
        assert.ok(html.includes(`data-nl-board="${ids[i]}" data-clef="${clef}"`), c.title);
        assert.equal(typeof c.mount, "function");
        // Beispiel-Knöpfe: so viele wie Beispiele, der erste gewählt
        assert.equal((html.match(/data-ex="/g) || []).length, BEISPIELE[ids[i]][clef].length);
      } else assert.ok(!html.includes("data-nl-board") && !c.mount, c.title);
    });
    assert.equal(cards[1].render({ state: {} }), `<div class="m">${clef}</div>`);
  }
  // Tafel „So liest du eine Note“ mit dem gewählten Spruch (auch einem eigenen, maskiert)
  const state = { sprueche: { "violin-linien": { eigen: "Ein <Gans> Hält Dich Fest" } } };
  const html = boardHtml("lage", "treble", { state });
  assert.ok(!html.includes("<Gans"));
  // Bild 0 der Tafel zeigt den Spruch noch nicht; in Bild 2 steht er maskiert
  const d = lageDemo(N("G", 4), "treble", state);
  assert.ok(d.frames[2].body.includes("Ein <b") && !d.frames[2].body.includes("<Gans"));
  assert.equal(d.frames[2].body.match(/nl-wort s2">([^<]*)</)[1], "&lt;Gans&gt;");
});

test("Tafel „Vorzeichen ♯ und ♭“: Regel und Raster der 21 Namen (ohne · mit ♯ · mit ♭)", () => {
  assert.equal(NAMEN_RASTER.flat().length, 21);
  assert.deepEqual(NAMEN_RASTER, [["C", "Cis", "Ces"], ["D", "Dis", "Des"], ["E", "Eis", "Es"], ["F", "Fis", "Fes"], ["G", "Gis", "Ges"], ["A", "Ais", "As"], ["H", "His", "B"]]);
  const t = namenTabelle();
  assert.ok(t.includes("<th>ohne</th><th>mit ♯</th><th>mit ♭</th>"));
  const html = boards(() => "").find((c) => c.title === "Vorzeichen ♯ und ♭").render();
  for (const w of ["Es", "As", "B", "Fis", "His", "Ces"]) assert.ok(html.includes(w), w);
});

test("Vorführungen: Farben nur über Klassen, keine Farbwerte im HTML", () => {
  const all = [];
  for (const [no] of Object.entries(ART)) for (const it of lv(+no).items) all.push(...lv(+no).demo({ note: it.n, clef: it.clef }).frames.map((f) => f.body));
  for (const id of ["lage", "zaehlen", "vorzeichen"]) all.push(boardHtml(id, "treble"), boardHtml(id, "bass"));
  for (const h of all) assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(|style="/i.test(h));
  assert.ok(lageNums(N("D", 5), "treble").includes('data-nr="4"'));
});
