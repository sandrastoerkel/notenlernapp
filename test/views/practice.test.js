import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startLabel, keysHint, lettersLabel, resultInfo, missingText, answersScroll, startHint, TWO_STEPS_NOTE, resultLine, avgText, perLevelLine, MIXED_HEAD,
  BASICS_LABEL, needsHtml, needLabel, reasonText, basicsTitle, countWord, gapGroups, placesText, gapText, openLabel, resultBasics,
  reviewTitle, verdictText, reviewLine, practiceOffer, repeatNote, needOffer, basicsResultPlan } from "../../src/views/practice.js";
import { keepStufe, textOf } from "../../src/engine.js";
import { PACKS } from "../../src/packs/index.js";
import { lockText } from "../../src/views/home.js";
import { fresh, recordRound, isUnlocked, unlocks } from "../../src/store.js";
import intervalle from "../../src/packs/intervalle.js";
import noten from "../../src/packs/noten.js";

test("Startknopf: in allen Eingabearten „10 Aufgaben“", () => {
  assert.equal(startLabel({ input: "letters" }), "Runde starten · 10 Aufgaben");
  assert.equal(startLabel({}), "Runde starten · 10 Aufgaben");
  assert.equal(startLabel({ input: "choices" }), "Runde starten · 10 Aufgaben");
});

test("Tastatur-Hinweis und Beschriftung: Buchstaben bzw. Namen mit Enter", () => {
  assert.equal(keysHint({ input: "letters" }), `Tastatur: <span class="kbd">C</span> <span class="kbd">D</span> <span class="kbd">E</span> … <span class="kbd">H</span>`);
  const h = keysHint({ input: "letters", acc: true });
  assert.ok(h.includes(`<span class="kbd">fis</span>`) && h.includes(`<span class="kbd">Enter</span>`), h);
  assert.ok(!/[+]|Vorzeichen mit/.test(h));
  assert.equal(lettersLabel({ input: "letters" }), "Buchstaben");
  assert.equal(lettersLabel({ input: "letters", acc: true }), "Namen");
});

const lv = (pack, no) => pack.levels[no - 1];
// Paket mit requires wie im früheren Paket „Intervalle 7–12“ (Stufe 7 nach 1, dann jede nach der vorigen);
// seit „Intervalle neu“ nutzt kein Paket requires mehr, die Logik bleibt erhalten und getestet
const REQ = { levels: Array.from({ length: 12 }, (_, i) => ({ id: `r-${i + 1}`, no: i + 1, ...(i >= 6 ? { requires: `r-${i === 6 ? 1 : i}` } : {}) })) };

