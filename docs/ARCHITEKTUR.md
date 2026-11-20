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
  packs/index.js        Registry aller Themenpakete
  packs/noten.js        Paket „Noten lesen“ (8 Stufen)
  packs/notenwerte.js   Paket „Notenwerte und Pausen“
  packs/tonleitern.js   Paket „Tonleitern“ (Dur bis 4 Vorzeichen, seit Welle 5)
  packs/intervalle.js   Paket „Intervalle und Tonarten“
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
| `noteSvg(n, clef, x, cls, opts)` | Note mit Hals, Hilfslinien und Vorzeichen; `cls` ist `""`, `"ok"`, `"bad"`, `"warn"` (langsam, Notenkarte, Token `--gold`), `"new"` (neu, Notenkarte, Token `--muted`) oder `"ghost"` (Lernen, Token `--accent`); `opts.value` ist `1`, `2`, `4`, `8`, `16` (ganze bis sechzehntel, Standard 4), `opts.stemless` lässt den Hals weg |
| `noteheadSvg(x, y, value)` | nur der Notenkopf mit Mitte (x, y), so wie ihn `noteSvg` zeichnet (ohne Hals, Hilfslinien, Vorzeichen); `value` 4, 8, 16 schwarz, 2 und 1 hohl, Standard 4. Nutzt die Ansicht „Lernen“ für „Alle Namen zeigen“ |
| `restSvg(value, x)` | Pause (1, 2, 4, 8, 16); ganze und halbe als `<rect class="rest">`, die übrigen als Glyphe (`<text class="rest">`) |
| `glyphSvg(char, x, y, size)` | ein Zeichen aus der Musikschrift |
| `keySigSvg(clef, count)` | nur die Vorzeichen (wird von `staffSvg` genutzt); Kreuze in der Reihenfolge Fis Cis Gis Dis Ais Eis His, Be in der Reihenfolge B Es As Des Ges Ces Fes |
| `pianoSvg()` | eine Oktave Klaviatur (8 weiße, 5 schwarze Tasten, 13 `rect`); Tasten tragen `data-semi` (Halbtonzahl ab C, das obere C wieder 0) |

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
Auflösungen der Stufen 3 bis 5 nutzen `cls` und `label` zusammen mit `q.keepRow`. Im Browser gemessen (getBBox): kein Vorzeichen berührt den Kopf
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
Lagen), Stufe 6 alle sieben Stufen I bis VII. Im Paket „Tonleitern“ haben Stufe 1 und 2
(`tonleitern-1`, `tonleitern-2`) nur zwei Knöpfe („Ganztonschritt“, „Halbtonschritt“); Halbtöne
werden dort mit Wahrscheinlichkeit 0,4 gezogen. Raten reicht in etwa 5,5 % der Runden für 8 von 10.

Rhythmen (seit Paket F): Ein Eintrag in `play` ist entweder eine Note (wie
bisher; mehrere Noten nacheinander im Abstand `PLAY_GAP` = 500 ms) oder ein Wert
mit Dauer: `{ note, beats }` für einen Ton, `{ rest: true, beats }` für eine
Pause. `beats` zählt Schläge (Viertel = 1, punktierte Viertel 1,5); ein Schlag
dauert `BEAT_MS` = 600 ms (Tempo 100). Der Ton klingt dann `beats · 0,6 s`
lang (`play(n, vol, dur)` in `audio.js`). Die nächste Aufgabe erscheint erst,
wenn der Rhythmus vorbei ist, plus `RHYTHM_TAIL` = 300 ms (bei
ausgeschaltetem Ton wie bisher nach 800 bzw. 1600 ms). Genutzt von „Takt
füllen“: Nach der Antwort zeigt `revealSvg` den Takt mit dem fehlenden Wert in
der Lücke (`<g class="filled">`), und der ganze Takt erklingt auf h'.

`revealSvg` (seit Paket F): Ist es gesetzt, ersetzt die Engine nach der Antwort
das SVG der Aufgabe durch `revealSvg`; die Färbung `ok`/`bad` gilt für das
angezeigte SVG. Ohne `revealSvg` bleibt `svg` stehen (`revealedSvg(q)`).

`keepRow` (seit Feinschliff Tonleitern): Setzt eine Aufgabe `keepRow: true`,
lässt die Engine die Klasse `ok`/`bad` am `<svg>` weg (`svgResultClass(q, ok)`
gibt dann `""`); die Zeile bleibt schwarz, und das Paket färbt selbst einzelne
Noten (Tonleitern, Stufe 3 bis 5). Das Feedback darunter wird wie bisher grün
bzw. rot. Ohne `keepRow` unverändert.

Gleichzeitiges Abspielen (seit Paket E): Setzt eine Aufgabe `playTogether: true`
und enthält `play` mehr als einen Ton, startet die Engine alle Töne zur selben
Zeit über `playChord(notes)` aus `src/audio.js` (gleicher Startzeitpunkt für alle
Oszillatoren, Lautstärke je Ton geteilt durch √Anzahl). Die Entscheidung trifft die
reine Hilfsfunktion `playMode(q)` in `engine.js` (`"together"` oder `"sequence"`);
ohne `playTogether` bleibt es beim Nacheinander mit `PLAY_GAP`.

Eingabeart: hat eine Stufe `input: "letters"` und hat das Kind „Klaviatur“
gewählt (`state.input === "keys"`), nutzt die Engine die Klaviatur. Andere
Eingabearten bleiben unverändert.

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
  damit nur der Wert zählt (im Test `test/packs/notenwerte.test.js` vermerkt).
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
keine eigene Hauptüberschrift mit.

## Engine (`src/engine.js`)

`startRound(level, ui, hooks)` führt zehn Aufgaben durch. Die Engine kennt kein
Paket im Detail, sie ruft `question`, `check`, zeigt `svg`, baut die
Antwort-Elemente nach `input` und vergibt Sterne (5/7/9 richtige = 1/2/3) und
XP (10 je richtige Antwort, 20 je Stern). Ergebnisse landen im Store unter der
Stufen-ID.

- `ui`: `{ staff, feedback, count, dots, answers, typed, piano }` (DOM-Elemente;
  `typed` zeigt den getippten Namen, nur bei Stufen mit Namensraster)
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
}
```

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
`unlockAll` gesetzt ist. Alte Daten unter `notenheld.v1` werden beim ersten
Start übernommen (Stufe `n` wird zu `noten-n`, `current: n` zu `"noten-n"`)
und als v2 gespeichert; der v1-Eintrag bleibt unverändert.

Exporte (alle rein bis auf das Verändern des übergebenen Zustands; nur `load`
und `save` greifen auf `localStorage` zu): `KEY_V1`, `KEY_V2`, `fresh()`,
`load()`, `save(s)`, `migrateV1(v1)`, `today(now)`, `touchStreak(s, now)`,
`isUnlocked(s, pack, levelId)`, `starsFor(correct)`,
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
