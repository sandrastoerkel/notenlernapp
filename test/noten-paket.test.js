// Welle 12, Schritt 2: Paket-Gerüst „Noten lesen“ mit 15 Stufen im Zusammenspiel – Rechenkern noten-lage.js,
// Gerüste der Hilfen und Vorführungen, Kanten der anderen Pakete, Jahrgang, Karteikasten, eingeschaltete Umstellung
// (migrateNoten in migrateAll und fresh()) und alte Spielstände über load mit dem echten Paket (Zusagen 1 bis 5 aus
// PLAN Welle 12, Abschnitt 10, noch einmal gegen PACKS).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PACKS } from "../src/packs/index.js";
import noten from "../src/packs/noten.js";
import { lage, bezug, stammton, displayName, lageText, spruchId, SCHRITTE } from "../src/packs/noten-lage.js";
import { merkleiste, namensleiste, vorzeichenRegel } from "../src/packs/noten-hilfen.js";
import { lageDemo, zaehlDemo, vorzeichenDemo, boards } from "../src/packs/noten-demo.js";
import * as notenMod from "../src/packs/noten.js";
import { N, gName, helm, staffPos, dia, fromDia } from "../src/music.js";
import {
  fresh, load, isUnlocked, migrateAll, setKlasse, KEY_V2, KEY_V1, RENAMED_NOTEN, DRAN_NOTEN, BOX_NOTEN,
  MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_NOTEN, MIGRATION_WIEDERHOLEN, addDays,
} from "../src/store.js";
import { boxIds, inBox, needsOf } from "../src/repeat.js";
import { dranFor } from "../src/klasse.js";
import { setzeEigen } from "../src/sprueche.js";

const lv = (id) => PACKS.flatMap((p) => p.levels).find((l) => l.id === id);

/* ---------- Rechenkern ---------- */

test("noten-lage: lage für jede Note der Zeile, beide Schlüssel", () => {
  for (const [clef, from] of [["treble", N("E", 4)], ["bass", N("G", 2)]]) {
    for (let p = 0; p <= 8; p++) {
      const n = fromDia(dia(from) + p);
      const l = lage(n, clef);
      assert.equal(l.pos, p);
      assert.deepEqual(l, p % 2 === 0 ? { pos: p, art: "linie", nr: p / 2 + 1 } : { pos: p, art: "zwischenraum", nr: (p + 1) / 2 });
      // die Nummer steht wörtlich in lageText
      assert.ok(lageText(n, clef).startsWith(`${l.nr}. ${l.art === "linie" ? "Linie" : "Zwischenraum"} von unten`));
    }
  }
  assert.deepEqual(lage(N("C", 4), "treble"), { pos: -2, art: "unter", nr: null });
  assert.deepEqual(lage(N("C", 4), "bass"), { pos: 10, art: "ueber", nr: null });
  // jeder Knopf 1.–5. bzw. 1.–4. bei genau einer Note der Stufen 1, 2, 6, 7
  for (const no of [1, 2, 6, 7]) {
    const nrs = lv(`noten-${no}`).items.map((it) => lage(it.n, it.clef).nr);
    assert.deepEqual(nrs, Array.from({ length: nrs.length }, (_, i) => i + 1), `noten-${no}`);
  }
});

