import { test } from "node:test";
import assert from "node:assert/strict";
import { weakList, levelRow, levelGroups, levelRowText } from "../../src/views/stats.js";
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
