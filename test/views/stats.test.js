import { test } from "node:test";
import assert from "node:assert/strict";
import { weakList, levelRow, levelGroups, levelRowText, heatRows, heatCell, heatAccList, heatX, HEAT_CLS, HEAT_LEGEND } from "../../src/views/stats.js";
import { N } from "../../src/music.js";
import { PACKS } from "../../src/packs/index.js";

test("weakList: nur Einträge mit bad > 0, absteigend, begrenzt, Balken relativ", () => {
  const notes = {
    "G (g', Violin)": { ok: 3, bad: 2 },
    "große Terz": { ok: 1, bad: 4 },
    "A (a', Violin)": { ok: 5, bad: 0 },
    "C (c', Violin)": { ok: 0, bad: 2 },
    "D-Dur": { ok: 2, bad: 1 },
  };
  assert.deepEqual(weakList(notes), [
    { key: "große Terz", bad: 4, ok: 1, pct: 100 },
    { key: "C (c', Violin)", bad: 2, ok: 0, pct: 50 },
    { key: "G (g', Violin)", bad: 2, ok: 3, pct: 50 },
    { key: "D-Dur", bad: 1, ok: 2, pct: 25 },
  ]);
  assert.equal(weakList(notes, 2).length, 2);
  assert.deepEqual(weakList({}), []);
  assert.deepEqual(weakList(undefined), []);
});

test("levelRow: Werte aus dem Zustand, fehlender Eintrag gilt als nicht gespielt", () => {
  const l = { id: "noten-3", no: 3, title: "Violinschlüssel mit Hilfslinien" };
  assert.deepEqual(levelRow(l, { stars: 2, best: 8, played: 5 }),
    { id: "noten-3", no: 3, title: "Violinschlüssel mit Hilfslinien", played: 5, best: 8, stars: 2, pct: 80 });
  assert.deepEqual(levelRow(l, undefined),
    { id: "noten-3", no: 3, title: "Violinschlüssel mit Hilfslinien", played: 0, best: 0, stars: 0, pct: 0 });
  assert.equal(levelRow(l, { best: 10, played: 1 }).pct, 100);
});

test("levelGroups: je Paket in Registry-Reihenfolge, unbekannte IDs übergangen", () => {
  const levels = {
    "noten-1": { stars: 3, best: 10, played: 2 },
    "noten-2": { stars: 1, best: 6, played: 1 },
    "notenwerte-2": { stars: 2, best: 8, played: 4 },
    "gibtsnicht-9": { stars: 3, best: 10, played: 1 },
  };
  const g = levelGroups(PACKS, levels);
  assert.deepEqual(g.map((x) => x.id), PACKS.map((p) => p.id));
  for (const [i, p] of PACKS.entries()) {
    assert.equal(g[i].title, p.title);
    assert.deepEqual(g[i].rows.map((r) => r.id), p.levels.map((l) => l.id));
    assert.deepEqual(g[i].rows.map((r) => r.title), p.levels.map((l) => l.title));
    assert.equal(g[i].maxStars, p.levels.length * 3);
  }
  const noten = g.find((x) => x.id === "noten");
  assert.equal(noten.played, 2);
  assert.equal(noten.stars, 4);
  const nw = g.find((x) => x.id === "notenwerte");
  assert.equal(nw.played, 1);
  assert.equal(nw.rows[1].best, 8);
  assert.equal(nw.rows[1].played, 4);
  assert.equal(nw.rows[0].played, 0);
  // Gesamtzahl Sterne ohne die unbekannte Stufe
  assert.equal(g.reduce((a, x) => a + x.stars, 0), 6);
  // Leerer Zustand
  assert.ok(levelGroups(PACKS, {}).every((x) => x.played === 0 && x.stars === 0));
});

test("levelRowText: Ergebnis und Anzahl oder Hinweis", () => {
  assert.equal(levelRowText({ played: 3, best: 8 }), "8/10 · 3× gespielt");
  assert.equal(levelRowText({ played: 0, best: 0 }), "noch nicht gespielt");
});

