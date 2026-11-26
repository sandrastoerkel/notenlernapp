// Welle 12, Schritt 1: Umstellung „Noten lesen“ von 8 auf 15 Stufen (migrateNoten, PLAN Welle 12, Abschnitt 10).
// Seit Schritt 2 eingeschaltet (fresh() trägt den Marker, migrateAll ruft migrateNoten). Getestet wird gegen Stummel des alten (8 Stufen der Reihe nach) und des neuen Pakets (15 Stufen der Reihe nach,
// Hilfen in 1, 2, 4, 6, 7, 9, 11, 13). Die fünf Zusagen aus Abschnitt 10 über alle Zustände, nicht über Beispiele.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fresh, migrateV1, isUnlocked, migrateIntervalle, migrateTonleitern, migrateNotenwerte, migrateWiederholen,
  migrateKlasseOffen, migrateNoten, MIGRATION_NOTEN, RENAMED_NOTEN, DRAN_NOTEN, BOX_NOTEN, PAARE_NOTEN,
  MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_WIEDERHOLEN, RENAMED_TONLEITERN,
  RENAMED_NOTENWERTE, UMSTELLUNG_JE_TAG, addDays, setKlasse, clearKlasse, reset, klasseOffenBis, recordRound,
} from "../src/store.js";
import { boxIds, inBox, basicsOffer } from "../src/repeat.js";
import { levelGroups } from "../src/views/stats.js";

const OLD = { id: "noten", levels: Array.from({ length: 8 }, (_, i) => ({ id: `noten-${i + 1}`, no: i + 1 })) };
const HILFEN = [1, 2, 4, 6, 7, 9, 11, 13];
const NEW = {
  id: "noten",
  levels: Array.from({ length: 15 }, (_, i) => ({ id: `noten-${i + 1}`, no: i + 1, ...(HILFEN.includes(i + 1) ? { helps: ["tabelle"] } : {}) })),
};
const NEW_IDS = new Set(NEW.levels.map((l) => l.id));
const NEW_BOX = boxIds([NEW]);
const OLD_IDS = OLD.levels.map((l) => l.id);
const NOTEN_MARKER = [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_WIEDERHOLEN];
const HEUTE = "2026-11-26";
const nr = (id) => Number(id.slice(6));
const isNoten = (id) => /^noten-\d+$/.test(id);

// Stand vor Welle 12: alle Marker außer "noten-neu" (wie fresh() bis Schritt 2), dazu noch Einträge anderer Pakete
function oldState(extra = {}) {
  const s = Object.assign(fresh(), extra);
  s.migrated = s.migrated.filter((m) => m !== MIGRATION_NOTEN);
  return s;
}

// Fortschritt aus einer Zahl zur Basis 3: je alte Stufe 0 = nie gespielt, 1 = gespielt mit 5, 2 = gespielt mit 8.
// Jeder Eintrag trägt alle Felder (stars, best, played, last, day), damit man sieht, dass er als Ganzes wandert.
function levelsOf(code) {
  const levels = {};
  for (let i = 0; i < 8; i++) {
    const d = Math.floor(code / 3 ** i) % 3;
    if (d === 0) continue;
    const best = d === 1 ? 5 : 8;
    levels[`noten-${i + 1}`] = { stars: d, best, played: i + 2, last: best - 1, day: addDays(HEUTE, -i) };
  }
  // ein anderes Paket bleibt, wie es ist
  levels["notenwerte-3"] = { stars: 3, best: 10, played: 4 };
  return levels;
}
const ALLE = Array.from({ length: 3 ** 8 }, (_, c) => c);

