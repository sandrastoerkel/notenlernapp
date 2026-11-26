// Seite „Für Lehrkräfte“ (Welle 11, Schritt 12): reine Teile – Auswahl je Paket, Link je Auswahl (nur
// Abweichungen, MuG), Rundlauf mit dem strengen Leser aus Schritt 11, QR-Code zurückgelesen, nichts auf dem Gerät
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  optionsFor, linkFor, removeLinkFor, presetForm, isPreset, presetLabel, qrLabel, REMOVE_LABEL, qrHtml, baseOf,
  QR_SCALE, QR_SCALE_SMALL, QR_TOO_LONG,
} from "../../src/views/lehrkraft.js";
import { parseLink, dranFor, JAHRGAENGE, klasseText } from "../../src/klasse.js";
import { PACKS } from "../../src/packs/index.js";
import { svgModule, lies } from "../qrleser.js";

const BASE = "https://sandrastoerkel.github.io/notenlernapp/";
const form = (jahrgang, mug = false, dran = {}) => ({ jahrgang, mug, dran: { ...dranFor(jahrgang, mug ? "mug" : null), ...dran } });

test("optionsFor: „noch nichts“ und je Stufe „bis Stufe n · Titel“", () => {
  for (const p of PACKS) {
    const o = optionsFor(p);
    assert.equal(o.length, p.levels.length + 1, p.id);
    assert.deepEqual(o[0], { value: 0, label: "noch nichts" });
    assert.deepEqual(o.slice(1).map((x) => x.value), p.levels.map((l) => l.no));
  }
  const iv = optionsFor(PACKS.find((p) => p.id === "intervalle"));
  assert.equal(iv[4].label, "bis Stufe 4 · Rein, klein, groß ohne Hilfen");
});

test("linkFor: Voreinstellung ohne dran, MuG mit zweig=mug, eigene Auswahl nur mit den Abweichungen", () => {
  assert.equal(linkFor(BASE, form(6), PACKS), `${BASE}#klasse=6`);
  assert.equal(linkFor(BASE, form(6, true), PACKS), `${BASE}#klasse=6&zweig=mug`);
  assert.equal(linkFor(BASE, form(6, false, { intervalle: 6, akkorde: 1 }), PACKS), `${BASE}#klasse=6&dran=intervalle:6,akkorde:1`);
  // MuG mit Intervalle bis 10 = Voreinstellung des MuG → kein dran
  assert.equal(linkFor(BASE, form(7, true, { intervalle: 10 }), PACKS), `${BASE}#klasse=7&zweig=mug`);
  // dieselbe Zahl wie die Voreinstellung steht nie im Link, Reihenfolge der Pakete
  assert.equal(linkFor(BASE, form(9, false, { akkorde: 2, noten: 3, tonleitern: 13 }), PACKS), `${BASE}#klasse=9&dran=noten:3,akkorde:2`);
  // 0 = „noch nichts“
  assert.equal(linkFor(BASE, form(5, false, { tonleitern: 0 }), PACKS), `${BASE}#klasse=5&dran=tonleitern:0`);
  // Basis mit Angabe nach „#“: die Angabe fällt weg
  assert.equal(linkFor(`${BASE}#lehrkraft`, form(8), PACKS), `${BASE}#klasse=8`);
  assert.equal(removeLinkFor(BASE), `${BASE}#klasse=keine`);
  assert.deepEqual(parseLink(removeLinkFor(BASE), PACKS), { keine: true });
});

