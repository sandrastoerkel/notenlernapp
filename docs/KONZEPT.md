# Konzept: Notenheld

## Zielgruppe

Schülerinnen und Schüler am Gymnasium, etwa 10 bis 18 Jahre. Die App soll sich wie eine Sprachlern-App anfühlen, ohne kindlich zu wirken: Anrede „du“, knappes Feedback, keine Comic-Figuren. Motivation entsteht aus Sternen, Erfahrungspunkten, Tagesserie und dem Blitz-Rekord.

## Didaktischer Aufbau

Eine Runde dauert etwa zwei Minuten: zehn Noten, sofortiges Feedback, am Ende Sterne (5 richtig = 1 Stern, 7 = 2, 9 = 3). Richtige Antworten werden grün und die Note erklingt. Bei falschen Antworten wird der richtige Name gezeigt und die Note erklingt trotzdem, damit Auge und Ohr zusammen lernen.

Die acht Stufen folgen der Reihenfolge, in der Noten im Musikunterricht eingeführt werden: zuerst die Linien im Violinschlüssel mit Merkspruch, dann die Zwischenräume, dann Hilfslinien, danach derselbe Weg im Bassschlüssel, zuletzt Vorzeichen und die Mischung aus allem.

Die Statistik zeigt die „schwachen Noten“, also die Noten mit den meisten Fehlern. Das ist der Ansatzpunkt für die nächste Übung.

## Eingabe

- Buchstaben C bis H (deutsche Namen, H statt B)
- ab Stufe 7 (Vorzeichen) der ganze Name: Raster mit allen 21 Namen (C … H, Cis … His, Ces … B) oder getippt, z. B. „fis“ und Enter
- Klaviatur (eine Oktave) für alle, die ein Tasteninstrument lernen; dort zählt die Taste, Fis und Ges sind dieselbe Taste
- Computertastatur am Laptop

## Erweiterungen für Mittel- und Oberstufe

Die Grundmechanik (Aufgabe zeigen, antworten, Feedback, Sterne) bleibt gleich. Denkbare weitere Stufen:

- Notenwerte und Pausen, Rhythmus nachtippen
- Intervalle bestimmen (Sekunde bis Oktave)
- Tonleitern und Vorzeichen der Tonarten, Quintenzirkel
- Dreiklänge (Dur, Moll) erkennen
- Altschlüssel für Bratsche
- Gehörbildung: Note hören und auf der Zeile setzen

## Mögliche technische Ausbaustufen

- Installierbar als Progressive Web App (Manifest und Service Worker) für Handy und Tablet
- Export und Import des Fortschritts als Datei
- Lehrkraft-Modus mit Klassen-Code und Auswertung (bräuchte einen Server)
- Verpackung als Desktop-App, zum Beispiel mit Tauri
