# Lessons

## Lehren

- 2026-11-26 | Anlass: Welle 11, Schritt 12 (Prüfung) | Lehre: Prüfer committen jede Korrektur sofort als kleinen Commit, nicht gesammelt am Ende – sonst hängt die Arbeit beim Abbruch (Limit) ungesichert im Arbeitsbaum. | Zähler: 1
- 2026-11-26 | Anlass: Welle 11, Schritt 12 | Lehre: Lange Browser-Prüfläufe (ueberlauf.mjs, ~20 Min) brauchen zwischen den Zuständen ein Aufräumen (offene Leisten/Dialoge schließen) und ein Zeitlimit von mindestens 25 Min, sonst bricht der Lauf ab und muss wiederholt werden. | Zähler: 1
- 2026-11-26, 2026-11-26 | Anlass: Welle 11, Schritt 13a (Prüfung); Prüfung aus drei Perspektiven (W-A1) | Lehre: Zusagen in Doku und App-Texten („es schließt sich nichts“, „Link ist ein Schutz“, Voreinstellung als Entscheidung) nie stärker formulieren, als der Code hält – und jede solche Zusage mit einem Test über alle Zustandsübergänge absichern, nicht nur über Beispielpfade. | Zähler: 2
- 2026-11-26 | Anlass: Welle 11, Schritt 13b (Prüfung) | Lehre: Prüf- und Fotoskripte leiten ihre Abdeckung aus den Listen im Code ab (alle Eingabearten, alle Stufen, alle Startkarten), statt sie von Hand aufzuzählen – sonst fehlt still eine Eingabeart (hier: Klaviatur). | Zähler: 1
- 2026-11-26 | Anlass: Welle 12, Schritt 0 (Engine: Denkschritt mit Noteneingabe) | Lehre: Vor dem Umformulieren von Engine-Code in `test/` nach Tests suchen, die Quelltext wörtlich lesen (`grep -rn readFileSync test/`) – solche Tests brechen schon bei gleichwertigem, anders geschriebenem Code, und „kein vorhandener Test wird angepasst“ gilt auch für sie. | Zähler: 1
- 2026-11-26 | Anlass: Welle 12, Schritt 0 (Prüfung) | Lehre: Fokus-Regeln immer im echten Browser prüfen, nicht nur am Ersatz-DOM der Tests – dort nimmt jedes Element den Fokus an, im Browser nur eines mit `tabindex` (hier: `#pPiano`), und Knöpfe entstehen an mehr Stellen neu als nur beim Schrittwechsel (auch zur nächsten Aufgabe). | Zähler: 1
- 2026-11-26 | Anlass: Welle 12, Schritt 2 (Umnummerierung der Stufen in allen Tests) | Lehre: Nach einer Umnummerierung jede Testdatei einzeln laufen lassen (`timeout 100 node --test <Datei>`), nicht nur `npm test` – so zeigt sich sofort, welche Datei hängt oder scheitert; und Ersetzungen in Tests über eindeutige Textstellen ansetzen, nicht über Zeilennummern (die verschieben sich mit jeder Änderung). | Zähler: 1
- 2026-11-26 | Anlass: Welle 12, Schritt 3 (zweischrittige Stufen; Zusammenführung mit den Schritten 4 bis 6) | Lehre: Vor dem Bau in `test/` nach Tests suchen, die Stufen aufzählen (`grep -rn "twoSteps\|keysHint\|levelNoteSteps\|keepRow" test/`), und sie in der Dateiaufteilung des Plans dem Schritt zuordnen – sonst scheitern sie erst beim Zusammenführen in fremden Dateien. Und die Form von Feldern, die ein paralleler Schritt liest (hier `q.spruch` für die Vorführung), vorab im Plan festlegen. | Zähler: 1
- 2026-11-26 | Anlass: Welle 12, Prüfung Schritt 3/4 (Namensleiste lief nach dem Zusammenführen über) | Lehre: Parallele Schritte, die in dieselbe CSS-Datei schreiben, bekommen im Plan je einen eigenen Klassen-Vorsatz (oder eine Liste der vergebenen Namen); getrennte Abschnitte der Datei schützen nicht vor gleichen Klassennamen (`.nl-namen`, `.nl-name`, `.nl-keys`). Nach dem Zusammenführen den Browser noch einmal über alle Hilfen laufen lassen. | Zähler: 1

## Regelvorschläge

## Übernommene Regeln

- 2026-11-26 (Sandra: ja) | Regel: Jede Zusage an Lernende oder Lehrkräfte in UI-Texten und Doku (z. B. „nichts wird gesperrt“, „nichts verlässt das Gerät“) bekommt einen Test, der sie über alle Zustandsübergänge prüft; Prüfer gleichen solche Sätze ausdrücklich mit dem Code ab.
  Ort: CLAUDE.md, Abschnitt „Regeln“
  Grund: Lehre mit Zähler 2 – Schritt 13a (Schutz des Links zu stark beschrieben) und W-A1 (Dialog versprach „es schließt sich nichts“, 20–36 Stufen schlossen sich; Schritt-11-Test prüfte nur gespielte Stufen).

