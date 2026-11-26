import { test } from "node:test";
import assert from "node:assert/strict";
import { learnCardsHtml, mountCards, LEARN_TABS, tabHasClef, nextTab, tabScroll, learnTabOf } from "../../src/views/learn.js";
import { PACKS } from "../../src/packs/index.js";
import noten from "../../src/packs/noten.js";

test("Lerntafeln: Titel als Überschrift, Auswahl nach Schlüssel", () => {
  const packs = [
    { learn: [{ title: "A & B", clef: "treble", render: () => "<div>v</div>" }, { title: "Bass", clef: "bass", render: () => "<div>b</div>" }] },
    { learn: [{ title: "Ohne Schlüssel", render: () => "<p>x</p>" }, { render: () => "<p>ohne Titel</p>" }] },
    {},
  ];
  assert.equal(learnCardsHtml(packs, "treble"),
    '<h3 class="legend-title">A &amp; B</h3><div>v</div><h3 class="legend-title">Ohne Schlüssel</h3><p>x</p><p>ohne Titel</p>');
  assert.equal(learnCardsHtml(packs, "bass"),
    '<h3 class="legend-title">Bass</h3><div>b</div><h3 class="legend-title">Ohne Schlüssel</h3><p>x</p><p>ohne Titel</p>');
});

test("Lerntafeln von „Noten lesen“: zuerst „So liest du eine Note“, dann „Merkhilfen“ (Inhalt unverändert)", () => {
  for (const clef of ["treble", "bass"]) {
    const [lage, merk] = noten.learn.filter((c) => c.clef === clef);
    assert.ok(learnCardsHtml(PACKS, clef).startsWith(`<h3 class="legend-title">So liest du eine Note</h3>${lage.render()}<h3 class="legend-title">Merkhilfen</h3>${merk.render()}`));
  }
});

test("mountCards gibt { state } weiter; only wählt Tafeln aus (Welle 12: neu aufsetzen nach der Spruch-Wahl)", () => {
  const seen = [], c = { state: { sprueche: {} } };
  const packs = [{ id: "a", learn: [{ render: () => "", spruch: true, mount: (r, x) => seen.push(["s", r, x]) }, { render: () => "", mount: (r, x) => seen.push(["o", r, x]) }] }];
  mountCards(packs, "treble", "ROOT", "a", c);
  assert.deepEqual(seen, [["s", "ROOT", c], ["o", "ROOT", c]]);
  seen.length = 0;
  mountCards(packs, "treble", "ROOT", "a", c, (card) => card.spruch);
  assert.deepEqual(seen, [["s", "ROOT", c]]);
  // in „Noten lesen“ hängt genau „So liest du eine Note“ (je Schlüssel) vom Spruch ab
  assert.deepEqual(noten.learn.filter((x) => x.spruch).map((x) => [x.title, x.clef]), [["So liest du eine Note", "treble"], ["So liest du eine Note", "bass"]]);
});

