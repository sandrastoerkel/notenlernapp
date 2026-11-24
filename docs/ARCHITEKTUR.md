# Architektur

Notenheld ist eine statische Web-App ohne Build-Schritt: natives HTML, CSS und
ES-Module. Tests laufen mit dem eingebauten Test-Runner von Node (`node --test`),
es gibt keine npm-Abhängigkeiten. Die App braucht einen Webserver (ES-Module und
Service Worker laufen nicht über `file://`): `npm run dev` oder
`python3 -m http.server 8080`.

## Verzeichnisse

```
index.html              Shell: Kopfzeile, <main>, Tab-Leiste, lädt src/app.js als Modul
manifest.webmanifest    PWA-Manifest (ab Paket B)
sw.js                   Service Worker (Offline-Cache, ab Paket B)
icons/                  App-Icons (PNG, ab Paket B)
fonts/                  selbst gehostete Schriften (woff2) + Lizenzen (ab Paket B)
css/style.css           alle Styles, Farb- und Schrift-Tokens auf :root
src/
  music.js              Notenmodell, reine Funktionen (keine DOM-Zugriffe)
  staff.js              SVG-Zeichner für Notenzeile, Noten, Pausen, Vorzeichen, Klaviatur (liefert Strings)
  audio.js              Töne per Web Audio
  store.js              Fortschritt: Zustand, Freischaltung, Serie, Persistenz
  adapt.js              adaptive Auswahl: Zustand je Note (neu, unsicher, langsam, sicher), Gewichte (seit Paket G)
  engine.js             generischer Rundenablauf (10 Aufgaben, Feedback, Sterne, XP)
  demo.js               Baukasten: Vorführung (Bilder mit Zurück/Abspielen/Weiter ›, Schritt-Marken, Ergebniskarte)
  grid.js               Baukasten: Kästchentabelle („gehirngerechte“ Übersicht, eine Zeile je Eintrag)
  packs/index.js        Registry aller Themenpakete
  packs/noten.js        Paket „Noten lesen“ (8 Stufen)
  packs/notenwerte.js   Paket „Notenwerte und Pausen“
  packs/tonleitern.js   Paket „Tonleitern“ (seit Welle 8: 13 Stufen, erst mit Hilfen, dann ohne; Dur bis 4 Vorzeichen,
                        Tonart aus den Vorzeichen und parallele Molltonart bis 7; drei Vorführungen)
  packs/intervalle.js   Paket „Intervalle“ (10 Stufen, neu seit Welle 7: erst mit Hilfen, dann ohne)
  packs/akkorde.js      Paket „Dreiklänge und Quintenzirkel“
  views/home.js         Startseite: Pakete und Stufen
  views/practice.js     Üben (nutzt engine.js)
  views/learn.js        Lernen (Notenzeile zum Antippen, Lerntafeln der Pakete)
  views/blitz.js        Blitz (60 Sekunden)
  views/stats.js        Statistik (mit Notenkarte seit Paket G)
  app.js                Navigation und Verdrahtung
test/                   node --test; eine Datei je Modul, z. B. test/music.test.js
docs/                   Konzept und Architektur
```

## Notenmodell (`src/music.js`)

Eine Note ist ein einfaches Objekt `{ letter, octave, acc }`:

