import { test } from "node:test";
import assert from "node:assert/strict";
import akkorde, {
  accClash, accTouchesLedger, placeAccidentals, keyAcc, chordSvg, placeLow, triadLabel, CIRCLE_ITEMS, neighbour, keyBySig,
  sigLabel, DEGREE_ITEMS, DEGREE_TYPES, circleRing,
} from "../../src/packs/akkorde.js";
import { PACKS } from "../../src/packs/index.js";
import { N, helm, gName, staffPos, triadTypeOf, inversionOf, triadRoot, MAJOR_KEYS, ROMAN, INVERSIONS } from "../../src/music.js";
import { staffSvg } from "../../src/staff.js";

const names = (ns) => ns.map(helm).join("-");
const L = Object.fromEntries(akkorde.levels.map((l) => [l.no, l]));
// Aufgabe einer Stufe mit passender Bedingung suchen (Zufall)
function find(level, pred, tries = 5000) {
  for (let i = 0; i < tries; i++) { const q = level.question(null); if (pred(q)) return q; }
  throw new Error("nicht gefunden");
}

test("Paket in der Registry, sechs Stufen mit eindeutigen IDs", () => {
  assert.ok(PACKS.includes(akkorde));
  assert.equal(akkorde.id, "akkorde");
  assert.equal(akkorde.levels.length, 6);
  const ids = akkorde.levels.map((l) => l.id);
  assert.deepEqual(ids, ["akkorde-1", "akkorde-2", "akkorde-3", "akkorde-4", "akkorde-5", "akkorde-6"]);
  assert.equal(new Set(ids).size, 6);
  akkorde.levels.forEach((l, i) => {
    assert.equal(l.no, i + 1);
    assert.ok(l.title && l.hint && l.subtitle);
    assert.ok(l.example.startsWith("<svg"));
    assert.ok(["letters", "choices"].includes(l.input));
  });
});

test("question liefert gültige Aufgaben, check erkennt richtig und falsch", () => {
  for (const l of akkorde.levels) {
    for (let i = 0; i < 200; i++) {
      const q = l.question(null);
      assert.ok(q.svg.startsWith("<svg"), l.id);
      assert.ok(q.display && q.answer !== undefined, l.id);
      assert.ok(l.check(q, q.answer), l.id);
      if (l.input === "choices") {
        assert.ok(q.choices.includes(q.answer), l.id);
        assert.equal(new Set(q.choices).size, q.choices.length, l.id);
        const wrong = q.choices.find((c) => c !== q.answer);
        assert.ok(!l.check(q, wrong), l.id);
      } else {
        assert.ok(!l.check(q, { letter: "X", acc: 0 }));
        assert.ok(!l.check(q, { letter: q.answer.letter, acc: q.answer.acc === 0 ? 1 : 0 }));
      }
    }
  }
});

test("mindestens 8 verschiedene Aufgaben je Stufe, nie zweimal dieselbe hintereinander", () => {
  for (const l of akkorde.levels) {
    const seen = new Set();
    let prev = l.question(null);
    for (let i = 0; i < 400; i++) {
      const q = l.question(prev);
      assert.notEqual(q.key, prev.key, l.id);
      seen.add(q.key); prev = q;
    }
    assert.ok(seen.size >= 8, `${l.id}: ${seen.size}`);
    assert.ok(l.items.length >= 8, l.id);
  }
});

test("Anzahl der Antwortknöpfe je Stufe", () => {
  // Stufe 1 laut PLAN mit zwei Optionen, Stufe 4 mit den drei Lagen, Stufe 6 mit allen sieben Stufen
  const counts = { 1: 2, 2: 4, 4: 3, 5: 4, 6: 7 };
  for (const [no, n] of Object.entries(counts)) assert.equal(L[no].question(null).choices.length, n, "Stufe " + no);
  assert.deepEqual(L[1].question(null).choices, ["Dur", "Moll"]);
  assert.deepEqual(L[2].question(null).choices, ["Dur", "Moll", "vermindert", "übermäßig"]);
  assert.deepEqual(L[4].question(null).choices, INVERSIONS);
  assert.deepEqual(L[6].question(null).choices, ROMAN);
});

