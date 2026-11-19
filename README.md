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

## Technik

| Datei | Aufgabe |
|---|---|
| `assets/style.css` | Gestaltung aller Seiten (hell/dunkel, Handy) |
| `assets/app.js` | Filter, Suche, Kapitelwahl, Fortschritt, Dunkelmodus |
| `assets/racket.js` | kleiner Racket-Interpreter für die Lehrsprachen (Zahlen, Listen, Records, Bilder, Tests) |
| `assets/pruefer.js` | prüft Abgaben gegen die Musterlösung (feste Tests + Zufallstests) und formuliert Hinweise |
| `assets/uebungen.js` | Abgabe, Auswahlfragen und Musterlösung auf der Übungsseite |
| `assets/playground.js` | der Playground |
| `assets/stepper.js` | Stepper: Auswertung Schritt für Schritt im Substitutionsmodell |
| `assets/editor.js` | Editor-Hilfen: Tab-Vervollständigung und Fehlerprüfung beim Tippen (Klammern, unbekannte Namen, Anzahl der Angaben) |
| `assets/katex/` | Schrift und Formatierung für die mathematischen Formeln in der Lernübersicht ([KaTeX](https://katex.org), MIT-Lizenz) |
| `.nojekyll` | sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert |

Die Seite ist rein statisch: kein Server, keine Datenbank, kein Build-Schritt, keine Cookies, kein Tracking. Fortschritt, Code und Antworten speichert nur der eigene Browser (`localStorage`). Sie funktioniert auch offline, wenn man `index.html` direkt öffnet.

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
