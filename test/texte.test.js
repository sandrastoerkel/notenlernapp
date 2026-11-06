// Tonfall (docs/KONZEPT.md): bestimmte Wörter kommen in UI-Texten nicht vor.
// Geprüft werden index.html (ohne Kommentare) und der Code in src/ (ohne Kommentare);
// der App-Name „Notenheld“ ist erlaubt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".js") ? [p] : [];
});
// Kommentare entfernen: Block, Zeile (nicht in "://"), HTML
const strip = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const FORBIDDEN = /nachhilfe|therapie|champion|mühelos|revolutionier|begabung|fehler!|falsch|(?<!noten)held/i;

test("keine verbotenen Wörter in index.html und src/", () => {
  const hits = [join(ROOT, "index.html"), ...files(join(ROOT, "src"))].flatMap((p) =>
    strip(readFileSync(p, "utf8")).split("\n").filter((l) => FORBIDDEN.test(l)).map((l) => `${p.slice(ROOT.length + 1)}: ${l.trim()}`));
  assert.deepEqual(hits, []);
});