test("Lerntafeln mit mount werden nach dem Einsetzen verdrahtet (nur die sichtbaren)", () => {
  const seen = [];
  const packs = [{ learn: [{ clef: "treble", render: () => "", mount: (r) => seen.push(["t", r]) }, { clef: "bass", render: () => "", mount: () => seen.push(["b"]) }, { render: () => "" }, { render: () => "", mount: (r) => seen.push(["all", r]) }] }];
  mountCards(packs, "treble", "ROOT");
  assert.deepEqual(seen, [["t", "ROOT"], ["all", "ROOT"]]);
  // Tafeln mit mount: die drei Vorführungen bei „Notenwerte“ (Welle 9), „So bestimmst du ein Intervall“ und die drei
  // bei „Tonleitern“ (Welle 8), in der Reihenfolge der Pakete (seit Welle 11 Intervalle vor Tonleitern)
  // Welle 12: davor die drei Vorführungen von „Noten lesen“ je Schlüssel
  const nl = ["So liest du eine Note", "So zählst du vom Bezugston", "So liest du eine Note mit Vorzeichen"];
  assert.deepEqual(PACKS.flatMap((p) => p.learn || []).filter((c) => c.mount).map((c) => c.title),
    [...nl, ...nl, "So erkennst du einen Notenwert", "So bestimmst du die Dauer", "So zählst du einen Takt", "So bestimmst du ein Intervall", "So baust du eine Dur-Tonleiter", "So findest du die Tonart", "So findest du die parallele Molltonart"]);
  // die Tonleiter-Tafeln tragen ein eigenes Attribut: die Intervall-Tafel (data-demo-board) findet nur sich selbst
  const html = PACKS.flatMap((p) => p.learn || []).map((c) => c.render()).join("");
  assert.equal((html.match(/data-demo-board/g) || []).length, 1);
  assert.equal((html.match(/data-tl-board="/g) || []).length, 3);
  assert.equal((html.match(/data-nw-board="/g) || []).length, 3);
  assert.equal((html.match(/data-nl-board="/g) || []).length, 6);
});

/* ---------- Reiter (Welle 11, Schritt 2, W3) ---------- */

const titles = (html) => [...html.matchAll(/<h3 class="legend-title">([^<]*)<\/h3>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const TABS = LEARN_TABS.map((t) => t.id);

test("Reiter: Namen und Reihenfolge wie die Pakete (Intervalle vor Tonleitern), „Takt“ hinter „Notenwerte“", () => {
  assert.deepEqual(LEARN_TABS.map((t) => t.label), ["Tonhöhen", "Notenwerte", "Takt", "Intervalle", "Tonleitern", "Dreiklänge"]);
  // jedes Paket hat seinen Reiter, in der Reihenfolge von PACKS (seit Schritt 3); „Takt“ direkt hinter „Notenwerte“
  assert.deepEqual(TABS.filter((id) => id !== "takt"), PACKS.map((p) => p.id));
  assert.equal(TABS.indexOf("takt"), TABS.indexOf("notenwerte") + 1);
});

test("Reiter: jede Lerntafel gehört zu genau einem Reiter, kein Reiter ist leer", () => {
  for (const p of PACKS) for (const card of p.learn || []) assert.ok(TABS.includes(card.tab || p.id), card.title);
  const all = PACKS.flatMap((p) => p.learn || []).length;
  const perTab = TABS.map((t) => PACKS.flatMap((p) => (p.learn || []).filter((c) => (c.tab || p.id) === t)).length);
  assert.equal(perTab.reduce((a, b) => a + b, 0), all);
  for (const n of perTab) assert.ok(n > 0);
  for (const t of TABS) for (const clef of ["treble", "bass"]) assert.ok(learnCardsHtml(PACKS, clef, undefined, t).length > 0, t + " " + clef);
});

test("Reiter: Tafeln je Reiter und Schlüssel", () => {
  const want = {
    noten: { both: ["So liest du eine Note", "Merkhilfen", "So zählst du vom Bezugston", "Vorzeichen ♯ und ♭", "So liest du eine Note mit Vorzeichen"] },
    notenwerte: { both: ["So erkennst du einen Notenwert", "Notenwerte und Pausen", "So bestimmst du die Dauer"] },
    takt: { both: ["So zählst du einen Takt", "Balken"] },
    intervalle: { treble: ["So bestimmst du ein Intervall", "Intervalle über c'"], bass: ["So bestimmst du ein Intervall", "Intervalle über c"] },
    tonleitern: { both: ["So baust du eine Dur-Tonleiter", "Bauplan Dur", "Dur-Tonleitern bis 4 Vorzeichen", "So findest du die Tonart", "Quintenzirkel", "So findest du die parallele Molltonart"] },
    akkorde: { both: ["Dreiklangstypen", "Quintenzirkel"] },
  };
  for (const t of TABS) for (const clef of ["treble", "bass"]) {
    assert.deepEqual(titles(learnCardsHtml(PACKS, clef, undefined, t)), want[t][clef] || want[t].both, `${t} ${clef}`);
  }
  // ohne Reiter wie bisher alle Tafeln
  assert.equal(titles(learnCardsHtml(PACKS, "treble")).length, TABS.reduce((n, t) => n + titles(learnCardsHtml(PACKS, "treble", undefined, t)).length, 0));
});

test("Reiter: Schlüsselwahl nur, wo es Tafeln je Schlüssel gibt", () => {
  for (const t of ["noten", "intervalle", "tonleitern", "akkorde"]) assert.equal(tabHasClef(PACKS, t), true, t);
  for (const t of ["notenwerte", "takt"]) assert.equal(tabHasClef(PACKS, t), false, t);
});

test("Reiter: mount nur für die Tafeln des Reiters", () => {
  const seen = [];
  const packs = [{ id: "a", learn: [{ render: () => "", mount: () => seen.push("a") }, { tab: "b", render: () => "", mount: () => seen.push("b") }] }];
  mountCards(packs, "treble", "ROOT", "b");
  mountCards(packs, "treble", "ROOT", "a");
  assert.deepEqual(seen, ["b", "a"]);
});

test("nextTab: Pfeile umlaufend, Pos1 und Ende, andere Tasten null", () => {
  const ids = ["a", "b", "c"];
  assert.equal(nextTab(ids, "a", "ArrowRight"), "b");
  assert.equal(nextTab(ids, "c", "ArrowRight"), "a");
  assert.equal(nextTab(ids, "a", "ArrowLeft"), "c");
  assert.equal(nextTab(ids, "b", "ArrowLeft"), "a");
  assert.equal(nextTab(ids, "b", "Home"), "a");
  assert.equal(nextTab(ids, "a", "End"), "c");
  for (const k of ["Enter", " ", "Tab", "ArrowDown", "a"]) assert.equal(nextTab(ids, "b", k), null);
});

test("tabScroll: gewählter Reiter ganz sichtbar, Leiste rastet am Anfang eines Reiters ein", () => {
  // Reiter je 100 px breit mit 6 px Abstand, Innenabstand 6 px, sichtbar 288 px, Inhalt 654 px
  const starts = [6, 112, 218, 324, 430, 536], w = 100, pad = 6, width = 288, max = 654 - 288;
  // schon sichtbar: bleibt
  assert.equal(tabScroll(starts, 112, 112 + w, 0, width, pad, max), 0);
  // rechts hinaus: kleinster Einrastpunkt, bei dem er ganz sichtbar ist
  assert.equal(tabScroll(starts, 218, 218 + w, 0, width, pad, max), 106);
  assert.equal(tabScroll(starts, 324, 324 + w, 106, width, pad, max), 212);
  // der letzte: höchstens bis zum Ende
  assert.equal(tabScroll(starts, 536, 536 + w, 0, width, pad, max), max);
  // links hinaus: an seinen Anfang (Pos1 → 0)
  assert.equal(tabScroll(starts, 6, 6 + w, 300, width, pad, max), 0);
  assert.equal(tabScroll(starts, 218, 218 + w, 300, width, pad, max), 212);
});

test("„Erst anschauen“: Reiter zur Stufe – der des Pakets, bei „Takt füllen“ der Reiter „Takt“", () => {
  for (const p of PACKS) for (const l of p.levels) {
    const t = learnTabOf(PACKS, l.id);
    assert.ok(TABS.includes(t), l.id);
    assert.equal(t, /^Takt füllen/.test(l.title) ? "takt" : p.id, l.id);
  }
  assert.equal(learnTabOf(PACKS, "notenwerte-8"), "takt");
  assert.equal(learnTabOf(PACKS, "notenwerte-9"), "takt");
  // „Alles gemischt“ (Stufen 3, 5, 7 und 9) bleibt beim Paket
  assert.equal(learnTabOf(PACKS, "notenwerte-10"), "notenwerte");
  // unbekannte Stufe: erste Stufe des ersten Pakets
  assert.equal(learnTabOf(PACKS, "gibt-es-nicht"), "noten");
});