test("noten-lage: bezug für die Stufen 4 und 9 wie im Plan (nächste äußere Linie, Weg lückenlos im Alphabet)", () => {
  const want = {
    "noten-4": [["unterste", "e'", "E D"], ["unterste", "e'", "E D C"], ["oberste", "f''", "F G"], ["oberste", "f''", "F G A"]],
    "noten-9": [["unterste", "G", "G F"], ["unterste", "G", "G F E"], ["oberste", "a", "A H"], ["oberste", "a", "A H C"]],
  };
  for (const [id, rows] of Object.entries(want)) {
    lv(id).items.forEach((it, i) => {
      const b = bezug(it.n, it.clef);
      assert.deepEqual([b.linie, helm(b.ref), b.weg.map(gName).join(" ")], rows[i], `${id} ${helm(it.n)}`);
      assert.equal(staffPos(b.ref, it.clef), b.linie === "unterste" ? 0 : 8);
      assert.equal(b.richtung, b.linie === "unterste" ? "abwärts" : "aufwärts");
      // lückenlos: je eine Stelle weiter, vom Bezugston bis zur Note
      b.weg.forEach((w, k) => assert.equal(dia(w), dia(b.ref) + (b.richtung === "abwärts" ? -k : k)));
      assert.equal(dia(b.weg.at(-1)), dia(it.n));
    });
  }
  // in der Zeile kein Bezugston
  for (const no of [1, 2, 3, 6, 7, 8, 11, 13]) for (const it of lv(`noten-${no}`).items) assert.equal(bezug(it.n, it.clef), null);
});

test("noten-lage: Stammton, Namen, Spruch und Schritte", () => {
  for (const no of [11, 13]) for (const it of lv(`noten-${no}`).items) {
    const st = stammton(it.n);
    assert.equal(st.acc, 0); assert.equal(st.letter, it.n.letter); assert.equal(st.octave, it.n.octave);
    assert.equal(staffPos(st, it.clef), staffPos(it.n, it.clef));
    assert.equal(spruchId(it.n, it.clef), null);
  }
  assert.equal(gName(N("H", 2, -1)), "B");
  assert.equal(displayName(N("H", 2, -1)), "B (großes B)");
  assert.equal(displayName(N("F", 3, 1)), "Fis (fis)");
  // noten.js reicht die Funktionen weiter (gleiche Funktion)
  assert.equal(notenMod.displayName, displayName);
  assert.equal(notenMod.lageText, lageText);
  assert.equal(notenMod.spruchId, spruchId);
  assert.deepEqual(SCHRITTE.lage, ["1 · Lage", "2 · Name"]);
  assert.deepEqual(SCHRITTE.zaehlen, ["1 · Bezugston", "2 · Zählen"]);
  assert.deepEqual(SCHRITTE.vorzeichen, ["1 · Stammton", "2 · Vorzeichen"]);
});

/* ---------- Gerüste ---------- */

test("Gerüst der Hilfen: gültiges HTML, gleich für alle Aufgaben, eigener Spruch maskiert", () => {
  const s = fresh();
  assert.ok(merkleiste("treble", "linien", s).includes("Es Geht Hurtig Durch Fleiß"));
  assert.ok(merkleiste("bass", "raeume", s).includes("Alle Clowns Essen Gern"));
  setzeEigen(s, "violin-linien", "Ein <Grüner> Hase Döst Friedlich");
  const h = merkleiste("treble", "linien", s);
  assert.ok(h.includes("&lt;Grüner&gt;") && !h.includes("<Grüner>"));
  assert.ok(namensleiste().includes("C D E F G A H C"));
  for (const w of ["Es", "As", "B", "Fis", "Des"]) assert.ok(vorzeichenRegel().includes(w), w);
  // je Stufe dieselbe Hilfe für jede Aufgabe (hängt nicht von der Aufgabe ab)
  for (const l of noten.levels.filter((x) => x.helps)) {
    const t = typeof l.helpTable === "function" ? l.helpTable({ state: s }) : l.helpTable;
    assert.ok(!/mark|hit|s1|s2/.test(t), `${l.id}: keine Hervorhebung`);
  }
});

