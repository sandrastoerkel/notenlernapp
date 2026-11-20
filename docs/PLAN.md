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
  (Vorführung: Zurück / Abspielen mit Pause, 1 s je Bild, hält am Ende / Nächster Schritt, Schritt-Marken, Zähler,
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

**Akzeptanz.** `npm test` grün; Browser 420 und 320 px, hell und dunkel: jede Stufe Hilfen auf und zu,
eine Aufgabe ganz richtig, eine mit danebenliegender Zahl und dann Qualität; Klaviatur markiert richtig,
nichts abgeschnitten oder überlappend, kein waagrechter Überlauf, keine Konsolenfehler; Tonleitern 7/8;
alter Spielstand mit `intervalle-1` … `-12` wird richtig umgestellt; Lerntafeln.

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