- `letter` ist einer von `C D E F G A H` (deutsche Namen, H statt B)
- `octave` ist die wissenschaftliche Oktave (c' = C4, c = C3, C = C2)
- `acc` ist `-1`, `0` oder `1` (♭, ohne, ♯)

Exporte (alle rein, ohne Seiteneffekte):

| Funktion            | Bedeutung                                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| `N(letter, octave, acc = 0)` | Note anlegen                                                     |
| `LETTERS`, `SEMI`   | Buchstaben in Reihenfolge; Halbtonabstand zu C                            |
| `dia(n)`            | diatonische Nummer (octave * 7 + Index des Buchstabens)                   |
| `fromDia(d, acc)`   | Umkehrung von `dia`                                                       |
| `staffPos(n, clef)` | Position in halben Linienabständen über der untersten Linie (`"treble"` oder `"bass"`); E4 ist 0 im Violinschlüssel, G2 ist 0 im Bassschlüssel |
| `midi(n)`, `freq(n)`| MIDI-Nummer und Frequenz (a' = 440 Hz)                                    |
| `pc(semi)`          | Tonklasse 0 bis 11                                                        |
| `gName(n)`          | deutscher Name ohne Oktave: C, Fis, Es, B, H …                            |
| `helm(n)`           | Helmholtz-Schreibweise: C, c, c', c'' …                                   |
| `range(from, to)`   | alle Stammtöne zwischen zwei Noten (inklusive)                            |
| `same(a, b)`        | Gleichheit                                                                |
| `transpose(n, steps, acc)` | Stammton um diatonische Schritte verschieben                       |

Erweiterung aus Paket E (Dreiklänge und Quintenzirkel), ebenfalls rein:
`semis(a, b)` (Halbtonabstand), `spell(n, steps, semi)` (Ton über Buchstabenschritte
und Halbtöne, `null` bei Doppelvorzeichen), `TRIAD_TYPES` (`dur` 4+3, `moll` 3+4,
`vermindert` 3+3, `uebermaessig` 4+4), `triad(root, type)` (Grundstellung als
gestapelte Terzen), `triadQuality(lower, upper)`, `triadRoot(notes)`,
`triadTypeOf(notes)`, `invert(notes, k)` und `inversionOf(notes)` (0
Grundstellung, 1 Sextakkord, 2 Quartsextakkord; `INVERSIONS`), `fifthUp`,
`fifthDown`, `majorTonic(sig)`, `MAJOR_KEYS` (15 Dur-Tonarten von Ces bis Cis),
`relativeMinorOf(tonic)`, `triadName(root, type)` („C-Dur“, „a-Moll“, „h
vermindert“), `majorScale(tonic)`, `degreeTriad(tonic, deg)`, `ROMAN`.

Erweiterung aus Paket C (Notenwerte und Pausen): `VALUES` (`[1, 2, 4, 8, 16]`),
`beats(value, dotted)` (Schläge im 4/4-Takt, Viertel = 1, Punkt verlängert um die
Hälfte), `beatsText(b)` („1½“, „¾“), `beatsLabel(b)` („1 Schlag“, „2 Schläge“),
`valueName(value, rest, dotted)` („punktierte halbe Note“, „Achtelpause“).

Erweiterung aus Paket D (Intervalle und Tonarten): `INTERVAL_NAMES`,
`isPerfectNumber(num)`, `intervalNumber(a, b)`, `intervalSemitones(a, b)`,
`semitonesFor(num, quality)`, `intervalQuality(a, b)`, `intervalLabel(num,
quality)` („große Terz“), `intervalName(a, b)`; Tonarten aus der Vorzeichnung
(`fifths`: Anzahl ♯ positiv, ♭ negativ): `majorKeyFromKeySig(fifths)`,
`relativeMinor(fifths)`, `majorName(fifths)` („Fis-Dur“), `minorName(fifths)`
(„fis-Moll“).

Erweiterung aus Paket F2 (Namensraster): `NAME_ACCS` (`[0, 1, -1]`, Reihenfolge
der Reihen im Raster), `parseNoteName(str)` (deutscher Name → `{ letter, acc }`
oder `null`; groß oder klein, Leerzeichen am Rand egal; gültig sind genau die
21 Namen, die `gName` für die Stammtöne ohne, mit ♯ und mit ♭ liefert, also
„es“, „as“, „b“, nicht „hes“, „ass“ oder „eses“).

Erweiterung aus Paket „Intervalle 7–12“: `lowerNote(high, num, quality)` (untere Note
`num − 1` Buchstaben tiefer mit der Halbtonzahl aus `semitonesFor`; `null` bei Doppelvorzeichen oder
unbekannter Kombination), Gegenstück zu `upperNote` im Paket.

**Bekannte Dopplungen.** Die Pakete D und E entstanden parallel und haben je
eigene Hilfsfunktionen für dasselbe angelegt. Beide Fassungen sind getestet und
in Gebrauch; sie werden bewusst nicht zusammengelegt (Risiko ohne Nutzen für
v0.2.0). Neue Pakete sollen die jeweils erste Fassung nutzen:

| Paket D | Paket E | gleiche Bedeutung |
| ------- | ------- | ----------------- |
| `intervalSemitones(a, b)` | `semis(a, b)` | Halbtonabstand von a nach b |
| `majorKeyFromKeySig(fifths)`, `majorName(fifths)` | `majorTonic(sig)`, `MAJOR_KEYS` | Dur-Tonart aus der Vorzeichnung |
| `relativeMinor(fifths)` | `relativeMinorOf(tonic)` | parallele Molltonart (aus der Vorzeichnung bzw. aus dem Dur-Grundton) |

Pakete dürfen dieses Modul erweitern (neue Funktionen anhängen), aber keine
bestehende Signatur ändern.

## Notenzeile (`src/staff.js`)

Alle Funktionen liefern SVG-Markup als String. Konstanten: Linienabstand
`S = 12`, oberste Linie `TOP = 34`, unterste Linie `BOTTOM = 82`, Breite 320 (Standard, siehe `opts.width`),
Höhe `H = 122`. Eine halbe Stufe sind 6 Einheiten.

| Funktion | Bedeutung |
| -------- | --------- |
| `staffSvg(clef, inner, opts)` | komplette Zeile mit Schlüssel; `inner` wird eingesetzt. Das dritte Argument ist entweder ein String (zusätzliche Klasse am `<svg>`, wie in der ersten Fassung) oder ein Objekt `{ cls, height, keySig, width }`: `height` darf die Höhe erhöhen, `width` ändert die Breite (Standard 320, Ausgabe dann unverändert; die Linien enden 18 vor dem rechten Rand, nur `scaleSvg` nutzt 368), `keySig` (Anzahl ♯ als positive, ♭ als negative Zahl, höchstens 7) zeichnet Vorzeichen hinter dem Schlüssel |
| `noteSvg(n, clef, x, cls, opts)` | Note mit Hals, Hilfslinien und Vorzeichen; `cls` ist `""`, `"ok"`, `"bad"`, `"warn"` (langsam, Notenkarte, Token `--gold`), `"new"` (neu, Notenkarte, Token `--muted`) oder `"ghost"` (Lernen, Token `--accent`); `opts.value` ist `1`, `2`, `4`, `8`, `16` (ganze bis sechzehntel, Standard 4), `opts.stemless` lässt den Hals weg, `opts.flagless` (Balken) lässt das Fähnchen weg, der Hals endet dann im Balken (`beamStemEnd`) |
| `beamSvg(xs, cy, up, levels, cls)` | waagrechte Balken einer Gruppe (Kopfmitten `xs` auf gleicher Höhe `cy`): erster Balken über alle Hälse, `levels` = `[[i, j], …]` Bereiche des zweiten Balkens (Sechzehntel); `<g class="beam-group">` mit `<rect class="beam">` |
| `noteheadSvg(x, y, value)` | nur der Notenkopf mit Mitte (x, y), so wie ihn `noteSvg` zeichnet (ohne Hals, Hilfslinien, Vorzeichen); `value` 4, 8, 16 schwarz, 2 und 1 hohl, Standard 4. Nutzt die Ansicht „Lernen“ für „Alle Namen zeigen“ |
| `restSvg(value, x)` | Pause (1, 2, 4, 8, 16); ganze und halbe als `<rect class="rest">`, die übrigen als Glyphe (`<text class="rest">`) |
| `glyphSvg(char, x, y, size)` | ein Zeichen aus der Musikschrift |
| `keySigSvg(clef, count)` | nur die Vorzeichen (wird von `staffSvg` genutzt); Kreuze in der Reihenfolge Fis Cis Gis Dis Ais Eis His, Be in der Reihenfolge B Es As Des Ges Ces Fes |
| `keySigPos(clef, count, step, x0)` | seit Welle 8: Lage der Vorzeichen einer Vorzeichnung `[{ x, y, line, sharp }]` (x links, y Grundlinie, line Linie bzw. Zwischenraum); `step` (Standard 12) und `x0` nur für die Vorführung „So findest du die Tonart“ (Abstand 22 zum Mitzählen); `keySigSvg` nutzt sie mit den Standardwerten, Ausgabe unverändert |
| `pianoSvg(opts)` | ohne Parameter wie bisher: eine Oktave Klaviatur (8 weiße, 5 schwarze Tasten, 13 `rect`), anklickbar; Tasten tragen `data-semi` (Halbtonzahl ab C, das obere C wieder 0). Seit Welle 7 mit `opts = { from, octaves, marks, interactive }`: `from` MIDI-Nummer des untersten C, `octaves` Anzahl Oktaven (weiße Tasten bis zum C darüber, bei 2: 15 weiße, 10 schwarze), `marks` MIDI-Nummern markierter Tasten (Klasse `mark`), `interactive: false` nur zum Anschauen (`<svg class="keys-static">`, kein `data-semi`, kleinere Tasten, größere Schrift); mit `from` trägt jede Taste `data-midi` |

Weitere Exporte: die Maße `S`, `TOP`, `BOTTOM`, `W`, `H`, `X0`, `X1`, die
Glyphen-Tabelle `GLYPHS` (`treble`, `bass`, `notes[1…16]`, `rests[1…16]`,
`flags[8]`, `flags[16]`), die Kopfmaße `HEAD`, `ACC_SIZE`, `ACC_DY`,
`KEYSIG_DY` und `WHITE`, `BLACK` (Tasten der Klaviatur).
Beim Auswerten färbt die Engine die ganze Zeile: sie setzt `ok` oder `bad` als
Klasse auf das `<svg>`; `css/style.css` färbt dann `.notehead`, `.acc`,
`.flag` (Füllung) und `.stem` (Strich).

**Notensatz.** Größe und Lage aller Zeichen sind gegen Verovio 6.4.1 mit der
SMuFL-Schrift Bravura gemessen (Leipzig zur Kontrolle), bei 12 px pro
Linienabstand; Messbericht vom 06.11.2026. Die Werte stehen mit Quelle als
Kommentar in `staff.js`. Angaben in Linienabständen (LA):

- Violinschlüssel: Glyphe aus „Noto Music“, Schriftgröße `4.2 * S`, die
  Grundlinie liegt auf der untersten Linie (`y = BOTTOM`); die Schnecke
  umschließt die G-Linie.
- Bassschlüssel: Umriss der Glyphe fClef (U+E062) aus Bravura 1.482 als
  `<path class="clef">` (`BASS_CLEF_PATH`, SIL OFL 1.1, Lizenz in
  `fonts/OFL-Bravura.txt`). Nach SMuFL ist 1 em = 1000 Einheiten = 4 LA,
  daher `scale(S/250, −S/250)`; der Ursprung (`BASS_CLEF`) liegt bei x = 26
  auf der F-Linie (`TOP + S`). Damit sitzt der Kopf auf der F-Linie, die
  Punkte stehen mittig in den Zwischenräumen darüber und darunter, der Bogen
  endet 2,54 LA unter der F-Linie, knapp über der untersten Linie (im Browser
  gemessen: Kopf +0,01, Punkte −0,51/+0,49, Oberkante −1,04, Ende +2,54 LA).
  Die Noto-Glyphe U+1D122 vorher hatte den Kopf 0,18 LA über der F-Linie und
  endete schon 2,25 LA darunter. Die Vorzeichnung im Bassschlüssel beginnt
  bei x = 67,5: Abstand zu den Punkten 0,9 LA, wie beim Violinschlüssel.
- Schwarzer Notenkopf: Ellipse `HEAD` (rx 7,7, ry 5,25, um −31° gedreht),
  1,18 × 1,00 LA wie Bravura. Halbe und ganze Note sind gefüllte Pfade mit
  Loch (`fill-rule: evenodd`), Form nach Bravura (ganze Note 1,7 LA breit).
- Hals: Strichstärke 1,8, Außenkante bündig mit dem Kopf (Halsmitte ±6,2
  neben der Kopfmitte), Länge 3,5 LA ab Kopfmitte; Noten außerhalb der Zeile
  reichen bis zur Mittellinie, mit Fähnchen einen halben LA weiter. Hals
  nach oben unterhalb der Mittellinie, ab der Mittellinie nach unten.
- Fähnchen: Glyphen U+1D16E (eins) und U+1D16F (zwei) aus Noto Music bei
  48px, immer rechts vom Hals; bei Hals nach unten senkrecht gespiegelt
  (`scale(1 -1)`), sie hängen dann am unteren Ende und schwingen nach oben.
- Vorzeichen (vor Noten und als Vorzeichnung) mit `ACC_SIZE` = 44px:
  ♯ 2,8 LA, ♭ 2,45 LA hoch. Die Grundlinie liegt `ACC_DY`/`KEYSIG_DY`
  (♯ 6, ♭ 5,5) unter der Linie bzw. dem Zwischenraum. Vor der Note bleibt
  0,25 LA Abstand zum Kopf, bei jedem Notenwert: vor der breiteren ganzen
  Note rückt das Vorzeichen um 3,15 weiter nach links. Hat die Note eine
  Hilfslinie (durch den Kopf oder direkt daneben), rückt es um weitere 1,9:
  Abstand zum Kopf 0,38–0,41 LA, die Hilfslinie bleibt frei (wie Verovio).
- Hilfslinien ragen über den Kopf hinaus: bei schwarzen und halben Köpfen
  11 Einheiten zu jeder Seite (1,83 LA lang), bei der ganzen Note 13,4
  (2,23 LA, wie Verovio/Bravura 2,22). Die Vorzeichnung im Bassschlüssel ist dasselbe
  Muster einen Zwischenraum tiefer; das Fes liegt unter der Zeile (von
  Verovio bestätigt).
- Pausen: Viertel, Achtel, Sechzehntel als Glyphen mit Schriftgröße 48
  (vier LA), Glyphenmitte 2,0 / 2,13 / 2,625 LA unter der obersten Linie.
  Ganze und halbe Pause sind Rechtecke (14 × 6,5): die ganze hängt an der
  vierten Linie von unten, die halbe sitzt auf der Mittellinie.
- Balken (Welle 10, Schritt 5; `BEAM` in `staff.js`): gemessen an Verovio 6.4.1
  mit Bravura (Leipzig identisch) an h' mit Hals nach unten in „8 8“, „16 16 8“
  und „8 16 16“. Balkendicke 0,50 LA (`BEAM.thick` = 6), Abstand der beiden
  Balken 0,25 LA (`BEAM.gap` = 3) – das sind die SMuFL-engravingDefaults
  beamThickness/beamSpacing von Bravura, die Verovio umsetzt. Der Balken liegt
  waagrecht, seine Außenkante bei Verovio 3,25 LA unter der Kopfmitte, 0,08 LA
  vor dem Halsende einer einzelnen Viertel/Achtel (3,33). Weil unsere Hälse
  3,5 LA lang sind (siehe Hals), liegt die Außenkante 1 Einheit vor unserem
  Halsende (`BEAM.outer` = 41 = 3,42 LA); so stehen gebalkte und einzelne Hälse
  zueinander wie bei Verovio. Mit zwei Balken wird der Hals nicht länger: der
  erste Balken bleibt außen, der zweite liegt innen. Die Hälse enden 0,10 LA
  vor der Außenkante, also im Balken (`BEAM.stemIn`). Der Balken reicht von
  der Außenkante des ersten bis zur Außenkante des letzten Halses; der zweite
  Balken endet am Gruppenende an der Halskante, innen in der Halsmitte.
  Farbe: `.beam` wie der Notenkopf (Fläche), `svg.ok`/`svg.bad`, `.nw-s1`/`.nw-s2`.

**Tonleitern.** `src/packs/tonleitern.js` setzt acht Noten in eine Zeile mit
`scaleSvg(notes, clef, opts)`: schwarze Köpfe ohne Hals (`noteSvg(…, { stemless: true })`),
`staffSvg` mit `width: 368`, Noten bei x = 84 + 36·i (bei 320 Einheiten stießen in Bass-D-Dur
h–cis' und Bass-E-Dur E–Fis die Vorzeichen an den Kopf davor). Mit `keySig` (Vorzeichnung, Stufe 6
nach der Antwort) beginnen die Noten bei x = 126 im Abstand 30 und stehen ohne eigene Vorzeichen.
Optionen: `mark: [i, i + 1]` bzw. `marks` (Nachbarnoten in `--accent`, Klasse `mark`, dazu eine
eckige Klammer `.bracket` darunter, damit es nicht nur an der Farbe hängt), `gap: i` (gestrichelter
Kasten `.gap-box` mit „?“ auf Höhe der Mittellinie statt der Note), `cls: { i: "ok" }` (einzelne
Note färben), `keySig`, `svgCls`, `label: { i, text }` (Name in `--ok` unter Note i, Klasse
`note-label ok`, 18 Einheiten groß, immer unter dem tiefsten Punkt der Zeile (`lowestY`: unterste
Linie, Köpfe, ♯ reicht 1,4 LA unter die Kopfmitte); die Höhe des SVG wächst dann über 122). Die
Auflösungen der Stufen 4 bis 7 (seit Welle 8; vorher 3 bis 5) nutzen `cls` und `label` zusammen mit `q.keepRow`.
`opts.extra` (seit Welle 8) hängt zusätzliches SVG an (Zahlenkreise und Klammern der Vorführung). Im Browser gemessen (getBBox): kein Vorzeichen berührt den Kopf
davor oder den Schlüssel, in allen Tonleitern der Stufen 3 bis 6 und ihren Auflösungen.

**Akkorde.** `src/packs/akkorde.js` setzt Dreiklänge mit `chordSvg(notes, clef, x, opts)`:
ganze Noten übereinander (Köpfe aus `noteSvg`), eine gemeinsame Reihe Hilfslinien
(1,12 LA je Seite, wie Verovio bei ganzen Noten) und Vorzeichen in Spalten:
oberstes 0,25 LA vor dem Kopf, dann das unterste, das mittlere am weitesten links;
eng beieinander liegende Zeichen (Terz, Quarte) weichen ganz aus, ♭ im Abstand
Quarte bis Sexte rücken nur teilweise ein (`accClash`, Werte aus Verovio 6.4.1 /
Bravura, 06.11.2026). Ragt ein Vorzeichen in eine Hilfslinie des Akkords (♯ bis
zwei halbe Stufen darüber oder darunter, ♭ auf seiner Stufe und bis zwei halbe
Stufen darüber), rückt es wie in `staff.js` 1,9 (0,16 LA) weiter nach links
(`accTouchesLedger`). `opts.keySig` lässt Vorzeichen weg, die die Vorzeichnung
schon enthält.

**Intervalle.** `src/packs/intervalle.js` (neu seit Welle 7, davor Welle 6): zwei ganze Noten bei `X_LOW`/`X_HIGH`
(`intervalSvg`; Stufe 7 abwärts mit der oberen Note links). Bauaufgaben (Stufe 8, 9):
`buildSvg(it)` zeigt nur die gegebene Note (links), `buildRevealSvg(it)` beide, die gebaute rechts grün
(`noteSvg(…, "ok")`) mit ihrem Namen darunter (`note-label ok`, 18 Einheiten, unter dem tiefsten Punkt
beider Noten, `lowestY` wie in „Tonleitern“); Frage und Auflösung haben dieselbe Höhe (`buildHeight`,
mindestens 122), die Karte springt nicht. Dazu `q.keepRow`. Erlaubte Intervalle: `TYPES_RKG` (rein, klein,
groß von Prime bis Oktave, 12), `TYPES_ALL` (dazu übermäßige Prime und Sekunde, verminderte/übermäßige
Quarte und Quinte, verminderte Septime, 19), `TYPES_NO_PRIME` (abwärts und Bauen, 17), `ALLOWED_NAMES`;
`qualityChoices(num, types)` (Knöpfe im zweiten Schritt), `frameText(a, b)` („e'–g': 3 Stufen → Terz“),
`stepsText(a, b)` (beide Denkschritte; nur erlaubte Intervalle werden benannt), `twoStepQuestion(it, types, down)`,
`intervalTable(kind, { row, hit, split })` (Kästchentabelle aus `grid.js`, Werte aus `semitonesFor`: `"grob"`
Stufe 1 nur „1 Prime … 8 Oktave“, `"rkg"` Stufe 3 klein | rein | groß, `"all"` dazu die Zeile „vermindert = 1
Halbton weniger · übermäßig = 1 Halbton mehr“; `row` violett, `hit` grün, bei vermindert/übermäßig das
Bezugs-Kästchen umrandet (`baseQuality`) und der passende Teil der Zeile grün), `intervalDemo(low, high,
{ clef, table, fine })` (Bilder der Vorführung, siehe unten), `fineText`, `demoXs`, `demoBoard`/`mountBoard`
(Lerntafel), `pairLayout(row, clef, c)` (Lerntafel „Intervalle über c'“ seit Welle 10: Lage der Paare nach dem
Platz der Zeichen, freier Raum im Paar `PAIR_INNER` 6, zwischen den Paaren `PAIR_OUTER` 26, feiner Trennstrich
`.pair-sep` unter der Zeile), `CHECK_TYPES`/`CHECK_NAMES` (Ziele in Stufe 10: alle erlaubten ohne Prime, 17),
`SIZE_ORDER`/`SIZE_NAMES` (rein/groß/klein ohne Prime: das gezeigte Intervall bei „anderes Intervall (Notenstufen)“),
`checkBuild` (Buchstabe und Vorzeichen), `VERDICTS` (Stufe 10). `lowerNote(high, num, quality)` in `music.js`.

**Vorführung „So bestimmst du ein Intervall“** (`intervalDemo`, seit 20.11.2026). Bilder: 1 Frage + je
gezählter Notenstufe eins (Zwischenstufen als hohle violette Köpfe, Kreise 1, 2, 3 …, nach der letzten die
Klammer und die violette Tabellenzeile) + je Halbton eins (die Taste über der vorigen leuchtet grün mit ihrer
Zahl, schwarze Tasten mitgezählt; bei der Prime ein Bild „0 Halbtöne“) + 1 Ergebnis („e'–g' = kleine Terz“,
Marken „3 Stufen“ violett, „3 Halbtöne“ grün). Satz zum letzten Halbton: „3 Halbtöne → kleine Terz“ bzw.
„6 Halbtöne = rein 5 + 1 → übermäßige Quarte“, „9 Halbtöne = klein 10 − 1 → verminderte Septime“. Je Bild ein
Ton (Stufe bzw. Taste). Klaviatur ab dem C unter der unteren Note, eine Oktave, wenn sie reicht, sonst zwei.
Stufe 1 (`fine: false`): nur der erste Schritt, ohne Klaviatur. Verwendet als erste Lerntafel (fünf Beispiele
e'–g', c'–e', d'–fis', f'–h', d'–a') und als `level.demo(q)` in den Stufen mit Hilfen (1, 3, 5, 8; beim Bauen
das gebaute Intervall).

## Themenpakete (`src/packs/*.js`)

Ein Paket ist ein Default-Export mit dieser Form:

```js
export default {
  id: "noten",                 // eindeutig, nur Kleinbuchstaben
  title: "Noten lesen",
  subtitle: "Violin- und Bassschlüssel",
  grade: "Klasse 5–7",         // grobe Einordnung, nur Anzeige
  levels: [ /* Stufen in Reihenfolge */ ],
  learn: [ /* optionale Lerntafeln */ ],
  blitz: null,                 // optional, siehe unten
};
```

Eine Stufe:

```js
{
  id: "noten-1",               // "<paket>-<nummer>"
  no: 1,
  title: "Linien im Violinschlüssel",
  subtitle: "Violinschlüssel · 5 Noten", // optional, kleine Zeile unter dem Titel auf der Startseite
  hint: "Text auf der Startkarte der Stufe",
  example: "<svg …>",          // optional, festes SVG für die Startkarte (vor der Runde)
  input: "letters",            // "letters" | "choices" | "keys"
  acc: false,                  // optional, true zeigt bei "letters" das Namensraster (21 Namen) statt C–H
  namesOnly: false,            // optional, true: nur Namensraster, keine Klaviatur (die Schreibweise zählt, gis ≠ as)
  requires: "x-1",             // optional, Stufen-ID im selben Paket, deren best >= 8 diese Stufe öffnet (sonst die Stufe davor; seit Welle 7 von keinem Paket genutzt)
  digits: false,               // optional, true: Hinweis „Tastatur: 1 Prime … 8 Oktave“ auf der Startkarte (Knopfsätze mit digits)
  helps: ["klaviatur", "tabelle"], // optional (seit Welle 7): aufklappbarer Bereich „Hilfen“ unter der Notenzeile, nur während der Runde
  helpText: "…",               // optional, Satz oben in den Hilfen
  helpTable: "<table …>",      // optional, HTML der Tabelle in den Hilfen
  helpsTitle: "…",             // optional, eigene Überschrift der Hilfen (sonst aus helps: „Hilfen: Klaviatur und Tabelle“ bzw. „Hilfen: Klaviatur“)
  demo(q) { return { steps, frames }; }, // optional (seit 20.11.2026): Vorführung der Aufgabe q für den Knopf „Vorführen“ in den Hilfen (src/demo.js)
  items: [ /* … */ ],          // optional, Vorrat der Aufgaben (nur für Tests und Blitz)
  question(prev, ctx) {        // liefert eine neue Aufgabe, nie dieselbe wie prev; ctx siehe unten
    return {
      svg: "<svg …>",          // fertiges SVG (meist staffSvg(...))
      prompt: "",              // optionale Frage über der Zeile, z. B. "Wie viele Schläge?"
      answer: { letter: "G", acc: 0 }, // kanonische Antwort: bei "letters" { letter, acc }, sonst String oder Zahl
      display: "G (g')",       // Text fürs Feedback: „Richtig! G (g')“ bzw. „Das war ein G (g').“
      reveal: "Richtig wäre: A-Dur.", // optional, ganzer Satz bei falscher Antwort statt „Das war ein …“
      revealSvg: "<svg …>",    // optional, ersetzt nach der Antwort svg (richtig und falsch), z. B. der volle Takt
      keepRow: false,          // optional, true: nach der Antwort kein ok/bad am <svg>, die Zeile bleibt schwarz
      play: [ /* Noten oder { note, beats } / { rest: true, beats } */ ], // optional, nach der Antwort abgespielt
      playTogether: false,     // optional, true spielt alle Töne aus play gleichzeitig (Akkord)
      choices: ["…"],          // nur bei input "choices": 4 bis 6 Auswahlknöpfe, enthält answer
      cols: 4,                 // optional, feste Spaltenzahl der Knöpfe (Klasse cols, --cols), z. B. Prime … Oktave in 2 × 4
      digits: true,            // optional, Ziffer k auf der Tastatur wählt den k-ten Knopf
      steps: [ /* optional, zweischrittig: { choices, cols?, digits?, answer, prompt?, ok?, bad? } je Schritt */ ],
      partial: "…",            // optional, Rückmeldung, wenn nur der erste Schritt daneben lag (Satz mit Punkt)
      helpMarks: [N("E", 4)],  // optional, Töne, die die Klaviatur der Hilfen markiert
      note: N("G", 4),         // optional, die gefragte Note (Ton im Blitz, Feedback ohne Oktave)
      clef: "treble",          // optional, Schlüssel der Aufgabe (damit prev nicht wiederholt wird)
      statKey: "G (g', Violin)", // optional, Eintrag in state.notes („Schwache Stellen“, Notenkarte)
    };
  },
  check(q, value) { return value === q.answer; }, // value ist bei "letters" {letter, acc}, bei "keys" eine Halbtonzahl, bei "choices" der Knopftext
}
```

Auswahlknöpfe (`input: "choices"`): die Engine setzt auf das Antwortfeld die
Klasse `choices` (zwei Spalten, lange Begriffe wie „punktierte Viertelnote“
passen bei 420 px in eine Zeile); sind alle Texte höchstens 4 Zeichen lang
(„½“, „VII“, „3 ♭“), zusätzlich `short` mit `--cols` Spalten (bis 6 Knöpfe in
einer Reihe, ab 7 in zwei Reihen). Buchstaben und Klaviatur bleiben bei 7
Spalten. In der Regel 4 bis 6 Knöpfe; Ausnahmen im Paket „Dreiklänge und
Quintenzirkel“: Stufe 1 hat laut PLAN zwei (Dur, Moll), Stufe 4 drei (die drei
Lagen), Stufe 6 alle sieben Stufen I bis VII. Im Paket „Tonleitern“ haben Stufe 1 bis 3
(`tonleitern-1` … `-3`) nur zwei Knöpfe („Ganztonschritt“, „Halbtonschritt“); Halbtöne
werden dort mit Wahrscheinlichkeit 0,4 gezogen. Seit Welle 8 zweischrittig: Stufe 4 (Ganz/Halb, dann
2 oder 3 Namen), Stufe 10 (das entscheidende Vorzeichen, 2 bis 7 Knöpfe; bei C-, G- und F-Dur gäbe es nur
einen Knopf, dort entfällt der Schritt seit Welle 10; dann vier Dur-Tonarten in fester Reihenfolge nach dem Quintenzirkel) und Stufe 12 (drei
aufeinanderfolgende Stammtöne, dann 2 oder 3 Molltonarten desselben Stammtons). Raten reicht in etwa 5,5 % der Runden für 8 von 10.
Im Paket „Intervalle“ (seit Welle 7) hat die Grobbestimmung (so heißt die Zahl seit Welle 10) acht Knöpfe (Prime … Oktave, `cols: 4`)
und der zweite Schritt nur die zur Zahl passenden Intervalle (1 bis 3 Knöpfe, z. B. nur „reine Oktave“).

Rhythmen (seit Paket F): Ein Eintrag in `play` ist entweder eine Note (wie
bisher; mehrere Noten nacheinander im Abstand `PLAY_GAP` = 500 ms) oder ein Wert
mit Dauer: `{ note, beats }` für einen Ton, `{ rest: true, beats }` für eine
Pause. `beats` zählt Schläge (Viertel = 1, punktierte Viertel 1,5); ein Schlag
dauert `BEAT_MS` = 600 ms (Tempo 100). Der Ton klingt dann `beats · 0,6 s`
lang (`play(n, vol, dur)` in `audio.js`). Die nächste Aufgabe erscheint erst,
wenn der Rhythmus vorbei ist, plus `RHYTHM_TAIL` = 300 ms (bei
ausgeschaltetem Ton wie bisher nach 800 bzw. 1600 ms). Wartet die Stufe auf
„Nächste Aufgabe“ (Hilfen), kann man vorher weitergehen: Die Zeitgeber der Töne
stehen in `r.tones`, `silenceTones(r)` löscht sie beim Weitergehen (`r.advance`)
und beim Öffnen der Vorführung (seit Welle 9; ein schon klingender Ton endet nach
seiner Dauer). Genutzt von „Takt
füllen“: Nach der Antwort zeigt `revealSvg` den Takt mit dem fehlenden Wert in
der Lücke (`<g class="filled">`), und der ganze Takt erklingt auf h'.

`revealSvg` (seit Paket F): Ist es gesetzt, ersetzt die Engine nach der Antwort
das SVG der Aufgabe durch `revealSvg`; die Färbung `ok`/`bad` gilt für das
angezeigte SVG. Ohne `revealSvg` bleibt `svg` stehen (`revealedSvg(q)`).

`keepRow` (seit Feinschliff Tonleitern): Setzt eine Aufgabe `keepRow: true`,
lässt die Engine die Klasse `ok`/`bad` am `<svg>` weg (`svgResultClass(q, ok)`
gibt dann `""`); die Zeile bleibt schwarz, und das Paket färbt selbst einzelne
Noten (Tonleitern, Stufe 4 bis 7 seit Welle 8). Das Feedback darunter wird wie bisher grün
bzw. rot. Ohne `keepRow` unverändert.

Gleichzeitiges Abspielen (seit Paket E): Setzt eine Aufgabe `playTogether: true`
und enthält `play` mehr als einen Ton, startet die Engine alle Töne zur selben
Zeit über `playChord(notes)` aus `src/audio.js` (gleicher Startzeitpunkt für alle
Oszillatoren, Lautstärke je Ton geteilt durch √Anzahl). Die Entscheidung trifft die
reine Hilfsfunktion `playMode(q)` in `engine.js` (`"together"` oder `"sequence"`);
ohne `playTogether` bleibt es beim Nacheinander mit `PLAY_GAP`.

Eingabeart: hat eine Stufe `input: "letters"` und hat das Kind „Klaviatur“
gewählt (`state.input === "keys"`), nutzt die Engine die Klaviatur. Andere
Eingabearten bleiben unverändert. Ausnahme `namesOnly: true` (seit Paket
„Intervalle 7–12“, Stufen 10 und 11 „Intervall bauen“): `effectiveInput(levelInput,
pref, namesOnly)` bleibt dann bei `"letters"` (Namensraster), beide Aufrufe in
`engine.js` geben `level.namesOnly` weiter, und `practice.js` blendet die Wahl
Namen/Klaviatur aus. Grund: Beim Bauen zählt die Schreibweise (Gis ist nicht As),
die Klaviatur kennt nur die Tonklasse.

Namensraster (seit Paket F2, `acc: true` bei `input: "letters"`, geprüft mit
`usesNames(level)`): Statt der Buchstaben C–H und einer Vorzeichen-Wahl wählt
man den ganzen deutschen Namen. `namesHtml()` baut drei Reihen zu sieben
Knöpfen, die Spalten gehören zum selben Stammton: C D E F G A H, darunter
Cis Dis Eis Fis Gis Ais His, darunter Ces Des Es Fes Ges As B (in der
H-Spalte also H, His, B). Die Beschriftung kommt aus `gName`; jeder Knopf trägt
`data-letter` und `data-acc` und antwortet als `{ letter, acc }`, `check()` der
Pakete bleibt gleich. Auf der Computertastatur tippt man den Namen
(`c cis ces d dis des e eis es f fis fes g gis ges a ais as h his b`, groß oder
klein) und bestätigt mit Enter; Backspace löscht ein Zeichen, Escape leert.
Der Puffer steht unter den Knöpfen („Eingabe: fis“, Element `ui.typed`). Ein
Name, den es nicht gibt („hes“, „eses“), zeigt einen neutralen Hinweis und
zählt nicht als Antwort. Gedeutet wird mit `parseNoteName(str)` aus
`music.js`, der Puffer mit `nameKey(buf, e)`. Das Tippen geht auch, wenn die
Klaviatur gewählt ist.

Ohne `acc` antwortet ein Buchstabe auf der Tastatur sofort als
`{ letter, acc: 0 }` (Knöpfe C–H). Die frühere Vorzeichen-Wahl (Knöpfe ♭ ♮ ♯,
Tasten `+` `-` `0`, `setMod`) gibt es nicht mehr.

Blitz-Modus (optional, die Ansicht nimmt das erste Paket mit `blitz`):

```js
blitz: {
  title: "60 Sekunden, beide Schlüssel",
  example: "<svg …>",          // festes SVG für die Startkarte
  question(prev) { /* wie bei einer Stufe */ },
  check(q, value) { /* value ist der gedrückte Buchstabe, z. B. "F" */ },
}
```

Regeln für Pakete:

- Fragen werden mit reinen Funktionen erzeugt; Zufall nur über `Math.random`.
- Kein DOM-Zugriff. Pakete liefern Daten und SVG-Strings, die Engine zeichnet.
- Jede Stufe hat mindestens 8 unterschiedliche mögliche Aufgaben. Ausnahmen:
  Stufen 2 und 5 von „Noten lesen“ haben nur 4 Zwischenräume (bewusst so
  belassen, im Test vermerkt). Stufen 1 und 2 von „Notenwerte und Pausen“
  (`notenwerte-1`, `notenwerte-2`) haben nur 5 Aufgaben: die fünf Notenwerte
  bzw. Pausenwerte von der ganzen bis zur Sechzehntel, alle auf derselben Höhe,
  damit nur der Wert zählt; Stufe 6 (`notenwerte-6`, Punktierungen mit Hilfen) hat
  6 Aufgaben (halbe, Viertel, Achtel mit und ohne Punkt; Vorrat 9, punktierte
  doppelt). Im Test `test/packs/notenwerte.test.js` vermerkt.
- Texte auf Deutsch, Anrede „du“, Fachbegriffe wie im Musikunterricht am Gymnasium.
- Jedes Paket hat eine Testdatei `test/packs/<id>.test.js`, die prüft: Stufen-IDs eindeutig, `question()` liefert gültige Aufgaben, `check()` erkennt die richtige Antwort und lehnt eine falsche ab, bei `choices` ist `answer` enthalten.

Lerntafel (optional, erscheint im Tab „Lernen“ als Karte):

```js
{ title: "Notenwerte", clef: "treble", render() { return "<div>…HTML…</div>"; } }
```

`clef` ist optional. Eine Tafel mit `clef` erscheint nur, wenn im Tab „Lernen“
dieser Schlüssel gewählt ist; eine Tafel ohne `clef` erscheint bei beiden
Schlüsseln. Alle Tafeln stehen in der Karte „Lerntafeln“ im Raster `.legend`;
`title` zeigt die Ansicht als Überschrift (`<h3 class="legend-title">`, über
die ganze Breite) vor dem Inhalt von `render()`. `render()` bringt deshalb
keine eigene Hauptüberschrift mit. Optional `mount(root)`: wird nach dem Einsetzen aufgerufen
(`learn.js` `mountCards`) und verdrahtet Knöpfe, z. B. die Vorführung bei „Intervalle“. Die Lerntafeln
werden nur beim Öffnen der Ansicht und beim Wechsel des Schlüssels neu aufgebaut, nicht beim Antippen der
Notenzeile (eine laufende Vorführung bleibt stehen).

## Gemeinsamer Baukasten „gehirngerecht“ (seit 20.11.2026)

Für alle Pakete gedacht (Plan: `KONZEPT-gehirngerecht`, Reihenfolge Intervalle → Tonleitern → Notenwerte →
Noten lesen → Dreiklänge).

- **Farben der Denkschritte** (Tokens auf `:root`, hell und dunkel): `--step1`, `--step1-ink`, `--step1-soft`
  (violett: Schritt 1, z. B. Stufen/Grobbestimmung), `--step2`, `--step2-ink`, `--step2-soft` (grün: Schritt 2, z. B.
  Halbtöne/Feinbestimmung), `--step-on` (Schrift auf dem vollen Grundton), `--family` (hinterlegte Spalte),
  für die Klaviatur (hell und dunkel gleich) `--key-step2`, `--key-step2-soft`, `--key-step2-ink`,
  `--key-step2-on`. Komponenten nutzen nur diese Tokens.
- **Vorführung** (`src/demo.js`): `demo = { steps: ["1 · …", "2 · …"], frames: [{ step, body, text?, result?,
  tones? }] }`; `step` 0 = Frage, 1/2 = Denkschritt, `steps.length + 1` = Ergebnis (`result = { title, chips:
  [{ step, text }] }`). Reine Teile: `demoHtml(demo, i, playing)`, `marksHtml`, `markState`, `sayHtml`,
  `resultHtml`, `countText`, `playLabel`. DOM: `mountDemo(root, demo)` → `{ stop, show(i), index() }`;
  Knöpfe Zurück / Abspielen (Pause, `FRAME_MS` = 1000 ms je Bild, hält am Ende an) / „Weiter ›“ (`NEXT_LABEL`,
  für Screenreader `aria-label` „Nächster Schritt“ = `NEXT_ARIA`; bei 320 px stehen die drei Knöpfe in einer
  Zeile, der Bildzähler darunter), Bildzähler;
  beim Zeigen eines Bilds klingen `tones` (`audio.js`, „Ton aus“ gilt). `stopDemos()` hält alle an
  (`app.js` beim Wechsel der Ansicht, `learn.js` vor dem Neuaufbau, `engine.stop()`). Die Bilder baut das
  Paket als reine Funktion (testbar in node).
- **Kästchentabelle** (`src/grid.js`): `tileTable({ head, rows: [{ label, cells: [null | { text, state }], hi }],
  family, split, cls })`: eine Zeile je Eintrag, Zahlen in Kästchen (`.tt-box`), leere Stellen als blasser
  Punkt (`.tt-dot`), Familien-Spalten hinterlegt (`.fam`), Zeile violett (`hi`), Treffer grün (`hit`), Bezug
  grün umrandet (`ref`); `split` setzt zwei Hälften nebeneinander (Hilfen; bis 380 px wieder untereinander).
- **Klaviatur**: `pianoSvg({ …, counts: [[midi, Zahl] …] })` färbt gezählte Tasten (Klasse `count`) und
  schreibt die Zahl darauf. `start: midi` (seit Welle 10, B6) beschriftet die Starttaste beim Halbtöne-Zählen
  mit „Start“ (`START_LABEL`, Klasse `kstart`, `data-start`); auf schwarzen Tasten und bei zwei Oktaven bis
  380 px (Klasse `keys-wide`) steht „0“. Fester Satz dazu `COUNT_RULE` in `demo.js` („Stufen: Beide Noten zählen
  mit. Halbtöne: Die Starttaste zählt nicht, du zählst die Schritte.“): Hilfen der Intervalle ab Stufe 3 und
  Tonleitern 12, Vorführungen beim Wechsel zu Schritt 2. Die Starttaste ist in allen Vorführungen beschriftet,
  die Halbtöne zählen: Intervall, Ganz-/Halbtonschritt (`stepDemo`), Dur-Tonleiter (`scaleDemo`, je Schritt die
  untere Note), Tonart aus Kreuzen (`keyDemo`, letztes Kreuz), parallele Molltonart (`minorDemo`, Dur-Grundton).
- **Bis 380 px** stehen die drei Knöpfe der Vorführung und der Bildzähler in einer Zeile (seit Welle 8: kleinere
  Abstände und Schrift, `flex-wrap: nowrap`; vorher rutschte der Zähler darunter).

**Tonleitern (Welle 8).** Denkschritte: 1 = Bauplan (Leiste 1 1 ½ 1 1 1 ½, seit Welle 10; in Sätzen „Ganz – Ganz – Halb – Ganz – Ganz –
Ganz – Halb“ = `PLAN_TEXT`), 2 = Klaviatur (Halbtöne → Vorzeichen); bei
den Tonarten 1 = entscheidendes Vorzeichen (letztes ♯, vorletztes ♭), 2 = Halbton höher bzw. ablesen; bei Moll
1 = Terz abwärts (drei Notenstufen, Dur-Grundton = 1), 2 = drei Halbtöne abwärts. Hilfen (`level.helps`, nur die
vorhandenen Arten): Stufen 1, 2, 4, 6, 8 Klaviatur + Bauplan-Leiste (`planTable()`, Kästchentabelle mit kleinem Kopf „Stufen 1–2 … 7–8“, Zeile „Tonschritt“
(`PLAN_SHORT` 1 / ½), in der Vorführung grüne Zeile „Halbtöne“; Halbton-Spalten als `family`), Stufe 10 Klaviatur ohne Markierung + Quintenzirkel-Kästchen (`circleTable`),
Stufe 12 nur Klaviatur (Dur-Grundton in der zweigestrichenen Oktave). Vor der Antwort hebt keine Hilfe etwas
hervor. Vorführungen als reine Funktionen im Paket: `scaleDemo(tonic, clef)` (18 Bilder: Frage, 8 Stufen,
Bauplan-Leiste, 7 Schritte, Ergebnis; Berichtigung immer an der oberen Note, zu klein → ♯, zu groß → ♭, grün
`note step2`), `stepDemo(notes, i, clef)` (Kurzfassung Stufe 1 und 2, 3 + Halbtöne Bilder), `keyDemo(fifths,
clef)` (n + 3 Bilder, C- und F-Dur 3), `minorDemo(fifths)` (8 Bilder). Lerntafeln mit Vorführung tragen
`data-tl-board="scale|key|minor"` (nicht `data-demo-board`, das sucht die Intervall-Tafel). Klassen: `.tl-keys`
(Töne grün), `.tl-bracket`, `.tl-decisive`, `.keysig.step1`, `.tt-box.s1`, `.tt-plan`, `.tt-wide`.

**Notenwerte (Welle 9).** Zehn Stufen, zweischrittig (`q.steps`) 1, 4, 6, 8, Hilfen 1, 2, 4, 6, 8 (nur
`helps: ["tabelle"]` mit `helpTable` und eigener Überschrift `helpsTitle`). Denkschritte: Notenwert 1 = Kopf
(hohl/schwarz), 2 = Hals und Fähnchen; Dauer 1 = Notenwert (beim Punkt ohne den Punkt), 2 = Schläge aus der
Pyramide (beim Punkt die Hälfte dazu); Takt füllen 1 = Zählen (was fehlt bis 4), 2 = Wert wählen. Zweischrittige
Aufgaben: `display` = beide Schritte („Kopf schwarz · 1 Fähnchen → Achtelnote (½ Schlag)“), `reveal` =
„Richtig wäre: …“, `partial` je Stufe; `ok`/`bad` von Schritt 1 nennen die Antwort von Schritt 2 nie. Reine
Funktionen im Paket: `featureTable()` (Kopf | Hals | Fähnchen je Notenwert, ohne Notenbilder), `restTable()`
(woran du die Pausen erkennst, ohne Zeichen), `pyramidSvg({ hit, add, small })` (1/2/4/8/16 Kästchen, rechts die
Schläge, ohne Namen), `countTable()` (Zählleiste `COUNT_SYLLABLES` „1 + 2 + 3 + 4 +“, Schlag-Felder als
`family`), `valueDemo(e)` (4 Bilder), `beatsDemo(e)` (4, mit Punkt 5), `barDemo(els, gap)` (n + 4 Bilder,
Summenleiste `sumBarSvg`, im Ergebnis `countLabels(els)` mit Pausen-Zählzeiten in Klammern, abschaltbar über
`REST_COUNTS_IN_PARENS`). `barSvg(els, gap, filled, { mark })` färbt ein Zeichen violett.
Balken (Welle 10): `beamGroups(els)` rechnet aus den Einsatzzeiten (`onsetsOf`) die Gruppen – nur Achtel und
Sechzehntel, die im selben Schlag aufeinander folgen (`BEAM_UNIT` = 1 Schlag, Sandra: je Schlag 2 + 2 auch in
„2 8 8 8 8“), nie über eine Pause oder Schlaggrenze; eine einzelne Achtel behält das Fähnchen.
`secondaryBeams(els, group)` gibt die Sechzehntel-Bereiche für den zweiten Balken, `needsStub` erkennt Gruppen,
die einen Teilbalken bräuchten (kommt in `BARS` nicht vor, Test). `barBeams(els, gap, filled)`: In der Aufgabe
fehlt die Gruppe mit der Lücke (dort Fähnchen, der Balken verriete den Wert), in der Auflösung und im Ergebnis
der Vorführung stehen alle Gruppen. Die Abstände bleiben gleich. Die Lerntafel „Notenwerte und Pausen“ zeigt
`beamPictureSvg` („mit Fähnchen = mit Balken“, `BEAM_PICTURES`), die Hilfen der Stufe 8 den Satz `HELP_TEXT_BEAM`. Lerntafeln mit
Vorführung tragen `data-nw-board="value|beats|bar"`. Klassen: `.nw-ring` (Rahmen über der Note), `.nw-s1`/`.nw-s2`
(Zeichen in der Farbe des Schritts), `.nw-pyr*`, `.nw-sum*`, `.nw-seg`, `.nw-rests`.

## Engine (`src/engine.js`)

`startRound(level, ui, hooks)` führt zehn Aufgaben durch. Die Engine kennt kein
Paket im Detail, sie ruft `question`, `check`, zeigt `svg`, baut die
Antwort-Elemente nach `input` und vergibt Sterne (5/7/9 richtige = 1/2/3) und
XP (10 je richtige Antwort, 20 je Stern). Ergebnisse landen im Store unter der
Stufen-ID.

- `ui`: `{ staff, feedback, count, dots, answers, typed, piano, helps, helpsBody, next }` (DOM-Elemente;
  `typed` zeigt den getippten Namen, nur bei Stufen mit Namensraster; `helps` ist das `<details>` der
  Hilfen, `helpsBody` sein Inhalt; `next` ist der Knopf „Nächste Aufgabe“ `#pNext` direkt unter den
  Antwortknöpfen)
- Weiter zur nächsten Aufgabe (seit 20.11.2026, Entscheidung Sandra): Stufen ohne `helps` gehen wie bisher nach
  `answerDelay` von selbst weiter. Stufen mit `helps` (`waitsForNext(level)`, „Intervalle“ 1, 3, 5, 8, seit Welle 8 auch „Tonleitern“ 1, 2, 4, 6, 8, 10, 12) warten
  nach der letzten Antwort einer Aufgabe ohne Zeitgeber (`isWaiting()`), bis du „Nächste Aufgabe“ tippst
  (`#pNext`, ohne die Hilfen zu öffnen sichtbar, auch bei 320 × 640 ohne Scrollen) oder Enter bzw. die
  Leertaste drückst (`handleKey`; ein fokussierter Knopf der Vorführung oder `summary` behält seine Taste).
  Während des Wartens zählen keine Antworten. Auch die zehnte Aufgabe wartet; erst das Tippen zeigt die
  Ergebniskarte.
- Zweischrittige Aufgaben (seit Welle 7, `q.steps`): Die Engine zeigt die Knöpfe von `steps[0]`
  (Frage `q.prompt`), wertet die Wahl aus (`ok`/`bad`-Text farbig, richtige Wahl markiert), wartet
  `DELAY_STEP_OK` = 700 bzw. `DELAY_STEP_BAD` = 1600 ms und zeigt dann `steps[1]` mit dessen `prompt`, auch
  wenn der erste Schritt daneben lag. Erst nach dem letzten Schritt zählt die Aufgabe, einmal, und nur
  richtig, wenn alle Schritte stimmen (Statistik, Sterne, XP, `statKey` wie bisher). Rückmeldung
  `stepsFeedback(q, oks)`: alles richtig `Richtig! ${display}`, nur der erste Schritt daneben `q.partial`
  (falls gesetzt; das Paket „Intervalle“ lässt es weg, wenn der zweite Schritt nur einen Knopf hat),
  sonst `q.reveal`. Ziffern: `digitAction(e, set)` bei Knopfsätzen mit `digits`.
- Hilfen (seit Welle 7, `level.helps`): `helpsHtml(level, q)` baut `helpText`, die Klaviatur
  (`pianoSvg({ from: helpFrom(q), octaves: 2, marks: q.helpMarks, interactive: false })`, Violinschlüssel
  c' bis c''', Bassschlüssel C bis c'; eigener Bereich, nicht `#pPiano`) und `helpTable`. Seit Welle 8 darf eine
  Aufgabe `q.helpFrom` setzen (MIDI-Nummer des untersten C; optional, ohne das Feld wie bisher
  `HELP_FROM[q.clef]`): „Tonleitern“ nimmt das C auf oder unter dem Grundton (B-Dur im Violinschlüssel ab c,
  D-Dur im Bassschlüssel ab d), bei den Tonarten c'. Zu Beginn der Runde
  ist der Bereich zugeklappt; danach bleibt er so, wie du ihn gelassen hast (auf oder zu), der Inhalt wechselt
  mit jeder Aufgabe. Ob die Hilfe offen war, wird nicht gezählt. Stufen ohne `helps` zeigen keinen Bereich.
  Aufbau: Satz und Knopf „Vorführen“ (nur mit `level.demo`) in einer Zeile, dann Klaviatur und Tabelle
  (`.help-grid`, ab 600 px nebeneinander, Tabelle in zwei Hälften). Ab dem Aufklappen scrollt `practice.js`
  so weit, dass die erste Reihe der Antwortknöpfe über der Tab-Leiste steht (`answersScroll`); kein Scrollen
  innerhalb der Hilfen. Bis 380 px Breite stehen die Hilfen per CSS (`order`) unter den Antwortknöpfen.
- „Vorführen“ (seit 20.11.2026): zu Beginn jeder Aufgabe gesperrt (`disabled`, verriete die Antwort), frei nach
  der Antwort (nach dem letzten Schritt), auch während die Runde auf „Nächste Aufgabe“ wartet. Klaviatur und
  Tabelle weichen der Vorführung (`level.demo(q)` in `.help-demo`, darunter ein zweiter Knopf „Nächste
  Aufgabe“); „Nächste Aufgabe“ (dort oder `#pNext`), Enter/Leertaste oder Zuklappen der Hilfen während der
  Vorführung geht weiter (Zuklappen ohne Vorführung nicht). Die Antwortzeit ist da schon gezählt.
- `hooks`: `{ state, save, onFinish(result) }`; `result` ist
  `{ correct, total, stars, gained, avg, results }`
- weitere Funktionen für die Ansichten: `stop()` (laufende Runde abbrechen,
  Zeitgeber löschen), `isRunning()`, `setInput(pref)`,
  `handleKey(e)` (gibt `true` zurück, wenn die Taste verwendet wurde)
- reine Hilfsfunktionen (getestet): `starsHtml`, `effectiveInput`, `makeRound`,
  `findLevel(packs, id)`, `nextLevel(pack, level)`, `countAnswer`,
  `feedbackText`, `resultMessage`, `dotsHtml`, `lettersHtml`, `choicesHtml`,
  `choicesClass(choices)`, `choiceCols(choices)`,
  `keyAction(e)` (nur noch `{ letter }` für C–H oder `null`), `blitzPoints(combo)`,
  `notesToPlay(q)`, `playMode(q)`
- seit Paket F2 (Namensraster), rein und getestet: `usesNames(level)`,
  `namesHtml()` (21 Knöpfe), `nameKey(buf, e)` (Taste auf den Puffer anwenden:
  `null` oder `{ buf, answer?, invalid? }`), `typedText(buf, invalid)`,
  Konstante `NAME_MAX` (4 Zeichen); entfallen: `setMod(acc)`
- seit Paket F, ebenfalls rein und getestet: `revealedSvg(q)` (`q.revealSvg`
  oder `q.svg`), `svgResultClass(q, ok)` (seit Feinschliff Tonleitern: `"ok"`,
  `"bad"` oder `""` bei `q.keepRow`), `playSchedule(q)` (Abspielplan `[{ note, at, dur }]` in ms;
  `note` ist `null` bei Pausen, `dur` ist `null` bei Einträgen ohne Dauer),
  `rhythmEnd(q)` (Ende des letzten Eintrags mit Dauer in ms, sonst 0),
  `answerDelay(q, ok, muted)` (Wartezeit bis zur nächsten Aufgabe);
  Konstanten `ROUND_LENGTH`, `DELAY_OK`, `DELAY_BAD`, `PLAY_GAP`, `BEAT_MS`,
  `RHYTHM_TAIL`
- seit Welle 7, rein und getestet: `choiceSet(q, step)`, `setClass(set)`, `stepsFeedback(q, oks)`,
  `digitAction(e, set)`, `hasHelps(level)`, `helpsHtml(level, q)`; Konstanten `DELAY_STEP_OK`,
  `DELAY_STEP_BAD`, `HELP_FROM`, `HELP_OCTAVES`; seit Welle 8 `helpFrom(q)` (`q.helpFrom` oder `HELP_FROM[q.clef]`)
- `notesToPlay(q)` liefert nur die Noten aus `play` (ohne Pausen); damit
  bleibt `playMode` für Akkorde unverändert

## Töne (`src/audio.js`)

`play(n, vol = 0.22, dur)` spielt eine Note (Dreieckswelle). Ohne `dur`
klingt sie etwa 0,9 s aus; mit `dur` (Sekunden, für Rhythmen) klingt sie
`toneEnd(dur)` lang, also 50 ms kürzer als notiert und mindestens 80 ms,
damit gleiche Töne hintereinander getrennt hörbar sind. `playChord(notes,
vol)` startet mehrere Töne gleichzeitig. `setMuted(m)`, `isMuted()`. Der
`AudioContext` entsteht erst beim ersten Ton.

Ein Wechsel des Tabs beendet eine laufende Runde (Üben und Blitz) ohne Eintrag.

## Ansichten (`src/views/*.js`) und `src/app.js`

Jede Ansicht exportiert `init(ctx)` (einmal beim Start, Ereignisse binden) und
`render()` (bei jedem Wechsel auf den Tab). Üben und Blitz exportieren
zusätzlich `stop()` und `handleKey(e)`. `app.js` baut den gemeinsamen Kontext:

```js
const ctx = {
  state,        // aktueller Zustand aus store.load(); wird beim Zurücksetzen ersetzt,
                // Ansichten lesen ihn deshalb immer als ctx.state
  save,         // () => store.save(ctx.state)
  show,         // (view) => Tab wechseln: "home" | "practice" | "learn" | "blitz" | "stats"
  renderTop,    // Kopfzeile (Serie, XP, Ton-Knopf) neu zeichnen
  packs,        // PACKS aus src/packs/index.js
};
```

Tastendrücke mit Strg, Alt oder Cmd werden ignoriert, alle anderen gehen an
`handleKey` der aktiven Ansicht.

Statistik (`src/views/stats.js`, seit Paket F) exportiert reine Hilfsfunktionen
(getestet in `test/views/stats.test.js`):

- `weakList(notes, limit = 6)`: Einträge aus `state.notes` mit `bad > 0`,
  absteigend nach `bad` (Gleichstand nach Name), `[{ key, bad, ok, pct }]`;
  `pct` ist der Balken relativ zum größten Wert
- `levelRow(level, entry)`: `{ id, no, title, played, best, stars, pct }`
  für eine Stufe (`pct` = `best · 10`)
- `levelGroups(packs, levels)`: Stufen je Paket in der Reihenfolge der
  Registry, je Gruppe `{ id, title, rows, played, stars, maxStars }`;
  unbekannte IDs in `state.levels` werden übergangen
- `levelRowText(row)`: „8/10 · 3× gespielt“ bzw. „noch nicht gespielt“
- Notenkarte (seit Paket G, Container `#sHeat`): `heatRows(notes, clef, perRow = 7)`
  liefert für `"treble"` oder `"bass"` die Stammtöne aus `HEAT_NOTES` in
  `packs/noten.js` (Violin c' bis a'', Bass E bis c') als Zeilen zu höchstens
  7 Zellen; `heatAccList(notes)` die Vorzeichen-Noten aus Stufe 7;
  `heatCell(n, clef, entry)` → `{ key, n, clef, name, helm, status, cls, ok,
  total, pct, avg, detail }`. `cls` folgt `HEAT_CLS` (sicher `"ok"`, langsam
  `"warn"`, unsicher `"bad"`, neu `"new"`, grau über `--muted`; das Blau `ghost` bleibt der Ansicht „Lernen“); unter jeder Note stehen Name und
  Trefferquote, Antippen zeigt `detail`, z. B. „Fis (fis', Violin): 12 von 15
  richtig, im Schnitt 2,1 s“. `pct` und `avg` kommen wie die Farbe aus
  `recent` (letzte 12 Antworten); weicht das von der Gesamtzahl ab, lautet
  `detail` z. B. „… zuletzt 11 von 12 richtig (insgesamt 30 von 45) …“.

## Adaptive Auswahl (`src/adapt.js`, seit Paket G)

Rein, ohne DOM, getestet in `test/adapt.test.js`. Die Startwerte stehen als
Konstanten oben in der Datei und sind zum Justieren nach dem Test mit Kindern
gedacht, keine Forschungswerte: `MIN_ANTWORTEN = 6`, `QUOTE_SICHER = 0.7`,
`LANGSAM_SEK = 4`, `ANTEIL_ZUFALL = 0.3`, `GEWICHT = { neu: 2, unsicher: 4,
langsam: 2, sicher: 1 }`, `FENSTER = 12`, `ZEIT_DECKEL = 10`, `MIN_ZEITEN = 3`
(die letzten drei festgelegt von Sandra am 19.11.2026).

- `recent(entry)`: Kennzahlen `{ ok, n, timed, avg }`. Hat der Verlauf `hist`
  mindestens 6 Einträge, zählen nur die letzten 12 Antworten und die letzten
  12 Zeiten aus `hsec`; sonst die Gesamtwerte (alte Spielstände). So hält ein
  früher oft falsch gelesener Ton eine Note nicht lange rot.
- `status(entry)`: aus `recent`: `"neu"` (weniger als 6 Antworten),
  `"unsicher"` (Trefferquote unter 70 %), `"langsam"` (sonst, wenn mindestens
  3 Zeiten gemessen sind und die richtigen Antworten im Schnitt über 4 s
  dauern; Einträge ohne Zeitmessung nie), `"sicher"`
- `weight(entry)`: Gewicht nach `GEWICHT`
- `pickWeighted(items, keyOf, notes, prev, rand = Math.random)`: nie dieselbe
  Aufgabe wie `prev` (Vergleich über `keyOf`); mit Wahrscheinlichkeit 0,3
  gleichverteilt, sonst nach Gewicht; ohne `notes` gleichverteilt
- `countUnsure(notes, keys)`: Anzahl unsicherer Einträge (Hinweis auf der
  Startseite bei „Noten lesen“, Schlüssel aus `NOTE_KEYS` in `packs/noten.js`;
  Text aus `unsureText(k)` in `views/home.js`)

Die Engine ruft `question(prev, ctx)` mit `ctx = { notes: state.notes }`
(`makeRound(level, count, ctx)`). Pakete ohne zweiten Parameter laufen
unverändert. Bisher nutzt nur „Noten lesen“ (Stufen 1 bis 8) die gewichtete
Auswahl, Blitz nicht. Die Aufgaben einer Runde entstehen beim Start, die
Gewichte wirken also ab der nächsten Runde.

## Offline und Updates (`sw.js`, `src/app.js`)

`sw.js` legt alle App-Dateien beim Installieren in den Cache `CACHE`
(`notenheld-v<Version>-<Zähler>`; bei jedem Release erhöhen) und liefert sie
„Cache zuerst“ aus; Seitenaufrufe ohne Netz bekommen `index.html`.
`test/sw.test.js` prüft, dass jede Datei aus `src/`, `css/`, `fonts/` und
`icons/` in `PRECACHE` steht. Beim Aktivieren löscht der Worker alte Caches
der App und übernimmt die offenen Seiten (`clients.claim`).

Updates (seit Paket F): Der neue Worker ruft beim Installieren **kein**
`skipWaiting` auf, sondern wartet. `src/app.js` registriert den Worker (nur
über https oder localhost) und zeigt dann über der Tab-Leiste den Hinweis
`#updateBar` „Neue Version verfügbar“ mit „Später“ (`#updateLater`, blendet
aus) und „Neu laden“ (`#updateReload`). „Neu laden“ schickt dem wartenden
Worker die Nachricht `{ type: "SKIP_WAITING" }`; er ruft `skipWaiting()` auf,
und beim folgenden `controllerchange` lädt die Seite genau einmal neu. Bei der
ersten Installation (noch kein `controller`) erscheint kein Hinweis und die
Seite lädt nicht neu. Kommt die App aus dem Hintergrund zurück
(`visibilitychange`), sucht sie mit `reg.update()` nach einer neuen Version.

## Fortschritt (`src/store.js`)

Zustand (persistiert unter `localStorage["notenheld.v2"]`):

```js
{
  xp, dayStreak, lastDay,
  levels: { "noten-1": { stars, best, played } },
  notes: { "G (g', Violin)": { ok, bad, sec, timed, last, hist, hsec } },   // je Aufgabe (statKey)
  answered, correct, bestCombo, blitzRecord,
  unlockAll, muted, input, current: "noten-1",
  migrated: ["intervalle-neu", "tonleitern-neu"],   // einmalige Umstellungen, die schon gelaufen sind (seit Welle 7)
}
```

Umstellung „Intervalle neu“ (Welle 7, `migrateIntervalle(s)`): läuft beim Laden genau einmal (Marker
`"intervalle-neu"` in `migrated`; ein frischer Stand trägt ihn schon). Sie benennt `intervalle-5` →
`tonleitern-7` und `intervalle-6` → `tonleitern-8` um (gab es die neue ID schon: bester Wert, Runden
zusammen), löscht alle übrigen `intervalle-1 … -12` und setzt `current` um (auf eine entfallene Stufe →
`intervall-1`). `notes` (Statistik je Aufgabe) bleibt unverändert. Danach speichert `load` einmal.
`isUnlocked`: eine schon gespielte Stufe (`played > 0`) bleibt offen, so sind übernommene
`tonleitern-7`/`-8` spielbar, auch wenn `tonleitern-6` noch nicht geschafft ist.

Umstellung „Tonleitern gehirngerecht“ (Welle 8, `migrateTonleitern(s)`, Marker `"tonleitern-neu"`, ein frischer
Stand trägt beide Marker): `tonleitern-1→1, 2→2, 3→4, 4→5, 5→7, 6→9, 7→11, 8→13`, in einem Durchgang in ein
neues `levels`-Objekt (sonst verketteten sich 3→4 und 4→5), `current` entsprechend, `notes` und statKeys
bleiben. Reihenfolge zwingend: `load` ruft `migrateAll(s)` = erst `migrateIntervalle`, dann `migrateTonleitern`
(beide laufen immer, nicht mit `||` verkettet; danach einmal speichern), auch im v1-Zweig. So landen alte
`intervalle-5/-6` über `tonleitern-7/-8` auf 11 und 13. Freischaltung unverändert: Gespieltes bleibt offen; eine
alte, offene, aber nie gespielte Stufe öffnet sich erst wieder über die neue Stufe davor.

Umstellung „Notenwerte gehirngerecht“ (Welle 9, `migrateNotenwerte(s)`, Marker `"notenwerte-neu"`, ein frischer
Stand trägt alle drei Marker): `notenwerte-1→1, 2→2, 3→5, 4→7, 5→9, 6→10`, in einem Durchgang in ein neues
`levels`-Objekt (sonst verkettet 3→5 mit 5→9), `current` entsprechend, `notes` bleibt (keine statKeys im Paket).
`migrateAll` ruft alle drei auf (`a || b || c`); die Reihenfolge ist für die Notenwerte unkritisch. Folge der
Freischaltung bei einem alten Stand, der alles geschafft hatte: 4 bleibt zu, bis 3 geschafft ist (im Test).

Ein Eintrag in `notes` (seit Paket G): `ok` und `bad` zählen richtige und
falsche Antworten, `sec` ist die Summe der Antwortzeiten richtiger Antworten
in Sekunden, `timed` deren Anzahl, `last` der Tag der letzten Antwort
(`today()`). Jede Zeit zählt höchstens 10 s (`ZEIT_DECKEL`). `hist` ist ein
Text aus den letzten 12 Ergebnissen (`"1"` richtig, `"0"` falsch, neueste
hinten), `hsec` die letzten 12 gemessenen Zeiten richtiger Antworten. Blitz
zählt keine Zeit. Ältere Einträge haben nur `{ ok, bad }`;
fehlende Felder gelten als 0 bzw. `null`, deshalb ist keine Migration nötig
und der Schlüssel bleibt `notenheld.v2`.

Freischaltung: die erste Stufe jedes Pakets ist offen. Jede weitere öffnet
sich, wenn die vorherige Stufe desselben Pakets `best >= 8` hat, oder wenn
`unlockAll` gesetzt ist. Seit Paket „Intervalle 7–12“ darf eine Stufe statt
der vorherigen eine andere Stufe desselben Pakets nennen: `requires:
"intervalle-1"` (Stufe 7 öffnet sich nach Stufe 1, nicht nach Stufe 6).
`unlockedBy(pack, levelId)` liefert die freischaltende Stufe (`requires` oder
die davor; `null` bei der ersten Stufe, bei unbekannter Stufe und bei einem
`requires`, das es im Paket nicht gibt: die Stufe bleibt dann gesperrt, außer
mit `unlockAll`). `unlocks(pack, levelId)` liefert umgekehrt die Stufen, die
`levelId` freischaltet. Genutzt von `isUnlocked`, der Startseite (`lockText`
in `home.js`: „frei ab 8/10 in Stufe n“ unter jeder gesperrten Stufe, seit
Welle 10, A7) und der Ergebniskarte (`resultInfo` in `practice.js`: eigene
Zeile „Noch eine richtige Antwort, dann öffnet sich Stufe 3.“, „Noch 2
richtige Antworten, dann …“, ab 4 fehlenden „Ab 8 von 10 öffnet sich
Stufe 3.“, ab 8 Richtigen „Stufe 3 ist offen.“). `keepStufe(text)` in
`engine.js` (rein) setzt in beiden Texten ein geschütztes Leerzeichen
zwischen „Stufe“ und Zahl sowie vor die letzte Zahl einer Aufzählung
(„und 7“), damit bei 320 px keine Zahl allein in der Zeile steht; die
Ansichten importieren einander nicht. Spielstände ändern
sich dadurch nicht. Alte Daten unter `notenheld.v1` werden beim ersten
Start übernommen (Stufe `n` wird zu `noten-n`, `current: n` zu `"noten-n"`)
und als v2 gespeichert; der v1-Eintrag bleibt unverändert.

Exporte (alle rein bis auf das Verändern des übergebenen Zustands; nur `load`
und `save` greifen auf `localStorage` zu): `KEY_V1`, `KEY_V2`, `fresh()`,
`load()`, `save(s)`, `migrateV1(v1)`, `migrateIntervalle(s)` (→ `true`, wenn geändert), `MIGRATION_INTERVALLE`,
`RENAMED_INTERVALLE`, `today(now)`, `touchStreak(s, now)`,
`isUnlocked(s, pack, levelId)`, `unlockedBy(pack, levelId)`, `unlocks(pack, levelId)`, `starsFor(correct)`,
`recordRound(s, levelId, correct)` → `{ stars, gained }`,
`recordAnswer(s, key, ok, sec, now)` (`sec` optional, zählt nur bei richtigen Antworten), `recordBlitz(s, score, bestCombo)` →
`{ record, gained }`, `reset(s)` (behält nur `muted` und `input`),
`accuracy(s)`.

## Tests

`npm test` führt `node --test "test/**/*.test.js"` aus (ein Verzeichnis als
Argument funktioniert mit Node 22 nicht). Reine Module werden direkt
importiert; aus den Ansichten nur reine Exporte wie `learnCardsHtml`
(`test/views/learn.test.js`). `test/css.test.js` prüft, dass
`css/style.css` außerhalb der `:root`-Blöcke keine Farbwerte enthält;
`test/texte.test.js` prüft `index.html` und `src/` auf Wörter, die laut
Konzept nicht vorkommen sollen (Tonfall). Für Module, die den DOM brauchen, gibt es keine Tests; sie sollen
deshalb so dünn wie möglich sein und ihre Logik in reine Module auslagern.

## Stil

- Deutsch in UI, Kommentaren und Commit-Nachrichten.
- Keine Frameworks, keine Abhängigkeiten.
- Zwei Leerzeichen Einrückung, doppelte Anführungszeichen, Semikolons.
- Farben nur über die Tokens in `css/style.css` (hell und dunkel).
