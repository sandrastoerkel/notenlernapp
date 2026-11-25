// Jahrgang über den Lehrkraft-Link (Welle 11, Schritt 11): Tabelle, Link, Abschnitte, Öffnen
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JAHRGAENGE, DRAN, DRAN_MUG, dranFor, parseLink, buildLink, sameKlasse, klasseText, sections, nextUp, isKlasseLink,
} from "../src/klasse.js";
import { fresh, isUnlocked, setKlasse, clearKlasse, reset, recordRound, save, load, KEY_V2 } from "../src/store.js";
import { PACKS } from "../src/packs/index.js";

const BASE = "https://sandrastoerkel.github.io/notenlernapp/";
const IDS = PACKS.map((p) => p.id);
const COUNT = Object.fromEntries(PACKS.map((p) => [p.id, p.levels.length]));

// Offene Stufen eines Stands (alle Pakete)
const offen = (s) => new Set(PACKS.flatMap((p) => p.levels.filter((l) => isUnlocked(s, p, l.id)).map((l) => l.id)));
const superset = (a, b) => [...b].every((id) => a.has(id));

// Spielstände für die Mengen-Tests: frisch, etwas Fortschritt, viel Fortschritt (auch über „dran“ hinaus),
// unlockAll, gespielt ohne geschafft
const STAENDE = (() => {
  const a = fresh();
  const b = fresh(); recordRound(b, "noten-1", 9); recordRound(b, "noten-2", 8); recordRound(b, "intervall-1", 10);
  const c = fresh();
  for (const p of PACKS) p.levels.slice(0, Math.ceil(p.levels.length / 2)).forEach((l) => recordRound(c, l.id, 8));
  recordRound(c, "intervall-7", 3); recordRound(c, "akkorde-6", 2);
  const d = fresh(); d.unlockAll = true;
  const e = fresh(); recordRound(e, "tonleitern-12", 4); recordRound(e, "akkorde-1", 6);
  return [a, b, c, d, e];
})();
const clone = (s) => JSON.parse(JSON.stringify(s));

// Alle Einstellungen: jeder Jahrgang, beide Zweige, dazu eigene Zuschnitte (alles 0, alles voll, gemischt)
const EINSTELLUNGEN = [
  ...JAHRGAENGE.flatMap((j) => [{ jahrgang: j, zweig: null, dran: dranFor(j) }, { jahrgang: j, zweig: "mug", dran: dranFor(j, "mug") }]),
  { jahrgang: 6, zweig: null, dran: Object.fromEntries(IDS.map((id) => [id, 0])) },
  { jahrgang: 13, zweig: null, dran: { ...COUNT } },
  { jahrgang: 7, zweig: null, dran: { ...dranFor(7), intervalle: 6, akkorde: 1 } },
];

/* ---------- Tabelle ---------- */

test("Tabelle: Jahrgänge 5 bis 13, je Paket eine Zahl 0 … Stufenzahl", () => {
  assert.deepEqual(JAHRGAENGE, [5, 6, 7, 8, 9, 10, 11, 12, 13]);
  for (const t of [DRAN, DRAN_MUG]) for (const j of JAHRGAENGE) {
    assert.deepEqual(Object.keys(t[j]).sort(), [...IDS].sort(), `Jahrgang ${j}`);
    for (const id of IDS) assert.ok(Number.isInteger(t[j][id]) && t[j][id] >= 0 && t[j][id] <= COUNT[id], `${j} ${id}`);
  }
});

test("Tabelle wie im PLAN (Welle 11, Abschnitt 4)", () => {
  assert.deepEqual(dranFor(5), { noten: 8, notenwerte: 10, intervalle: 2, tonleitern: 9, akkorde: 0 });
  assert.deepEqual(dranFor(6), { noten: 8, notenwerte: 10, intervalle: 4, tonleitern: 13, akkorde: 4 });
  for (const j of [7, 8, 9, 10, 11, 12, 13]) assert.deepEqual(dranFor(j), { noten: 8, notenwerte: 10, intervalle: 4, tonleitern: 13, akkorde: 6 }, `${j}`);
  // Musisches Gymnasium: ab Jahrgang 6 verminderte und übermäßige Intervalle (Intervalle bis 10), sonst gleich
  assert.deepEqual(dranFor(5, "mug"), dranFor(5));
  for (const j of JAHRGAENGE.slice(1)) assert.deepEqual(dranFor(j, "mug"), { ...dranFor(j), intervalle: 10 }, `${j}`);
  assert.equal(dranFor(4), null);
  assert.equal(dranFor(14), null);
  // neues Objekt: Ändern verändert die Tabelle nicht
  const d = dranFor(6); d.noten = 0;
  assert.equal(dranFor(6).noten, 8);
});