test("Dreiklänge erklingen gleichzeitig", () => {
  for (const no of [1, 2, 3, 4, 6]) {
    const q = L[no].question(null);
    assert.equal(q.play.length, 3);
    assert.equal(q.playTogether, true);
  }
});

test("Stufe 1 und 2: Typ passt zu den Tönen", () => {
  for (const no of [1, 2]) for (const it of L[no].items) {
    assert.equal(triadTypeOf(it.notes), it.type);
    assert.equal(inversionOf(it.notes), 0);
    assert.ok(it.notes.every((n) => Math.abs(n.acc) <= 1));
  }
  assert.ok(L[1].items.some((it) => it.clef === "bass") && L[1].items.some((it) => it.clef === "treble"));
  assert.ok(L[2].items.some((it) => it.type === "uebermaessig") && L[2].items.some((it) => it.type === "vermindert"));
  const q = find(L[2], (q) => q.display === "verminderter Dreiklang auf h" && q.clef === "treble");
  assert.equal(q.answer, "vermindert");
  assert.equal(names(q.play), "h'-d''-f''");
  assert.equal(names(find(L[2], (q) => q.display === "verminderter Dreiklang auf h" && q.clef === "bass").play), "H-d-f");
  const c = find(L[2], (q) => q.display === "übermäßiger Dreiklang auf c" && q.clef === "treble");
  assert.equal(names(c.play), "c'-e'-gis'");
  const a = find(L[1], (q) => q.display === "a-Moll-Dreiklang" && q.clef === "treble");
  assert.equal(names(a.play), "a'-c''-e''");
  assert.equal(a.answer, "Moll");
  const cd = find(L[1], (q) => q.display === "C-Dur-Dreiklang" && q.clef === "bass");
  assert.equal(names(cd.play), "c-e-g");
  assert.equal(cd.answer, "Dur");
});

test("triadLabel", () => {
  assert.equal(triadLabel(N("C", 4), "dur"), "C-Dur-Dreiklang");
  assert.equal(triadLabel(N("A", 4), "moll"), "a-Moll-Dreiklang");
  assert.equal(triadLabel(N("H", 4), "vermindert"), "verminderter Dreiklang auf h");
  assert.equal(triadLabel(N("E", 4, -1), "uebermaessig"), "übermäßiger Dreiklang auf es");
});

test("Stufe 3: Grundton mit Vorzeichen, Klaviatur nach Tonklasse", () => {
  const l = L[3];
  assert.equal(l.input, "letters");
  assert.equal(l.acc, true);
  for (const it of l.items) assert.equal(triadRoot(it.notes), it.root);
  const q = find(l, (q) => q.note.letter === "E" && q.note.acc === -1);
  assert.deepEqual(q.answer, { letter: "E", acc: -1 });
  assert.ok(l.check(q, { letter: "E", acc: -1 }));
  assert.ok(!l.check(q, { letter: "E", acc: 0 }));
  assert.ok(l.check(q, 3)); // Es = Dis auf der Klaviatur
  assert.ok(l.check(q, 15));
  assert.ok(!l.check(q, 4));
  assert.ok(q.display.endsWith("mit Grundton Es"));
});

test("Stufe 4: Umkehrungen in enger Lage", () => {
  const l = L[4];
  for (const it of l.items) {
    assert.equal(inversionOf(it.notes), it.inv);
    const ps = it.notes.map((n) => staffPos(n, it.clef));
    assert.ok(ps[0] < ps[1] && ps[1] < ps[2]);
    assert.ok(ps[2] - ps[0] <= 5, "innerhalb einer Sexte");
  }
  const s = find(l, (q) => q.display === "Sextakkord von C-Dur" && q.clef === "bass");
  assert.equal(names(s.play), "E-G-c");
  assert.equal(s.answer, "Sextakkord");
  const qs = find(l, (q) => q.display === "Quartsextakkord von C-Dur" && q.clef === "bass");
  assert.equal(names(qs.play), "G-c-e");
  const t = find(l, (q) => q.display === "Sextakkord von C-Dur" && q.clef === "treble");
  assert.equal(names(t.play), "e'-g'-c''");
  const g = find(l, (q) => q.display === "Quartsextakkord von C-Dur" && q.clef === "treble");
  assert.equal(names(g.play), "g'-c''-e''");
  const gs = find(l, (q) => q.display === "a-Moll-Dreiklang in Grundstellung" && q.clef === "treble");
  assert.equal(gs.answer, "Grundstellung");
});