test("Ergebniskarte folgt requires (Welle 10, A7: eigene Freischalt-Zeile)", () => {
  const s = fresh();
  // Stufe 1 schaltet zwei Stufen frei (2 und 7): mit 6 Richtigen fehlen noch 2
  let r = resultInfo(s, REQ, lv(REQ, 1), 6);
  assert.equal(r.next.id, "r-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Noch 2 richtige Antworten, dann öffnen sich die Stufen 2 und 7.");
  assert.equal(resultInfo(s, REQ, lv(REQ, 1), 7).note, "Noch eine richtige Antwort, dann öffnen sich die Stufen 2 und 7.");
  assert.equal(resultInfo(s, REQ, lv(REQ, 1), 4).note, "Ab 8 von 10 öffnen sich die Stufen 2 und 7.");
  // Stufe 1 mit 8 Richtigen (der Store hat best schon eingetragen): beide offen
  s.levels["r-1"] = { stars: 2, best: 8, played: 1 };
  r = resultInfo(s, REQ, lv(REQ, 1), 8);
  assert.equal(r.next.id, "r-2"); assert.equal(r.nextOpen, true);
  assert.equal(r.note, "Die Stufen 2 und 7 sind offen.");
  // Stufe 7: als Nächstes Stufe 8
  r = resultInfo(s, REQ, lv(REQ, 7), 5);
  assert.equal(r.next.id, "r-8"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Noch 3 richtige Antworten, dann öffnet sich Stufe 8.");
  s.levels["r-7"] = { stars: 3, best: 9, played: 1 };
  r = resultInfo(s, REQ, lv(REQ, 7), 9);
  assert.equal(r.next.id, "r-8"); assert.equal(r.nextOpen, true); assert.equal(r.note, "Stufe 8 ist offen.");
  // Stufe 6 schaltet nichts frei; Stufe 7 hängt an Stufe 1
  const t = fresh();
  t.levels["r-6"] = { stars: 3, best: 10, played: 1 };
  r = resultInfo(t, REQ, lv(REQ, 6), 4);
  assert.equal(r.next.id, "r-7"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Stufe 7 öffnet sich ab 8 von 10 in Stufe 1.");
  // letzte Stufe eines Pakets: nichts danach, keine Zeile (auch nicht unter 8)
  r = resultInfo(s, REQ, lv(REQ, 12), 10);
  assert.equal(r.next, null); assert.equal(r.note, "");
  assert.equal(resultInfo(fresh(), REQ, lv(REQ, 12), 3).note, "");
  // Noten lesen: 4, 7, 8 Richtige
  assert.equal(resultInfo(fresh(), noten, lv(noten, 1), 4).note, "Ab 8 von 10 öffnet sich Stufe 2.");
  r = resultInfo(fresh(), noten, lv(noten, 1), 7);
  assert.equal(r.next.id, "noten-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Noch eine richtige Antwort, dann öffnet sich Stufe 2.");
  const u = fresh(); u.levels["noten-1"] = { stars: 2, best: 8, played: 1 };
  r = resultInfo(u, noten, lv(noten, 1), 8);
  assert.equal(r.nextOpen, true); assert.equal(r.note, "Stufe 2 ist offen.");
  // unter 8, aber die Folgestufe ist schon offen (frühere beste Runde): „ist offen“
  assert.equal(resultInfo(u, noten, lv(noten, 1), 5).note, "Stufe 2 ist offen.");
  const last = noten.levels.length;
  r = resultInfo(fresh(), noten, lv(noten, last), 3);
  assert.equal(r.next, null); assert.equal(r.note, "");
  // Intervalle: der Reihe nach
  r = resultInfo(fresh(), intervalle, lv(intervalle, 1), 6);
  assert.equal(r.next.id, "intervall-2"); assert.equal(r.nextOpen, false);
  assert.equal(r.note, "Noch 2 richtige Antworten, dann öffnet sich Stufe 2.");
  // jede letzte Stufe jedes Pakets: keine Freischalt-Zeile
  for (const pack of PACKS) {
    const l = pack.levels[pack.levels.length - 1];
    assert.equal(resultInfo(fresh(), pack, l, 5).note, "", l.id);
  }
});

test("Ergebniskarte: „eine richtige Antwort“ bzw. „k richtige Antworten“", () => {
  assert.equal(missingText(1), "Noch eine richtige Antwort");
  assert.equal(missingText(2), "Noch 2 richtige Antworten");
  assert.equal(missingText(3), "Noch 3 richtige Antworten");
  // die Zeile steht für sich, nicht im kleinen grauen Text
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.ok(src.includes('<p class="unlock-line" id="rUnlock">${engine.keepStufe(note)}</p>'));
  assert.equal(keepStufe("Ab 8 von 10 öffnen sich die Stufen 2 und 7."), "Ab 8 von 10 öffnen sich die Stufen\u00a02 und\u00a07.");
  assert.equal(keepStufe("Die Stufen 2, 3 und 7 sind offen."), "Die Stufen\u00a02, 3 und\u00a07 sind offen.");
  assert.equal(keepStufe("Stufe 7 öffnet sich ab 8 von 10 in Stufe 1."), "Stufe\u00a07 öffnet sich ab 8 von 10 in Stufe\u00a01.");
  // Ansichten hängen nicht voneinander ab: die Startseite holt keepStufe aus engine.js
  assert.ok(!readFileSync(new URL("../../src/views/home.js", import.meta.url), "utf8").includes('from "./practice.js"'));
  assert.equal(keepStufe("frei ab 8/10 in Stufe 1"), "frei ab 8/10 in Stufe\u00a01");
  assert.ok(!src.includes("${note ? ` · ${note}`"));
  const css = readFileSync(new URL("../../css/style.css", import.meta.url), "utf8");
  assert.match(css, /\.result \.unlock-line \{[^}]*color: var\(--fg\)[^}]*font-weight: 700/);
});

test("Startseite: gesperrte Karte immer „frei ab 8/10 in Stufe n“, mit und ohne requires", () => {
  assert.equal(lockText(REQ, lv(REQ, 7)), "frei ab 8/10 in Stufe 1");
  assert.equal(lockText(REQ, lv(REQ, 8)), "frei ab 8/10 in Stufe 7");
  assert.equal(lockText(REQ, lv(REQ, 12)), "frei ab 8/10 in Stufe 11");
  assert.equal(lockText(REQ, lv(REQ, 2)), "frei ab 8/10 in Stufe 1");
  assert.equal(lockText(noten, lv(noten, 3)), "frei ab 8/10 in Stufe 2");
  intervalle.levels.forEach((l, i) => assert.equal(lockText(intervalle, l), i === 0 ? "" : `frei ab 8/10 in Stufe ${intervalle.levels[i - 1].no}`, l.id));
  // erste Stufe und unbekanntes requires: kein Zusatz
  assert.equal(lockText(noten, lv(noten, 1)), "");
  assert.equal(lockText({ levels: [{ id: "x-1" }, { id: "x-2", no: 2, requires: "x-9" }] }, { id: "x-2", no: 2, requires: "x-9" }), "");
});

test("Tastatur-Hinweis: Ziffern bei Stufen mit digits", () => {
  const h = keysHint(lv(intervalle, 1));
  assert.ok(h.includes(`<span class="kbd">1</span> Prime`) && h.includes(`<span class="kbd">8</span> Oktave`), h);
  assert.equal(keysHint(lv(intervalle, 3)), h);
  assert.ok(keysHint(lv(intervalle, 8)).includes("fis"));
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /\$\("#pKeys"\)\.hidden = !letters && !level\.digits/);
});

