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

// Welle 10, B5 (Sandra, 24.11.2026): „Grob- und Feinbestimmung“ statt „Rahmenintervall“, das Wort kommt in
// keinem UI-Text mehr vor (auch nicht als „Rahmen“ in den Intervall-Texten), A6: kein „G G H“ als Bauplan
test("kein „Rahmenintervall“ und kein „G G H“ in UI-Texten", () => {
  const ui = [join(ROOT, "index.html"), ...files(join(ROOT, "src"))];
  const hits = ui.flatMap((p) => strip(readFileSync(p, "utf8")).split("\n").filter((l) => /rahmenintervall|G G H/i.test(l)).map((l) => `${p.slice(ROOT.length + 1)}: ${l.trim()}`));
  assert.deepEqual(hits, []);
  // auch in den Kommentaren von src/ kein „G G H“ (Akzeptanz: grep leer)
  const raw = files(join(ROOT, "src")).filter((p) => readFileSync(p, "utf8").includes("G G H"));
  assert.deepEqual(raw, []);
  const iv = strip(readFileSync(join(ROOT, "src/packs/intervalle.js"), "utf8"));
  assert.ok(!/Rahmen|rahmen/.test(iv), "Intervalle: kein „Rahmen“");
  for (const doc of ["README.md", "docs/ARCHITEKTUR.md"]) assert.ok(!/rahmenintervall/i.test(readFileSync(join(ROOT, doc), "utf8")), doc);
});