test("Umstellung Noten: Tabellen wie im Plan", () => {
  assert.equal(MIGRATION_NOTEN, "noten-neu");
  assert.deepEqual(Object.entries(RENAMED_NOTEN).map(([a, b]) => [nr(a), nr(b)]),
    [[1, 1], [2, 2], [3, 5], [4, 6], [5, 7], [6, 10], [7, 12], [8, 15]]);
  assert.deepEqual(DRAN_NOTEN, { 0: 0, 1: 1, 2: 3, 3: 5, 4: 6, 5: 8, 6: 10, 7: 12, 8: 15 });
  assert.deepEqual(BOX_NOTEN, { "noten-3": "noten-5", "noten-6": "noten-10", "noten-7": "noten-12", "noten-8": "noten-15" });
  assert.deepEqual(PAARE_NOTEN, [["noten-1", "noten-2", "noten-3"], ["noten-4", "noten-5", "noten-8"]]);
  // Stummel: 15 Stufen, im Kasten 3, 5, 8, 10, 12, 14, 15; jedes Bild einer Kasten-Stufe ist wieder im Kasten
  assert.deepEqual(NEW_BOX.map(nr), [3, 5, 8, 10, 12, 14, 15]);
  for (const to of [...Object.values(BOX_NOTEN), ...PAARE_NOTEN.map((p) => p[2])]) assert.ok(NEW_BOX.includes(to), to);
  // jede alte Stufe landet auf einer neuen, keine zwei auf derselben; DRAN_NOTEN deckt jede Umbenennung ab
  assert.equal(new Set(Object.values(RENAMED_NOTEN)).size, 8);
  for (const [a, b] of Object.entries(RENAMED_NOTEN)) {
    assert.ok(NEW_IDS.has(b));
    assert.ok(DRAN_NOTEN[nr(a)] >= nr(b), `dran ${nr(a)} öffnet ${b}`);
  }
  // seit Schritt 2 eingeschaltet: ein frischer Stand trägt den Marker (er braucht die Umstellung nicht)
  assert.ok(fresh().migrated.includes(MIGRATION_NOTEN));
});

test("Zusage 1: Sterne, beste Runde und Runden bleiben – alle 3⁸ Stände", () => {
  for (const code of ALLE) {
    const levels = levelsOf(code);
    const s = oldState({ levels: structuredClone(levels) });
    assert.equal(migrateNoten(s), true);
    for (const id of OLD_IDS) {
      if (levels[id]) assert.deepEqual(s.levels[RENAMED_NOTEN[id]], levels[id], `${code} ${id}`);
    }
    assert.deepEqual(s.levels["notenwerte-3"], levels["notenwerte-3"]);
    const sum = (lv, f) => Object.entries(lv).filter(([id]) => isNoten(id)).reduce((a, [, e]) => a + (e[f] || 0), 0);
    for (const f of ["stars", "played"]) assert.equal(sum(s.levels, f), sum(levels, f), `${code} ${f}`);
    // kein alter Schlüssel bleibt stehen, der nicht auch ein Bild ist; jeder sonstige Eintrag ist ein Merker offen
    const bilder = new Set(OLD_IDS.filter((id) => levels[id]).map((id) => RENAMED_NOTEN[id]));
    for (const [id, e] of Object.entries(s.levels)) {
      if (!isNoten(id)) continue;
      assert.ok(NEW_IDS.has(id), id);
      if (!bilder.has(id)) assert.deepEqual(e, { stars: 0, best: 0, played: 0, offen: true }, `${code} ${id}`);
    }
  }
});