test("Hilfen: nur während der Runde, eigener Bereich unter der Notenzeile", () => {
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /helps: \$\("#pHelps"\), helpsTitle: \$\("#pHelps summary"\), helpsBody: \$\("#pHelpsBody"\)/);
  assert.equal((src.match(/\$\("#pHelps"\)\.hidden = true/g) || []).length, 4, "render, Ergebniskarte, Ergebniskarten „Grundlagen wiederholen“ und „Wiederholen“ (Welle 11)");
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const i = html.indexOf('id="pStaff"'), j = html.indexOf('id="pHelps"'), k = html.indexOf('id="pIntro"'), p = html.indexOf('id="pPiano"');
  assert.ok(i < j && j < k && k < p, "Hilfen zwischen Notenzeile und Startkarte, getrennt von #pPiano");
  assert.match(html, /<details class="card helps" id="pHelps" hidden>\s*<summary>Hilfen/);
});

test("namesOnly: keine Wahl Namen/Klaviatur auf der Startkarte", () => {
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /\.seg"\)\.hidden = !letters \|\| !!level\.namesOnly/);
});

test("Hilfen aufgeklappt: so weit scrollen, dass die erste Reihe der Antwortknöpfe sichtbar ist", () => {
  assert.equal(answersScroll(500, 560), 0);
  assert.equal(answersScroll(560, 560), 0);
  assert.equal(answersScroll(700.2, 560), 141);
});

test("index.html: Hilfen zwischen Notenzeile und Runde; bis 599 px rücken sie per CSS unter die Antwortknöpfe", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="pStaff"') < html.indexOf('id="pHelps"') && html.indexOf('id="pHelps"') < html.indexOf('id="pPlay"'));
  const css = readFileSync(new URL("../../css/style.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 599px\) \{ #pHelps \{ order: 1; \} \}/);
});

test("Startkarte: zweischrittige Stufen sagen „Beide Schritte müssen stimmen.“", () => {
  assert.equal(TWO_STEPS_NOTE, "Beide Schritte müssen stimmen.");
  assert.equal(startHint({ hint: "H.", twoSteps: true }), "H. Beide Schritte müssen stimmen.");
  assert.equal(startHint({ hint: "H." }), "H.");
  const two = [];
  for (const pack of PACKS) for (const level of pack.levels) {
    if (level.twoSteps) { two.push(level.id); assert.ok(startHint(level).endsWith(TWO_STEPS_NOTE), level.id); }
    else assert.equal(startHint(level), textOf(level.hint), level.id);
  }
  assert.deepEqual(two, ["notenwerte-1", "notenwerte-4", "notenwerte-6", "notenwerte-8",
    "intervall-3", "intervall-4", "intervall-5", "intervall-6", "intervall-7", "tonleitern-4", "tonleitern-10", "tonleitern-12"]);
  // die Startkarte nutzt startHint
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /\$\("#pHint"\)\.textContent = startHint\(level, \{ state: ctx\.state \}\)/);
});

