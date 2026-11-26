// Überlauf-Prüfung im Browser: findet jedes sichtbare Element (und jede Textzeile), dessen Kasten waagrecht
// über den eigenen Rahmen hinausragt. Rahmen ist der nächste Vorfahr mit sichtbarem Rand, eigener
// Hintergrundfläche oder abschneidendem overflow (Karte, Bild im Rahmen, Rollbereich), dazu das Fenster;
// Teile eines SVG werden gegen ihr SVG geprüft. Gewollte Rollbereiche (overflow-x: auto/scroll) dürfen
// breiteren Inhalt haben, absolut gesetzte Marken mit negativem Abstand (✓/✗ am Knopf) dürfen überstehen.
//
// Seit Welle 11, Schritt 13 zusätzlich: Überlappung innerhalb einer Zeile (OVERLAP). Sichtbare Textzeilen und
// kleine Bildelemente (Kästchen, Punkte, Balken; SVG nur mit SVG), deren Kästen sich um mehr als 1 px schneiden –
// so ragte einmal bei 320 px „Bassschlüssel“ in der Statistik in „noch nicht gespielt“ hinein, ohne über einen
// Rahmen hinauszugehen. Verglichen wird nur innerhalb derselben Ebene (Seite, fest stehende Leisten, offener
// Dialog samt Hintergrund); Zeilen desselben Textknotens und übereinanderstehende Zeilen (enge Zeilenhöhe) zählen
// nicht, ebenso Größe null, aria-hidden, Marken mit negativem Abstand und Teile, die ein Rollbereich abschneidet.
// Vor jedem Lauf beweist ein Selbsttest, dass die Prüfung echte Überlappungen findet (die alte Regel min-width: 0
// in der Statistik, ein verschobenes Wort) und gewollte nicht meldet; `--selftest` führt nur ihn aus.
//
// Geprüft werden bei 320 px (dunkel) und 420 px (hell): Startseite, alle Stufen aller Pakete (Startkarte,
// Aufgabe mit offenen Hilfen, nach jeder Antwort – abwechselnd richtig und daneben –, jede Vorführung Bild
// für Bild), drei Runden „Wiederholen“ (die dritte mit der Eingabe „Klaviatur“, Prüfung Schritt 13b) (Welle 11, Schritt 8: Karteikasten mit drei fälligen Stufen vorbereitet,
// Karte „Heute“ mit „Wiederholung starten“ und „↻ wieder dran“, Start über die Karte, alle Aufgaben abwechselnd
// richtig und daneben, dazu Herkunftszeile und keine Reste der vorigen Eingabeart, Ergebniskarte mit dem Urteil je
// Stufe und „… üben“, danach die Karte „Heute“ ohne Fälliges), eine normale Runde ganz richtig („Geschafft – kommt morgen …“),
// zwei Runden „Grundlagen wiederholen“ über die Startkarte und eine Ergebniskarte mit Fehlermuster (Schritt 7),
// Startkarten mit „Dafür brauchst du“ ohne Empfehlung (Grundlagen geschafft, Schritt 13), „Lernen“ je Reiter und
// Schlüssel mit allen Vorführungen, Blitz und Statistik, zuletzt die Bestätigung beim Link der Lehrkraft (setzen,
// ändern, entfernen) und der Hinweis bei einem Link, der nicht passt (Welle 11, Schritt 11), die Startseite mit
// Jahrgang 5, 7 und 9, die Statistik mit Jahrgang und die Seite „Für Lehrkräfte“ samt „QR-Code groß zeigen“
// (Schritt 12; dort auch: Esc schließt, Fokus zurück, der gespeicherte Stand bleibt unverändert).
// In jedem Zustand zählt außerdem ein zweiter sichtbarer Knopf „Nächste Aufgabe“ als Treffer (W2, Welle 11).
// Dazu je Breite die Reihenfolge der Teile auf allen Startkarten und die Lage der Knöpfe auf acht Startkarten bei einem
// 640 px hohen Fenster (startCards, J-B1; Welle 12: aus PACKS, dazu Noten lesen 4, 12, 13) und auf
// Startkarten mit Zusatz zum Aufklappen (Tonleitern 10) auch der aufgeklappte Zusatz.
//
// Playwright ist KEINE Abhängigkeit der App (siehe spiel.mjs). Aufruf bei laufendem Server:
//   python3 -m http.server 8080 &
//   node docs/screens/ueberlauf.mjs              (oder: BASE=… BREITEN=320,360,420 RUNDEN=4 node …)
//   node docs/screens/ueberlauf.mjs --selftest   (nur der Selbsttest der Überlappungs-Prüfung)
// Ende mit Code 1, wenn es Treffer oder Konsolenfehler gibt. Läuft nicht in `npm test` (braucht einen Browser).
import { loadPlaywright, launch, BASE, KEY, vis, answerQuestion, goOn } from "./spiel.mjs";
import { PACKS } from "../../src/packs/index.js";
import { inBox, needsOf } from "../../src/repeat.js";
import { usesNames } from "../../src/engine.js";
import { RENAMED_NOTEN } from "../../src/store.js";

const playwright = loadPlaywright();
const WIDTHS = (process.env.BREITEN || "320,420").split(",").map(Number);
const ROUNDS = +(process.env.RUNDEN || 4);
const SELFTEST_ONLY = process.argv.includes("--selftest");

