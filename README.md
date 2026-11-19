# Racket lernen mit „Schreibe Dein Programm!“

**Zur Seite: <https://elreqanolo.github.io/racket-lernen/>**

Eine Lernhilfe für DrRacket mit der Sprachebene „Schreibe Dein Programm! – Anfänger“ und den Teachpacks `image.rkt` und `universe.rkt` – mit Erklärungen, Befehlssammlung, Glossar, Fehlermeldungen, 125 Übungen mit Online-Prüfung und einem Playground.

## Seiten

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite mit allen Kapiteln (Kachel anklicken öffnet die Links zum Kapitel) |
| `lernen.html` | Lernübersicht: beginnt mit „Erste Schritte“ für alle ohne Vorwissen (inkl. DrRacket-Installation), dann Erklärungen Kapitel für Kapitel; Fachwörter mit Kurzerklärung zum Antippen, „▶ Im Playground ausprobieren“ bei den Codebeispielen, Volltextsuche, Links zu den passenden Übungen |
| `befehle.html` | Befehlssammlung, filterbar nach Kapitel („nur“ oder „bis“ Kapitel) |
| `glossar.html` | Glossar A–Z, filterbar nach Kapitel |
| `fehler.html` | Fehlermeldungen und typische Fehler, nach Kapitel |
| `uebungen.html` | Übungen Kapitel für Kapitel: jede Aufgabe wird direkt abgegeben (Code-Editor, Auswahlfragen oder Eingabefelder) und bei richtiger Lösung automatisch abgehakt; gestufte Tipps, Link zur Lernübersicht, Musterlösung pro Aufgabe |
| `playground.html` | Racket-Code direkt im Browser ausführen, mit Bildern, Tests und Eingabezeile; Sprachebenen wie in DrRacket, Signaturprüfung, Stepper, Animationen mit `big-bang` und `universe`, Bilder aus Dateien, komplexe Zahlen, Tab-Vervollständigung und Fehlermarkierung beim Tippen |

## Ordnerstruktur

```
├── index.html, lernen.html, …    die veröffentlichten Seiten (von src/build.py erzeugt – nicht von Hand ändern)
├── assets/
│   ├── css/style.css             Gestaltung aller Seiten (hell/dunkel, Handy)
│   ├── js/                       JavaScript (wird direkt so ausgeliefert)
│   │   ├── app.js                Filter, Suche, Kapitelwahl, Fortschritt, Kopfzeile, Fachwort-Erklärungen
│   │   ├── racket.js             Racket-Interpreter für die Lehrsprachen (Sprachebenen, Signaturen, Bilder, Animationen)
│   │   ├── pruefer.js            prüft Abgaben gegen die Musterlösung (feste Tests + Zufallstests) und formuliert Hinweise
│   │   ├── uebungen.js           Abgabe, Auswahlfragen und Musterlösung auf der Übungsseite
│   │   ├── editor.js             Vorschläge, Tab-Vervollständigung und Fehlermarkierung beim Tippen
│   │   ├── stepper.js            Stepper: Auswertung Schritt für Schritt im Substitutionsmodell
│   │   └── playground.js         der Playground (Ausführen, Animationen, universe, Bilder, Stepper-Fenster)
│   ├── fonts/                    Schrift TeX Gyre Schola (Century Schoolbook; GUST Font License, liegt bei)
│   └── katex/                    Schrift und CSS für die Formeln der Lernübersicht (KaTeX, MIT-Lizenz)
├── src/                          Quellen: daraus entstehen die Seiten
│   ├── build.py                  Generator – erzeugt die sieben HTML-Seiten
│   ├── beginner.py               Einsteigerhilfen: „Ausprobieren“-Knöpfe, Fachwort-Erklärungen
│   ├── erste_schritte.py         Kapitel „Erste Schritte“ (mit DrRacket-Installation)
│   ├── check_try.js              entfernt „Ausprobieren“-Knöpfe, deren Code nicht läuft
│   ├── katex_render.js           rendert die Formeln beim Erstellen
│   └── inhalt/                   die Inhalte
│       ├── lernuebersicht.html   Erklärungen Kapitel für Kapitel
│       ├── uebungen.html         Aufgaben mit Musterlösungen
│       ├── befehle.html, glossar.html, fehlermeldungen.html
│       ├── tipps.py              Tipps zu allen 125 Aufgaben
│       └── aufgaben_extra.py     Auswahlfragen, Eingabefelder und Sonderregeln für die Prüfung
├── tests/                        automatische Tests (siehe unten)
├── package.json                  Befehle: npm run build, npm test, npm run test:browser
└── .nojekyll                     GitHub Pages liefert die Dateien unverändert aus
```