test("Gerüst der Vorführungen und Lerntafeln", () => {
  for (const [f, steps] of [[(n, c) => lageDemo(n, c), SCHRITTE.lage], [(n, c) => zaehlDemo(n, n, c), SCHRITTE.zaehlen], [(n, c) => vorzeichenDemo(n, c), SCHRITTE.vorzeichen]]) {
    const d = f(N("F", 4, 1), "treble");
    assert.deepEqual(d.steps, [...steps]);
    assert.equal(d.frames[0].step, 0);
    assert.equal(d.frames.at(-1).result.title, "Fis (fis')");
    assert.deepEqual(d.frames.at(-1).tones, [N("F", 4, 1)]);
  }
  // Stufen mit Hilfen: die Vorführung passt zur Art der Stufe
  const art = { 1: "lage", 2: "lage", 6: "lage", 7: "lage", 4: "zaehlen", 9: "zaehlen", 11: "vorzeichen", 13: "vorzeichen" };
  for (const [no, a] of Object.entries(art)) {
    const l = lv(`noten-${no}`), it = l.items[0];
    assert.deepEqual(l.demo({ note: it.n, clef: it.clef }).steps, [...SCHRITTE[a]], l.id);
  }
  // Lerntafeln: seit Schritt 5 fünf je Schlüssel, „Merkhilfen“ an zweiter Stelle mit der Tafel aus noten.js
  const b = boards((clef) => `<div>${clef}</div>`);
  assert.deepEqual(b.filter((c) => c.title === "Merkhilfen").map((c) => c.clef), ["treble", "bass"]);
  assert.equal(b.filter((c) => c.clef === "bass")[1].render({ state: fresh() }), "<div>bass</div>");
  assert.deepEqual(noten.learn.map((c) => [c.title, c.clef]), b.map((c) => [c.title, c.clef]));
});

/* ---------- Kanten, Kasten, Jahrgang ---------- */

test("Kanten auf „Noten lesen“ aus den anderen Paketen: die ganze Tabelle (Abschnitt 7)", () => {
  const edges = {};
  for (const p of PACKS) {
    if (p.id === "noten") continue;
    for (const l of p.levels) {
      const t = [...new Set([...needsOf(PACKS, l.id), ...(l.stepNeeds || []).flat()])].filter((id) => id.startsWith("noten-"));
      if (t.length) edges[l.id] = t;
    }
  }
  assert.deepEqual(edges, {
    "intervall-1": ["noten-5"], "intervall-2": ["noten-5", "noten-10"], "intervall-3": ["noten-12"],
    "intervall-4": ["noten-12", "noten-14"], "intervall-8": ["noten-12"], "intervall-9": ["noten-12"],
    "tonleitern-1": ["noten-5", "noten-10"], "tonleitern-2": ["noten-12"], "tonleitern-3": ["noten-12", "noten-14"],
    "tonleitern-4": ["noten-12"], "tonleitern-5": ["noten-12", "noten-14"],
    "akkorde-1": ["noten-15"], "akkorde-3": ["noten-15"],
  });
  assert.deepEqual(lv("tonleitern-4").stepNeeds, [["tonleitern-3"], ["noten-12"]]);
  // jedes Ziel ohne Hilfen
  for (const ids of Object.values(edges)) for (const id of ids) assert.ok(inBox(lv(id)), id);
});

test("Korrektur nach der Prüfung (B1): Fehlermuster der Stufen 4 und 9 am ersten Schritt (Bezugston), Weiterzählen ohne Muster", async () => {
  const { resultBasics } = await import("../src/views/practice.js");
  const NB = "\u00a0";
  const log = (id, list) => list.map((oks) => ({ id, ok: oks.every(Boolean), oks }));
  for (const [no, grund, schluessel] of [[4, 3, "Violinschlüssel"], [9, 8, "Bassschlüssel"]]) {
    const l = lv(`noten-${no}`);
    assert.deepEqual(l.stepNeeds, [[`noten-${grund}`], []], l.id);
    // dreimal der erste Schritt daneben: Muster mit der Grundlage Linien und Zwischenräume
    let r = resultBasics(PACKS, noten, l, 7, log(l.id, [[false, true], [false, true], [false, true]]));
    assert.equal(r.gaps.length, 1, l.id);
    assert.equal(r.gaps[0].text, `Der erste Schritt (Linien und Zwischenräume im ${schluessel}) hat oft nicht geklappt. Das übst du in Noten lesen, Stufe${NB}${grund}.`);
    assert.deepEqual(r.only, [`noten-${grund}`]);
    // dreimal nur das Weiterzählen daneben: kein Muster (neu in der Stufe)
    r = resultBasics(PACKS, noten, l, 7, log(l.id, [[true, false], [true, false], [true, false]]));
    assert.deepEqual(r.gaps, [], l.id);
  }
});

