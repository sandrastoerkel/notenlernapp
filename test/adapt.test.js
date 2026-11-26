import { test } from "node:test";
import assert from "node:assert/strict";
import {
  status, recent, weight, pickWeighted, pickAmong, TAGE_WIE_NEU, countUnsure, MIN_ANTWORTEN, QUOTE_SICHER, LANGSAM_SEK, ANTEIL_ZUFALL, GEWICHT,
  FENSTER, ZEIT_DECKEL, MIN_ZEITEN,
} from "../src/adapt.js";

// Zufallsfolge aus festen Werten (wiederholt sich)
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
// Gleichmäßig verteilte, aber feste Folge für Häufigkeitstests
const lcg = (seed = 1) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

test("Startwerte", () => {
  assert.equal(MIN_ANTWORTEN, 6); assert.equal(QUOTE_SICHER, 0.7); assert.equal(LANGSAM_SEK, 4); assert.equal(ANTEIL_ZUFALL, 0.3);
  assert.deepEqual(GEWICHT, { neu: 2, unsicher: 4, langsam: 2, sicher: 1 });
  assert.equal(FENSTER, 12); assert.equal(ZEIT_DECKEL, 10); assert.equal(MIN_ZEITEN, 3);
});

test("status: alle vier Fälle", () => {
  assert.equal(status(undefined), "neu");
  assert.equal(status({ ok: 3, bad: 1 }), "neu");
  assert.equal(status({ ok: 2, bad: 6 }), "unsicher");
  assert.equal(status({ ok: 8, bad: 0, sec: 40, timed: 8 }), "langsam");
  assert.equal(status({ ok: 8, bad: 0, sec: 16, timed: 8 }), "sicher");
});

test("status: Grenzwerte", () => {
  // 5 Antworten: noch neu, 6: bewertet
  assert.equal(status({ ok: 0, bad: 5 }), "neu");
  assert.equal(status({ ok: 0, bad: 6 }), "unsicher");
  // genau 70 % ist nicht mehr unsicher, knapp darunter schon
  assert.equal(status({ ok: 7, bad: 3 }), "sicher");
  assert.equal(status({ ok: 69, bad: 31 }), "unsicher");
  // genau 4 s im Schnitt ist nicht langsam, darüber schon
  assert.equal(status({ ok: 10, bad: 0, sec: 40, timed: 10 }), "sicher");
  assert.equal(status({ ok: 10, bad: 0, sec: 40.1, timed: 10 }), "langsam");
  // alte Einträge ohne Zeitmessung können nicht langsam sein
  assert.equal(status({ ok: 10, bad: 0 }), "sicher");
  // langsam erst ab MIN_ZEITEN gemessenen Zeiten
  assert.equal(status({ ok: 10, bad: 0, sec: 18, timed: 2 }), "sicher");
  assert.equal(status({ ok: 10, bad: 0, sec: 27, timed: 3 }), "langsam");
});

test("status und recent: Fenster der letzten Antworten", () => {
  // 20 alte Fehler, dann 12 richtige: insgesamt 12 von 32 (37 %), im Fenster 12 von 12
  const e = { ok: 12, bad: 20, hist: "1".repeat(12), hsec: Array(12).fill(2), sec: 24, timed: 12 };
  assert.deepEqual(recent(e), { ok: 12, n: 12, timed: 12, avg: 2 });
  assert.equal(status(e), "sicher");
  // im Fenster 8 von 12 (67 %): unsicher, auch wenn insgesamt viel richtig war
  assert.equal(status({ ok: 90, bad: 4, hist: "111100001111", hsec: [] }), "unsicher");
  // langsam aus den Zeiten im Fenster, nicht aus der Gesamtsumme
  assert.equal(status({ ok: 12, bad: 0, sec: 12, timed: 12, hist: "1".repeat(12), hsec: [5, 5, 5] }), "langsam");
  assert.equal(status({ ok: 12, bad: 0, sec: 120, timed: 12, hist: "1".repeat(12), hsec: [2, 2, 2] }), "sicher");
  // weniger als MIN_ZEITEN Zeiten im Fenster: nicht langsam
  assert.equal(status({ ok: 12, bad: 0, hist: "1".repeat(12), hsec: [9, 9] }), "sicher");
});

