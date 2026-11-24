// Farben nur über Tokens: außerhalb der :root-Blöcke darf css/style.css keine Farbwerte enthalten
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");

test("style.css: Farbwerte (hex, rgb, hsl) nur in :root-Blöcken", () => {
  const outside = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:root[^{]*\{[^}]*\}/g, "");
  const hits = outside.match(/#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/g) || [];
  assert.deepEqual(hits, []);
});

test("style.css: jedes var(--…) ist auf :root definiert", () => {
  const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
  const missing = [...used].filter((v) => !defined.has(v) && v !== "--cols"); // --cols setzt die Engine am Element
  assert.deepEqual(missing, []);
});

/* ---------- Kontrast aus den Tokens (WCAG 2.x, relative Leuchtdichte) ---------- */

// Die drei Stellen, an denen Tokens stehen: hell (:root), dunkel per Systemeinstellung, dunkel per data-theme
const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
const blocks = {
  hell: plain.match(/(?:^|\n):root\s*\{([^}]*)\}/)[1],
  "dunkel (System)": plain.match(/:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/)[1],
  "dunkel (Schalter)": plain.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)[1],
};
const tokens = (block) => Object.fromEntries([...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const theme = (name) => (name === "hell" ? tokens(blocks.hell) : { ...tokens(blocks.hell), ...tokens(blocks[name]) });
const lum = (hex) => {
  const h = hex.replace("#", ""), v = h.length === 3 ? h.split("").map((c) => c + c) : h.match(/../g);
  const [r, g, b] = v.map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("Kontrast: Rechnung stimmt (Schwarz auf Weiß 21 : 1)", () => {
  assert.equal(Math.round(contrast("#000000", "#ffffff")), 21);
  assert.equal(contrast("#777", "#777"), 1);
});

test("Teilerfolg: --part, --part-soft, --part-ink an allen drei Stellen, Schrift ≥ 4,5 : 1", () => {
  for (const [name, block] of Object.entries(blocks)) {
    const t = tokens(block);
    for (const k of ["--part", "--part-soft", "--part-ink"]) assert.match(t[k] || "", /^#[0-9a-f]{6}$/i, `${k} in ${name}`);
    const all = theme(name);
    const onSoft = contrast(all["--part-ink"], all["--part-soft"]);
    assert.ok(onSoft >= 4.5, `${name}: --part-ink auf --part-soft ${onSoft.toFixed(2)}`);
    // der Punkt und der Rand (--part) heben sich von der Karte ab (Grafik, ≥ 3 : 1)
    // (die Fortschrittspunkte stehen auf --bg, der Rand der Rückmeldung auf --part-soft)
    for (const bg of ["--surface", "--bg", "--part-soft"]) {
      const c = contrast(all["--part"], all[bg]);
      assert.ok(c >= 3, `${name}: --part auf ${bg} ${c.toFixed(2)}`);
    }
  }
});

/* ---------- Welle 10, Schritt 7: Lesbarkeit und Barrierefreiheit (B13, B14) ---------- */

test("Fokus: Rahmen in var(--accent), mindestens 3 : 1 gegen --bg und --surface, hell und dunkel", () => {
  const rules = [...plain.matchAll(/([^{}]*:focus(?:-visible)?[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length >= 1, "es gibt eine Fokus-Regel");
  for (const [, sel, body] of rules) {
    const m = body.match(/outline\s*:\s*([^;]+);/);
    assert.ok(m && /var\(--accent\)/.test(m[1]) && !/accent-soft/.test(m[1]), `${sel.trim()}: outline in var(--accent)`);
  }
  for (const name of Object.keys(blocks)) {
    const t = theme(name);
    for (const bg of ["--bg", "--surface"]) {
      const c = contrast(t["--accent"], t[bg]);
      assert.ok(c >= 3, `${name}: Fokus --accent auf ${bg} ${c.toFixed(2)}`);
    }
  }
});

test("Rückmeldung: --ok und --bad als Schrift ≥ 4,5 : 1 auf --bg, --surface und der eigenen soft-Fläche", () => {
  for (const name of Object.keys(blocks)) {
    const t = theme(name);
    for (const k of ["--ok", "--bad"]) for (const bg of ["--bg", "--surface", `${k}-soft`]) {
      const c = contrast(t[k], t[bg]);
      assert.ok(c >= 4.5, `${name}: ${k} auf ${bg} ${c.toFixed(2)}`);
    }
    // Zeichen ✓/✗ auf den Punkten und Plaketten
    for (const k of ["--ok", "--bad"]) {
      const c = contrast(t["--on-mark"], t[k]);
      assert.ok(c >= 4.5, `${name}: --on-mark auf ${k} ${c.toFixed(2)}`);
    }
    // Punkte und Ränder heben sich von der Karte ab (Grafik ≥ 3 : 1)
    for (const k of ["--ok", "--bad", "--part"]) assert.ok(contrast(t[k], t["--surface"]) >= 3, `${name}: ${k} auf --surface`);
  }
});

test("Neue Tokens (Schritt 7) an allen drei Stellen", () => {
  for (const [name, block] of Object.entries(blocks)) {
    const t = tokens(block);
    for (const k of ["--on-mark", "--ok", "--bad", "--accent"]) assert.match(t[k] || "", /^#[0-9a-f]{6}$/i, `${k} in ${name}`);
  }
});

test("Nicht nur Rot/Grün: Zeichen ✓/✗ in Knöpfen, Punkten und Rückmeldung, Teilerfolg halb gefüllt", () => {
  assert.match(plain, /\.answers \.btn\.ok::after\s*\{[^}]*content:\s*"✓"/);
  assert.match(plain, /\.answers \.btn\.bad::after\s*\{[^}]*content:\s*"✗"/);
  assert.match(plain, /\.dot\.ok::after\s*\{\s*content:\s*"✓"/);
  assert.match(plain, /\.dot\.bad::after\s*\{\s*content:\s*"✗"/);
  assert.match(plain, /\.dot\.part\s*\{[^}]*linear-gradient\(90deg, var\(--part\) 50%, transparent 50%\)/);
  assert.match(plain, /\.feedback\.ok::before\s*\{\s*content:\s*"✓ "/);
  assert.match(plain, /\.feedback\.bad::before\s*\{\s*content:\s*"✗ "/);
  // Teilerfolg in der Rückmeldung: derselbe halbe Punkt, in der Schriftfarbe der Fläche (Prüfung Schritt 7)
  assert.match(plain, /\.feedback\.part::before\s*\{[^}]*linear-gradient\(90deg, var\(--part-ink\) 50%, transparent 50%\)/);
});

test("Quintenzirkel-Kästchen: Kopfzeile auch über der zweiten Hälfte (keine versteckte thead)", () => {
  assert.ok(!/tt-second thead\s*\{[^}]*display:\s*none/.test(plain));
});