test("Karteikasten 30 Stufen, App 54 Stufen (162 Sterne), Jahrgang 5 öffnet alle 15", () => {
  assert.equal(boxIds(PACKS).length, 30);
  assert.deepEqual(boxIds([noten]), ["noten-3", "noten-5", "noten-8", "noten-10", "noten-12", "noten-14", "noten-15"]);
  const all = PACKS.flatMap((p) => p.levels);
  assert.equal(all.length, 54);
  assert.equal(all.length * 3, 162);
  for (const j of [5, 6, 7, 13]) {
    assert.equal(dranFor(j).noten, 15);
    const s = setKlasse(fresh(), { jahrgang: j, zweig: null, dran: dranFor(j) });
    for (const l of noten.levels) assert.ok(isUnlocked(s, noten, l.id), `${j}: ${l.id}`);
  }
  // ohne Jahrgang streng der Reihe nach: nur Stufe 1 offen
  assert.deepEqual(noten.levels.filter((l) => isUnlocked(fresh(), noten, l.id)).map((l) => l.id), ["noten-1"]);
});

/* ---------- Umstellung eingeschaltet ---------- */

function memStorage(init = {}) {
  const data = { ...init };
  let writes = 0;
  return { data, get writes() { return writes; }, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { writes++; data[k] = String(v); } };
}
const BOX = boxIds(PACKS);
const OLD_PACK = { id: "noten", levels: Array.from({ length: 8 }, (_, i) => ({ id: `noten-${i + 1}`, no: i + 1 })) };
const VOR_W12 = [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_WIEDERHOLEN];
const HEUTE = "2026-11-26", NOW = new Date("2026-11-26T12:00:00");

test("fresh() und migrateAll: Marker eingeschaltet, Reihenfolge Umbenennungen → noten-neu → wiederholen", () => {
  assert.deepEqual(fresh().migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_NOTEN, MIGRATION_WIEDERHOLEN]);
  assert.equal(migrateAll(fresh(), BOX, HEUTE, 0), false);
  const s = { ...fresh(), migrated: [], rep: undefined, levels: { "noten-3": { stars: 2, best: 8, played: 1 } } };
  assert.equal(migrateAll(s, BOX, HEUTE, 0), true);
  assert.deepEqual(s.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_NOTEN, MIGRATION_WIEDERHOLEN]);
  // migrateWiederholen lief nach migrateNoten: der Eintrag steht unter der neuen ID
  assert.deepEqual(Object.keys(s.levels), ["noten-5"]);
  assert.deepEqual(Object.keys(s.rep), ["noten-5"]);
});

// Fortschritt aus einer Zahl zur Basis 3 (wie test/noten-umstellung.test.js): 0 nie gespielt, 1 mit 5, 2 mit 8
function levelsOf(code) {
  const levels = {};
  for (let i = 0; i < 8; i++) {
    const d = Math.floor(code / 3 ** i) % 3;
    if (d) levels[`noten-${i + 1}`] = { stars: d, best: d === 1 ? 5 : 8, played: i + 1, last: d === 1 ? 5 : 8, day: addDays(HEUTE, -i) };
  }
  levels["intervall-2"] = { stars: 3, best: 10, played: 2 };
  return levels;
}