Die Seite ist rein statisch: kein Server, keine Datenbank, keine Cookies, kein Tracking. Fortschritt, Code und Antworten speichert nur der eigene Browser (`localStorage`). Sie funktioniert auch offline, wenn man `index.html` direkt öffnet.

## Gestaltung

Die Seite sieht aus wie ein **Rechenheft**: kariertes Papier, Schrift wie im Schulbuch (Century Schoolbook), Königsblau als Tinte für Links und Knöpfe, Rotstift für Fehler und den Heftrand, Textmarker-Gelb für das, was gerade wichtig ist – im Stepper zum Beispiel der Teil, der als Nächstes ausgerechnet wird. Im dunklen Modus wird daraus eine Schultafel. Bewegung gibt es nur, wo sie etwas zeigt: Auf der Startseite rechnet Racket einmal eine Aufgabe Zeile für Zeile vor, eine gelöste Aufgabe wird abgehakt, und im Stepper fährt der Textmarker über den neuen Schritt. Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, sieht alles ohne Animation.

## Ändern, erstellen, testen

- **Texte, Aufgaben oder Tipps ändern:** Dateien in `src/inhalt/` bearbeiten, dann `npm run build` (bzw. `python3 src/build.py`). Braucht Python 3, Node.js und das npm-Paket `katex` (`npm install`).
- **JavaScript oder CSS ändern:** direkt in `assets/` – danach trotzdem `npm run build`, damit die Seiten die neue Version laden (Versionsnummer `?v=…` gegen alte Browser-Caches).
- **Tests:** `npm test` prüft ohne Browser den Interpreter, die Online-Prüfung aller 125 Musterlösungen, die Fehlermarkierung, den Stepper, alle Codebeispiele und alle Links und Anker. `npm run test:browser` (braucht Playwright) prüft die Seiten im echten Browser am Computer und auf dem Handy: Laden ohne Fehler, Suche, alle Übungen richtig und falsch abgeben, Playground mit allen Beispielen, Stepper, Animationen, `universe` und Bild einfügen.

## So wird bei den Übungen geprüft

- **Programmieraufgaben:** Die `check-expect`-Tests der Musterlösung laufen gegen deine Funktionen. Dazu kommen Zufallstests: Deine Funktion und die Musterlösung bekommen dieselben Eingaben (passend zur Signatur, mit Grenzwerten aus dem Code). Deine eigenen Tests laufen mit.
- **Aufgaben ohne Programmieren:** Auswahlfragen oder Eingabefelder; bei Beweisen werden die entscheidenden Schritte abgefragt.
- **Rückmeldung:** Eingabe, erwartetes und tatsächliches Ergebnis und ein Hinweis, woran es liegen könnte (z. B. „Um genau 1 daneben – prüfe die Grenzen“). Bei Bildaufgaben werden die Bilder nebeneinander gezeigt.
- **Grenzen:** Beim Prüfen der Übungen werden Signaturen nicht geprüft und Animationen nicht gestartet; im Playground geht beides. Mehrere `universe`-Welten laufen im selben Browserfenster statt über das Netz. Der Interpreter ist ein Nachbau – im Zweifel gilt, was DrRacket sagt.

## Links mit Filter

- `befehle.html?kap=6&modus=bis` – alle Befehle bis Kapitel 6
- `glossar.html?kap=9` – Begriffe aus Kapitel 9
- `fehler.html?q=nicht definiert` – Suche nach einer Fehlermeldung
- `uebungen.html?kap=2&sterne=3` – schwere Aufgaben aus Kapitel 2

## Hinweis

Inoffizielle Lernhilfe zum Buch „Schreibe Dein Programm!“ von Michael Sperber und Herbert Klaeren (Tübingen University Press 2023, Open Access). Das Buch und sein Quelltext stehen unter der Lizenz CC BY-SA 4.0: <https://github.com/deinprogramm/schreibe-dein-programm>.