// läuft in der Seite: Liste der Treffer
const FIND = (rootSel) => {
  const TOL = 1;
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
  const hidden = (e) => { for (let a = e; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a);
    if (s.display === 'none' || s.visibility === 'hidden') return true; if (a.tagName === 'DETAILS' && !a.open && e !== a && !e.closest('summary')) return true; } return false; };
  const isFrame = (a) => {
    const s = getComputedStyle(a);
    if (a instanceof SVGElement) return a.tagName.toLowerCase() === 'svg';
    if (s.display === 'inline' || s.display === 'contents') return false;
    const clip = ['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX);
    const border = ['Left', 'Right'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(s['border' + k + 'Color']));
    const bg = !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) || s.backgroundImage !== 'none';
    return clip || border || (bg && a !== document.body && a !== document.documentElement);
  };
  const sel = (e) => { const p = []; for (let a = e; a && a.nodeType === 1 && p.length < 4; a = a.parentElement) {
    p.unshift(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList && a.classList.length ? '.' + [...a.classList].join('.') : '')); } return p.join(' > '); };
  const hits = [], seen = new Set();
  const test = (e, r, what) => {
    if (r.width < 0.5) return;
    // Fenster
    if (r.left < -TOL || r.right > document.documentElement.clientWidth + TOL) {
      // in einem gewollten Rollbereich? dann unten über den Rahmen geprüft
      let sc = false; for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) { sc = true; break; } }
      if (!sc) push(e, what, 'Fenster', r, { left: 0, right: document.documentElement.clientWidth });
    }
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (!isFrame(a)) { continue; }
      const f = a.getBoundingClientRect();
      const s = getComputedStyle(a);
      const scroll = ['auto', 'scroll'].includes(s.overflowX);
      if (r.left < f.left - TOL || r.right > f.right + TOL) {
        if (scroll) return;            // gewollter Rollbereich: Inhalt darf breiter sein; der Bereich selbst wird als Element geprüft
        push(e, what, sel(a), r, f, ['hidden', 'clip'].includes(s.overflowX) ? 'abgeschnitten' : 'ragt hinaus');
        return;
      }
      if (scroll || ['hidden', 'clip'].includes(s.overflowX)) return;
    }
  };
  const push = (e, what, frame, r, f, kind = 'ragt hinaus') => {
    const key = sel(e) + '|' + frame + '|' + what; if (seen.has(key)) return; seen.add(key);
    hits.push({ el: sel(e), what, frame, kind, links: Math.max(0, +(f.left - r.left).toFixed(1)), rechts: Math.max(0, +(r.right - f.right).toFixed(1)), text: (e.textContent || '').trim().slice(0, 40) });
  };
  const root = document.querySelector(rootSel || 'main') || document.body;
  for (const e of root.querySelectorAll('*')) {
    if (!vis(e) || hidden(e)) continue;
    const s = getComputedStyle(e);
    if (e.closest('[aria-hidden="true"].sr, .sr-only, .visually-hidden')) continue;
    if (s.position === 'absolute' && (parseFloat(s.right) < 0 || parseFloat(s.left) < 0 || parseFloat(s.top) < 0)) continue; // gewollt überstehende Marken (✓ am Knopf)
    if (s.clip !== 'auto' || s.clipPath !== 'none') continue;
    if (e instanceof SVGElement && e.tagName.toLowerCase() !== 'svg') {
      if (!e.getBBox || ['g', 'defs', 'title', 'desc', 'tspan'].includes(e.tagName.toLowerCase())) continue;
      const svg = e.ownerSVGElement; if (!svg) continue;
      const r = e.getBoundingClientRect(), f = svg.getBoundingClientRect();
      if (r.left < f.left - TOL || r.right > f.right + TOL) push(e, 'svg-Teil', sel(svg), r, f, getComputedStyle(svg).overflow === 'visible' ? 'ragt hinaus' : 'abgeschnitten');
      continue;
    }
    test(e, e.getBoundingClientRect(), 'Kasten');
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) test(e, r, 'Text');
    }
  }
  return hits;
};

// läuft in der Seite: Überlappung innerhalb einer Zeile (Welle 11, Schritt 13), Beschreibung oben. Blätter sind
// Textzeilen (Range#getClientRects je Textknoten), leere Elemente mit Fläche oder Rand (Kästchen, Punkte, Balken),
// Bilder, Formularfelder und SVG (als Ganzes). Treffer: zwei Blätter derselben Ebene, die sich waagrecht und
// senkrecht um mehr als TOL schneiden; ist Text beteiligt, muss die senkrechte Überdeckung mindestens die halbe
// Zeilenhöhe sein (sonst stehen zwei Zeilen nur eng übereinander). SVG wird nur mit SVG verglichen: Notenzeilen
// haben durchsichtige Ränder, auf denen Beschriftungen gewollt liegen (Notenkarte der Statistik).
const OVERLAP = () => {
  const TOL = 1;
  const de = document.documentElement;
  const css = new Map(), seenShown = new Map();
  const cs = (e) => { let s = css.get(e); if (!s) { s = getComputedStyle(e); css.set(e, s); } return s; };
  const sel = (e) => { const p = []; for (let a = e; a && a.nodeType === 1 && p.length < 4; a = a.parentElement) {
    p.unshift(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.classList && a.classList.length ? '.' + [...a.classList].join('.') : '')); } return p.join(' > '); };
  // sichtbar und gezählt? (Vorfahren: display, opacity, aria-hidden, zugeklappte <details>, sr-only, Marken)
  const counts = (e) => {
    if (seenShown.has(e)) return seenShown.get(e);
    const s = cs(e);
    let ok = s.visibility === 'visible' && s.display !== 'none' && +s.opacity !== 0 && e.getAttribute('aria-hidden') !== 'true'
      && s.clip === 'auto' && s.clipPath === 'none'
      && !(s.position === 'absolute' && (parseFloat(s.right) < 0 || parseFloat(s.left) < 0 || parseFloat(s.top) < 0));
    const p = e.parentElement;
    if (ok && p && p !== de) {
      if (p.tagName === 'DETAILS' && !p.open && e.tagName !== 'SUMMARY') ok = false;
      else ok = counts(p);
    }
    seenShown.set(e, ok);
    return ok;
  };
  // Ebene: offener Dialog oder fest stehende Leiste (Kopf, untere Leiste), sonst die Seite
  const layerOf = (e) => { for (let a = e; a && a.nodeType === 1; a = a.parentElement) {
    if (a.tagName === 'DIALOG' && a.open) return a;
    const p = cs(a).position; if (p === 'fixed' || p === 'sticky') return a; } return de; };
  // sichtbarer Teil: geschnitten mit jedem abschneidenden Vorfahren innerhalb der Ebene (from: bei Text das
  // Element des Textes selbst, bei Bildelementen ihr Elternteil – der eigene overflow schneidet den eigenen Kasten nicht)
  const clip = (from, layer, r) => {
    let l = r.left, t = r.top, rr = r.right, b = r.bottom;
    for (let a = from; a && a !== de && a !== document.body; a = a.parentElement) {
      const s = cs(a);
      const cx = s.overflowX !== 'visible', cy = s.overflowY !== 'visible';
      if (cx || cy) { const f = a.getBoundingClientRect();
        if (cx) { l = Math.max(l, f.left); rr = Math.min(rr, f.right); } if (cy) { t = Math.max(t, f.top); b = Math.min(b, f.bottom); } }
      if (a === layer) break;
    }
    return { l, t, r: rr, b };
  };
  const painted = (s) => !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) || s.backgroundImage !== 'none'
    || ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none');
  const GRAPHIC = ['svg', 'img', 'canvas', 'video', 'input', 'select', 'textarea', 'progress', 'meter'];
  const leaves = [];
  const add = (r, kind, el, node) => {
    const layer = layerOf(el);
    const c = clip(node ? el : el.parentElement || el, layer, r);
    if (c.r - c.l <= 0.5 || c.b - c.t <= 0.5) return;
    leaves.push({ ...c, h: r.bottom - r.top, kind, el, node, layer });
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) {
      if (!n.textContent.trim()) continue;
      const p = n.parentElement;
      if (!p || p.closest('svg, select, option, script, style, noscript, template, title') || !counts(p)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) add(r, 'Text', p, n);
      continue;
    }
    const tag = n.tagName.toLowerCase();
    if (n instanceof SVGElement && tag !== 'svg') continue;
    if (tag === 'svg' && n.parentElement && n.parentElement.closest('svg')) continue;
    const graphic = GRAPHIC.includes(tag) || (!n.children.length && !n.textContent.trim() && painted(cs(n)));
    if (!graphic || !counts(n)) continue;
    add(n.getBoundingClientRect(), tag === 'svg' ? 'SVG' : 'Bild', n, null);
  }
  leaves.sort((a, b) => a.t - b.t);
  const lca = (a, b) => { for (let x = a; x; x = x.parentElement) if (x.contains(b)) return x; return de; };
  const word = (x) => (x.node ? x.node.textContent.trim() : (x.el.textContent || '').trim() || '<' + x.el.tagName.toLowerCase() + '>').slice(0, 30);
  const hits = [], seen = new Set();
  for (let i = 0; i < leaves.length; i++) {
    const A = leaves[i];
    for (let j = i + 1; j < leaves.length && leaves[j].t < A.b - TOL; j++) {
      const B = leaves[j];
      if (A.layer !== B.layer || (A.node && A.node === B.node) || A.el === B.el && !A.node) continue;
      if ((A.kind === 'SVG') !== (B.kind === 'SVG')) continue;
      const w = Math.min(A.r, B.r) - Math.max(A.l, B.l), h = Math.min(A.b, B.b) - Math.max(A.t, B.t);
      if (w <= TOL || h <= TOL) continue;
      if ((A.kind === 'Text' || B.kind === 'Text') && h < 0.5 * Math.min(A.h, B.h)) continue;
      const [P, Q] = sel(A.el) <= sel(B.el) ? [A, B] : [B, A];
      const key = sel(P.el) + '|' + sel(Q.el);
      if (seen.has(key)) continue; seen.add(key);
      hits.push({ el: sel(P.el) + '  ⟷  ' + sel(Q.el), what: P.kind + '/' + Q.kind, frame: sel(lca(A.el, B.el)), kind: 'Überlappung',
        links: 0, rechts: +w.toFixed(1), text: `${word(P)} ⟷ ${word(Q)}` });
    }
  }
  return hits;
};