test("Zusage 2: Was offen war, bleibt offen – alle 3⁸ Stände × Jahrgang 0 … 8 (Marke oder dran) × unlockAll", () => {
  let n = 0;
  for (const code of ALLE) for (let k = 0; k <= 8; k++) for (const quelle of ["marke", "dran"]) for (const unlockAll of [false, true]) {
    if (quelle === "dran" && k === 0) continue; // dran 0 = ohne Jahrgang, schon in "marke" 0
    const s = oldState({ levels: levelsOf(code), unlockAll });
    if (quelle === "marke") s.klasseOffen = { noten: k, intervalle: 3 };
    else s.klasse = { jahrgang: 5, zweig: null, dran: { noten: k, notenwerte: 4 } };
    const offen = OLD_IDS.filter((id) => isUnlocked(s, OLD, id));
    const gespielt = new Set(OLD_IDS.filter((id) => (s.levels[id] || {}).played > 0));
    migrateNoten(s);
    for (const id of offen) assert.ok(isUnlocked(s, NEW, RENAMED_NOTEN[id]), `${code} ${quelle} ${k} ${unlockAll} ${id}`);
    // nach Schritt 2 läuft migrateKlasseOffen danach (hebt die Marke auf dran): es bleibt offen
    migrateKlasseOffen(s);
    for (const id of offen) assert.ok(isUnlocked(s, NEW, RENAMED_NOTEN[id]));
    // auch „Jahrgang entfernen“ danach schließt nichts (Hochwassermarke)
    clearKlasse(s);
    for (const id of offen) assert.ok(isUnlocked(s, NEW, RENAMED_NOTEN[id]));
    // Merker offen nur auf Bildern alter offener, nie gespielter Stufen (die Umstellung öffnet nichts dazu)
    for (const [id, e] of Object.entries(s.levels)) {
      if (!e.offen) continue;
      const alt = OLD_IDS.find((o) => RENAMED_NOTEN[o] === id);
      assert.ok(alt && !gespielt.has(alt), `${code} ${id}`);
      assert.ok(isUnlocked({ ...oldState({ levels: levelsOf(code) }) }, OLD, alt), `${code} ${id} war ohne Jahrgang offen`);
      assert.ok([5, 10, 12, 15].includes(nr(id)), id);
    }
    n++;
  }
  assert.equal(n, 3 ** 8 * (9 + 8) * 2);
});

test("Merker offen: genau alt 3, 6, 7, 8, wenn offen und nie gespielt; neue Stufen davor bleiben zu (bewusst hingenommen)", () => {
  // alt 1 und 2 geschafft, alt 3 offen, nie gespielt
  const s = oldState({ levels: { "noten-1": { stars: 2, best: 8, played: 1 }, "noten-2": { stars: 3, best: 9, played: 2 } } });
  migrateNoten(s);
  assert.deepEqual(s.levels["noten-5"], { stars: 0, best: 0, played: 0, offen: true });
  assert.ok(isUnlocked(s, NEW, "noten-3"), "Linien und Zwischenräume: 2 ist geschafft");
  assert.ok(!isUnlocked(s, NEW, "noten-4"), "über und unter der Zeile: 3 noch nicht geschafft");
  assert.ok(isUnlocked(s, NEW, "noten-5"));
  assert.ok(!isUnlocked(s, NEW, "noten-6"));
  // alle acht geschafft: kein Merker, alle Bilder offen; neu 4, 9, 14 zu (Stufe davor neu), 3, 8, 11, 13 offen (Stufe
  // davor ist ein Bild und geschafft)
  const t = oldState({ levels: Object.fromEntries(OLD_IDS.map((id) => [id, { stars: 3, best: 10, played: 1 }])) });
  migrateNoten(t);
  assert.ok(!Object.values(t.levels).some((e) => e.offen));
  assert.deepEqual(NEW.levels.filter((l) => !isUnlocked(t, NEW, l.id)).map((l) => l.no), [4, 9, 14]);
  // nichts gespielt: kein Merker (alt 1 bleibt als neue 1 offen)
  const u = oldState();
  migrateNoten(u);
  assert.deepEqual(u.levels, {});
  assert.deepEqual(NEW.levels.filter((l) => isUnlocked(u, NEW, l.id)).map((l) => l.no), [1]);
  // ein vorhandener, nie gespielter Eintrag behält seine Felder und bekommt den Merker dazu
  const v = oldState({ levels: { "noten-2": { stars: 3, best: 8, played: 1 }, "noten-3": { stars: 0, best: 0, played: 0, x: 1 } } });
  migrateNoten(v);
  assert.deepEqual(v.levels["noten-5"], { stars: 0, best: 0, played: 0, x: 1, offen: true });
});

