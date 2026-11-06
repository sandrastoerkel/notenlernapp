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