// läuft in der Seite: Zahl der sichtbaren Knöpfe „Nächste Aufgabe“ (unter den Antworten und am Ende der Vorführung)
const NEXT_COUNT = () => [...document.querySelectorAll("button")].filter((b) => {
  if (b.textContent.trim() !== "Nächste Aufgabe") return false;
  for (let a = b; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === "none" || s.visibility === "hidden") return false;
    if (a.tagName === "DETAILS" && !a.open && a !== b) return false; }
  const r = b.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5;
}).length;

// Runden „Wiederholen“ (je drei fällige Stufen, 4 + 3 + 3): Namensraster, Auswahlknöpfe, zwei Schritte;
// Buchstaben, namesOnly, lange Auswahltexte; mit der Eingabe „Klaviatur“ (Prüfung Schritt 13b): Klaviatur,
// Auswahlknöpfe und Namensraster (namesOnly bleibt beim Namensraster) im Wechsel
// Stufen-IDs aus dem Code (LESSONS: Abdeckung aus den Listen im Code). Welle 12: „Noten lesen“ hat 15 Stufen; die
// Stufen von früher heißen nach RENAMED_NOTEN (alt 7 „Noten mit Vorzeichen“ → neu 12, alt 3 → 5, alt 8 → 15). Jede
// Stufe einer gemischten Runde muss im Kasten sein (ohne Hilfen) – sonst bricht das Skript gleich am Anfang ab.
const LEVEL = Object.fromEntries(PACKS.flatMap((p) => p.levels.map((l) => [l.id, l])));
const NOTEN = PACKS.find((p) => p.id === "noten").levels;
const BOX = (id, names) => {
  const l = LEVEL[id];
  if (!l || !inBox(l) || (names !== undefined && usesNames(l) !== names)) throw new Error(`ueberlauf.mjs: ${id} passt nicht (gibt es nicht, hat Hilfen oder falsche Eingabe)`);
  return id;
};
const NOTEN_NAMES = BOX(RENAMED_NOTEN["noten-7"], true);     // Namensraster (Vorzeichen im Violinschlüssel ohne Hilfen)
const NOTEN_LETTERS = BOX(RENAMED_NOTEN["noten-3"], false);  // Buchstaben/Klaviatur (Violinschlüssel mit Hilfslinien)
const NOTEN_LATER = BOX(RENAMED_NOTEN["noten-8"]);           // im Kasten, erst in drei Tagen fällig (Alles gemischt)
const MIXED = [
  { ids: [NOTEN_NAMES, "notenwerte-5", "intervall-4"] },
  { ids: [NOTEN_LETTERS, "intervall-9", "akkorde-6"] },
  { ids: [NOTEN_LETTERS, "intervall-4", "intervall-9"], input: "keys" },
];
MIXED.forEach((m) => m.ids.forEach((id) => BOX(id)));
// Runde ganz richtig mit „Geschafft – kommt morgen …“: die erste Stufe von „Noten lesen“ ohne Hilfen und ohne
// Namensraster, die nach der letzten Runde „Wiederholen“ nicht im Kasten ist (früher noten-1; seit Welle 12 hat
// Stufe 1 Hilfen und kommt nie in den Kasten)
const NOTEN_FIRST_BOX = NOTEN.find((l) => inBox(l) && !usesNames(l) && ![...MIXED.at(-1).ids, NOTEN_LATER].includes(l.id));
if (!NOTEN_FIRST_BOX) throw new Error("ueberlauf.mjs: keine Stufe für „Geschafft“");
// läuft in der Seite: Karteikasten im gespeicherten Stand so setzen, dass genau ids fällig sind (am längsten fällig
// zuerst; die erste mit zuletzt: null wie nach der Umstellung) und later (NOTEN_LATER) erst in drei Tagen; Eingabe input
// („letters“ oder „keys“); danach neu laden
const SETREP = async ([ids, input, later]) => {
  const st = await import("./src/store.js");
  const t = st.today(), s = JSON.parse(localStorage.getItem(st.KEY_V2));
  s.input = input;
  s.rep = { [later]: { fach: 3, faellig: st.addDays(t, 3), zuletzt: t } };
  ids.forEach((id, i) => { s.rep[id] = { fach: 2, faellig: st.addDays(t, -3 + i), zuletzt: i ? st.addDays(t, -6) : null }; });
  localStorage.setItem(st.KEY_V2, JSON.stringify(s));
};
// läuft in der Seite: Grundlagen der Stufen ids als geschafft eintragen (9 von 10, gestern, nicht fällig), damit die
// Startkarten „Dafür brauchst du“ ohne Empfehlung zeigen; danach neu laden
const SETBASICS = async (ids) => {
  const st = await import("./src/store.js");
  const { needsOf } = await import("./src/repeat.js");
  const { PACKS } = await import("./src/packs/index.js");
  const t = st.today(), s = JSON.parse(localStorage.getItem(st.KEY_V2));
  for (const id of ids) for (const n of needsOf(PACKS, id)) {
    s.levels[n] = { stars: 3, best: 9, played: 1, last: 9, day: st.addDays(t, -1) };
    s.rep[n] = { fach: 2, faellig: st.addDays(t, 2), zuletzt: st.addDays(t, -1) };
  }
  s.basics = {};
  localStorage.setItem(st.KEY_V2, JSON.stringify(s));
};
// läuft in der Seite: prüfen, dass Herkunftszeile und Antwortbereich zur Stufe der aktuellen Aufgabe der gemischten
// Runde passen (Fehlertext oder "")
const MIXED_CHECK = async () => {
  const e = await import("./src/engine.js");
  const q = e.currentQuestion();
  if (!q || !q.from) return "keine Aufgabe der gemischten Runde";
  const o = document.querySelector("#pOrigin"), a = document.querySelector("#pAnswers"), piano = document.querySelector("#pPiano");
  const bad = [];
  if (o.hidden || o.textContent !== e.originText(q.fromPack, q.from)) bad.push(`Herkunft „${o.textContent}“`);
  const choices = q.from.input === "choices";
  if (choices && a.querySelector("[data-letter]")) bad.push("Buchstaben bei Auswahlknöpfen");
  if (!choices && a.querySelector("[data-choice]")) bad.push("Auswahlknöpfe bei Buchstaben");
  if (!choices && a.classList.contains("names") !== !!q.from.acc) bad.push("Namensraster falsch");
  // Eingabe „Klaviatur“: Tasten genau bei Buchstaben-Stufen ohne namesOnly, dann ohne Antwortknöpfe (Prüfung Schritt 13b)
  const keys = e.effectiveInput(q.from.input, JSON.parse(localStorage.getItem("notenheld.v2")).input, !!q.from.namesOnly) === "keys";
  if (piano.hidden === keys) bad.push(keys ? "keine Klaviatur" : "Klaviatur übrig");
  if (keys && !a.hidden) bad.push("Antwortknöpfe neben der Klaviatur");
  if (!document.querySelector("#pHelps").hidden) bad.push("Hilfen sichtbar");
  return bad.length ? `${q.from.id}: ${bad.join(", ")}` : "";
};