test("Welle 10, B5/B15: Tastaturhinweis ohne Klammerzusatz, Ergebniskarte mit Komma und „pro Aufgabe“", () => {
  const h = keysHint(lv(intervalle, 3));
  assert.ok(!/\(|Rahmen/i.test(h), h);
  assert.equal(avgText(0.1), "0,1");
  assert.equal(avgText(2.345), "2,3");
  assert.equal(resultLine({ id: "noten" }, 12, 2.34), "+12 XP · Ø 2,3 s pro Note");
  for (const id of ["notenwerte", "tonleitern", "intervalle", "akkorde"]) assert.equal(resultLine({ id }, 5, 0.1), "+5 XP · Ø 0,1 s pro Aufgabe");
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.ok(src.includes("${resultLine(pack, gained, avg)}") && !src.includes("s pro Note${"));
});

test("Ergebniskarte: die Freischalt-Zeile stimmt in jeder Stufe jedes Pakets mit der Regel in store.js überein", () => {
  for (const pack of PACKS) for (const level of pack.levels) for (let c = 0; c <= 10; c++) {
    const s = fresh();
    recordRound(s, level.id, c);
    const { note } = resultInfo(s, pack, level, c);
    const mine = unlocks(pack, level.id), where = `${level.id} mit ${c}`;
    if (!mine.length) { assert.equal(note, "", where); continue; }
    const ziel = mine.length > 1 ? `die Stufen ${mine.map((l) => l.no).join(" und ")}` : `Stufe ${mine[0].no}`;
    const verb = mine.length > 1 ? "öffnen" : "öffnet";
    if (c >= 8) {
      assert.ok(mine.every((l) => isUnlocked(s, pack, l.id)), where);
      assert.equal(note, mine.length > 1 ? `Die Stufen ${mine.map((l) => l.no).join(" und ")} sind offen.` : `Stufe ${mine[0].no} ist offen.`, where);
      continue;
    }
    assert.ok(mine.every((l) => !isUnlocked(s, pack, l.id)), where);
    const k = 8 - c;
    assert.equal(note, k >= 4 ? `Ab 8 von 10 ${verb} sich ${ziel}.` : `${missingText(k)}, dann ${verb} sich ${ziel}.`, where);
    // genau k weitere Richtige öffnen die Stufe, k − 1 noch nicht
    const knapp = structuredClone(s), genug = structuredClone(s);
    recordRound(knapp, level.id, c + k - 1); recordRound(genug, level.id, c + k);
    assert.ok(mine.every((l) => !isUnlocked(knapp, pack, l.id)), where);
    assert.ok(mine.every((l) => isUnlocked(genug, pack, l.id)), where);
  }
});

test("Gemischte Runde (vorläufig, Welle 11, Schritt 6): Kopf und Zeile je Stufe", () => {
  assert.deepEqual(MIXED_HEAD, { wiederholen: "Wiederholen", grundlagen: "Grundlagen wiederholen" });
  assert.equal(perLevelLine(PACKS, { id: "intervall-2", n: 3, ok: 3 }), "Intervalle 2 · 3 von 3");
  assert.equal(perLevelLine(PACKS, { id: "noten-7", n: 4, ok: 2 }), "Noten lesen 7 · 2 von 4");
});

test("index.html: Herkunftszeile #pOrigin über der Notenzeile, zu Beginn verborgen", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const i = html.indexOf('id="pOrigin"'), j = html.indexOf('id="pStaff"');
  assert.ok(i > 0 && i < j, "vor #pStaff");
  assert.match(html.slice(html.lastIndexOf("<", i), html.indexOf(">", i) + 1), /hidden/);
});

/* ---------- „Grundlagen wiederholen“ (Welle 11, Schritt 7) ---------- */
const NB = " ";