test("Stufe 5: Quintenzirkel, Nachbarn und Vorzeichen", () => {
  const nb = (name, dir) => neighbour(MAJOR_KEYS.find((k) => k.name === name), dir).name;
  assert.equal(nb("C-Dur", "up"), "G-Dur");
  assert.equal(nb("C-Dur", "down"), "F-Dur");
  assert.equal(nb("H-Dur", "up"), "Fis-Dur");
  assert.equal(nb("Fis-Dur", "up"), "Cis-Dur");
  assert.equal(nb("F-Dur", "down"), "B-Dur");
  assert.equal(nb("Des-Dur", "down"), "Ges-Dur");
  assert.equal(nb("Ges-Dur", "up"), "Des-Dur");
  assert.equal(nb("Es-Dur", "up"), "B-Dur");
  assert.equal(neighbour(keyBySig(7), "up"), null); // Gis-Dur: 8 ♯
  assert.equal(neighbour(keyBySig(-7), "down"), null); // Fes-Dur: 8 ♭
  for (const k of MAJOR_KEYS) {
    if (k.sig < 7) assert.equal(neighbour(k, "up").sig, k.sig + 1);
    if (k.sig > -7) assert.equal(neighbour(k, "down").sig, k.sig - 1);
  }
  assert.equal(CIRCLE_ITEMS.length, 14 + 14 + 15);
  assert.equal(sigLabel(3), "3 ♯");
  assert.equal(sigLabel(-4), "4 ♭");
  assert.equal(sigLabel(0), "keine Vorzeichen");
  const l = L[5];
  for (let i = 0; i < 500; i++) {
    const q = l.question(null);
    assert.equal(q.choices.length, 4);
    // keine enharmonisch gleiche Tonart als Ablenker (Fis/Ges, Cis/Des, H/Ces)
    const enh = { "Fis-Dur": "Ges-Dur", "Ges-Dur": "Fis-Dur", "Cis-Dur": "Des-Dur", "Des-Dur": "Cis-Dur", "H-Dur": "Ces-Dur", "Ces-Dur": "H-Dur" };
    if (enh[q.answer]) assert.ok(!q.choices.includes(enh[q.answer]), q.prompt);
    const enhPairs = q.choices.filter((c) => enh[c] && q.choices.includes(enh[c]));
    // die gefragte Tonart (auch enharmonisch) steht nicht unter den Knöpfen
    const asked = q.prompt.split(":")[0];
    if (q.prompt.includes("Quinte")) assert.ok(!q.choices.includes(asked) && !q.choices.includes(enh[asked]), q.prompt + " " + q.choices);
    assert.equal(enhPairs.length, 0, q.choices.join());
  }
  const es = find(l, (q) => q.prompt === "Wie viele Vorzeichen hat Es-Dur?");
  assert.equal(es.answer, "3 ♭");
  const up = find(l, (q) => q.prompt === "H-Dur: Welche Dur-Tonart liegt im Quintenzirkel eine Quinte höher?");
  assert.equal(up.answer, "Fis-Dur");
  assert.ok(up.svg.includes('class="keysig"'));
});

