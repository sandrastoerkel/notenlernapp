# Konzept: Notenheld

## Zielgruppe

Schülerinnen und Schüler am Gymnasium, etwa 10 bis 18 Jahre. Die App soll sich wie eine Sprachlern-App anfühlen, ohne kindlich zu wirken: Anrede „du“, knappes Feedback, keine Comic-Figuren. Motivation entsteht aus Sternen, Erfahrungspunkten, Tagesserie und dem Blitz-Rekord.

## Didaktischer Aufbau

Eine Runde dauert etwa zwei Minuten: zehn Noten, sofortiges Feedback, am Ende Sterne (5 richtig = 1 Stern, 7 = 2, 9 = 3). Richtige Antworten werden grün und die Note erklingt. Bei falschen Antworten wird der richtige Name gezeigt und die Note erklingt trotzdem, damit Auge und Ohr zusammen lernen.

Die acht Stufen folgen der Reihenfolge, in der Noten im Musikunterricht eingeführt werden: zuerst die Linien im Violinschlüssel mit Merkspruch, dann die Zwischenräume, dann Hilfslinien, danach derselbe Weg im Bassschlüssel, zuletzt Vorzeichen und die Mischung aus allem.

Die Statistik zeigt die „schwachen Noten“, also die Noten mit den meisten Fehlern. Das ist der Ansatzpunkt für die nächste Übung.

## Wiederholen ist der Kern (Sandra, 24.11.2026; gebaut in Welle 11)

Schülerinnen und Schüler vergessen immer wieder. Die App ist dafür da, dass jede und jeder wiederholen kann, was für das Neue gebraucht wird. Daraus folgen drei Dinge:

1. **Jede Stufe kennt ihre Voraussetzungen** (zum Beispiel Intervalle → Noten lesen; Dreiklänge → große und kleine Terz). Die Startkarte nennt sie („Dafür brauchst du: …“) und bietet „Grundlagen wiederholen“ an: eine kurze Runde mit 6 Aufgaben aus genau diesen Grundlagen. Empfohlen wird sie, wenn eine Grundlage nie gespielt wurde, wieder dran ist oder zuletzt unter 8 von 10 lag, und nach einer Runde mit weniger als 5 Richtigen. Deuten Fehler auf eine Lücke (mindestens dreimal derselbe Denkschritt daneben), nennt die Ergebniskarte den Grund und die Stufe, in der man das übt. Nie Pflicht.
2. **Wiederholung über Tage** aus allem schon Geschafften: Wer eine Stufe ohne Hilfen mit 8 von 10 schafft, bekommt sie nach 1, 3, 7, 14 und 30 Tagen wieder (Karteikasten mit fünf Fächern). Was sitzt, rückt ein Fach weiter; was wackelt, kommt morgen noch einmal. Die Runde „Wiederholen“ hat 10 Aufgaben aus höchstens drei Stufen, gemischt, und steht auf der Startseite ganz oben (Karte „Heute“). Sie zählt für Tagesserie und Erfahrungspunkte wie eine normale Runde. Auch nach langer Pause zeigt die App nur die nächste Runde, keinen Berg an Versäumtem.
3. **Nichts Gelerntes wird je gesperrt.** Fällige Wiederholungen sind ein Angebot, keine Schranke; jede offene Stufe bleibt offen.

Warum so: Verteiltes Üben über Tage behält man besser als dieselbe Menge am Stück, und selbst abrufen (eine Aufgabe lösen) wirkt stärker als noch einmal ansehen. Ob wachsende Abstände gleichmäßigen überlegen sind, ist in der Forschung nicht eindeutig; sie sind aber sparsam (Sicheres kommt selten, Wackliges oft). Die Abstände und Rundenlängen sind Startwerte und werden nach dem Test mit Kindern nachgestellt.

## Jahrgang (Sandra, 24.11.2026; gebaut in Welle 11)

An den Stufen steht kein Jahrgang. Was in welchem Jahrgang „dran“ ist, richtet sich nach dem LehrplanPLUS (Gymnasium Bayern, Musik, Jahrgänge 5 bis 13; Voreinstellung für das Musische Gymnasium) und kommt **nur über einen Link der Lehrkraft** auf das Gerät, nicht über einen Schalter in der App. Die Lehrkraft erzeugt Link und QR-Code auf der Seite „Für Lehrkräfte“ (Adresse `…/notenlernapp/#lehrkraft`) und kann je Paket nachstellen, bis zu welcher Stufe es geht. Die Schülerinnen und Schüler bestätigen einmal. Der Link enthält nur den Jahrgang und die Auswahl der Stufen, keine Namen und keine Ergebnisse; nichts verlässt das Gerät.

Mit Jahrgang ordnet die Startseite in „Jetzt dran“, „Schon dran gewesen“ und „Darüber hinaus“. Alles bis „dran“ ist sofort offen, auch was auf diesem Gerät nie gespielt wurde: Eine Schülerin der 7. Klasse muss sich nicht durch „Noten lesen 1“ spielen, kann es aber jederzeit wiederholen. Der Jahrgang ordnet und öffnet, er sperrt nie etwas; Fortschritt, Sterne und Karteikasten bleiben, egal wie er gesetzt, geändert oder entfernt wird.

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
- Lehrkraft-Modus mit Klassen-Code und Auswertung (bräuchte einen Server; den Jahrgang setzt seit Welle 11 der Lehrkraft-Link ohne Server)
- Verpackung als Desktop-App, zum Beispiel mit Tauri