test("Startkarte: „Dafür brauchst du: …“ mit Knöpfen, Knopf und Grund der Empfehlung", () => {
  assert.equal(BASICS_LABEL, `Grundlagen wiederholen${NB}·${NB}6${NB}Aufgaben`);
  assert.equal(needsHtml(PACKS, "noten-1"), "");
  const h = needsHtml(PACKS, "intervall-3");
  assert.ok(h.startsWith("Dafür brauchst du: "), h);
  assert.deepEqual([...h.matchAll(/data-need="([^"]+)"/g)].map((m) => m[1]), ["intervall-2", "noten-7"]);
  // J-B1/J-C1 (Korrektur nach der Prüfung Welle 11): fortlaufend mit Kommas, die Stufe sichtbar (Kurzname des Pakets),
  // das Komma ohne Leerzeichen am Knopf (kein Komma am Zeilenanfang), kein „·“ mehr
  assert.equal(h.replace(/<[^>]+>/g, ""), `Dafür brauchst du: Notenstufen zählen (Intervalle${NB}2), Noten mit Vorzeichen (Noten lesen${NB}7)`);
  assert.ok(/<button type="button" class="link"/.test(h));
  assert.ok(h.includes("</button>, <button") && !h.includes("·"), h);
  assert.equal(needLabel(PACKS, "notenwerte-3"), `Notenwerte und Pausen erkennen (Notenwerte${NB}3)`);
  assert.equal(needLabel(PACKS, "intervall-4"), `Intervalle rein, klein, groß (Intervalle${NB}4)`);
  assert.equal(needLabel(PACKS, "akkorde-1"), `Dur- und Moll-Dreiklang (Dreiklänge${NB}1)`);
  // der volle Name der Fähigkeit bleibt im title
  assert.ok(h.includes('title="Notenstufen zählen (Prime bis Oktave)"'), h);
  assert.equal(reasonText(PACKS, { kind: "nie", id: "noten-7" }), "Empfohlen: „Noten mit Vorzeichen“ hast du hier noch nicht geübt.");
  assert.equal(reasonText(PACKS, { kind: "faellig", id: "noten-7" }), "Empfohlen: „Noten mit Vorzeichen“ ist wieder dran.");
  // Fähigkeit ohne Klammerzusatz wie in „Dafür brauchst du“ (J-B1: kürzer, die Knöpfe rücken nach oben)
  assert.equal(reasonText(PACKS, { kind: "schwach", id: "intervall-2" }), "Empfohlen: „Notenstufen zählen“ lag zuletzt unter 8 von 10.");
  assert.equal(reasonText(PACKS, null), "");
  assert.equal(basicsTitle(PACKS, "intervall-3"), `für Intervalle, Stufe${NB}3`);
  assert.equal(MIXED_HEAD.grundlagen, "Grundlagen wiederholen");
  // Wortwahl: kein Druck („wieder dran“, nicht „überfällig“)
  for (const k of ["nie", "faellig", "schwach"]) assert.ok(!/überfällig|musst|Pflicht/.test(reasonText(PACKS, { kind: k, id: "noten-7" })));
});

test("Ergebniskarte: Zahlwörter, Orte, Satz zum Fehlermuster, Knöpfe", () => {
  assert.deepEqual([3, 4, 5, 6, 7, 8, 9, 10].map(countWord),
    ["Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn"]);
  assert.equal(placesText(PACKS, ["intervall-2"]), "Intervalle, Stufe 2");
  assert.equal(placesText(PACKS, ["notenwerte-3", "notenwerte-5", "notenwerte-7"]), "Notenwerte, Stufen 3, 5 und 7");
  assert.equal(placesText(PACKS, ["intervall-2", "tonleitern-3"]), "Intervalle, Stufe 2 und in Tonleitern, Stufe 3");
  assert.equal(placesText(PACKS, ["akkorde-1", "intervall-4"]), "Dreiklänge, Stufe 1 und in Intervalle, Stufe 4");
  // Korrektur nach der Prüfung Welle 11 (J-B7, W-B5): ohne Nachzählen; einschrittig keine Behauptung über die Ursache
  assert.equal(gapText(PACKS, { needs: ["intervall-2"], count: 3, step: 0 }),
    `Der erste Schritt (Notenstufen zählen) hat oft nicht geklappt. Das übst du in Intervalle, Stufe${NB}2.`);
  assert.equal(gapText(PACKS, { needs: ["noten-7"], count: 4, step: 1 }),
    `Der zweite Schritt (Noten mit Vorzeichen) hat oft nicht geklappt. Das übst du in Noten lesen, Stufe${NB}7.`);
  assert.equal(gapText(PACKS, { needs: ["noten-3"], count: 5, step: null }),
    `Fünf Antworten lagen daneben. Die Grundlagen dazu findest du in Noten lesen, Stufe${NB}3.`);
  assert.equal(gapText(PACKS, { needs: ["intervall-3"], count: 3, step: 1, helps: true }),
    `Der zweite Schritt hat oft nicht geklappt. Mit Hilfen übst du das in Stufe${NB}3.`);
  assert.equal(gapText(PACKS, { needs: ["notenwerte-5", "notenwerte-7"], count: 3, step: 0 }),
    `Der erste Schritt hat oft nicht geklappt. Das übst du in Notenwerte, Stufen${NB}5 und${NB}7.`);
  for (const g of [{ needs: ["intervall-2"], count: 10, step: 0 }, { needs: ["noten-3"], count: 8, step: null }]) {
    assert.ok(!/mal lag|Zehnmal|Achtmal/.test(gapText(PACKS, g)));
  }
  assert.equal(openLabel(PACKS, intervalle, "intervall-2"), `Stufe${NB}2 öffnen`);
  assert.equal(openLabel(PACKS, intervalle, "noten-7"), `Noten lesen 7 öffnen`);
  assert.equal(openLabel(PACKS, intervalle, "intervall-3", true), `Stufe${NB}3 mit Hilfen üben`);
  // Kurzname des Pakets (packShort) auch im Knopf
  assert.equal(openLabel(PACKS, intervalle, "notenwerte-5"), `Notenwerte 5 öffnen`);
  // gleiche Zahl und gleicher Schritt: ein Satz
  assert.deepEqual(gapGroups([{ need: "a", count: 3, step: null }, { need: "b", count: 3, step: null }, { need: "c", count: 4, step: 0 }]),
    [{ needs: ["a", "b"], count: 3, step: null, helps: false }, { needs: ["c"], count: 4, step: 0, helps: false }]);
});

test("Ergebniskarte: „Grundlagen wiederholen“ zuerst unter 5 Richtigen, sonst höchstens ein Fehlermuster", () => {
  const log = (id, list) => list.map((oks) => ({ id, ok: oks.every(Boolean), oks }));
  const iv4 = lv(intervalle, 4);
  // unter 5, ohne Muster: Grundlagen-Knopf als erster
  let r = resultBasics(PACKS, intervalle, iv4, 4, log("intervall-4", [[false, true], [true, false], [true, true]]));
  assert.deepEqual(r, { first: true, gaps: [], only: [] });
  assert.equal(resultBasics(PACKS, intervalle, iv4, 5, []).first, false);
  // Stufe ohne Voraussetzungen: kein Knopf
  assert.equal(resultBasics(PACKS, noten, lv(noten, 1), 0, log("noten-1", Array(10).fill([false]))).first, false);
  // zwei Muster (erster und zweiter Schritt): nur das zum ersten Schritt (J-B7/W-B6), „Grundlagen wiederholen“ übt
  // genau diese Grundlage – kein Knopf „… öffnen“ mit demselben Inhalt
  r = resultBasics(PACKS, intervalle, iv4, 3, log("intervall-4", [[false, true], [false, true], [false, false], [true, false], [true, false]]));
  assert.equal(r.first, false);
  assert.deepEqual(r.gaps.map((g) => [g.needs, g.helps, g.open]), [[["intervall-2"], false, null]]);
  assert.equal(r.gaps[0].text, `Der erste Schritt (Notenstufen zählen) hat oft nicht geklappt. Das übst du in Intervalle, Stufe${NB}2.`);
  assert.deepEqual(r.only, ["intervall-2"]);
  // der erste Schritt geht vor, auch wenn der zweite öfter danebenlag
  r = resultBasics(PACKS, intervalle, iv4, 2, log("intervall-4", [[false, true], [false, true], [false, true], [true, false], [true, false], [true, false], [true, false], [true, false]]));
  assert.deepEqual(r.gaps.map((g) => [g.needs, g.helps]), [[["intervall-2"], false]]);
  // nur der zweite Schritt: „Stufe 3 mit Hilfen üben“ (open), kein „Grundlagen wiederholen“
  r = resultBasics(PACKS, intervalle, iv4, 5, log("intervall-4", [[true, false], [true, false], [true, false]]));
  assert.deepEqual(r.gaps.map((g) => [g.needs, g.helps, g.open]), [[["intervall-3"], true, "intervall-3"]]);
  assert.deepEqual(r.only, []);
  r = resultBasics(PACKS, intervalle, lv(intervalle, 6), 7, log("intervall-6", [[false, false], [false, false], [false, false]]));
  assert.deepEqual(r.gaps.map((g) => g.needs), [["intervall-2"]]);
  assert.deepEqual(r.only, ["intervall-2"]);
  // mehrere Grundlagen in einem Satz: kein Knopf „… öffnen“, einschrittig neutral
  const nw10 = PACKS.find((p) => p.id === "notenwerte").levels[9];
  r = resultBasics(PACKS, PACKS[1], nw10, 6, log("notenwerte-10", [[false], [false], [false], [false]]));
  assert.equal(r.gaps.length, 1);
  assert.deepEqual(r.gaps[0].needs, ["notenwerte-3", "notenwerte-5", "notenwerte-7", "notenwerte-9"]);
  assert.equal(r.gaps[0].open, null);
  assert.equal(r.gaps[0].text, `Vier Antworten lagen daneben. Die Grundlagen dazu findest du in Notenwerte, Stufen${NB}3, 5, 7 und${NB}9.`);
  // Ansicht: mit Muster der kurze Ergebnissatz, kein „Stufe n“-Knopf (höchstens drei Knöpfe); Satz ohne Rahmen
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.ok(src.includes("short: !!pattern || basics.first"));
  assert.ok(src.includes("${nextOpen && !pattern ? "));
  const css = readFileSync(new URL("../../css/style.css", import.meta.url), "utf8");
  assert.doesNotMatch(css.match(/\.result \.gap-line \{([^}]*)\}/)[1], /border/);
});