test("Merker offen zählt nirgends als gespielt; Zurücksetzen löscht ihn; eine Runde behält ihn harmlos", () => {
  // alt 6 geschafft, alt 7 offen und nie gespielt → Merker auf neu 12
  const s = oldState({ levels: { "noten-6": { stars: 1, best: 8, played: 3 } } });
  migrateNoten(s);
  assert.ok(s.levels["noten-12"].offen && s.levels["noten-12"].played === 0);
  // Statistik: gespielt zählt nur played > 0
  const [g] = levelGroups([NEW], s.levels, s.rep, HEUTE);
  assert.equal(g.played, 1);
  assert.equal(g.stars, 1);
  assert.equal(g.rows.find((r) => r.id === "noten-12").played, 0);
  // „Grundlagen wiederholen“: eine Voraussetzung mit Merker gilt als „nie gespielt“
  const P = { id: "p", levels: [{ id: "p-1", no: 1, needs: ["noten-12"] }] };
  const offer = basicsOffer(s, [NEW, P], "p-1", HEUTE);
  assert.deepEqual(offer.reason, { kind: "nie", id: "noten-12" });
  // Karteikasten: die Umstellung "wiederholen" legt für den Merker keinen Eintrag an (best 0), nur für neu 10 (alt 6)
  const w = structuredClone(s); w.migrated = w.migrated.filter((m) => m !== MIGRATION_WIEDERHOLEN); w.rep = {};
  migrateWiederholen(w, NEW_BOX, HEUTE, 0);
  assert.deepEqual(Object.keys(w.rep), ["noten-10"]);
  // Zurücksetzen: weg, wie alles Erspielte
  const r = reset(s);
  assert.deepEqual(r.levels, {});
  assert.ok(!isUnlocked(r, NEW, "noten-12"));
  // eine Runde danach: Eintrag zählt normal weiter, der Merker stört nicht
  recordRound(s, "noten-12", 6, new Date("2026-11-26T10:00:00Z"));
  assert.equal(s.levels["noten-12"].played, 1);
  assert.ok(isUnlocked(s, NEW, "noten-12"));
  // nur true öffnet
  assert.ok(!isUnlocked({ ...fresh(), levels: { "noten-14": { offen: "ja" } } }, NEW, "noten-14"));
  assert.ok(isUnlocked({ ...fresh(), levels: { "noten-14": { offen: true } } }, NEW, "noten-14"));
});

// Karteikasten: Einträge mit verschiedenen Fächern und Tagen, drei Belegungen (damit beim Paar beide Reihenfolgen
// von Fach, Fälligkeit und „zuletzt“ vorkommen, auch zuletzt: null aus der Umstellung "wiederholen")
const PROFILE = [
  (i) => ({ fach: (i % 5) + 1, faellig: addDays(HEUTE, 3 * i - 7), zuletzt: i % 3 === 0 ? null : addDays(HEUTE, -i) }),
  (i) => ({ fach: 5 - (i % 5), faellig: addDays(HEUTE, 10 - 2 * i), zuletzt: i % 2 ? null : addDays(HEUTE, i - 9) }),
  (i) => ({ fach: 1 + (i % 2), faellig: addDays(HEUTE, i), zuletzt: addDays(HEUTE, i % 4 - 4) }),
];
const ANDERE_REP = { "intervall-2": { fach: 3, faellig: HEUTE, zuletzt: null }, "notenwerte-5": { fach: 1, faellig: "2026-11-30", zuletzt: HEUTE } };

