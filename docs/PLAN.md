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
Keine statKeys im Paket. Die Abbildung ist geprüft: jede alte Stufe landet auf der neuen Stufe gleichen Inhalts
ohne Hilfen. Die Reihenfolge ist hier unkritisch (die beiden anderen Umstellungen fassen `notenwerte-*` nicht
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

## Später (nicht geplant, nur notiert)

- Altschlüssel für Bratsche als Stufen in „Noten lesen“.
- Gehörbildung: Note hören und auf der Zeile setzen.
- Export und Import des Fortschritts als Datei.
- Lehrkraft-Modus mit Klassen-Code (bräuchte einen Server, bewusst
  zurückgestellt).

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