test("Tabelle aufsteigend: kein Jahrgang hat weniger als der davor (beide Zweige), MuG nie weniger", () => {
  for (const t of [DRAN, DRAN_MUG]) for (let i = 1; i < JAHRGAENGE.length; i++) {
    for (const id of IDS) assert.ok(t[JAHRGAENGE[i]][id] >= t[JAHRGAENGE[i - 1]][id], `${JAHRGAENGE[i]} ${id}`);
  }
  for (const j of JAHRGAENGE) for (const id of IDS) assert.ok(DRAN_MUG[j][id] >= DRAN[j][id]);
});

/* ---------- Link ---------- */

test("parseLink: jede gültige Form", () => {
  assert.deepEqual(parseLink("#klasse=6", PACKS), { jahrgang: 6, zweig: null, dran: dranFor(6) });
  assert.deepEqual(parseLink("#klasse=13", PACKS), { jahrgang: 13, zweig: null, dran: dranFor(13) });
  assert.deepEqual(parseLink("#klasse=6&zweig=mug", PACKS), { jahrgang: 6, zweig: "mug", dran: dranFor(6, "mug") });
  assert.deepEqual(parseLink("#klasse=6&dran=intervalle:6,akkorde:1", PACKS),
    { jahrgang: 6, zweig: null, dran: { ...dranFor(6), intervalle: 6, akkorde: 1 } });
  assert.deepEqual(parseLink("#klasse=7&zweig=mug&dran=noten:0", PACKS),
    { jahrgang: 7, zweig: "mug", dran: { ...dranFor(7, "mug"), noten: 0 } });
  assert.deepEqual(parseLink("#klasse=5&dran=tonleitern:13", PACKS), { jahrgang: 5, zweig: null, dran: { ...dranFor(5), tonleitern: 13 } });
  assert.deepEqual(parseLink("#klasse=keine", PACKS), { keine: true });
  // ganzer Link, ohne #, Reihenfolge der Angaben, prozentkodiert (manche Programme kodieren : und ,)
  assert.deepEqual(parseLink(BASE + "#klasse=6", PACKS), parseLink("#klasse=6", PACKS));
  assert.deepEqual(parseLink("klasse=6", PACKS), parseLink("#klasse=6", PACKS));
  assert.deepEqual(parseLink("#zweig=mug&klasse=6", PACKS), parseLink("#klasse=6&zweig=mug", PACKS));
  assert.deepEqual(parseLink("#klasse=6&dran=intervalle%3A6%2Cakkorde%3A1", PACKS), parseLink("#klasse=6&dran=intervalle:6,akkorde:1", PACKS));
});

test("parseLink: ungültige Links werden als Ganzes verworfen", () => {
  const BAD = [
    "", "#", "#klasse", "#klasse=", "#klasse=4", "#klasse=14", "#klasse=0", "#klasse=-6", "#klasse=6.0", "#klasse=06",
    "#klasse=sechs", "#klasse= 6", "#klasse=6 ",
    "#klasse=6&dran=noten:9", "#klasse=6&dran=foo:1", "#klasse=6&dran=noten:x", "#klasse=6&dran=noten:-1",
    "#klasse=6&dran=noten:01", "#klasse=6&dran=noten", "#klasse=6&dran=", "#klasse=6&dran=noten:3,", "#klasse=6&dran=,noten:3",
    "#klasse=6&dran=noten:3,noten:4", "#klasse=6&dran=akkorde:7", "#klasse=6&dran=tonleitern:14",
    "#klasse=6&foo=1", "#klasse=6&", "#klasse=6&&zweig=mug", "#klasse=6&klasse=7", "#klasse=6&zweig=mug&zweig=mug",
    "#klasse=6&zweig=", "#klasse=6&zweig=ja", "#klasse=6&zweig=MUG", "#Klasse=6", "#KLASSE=6", "#klasse=Keine",
    "#klasse=6&Dran=noten:3", "#klasse=6&dran=Noten:3", "#klasse=keine&zweig=mug", "#klasse=keine&dran=noten:1",
    "#zweig=mug", "#dran=noten:3", "#klasse=%E0%A4%A", "#klasse=6&dran=noten:3&dran=noten:4",
  ];
  for (const h of BAD) assert.equal(parseLink(h, PACKS), null, h);
});