test("Stufe 6: Stufenakkorde in Dur", () => {
  const l = L[6];
  for (const it of DEGREE_ITEMS) {
    assert.equal(triadTypeOf(it.notes), DEGREE_TYPES[it.deg - 1]);
    assert.equal(it.type, DEGREE_TYPES[it.deg - 1]);
    // leitereigen: jeder Ton entspricht der Vorzeichnung, es wird kein Vorzeichen vor die Noten gesetzt
    for (const n of it.notes) assert.equal(n.acc, keyAcc(n.letter, it.k.sig), it.key);
    assert.ok(!chordSvg(it.notes, it.clef, 170, { keySig: it.k.sig }).includes('class="acc"'));
  }
  assert.deepEqual(DEGREE_TYPES, ["dur", "moll", "moll", "dur", "dur", "moll", "vermindert"]);
  const vi = find(l, (q) => q.prompt === "Welche Stufe in G-Dur?" && q.answer === "VI" && q.clef === "treble");
  assert.equal(names(vi.play), "e'-g'-h'");
  assert.equal(vi.display, "e-Moll-Dreiklang, Stufe VI");
  const vii = find(l, (q) => q.prompt === "Welche Stufe in G-Dur?" && q.answer === "VII" && q.clef === "treble");
  assert.equal(names(vii.play), "fis'-a'-c''");
  assert.equal(vii.display, "verminderter Dreiklang auf fis, Stufe VII");
  assert.ok(vii.svg.includes('class="keysig"'));
  assert.ok(l.check(vii, "VII") && !l.check(vii, "V"));
  const iv = find(l, (q) => q.prompt === "Welche Stufe in Es-Dur?" && q.answer === "IV");
  assert.deepEqual(iv.play.map(gName), ["As", "C", "Es"]);
});

test("keyAcc: Vorzeichnung je Buchstabe", () => {
  assert.equal(keyAcc("F", 1), 1);
  assert.equal(keyAcc("C", 1), 0);
  assert.equal(keyAcc("H", -1), -1);
  assert.equal(keyAcc("E", -2), -1);
  assert.equal(keyAcc("A", -2), 0);
  assert.equal(keyAcc("H", 7), 1);
  assert.equal(keyAcc("F", -7), -1);
  assert.equal(keyAcc("C", 0), 0);
});

test("placeLow: tiefster Ton zwischen Hilfslinie unten und Mittellinie", () => {
  assert.deepEqual(placeLow("C", 0, "treble"), N("C", 4));
  assert.deepEqual(placeLow("H", -1, "treble"), N("H", 4, -1));
  assert.deepEqual(placeLow("E", 0, "bass"), N("E", 2));
  assert.deepEqual(placeLow("D", 0, "bass"), N("D", 3));
});

/* Notensatz des Akkords */
const accXs = (svg) => [...svg.matchAll(/<text class="acc" x="([-\d.]+)" y="([-\d.]+)">(.)<\/text>/g)].map((m) => ({ x: +m[1], y: +m[2], ch: m[3] }));

test("chordSvg: ganze Noten, eine Reihe Hilfslinien", () => {
  const svg = chordSvg([N("C", 4), N("E", 4), N("G", 4)], "treble", 170);
  assert.equal((svg.match(/class="notehead open"/g) || []).length, 3);
  assert.equal((svg.match(/class="ledger"/g) || []).length, 1);
  assert.ok(!svg.includes('class="stem"'));
  // a'' c''' e''' über der Zeile: drei Hilfslinien, jede nur einmal
  const hi = chordSvg([N("A", 5), N("C", 6, 1), N("E", 6)], "treble", 170);
  assert.equal((hi.match(/class="ledger"/g) || []).length, 3);
  // Hilfslinie breiter als der ganze Kopf (1,71 LA): 1,12 LA je Seite
  assert.ok(svg.includes('x1="156.56" x2="183.44"'));
});

test("accClash: Abstände nach Verovio", () => {
  assert.deepEqual(accClash("sharp", "sharp", 2), { full: 0.16 });
  assert.equal(accClash("sharp", "sharp", 6), null);
  assert.deepEqual(accClash("flat", "flat", 4), { part: 0.41 });
  assert.equal(accClash("flat", "flat", 6), null);
  assert.equal(accClash("flat", "sharp", 5), null);
  assert.deepEqual(accClash("sharp", "flat", 5), { part: 0.51 });
});

