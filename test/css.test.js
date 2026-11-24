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
    assert.ok(contrast(all["--part"], all["--surface"]) >= 3, `${name}: --part auf --surface`);
  }
});
