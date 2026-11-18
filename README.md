# Racket lernen mit „Schreibe Dein Programm!“

Eine Lernhilfe für DrRacket mit der Sprachebene „Schreibe Dein Programm! – Anfänger“ und den Teachpacks `image.rkt` und `universe.rkt`.

| Seite | Inhalt |
|---|---|
| `index.html` | Startseite mit allen Kapiteln |
| `lernen.html` | Lernübersicht: Erklärungen Kapitel für Kapitel, mit Volltextsuche und Links zu den passenden Übungen |
| `befehle.html` | Befehlssammlung, filterbar nach Kapitel („nur“ oder „bis“ Kapitel) |
| `glossar.html` | Glossar A–Z, filterbar nach Kapitel |
| `fehler.html` | Fehlermeldungen und typische Fehler |
| `uebungen.html` | Übungen mit gestuften Tipps, Link zum passenden Abschnitt der Lernübersicht, aufklappbaren Lösungen, Häkchen, Schwierigkeitsfilter und Online-Prüfung der eigenen Lösung |

Die Seite ist rein statisch: kein Server, keine Datenbank, kein Build-Schritt. Sie funktioniert auch offline, wenn du `index.html` direkt im Browser öffnest.

## Online-Prüfung bei den Übungen

Bei den meisten Aufgaben gibt es den Knopf **„Lösung abgeben“**. Der Code wird direkt im Browser von einem kleinen Racket-Interpreter (`assets/racket.js`) ausgeführt – es wird nichts an einen Server geschickt.

Geprüft wird so (`assets/pruefer.js`):

1. Die `check-expect`-Tests der Musterlösung laufen gegen deine Funktionen.
2. Zufallstests: Deine Funktion und die Musterlösung bekommen dieselben zufälligen Eingaben (passend zur Signatur, mit Grenzwerten aus dem Code).
3. Deine eigenen Tests laufen mit.

Bei Fehlern zeigt die Seite die Eingabe, das erwartete und das tatsächliche Ergebnis und einen Hinweis, woran es liegen könnte (z. B. „Um genau 1 daneben – prüfe die Grenzen“). Bei Bildaufgaben werden die Bilder nebeneinander gezeigt.

Grenzen: Signaturen werden nicht geprüft, Animationen (`big-bang`) werden nicht gestartet, und Beweis- oder Erklärfragen kann der Prüfer nicht bewerten. Der Interpreter ist ein Nachbau – im Zweifel gilt, was DrRacket sagt.

## Auf GitHub Pages veröffentlichen

1. Auf github.com ein neues Repository anlegen, z. B. `racket-lernen` (Public).
2. **Add file → Upload files** und den **Inhalt** dieses Ordners hineinziehen (also `index.html`, `assets/` usw. direkt in die oberste Ebene, nicht den Ordner selbst). Mit **Commit changes** bestätigen.
3. **Settings → Pages**: unter *Build and deployment* bei *Source* „Deploy from a branch“ wählen, Branch `main` und Ordner `/ (root)`, dann **Save**.
4. Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://DEIN-NAME.github.io/racket-lernen/`

Die Datei `.nojekyll` sorgt dafür, dass GitHub die Dateien unverändert ausliefert. Sie ist versteckt – beim Hochladen per Browser bitte mit hochladen (oder einfach weglassen, es geht auch ohne).

## Links mit Filter

Filter lassen sich direkt verlinken, z. B.

- `befehle.html?kap=6&modus=bis` – alle Befehle bis Kapitel 6
- `glossar.html?kap=9` – Begriffe aus Kapitel 9
- `fehler.html?q=nicht definiert` – Suche nach einer Fehlermeldung
- `uebungen.html?kap=2&sterne=3` – schwere Aufgaben aus Kapitel 2

## Hinweis

Inoffizielle Lernhilfe zum Buch „Schreibe Dein Programm!“ von Michael Sperber und Herbert Klaeren. Das Buch und sein Quelltext stehen unter CC BY-SA 4.0 (<https://github.com/deinprogramm/schreibe-dein-programm>). Die Beispiele sind nicht alle in DrRacket getestet.