test("Zusage 3: Karteikasten – alle 2⁸ Teilmengen × drei Belegungen", () => {
  for (const prof of PROFILE) for (let mask = 0; mask < 256; mask++) {
    const rep = { ...structuredClone(ANDERE_REP) };
    for (let i = 0; i < 8; i++) if (mask & (1 << i)) rep[`noten-${i + 1}`] = prof(i);
    const s = oldState({ rep: structuredClone(rep) });
    migrateNoten(s);
    const has = (i) => !!(mask & (1 << (i - 1)));
    const want = { ...ANDERE_REP };
    for (const [a, b] of Object.entries(BOX_NOTEN)) if (rep[a]) want[b] = rep[a];
    for (const [a, b, to] of PAARE_NOTEN) {
      if (!(has(nr(a)) && has(nr(b)))) continue;
      const x = rep[a], y = rep[b];
      const z = [x.zuletzt, y.zuletzt].filter(Boolean).sort().pop() || null;
      want[to] = { fach: Math.min(x.fach, y.fach), faellig: [x.faellig, y.faellig].sort()[0], zuletzt: z };
    }
    assert.deepEqual(s.rep, want, `mask ${mask}`);
    // kein Eintrag auf einer Stufe mit Hilfen oder einer ID, die es nicht gibt
    for (const id of Object.keys(s.rep).filter(isNoten)) assert.ok(NEW_BOX.includes(id), `${mask} ${id}`);
    // jeder Eintrag einer alten Stufe ohne Hilfen im neuen Paket (3, 6, 7, 8) ist unverändert da
    for (const a of Object.keys(BOX_NOTEN)) if (rep[a]) assert.deepEqual(s.rep[BOX_NOTEN[a]], rep[a]);
  }
});

test("Zusage 3: basics wie levels, basicsOk wie der Kasten (beim Paar der frühere Tag) – alle 2⁸ Teilmengen", () => {
  for (let mask = 0; mask < 256; mask++) for (const dreh of [false, true]) {
    const day = (i) => addDays(HEUTE, dreh ? -i : i - 8);
    const basics = { "akkorde-1": HEUTE }, basicsOk = { "intervall-4": "2026-11-20" };
    for (let i = 0; i < 8; i++) if (mask & (1 << i)) { basics[`noten-${i + 1}`] = day(i); basicsOk[`noten-${i + 1}`] = day(i); }
    const s = oldState({ basics: { ...basics }, basicsOk: { ...basicsOk } });
    migrateNoten(s);
    const wb = { "akkorde-1": HEUTE };
    for (const [a, b] of Object.entries(RENAMED_NOTEN)) if (basics[a]) wb[b] = basics[a];
    assert.deepEqual(s.basics, wb);
    const wo = { "intervall-4": "2026-11-20" };
    for (const [a, b] of Object.entries(BOX_NOTEN)) if (basicsOk[a]) wo[b] = basicsOk[a];
    for (const [a, b, to] of PAARE_NOTEN) if (basicsOk[a] && basicsOk[b]) wo[to] = [basicsOk[a], basicsOk[b]].sort()[0];
    assert.deepEqual(s.basicsOk, wo, `mask ${mask}`);
  }
});

