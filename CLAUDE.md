# Notenheld – Hinweise für Claude Code

Notenlernapp für Schülerinnen und Schüler am Gymnasium (10 bis 18 Jahre).
Statische Web-App: HTML, CSS, JavaScript, keine Abhängigkeiten, kein Build.

## Zuerst lesen

1. `docs/KONZEPT.md` – Zielgruppe, Didaktik, Tonfall
2. `docs/ARCHITEKTUR.md` – verbindliche Modulstruktur und Paket-Schnittstelle
3. `docs/PLAN.md` – Arbeitspakete A bis F mit Prompts, Reihenfolge und Akzeptanzkriterien

## Stand

- Paket A erledigt (auf Branch `paket-a`): `index.html` ist nur noch die Shell, der Code liegt als ES-Module in `src/**`, Styles in `css/style.css`, Tests in `test/**` (`npm test`). Fortschritt unter `notenheld.v2`, Übernahme aus `notenheld.v1` automatisch.
- Nächster Schritt: Welle 2 mit den Paketen B bis E (siehe `docs/PLAN.md`).
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