// Selbsttest der Überlappungs-Prüfung (320 px, dunkel): ohne Eingriff 0 Treffer in der Statistik; die alte Regel
// min-width: 0 (Prüfung Schritt 8) und ein verschobenes Wort werden gefunden; gewollte Fälle (Marke mit negativem
// Abstand, aria-hidden, Größe null, großer QR-Code als Dialog über der Seite) nicht. Gibt eine Fehlerliste zurück.
async function selftest(browser) {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 900 }, colorScheme: "dark", serviceWorkers: "block" });
  const pg = await ctx.newPage();
  const fails = [];
  const n = async () => (await pg.evaluate(OVERLAP)).length;
  await pg.goto(BASE); await pg.waitForTimeout(500);
  await pg.click('.tab[data-view="stats"]'); await pg.waitForTimeout(300);
  const base = await pg.evaluate(OVERLAP);
  if (base.length) fails.push(`Statistik ohne Eingriff: ${base.length} Treffer (erwartet 0): ${base.map((h) => h.text).join("; ")}`);
  await pg.addStyleTag({ content: ".level-stat-name { min-width: 0 !important; }" }).then((h) => h.evaluate((e) => { e.id = "ueSelf"; }));
  await pg.waitForTimeout(100);
  const old = await pg.evaluate(OVERLAP);
  if (!old.some((h) => /level-stat/.test(h.el))) fails.push("alte Regel min-width: 0 in der Statistik nicht gefunden");
  await pg.evaluate(() => document.querySelector("#ueSelf").remove());
  // Prüfzeilen in der ersten Gruppe der Statistik (im normalen Fluss, kurz genug für eine Zeile bei 320 px)
  const probe = (html) => pg.evaluate((h) => { document.querySelectorAll(".ueProbe").forEach((e) => e.remove());
    document.querySelector("#sLevels .level-group").insertAdjacentHTML("beforeend", h); }, html);
  // ein Wort, das nach links in das Wort davor geschoben ist
  await probe('<p class="small ueProbe">Wort Wort <span id="ueShift" style="position: relative; left: -30px">XYZ</span></p>');
  if (!(await pg.evaluate(OVERLAP)).some((h) => /ueShift/.test(h.el))) fails.push("verschobenes Wort nicht gefunden");
  // gewollte Fälle: Marke mit negativem Abstand (wie ✓ am Knopf), aria-hidden, Größe null
  await probe('<p class="small ueProbe"><span style="position: relative; display: inline-block">Wort Wort<span style="position: absolute; top: -4px; right: -3px">✓</span></span></p>'
    + '<p class="small ueProbe">Wort Wort <span aria-hidden="true" style="margin-left: -30px">··</span></p>'
    + '<p class="small ueProbe">Wort Wort<span style="display: inline-block; width: 0; height: 0; position: relative; left: -20px; background: red"></span></p>');
  const ok = await pg.evaluate(OVERLAP);
  if (ok.length) fails.push(`gewollte Überdeckungen gemeldet: ${ok.map((h) => h.el).join("; ")}`);
  // Gegenprobe: dieselbe Marke ohne negativen Abstand mitten im Wort wird gefunden
  await probe('<p class="small ueProbe"><span style="position: relative; display: inline-block">Wort Wort<span id="ueMark" style="position: absolute; top: 0; left: 10px">✓</span></span></p>');
  if (!(await pg.evaluate(OVERLAP)).some((h) => /ueMark/.test(h.el))) fails.push("Marke über dem Wort (ohne negativen Abstand) nicht gefunden");
  await probe("");
  // Dialog über der Seite: der große QR-Code wird nicht mit der Seite darunter verglichen
  await pg.goto(BASE + "#lehrkraft"); await pg.waitForTimeout(400);
  await pg.click("#tBig"); await pg.waitForTimeout(250);
  if (await n()) fails.push("großer QR-Code: Dialog mit der Seite darunter verglichen");
  await ctx.close();
  return fails;
}