// Welle 11, Schritt 8: Runde „Wiederholen“
test("Runde „Wiederholen“: Kopf, Urteil je Stufe, Knopf bei „noch wacklig“, Satz nach einer normalen Runde", () => {
  assert.equal(reviewTitle([{ id: "a", n: 4 }, { id: "b", n: 3 }, { id: "c", n: 3 }]), "10 Aufgaben aus 3 Stufen");
  assert.equal(reviewTitle([{ id: "a", n: 5 }, { id: "b", n: 5 }]), "10 Aufgaben aus 2 Stufen");
  assert.equal(reviewTitle([{ id: "a", n: 10 }]), "10 Aufgaben aus einer Stufe");
  assert.equal(verdictText({ sitzt: true, fach: 3, inTagen: 7 }), "sitzt · wieder in 7 Tagen");
  assert.equal(verdictText({ sitzt: false, fach: 1, inTagen: 1 }), "noch wacklig · morgen noch einmal");
  assert.equal(verdictText({ sitzt: true, fach: 1, inTagen: 1, neu: true }), "neu im Kasten · morgen zum Wiederholen");
  assert.equal(reviewLine(PACKS, { id: "intervall-4", sitzt: true, fach: 3, inTagen: 7 }), `Intervalle${NB}4 · sitzt · wieder in 7 Tagen`);
  assert.equal(reviewLine(PACKS, { id: "tonleitern-5", sitzt: false, fach: 1, inTagen: 1 }), `Tonleitern${NB}5 · noch wacklig · morgen noch einmal`);
  assert.equal(reviewLine(PACKS, { id: "akkorde-1", sitzt: true, fach: 5, inTagen: 30 }), `Dreiklänge${NB}1 · sitzt · wieder in 30 Tagen`);
  // Stufe mit Hilfen direkt davor: „Stufe 4 mit Hilfen üben“; sonst die Stufe selbst
  assert.deepEqual(practiceOffer(PACKS, "tonleitern-5"), { id: "tonleitern-4", label: `Stufe${NB}4 mit Hilfen üben` });
  assert.deepEqual(practiceOffer(PACKS, "intervall-4"), { id: "intervall-3", label: `Stufe${NB}3 mit Hilfen üben` });
  assert.deepEqual(practiceOffer(PACKS, "noten-7"), { id: "noten-7", label: `Stufe${NB}7 üben` });
  assert.deepEqual(practiceOffer(PACKS, "notenwerte-3"), { id: "notenwerte-2", label: `Stufe${NB}2 mit Hilfen üben` });
  assert.deepEqual(practiceOffer(PACKS, "akkorde-2"), { id: "akkorde-2", label: `Stufe${NB}2 üben` });
  // Satz auf der Ergebniskarte einer normalen Runde
  assert.equal(repeatNote(null), "");
  assert.equal(repeatNote({ id: "noten-3", sitzt: true, fach: 1, inTagen: 1, neu: true }), `Geschafft${NB}– kommt morgen zum Wiederholen wieder.`);
  assert.equal(repeatNote({ id: "noten-3", sitzt: true, fach: 2, inTagen: 3 }), "Wiederholung: sitzt · wieder in 3 Tagen.");
  assert.equal(repeatNote({ id: "noten-3", sitzt: false, fach: 1, inTagen: 1 }), "Wiederholung: noch wacklig · morgen noch einmal.");
});