test("heatRows: alle Stammtöne je Schlüssel in Zeilen zu höchstens 7", () => {
  const t = heatRows({}, "treble");
  assert.deepEqual(t.map((r) => r.length), [7, 6]);
  assert.deepEqual(t.flat().map((c) => c.helm), ["c'", "d'", "e'", "f'", "g'", "a'", "h'", "c''", "d''", "e''", "f''", "g''", "a''"]);
  const b = heatRows({}, "bass");
  assert.deepEqual(b.flat().map((c) => c.helm), ["E", "F", "G", "A", "H", "c", "d", "e", "f", "g", "a", "h", "c'"]);
  assert.ok(t.flat().every((c) => c.status === "neu" && c.cls === "ghost" && c.pct === null));
});

test("heatRows: Zustand, Klasse, Trefferquote und Detailtext", () => {
  const notes = {
    "G (g', Violin)": { ok: 12, bad: 3, sec: 25.2, timed: 12 },
    "A (a', Violin)": { ok: 2, bad: 6 },
    "H (h', Violin)": { ok: 8, bad: 0, sec: 48, timed: 8 },
    "F (f, Bass)": { ok: 1, bad: 0 },
  };
  const cells = heatRows(notes, "treble").flat();
  const g = cells.find((c) => c.helm === "g'");
  assert.equal(g.status, "sicher"); assert.equal(g.cls, "ok"); assert.equal(g.pct, 80);
  assert.equal(g.detail, "G (g', Violin): 12 von 15 richtig, im Schnitt 2,1 s");
  const a = cells.find((c) => c.helm === "a'");
  assert.equal(a.cls, "bad"); assert.equal(a.pct, 25);
  assert.equal(a.detail, "A (a', Violin): 2 von 8 richtig");
  assert.equal(cells.find((c) => c.helm === "h'").cls, "warn");
  assert.equal(cells.find((c) => c.helm === "c'").detail, "C (c', Violin): noch nicht geübt");
  const f = heatRows(notes, "bass").flat().find((c) => c.helm === "f");
  assert.equal(f.status, "neu"); assert.equal(f.pct, 100);
});

test("heatCell: Farbe, Quote und Zeit aus dem Fenster, Detail mit Gesamtzahl", () => {
  // 20 alte Fehler, dann 12 richtige à 2 s
  const e = { ok: 12, bad: 20, sec: 24, timed: 12, hist: "1".repeat(12), hsec: Array(12).fill(2) };
  const c = heatCell(N("G", 4), "treble", e);
  assert.equal(c.status, "sicher"); assert.equal(c.cls, "ok"); assert.equal(c.pct, 100);
  assert.equal(c.detail, "G (g', Violin): zuletzt 12 von 12 richtig (insgesamt 12 von 32), im Schnitt 2,0 s");
  // Fenster noch nicht voll und gleich der Gesamtzahl: kein „zuletzt“
  const d = heatCell(N("G", 4), "treble", { ok: 5, bad: 1, sec: 10, timed: 5, hist: "111110", hsec: [2, 2, 2, 2, 2] });
  assert.equal(d.detail, "G (g', Violin): 5 von 6 richtig, im Schnitt 2,0 s");
});

test("heatAccList, heatCell, heatX, Legende", () => {
  const list = heatAccList({ "Fis (fis', Violin)": { ok: 0, bad: 7 } });
  assert.deepEqual(list.map((c) => c.name), ["Fis", "Cis", "Gis", "Dis", "B", "Es", "As", "Des"]);
  assert.equal(list[0].status, "unsicher");
  assert.equal(heatCell(N("F", 4, 1), "treble").key, "Fis (fis', Violin)");
  assert.equal(heatX(0), 88); assert.equal(heatX(6), 288);
  assert.deepEqual(Object.keys(HEAT_CLS).sort(), HEAT_LEGEND.map(([s]) => s).sort());
});
