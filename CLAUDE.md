# Notenheld – Hinweise für Claude Code

Notenlernapp für Schülerinnen und Schüler am Gymnasium (10 bis 18 Jahre).
Statische Web-App: HTML, CSS, JavaScript, keine Abhängigkeiten, kein Build.

## Zuerst lesen

1. `docs/KONZEPT.md` – Zielgruppe, Didaktik, Tonfall
2. `docs/ARCHITEKTUR.md` – verbindliche Modulstruktur und Paket-Schnittstelle
3. `docs/PLAN.md` – Arbeitspakete A bis F mit Prompts, Reihenfolge und Akzeptanzkriterien

## Stand

- Paket A erledigt: `index.html` ist nur noch die Shell, der Code liegt als ES-Module in `src/**`, Styles in `css/style.css`, Tests in `test/**` (`npm test`). Fortschritt unter `notenheld.v2`, Übernahme aus `notenheld.v1` automatisch.
- Welle 2 erledigt und zusammengeführt: B Offline/PWA, C Notenwerte und Pausen, D Intervalle und Tonarten, E Dreiklänge und Quintenzirkel.
- Paket F erledigt: Integration, Statistik je Stufe, Rhythmus und vollständiger Takt bei „Takt füllen“, Update-Hinweis des Service Workers, Screenshots (`docs/screens/`, neu erzeugen mit `docs/screens/screenshots.mjs`).
- Release v0.2.0 (Tag `v0.2.0`, Cache `notenheld-v0.2.0-2`, `package.json` 0.2.0).
- Nächster Schritt: Test mit einem Kind (PLAN, Paket F Schritt 7). Noch offen aus der Übergabe zu Welle 3: Installation auf iOS und Android ungetestet.
- Starten nur über einen Webserver (`npm run dev`), ES-Module laden nicht über `file://`.
- Veröffentlichung über GitHub Pages (`.github/workflows/pages.yml`), Pfade immer relativ.

## Regeln

- Deutsch in UI, Kommentaren und Commit-Nachrichten; Anrede „du“.
- Deutsche Notennamen (H, B, Fis, Es), Oktaven in Helmholtz-Schreibweise (c, c', c'').
- Keine Frameworks, keine npm-Abhängigkeiten. Tests mit `node --test`.
- Keine Musiktheorie erfinden: bei Unsicherheit im Commit-Text vermerken und nachfragen.
- Farben nur über die Tokens auf `:root` (hell und dunkel).
- Vor jedem Commit: `npm test` (sobald vorhanden) und die App im Browser prüfen.
- Rechner: MacBook M4. Lokaler Server: `python3 -m http.server 8080`.