test("Vorzeichen im Akkord: oberstes zuerst, dann unterstes, mittleres ganz links", () => {
  // Fis-Dur fis'-ais'-cis'': drei Spalten wie bei Verovio
  const fis = accXs(chordSvg([N("F", 4, 1), N("A", 4, 1), N("C", 5, 1)], "treble", 170));
  assert.equal(fis.length, 3);
  const [lo, mid, top] = fis.slice().sort((a, b) => b.y - a.y);
  assert.ok(top.x > lo.x && lo.x > mid.x);
  // keine Überdeckung: Abstand der Spalten mindestens die Breite eines ♯
  assert.ok(top.x - lo.x >= 9.84 && lo.x - mid.x >= 9.84);
  // erstes Vorzeichen 0,25 LA vor dem Kopf (ganze Note, halbe Breite 10,28)
  assert.equal(top.x, Math.round((170 - 10.28 - 3 - 12.1) * 100) / 100);
  // Es-Dur es'-g'-b': zwei ♭ eine Quinte auseinander, das untere nur teilweise eingerückt
  const es = accXs(chordSvg([N("E", 4, -1), N("G", 4), N("H", 4, -1)], "treble", 170)).sort((a, b) => a.y - b.y);
  assert.equal(es.length, 2);
  assert.ok(es[0].x - es[1].x > 0 && es[0].x - es[1].x < 8.76);
  // Abstand einer Septime: beide in derselben Spalte
  const far = placeAccidentals([{ p: 1, kind: "sharp" }, { p: 7, kind: "sharp" }]);
  assert.equal(far[0].r, far[1].r);
  // Terz: volle Spalte
  const near = placeAccidentals([{ p: 1, kind: "flat" }, { p: 3, kind: "flat" }]);
  assert.ok(near[1].r - near[0].r >= 8.76);
});

test("Akkord braucht keine Vorzeichen, wenn die Vorzeichnung passt", () => {
  const d = [N("D", 4), N("F", 4, 1), N("A", 4)];
  assert.equal(accXs(chordSvg(d, "treble", 170)).length, 1);
  assert.equal(accXs(chordSvg(d, "treble", 170, { keySig: 2 })).length, 0);
  assert.throws(() => chordSvg([N("F", 4)], "treble", 170, { keySig: 1 }));
});

test("Lerntafeln: Dreiklangstypen je Schlüssel und Quintenzirkel", () => {
  assert.equal(akkorde.learn.length, 3);
  assert.deepEqual(akkorde.learn.map((c) => c.clef), ["treble", "bass", undefined]);
  const t = akkorde.learn[0].render();
  assert.ok(t.includes("<div") && t.includes("4 + 3") && t.includes("3 + 4") && t.includes("3 + 3") && t.includes("4 + 4"));
  assert.ok(t.includes("c'-e'-gis'") && t.includes("c'-es'-ges'"));
  assert.ok(akkorde.learn[1].render().includes("c-es-g"));
  const ring = circleRing();
  assert.equal(ring.length, 12);
  assert.deepEqual(ring.map((e) => e.major), ["C", "G", "D", "A", "E", "H/Ces", "Fis/Ges", "Cis/Des", "As", "Es", "B", "F"]);
  assert.deepEqual(ring.map((e) => e.minor), ["a", "e", "h", "fis", "cis", "gis/as", "dis/es", "ais/b", "f", "c", "g", "d"]);
  const c = akkorde.learn[2].render();
  assert.ok(c.includes("<svg") && c.includes("Fis/Ges") && c.includes("dis/es"));
  // Farben nur über Tokens
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(t + c));
});

test("Beispiel auf der Startkarte ist ein festes SVG", () => {
  for (const l of akkorde.levels) assert.equal(l.example, l.example.trim());
  assert.ok(L[6].example.includes('class="keysig"'));
  assert.ok(staffSvg("treble", "").startsWith("<svg"));
});