// fester Zufall (Mulberry32)
function zufall(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test("Rundlauf: jeder Link der Seite wird vom strengen Leser angenommen und ergibt genau die Auswahl", () => {
  const rnd = zufall(12);
  let n = 0;
  for (const j of JAHRGAENGE) {
    for (const mug of [false, true]) {
      const forms = [form(j, mug)];
      // je Paket einzeln jede Stufe 0 … Stufenzahl
      for (const p of PACKS) for (let k = 0; k <= p.levels.length; k++) forms.push(form(j, mug, { [p.id]: k }));
      // zufällige ganze Auswahlen
      for (let r = 0; r < 20; r++) forms.push(form(j, mug, Object.fromEntries(PACKS.map((p) => [p.id, Math.floor(rnd() * (p.levels.length + 1))]))));
      for (const f of forms) {
        const link = linkFor(BASE, f, PACKS);
        const k = parseLink(link, PACKS);
        assert.ok(k, link);
        assert.deepEqual(k, { jahrgang: j, zweig: mug ? "mug" : null, dran: f.dran }, link);
        // nur Abweichungen im Link
        const def = dranFor(j, mug ? "mug" : null);
        const m = /&dran=([^&]*)/.exec(link);
        const named = m ? m[1].split(",").map((x) => x.split(":")[0]) : [];
        assert.deepEqual(named, PACKS.filter((p) => f.dran[p.id] !== def[p.id]).map((p) => p.id), link);
        assert.equal(link.includes("zweig=mug"), mug);
        n++;
      }
    }
  }
  assert.ok(n > 900);
});

test("Voreinstellung: presetForm, isPreset, Beschriftung des Knopfs", () => {
  assert.deepEqual(presetForm(6), { jahrgang: 6, mug: false, dran: dranFor(6) });
  assert.deepEqual(presetForm(6, true).dran, dranFor(6, "mug"));
  assert.ok(isPreset(presetForm(7, true), PACKS));
  assert.ok(!isPreset(form(7, false, { akkorde: 1 }), PACKS));
  assert.equal(presetLabel(6), "Voreinstellung für Jahrgang 6");
});

test("QR-Code: sprechende Beschriftung, Modulgröße ≥ 6, Ruhezone, Rücklesen ergibt den Link (kurz und lang)", () => {
  assert.equal(qrLabel(form(6)), "QR-Code für Jahrgang 6");
  assert.equal(qrLabel(form(6, true)), "QR-Code für Jahrgang 6, Musisches Gymnasium");
  assert.equal(qrLabel(form(6, false, { akkorde: 1 })), "QR-Code für Jahrgang 6, eigene Auswahl");
  assert.equal(qrLabel(form(6)), `QR-Code für ${klasseText({ jahrgang: 6, zweig: null, dran: dranFor(6) })}`);
  assert.ok(QR_SCALE >= 6 && QR_SCALE_SMALL >= 6 && QR_SCALE > QR_SCALE_SMALL);
  const kurz = linkFor(BASE, form(6), PACKS);
  const lang = linkFor(BASE, form(13, true, { noten: 3, notenwerte: 4, intervalle: 6, tonleitern: 7, akkorde: 1 }), PACKS);
  for (const [link, label, scale] of [[kurz, qrLabel(form(6)), QR_SCALE], [lang, "QR-Code für …", QR_SCALE], [removeLinkFor(BASE), REMOVE_LABEL, QR_SCALE_SMALL]]) {
    const svg = qrHtml(link, label, scale);
    assert.match(svg, /^<svg /);
    assert.ok(svg.includes(`aria-label="${label.replace(/&/g, "&amp;")}"`), label);
    const q = svgModule(svg);
    assert.ok(q.ruhe, "Ruhezone frei");
    // Breite in Pixeln = (Module + 2 · 4) · Modulgröße
    assert.ok(svg.includes(`width="${(q.size + 8) * scale}"`));
    assert.equal(lies(q).text, link);
  }
  assert.ok(svgModule(qrHtml(lang, "x")).version >= 7, "langer Link: Version ab 7");
  // zu lang für Version 10: nur der Hinweis
  assert.equal(qrHtml("x".repeat(300), "x"), `<p class="small muted">${QR_TOO_LONG}</p>`);
});

test("Basis des Links: Adresse ohne Suchteil und ohne „#…“", () => {
  assert.equal(baseOf({ origin: "https://sandrastoerkel.github.io", pathname: "/notenlernapp/", search: "?x", hash: "#lehrkraft" }), BASE);
});

test("Die Seite setzt nichts auf diesem Gerät: kein Spielstand, kein Speichern, kein localStorage", () => {
  const src = readFileSync(new URL("../../src/views/lehrkraft.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const bad of ["ctx.state", "ctx.save", "localStorage", "setKlasse", "clearKlasse", "store.js"]) assert.ok(!src.includes(bad), bad);
});

test("Anrede: „Sie“ auf der Seite, kein „du“ in index.html (Abschnitt „Für Lehrkräfte“) und in lehrkraft.js", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const sec = html.slice(html.indexOf('<section id="view-lehrkraft"'), html.indexOf("</section>", html.indexOf('<section id="view-lehrkraft"')));
  const src = readFileSync(new URL("../../src/views/lehrkraft.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  const texts = (sec + src.match(/"[^"]*"|`[^`]*`/g).join(" ")).replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(/\bSie\b/.test(sec) && /\bIhre\b/.test(sec));
  assert.ok(!/\b(du|dich|dir|dein|deine|deiner)\b/i.test(texts));
});

/* ---------- Korrektur nach der Prüfung Welle 11 (J-B9, J-B10/W-C8, L-B3) ---------- */
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../../src/app.js", import.meta.url), "utf8");
const plainText = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

test("Dialog Jahrgang: sagt, was die Startseite zeigt und dass alles bis dahin offen ist (J-B9)", () => {
  assert.ok(app.includes("`Die Startseite zeigt dir dann, was in Jahrgang ${k.jahrgang} dran ist. Alle Stufen bis dahin sind sofort offen. Dein Fortschritt bleibt, es schließt sich nichts.`"));
  assert.ok(!app.includes("Alles bis dahin ist dann sofort offen."));
});

test("Hinweis bei einem Link, der nicht passt: ohne „App-Version“, mit nächstem Schritt (J-B10, W-C8)", () => {
  const bar = html.match(/<div class="update-bar" id="klasseBar"[^>]*>([\s\S]*?)<\/div>/)[1];
  const text = plainText(bar.match(/<span class="bar-text"[^>]*>([\s\S]*?)<\/span>/)[1]);
  assert.equal(text, "Dieser Link funktioniert hier nicht. Er ist unvollständig oder passt nicht zu dieser Version der App. Frag deine Lehrkraft nach einem neuen Link. Dein Fortschritt bleibt.");
  assert.ok(!/App-Version/.test(bar));
});

test("Seite „Für Lehrkräfte“: Voreinstellung „angelehnt an“, was auf den Geräten sofort offen ist (L-B3)", () => {
  const src = plainText(html.match(/<p class="small muted" id="tSource">([\s\S]*?)<\/p>/)[1]);
  assert.equal(src, "Voreinstellung angelehnt an den LehrplanPLUS (Gymnasium Bayern, Musik). Einiges steht dort nicht wörtlich – passen Sie die Auswahl bei Bedarf an.");
  const open = plainText(html.match(/<p class="small" id="tOpen">([\s\S]*?)<\/p>/)[1]);
  assert.equal(open, "Auf den Geräten der Klasse ist danach alles bis zur gewählten Stufe sofort offen; darüber hinaus gilt weiter ‚frei ab 8 von 10‘. Was einmal offen war, bleibt offen.");
  assert.ok(!html.includes("Voreinstellung nach dem LehrplanPLUS"));
  // beide Sätze in der Karte „Was ist dran?“, Anrede „Sie“
  const card = html.slice(html.indexOf("<h3>Was ist dran?</h3>"), html.indexOf("<h3>Link für die Klasse</h3>"));
  assert.ok(card.includes('id="tOpen"') && card.includes('id="tSource"'));
  assert.ok(!/\b(du|dein|deine)\b/i.test(plainText(card)));
});
