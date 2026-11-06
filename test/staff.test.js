import { test } from "node:test";
import assert from "node:assert/strict";
import { N, range, staffPos } from "../src/music.js";
import { noteSvg, noteheadSvg, staffSvg, pianoSvg, restSvg, glyphSvg, keySigSvg, KEYSIG_DY, ACC_DY, ACC_SIZE, HEAD, GLYPHS } from "../src/staff.js";

const count = (s, re) => (s.match(re) || []).length;

const S = 12, TOP = 34, BOTTOM = TOP + 4 * S, W = 320, H = 122, X0 = 18, X1 = 302, MID = TOP + 2 * S;
const attr = (svg, sel, name) => { const m = svg.match(new RegExp(`<${sel}[^>]*?\\s${name}="([^"]*)"`)); return m && m[1]; };

// Zeile ohne Noten: Linien wie in der ersten Fassung. Der Bassschlüssel steht seit der Messung gegen
// Verovio/Bravura 4,9 Einheiten höher (Grundlinie BOTTOM − 3,9 statt BOTTOM + 1), damit die Punkte
// über und unter der F-Linie liegen; der Violinschlüssel ist unverändert.
function expectedStaff(clef, inner, extraCls) {
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Notenzeile" class="${extraCls || ""}">`;
  for (let i = 0; i < 5; i++) s += `<line class="staff-line" x1="${X0}" x2="${X1}" y1="${TOP + i * S}" y2="${TOP + i * S}"/>`;
  s += clef === "treble"
    ? `<text class="clef" x="22" y="${BOTTOM}" font-size="${S * 4.2}">𝄞</text>`
    : `<text class="clef" x="24" y="${BOTTOM - 3.9}" font-size="${S * 4.2}">𝄢</text>`;
  return s + inner + "</svg>";
}

test("staffSvg: Linien und Schlüsselhöhe (gemessen gegen Verovio/Bravura)", () => {
  for (const clef of ["treble", "bass"]) {
    assert.equal(staffSvg(clef, "<g/>"), expectedStaff(clef, "<g/>"));
    assert.equal(staffSvg(clef, "", "ok"), expectedStaff(clef, "", "ok"));
    assert.equal(staffSvg(clef, "", { cls: "bad" }), expectedStaff(clef, "", "bad"));
  }
});

// Die Notenköpfe waren in der ersten Fassung 1,08 × 0,83 Linienabstände groß (zu flach); gemessen gegen
// Verovio 6.4.1 mit Bravura ist ein schwarzer Kopf 1,18 × 1,00 groß und um 31° gekippt.
test("noteSvg: Notenkopf, Hals und Vorzeichen nach Referenzmaßen", () => {
  const notes = [...range(N("A", 1), N("E", 6)), N("F", 4, 1), N("H", 4, -1), N("D", 5, -1), N("C", 4, 1), N("H", 3, -1), N("A", 5, -1), N("H", 5, 1), N("E", 2, -1), N("D", 4, 1)];
  for (const clef of ["treble", "bass"]) {
    for (const n of notes) {
      const p = staffPos(n, clef), cy = BOTTOM - p * (S / 2), svg = noteSvg(n, clef, 170);
      assert.ok(svg.includes(`<ellipse class="notehead" cx="170" cy="${cy}" rx="${HEAD.rx}" ry="${HEAD.ry}" transform="rotate(${HEAD.rot} 170 ${cy})"/>`));
      // Hals bündig mit der Außenkante des Kopfes, mindestens 3,5 Linienabstände lang, bei Noten
      // außerhalb der Zeile bis zur Mittellinie
      const up = p < 4, x1 = +attr(svg, 'line class="stem"', "x1"), y2 = +attr(svg, 'line class="stem"', "y2");
      assert.equal(x1, up ? 176.2 : 163.8);
      assert.equal(Math.abs(y2 - cy), Math.max(42, Math.abs(cy - MID)));
      if (Math.abs(cy - MID) > 42) assert.equal(y2, MID);
      for (const cls of [undefined, "", "ok", "bad", "ghost"]) assert.ok(noteSvg(n, clef, 170, cls).startsWith(`<g class="note ${cls || ""}">`));
      if (n.acc) {
        const sharp = n.acc > 0;
        // mit Hilfslinie 1,9 weiter links (Verovio hält das Vorzeichen von der Hilfslinie frei)
        const ax = Math.round(((sharp ? 148 : 149) - (p <= -2 || p >= 10 ? 1.9 : 0)) * 100) / 100;
        assert.ok(svg.includes(`<text class="acc" x="${ax}" y="${cy + (sharp ? ACC_DY.sharp : ACC_DY.flat)}">${sharp ? "♯" : "♭"}</text>`));
      }
    }
  }
  assert.equal(ACC_SIZE, 44);
});