test("load mit dem echten Paket: alte Stände (alle 3⁸) – Sterne bleiben, was offen war, bleibt offen, Kasten, zweites Laden", () => {
  for (let code = 0; code < 3 ** 8; code++) {
    const levels = levelsOf(code);
    const rep = { "noten-3": { fach: 2, faellig: HEUTE, zuletzt: addDays(HEUTE, -3) }, "noten-1": { fach: 3, faellig: HEUTE, zuletzt: null }, "noten-2": { fach: 1, faellig: addDays(HEUTE, 1), zuletzt: null } };
    const old = { ...fresh(), migrated: VOR_W12, levels, rep, current: `noten-${(code % 8) + 1}`, klasseOffen: { noten: code % 9 } };
    const before = structuredClone(old);
    const st = memStorage({ [KEY_V2]: JSON.stringify(old) });
    const s = load(st, NOW, BOX);
    // 1. Sterne, beste Runde, Runden: jede alte Stufe unter der neuen ID gleich
    for (const [id, e] of Object.entries(levels)) assert.deepEqual(s.levels[RENAMED_NOTEN[id] || id], e, `${code} ${id}`);
    // 2. was nach der alten Regel offen war (mit der Marke), ist danach offen – im echten Paket
    for (const l of OLD_PACK.levels) {
      if (isUnlocked(before, OLD_PACK, l.id)) assert.ok(isUnlocked(s, noten, RENAMED_NOTEN[l.id]), `${code}: ${l.id} → ${RENAMED_NOTEN[l.id]}`);
    }
    // 3. Kasten: nur Stufen ohne Hilfen, die es gibt; das Paar 1 + 2 → 3, alt 3 → 5
    for (const id of Object.keys(s.rep)) assert.ok(BOX.includes(id), `${code}: ${id}`);
    assert.deepEqual(Object.keys(s.rep).sort(), ["noten-3", "noten-5"]);
    assert.deepEqual(s.rep["noten-5"], rep["noten-3"]);
    assert.deepEqual(s.rep["noten-3"], { fach: 1, faellig: HEUTE, zuletzt: null });
    // 4. Jahrgangs-Marke nach DRAN_NOTEN
    assert.equal(s.klasseOffen.noten, DRAN_NOTEN[code % 9]);
    // current auf der neuen Nummer
    assert.equal(s.current, RENAMED_NOTEN[old.current]);
    // 5. einmal gespeichert; zweites Laden ändert nichts und speichert nicht
    assert.equal(st.writes, 1);
    const again = load(st, NOW, BOX);
    assert.deepEqual(again, s);
    assert.equal(st.writes, 1);
  }
});

// Prüfung Schritt 2: Im Test oben hängt die Marke am Fortschritt (code % 9) und der Kasten ist immer derselbe. Hier
// deshalb Zusage 2 über alle 3⁸ Stände × Marke 0 … 8 × unlockAll aus/an und Zusage 3 über alle 2⁸ Teilmengen von
// Kasten-Einträgen – beides mit dem echten Paket über migrateAll (Reihenfolge wie beim Laden).
test("Echtes Paket: was offen war, bleibt offen – alle 3⁸ Stände × Marke 0 … 8 × unlockAll", () => {
  let offen = 0;
  for (let code = 0; code < 3 ** 8; code++) {
    const levels = levelsOf(code);
    for (let marke = 0; marke <= 8; marke++) for (const unlockAll of [false, true]) {
      const old = { ...fresh(), migrated: VOR_W12, levels, unlockAll, klasseOffen: marke ? { noten: marke } : {} };
      const war = OLD_PACK.levels.filter((l) => isUnlocked(old, OLD_PACK, l.id)).map((l) => l.id);
      const s = structuredClone(old);
      migrateAll(s, BOX, HEUTE, 0);
      for (const id of war) assert.ok(isUnlocked(s, noten, RENAMED_NOTEN[id]), `${code}/${marke}/${unlockAll}: ${id} → ${RENAMED_NOTEN[id]}`);
      offen += war.length;
      // der Merker offen zählt nirgends als gespielt
      for (const e of Object.values(s.levels)) if (e.offen) assert.equal(e.played, 0);
    }
  }
  assert.ok(offen > 3 ** 8 * 18, "die Prüfung hat etwas geprüft");
});

