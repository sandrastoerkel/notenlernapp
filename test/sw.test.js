// Prüft die Precache-Liste in sw.js: jede App-Datei muss darin stehen, sonst fehlt sie offline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sw = readFileSync(join(ROOT, "sw.js"), "utf8");

// Einträge zwischen "const PRECACHE = [" und "];" lesen
const block = sw.slice(sw.indexOf("const PRECACHE = ["), sw.indexOf("];", sw.indexOf("const PRECACHE = [")));
const list = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (name.startsWith(".")) return [];
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

test("sw.js hat eine versionierte Cache-Konstante", () => {
  assert.match(sw, /^const CACHE = "notenheld-v\d+\.\d+\.\d+-\d+";$/m);
});

test("Precache-Liste ist nicht leer und ohne Doppelte", () => {
  assert.ok(list.length > 10);
  assert.equal(new Set(list).size, list.length);
});

test("alle Pfade sind relativ (./), nie mit / am Anfang", () => {
  for (const p of list) assert.ok(p.startsWith("./"), p);
});

test("Shell, Manifest und Startseite stehen in der Liste", () => {
  for (const p of ["./", "./index.html", "./manifest.webmanifest"]) assert.ok(list.includes(p), p);
});

test("jede Datei unter src/, css/, fonts/ und icons/ steht in der Liste", () => {
  for (const dir of ["src", "css", "fonts", "icons"]) {
    for (const f of walk(dir)) assert.ok(list.includes(`./${f}`), `fehlt in sw.js: ./${f}`);
  }
});

test("jeder Eintrag der Liste gibt es als Datei", () => {
  for (const p of list) {
    if (p === "./") continue;
    assert.ok(existsSync(join(ROOT, p.slice(2))), `Datei fehlt: ${p}`);
  }
});

test("Manifest: Pflichtfelder, relative Pfade, Icons vorhanden", () => {
  const m = JSON.parse(readFileSync(join(ROOT, "manifest.webmanifest"), "utf8"));
  assert.equal(m.name, "Notenheld");
  assert.equal(m.short_name, "Notenheld");
  assert.equal(m.lang, "de");
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "./");
  assert.equal(m.scope, "./");
  for (const i of m.icons) assert.ok(existsSync(join(ROOT, i.src.slice(2))), i.src);
  assert.ok(m.icons.some((i) => i.sizes === "192x192"));
  assert.ok(m.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
  assert.ok(m.icons.some((i) => i.sizes === "512x512" && i.purpose === "any"));
});

// Breite und Höhe aus dem IHDR-Block einer PNG-Datei
function pngSize(rel) {
  const b = readFileSync(join(ROOT, rel));
  assert.equal(b.toString("latin1", 1, 4), "PNG", `${rel} ist keine PNG-Datei`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

test("Icons: PNG-Größen stimmen mit Manifest und Dateinamen überein", () => {
  const m = JSON.parse(readFileSync(join(ROOT, "manifest.webmanifest"), "utf8"));
  for (const i of m.icons) {
    assert.equal(i.type, "image/png", i.src);
    assert.equal(pngSize(i.src.slice(2)), i.sizes, i.src);
  }
  assert.equal(pngSize("icons/apple-touch-icon.png"), "180x180");
  assert.equal(pngSize("icons/favicon-32.png"), "32x32");
  assert.equal(pngSize("icons/favicon-48.png"), "48x48");
});

test("Manifest-Farben entsprechen den Tokens --accent und --bg (hell)", () => {
  const m = JSON.parse(readFileSync(join(ROOT, "manifest.webmanifest"), "utf8"));
  const css = readFileSync(join(ROOT, "css/style.css"), "utf8");
  const root = css.slice(css.indexOf(":root {"));
  const tok = (n) => root.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{3,8})`))[1].toLowerCase();
  assert.equal(m.theme_color.toLowerCase(), tok("accent"));
  assert.equal(m.background_color.toLowerCase(), tok("bg"));
});
