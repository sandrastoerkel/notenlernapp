import { test } from "node:test";
import assert from "node:assert/strict";
import {
  status, weight, pickWeighted, countUnsure, MIN_ANTWORTEN, QUOTE_SICHER, LANGSAM_SEK, ANTEIL_ZUFALL, GEWICHT,
} from "../src/adapt.js";

// Zufallsfolge aus festen Werten (wiederholt sich)
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
// Gleichmäßig verteilte, aber feste Folge für Häufigkeitstests
const lcg = (seed = 1) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

test("Startwerte", () => {
  assert.equal(MIN_ANTWORTEN, 6); assert.equal(QUOTE_SICHER, 0.7); assert.equal(LANGSAM_SEK, 4); assert.equal(ANTEIL_ZUFALL, 0.3);
  assert.deepEqual(GEWICHT, { neu: 2, unsicher: 4, langsam: 2, sicher: 1 });
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