// Ganze Note: Kopf 1,71 LA breit statt 1,19. Vorzeichen und Hilfslinien richten sich nach der Kopfbreite
// (Verovio 6.4.1/Bravura: Vorzeichen 0,25 LA vor dem Kopf, Hilfslinie 0,25–0,27 LA über den Kopf hinaus).
test("noteSvg: Vorzeichen und Hilfslinien der ganzen Note nach Kopfbreite", () => {
  const accX = (svg) => +attr(svg, 'text class="acc"', "x");
  const ledgerX = (svg) => [+attr(svg, 'line class="ledger"', "x1"), +attr(svg, 'line class="ledger"', "x2")];
  for (const [n, clef] of [[N("C", 4, 1), "treble"], [N("A", 5, -1), "treble"], [N("E", 2, -1), "bass"], [N("F", 4, 1), "treble"], [N("H", 4, -1), "treble"]]) {
    const q = noteSvg(n, clef, 170), w = noteSvg(n, clef, 170, "", { value: 1 }), h = noteSvg(n, clef, 170, "", { value: 2 });
    // halbe und Viertelnote unverändert, ganze Note 3,15 weiter links (halbe Kopfbreite 10,28 statt 7,13)
    assert.equal(accX(h), accX(q));
    assert.equal(accX(w), Math.round((accX(q) - 3.15) * 100) / 100);
    // Abstand rechte Kante des Vorzeichens (♯ 12,1, ♭ 11,0) zum Kopf (170 − 10,28) etwa 0,25 LA
    // Abstand rechte Kante des Vorzeichens zum Kopf: 0,25 LA, mit Hilfslinie etwa 0,4 LA
    const gap = (170 - 10.28) - (accX(w) + (n.acc > 0 ? 12.1 : 11.0)), led = w.includes('class="ledger"');
    assert.ok(led ? gap > 0.36 * S && gap < 0.44 * S : gap > 0.2 * S && gap < 0.3 * S, String(gap));
  }
  // Hilfslinie: ganze Note 13,4 zu jeder Seite (2,23 LA lang), schwarze und halbe Köpfe 11
  assert.deepEqual(ledgerX(noteSvg(N("C", 4), "treble", 170, "", { value: 1 })), [156.6, 183.4]);
  assert.deepEqual(ledgerX(noteSvg(N("A", 5), "treble", 170, "", { value: 1 })), [156.6, 183.4]);
  assert.deepEqual(ledgerX(noteSvg(N("E", 2), "bass", 170, "", { value: 1 })), [156.6, 183.4]);
  for (const value of [2, 4, 8, 16]) assert.deepEqual(ledgerX(noteSvg(N("C", 4), "treble", 170, "", { value })), [159, 181]);
  assert.equal(count(noteSvg(N("C", 6), "treble", 170, "", { value: 1 }), /x1="156.6" x2="183.4"/g), 2);
});