test("recent: alte Spielstände ohne Verlauf nutzen die Gesamtwerte", () => {
  // Verlauf kürzer als MIN_ANTWORTEN: Gesamtwerte zählen
  assert.equal(status({ ok: 2, bad: 8, hist: "11111" }), "unsicher");
  assert.deepEqual(recent({ ok: 2, bad: 8, hist: "11111" }), { ok: 2, n: 10, timed: 0, avg: null });
  // ab MIN_ANTWORTEN Einträgen im Verlauf zählt nur der Verlauf
  assert.equal(status({ ok: 8, bad: 8, hist: "111111" }), "sicher");
  assert.deepEqual(recent(undefined), { ok: 0, n: 0, timed: 0, avg: null });
});

test("recent: beschädigte Einträge ergeben nie NaN", () => {
  // hist kein Text: Gesamtwerte zählen
  assert.deepEqual(recent({ ok: 7, bad: 1, hist: 111111, hsec: "x" }), { ok: 7, n: 8, timed: 0, avg: null });
  // hsec keine Liste: keine Zeit, nicht langsam
  assert.deepEqual(recent({ hist: "111111", hsec: "9,9,9" }), { ok: 6, n: 6, timed: 0, avg: null });
  // hsec mit anderen Werten als Zahlen: nur die Zahlen zählen
  const r = recent({ hist: "111111", hsec: [2, null, "9", NaN, -1, 4, Infinity] });
  assert.deepEqual(r, { ok: 6, n: 6, timed: 2, avg: 3 });
  assert.equal(status({ hist: "111111", hsec: [null, NaN, "9"] }), "sicher");
  // zu lange Felder: nur die letzten FENSTER Einträge
  assert.deepEqual(recent({ hist: "0".repeat(20) + "1".repeat(12), hsec: Array(20).fill(9).concat(Array(12).fill(2)) }), { ok: 12, n: 12, timed: 12, avg: 2 });
});

test("Ausreißer: ein Wegschauen macht eine Note nicht langsam", () => {
  // fünf Antworten à 2 s und eine gedeckelte à 10 s: im Schnitt 3,3 s
  assert.equal(status({ ok: 6, bad: 0, hist: "111111", hsec: [2, 2, 2, 2, 2, 10] }), "sicher");
});

test("weight je Zustand", () => {
  assert.equal(weight(undefined), 2);
  assert.equal(weight({ ok: 1, bad: 9 }), 4);
  assert.equal(weight({ ok: 9, bad: 0, sec: 90, timed: 9 }), 2);
  assert.equal(weight({ ok: 9, bad: 0, sec: 9, timed: 9 }), 1);
});

const ITEMS = ["a", "b", "c", "d"].map((k) => ({ k }));
const keyOf = (x) => x.k;
const SICHER = { ok: 10, bad: 0, sec: 10, timed: 10 };

test("pickWeighted: unsichere Aufgabe kommt öfter", () => {
  const notes = { a: { ok: 1, bad: 9 }, b: SICHER, c: SICHER, d: SICHER };
  const rand = lcg(7), count = { a: 0, b: 0, c: 0, d: 0 };
  for (let i = 0; i < 4000; i++) count[pickWeighted(ITEMS, keyOf, notes, null, rand).k]++;
  // erwartet: a = 0,3 · 1/4 + 0,7 · 4/7 = 0,475; b, c, d je 0,175
  assert.ok(count.a > 1700 && count.a < 2100, `a=${count.a}`);
  for (const k of ["b", "c", "d"]) assert.ok(count[k] > 550 && count[k] < 850, `${k}=${count[k]}`);
});

test("pickWeighted: nie dieselbe wie prev", () => {
  const notes = { a: { ok: 0, bad: 10 }, b: SICHER, c: SICHER, d: SICHER };
  const rand = lcg(3);
  for (let i = 0; i < 500; i++) assert.notEqual(pickWeighted(ITEMS, keyOf, notes, { k: "a" }, rand).k, "a");
  // nur eine Aufgabe: dann eben diese
  assert.equal(pickWeighted([{ k: "a" }], keyOf, notes, { k: "a" }, rand).k, "a");
});

test("pickWeighted: leere notes und fehlende notes sind gleichverteilt", () => {
  for (const notes of [{}, undefined]) {
    const rand = lcg(11), count = { a: 0, b: 0, c: 0, d: 0 };
    for (let i = 0; i < 4000; i++) count[pickWeighted(ITEMS, keyOf, notes, null, rand).k]++;
    for (const k of Object.keys(count)) assert.ok(count[k] > 850 && count[k] < 1150, `${k}=${count[k]}`);
  }
});