test("Zusage 4: Jahrgang – dran.noten und Marke 0 … 8 nach DRAN_NOTEN, die anderen Pakete bleiben", () => {
  for (let d = 0; d <= 8; d++) for (let m = 0; m <= 8; m++) {
    const dran = { noten: d, notenwerte: 7, intervalle: 2, tonleitern: 9, akkorde: 0 };
    const s = oldState({ klasse: { jahrgang: 6, zweig: "mug", dran: { ...dran } }, klasseOffen: { noten: m, tonleitern: 13 } });
    migrateNoten(s);
    assert.deepEqual(s.klasse, { jahrgang: 6, zweig: "mug", dran: { ...dran, noten: DRAN_NOTEN[d] } });
    assert.deepEqual(s.klasseOffen, { noten: DRAN_NOTEN[m], tonleitern: 13 });
    assert.equal(klasseOffenBis(s, "noten"), Math.max(DRAN_NOTEN[d], DRAN_NOTEN[m]));
    // danach wie bisher setKlasse mit einem neuen Link (neue Nummern): die Marke sinkt nicht
    setKlasse(s, { jahrgang: 5, zweig: null, dran: { noten: 1 } });
    assert.equal(klasseOffenBis(s, "noten"), Math.max(DRAN_NOTEN[d], DRAN_NOTEN[m], 1));
  }
  // ohne Jahrgang, ohne Marke, ohne Eintrag für „Noten lesen“: nichts wird angelegt
  for (const [klasse, klasseOffen] of [[null, {}], [{ jahrgang: 7, zweig: null, dran: { akkorde: 3 } }, { akkorde: 3 }]]) {
    const s = oldState({ klasse: structuredClone(klasse), klasseOffen: { ...klasseOffen } });
    migrateNoten(s);
    assert.deepEqual(s.klasse, klasse);
    assert.deepEqual(s.klasseOffen, klasseOffen);
  }
  // über 8 (gab es nicht) heißt alles → 15; unbrauchbare Werte bleiben, wie sie sind (klasseDran liest sie als 0)
  const s = oldState({ klasse: { jahrgang: 5, zweig: null, dran: { noten: 12 } }, klasseOffen: { noten: "x" } });
  migrateNoten(s);
  assert.equal(s.klasse.dran.noten, 15);
  assert.equal(s.klasseOffen.noten, "x");
});

// Reihenfolge von migrateAll (Abschnitt 10): drei Umbenennungen, migrateNoten, migrateWiederholen,
// migrateKlasseOffen. Hier von Hand nachgebaut; dass migrateAll dieselbe Folge hat, prüft test/noten-paket.test.js.
function kette(s, ids = NEW_BOX) {
  const r = [migrateIntervalle(s), migrateTonleitern(s), migrateNotenwerte(s), migrateNoten(s), migrateWiederholen(s, ids, HEUTE, 0), migrateKlasseOffen(s)];
  return r.some(Boolean);
}

test("Zusage 5: zweites Laufen ändert nichts – alle 3⁸ Stände, mit Kasten, Merkern und Jahrgang", () => {
  for (const code of ALLE) {
    const s = oldState({
      levels: levelsOf(code), current: `noten-${(code % 8) + 1}`,
      rep: { "noten-1": PROFILE[0](0), "noten-2": PROFILE[0](1), "noten-6": PROFILE[1](5) },
      basicsOk: { "noten-4": HEUTE }, basics: { "noten-8": HEUTE },
      klasse: { jahrgang: 5, zweig: null, dran: { noten: code % 9 } }, klasseOffen: { noten: (code >> 3) % 9 },
    });
    assert.equal(migrateNoten(s), true);
    const nach = JSON.stringify(s);
    assert.equal(migrateNoten(s), false, "Marker: läuft nur einmal");
    assert.equal(JSON.stringify(s), nach);
    assert.equal(s.migrated.filter((m) => m === MIGRATION_NOTEN).length, 1);
  }
});

test("Zusage 5: current für alle acht alten Werte, andere Pakete und Unbekanntes bleiben", () => {
  for (let i = 1; i <= 8; i++) {
    const s = oldState({ current: `noten-${i}` });
    migrateNoten(s);
    assert.equal(s.current, RENAMED_NOTEN[`noten-${i}`]);
  }
  for (const c of ["intervall-3", "tonleitern-11", "notenwerte-9", "akkorde-2", "noten-99", undefined, null]) {
    const s = oldState({ current: c });
    migrateNoten(s);
    assert.equal(s.current, c);
  }
});