// Mit Hilfslinie (durch den Kopf oder direkt daneben) steht das Vorzeichen 0,38–0,40 LA vor dem Kopf und
// berührt die Hilfslinie nicht (Verovio 6.4.1, Bravura und Leipzig); ohne Hilfslinie unverändert.
test("noteSvg: Vorzeichen bei Hilfslinien frei von der Hilfslinie", () => {
  const accX = (svg) => +attr(svg, 'text class="acc"', "x");
  const right = { 1: 12.1, [-1]: 11.0 };
  for (const value of [1, 2, 4, 8]) {
    const half = value === 1 ? 10.28 : 7.13;
    for (const [n, clef] of [[N("C", 4, 1), "treble"], [N("H", 3, -1), "treble"], [N("A", 3, 1), "treble"], [N("A", 5, -1), "treble"], [N("H", 5, -1), "treble"], [N("D", 6, 1), "treble"], [N("E", 2, -1), "bass"], [N("D", 2, 1), "bass"], [N("D", 4, 1), "bass"]]) {
      const svg = noteSvg(n, clef, 170, "", { value }), x2 = right[n.acc] + accX(svg);
      const ledgerX1 = Math.min(...[...svg.matchAll(/class="ledger" x1="([\d.]+)"/g)].map((m) => +m[1]));
      const gap = 170 - half - x2;
      assert.ok(gap > 0.36 * S && gap < 0.44 * S, `${value} ${n.letter}${n.octave} ${gap}`);
      assert.ok(ledgerX1 - x2 > 0.05 * S, `${value} ${n.letter}${n.octave} Hilfslinie`);
    }
  }
  // ohne Hilfslinie byte-gleich wie vorher
  assert.equal(accX(noteSvg(N("G", 5, 1), "treble", 170)), 148);
  assert.equal(accX(noteSvg(N("D", 4, 1), "treble", 170)), 148);
  assert.equal(accX(noteSvg(N("F", 2, 1), "bass", 170)), 148);
  assert.equal(accX(noteSvg(N("H", 3, -1), "bass", 170)), 149);
  assert.equal(accX(noteSvg(N("C", 4, 1), "treble", 170)), 146.1);
});

test("staffSvg: fünf Linien und Schlüssel", () => {
  const t = staffSvg("treble", "");
  assert.equal(count(t, /class="staff-line"/g), 5);
  assert.ok(t.includes("𝄞"));
  const b = staffSvg("bass", "");
  assert.equal(count(b, /class="staff-line"/g), 5);
  assert.ok(b.includes("𝄢"));
  assert.equal(GLYPHS.treble, "𝄞");
  assert.equal(GLYPHS.bass, "𝄢");
});

test("staffSvg: Höhe und Vorzeichen", () => {
  assert.ok(staffSvg("treble", "", { height: 160 }).startsWith('<svg viewBox="0 0 320 160"'));
  assert.ok(staffSvg("treble", "", { height: 80 }).startsWith('<svg viewBox="0 0 320 122"'));
  assert.equal(count(staffSvg("treble", "", { keySig: 3 }), /class="keysig"[^>]*>♯/g), 3);
  assert.equal(count(staffSvg("bass", "", { keySig: -7 }), /class="keysig"[^>]*>♭/g), 7);
  assert.equal(keySigSvg("treble", 0), "");
  assert.equal(keySigSvg("treble", undefined), "");
  // Fis steht im Violinschlüssel auf der obersten Linie (y = 34), im Bassschlüssel auf der vierten (y = 46);
  // die Grundlinie des ♯ liegt KEYSIG_DY.sharp (6) tiefer, damit die Glyphenmitte auf der Linie sitzt
  assert.ok(keySigSvg("treble", 1).includes('y="40"'));
  assert.ok(keySigSvg("bass", 1).includes('y="52"'));
  // B steht im Violinschlüssel auf der Mittellinie (y = 58); Bauch und Loch des ♭ sitzen dort (Grundlinie 63,5)
  assert.ok(keySigSvg("treble", -1).includes('y="63.5"'));
  // Bass-Vorzeichen beginnen weiter rechts als im Violinschlüssel (Abstand zu den Punkten des Schlüssels)
  assert.ok(xs(keySigSvg("bass", 1))[0] > xs(keySigSvg("treble", 1))[0]);
});

// Erwartete Lage aller Vorzeichen, aus den Notennamen abgeleitet (Standardnotation):
// Violinschlüssel ♯ f'' c'' g'' d'' a' e'' h', ♭ h' e'' a' d'' g' c'' f';
// Bassschlüssel dasselbe Muster zwei Oktaven tiefer (f c g d A e H bzw. H e A d G c F).
const KEYSIG_NOTES = {
  treble: {
    sharps: [N("F", 5), N("C", 5), N("G", 5), N("D", 5), N("A", 4), N("E", 5), N("H", 4)],
    flats: [N("H", 4), N("E", 5), N("A", 4), N("D", 5), N("G", 4), N("C", 5), N("F", 4)],
  },
  bass: {
    sharps: [N("F", 3), N("C", 3), N("G", 3), N("D", 3), N("A", 2), N("E", 3), N("H", 2)],
    flats: [N("H", 2), N("E", 3), N("A", 2), N("D", 3), N("G", 2), N("C", 3), N("F", 2)],
  },
};
const ys = (svg) => [...svg.matchAll(/y="([-\d.]+)"/g)].map((m) => +m[1]);
const xs = (svg) => [...svg.matchAll(/x="([-\d.]+)"/g)].map((m) => +m[1]);

