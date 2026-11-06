// Service Worker von Notenheld: legt alle App-Dateien in einen versionierten Cache,
// damit die App nach dem ersten Laden auch ohne Netz läuft.
// Bei jedem Release CACHE erhöhen, sonst bekommen Geräte die neuen Dateien nicht.
const CACHE = "notenheld-v0.2.0-2";

// Alle Dateien der App, relativ zum Ort von sw.js (GitHub Pages liegt unter /notenlernapp/).
// test/sw.test.js prüft, dass jede Datei aus src/, css/, fonts/ und icons/ hier steht.
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./src/app.js",
  "./src/audio.js",
  "./src/engine.js",
  "./src/music.js",
  "./src/staff.js",
  "./src/store.js",
  "./src/packs/index.js",
  "./src/packs/noten.js",
  "./src/packs/notenwerte.js",
  "./src/packs/intervalle.js",
  "./src/packs/akkorde.js",
  "./src/views/home.js",
  "./src/views/practice.js",
  "./src/views/learn.js",
  "./src/views/blitz.js",
  "./src/views/stats.js",
  "./fonts/NotoMusic-Regular-music.woff2",
  "./fonts/Nunito-latin.woff2",
  "./fonts/Outfit-latin.woff2",
  "./fonts/OFL-NotoMusic.txt",
  "./fonts/OFL-Nunito.txt",
  "./fonts/OFL-Outfit.txt",
  "./icons/favicon-32.png",
  "./icons/favicon-48.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // cache: "reload" umgeht den HTTP-Cache, damit wirklich die Dateien dieses Releases im Cache landen.
  // Kein skipWaiting hier: Ein Update wartet, bis du in der App „Neu laden“ tippst (siehe message),
  // sonst liefe die offene Seite mit altem Code gegen den neuen Cache. Die erste Installation
  // wird ohnehin sofort aktiv.
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
  );
});

// „Neu laden“ in der App: den wartenden Worker sofort übernehmen lassen
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // alte Caches dieser App löschen
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("notenheld-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Cache zuerst, bei Fehlschlag Netz; Seitenaufrufe ohne Netz bekommen index.html.
  // Nur im eigenen Cache suchen: alle Apps unter sandrastoerkel.github.io teilen sich einen
  // Cache-Speicher, und ein abgebrochenes Update kann einen halb gefüllten neuen Cache hinterlassen.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: req.mode === "navigate" }).then((hit) => {
        if (hit) return hit;
        return fetch(req).catch((err) => {
          if (req.mode === "navigate") return cache.match("./index.html").then((page) => page || Promise.reject(err));
          throw err;
        });
      })
    )
  );
});