// Startkarten (Korrektur nach der Prüfung Welle 11, J-B1): alle Startkarten (seit Welle 12; früher nur die sechs
// Karten, die die Prüfung aus Sicht der Jugendlichen gemessen hat), bei width × 640 (etwa 580 px über der unteren Leiste), alles offen und nichts gespielt
// (mit Empfehlung), danach mit geschafften Grundlagen (ohne Empfehlung). Geprüft wird:
// - Reihenfolge (alle Karten): nach dem Hinweis (mit Empfehlung nach deren Satz) kommen sofort die Knöpfe, „Dafür brauchst du“ und
//   der Tastatur-Hinweis erst danach; zwischen zwei Teilen höchstens der Abstand der Karte;
// - erster Bildschirm: Auf den Karten, deren Startknopf schon auf main 2f3dfe8 bei 320 px im ersten Bildschirm lag
//   (FIRST_SCREEN), liegt der erste Knopf ganz darin, ohne Empfehlung auch „Runde starten“;
// - seit Sandras Entscheidung (26.11.2026, „Offen für Sandra“ 20, Hinweise leicht gekürzt): Bei 320 px beginnt der
//   erste Knopf auch auf Intervalle 3 und Tonleitern 12 mit Empfehlung im ersten Bildschirm (FIRST_SCREEN_320,
//   oberer Rand unter der Grenze). Tonleitern 10 (Reihenfolge der Vorzeichen zum Aufklappen) erreicht das ohne
//   Verlust an Inhalt nicht; seine Lage steht nur in der Ausgabe.
// Die Lage des ersten Knopfs und von „Runde starten“ steht in der Ausgabe (zum Vergleich mit dem Bericht).
// Welle 12 (PLAN Schritt 6): noten-12 statt noten-7 (gleicher Inhalt), dazu noten-4 und noten-13 (neu, mit Hilfen).
// Reihenfolge und Lücken prüft startCards seitdem auf allen Startkarten (aus PACKS); die Lage steht nur für
// START_CARDS in der Ausgabe.
const START_CARDS = ["intervall-3", "tonleitern-10", "tonleitern-12", "noten-4", "noten-12", "noten-13", "notenwerte-6", "akkorde-1"];
const ALL_CARDS = Object.keys(LEVEL);
[...START_CARDS].forEach((id) => { if (!LEVEL[id]) throw new Error(`ueberlauf.mjs: Startkarte ${id} gibt es nicht`); });
const FIRST_SCREEN = ["notenwerte-6", "akkorde-1"];
// Welle 12, Schritt 7: dazu Noten lesen 12 (Hinweis leicht gekürzt wie bei Intervalle 3 und Tonleitern 12)
const FIRST_SCREEN_320 = ["intervall-3", "tonleitern-12", "noten-12"];
// läuft in der Seite: Teile der Startkarte in ihrer Reihenfolge, Lage im Dokument und Grenze des ersten Bildschirms
const INTRO = () => {
  const parts = [...document.querySelectorAll("#pIntro > *")].filter((e) => !e.hidden && e.getBoundingClientRect().height > 0)
    .map((e) => { const r = e.getBoundingClientRect(); return { id: e.id, btn: e.tagName === "BUTTON", top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }; });
  return { parts, lim: innerHeight - document.querySelector(".tabs").offsetHeight };
};
// „Alle Stufen offen“ einschalten: #unlockAll ist ein Umschalter – nie blind klicken (LESSONS, Welle 12, Schritt 4:
// ein zweiter Klick schaltet wieder aus). Erst den gespeicherten Stand lesen, nur bei „aus“ klicken, danach prüfen.
async function openAll(pg) {
  const on = () => pg.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || "{}").unlockAll === true; } catch { return false; } }, KEY);
  if (!(await on())) { await pg.click("#unlockAll"); await pg.waitForTimeout(300); }
  if (!(await on())) throw new Error("ueberlauf.mjs: „Alle Stufen offen“ ist nach dem Klick nicht an");
}
async function startCards(browser, width, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: 640 }, colorScheme: scheme, serviceWorkers: "block" });
  const pg = await ctx.newPage();
  const errs = [], lines = [];
  await pg.goto(BASE); await pg.waitForTimeout(500);
  await openAll(pg);
  for (const mit of [true, false]) {
    if (!mit) { await pg.evaluate(SETBASICS, ALL_CARDS); await pg.reload(); await pg.waitForTimeout(500); }
    const row = [];
    for (const id of ALL_CARDS) {
      await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(150);
      await pg.click(`.level[data-id="${id}"]`); await pg.waitForTimeout(250);
      await pg.evaluate(() => window.scrollTo(0, 0));
      const { parts, lim } = await pg.evaluate(INTRO);
      const where = `Startkarte ${id} ${width} px ${mit ? "mit" : "ohne"} Empfehlung`;
      const ids = parts.map((p) => p.id);
      const first = parts.findIndex((p) => p.btn), start = parts.find((p) => p.id === "pStart");
      // Empfehlung nur bei Stufen mit Voraussetzungen (needsOf); ohne Voraussetzungen kommt nach dem Hinweis sofort der Knopf
      const lead = mit && needsOf(PACKS, id).length ? ["pHint", "pBasicsWhy"] : ["pHint"];
      if (ids.slice(0, first).join() !== lead.join()) errs.push(`${where}: vor dem ersten Knopf steht ${ids.slice(0, first).join(", ")}`);
      if (parts.slice(first).some((p, i, a) => !p.btn && a.slice(i).some((q) => q.btn))) errs.push(`${where}: Text zwischen den Knöpfen (${ids.join(", ")})`);
      if (ids.indexOf("pNeeds") >= 0 && ids.indexOf("pNeeds") < first) errs.push(`${where}: „Dafür brauchst du“ vor den Knöpfen`);
      for (let i = 1; i < parts.length; i++) if (parts[i].top - parts[i - 1].bottom > 12) errs.push(`${where}: Lücke vor ${parts[i].id} (${parts[i].top - parts[i - 1].bottom} px)`);
      if (FIRST_SCREEN.includes(id)) {
        if (parts[first].bottom > lim) errs.push(`${where}: erster Knopf nicht ganz im ersten Bildschirm (${parts[first].bottom} > ${lim})`);
        if (!mit && start.bottom > lim) errs.push(`${where}: „Runde starten“ nicht ganz im ersten Bildschirm (${start.bottom} > ${lim})`);
      }
      if (width === 320 && FIRST_SCREEN_320.includes(id) && parts[first].top >= lim) errs.push(`${where}: erster Knopf beginnt nicht im ersten Bildschirm (${parts[first].top} ≥ ${lim})`);
      if (START_CARDS.includes(id)) row.push(`${id} ${parts[first].top}${parts[first].id === "pStart" ? "" : `/${start.top}`}`);
    }
    lines.push(`  Startkarten ${width} × 640 ${mit ? "mit" : "ohne"} Empfehlung (oberer Rand erster Knopf[/„Runde starten“], erster Bildschirm bis 580 px): ${row.join(", ")}`);
  }
  await ctx.close();
  return { errs, lines };
}