test("Satz nach falscher Antwort (reveal) ist grammatisch, ohne „Das war ein“ vor Tonarten und Anzahlen", () => {
  const banned = /Fehler!|falsch|mühelos|Held|Champion/;
  for (const l of akkorde.levels) for (let i = 0; i < 300; i++) {
    const q = l.question(null);
    assert.ok(q.reveal && q.reveal.endsWith("."), l.id);
    assert.ok(q.prompt, l.id);
    assert.ok(!banned.test(q.reveal + q.display + q.prompt + l.hint), l.id);
    assert.ok(!/Das war ein (\d|keine|[A-H][a-z]*-Dur[,.]|[A-H][a-z]*-Dur$)/.test(q.reveal), q.reveal);
  }
  const es = find(L[5], (q) => q.prompt === "Wie viele Vorzeichen hat Es-Dur?");
  assert.equal(es.display, "Es-Dur hat 3 ♭");
  assert.equal(es.reveal, "Richtig wäre: 3 ♭. So viele Vorzeichen hat Es-Dur.");
  const c = find(L[5], (q) => q.prompt === "Wie viele Vorzeichen hat C-Dur?");
  assert.equal(c.display, "C-Dur hat keine Vorzeichen");
  const up = find(L[5], (q) => q.prompt === "G-Dur: Welche Dur-Tonart liegt im Quintenzirkel eine Quinte höher?");
  assert.equal(up.reveal, "Richtig wäre: D-Dur, eine Quinte höher als G-Dur.");
  const vii = find(L[6], (q) => q.prompt === "Welche Stufe in G-Dur?" && q.answer === "VII");
  assert.equal(vii.reveal, "Richtig wäre: VII. Der Grundton Fis ist die VII. Stufe von G-Dur (fis vermindert).");
  const s6 = find(L[4], (q) => q.display === "Sextakkord von C-Dur");
  assert.equal(s6.reveal, "Richtig wäre: Sextakkord. Unten liegt die Terz von C-Dur.");
  const h = find(L[2], (q) => q.display === "verminderter Dreiklang auf h");
  assert.equal(h.reveal, "Richtig wäre: vermindert. Das war ein verminderter Dreiklang auf h.");
});

test("Vorzeichen halten Abstand zur Hilfslinie des Akkords (wie staff.js, Verovio)", () => {
  // ♯ berührt Hilfslinien bis zwei halbe Stufen entfernt, ♭ nur auf seiner Stufe und darunter liegende bis zwei
  assert.ok(accTouchesLedger("sharp", -2, -2) && accTouchesLedger("sharp", 0, -2) && accTouchesLedger("sharp", 8, 10));
  assert.ok(!accTouchesLedger("sharp", 1, -2));
  assert.ok(accTouchesLedger("flat", -2, -2) && accTouchesLedger("flat", 8, 10));
  assert.ok(!accTouchesLedger("flat", 0, -2) && !accTouchesLedger("flat", 7, 10));
  const first = (svg) => Math.max(...accXs(svg).map((a) => a.x));
  const base = Math.round((170 - 10.28 - 3 - 12.1) * 100) / 100;
  // cis'-e'-gis': gis' (erste Spalte) ohne Hilfslinie, unverändert
  assert.equal(first(chordSvg([N("C", 4, 1), N("E", 4), N("G", 4, 1)], "treble", 170)), base);
  // E-Gis-H im Bass: das ♯ vor Gis ragt in die Hilfslinie des E → 1,9 weiter links
  assert.equal(first(chordSvg([N("E", 2), N("G", 2, 1), N("H", 2)], "bass", 170)), Math.round((base - 1.9) * 100) / 100);
  // a''-cis'''-e''': ♯ auf der Hilfslinie
  assert.equal(first(chordSvg([N("A", 5), N("C", 6, 1), N("E", 6)], "treble", 170)), Math.round((base - 1.9) * 100) / 100);
  // c'-es'-g': ♭ auf der untersten Linie berührt die Hilfslinie nicht
  const flatBase = Math.round((170 - 10.28 - 3 - 11.0) * 100) / 100;
  assert.equal(first(chordSvg([N("C", 4), N("E", 4, -1), N("G", 4)], "treble", 170)), flatBase);
  // ohne Hilfslinie wie bisher
  assert.equal(first(chordSvg([N("D", 4), N("F", 4, 1), N("A", 4)], "treble", 170)), base);
});