test("pickWeighted: fester Zufall wählt nachvollziehbar", () => {
  const notes = { a: SICHER, b: SICHER, c: { ok: 0, bad: 10 }, d: SICHER };
  // 0,5 ≥ 0,3: gewichtet; Gewichte 1, 1, 4, 1 (Summe 7); 0,5 · 7 = 3,5 fällt auf c
  assert.equal(pickWeighted(ITEMS, keyOf, notes, null, seq(0.5, 0.5)).k, "c");
  // 0,1 < 0,3: gleichverteilt; 0,9 · 4 = 3,6 → d
  assert.equal(pickWeighted(ITEMS, keyOf, notes, null, seq(0.1, 0.9)).k, "d");
  // gewichtet mit Zufall knapp unter 1 → letzte Aufgabe
  assert.equal(pickWeighted(ITEMS, keyOf, notes, null, seq(0.5, 0.9999)).k, "d");
});

test("countUnsure", () => {
  const notes = { a: { ok: 1, bad: 9 }, b: SICHER, c: { ok: 2, bad: 4 }, x: { ok: 0, bad: 10 } };
  assert.equal(countUnsure(notes, ["a", "b", "c", "d"]), 2);
  assert.equal(countUnsure(undefined, ["a"]), 0);
});

/* ---------- Welle 11, Schritt 9: Gewicht nach Tagen, pickAmong ---------- */

test("weight mit Datum: sicher bis 6 Tage, ab TAGE_WIE_NEU (7) wie neu", () => {
  assert.equal(TAGE_WIE_NEU, 7);
  const sicher = (last) => ({ ok: 8, bad: 0, last });
  assert.equal(weight(sicher("2026-11-19"), "2026-11-25"), GEWICHT.sicher, "6 Tage");
  assert.equal(weight(sicher("2026-11-18"), "2026-11-25"), GEWICHT.neu, "7 Tage");
  assert.equal(weight(sicher("2026-10-01"), "2026-11-25"), GEWICHT.neu, "viele Tage");
  // über den Monats- und Jahreswechsel
  assert.equal(weight(sicher("2026-12-28"), "2027-01-04"), GEWICHT.neu);
  assert.equal(weight(sicher("2026-12-29"), "2027-01-04"), GEWICHT.sicher);
  // ohne heute wie bisher
  assert.equal(weight(sicher("2026-01-01")), GEWICHT.sicher);
  // nur sichere Aufgaben: unsicher, langsam und neu behalten ihr Gewicht
  assert.equal(weight({ ok: 0, bad: 8, last: "2026-01-01" }, "2026-11-25"), GEWICHT.unsicher);
  assert.equal(weight({ ok: 8, bad: 0, sec: 40, timed: 8, last: "2026-01-01" }, "2026-11-25"), GEWICHT.langsam);
  assert.equal(weight(undefined, "2026-11-25"), GEWICHT.neu);
  // fehlendes oder beschädigtes last, last in der Zukunft: sicher
  for (const last of [undefined, null, 5, "gestern", "2026-13-45x", "2026-11-30"]) assert.equal(weight(sicher(last), "2026-11-25"), GEWICHT.sicher, String(last));
});

test("pickAmong: fester Zufall, keine Regel zu prev, Grundgewicht", () => {
  const notes = { a: SICHER, b: SICHER, c: { ok: 0, bad: 10 }, d: SICHER };
  // 0,5 ≥ 0,3: gewichtet; Gewichte 1, 1, 4, 1 (Summe 7); 0,5 · 7 = 3,5 fällt auf c
  assert.equal(pickAmong(ITEMS, keyOf, notes, seq(0.5, 0.5)).k, "c");
  // 0,1 < 0,3: gleichverteilt; 0,9 · 4 = 3,6 → d
  assert.equal(pickAmong(ITEMS, keyOf, notes, seq(0.1, 0.9)).k, "d");
  // ohne notes gleichverteilt (ein Zug für die Wahl): 0,6 · 4 = 2,4 → c
  assert.equal(pickAmong(ITEMS, keyOf, null, seq(0.6)).k, "c");
  // kein Ausschluss: eine einzige Aufgabe kommt immer
  assert.equal(pickAmong([ITEMS[0]], keyOf, notes, seq(0.5, 0.5)).k, "a");
  assert.equal(pickAmong([], keyOf, notes), undefined);
  // Grundgewicht: Gewicht 0 kommt nie, auch im Zufallsanteil
  const base = (it) => (it.k === "c" ? 0 : 1);
  for (const r of [0.1, 0.5]) for (const z of [0, 0.4, 0.9999]) assert.notEqual(pickAmong(ITEMS, keyOf, notes, seq(r, z), undefined, base).k, "c");
  // Tage: a ist sicher, aber 10 Tage her (Gewicht 2 statt 1); Gewichte 2, 1, 1, 1 (Summe 5); 0,3 · 5 = 1,5 → a
  const alt = { a: { ...SICHER, last: "2026-11-15" }, b: { ...SICHER, last: "2026-11-25" }, c: SICHER, d: SICHER };
  assert.equal(pickAmong(ITEMS, keyOf, alt, seq(0.5, 0.3), "2026-11-25").k, "a");
  // ohne heute zählt last nicht: Gewichte 1, 1, 1, 1; 0,3 · 4 = 1,2 → b
  assert.equal(pickAmong(ITEMS, keyOf, alt, seq(0.5, 0.3)).k, "b");
});