async function run(browser, width, scheme) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, serviceWorkers: "block" });
  const pg = await ctx.newPage();
  const errs = [], all = new Map();
  pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  pg.on("pageerror", (e) => errs.push(String(e)));
  await pg.goto(BASE); await pg.waitForTimeout(600);
  const chk = async (where, rootSel) => {
    await pg.waitForTimeout(60);
    const hs = await pg.evaluate(FIND, rootSel);
    if (await pg.evaluate("document.documentElement.scrollWidth > innerWidth")) hs.push({ el: "html", what: "Seite", frame: "Fenster", kind: "waagrechter Überlauf", links: 0, rechts: 0, text: "" });
    // Überlappung innerhalb einer Zeile (Welle 11, Schritt 13): ganze Seite, je Ebene
    hs.push(...await pg.evaluate(OVERLAP));
    // W2 (Welle 11): „Nächste Aufgabe“ höchstens einmal sichtbar
    const nexts = await pg.evaluate(NEXT_COUNT);
    if (nexts > 1) hs.push({ el: "button", what: "Knopf", frame: "Seite", kind: "doppelter Knopf „Nächste Aufgabe“", links: 0, rechts: 0, text: `${nexts}×` });
    for (const h of hs) {
      const k = [h.el, h.frame, h.what, h.kind].join("|"), old = all.get(k);
      if (!old) all.set(k, { ...h, wo: [where] });
      else { old.wo.push(where); old.rechts = Math.max(old.rechts, h.rechts); old.links = Math.max(old.links, h.links); }
    }
  };
  const visible = (sel) => vis(pg, sel);
  // alle Vorführungen im Bereich: öffnen und Bild für Bild bis zum Ergebnis
  const demos = async (scope, where) => {
    const open = pg.locator(`${scope} [data-demo-btn]`);
    for (let i = 0; i < await open.count(); i++) {
      const b = open.nth(i);
      if (!(await b.isVisible()) || (await b.isDisabled())) continue;
      await b.click(); await pg.waitForTimeout(250); await chk(`${where} Vorführung ${i + 1} Bild 1`);
    }
    const next = pg.locator(`${scope} .demo [data-act="next"]`);
    for (let i = 0; i < await next.count(); i++) {
      for (let k = 2; k < 80 && (await next.nth(i).isVisible()) && !(await next.nth(i).isDisabled()); k++) {
        await next.nth(i).click(); await pg.waitForTimeout(25); await chk(`${where} Vorführung ${i + 1} Bild ${k}`);
      }
    }
  };
  // eine Aufgabe beantworten (aktuelle Aufgabe über engine.currentQuestion), nach jedem Schritt prüfen
  const answer = (w, right) => answerQuestion(pg, right, (label) => chk(`${w} ${label}`), errs);
  await chk("Start (gesperrt)");
  await openAll(pg); await chk("Start (offen)");
  const levels = await pg.evaluate("[...document.querySelectorAll('.level[data-id]')].map((e) => e.dataset.id)");
  for (const lid of levels) {
    await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(120);
    await pg.click(`.level[data-id="${lid}"]`); await pg.waitForTimeout(200); await chk(`${lid} Startkarte`);
    // Zusatz zum Aufklappen unter dem Hinweis (Tonleitern 10, Sandra 26.11.2026): zu Beginn zu, aufgeklappt ohne
    // Überlauf, Tippfläche mindestens 44 px hoch
    if (await pg.$("#pHint details")) {
      if (await pg.evaluate("document.querySelector('#pHint details').open")) errs.push(`${lid} Startkarte: Zusatz nicht zugeklappt`);
      const h = await pg.evaluate("document.querySelector('#pHint details > summary').getBoundingClientRect().height");
      if (h < 44) errs.push(`${lid} Startkarte: Tippfläche des Zusatzes nur ${h} px hoch`);
      await pg.click("#pHint details > summary"); await pg.waitForTimeout(120); await chk(`${lid} Startkarte, Zusatz aufgeklappt`);
    }
    await pg.click("#pStart"); await pg.waitForTimeout(250);
    for (let rnd = 0; rnd < ROUNDS && !(await visible("#pResult")); rnd++) {
      const w = `${lid} Aufgabe ${rnd + 1}`, right = rnd % 2 === 0;
      if ((await visible("#pHelps")) && !(await pg.evaluate("document.querySelector('#pHelps').open"))) { await pg.click("#pHelps summary"); await pg.waitForTimeout(150); }
      await chk(`${w} Frage`);
      await answer(w, right);
      if (rnd < 2 && (await visible("#pHelps"))) await demos("#pHelpsBody", w);
      await goOn(pg);
    }
  }
  // Runden „Wiederholen“ über die Karte „Heute“ (Welle 11, Schritt 8): jede Aufgabe, abwechselnd richtig und daneben
  for (const [k, { ids, input = "letters" }] of MIXED.entries()) {
    await pg.evaluate(SETREP, [ids, input, NOTEN_LATER]); await pg.reload(); await pg.waitForTimeout(600);
    if (!(await visible("#homeReview"))) errs.push(`Wiederholen ${k + 1}: kein Knopf „Wiederholung starten“`);
    const again = await pg.locator("#levelList .again").count();
    if (again !== ids.length) errs.push(`Wiederholen ${k + 1}: ${again}× „wieder dran“ statt ${ids.length}×`);
    await chk(`Wiederholen ${k + 1} Startseite „Heute“ fällig`);
    await pg.click("#homeReview"); await pg.waitForTimeout(250);
    for (let rnd = 0; rnd < 12 && !(await visible("#pResult")); rnd++) {
      const w = `gemischt ${k + 1} Aufgabe ${rnd + 1}`, right = rnd % 2 === 0;
      const bad = await pg.evaluate(MIXED_CHECK);
      if (bad) errs.push(`${w}: ${bad}`);
      await chk(`${w} Frage`);
      await answer(w, right);
      await goOn(pg);
    }
    if (!(await visible("#pResult"))) errs.push(`gemischt ${k + 1}: keine Ergebniskarte`);
    const lines = await pg.locator("#pResult .review-line").count();
    if (lines !== ids.length) errs.push(`Wiederholen ${k + 1}: ${lines} Zeilen mit Urteil statt ${ids.length}`);
    await chk(`gemischt ${k + 1} Ergebnis`);
    // „Stufe … mit Hilfen üben“ bzw. „Stufe … üben“ öffnet die Startkarte
    if (await pg.locator("#pResult [data-review-open]").count()) {
      await pg.locator("#pResult [data-review-open]").first().click(); await pg.waitForTimeout(250);
      if (!(await visible("#pIntro"))) errs.push(`Wiederholen ${k + 1}: „… üben“ öffnet keine Startkarte`);
      await chk(`Wiederholen ${k + 1} „… üben“ Startkarte`);
    }
    await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(200);
    if (await visible("#homeReview")) errs.push(`Wiederholen ${k + 1}: nach der Runde noch „Wiederholung starten“`);
    if (!/^Nächste Wiederholung: /.test(await pg.locator("#homeSmall").textContent())) errs.push(`Wiederholen ${k + 1}: keine Zeile „Nächste Wiederholung“`);
    await chk(`Wiederholen ${k + 1} Startseite „Heute“ nicht fällig`);
  }
  // wieder Buchstaben für den Rest des Laufs
  await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem("notenheld.v2")); s.input = "letters"; localStorage.setItem("notenheld.v2", JSON.stringify(s)); });
  await pg.reload(); await pg.waitForTimeout(600);
  // Normale Runde ganz richtig in einer Stufe ohne Hilfen (noch nicht im Kasten): „Geschafft – kommt morgen …“ auf der Ergebniskarte
  const gw = `Noten lesen ${NOTEN_FIRST_BOX.no}`;
  await pg.click(`.level[data-id="${NOTEN_FIRST_BOX.id}"]`); await pg.waitForTimeout(200);
  await pg.click("#pStart"); await pg.waitForTimeout(250);
  for (let rnd = 0; rnd < 12 && !(await visible("#pResult")); rnd++) {
    await answer(`Kasten Aufgabe ${rnd + 1}`, true);
    await goOn(pg);
  }
  if (!(await visible("#rRepeat"))) errs.push(`${gw} ganz richtig: kein Satz „Geschafft – kommt morgen …“`);
  await chk(`${gw} Ergebnis „Geschafft“`);
  // „Grundlagen wiederholen“ über die Startkarte (Welle 11, Schritt 7): Intervalle 3 (Ziffern, Namensraster) und
  // Dreiklänge 1 (zwei Schritte, Namensraster), jede Aufgabe abwechselnd richtig und daneben, dann „Zurück zu Stufe …“
  for (const lid of ["intervall-3", "akkorde-1"]) {
    await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(120);
    await pg.click(`.level[data-id="${lid}"]`); await pg.waitForTimeout(200);
    if (!(await visible("#pNeeds")) || !(await visible("#pBasics"))) errs.push(`${lid}: kein Angebot „Grundlagen wiederholen“`);
    await chk(`${lid} Startkarte mit Grundlagen`);
    await pg.click("#pBasics"); await pg.waitForTimeout(250);
    for (let rnd = 0; rnd < 8 && !(await visible("#pResult")); rnd++) {
      const w = `Grundlagen ${lid} Aufgabe ${rnd + 1}`, right = rnd % 2 === 0;
      const bad = await pg.evaluate(MIXED_CHECK);
      if (bad) errs.push(`${w}: ${bad}`);
      await chk(`${w} Frage`);
      await answer(w, right);
      await goOn(pg);
    }
    if (!(await visible("#pResult"))) errs.push(`Grundlagen ${lid}: keine Ergebniskarte`);
    await chk(`Grundlagen ${lid} Ergebnis`);
    await pg.click("#rBack"); await pg.waitForTimeout(250); await chk(`Grundlagen ${lid} zurück zur Startkarte`);
  }
  // Ergebniskarte mit Fehlermuster (Welle 11, Schritt 7): Intervalle 4, jede Antwort daneben
  await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(120);
  await pg.click('.level[data-id="intervall-4"]'); await pg.waitForTimeout(200);
  await pg.click("#pStart"); await pg.waitForTimeout(250);
  for (let rnd = 0; rnd < 12 && !(await visible("#pResult")); rnd++) {
    await answer(`Muster Aufgabe ${rnd + 1}`, false); await goOn(pg);
  }
  if (!(await visible("#pResult .gap-line"))) errs.push("Intervalle 4 ganz daneben: kein Fehlermuster auf der Ergebniskarte");
  await chk("Intervalle 4 Ergebnis mit Fehlermuster");
  // Startkarten mit „Dafür brauchst du“ ohne Empfehlung (Welle 11, Schritt 13): Grundlagen geschafft, nicht fällig
  const NEEDY = ["intervall-3", "tonleitern-12", "akkorde-1", "notenwerte-6"];
  await pg.evaluate(SETBASICS, NEEDY); await pg.reload(); await pg.waitForTimeout(600);
  for (const lid of NEEDY) {
    await pg.click('.tab[data-view="home"]'); await pg.waitForTimeout(120);
    await pg.click(`.level[data-id="${lid}"]`); await pg.waitForTimeout(200);
    if (!(await visible("#pNeeds")) || (await visible("#pBasicsWhy"))) errs.push(`${lid}: Startkarte ohne Empfehlung stimmt nicht`);
    await chk(`${lid} Startkarte ohne Empfehlung`);
  }
  // „Lernen“ je Reiter (Welle 11, W3) und, wo die Schlüsselwahl sichtbar ist, je Schlüssel, mit allen Vorführungen
  await pg.click('.tab[data-view="learn"]'); await pg.waitForTimeout(300);
  const ltabs = await pg.evaluate("[...document.querySelectorAll('#lTabs [role=tab]')].map((e) => e.dataset.tab)");
  for (const t of ltabs) {
    await pg.click(`#ltab-${t}`); await pg.waitForTimeout(300);
    const clefs = (await visible("#lClefs")) ? ["lTreble", "lBass"] : [null];
    for (const clef of clefs) {
      if (clef) { await pg.click("#" + clef); await pg.waitForTimeout(400); }
      const w = `Lernen ${t}${clef ? " " + clef : ""}`;
      await chk(w); await demos("#view-learn", w);
    }
  }
  await pg.click('.tab[data-view="blitz"]'); await pg.waitForTimeout(300); await chk("Blitz Startkarte");
  await pg.click("#bStart"); await pg.waitForTimeout(300); await chk("Blitz Frage");
  await pg.locator("#bAnswers .btn").first().click(); await pg.waitForTimeout(150); await chk("Blitz nach Antwort");
  await pg.click('.tab[data-view="stats"]'); await pg.waitForTimeout(400);
  // Karteikasten (Welle 11, Schritt 8): Kästchen an den Stufen im Kasten, „zuletzt geübt am“ (nicht bei zuletzt: null)
  if (!(await pg.locator("#sLevels .box").count())) errs.push("Statistik: keine Kästchen des Karteikastens");
  await chk("Statistik");
  // Bestätigung beim Link der Lehrkraft (Welle 11, Schritt 11): Setzen, Setzen mit „Bisher“, Entfernen, Hinweis
  // bei einem Link, der nicht passt (Dialog und Leiste liegen außerhalb von <main>)
  const dlg = async (hash, where) => {
    await pg.goto(BASE + hash); await pg.waitForTimeout(400);
    if (!(await visible("#klasseDialog"))) { errs.push(`${where}: kein Dialog`); return; }
    await chk(where, "#klasseDialog"); await chk(`${where} (Seite)`);
  };
  await dlg("#klasse=6", "Dialog Jahrgang setzen"); await pg.click("#klasseYes"); await pg.waitForTimeout(300);
  await dlg("#klasse=13&zweig=mug&dran=akkorde:1", "Dialog Jahrgang ändern"); await pg.keyboard.press("Escape");
  await dlg("#klasse=keine", "Dialog Jahrgang entfernen"); await pg.click("#klasseNo");
  await pg.goto(BASE + "#klasse=99"); await pg.waitForTimeout(400);
  if (!(await visible("#klasseBar"))) errs.push("Hinweis bei falschem Link fehlt");
  await chk("Hinweis Link passt nicht", "#klasseBar");
  await pg.click("#klasseBarClose"); await pg.waitForTimeout(100);
  // Startseite mit Jahrgang 5, 7 und 9 (Welle 11, Schritt 12): Abschnitte, „Darüber hinaus“ auf- und zugeklappt
  for (const j of [5, 7, 9]) {
    await pg.goto(BASE + "#klasse=" + j); await pg.waitForTimeout(400);
    if (await visible("#klasseDialog")) { await pg.click("#klasseYes"); await pg.waitForTimeout(300); }
    if (!(await visible('#levelList [data-sec="jetzt"]'))) errs.push(`Jahrgang ${j}: kein Abschnitt „Jetzt dran“`);
    await chk(`Startseite Jahrgang ${j}`);
    if (await pg.locator('#levelList [data-sec="hinaus"] > summary').count()) {
      await pg.click('#levelList [data-sec="hinaus"] > summary'); await pg.waitForTimeout(150); await chk(`Startseite Jahrgang ${j} „Darüber hinaus“ offen`);
    }
  }
  // Seite „Für Lehrkräfte“ über den Textlink der Statistik: Voreinstellung, MuG, eigene Auswahl, „groß zeigen“.
  // Die Seite darf auf diesem Gerät nichts ändern: der gespeicherte Stand ist danach derselbe
  const stand = () => pg.evaluate("JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])))");
  await pg.click('.tab[data-view="stats"]'); await pg.waitForTimeout(300);
  // Statistik mit Jahrgang (Schritt 12): Hinweis am Ende, dazu die Kästchen aus den Runden oben
  if (!(await visible("#sKlasse"))) errs.push("Statistik: kein Hinweis zum Jahrgang");
  await chk("Statistik mit Jahrgang 9");
  const vorher = await stand();
  await pg.click('#view-stats a[href="#lehrkraft"]'); await pg.waitForTimeout(400);
  if (!(await visible("#view-lehrkraft"))) errs.push("Für Lehrkräfte: Textlink öffnet die Seite nicht");
  await chk("Für Lehrkräfte Voreinstellung");
  await pg.selectOption("#tJahrgang", "13"); await pg.check("#tMug"); await pg.waitForTimeout(100); await chk("Für Lehrkräfte Jahrgang 13 MuG");
  for (const [id, n] of [["noten", "3"], ["notenwerte", "4"], ["intervalle", "6"], ["tonleitern", "7"], ["akkorde", "1"]]) await pg.selectOption(`#tDran select[data-pack="${id}"]`, n);
  await pg.waitForTimeout(100); await chk("Für Lehrkräfte eigene Auswahl (langer Link)");
  await pg.click("#tBig"); await pg.waitForTimeout(250);
  if (!(await visible("#qrBig"))) errs.push("Für Lehrkräfte: „QR-Code groß zeigen“ öffnet nichts");
  await chk("QR-Code groß", "#qrBig"); await chk("QR-Code groß (Seite)");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(150);
  if (await visible("#qrBig")) errs.push("QR-Code groß: Esc schließt nicht");
  if ((await pg.evaluate("document.activeElement && document.activeElement.id")) !== "tBig") errs.push("QR-Code groß: Fokus nicht zurück auf dem Knopf");
  await pg.click("#tPreset"); await pg.waitForTimeout(100);
  await pg.click("#tBack"); await pg.waitForTimeout(300);
  if (!(await visible("#view-home"))) errs.push("Für Lehrkräfte: „Zurück zur App“ führt nicht zur Startseite");
  if ((await stand()) !== vorher) errs.push("Für Lehrkräfte: gespeicherter Stand hat sich geändert");
  await ctx.close();
  return { hits: [...all.values()], errs };
}