test("isKlasseLink: Angaben mit klasse, zweig oder dran (auch falsch geschrieben), sonst nicht", () => {
  for (const h of ["#klasse=6", "#klasse=keine", "#Klasse=6", "#dran=noten:3", "#zweig=mug", "#klasse", BASE + "#klasse=99"]) assert.ok(isKlasseLink(h), h);
  for (const h of ["", "#", "#lehrkraft", "#lernen", BASE, "#klassen=6"]) assert.ok(!isKlasseLink(h), h);
});

test("buildLink: nur Abweichungen von der Voreinstellung; Rundlauf mit parseLink für alle Einstellungen", () => {
  assert.equal(buildLink(BASE, { jahrgang: 6, zweig: null, dran: dranFor(6) }, PACKS), BASE + "#klasse=6");
  assert.equal(buildLink(BASE, { jahrgang: 6, zweig: "mug", dran: dranFor(6, "mug") }, PACKS), BASE + "#klasse=6&zweig=mug");
  assert.equal(buildLink(BASE, { jahrgang: 6, zweig: null, dran: { ...dranFor(6), akkorde: 1, intervalle: 6 } }, PACKS),
    BASE + "#klasse=6&dran=intervalle:6,akkorde:1");
  assert.equal(buildLink(BASE, null, PACKS), BASE + "#klasse=keine");
  assert.equal(buildLink(BASE, { keine: true }, PACKS), BASE + "#klasse=keine");
  assert.equal(buildLink(BASE + "#alt", { jahrgang: 9, zweig: null, dran: dranFor(9) }, PACKS), BASE + "#klasse=9");
  for (const k of EINSTELLUNGEN) assert.deepEqual(parseLink(buildLink(BASE, k, PACKS), PACKS), k, JSON.stringify(k));
  assert.deepEqual(parseLink(buildLink(BASE, null, PACKS), PACKS), { keine: true });
  assert.throws(() => buildLink(BASE, { jahrgang: 4, zweig: null, dran: {} }, PACKS));
  assert.throws(() => buildLink(BASE, { jahrgang: 6, zweig: null, dran: { ...dranFor(6), noten: 9 } }, PACKS));
});

test("sameKlasse und klasseText", () => {
  const a = parseLink("#klasse=6", PACKS);
  assert.ok(sameKlasse(a, { jahrgang: 6, zweig: null, dran: dranFor(6) }));
  assert.ok(sameKlasse(null, null) && sameKlasse(null, undefined));
  assert.ok(!sameKlasse(a, null) && !sameKlasse(null, a));
  assert.ok(!sameKlasse(a, parseLink("#klasse=7", PACKS)));
  assert.ok(!sameKlasse(a, parseLink("#klasse=6&zweig=mug", PACKS)));
  assert.ok(!sameKlasse(a, parseLink("#klasse=6&dran=noten:7", PACKS)));
  // 5 und 5 MuG haben dieselbe Tabelle, sind aber verschiedene Einstellungen
  assert.ok(!sameKlasse(parseLink("#klasse=5", PACKS), parseLink("#klasse=5&zweig=mug", PACKS)));
  assert.equal(klasseText(a), "Jahrgang 6");
  assert.equal(klasseText(parseLink("#klasse=6&zweig=mug", PACKS)), "Jahrgang 6, Musisches Gymnasium");
  assert.equal(klasseText(parseLink("#klasse=6&dran=akkorde:1", PACKS)), "Jahrgang 6, eigene Auswahl");
  assert.equal(klasseText(parseLink("#klasse=6&zweig=mug&dran=akkorde:1", PACKS)), "Jahrgang 6, Musisches Gymnasium, eigene Auswahl");
  assert.equal(klasseText(null), "");
});

/* ---------- Öffnen: der Jahrgang öffnet, er schließt nie ---------- */

