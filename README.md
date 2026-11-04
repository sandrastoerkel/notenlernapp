# Notenheld – klassische Notenlernapp

Noten lesen lernen im Violin- und Bassschlüssel, gedacht für Schülerinnen und Schüler am Gymnasium (Klasse 5 bis 12). Deutsche Notennamen (H, B, Fis, Es), Oktavschreibweise wie im Musikunterricht (c, c', c'').

Die App ist eine einzelne HTML-Datei ohne Server, ohne Konto und ohne Tracking. Der Fortschritt wird nur im Browser des Geräts gespeichert.

## Starten

Datei `index.html` im Browser öffnen, fertig. Für Ton und Schriften braucht der Browser Internet (Google Fonts).

Alternativ lokal über einen kleinen Webserver:

```sh
python3 -m http.server 8080
```

Dann http://localhost:8080 öffnen.

## Online-Version

Jeder Push auf `main` veröffentlicht die App über GitHub Pages (Workflow in `.github/workflows/pages.yml`). Dafür einmalig in den Repo-Einstellungen unter **Settings → Pages** als Source „GitHub Actions“ wählen.

## Bereiche

| Bereich    | Inhalt                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| Start      | Trefferquote, Tagesserie, XP, acht Stufen                                               |
| Üben       | Zehn Noten pro Runde, Eingabe über Buchstaben oder Klaviatur, Ton, Sterne               |
| Lernen     | Notenzeile zum Antippen, Merksprüche, alle Namen einblenden                             |
| Blitz      | 60 Sekunden, beide Schlüssel, Serienbonus, Rekord                                       |
| Statistik  | Schwache Noten, Sterne je Stufe, Fortschritt zurücksetzen                               |

## Stufen

1. Violinschlüssel, Linien (E G H D F)
2. Violinschlüssel, Zwischenräume (F A C E)
3. Violinschlüssel mit Hilfslinien
4. Bassschlüssel, Linien (G H D F A)
5. Bassschlüssel, Zwischenräume (A C E G)
6. Bassschlüssel mit Hilfslinien
7. Vorzeichen ♯ und ♭
8. Alles gemischt

Eine Stufe öffnet sich, sobald in der vorherigen 8 von 10 Noten richtig waren. Zum Ausprobieren gibt es auf der Startseite „Alle Stufen öffnen (Demo)“.

## Tastatur

`C` `D` `E` `F` `G` `A` `H` antworten, `+` setzt ♯, `-` setzt ♭, `0` hebt das Vorzeichen auf.

## Technik

- Reines HTML, CSS und JavaScript, keine Abhängigkeiten, kein Build.
- Notenzeile, Noten und Klaviatur werden als SVG gezeichnet.
- Töne entstehen per Web Audio API (keine Audiodateien).
- Schlüssel-Glyphen kommen aus der Schrift „Noto Music“ (Google Fonts).
- Fortschritt liegt in `localStorage` unter dem Schlüssel `notenheld.v1`.

Weitere Ideen und der didaktische Aufbau stehen in [docs/KONZEPT.md](docs/KONZEPT.md).