const browser = await launch(playwright);
let bad = 0;
const fails = await selftest(browser);
console.log(`Selbsttest Überlappung: ${fails.length ? "FEHLER" : "in Ordnung"} (findet min-width: 0 und ein verschobenes Wort, meldet Marke, aria-hidden, Größe null und Dialog nicht)`);
fails.forEach((f) => console.log(`  Fehler: ${f}`));
bad += fails.length;
if (!SELFTEST_ONLY) {
  for (const width of WIDTHS) {
    const scheme = width <= 360 ? "dark" : "light";
    const { hits, errs } = await run(browser, width, scheme);
    const sc = await startCards(browser, width, scheme);
    errs.push(...sc.errs);
    bad += hits.length + errs.length;
    const over = hits.filter((h) => h.kind === "Überlappung").length;
    console.log(`${width} px (${scheme === "dark" ? "dunkel" : "hell"}): ${hits.length} Treffer (davon ${over} Überlappung), ${errs.length} Konsolenfehler`);
    sc.lines.forEach((l) => console.log(l));
    errs.slice(0, 10).forEach((e) => console.log(`  Fehler: ${e}`));
    hits.sort((a, b) => Math.max(b.rechts, b.links) - Math.max(a.rechts, a.links)).forEach((h) => {
      console.log(`  - [${h.kind}] ${h.what}: ${h.kind === "Überlappung" ? `${h.rechts} px breit` : `rechts ${h.rechts} px, links ${h.links} px`}\n      ${h.el}\n      Rahmen: ${h.frame}\n      „${h.text}“ (${h.wo.length}×, z. B. ${h.wo.slice(0, 3).join("; ")})`);
    });
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
