# Fremde Bestandteile

Notenheld enthält keine fremden Programmbibliotheken. Selbst gehostet werden nur
drei Schriften, alle unter der SIL Open Font License, Version 1.1 (OFL), dazu ein
einzelner Glyphen-Umriss aus Bravura (ebenfalls OFL, siehe unten). Die
Lizenztexte liegen unverändert in `fonts/`.

Bezogen am 6. November 2026 über die Google Fonts API (`fonts.googleapis.com/css2`,
Dateien von `fonts.gstatic.com`), Format woff2. Die Dateien sind die von Google
Fonts ausgelieferten Teilmengen (Subsets), unverändert.

| Schrift | Datei in `fonts/` | Subset | Version | Lizenztext |
| ------- | ----------------- | ------ | ------- | ---------- |
| Noto Music | `NotoMusic-Regular-music.woff2` | „music“: U+25CC, U+2669–266F, U+1D000–1D0F5, U+1D100–1D245 | 2.004 (Google Fonts v22) | `fonts/OFL-NotoMusic.txt` |
| Outfit | `Outfit-latin.woff2` (variabel, wght 100–900; genutzt 500 und 700) | „latin“ | 1.100 (Google Fonts v15) | `fonts/OFL-Outfit.txt` |
| Nunito | `Nunito-latin.woff2` (variabel, wght 200–1000; genutzt 400, 600, 700, 800) | „latin“ | 3.602 (Google Fonts v32) | `fonts/OFL-Nunito.txt` |

## Noto Music

- Copyright 2022 The Noto Project Authors (https://github.com/notofonts/music)
- Gestaltung: Google
- Quelle: https://fonts.google.com/noto/specimen/Noto+Music, Projekt https://github.com/notofonts/music
- Lizenz: SIL Open Font License 1.1, Text aus https://github.com/google/fonts/blob/main/ofl/notomusic/OFL.txt

## Outfit

- Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts)
- Gestaltung: Smartsheet Inc, Rodrigo Fuenzalida
- Quelle: https://fonts.google.com/specimen/Outfit, Projekt https://github.com/Outfitio/Outfit-Fonts
- Lizenz: SIL Open Font License 1.1, Text aus https://github.com/google/fonts/blob/main/ofl/outfit/OFL.txt

## Nunito

- Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito)
- Gestaltung: Vernon Adams, Cyreal, Jacques Le Bailly
- Quelle: https://fonts.google.com/specimen/Nunito, Projekt https://github.com/googlefonts/nunito
- Lizenz: SIL Open Font License 1.1, Text aus https://github.com/google/fonts/blob/main/ofl/nunito/OFL.txt

## Bravura (nur der Bassschlüssel)

- Copyright © 2026, Steinberg Media Technologies GmbH (http://www.steinberg.net/), with Reserved Font Name "Bravura".
- Quelle: https://github.com/steinbergmedia/bravura, Datei `redist/otf/Bravura.otf`, Version 1.482, bezogen am 6. November 2026
- Verwendet: nur der Umriss der Glyphe fClef (U+E062, SMuFL), mit fontTools als SVG-Pfad ausgelesen und
  unverändert als `BASS_CLEF_PATH` in `src/staff.js` eingesetzt. Die Schriftdatei selbst wird nicht ausgeliefert.
- Lizenz: SIL Open Font License 1.1, Text aus https://github.com/steinbergmedia/bravura/blob/master/LICENSE.txt
  (gleichlautend mit dem Lizenzeintrag in der Schriftdatei), abgelegt als `fonts/OFL-Bravura.txt`

## App-Icon

Die Icons in `icons/` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
`apple-touch-icon.png`, `favicon-32.png`, `favicon-48.png`) stammen aus einem
eigenen, von Hand gemalten Aquarell von **Sandra Störkel** (schwarzer
Violinschlüssel auf Blau, Grün und Gelb). Sie sind kein fremder Bestandteil und
enthalten keine Glyphe aus Noto Music mehr.

Bearbeitung: quadratisch um den Schlüssel zugeschnitten und verkleinert; die
weißen Papierränder sind durch stark verwischte Farben aus dem Bild selbst
ersetzt. Beim maskierbaren Icon ist die Fläche auf dieselbe Weise erweitert,
damit der ganze Schlüssel im sicheren Kreis (80 %) liegt. Die beiden
512-px-Dateien sind auf 256 Farben mit Fehlerstreuung reduziert (Dateigröße).