test("pickAmong: lange nicht Geübtes und Unsicheres kommen öfter, Zufallsanteil bleibt", () => {
  const notes = { a: { ...SICHER, last: "2026-11-01" }, b: { ...SICHER, last: "2026-11-24" }, c: { ...SICHER, last: "2026-11-24" }, d: { ...SICHER, last: "2026-11-24" } };
  const count = { a: 0, b: 0, c: 0, d: 0 }, rand = lcg(7);
  for (let i = 0; i < 4000; i++) count[pickAmong(ITEMS, keyOf, notes, rand, "2026-11-25").k]++;
  // erwartet: a 0,3/4 + 0,7 · 2/5 = 0,355; die anderen je 0,215
  assert.ok(count.a > 1250 && count.a < 1600, `a=${count.a}`);
  for (const k of ["b", "c", "d"]) assert.ok(count[k] > 700 && count[k] < 1050, `${k}=${count[k]}`);
});

test("pickWeighted mit heute (Welle 12, W-C4): lange nicht Geübtes wiegt wie neu, ohne heute wie bisher", () => {
  // a ist sicher, aber 10 Tage her; b, c, d sicher und gestern geübt
  const alt = { a: { ...SICHER, last: "2026-11-15" }, b: { ...SICHER, last: "2026-11-24" }, c: { ...SICHER, last: "2026-11-24" }, d: { ...SICHER, last: "2026-11-24" } };
  // gewichtet (0,5 ≥ 0,3); mit heute Gewichte 2, 1, 1, 1 (Summe 5); 0,3 · 5 = 1,5 → a
  assert.equal(pickWeighted(ITEMS, keyOf, alt, null, seq(0.5, 0.3), "2026-11-25").k, "a");
  // ohne heute Gewichte 1, 1, 1, 1; 0,3 · 4 = 1,2 → b (genau wie vor Welle 12)
  assert.equal(pickWeighted(ITEMS, keyOf, alt, null, seq(0.5, 0.3)).k, "b");
  assert.equal(pickWeighted(ITEMS, keyOf, alt, null, seq(0.5, 0.3), undefined).k, "b");
  // genau 6 Tage: noch sicher (Gewicht 1) → wie ohne heute
  assert.equal(pickWeighted(ITEMS, keyOf, alt, null, seq(0.5, 0.3), "2026-11-21").k, "b");
  // die Regel zu prev gilt weiter: a war gerade dran und kommt nicht
  for (const z of [0, 0.3, 0.6, 0.9999]) assert.notEqual(pickWeighted(ITEMS, keyOf, alt, { k: "a" }, seq(0.5, z), "2026-11-25").k, "a");
  // Häufigkeit: a 0,3/4 + 0,7 · 2/5 = 0,355
  const count = { a: 0, b: 0, c: 0, d: 0 }, rand = lcg(11);
  for (let i = 0; i < 4000; i++) count[pickWeighted(ITEMS, keyOf, alt, null, rand, "2026-11-25").k]++;
  assert.ok(count.a > 1250 && count.a < 1600, `a=${count.a}`);
});

test("pickWeighted ohne heute: für jeden festen Zufall dieselbe Wahl wie mit ungültigem heute", () => {
  const notes = { a: { ...SICHER, last: "2026-01-01" }, b: { ok: 0, bad: 10 }, c: SICHER, d: {} };
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) {
    const r = [i / 20, j / 20];
    const ohne = pickWeighted(ITEMS, keyOf, notes, null, seq(...r)).k;
    assert.equal(pickWeighted(ITEMS, keyOf, notes, null, seq(...r), null).k, ohne);
    assert.equal(pickWeighted(ITEMS, keyOf, notes, null, seq(...r), "kein Tag").k, ohne);
  }
});