// Korrektur nach der Prüfung Welle 11, J-B1: Startkarte – die Knöpfe direkt unter dem Hinweis (mit Empfehlung erst
// deren Satz), „Dafür brauchst du“ und der Tastatur-Hinweis danach
test("Startkarte: Knöpfe direkt unter dem Hinweis, „Dafür brauchst du“ und Tastatur-Hinweis darunter", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const at = (id) => html.indexOf(`id="${id}"`);
  const order = ["pHint", "pBasicsWhy", "pStart", "pBasics", "pNeeds", "pKeys"];
  order.forEach((id) => assert.ok(at(id) > 0, id));
  for (let i = 1; i < order.length; i++) assert.ok(at(order[i - 1]) < at(order[i]), `${order[i - 1]} vor ${order[i]}`);
  // mit Empfehlung: Grund, „Grundlagen wiederholen“, „Runde starten“ (renderBasicsOffer schiebt beide vor den Start)
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.match(src, /if \(offer\.recommend\) \{ start\.before\(why\); start\.before\(btn\); \} else start\.after\(btn\);/);
});

// Korrektur nach der Prüfung Welle 11 (J-B6, L-B4, W-B3): „Grundlagen wiederholt“ führt zur schwachen Grundlage
test("„Grundlagen wiederholt“: Knopf zum Üben je Zeile mit Fehlern, Hauptknopf nach der Zahl der Fehler", () => {
  assert.deepEqual(needOffer(PACKS, "intervall-2"), { id: "intervall-1", label: `Intervalle${NB}1 mit Hilfen üben` });
  assert.deepEqual(needOffer(PACKS, "noten-7"), { id: "noten-7", label: `Noten lesen${NB}7 üben` });
  assert.deepEqual(needOffer(PACKS, "notenwerte-5"), { id: "notenwerte-4", label: `Notenwerte${NB}4 mit Hilfen üben` });
  assert.deepEqual(needOffer(PACKS, "tonleitern-3"), { id: "tonleitern-2", label: `Tonleitern${NB}2 mit Hilfen üben` });
  assert.deepEqual(needOffer(PACKS, "akkorde-1"), { id: "akkorde-1", label: `Dreiklänge${NB}1 üben` });
  const res = (perLevel) => ({ perLevel, total: perLevel.reduce((a, e) => a + e.n, 0), correct: perLevel.reduce((a, e) => a + e.ok, 0) });
  // Bild 042: Intervalle 2 · 0 von 3 → Hauptknopf „Intervalle 1 mit Hilfen üben“, „Zurück“ nicht hervorgehoben
  let p = basicsResultPlan(PACKS, res([{ id: "noten-7", n: 3, ok: 3 }, { id: "intervall-2", n: 3, ok: 0 }]));
  assert.deepEqual(p.lines.map((l) => [l.offer && l.offer.id, l.main]), [[null, false], ["intervall-1", true]]);
  assert.equal(p.backMain, false);
  // alles richtig bzw. ein Fehler: „Zurück zu Stufe n“ ist Hauptknopf; beim einen Fehler trotzdem ein Knopf zum Üben
  p = basicsResultPlan(PACKS, res([{ id: "noten-7", n: 3, ok: 3 }, { id: "intervall-2", n: 3, ok: 3 }]));
  assert.ok(p.backMain && p.lines.every((l) => !l.offer));
  p = basicsResultPlan(PACKS, res([{ id: "noten-7", n: 3, ok: 2 }, { id: "intervall-2", n: 3, ok: 3 }]));
  assert.ok(p.backMain);
  assert.deepEqual(p.lines.map((l) => [l.offer && l.offer.id, l.main]), [["noten-7", false], [null, false]]);
  // zwei Fehler verteilt, keine Grundlage zur Hälfte daneben: kein Hauptknopf
  p = basicsResultPlan(PACKS, res([{ id: "noten-7", n: 3, ok: 2 }, { id: "intervall-2", n: 3, ok: 2 }]));
  assert.ok(!p.backMain && p.lines.every((l) => !l.main));
  // genau die Hälfte daneben zählt (2 Aufgaben, 1 Fehler) und geht vor „höchstens ein Fehler“
  p = basicsResultPlan(PACKS, res([{ id: "noten-3", n: 2, ok: 1 }, { id: "noten-6", n: 2, ok: 2 }, { id: "noten-7", n: 2, ok: 2 }]));
  assert.ok(!p.backMain && p.lines[0].main);
  // mehrere zur Hälfte daneben: die mit dem größten Anteil
  p = basicsResultPlan(PACKS, res([{ id: "noten-7", n: 3, ok: 1 }, { id: "intervall-2", n: 3, ok: 0 }]));
  assert.deepEqual(p.lines.map((l) => l.main), [false, true]);
  // die Ansicht nutzt den Plan, „Zurück“ nur mit backMain hervorgehoben
  const src = readFileSync(new URL("../../src/views/practice.js", import.meta.url), "utf8");
  assert.ok(src.includes('<button class="btn${plan.backMain ? " primary" : ""}" id="rBack">'));
});