test("offenMitKlasse ⊇ offenOhneKlasse für jede Einstellung und jeden Spielstand; alles bis „dran“ ist offen", () => {
  for (const s0 of STAENDE) {
    const ohne = offen(s0);
    for (const k of EINSTELLUNGEN) {
      const s = setKlasse(clone(s0), k);
      const mit = offen(s);
      assert.ok(superset(mit, ohne), `${JSON.stringify(k)}`);
      for (const p of PACKS) for (const l of p.levels) if (l.no <= k.dran[p.id]) assert.ok(mit.has(l.id), `${l.id} bei ${klasseText(k)}`);
      // Fortschritt bleibt
      assert.deepEqual(s.levels, s0.levels);
      assert.equal(s.xp, s0.xp);
    }
  }
});

test("Jahrgang 6: Intervalle 3 und 4 sofort offen, 5 nicht (ohne Fortschritt); Jetzt-dran-Stufen ebenso", () => {
  const s = setKlasse(fresh(), parseLink("#klasse=6", PACKS));
  const P = Object.fromEntries(PACKS.map((p) => [p.id, p]));
  assert.ok(isUnlocked(s, P.intervalle, "intervall-3") && isUnlocked(s, P.intervalle, "intervall-4"));
  assert.ok(!isUnlocked(s, P.intervalle, "intervall-5"));
  assert.ok(isUnlocked(s, P.akkorde, "akkorde-4") && !isUnlocked(s, P.akkorde, "akkorde-5"));
  assert.ok(isUnlocked(s, P.tonleitern, "tonleitern-13"));
});

test("Wechsel 7 → 5 → keine schließt keine gespielte oder nach der üblichen Regel offene Stufe", () => {
  for (const s0 of STAENDE) {
    const s = clone(s0);
    const regel = offen(s0);
    const gespielt = new Set(Object.entries(s0.levels).filter(([, v]) => v.played > 0).map(([id]) => id));
    setKlasse(s, parseLink("#klasse=7", PACKS));
    const bei7 = offen(s);
    // Zwischendurch geübt: was in Jahrgang 7 offen war und gespielt wird, bleibt danach offen
    recordRound(s, "akkorde-6", 3);
    gespielt.add("akkorde-6");
    setKlasse(s, parseLink("#klasse=5", PACKS));
    const bei5 = offen(s);
    clearKlasse(s);
    const keine = offen(s);
    for (const set of [bei7, bei5, keine]) {
      assert.ok(superset(set, regel));
      assert.ok([...gespielt].every((id) => set.has(id)));
    }
    assert.ok(superset(bei5, keine));
    assert.ok(bei7.has("akkorde-6"));
  }
});

test("setKlasse / clearKlasse: nur klasse ändert sich; unbrauchbare Einstellung wird abgewiesen", () => {
  const s = STAENDE[2], before = clone(s);
  const t = setKlasse(clone(s), parseLink("#klasse=6", PACKS));
  assert.deepEqual({ ...t, klasse: null }, { ...before, klasse: null });
  assert.deepEqual(t.klasse, { jahrgang: 6, zweig: null, dran: dranFor(6) });
  assert.deepEqual(clearKlasse(t).klasse, null);
  for (const bad of [null, { keine: true }, { jahrgang: 4, zweig: null, dran: {} }, { jahrgang: 6, zweig: "x", dran: {} },
    { jahrgang: 6, zweig: null }, { jahrgang: 6, zweig: null, dran: { noten: -1 } }, { jahrgang: 6, zweig: null, dran: { noten: 1.5 } }]) {
    const u = clone(s);
    assert.throws(() => setKlasse(u, bad));
    assert.deepEqual(u, before);
  }
});

test("Ungültiger Link fasst den Spielstand nicht an (auch nicht im Speicher)", () => {
  const data = new Map();
  const storage = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
  const s = STAENDE[1];
  setKlasse(s, parseLink("#klasse=5", PACKS));
  save(s, storage);
  const raw = data.get(KEY_V2);
  for (const h of ["#klasse=99", "#klasse=6&dran=noten:9", "#klasse=6&foo=1", "#Klasse=6"]) {
    assert.equal(parseLink(h, PACKS), null);
    assert.equal(data.get(KEY_V2), raw);
  }
  assert.deepEqual(load(storage).klasse, { jahrgang: 5, zweig: null, dran: dranFor(5) });
  clearKlasse(s);
});