test("keySigSvg: Reihenfolge und Lage aller Vorzeichen in beiden Schlüsseln", () => {
  for (const clef of ["treble", "bass"]) {
    for (const [kind, sign, count] of [["sharps", "♯", 7], ["flats", "♭", -7]]) {
      const svg = keySigSvg(clef, count);
      const dy = count > 0 ? KEYSIG_DY.sharp : KEYSIG_DY.flat;
      const expected = KEYSIG_NOTES[clef][kind].map((n) => BOTTOM - staffPos(n, clef) * (S / 2) + dy);
      assert.deepEqual(ys(svg), expected, `${clef} ${kind}`);
      assert.equal(svg.match(/[♯♭]/g).join(""), sign.repeat(7));
      // von links nach rechts in gleichmäßigem Abstand hinter dem Schlüssel
      const x = xs(svg);
      assert.ok(x[0] > 40 && x[0] < 80);
      for (let i = 1; i < x.length; i++) assert.ok(x[i] > x[i - 1]);
      // weniger Vorzeichen = Anfang derselben Reihe
      assert.deepEqual(ys(keySigSvg(clef, count > 0 ? 3 : -3)), expected.slice(0, 3));
    }
  }
  // das Fes im Bassschlüssel liegt unter der untersten Linie
  assert.equal(staffPos(N("F", 2), "bass"), -1);
  assert.equal(ys(keySigSvg("bass", -7))[6], BOTTOM + 6 + KEYSIG_DY.flat);
});

test("noteSvg: Hilfslinien, Hals, Vorzeichen", () => {
  assert.equal(count(noteSvg(N("C", 4), "treble", 170), /class="ledger"/g), 1);
  assert.equal(count(noteSvg(N("E", 4), "treble", 170), /class="ledger"/g), 0);
  assert.equal(count(noteSvg(N("A", 5), "treble", 170), /class="ledger"/g), 1);
  assert.equal(count(noteSvg(N("C", 6), "treble", 170), /class="ledger"/g), 2);
  // Hals nach oben (rechts vom Kopf) bei Position < 4, sonst nach unten (links)
  assert.ok(noteSvg(N("G", 4), "treble", 170).includes('class="stem" x1="176.2"'));
  assert.ok(noteSvg(N("H", 4), "treble", 170).includes('class="stem" x1="163.8"'));
  assert.ok(noteSvg(N("F", 4, 1), "treble", 170).includes(">♯<"));
  assert.ok(noteSvg(N("H", 4, -1), "treble", 170).includes(">♭<"));
});

test("noteSvg: Notenwerte und ohne Hals", () => {
  const n = N("G", 4);
  const whole = noteSvg(n, "treble", 170, "", { value: 1 });
  assert.equal(count(whole, /class="stem"/g), 0);
  assert.ok(whole.includes('class="notehead open"'));
  // hohle Köpfe: Fläche mit Loch (zwei Teilpfade)
  assert.equal(count(attr(whole, 'path class="notehead open"', "d"), /M/g), 2);
  const half = noteSvg(n, "treble", 170, "", { value: 2 });
  assert.equal(count(half, /class="stem"/g), 1);
  assert.ok(half.includes('class="notehead open"'));
  assert.equal(noteSvg(n, "treble", 170, "", { value: 4 }), noteSvg(n, "treble", 170));
  const bare = noteSvg(n, "treble", 170, "", { value: 8, stemless: true });
  assert.equal(count(bare, /class="stem"|class="flag"/g), 0);
});

