# Fremde Bestandteile

Notenheld enthält keine fremden Programmbibliotheken. Selbst gehostet werden nur
drei Schriften, alle unter der SIL Open Font License, Version 1.1 (OFL). Die
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

## App-Icon

Die Icons in `icons/` (`icon.svg`, `icon-maskable.svg` und die daraus gerenderten
PNGs) zeigen den Violinschlüssel (U+1D11E) aus **Noto Music**, als Umriss-Pfad
aus der Schrift übernommen. Die Glyphe stammt damit aus einer Schrift unter der
SIL Open Font License 1.1 (Copyright 2022 The Noto Project Authors, siehe oben). Hintergrund in der
Akzentfarbe der App (`--accent`), Schlüssel in `--accent-fg`.