test("Kaputte gespeicherte Einstellung öffnet nichts zusätzlich und sperrt nichts", () => {
  for (const klasse of [{}, { dran: null }, { dran: { noten: "8" } }, { dran: { noten: -3 } }, { dran: [8] }, "6"]) {
    const s = { ...fresh(), klasse };
    assert.deepEqual(offen(s), offen(fresh()), JSON.stringify(klasse));
  }
});

test("reset behält klasse", () => {
  const s = setKlasse(clone(STAENDE[2]), parseLink("#klasse=7&zweig=mug", PACKS));
  const r = reset(s);
  assert.deepEqual(r.klasse, { jahrgang: 7, zweig: "mug", dran: dranFor(7, "mug") });
  assert.deepEqual(r.levels, {});
  // nach dem Zurücksetzen ist alles bis „dran“ weiter offen
  assert.ok(superset(offen(r), new Set(["intervall-10", "akkorde-6", "noten-8"])));
});

/* ---------- Abschnitte der Startseite ---------- */

const withK = (h, s = fresh()) => setKlasse(clone(s), parseLink(h, PACKS));
const allIds = PACKS.flatMap((p) => p.levels.map((l) => l.id));
const upTo = (d) => PACKS.flatMap((p) => p.levels.filter((l) => l.no <= d[p.id]).map((l) => l.id));

test("sections: Jahrgang 5 ohne Fortschritt – alles aus „dran“ in „Jetzt dran“", () => {
  const sec = sections(withK("#klasse=5"), PACKS);
  assert.deepEqual(sec.jetzt, upTo(dranFor(5)));
  assert.deepEqual(sec.gewesen, []);
  assert.deepEqual(sec.hinaus, allIds.filter((id) => !sec.jetzt.includes(id)));
});

test("sections: Jahrgang 7 ohne Fortschritt – „Jetzt dran“ = Dreiklänge 5 und 6, alles andere bis „dran“ war schon dran", () => {
  const sec = sections(withK("#klasse=7"), PACKS);
  assert.deepEqual(sec.jetzt, ["akkorde-5", "akkorde-6"]);
  assert.deepEqual(sec.gewesen, upTo(dranFor(7)).filter((id) => !["akkorde-5", "akkorde-6"].includes(id)));
  assert.deepEqual(sec.hinaus, ["intervall-5", "intervall-6", "intervall-7", "intervall-8", "intervall-9", "intervall-10"]);
  assert.equal(nextUp(withK("#klasse=7"), PACKS), "akkorde-5");
});

test("sections: Jahrgang 9 – „Jetzt dran“ leer, nextUp null", () => {
  const sec = sections(withK("#klasse=9"), PACKS);
  assert.deepEqual(sec.jetzt, []);
  assert.equal(nextUp(withK("#klasse=9"), PACKS), null);
  assert.equal(sections(fresh(), PACKS), null);
  assert.equal(nextUp(fresh(), PACKS), null);
});

test("sections: Geschafftes wandert nach „Schon dran gewesen“; jede Stufe steht in genau einem Abschnitt", () => {
  const s = fresh(); recordRound(s, "akkorde-5", 8); recordRound(s, "akkorde-6", 7);
  const sec = sections(withK("#klasse=7", s), PACKS);
  assert.deepEqual(sec.jetzt, ["akkorde-6"]);
  assert.ok(sec.gewesen.includes("akkorde-5"));
  assert.equal(nextUp(withK("#klasse=7", s), PACKS), "akkorde-6");
  // Jahrgang 6 MuG: vom Jahrgang 5 (gleiche Tabelle) kommen Intervalle 3–10 dazu
  assert.deepEqual(sections(withK("#klasse=6&zweig=mug"), PACKS).jetzt.filter((id) => id.startsWith("intervall-")),
    ["intervall-3", "intervall-4", "intervall-5", "intervall-6", "intervall-7", "intervall-8", "intervall-9", "intervall-10"]);
  for (const k of EINSTELLUNGEN) for (const s0 of STAENDE) {
    const sc = sections(setKlasse(clone(s0), k), PACKS);
    const all = [...sc.jetzt, ...sc.gewesen, ...sc.hinaus];
    assert.equal(all.length, allIds.length);
    assert.deepEqual(new Set(all), new Set(allIds));
  }
});