test("Echtes Paket: Karteikasten für alle 2⁸ Teilmengen – nur Stufen ohne Hilfen, die es gibt; andere Pakete unverändert", () => {
  const eintrag = (i) => ({ fach: (i % 5) + 1, faellig: addDays(HEUTE, i - 3), zuletzt: addDays(HEUTE, -i) });
  const fremd = { "intervall-2": { fach: 4, faellig: addDays(HEUTE, 9), zuletzt: HEUTE }, "tonleitern-5": { fach: 1, faellig: HEUTE, zuletzt: null } };
  for (let m = 0; m < 2 ** 8; m++) {
    const rep = { ...fremd };
    for (let i = 1; i <= 8; i++) if (m & (1 << (i - 1))) rep[`noten-${i}`] = eintrag(i);
    const s = { ...fresh(), migrated: VOR_W12, rep: structuredClone(rep) };
    migrateAll(s, BOX, HEUTE, 0);
    const want = { ...fremd };
    for (const [alt, neu] of Object.entries(BOX_NOTEN)) if (rep[alt]) want[neu] = rep[alt];
    for (const [a, b, neu] of [["noten-1", "noten-2", "noten-3"], ["noten-4", "noten-5", "noten-8"]]) {
      if (!rep[a] || !rep[b]) continue;
      // Paar: kleineres Fach, frühere Fälligkeit, späteres „zuletzt“ (Abschnitt 10)
      want[neu] = { fach: Math.min(rep[a].fach, rep[b].fach), faellig: [rep[a].faellig, rep[b].faellig].sort()[0], zuletzt: [rep[a].zuletzt, rep[b].zuletzt].sort()[1] };
    }
    assert.deepEqual(s.rep, want, `Teilmenge ${m}`);
    for (const id of Object.keys(s.rep)) assert.ok(BOX.includes(id) && inBox(lv(id)), `${m}: ${id}`);
  }
});

test("load: v1-Stand (alte Nummern) und Stand von vor Welle 11 landen auf den neuen Stufen", () => {
  const v1 = memStorage({ [KEY_V1]: JSON.stringify({ xp: 40, levels: { 3: { stars: 2, best: 8, played: 1 }, 6: { stars: 3, best: 10, played: 2 } }, current: 6 }) });
  const s = load(v1, NOW, BOX);
  // alt 7 war offen (alt 6 geschafft), nie gespielt: Merker offen unter noten-12 (davor steht die neue Stufe 11)
  assert.deepEqual(Object.keys(s.levels).sort(), ["noten-10", "noten-12", "noten-5"]);
  assert.deepEqual(s.levels["noten-12"], { stars: 0, best: 0, played: 0, offen: true });
  assert.ok(isUnlocked(s, noten, "noten-12"));
  assert.equal(s.current, "noten-10");
  assert.deepEqual(Object.keys(s.rep).sort(), ["noten-10", "noten-5"]);
  assert.ok(s.migrated.includes(MIGRATION_NOTEN) && s.migrated.includes(MIGRATION_WIEDERHOLEN));
  // vor Welle 11: drei Marker, kein Kasten; alt 1–8 geschafft → Kasten nur für 3, 6, 7, 8 (neu 5, 10, 12, 15)
  const w = memStorage({ [KEY_V2]: JSON.stringify({ xp: 1, migrated: VOR_W12.slice(0, 3), levels: Object.fromEntries(OLD_PACK.levels.map((l) => [l.id, { stars: 3, best: 9, played: 1 }])) }) });
  const t = load(w, NOW, BOX);
  assert.deepEqual(Object.keys(t.rep), Object.values(BOX_NOTEN));
  // die neuen Stufen 3, 4, 8, 9, 11, 13, 14 sind noch nie gespielt; offen sind 3 (2 geschafft), 8 (7 geschafft) …
  for (const id of ["noten-1", "noten-2", "noten-3", "noten-5", "noten-6", "noten-7", "noten-8", "noten-10", "noten-12", "noten-15"]) assert.ok(isUnlocked(t, noten, id), id);
  // … und die neuen Stufen nach geschafften Vorgängern (4 nach 3 erst, wenn 3 geschafft ist – bewusst hingenommen)
  assert.ok(!isUnlocked(t, noten, "noten-4") && !isUnlocked(t, noten, "noten-9"));
});
