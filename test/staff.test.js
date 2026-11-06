import { test } from "node:test";
import assert from "node:assert/strict";
import { N, range, staffPos } from "../src/music.js";
import { noteSvg, staffSvg, pianoSvg, restSvg, glyphSvg, keySigSvg, KEYSIG_DY, GLYPHS } from "../src/staff.js";

const count = (s, re) => (s.match(re) || []).length;

// Erste Fassung aus index.html als Vergleich: die Standardausgabe muss gleich bleiben
const S = 12, TOP = 34, BOTTOM = TOP + 4 * S, W = 320, H = 122, X0 = 18, X1 = 302;
function oldNoteSvg(n, clef, x, cls) {
  const p = staffPos(n, clef), cy = BOTTOM - p * (S / 2);
  let s = `<g class="note ${cls || ""}">`;
  for (let q = -2; q >= p; q -= 2) s += `<line class="ledger" x1="${x - 11}" x2="${x + 11}" y1="${BOTTOM - q * (S / 2)}" y2="${BOTTOM - q * (S / 2)}"/>`;
  for (let q = 10; q <= p; q += 2) s += `<line class="ledger" x1="${x - 11}" x2="${x + 11}" y1="${BOTTOM - q * (S / 2)}" y2="${BOTTOM - q * (S / 2)}"/>`;
  if (n.acc) s += `<text class="acc" x="${x - 22}" y="${cy + 7}">${n.acc > 0 ? "♯" : "♭"}</text>`;
  const up = p < 4;
  s += up ? `<line class="stem" x1="${x + 6}" x2="${x + 6}" y1="${cy - 1}" y2="${cy - 40}"/>` : `<line class="stem" x1="${x - 6}" x2="${x - 6}" y1="${cy + 1}" y2="${cy + 40}"/>`;
  s += `<ellipse class="notehead" cx="${x}" cy="${cy}" rx="6.8" ry="4.6" transform="rotate(-22 ${x} ${cy})"/>`;
  return s + "</g>";
}
function oldStaffSvg(clef, inner, extraCls) {
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Notenzeile" class="${extraCls || ""}">`;
  for (let i = 0; i < 5; i++) s += `<line class="staff-line" x1="${X0}" x2="${X1}" y1="${TOP + i * S}" y2="${TOP + i * S}"/>`;
  s += clef === "treble"
    ? `<text class="clef" x="22" y="${BOTTOM - S}" font-size="${S * 4.2}">𝄞</text>`
    : `<text class="clef" x="24" y="${BOTTOM + 1}" font-size="${S * 4.2}">𝄢</text>`;
  return s + inner + "</svg>";
}

test("Standardausgabe gleicht der ersten Fassung", () => {
  const notes = [...range(N("A", 1), N("E", 6)), N("F", 4, 1), N("H", 4, -1), N("D", 5, -1)];
  for (const clef of ["treble", "bass"]) {
    for (const n of notes) {
      for (const cls of [undefined, "", "ok", "bad", "ghost"]) {
        assert.equal(noteSvg(n, clef, 170, cls), oldNoteSvg(n, clef, 170, cls));
      }
    }
    assert.equal(staffSvg(clef, "<g/>"), oldStaffSvg(clef, "<g/>"));
    assert.equal(staffSvg(clef, "", "ok"), oldStaffSvg(clef, "", "ok"));
    assert.equal(staffSvg(clef, "", { cls: "bad" }), oldStaffSvg(clef, "", "bad"));
  }
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
  // die Grundlinie des ♯ liegt KEYSIG_DY.sharp (3,5) tiefer, damit die Glyphenmitte auf der Linie sitzt
  assert.ok(keySigSvg("treble", 1).includes('y="37.5"'));
  assert.ok(keySigSvg("bass", 1).includes('y="49.5"'));
  // B steht im Violinschlüssel auf der Mittellinie (y = 58); der Bauch des ♭ sitzt dort (Grundlinie 60,5)
  assert.ok(keySigSvg("treble", -1).includes('y="60.5"'));
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
  assert.ok(noteSvg(N("G", 4), "treble", 170).includes('class="stem" x1="176"'));
  assert.ok(noteSvg(N("H", 4), "treble", 170).includes('class="stem" x1="164"'));
  assert.ok(noteSvg(N("F", 4, 1), "treble", 170).includes(">♯<"));
  assert.ok(noteSvg(N("H", 4, -1), "treble", 170).includes(">♭<"));
});

test("noteSvg: Notenwerte und ohne Hals", () => {
  const n = N("G", 4);
  const whole = noteSvg(n, "treble", 170, "", { value: 1 });
  assert.equal(count(whole, /class="stem"/g), 0);
  assert.ok(whole.includes('class="notehead open"'));
  const half = noteSvg(n, "treble", 170, "", { value: 2 });
  assert.equal(count(half, /class="stem"/g), 1);
  assert.ok(half.includes('class="notehead open"'));
  assert.equal(noteSvg(n, "treble", 170, "", { value: 4 }), noteSvg(n, "treble", 170));
  assert.equal(count(noteSvg(n, "treble", 170, "", { value: 8 }), /class="flag"/g), 1);
  assert.equal(count(noteSvg(N("D", 5), "treble", 170, "", { value: 16 }), /class="flag"/g), 2);
  const bare = noteSvg(n, "treble", 170, "", { value: 8, stemless: true });
  assert.equal(count(bare, /class="stem"|class="flag"/g), 0);
});

test("restSvg und glyphSvg", () => {
  for (const v of [1, 2, 4, 8, 16]) {
    const r = restSvg(v, 100);
    assert.ok(r.includes('class="rest"'));
    assert.ok(r.includes(GLYPHS.rests[v]));
  }
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