test("Zusage 5: v1-Stand landet auf den neuen Nummern (migrateV1 nimmt den Marker heraus)", () => {
  for (let code = 0; code < 3 ** 8; code += 37) {
    const v1levels = {};
    for (const [id, e] of Object.entries(levelsOf(code))) if (isNoten(id)) v1levels[nr(id)] = e;
    for (let cur = 1; cur <= 8; cur++) {
      // auch wenn fresh() den Marker später trägt (Schritt 2): migrateV1 entfernt ihn
      const s = migrateV1({ levels: structuredClone(v1levels), current: cur, xp: 120 });
      assert.ok(!s.migrated.includes(MIGRATION_NOTEN) && !s.migrated.includes(MIGRATION_WIEDERHOLEN));
      kette(s);
      assert.equal(s.current, RENAMED_NOTEN[`noten-${cur}`]);
      for (const [k, e] of Object.entries(v1levels)) assert.deepEqual(s.levels[RENAMED_NOTEN[`noten-${k}`]], e);
      // Kasten nur auf neuen Stufen ohne Hilfen, nur für geschaffte alte 3, 6, 7, 8
      const want = Object.entries(BOX_NOTEN).filter(([a]) => (v1levels[nr(a)] || {}).best >= 8).map(([, b]) => b);
      assert.deepEqual(Object.keys(s.rep).sort(), want.sort());
      assert.equal(s.xp, 120);
      assert.ok(s.migrated.includes(MIGRATION_NOTEN) && s.migrated.includes(MIGRATION_WIEDERHOLEN));
    }
  }
  // migrateV1 entfernt den Marker auch, wenn fresh() ihn trägt (Schritt 2). fresh() lässt sich hier nicht ersetzen;
  // nachgestellt über ein Feld migrated im v1-Stand (Object.assign legt es über das aus fresh()): Der Filter nimmt
  // "noten-neu" und "wiederholen" heraus, die anderen Marker bleiben.
  const s = migrateV1({ levels: { 3: { stars: 2, best: 8, played: 1 } }, current: 3, migrated: [...NOTEN_MARKER, MIGRATION_NOTEN] });
  assert.deepEqual(s.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE]);
});