test("noteSvg: Fähnchen als Glyphe rechts vom Hals, bei Hals nach unten gespiegelt", () => {
  assert.equal(GLYPHS.flags[8], "\u{1D16E}");
  assert.equal(GLYPHS.flags[16], "\u{1D16F}");
  for (const [n, up] of [[N("G", 4), true], [N("E", 4), true], [N("D", 5), false], [N("F", 5), false]]) {
    for (const v of [8, 16]) {
      const svg = noteSvg(n, "treble", 170, "", { value: v });
      assert.equal(count(svg, /class="flag"/g), 1, "ein Zeichen, bei Sechzehnteln mit zwei Fähnchen");
      assert.ok(svg.includes(`>${GLYPHS.flags[v]}</text>`));
      const sx = +attr(svg, 'line class="stem"', "x1"), y2 = +attr(svg, 'line class="stem"', "y2");
      if (up) {
        // linke Kante der Glyphe auf der linken Halskante, Oberkante (1009/1000 em bei 48px) am Halsende
        assert.equal(+attr(svg, 'text class="flag"', "x"), Math.round((sx - 0.9) * 100) / 100);
        assert.equal(+attr(svg, 'text class="flag"', "y"), Math.round((y2 + 48.43) * 100) / 100);
        assert.ok(!svg.includes("scale(1 -1)"));
      } else {
        assert.ok(svg.includes(`transform="translate(${Math.round((sx - 0.9) * 100) / 100} ${y2}) scale(1 -1)"`));
      }
      assert.equal(attr(svg, 'text class="flag"', "font-size"), "48");
    }
  }
  // mit Fähnchen reicht der Hals einer Note außerhalb der Zeile einen halben Linienabstand über die Mittellinie
  const low = noteSvg(N("A", 3), "treble", 170, "", { value: 8 });
  assert.equal(+attr(low, 'line class="stem"', "y2"), MID - 6);
  assert.equal(+attr(noteSvg(N("A", 3), "treble", 170), 'line class="stem"', "y2"), MID);
});

test("restSvg: Lage der Pausen (gemessen gegen Verovio/Bravura)", () => {
  for (const v of [4, 8, 16]) {
    const r = restSvg(v, 100);
    assert.ok(r.includes('class="rest"'));
    assert.ok(r.includes(GLYPHS.rests[v]));
  }
  // Grundlinie so, dass die Glyphenmitte bei 2,0 / 2,13 / 2,625 Linienabständen unter der obersten Linie liegt
  const y = (v) => +attr(restSvg(v, 100), 'text class="rest"', "y");
  assert.equal(y(4), Math.round((TOP + 2 * S + 500.5 * 0.048) * 10) / 10);
  assert.equal(y(8), Math.round((TOP + 2.13 * S + 499.5 * 0.048) * 10) / 10);
  assert.equal(y(16), Math.round((TOP + 2.625 * S + 499.5 * 0.048) * 10) / 10);
  // ganze Pause hängt an der vierten Linie, halbe sitzt auf der Mittellinie
  const whole = restSvg(1, 100), half = restSvg(2, 100);
  assert.ok(whole.startsWith('<rect class="rest"') && half.startsWith('<rect class="rest"'));
  assert.equal(+attr(whole, "rect", "y"), TOP + S - 0.5);
  assert.equal(+attr(half, "rect", "y") + +attr(half, "rect", "height"), MID);
  assert.equal(+attr(whole, "rect", "width"), 14);
  // unbekannter Wert → Viertelpause
  assert.equal(restSvg(3, 100), restSvg(4, 100));
});

test("glyphSvg und Glyphentabelle", () => {
  assert.equal(GLYPHS.rests[1], "\u{1D13B}");
  assert.equal(GLYPHS.notes[16], "\u{1D161}");
  assert.equal(glyphSvg("𝄞", 10, 20, 30), '<text class="glyph" x="10" y="20" font-size="30">𝄞</text>');
});

test("pianoSvg: 13 Tasten, Fis = 6 genau einmal", () => {
  const p = pianoSvg();
  assert.equal(count(p, /<rect/g), 13);
  assert.equal(count(p, /data-semi="6"/g), 1);
  assert.equal(count(p, /data-semi="0"/g), 2);
});

test("noteheadSvg: derselbe Kopf wie in noteSvg, für jeden Notenwert", () => {
  const cy = BOTTOM - staffPos(N("G", 4), "treble") * (S / 2);
  assert.equal(noteheadSvg(170, cy), `<ellipse class="notehead" cx="170" cy="${cy}" rx="${HEAD.rx}" ry="${HEAD.ry}" transform="rotate(${HEAD.rot} 170 ${cy})"/>`);
  for (const value of [1, 2, 4, 8, 16]) {
    const head = noteheadSvg(170, cy, value);
    assert.ok(noteSvg(N("G", 4), "treble", 170, "", { value }).includes(head), String(value));
    assert.equal(head.includes("open"), value <= 2, String(value));
  }
});
