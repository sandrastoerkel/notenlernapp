# Ausbauplan

Stand: November 2026. Die App läuft als eine Datei (`index.html`) mit acht
Stufen „Noten lesen“. Dieser Plan beschreibt, wie sie offline-fähig wird,
weitere Inhalte für Klasse 5 bis 12 bekommt und dabei wartbar bleibt.

Die Zielstruktur steht verbindlich in [ARCHITEKTUR.md](ARCHITEKTUR.md). Jedes
Arbeitspaket unten verweist darauf. Die Pakete sind so geschnitten, dass sie
von getrennten Claude-Agenten bearbeitet werden können, ohne dieselben Dateien
anzufassen.

## Reihenfolge

| Welle | Pakete                                   | Warum in dieser Reihenfolge                              |
| ----- | ---------------------------------------- | -------------------------------------------------------- |
| 1     | A (Module und Tests)                     | Grundlage; alle anderen bauen auf die Modulstruktur auf  |
| 2     | B, C, D, E (parallel möglich)            | berühren jeweils eigene Dateien, siehe Dateilisten        |
| 3     | F (Integration und Veröffentlichung)     | zusammenführen, prüfen, Screenshots, Release             |
| 4     | G (Noten-Heatmap, adaptive Auswahl)      | nach v0.2.0; nutzt die vorhandenen `statKey`s            |
| 5     | Tonleitern (Stufen 1–6, Dur)             | Kl. 5–6, vor den Intervall-Stufen 7 ff. und den Hörstufen |
| 6     | Intervalle 7–12 (Kl. 5–6)                | nach den Tonleitern (Ganz-/Halbton); vor Dreiklängen Schritt für Schritt und den Hörstufen |
| 7     | Intervalle neu (erst mit Hilfen, dann ohne) | ersetzt Welle 6 und die alten Intervall-Stufen 1–4; Tonarten wandern zu „Tonleitern“ |
| 8     | Tonleitern gehirngerecht                  | zweites Paket nach KONZEPT-gehirngerecht (Reihenfolge Sandra: Intervalle → Tonleitern → Notenwerte → Noten lesen → Dreiklänge → Hörstufen) |
| 9     | Notenwerte gehirngerecht                  | drittes Paket nach KONZEPT-gehirngerecht |
| 10    | Korrekturen aus der Prüfung (drei Perspektiven) | A-Befunde und kleine B-Befunde der ganzen App, Notenwerte-Befunde, wählbare Merksprüche; vor den nächsten großen Paketen |
| 11    | Wiederholen                               | zuerst Sandras Wünsche vom 25.11.2026 (ein Knopf „Nächste Aufgabe“, Wortlaut „Dauer in Schlägen“, „Lernen“ mit Reitern) und die neue Paketreihenfolge (Intervalle vor Tonleitern); dann Voraussetzungen je Stufe, „Grundlagen wiederholen“, Wiederholung über Tage, Jahrgang über den Lehrkraft-Link mit QR-Code (Feinplan vom 25.11.2026) |
| danach | Noten lesen gehirngerecht → Dreiklänge Schritt für Schritt (bis zum Dominantseptakkord) → Hörstufen | Reihenfolge Sandra; Vorgabe zum Dominantseptakkord im Abschnitt nach Welle 11 |

Vor Welle 2 muss Welle 1 gemergt und `npm test` grün sein. Welle 2 kann mit
vier Agenten gleichzeitig laufen (am besten je ein Git-Worktree oder je ein
Branch `paket-b`, `paket-c`, …).

## So startest du eine Welle mit Claude Code

1. Repo auf dem Mac klonen und in Claude Code öffnen.
2. Den Prompt des Pakets (unten, Abschnitt „Prompt“) einfügen. Modell: Opus.
3. Für Welle 2 pro Paket eine eigene Session oder einen eigenen Agenten starten.
4. Nach jedem Paket: `npm test`, App im Browser prüfen, committen.

---

## Paket A: Module und Tests (Schritt 5 aus dem Gespräch)

**Stand.** Erledigt auf Branch `paket-a` (Testbefehl abweichend: `node --test "test/**/*.test.js"`).

**Ziel.** `index.html` in die Struktur aus ARCHITEKTUR.md aufteilen, ohne dass
sich das Verhalten der App ändert. Tests für das Notenmodell und den Fortschritt.

**Dateien.** `index.html`, `css/style.css`, `src/**`, `test/**`,
`package.json`, `README.md` (Abschnitt „Starten“ anpassen).

**Schritte.**

1. `package.json` anlegen mit `"type": "module"`, Skripten `test`
   (`node --test test/`) und `dev` (`python3 -m http.server 8080`). Keine
   Abhängigkeiten.
2. Styles nach `css/style.css` verschieben. Tokens unverändert lassen.
3. `src/music.js` aus dem Abschnitt „Musik-Modell“ des bisherigen Skripts
   bilden. Zusätzlich `transpose(n, steps, acc)` anlegen.
4. `src/staff.js` aus den SVG-Funktionen bilden. `noteSvg` um `opts.value`
   und `opts.stemless` erweitern, `restSvg`, `glyphSvg`, `staffSvg(..., opts)`
   mit `opts.keySig` und `opts.height` ergänzen. Glyphen in Noto Music:
   Violinschlüssel U+1D11E, Bassschlüssel U+1D122, ganze Note U+1D15D, halbe
   U+1D15E, viertel U+1D15F, achtel U+1D160, sechzehntel U+1D161, Pausen ganze
   U+1D13B, halbe U+1D13C, viertel U+1D13D, achtel U+1D13E, sechzehntel
   U+1D13F. Vor dem Einsatz im Browser prüfen, dass die Glyphen sichtbar sind.
5. `src/store.js`: Zustand `notenheld.v2`, Migration von `notenheld.v1`
   (Stufe `n` wird `noten-n`), Freischaltung je Paket, Tagesserie. Alle
   Funktionen nehmen den Zustand als Parameter und geben ihn zurück, nur
   `load()` und `save()` greifen auf `localStorage` zu.
6. `src/engine.js`: den Rundenablauf aus dem bisherigen „Üben“ herauslösen,
   so dass er mit jeder Stufe nach der Paket-Schnittstelle funktioniert.
7. `src/packs/noten.js`: die acht bestehenden Stufen als erstes Paket, mit
   `learn` (die bisherige Legende) und `blitz` (der bisherige Pool).
   `src/packs/index.js` exportiert `PACKS = [noten]`. Für die Pakete B bis D
   schon leere Platzhalter anlegen (`export default null`) und in `index.js`
   mit `.filter(Boolean)` einbinden, damit Welle 2 keine gemeinsame Datei
   ändern muss.
8. `src/views/*.js` und `src/app.js`: die bisherigen Render-Funktionen
   aufteilen. Startseite zeigt Pakete als Abschnitte mit ihren Stufen.
9. Tests: `test/music.test.js` (staffPos für E4/G2/C4 in beiden Schlüsseln,
   gName und helm für Fis, B, Es, c', C₁; midi für a' = 69; range),
   `test/store.test.js` (Freischaltung, Sterne, Migration, Tagesserie),
   `test/packs/noten.test.js` (nach den Regeln in ARCHITEKTUR.md).
10. `README.md`: „Starten“ auf `npm run dev` umstellen und erklären, warum
    `file://` nicht mehr reicht.

**Akzeptanz.** `npm test` grün. Alle fünf Tabs verhalten sich wie vorher
(Stufen, Klaviatur, Lernen mit „Alle Namen zeigen“, Blitz, Statistik,
Zurücksetzen). Fortschritt aus `notenheld.v1` erscheint nach dem Update
weiter. Keine Konsolenfehler.

**Prompt.**

```
Lies docs/ARCHITEKTUR.md und docs/PLAN.md, Paket A. Teile index.html nach
dieser Architektur in Module auf, ohne das Verhalten zu ändern. Lege
package.json, css/style.css, src/** und test/** an, schreibe die Tests aus
Paket A und bringe `npm test` zum Laufen. Prüfe die App danach im Browser
(npm run dev, alle fünf Tabs) und mache einen Commit auf Deutsch. Keine
npm-Abhängigkeiten, kein Build-Schritt. Erfinde keine Musiktheorie: wenn du
dir bei einem Fachbegriff unsicher bist, schreib das in den Commit-Text.
```

---

## Paket B: Offline und installierbar (Schritt 3)

**Ziel.** Die App läuft ohne Netz, lässt sich auf Handy und Tablet zum
Startbildschirm hinzufügen und sieht dort wie eine normale App aus.

**Dateien.** `manifest.webmanifest`, `sw.js`, `icons/**`, `fonts/**`,
`index.html` (nur `<head>`: Manifest-Link, Icons, Font-Einbindung,
Service-Worker-Registrierung), `css/style.css` (nur `@font-face`-Blöcke),
`README.md` (Abschnitt „Offline und Installation“), `THIRD_PARTY.md` (neu).

**Schritte.**

1. Schriften selbst hosten: Noto Music, Outfit (500, 700) und Nunito
   (400, 600, 700, 800) als woff2 nach `fonts/`, nur Latin-Subset. Quelle ist
   Google Fonts; die Lizenz ist die SIL Open Font License, die Lizenztexte in
   `fonts/` ablegen und in `THIRD_PARTY.md` nennen. Den Google-Fonts-Link
   aus `index.html` entfernen.
2. `manifest.webmanifest`: Name „Notenheld“, Kurzname „Notenheld“, Sprache
   `de`, `display: standalone`, `start_url: ./`, `scope: ./`, Hintergrund und
   Themenfarbe aus den Tokens, Icons 192 und 512 px (PNG, davon eines
   `maskable`) sowie ein SVG. Die PNGs aus dem SVG erzeugen (zum Beispiel mit
   Playwright-Screenshot), nicht von Hand malen.
3. `sw.js`: beim Installieren alle App-Dateien (HTML, CSS, JS, Schriften,
   Icons, Manifest) in einen versionierten Cache legen. Strategie: Cache
   zuerst, bei Fehlschlag Netz. Beim Aktivieren alte Caches löschen. Die
   Cache-Version steht als Konstante oben in `sw.js` und wird bei jedem
   Release erhöht.
4. Registrierung in `index.html` nur, wenn `navigator.serviceWorker`
   existiert und die Seite über `https` oder `localhost` läuft.
5. Apple: `apple-touch-icon` (180 px) und
   `apple-mobile-web-app-capable` setzen, damit iPhone und iPad die App ohne
   Browserleiste öffnen.
6. GitHub Pages liegt unter `/notenlernapp/`: alle Pfade relativ halten
   (`./`), nie mit `/` beginnen.

**Akzeptanz.** Lighthouse-Kategorie „PWA“ ohne Fehler (oder die
entsprechenden Prüfungen in Chrome DevTools, Application → Manifest und
Service Workers). Nach einmaligem Laden funktioniert die App im Flugmodus,
inklusive Schlüssel-Glyphen. Installation auf iOS und Android getestet oder
als „nicht getestet“ im Commit vermerkt.

**Prompt.**

```
Lies docs/ARCHITEKTUR.md und docs/PLAN.md, Paket B. Mache die App
offline-fähig und installierbar wie dort beschrieben. Fasse außerhalb der
Dateiliste von Paket B nichts an. Hoste die drei Schriften selbst und lege
die OFL-Lizenztexte ab. Prüfe im Browser, dass Schlüssel und Noten ohne
Netz erscheinen. Commit auf Deutsch.
```

---

## Paket C: Notenwerte und Pausen (Klasse 5/6)

**Ziel.** Paket `notenwerte` nach der Schnittstelle in ARCHITEKTUR.md.

**Dateien.** `src/packs/notenwerte.js`, `test/packs/notenwerte.test.js`,
`src/music.js` nur anhängend (zum Beispiel Dauer in Schlägen).

**Stufen.**

1. Notenwerte erkennen: ganze, halbe, viertel, achtel, sechzehntel Note.
   Eingabe `choices`.
2. Pausen erkennen: dieselben fünf Werte als Pausen.
3. Wie viele Schläge? Note oder Pause im 4/4-Takt, Antwort als Zahl (4, 2, 1,
   ½, ¼) über `choices`.
4. Punktierungen: punktierte halbe (3), punktierte viertel (1½), punktierte
   achtel (¾).
5. Takt füllen: ein 4/4-Takt mit einer Lücke, welche Note oder Pause fehlt?
   Drei bis vier Werte zur Auswahl.
6. Gemischt.

**Lerntafel.** Tabelle Notenwert, Pause, Schläge im 4/4, mit Glyphen.

**Hinweise.** Noten in der Zeile auf einer festen Höhe (zum Beispiel h' im
Violinschlüssel) zeichnen, damit nur der Wert zählt. Für Stufe 5 mehrere
Noten nebeneinander über `noteSvg` mit `opts.value` setzen; Achtelgruppen
dürfen einzeln mit Fähnchen gezeichnet werden, Balken sind nicht nötig.

**Prompt.**

```
Lies docs/ARCHITEKTUR.md und docs/PLAN.md, Paket C. Baue das Paket
„Notenwerte und Pausen“ mit sechs Stufen und Lerntafel in
src/packs/notenwerte.js, dazu test/packs/notenwerte.test.js. Fasse keine
anderen Dateien an, außer du hängst eine reine Funktion an src/music.js
an. Prüfe im Browser, dass die Glyphen sichtbar sind und alle sechs Stufen
spielbar sind. Commit auf Deutsch.
```

---

## Paket D: Intervalle und Tonarten (Klasse 7 bis 9)

**Ziel.** Paket `intervalle` nach der Schnittstelle in ARCHITEKTUR.md.

**Dateien.** `src/packs/intervalle.js`, `test/packs/intervalle.test.js`,
`src/music.js` nur anhängend (Intervallgröße, Tonart aus Vorzeichen).

**Stufen.**

1. Intervallzahl: zwei Stammtöne im Violinschlüssel, Antwort Prime bis
   Oktave (`choices`). Beide Noten werden nacheinander abgespielt.
2. Intervallzahl im Bassschlüssel.
3. Groß oder klein: Sekunde, Terz, Sexte, Septime mit Vorzeichen, Antwort
   zum Beispiel „große Terz“ (`choices` mit vier Optionen).
4. Rein, vermindert, übermäßig: Quarte, Quinte, Oktave.
5. Tonart lesen: Vorzeichen hinter dem Schlüssel (`staffSvg` mit
   `opts.keySig`), Antwort Dur-Tonart (`choices`). Reihenfolge der Kreuze:
   Fis Cis Gis Dis Ais Eis His; der Bs: B Es As Des Ges Ces Fes.
6. Parallele Molltonart zur gezeigten Dur-Tonart.

**Lerntafel.** Intervalle mit Halbtonzahl und Beispiel; Quintenzirkel als
Liste (Tonart, Anzahl Vorzeichen, parallele Molltonart).

**Hinweise.** Intervallgröße aus `dia` ableiten (Zahl) und aus `midi`
(Qualität). Nur Intervalle bis zur Oktave. In Stufe 3 und 4 die Qualität
über die Halbtonzahl bestimmen: große Terz 4, kleine Terz 3, reine Quinte
7, verminderte Quinte 6, übermäßige Quarte 6. Keine Doppelvorzeichen.

**Prompt.**

```
Lies docs/ARCHITEKTUR.md und docs/PLAN.md, Paket D. Baue das Paket
„Intervalle und Tonarten“ mit sechs Stufen und Lerntafel in
src/packs/intervalle.js, dazu test/packs/intervalle.test.js. Fasse keine
anderen Dateien an, außer du hängst reine Funktionen an src/music.js an.
Teste die Intervall- und Tonartberechnung gründlich (Tests mit bekannten
Beispielen wie c'–e' = große Terz, h–f' = verminderte Quinte, drei Kreuze
= A-Dur). Commit auf Deutsch.
```

---

## Paket E: Dreiklänge und Quintenzirkel (Klasse 9 bis 12)

**Ziel.** Paket `akkorde` nach der Schnittstelle in ARCHITEKTUR.md.

**Dateien.** `src/packs/akkorde.js`, `test/packs/akkorde.test.js`,
`src/music.js` nur anhängend (Dreiklang aufbauen, Umkehrung).

**Stufen.**

1. Dur oder Moll: Dreiklang in Grundstellung auf der Zeile, Antwort
   `choices` mit zwei Optionen, Akkord wird gleichzeitig abgespielt
   (`play` mit drei Noten).
2. Dur, Moll, vermindert, übermäßig.
3. Grundton bestimmen: Dreiklang in Grundstellung, Antwort Buchstabe
   (`letters`).
4. Umkehrungen: Grundstellung, Sextakkord, Quartsextakkord.
5. Quintenzirkel: Zu einer Tonart die Nachbarn (Quinte aufwärts, Quinte
   abwärts) oder die Anzahl der Vorzeichen.
6. Stufenakkorde in Dur: Welche Stufe (I bis VII) ist der gezeigte Akkord in
   der genannten Tonart? Nur leitereigene Dreiklänge.

**Lerntafel.** Dreiklangstypen mit Halbtonaufbau (Dur 4+3, Moll 3+4,
vermindert 3+3, übermäßig 4+4) und der Quintenzirkel als Ring aus Text.

**Hinweise.** Akkorde gleichzeitig abspielen braucht in `audio.js` die
Möglichkeit, mehrere Töne zur gleichen Zeit zu starten; falls Paket A das
nicht vorgesehen hat, in `play` ein Array mit `{ together: true }`
unterstützen und die Erweiterung in ARCHITEKTUR.md nachtragen.

**Prompt.**

```
Lies docs/ARCHITEKTUR.md und docs/PLAN.md, Paket E. Baue das Paket
„Dreiklänge und Quintenzirkel“ mit sechs Stufen und Lerntafel in
src/packs/akkorde.js, dazu test/packs/akkorde.test.js. Fasse keine anderen
Dateien an, außer du hängst reine Funktionen an src/music.js an oder
erweiterst src/audio.js um gleichzeitiges Abspielen. Tests mit bekannten
Beispielen (c-e-g = C-Dur, a-c-e = a-Moll, h-d-f = vermindert). Commit auf
Deutsch.
```

---

## Paket F: Integration und Veröffentlichung

**Ziel.** Welle 2 zusammenführen, die Startseite mit allen Paketen prüfen,
Screenshots, Release.

**Schritte.**

1. Branches von B bis E auf `main` mergen, `npm test` grün.
2. `src/packs/index.js` prüfen: alle vier Pakete erscheinen auf der
   Startseite in der Reihenfolge Noten lesen, Notenwerte, Intervalle,
   Dreiklänge.
3. Blitz: optional ein Paket-Wahlschalter, falls mehr als ein Paket `blitz`
   definiert.
4. Statistik: „schwache Noten“ um Fehler je Stufe ergänzen, damit auch die
   neuen Pakete auswertbar sind.
5. Screenshots je Tab in `docs/screens/` (Playwright, Handybreite 420 px,
   hell und dunkel).
6. Cache-Version in `sw.js` erhöhen, Versionsnummer in `manifest.webmanifest`
   und README nachziehen, Tag `v0.2.0` setzen, Push. GitHub Pages
   veröffentlicht automatisch.
7. Mit einem Kind testen (siehe Konzept) und Beobachtungen als Issues anlegen.

**Prompt.**

```
Lies docs/PLAN.md, Paket F. Merge die Branches der Pakete B bis E auf
main, bringe npm test zum Laufen, prüfe alle Tabs im Browser bei 420 px in
hell und dunkel und lege Screenshots in docs/screens/ ab. Erhöhe die
Cache-Version, setze Tag v0.2.0 und pushe. Berichte, was du nicht prüfen
konntest.
```

---

## Paket G: Noten-Heatmap und adaptive Auswahl

Vorbild: die Heatmap und der adaptive „Garage“-Modus von Times Tables Rock
Stars, übertragen auf Noten. Ausgangsstand `main` 907b017 (v0.2.0 + Doku).

**Ziel.** Die App merkt sich je Note, wie sicher und wie schnell sie sitzt,
zeigt das als farbige Notenzeile in der Statistik und stellt in den Runden
öfter die Noten, die noch nicht sitzen. Kein Server, keine neuen
Abhängigkeiten, Fortschritt bleibt in `notenheld.v2`.

**Ausgangslage im Code.**

- `store.recordAnswer(s, key, ok)` zählt je `statKey` schon `{ ok, bad }`.
- `engine.js` misst die Antwortzeit schon (`r.times`), speichert sie aber
  nicht dauerhaft.
- `level.question(prev)` wählt zufällig aus (`pick` in `packs/noten.js`) und
  kennt den Fortschritt nicht.
- Die Statistik zeigt nur die sechs Einträge mit den meisten Fehlern
  (`weakList`).

**Dateien.** `src/adapt.js` (neu), `test/adapt.test.js` (neu), `src/store.js`,
`src/engine.js`, `src/packs/noten.js`, `src/views/stats.js`,
`src/views/home.js` (Schritt 6), `src/staff.js` (nur neue Klasse `"warn"`),
`css/style.css`, `index.html` (nur Container `#sHeat`), `sw.js` (`adapt.js`
in `PRECACHE`, Cache erhöhen), `test/store.test.js`, `test/engine.test.js`,
`test/views/stats.test.js`, `test/packs/noten.test.js`, `docs/ARCHITEKTUR.md`,
`docs/PLAN.md`.

**Schritte.**

1. **Store erweitern, ohne neue Version.** `recordAnswer(s, key, ok, sec)`
   bekommt einen optionalen vierten Parameter. Ein Eintrag in `s.notes` wird
   zu `{ ok, bad, sec, timed, last }`: `sec` ist die Summe der Antwortzeiten
   richtiger Antworten in Sekunden, `timed` deren Anzahl, `last` der Tag
   (`today()`). Fehlende Felder in alten Daten gelten als 0 bzw. `null`;
   keine Migration nötig, `notenheld.v2` bleibt.
2. **Engine reicht Zeit und Fortschritt durch.** `countAnswer(s, q, ok, sec)`
   gibt die gemessene Zeit an `recordAnswer` weiter. Blitz zählt die Zeit
   nicht (dort spielt Tempo-Druck mit). `makeRound(level, count, ctx)` ruft
   `level.question(prev, ctx)` mit `ctx = { notes: s.notes }`. Pakete ohne
   zweiten Parameter laufen unverändert weiter.
3. **`src/adapt.js` (rein, ohne DOM).** `status(entry)`: `"neu"` (weniger als
   6 Antworten), `"unsicher"` (Trefferquote unter 70 %), `"langsam"`
   (Trefferquote ab 70 %, aber im Schnitt über 4 s), `"sicher"` (sonst). Die
   Grenzen 6 / 70 % / 4 s sind Startwerte zum Justieren nach dem Test mit
   Kindern, keine Forschungswerte; als Konstanten oben in der Datei.
   `weight(entry)`: neu 2, unsicher 4, langsam 2, sicher 1.
   `pickWeighted(items, keyOf, notes, prev, rand = Math.random)`: wählt mit
   Gewichten, nie dieselbe Aufgabe wie `prev`; mit Wahrscheinlichkeit 0,3
   gleichverteilt, damit gemischt bleibt und auch sichere Noten wiederkommen.
4. **Paket „Noten lesen“ nutzt die Auswahl.** `question(prev, ctx)` nimmt
   `pickWeighted`, wenn `ctx?.notes` da ist, sonst wie bisher `pick`. Andere
   Pakete können später folgen (ihre `statKey`s gibt es schon).
5. **Heatmap in der Statistik.** Neue Karte „Notenkarte“ oberhalb der
   schwachen Noten: je Schlüssel eine Notenzeile mit allen Stammtönen aus
   „Noten lesen“ (Violin c' bis a'', Bass E bis c'), zwei Zeilen je Schlüssel
   bei 420 px Breite. Notenkopf-Farbe nach `status`: sicher `"ok"`, langsam
   `"warn"` (Token `--gold`), unsicher `"bad"`, neu `"ghost"`. Nicht nur
   Farbe: unter jeder Note Name und Trefferquote in Prozent; Antippen zeigt
   z. B. „Fis (fis', Violin): 12 von 15 richtig, im Schnitt 2,1 s“. Darunter
   eine Legende mit den vier Zuständen. Vorzeichen-Noten (Stufe 7) als eigene
   kleine Liste darunter.
6. **Startseite.** Auf der Karte von „Noten lesen“ ein Hinweis „3 Noten sitzen
   noch nicht“, wenn es unsichere Noten gibt.
7. **Tests.** `test/adapt.test.js`: `status` für alle vier Fälle und
   Grenzwerte; `pickWeighted` mit festem `rand` (unsichere Note kommt öfter,
   `prev` nie doppelt, leere `notes` = gleichverteilt).
   `test/store.test.js`: alte Einträge ohne `sec` funktionieren; `sec` und
   `timed` zählen nur bei richtigen Antworten.
   `test/views/stats.test.js`: reine Funktion `heatRows(notes, clef)`.
8. **Doku.** `docs/ARCHITEKTUR.md`: zweiter Parameter `ctx` bei `question`,
   neues Modul `adapt.js`, Felder in `notes`.

**Akzeptanz.**

- `npm test` grün; alte Spielstände laden ohne Fehler.
- Nach einigen Runden mit absichtlichen Fehlern bei einer Note taucht diese
  Note in den nächsten Runden spürbar öfter auf.
- Notenkarte in hell und dunkel bei 420 px lesbar, ohne Konsolenfehler.
- Keine Änderung an Freischaltung, Sternen und XP.

**Nachtrag 19.11.2026 (Entscheidungen Sandra nach dem ersten Test).**
Antwortzeit zählt höchstens 10 s; „langsam“ erst ab 3 gemessenen richtigen
Antworten; Zustand, Trefferquote und Zeit in der Notenkarte nur aus den
letzten 12 Antworten (Gesamtzahlen bleiben in der Detailzeile). Neue Felder
`hist` und `hsec` in `notes`, weiter ohne Migration. Startwerte, nach dem
Test mit einem Kind justieren.

**Prompt (Claude Code, Opus).**

```
Read CLAUDE.md, docs/ARCHITEKTUR.md and docs/PLAN.md, then the section
"Paket G: Noten-Heatmap und adaptive Auswahl". Work on branch paket-g.
Start in plan mode: show me your plan and wait for my OK. Then implement
exactly the listed steps and files, no other files. Keep notenheld.v2
backward compatible (no migration). No npm dependencies, no build step.
Run npm test, check the stats tab and a few practice rounds in the browser
at 420 px in light and dark mode. UI text, comments and commit message in
German. Do not push.
```

---

## Paket „Tonleitern“ (Klasse 5–6), Stufen 1–6

Ausgangsstand: Branch `paket-tonleitern` von `main` be8996e (Paket G mit
Nachbesserung: Zeit-Deckel 10 s, „langsam“ ab 3 Zeiten, Fenster 12 Antworten,
Cache `notenheld-v0.2.0-5`). Grundlage: `claude/DIDAKTIK-intervalle-tonleitern.md`
(Projekt-Doc, 19.11.2026) und LehrplanPLUS Gymnasium Musik Kl. 5
(Dur-Tonleitern mit verschiedenen Grundtönen, Ganz- und Halbtonschritt).

**Ziel.** Neues Paket `tonleitern` nach der Schnittstelle in ARCHITEKTUR.md,
auf der Startseite zwischen „Notenwerte und Pausen“ und „Intervalle und
Tonarten“. Nur Dur, nur bis 4 Vorzeichen, keine Doppelvorzeichen, keine
Eis/His/Ces/Fes. Moll (Stufen 7–8: a e h d g c f, alle drei Formen) kommt in
einem späteren Paket und hängt hinten an (`tonleitern-7` ff.), damit keine
Migration nötig ist.

**Dateien.** `src/packs/tonleitern.js` (neu), `test/packs/tonleitern.test.js`
(neu), `src/packs/index.js` (Reihenfolge), `sw.js` (Datei in `PRECACHE`,
Cache `notenheld-v0.2.0-6`), `css/style.css` (nur neue Klassen über
vorhandene Tokens), `src/views/stats.js` + `css/style.css` (Schritt 0),
`docs/ARCHITEKTUR.md`, `docs/PLAN.md`, `README.md`/`CLAUDE.md` (Cache, Stand).
`src/music.js` nur anhängend, falls nötig (`majorScale` gibt es schon).
`engine.js` bleibt unverändert; `staff.js` bekommt nur die optionale Breite
`opts.width` in `staffSvg` (Schritt 2).

**Tonleitern im Paket.** Dur-Tonleiter aufwärts über eine Oktave, acht Noten
(`majorScale(tonic)` + Grundton eine Oktave höher), als Vorzeichen vor den
Noten (keine Vorzeichnung), außer in Stufe 6 nach der Antwort.
Tonarten: bis 2 Vorzeichen C G D F B; bis 4 dazu A E Es As.
Lage Violinschlüssel: Grundton c' bis a' (C D E F G A in Oktave 4: c'–c'' …
a'–a''; Es es'–es'', As as'–as''), B-Dur b–b'. Lage Bassschlüssel: C und D
in der kleinen Oktave (c–c', d–d'), E F G A B Es As in der großen Oktave
(E–e … B–b, Es–es, As–as). So braucht keine Tonleiter mehr als eine Hilfslinie.

**Schritte.**

0. **Notenkarte: „neu“ grau statt blau** (Sandra, 19.11.: ja). In
   `src/views/stats.js` `HEAT_CLS.neu` auf eine neue Klasse `"new"`;
   `css/style.css`: `.note.new .notehead` und Hals/Vorzeichen in
   `var(--muted)`, hell und dunkel. Legende der Notenkarte entsprechend.
   Die Klasse `ghost` (Lernen) bleibt blau. Test in `test/views/stats.test.js`
   anpassen.
1. **Gerüst.** `src/packs/tonleitern.js` mit `id: "tonleitern"`,
   `title: "Tonleitern"`, `subtitle: "Dur-Tonleitern bauen und lesen"`,
   `grade: "Klasse 5–6"`, `blitz: null`. In `packs/index.js` zwischen
   `notenwerte` und `intervalle`.
2. **Acht Noten in einer Zeile.** Hilfsfunktion `scaleSvg(notes, clef, opts)`
   im Paket: schwarze Notenköpfe ohne Hals (`noteSvg(..., { stemless: true })`),
   `staffSvg` bekommt `opts.width` (Standard 320); `scaleSvg` nutzt 368, Noten
   bei x = 84 + 36·i (bei 320 stießen in Bass-D-Dur h–cis' und Bass-E-Dur
   E–Fis Vorzeichen an den Kopf davor). Mit `keySig` (Stufe 6, Auflösung)
   beginnen die Noten bei x = 126, Abstand 30.
   Optionen: `mark: [i, i+1]` (zwei Nachbarnoten hervorgehoben, Klasse
   `mark` über `--accent`, dazu eine eckige Klammer unter beiden Noten, damit
   es nicht nur an der Farbe hängt), `gap: i` (statt der Note eine
   gestrichelte Lücke mit „?“ auf Höhe der Mittellinie), `cls: { i: "ok" }`
   (einzelne Note färben), `keySig`. Prüfen im Browser bei 420 px und bei
   320 px Breite: kein Vorzeichen berührt den Kopf davor, Klammer und Lücke
   lesbar; ausdrücklich prüfen: Bass D-Dur und E-Dur, B-Dur im Violinschlüssel
   (b und c' auf Hilfslinien), erstes ♭ direkt nach dem Schlüssel (b, es', Es).
   Die Breite in ARCHITEKTUR.md eintragen.
3. **Stufen** (alle mit `play` nach der Antwort: Stufe 1–2 die beiden
   markierten Töne, Stufe 3–6 die ganze Tonleiter als `{ note, beats: 0.5 }`,
   also 300 ms je Ton, die Engine wartet bis zum Ende):
   1. **Halbtöne in C-Dur.** C-Dur im Violin- (c'–c'') und Bassschlüssel
      (c–c'), zwei Nachbarnoten markiert. Frage „Ganzton oder Halbton?“,
      Knöpfe „Ganztonschritt“, „Halbtonschritt“. 14 Aufgaben. Hinweis:
      „In C-Dur liegen die Halbtonschritte zwischen e und f und zwischen h und
      c, also zwischen der 3. und 4. und der 7. und 8. Stufe. Auf der Klaviatur:
      Dort liegt keine schwarze Taste dazwischen.“ Halbtöne werden mit
      Wahrscheinlichkeit 0,4 gezogen (sonst kämen sie nur 2 von 7 Mal).
      Nur zwei Knöpfe: Ausnahme von „4 bis 6“, in ARCHITEKTUR.md eintragen
      (Raten reicht in etwa 5,5 % der Runden für 8 von 10).
   2. **Bauplan der Dur-Tonleiter.** Wie Stufe 1, aber G D F B (Violin), mit
      Vorzeichen. 28 Aufgaben. Hinweis: „Jede Dur-Tonleiter hat denselben
      Bauplan: Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb. Die Halbtöne
      liegen immer zwischen der 3. und 4. und der 7. und 8. Stufe. Achte auf die
      Vorzeichen: In D-Dur ist e'–fis' ein Ganzton, fis'–g' ein Halbton.“ (Die
      Vierergruppen und der Begriff „Tetrachord“ stehen nur in der Lerntafel,
      siehe Feinschliff.)
   3. **Welcher Ton fehlt?** C G D F B, Violinschlüssel, eine Note (Stufe
      2–7) ist eine Lücke. Eingabe Namensraster (`input: "letters"`,
      `acc: true`), Antwort `{ letter, acc }`. 30 Aufgaben. Nach der Antwort
      `revealSvg`: Tonleiter vollständig, die eingesetzte Note gefärbt.
      Mit Klaviatur zählt die Tonklasse (wie in „Noten lesen“, Fis = Ges).
   4. **Welcher Ton fehlt? Bis 4 Vorzeichen.** Alle neun Tonarten, beide
      Schlüssel. 108 Aufgaben.
   5. **Welcher Ton passt nicht?** Tonleiter (bis 4 Vorzeichen, beide
      Schlüssel), bei genau einer Note (Stufe 2–7) ist das Vorzeichen um einen
      Halbton verschoben (das Vorzeichen fehlt oder es steht eines zu viel), nur übliche
      Vorzeichen (keine Eis/His/Ces/Fes), nur Vorzeichen der eigenen Sorte
      (Feinschliff: in Kreuz-Tonarten kein ♭, in Be-Tonarten kein ♯, C-Dur
      entfällt). Frage „Welcher Ton passt nicht in G-Dur?“ (Tonart in der Frage),
      Knöpfe: die sechs Namen der Noten 2–7, wie sie dastehen (`gName`,
      kurz, eine Reihe). `revealSvg`: richtige Tonleiter, berichtigte Note
      grün. Auflösung z. B. „In G-Dur heißt die 7. Stufe Fis, nicht F.“
      68 Aufgaben (34 je Schlüssel; vor dem Feinschliff 144). Im Code nicht das Wort „falsch“
      verwenden, auch nicht in Bezeichnern (Wortliste prüft den Code).
   6. **Tonleiter und Vorzeichen.** Tonleiter mit Vorzeichen vor den Noten
      (bis 4, beide Schlüssel). Frage „Welche Vorzeichen stehen vorne?“
      Knöpfe: Reihen in der Reihenfolge der Vorzeichnung, z. B. „Fis, Cis“,
      „Fis“, „Fis, Cis, Gis“, „B, Es“; „keine“ für C-Dur. Vier Knöpfe:
      richtig, ein Vorzeichen mehr, eins weniger, gleiche Zahl mit der anderen
      Sorte. Ränder: C-Dur „keine“, „Fis“, „B“, „Fis, Cis“; bei 4 Vorzeichen
      eins weniger, zwei weniger, andere Sorte. Hinweis enthält: „Der Grundton
      steht zweimal da, sein Vorzeichen zählt nur einmal.“ `revealSvg`: dieselbe Tonleiter mit
      Vorzeichnung hinter dem Schlüssel und ohne Vorzeichen vor den Noten.
      18 Aufgaben (9 Tonarten × 2 Schlüssel).
   statKeys: Stufe 1–2 „Halbton e–f“ / „Ganzton f–g“ bzw. mit Vorzeichen
   („Ganzton e–fis“), Stufe 3–4 „G-Dur, 7. Stufe (Lücke)“, Stufe 5
   „G-Dur, 7. Stufe (Suchen)“, Stufe 6 „Vorzeichen von G-Dur“.
   Jede Aufgabe setzt `display` und `reveal`, z. B. „Richtig wäre:
   Halbtonschritt (e'–f').“, „Richtig wäre: Fis (G-Dur, 7. Stufe).“,
   „Richtig wäre: Fis, Cis (D-Dur).“
4. **Lerntafeln.** „Bauplan Dur“ (`clef: "treble"` und Bass-Variante):
   C-Dur mit Klammern an den Halbtönen, darunter „Ganz Ganz Halb · Ganz ·
   Ganz Ganz Halb“, Satz zu den zwei gleich gebauten Vierergruppen (Tetrachorde)
   mit kurzer Erklärung des Begriffs.
   „Dur-Tonleitern bis 4 Vorzeichen“ (ohne Schlüssel): Tabelle Tonart, Töne,
   Vorzeichen, Reihenfolge wie im Quintenzirkel (C G D A E, F B Es As).
   Liedanfänge: nicht in diesem Paket (sie gehören zu den Intervall-Hörstufen
   und müssen vorher Lied für Lied geprüft werden).
5. **Tests** `test/packs/tonleitern.test.js`: Paket registriert und steht vor
   `intervalle`; sechs Stufen, IDs `tonleitern-1` … `-6`; jede Stufe ≥ 8
   Aufgaben, Zahlen festgehalten; jede gezeigte Tonleiter hat Halbtöne genau
   bei 3–4 und 7–8 (über `midi`); nur übliche Vorzeichen, kein Doppelvorzeichen;
   Lage innerhalb der festgelegten Bereiche; `check` nimmt die richtige und
   lehnt eine falsche Antwort ab (auch Klaviatur-Zahl); bei `choices` ist
   `answer` enthalten, Knöpfe eindeutig; Stufe 5: genau eine Note weicht ab
   und ist die Antwort; Stufe 6: Knopftexte stimmen mit der Vorzeichen-
   Reihenfolge Fis Cis Gis Dis / B Es As Des überein; nie dieselbe Aufgabe
   zweimal hintereinander; Wortliste (`texte.test.js`) bleibt grün.
   `test/sw.test.js` prüft `PRECACHE` automatisch.
6. **Doku.** ARCHITEKTUR.md: Paket in der Liste, `scaleSvg`, ggf.
   `staffSvg`-Breite. PLAN.md: dieser Abschnitt + Reihenfolge-Tabelle (Welle
   5). README/CLAUDE.md: Stand, Cache -6.

**Akzeptanz.**

- `npm test` grün (am Mac Ausgabe „ℹ pass …“).
- Browser 420 px hell und dunkel (zusätzlich 320 px): alle sechs Stufen eine
  Runde gespielt, acht Noten lesbar, nichts überlappt, keine Konsolenfehler,
  alter Spielstand lädt, Freischaltung (ab 8 Richtigen) wie bei den anderen
  Paketen.
- Knopf „Fis, Cis, Gis, Dis“ bricht bei 320 px nicht unschön um.
- Ton nach der Antwort: Tonleiter vollständig und sauber hintereinander.
- Keine Änderung an Sternen, XP und den anderen Paketen (außer Schritt 0).

**Entschieden (Sandra, 20.11.2026).** „Tetrachord“ kommt in die Lerntafel, als
„Vierergruppen (Tetrachorde)“ mit einem Satz zur Erklärung.

### Feinschliff Tonleitern (Branch `tonleitern-feinschliff`, von `main` 5a5f175)

1. Stufe 5: nur Vorzeichen der eigenen Sorte. Kreuz-Tonarten: ein ♯ fehlt oder
   steht zu viel auf einem Stammton; Be-Tonarten ebenso mit ♭; C-Dur entfällt
   (jedes Vorzeichen fiele dort sofort auf). `fitsKey(moved, fifths)`;
   68 Aufgaben statt 144.
2. Lerntafel „Bauplan Dur“: „Vierergruppen (Tetrachorde)“ und der Satz „Ein
   Tetrachord sind vier stufenweise aufeinanderfolgende Töne im Umfang einer
   Quarte – trotz des Namens kein Akkord.“
3. Auflösung Stufe 3 bis 5: Die Zeile bleibt schwarz (`q.keepRow`), nur die
   eingesetzte bzw. berichtigte Note ist grün, ihr Name steht grün unter der
   Zeile (`scaleSvg`, `opts.label`). Das Feedback darunter wird wie bisher grün
   bzw. rot. Andere Pakete unverändert.
4. Kopfzeile bei 320 px: Tonknopf wurde abgeschnitten; `.icon-btn { flex: none }`
   und engere Abstände unter 360 px.
5. Cache `notenheld-v0.2.0-7`.

## Paket „Intervalle 7–12“ (Klasse 5–6), Welle 6

**Abgelöst durch Welle 7** (unten, Sandra 20.11.2026): Die Stufen `intervalle-1` … `-12` gibt es nicht
mehr; Bauen, Fehler finden, zwei Denkschritte, `namesOnly` und die Lerntafel leben dort weiter. Der
Abschnitt bleibt als Protokoll stehen.

Ausgangsstand: Branch `paket-intervalle`, abgezweigt erst nach dem Commit von
`tonleitern-feinschliff` (Cache `notenheld-v0.2.0-7`, Engine-Option `keepRow`,
`label` in `scaleSvg`). Grundlage: `claude/DIDAKTIK-intervalle-tonleitern.md`,
LehrplanPLUS Gymnasium Musik Kl. 5 (Ganz-/Halbtonschritt, diatonische
Intervalle) und Kl. 6 (Intervalle bis zur Oktave rein/groß/klein, schriftlich
genau; übermäßig/vermindert nur MuG). Didaktik wie bei den Tonleitern: erst
die Stufen zählen, dann die Halbtöne; bauen; Fehler finden; Lerntafel als
Bauplan.

**Ziel.** Das Paket „Intervalle und Tonarten“ bekommt sechs neue Stufen,
hinten angehängt (`intervalle-7` … `-12`), kein Umbau von Spielständen.
Plan freigegeben von Sandra am 20.11.2026. Danach: Paket „Dreiklänge Schritt für Schritt“ (Kl. 6), zuletzt Hörstufen. In den
neuen Stufen nur rein, groß, klein (Sekunde bis Oktave, keine Prime), kein
vermindert/übermäßig, keine Doppelvorzeichen, keine Eis/His/Ces/Fes.
Hörstufen kommen in einem späteren Paket. Klassenangabe: „Klasse 5–9“.

**Zwei Denkschritte sichtbar (Stufen 8–12).** Jede Rückmeldung zeigt den Weg,
z. B. „e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz“.

**Freischaltung.** Neues Feld `requires: "<Stufen-ID>"` (`src/store.js`
`isUnlocked` + Hilfsfunktion `unlockedBy`, genutzt von `home.js` und
`practice.js`): 7 ← 1 · 8 ← 7 · 9 ← 8 · 10 ← 9 · 11 ← 10 · 12 ← 11.
Gesperrte Stufen zeigen „frei nach Stufe X“; die Ergebniskarte nennt die
richtige nächste Stufe (nach Stufe 1 auch Stufe 7). Unbekannte ID → gesperrt.

**Stufen.**

7. **Ganzton oder Halbton?** Zwei Noten im Sekundabstand aufwärts, Violin-
   und Bassschlüssel. Zwei Knöpfe, Halbtöne mit Wahrscheinlichkeit 0,5. Keine
   chromatischen Halbtöne (f–fis). Vorzeichen (Sandra, 20.11.): nur Stammtöne und Fis, Cis, B, Es (beide Noten).
8. **Groß, klein, rein.** Aufwärts, Violin- und Bassschlüssel, 11 Namen.
   Vier Knöpfe: vier in der Größenfolge aufeinanderfolgende Namen, die die
   richtige Antwort enthalten, Fensteranfang zufällig (wie `numberChoices`).
   Hinweis erklärt „rein“ (Quarte 5, Quinte 7, Oktave 12 Halbtöne).
9. **Intervalle abwärts.** Violinschlüssel, links die obere, rechts die
   untere Note, `play` obere zuerst. Knöpfe wie 8.
10. **Intervall bauen.** „Baue eine große Terz über e'.“ Links die gegebene
    Note, nach der Antwort rechts die gebaute (grün, mit Namen, `keepRow`).
    `input: "letters"`, `acc: true`, `namesOnly: true` (Schreibweise zählt:
    gis ≠ as; Klaviatur-Wahl ausgeblendet, `effectiveInput` mit drittem
    Parameter). Gegebene Note und Lösung Stammtöne oder übliche Vorzeichen,
    beide in c'–a''. Die reine Oktave bleibt drin (Sandra, 20.11.: als leichte Aufgabe).
11. **Intervall bauen abwärts.** „Baue eine kleine Terz unter g'.“ Sonst wie 10.
12. **Fehler finden.** Eine Mitschülerin hat gebaut: „große Terz über e'“ →
    e'–g'. Frage „Stimmt das?“ Knöpfe: „stimmt“, „falsche Zahl (Stufen)“,
    „ein Halbton zu viel“, „ein Halbton zu wenig“. Trainiert genau die zwei
    Denkschritte. Etwa ein Viertel der Aufgaben stimmt.

**Lerntafel neu: „So bestimmst du ein Intervall“.** 1. Stufen zählen (beide
Noten mit) → Zahl. 2. Halbtöne zählen → groß/klein bzw. rein. Beispiel e'–g'
mit Klammer, Tabelle der 11 Intervalle mit Halbtonzahl. Hinweis: Fis ist
nicht Ges – beim Bauen zählt der Buchstabe.

statKeys eigen (nicht mit tonleitern-1/2 vermischt): „Halbton e–f
(Sekunde)“, „große Terz“, „große Terz abwärts“, „große Terz bauen“,
„große Terz abwärts bauen“, „große Terz (Fehler)“.

**Dateien.** `src/packs/intervalle.js`, `test/packs/intervalle.test.js`,
`src/store.js` + Test, `src/views/home.js`, `src/views/practice.js` + Test,
`src/engine.js` + Test (`namesOnly`), `src/music.js` nur anhängend
(`lowerNote`), `sw.js` (Cache `notenheld-v0.2.0-8`), Doku (ARCHITEKTUR,
PLAN Welle 6, README/CLAUDE.md).

**Tests.** Neue Stufen 7–12 mit festgehaltenen Zahlen; Name passt zu Stufen
und Halbtönen (aus unterer/oberer Note berechnet); Richtung bei 9 und 11;
Bauaufgaben prüfen Buchstabe + Vorzeichen; Fehler-Aufgaben: genau die
genannte Fehlerart liegt vor; Knöpfe eindeutig, Antwort an jeder Stelle
möglich; `requires` inkl. alter Spielstände; Stufen 1–6 unverändert (76, 76,
147, 115, 30, 30); bisherige Sammeltests auf die neuen Formen angepasst.

**Umgesetzt (Branch `paket-intervalle`).** Aufgaben je Stufe: 7: 51 (Violin
und Bass), 8: 408, 9: 206, 10: 206, 11: 206, 12: 873 (206 „stimmt“, 452
„Zahl stimmt nicht“, 110 „ein Halbton zu viel“, 105 „ein Halbton zu wenig“;
ohne Intervalle, die ♯ und ♭ mischen, z. B. cis'–es' – Sandra, 20.11.2026;
Aufgaben, bei denen Zahl und Halbtöne zugleich abweichen, bleiben: zuerst
zählt die Zahl);
Stufen 1–6 unverändert (76, 76, 147, 115, 30, 30). Entscheidungen bei der
Umsetzung: Der Knopf heißt „Zahl stimmt nicht (Stufen)“ statt „falsche Zahl
(Stufen)“, weil die Wortliste (`test/texte.test.js`) „falsch“ im Code
verbietet. In Stufe 12 ist das gezeigte Intervall bei „Zahl stimmt nicht“
selbst rein, groß oder klein (Nachbarbuchstabe der richtigen Note); bei „ein
Halbton zu viel/zu wenig“ nennt die Rückmeldung nur die Halbtonzahl, nicht
„übermäßig“/„vermindert“, und die obere Note liegt immer über der unteren.
In Stufe 12 wird erst die Antwort gleich verteilt gezogen (also ein Viertel
„stimmt“), dann das Intervall, dann die Aufgabe. Stufe 8 nutzt die
statKeys von Stufe 3 („große Terz“), wie im Plan genannt. Lerntafel „So
bestimmst du ein Intervall“ steht als erste Tafel des Pakets (ohne
Schlüssel). Ergebniskarte: nach Stufe 1 der Knopf „Stufe 2“ und „Stufe 7
ist offen“, unter 8 Richtigen „Stufe 2 und 7 öffnen sich ab 8 Richtigen“;
nach Stufe 6 „Stufe 7 ist frei nach Stufe 1“. Cache `notenheld-v0.2.0-8`.

**Akzeptanz.** `npm test` grün; Browser 420 und 320 px, hell und dunkel:
jede neue Stufe eine Runde mit richtiger und falscher Antwort, nichts
überlappt, keine Konsolenfehler, Freischaltung richtig, alter Spielstand lädt.

## Welle 7: Intervalle neu (erst mit Hilfen, dann ohne)

Ausgangsstand: Branch `paket-intervalle` 74af595 (enthält auch `tonleitern-feinschliff`; seit 20.11.2026, 10:49 auf `main` und live, Cache `notenheld-v0.2.0-8`), Branch `intervalle-neu`. Plan „Paket Intervalle neu“ vom 20.11.2026 mit
den Entscheidungen von Sandra. Anlass: ihr Unterrichtsweg. Die Schülerinnen und Schüler rechnen zuerst
mit Klaviatur und Tabelle (Rahmenintervalle, Halbtonzahlen), danach ohne. Immer zuerst das
Rahmenintervall (die Zahl aus den Notenstufen), dann die Feinbestimmung (die Qualität aus den
Halbtönen). Vermindert und übermäßig gehören standardmäßig dazu (musisches Gymnasium). An den Stufen
stehen keine Jahrgangsstufen; die Lehrkraft entscheidet.

**Entscheidungen Sandra (20.11.2026).** Die Klaviatur der Hilfen markiert die beiden Töne der Aufgabe
(beim Bauen nur die gegebene Note). Liegt die Zahl daneben, zeigt die App die richtige Zahl und fragt
die Qualität trotzdem; die Aufgabe zählt als daneben. „Tonart aus den Vorzeichen“ und „Parallele
Molltonart“ wandern ins Paket „Tonleitern“ (Stufen 7 und 8, Fortschritt umbenannt). „Ganzton oder
Halbton?“ entfällt hier (steht in Tonleitern 1–2).

**Bausteine.**
- Hilfen (`level.helps: ["klaviatur", "tabelle"]`): aufklappbarer Bereich „Hilfen: Klaviatur und
  Tabelle“ (`<details>`) unter der Notenzeile, nur während der Runde und nur in Stufen mit Hilfen.
  Klaviatur über zwei Oktaven (Violinschlüssel c'–c''', Bassschlüssel C–c'), weiße Tasten mit
  Buchstaben, nicht anklickbar, eigener Bereich (nicht `#pPiano`), `pianoSvg` mit Parametern. Tabelle:
  Stufe 1 nur Rahmenintervalle (Prime 1 … Oktave 8 Notenstufen); Stufe 3 Rahmenintervall → Halbtöne
  (Sandra, 20.11.2026: Stufe 1 und 2 heißen „Intervall bestimmen“, Frage „Welches Intervall?“,
  Tabellenkopf „Stufen = Intervall“; „Rahmenintervall“ nur als Hilfsbegriff ab Stufe 3, wo Zahl und
  Feinbestimmung unterschieden werden)
  (Sandra, 20.11.2026: Prime selten – Gewicht 1/4 und höchstens einmal pro Runde, über ctx.round aus
  makeRound; Cache notenheld-v0.2.0-10, weil -9 lokal schon getestet wurde)
  für klein, rein, groß; Stufe 5 und 8 auch vermindert und übermäßig (v, k, r, g, ü mit Erklärung),
  aus `semitonesFor` berechnet. Satz: „Die Zahl kommt aus den Notenstufen, die Klaviatur brauchst du
  nur für die Halbtöne.“ (Stufe 1: „… Bei Stammtönen sind das auf der Klaviatur die weißen Tasten.“)
  Zu Beginn der Runde zugeklappt, danach bleibt der Bereich, wie du ihn gelassen hast.
- Zweischrittige Antwort (`q.steps`): erst acht Knöpfe Prime … Oktave (2 × 4, Ziffern 1–8), dann die
  zur richtigen Zahl passenden Intervalle aus der erlaubten Menge (1 bis 3 Knöpfe). Ein Ergebnis je
  Aufgabe. Rückmeldung wie bisher: „e'–g': 3 Stufen → Terz · 3 Halbtöne → kleine Terz“; nur die Zahl
  daneben: „Die Halbtöne stimmen, die Zahl nicht: …“. Gibt es zur Zahl nur ein Intervall (in Stufe 3
  und 4 Prime, Quarte, Quinte, Oktave; ab Stufe 5 nur die Oktave), bleibt der zweite Schritt als
  Bestätigung: „c'–g': 5 Stufen → Quinte. Die Quinte ist hier rein: 7 Halbtöne. Zähle nach.“ mit dem
  einen Knopf „reine Quinte“ (Prüfung 20.11.2026); nach falscher Zahl folgt dann die Auflösung
  („Richtig wäre: …“) statt „Die Halbtöne stimmen“.
- Erlaubt: rein, klein, groß (Prime bis Oktave) und ab Stufe 5 übermäßige Prime, übermäßige Sekunde,
  verminderte und übermäßige Quarte und Quinte, verminderte Septime. Oktave nur rein. Nicht dabei:
  verminderte Sekunde, verminderte/übermäßige Terz und Sexte, übermäßige Septime, verminderte Prime
  und Oktave. Keine Doppelvorzeichen, kein Eis/His/Ces/Fes. ♯ und ♭ dürfen gemischt vorkommen
  (es'–fis'); die Regel „kein ♯/♭-Gemisch“ gilt nur in „Fehler finden“.

**Stufen** (IDs `intervall-1` … `-10`, Paket-ID bleibt `intervalle`, Titel „Intervalle“, der Reihe nach frei):

| Stufe | Inhalt | Schlüssel | Hilfen | Aufgaben |
|---|---|---|---|---|
| 1 | Rahmenintervall, Stammtöne | Violin | ja | 76 |
| 2 | Rahmenintervall, Stammtöne | Violin, Bass | – | 152 |
| 3 | zweischrittig: rein, klein, groß | Violin | ja | 238 |
| 4 | dasselbe | Violin, Bass | – | 471 |
| 5 | zweischrittig mit vermindert/übermäßig | Violin | ja | 335 |
| 6 | dasselbe | Violin, Bass | – | 660 |
| 7 | abwärts, zweischrittig, alle erlaubten ohne Prime | Violin | – | 284 |
| 8 | Intervall bauen aufwärts (Namensraster), alle erlaubten ohne Prime | Violin | ja (gegebene Note markiert) | 284 |
| 9 | bauen auf- und abwärts gemischt | Violin | – | 568 |
| 10 | Fehler finden (rein/klein/groß und seit 20.11. auch ü2, v4, ü4, v5, ü5, v7 verlangt) | Violin | – | 1198 |

Auswahl: Stufe 1 und 2 erst die Zahl gleich wahrscheinlich, ab Stufe 3 erst das Intervall, Stufe 9 erst
die Richtung (je 0,5), Stufe 10 erst das Urteil (je ein Viertel).

**Spielstände.** Einmalige Umstellung in `src/store.js` (`migrateIntervalle`, Marker `"intervalle-neu"`
in `s.migrated`): `intervalle-5` → `tonleitern-7`, `intervalle-6` → `tonleitern-8`, die übrigen
`intervalle-*` entfallen, `current` wird angepasst; `notes` bleibt. Gespielte Stufen bleiben offen.
Cache `notenheld-v0.2.0-9`.

**Umgesetzt (Branch `intervalle-neu`).** Entscheidungen bei der Umsetzung: Stufe 2 nur Stammtöne (wie
Stufe 1, jetzt beide Schlüssel); in Stufe 3 und 4 gehört die reine Prime dazu (dann ein Knopf „reine
Prime“ im zweiten Schritt, ebenso „reine Quarte/Quinte/Oktave“); abwärts und beim Bauen keine Prime;
„Fehler finden“ verlangt weiter nur rein, klein, groß (eindeutige Urteile), die Rückmeldung benennt das
gezeigte Intervall jetzt auch, wenn es vermindert oder übermäßig ist; Lerntafel „Intervalle über c'/c“
mit 17 Intervallen (verminderte Quarte und Septime bräuchten über c Fes bzw. ein Doppel-Be, Beispiele
cis'–f' und cis'–b' im Text; steht ein ♯ vor der oberen Note von Prime oder Sekunde, ist das Paar
8 Einheiten breiter, die Beschriftung im Violinschlüssel bei 118); Quintenzirkel-Tafel mit nach „Tonleitern“; Paketangabe `grade` bleibt
„Klasse 5–9“ (wird nirgends angezeigt), „Tonleitern“ jetzt „Klasse 5–9“.

**Vorführung und gemeinsamer Baukasten (20.11.2026, nach Sandras Nachtrag 11:34–11:42).**
- Baukasten für alle Pakete (`docs/ARCHITEKTUR.md`, Abschnitt „Gemeinsamer Baukasten“): Tokens
  `--step1…` (violett, Schritt 1) und `--step2…` (grün, Schritt 2), hell und dunkel; `src/demo.js`
  (Vorführung: Zurück / Abspielen mit Pause, 1 s je Bild, hält am Ende / Weiter ›, Schritt-Marken, Zähler,
  Ergebniskarte, Ton je Bild); `src/grid.js` (Kästchentabelle); `pianoSvg` mit `counts`.
- Vorführung „So bestimmst du ein Intervall“: Frage → je Notenstufe ein Bild (Kreise 1, 2, 3 …, hohle violette
  Zwischenstufen, Klammer, Tabellenzeile violett) → je Halbton ein Bild (Taste grün mit Zahl, auch schwarze;
  am Ende „3 Halbtöne → kleine Terz“ bzw. „6 Halbtöne = rein 5 + 1 → übermäßige Quarte“, Kästchen grün) →
  Ergebnis „e'–g' = kleine Terz“ mit „3 Stufen“ / „3 Halbtöne“. Erste Lerntafel des Pakets mit fünf
  Beispielen (e'–g', c'–e', d'–fis', f'–h', d'–a') und „Vorführen“ in den Hilfen (Stufen 1, 3, 5, 8) für die
  aktuelle Aufgabe, erst nach der Antwort; die Runde wartet dann auf „Nächste Aufgabe“.
- Tabelle neu (statt v/k/r/g/ü): eine Zeile je Rahmenintervall „1 Prime“ … „8 Oktave“, Spalten klein | rein |
  groß in Kästchen, leere Stellen als blasser Punkt, „rein“ grau hinterlegt; darunter ab Stufe 5 „vermindert =
  1 Halbton weniger · übermäßig = 1 Halbton mehr“. Stufe 1 nur die Rahmenspalte, Stufe 3 ohne diese Zeile.
- Hilfen kompakt: Satz und „Vorführen“ in einer Zeile, Tabelle in zwei Hälften, nach dem Aufklappen werden
  die Antwortknöpfe ins Bild gescrollt; bis 380 px stehen die Hilfen unter den Antwortknöpfen.
- Stufe 10 (Sandra): auch ü2, v4, ü4, v5, ü5, v7 als Ziel. 1198 Aufgaben (277 „stimmt“, 630 „Zahl stimmt
  nicht“, 145 „ein Halbton zu viel“, 146 „zu wenig“; davon 325 mit vermindertem/übermäßigem Ziel).

Entscheidungen bei der Umsetzung: In Stufe 1 zeigt die Vorführung nur den ersten Schritt (die Stufe kennt noch
keine Halbtöne); bei der Prime gibt es ein Bild „0 Halbtöne, dieselbe Taste“. Die Klaviatur der Vorführung
beginnt beim C unter der unteren Note und hat eine Oktave, wenn sie reicht (größere Tasten bei 320 px).
Bei vermindert/übermäßig leuchtet das Bezugs-Kästchen grün umrandet und der passende Teil der Zeile darunter
grün (die Tabelle hat keine eigene v/ü-Spalte). „Vorführen“ ist vor der Antwort gesperrt, der Hinweis steht im
`title`. Bei „Zahl stimmt nicht“ ist das gezeigte Intervall weiter selbst rein, klein oder groß; übermäßige
Ziele haben nie „ein Halbton zu viel“, verminderte nie „zu wenig“ (bräuchten Doppelvorzeichen, Eis, His, Ces
oder Fes). Cache bleibt `notenheld-v0.2.0-9` (nie live), `src/demo.js` und `src/grid.js` stehen in `PRECACHE`.

**Nachtrag 20.11.2026 (Entscheidungen Sandra): Warten auf „Nächste Aufgabe“, „Weiter ›“.**
- Stufen mit Hilfen (Intervalle 1, 3, 5, 8) gehen nach der Antwort nicht mehr von selbst weiter: Unter den
  Antwortknöpfen erscheint „Nächste Aufgabe“ (`#pNext`, sichtbar ohne die Hilfen zu öffnen, bei 320 × 640 ohne
  Scrollen); Tippen, Enter oder Leertaste geht weiter, auch nach der zehnten Aufgabe (dann Ergebniskarte).
  „Vorführen“ bleibt während des Wartens frei. Stufen ohne Hilfen gehen wie bisher nach der Pause weiter.
- Vorführung: der Knopf „Nächster Schritt“ heißt jetzt „Weiter ›“ (kürzer, die drei Knöpfe stehen bei 320 px in
  einer Zeile); `aria-label` bleibt „Nächster Schritt“.

**Akzeptanz.** `npm test` grün; Browser 420 und 320 px, hell und dunkel: jede Stufe Hilfen auf und zu,
eine Aufgabe ganz richtig, eine mit danebenliegender Zahl und dann Qualität; Klaviatur markiert richtig,
nichts abgeschnitten oder überlappend, kein waagrechter Überlauf, keine Konsolenfehler; Tonleitern 7/8;
alter Spielstand mit `intervalle-1` … `-12` wird richtig umgestellt; Lerntafeln.

## Welle 8: Tonleitern gehirngerecht (erst mit Hilfen, dann ohne)

Ausgangsstand: `main` bd29c40 (Intervalle neu, live seit 20.11.2026, 14:22, Cache `notenheld-v0.2.0-10`),
Branch `tonleitern-neu`. Grundlage: KONZEPT-gehirngerecht (Sandra, 20.11.2026; Cowork-Ordner) und der
gemeinsame Baukasten aus Welle 7 (`--step1…`/`--step2…`, `src/demo.js`, `src/grid.js`, `pianoSvg` mit
`counts`, `level.helps`, `q.steps`, Warten auf „Nächste Aufgabe“). Musikalischer Inhalt der Stufen bleibt wie
in Welle 5 und im Feinschliff (nur Dur bis 4 Vorzeichen in den Tonleiter-Stufen, Tonarten bis 7 Vorzeichen,
keine Doppelvorzeichen, kein Eis/His/Ces/Fes in Tonleitern). Keine Jahrgangsstufen an den Stufen.

**Die zwei Denkschritte.**
- Tonleiter: Schritt 1 (violett) = **Bauplan**: Notenstufen 1–8 und Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb;
  Schritt 2 (grün) = **Klaviatur**: Halbtöne zählen → Vorzeichen. Passt der Abstand nicht zum Bauplan, ändert
  sich immer die obere Note: Abstand zu klein → ♯, Abstand zu groß → ♭ (z. B. As-Dur: as–h sind 3 Halbtöne, der
  Bauplan will Ganz → b). Der Grundton (1. und 8. Stufe) steht von Anfang an mit seinem Vorzeichen da (B, Es, As).
- Tonart aus den Vorzeichen: Schritt 1 = das entscheidende Vorzeichen (letztes ♯ bzw. vorletztes ♭);
  Schritt 2 = Halbton höher (♯) bzw. ablesen (♭) → Tonart.
- Parallele Molltonart: Schritt 1 = eine Terz abwärts, also drei Notenstufen, der Dur-Grundton zählt als 1
  (wie die Zahlenkreise bei den Intervallen) → Stammton; Schritt 2 = drei Halbtöne abwärts (kleine Terz; gezählt
  werden die Tastenschritte) → Vorzeichen → Molltonart. Das ist derselbe Weg wie bei den Intervallen
  (Zahl → Qualität). Achtung H/B: Des-Dur → Stammton H → mit ♭ heißt er B → b-Moll.

**Stufen** (der Reihe nach frei; H = Hilfen, 2S = Antwort in zwei Schritten):

| Neu | Inhalt | Schlüssel | H | 2S | Herkunft |
|---|---|---|---|---|---|
| 1 | Ganz- oder Halbtonschritt? C-Dur | Violin, Bass | ja | – | alt 1 |
| 2 | Bauplan mit Vorzeichen, G D F B | Violin | ja | – | alt 2 |
| 3 | Ganz- oder Halbtonschritt, alle 9 Tonarten | Violin, Bass | – | – | neu |
| 4 | Welcher Ton fehlt? bis 2 Vorzeichen | Violin | ja | ja | alt 3 |
| 5 | Welcher Ton fehlt? bis 4 Vorzeichen (Namensraster wie bisher) | Violin, Bass | – | – | alt 4 |
| 6 | Welcher Ton passt nicht? (alle Violin-Aufgaben von alt 5) | Violin | ja | – | neu |
| 7 | Welcher Ton passt nicht? | Violin, Bass | – | – | alt 5 |
| 8 | Tonleiter und Vorzeichen (alle 9 Tonarten) | Violin | ja | – | neu |
| 9 | Tonleiter und Vorzeichen | Violin, Bass | – | – | alt 6 |
| 10 | Tonart aus den Vorzeichen (15 Tonarten) | Violin | ja | ja | neu |
| 11 | Tonart aus den Vorzeichen | Violin, Bass | – | – | alt 7 |
| 12 | Parallele Molltonart (15 Tonarten) | Violin | ja | ja | neu |
| 13 | Parallele Molltonart | Violin, Bass | – | – | alt 8 |

Moll-Tonleitern (natürlich, harmonisch, melodisch; nur a e h d g c f) folgen später als `tonleitern-14` ff.,
ebenfalls paarweise mit/ohne Hilfen.

**Zweischrittige Antworten (`q.steps`, nur Knöpfe; die Stufe hat dann `input: "choices"`).** Die Knöpfe
stehen in fester Reihenfolge (nicht gemischt). Texte nach Schritt 1 über `steps[0].ok` / `.bad`, dazu
`q.partial` („Der Ton stimmt, der Schritt nicht: …“). Schritt 1 daneben: richtigen Knopf zeigen, Schritt 2
trotzdem fragen, Aufgabe zählt als daneben (macht die Engine schon so, wie bei den Intervallen).
- Stufe 4 (Ton fehlt): Schritt 1 „Von der Note davor zur Lücke: Ganz- oder Halbtonschritt?“ (2 Knöpfe; die
  Stelle musst du selbst abzählen, die Bauplan-Leiste hebt sie vor der Antwort nicht hervor). Die Lücke liegt
  auf der 2. bis 7. Stufe, ein Halbtonschritt kommt also nur bei der 4. Stufe vor (5 von 30 Aufgaben): Aufgaben
  mit Halbtonschritt mit Gewicht etwa 1/3 ziehen (wie `pickStep`). Schritt 2 „Welcher Ton?“: die erlaubten
  Namen zum Stammton der Lücke in der Reihenfolge Stammton, ♯-Form, ♭-Form (`usualNote`, ohne
  Eis/His/Ces/Fes): D | Dis | Des, G | Gis | Ges, A | Ais | As, C | Cis, E | Es, F | Fis, H | B. Nachgerechnet
  für alle 30 Aufgaben: immer 2 oder 3 Knöpfe, die richtige Antwort ist dabei, keine zwei klingen gleich.
  Rückmeldung: „6.→7. Stufe: Ganztonschritt · e''–fis'': 2 Halbtöne → Fis“. statKey wie bisher („… (Lücke)“).
- Stufe 10 (Tonart): Schritt 1 „Welches Vorzeichen ist entscheidend?“: Knöpfe = die Vorzeichen der Vorzeichnung
  in ihrer Reihenfolge, bis 7: Fis Cis Gis Dis Ais Eis His bzw. B Es As Des Ges Ces Fes (eigene Listen mit 7
  Einträgen; `SHARP_ORDER`/`FLAT_ORDER` mit 4 bleiben). Eis, His, Ces und Fes sind hier richtig und nötig: das
  Verbot gilt nur für Töne in den Tonleitern bis 4 Vorzeichen. Ohne `cols` (kurze Texte: eine Reihe, bei 7
  Knöpfen 4 + 3; bei 320 px prüfen). Antwort: letztes ♯ bzw. vorletztes ♭. Bestätigungsschritt mit einem
  Knopf: C-Dur „keine Vorzeichen“, G-Dur „Fis“ (nur ein Kreuz), F-Dur „B“ mit `ok`-Text „Richtig: Hier steht nur ein Be. Ein
  einzelnes Be ist die Ausnahme, die Tonart merkst du dir.“ (nennt F-Dur nicht, seit 20.11.2026 nach der Prüfung) – der Knopf selbst nennt die Tonart nicht (sonst stünde die Antwort
  von Schritt 2 schon da). Schritt 2 „Welche Dur-Tonart?“ mit `keyChoices` wie bisher (nie zwei gleich
  klingende Tonarten). Rückmeldung: „Letztes Kreuz Dis · einen Halbton höher → E-Dur“ bzw. „Vorletztes Be Es →
  Es-Dur“. Nachgerechnet für alle 15 Tonarten (Eis → Fis-Dur, His → Cis-Dur, Ces → Ces-Dur).
- Stufe 12 (Moll): Schritt 1 „Terz abwärts vom Dur-Grundton: welcher Stammton?“ (3 Knöpfe in der Reihenfolge
  der Stammtöne: der richtige und seine beiden Nachbarn, z. B. G | A | H; der Dur-Grundton zählt als 1).
  Schritt 2 „Drei Halbtöne abwärts: welche Molltonart?“: alle Molltonarten der 15 Tonarten auf diesem Stammton:
  A: a-Moll | ais-Moll | as-Moll, H: h-Moll | b-Moll, C: c-Moll | cis-Moll, D: d-Moll | dis-Moll,
  E: e-Moll | es-Moll, F: f-Moll | fis-Moll, G: g-Moll | gis-Moll. Nachgerechnet: jeder Stammton hat 2 oder 3
  Varianten, die richtige ist immer dabei, Varianten desselben Stammtons klingen nie gleich; `minorChoices`
  wird hier nicht gebraucht. Rückmeldung: „Es-Dur: Terz abwärts → Stammton C · 3 Halbtöne → c-Moll“,
  bei Des-Dur „… → Stammton H · 3 Halbtöne → b-Moll (H mit ♭ heißt B)“.
- Stufen ohne Hilfen (5, 7, 9, 11, 13) bleiben einschrittig wie bisher; ihre Rückmeldung nennt trotzdem beide
  Denkschritte (11: „Letztes Kreuz Gis · einen Halbton höher → A-Dur“, 13: „Terz abwärts: 3 Halbtöne unter Es
  liegt c → c-Moll“), so bleibt der Weg sichtbar (KONZEPT: „Rückmeldung zeigt beide Schritte“).

**Hilfen (`level.helps`, aufklappbar, nur Stufen mit H).** Die Engine kennt nur `"klaviatur"` und `"tabelle"`
(`level.helpTable`, festes HTML je Stufe, wird nach der Antwort nicht neu gezeichnet). Dabei bleibt es:
keine neuen Hilfe-Arten, Bauplan-Leiste und Quintenzirkel sind die `helpTable` der Stufe. Vor der Antwort
wird in den Hilfen nichts hervorgehoben, was die Antwort zeigt; die Hervorhebung (Spalte violett, Treffer
grün) gibt es in der Vorführung nach der Antwort.
- `"klaviatur"`: zwei Oktaven wie bisher, Buchstaben auf den weißen Tasten. Einzige Ergänzung an der Engine
  (zusätzlich, andere Pakete unverändert): `q.helpFrom` (MIDI-Nummer des untersten C; ohne das Feld wie bisher
  `HELP_FROM[q.clef]`). Nötig, weil B-Dur im Violinschlüssel auf b beginnt (unter c') und D-Dur im
  Bassschlüssel bis d' reicht. Regel: das C auf oder unter dem Grundton. Markiert (`q.helpMarks`): Stufe 1
  und 2 die beiden Nachbarnoten (Entscheidung Sandra bei den Intervallen: die Klaviatur markiert die Töne der
  Aufgabe); 4, 6, 8 alle gezeigten Noten (in 4 die Lücke nicht, in 6 auch die unpassende Note, wie sie
  dasteht); 10 nichts (das letzte Kreuz verriete Schritt 1); 12 nur der Dur-Grundton (steht schon in der
  Frage), in der zweigestrichenen Oktave, damit drei Halbtöne darunter Platz haben.
- Bauplan-Leiste (`helpTable` der Stufen 1, 2, 4, 6, 8; `tileTable`): Kopf „1–2 … 7–8“, Zeile „Schritt“ mit
  G G H G G G H in Kästchen, die Halbton-Spalten (3–4, 7–8) grau hinterlegt (`family`). Ohne Hervorhebung in
  der Aufgabe: eine umrandete Spalte verriete in Stufe 1 und 2 die Antwort und in Stufe 4 den Schritt 1.
  Satz (`helpText`): „Der Bauplan gibt die Schritte vor, die Klaviatur zeigt, ob die Noten ihn erfüllen.“
- Quintenzirkel-Kästchen (`helpTable` der Stufe 10): eine Zeile je Anzahl Vorzeichen 0 … 7, Spalten
  „♯-Tonart | ♭-Tonart“, ohne Hervorhebung. Wie die Tabelle bei den Intervallen ist das eine Nachschlagehilfe;
  den Weg über das entscheidende Vorzeichen erzwingt Schritt 1.
- Stufe 12: nur Klaviatur und Satz, keine Tabelle. Eine Spalte „parallel Moll“ gäbe beide Schritte durch
  bloßes Ablesen vor; die Spalte steht in der Lerntafel „Quintenzirkel“ und auf der Ergebniskarte der Vorführung.
- „Vorführen“ wie bei den Intervallen: erst nach der Antwort; Stufen mit Hilfen warten ohnehin auf
  „Nächste Aufgabe“ (`waitsForNext`, auch ohne `level.demo`).

**Vorführungen (`src/demo.js`, Bilder rein im Paket, testbar).**
1. **„So baust du eine Dur-Tonleiter“** (erste Lerntafel, Beispiele C, G, F, D, B im Violinschlüssel; in den
   Hilfen der Stufen 4, 6, 8 für die Tonleiter der Aufgabe):
   Frage („G-Dur bauen: Grundton g'“) → Schritt 1 violett „1 · Bauplan“: je Bild eine Notenstufe als Stammton
   mit Zahlenkreis 1 … 8 (nur der Grundton auf der 1 und der 8 trägt sein Vorzeichen schon: b, es, as), Ton
   erklingt; danach ein Bild, in dem die Bauplan-Leiste G G H G G G H erscheint →
   Schritt 2 grün „2 · Klaviatur“: je Bild ein Schritt (7 Bilder), Tasten der beiden Töne grün, Halbtöne einzeln
   nummeriert, Bauplan-Kästchen des Schritts grün; passt es nicht, steht im Satz „e''–f'': 1 Halbton, der
   Bauplan will Ganz → f'' wird zu fis''“, die Note bekommt das ♯ (grün, Schritt 2; keine dritte Farbe), das Kästchen grün; ist der Abstand zu groß,
   heißt es „a'–h': 2 Halbtöne, der Bauplan will Halb → h' wird zu b'“ (in Es- und As-Dur auch „3 Halbtöne,
   der Bauplan will Ganz“);
   der folgende Schritt rechnet mit der berichtigten Note (fis''–g'': 1 Halbton = Halb ✓) → Ergebnis groß
   „G-Dur: g a h c d e fis g“ mit den Marken „Bauplan G G H G G G H“ / „1 Vorzeichen: Fis“.
   Bei C-Dur passt jeder Schritt („kein Vorzeichen nötig“). Etwa 1 + 8 + 1 + 7 + 1 = 18 Bilder.
   In Stufe 1 und 2 (Ganz/Halb mit Hilfen) dieselbe Vorführung verkürzt für das gefragte Notenpaar: Frage → Schritt 1 „welche
   Stufen? 3.→4.“ (Bauplan-Spalte violett) → Schritt 2 Halbtöne zählen → Ergebnis „e'–f' = Halbtonschritt“.
2. **„So findest du die Tonart“** (Lerntafel, Hilfen Stufe 10): Schritt 1: Vorzeichen nacheinander aufbauen
   (je Bild eins, nummeriert), das entscheidende violett umrandet; Schritt 2: Klaviatur, vom letzten ♯ einen
   Halbton höher (grün) bzw. vorletztes ♭ = Grundton → Ergebnis „3 ♯ → A-Dur“ mit Marken
   „letztes Kreuz Gis“ / „+1 Halbton → A“. Kurzfassung ohne zweiten Schritt für C-Dur („keine Vorzeichen →
   C-Dur“) und F-Dur („ein einzelnes Be → F-Dur“), wie `DEMO_STEP_ONLY` bei den Intervallen.
3. **„So findest du die parallele Molltonart“** (Lerntafel, Hilfen Stufe 12): Schritt 1: vom Dur-Grundton drei
   Notenstufen abwärts (Kreise 1, 2, 3; die 1 ist der Dur-Grundton); Schritt 2: drei Halbtöne abwärts auf der
   Klaviatur (Tasten 1, 2, 3 nach dem Grundton), der Stammton bekommt, wenn nötig, sein Vorzeichen (A-Dur:
   F → fis; Des-Dur: H → b) → Ergebnis „Es-Dur → c-Moll“ mit „3 Stufen“ / „3 Halbtöne“. Verweis auf die
   Intervalle: das ist eine kleine Terz. Ces-Dur beginnt auf der Taste H (im Satz erwähnen).

**Lerntafeln (Reihenfolge).** So baust du eine Dur-Tonleiter (Vorführung) · Bauplan Dur (Violin/Bass, wie
bisher, dazu die Bauplan-Leiste als Kästchentabelle) · Dur-Tonleitern bis 4 Vorzeichen · So findest du die
Tonart (Vorführung) · Quintenzirkel (wie bisher, darunter die Kästchentabelle) · So findest du die parallele
Molltonart (Vorführung).

**Spielstände.** Einmalige Umstellung `migrateTonleitern` in `src/store.js` (Marker `"tonleitern-neu"`,
frischer Stand trägt beide Marker): `tonleitern-1→1, 2→2, 3→4, 4→5, 5→7, 6→9, 7→11, 8→13`; `current`
entsprechend; `notes` bleiben; statKeys der alten Stufen bleiben gleich (Notenkarte unverändert), neue Stufen
benutzen dieselben statKey-Formen.
- Reihenfolge zwingend: erst `migrateIntervalle` (macht aus `intervalle-5/-6` die alten `tonleitern-7/-8`),
  dann `migrateTonleitern` (→ 11 und 13). Umgekehrt landete der Fortschritt auf „Welcher Ton passt nicht?“.
  In `load` beide immer aufrufen und danach einmal speichern (`const a = …, b = …; if (a || b) save`), nicht
  mit `||` verketten (sonst liefe die zweite beim ersten Laden nicht). Auch im v1-Zweig beide aufrufen.
- In einem Durchgang in ein neues `levels`-Objekt umschreiben (nicht nacheinander im selben Objekt:
  3→4 und danach 4→5 würde verketten); `mergeLevel` wie bei den Intervallen.
- Freischaltung: Gespielte Stufen bleiben offen (`isUnlocked`: `played > 0`). Die neuen Stufen 3, 6, 8, 10, 12
  öffnen sich wie üblich über die Stufe davor (`best ≥ 8`); `isUnlocked` öffnet eine Stufe nicht deshalb,
  weil die Folgestufe gespielt ist. Folgen, bewusst hingenommen (keine Änderung an `isUnlocked`, kein
  `requires`): (a) eine alte Stufe, die offen, aber noch nie gespielt war, ist erst wieder offen, wenn die
  neue Stufe davor mit 8 geschafft ist; (b) wer die Tonarten früher im Paket „Intervalle“ gespielt hat, ohne
  alt 6 zu schaffen, sieht 11 offen und 10 gesperrt (12 ist offen, sobald 11 `best ≥ 8` hat). Nichts
  Gespieltes wird gesperrt; „Alle Stufen freischalten“ bleibt. Beide Fälle als Test festhalten.
- Tests anpassen: `test/store.test.js` (die Tests zu `migrateIntervalle` rufen die Funktion einzeln auf und
  bleiben; neu: beide nacheinander über `load`), `test/engine.test.js` (Liste der `keepRow`-Stufen: jetzt
  `tonleitern-4` bis `-7`), `test/packs/tonleitern.test.js` (13 IDs).
- Cache `notenheld-v0.2.0-11`.

**Schritte (je eigener Opus-Agent, danach Prüfung Fable).**
0. Stufen umbauen + Spielstand-Umstellung + Tests (Zahlen der Aufgaben festhalten, Halbtöne 3–4/7–8, keine
   unerlaubten Namen, `q.steps`-Antworten eindeutig, Umstellung alt → neu, auch mit vorher umgestellten
   Intervall-Spielständen).
1. Hilfen: Bauplan-Leiste, Quintenzirkel-Kästchen, Klaviatur je Stufe (`q.helpFrom`, Test: jede markierte
   Note liegt auf der gezeigten Klaviatur, für alle Aufgaben der Stufen mit Hilfen); Warten auf „Nächste
   Aufgabe“.
2. Vorführungen 1–3 + Lerntafeln; Ton je Bild über `audio.js`; Tests der reinen Bilderfolgen (Anzahl Bilder,
   jede Korrektur musikalisch richtig, für alle 9 Tonarten × beide Schlüssel nachgerechnet).
3. Doku: ARCHITEKTUR (`q.helpFrom`, Hilfen der Tonleitern), PLAN (dieser Abschnitt, „Umgesetzt“), README, CLAUDE.md
   (Stand, Cache -11).

**Akzeptanz.** `npm test` grün (am Mac „ℹ pass …“); Browser 420 und 320 px, hell und dunkel: jede Stufe eine
Runde, Hilfen auf/zu, je eine Aufgabe ganz richtig und eine mit danebenliegendem Schritt 1; alle drei
Vorführungen bis zum Ergebnis, Bildzähler und Knöpfe in einer Zeile bei 320 px; nichts überlappt, kein
waagrechter Überlauf, keine Konsolenfehler; alter Spielstand (Tonleitern 1–8 und alte Intervalle) wird richtig
umgestellt; andere Pakete unverändert. UI-Texte: Anrede „du“, sachlich; `test/texte.test.js` prüft den ganzen
Code in `src/` ohne Kommentare, auch Bezeichner: kein „falsch“, kein „Fehler!“ (stattdessen „daneben“, „passt
nicht“, „Richtig wäre: …“).

**Entscheidungen (ohne Rückfrage, Sandra 14:27: ohne Rückfragen bauen).**
- 13 Stufen, nicht 11. Sandras Regel heißt „neuer Inhalt mit Hilfen, die nächste Stufe festigt ihn ohne“. Ohne
  Stufe 3 gäbe es Ganz-/Halbtonschritte nur mit Hilfen, ohne Stufe 8 „Tonleiter und Vorzeichen“ nur ohne.
  Stufe 3 bringt außerdem Neues (A-, E-, Es-, As-Dur und den Bassschlüssel bei den Schritten). Die Stufen mit
  Hilfen sind kurz (nur Violinschlüssel); „Alle Stufen freischalten“ bleibt für Lehrkräfte.
- Stufe 4 zweischrittig mit Knöpfen (erst Ganz/Halb, dann der Name aus 2–3 Knöpfen), Stufe 5 offen über das
  Namensraster wie bisher (freies Abrufen ist die schwerere Form; Spielstand und statKeys bleiben).
- Stufe 6 = alle Violin-Aufgaben von alt 5, Stufe 8 = alle 9 Tonarten im Violinschlüssel (derselbe Inhalt wie
  die Stufe danach, nur ohne Bassschlüssel).
- Hilfen heben vor der Antwort nichts hervor, was die Antwort zeigt; Stufe 12 ohne Tabelle (siehe „Hilfen“).
- Einzige Ergänzung an der Engine: `q.helpFrom`. Keine neuen Hilfe-Arten, kein Neuzeichnen der Hilfen nach der
  Antwort, keine Änderung an `isUnlocked`.

**Prüfung (Fable, 20.11.2026).** Musiktheorie, Engine, Spielstände und Didaktik gegen Code und
KONZEPT-gehirngerecht geprüft; die Auswahlsätze der Stufen 4, 10 und 12 für jede Tonart nachgerechnet.
Geändert: (1) Bauplan-Leiste ohne umrandete Spalte in der Aufgabe (verriet in Stufe 1/2 die Antwort, in
Stufe 4 den Schritt 1); (2) F-Dur-Knopf in Stufe 10 nennt die Tonart nicht mehr, G-Dur als weiterer
Ein-Knopf-Fall, Vorzeichenlisten bis 7 (Eis/His/Ces/Fes dort erlaubt); (3) Stufe 12: „Stammton“ statt
„Buchstabe“, Zählweise der Terz klargestellt, H/B-Fall Des-Dur → b-Moll, feste Variantenlisten, kein
Rückgriff auf `minorChoices`, keine Moll-Spalte in den Hilfen; (4) Hilfen mit den vorhandenen Arten
`klaviatur`/`tabelle` statt neuer Arten, Klaviatur zwei Oktaven mit `q.helpFrom` statt „Oktave + Quinte“
(B-Dur im Violin- und D-Dur im Bassschlüssel lägen sonst neben der Klaviatur), keine Hervorhebung nach der
Antwort in den Hilfen (die Engine zeichnet sie nicht neu); (5) Vorführung 1: Grundton mit eigenem Vorzeichen,
Regel „zu klein → ♯, zu groß → ♭“ mit den 3-Halbton-Fällen in Es- und As-Dur, Berichtigung in Grün statt
Akzentfarbe, Kurzfassung nur für Stufe 1 und 2 (Stufe 2 stand doppelt, Stufe 3 hat keine Hilfen); (6)
Spielstände: Reihenfolge und Aufruf in `load`, Umschreiben in einem Durchgang, falsche Annahme zur
Freischaltung berichtigt, anzupassende Tests benannt; (7) Stufe 4: Halbtonschritt nur bei der 4. Stufe,
deshalb gewichtet ziehen; (8) Rückmeldung der Stufen ohne Hilfen nennt beide Denkschritte.

**Umgesetzt (Branch `tonleitern-neu`).** Aufgaben je Stufe: 1: 14, 2: 28, 3: 126, 4: 30, 5: 108, 6: 34, 7: 68,
8: 9, 9: 18, 10: 15, 11: 30, 12: 15, 13: 30. Stufen mit Hilfen (1, 2, 4, 6, 8, 10, 12) warten auf „Nächste
Aufgabe“ und haben „Vorführen“ (erst nach der Antwort). Engine: nur `q.helpFrom` (`helpFrom(q)`, optional).
`staff.js`: `keySigPos` (Lage der Vorzeichen; `keySigSvg` unverändert). `store.js`: `migrateTonleitern`,
`migrateAll`. Cache `notenheld-v0.2.0-11`.

Entscheidungen bei der Umsetzung (ohne Rückfrage, Sandra 14:27):
- Stufe 4: „Gewicht etwa 1/3“ als Wahrscheinlichkeit 1/3 für einen Halbtonschritt (`GAP_HALF_P`, wie `pickStep`);
  ein Gewicht 1/3 je Aufgabe hätte die 5 Halbton-Aufgaben noch seltener gemacht (6 % statt 17 %).
- Stufe 12, Schritt 1: drei aufeinanderfolgende Stammtöne in ihrer Reihenfolge, der Anfang zufällig (G | A | H,
  H | C | D, A | H | C …). Mit „der richtige und seine beiden Nachbarn“ stünde die Antwort immer in der Mitte.
  Die Frage nennt die Dur-Tonart („Parallele Molltonart zu Es-Dur. Terz abwärts vom Dur-Grundton: welcher
  Stammton?“), die Zeile zeigt wie in Stufe 13 die Vorzeichnung. Text nach Schritt 1: „Richtig: Es (1), D (2),
  C (3) → Stammton C.“
- Stufe 10, Schritt 2: die vier Tonarten aus `keyChoices` (nie zwei gleich klingende) in fester Reihenfolge nach
  dem Quintenzirkel von ♭ nach ♯ (`keyChoicesFixed`). Aufforderung: „Einen Halbton über Dis: welche
  Dur-Tonart?“ bzw. „Das vorletzte Be ist der Grundton: welche Dur-Tonart?“ (nennt den Weg, nicht die Tonart).
  Ein-Knopf-Fälle: C „Richtig: Hier steht kein Vorzeichen.“, G „Richtig: Fis ist das einzige Kreuz, also das
  letzte.“, F wie im Plan.
- Quintenzirkel-Kästchen (Hilfe Stufe 10, Lerntafel): im Kästchen nur der Grundton (C, G … Ces), Kopf „Anzahl |
  ♯-Tonart | ♭-Tonart“, darunter „Alle hier sind Dur-Tonarten: 3 ♯ → A-Dur, 3 ♭ → Es-Dur.“ Mit „-Dur“ war die
  Tabelle bei 420 px breiter als die Hilfen. Die Lerntafel „Quintenzirkel“ behält ihre Tabelle mit Moll.
- Bauplan-Leiste: darunter „G = Ganztonschritt (2 Halbtöne) · H = Halbtonschritt (1 Halbton)“, weil G und H
  sonst wie Notennamen gelesen werden könnten.
- Titel: Stufen ohne Hilfen heißen „… ohne Hilfen“ (wie bei den Intervallen), die Untertitel nennen „mit Hilfen“
  bzw. „zwei Schritte“. Stufe 3 heißt „Ganz- und Halbtonschritte ohne Hilfen“.
- Rückmeldungen mit beiden Denkschritten: Stufe 5 „Fis (G-Dur) · 6.→7. Stufe: Ganztonschritt · e''–fis'':
  2 Halbtöne → Fis“; Stufe 6 und 7 nennen den Schritt von der Note davor (er passt nie zum Bauplan, getestet):
  „F passt nicht in G-Dur: 6.→7. Stufe: e''–f'': 1 Halbton, der Bauplan will Ganz → Fis.“; Stufe 8 und 9
  „Fis, Cis (D-Dur): der Bauplan G G H G G G H braucht Fis und Cis“; Stufe 11 Auflösung „Drei Kreuze stehen für
  A-Dur (letztes Kreuz Gis · einen Halbton höher → A-Dur).“; Stufe 13 „Die parallele Molltonart zu Es-Dur ist
  c-Moll (Terz abwärts: 3 Halbtöne unter Es liegt c).“
- Vorführung 1: Im Schritt 1 ist die jeweils neue Stufe violett. Die Klaviatur zählt bis zur berichtigten Note
  (e''–fis'': f'' = 1, fis'' = 2), die Zeile „Halbtöne“ der Bauplan-Leiste zeigt den Abstand nach der
  Berichtigung (also den Bauplan-Wert); der gemessene Abstand steht im Satz. Der geprüfte Schritt hat eine grüne
  Klammer. Ohne Vorzeichen: „kein Vorzeichen nötig“ als zweite Marke. Klaviatur ab dem C auf oder unter dem
  Grundton, eine Oktave, wenn sie reicht.
- Vorführung 2: Vorzeichen im Abstand 22 statt 12 (Platz für die Zahlenkreise), Klaviatur eine Oktave ab c'
  (Taste nach dem Klang; „Eis liegt auf der Taste F“, „His … C“, „Ces … H“ im Satz). Marken „1 · Entscheidendes
  Vorzeichen“ / „2 · Klaviatur“, Kurzfassung (C, F) „Vorzeichen lesen“.
- Vorführung 3: Noten ohne Vorzeichnung, der Dur-Grundton mit seinem Vorzeichen; die Moll-Note bekommt im
  dritten Halbton-Bild ihr Vorzeichen in Grün; Satz endet mit „Das ist eine kleine Terz.“ Marken „1 · Terz
  abwärts: 3 Stufen“ / „2 · 3 Halbtöne abwärts“.
- Lerntafel-Beispiele: Tonleiter C, G, F, D, B; Tonart 3 ♯, 3 ♭, 7 ♯, 1 ♭, keine; Moll zu Es-, C-, A-, Des-,
  Ces-Dur. Die Tafeln tragen `data-tl-board` statt `data-demo-board`: die Intervall-Tafel sucht das erste
  `[data-demo-board]` im ganzen Lernbereich, und „Tonleitern“ steht davor.
- Vorführung bis 380 px: Knöpfe und Bildzähler in einer Zeile (kleinere Abstände und Schrift, gilt auch für die
  Intervall-Vorführung; nur Darstellung). Bauplan-Leiste bis 380 px mit Kästchen 21 px.
- Offen für Sandra: Die Überschrift der Hilfen heißt fest „Hilfen: Klaviatur und Tabelle“ (`index.html`), auch in
  Stufe 12, die nur die Klaviatur hat. Eine Änderung bräuchte ein neues Feld an der Engine (bewusst nicht gemacht).
  Erledigt in der Prüfung der Umsetzung (siehe unten).

Prüfung im Browser (20.11.2026, Headless Chrome 153 über Playwright im Container, nicht am Mac; `python3 -m
http.server 8080`, Service Worker beim Prüfen gesperrt): 420 und 320 px, hell und dunkel: alle 13 Stufen je eine
Runde (eine Aufgabe absichtlich daneben, in den Stufen 4, 10 und 12 mit danebenliegendem Schritt 1 und „Der Ton
stimmt …“ bzw. „Die Tonart/Molltonart stimmt …“, sonst ganz richtig), Hilfen auf/zu, in den Stufen mit Hilfen
„Vorführen“ bis zum Ergebnis, „Nächste Aufgabe“ bis zur Ergebniskarte; alle Lerntafel-Vorführungen (15 Beispiele)
bis zum letzten Bild, Bildzähler und Knöpfe bei 320 px in einer Zeile; kein waagrechter Überlauf, keine
Konsolenfehler. Alter Spielstand (tonleitern-1 … -6, intervalle-3/-5/-6, ohne Marker) wird zu 1, 2, 4, 5, 7, 9,
11, 13 umgestellt, `current` tonleitern-6 → -9, intervalle-3 entfällt. „Noten lesen“ Stufe 1 und „Intervalle“
Stufe 1 starten und zeigen Zeile und Knöpfe wie bisher. Am iPhone/Mac noch nicht geprüft.

**Prüfung der Umsetzung (Fable, 20.11.2026).** `git diff bd29c40..HEAD` geprüft. Musiktheorie mit einem eigenen
Skript nachgerechnet (eigene Tabellen der 9 Tonleitern und 15 Tonarten, ohne `music.js` und ohne die
vorhandenen Tests): alle 525 Aufgaben der 13 Stufen (Antwort, Knöpfe, Rückmeldungen, Vorzeichen im Bild,
markierte Tasten), die Auswahlsätze der Stufen 4, 10 und 12 für jede Tonart, die Tonleiter-Vorführung für
9 Tonarten × 2 Schlüssel (je 18 Bilder, jede Berichtigung, die 3-Halbton-Fälle in Es- und As-Dur), die
Kurzfassung für alle 42 Notenpaare der Stufen 1 und 2, die Tonart-Vorführung für 15 Tonarten × 2 Schlüssel und
die Moll-Vorführung für 15 Tonarten: rund 990 000 Einzelprüfungen, keine Abweichung (Gegenprobe: fünf absichtlich
eingebaute Abweichungen wurden alle gefunden). Vor der Antwort verrät nichts die Lösung (Hilfen ohne
Hervorhebung, „Vorführen“ gesperrt, Stufe 10 ohne markierte Taste, Stufe 12 nur der Dur-Grundton). Spielstände:
alter Stand ohne Marker, Stand nach Welle 7, frischer Stand, v1 und Stand mit beiden Markern über `load`
nachgestellt: richtig, ein Speichern, beim zweiten Laden keine Änderung. Andere Pakete: Stufen und Lerntafeln
von „Noten lesen“, „Notenwerte“, „Intervalle“ und „Dreiklänge“ sind gegenüber bd29c40 gleich, `keySigSvg` und
`helpsHtml` liefern für sie dasselbe wie vorher; die Änderung an `.demo-controls` bis 380 px betrifft auch die
Intervall-Vorführung (nur Darstellung). Farben nur über Tokens, Wortliste eingehalten, Cache `-11`, keine neuen
Dateien für PRECACHE.
- Geändert: Die Überschrift der Hilfen richtet sich jetzt nach der Stufe (`helpsTitle(level)` in `engine.js`,
  `ui.helpsTitle`, optional `level.helpsTitle`): Stufe 12 zeigt „Hilfen: Klaviatur“, alle anderen Stufen mit
  Hilfen wie bisher „Hilfen: Klaviatur und Tabelle“ (Test in `test/engine.test.js`). Der offene Punkt oben ist
  damit erledigt.
- Im Browser (Headless Chromium über Playwright im Container, 320 px, hell und dunkel): Stufen 4, 10 und 12 je
  eine Aufgabe mit Hilfen und „Vorführen“ bis zum Ergebnis, Lerntafel-Vorführung B-Dur; kein waagrechter
  Überlauf, Knöpfe und Bildzähler in einer Zeile, keine Konsolenfehler. Am iPhone/Mac weiterhin nicht geprüft.
- Nach der Prüfung behoben: Der Text nach Schritt 1 bei einem einzelnen Be nennt „F-Dur“ nicht mehr (sonst stünde
  die Antwort von Schritt 2 schon da). Offen für Sandra: Das Quintenzirkel-Kästchen
  in den Hilfen der Stufe 10 erlaubt, Schritt 2 nachzuschlagen (als Nachschlagehilfe gewollt).

## Welle 9: Notenwerte gehirngerecht (erst mit Hilfen, dann ohne)

Ausgangsstand: `main` 0cbe835 (Tonleitern gehirngerecht, gepusht 20.11.2026, 15:43, Cache `notenheld-v0.2.0-11`),
Branch `notenwerte-neu`. Grundlage: KONZEPT-gehirngerecht (Sandra, 20.11.2026; Cowork-Ordner) und der gemeinsame
Baukasten aus Welle 7/8 (`--step1…`/`--step2…`, `src/demo.js`, `src/grid.js`, `level.helps`, `level.helpTable`,
`level.helpsTitle`, `q.steps`, Warten auf „Nächste Aufgabe“). Musikalischer Inhalt bleibt wie in Paket C: fünf
Notenwerte und Pausen (ganze bis Sechzehntel), Punktierung nur bei halber, Viertel und Achtel (Noten, keine
punktierten Pausen), 4/4-Takt, die 25 festen Takte `BARS`. Alle Noten auf h' im Violinschlüssel. Keine
Jahrgangsstufen an den Stufen.

**Die zwei Denkschritte** (Farbe nach Reihenfolge: Schritt 1 violett, Schritt 2 grün).
- Notenwert: Schritt 1 = **Kopf** (hohl oder schwarz); Schritt 2 = **Hals und Fähnchen** (hohl: ohne Hals → ganze,
  mit Hals → halbe; schwarz: kein Fähnchen → Viertel, eins → Achtel, zwei → Sechzehntel).
- Dauer: Schritt 1 = **Notenwert erkennen** (bei punktierten Noten: der Wert vor dem Punkt); Schritt 2 =
  **Schläge**: aus der Notenwert-Pyramide ablesen, beim Punkt die Hälfte dazu (1 + ½ = 1½).
- Takt füllen: Schritt 1 = **Zählen**: die Werte im Takt der Reihe nach zusammenzählen (die Lücke überspringen),
  dann was bis 4 fehlt; Schritt 2 = **Wert wählen**: welche Note bzw. Pause dauert genau so lang. Hier steht das
  Zählen vorn, weil man vom Takt zur Lücke geht (KONZEPT: „Takt mit mitlaufenden Zählzeiten füllen“).
- Abweichung von der Tabelle im KONZEPT (dort für das ganze Paket: Schritt 1 Notenwert erkennen, Schritt 2 Schläge
  zählen/addieren): Genau so sind die Stufen 4 und 6 gebaut. Stufe 1 kennt noch keine Schläge und teilt deshalb
  das Erkennen in Kopf → Hals/Fähnchen; in Stufe 8 steckt das Erkennen im Zählen. Die Farben folgen wie im
  Baukasten der Reihenfolge.

**Stufen** (H = Hilfen, 2S = Antwort in zwei Schritten):

| Neu | Inhalt | H | 2S | Herkunft |
|---|---|---|---|---|
| 1 | Notenwerte erkennen (5) | ja | ja | alt 1 |
| 2 | Pausen erkennen (5) | ja | – | alt 2 |
| 3 | Noten und Pausen erkennen ohne Hilfen (10) | – | – | neu (alt 1 + 2) |
| 4 | Wie viele Schläge? Noten und Pausen (10) | ja | ja | neu (Inhalt alt 3) |
| 5 | Wie viele Schläge? ohne Hilfen (10) | – | – | alt 3 |
| 6 | Punktierungen (6 Aufgaben: halbe, Viertel, Achtel mit und ohne Punkt; punktierte doppelt im Vorrat, also 9) | ja | ja | neu (Inhalt alt 4) |
| 7 | Punktierungen ohne Hilfen (12: je Note Dauer oder Name gefragt; Vorrat 18) | – | – | alt 4 |
| 8 | Takt füllen (91) | ja | ja | neu (Inhalt alt 5) |
| 9 | Takt füllen ohne Hilfen (91) | – | – | alt 5 |
| 10 | Alles gemischt (Stufen 3, 5, 7, 9; 123 Aufgaben, jede der vier Stufen gleich oft) | – | – | alt 6 |

Nachgerechnet am Code (f5f8795): alt 1–6 haben 5, 5, 10, 12, 91 und 123 Aufgaben; die Zahlen oben stimmen. In
„Alles gemischt“ gab es bisher fünf gleich gewichtete Vorräte (alt 1, 2, 3, 4, 5), jetzt vier: Erkennen kommt
damit in einem Viertel statt in zwei Fünfteln der Aufgaben vor (gewollt, Erkennen ist das Leichteste). Die
Schlüssel der Aufgaben (`key`) bleiben je Inhalt gleich, damit „nie dieselbe Aufgabe zweimal hintereinander“ auch
in Stufe 10 gilt.

**Zweischrittige Antworten (`q.steps`, nur Knöpfe in fester Reihenfolge).** Schritt 1 daneben: richtigen Knopf
zeigen, Schritt 2 trotzdem fragen, Aufgabe zählt als daneben; `q.partial` wenn nur Schritt 1 daneben.
Texte nach Schritt 1 (`ok`/`bad` des Schritts) wie in den anderen Paketen „Richtig: …“ bzw. „Nicht ganz: …“ und
**ohne die Antwort von Schritt 2** (kein Notenwert nach „Kopf hohl“, keine Schläge nach dem Notenwert, kein
Notenwert nach „Es fehlt 1 Schlag“; vgl. 0cbe835). `q.partial` je Stufe: „Der Notenwert stimmt, der Kopf nicht:
…“ (1), „Die Schläge stimmen, der Notenwert nicht: …“ (4, 6), „Der Wert stimmt, die Schläge nicht: …“ (8), jeweils
gefolgt von der Rückmeldung der Stufe.
- Stufe 1: Schritt 1 „Wie sieht der Notenkopf aus?“ hohl | schwarz. Schritt 2 „Welcher Notenwert?“ nur die
  Werte dieser Kopfform: hohl → ganze Note | halbe Note; schwarz → Viertelnote | Achtelnote | Sechzehntelnote
  (nach Schritt 1 ist die Kopfform bekannt, die anderen Werte wären keine echte Wahl). Nach Schritt 1 nur
  „Richtig: Der Kopf ist hohl.“ bzw. „Nicht ganz: Der Kopf ist hohl.“. Rückmeldung am Ende:
  „Kopf hohl · mit Hals → halbe Note (2 Schläge)“, „Kopf hohl · ohne Hals → ganze Note (4 Schläge)“,
  „Kopf schwarz · kein Fähnchen → Viertelnote (1 Schlag)“, „Kopf schwarz · 1 Fähnchen → Achtelnote (½ Schlag)“.
  Wörter wie im bisherigen Hinweis der Stufe („hohler Kopf“, „schwarzer Kopf“, „Hals“, „Fähnchen“).
- Stufe 4: Schritt 1 „Welcher Notenwert?“ bzw. „Welche Pause?“ (die fünf Namen der Sorte). Schritt 2 „Wie viele
  Schläge im 4/4-Takt?“ 4 | 2 | 1 | ½ | ¼. Nach Schritt 1 nur der Name („Richtig: Das ist eine Achtelpause.“).
  Rückmeldung „Achtelpause → ½ Schlag“. Die Namen der Sorte zeigen, ob Note oder Pause gemeint ist; das ist
  hier keine Schwierigkeit und bleibt so.
- Stufe 6: Schritt 1 „Welcher Notenwert ist das ohne den Punkt?“ (bei Noten ohne Punkt: „Welcher Notenwert ist
  das?“; der Punkt steht hinter der Note, „vor dem Punkt“ wäre missverständlich) halbe Note | Viertelnote |
  Achtelnote. Schritt 2 „Wie viele Schläge dauert die Note?“ 3 | 2 | 1½ | 1 | ¾ | ½
  (wie `BEAT_CHOICES_4`). Rückmeldung „Viertelnote = 1 Schlag · Punkt: + ½ → 1½ Schläge“ bzw. ohne Punkt
  „Viertelnote = 1 Schlag · kein Punkt → 1 Schlag“.
- Stufe 8: Schritt 1 „Wie viele Schläge fehlen bis 4?“ ¼ | ½ | 1 | 1½ | 2 | 3 (feste Leiste, **sechs** Knöpfe in
  einer Reihe wie `BEAT_CHOICES_4` in Stufe 6/7). Schritt 2 „Welche Note fehlt?“ bzw. „Welche Pause fehlt?“ mit
  `fillChoices` wie bisher (vier Werte, alle mit verschiedener Dauer, nach Länge sortiert; einmal je Aufgabe in
  `make` gezogen). Nach Schritt 1 nur „Richtig: Im Takt stehen 3 Schläge, es fehlt 1 Schlag.“ bzw. „Nicht ganz:
  …“. Rückmeldung am Ende „Im Takt stehen 3 Schläge, es fehlt 1 Schlag → Viertelnote“ (Summe mit `beatsLabel`,
  auch „3½ Schläge“, „3¾ Schläge“; „fehlt/fehlen“ wie in `revealFill`).
  Nachgerechnet für alle 91 Aufgaben: jeder Takt hat genau 4 Schläge; es fehlen 1 (42-mal), ½ (22), 2 (17),
  ¼ (4), 1½ (4) oder 3 (2) Schläge, **nie 4** (kein Takt besteht aus einer ganzen Note). Der Knopf „4“ wäre nie
  richtig und entfällt deshalb; ohne ihn passen die Knöpfe in eine Reihe. Schritt 2 ist immer eindeutig
  (`fillChoices` gibt genau einen Wert mit der fehlenden Dauer, vier verschiedene Namen). Als Test festhalten:
  jede fehlende Dauer steht in der Leiste, jeder Knopf der Leiste kommt mindestens einmal vor (fällt auf, wenn
  `BARS` sich ändert). „1“ ist in fast der Hälfte der Aufgaben richtig; das liegt an den Takten und bleibt so.
- Stufen ohne Hilfen (3, 5, 7, 9, 10) bleiben einschrittig wie bisher; ihre Auflösung nennt schon beide
  Denkschritte (`revealBeats`: „Richtig wäre: 1½ Schläge, denn das ist eine punktierte Viertelnote.“,
  `revealFill`: „… denn es fehlt noch 1 Schlag.“). Stufe 3 fragt „Welcher Notenwert ist das?“ bzw. „Welche Pause
  ist das?“ mit den fünf Namen der Sorte (wie alt 1 und 2).

**Hilfen (`level.helps = ["tabelle"]`, keine Klaviatur, keine neuen Hilfe-Arten).**
Vor der Antwort wird nichts hervorgehoben; Hervorhebung nur in der Vorführung. Überschrift über
`level.helpsTitle`. Geprüft an `helpsHtml`: nur `"tabelle"` mit `level.helpTable` (beliebiges HTML, auch SVG, fest
je Stufe) ergibt `.help-grid` mit einem Kind, ab 600 px steht es in der breiten Spalte, mittig; `level.helpText`
als Satz darüber; „Vorführen“ nur mit `level.demo` (Stufe 2 hat keine Vorführung und damit keinen Knopf). Wörter
in Kästchen brauchen `cls: "tt-wide"` (sonst feste Kästchenbreite). Alle Stufen mit Hilfen warten auf „Nächste
Aufgabe“ (`waitsForNext`).
Eine kleine Änderung an der Engine ist nötig (Stufe 8): Der Rhythmus aus `q.play` läuft über Zeitgeber; bisher
wartete die Runde sein Ende ab, mit „Nächste Aufgabe“ kann man vorher weitergehen, dann klängen die restlichen
Töne in die nächste Aufgabe. Deshalb die Zeitgeber der Töne merken und in `r.advance` sowie beim Öffnen der
Vorführung löschen (Test in `test/engine.test.js`, soweit rein prüfbar; sonst Browserprüfung). Sonst keine
Änderung an der Engine.
- Stufe 1 „Hilfen: Merkmale“: Kästchentabelle (`tileTable`, `tt-wide`), **eine Spalte je Notenwert** (ganze,
  halbe, Viertel, Achtel, Sechzehntel), Zeilen „Kopf“ (hohl, hohl, schwarz, schwarz, schwarz), „Hals“ (leer, ja,
  ja, ja, ja) und „Fähnchen“ (leer, leer, leer, 1, 2); `family` = die zwei Spalten mit hohlem Kopf (`tileTable`
  hinterlegt nur Spalten, keine Zeilen; `hi` an einer Zeile ist Violett und der Vorführung vorbehalten). Keine
  Notenbilder in der Tabelle, sonst wäre die Aufgabe nur Bildvergleich. Passt „Sechzehntel“ bei 320 px nicht in
  den Spaltenkopf, Tabelle drehen (eine Zeile je Wert, ohne Hinterlegung). Satz: „Erst den Kopf ansehen, dann
  Hals und Fähnchen.“
- Stufe 2 „Hilfen: Pausen“: kleine Tabelle Name | woran du sie erkennst (ganze Pause: Balken, hängt an der vierten
  Linie von unten; halbe Pause: Balken, sitzt auf der Mittellinie; Viertelpause: Zickzack; Achtelpause: ein Haken;
  Sechzehntelpause: zwei Haken) – Wortlaut aus dem bisherigen Hinweis der Stufe 2. **Ohne Spalte mit dem
  Zeichen**: Zeichen neben Name wäre die fertige Antwort zum Ablesen; die Zeichen stehen in der Lerntafel.
  Geprüft: „hängt an der vierten Linie von unten, sitzt auf der Mittellinie“ stimmt mit der üblichen Notation
  und mit `restSvg` überein (ganze Pause: Balken von der zweiten Linie von oben nach unten; halbe Pause: Balken
  auf der Mittellinie nach oben). Keine Vorführung, ein Schritt.
- Stufen 4 und 6 „Hilfen: Notenwert-Pyramide“: SVG im Paket, fünf Zeilen (1 ganze, 2 halbe, 4 Viertel,
  8 Achtel, 16 Sechzehntel, jede Zeile gleich breit, Kästchen mit kleinem Zeichen), rechts „4 · 2 · 1 · ½ · ¼
  Schläge“. Stufe 6 zusätzlich die Zeile „Punkt: + die Hälfte“. Bei 320 px lesbar prüfen (Sechzehntel-Zeile
  darf ohne Zeichen nur Kästchen zeigen). Die Pyramide zeigt Noten ohne Namen (der Name ist Schritt 1) und keine
  Pausen; `helpText` der Stufe 4: „Eine Pause dauert so lang wie die Note mit demselben Wert.“ (Satz aus dem
  bisherigen Hinweis). Die Pyramide ist eine reine Funktion im Paket (auch für die Lerntafel und Vorführung 2).
- Stufe 8 „Hilfen: Zählleiste und Pyramide“: Zählleiste als Kästchentabelle mit acht Achtel-Feldern
  „1 + 2 + 3 + 4 +“ (gesprochen „eins und zwei und …“), die Schlag-Felder grau hinterlegt (`family` = Spalten
  0, 2, 4, 6); darunter die Pyramide klein. Leer und für jede Aufgabe gleich, verrät also nichts.

**Vorführungen (`src/demo.js`, Bilder rein im Paket, testbar).**
1. **„So erkennst du einen Notenwert“** (Lerntafel mit allen fünf Werten; Hilfen Stufe 1): Frage (Note allein)
   → Schritt 1 violett „1 · Kopf“: Kopf violett umrandet, „Kopf hohl“ bzw. „Kopf schwarz“ → Schritt 2 grün
   „2 · Hals und Fähnchen“: Hals bzw. Fähnchen grün markiert („mit Hals → halbe Note“, „2 Fähnchen →
   Sechzehntelnote“) → Ergebnis „Achtelnote · ½ Schlag“ mit Marken „Kopf schwarz“ / „1 Fähnchen“. Markierung
   als Rahmen über der Note, die Note selbst bleibt unverändert. 4 Bilder. Ton: das h' im letzten Bild.
2. **„So bestimmst du die Dauer“** (Lerntafel: Viertel, Achtelpause, punktierte halbe, punktierte Viertel,
   punktierte Achtel; Hilfen Stufen 4 und 6): Frage → Schritt 1 „1 · Notenwert“ (Name violett, bei Punkt
   „vor dem Punkt: Viertelnote“) → Schritt 2 „2 · Schläge“: Pyramiden-Zeile grün „Viertelnote = 1 Schlag“;
   mit Punkt ein weiteres Bild „Punkt: die Hälfte dazu → 1 + ½“ → Ergebnis „punktierte Viertelnote = 1½ Schläge“.
   3 bzw. 4 Bilder (+ Frage, Ergebnis).
3. **„So zählst du einen Takt“** (Lerntafel mit drei Takten aus `BARS`, darunter einer mit Pause und einer mit
   Punkt; Hilfen Stufe 8): Frage (Takt mit Lücke) → Schritt 1 violett „1 · Zählen“: je Bild ein Wert von links,
   der Wert violett, in der **Summenleiste** unter dem Takt (acht Achtel-Felder, in Schritt 1 **ohne**
   Zählzeiten beschriftet) füllen sich von links so viele Felder violett, wie der Wert dauert, Satz mit laufender
   Summe („Achtelnote: ½ Schlag · bisher 2 Schläge“); bei der Lücke „Lücke: überspringen“ (kein Feld); danach
   ein Bild „Im Takt stehen 3 Schläge · bis 4 fehlt 1 Schlag“ (die leeren Felder am Ende violett umrandet)
   → Schritt 2 grün „2 · Wert wählen“: leere Felder grün, die Lücke grün mit dem richtigen Wert gefüllt
   („1 Schlag → Viertelnote“) → Ergebnis: ganzer Takt, darunter die Zählleiste „1 + 2 + 3 + 4 +“ in der echten
   Reihenfolge (die Felder des eingesetzten Werts grün), Marken „3 Schläge da · 1 fehlt“ / „Viertelnote“.
   Warum Summe statt Zählzeiten in Schritt 1: Steht die Lücke nicht am Ende, weiß man beim Zählen noch nicht,
   auf welcher Zählzeit die Werte hinter der Lücke stehen; echte Zählzeiten unter dem Takt gibt es deshalb erst
   im Ergebnis. Sechzehntel füllen ein halbes Feld. Pausen füllen ihre Felder wie Noten (sie dauern ja auch);
   im Ergebnis stehen ihre Zählzeiten in Klammern ([OFFEN Sandra], siehe unten; als eine Konstante bauen).
   Bilderzahl bei n Zeichen im Takt (Lücke mitgezählt): 1 + n + 1 + 1 + 1 = n + 4, höchstens 9.
   Ton: je Bild in Schritt 1 ein Klick bei Noten (h'), keiner bei Pausen und bei der Lücke; den Rhythmus spielt
   wie bisher die Aufgabe nach der Antwort (er verstummt, wenn die Vorführung aufgeht, siehe Hilfen).

**Lerntafeln (Reihenfolge).** So erkennst du einen Notenwert (Vorführung) · Notenwerte und Pausen (Tabelle wie
bisher, darunter die Notenwert-Pyramide) · So bestimmst du die Dauer (Vorführung) · So zählst du einen Takt
(Vorführung). Tafeln mit eigenem Attribut (`data-nw-board`), siehe Welle 8 (`data-tl-board`).

**Spielstände.** Einmalige Umstellung `migrateNotenwerte` in `src/store.js` (Marker `"notenwerte-neu"`, frischer
Stand trägt alle drei Marker), aufgerufen in `migrateAll` nach den beiden anderen: `notenwerte-1→1, 2→2, 3→5,
4→7, 5→9, 6→10`, in einem Durchgang in ein neues Objekt (sonst verkettet 3→5 mit 5→9); `current` entsprechend.
Keine statKeys im Paket. Die Abbildung ist geprüft: jede alte Stufe landet auf der neuen Stufe gleichen Inhalts.
Die alten Stufen 3–6 landen auf den Stufen ohne Hilfen (5, 7, 9, 10). Die alten Stufen 1 und 2 bleiben auf 1 und 2,
also auf Stufen mit Hilfen (1 jetzt in zwei Schritten): Eine Stufe ohne Hilfen nur mit Notenwerten bzw. nur mit
Pausen gibt es nicht mehr, die neue Stufe 3 mischt beide und ist darum kein gleicher Inhalt. Die Reihenfolge ist hier unkritisch (die beiden anderen Umstellungen fassen `notenwerte-*` nicht
an); „als dritte“ nur der Ordnung halber. In `migrateAll` alle drei aufrufen und `a || b || c` zurückgeben
(nicht die Aufrufe mit `||` verketten). `load` braucht keine Änderung.
Freischaltung unverändert (`isUnlocked`: gespielt bleibt offen; 3, 4, 6, 8 öffnen sich über die Stufe davor).
Folgen für einen alten Stand, der alles geschafft hatte: 1, 2, 5, 7, 9, 10 bleiben offen (gespielt); 3 ist offen
(2 geschafft), 6 und 8 auch (5 bzw. 7 geschafft); **4 bleibt zu, bis 3 geschafft ist**, obwohl 5 offen ist. Wie
in Welle 8 bewusst hingenommen und als Test festgehalten.
Anzupassen: `test/store.test.js` (alle Stellen mit `[MIGRATION_INTERVALLE, MIGRATION_TONLEITERN]`, `fresh()`,
`migrateAll`), `test/packs/notenwerte.test.js`, der Satz zu `notenwerte-1`/`-2` in ARCHITEKTUR (fünf Aufgaben).
`test/views/stats.test.js` und `docs/screens/screenshots.mjs` nennen nur `notenwerte-1`/`-2` und bleiben gültig.

**Schritte (je eigener Opus-Agent, danach Prüfung Fable).**
0. Stufen umbauen, `q.steps` 1/4/6/8, Spielstand-Umstellung, Rhythmus-Zeitgeber in der Engine, Tests (Anzahl
   je Stufe, Eindeutigkeit aller Zwei-Schritt-Antworten, kein Text nach Schritt 1 enthält die Antwort von
   Schritt 2, Takt-Summen = 4 für alle 91 Aufgaben, Leiste der Stufe 8 deckt alle fehlenden Dauern, Umstellung
   alt → neu auch nach den beiden anderen Umstellungen).
1. Hilfen (Merkmale, Pausen, Pyramide, Zählleiste) und `helpsTitle`.
2. Vorführungen 1–3 und Lerntafeln; Tests der Bilderfolgen (Anzahl, Summen der Zählleiste, jede Lücke).
3. Doku: ARCHITEKTUR, PLAN „Umgesetzt“, README, CLAUDE.md (Stand), Cache `notenheld-v0.2.0-12`.

**Akzeptanz.** `npm test` grün (am Mac „ℹ pass …“); Browser 420 und 320 px, hell und dunkel: jede Stufe eine
Runde, Hilfen auf/zu, in 1/4/6/8 je eine Aufgabe ganz richtig und eine mit danebenliegendem Schritt 1, alle
Vorführungen bis zum Ergebnis, Knöpfe in einer Zeile (6 Knöpfe in Stufe 6 und 8), in Stufe 8 sofort
„Nächste Aufgabe“ tippen: der Rhythmus verstummt, kein
waagrechter Überlauf, keine Konsolenfehler; alter Spielstand richtig umgestellt; andere Pakete unverändert;
Wortliste (`test/texte.test.js`).

**Entscheidungen (ohne Rückfrage, Auftrag Sandra 20.11.2026).**
- 10 Stufen; Stufe 3 neu als Festigung von 1 und 2 zusammen.
- Hilfen nur als Tabelle/SVG, keine Klaviatur (Tonhöhe spielt hier keine Rolle).
- Takt füllen: Zählen vor Wert wählen (Reihenfolge der Denkschritte, Farben nach Reihenfolge).
- Zählleiste in Achteln „1 + 2 + 3 + 4 +“ („+“ = „und“). Das ist eine verbreitete Schreibweise im deutschen
  Musikunterricht, aber nicht die einzige („1 u 2 u“, „1 und 2 und“). [OFFEN Sandra] nur, falls sie an ihrer
  Schule anders schreibt; gebaut wird mit „+“, als eine Konstante.
- [OFFEN Sandra] Zählzeiten von Pausen in Klammern („(1) 2 + (3) 4“): in Arbeitsblättern üblich, aber keine feste
  Regel und hier nicht belegt. Gebaut wird es so, nur im Ergebnisbild der Vorführung 3 und abschaltbar über
  eine Konstante; in der Aufgabe, in den Hilfen und in Texten kommt es nicht vor.
- [OFFEN Sandra] Silben für Sechzehntel (verbreitet „1 e + e“, daneben andere Zählweisen) – zunächst keine
  Silben, die Sechzehntel füllt ein halbes Feld ohne eigene Zählzeit.
- [OFFEN Sandra] Reihenfolge der Schritte in Stufe 8 (Zählen → Wert wählen) und geteiltes Erkennen in Stufe 1
  (Kopf → Hals/Fähnchen) weichen von der einen Zeile im KONZEPT ab (siehe „Die zwei Denkschritte“); gebaut wird
  wie hier beschrieben.

**Prüfung (Fable, 20.11.2026).** Aufgabenzahlen, alle 91 Takt-Aufgaben, Auswahlsätze, Engine (`helpsHtml`,
`helpsTitle`, `waitsForNext`, `q.steps`), Spielstände und Wortlaut gegen den Code (f5f8795) nachgerechnet bzw.
gelesen. Geändert: (1) Stufe 8 Schritt 1 mit sechs statt sieben Knöpfen – „4 Schläge fehlen“ kommt in keinem
der 91 Takte vor, der Knopf wäre nie richtig; Verteilung der fehlenden Dauern und Test dazu ergänzt; (2) Texte
nach Schritt 1 dürfen Schritt 2 nicht nennen, Wortlaut „Richtig: …“/„Nicht ganz: …“ und `q.partial` je Stufe
festgelegt; (3) Stufe 6: „ohne den Punkt“ statt „vor dem Punkt“; (4) Hilfen Stufe 1: Tabelle mit einer Spalte je
Notenwert (`tileTable` hinterlegt nur Spalten), `tt-wide`, keine Notenbilder; Stufe 2: ohne Zeichen-Spalte
(Zeichen neben Name wäre die Antwort), Angabe zu ganzer und halber Pause an `restSvg` bestätigt; Pyramide ohne
Namen, Satz zu den Pausen als `helpText`; (5) „keine Änderung an der Engine“ berichtigt: Töne des Rhythmus
müssen beim Weitergehen und beim Öffnen der Vorführung verstummen; (6) Vorführung 3: in Schritt 1 Summenleiste
statt Zählzeiten (die Zählzeit hinter einer Lücke ist beim Zählen noch nicht bekannt), echte Zählleiste erst im
Ergebnis, Bilderzahl n + 4; (7) Spielstände: Verkettung, `migrateAll`, Folgen der Freischaltung (4 zu, 5 offen)
und anzupassende Tests benannt; (8) Stufe 10: 123 Aufgaben, vier statt fünf gleich gewichtete Vorräte;
(9) Abweichung von der KONZEPT-Zeile zu den Denkschritten offen benannt; Klammern bei Pausen und
Sechzehntel-Silben als [OFFEN Sandra], weil nicht belegt. Wortliste: keine verbotenen Wörter in den geplanten
Texten („Nicht ganz“, „Richtig wäre“), Anrede „du“.

**Umgesetzt (Branch `notenwerte-neu`).** Aufgaben je Stufe: 1: 5, 2: 5, 3: 10, 4: 10, 5: 10, 6: 6 (Vorrat 9),
7: 12 (Vorrat 18), 8: 91, 9: 91, 10: 123. Zwei Schritte in 1, 4, 6, 8; Hilfen in 1, 2, 4, 6, 8 (warten auf
„Nächste Aufgabe“, „Vorführen“ in 1, 4, 6, 8 erst nach der Antwort). Fehlende Dauern in Stufe 8 nachgerechnet:
1 (42), ½ (22), 2 (17), ¼ (4), 1½ (4), 3 (2). Engine: nur `r.tones`/`silenceTones` (Rhythmus verstummt beim
Weitergehen und beim Öffnen der Vorführung). `store.js`: `migrateNotenwerte`, `migrateAll` mit drei Aufrufen.
Cache `notenheld-v0.2.0-12`.

Entscheidungen bei der Umsetzung (ohne Rückfrage):
- Hilfen Stufe 1 gedreht (eine Zeile je Notenwert, Spalten Kopf | Hals | Fähnchen), ohne Hinterlegung: Mit einer
  Spalte je Notenwert wäre die Tabelle bei 320 px etwa 370 px breit (der Plan sieht das Drehen als Ausweg vor).
- Satz der Hilfen Stufe 2 (im Plan nicht festgelegt): „Achte auf die Form und bei den Balken auf die Lage.“;
  Stufe 6: „Der Punkt verlängert eine Note um die Hälfte ihres Wertes.“ (bisheriger Hinweis); Stufe 8: „Zähle die
  Werte im Takt zusammen und überspringe die Lücke. Was fehlt bis 4?“; unter der Zählleiste „+ heißt „und“: eins
  und zwei und drei und vier und“.
- Einheitliche Rückmeldung der zweischrittigen Stufen: `reveal` = „Richtig wäre: <beide Schritte>.“ (z. B.
  „Richtig wäre: Viertelnote = 1 Schlag · Punkt: + ½ → 1½ Schläge.“), `display` dieselben Schritte groß
  geschrieben. Bei 3 fehlenden Schlägen „Im Takt steht 1 Schlag, es fehlen 3 Schläge“ (Einzahl).
- Pyramide: Zeichen auf g' (Hals nach oben, passt ins Kästchen), Sechzehntel-Zeile nur Kästchen; in der
  Lerntafel „Notenwerte und Pausen“ unter den Tabellen mit dem Satz „Jede Zeile dauert gleich lang, zusammen ein
  4/4-Takt: 1 ganze = 2 halbe = 4 Viertel = 8 Achtel = 16 Sechzehntel.“
- Vorführung 2: Frage, Notenwert, Schläge, (Punkt), Ergebnis = 4 bzw. 5 Bilder; bei Pausen „Achtelpause = ½
  Schlag, so lang wie die Achtelnote“. Ton h' im Ergebnis nur bei Noten.
- Vorführung 3: Lerntafel mit „vier Viertel“ (4 4 4 4, Lücke am Ende), „mit Pause“ (4 r4 2, Lücke 2) und „mit
  Punkt“ (4. 8 4 4, Lücke in der Mitte); Ergebnis-Titel „Viertelnote (1 Schlag)“, Marken „3 Schläge da · 1 fehlt“
  / „Viertelnote“. Klammern: ein Feld, an dessen Anfang eine Pause klingt, steht in Klammern („(+)“).
- Vorführung 1: Rahmen um Hals und Fähnchen auch bei der Viertelnote („kein Fähnchen“), bei der ganzen Note
  gestrichelt an der Stelle, wo der Hals stünde.
- Spielstände: `notenwerte-1` und `-2` bleiben auf 1 und 2 (gleicher Inhalt, jetzt mit Hilfen bzw. in zwei
  Schritten); nur 3–6 landen auf Stufen ohne Hilfen (Abschnitt „Spielstände“ entsprechend berichtigt).

Browserprüfung (Headless Chrome im Container, Service Worker gesperrt, 420 und 320 px, hell und dunkel): jede
Stufe eine Runde, Hilfen auf/zu, in 1/4/6/8 je eine Aufgabe ganz richtig und eine mit danebenliegendem Schritt 1
(Text nach Schritt 1 ohne Antwort von Schritt 2, danach `q.partial`), „Vorführen“ bis zum Ergebnis, alle
Lerntafel-Vorführungen bis zum letzten Bild, Knöpfe und Bildzähler bei 320 px in einer Zeile, sechs Knöpfe der
Stufe 8 in einer Reihe, kein waagrechter Überlauf, keine Konsolenfehler; alter Spielstand umgestellt; „Noten
lesen“, „Intervalle“ und „Tonleitern“ Stufe 1 unverändert.

**Prüfung der Umsetzung (Opus, 20.11.2026).** Fable war im Nutzungslimit, deshalb hat Opus geprüft (eigener
Agent, unabhängig von der Umsetzung). Nachgerechnet mit eigenen Skripten und eigener Tabelle der Notenwerte (nicht
`music.js`): alle Aufgaben der 10 Stufen (Antworten, Knopfsätze, Texte nach Schritt 1, `partial`, `reveal`,
`display`), die 25 Takte (Summe 4) und alle 91 Takt-Aufgaben je 20-mal gezogen (fehlende Dauer in der Leiste,
Schritt 2 eindeutig, vier Werte derselben Sorte, nach Länge sortiert, Rhythmus = Takt); fehlend 1 (42), ½ (22),
2 (17), ¼ (4), 1½ (4), 3 (2) bestätigt. Alle 91 Bilderfolgen der Vorführung 3 (n + 4 Bilder, laufende Summen,
Felder der Summenleiste lückenlos, Lücke ohne Feld und ohne Ton, Umrandung bis 4, Zählleiste im Ergebnis mit
Klammern bei Pausen), Vorführung 1 für alle 5 Notenwerte, Vorführung 2 für alle Noten, Pausen und punktierten
Noten, Pyramide (1/2/4/8/16 gleich breite Kästchen, 4 · 2 · 1 · ½ · ¼), Lerntafeln. Zusammen 112 687 Einzelprüfungen;
einzige Auffälligkeit eine zu strenge eigene Regel (punktierte halbe auf Schlag 1 über die Taktmitte ist korrekt,
`BARS` unverändert seit Paket C). Nichts verrät die Antwort vorher: Texte nach Schritt 1 und Fragen ohne Antwort
von Schritt 2, Hilfen ohne Hervorhebung, keine Antwort in Attributen der Notenzeile, „Vorführen“ vor der Antwort
gesperrt. Stufe 10 aus 20 000 Ziehungen gleich verteilt auf 3/5/7/9, nie dieselbe Aufgabe zweimal hintereinander
(alle Stufen). Spielstände (39 Prüfungen): alter Stand ohne Marker, nach Welle 7, nach Welle 8, frisch, v1, zweites
Laden ändert nichts und speichert nicht; Freischaltung nach Umstellung wie geplant (4 zu, sonst offen). Andere
Pakete: `question()` (300 je Stufe mit festem Zufall), Hilfen, Vorführungen und Lerntafeln von „Noten lesen“,
„Intervalle“, „Tonleitern“ und „Akkorde“ byte-gleich mit 0cbe835; deren Quelltext ist unverändert. Die
Engine-Änderung (`r.tones`/`silenceTones`) wirkt auf alle Pakete gleich: Auch in „Intervalle“ und „Tonleitern“
verstummt eine laufende Tonfolge jetzt bei „Nächste Aufgabe“ und beim Öffnen der Vorführung (gewollt, vorher klang
sie in die nächste Aufgabe). Tokens: keine festen Farben, alle benutzten Tokens hell und dunkel definiert;
Wortliste grün; Cache `notenheld-v0.2.0-12`, PRECACHE vollständig (keine neuen Dateien). Browser (Headless Chrome,
Service Worker gesperrt, Port 8082, 320 px hell und dunkel): Stufen 1, 6, 8 mit Hilfen, Schritt 1 daneben (Text
ohne Antwort von Schritt 2, danach `partial`), „Vorführen“ bis zum Ergebnis, sechs Knöpfe in einer Reihe (6 und 8),
Lerntafel „So zählst du einen Takt“ mit allen drei Beispielen bis zum letzten Bild, kein waagrechter Überlauf,
keine Konsolenfehler (nur die bekannte Warnung, weil der Service Worker im Test gesperrt ist). Rhythmus mit Ton
gemessen: nach „Nächste Aufgabe“ und nach „Vorführen“ kein weiterer Ton, ohne Weitergehen spielt der Takt zu Ende.
Geändert: nur der Widerspruch im Abschnitt „Spielstände“ (alte Stufen 1 und 2 landen auf Stufen mit Hilfen) und
der gleichlautende Kommentar in `store.js`; die Abbildung bleibt. Keine Fehler im Code gefunden. Mitgeprüft: der
während der Prüfung hinzugekommene Commit 48b68ef (Punkt in Vorführung 2 in Schritt 1 schwarz, im Bild „die Hälfte
dazu“ grün; im Browser hell und dunkel gemessen, nur Tokens `--ink`/`--step2`).

## Welle 10: Korrekturen aus der Prüfung (drei Perspektiven)

Ausgangsstand: Branch `korrekturen-10` (von `notenwerte-neu` 7dcab7c, Cache `notenheld-v0.2.0-12`). Grundlage: die
Mängelliste der ganzen App (20.11.2026, Stand `main` 0cbe835; A = falsch oder lernhinderlich, B = deutlich
verbessern), die drei Einzelberichte (Lehrkraft, Jugendliche, Wissenschaft), die Prüfung des Pakets „Notenwerte
und Pausen“ aus drei Blickwinkeln (Stand 0da11d3, dort „Top 1–10“) und Sandras Entscheidungen vom 24.11.2026.
Diese Welle behebt alle A-Befunde außer A5 und die B-Befunde, die klein und örtlich begrenzt sind, dazu die
Befunde zu den Notenwerten und die wählbaren Merksprüche. Größere Umbauten stehen am Ende unter „Nicht in dieser
Welle“. Stufen, Stufen-IDs, Aufgabenvorräte und `statKey`s bleiben unverändert, soweit unten nichts anderes steht.

**Entscheidungen Sandra (24.11.2026, verbindlich).**
- Bauplan-Schritte als **„1 1 ½ 1 1 1 ½“**, in Sätzen ausgeschrieben „Ganz – Ganz – Halb – Ganz – Ganz – Ganz –
  Halb“ (A6).
- **„Grob- und Feinbestimmung“** ersetzt „Rahmenintervall“ überall (B5).
- **Merksprüche wählbar**: Vorschläge und eigener Spruch, Anfangsbuchstaben geprüft, im Spielstand gespeichert,
  sichtbar in Hinweisen und Lerntafeln; Vorschläge laut KONZEPT-gehirngerecht. Bassschlüssel: Linien „Gute Hunde
  Dürfen Fast Alles“, Zwischenräume „Alle Clowns Essen Gern“ (A2). ♭-Tonarten „Frische Brezen Essen Asse Des
  Gesangs“, ohne das erste Wort die Reihenfolge der Be.
- Jahrgang als Einstellung der Lehrkraft und „Wiederholen ist der Kern“: Welle 11.

**Übersicht: Befund → Schritt.**

| Befund | Kurz | Schritt |
|---|---|---|
| A1 (Notenwerte Top 8) | nach „daneben“ auf „Nächste Aufgabe“ warten | 0 |
| B10 | Teilerfolg nicht rot; Schritt mit nur einem Knopf entfällt | 0 |
| B11 (Notenwerte Top 9) | „Vorführen“ sagt sichtbar „nach deiner Antwort“ | 0 |
| A3 | Auflösungszeichen bei der übermäßigen Prime vom ♭-Ton | 1 |
| A4 | „Stellung“ statt „Lage“, Knöpfe mit „(1. Umkehrung)“ | 1 |
| B1 | Quintenzirkel-Frage ohne irreführenden Dreiklang | 1 |
| A2 (Zeile) | Bass-Lerntafel: unterste Linie G, darunter F | 1 |
| A6 | Bauplan 1 / ½ | 2 |
| B5 | Grob-/Feinbestimmung, Fachwörter beim ersten Auftreten erklärt | 2 |
| B6 | Satz „Stufen zählen / Halbtöne zählen“, Starttaste „Start“ | 2 |
| B15 | Wortlaut (Bassschlüssel-Satz, „Notenstufen“, Intervalltafel-Paare, Kleinigkeiten) | 2 |
| A7 | Freischalt-Regel sichtbar | 3 |
| Merksprüche, A2 (Sprüche), B3 | wählbare Merksprüche; Noten lesen mit Frage und Rückmeldung mit Lage und Spruch | 4 |
| Notenwerte Top 1 | Balken je Schlag | 5 |
| Notenwerte Top 2, 3, 4, 5, 6, 7, 10 | Zählzeiten unter den Noten, „+“, Frage Stufe 6, Wort für die Pausenform, Vorführung 3 und 2, Pyramide | 6 |
| B13, B14 | Lesbarkeit bei 320 px, Fokus, Kontrast, Zeichen ✓/✗ | 7 |
| – | Doku, Cache -13, Bildschirmfotos | 8 |

### Schritt 0 – Engine: Lesezeit, Teilerfolg, „Vorführen“ (A1, B10, B11)

**A1 – Warten nach „daneben“.** Wo: `src/engine.js` (`waitsForNext`, `finishQuestion`, `answerStep`,
`DELAY_BAD`, `DELAY_STEP_BAD`), `index.html` (`#pNext`), `src/views/practice.js`.
- Neu: `waitsAfter(level, ok, text)` (rein, getestet) entscheidet nach jeder Aufgabe: Stufe mit Hilfen → warten
  (wie bisher); Antwort daneben → **immer warten**; richtig in einer Stufe ohne Hilfen → von selbst weiter nur,
  wenn der Rückmeldetext kurz ist (`AUTO_OK_MAX`, Startwert 45 Zeichen, als Konstante mit Kommentar
  „Startwert“), sonst warten. `waitsForNext(level)` bleibt als Sonderfall erhalten (Tests).
- Zwischen Schritt 1 und Schritt 2 (`q.steps`): Schritt 1 richtig → wie bisher nach `DELAY_STEP_OK`; Schritt 1
  daneben → kein Zeitgeber, der Knopf `#pNext` erscheint mit der Aufschrift „Weiter zu Schritt 2“ (Enter und
  Leertaste wie bei „Nächste Aufgabe“). `DELAY_BAD` und `DELAY_STEP_BAD` entfallen. Blitz hat eigene Zeiten
  (`src/views/blitz.js`) und bleibt unverändert schnell.
- Rhythmus (`q.play` mit Dauern): `silenceTones` beim Weitergehen gilt weiter; `answerDelay` wird nur noch für
  richtige Antworten gebraucht.
- Akzeptanz: In jeder Stufe ohne Hilfen bleibt nach einer danebenliegenden Antwort die Auflösung stehen, bis
  man tippt; nach einer richtigen Antwort mit langem Text ebenso; kurze richtige Antworten (z. B. Noten lesen)
  laufen wie bisher weiter. Eine Runde „Noten lesen 1“ ohne Fehler dauert nicht länger als vorher.
- Tests (`test/engine.test.js`): `waitsAfter` für alle vier Fälle und die Grenze `AUTO_OK_MAX`; Runde mit
  falscher Antwort in einer Stufe ohne Hilfen wartet (kein Zeitgeber, `ui.next` sichtbar); Schritt 1 daneben →
  „Weiter zu Schritt 2“; Rhythmus verstummt beim Weitergehen (vorhandener Test bleibt grün).

**B10 – Teilerfolg und Ein-Knopf-Schritt.** Wo: `src/engine.js` (`stepsFeedback`, `finishQuestion`,
`svgResultClass`), `css/style.css` (neue Tokens), `src/packs/intervalle.js` (`twoStepQuestion`, `finePrompt`).
- Teilerfolg (nur Schritt 1 daneben, letzter Schritt richtig, `q.partial` gesetzt): Rückmeldung mit der Klasse
  `part` statt `bad`, Notenzeile nicht rot (`svgResultClass` → `""`), Fortschrittspunkt eigene Klasse. Neue
  Tokens `--part`, `--part-soft`, `--part-ink` auf `:root` (hell und dunkel, an allen drei Stellen), Farbton
  aus dem vorhandenen Gold abgeleitet; Schrift auf `--part-soft` mindestens 4,5 : 1 (im CSS-Test nachrechnen).
  Die Aufgabe **zählt weiter als daneben** (Sterne, Statistik, Freischaltung unverändert); das sagt die
  Startkarte der zweischrittigen Stufen in einem Halbsatz: „Beide Schritte müssen stimmen.“
- Schritt mit nur einem Knopf (Intervalle 3–7 bei Prime, Quarte, Quinte, Oktave): Der zweite Schritt entfällt,
  die Aufgabe endet nach Schritt 1; die Rückmeldung nennt das Ergebnis mit der Halbtonzahl („4 Stufen → Quarte ·
  hier rein: 5 Halbtöne“). Umsetzung im Paket: `steps` hat dann nur einen Eintrag; `engine.js` muss das schon
  können (prüfen: `answerStep` mit `steps.length === 1`), sonst dort ergänzen. Damit ändert Welle 7 („bleibt als
  Bestätigung“) ihr Verhalten bewusst (Befund J, L, W).
- Akzeptanz: Teilerfolg ist auf den ersten Blick von „daneben“ zu unterscheiden, auch ohne Farbe (Wortlaut
  „Der Ton stimmt, der Schritt nicht“ bleibt vorn). Keine Aufgabe zeigt einen Antwortsatz mit nur einem Knopf.
- Tests: `stepsFeedback`/Klasse je Fall; für alle Aufgaben der Intervall-Stufen 3–7: jeder gezeigte Schritt
  hat mindestens zwei Knöpfe; Rückmeldung der Ein-Schritt-Aufgaben enthält Zahl und Halbtöne.

**B11 – „Vorführen“.** Wo: `src/engine.js` (`helpsHtml`, `DEMO_WAIT`, `demoReady`), `css/style.css`.
- Vor der Antwort steht neben dem gesperrten Knopf sichtbar (nicht nur im `title`) „nach deiner Antwort“;
  nach der Antwort verschwindet der Zusatz. Kürzen der langen Vorführungen (18–20 Bilder) ist **nicht** Teil
  dieser Welle (siehe „Nicht in dieser Welle“).
- Tests: `helpsHtml` enthält den Zusatz nur bei `level.demo`; nach `demoReady` ist er weg.

### Schritt 1 – Fachliche Korrekturen (A3, A4, B1, A2-Zeile)

**A3 – Auflösungszeichen.** Wo: `src/staff.js` (`noteSvg`), `src/packs/intervalle.js` (`intervalSvg`,
`pairSvg`, Vorführung `intervalDemo`, Hinweis Stufe 5/6), `css/style.css` (`.acc`).
- Regel (Notation, nicht regional): Ein Vorzeichen vor einer Note gilt für alle folgenden Noten auf derselben
  Linie bzw. im selben Zwischenraum bis zum Taktstrich. Steht nach des' ein d' auf derselben Linie, braucht es
  ein Auflösungszeichen ♮. Betroffen sind nur die übermäßigen Primen vom ♭-Ton zum Stammton: in Stufe 5 neun von
  19 Primen, in Stufe 6 achtzehn von 37 (Zahlen aus der Prüfung; im Test nachzählen).
- `noteSvg(…, { natural: true })` zeichnet ♮ (U+266E, liegt im Bereich `U+2669-266F` der eingebundenen Noto
  Music; **im Browser prüfen**, dass das Zeichen wirklich aus der Musikschrift kommt) an der Stelle der
  Vorzeichen. Lage und Größe wie bei ♯ und ♭ ausmessen (ARCHITEKTUR, „Notenzeile“), nicht schätzen.
- `intervalle.js`: eine reine Funktion `needsNatural(first, second)` (gleiche Notenstufe, erste Note mit
  Vorzeichen, zweite ohne) steuert das Zeichen in Aufgabe, Auflösung und Vorführung.
- Da das Auflösungszeichen in der App noch nicht eingeführt ist: ein Satz im Hinweis der Stufe 5 und in der
  Rückmeldung dieser Aufgaben („Das ♮ hebt das ♭ auf: d'.“). Eine eigene Stufe „Auflösungszeichen“ kommt mit
  „Noten lesen gehirngerecht“.
- Nebenbefund, bleibt: Die reine Prime des'–des' zeigt das ♭ an beiden Noten. Das ist eindeutig, im strengen
  Notensatz stünde das zweite ♭ im selben Takt nicht noch einmal. [OFFEN Sandra] nur, falls sie es anders will.
- Akzeptanz: Keine Aufgabe in den Stufen 5 und 6 ist ohne ♮ mehrdeutig; ♮ in hell und dunkel, bei „ok“/„bad“
  mitgefärbt; kein Zusammenstoß mit dem ersten Notenkopf.
- Tests: `needsNatural` (des'–d' ja, c'–cis' nein, des'–des' nein, d'–d'' nein); Anzahl der Aufgaben mit ♮ in
  `POOL_5` und `POOL_6` (9 und 18 erwartet, Abweichung im Commit vermerken); `noteSvg` mit `natural`.

**A4 – „Stellung“ statt „Lage“.** Wo: `src/packs/akkorde.js` (`inversionLevel`), Hinweis der Stufe.
- Frage „Welche Stellung?“; Knöpfe „Grundstellung“, „Sextakkord (1. Umkehrung)“, „Quartsextakkord
  (2. Umkehrung)“. `INVERSIONS` in `music.js` bleibt (Rückmeldungen nutzen die kurzen Namen); die langen
  Aufschriften stehen im Paket. „Lage“ bleibt im Paket Notenwerte („Lage der Pause“) und in „alle Lagen“ bei den
  Noten: dort ist es Alltagssprache, kein Akkordbegriff.
- Akzeptanz: Drei Knöpfe passen bei 320 px (notfalls untereinander). Kein „Lage“ mehr in `akkorde.js`-Texten.
- Tests: Wortlaut der Frage und der drei Knöpfe; `check` nimmt die neue Aufschrift an.

**B1 – Quintenzirkel-Frage „Wie viele Vorzeichen hat D-Dur?“.** Wo: `src/packs/akkorde.js` (`circleQuestion`,
`kind === "count"`, `example` der Stufe).
- Die Frage zeigt die leere Notenzeile mit Violinschlüssel (kein Dreiklang); nach der Antwort erscheint die
  Vorzeichnung (`revealSvg` mit `keySigSvg`). Rückmeldung und `display`: „D-Dur: 2 ♯ (Fis, Cis)“, bei C-Dur
  „C-Dur: keine Vorzeichen“. Die Fragen „eine Quinte höher/tiefer“ bleiben wie sie sind.
- Tests: für alle 15 Tonarten kein Notenkopf im Fragebild, Vorzeichnung im Auflösungsbild, Namen der Vorzeichen
  in der richtigen Reihenfolge (aus `music.js` abgeleitet, nicht abgetippt).

**A2 – Bass-Lerntafel, Zeile.** Wo: `src/packs/noten.js` (`LEGEND.bass`).
- „Unterste Note ohne Hilfslinie: G“ ersetzen durch zwei Zeilen: „Unterste Linie: G (große Oktave)“ und „Unter
  der Zeile, ohne Hilfslinie: F“. Violinschlüssel entsprechend ergänzen: „Unter der Zeile, ohne Hilfslinie: d'“.
  Die Merksprüche kommen in Schritt 4.
- Tests: Die Zeilen werden gegen `staffPos` geprüft (G auf Lage 0, F auf −1, d' auf −1), nicht nur als Text.

### Schritt 2 – Begriffe und Wortlaut (A6, B5, B6, B15)

**A6 – Bauplan 1 / ½.** Wo: `src/packs/tonleitern.js` (`PLAN_SHORT`, `PLAN_TEXT`, `PLAN_NOTE`, `planTable`,
`sigWay`, Vorführung `scaleDemo` samt Ergebniskarte, Lerntafel `planBoard`, Hinweise).
- `PLAN_SHORT` = „1“ bzw. „½“. In Sätzen (`sigWay`, Rückmeldung Stufe 8/9, Ergebniskarte der Vorführung)
  ausgeschrieben: „der Bauplan Ganz – Ganz – Halb – Ganz – Ganz – Ganz – Halb braucht B und Es“. Ist das bei
  320 px zu lang, darf die Zeile umbrechen, aber nicht abkürzen.
- `PLAN_NOTE`: „1 = Ganztonschritt (2 Halbtöne) · ½ = Halbtonschritt (1 Halbton)“.
- Achtung, neue Verwechslungsgefahr: In der Vorführung steht unter der Zeile „Schritt“ (1 1 ½ …) die Zeile
  „Halbtöne“ (2 2 1 …), darüber der Kopf „1–2 … 7–8“ – drei Reihen aus Ziffern. Deshalb: Zeilenname
  „Tonschritt“ statt „Schritt“, Kopf klein und mit dem Wort „Stufen“, die Halbton-Zeile wie bisher grün. Die
  Prüfer sehen sich genau diese Stelle an.
- Akzeptanz: Nirgends in UI-Texten steht „G“ oder „H“ als Kürzel für einen Tonschritt; `grep` nach „G G H“ in
  `src/` leer.
- Tests: `PLAN_SHORT`, `planTable`, `sigWay` (alle neun Tonarten), Ergebniskarte der Vorführung.

**B5 – Grob- und Feinbestimmung, Fachwörter erklärt.** Wo: `src/packs/intervalle.js` (Fragen, `DEMO_STEPS`,
`intervalTable`-Kopf „Rahmen“, Hinweise, Lerntafel, `subtitle` des Pakets), `src/views/practice.js`
(`keysHint`), `src/demo.js` und `css/style.css` (Kommentare), `README.md`, `docs/ARCHITEKTUR.md`,
`src/packs/tonleitern.js` (Stufen 4, 10, 12, Lerntafel „Bauplan Dur“).
- Wortlaut: Frage Schritt 1 „Grobbestimmung: Welches Intervall?“ (abwärts „Abwärts – Grobbestimmung: Welches
  Intervall?“), Schritt 2 wie bisher mit „Feinbestimmung“ im Hinweis; Marken „1 · Grob: Stufen zählen“ und
  „2 · Fein: Halbtöne zählen“; Tabellenkopf „Intervall“ statt „Rahmen“; Tastaturhinweis ohne Klammerzusatz.
  Interne Namen (`"rahmen"`, `.tt-rahmen`) werden mit umbenannt (`"grob"`), damit das Wort nicht zurückkommt.
- Halbsatz beim ersten Auftreten (Hinweis der Stufe bzw. Frage): „Grobbestimmung = nur die Zahl: Prime,
  Sekunde, Terz …“, „Feinbestimmung = rein, klein oder groß“ (Intervalle 3); „Stammton = Note ohne Vorzeichen“
  (Tonleitern 4 und 12); „entscheidendes Vorzeichen = bei Kreuzen das letzte, bei Be das vorletzte“ (Tonleitern
  10, steht schon im Hinweis, künftig auch in der Frage); „Tetrachord“ ist in der Lerntafel erklärt und kommt in
  Fragen nicht vor (prüfen). Tonleitern 12: Verweis „wie bei den Intervallen“ streichen (das Paket steht in der
  Liste danach) und „kleine Terz abwärts“ schon im Hinweis nennen.
- Akzeptanz: `grep -ri rahmenintervall` in `src/`, `index.html`, `README.md`, `docs/ARCHITEKTUR.md`, `CLAUDE.md`
  (Abschnitt Stand: neuer Eintrag, alte Einträge bleiben Geschichte) ohne Treffer in UI-Texten.
- Tests: Fragen, Marken, Tabellenkopf; ein Test, der „Rahmenintervall“ in allen UI-Texten ausschließt (in
  `test/texte.test.js`).

**B6 – Stufen zählen und Halbtöne zählen.** Wo: `src/packs/intervalle.js` (Hilfetexte, `intervalDemo`,
Lerntafel), `src/staff.js` (`pianoSvg`, `counts`).
- Fester Satz in den Hilfen ab Stufe 3 und in der Vorführung beim Wechsel zu Schritt 2: „Stufen: Beide Noten
  zählen mit. Halbtöne: Die Starttaste zählt nicht, du zählst die Schritte.“ In der Vorführung trägt die
  Starttaste die Aufschrift „Start“ (bei 320 px „0“, falls „Start“ nicht passt), die gezählten Tasten wie bisher
  1, 2, 3 …
- Gilt genauso für Tonleitern 12 („drei Halbtöne abwärts“): gleiche Beschriftung in der Vorführung.
- Tests: Bilderfolge der Vorführung enthält die Start-Beschriftung genau an der unteren (abwärts: oberen) Note;
  Satz in den Hilfetexten.

**B15 – Wortlaut.** Wo: `src/packs/noten.js` (Hinweise Stufe 3 und 4), `src/packs/intervalle.js` (Lerntafel
„Intervalle über c' / c“: `PAIR_DX`, `PAIR_STEP`; Knopf in Stufe 10), `src/views/practice.js` (Ergebniskarte).
- Noten 4: statt „Im Bassschlüssel liegt alles zwei Stufen tiefer“: „Dieselbe Stelle heißt im Bassschlüssel
  anders: zwei Notennamen weiter. Aus E wird G, aus G wird H.“ (Aussage über den Namen, nicht über die Tonhöhe.)
- Noten 3: „Das c' liegt auf einer Hilfslinie unter der Zeile“ (statt „hängt an“).
- „Stufe“ dreifach (Stufe der App, Notenstufe, Tonleiterstufe): In erklärenden Texten immer „Notenstufen“ bzw.
  „Stufe der Tonleiter“ ausschreiben. Die Stufen der App umzubenennen ist eine eigene Entscheidung
  ([OFFEN Sandra], nicht in dieser Welle).
- Intervalltafel: Abstand innerhalb eines Paares deutlich kleiner als zwischen den Paaren (heute 44 gegen 28
  Einheiten laut Prüfung), dazu ein feiner Trennstrich zwischen den Paaren.
- Intervalle 10: Knopf „Zahl stimmt nicht (Stufen)“ → „anderes Intervall (Notenstufen)“ (Wortliste beachten).
- Ergebniskarte: „Ø 0,1 s“ mit Komma; „pro Aufgabe“ statt „pro Note“ außerhalb von „Noten lesen“.
- Tonleitern 8: Hinweis in zwei Zeilen „♯: Fis – Cis – Gis – Dis“ / „♭: B – Es – As – Des“.
- Tests: Wortlaute; Abstände der Intervalltafel (Paarabstand < Lückenabstand).

### Schritt 3 – Freischalt-Regel sichtbar (A7)

Wo: `src/views/home.js` (`lockText`, `levelHtml`), `src/views/practice.js` (`resultInfo`, `showResult`).
- Gesperrte Karte: immer „frei ab 8/10 in Stufe n“ (n = `unlockedBy`), auch ohne `requires`.
- Ergebniskarte bei weniger als 8 Richtigen und noch gesperrter Folgestufe: eigene, gut lesbare Zeile (nicht im
  kleinen grauen Text) „Noch k richtige, dann öffnet sich Stufe n.“ (k = 8 − Richtige; ab k ≥ 4 „Ab 8 von 10
  öffnet sich Stufe n.“). Ab 8 Richtigen: „Stufe n ist offen.“
- Die Regel selbst (beste Runde ≥ 8, schon gespielte Stufen bleiben offen, „Alle Stufen öffnen“) bleibt.
- Tests: `lockText` mit und ohne `requires`; `resultInfo` für 4, 7, 8 Richtige, für Stufen, die zwei Stufen
  freischalten, und für die letzte Stufe eines Pakets.

### Schritt 4 – Merksprüche wählbar (dazu A2-Sprüche und B3)

**Merkhilfen und Vorschläge** (Quelle: KONZEPT-gehirngerecht, Sandra 20. und 24.11.2026). Der erste Vorschlag
ist die Voreinstellung.

| Kennung | Wofür | Buchstaben | Vorschläge |
|---|---|---|---|
| `violin-linien` | Linien im Violinschlüssel | E G H D F | „Es Geht Hurtig Durch Fleiß“ |
| `violin-raeume` | Zwischenräume im Violinschlüssel | F A C E | „Fritz Aß Citronen-Eis“ |
| `bass-linien` | Linien im Bassschlüssel | G H D F A | „Gute Hunde Dürfen Fast Alles“ |
| `bass-raeume` | Zwischenräume im Bassschlüssel | A C E G | „Alle Clowns Essen Gern“ |
| `kreuze` | Reihenfolge der Kreuze | F C G D A E H | „Fünf Cowboys Gehen Durch Alle Einkaufs-Hallen“, „Frische Croissants Gibt's Donnerstags Am Ersten Haus“, „Fritz Christian Geht Durch Alle Ecken Heim“ |
| `kreuz-tonarten` | Dur-Tonarten mit 1–6 ♯ | G D A E H F(is) | „Geh Du Alter Esel Hole Fische“ [Wortlaut verbreitet, regional verschieden] |
| `be-tonarten` | Dur-Tonarten mit 1–6 ♭ | F B E(s) A(s) D(es) G(es) | „Frische Brezen Essen Asse Des Gesangs“ |
| `bes` | Reihenfolge der Be | B E(s) A(s) D(es) G(es) | folgt aus `be-tonarten` ohne das erste Wort: „Brezen Essen Asse Des Gesangs“ |

Nachgerechnet: Alle Vorschläge passen Wort für Wort zu den Buchstaben („Citronen-Eis“ und „Einkaufs-Hallen“
zählen als zwei Wörter). Was die Sprüche **nicht** abdecken: die siebte Tonart (Cis-Dur, Ces-Dur) und das
sechste und siebte Be (Ces, Fes). Dort zeigt die App die Reihe selbst; nichts dazuerfinden ([OFFEN Sandra]).
Zur Reihe der Be darf die App zusätzlich sagen, dass sie die Reihe der Kreuze rückwärts ist (H E A D G C F –
als Be: B Es As Des Ges Ces Fes); das ist ein Sachverhalt, kein Spruch.

**Was genau.**
- Neues Modul `src/sprueche.js` (rein, ohne DOM): `MERKHILFEN` (Tabelle oben), `initials(text)` (Wörter an
  Leerzeichen und Bindestrichen trennen, erster Buchstabe, Großschreibung egal; Apostroph gehört zum Wort),
  `checkSpruch(id, text)` → `{ ok, soll, ist, stelle }` (Anzahl der Wörter und jeder Anfangsbuchstabe; Umlaute
  zählen nicht als A, O, U), `spruch(state, id)` (gewählter Vorschlag oder eigener Text, sonst Voreinstellung),
  `wortZu(state, id, index)` (das Wort zur n-ten Linie, für die Rückmeldung). `bes` ist abgeleitet und hat
  keine eigene Wahl: Vorschlag oder eigener Spruch von `be-tonarten` ohne das erste Wort.
- Spielstand: neues Feld `sprueche: {}` in `fresh()`, je Kennung `{ wahl: <Nummer des Vorschlags> }` oder
  `{ eigen: "<Text>" }`. Eigener Text höchstens 80 Zeichen, nur gespeichert, wenn `checkSpruch` passt.
  `reset` behält `sprueche` (Einstellung wie Ton und Eingabeart, kein Fortschritt).
- Wählen: in „Lernen“, Tafel „Merkhilfen“ (je Schlüssel) und Tafel „Quintenzirkel“/„Tonarten“ (Kreuze, Be):
  je Merkhilfe die Vorschläge als Auswahl und ein Feld „Eigener Spruch“ mit sofortiger Prüfung („Das 3. Wort
  muss mit H beginnen.“, „Es fehlen 2 Wörter.“). Der gewählte Spruch ist hervorgehoben.
- Anzeigen: Hinweise der Stufen Noten 1, 2, 4, 5 (heute fest im Text; Bass heute ohne Spruch), Lerntafel
  „Merkhilfen“, Rückmeldung in „Noten lesen“ (B3), Hinweis und Hilfen Tonleitern 8 (Reihenfolge), 10 und 11
  (Tonarten), Lerntafel mit dem Quintenzirkel. Dafür bekommen Hinweise und Lerntafeln den Spielstand:
  `level.hint` darf eine Funktion `(ctx) => Text` sein, `card.render(ctx)`; `practice.js` und `learn.js` reichen
  `ctx.state` durch. Pakete lesen den Spielstand nur über `sprueche.js`.
- Sicherheit: Der eigene Text kommt vom Kind. Er wird überall als Text eingesetzt (`textContent` bzw. `esc`),
  nie als HTML. Als Test festhalten (Spruch mit `<b>` und `&`).
- Tonleitern 10: Auf der Startkarte die ganze Reihenfolge zeigen (Fis Cis Gis Dis Ais Eis His / B Es As Des Ges
  Ces Fes) mit dem gewählten Spruch (kleiner Teil von B7; die Teilung der Stufe in „bis 4“ und „5–7“ ist nicht
  Teil dieser Welle).

**B3 – Noten lesen: Frage und Rückmeldung.** Wo: `src/packs/noten.js` (`makeQuestion`, `LEGEND`, Hinweise).
- Frage auf dem Bildschirm: „Wie heißt die Note?“ (`q.prompt`).
- Rückmeldung daneben (`q.reveal`): Name, Lage, bei Linien und Zwischenräumen der Spruch: „G – 2. Linie von
  unten (Es Geht Hurtig Durch Fleiß)“, „A – 2. Zwischenraum von unten (Fritz Aß Citronen-Eis)“, „c' – auf der
  Hilfslinie unter der Zeile“, „d' – unter der Zeile, ohne Hilfslinie“. Reine Funktion `lageText(n, clef)` aus
  `staffPos` (Lagen −2 bis 10), kein abgetippter Text je Note. Bei Vorzeichen: Lage der Note, dann der Name
  („Fis – 1. Zwischenraum von unten, mit ♯“).
- Große Oktave: „G (großes G)“ statt „G (G)“; die anderen Oktaven wie bisher („G (g')“).
- `statKey`, Antwortprüfung und adaptive Auswahl bleiben unverändert.
- Tests: `initials`, `checkSpruch` (alle Vorschläge bestehen; falsche Anzahl, falscher Buchstabe, Bindestrich,
  Apostroph, Umlaut, leer, zu lang); `spruch` mit leerem, altem und neuem Spielstand; `lageText` für alle Noten
  der Stufen 3 und 6; Rückmeldung enthält den **gewählten** Spruch; `load` eines alten Stands ohne `sprueche`;
  `reset` behält die Wahl; `sw.test.js` (neue Datei in `PRECACHE`).
- Akzeptanz: Eigener Spruch eingeben → erscheint im Hinweis der Stufe, in der Rückmeldung und in der Lerntafel,
  bleibt nach Neuladen; falscher Spruch wird mit verständlicher Meldung abgelehnt; Bass-Stufen 4 und 5 zeigen
  Sandras Sprüche.

### Schritt 5 – Notenwerte: Balken (Top 1)

Wo: `src/staff.js` (neu `beamSvg`, `noteSvg` mit `opts.flagless`), `src/packs/notenwerte.js` (`barSvg`,
neu `beamGroups`, Lerntafel `learnHtml`, Hilfetext Stufe 8), `css/style.css`.

**Regeln, nach denen gebaut wird** (Notensatz; Quellen im Commit nennen, Maße messen wie bei den übrigen Zeichen):
- Gebalkt werden nur Achtel und Sechzehntel, die **innerhalb desselben Schlags** aufeinander folgen
  (`beamGroups(els)` rechnet mit den Einsatzzeiten). Kein Balken über eine Pause, kein Balken über eine
  Schlaggrenze. Eine einzelne Achtel in ihrem Schlag behält das Fähnchen (z. B. „4. 8“, „8 r8“, „r8 8“).
- Im 4/4-Takt ist es auch üblich, vier Achtel einer Takthälfte (Schlag 1–2 oder 3–4) unter **einen** Balken zu
  setzen; über die Taktmitte wird nie gebalkt. Beides ist richtig. Gebaut wird **je Schlag** (2 + 2), weil die
  App nach Schlägen zählt; betrifft nur den Takt „2 8 8 8 8“. [OFFEN Sandra], als eine Konstante.
- Achtel mit zwei Sechzehnteln („8 16 16“, „16 16 8“): ein durchgehender Balken über alle drei, ein zweiter nur
  über den beiden Sechzehnteln. In `BARS` kommen genau diese Gruppen vor: „8 8“ (vier Takte), „16 16 8“ und
  „8 16 16“ (je ein Takt). Gruppen, die einen Teilbalken (Stummel) bräuchten (z. B. „16 8 16“, „8. 16“), gibt
  es nicht; als Test festhalten, damit ein neuer Takt auffällt.
- Alle Noten stehen auf h' (Mittellinie), der Hals zeigt wie bisher nach unten, der Balken liegt waagrecht
  unter den Köpfen. Balkendicke, Abstand der beiden Balken und Halslänge an Bravura/Verovio messen
  (ARCHITEKTUR nennt das Verfahren) und in ARCHITEKTUR eintragen; nicht schätzen.
- **Lücke:** Gehört die Lücke zu einer Balkengruppe, verriete ein Balken an den Nachbarn den fehlenden Wert.
  Deshalb zeigt die Aufgabe eine Gruppe, in der die Lücke liegt, ganz mit Fähnchen; in der Auflösung
  (`filled`) und im Ergebnis der Vorführung steht sie mit Balken. Die Abstände ändern sich dabei nicht.
- Damit der Wechsel nicht überrascht: Lerntafel „Notenwerte und Pausen“ bekommt ein Bild „Zwei Achtel mit
  Fähnchen = zwei Achtel mit Balken“ (und „Achtel + zwei Sechzehntel“), ein Satz in den Hilfen der Stufe 8
  („Achtel und Sechzehntel in einem Schlag hängen an einem Balken.“). In den Stufen 1–7 (einzelne Zeichen)
  ändert sich nichts.
- Der Wortlaut „Fähnchen“ bleibt; „Balken“ ist ab jetzt nur noch dieser Balken (siehe Schritt 6, Pausen).
- Akzeptanz: Alle 25 Takte im Browser ansehen (Aufgabe mit jeder Lücke, Auflösung): keine Note mit Fähnchen
  **und** Balken, kein Balken über Pause oder Schlaggrenze, Balken trifft die Halsenden, hell und dunkel,
  gefärbt bei „ok“/„bad“ und in den Farben der Vorführung.
- Tests: `beamGroups` für alle 25 Takte (erwartete Gruppen ausgeschrieben), für jede der 91 Aufgaben: keine
  Gruppe im Fragebild enthält die Lücke; Auflösung enthält die Gruppen des vollen Takts; kein Takt braucht
  einen Teilbalken; Summe der Schläge je Takt weiter 4.

### Schritt 6 – Notenwerte: Zählen, Wortlaut, Vorführungen, Pyramide (Top 2–7, 10)

Wo: `src/packs/notenwerte.js`, `css/style.css`; `src/demo.js` nur, falls die Ergebniskarte einen Satz mehr
braucht.

- **Zählzeiten unter den Noten (Top 2).** Nach der Antwort (`revealSvg` der Stufen 8 und 9) und im Ergebnisbild
  der Vorführung 3 steht unter jedem Zeichen des Takts die Zählzeit, auf der es **beginnt** (x aus `layoutBar`):
  „1“, „+“, „2“ … Sechzehntel, die zwischen den Achteln beginnen, bekommen keine Silbe (wie bisher offen).
  Pausen in Klammern wie bisher (`REST_COUNTS_IN_PARENS`). Vor der Antwort stehen keine Zählzeiten unter den
  Noten (hinter der Lücke verrieten sie den fehlenden Wert). Die Zählleiste darunter bleibt. Höhe der Zeile
  bei Bedarf vergrößern; nichts darf den Hals oder den Balken berühren.
  [OFFEN Sandra] Unter langen Noten nur der Einsatz („1“ unter der halben Note) oder alle Schläge („1 2“)?
  Gebaut wird der Einsatz, als Konstante umschaltbar.
- **„+“ (Top 4).** Das Rechenzeichen bleibt in Rechnungen („1 + ½ = 1½“, immer mit „=“). Die Zählsilbe wird
  abgesetzt: kleiner und grau (`.nw-und`), nie in derselben Zeile wie eine Rechnung, und der Satz „+ heißt
  ‚und‘“ steht im Bild der Zählleiste selbst, nicht nur unter der Tafel. Die Silbe ist eine Konstante
  (`COUNT_SYLLABLES`); ob sie „+“, „u“ oder „und“ heißt, bleibt [OFFEN Sandra] aus Welle 9.
- **Frage Stufe 6 (Top 5).** Frage und Text nach Schritt 1 lauten für punktierte und nicht punktierte Noten
  **gleich** und verraten den Punkt nicht, z. B. Frage „Welcher Notenwert steckt in dieser Note? Einen Punkt
  lässt du zuerst weg.“, nach Schritt 1 „Richtig: Der Notenwert ist die Viertelnote.“ Den Punkt nennt erst die
  Rückmeldung am Ende („… · Punkt: + ½ → 1½ Schläge“ bzw. „kein Punkt“). Stufe 7 fragt schon neutral.
  Test: Für jedes Paar (Viertel, punktierte Viertel usw.) sind Frage und beide Texte nach Schritt 1 gleich.
- **Wort für die Form der ganzen und halben Pause (Top 7).** „Balken“ dort ersetzen (`REST_FEATURES`,
  `HELP_TEXT_REST`, Hinweis Stufe 2/3, Lerntafel). Vorschlag aus der Prüfung „Rechteck“ oder „Block“; in
  Schulbüchern schwankt das Wort. Gebaut wird beschreibend „schwarzes Rechteck“ als eine Konstante
  ([OFFEN Sandra]: ihr Wort aus dem Unterricht). Dazu „hängt unter der zweiten Linie von oben“ zusätzlich zu
  „vierte Linie von unten“ (dieselbe Linie; schneller abzuzählen). Test: kein „Balken“ in Texten zu Pausen.
- **Vorführung 3, Lücke (Top 3).** Die Summenleiste in Schritt 1 ist eine Menge, keine Zeitachse: anders
  zeichnen als die Zählleiste (ohne die grauen Schlagfelder, mit der Überschrift „Summe“ und den Marken 0 bis
  4), damit niemand die leere Stelle hinten für den Ort der Lücke hält. Im Ergebnis ein Satz: „Die Lücke steht
  auf ‚2 +‘, dort steht jetzt die Achtelnote.“ (Zählzeit aus den Einsatzzeiten berechnet.) Die Klammern der
  Pausen und „+ heißt ‚und‘“ werden im Ergebnisbild erklärt, nicht erst unter der Tafel. Bilderzahl bleibt
  n + 4; ändert sie sich doch, Tests und ARCHITEKTUR anpassen.
- **Vorführung 2, Pyramide (Top 6).** Beim Punkt nicht ganze Zeilen hervorheben: ein Kästchen des Notenwerts
  grün, darunter **ein** Kästchen der nächsten Zeile umrandet (die Hälfte), daneben „1 + ½ = 1½“. Gilt für
  punktierte halbe (halbe + eine Viertel), Viertel (+ eine Achtel), Achtel (+ eine Sechzehntel).
- **Pyramide lesbar (Top 10).** Bei 320 px Zeichen mindestens so groß wie die Beschriftung der Notenzeile;
  in Stufe 8 die Pyramide nicht verkleinern (`small` entfällt, Zählleiste und Pyramide untereinander); ganze
  Note mit größerem Zeichen; „Punkt: + die Hälfte“ als eigene, gut lesbare Zeile. Hilfen Stufe 1: leere
  Zellen als „–“ statt „·“.
- Kleinigkeiten aus derselben Prüfung, soweit ohne Rückfrage: Schläge in Rückmeldung und Vorführung der Stufen
  1–3 mit „im 4/4-Takt“ (dort sind Schläge noch nicht eingeführt); Ergebnis-Titel der Vorführung 3 bricht bei
  320 px höchstens zweizeilig um.
- Akzeptanz: je Stufe 4, 6, 8, 9 eine Runde bei 420 und 320 px, hell und dunkel; alle drei Vorführungen bis
  zum Ergebnis; Zählzeiten stehen genau unter den Zeichen (auch mit Balken und Punkt), nichts überlappt.
- Tests: Zählzeit je Zeichen für alle 25 Takte (aus den Einsatzzeiten, Pausen in Klammern, Sechzehntel ohne
  Silbe); keine Zählzeiten im Fragebild; Texte der Stufe 6; Pausen-Wortlaut; Bilderfolgen der Vorführungen 2
  und 3 (Anzahl, markierte Kästchen, Satz zur Lücke für jede der 91 Aufgaben).

### Schritt 7 – Lesbarkeit und Barrierefreiheit (B13, B14)

Wo: `css/style.css`, `src/staff.js` (`pianoSvg`), `src/engine.js` (`helpsHtml`, Knöpfe, Fortschrittspunkte),
`src/packs/tonleitern.js` (Quintenzirkel-Kästchen, Lerntafeln), `src/packs/intervalle.js` und `akkorde.js`
(Beschriftungen der Lerntafeln), `test/css.test.js`.
- **Fokus:** `outline` in `var(--accent)` statt `--accent-soft` (heute etwa 1,2 : 1); mindestens 3 : 1 gegen
  `--bg` und `--surface`, hell und dunkel.
- **Nicht nur Rot/Grün:** nach der Antwort ✓ bzw. ✗ im gewählten Knopf, ✓ im richtigen Knopf, Zeichen auch in
  den Fortschrittspunkten; Teilerfolg (Schritt 0) mit eigenem Zeichen („~“ oder halber Punkt, im Bild
  entscheiden). Zeichen per CSS oder Text, mit `aria-label`.
- **Kontrast Rückmeldetext hell:** `--ok` und `--bad` so abdunkeln, dass Text auf `--bg` und `--surface`
  mindestens 4,5 : 1 hat (Vorschlag der Prüfung: etwa `#157a55` und `#c23a30`; nachrechnen, nicht übernehmen).
  Dunkel ist in Ordnung. Flächen, die dieselben Tokens nutzen (Knöpfe, Punkte, Notenkarte), im Bild prüfen.
- **Klaviatur bei 320 px:** Die Hilfe-Klaviatur zeigt nur den nötigen Ausschnitt (eine Oktave plus das, was die
  Aufgabe braucht) oder wird waagrecht so groß gesetzt, dass Tastennamen und Zählziffern mindestens etwa 9 px
  hoch sind; kein waagrechtes Scrollen der Seite. Markierte schwarze Taste deutlich sichtbar.
- **Tabellen und Beschriftungen:** `.note-label` in Lerntafeln (Intervalle über c', Dreiklangstypen) bei
  320 px mindestens etwa 9 px (größere Schrift oder zwei Zeilen statt einer); Quintenzirkel-Kästchen
  (Tonleitern 10, Lerntafel): Kopfzeile auch über der zweiten Hälfte, nichts versetzt; „As-Dur f-Moll“ mit
  Abstand; Tabelle „Dur-Tonleitern bis 4 Vorzeichen“ ohne Umbruch mitten im Namen.
- Akzeptanz: Bildschirmfotos 320 px dunkel und 420 px hell der genannten Stellen; Tastaturbedienung einer
  ganzen Runde mit sichtbarem Fokus; Graustufen-Bild einer richtigen und einer danebenliegenden Antwort ist
  unterscheidbar.
- Tests (`test/css.test.js`): Kontrast aus den Tokens gerechnet (Fokus ≥ 3 : 1, `--ok`/`--bad`/`--part-ink` ≥
  4,5 : 1 auf ihren Hintergründen, hell und dunkel); alle neuen Tokens an allen drei Stellen definiert; keine
  festen Farben außerhalb von `:root`.

### Schritt 8 – Doku, Cache, Bildschirmfotos

- ARCHITEKTUR (Engine: `waitsAfter`, Klasse `part`, Ein-Schritt-Aufgaben; Notenzeile: ♮, Balken mit Maßen;
  neues Modul `sprueche.js`, Hinweis als Funktion, `render(ctx)`; Fortschritt: Feld `sprueche`), README,
  CLAUDE.md (Stand; feste Entscheidungen vom 24.11.2026), dieser Abschnitt um „Umgesetzt“ ergänzt.
- `sw.js`: Cache **`notenheld-v0.2.0-13`**, `PRECACHE` mit `src/sprueche.js`.
- Bildschirmfotos aller geänderten Stellen (420 hell, 320 dunkel) für die Abschlussprüfung;
  `docs/screens/screenshots.mjs` läuft weiter.

**Spielstände.** Kein Wechsel des Schlüssels (`notenheld.v2`), keine Umstellung mit Marker: Es kommt nur das
Feld `sprueche` dazu (fehlt es, gilt `{}`; `load` füllt es über `fresh()`). Stufen-IDs, `statKey`s, Sterne und
Freischaltung bleiben. Intervalle 3–7: Aufgaben mit nur einem möglichen Intervall haben künftig einen Schritt;
gezählt wird wie bisher je Aufgabe. Test: alter Stand (ohne `sprueche`, mit allen drei Markern) lädt unverändert
und wird nicht neu gespeichert.

**Reihenfolge und Prüfung.**
- Die Schritte 0 bis 8 laufen **nacheinander** auf `korrekturen-10`, je ein eigener Opus-Agent; mehrere fassen
  dieselben Dateien an (`engine.js`, `style.css`, `notenwerte.js`). Nach jedem Schritt prüft Fable (Code,
  `npm test`, Browser 420 und 320 px, hell und dunkel) und lässt nachbessern, bevor der nächste beginnt.
- Jeder Schritt: `npm test` grün, Wortliste (`test/texte.test.js`), keine Konsolenfehler, kein waagrechter
  Überlauf, Commit auf Deutsch. Kein Push ohne Sandras Ja.
- Musiktheorie und Notensatz nicht erfinden: Unsicheres im Commit vermerken und als [OFFEN Sandra] hier
  nachtragen.
- **Abschluss:** Prüfung aus drei Perspektiven (drei getrennte Fable-Prüfer: Lehrkraft, Jugendliche,
  Wissenschaft) mit den Bildschirmfotos aus Schritt 8 und dem Code; je Abschnitt die vier Fragen (inhaltlich
  richtig, übersichtlich, anschaulich, ansprechend). Danach Korrektur (Opus) und Nachprüfung (Fable). Erst dann
  Sandra fragen, ob gepusht wird.

**Offen für Sandra (Welle 10).** Gebaut wird jeweils die genannte Voreinstellung als Konstante.
1. Zählsilbe: „+“, „u“ oder „und“ (aus Welle 9; Voreinstellung „+“, abgesetzt).
2. Zählzeiten unter langen Noten: nur der Einsatz oder alle Schläge; Pausen: Klammer je Silbe oder eine Klammer
   über die ganze Pause (Voreinstellung: Einsatz, Klammer je Silbe).
3. Wort für die Form der ganzen und halben Pause statt „Balken“ (Voreinstellung „schwarzes Rechteck“).
4. Balken: je Schlag (2 + 2) oder vier Achtel einer Takthälfte unter einem Balken (Voreinstellung je Schlag).
5. Merksprüche: Wortlaut „Geh Du Alter Esel Hole Fische“ bestätigen; siebte Tonart und sechstes/siebtes Be ohne
   Spruch lassen?; welcher der drei Sprüche für die Kreuz-Reihe ist die Voreinstellung (bisher der erste);
   bleibt der eigene Spruch beim Zurücksetzen erhalten (Voreinstellung ja)?
6. Reine Prime mit Vorzeichen an beiden Noten (des'–des'): so lassen (Voreinstellung) oder zweites Vorzeichen
   weglassen?
7. Stufen der App anders nennen („Lektion“, „Etappe“), weil „Stufe“ dreifach vorkommt? (nicht in dieser Welle)

**Nicht in dieser Welle (spätere Wellen, je eine Zeile).**
- Welle 11: Wiederholen (Voraussetzungen, „Grundlagen wiederholen“, Wiederholung über Tage, Jahrgang; B9, B16).
- Noten lesen gehirngerecht: Bezugston → Stufen zählen, Hilfen, Vorführung; Namensregel -is/-es und „H mit ♭
  heißt B“, Namensraster (B4), Stufe „Auflösungszeichen“ (B8a).
- Dreiklänge Schritt für Schritt: neues Paket, Umkehrungen vor „Grundton bestimmen“ (A5, B2; Vorgabe Sandra),
  bis zum Dominantseptakkord (Vorgabe Sandra, 25.11.2026, eigener Abschnitt nach Welle 11).
- Moll-Tonleitern (natürlich, später harmonisch und melodisch; B8b).
- Hörstufen: erst hören, dann antworten (B8c); dazu Grundschlag beim Takt-Rhythmus.
- Startseite und Lernen: Pakete einklappbar, Sprungleiste, Tafeln umbenennen (B12); kürzere Vorführungen bzw.
  Einstieg beim gefragten Schritt (B11, Rest).
- Tonleitern 10 teilen (erst bis 4, dann 5–7 Vorzeichen; B7, Rest).
- Notenwerte: eigene Aufgaben zu Balken, Silben für Sechzehntel, Einstiegstest zum Überspringen.

**Entscheidungen Sandra (24.11.2026, nach dem Plan).** Zählsilbe „+“ (vom Rechen-Plus optisch abgesetzt); Zählzeiten: jeder Schlag wird gezeigt; Schläge ohne neuen Einsatz stehen in Klammern, also gehaltene Schläge langer Noten und Pausen (Halbe auf 1: „1 (2)“, Viertelpause auf 3: „(3)“; je Silbe eine Klammer); Balken je Schlag (2 + 2) auch in „2 8 8 8 8“; ganze und halbe Pause: „Rechteck“. Übrige offene Punkte (Merksprüche: Wortlaut „Geh Du Alter Esel Hole Fische“, Ces/Fes ohne Spruch, Voreinstellung Kreuz-Spruch, eigener Spruch bleibt beim Zurücksetzen; reine Prime mit zwei Vorzeichen) nach Voreinstellung des Plans bauen und Sandra im Bericht nennen.

**Umgesetzt (24.11.2026).** Branch `korrekturen-10` von `main` 5b2dd1b (nicht von `notenwerte-neu` 7dcab7c, wie
oben angenommen: Welle 9 war inzwischen auf `main`; Inhalt derselbe plus Pages-Workflow). Plan 0b58319, Sandras
Entscheidungen c838989. Je Schritt ein Opus-Agent, danach eine Prüfung mit eigenem Commit. Cache
`notenheld-v0.2.0-13`. `npm test` am Ende 366 grün, 0 rot. Noch nicht auf `main`.

| Schritt | Umsetzung | Prüfung |
|---|---|---|
| 0 Engine (A1, B10, B11) | 0d92099 | aeef5fd |
| 1 Fachliches (A3, A4, B1, A2-Zeile) | 0dc28c6 | – (Nachtrag ♮-Satz in Intervalle 6 mit Schritt 2) |
| 2 Begriffe (A6, B5, B6, B15) | 753a042 | 55e6ea0 |
| 3 Freischalt-Regel (A7) | 986e5bb | 292f449 |
| 4 Merksprüche (A2, B3) | a64a507 | 2620487 |
| 5 Balken (Top 1) | 1ea16a0 | d6bc7d4 |
| 6 Zählen, Wortlaut, Vorführungen (Top 2–7, 10) | b58bfa3 | 28ee14d |
| 7 Lesbarkeit, Barrierefreiheit (B13, B14) | 4d3c756 | 7d7657b |
| 8 Doku, Cache, Bildschirmfotos | 8ddb7a5 | Commit „Prüfung Schritt 8“ |

Abweichungen vom Plan und Entscheidungen der Prüfer, je Schritt:
- **Schritt 0.** `waitsAfter` und `AUTO_OK_MAX` = 45 wie geplant; Noten lesen 1–8 (richtige Rückmeldungen 14–20
  Zeichen) laufen wie vorher weiter, z. B. Intervalle 4 (53–70 Zeichen) wartet jetzt auch nach „richtig“. Neues
  Feld `level.twoSteps` (Notenwerte 1, 4, 6, 8; Tonleitern 4, 10, 12; Intervalle 3–7) für „Beide Schritte müssen
  stimmen.“; der Zusatz bleibt auch in Stufen, in denen einzelne Aufgaben nur einen Schritt haben. Prüfung:
  **Tonleitern 10 bei C-, G-, F-Dur** zeigte noch einen Schritt mit nur einem Knopf (Bestätigung aus Welle 8) –
  der Schritt entfällt dort ebenfalls, die Frage nennt die Vorzeichnung (`majorSinglePrompt`); Test über alle
  Pakete und Stufen: kein Knopfsatz unter zwei Knöpfen. `--part` steht nur an Rand und Punkt, Schrift in
  `--part-ink`.
- **Schritt 1.** ♮ gemessen (Verovio 6.4.1/Bravura, Leipzig): `NAT_SIZE` 46px, `ACC_DY.natural` 6,
  `ACC_X.natural` −20,5; im Browser geprüft, dass das Zeichen aus Noto Music kommt. 9 Aufgaben mit ♮ in
  `POOL_5`, 18 in `POOL_6` wie erwartet. Quintenzirkel: Namen der Vorzeichen aus `music.js` abgeleitet
  (`keyAccidentals`). Violin-Lerntafel bekam zusätzlich „Unter der Zeile, ohne Hilfslinie: d'“ (wie geplant).
- **Schritt 2.** Intervalltafel: Trennstrich nur unter der Zeile (durch die Linien sähe er wie ein Taktstrich
  aus), Zeilen dafür breiter (viewBox bis etwa 340, Noten etwa 6 % kleiner). Prüfung: „Start“ jetzt in **allen**
  Vorführungen, die Halbtöne zählen (auch `stepDemo`, `scaleDemo`, `keyDemo`), nicht nur Intervalle und
  Tonleitern 12; Lerntafel „parallele Molltonart“ ohne Verweis auf die Intervalle („kleine Terz abwärts“).
  „Stammton“ nur im Hinweis von Tonleitern 4/12 erklärt (reicht).
- **Schritt 3.** Wortlaut „Noch eine richtige Antwort, dann öffnet sich Stufe n.“ / „Noch k richtige
  Antworten, …“ (statt „Noch 1 richtige“), „Ab 8 von 10 …“ ab vier fehlenden, „Die Stufen 2 und 7 sind offen.“
  bei zwei Freischaltungen. Prüfung: `keepStufe` (geschützte Leerzeichen, auch „und 7“) liegt in `engine.js`,
  damit die Startseite nicht die Ansicht „Üben“ importiert. „Stufe n ist offen.“ steht auch nach einer
  schwachen Runde, wenn die Folgestufe schon offen ist (Aussage stimmt; bleibt). `requires`-Satz „Stufe 7 öffnet
  sich ab 8 von 10 in Stufe 1.“ bleibt (derzeit nutzt kein Paket `requires`).
- **Schritt 4.** Wie geplant; `checkSpruch` liefert zusätzlich `grund`, `meldung(r)` formuliert. Prüfung:
  Prüfung, Zählung und Speichern in NFC (zerlegte Umlaute aus eingefügtem Text), Optionsfelder mindestens 44 px
  hoch, die Ring-Tafel „Quintenzirkel“ der Dreiklänge zeigt die gewählten Tonarten-Sprüche mit Leserichtung
  (gewählt wird nur in der Quintenzirkel-Tafel der Tonleitern). Rückmeldung zeigt den ganzen Spruch (`wortZu`
  bleibt ungenutzt bereit); bei Vorzeichen-Noten kein Spruch. Wer einen Vorschlag wählt, verliert den zuvor
  gespeicherten eigenen Text (Plan: wahl **oder** eigen); bei ungültiger Änderung gilt der zuletzt gültige
  eigene Spruch weiter, ohne dass das Feld es sagt.
- **Schritt 5.** Gemessen (Verovio 6.4.1, Bravura, Leipzig gleich): Balken 0,50 LA, Abstand 0,25 LA
  (SMuFL beamThickness/beamSpacing), Außenkante bei unseren 3,5-LA-Hälsen 3,42 LA (Verhältnis zum einzelnen
  Hals wie bei Verovio 3,25 zu 3,33). `bravura_metadata.json` ließ sich nicht laden, Werte aus dem
  Verovio-Rendering. `BEAM_UNIT` = 1 Schlag (Sandra). Prüfung: Sechzehntel direkt vor der Lücke bekommt
  mindestens 23 Einheiten (`GAP_FLAG_ADVANCE`), sonst stieß ihr Fähnchen an den Kasten der Lücke. Balken
  bleibt in der Vorführung schwarz, wenn nur eine Note der Gruppe gefärbt ist (er gehört der Gruppe).
  Fähnchen an der Gruppe mit der Lücke verraten den Wert nicht (geprüft für alle 91 Aufgaben).
- **Schritt 6.** Zählzeiten nach Sandras Regel (`countSyllables`): jede Schlagzahl genau einmal, ohne neuen
  Einsatz in Klammern; **gehaltene „+“ stehen unter den Noten nicht** („+“ ist kein Schlag), in der Zählleiste
  stehen sie als „(+)“ – falls Sandra auch „1 (+) (2) (+)“ will, nur `countSyllables` ändern. Pausenlage:
  „hängt unter der zweiten Linie von oben (das ist die vierte Linie von unten)“ bzw. „sitzt auf der
  Mittellinie“, an `BAR_REST` nachgeprüft. Satz zur Lücke als `result.note` (`demo.js`). Prüfung: „zwischen
  den Zählzeiten „1“ und „1 +““ statt „zwischen „1“ und „1 +““ (2 der 91 Aufgaben); Grenzfälle getestet
  (Note auf „+“ über einen Schlag gehalten „+ (2)“, punktierte Viertel auf „+“, Pausen auf „+“, ganze Note und
  Pause).
- **Schritt 7.** Fokus ein Rahmen für alle Elemente (`:focus-visible`, 3 px `--accent`), hell 5,80/6,56,
  dunkel 6,91/6,16 : 1. `--ok` #157853, `--bad` #b63b32 (nachgerechnet, nicht der Vorschlag der Prüfung),
  neues Token `--on-mark`. Teilerfolg als halb gefüllter Punkt (im Bild entschieden, statt „~“); Punkte rund
  16 × 16 statt Striche (Platz für ✓/✗). Klaviatur: Ausschnitt `fit` ab zwei markierten Tönen und in allen
  Vorführungen; Hilfen mit einem Ton bleiben zweioktavig (Namen 9,6 px), sonst verriete der Ausschnitt die
  Lage. Kleinste Schrift in Grafiken bei 320 px 9,0 px (Dreiklangstypen). Prüfung: Teilerfolg auch in der
  Rückmeldung mit eigenem Zeichen; `--part` hell #b47e08 (auf `--bg` vorher nur 2,66 : 1, jetzt 3,13).
  Bekannt, ohne Änderung: Punkte „noch offen“ blass (tragen keine Rückmeldung), ✓/✗ aus der Systemschrift
  (iOS/Android ungetestet), Fokus an einer weißen Taste der Antwort-Klaviatur dunkel nur 2,7 : 1 (nicht per Tab
  erreichbar).
- **Schritt 8.** ARCHITEKTUR (Engine, Notenzeile, Merksprüche, Fortschritt), README, CLAUDE.md (Stand, feste
  Entscheidungen 24.11.2026; Welle 9 als „auf `main`“ berichtigt), dieser Abschnitt. `sw.js` Cache -13;
  `test/sw.test.js` prüft jetzt zusätzlich, dass `PRECACHE` genau den Dateibaum (src/, css/, fonts/, icons/,
  Shell, Manifest) abdeckt und die Version mindestens -13 ist. Bildschirmfotos für die Abschlussprüfung außerhalb
  des Repos (420 px hell, 320 px dunkel, mit Verzeichnis). Prüfung: Doku gegen den Code geprüft (alle
  genannten Namen und Werte vorhanden; in ARCHITEKTUR klargestellt, dass „Blitz“ sein eigenes `DELAY_BAD`
  behält). **Zählleiste der Hilfen in Notenwerte 8 ragte bei 320 px 26 px über ihren Rahmen** (letztes
  „+“-Feld und der Satz „+ heißt ‚und‘“): unter 380 px Felder 20 statt 22 px, engere Zellen, die Spalte der
  Abbildung darf schrumpfen. Neu `docs/screens/ueberlauf.mjs`: sucht im Browser bei 320 px und 420 px in allen
  Stufen aller Pakete (Startkarte, Hilfen offen, nach der Antwort, Vorführungen), in „Lernen“, Blitz und
  Statistik jedes Element, das über seinen Rahmen hinausragt – nach der Korrektur kein Treffer (auch 360 px).
  Rechnung für die Zählleiste zusätzlich in `test/css.test.js`. `npm test` 366 grün.

**Offen für Sandra (Welle 10, nach der Umsetzung).** Gebaut ist jeweils die Voreinstellung; Punkte 1–4 der
Liste oben hat Sandra am 24.11.2026 entschieden.
1. Wortlaut „Geh Du Alter Esel Hole Fische“ (verbreitet, regional verschieden) bestätigen.
2. Ces-/Fes-Be und die siebte Tonart (Cis-/Ces-Dur) ohne Spruch lassen? (Die App zeigt die Reihe selbst.)
3. Voreinstellung des Kreuz-Spruchs: bisher der erste („Fünf Cowboys Gehen Durch Alle Einkaufs-Hallen“).
4. Eigener Spruch bleibt beim Zurücksetzen erhalten (Voreinstellung ja).
5. Reine Prime des'–des': ♭ an beiden Noten lassen (Voreinstellung) oder das zweite weglassen?
6. Wortlaut der Pausenlage „hängt unter der zweiten Linie von oben“ (dazu „das ist die vierte Linie von
   unten“) – oder ihr Wort aus dem Unterricht.
7. Stufen mit gemischtem Weiterlaufen: In Tonleitern 10/11 und Akkorde 3, 5, 6 gehen nur ein Teil der richtigen
   Antworten von selbst weiter (etwa 54 %, 59 %, 36 %, 85 %), weil die Grenze am Text hängt (`AUTO_OK_MAX` 45).
   Nach dem Test mit Kindern: Grenze je Stufe statt je Text? – Nach der Abschlussprüfung je Stufe gebaut
   (`okWaits`, siehe unten); bestätigen oder zurück.
8. „Stufe n ist offen.“ steht auch nach einer schwachen Runde, wenn die Folgestufe schon offen ist (stimmt,
   kann aber überraschen).
9. Benennung „Stufe“ (Stufe der App, Notenstufe, Stufe der Tonleiter): umbenennen („Lektion“, „Etappe“)? Nicht in
   dieser Welle.
10. Gehaltene „+“ unter langen Noten: bisher nur Schlagzahlen („1 (2)“), nicht „1 (+) (2) (+)“.

**Abschlussprüfung und Korrektur (24.11.2026).** Drei getrennte Prüfer (Lehrkraft, Jugendliche, Wissenschaft) mit
den Bildschirmfotos aus Schritt 8 und dem Code, Stand 0ea360b: kein A-Befund; alle in Welle 10 behobenen Befunde
bestätigt. Die B-Befunde (zusammen 23, viele doppelt) sind in einer Korrekturrunde behoben, je ein Commit
„Korrektur nach Prüfung aus drei Perspektiven: …“:
- Antwortknöpfe brechen nicht mehr mitten im Wort, Rahmen immer 2 px (kein Springen nach der Antwort);
  „Vorführen“ auf Handys unter dem Hilfetext; Hilfen bis 599 px (vorher 380) unter den Antwortknöpfen (ded8393).
- Noten lesen: Wort des Merkspruchs zur Stelle der Note hervorgehoben (`revealParts`, als Text), Vorzeichen-Noten
  „mit ♭: aus H wird B“, Hinweis Stufe 7 mit -is, Dis, Es, As, Des und „aus H wird B“, Bass-Satz „Dieselbe Linie
  wie im Violinschlüssel …“ (d0c9726).
- Starttaste „S“ statt „0“, `COUNT_RULE` erklärt es (deee740).
- Notenwerte: Sechzehntel-Zeile der Pyramide gebalkt je Schlag statt leer, Brüche größer, Pausen-Hilfe mit
  Zeichen nach der Antwort, Pausen-Rückmeldung mit Merkmal, weiches Trennzeichen in der Lerntafel,
  „Zählzeiten ohne neuen Ton“, Satz zur Takthälfte unter Balken, Startkarte Stufe 1 als Liste (e462864).
- Tonleitern: Startkarte 10 kurz (Reihen und Sprüche in den Hilfen), 4 und 12 nummeriert, „dieselben
  Buchstaben wie bei den Kreuzen, rückwärts: H E A D G C F (H mit ♭ heißt B)“, Stufe 1–3 daneben mit Grund
  (c2f6c09).
- Intervalle 3 und 5: Startkarten in kurzen Zeilen (56180be).
- Dreiklänge: Umkehrung mit Knopfnamen und Ton („Unten liegt H, die Quinte des E-Dur-Dreiklangs“), Startkarte
  Quintenzirkel mit Vorzeichnung (382fed6).
- Weiterlaufen nach „richtig“ je Stufe statt je Text (`okWaits`; offener Punkt 7 damit nach Voreinstellung
  „je Stufe“ gebaut, nach dem Kindertest prüfen; neu wartend auch Notenwerte 3 und 10) (7b41e03).
Nachprüfung der Korrekturrunde (24.11.2026): alle B-Befunde bestätigt behoben; zwei Entscheidungen nachgeschärft:
- Weiterlaufen je Stufe bleibt. Notenwerte 3 und 10 laufen aber wieder von selbst weiter (`autoNext: true`): Nur ein
  Text („Richtig! Sechzehntelpause (¼ Schlag im 4/4-Takt)“, 48 Zeichen) lag 3 Zeichen über der Grenze; die Stufen
  gleichen den Stufen 5, 7, 9, die weiterlaufen. Es warten nach „richtig“: Tonleitern 11, Dreiklänge 3, 5, 6.
- Startkarte Tonleitern 10: Die ganze Reihenfolge mit dem gewählten Spruch steht wieder auf der Startkarte, wie
  oben verlangt, in zwei kurzen Zeilen („♯: Fis Cis Gis Dis Ais Eis His („…“)“, „♭: B Es As Des Ges Ces Fes
  („…“ bis Ges)“); Erklärung der Be-Reihe und Tonarten-Sprüche bleiben in den Hilfen (bei 320 px 16 statt rund
  20 Zeilen, gegliedert).
Nicht geändert (Entscheidungen Sandra bzw. offen): Pausenlage-Wortlaut (Punkt 6), reine Prime mit zwei ♭
(Punkt 5), Zählleiste „(+)“ (Punkt 10), Balken je Schlag. C-Befunde (Feinschliff, spätere Wellen) bleiben in
den Berichten. `npm test` 374 grün, `docs/screens/ueberlauf.mjs` 0 Treffer bei 320 und 420 px. Cache bleibt
`notenheld-v0.2.0-13` (noch nicht veröffentlicht).

## Welle 11: Wiederholen (Voraussetzungen, Grundlagen wiederholen, Wiederholung über Tage, Jahrgang über den Lehrkraft-Link)

Ausgangsstand: Branch `wiederholen-11` (von `main` 2f3dfe8, Cache `notenheld-v0.2.0-13`, 374 Tests grün).
Grundlage: KONZEPT-gehirngerecht, „Wiederholen ist der Kern“ und „Jahrgang“ (Sandra, 24.11.2026), Mängelliste B9
und B16, Bericht Wissenschaft („Adaptive Auswahl und Stufenfolge als Ganzes“), Sandras Antworten vom 24.11.2026
(21:25) und ihre Wünsche vom 25.11.2026 (10:38, W1–W4). Die Abschnitte 1 bis 5 sind das Konzept (mit den
Entscheidungen eingearbeitet), Abschnitt 6 ist der **Feinplan** je Schritt, Abschnitt 7 hält die Entscheidungen
fest, Abschnitt 8 ist die Liste „Offen für Sandra“.

**Leitsätze (Sandra).**
1. Schülerinnen und Schüler vergessen immer wieder. Die App ist dafür da, dass jede und jeder wiederholen kann,
   was für das Neue gebraucht wird.
2. Jede Stufe kennt ihre Voraussetzungen.
3. **Nichts Gelerntes wird je gesperrt.** Keine Regel dieser Welle schließt eine Stufe, die offen war; fällige
   Wiederholungen sind ein Angebot, nie eine Schranke; der Jahrgang ordnet und öffnet, er sperrt nicht.
4. Alles bleibt auf dem Gerät: nur `localStorage`, kein Server, kein Konto.

**Entscheidungen Sandra (24.11.2026, verbindlich).**
1. Abstände 1 · 3 · 7 · 14 · 30 Tage; Runden mit 10 Aufgaben („Wiederholen“) bzw. 6 Aufgaben („Grundlagen
   wiederholen“).
2. Die Wiederholung steht auf der Startseite ganz oben.
3. Eine Wiederholungsrunde zählt für Tagesserie und Erfahrungspunkte wie eine normale Runde.
4. Das Paket „Intervalle“ kommt **vor** „Tonleitern“ (Reihenfolge überall: Startseite, Lernen, Statistik, Doku).
5. Jahrgänge 5 bis 13; Zuordnung der Stufen nach dem LehrplanPLUS (Gymnasium Bayern, Musik), Tabelle in 4.
6. Der Jahrgang wird **nur über den Lehrkraft-Link** gesetzt, geändert oder entfernt, nicht frei in der App.
7. Link **und** QR-Code für die Klasse (QR-Code im Gerät erzeugt, ohne Abhängigkeit, ohne Netz).
8. Mit gesetztem Jahrgang sind auch die Stufen innerhalb von „Jetzt dran“ sofort offen.
9. Die Runde heißt „Wiederholen“; „Grundlagen wiederholen“ bleibt.

**Wünsche Sandra (25.11.2026) – die ersten Schritte dieser Welle.**
- W1 Notenwerte: Die Frage „Wie viele Schläge im 4/4-Takt?“ klingt nach der Zahl der Schläge im ganzen Takt.
  Gemeint ist die Dauer der Note in Schlägen (im 4/4-Takt ist ein Schlag eine Viertel). Ein eindeutiger Wortlaut,
  überall gleich (Schritt 1).
- W2 „Nächste Aufgabe“ erscheint doppelt, wenn die Vorführung offen ist. Nur einmal zeigen, in allen Paketen
  (Schritt 0).
- W3 „Lernen“ mit Reitern je Inhalt (Schritt 2).
- W4 Dreiklänge bis zum Dominantseptakkord: nur als Vorgabe für das spätere Paket „Dreiklänge Schritt für
  Schritt“ notiert (eigener Abschnitt nach dieser Welle), nicht bauen.

**Übersicht: Schritt → Inhalt.**

| Schritt | Inhalt | Dateien (Schwerpunkt) |
|---|---|---|
| 0 | W2: „Nächste Aufgabe“ nur einmal | `engine.js`, `test/engine.test.js`, `ueberlauf.mjs` |
| 1 | W1: Notenwerte – Dauer in Schlägen, ein Wortlaut | `packs/notenwerte.js`, Tests |
| 2 | W3: „Lernen“ mit Reitern | `views/learn.js`, `index.html`, `style.css`, Pakete (`tab`) |
| 3 | Paketreihenfolge: Intervalle vor Tonleitern | `packs/index.js`, Tests, Skripte, Doku |
| 4 | Örtliches Datum, Felder `rep` und `klasse`, Karteikasten als reine Logik | `store.js`, neu `repeat.js` |
| 5 | Voraussetzungen in allen Paketen | Pakete (`needs`, `skill`), `repeat.js` |
| 6 | Engine: gemischte Runde | `engine.js`, `store.js`, `index.html` |
| 7 | „Grundlagen wiederholen“ und Fehlermuster | `views/practice.js`, `repeat.js` |
| 8 | Wiederholung über Tage: Karte „Heute“, Runde „Wiederholen“, Statistik | `views/home.js`, `practice.js`, `stats.js` |
| 9 | Gewichtete Auswahl in Intervalle und Tonleitern, Gewicht nach Tagen | `adapt.js`, Pakete |
| 10 | QR-Code-Modul | neu `qr.js` |
| 11 | Jahrgang: Tabelle, Link, Bestätigung, Öffnen | neu `klasse.js`, `store.js`, `app.js` |
| 12 | Lehrkraft-Seite mit Link und QR-Code, Abschnitte der Startseite | neu `views/lehrkraft.js`, `home.js` |
| 13 | Doku, Cache -14, Bildschirmfotos, Überlauf, Lauf über 40 Tage | Doku, `sw.js`, `docs/screens/*` |

### 1. Datenmodell

**Voraussetzungen (im Code der Pakete, nicht im Spielstand).**
- Neues Feld `level.needs = ["<Stufen-ID>", …]`: die **direkten** Voraussetzungen einer Stufe. Ohne das Feld gilt
  die Voreinstellung: die nächste frühere Stufe **ohne Hilfen** im selben Paket (gibt es keine: keine
  Voraussetzung). Ein gesetztes `needs` ersetzt die Voreinstellung ganz (`needs: []` = keine).
- Regeln (als Tests): Jede genannte ID gibt es. Jedes Ziel ist eine Stufe **ohne Hilfen** (dort wird abgerufen,
  nicht abgelesen). Jedes Ziel liegt im selben Paket weiter vorn oder in einem **früheren** Paket (Reihenfolge
  `PACKS`, seit dieser Welle Intervalle vor Tonleitern). Damit hat der Graph keinen Kreis.
- Je Denkschritt (optional): `steps[i].needs` an der Aufgabe bzw. `level.stepNeeds = [[…], […]]` an der Stufe
  (gilt für alle Aufgaben der Stufe). Damit weiß die App, welche Grundlage zu welchem Schritt gehört (für die
  Fehlermuster, siehe 2).
- `level.skill` (kurzer Text, was man in dieser Stufe kann, z. B. „Noten mit Vorzeichen“): steht in der Zeile
  „Dafür brauchst du: …“. Fehlt er, gilt der Titel der Stufe.
- Neues reines Modul `src/repeat.js` (siehe Schritte 4, 5, 7).

**Kanten** (am 25.11.2026 an den Aufgabenvorräten nachgeprüft: Schlüssel, Vorzeichen und Knöpfe jeder Stufe aus
je 400 erzeugten Aufgaben; alle genannten IDs gibt es; Reihenfolge der Pakete: Noten lesen, Notenwerte und
Pausen, Intervalle, Tonleitern, Dreiklänge und Quintenzirkel). Die Tabelle nennt **jede** Stufe; sie ist die
Vorgabe für `needs` und wird als Ganzes getestet.

| Stufe | braucht (`needs`) | weil (am Vorrat geprüft) |
|---|---|---|
| `noten-1`, `-2`, `-4`, `-5` | – | Einstieg je Schlüssel (Linien, Zwischenräume) |
| `noten-3` | `noten-1`, `noten-2` | 13 Noten: Linien, Zwischenräume und Hilfslinien |
| `noten-6` | `noten-4`, `noten-5` | dasselbe im Bassschlüssel |
| `noten-7` | `noten-3` | 8 Noten mit ♯/♭ im Violinschlüssel |
| `noten-8` | `noten-3`, `noten-6`, `noten-7` | beide Schlüssel, alle Lagen, Vorzeichen |
| `notenwerte-1`, `-2`, `-3` | – | Einstieg (1 und 2 mit Hilfen, 3 ist die erste ohne) |
| `notenwerte-4`, `-5` | `notenwerte-3`; Stufe 4: Schritt 1 → `notenwerte-3` | Dauer setzt das Erkennen von Noten und Pausen voraus |
| `notenwerte-6` | `notenwerte-3`, `notenwerte-5`; Schritt 1 → `-3`, Schritt 2 → `-5` | Notenwert ohne Punkt erkennen; Dauer |
| `notenwerte-7` | `notenwerte-5` | Dauer ohne Punkt |
| `notenwerte-8`, `-9` | `notenwerte-5`, `notenwerte-7`; Schritt 1 und 2 (Stufe 8) → beide | Dauern zusammenzählen, auch punktierte; Wert zur Dauer |
| `notenwerte-10` | `notenwerte-3`, `-5`, `-7`, `-9` | mischt genau diese vier Stufen |
| `intervall-1` | `noten-3` | nur Violinschlüssel, keine Vorzeichen (0 von 400), c' bis a'' |
| `intervall-2` | `noten-3`, `noten-6` | beide Schlüssel, keine Vorzeichen, E bis a'' |
| `intervall-3`, `-4` | `intervall-2`, `noten-7`; Schritt 1 → `intervall-2` | Grobbestimmung = Notenstufen zählen; Noten mit Vorzeichen. Schritt 2 (Halbtöne zählen) wird in Stufe 3 selbst mit Klaviatur und Tabelle eingeführt, siehe Hinweis unten |
| `intervall-5`, `-6` | `intervall-4`; Schritt 1 → `intervall-2`, Schritt 2 → `intervall-4` | rein, klein, groß vor vermindert und übermäßig |
| `intervall-7` | `intervall-6`; Schritt 1 → `intervall-2`, Schritt 2 → `intervall-6` | abwärts, mit verminderten und übermäßigen |
| `intervall-8` | `intervall-6`, `noten-7` | bestimmen vor bauen (gebaut werden auch verminderte und übermäßige); Schreibweise der Namen |
| `intervall-9` | `intervall-7`, `noten-7` | auf- und abwärts bauen |
| `intervall-10` | `intervall-9` | Fehler in gebauten Intervallen finden |
| `tonleitern-1` | `noten-3`, `noten-6` | C-Dur in **beiden** Schlüsseln (c bis c''), ohne Vorzeichen |
| `tonleitern-2` | `noten-7` | G-, D-, F-, B-Dur im Violinschlüssel, jede Aufgabe mit Vorzeichen an den Noten |
| `tonleitern-3` | `noten-6`, `noten-7` | 9 Tonarten, beide Schlüssel, Vorzeichen an den Noten |
| `tonleitern-4`, `-5` | `tonleitern-3`, `noten-7`; Stufe 4: Schritt 1 → `tonleitern-3`, Schritt 2 → `noten-7` | Ganz-/Halbtonschritt; Namen mit Vorzeichen |
| `tonleitern-6`, `-7` | `tonleitern-5` | falschen Ton finden setzt die Dur-Tonleitern voraus |
| `tonleitern-8`, `-9` | `tonleitern-5` | Vorzeichen der Tonleiter ablesen (nicht `-7`: „passt nicht“ wird dafür nicht gebraucht) |
| `tonleitern-10`, `-11` | `tonleitern-9` | Tonart aus den Vorzeichen setzt die Vorzeichen der Tonleitern voraus |
| `tonleitern-12`, `-13` | `intervall-2`, `tonleitern-3`; Stufe 12: Schritt 1 → `intervall-2`, Schritt 2 → `tonleitern-3` | Terz abwärts als drei Notenstufen; drei Halbtöne zählen. Mit „Intervalle vor Tonleitern“ zeigt die Kante jetzt auf ein früheres Paket |
| `akkorde-1` | `intervall-4`, `noten-8` | große und kleine Terz (KONZEPT: „Dreiklänge → Terzen“); Dreiklänge in beiden Schlüsseln mit Vorzeichen |
| `akkorde-2` | `akkorde-1`, `intervall-4` | vier Typen aus großen und kleinen Terzen |
| `akkorde-3` | `noten-8` | Grundton in der Grundstellung: prüft das Notenlesen (Vorgabe Sandra, 20.11.) |
| `akkorde-4` | `akkorde-1`, `intervall-2` | Sexte bzw. Quarte und Sexte über dem Basston (Notenstufen zählen) |
| `akkorde-5` | `tonleitern-11` | Tonarten bis 7 Vorzeichen |
| `akkorde-6` | `tonleitern-9`, `akkorde-2` | Tonleiter mit Vorzeichen; Dreiklangstypen (VII. Stufe vermindert) |

Hinweis zur geänderten Reihenfolge: Im Entwurf verwies Schritt 2 der Intervalle 3/4 („Halbtöne zählen“) auf
`tonleitern-3`. Seit „Intervalle“ vor „Tonleitern“ steht, zeigte das auf ein späteres Paket und entfällt. Wer in
Intervalle 4 (ohne Hilfen) im zweiten Schritt danebenliegt, bekommt Stufe 3 (dieselbe Aufgabe mit Klaviatur und
Tabelle) angeboten, nicht eine Tonleiter-Stufe. Offen für Sandra (Abschnitt 8): Sollen die Stufen „Ganz- und
Halbtonschritte“ (heute Tonleitern 1–3) vor Intervalle 3 liegen?

Das Paket „Dreiklänge Schritt für Schritt“ bringt seine Kanten selbst mit (Terzen schichten → `intervall-4`).

**Spielstand (`notenheld.v2`, nur zusätzliche Felder, kein neuer Schlüssel).**
- `rep: { "<Stufen-ID>": { fach: 1…5, faellig: "JJJJ-MM-TT", zuletzt: "JJJJ-MM-TT" } }` – Wiederholung über Tage,
  je Stufe ohne Hilfen (siehe 3). Wird beim Zurücksetzen gelöscht (Fortschritt).
- `klasse: null | { jahrgang: 5…13, zweig: "mug" | null, dran: { noten: 8, notenwerte: 10, intervalle: 4, … } }`
  – über den Lehrkraft-Link gesetzt (siehe 4). `dran` wird beim Übernehmen vollständig eingetragen (nicht bei
  jedem Laden aus der Tabelle neu berechnet), damit ein Update der Tabelle die Einstellung nicht stillschweigend
  ändert. **Bleibt beim Zurücksetzen erhalten.**
- Vorhanden und endlich genutzt: `notes[key].last` und `.hist` (je Aufgabe bzw. Note).
- Einmalige Umstellung mit Marker `"wiederholen"`: Für jede schon geschaffte Stufe ohne Hilfen (beste Runde
  ≥ 8) entsteht ein Eintrag in Fach 1. Die Fälligkeiten werden verteilt: Stufen in der Reihenfolge der Pakete
  (Grundlagen zuerst), je Tag höchstens so viele, wie eine Wiederholungsrunde fasst (3), beginnend heute.
- Datum: `today()` rechnet heute in UTC (der Tag wechselt in Malaysia um 8 Uhr morgens, in Bayern um 1 bzw.
  2 Uhr nachts). Für Fälligkeiten und die Tagesserie gilt künftig das **örtliche Datum**; alte Einträge bleiben
  gültig, die Serie reißt bei der Umstellung nicht ab (Schritt 4).

### 2. „Grundlagen wiederholen“

**Was es ist.** Eine kurze Runde (Startwert 6 Aufgaben) aus den direkten Voraussetzungen einer Stufe, gleich
verteilt, innerhalb jeder Voraussetzung bevorzugt die Aufgaben, die noch nicht sitzen oder lange nicht dran
waren. Ohne Hilfen, mit Auflösung und Warten nach „daneben“ (Welle 10). Es gibt Erfahrungspunkte (10 je richtige
Antwort) und die Runde zählt für die Tagesserie, aber es gibt keine Sterne und keine Freischaltung; jede Antwort
zählt in der Statistik ihrer eigenen Stufe. Der Karteikasten (siehe 3) ändert sich durch diese Runde nicht.

**Technische Voraussetzung.** Die Engine führt heute eine Runde für genau eine Stufe (Eingabeart, `check`,
Ziffern, Namensraster hängen an der Stufe). Für gemischte Runden trägt jede Aufgabe ihre Herkunft (`q.from` =
Stufe); die Engine stellt Eingabe und Prüfung je Aufgabe um. Das ist der größte Eingriff dieser Welle (Schritt 6,
vor allem, was darauf aufbaut), mit Tests für jede Eingabeart im Wechsel (Buchstaben, Klaviatur, Namensraster, Auswahlknöpfe, zwei
Schritte).

**Wann es angeboten wird.**
1. **Auf der Startkarte jeder Stufe mit Voraussetzungen**, immer sichtbar und unaufdringlich: „Dafür brauchst
   du: Noten mit Vorzeichen · Notenstufen zählen (Prime bis Oktave)“ und der Knopf „Grundlagen wiederholen (6 Aufgaben)“. Hervorgehoben
   (als Empfehlung vor „Runde starten“), wenn eine Voraussetzung nie gespielt wurde, fällig ist (siehe 3) oder
   zuletzt unter 8 von 10 lag. Nie Pflicht.
2. **Nach einer Runde mit weniger als 5 Richtigen** (kein Stern): auf der Ergebniskarte als erster Knopf.
3. **Nach Fehlern, die auf eine Lücke deuten.** Die Runde merkt sich je Voraussetzung, wie oft der zugehörige
   Denkschritt daneben lag (`stepNeeds`; bei einschrittigen Stufen `level.needs` als Ganzes). Ab drei
   solchen Fehlern in einer Runde (Startwert) nennt die Ergebniskarte den Grund und bietet genau diese Grundlage
   an: „Dreimal lag der erste Schritt daneben (Notenstufen zählen). Das übst du in Intervalle, Stufe 2.“ Knöpfe:
   „Grundlagen wiederholen“ und „Stufe 2 öffnen“. Erste Muster (aus den Rückmeldungen, die es schon gibt):
   - Intervalle 3–7: Schritt 1 daneben („Die Halbtöne stimmen, die Zahl nicht“) → `intervall-2`; Schritt 2
     daneben → in Stufe 5/6 `intervall-4`, in Stufe 7 `intervall-6`; in Stufe 4 keine Grundlage, sondern das
     Angebot „Stufe 3 mit Hilfen üben“ (Stufe 3 hat die Hilfen selbst).
   - Tonleitern 4: Schritt 1 daneben („Der Ton stimmt, der Schritt nicht“) → `tonleitern-3`; Name daneben →
     `noten-7`. Tonleitern 5 (ein Schritt): beide als Ganzes.
   - Tonleitern 12: Stammton daneben → `intervall-2`; Molltonart daneben → `tonleitern-3`. Tonleitern 13 (ein
     Schritt): beide als Ganzes.
   - Notenwerte 4, 6: Notenwert daneben → `notenwerte-3`; Notenwerte 8: Zählen daneben → `notenwerte-5`/`-7`.
   Feinere Muster (z. B. „immer einen Halbton zu viel“ = Starttaste mitgezählt) brauchen die gewählte Antwort im
   Rundenprotokoll und sind eine Ausbaustufe (nicht in dieser Welle).
4. Eine geöffnete, aber nie gespielte Voraussetzung (z. B. über den Jahrgang, siehe 4) zählt als „nie gespielt“
   und führt zu Punkt 1.

Das Angebot verschwindet für diese Stufe, sobald die Grundlagen-Runde mit höchstens einem Fehler gespielt wurde,
und kommt wieder, wenn einer der Auslöser erneut zutrifft.

### 3. Wiederholung über Tage

**Warum so.** Gut belegt sind zwei Dinge: Verteiltes Üben über Tage behält man besser als dieselbe Menge am
Stück, und selbst abrufen (eine Aufgabe lösen) wirkt stärker als noch einmal ansehen. Beides nennt auch der
Bericht Wissenschaft. Ob wachsende Abstände gleichmäßigen überlegen sind, ist in der Forschung nicht eindeutig;
wachsende Abstände sind aber sparsam (Sicheres kommt selten, Wackliges oft) und das übliche einfache Verfahren
(Karteikasten nach Leitner). Aufwendigere Verfahren mit Werten je Karte (SM-2, FSRS) passen hier schlecht: Die
Vorräte sind groß (bis 1198 Aufgaben je Stufe) und es geht um Fertigkeiten, nicht um einzelne Fakten.

**Einheit ist die Stufe ohne Hilfen**, nicht die einzelne Aufgabe. Innerhalb der Stufe wählt die vorhandene
gewichtete Auswahl (`adapt.js`) die Aufgaben.

**Karteikasten mit fünf Fächern.** Abstände (Startwerte, als Konstante, nach dem Test mit Kindern nachstellen):

| Fach | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| wieder fällig nach | 1 Tag | 3 Tagen | 7 Tagen | 14 Tagen | 30 Tagen |

- Eine Stufe kommt in Fach 1, sobald sie geschafft ist (beste Runde ≥ 8), fällig am nächsten Tag. Stufen mit Hilfen kommen nicht in
  den Kasten; für sie steht die Stufe ohne Hilfen danach.
- **Wiederholungsrunde „Wiederholen“** (10 Aufgaben): aus den am längsten fälligen Stufen, höchstens **drei**
  Stufen je Runde (4 + 3 + 3 Aufgaben; bei zwei fälligen Stufen 5 + 5, bei einer 10), gemischt (vermischtes
  Üben). Stufen mit nur zwei Antwortknöpfen (Raten) bekommen den größeren Anteil, mindestens 4 Aufgaben.
  Urteil je Stufe: bei n Aufgaben höchstens ⌊n / 5⌋ Fehler → „sitzt“, ein Fach weiter, fällig nach dem neuen
  Abstand (bei 3 oder 4 Aufgaben also alle richtig, bei 5 eine daneben erlaubt, bei 10 zwei – das entspricht
  8 von 10). Sonst ein Fach zurück (nicht unter 1), morgen wieder fällig, und die Ergebniskarte bietet die Stufe
  zum Üben an. Die Runde zählt für Tagesserie und Erfahrungspunkte wie eine normale Runde (10 je richtige
  Antwort und der Bonus 20 · Sterne nach `starsFor`); Sterne werden bei keiner Stufe eingetragen.
- Eine normale Runde in einer fälligen Stufe mit ≥ 8 Richtigen zählt wie eine bestandene Wiederholung. Ist die
  Stufe nicht fällig, ändert die Runde das Fach nicht (viel am selben Tag soll den Abstand nicht verlängern).
- Fach 5 ist nicht „fertig“: Die Stufe kommt weiter alle 30 Tage (Leitsatz 1).
- Nach langer Pause (Ferien) ist vieles fällig. Die App zeigt dann nicht die ganze Menge als Schuld, sondern
  immer nur die nächste Runde; die Reihenfolge ist „am längsten fällig zuerst“, Grundlagen vor dem, was auf
  ihnen aufbaut (Kanten aus 1).
- **Auswahl der Aufgaben:** `pickWeighted` wirkt heute nur in „Noten lesen“. `statKey`s schreiben außerdem
  „Intervalle“ und „Tonleitern“ (nachgeprüft: „Notenwerte und Pausen“ und „Dreiklänge“ schreiben keine). Künftig
  gewichten auch Intervalle und Tonleitern (Schritt 9); dazu steigt das Gewicht einer sicheren Aufgabe mit den
  Tagen seit `last` (Startwert: ab 7 Tagen wie „neu“). „Nie dieselbe Aufgabe zweimal hintereinander“, der
  Zufallsanteil und die Regeln der Vorräte (Gruppen, Anteil der Halbtonschritte, „Prime höchstens einmal“)
  bleiben.
- Was fällig ist, sperrt nichts: Jede Stufe lässt sich jederzeit starten, die Wiederholung jederzeit
  überspringen.

### 4. Jahrgang über den Lehrkraft-Link

**Heute:** `grade` steht fest im Code der Pakete („Klasse 5–7“, „Klasse 9–12“ …), wird nirgends angezeigt und
ist laut Prüfung teils zu hoch gegriffen (B16). KONZEPT: keine Jahrgangsstufen an den Stufen, die Lehrkraft
entscheidet, wie weit es geht.

**Neu:** `grade` entfällt. Was „dran“ ist, bestimmt die Einstellung `klasse` – und die kommt **nur** über den
Link der Lehrkraft auf das Gerät (Entscheidung 6).

**Wie die Lehrkraft den Link erzeugt.** Eigene Seite „Für Lehrkräfte“ (Ansicht `lehrkraft`, Adresse
`…/notenlernapp/#lehrkraft`, kein Reiter in der unteren Leiste; erreichbar über die Adresse und über einen
unauffälligen Textlink „Für Lehrkräfte“ am Ende der Statistik). Dort: Jahrgang 5 bis 13 wählen, wahlweise
„Musisches Gymnasium“, darunter je Paket „dran bis Stufe n“ (vorbelegt aus der Tabelle unten, zum Nachstellen).
Die Seite zeigt den Link als Text („Link kopieren“) und als QR-Code (für die Tafel, „groß zeigen“), dazu einen
zweiten Link samt QR-Code „Jahrgang wieder entfernen“. **Die Seite setzt nichts auf dem eigenen Gerät**: Sie
erzeugt nur Link und Code. Es gibt in der App keinen Schalter, mit dem Schülerinnen und Schüler den Jahrgang
ändern.

**Form des Links** (nur diese Angaben, keine Namen, keine Ergebnisse; nichts verlässt das Gerät):
- `#klasse=6` – Jahrgang 6 mit der Voreinstellung der Tabelle.
- `#klasse=6&zweig=mug` – Voreinstellung für das Musische Gymnasium.
- `#klasse=6&dran=intervalle:6,akkorde:1` – eigener Zuschnitt; genannt werden nur die Pakete, die von der
  Voreinstellung abweichen (kurzer Link, kleiner QR-Code). `n` von 0 (nichts aus dem Paket) bis zur Zahl der
  Stufen.
- `#klasse=keine` – entfernt den Jahrgang.

**Auf dem Gerät des Kindes.** Öffnet es den Link (oder scannt den Code), fragt die App **einmal**:
„Einstellung deiner Lehrkraft übernehmen? Jahrgang 6“ mit „Übernehmen“ und „Nicht übernehmen“. Erst nach
„Übernehmen“ wird `klasse` gespeichert; danach verschwindet die Angabe aus der Adresszeile
(`history.replaceState`), damit ein Neuladen nicht noch einmal fragt. Ist dieselbe Einstellung schon gesetzt,
fragt die App nicht. Ein Link mit unbekannten oder fehlerhaften Angaben wird als Ganzes verworfen (Hinweis „Der
Link passt nicht zu dieser App-Version.“), der Spielstand bleibt unberührt.

**Entfernen** (Feinplan-Entscheidung, passend zu „nur über den Lehrkraft-Link“): nur über den Link
`#klasse=keine`, wieder mit einer Bestätigung („Jahrgang entfernen? Dein Fortschritt bleibt, es schließt sich
nichts.“). „Fortschritt zurücksetzen“ lässt die Einstellung stehen. Ehrlich gesagt gehört dazu: Der Link ist
eine Adresse, kein Schloss – wer ihn kennt, kann ihn öffnen; ein echter Schutz ginge nur mit einem Server.

**Zuordnung Jahrgang → „dran“** (eine Tabelle an einer Stelle, `src/klasse.js`; die Lehrkraft kann sie über den
eigenen Zuschnitt überschreiben). Quelle: LehrplanPLUS Gymnasium Bayern, Fachlehrplan Musik, abgerufen am
25.11.2026, jeweils Lernbereich 4 „Musik und ihre Grundlagen“, „Inhalte zu den Kompetenzen“ (wörtliche Zitate
in Anführungszeichen):

- Jahrgang 5, <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/5/musik> (Mu5 Lernbereich 4):
  „Tonhöhen im Violin- und Bassschlüssel, Kreuz- und b-Vorzeichen, Auflösungszeichen; einzeilig und in
  zweizeiligen Partituren“ · „Noten- und Pausenwerte bis zum Sechzehntelwert“ · „Dur-Tonleitern mit
  unterschiedlichen Grundtönen“ · „Ganz- und Halbtonschritt, diatonische Intervalle, Dur-Dreiklang (Grundform)“.
  Kompetenzerwartung: „lesen und schreiben traditionelle Notenschrift, um einfache musikalische Abläufe adäquat
  erfassen bzw. darstellen zu können.“
- Jahrgang 6, <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/6/musik> (Mu6 Lernbereich 4):
  „Intervalle bis zur Oktave: rein, groß und klein“ · „Tonleitern und Dreiklänge in Dur und Moll;
  Dreiklangsumkehrung“ · „Aspekte der Rhythmik/Metrik: Triole, Taktwechsel, zusammengesetzte Taktarten, z. B.
  7/8- oder 5/4-Takt“ · nur Musisches Gymnasium: „(MuG) übermäßige und verminderte Intervalle“.
  Kompetenzerwartungen u. a.: „bestimmen Intervalle in schriftlicher Form genau.“ · „differenzieren verschiedene
  Tonvorräte im Moll-Bereich.“
- Jahrgang 7, <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/7/musik> (Mu7 Lernbereich 4):
  „Aspekte der Harmonik: Einfache Kadenz, Haupt- und Nebenstufen“ · „Aspekte der Rhythmik/Metrik: Synkope,
  Off-Beat, …“ · nur MuG: „(MuG) Dominantseptakkord und seine Umkehrungen“. Kompetenzerwartung (alle):
  „beschreiben das Verhältnis von Haupt- und Nebenstufen und verwenden sie, ebenso wie den Dominantseptakkord,
  bei der Liedbegleitung auf der Grundlage von Akkordsymbolen.“
- Jahrgang 8, <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/8/musik>: keine neuen Inhalte der
  Notenlehre (Popularmusik, Filmmusik, Musik anderer Kulturkreise; MuG: Naturtonreihe).
- Jahrgang 9, <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/9/musik> (Mu9 Lernbereich 4): nur
  MuG: „(MuG) Aspekte der harmonischen Analyse: verminderte Akkorde, verschiedene Septakkorde, Nonakkord;
  Zwischendominante, Modulation“.
- Jahrgang 10, <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/10/musik>: nur MuG: „(MuG)
  beschreiben und bilden Akkordstrukturen auch in einfacher Generalbass-Notation.“
- Jahrgang 11 (G9: 11 bis 13 sind die Oberstufe), <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/11/musik>:
  keine Inhalte der Notenlehre aus dem Umfang der App.
- Jahrgang 12, <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/12/musik/grundlegend> und
  <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/12/musik/erhoeht>; Jahrgang 13,
  <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/13/musik/grundlegend> und
  <https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/13/musik/erhoeht>: keine Inhalte aus dem Umfang der
  App (12 erhöht: Quadratnotation, modale Tonvorräte; 13: Generalbass).

Was im Lehrplan 5 bis 13 **nicht wörtlich** vorkommt (auf den genannten Seiten nachgesehen): punktierte Noten,
die Taktart 4/4 als eigener Inhalt (Mu5 Lernbereich 3 nennt „Taktart, Notenwerte“ nur als Beispiele für
Variation), die Wörter „Quintenzirkel“, „Tonart“ und „parallele Molltonart“, verminderte und übermäßige
**Dreiklänge** (nur MuG 9: „verminderte Akkorde“), die Zahl der Vorzeichen bei den Dur-Tonleitern.

Tabelle (Zahl = „dran bis Stufe n“ des Pakets, 0 = noch nichts; jeder Jahrgang enthält alles Frühere; nichts
wird je gesperrt):

| Jahrgang | Noten lesen (8) | Notenwerte und Pausen (10) | Intervalle (10) | Tonleitern (13) | Dreiklänge und Quintenzirkel (6) | Quelle und Begründung |
|---|---|---|---|---|---|---|
| 5 | 8 | 10 | 2 | 9 | 0 | Mu5 LB 4. Noten lesen 1–8: Violin- und Bassschlüssel, ♯/♭. Notenwerte 1–5: Werte und Pausen bis zum Sechzehntel; **6–10 (Punktierung, Takt füllen) nicht wörtlich genannt**, der Kompetenzerwartung „lesen und schreiben traditionelle Notenschrift …“ zugeordnet [OFFEN Sandra]. Intervalle 1–2: „diatonische Intervalle“ (nur die Zahl, ohne Vorzeichen). Tonleitern 1–3: „Ganz- und Halbtonschritt“, 4–9: „Dur-Tonleitern mit unterschiedlichen Grundtönen“ (App: bis 4 Vorzeichen; Zahl im Lehrplan offen). Dreiklänge: „Dur-Dreiklang (Grundform)“ hat in der App keine eigene Stufe (Stufe 1 fragt Dur **oder Moll**) → 0 [OFFEN Sandra] |
| 6 | 8 | 10 | 4 (MuG: 10) | 13 | 4 | Mu6 LB 4. Intervalle 3–4: „rein, groß und klein“; 5–10 enthalten alle verminderte und übermäßige Intervalle → nur MuG. Tonleitern 12–13 (parallele Molltonart): „Tonleitern … in Dur und Moll“ (Auslegung); **10–11 (Tonart aus den Vorzeichen, 15 Tonarten) nicht wörtlich genannt**, liegen in der Reihe davor [OFFEN Sandra]. Dreiklänge 1, 3, 4: „Dreiklänge in Dur und Moll; Dreiklangsumkehrung“; **Stufe 2 (vermindert, übermäßig) nicht genannt**, liegt in der Reihe davor [OFFEN Sandra] |
| 7 | 8 | 10 | 4 (MuG: 10) | 13 | 6 | Mu7 LB 4. Dreiklänge 6: „Haupt- und Nebenstufen“; **Stufe 5 (Quintenzirkel) im Lehrplan nicht genannt**, liegt in der Reihe davor [OFFEN Sandra]. Dominantseptakkord: kommt mit dem Paket „Dreiklänge Schritt für Schritt“ |
| 8 bis 13 | 8 | 10 | 4 (MuG: 10) | 13 | 6 | Mu8 bis Mu13: keine weiteren Inhalte aus dem Umfang der App; alles ist Wiederholung. Intervalle 5–10 sind außerhalb des MuG in keinem Jahrgang zugeordnet und bleiben deshalb „Darüber hinaus“ (offen nach der üblichen Regel, über den eigenen Zuschnitt jederzeit als „dran“ wählbar) [OFFEN Sandra] |

Die Angabe ist je Paket eine Zahl („bis Stufe n“). Darum zieht eine spätere Stufe die Stufen davor mit (Dreiklänge
2 und 5, Tonleitern 10–11). Das ist als [OFFEN Sandra] markiert und über den eigenen Zuschnitt änderbar; mit dem
Paket „Dreiklänge Schritt für Schritt“ wird die Reihe ohnehin neu geordnet.

**Was die Einstellung ändert.**
1. Die Startseite ordnet in drei Abschnitte: „Jetzt dran“ (die Stufen, die in diesem Jahrgang neu dazukommen
   und noch nicht geschafft sind: über „dran“ des Jahrgangs davor, bis „dran“), darunter „Schon dran gewesen“
   (alles Frühere und das Geschaffte), darunter „Darüber hinaus“ (eingeklappt).
2. „Weiter üben“ schlägt die nächste Stufe aus „Jetzt dran“ vor.
3. **Alles bis „dran“ ist sofort offen** (Entscheidungen 6 und 8), auch wenn es auf diesem Gerät nie gespielt
   wurde – die Stufen in „Jetzt dran“ ebenso wie alles Frühere. Eine Schülerin der 7. Klasse muss sich nicht
   durch „Noten lesen 1“ spielen, kann es aber jederzeit wiederholen. Nie gespielte frühere Stufen erscheinen
   als Grundlagen (siehe 2), nicht als Rückstand.
4. In der Statistik steht der Jahrgang als Hinweis.
- **Was sich nie ändert.** Fortschritt, Sterne, Erfahrungspunkte, Karteikasten und alles schon Offene bleiben,
  egal wie die Einstellung gesetzt, geändert oder entfernt wird. „Darüber hinaus“ ist nicht gesperrt: Es gilt die
  bisherige Freischaltung (8 von 10 bzw. „Alle Stufen öffnen“). Ohne Einstellung verhält sich die App wie
  heute. Die Einstellung übersteht „Zurücksetzen“ und wird beim Laden nie stillschweigend geändert.
- Tests: Für jede Einstellung und jeden Spielstand gilt `offenMitKlasse ⊇ offenOhneKlasse` (die Einstellung
  öffnet nur); Wechsel 7 → 5 → keine schließt keine gespielte oder nach der üblichen Regel offene Stufe; Link
  mit unbekannten oder fehlerhaften Angaben wird verworfen, ohne den Spielstand anzufassen.

### 5. Oberfläche in Worten

- **Startseite, ganz oben** (Entscheidung 2, statt der großen Trefferquote): eine Karte „Heute“. Ist etwas
  fällig: „Wiederholen · 10 Aufgaben aus Intervalle 4, Tonleitern 5 und Noten lesen 7“ mit dem Knopf
  „Wiederholung starten“; daneben „Weiter üben: Tonleitern, Stufe 6“. Ist nichts fällig: nur „Weiter üben“ und
  klein „Nächste Wiederholung morgen“. Kein Zähler für Versäumtes, keine roten Marken.
- **Stufenkarten:** kleines Zeichen „↻“ mit Text „wieder dran“ an fälligen Stufen; Abschnitte „Jetzt dran“,
  „Schon dran gewesen“, „Darüber hinaus“, wenn ein Jahrgang gesetzt ist. Pakete in der neuen Reihenfolge.
- **Startkarte einer Stufe:** Zeile „Dafür brauchst du: …“ (antippbar, führt zur Stufe) und „Grundlagen
  wiederholen (6 Aufgaben)“; als Empfehlung hervorgehoben, wenn einer der Auslöser zutrifft.
- **Runde „Wiederholen“ bzw. „Grundlagen wiederholen“:** wie eine normale Runde; über der Notenzeile steht
  klein, woher die Aufgabe kommt („Intervalle · Stufe 4“). Keine Hilfen, aber nach „daneben“ die Auflösung und
  auf der Ergebniskarte der Knopf „Stufe 3 mit Hilfen üben“ bzw. „Stufe 5 üben“.
- **Ergebniskarte:** je Stufe eine Zeile „sitzt · wieder in 7 Tagen“ bzw. „noch wacklig · morgen noch einmal“;
  bei einem Fehlermuster der Satz mit dem Grund (siehe 2).
- **Statistik:** je Stufe das Fach als fünf kleine Kästchen und „zuletzt geübt am …“; am Ende der Textlink „Für
  Lehrkräfte“ und, wenn gesetzt, „Jahrgang 6 (über den Link deiner Lehrkraft)“.
- **Lernen:** Reiter je Inhalt (W3).
- **Für Lehrkräfte:** eigene Seite mit Jahrgang, „dran bis Stufe n“ je Paket, Link und QR-Code (im Gerät
  erzeugt). Der Knopf „Alle Stufen öffnen (Demo)“ bleibt, wo er ist.
- Tonfall wie bisher: „du“, sachlich, kein Druck („wieder dran“, nicht „überfällig“). Die Seite „Für
  Lehrkräfte“ spricht Lehrkräfte mit „Sie“ an (Abschnitt 8).

### 6. Feinplan je Schritt

Für alle Schritte gilt: je Schritt ein Opus-Agent (eine Sitzung, etwa 1 bis 3 Stunden), danach Prüfung durch
Fable, erst dann der nächste Schritt (mehrere Schritte fassen `engine.js`, `practice.js`, `home.js`, `style.css`
an). `npm test` grün, Wortliste (`test/texte.test.js`), keine Konsolenfehler, bei laufendem Server
`node docs/screens/ueberlauf.mjs` mit 0 Treffern, Commit auf Deutsch. Kein Push ohne Sandras Ja. Musiktheorie,
Lehrplan und Daten nicht erfinden: Unsicheres im Commit vermerken und in Abschnitt 8 nachtragen. Stufen-IDs,
Aufgabenvorräte und `statKey`s bleiben unverändert.

#### Schritt 0 – W2: „Nächste Aufgabe“ nur einmal

**Ursache.** Seit Welle 10 zeigt `finishQuestion` (`src/engine.js`, Zeile 561–564) in jeder Stufe mit Hilfen
den Knopf `ui.next` (`#pNext`, `index.html` Zeile 93) unter den Antwortknöpfen. `openDemo` (`src/engine.js`,
Zeile 592) setzt zusätzlich einen zweiten Knopf in die Hilfe-Karte:
`<button class="btn primary wide" data-demo-next>${DEMO_NEXT}</button>`. Vor Welle 10 gab es `#pNext` in diesem
Zustand nicht; jetzt stehen beide untereinander (Bildschirmfoto `2026-11-25_intervalle-naechste-aufgabe-doppelt.png`).
Betroffen ist jede Stufe mit `level.demo`: Notenwerte 1, 4, 6, 8; Intervalle 1, 3, 5, 8; Tonleitern 1, 2, 4, 6,
8, 10, 12.

**Lösung.** Zu jedem Zeitpunkt ist genau ein Knopf „Nächste Aufgabe“ sichtbar – der, der beim Lesen am nächsten
liegt:
- Vorführung zu: nur `ui.next` (wie heute).
- Vorführung offen: `openDemo` setzt `ui.next.hidden = true`; der Knopf am Ende der Vorführung
  (`data-demo-next`) bleibt. Grund: Auf Handys (unter 600 px) steht die Hilfe-Karte **unter** den Antwortknöpfen
  (`#pHelps { order: 1 }`, `css/style.css` Zeile 298); wer die Vorführung zu Ende gesehen hat, ist dann beim
  Knopf. Enter und Leertaste gehen weiter wie bisher (`handleKey`).
- `r.advance` versteckt `ui.next` schon; nach dem Weitergehen ist keiner der beiden mehr da (die Hilfen werden
  mit der nächsten Aufgabe neu aufgebaut).
- „Weiter zu Schritt 2“ (`NEXT_STEP`) ist nicht betroffen: Vor der letzten Antwort lässt sich keine Vorführung
  öffnen (`r.answered`).

**Tests.**
- `test/engine.test.js`, neu „Nächste Aufgabe steht nur einmal da (alle Pakete)“: für **jede** Stufe aller
  Pakete aus `PACKS` mit `level.demo` eine Runde mit `runLevel` (vorhandenes Hilfsmittel, unechte Elemente)
  starten, die erste Aufgabe beantworten (alle Schritte), prüfen: `ui.next.hidden === false` und kein
  `[data-demo-next]` im Hilfe-Bereich; „Vorführen“ auslösen, prüfen: `ui.next.hidden === true` und genau ein
  `[data-demo-next]`; darauf tippen, prüfen: nächste Aufgabe, `ui.next.hidden === true`. Dazu für jede Stufe
  **ohne** `demo`: nach einer Antwort daneben ist `ui.next` sichtbar, einen zweiten Knopf gibt es nie.
- Bestehender Test (Zeile 690–720) bleibt, ergänzt um `ui.next.hidden === true` nach „Vorführen“.
- `docs/screens/ueberlauf.mjs`: in `chk` zusätzlich zählen, wie viele **sichtbare** Knöpfe mit dem Text
  „Nächste Aufgabe“ es gibt; mehr als einer ist ein Treffer („doppelter Knopf“). Damit ist jeder Zustand jeder
  Stufe bei 320 und 420 px abgedeckt.

**Abnahme.** Intervalle 3 wie auf dem Bildschirmfoto (Hilfen offen, Vorführung offen): ein Knopf. Vorführung
zu: ein Knopf unter den Antworten. In allen fünf Paketen bei 320 und 420 px kein Zustand mit zwei Knöpfen.

**Umgesetzt (25.11.2026, Opus).** Wie geplant: `openDemo` verbirgt `ui.next`, es bleibt der Knopf am Ende der
Vorführung (Voreinstellung aus Abschnitt 8, Punkt 2). Ergänzt, weil Sandra Handys (320 px, Hilfen unter den
Antworten) und Tastatur ausdrücklich nannte:
- **Fokus.** „Vorführen“ verschwindet beim Öffnen der Vorführung; hatte er den Fokus, geht er auf „Abspielen“.
  Verschwindet der gedrückte Knopf „Nächste Aufgabe“ (unter den Antworten oder am Ende der Vorführung), geht der
  Fokus auf den Antwortbereich (`#pAnswers`, jetzt `tabindex="-1"`), nicht auf `<body>`; bewusst nicht auf einen
  Antwortknopf, damit Enter oder Leertaste nicht aus Versehen antworten. Ohne Fokus in diesem Bereich (Tippen,
  Maus) wird nichts verschoben.
- **Scrollen.** Wer am Ende der Vorführung weitergeht, stand vorher tief unten (bei 320 px lag die neue Notenzeile
  365 px über dem Bildschirm). `resume` rückt die Notenzeile wieder ins Bild, wenn sie oben verdeckt ist
  (`#pStaff { scroll-margin-top: 72px }` unter der Kopfleiste); sonst bleibt die Seite stehen.
- Tests: „Nächste Aufgabe steht nur einmal da (alle Pakete)“ (alle 47 Stufen; 15 mit Vorführung: Notenwerte 1, 4,
  6, 8; Intervalle 1, 3, 5, 8; Tonleitern 1, 2, 4, 6, 8, 10, 12), Fokus-Test, Prüfung von `tabindex` und
  `scroll-margin-top`; bestehender Vorführ-Test um `ui.next.hidden` ergänzt. 377 Tests grün.
- `docs/screens/ueberlauf.mjs` zählt sichtbare Knöpfe „Nächste Aufgabe“ (mehr als einer = Treffer) und geht bei
  offener Vorführung über deren Knopf weiter: 320 px dunkel und 420 px hell je 0 Treffer, 0 Konsolenfehler. Mit
  dem alten `engine.js` zeigt dieselbe Zählung bei Intervalle 3 zwei Knöpfe.
- Keine Abweichung vom Plan; ein Fokus-Rahmen ohne `outline` war nicht möglich (Regel in `test/css.test.js`), der
  Antwortbereich zeigt bei Tastaturbedienung den üblichen Rahmen in `--accent`.

**Prüfung (25.11.2026, Fable).** Code und Tests gegen den Plan gelesen, 377 Tests grün. Eine Korrektur: Der
Antwortbereich ist jetzt Fokusziel, hatte aber keinen Namen – `#pAnswers` trägt `role="group"` und
`aria-label="Antworten"`, damit ein Vorleseprogramm nach „Nächste Aufgabe“ etwas ansagt. Der Ausweichweg auf die
Klaviatur (`ui.piano`) wird derzeit nie erreicht: Die einzige Buchstaben-Stufe mit Hilfen (Intervalle 8) nimmt
nur das Namensraster. **Noch offen:** `ueberlauf.mjs` und die Bildschirmfotos (420 hell, 320 dunkel) konnten in
der Prüfsitzung nicht laufen (der lokale Server ließ sich dort nicht starten); nachzuholen sind dabei der Abstand
72 px zur Kopfleiste und der Fokusrahmen um den Antwortbereich.

#### Schritt 1 – W1: Notenwerte – Dauer in Schlägen, ein Wortlaut

**Befund.** „Wie viele Schläge im 4/4-Takt?“ lässt sich als „Wie viele Schläge hat der 4/4-Takt?“ lesen
(Antwort 4). Gemeint ist: Wie lange dauert diese Note, gemessen in Schlägen, wenn ein Schlag eine Viertel ist.

**Wortlaut (verbindlich; zwei Bausteine als Konstanten in `src/packs/notenwerte.js`).**
- `BEAT_UNIT = "1 Schlag = 1 Viertelnote"` (in Klammern hinter der Frage; mit geschützten Leerzeichen, damit
  die Klammer nicht zerfällt).
- `BEAT_RULE = "Gezählt wird in Schlägen: Im 4/4-Takt ist ein Schlag so lang wie eine Viertelnote."` (Hinweise
  und Lerntafel).
- Die Wendung „Schläge im 4/4-Takt“ bzw. „Schläge im 4/4“ kommt in Fragen, Rückmeldungen, Hilfen, Vorführungen
  und Lerntafeln **nicht mehr** vor. „Ein 4/4-Takt hat vier Schläge“ bleibt dort, wo wirklich der ganze Takt
  gemeint ist (Takt füllen, Stufen 8 und 9).

| Stelle | bisher (`src/packs/notenwerte.js`) | neu |
|---|---|---|
| Frage Stufe 4, Schritt 2 (Zeile 310) und Stufe 5 (Zeile 318), auch in Stufe 10 | „Wie viele Schläge im 4/4-Takt?“ | Note: „Wie viele Schläge dauert diese Note? (1 Schlag = 1 Viertelnote)“ · Pause: „Wie viele Schläge dauert diese Pause? (1 Schlag = 1 Viertelnote)“ |
| Frage Stufe 6, Schritt 2 (Zeile 348) | „Wie viele Schläge dauert die Note?“ | „Wie viele Schläge dauert diese Note? (1 Schlag = 1 Viertelnote)“ |
| Frage Stufe 7 (Zeile 357), auch in Stufe 10 | „Wie viele Schläge dauert diese Note?“ | dieselbe Frage mit „(1 Schlag = 1 Viertelnote)“ |
| Richtig, Stufen 5, 7, 9 (`displayOf`, Zeile 230) | „Richtig! Achtelnote (½ Schlag)“ | „Richtig! Achtelnote = ½ Schlag“ (wie die Ergebniskarte der Vorführung) |
| Richtig und Daneben, Stufen 1–3 (`METER`, Zeile 228; `withBeats` 229; `valueWay` 274) | „… (½ Schlag im 4/4-Takt)“ | „… (dauert ½ Schlag)“, z. B. „Richtig! Achtelnote (dauert ½ Schlag)“, „Das war eine halbe Pause (dauert 2 Schläge) – das Rechteck sitzt auf der Mittellinie.“, „Kopf schwarz · 1 Fähnchen → Achtelnote (dauert ½ Schlag)“ |
| Daneben, Stufe 7 mit der Frage nach dem Namen (`revealName` ohne `meter`, Zeile 234) | „Das war eine punktierte Viertelnote (1½ Schläge).“ | „Das war eine punktierte Viertelnote (dauert 1½ Schläge).“ – `withBeats` schreibt überall „(dauert …)“ |
| Daneben, Stufen 5 und 7 (`revealBeats`, Zeile 236) | „Richtig wäre: ½ Schlag, denn das ist eine Achtelnote.“ | bleibt (eindeutig) |
| Zwei Schritte, Stufe 4 (`beatsWay`, Zeile 301) | „Achtelpause → ½ Schlag“ | bleibt |
| Teilerfolg Stufen 4 und 6 (Zeilen 313, 351) | „Die Schläge stimmen, der Notenwert nicht: …“ | „Die Dauer stimmt, der Notenwert nicht: …“ |
| Titel Stufe 4 und 5 (Zeilen 772, 774) | „Wie viele Schläge?“ / „Wie viele Schläge? Ohne Hilfen“ | „Dauer in Schlägen“ / „Dauer in Schlägen ohne Hilfen“ |
| Untertitel Stufe 4 und 5 (Zeilen 772, 774) | „4/4-Takt · Noten und Pausen · …“ | „Noten und Pausen · zwei Schritte · mit Hilfen“ / „Noten und Pausen“ (die Taktangabe 4/4 steht weiter in der Notenzeile) |
| Hinweis Stufe 4 (Zeile 773) | „… dann die Schläge ablesen. Im 4/4-Takt dauert eine Viertelnote einen Schlag. …“ | „Zwei Schritte: Erst den Notenwert erkennen, dann seine Dauer ablesen. Gezählt wird in Schlägen: Im 4/4-Takt ist ein Schlag so lang wie eine Viertelnote. Eine Pause dauert so lang wie die Note mit demselben Wert.“ |
| Hinweis Stufe 5 (Zeile 775) | „Im 4/4-Takt dauert eine Viertelnote einen Schlag. Ganze Note 4 Schläge, halbe 2, Achtel ½, Sechzehntel ¼. …“ | „Gezählt wird in Schlägen: Im 4/4-Takt ist ein Schlag so lang wie eine Viertelnote. Die ganze Note dauert 4 Schläge, die halbe 2, die Achtel ½ Schlag, die Sechzehntel ¼ Schlag. Eine Pause dauert so lang wie die Note mit demselben Wert.“ |
| Hinweise Stufe 6, 7 (Zeilen 777, 779), Stufe 8, 9 (781, 783) | – | bleiben (nennen Dauern bzw. den ganzen Takt eindeutig) |
| Hilfetext Stufe 4 (`HELP_TEXT_BEATS`, Zeile 558) | „Eine Pause dauert so lang wie die Note mit demselben Wert.“ | „1 Schlag = 1 Viertelnote. Eine Pause dauert so lang wie die Note mit demselben Wert.“ |
| Vorführung „So bestimmst du die Dauer“: Marken (`DEMO_STEPS_BEATS`, Zeile 578) | „1 · Notenwert“, „2 · Schläge“ | „1 · Notenwert“, „2 · Dauer“ |
| Vorführung, erstes Bild (Zeile 629) | „Wie lange dauert das? Erst der Notenwert, dann die Schläge.“ | „Wie viele Schläge dauert das? Erst der Notenwert, dann die Dauer (1 Schlag = 1 Viertelnote).“ |
| Vorführung, Bilder 2 bis Ergebnis (Zeilen 630–645) | „Viertelnote = 1 Schlag“, „Punkt: die Hälfte dazu · 1 + ½ = 1½“, Ergebnis „Punktierte Viertelnote = 1½ Schläge“ | bleiben |
| Vorführung „So erkennst du einen Notenwert“, Ergebnis (Zeile 602) | „Achtelnote · ½ Schlag im 4/4-Takt“ | „Achtelnote · dauert ½ Schlag“ |
| Lerntafel „So bestimmst du die Dauer“, Einleitung (`BOARDS.beats.intro`, Zeile 884) | „… Dann die Schläge in der Notenwert-Pyramide ablesen.“ | „… Dann die Dauer in der Notenwert-Pyramide ablesen (1 Schlag = 1 Viertelnote).“ |
| Lerntafel „Notenwerte und Pausen“, Spaltenkopf beider Tabellen (Zeilen 859, 861) | „Schläge im 4/4“ | „Dauer in Schlägen“ |
| Lerntafel, Satz unter den Tabellen (Zeile 862) | „Der Punkt verlängert eine Note um die Hälfte ihres Wertes. Im 4/4-Takt hat jeder Takt vier Schläge, ein Schlag ist eine Viertelnote.“ | „Gezählt wird in Schlägen: Im 4/4-Takt ist ein Schlag so lang wie eine Viertelnote, ein ganzer Takt hat vier Schläge. Der Punkt verlängert eine Note um die Hälfte ihres Wertes.“ |
| Pyramide, Spaltenkopf (Zeile 519) | „Schläge“ | bleibt |

**Geprüft.** Die Antwortknöpfe passen zum neuen Wortlaut: Stufen 4/5 „4 · 2 · 1 · ½ · ¼“ (ganze, halbe, Viertel,
Achtel, Sechzehntel, Note wie Pause), Stufen 6/7 „3 · 2 · 1½ · 1 · ¾ · ½“ (punktierte halbe 3, halbe 2,
punktierte Viertel 1½, Viertel 1, punktierte Achtel ¾, Achtel ½). Punktierte Werte (Stufe 6 und 7, nur Noten)
und Pausen (Stufen 4 und 5) benutzen dieselbe Frage; nur „Note“ bzw. „Pause“ wechselt. Länge: „Richtig!
Sechzehntelpause (dauert ¼ Schlag)“ hat 43 Zeichen und liegt unter `AUTO_OK_MAX` (45); `autoNext` in den Stufen 3
und 10 bleibt trotzdem stehen.

**Umsetzung.** `METER` entfällt (ersetzt durch `DAUERT = "dauert"` in `withBeats` und `valueWay`); neue
Funktion `beatsPrompt(e)` für alle vier Fragen; `displayOf(e)` ohne `meter`: „Name = Dauer“. Außerhalb des
Pakets: `docs/ARCHITEKTUR.md` Zeilen 82, 333, 561, 633 (Wortlaut), `README.md` falls betroffen.

**Tests** (`test/packs/notenwerte.test.js`; betroffen heute die Zeilen 126–139, 207–212, 222, 239, 478, 658).
- Neu: Kein Text des Pakets (Fragen aller Schritte, `display`, `reveal`, `partial`, Hinweise, Titel, Untertitel,
  Hilfetexte, alle Bilder aller Vorführungen, alle Lerntafeln) enthält „Schläge im 4/4“ oder „Schlag im 4/4“.
- Neu: Jede Frage nach der Dauer (Stufen 4 Schritt 2, 5, 6 Schritt 2, 7, 10) lautet genau „Wie viele Schläge
  dauert diese Note? (1 Schlag = 1 Viertelnote)“ bzw. „… diese Pause? …“, passend zu `q.el.rest`.
- Angepasst: die wörtlichen Erwartungen der genannten Zeilen.

**Abnahme.** Stufen 4 bis 7 und 10 je eine Runde bei 320 und 420 px: Frage in höchstens drei Zeilen, kein
Überlauf; Vorführung und Lerntafeln mit dem neuen Wortlaut. Fable prüft den Wortlaut (Sandra: „Fable prüft“).

**Umgesetzt (25.11.2026, Opus).** Wortlaut wie in der Tabelle; `BEAT_UNIT`, `BEAT_RULE`, `beatsPrompt(e)`,
`DAUERT` in `src/packs/notenwerte.js`, `METER` entfällt, `displayOf(e, paren)` gibt „Name = Dauer“ bzw. mit
`paren` (Stufen 2, 3) „Name (dauert …)“, `revealName(e)` ohne zweiten Parameter. `BEAT_UNIT` ganz mit geschützten
Leerzeichen: Die Frage steht bei 320 und 420 px in genau zwei Zeilen (gemessen in den Stufen 4, 5, 6, 7, 10; bei
320 px „… dauert diese / Note? (1 Schlag = 1 Viertelnote)“), kein Überlauf. Stufen 8 und 9 unverändert („Wie viele
Schläge fehlen bis 4?“, „Ein 4/4-Takt hat vier Schläge“). Tests: ein neuer Test sammelt alle Texte des Pakets
(Fragen, Schritte, Rückmeldungen, Titel, Hinweise, Hilfen, alle Bilder aller Vorführungen, Lerntafeln) – keiner
enthält „Schläge/Schlag im 4/4“ – und prüft jede Frage nach der Dauer wörtlich. Doku: `docs/ARCHITEKTUR.md`
(Zeilen 82, 333, 561, 633); `README.md` nicht betroffen. **Abweichung:** Der Spaltenkopf „Dauer in Schlägen“ der
Lerntafel „Notenwerte und Pausen“ ragte bei 320 px über die schmale dritte Spalte (24 %; `ueberlauf.mjs` meldet das
nicht, nur auf dem Bildschirmfoto sichtbar). Spalten jetzt 38 % · 35 % · 27 %, Zellen links/rechts 4 px statt
6 px: Der Kopf passt in zwei Zeilen, und „Sechzehntel-pause“ trennt jetzt am weichen Trennzeichen statt wie bisher
„Sechzehnte|lpause“.

**Prüfung (25.11.2026, Fable): bestanden nach Korrektur.** Wortlaut für Noten, Pausen und punktierte Werte eindeutig
und richtig; Lerntafel 38/35/27 % bei 320 px dunkel/hell und 420 px hell angesehen (Kopf in zwei Zeilen, nichts
ragt über). Korrigiert: (1) Die Stufen 1–3 nennen „dauert ½ Schlag“ in der Rückmeldung, ohne dass die Einheit
irgendwo steht (seit „im 4/4-Takt“ entfiel; die Notenzeile dieser Stufen zeigt keine Taktangabe) – ihre Hinweise
enden jetzt mit „Die Rückmeldung nennt auch die Dauer (1 Schlag = 1 Viertelnote).“ (`BEAT_NOTE`). (2) Vorführung,
erstes Bild: „Wie viele Schläge dauert diese Note? …“ bzw. „… diese Pause? …“ wie die Aufgabe, statt „dauert das“.
(3) Hinweis Stufe 6: „… dann die Dauer.“ statt „dann die Schläge“ (wie Marke „2 · Dauer“ und Stufe 4).

#### Schritt 2 – W3: „Lernen“ mit Reitern

**Heute** (`src/views/learn.js`, `index.html` Zeilen 103–128): oben die Schlüsselwahl, die Notenzeile zum
Antippen, „Gewählte Note“, darunter **alle** Lerntafeln aller Pakete untereinander (`learnCardsHtml`).

**Reiter** (Reihenfolge wie die Pakete nach Schritt 3; „Takt“ steht hinter „Notenwerte“):

| Reiter (`id`) | Inhalt |
|---|---|
| Tonhöhen (`noten`) | Notenzeile zum Antippen, „Gewählte Note“ mit „Anhören“ und „Alle Namen zeigen“, Tafel „Merkhilfen“ (je Schlüssel) mit der Wahl der Merksprüche |
| Notenwerte (`notenwerte`) | „So erkennst du einen Notenwert“, „Notenwerte und Pausen“ (Tabellen Note/Pause/Dauer, punktierte Noten, Notenwert-Pyramide), „So bestimmst du die Dauer“ |
| Takt (`takt`) | „So zählst du einen Takt“, neu als eigene Tafel „Balken“ (der Abschnitt „Balken“ aus `learnHtml`, Zeilen 863–866, unverändert im Wortlaut) |
| Intervalle (`intervalle`) | „So bestimmst du ein Intervall“, „Intervalle über c'“ bzw. „Intervalle über c“ (je Schlüssel) |
| Tonleitern (`tonleitern`) | „So baust du eine Dur-Tonleiter“, „Bauplan Dur“ (je Schlüssel), „Dur-Tonleitern bis 4 Vorzeichen“, „So findest du die Tonart“, „Quintenzirkel“ (Tafel der Tonleitern mit den Merksprüchen), „So findest du die parallele Molltonart“ |
| Dreiklänge (`akkorde`) | „Dreiklangstypen“ (je Schlüssel), „Quintenzirkel“ (Ring der Dreiklänge) |

**Technik.**
- Jede Lerntafel bekommt das Feld `tab` (fehlt es, gilt die `id` des Pakets). In `notenwerte.js`: `learnHtml`
  wird in `valuesHtml()` (Tabellen, punktierte Noten, Pyramide) und `beamsHtml()` (Balken) geteilt; die Tafeln
  „So zählst du einen Takt“ und „Balken“ tragen `tab: "takt"`.
- `learn.js`: `LEARN_TABS = [{ id, label }]` (rein; die Reihenfolge folgt `PACKS`, „takt“ nach „notenwerte“);
  `learnCardsHtml(packs, clef, c, tab)` und `mountCards(packs, clef, root, tab)` filtern zusätzlich nach dem
  Reiter; `tabHasClef(packs, tab)` (rein): Gibt es im Reiter eine Tafel mit `clef` oder ist es „Tonhöhen“?
- `index.html`: über dem Inhalt `<div class="ltabs" role="tablist" aria-label="Lerninhalte" id="lTabs">` mit je
  einem `<button role="tab" id="ltab-<id>" aria-selected aria-controls="lPanel">`; der Inhalt in
  `<div role="tabpanel" id="lPanel" aria-labelledby="ltab-<id>" tabindex="0">`. Die Notenzeile, „Gewählte Note“
  und die Überschrift „Tippe auf die Notenzeile“ sind nur im Reiter „Tonhöhen“ sichtbar; in den anderen Reitern
  ist die Überschrift der Name des Reiters.
- **Tastatur (ARIA-Muster „Tabs“, Aktivierung beim Fokus):** nur der gewählte Reiter hat `tabindex="0"`, die
  anderen `-1` (wandernder Tabindex). Pfeil rechts/links wechselt (am Ende umlaufend), Pos1 zum ersten, Ende
  zum letzten; der Fokus geht mit und der Reiter wird gleich gezeigt. Tab springt vom gewählten Reiter in den
  Inhalt. Der Tastatur-Handler hängt an `#lTabs` (nicht an `document`), damit die Buchstabentasten anderer
  Ansichten unberührt bleiben.
- **320 px:** `.ltabs { display: flex; gap: 6px; overflow-x: auto; scroll-snap-type: x proximity;
  scrollbar-width: none; min-width: 0; padding: 4px 2px; }`, Reiter `flex: none; scroll-snap-align: start;
  white-space: nowrap; min-height: 44px`. Die Leiste rollt in sich, die Seite bekommt keinen waagrechten
  Überlauf (`ueberlauf.mjs` lässt gewollte Rollbereiche zu). Der gewählte Reiter wird nach jedem Wechsel mit
  `scrollIntoView({ inline: "nearest", block: "nearest" })` sichtbar gemacht. Farben über die vorhandenen
  Tokens (gewählt wie `.seg button.on`), Fokusring wie in Welle 10.
- **Schlüsselwahl bleibt:** `#lTreble`/`#lBass` stehen weiter oben rechts und gelten für alle Reiter; die Wahl
  bleibt beim Wechsel des Reiters erhalten. In Reitern ohne Tafel je Schlüssel („Notenwerte“, „Takt“) ist die
  Wahl ausgeblendet (`tabHasClef`), damit kein Schalter ohne Wirkung dasteht.
- **Gemerkt in der Sitzung:** `lTab` als Variable des Moduls (wie `lClef`): Wer „Lernen“ verlässt und
  zurückkommt, steht im selben Reiter. Nach einem Neuladen der Seite beginnt „Lernen“ wieder bei „Tonhöhen“.
- Wechsel des Reiters: `stopDemos()`, dann nur die Tafeln des Reiters neu setzen und verdrahten.
- „Erst anschauen“ auf der Startseite öffnet den Reiter des Pakets der aktuellen Stufe (`ctx.show("learn",
  { tab })`; `app.js`: `show(v, arg)` reicht `arg` an `render` weiter).

**Tests** (`test/views/learn.test.js`).
- Jede Lerntafel aller Pakete gehört zu genau einem Reiter aus `LEARN_TABS`; kein Reiter ist leer; die
  Reihenfolge der Reiter folgt `PACKS`.
- `learnCardsHtml` je Reiter und Schlüssel enthält genau die Titel der Tabelle oben.
- `tabHasClef`: wahr für `noten`, `intervalle`, `tonleitern`, `akkorde`; falsch für `notenwerte`, `takt`.
- Rein und getestet: `nextTab(ids, cur, key)` für ArrowRight, ArrowLeft, Home, End (umlaufend).
- `test/css.test.js`: `.ltabs` hat `overflow-x: auto`.
- `ueberlauf.mjs`: „Lernen“ je Reiter und je Schlüssel mit allen Vorführungen (statt bisher zwei Durchgänge).

**Abnahme.** Bei 320 px lässt sich die Leiste wischen, der letzte Reiter ist erreichbar, kein Seitenüberlauf;
mit der Tastatur sind alle Reiter und ihr Inhalt erreichbar; Schlüssel wechseln in „Tonleitern“ lässt den
Reiter stehen; Merkspruch-Wahl in „Tonhöhen“ und „Tonleitern“ funktioniert wie bisher.

**Umgesetzt (25.11.2026, Opus).** Reiter wie in der Tabelle, Technik wie geplant (`LEARN_TABS`, `nextTab`,
`tabHasClef`, `learnCardsHtml`/`mountCards` mit Reiter, `show(v, arg)`, „Erst anschauen“ mit `{ tab }`,
`lTab` in der Sitzung). `notenwerte.js`: `valuesHtml()` und `beamsHtml()`, `learnHtml()` bleibt als beides
zusammen für die Wortprüfung der Tests; in „Balken“ entfällt nur die Zwischenüberschrift (jetzt Titel der Tafel).
Abweichungen und Ergänzungen:
- **Reihenfolge der Reiter:** `LEARN_TABS` ist eine feste Liste schon in der neuen Reihenfolge (Intervalle vor
  Tonleitern), weil `PACKS` erst in Schritt 3 umgestellt wird. Der Test prüft die Reihenfolge der Pakete in
  `LEARN_TABS` gegen die Liste nach Schritt 3 und dass jedes Paket seinen Reiter hat. **Für Schritt 3:** den Test
  auf `LEARN_TABS` ohne „takt“ = `PACKS.map(id)` umstellen.
- **Sichtbar machen des Reiters:** `scrollIntoView({ inline: "nearest" })` hält das Einrasten nicht (die Leiste
  sprang zum nächsten Einrastpunkt zurück, der Reiter blieb halb verdeckt; mit Playwright gefunden). Stattdessen
  rollt `tabScroll` (rein, getestet) zum kleinsten Einrastpunkt, bei dem der Reiter ganz sichtbar ist.
- Die Reiterknöpfe setzt `learn.js` aus `LEARN_TABS` in `#lTabs` (eine Quelle statt Liste in `index.html`); der
  Inhalt (Notenzeile, „Gewählte Note“, Lerntafeln) steht in `#lPanel` (`.lpanel`, Abstand wie die Abschnitte).
- `.ltabs` hat 6 px Innenabstand (Plan: 4 px 2 px), damit der Fokusring (3 px + 2 px) im Rollbereich nicht
  abgeschnitten wird; `.ltab` wie `.btn` mit Rand, gewählt wie `.seg button.on`.
Geprüft mit Playwright bei 320 px dunkel und 420 px hell: Tab zum gewählten Reiter und weiter in den Inhalt,
Umschalt+Tab zurück, Pfeile umlaufend, Pos1/Ende, Eingabe und Leertaste ändern nichts, gewählter Reiter nach
jedem Wechsel ganz sichtbar, letzter Reiter durch Rollen erreichbar, kein Seitenüberlauf, Schlüssel bleibt beim
Wechsel, Reiter bleibt nach „Statistik“ und zurück, nach Neuladen „Tonhöhen“, Merkspruch-Wahl in „Tonleitern“
speichert; `ueberlauf.mjs` (jetzt je Reiter und Schlüssel) 0 Treffer, 0 Konsolenfehler.

**Prüfung (25.11.2026, Fable).** Bestanden nach Korrektur. Mit Playwright bei 320 px dunkel und 420 px hell
nachgeprüft: genau ein gewählter Reiter, wandernder Tabindex, `aria-labelledby` folgt, Pfeile umlaufend,
Pos1/Ende, Tab in den Inhalt und zurück, gewählter Reiter immer ganz sichtbar, kein Seitenüberlauf, Schlüssel
und Reiter bleiben in der Sitzung, nach Neuladen „Tonhöhen“. Korrekturen:
- **„Erst anschauen“ bei „Takt füllen“:** Die Stufen 8 und 9 der Notenwerte tragen `learnTab: "takt"`;
  `learnTabOf(packs, levelId)` (rein, getestet) liefert `level.learnTab`, sonst die id des Pakets. So führt
  „Erst anschauen“ zu „So zählst du einen Takt“ statt zu den Notenwert-Tafeln. Stufe 10 „Alles gemischt“
  (Stufen 3, 5, 7 und 9) bleibt bei „Notenwerte“, weil drei der vier Teile dorthin gehören.
- **Leiste springt nicht zurück:** Der gewählte Reiter wird nur beim Öffnen der Ansicht und beim Wechsel des
  Reiters sichtbar gerollt, nicht mehr bei jedem Neuzeichnen (Notenzeile antippen, „Alle Namen zeigen“,
  Schlüssel wechseln) – wer die Leiste von Hand gewischt hat, behält ihre Stellung.

#### Schritt 3 – Paketreihenfolge: Intervalle vor Tonleitern

- `src/packs/index.js`: `PACKS = [noten, notenwerte, intervalle, tonleitern, akkorde]`. Startseite
  (`home.js`), Statistik (`levelGroups`) und „Lernen“ (`LEARN_TABS`) folgen `PACKS` und ändern sich damit von
  selbst. „Blitz“ ist nicht betroffen (nur „Noten lesen“ hat `blitz`).
- Tests: `test/packs/tonleitern.test.js` Zeile 29 (Reihenfolge der IDs); Suche nach weiteren festen Reihenfolgen
  in `test/**` und `docs/screens/*.mjs` (`ueberlauf.mjs` Zeile 111 ist eine Zuordnung, keine Reihenfolge).
- Texte, die die Lage nennen: `CLAUDE.md` Zeile 19 („zwischen ‚Notenwerte und Pausen‘ und ‚Intervalle …‘“ – als
  Stand von damals kennzeichnen), `README.md` (Aufzählung der Pakete), `docs/ARCHITEKTUR.md` (Registry),
  Reihenfolge-Tabelle oben in diesem Plan (ist angepasst).
- Hinweise der Stufen, die auf das jeweils andere Paket verweisen, lesen und anpassen, falls sie „später“ oder
  „schon gelernt“ voraussetzen (Tonleitern 12/13 nennen die Terz: passt jetzt; Intervalle 3 erklärt Halbtöne
  selbst: passt).
- Spielstände: unverändert (IDs bleiben). `s.current` bleibt.
- Abnahme: Startseite, Statistik und „Lernen“ zeigen Noten lesen → Notenwerte und Pausen → Intervalle →
  Tonleitern → Dreiklänge und Quintenzirkel; `docs/screens/screenshots.mjs` läuft.

**Umgesetzt (25.11.2026, Opus).** `PACKS = [noten, notenwerte, intervalle, tonleitern, akkorde]`; Startseite,
Statistik und „Lernen“ folgen von selbst (mit Playwright bei 420 px hell und 320 px dunkel nachgesehen: Noten
lesen → Notenwerte und Pausen → Intervalle → Tonleitern → Dreiklänge und Quintenzirkel, kein Seitenüberlauf).
- Tests: `tonleitern.test.js` (Reihenfolge der IDs); `learn.test.js` prüft jetzt `LEARN_TABS` ohne „takt“ =
  `PACKS.map(id)` und „Takt“ direkt hinter „Notenwerte“ (Hinweis aus Schritt 2 erledigt). Zwei weitere feste
  Reihenfolgen gefunden und angepasst: die Tafeln mit `mount` (`learn.test.js`) und die zweischrittigen Stufen
  (`practice.test.js`).
- Neu in `store.test.js`: Stufen-IDs je Paket wie vorher; ein gespeicherter Stand (alle Umstellungs-Marker,
  Fortschritt in jedem Paket, `current` in den Intervallen) wird unverändert geladen und nicht neu gespeichert;
  Freischaltung und `findLevel` jeder Stufe sind in alter und neuer Reihenfolge gleich; ein alter Stand
  (`intervalle-5/-6`, `notenwerte-3`) wird wie bisher umgestellt. Spielstände hängen nur an den IDs.
- Skripte: `ueberlauf.mjs` und `screenshots.mjs` hängen nicht an der Reihenfolge (keine Änderung nötig); beide
  laufen. Die Bildschirmfotos in `docs/screens/` sind nicht neu eingecheckt (das macht Schritt 13).
- Doku: `README.md` (Aufzählung der Pakete), `docs/ARCHITEKTUR.md` (Registry, Liste der Pakete), `CLAUDE.md`
  Zeile 19 als damaliger Stand gekennzeichnet. Hinweise der Stufen gelesen: keiner setzt das andere Paket als
  „später“ oder „schon gelernt“ voraus; nichts geändert.

#### Schritt 4 – Örtliches Datum, Felder `rep` und `klasse`, Karteikasten als reine Logik

**`src/store.js`.**
- `localDay(now = new Date(), offsetMin = now.getTimezoneOffset())` → `"JJJJ-MM-TT"` des örtlichen Tages (rein,
  die Verschiebung ist für Tests einstellbar). `today` ruft `localDay`. `addDays(day, n)` rechnet auf dem Text
  des Tages (über `Date.UTC`, unabhängig von Sommerzeit).
- `touchStreak`: „gestern“ = `addDays(heute, -1)`. Neu: Liegt `lastDay` **in der Zukunft** (alter UTC-Eintrag
  in Zeitzonen westlich von Greenwich), gilt er als heute (nichts ändern). Östlich von Greenwich liegt der alte
  UTC-Tag höchstens einen Tag zurück: Die Serie zählt dann einmalig einen Tag weiter, sie reißt nie ab.
- `fresh()`: `rep: {}`, `klasse: null`, Marker `MIGRATION_WIEDERHOLEN = "wiederholen"` in `migrated`.
- `migrateWiederholen(s, packs, heute)`: wie in 1 beschrieben (je Tag 3 Stufen, beginnend heute, Reihenfolge
  der Pakete, nur Stufen ohne Hilfen mit `best ≥ 8`). `load(storage, now)` reicht das Datum durch; `migrateAll`
  ruft sie als vierte. Weil `store.js` die Pakete nicht kennt, bekommt `load` die Liste der Stufen ohne Hilfen
  als Parameter (`app.js` übergibt sie aus `PACKS`); ohne Liste läuft die Umstellung nicht und der Marker wird
  nicht gesetzt.
- `reset`: behält zusätzlich `klasse`; `rep` wird gelöscht.

**`src/repeat.js` (neu, rein, ohne DOM).**
- `ABSTAENDE = [1, 3, 7, 14, 30]`, `RUNDE_WIEDERHOLEN = 10`, `RUNDE_GRUNDLAGEN = 6`, `MAX_STUFEN = 3`,
  `MIN_AUFGABEN_RATEN = 4`.
- `inBox(level)` = keine Hilfen. `enter(state, levelId, heute)`: Fach 1, fällig morgen (nur wenn noch kein
  Eintrag).
- `due(state, packs, heute)` → Stufen-IDs mit `faellig ≤ heute`, sortiert: am längsten fällig zuerst, bei
  Gleichstand Grundlagen vor dem, was auf ihnen aufbaut (Reihenfolge `PACKS`, dann Stufennummer).
- `nextDue(state, heute)` → frühestes künftiges Datum oder `null`.
- `reviewPlan(state, packs, heute)` → `[{ id, n }]` für die nächste Runde: höchstens `MAX_STUFEN` Stufen,
  Aufteilung 10 / 5+5 / 4+3+3; Stufen mit nur zwei Antwortknöpfen (`level.guess === true`, gesetzt in
  Tonleitern 1–3 und Dreiklänge 1) bekommen mindestens `MIN_AUFGABEN_RATEN` und den größten Anteil.
- `passed(n, fehler)` = `fehler ≤ Math.floor(n / 5)`.
- `applyReview(state, perLevel, heute)` (`perLevel = [{ id, n, ok }]`): bestanden → `fach = min(5, fach + 1)`,
  `faellig = heute + ABSTAENDE[fach − 1]`; sonst `fach = max(1, fach − 1)`, `faellig = heute + 1`; `zuletzt =
  heute`. Ergebnis je Stufe `{ id, sitzt, fach, inTagen }` für die Ergebniskarte.
- `afterRound(state, level, correct, heute)` (normale Runde, 10 Aufgaben): Stufe ohne Hilfen, `correct ≥ 8`,
  kein Eintrag → `enter`; Eintrag vorhanden und fällig → wie bestanden; fällig und `correct < 8` → wie nicht
  bestanden; nicht fällig → nichts.
- `dueText(inTagen)`: „morgen“, „in 3 Tagen“ …; `dayText(day)`: „24.11.“.

**Tests.** `test/store.test.js`: `localDay` mit festen Zeitpunkten und Verschiebungen −480 (Kuala Lumpur), −60
und −120 (Bayern), +300 (New York), je kurz vor und nach Mitternacht; Serie über die Umstellung (alter UTC-Tag
= gestern, = heute, = morgen): kein Abriss; `migrateWiederholen` (Verteilung 3 je Tag, nur ohne Hilfen, Marker,
läuft einmal); alter Stand ohne `rep`/`klasse` lädt; `reset` behält `klasse`. `test/repeat.test.js`: jede
Funktion; Fach 1→2→3→4→5 mit den Abständen 1, 3, 7, 14, 30; Fach 5 bleibt 5 und kommt nach 30 Tagen wieder;
zurück nicht unter 1; `passed` für n = 3, 4, 5, 10. **`test/repeat.sim.test.js`: Lauf über 40 Tage** mit
verstellter Uhr (rein, ohne Browser): Tag 0 drei Stufen geschafft; täglich `due`, `reviewPlan`, `applyReview`;
erwartet werden die Fälligkeiten an den Tagen 1, 4, 11, 25 (und die nächste am Tag 55 außerhalb des Laufs);
eine Stufe wird am Tag 4 nicht bestanden (Fach zurück, am Tag 5 wieder fällig); Ferienpause Tag 12 bis 26
(nichts gespielt): am Tag 27 ist alles fällig, `reviewPlan` liefert trotzdem genau eine Runde mit höchstens
drei Stufen, Grundlagen zuerst; während des ganzen Laufs bleibt jede Stufe offen (`isUnlocked` unverändert wahr).

**Abnahme.** `npm test` grün; in der Oberfläche ändert dieser Schritt nichts außer dem Tageswechsel um
Mitternacht Ortszeit.

**Umgesetzt (25.11.2026, Opus).** `store.js`: `localDay`, `today(now, offsetMin)`, `addDays`, `dayDiff` (für die
Texte in Schritt 8), `touchStreak(s, now, offsetMin)` mit örtlichem Tag; `fresh()` mit `rep: {}`, `klasse: null`
und dem Marker `"wiederholen"`; `migrateWiederholen(s, boxIds, heute)` als vierte Umstellung in `migrateAll`;
`load(storage, now, boxIds)`; `reset` behält `klasse`. `app.js` übergibt `boxIds(PACKS)`. Neues reines Modul
`src/repeat.js` wie oben (dazu `FAECHER` und `boxIds(packs)`); `sw.js`: `src/repeat.js` in `PRECACHE` (der
Cache wird erst in Schritt 13 hochgezählt). In der Oberfläche ändert sich nichts außer dem Tageswechsel
(mit Playwright nachgesehen: alter Stand lädt ohne Fehler, bekommt Fach 1 und den Marker).
- **v1-Stände:** `migrateV1` setzte bisher alle Marker aus `fresh()`; der Marker `"wiederholen"` wird dort jetzt
  herausgenommen, damit auch geschaffte Stufen aus v1 in den Kasten kommen.
- **Umstellung:** Einträge aus der Umstellung tragen `zuletzt: null` (noch nie wiederholt). Je Tag
  `UMSTELLUNG_JE_TAG = 3` in `store.js` (eigene Zahl, weil `repeat.js` `store.js` einbindet; ein Test prüft
  `UMSTELLUNG_JE_TAG === MAX_STUFEN`).
- **`reviewPlan` mit mehreren Ratestufen** (Lücke im Plan): Bei drei fälligen Stufen, von denen zwei oder drei
  `guess` tragen, ließe „mindestens 4“ einer Stufe nur 2 Aufgaben (4 + 4 + 2). Dann kommen nur die ersten zwei
  Stufen in die Runde (5 + 5); die dritte bleibt fällig. So hat jede Stufe mindestens drei, jede Ratestufe
  mindestens vier Aufgaben. Die Anteile gehen zuerst an die Ratestufen, die Reihenfolge der Runde bleibt wie `due`.
- `afterRound` meldet eine neu aufgenommene Stufe mit `neu: true` (für „Kommt morgen zum Wiederholen wieder.“ in
  Schritt 8); `dueText(0)` = „heute“; `dayText("2026-12-05")` = „5.12.“ (ohne führende Null).
- **Lauf über 40 Tage:** Die Fälligkeiten 1, 4, 11, 25 und die nächste an Tag 55 gelten für den Lauf **ohne**
  Ferien. Mit Ferien von Tag 12 bis 26 ist Tag 25 nicht gespielt; die Runde an Tag 27 setzt den Abstand ab Tag
  27 (nächste an Tag 57, so wie `applyReview` es vorgibt). Darum zwei Läufe: ohne Ferien (1, 4, 11, 25, 55; die
  an Tag 4 nicht bestandene Stufe: 1, 4, 5, 8, 15, 29, 59) und mit Ferien (an Tag 27 alle drei fällig, eine
  Runde 4 + 3 + 3, am längsten fällig zuerst, dann Grundlagen vor Intervallen). Dazu derselbe Lauf in Bayern
  (Start 00:30 MEZ) und ein Abbau nach langer Pause (7 Stufen → Runden 3 + 3 + 1, Grundlagen zuerst).
- Tests: `localDay` mit −480, −60, −120, +300 je um Mitternacht, dazu mit `process.env.TZ` (Asia/Kuala_Lumpur,
  Europe/Berlin über beide Umstellungen der Sommerzeit 2026); Serie über die Umstellung (alter UTC-Tag = gestern,
  heute, morgen; Kuala Lumpur, Bayern Winter und Sommer, New York): kein Abriss.

**Prüfung (25.11.2026, Fable).** Bestanden nach einer Korrektur.
- **Serie bei der Umstellung (Korrektur).** Die Annahme „östlich liegt der alte UTC-Tag höchstens einen Tag
  zurück“ stimmt nur für eine Runde von heute. Wer **gestern** vor dem alten Tageswechsel geübt hat (Kuala Lumpur
  vor 8 Uhr, Bayern vor 1 bzw. 2 Uhr), hat „vorgestern“ in `lastDay`; die Serie wäre beim ersten Üben nach dem
  Update abgerissen. `migrateWiederholen(s, boxIds, heute, offsetMin)` setzt deshalb einmalig, nur östlich von
  Greenwich (`offsetMin < 0`), ein `lastDay` von vorgestern auf gestern (`load` reicht `now.getTimezoneOffset()`
  durch). Bewusst großzügig: Auch wer wirklich einen Tag ausgelassen hat, behält bei der Umstellung einmal die
  Serie. Westlich von Greenwich gibt es den Fall nicht.
- **Abweichungen des Umsetzers, beurteilt:** Lauf über 40 Tage mit und ohne Ferien getrennt – richtig, die
  Erwartung im Plan (1, 4, 11, 25 **und** Ferien Tag 12 bis 26) widersprach sich. Zwei Ratestufen unter drei
  fälligen → 5 + 5 – richtig (kein Urteil auf nur zwei Aufgaben; die dritte Stufe steht in der nächsten Runde
  vorn). Marker `"wiederholen"` aus `migrateV1` genommen – richtig. `UMSTELLUNG_JE_TAG` als eigene Zahl mit
  Test auf Gleichheit – in Ordnung. `zuletzt: null` bei Einträgen aus der Umstellung: Schritt 8 muss damit
  umgehen (kein Datum anzeigen).
- **Hingenommen:** Ein `lastDay` weit in der Zukunft (falsch gestellte Geräteuhr) friert die Serie ein, bis der
  Tag erreicht ist. `notes[key].last` aus der Zeit vor Welle 11 bleibt ein UTC-Tag (höchstens ein Tag daneben,
  für die Gewichtung in Schritt 9 ohne Belang). `level.guess` ist in den Paketen noch nicht gesetzt (Schritt 5).

#### Schritt 5 – Voraussetzungen in allen Paketen

- Alle fünf Pakete: `needs` je Stufe nach der Tabelle in 1 (wo die Voreinstellung dasselbe ergibt, ohne Feld),
  `stepNeeds` für die zweischrittigen Stufen laut Tabelle, `skill` für jede Stufe, auf die verwiesen wird:
  `noten-1` „Linien im Violinschlüssel“, `noten-2` „Zwischenräume im Violinschlüssel“, `noten-3` „Noten im
  Violinschlüssel“, `noten-4` „Linien im Bassschlüssel“, `noten-5` „Zwischenräume im Bassschlüssel“, `noten-6`
  „Noten im Bassschlüssel“, `noten-7` „Noten mit Vorzeichen“, `noten-8` „Noten in beiden Schlüsseln“,
  `notenwerte-3` „Notenwerte und Pausen erkennen“, `notenwerte-5` „Dauer in Schlägen“, `notenwerte-7`
  „Punktierte Noten“, `notenwerte-9` „Takt füllen“, `intervall-2` „Notenstufen zählen (Prime bis Oktave)“,
  `intervall-4` „Intervalle rein, klein, groß“, `intervall-6` „Verminderte und übermäßige Intervalle“,
  `intervall-7` „Intervalle abwärts“, `intervall-9` „Intervalle bauen“, `tonleitern-3` „Ganz- und
  Halbtonschritte“, `tonleitern-5` „Dur-Tonleitern“, `tonleitern-9` „Vorzeichen der Dur-Tonleitern“,
  `tonleitern-11` „Tonart aus den Vorzeichen“, `akkorde-1` „Dur- und Moll-Dreiklang“, `akkorde-2`
  „Dreiklangstypen“. `guess: true` in Tonleitern 1–3 und Dreiklänge 1.
- `src/repeat.js`: `needsOf(packs, levelId)` (Feld oder Voreinstellung), `stepNeedsOf(level, q, i)`,
  `skillOf(level)`, `needsText(packs, levelId)` → „Noten mit Vorzeichen · Notenstufen zählen (Prime bis
  Oktave)“.
- Tests (`test/repeat.test.js`): Die ganze Tabelle aus 1 als erwartete Werte (jede der 47 Stufen); die Regeln
  aus 1 (ID vorhanden, Ziel ohne Hilfen, Ziel früher im selben oder in einem früheren Paket, kein Kreis); jedes
  Ziel hat `skill`; `stepNeeds` hat so viele Einträge wie die Stufe Schritte.
- Keine Änderung der Oberfläche in diesem Schritt.

#### Schritt 6 – Engine: gemischte Runde

**Ziel.** Eine Runde, deren Aufgaben aus verschiedenen Stufen stammen (Eingabeart, `check`, Ziffern, Namensraster
hängen heute an `r.level`).

- `makeMixed(packs, plan, ctx, rand = Math.random)` (rein): für jeden Eintrag `{ id, n }` erzeugt die Stufe n
  Aufgaben (`level.question(prev, ctx)`, `prev` innerhalb der Stufe), jede bekommt `q.from = level`; danach
  reihum gemischt (nie zwei Aufgaben derselben Stufe hintereinander, solange es anders geht).
- `startMixed(spec, ui, hooks)` mit `spec = { kind: "wiederholen" | "grundlagen", items }`. Im Lauf steht
  `r.mixed = true`; **alle** Stellen, die heute `r.level` lesen (`answer`, `showChoices`, `showQuestion`,
  `applyInput`, `handleKey`, `finishQuestion`), lesen über `cur(r) = r.mixed ? r.items[r.idx].from : r.level`.
- `showQuestion` baut im gemischten Lauf die Eingabe je Aufgabe neu auf (aus `startRound` herausgelöst als
  `setupAnswers(r, level)`: Buchstaben, Namensraster, Auswahlknöpfe, Klaviatur; `r.input =
  effectiveInput(level.input, state.input, namesOnly)`).
- Keine Hilfen und kein „Vorführen“ im gemischten Lauf (`ui.helps.hidden = true`). Warten: nach „daneben“
  immer, nach „richtig“ wie in der Herkunftsstufe (`okWaits(q.from)`), Stufen mit Hilfen kommen nicht vor.
- Herkunft: neues Element `ui.origin` (`#pOrigin`, klein über der Notenzeile, `index.html`): „Intervalle ·
  Stufe 4“ (`originText(pack, level)`, rein).
- Ende: `store.recordMixedRound(s, kind, correct, total, now)` – „wiederholen“: `gained = correct · 10 +
  starsFor(correct) · 20`; „grundlagen“: `gained = correct · 10`; beide `touchStreak`; **kein** Eintrag in
  `s.levels` (keine Sterne, keine beste Runde, keine Freischaltung). Ergebnis an `onFinish`: `{ kind, correct,
  total, gained, avg, results, perLevel: [{ id, n, ok }] }`.
- Für die Fehlermuster (Schritt 7) führt **jede** Runde, auch die normale, ein Protokoll `log: [{ id, ok, oks }]`
  (je Aufgabe die Stufe und das Ergebnis je Schritt) und gibt es im Ergebnis mit.
- Antworten zählen wie bisher über `countAnswer` (`statKey` der Aufgabe, `answered`, `correct`).

**Tests** (`test/engine.test.js`): gemischte Runde mit je einer Aufgabe jeder Eingabeart im Wechsel –
Buchstaben (`noten-3`), Namensraster (`noten-7`), Klaviatur (Vorliebe „keys“), Auswahlknöpfe
(`notenwerte-5`), Ziffern (`intervall-2`), zwei Schritte (`intervall-4`), `namesOnly` (`intervall-9`): richtige
Knöpfe je Aufgabe, richtige Prüfung, Tastatur je Art; `ui.helps` verborgen; `recordMixedRound` (XP, Serie,
`s.levels` unverändert); `perLevel` und `log`; `makeMixed` (Anzahl je Stufe, Reihenfolge, `q.from`). Alle
bisherigen Tests bleiben grün (eine normale Runde verhält sich unverändert).

**Abnahme.** Über die Konsole (`engine.startMixed`) bzw. den vorläufigen Start aus Schritt 7 läuft eine Runde
aus drei Stufen bei 320 und 420 px ohne Überlauf; Wechsel zwischen Namensraster und Auswahlknöpfen ohne Reste
der vorigen Aufgabe.

#### Schritt 7 – „Grundlagen wiederholen“ und Fehlermuster

- `repeat.js`: `basicsPlan(packs, levelId, n = RUNDE_GRUNDLAGEN, only = null)` → `[{ id, n }]` aus `needsOf`
  (gleich verteilt, Rest an die erste; `only`: nur diese eine Grundlage); `basicsOffer(state, packs, levelId,
  heute)` → `{ show, recommend, reason }`: `show`, wenn es Voraussetzungen gibt; `recommend`, wenn eine nie
  gespielt wurde, fällig ist oder zuletzt unter 8 von 10 lag, und seit der letzten Grundlagen-Runde mit
  höchstens einem Fehler kein Auslöser neu zutraf (Merker `s.basics = { "<Stufen-ID>": "JJJJ-MM-TT" }`, zählt
  zum Fortschritt); `gapsOf(packs, level, log)` → Liste `{ need, count, step }` mit `count ≥ LUECKE_AB` (3):
  je Aufgabe mit Schritt i daneben zählt jede Stufe aus `stepNeeds[i]`; bei einschrittigen Stufen zählt eine
  falsche Antwort für `needs` als Ganzes.
- `views/practice.js`:
  - Startkarte: Zeile `#pNeeds` „Dafür brauchst du: Noten mit Vorzeichen · Notenstufen zählen (Prime bis
    Oktave)“ (jeder Eintrag ein Knopf, öffnet die Startkarte jener Stufe) und der Knopf `#pBasics` „Grundlagen
    wiederholen · 6 Aufgaben“. Bei `recommend` steht er als erster, hervorgehoben, mit dem Grund darüber:
    „Empfohlen: ‚Noten mit Vorzeichen‘ hast du hier noch nie geübt.“ / „… ist wieder dran.“ / „… lag zuletzt
    unter 8 von 10.“ Sonst steht er unter „Runde starten“ als ruhiger Knopf (`btn ghost`).
  - `render(arg)`: `arg.mode` „grundlagen“ (mit `arg.levelId`, optional `arg.only`) startet `startMixed`;
    Kopf: „Grundlagen wiederholen“ / „für Intervalle, Stufe 3“; die Wahl Buchstaben/Klaviatur ist verborgen.
  - Ergebniskarte normale Runde: bei weniger als 5 Richtigen „Grundlagen wiederholen“ als erster Knopf; bei
    einem Fehlermuster der Satz „Dreimal lag der erste Schritt daneben (Notenstufen zählen). Das übst du in
    Intervalle, Stufe 2.“ mit „Grundlagen wiederholen“ (nur diese Grundlage) und „Stufe 2 öffnen“.
    Zahlwörter: „Dreimal“, „Viermal“ … „Zehnmal“; „der erste Schritt“ / „der zweite Schritt“; bei
    einschrittigen Stufen „Dreimal lag die Antwort daneben. Das übst du in …“.
  - Ergebniskarte Grundlagen-Runde: „Grundlagen wiederholt“, „5 / 6“, „+50 XP“, je Stufe eine Zeile
    „Intervalle 2 · 3 von 3“ und die Knöpfe „Zurück zu Stufe 3“ (erste), „Nochmal“, „Übersicht“.
- Tests: `basicsPlan` (Verteilung für 1, 2, 3, 4 Voraussetzungen), `basicsOffer` (jeder Auslöser, Verschwinden
  nach einer Runde mit höchstens einem Fehler, Wiederkehr), `gapsOf` (Muster der Liste in 2 mit echten Stufen:
  Intervalle 4 Schritt 1 → `intervall-2`; Tonleitern 4 Schritt 1 → `tonleitern-3`, Schritt 2 → `noten-7`;
  Tonleitern 12; Notenwerte 6, 8); reine Textfunktionen der Start- und Ergebniskarte in
  `test/views/practice.test.js`.
- Abnahme: Startkarte von Intervalle 3 und Tonleitern 12 bei 320 px ohne Überlauf; Grundlagen-Runde zu
  Dreiklänge 1 (aus `intervall-4` und `noten-8`) läuft; nach der Runde ist die Empfehlung weg.

#### Schritt 8 – Wiederholung über Tage: Karte „Heute“, Runde „Wiederholen“, Statistik

- `views/home.js`, `index.html` (Karte `.hero`): reine Funktion `todayCard(state, packs, heute)` →
  `{ title, line, primary, secondary, small }`:
  - etwas fällig: Titel „Wiederholen“, Zeile „10 Aufgaben aus Intervalle 4, Tonleitern 5 und Noten lesen 7“,
    Hauptknopf „Wiederholung starten“, zweiter Knopf „Weiter üben: Tonleitern, Stufe 6“.
  - nichts fällig, Kasten nicht leer: Titel „Bereit für eine Runde?“, Hauptknopf „Weiter üben: Tonleitern,
    Stufe 6“, klein „Nächste Wiederholung: morgen“ / „… in 3 Tagen“.
  - Kasten leer: wie heute („Starten: …“ bzw. „Weiter üben: …“, Satz zur Serie); zusätzlich klein „Was du mit
    8 von 10 schaffst, kommt nach einem Tag zum Wiederholen wieder.“
  - Die große Trefferquote entfällt auf der Startseite (sie steht in der Statistik). „Erst anschauen“ bleibt.
  - „Weiter üben“ nennt jetzt Paket und Stufe (bisher nur „Stufe n“).
- Stufenkarten (`levelHtml`): an fälligen Stufen „↻ wieder dran“ (Text, nicht nur Zeichen; `aria` über den
  sichtbaren Text).
- `views/practice.js`: `arg.mode` „wiederholen“ → `reviewPlan` → `makeMixed` → `startMixed`; Kopf
  „Wiederholen“ / „10 Aufgaben aus 3 Stufen“. Ergebniskarte: „Wiederholung beendet“, Sterne nach `starsFor`
  nur als Anzeige der Runde, „8 / 10“, „+… XP“, je Stufe eine Zeile „Intervalle 4 · sitzt · wieder in 7
  Tagen“ bzw. „Tonleitern 5 · noch wacklig · morgen noch einmal“ mit dem Knopf „Stufe 4 mit Hilfen üben“ (die
  Stufe mit Hilfen direkt davor, falls es sie gibt) bzw. „Stufe 5 üben“; unten „Noch eine Wiederholung“ (nur
  wenn weiter etwas fällig ist) und „Übersicht“.
- Normale Runde: `showResult` ruft `repeat.afterRound`; die Ergebniskarte nennt bei einer neu geschafften Stufe
  ohne Hilfen „Kommt morgen zum Wiederholen wieder.“
- `views/stats.js`: je Stufe im Kasten fünf Kästchen (`boxHtml(fach)`, gefüllt bis zum Fach, `role="img"`,
  `aria-label="Fach 3 von 5"`) und „zuletzt geübt am 24.11.“; Stufen mit Hilfen und Stufen außerhalb des
  Kastens ohne Kästchen. Eine Zeile Erklärung: „Fach 1 kommt nach einem Tag wieder, Fach 5 nach 30 Tagen.“
- CSS: Kästchen und „↻“ über vorhandene Tokens; die Karte „Heute“ einspaltig bei 320 px.
- Tests: `todayCard` (drei Fälle, Wortlaut, Aufzählung mit „und“), Zeilen der Ergebniskarte (`reviewLine`),
  `boxHtml`, `afterRound` im Ablauf (`test/views/*.test.js`, `test/repeat.test.js`); der Lauf über 40 Tage
  bleibt grün.
- Abnahme: mit einem vorbereiteten Stand (drei fällige Stufen) zeigt die Startseite die Karte, die Runde läuft,
  die Ergebniskarte nennt je Stufe das Urteil, die Statistik die Fächer; nichts ist rot, kein Zähler für
  Versäumtes; kein Überlauf bei 320 px.

#### Schritt 9 – Gewichtete Auswahl in Intervalle und Tonleitern, Gewicht nach Tagen

- `src/adapt.js`: `TAGE_WIE_NEU = 7`; `weight(entry, heute)`: Eine „sichere“ Aufgabe, deren `last` mindestens
  `TAGE_WIE_NEU` Tage zurückliegt, bekommt das Gewicht von „neu“ (ohne `heute` wie bisher). Neu
  `pickAmong(cands, keyOf, notes, rand, heute)`: gewichtete Wahl aus einer schon gefilterten Liste (mit
  `ANTEIL_ZUFALL`), ohne eigene Regel zu `prev`.
- `packs/intervalle.js` (`pickItem`, `pickBy`, `pickBuild9`, `pickCheck`) und `packs/tonleitern.js` (`pickItem`,
  `pickStep`): An der Stelle, an der heute gleichverteilt aus den Kandidaten gezogen wird, zieht `pickAmong`
  über `statKey`, wenn `ctx.notes` da ist. **Alle Regeln davor bleiben** (Gruppen gleich häufig, Anteil der
  Halbtonschritte `HALF_P`, „Prime höchstens einmal je Runde“, nie dieselbe Aufgabe zweimal hintereinander).
  Ohne `ctx.notes` (Stichprobe `okTextsMax`, Tests) verhalten sich die Pakete wie bisher.
- „Notenwerte und Pausen“ und „Dreiklänge“ schreiben keine `statKey`s und bleiben unverändert (siehe „Nicht in
  dieser Welle“).
- Tests: `weight` mit Datum (6 Tage: sicher, 7 Tage: wie neu); `pickAmong` mit festem Zufall; je Paket: eine als
  „unsicher“ eingetragene Aufgabe kommt in 2000 Zügen deutlich öfter als im Mittel, die Regeln der Vorräte gelten
  weiter (bestehende Tests grün).
- Abnahme: `npm test` grün; fünf Runden Intervalle 4 und Tonleitern 5 im Browser ohne Auffälligkeiten.
  Dieser Schritt ist von den anderen unabhängig; zeigt die Prüfung Nebenwirkungen in den Vorräten, wird er
  zurückgenommen, ohne dass etwas anderes davon abhängt.

#### Schritt 10 – QR-Code-Modul (`src/qr.js`)

Eigener kleiner Encoder, keine Abhängigkeit, kein Netz, rein (ohne DOM); die Datei kommt in `PRECACHE` und läuft
damit offline.

- Umfang: QR-Code Modell 2, **Byte-Modus** (UTF-8), **Fehlerkorrektur M**, **Versionen 1 bis 10** (bis 213
  Bytes). Die Links dieser Welle haben 55 Zeichen (`…/notenlernapp/#klasse=6`, Version 4) bis etwa 135 Zeichen
  (eigener Zuschnitt für alle fünf Pakete, Version 8). Längerer Text → `null` (die Seite zeigt dann nur den
  Link).
- Schnittstelle: `qrMatrix(text)` → `{ version, size, mask, modules: boolean[][] }` oder `null`;
  `qrSvg(text, { scale = 6, margin = 4 })` → SVG-Text (ein `<path>` für die dunklen Module auf heller Fläche,
  Ruhezone 4 Module, `shape-rendering="crispEdges"`, `role="img"` mit `aria-label`). Farben über zwei eigene
  Tokens `--qr-dark` und `--qr-light` auf `:root`, **in hell und dunkel gleich** (schwarz auf weiß; ein
  umgekehrter Code ist für viele Scanner unlesbar).
- Bausteine und feste Tabellen (im Code als Konstanten, mit Kommentar zur Herkunft ISO/IEC 18004):
  - Datenbytes je Version bei M: 16, 28, 44, 64, 86, 108, 124, 154, 182, 216; Fehlerkorrektur-Bytes je Block:
    10, 16, 26, 18, 24, 16, 18, 22, 22, 26; Blöcke: 1, 1, 1, 2, 2, 4, 4, 2 + 2 (38 und 39 Datenbytes), 3 + 2
    (36 und 37), 4 + 1 (43 und 44). Nutzbare Bytes im Byte-Modus: 14, 26, 42, 62, 84, 106, 122, 152, 180, 213
    (Modus 4 Bit, Länge 8 Bit bis Version 9, 16 Bit bei Version 10).
  - Auffüllen: Abschluss 0000, auf volle Bytes, dann abwechselnd 236 und 17.
  - Reed-Solomon über GF(256) mit dem Polynom 0x11D; Blöcke verschränkt (erst Daten, dann Fehlerkorrektur);
    Restbits: Version 2 bis 6 je 7, sonst 0.
  - Muster: drei Suchmuster mit Trennern, Taktlinien, dunkles Modul, Ausrichtungsmuster (Mitten: V2 6/18, V3
    6/22, V4 6/26, V5 6/30, V6 6/34, V7 6/22/38, V8 6/24/42, V9 6/26/46, V10 6/28/50).
  - Formatangabe: 15 Bit, BCH mit 0x537, Maske 0x5412; Versionsangabe ab Version 7: 18 Bit, BCH mit 0x1F25.
  - Alle acht Masken, Wahl nach den vier Strafregeln.
- **Tests (`test/qr.test.js`).** Verlässlich ableitbare Bezugswerte (am 25.11.2026 nachgerechnet):
  - Formatangabe für M, Maske 0 bis 7: `101010000010010`, `101000100100101`, `101111001111100`,
    `101101101001011`, `100010111111001`, `100000011001110`, `100111110010111`, `100101010100000`.
  - Versionsangabe: V7 `000111110010010100`, V8 `001000010110111100`, V9 `001001101010011001`, V10
    `001010010011010011`.
  - Reed-Solomon: Daten `32 91 11 120 209 114 220 77 67 64 236 17 236 17 236 17` mit 10 Prüfbytes →
    `196 35 39 119 235 215 231 226 93 23` (bekanntes Beispiel „HELLO WORLD“, Version 1-M).
  - Kapazitäten: Texte mit 14/15, 26/27 … 213/214 Bytes ergeben Version n bzw. n + 1 (214 → `null`).
  - Struktur für jede Version 1 bis 10: Größe 17 + 4 · Version; Suchmuster, Trenner, Taktlinien, dunkles Modul
    und Ausrichtungsmuster an ihren Stellen; die gelesene Formatangabe ist eine der acht oben und passt zu `mask`.
  - **Selbstprüfung durch Rücklesen** (statt fertiger Bezugsmatrizen: eine ganze Matrix lässt sich hier nicht
    verlässlich von Hand ableiten, und eine Bibliothek darf nicht ins Projekt): Ein kleiner Leser nur im Test
    (Format lesen, Maske abnehmen, Bytes im Zickzack lesen, Blöcke entschränken, Reed-Solomon-Syndrome müssen
    0 sein, Byte-Modus auslesen) gibt für jeden Link dieser Welle (alle Jahrgänge, mit `zweig`, mit `dran`,
    `keine`) und für Zufallstexte jeder Länge 1 bis 213 genau den Text zurück. Dazu ein Test mit Umlauten
    (UTF-8).
  - Ehrlich: Rücklesen mit eigenem Leser findet keinen Fehler, den Schreiber und Leser gemeinsam haben (z. B.
    eine falsch verstandene Leserichtung). Deshalb zusätzlich, **außerhalb von `npm test`**: In der
    Cloud-Umgebung den Code für drei Links als Bild rendern (Playwright) und mit einem unabhängigen Leser
    prüfen (dort vorhanden: `cv2.QRCodeDetector` aus OpenCV); Ergebnis im Commit vermerken. Und Sandra scannt
    vor dem Push einmal mit der Handykamera (Abschnitt 8).
- Abnahme: `npm test` grün; die Gegenprobe mit dem unabhängigen Leser liest alle drei Links.

#### Schritt 11 – Jahrgang: Tabelle, Link, Bestätigung, Öffnen

- `src/klasse.js` (neu, rein): `JAHRGAENGE = [5 … 13]`; `DRAN` und `DRAN_MUG` nach der Tabelle in 4 (je Jahrgang
  ein Objekt je Paket-ID; Quellen als Kommentar); `dranFor(jahrgang, zweig)`; `parseLink(hash, packs)` →
  `{ jahrgang, zweig, dran }`, `{ keine: true }` oder `null` (streng: nur die Formen aus 4; unbekannter
  Parameter, unbekanntes Paket, Zahl außerhalb 0 … Stufenzahl, doppelte Angabe, Jahrgang außerhalb 5 … 13 →
  `null`); `buildLink(base, { jahrgang, zweig, dran }, packs)` (nennt nur Abweichungen von der Voreinstellung;
  `parseLink(buildLink(x))` ergibt wieder x); `sameKlasse(a, b)`; `klasseText(k)` → „Jahrgang 6“ / „Jahrgang 6,
  Musisches Gymnasium“ / „Jahrgang 6, eigene Auswahl“; `sections(state, packs)` → `{ jetzt, gewesen, hinaus }`
  (Listen von Stufen-IDs nach 4, „Was die Einstellung ändert“); `nextUp(state, packs)` (erste nicht geschaffte
  Stufe aus „Jetzt dran“ oder `null`).
- `src/store.js`: `isUnlocked` zusätzlich wahr, wenn `level.no ≤ (s.klasse && s.klasse.dran[pack.id] || 0)`.
  `setKlasse(s, k)` / `clearKlasse(s)` (einzige Stellen, die `klasse` schreiben).
- `src/app.js`: beim Start und bei `hashchange` die Adresse lesen. `#klasse=…`: `parseLink`; `null` → Hinweis
  „Der Link passt nicht zu dieser App-Version.“ (Leiste wie der Update-Hinweis, „Schließen“); gleich der
  geltenden Einstellung → nichts; sonst Bestätigung in einem `<dialog id="klasseDialog">` (`showModal`, Fokus
  auf dem ersten Knopf, Escape = „Nicht übernehmen“):
  - Setzen: Überschrift „Einstellung deiner Lehrkraft übernehmen?“, darunter „Jahrgang 6“ (bzw. `klasseText`)
    und „Alles bis dahin ist dann sofort offen. Dein Fortschritt bleibt, es schließt sich nichts.“; bei einer
    bestehenden Einstellung zusätzlich „Bisher: Jahrgang 5.“ Knöpfe „Übernehmen“ und „Nicht übernehmen“.
  - Entfernen: „Jahrgang entfernen?“, „Dein Fortschritt bleibt, es schließt sich nichts.“, Knöpfe „Entfernen“
    und „Nicht entfernen“.
  - Danach in jedem Fall `history.replaceState` ohne die Angabe; Startseite neu zeichnen.
- `grade` aus allen fünf Paketen entfernen; Tests anpassen (`test/packs/intervalle.test.js` Zeile 32,
  `tonleitern.test.js` Zeile 33, `notenwerte.test.js` Zeile 40); ARCHITEKTUR (Paket-Schnittstelle).
- Tests (`test/klasse.test.js`, `test/store.test.js`): Tabelle je Jahrgang wie in 4 und **aufsteigend** (kein
  Jahrgang hat weniger als der davor); `parseLink` für jede gültige Form und eine Liste ungültiger (leerer
  Wert, `klasse=4`, `klasse=14`, `dran=noten:9`, `dran=foo:1`, `dran=noten:x`, zusätzlicher Parameter,
  Großschreibung); Rundlauf `buildLink`/`parseLink`; `offenMitKlasse ⊇ offenOhneKlasse` für alle Jahrgänge und
  mehrere Spielstände; Wechsel 7 → 5 → keine schließt keine gespielte oder nach der üblichen Regel offene
  Stufe; `sections` (Jahrgang 5 ohne Fortschritt: alles aus „dran“ in „Jetzt dran“; Jahrgang 7 ohne
  Fortschritt: „Jetzt dran“ = Dreiklänge 5 und 6, alles andere bis „dran“ in „Schon dran gewesen“; Jahrgang 9:
  „Jetzt dran“ leer); ungültiger Link fasst den Spielstand nicht an; `reset` behält `klasse`.
- Abnahme (Browser): `#klasse=6` fragt einmal, „Übernehmen“ öffnet Intervalle 3 und 4 sofort, Neuladen fragt
  nicht wieder; `#klasse=keine` entfernt; `#klasse=99` zeigt den Hinweis; Dialog mit Tastatur bedienbar, bei
  320 px ohne Überlauf.

#### Schritt 12 – Lehrkraft-Seite mit Link und QR-Code, Abschnitte der Startseite

- `src/views/lehrkraft.js` (neu), `index.html` (`<section id="view-lehrkraft" hidden>`), `app.js` (Ansicht
  `lehrkraft`, erreichbar über `#lehrkraft` und `hashchange`; kein Eintrag in der unteren Leiste; „Zurück zur
  App“ führt zur Startseite), `sw.js` (`PRECACHE`).
- Inhalt (Anrede „Sie“):
  - Überschrift „Für Lehrkräfte“, Einleitung: „Hier erzeugen Sie einen Link und einen QR-Code für Ihre Klasse.
    Die Schülerinnen und Schüler öffnen den Link oder scannen den Code und bestätigen einmal. Der Link enthält
    nur den Jahrgang und die Auswahl der Stufen – keine Namen, keine Ergebnisse. Nichts verlässt das Gerät.
    Auf diesem Gerät ändert sich durch diese Seite nichts.“
  - „Jahrgang“: Auswahl 5 bis 13; Kästchen „Musisches Gymnasium“.
  - „Was ist dran?“: je Paket eine Auswahl „bis Stufe …“ (0 = „noch nichts“, sonst Nummer und Titel der Stufe),
    vorbelegt aus der Tabelle; Knopf „Voreinstellung für Jahrgang 6“. Darunter klein: „Voreinstellung nach dem
    LehrplanPLUS (Gymnasium Bayern, Musik). Alles Frühere bleibt offen, nichts wird gesperrt.“
  - „Link für die Klasse“: der Link als Text (nur lesbar, markierbar), „Link kopieren“ (Rückmeldung „Kopiert“),
    der QR-Code (`qrSvg`), „QR-Code groß zeigen“ (füllt die Breite, für Beamer und Tafel; `Esc` bzw. „Schließen“).
  - „Jahrgang wieder entfernen“: Link `#klasse=keine` mit eigenem, kleinerem QR-Code.
  - Basis des Links: `location.origin + location.pathname`.
- Reine Teile für Tests: `linkFor(base, form, packs)`, `optionsFor(pack)`.
- `views/home.js`: mit gesetztem Jahrgang drei Abschnitte aus `klasse.sections`: „Jetzt dran“ (Stufenkarten
  mit dem Paketnamen in der Unterzeile), „Schon dran gewesen“ (je Paket ein Abschnitt wie heute), „Darüber
  hinaus“ (`<details>`, zugeklappt, je Paket). Ist „Jetzt dran“ leer: Satz „In Jahrgang 9 kommt nichts Neues
  dazu. Alles hier ist zum Wiederholen da.“ Über den Abschnitten klein „Jahrgang 6 · über den Link deiner
  Lehrkraft“. Ohne Jahrgang bleibt die Startseite wie nach Schritt 8. „Weiter üben“ nimmt `klasse.nextUp`,
  sonst wie bisher.
- `views/stats.js`: am Ende „Jahrgang 6 (über den Link deiner Lehrkraft)“ bzw. nichts; Textlink „Für
  Lehrkräfte“ (`href="#lehrkraft"`).
- Tests: `test/views/lehrkraft.test.js` (Link je Auswahl, nur Abweichungen im Link, MuG), reine Teile der
  Startseite (`homeSections`-Texte), `test/sw.test.js` (neue Dateien in `PRECACHE`).
- Abnahme: Seite bei 320 und 420 px ohne Überlauf, QR-Code scharf und mit Ruhezone, im dunklen Modus schwarz
  auf weiß; der gescannte Link öffnet die App mit der Bestätigung; offline (Netz aus, nach erstem Laden)
  erscheint der QR-Code weiter.

#### Schritt 13 – Doku, Cache, Bildschirmfotos, Überlauf, Lauf über 40 Tage

- Doku: `docs/ARCHITEKTUR.md` (neue Module `repeat.js`, `klasse.js`, `qr.js`, `views/lehrkraft.js`; Engine:
  gemischte Runde, `cur(r)`, `ui.origin`, Protokoll; Paket-Schnittstelle: `needs`, `stepNeeds`, `skill`,
  `guess`, `tab`, ohne `grade`; Fortschritt: `rep`, `klasse`, `basics`, Marker, örtliches Datum; Ansichten:
  Reiter in „Lernen“, Karte „Heute“, Adress-Angaben `#lehrkraft` und `#klasse=…`), `docs/KONZEPT.md`
  (Wiederholen ist der Kern, Jahrgang), `README.md` (Pakete in neuer Reihenfolge, „Für Lehrkräfte“ mit der
  Adresse, Datenschutz-Satz zum Link), `CLAUDE.md` (Stand Welle 11, feste Entscheidungen vom 24./25.11.2026),
  dieser Abschnitt um „Umgesetzt“ ergänzt (Commits je Schritt, Entscheidungen der Prüfer).
- `sw.js`: Cache **`notenheld-v0.2.0-14`**; `PRECACHE` mit `src/repeat.js`, `src/klasse.js`, `src/qr.js`,
  `src/views/lehrkraft.js` (`test/sw.test.js` prüft die Vollständigkeit).
- **Neues Skript `docs/screens/pruefung.mjs`** (Bildschirmfotos für die Prüfung aus drei Perspektiven; Playwright
  wie in `screenshots.mjs`, keine Abhängigkeit der App): 420 px hell und 320 px dunkel, ganze Seite, feste Uhr
  (`page.clock.setFixedTime`), vorbereitete Spielstände über `addInitScript`; Ausgabe nach `OUT` (Vorgabe
  `/tmp/notenheld-pruefung-w11/`, nicht im Repo). Aufnahmen: Startseite (leer; mit Karte „Heute“ fällig; nichts
  fällig; mit Jahrgang 5, 7 und 9), jede Startkarte mit „Dafür brauchst du“ (mindestens Intervalle 3,
  Tonleitern 12, Dreiklänge 1, Notenwerte 6; mit und ohne Empfehlung), Runde „Wiederholen“ (Aufgabe je
  Eingabeart, nach „daneben“, Ergebniskarte mit „sitzt“ und „noch wacklig“), Runde „Grundlagen wiederholen“
  (Aufgabe, Ergebniskarte), Ergebniskarte mit Fehlermuster, „Lernen“ je Reiter und Schlüssel, Notenwerte 4 bis
  7 (Frage, Rückmeldung richtig und daneben, Vorführung „So bestimmst du die Dauer“ alle Bilder, Lerntafel),
  Intervalle 3 mit offener Vorführung (ein Knopf), Seite „Für Lehrkräfte“ (Voreinstellung, eigene Auswahl,
  QR-Code groß), Bestätigung des Links (setzen, ändern, entfernen, ungültig), Statistik mit Fächern und
  Jahrgang.
- **`docs/screens/ueberlauf.mjs` erweitert** auf alle neuen Ansichten: Startseite in den Zuständen oben,
  Startkarten mit Voraussetzungen, eine ganze Runde „Wiederholen“ und „Grundlagen wiederholen“ (jede Aufgabe,
  richtig und daneben im Wechsel), deren Ergebniskarten, „Lernen“ je Reiter, Seite „Für Lehrkräfte“ (auch „groß
  zeigen“), der Dialog, Statistik mit Fächern; dazu die Zählung sichtbarer „Nächste Aufgabe“-Knöpfe aus
  Schritt 0. Ziel: 0 Treffer bei 320 und 420 px.
- **Lauf über 40 Tage im Browser** (`docs/screens/uhr40.mjs`, `page.clock`): Tag 0 drei Stufen mit 9 von 10
  spielen; Uhr tageweise vorstellen; an jedem Tag prüfen, was die Karte „Heute“ zeigt, fällige Runden spielen
  (richtig), einmal bewusst daneben, Ferienpause Tag 12 bis 26; am Ende die Fächer in der Statistik mit der
  Erwartung aus `test/repeat.sim.test.js` vergleichen; zu keinem Zeitpunkt ist eine zuvor offene Stufe zu
  (Leitsatz 3). Ende mit Code 1 bei Abweichung. Der reine Lauf aus Schritt 4 bleibt Teil von `npm test`.
- `docs/screens/screenshots.mjs` läuft weiter (README-Bilder neu, Stand mit Jahrgang und Karte „Heute“).

**Spielstände.** Kein Wechsel des Schlüssels (`notenheld.v2`). Neu: `rep`, `klasse`, `basics` und der Marker
`"wiederholen"`. Stufen-IDs, `statKey`s, Sterne und Freischaltung bleiben; die Einstellung `klasse` öffnet nur.
Test: alter Stand (ohne die neuen Felder, mit den drei alten Markern) lädt, bekommt einmal die Umstellung und
wird danach nicht mehr neu gespeichert.

**Reihenfolge und Prüfung.**
- Schritte 0 bis 13 nacheinander auf `wiederholen-11`. Abhängigkeiten: 5 braucht 3 und 4; 6 braucht 4; 7
  braucht 5 und 6; 8 braucht 6; 11 braucht 4; 12 braucht 8, 10 und 11. Die Schritte 0 bis 3 (Sandras Wünsche
  und die Reihenfolge) stehen bewusst am Anfang und sind für sich abgeschlossen.
- **Abschluss:** Prüfung aus drei Perspektiven (drei getrennte Prüfer: Lehrkraft, Jugendliche, Wissenschaft)
  mit den Bildschirmfotos aus Schritt 13 und dem Code; je Abschnitt die vier Fragen (inhaltlich richtig,
  übersichtlich, anschaulich, ansprechend). Danach Korrektur (Opus) und Nachprüfung (Fable). Erst dann Sandra
  fragen, ob gepusht wird.

**Nicht in dieser Welle.**
- `statKey`s und gewichtete Auswahl für „Notenwerte und Pausen“ und „Dreiklänge“ (bräuchten lesbare Schlüssel
  für „Schwache Stellen“).
- Feinere Fehlermuster aus der gewählten Antwort („immer einen Halbton zu viel“).
- Dominantseptakkord und das Paket „Dreiklänge Schritt für Schritt“ (Vorgabe im nächsten Abschnitt).
- Export/Import des Spielstands, Klassenübersicht für die Lehrkraft (bräuchte einen Server).

### 7. Entscheidungen zu den offenen Fragen

Sandras Antworten (24.11.2026):
- Abstände und Rundenlängen: 1 · 3 · 7 · 14 · 30 Tage, 10 bzw. 6 Aufgaben – so beginnen.
- Platz der Wiederholung: ganz oben auf der Startseite.
- Tagesserie und Erfahrungspunkte: Die Wiederholungsrunde zählt wie eine normale Runde.
- Kanten: „Intervalle“ kommt vor „Tonleitern“; die Tabelle in 1 ist danach an den Vorräten nachgeprüft.
- Jahrgänge: 5 bis 13, Zuordnung nach dem LehrplanPLUS (Tabelle in 4 mit Quellen).
- Jahrgang ändern: nur über den Lehrkraft-Link.
- Link und QR-Code: beides.
- Mit gesetztem Jahrgang sind auch die Stufen innerhalb von „Jetzt dran“ sofort offen.
- Name der Runde: „Wiederholen“.

Vom Feinplan entschieden (Fable, 25.11.2026; jeweils als Konstante gebaut):
- Urteil „sitzt“: höchstens ⌊n / 5⌋ Fehler bei n Aufgaben der Stufe; höchstens drei Stufen je Runde, damit je
  Stufe mindestens drei Aufgaben das Urteil tragen.
- Stufen mit nur zwei Knöpfen (Raten): mindestens vier Aufgaben in der Runde.
- Fehlermuster: ab drei Fehlern desselben Schritts in einer normalen Runde; in gemischten Runden keine Muster.
- Erfahrungspunkte: „Wiederholen“ wie eine normale Runde (10 je Richtige und der Sterne-Bonus), „Grundlagen
  wiederholen“ 10 je Richtige ohne Bonus; beide zählen für die Tagesserie; keine der beiden trägt Sterne ein.
- Lehrkraft-Seite über `#lehrkraft`; sie setzt nichts auf dem eigenen Gerät. Entfernen des Jahrgangs nur über
  den Link `#klasse=keine`.
- `klasse.dran` wird beim Übernehmen fest eingetragen.
- Keine Kante auf ein späteres Paket (Intervalle 3/4, Schritt 2, verweist nicht mehr auf `tonleitern-3`).

### 8. Offen für Sandra (Welle 11)

Gebaut wird jeweils die genannte Voreinstellung.
1. **W1 Wortlaut:** „Wie viele Schläge dauert diese Note? (1 Schlag = 1 Viertelnote)“, Rückmeldung „Richtig!
   Achtelnote = ½ Schlag“, in den Stufen 1–3 „(dauert ½ Schlag)“, Titel „Dauer in Schlägen“ – so recht?
2. **W2:** Bei offener Vorführung bleibt der Knopf am Ende der Vorführung, der unter den Antworten verschwindet
   (sonst umgekehrt). Oder soll immer nur der Knopf unter den Antworten stehen?
3. **W3 Reiter:** Tonhöhen · Notenwerte · Takt · Intervalle · Tonleitern · Dreiklänge. „Takt“ enthält „So
   zählst du einen Takt“ und „Balken“; der Quintenzirkel steht unter „Tonleitern“ (Tafel mit Merksprüchen) und
   unter „Dreiklänge“ (Ring). Eigener Reiter „Quintenzirkel“ gewünscht? Schlüsselwahl in „Notenwerte“ und
   „Takt“ ausgeblendet – recht?
4. **Lehrplan, nicht wörtlich belegt** (Tabelle in 4): Punktierung und „Takt füllen“ in Jahrgang 5
   (Notenwerte 6–10); Tonart aus den Vorzeichen bis 7 Vorzeichen und parallele Molltonart in Jahrgang 6
   (Tonleitern 10–13); Dreiklänge 2 (vermindert, übermäßig) in Jahrgang 6 und 5 (Quintenzirkel) in Jahrgang 7,
   weil die Angabe „bis Stufe n“ sie mitzieht; Dreiklänge in Jahrgang 5 gar nicht (Stufe 1 fragt Dur oder
   Moll).
5. **Verminderte und übermäßige Intervalle** (Intervalle 5–10): laut Lehrplan nur am Musischen Gymnasium
   (Jahrgang 6). Am übrigen Gymnasium in keinem Jahrgang „dran“, sondern „Darüber hinaus“ – oder ab einem
   bestimmten Jahrgang für alle?
6. **Musisches Gymnasium** als eigene Voreinstellung (Kästchen auf der Lehrkraft-Seite, `zweig=mug`) – gewünscht?
7. **Halbtöne vor Intervalle 3?** Seit „Intervalle“ vor „Tonleitern“ steht, kommen „Ganz- und Halbtonschritte“
   (Tonleitern 1–3) erst nach „rein, klein, groß“. Intervalle 3 erklärt das Zählen der Halbtöne selbst mit
   Klaviatur. So lassen, oder die drei Stufen später vorziehen (eigene Welle)?
8. **Lehrkraft-Seite:** erreichbar über die Adresse `…/#lehrkraft` und einen unauffälligen Textlink am Ende der
   Statistik – oder nur über die Adresse? Anrede dort „Sie“ – recht?
9. **Schutz:** Der Link ist kein Schloss. Wer die Lehrkraft-Seite findet, kann sich selbst einen Link bauen.
   Mehr geht ohne Server nicht. In Ordnung?
10. **Namen der Abschnitte** mit Jahrgang: „Jetzt dran“ · „Schon dran gewesen“ · „Darüber hinaus“ (statt
    „Wiederholen“ und „Später“, weil „Wiederholen“ jetzt die Runde heißt und „Später“ in Jahrgang 13 nicht
    passt).
11. **Startseite:** Die große Trefferquote oben entfällt (steht in der Statistik). Recht?
12. **Wiederholungsrunde:** höchstens drei Stufen (4 + 3 + 3 Aufgaben), „sitzt“ nur ohne Fehler bei 3 oder 4
    Aufgaben. Nach dem Test mit Kindern nachstellen?
13. **Nach dem Update:** Schon geschaffte Stufen kommen in Fach 1, je Tag drei, beginnend am ersten Tag.
14. **QR-Code:** Bitte vor dem Push einmal mit der Handykamera scannen (Tafel/Beamer und Bildschirm).
15. **Dominantseptakkord** (nächster Abschnitt): die markierten Punkte.

## Vorgabe für das Paket „Dreiklänge Schritt für Schritt“ (nach Welle 11): bis zum Dominantseptakkord

Sandra, 25.11.2026 (W4): Das neue Paket „Dreiklänge Schritt für Schritt“ (nach Welle 11 und „Noten lesen“) führt
**bis zum Dominantseptakkord**. In Welle 11 wird davon nichts gebaut; dieser Abschnitt ist die Vorgabe für den
Feinplan des Pakets. Er ergänzt die Vorgaben vom 20.11.2026 (KONZEPT-gehirngerecht: Terzen schichten;
Umkehrungen vor „Grundton bestimmen“).

**Lehrplan** (LehrplanPLUS Gymnasium Bayern, Musik 7, Lernbereich 4,
<https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/7/musik>, abgerufen am 25.11.2026):
Kompetenzerwartung für alle: „beschreiben das Verhältnis von Haupt- und Nebenstufen und verwenden sie, ebenso wie
den Dominantseptakkord, bei der Liedbegleitung auf der Grundlage von Akkordsymbolen.“ Inhalte: „Aspekte der
Harmonik: Einfache Kadenz, Haupt- und Nebenstufen“; nur Musisches Gymnasium: „(MuG) Dominantseptakkord und seine
Umkehrungen“. Zuvor Jahrgang 5 „Dur-Dreiklang (Grundform)“, Jahrgang 6 „Tonleitern und Dreiklänge in Dur und
Moll; Dreiklangsumkehrung“.

**Was gelehrt wird** (Anforderung; Stufenfolge wie überall: neuer Inhalt mit Hilfen, die nächste Stufe festigt
ohne Hilfen):
1. Dreiklang als zwei geschichtete Terzen; Dur und Moll, dann vermindert und übermäßig (heute `akkorde-1`, `-2`).
2. Umkehrungen (Grundstellung, Sextakkord, Quartsextakkord), **danach** „Grundton bestimmen“ aus gemischten
   Stellungen (Vorgabe 20.11.).
3. Stufendreiklänge in Dur, Haupt- und Nebenstufen (heute `akkorde-6`).
4. **Dominantseptakkord:** der Dur-Dreiklang auf der V. Stufe mit einer weiteren Terz darüber – vier Töne,
   die Septime über dem Grundton ist klein. Beispiel C-Dur: g–h–d–f, Akkordsymbol G7.
   - Erkennen: Vierklang aus drei Terzen; Unterscheidung vom Dreiklang.
   - Bestimmen: Grundton nennen; zu welcher Dur-Tonart gehört er als Dominante (Grundton = V. Stufe)?
   - Bauen: Dominantseptakkord einer gegebenen Dur-Tonart notieren bzw. den fehlenden Ton ergänzen.
   - Akkordsymbol lesen (G7, D7 …), passend zur Kompetenzerwartung „auf der Grundlage von Akkordsymbolen“.

**Einordnung in das Zwei-Schritte-Schema** (violett = Schritt 1, grün = Schritt 2; wie in den anderen Paketen):
- Schritt 1 (violett) „Terzen schichten“: die Töne so ordnen, dass sie im Terzabstand übereinanderstehen; der
  unterste Ton der Schichtung ist der Grundton (dasselbe Verfahren wie bei den Dreiklangs-Umkehrungen).
- Schritt 2 (grün) „Terzen bestimmen“: große Terz – kleine Terz – kleine Terz → Dominantseptakkord (Dur-Dreiklang
  mit kleiner Septime).
- Hilfen: Klaviatur mit den vier Tönen, Terz-Tabelle; Vorführung „So baust du einen Dominantseptakkord“ Terz für
  Terz, am Ende mit Klang.
- Voraussetzungen (Kanten): `intervall-4` (große und kleine Terz, kleine Septime), die Stufen „Dreiklangstypen“
  und „Stufendreiklänge“ des neuen Pakets, `tonleitern-9` (Tonleiter mit Vorzeichen).

**Fachlich von Sandra zu prüfen, bevor der Feinplan entsteht** [OFFEN Sandra] – hier bewusst nichts festgelegt:
- Nur in Dur oder auch in Moll (Dominante mit erhöhtem Leitton)?
- Welche Tonarten (wie bei den Stufenakkorden bis 4 Vorzeichen)?
- Umkehrungen des Dominantseptakkords (Quintsextakkord, Terzquartakkord, Sekundakkord): laut Lehrplan nur MuG –
  als eigene Stufen für die MuG-Voreinstellung, oder weglassen?
- Auflösung in die Tonika (Leitton aufwärts, Septime abwärts) und die verminderte Quinte zwischen Terz und
  Septime: gehört das in dieses Paket, in die „einfache Kadenz“ oder in die Hörstufen?
- Schreibweise der Akkordsymbole (G7; in B-Tonarten z. B. B7 für den Akkord auf B – deutsche oder
  internationale Buchstaben?).
- Zuordnung zum Jahrgang in der Tabelle der Lehrkraft-Einstellung (Voreinstellung: Jahrgang 7).


## Später (nicht geplant, nur notiert)

- Altschlüssel für Bratsche als Stufen in „Noten lesen“.
- Gehörbildung: Note hören und auf der Zeile setzen.
- Export und Import des Fortschritts als Datei.
- Lehrkraft-Modus mit Klassen-Code und Klassenübersicht (bräuchte einen Server, bewusst
  zurückgestellt; den Jahrgang setzt seit Welle 11 der Lehrkraft-Link ohne Server).

---

## Einstieg in Claude Code auf dem Mac

Repo klonen, Ordner in Claude Code (Desktop) öffnen und diesen Prompt
einfügen:

```
Du arbeitest im Projekt Notenheld, einer Notenlernapp für Gymnasiasten.
Lies zuerst CLAUDE.md, dann docs/KONZEPT.md, docs/ARCHITEKTUR.md und
docs/PLAN.md. Fasse mir in zehn Zeilen zusammen, was die App heute kann,
wie die Zielarchitektur aussieht und welches Arbeitspaket als Nächstes
dran ist. Starte dann mit Paket A aus docs/PLAN.md: Plan-Modus, zeig mir
deinen Vorgehensplan, warte auf mein Okay, dann umsetzen. Arbeite auf einem
Branch paket-a und committe auf Deutsch. Erfinde keine Musiktheorie.
```

Für Welle 2 danach je Paket eine eigene Session mit dem Prompt aus dem
jeweiligen Abschnitt (B bis E), jeweils auf einem eigenen Branch.