test("Zusage 5: Stand vor Welle 7, vor Welle 11, frischer Stand – Kette in der Reihenfolge des Plans", () => {
  // vor Welle 7: alte Intervalle, Tonleitern, Notenwerte, Noten; keine Marker
  const alt = {
    ...fresh(), migrated: [], rep: undefined,
    levels: {
      "intervalle-3": { stars: 1, best: 6, played: 1 }, "intervalle-6": { stars: 2, best: 8, played: 2 },
      "tonleitern-3": { stars: 3, best: 9, played: 1 }, "notenwerte-4": { stars: 2, best: 8, played: 1 },
      "noten-3": { stars: 2, best: 8, played: 4 }, "noten-6": { stars: 3, best: 10, played: 1 }, "noten-2": { stars: 2, best: 8, played: 1 },
    },
    current: "noten-6",
  };
  delete alt.rep;
  const s = structuredClone(alt);
  assert.equal(kette(s, [...NEW_BOX, "tonleitern-5", "tonleitern-13", "notenwerte-7"]), true);
  assert.deepEqual(s.levels, {
    "tonleitern-13": { stars: 2, best: 8, played: 2 }, "tonleitern-4": { stars: 3, best: 9, played: 1 },
    "notenwerte-7": { stars: 2, best: 8, played: 1 },
    "noten-5": { stars: 2, best: 8, played: 4 }, "noten-10": { stars: 3, best: 10, played: 1 }, "noten-2": { stars: 2, best: 8, played: 1 },
    // alt 4 war offen (3 geschafft), nie gespielt; neu 6 hat 5 davor (geschafft) → kein Merker nötig
    // alt 7 war offen (6 geschafft), nie gespielt; neu 12 hat 11 davor (neu) → Merker
    "noten-12": { stars: 0, best: 0, played: 0, offen: true },
  });
  assert.equal(s.current, "noten-10");
  // Kasten: nur geschaffte Stufen ohne Hilfen, unter den neuen IDs (alt 2 hat jetzt Hilfen: kein Eintrag)
  assert.deepEqual(Object.keys(s.rep).sort(), ["notenwerte-7", "noten-10", "noten-5", "tonleitern-13"].sort());
  assert.deepEqual(s.migrated, [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE, MIGRATION_NOTEN, MIGRATION_WIEDERHOLEN]);
  const nach = JSON.stringify(s);
  assert.equal(kette(s), false);
  assert.equal(JSON.stringify(s), nach);

  // vor Welle 11 (drei Marker, kein Kasten): Einträge nur zu alt 3, 6, 7, 8 unter den neuen IDs, je Tag drei
  const w = oldState({ levels: Object.fromEntries(OLD_IDS.map((id) => [id, { stars: 3, best: 9, played: 1 }])) });
  w.migrated = [MIGRATION_INTERVALLE, MIGRATION_TONLEITERN, MIGRATION_NOTENWERTE]; delete w.rep;
  kette(w);
  assert.deepEqual(Object.keys(w.rep), ["noten-5", "noten-10", "noten-12", "noten-15"]);
  assert.deepEqual(Object.values(w.rep).map((e) => e.faellig), [HEUTE, HEUTE, HEUTE, addDays(HEUTE, 1)].slice(0, 4));
  assert.equal(UMSTELLUNG_JE_TAG, 3);
  for (const id of Object.keys(w.rep)) assert.ok(inBox(NEW.levels.find((l) => l.id === id)));

  // frischer Stand (seit Schritt 2 mit Marker): die Kette ändert nichts
  const f = fresh();
  const vor = JSON.stringify(f);
  assert.equal(kette(f), false);
  assert.equal(JSON.stringify(f), vor);
  // Stand ohne Fortschritt von vor Welle 12 (ohne Marker): nur der Marker kommt dazu
  const g = oldState();
  kette(g);
  assert.deepEqual({ ...g, migrated: null }, { ...fresh(), migrated: null });
  assert.ok(g.migrated.includes(MIGRATION_NOTEN));
  // die anderen Umbenennungen sind von migrateNoten unberührt
  assert.ok(!Object.keys(RENAMED_NOTEN).some((k) => RENAMED_TONLEITERN[k] || RENAMED_NOTENWERTE[k]));
});

test("Umstellung Noten: beschädigte Stände (fehlende oder falsche Felder) werfen nicht und verlieren keine Sterne", () => {
  for (const extra of [{ levels: undefined }, { rep: null }, { rep: [] }, { basics: "x" }, { basicsOk: null }, { klasse: { jahrgang: 5 } }, { klasseOffen: [] }, { migrated: undefined }]) {
    const s = oldState({ levels: { "noten-3": { stars: 2, best: 8, played: 1 } } });
    Object.assign(s, extra);
    if (extra.levels === undefined && "levels" in extra) delete s.levels;
    assert.doesNotThrow(() => migrateNoten(s));
    assert.ok(s.migrated.includes(MIGRATION_NOTEN));
  }
  // eine schon belegte neue ID (beschädigt): bester Wert bleibt, Runden zusammen
  const s = oldState({ levels: { "noten-6": { stars: 2, best: 8, played: 1, last: 8 }, "noten-10": { stars: 3, best: 10, played: 2 } } });
  migrateNoten(s);
  assert.deepEqual(s.levels["noten-10"], { stars: 3, best: 10, played: 3, last: 8 });
  // rep-Paar mit unbrauchbarem Eintrag: zählt nicht als Paar, der andere entfällt wie ein einzelner
  const r = oldState({ rep: { "noten-1": { fach: 2, faellig: HEUTE, zuletzt: null }, "noten-2": "kaputt" } });
  migrateNoten(r);
  assert.deepEqual(r.rep, {});
});
