# Tipps zu den Übungen: Aufgaben-ID -> (Abschnitt in der Lernübersicht, [Tipp 1, Tipp 2, ...])
# Wird von build.py gelesen (Kapitel 1–15).
H = {}
# Hilfen zu den Übungen, Kapitel 1–5: Aufgaben-ID -> (Abschnitt in der Lernübersicht, [Tipp 1, Tipp 2, ...])
H.update({
# ---------------- Kapitel 1
"k1-A1": ("kapitel-1-1-2-ausdruecke-und-zahlen", [
  "In Racket steht der Operator immer vorne in der Klammer: aus 2 · 3 wird (* 2 3).",
  "Übersetze von innen nach außen: Was in der Mathe-Schreibweise in Klammern steht oder Punkt-vor-Strich hat, wird eine eigene innere Klammer. 23/44 ist (/ 23 44)."]),
"k1-A2": ("kapitel-1-1-2-ausdruecke-und-zahlen", [
  "Racket rechnet immer die innerste Klammer zuerst aus.",
  "Ersetze (- 5 2) durch sein Ergebnis und rechne dann den äußeren Ausdruck aus."]),
"k1-A3": ("kapitel-1-1-3-definitionen-und-variablen", [
  "Mit (define name wert) gibst du einem Wert einen Namen. Danach kannst du den Namen statt der Zahl benutzen.",
  "Fläche = Breite · Höhe, Umfang = 2 · (Breite + Höhe). Schreibe beide Rechnungen mit breite und höhe statt mit 7 und 4."]),
"k1-B1": ("kapitel-1-1-4-rechnen-ohne-zahlen-zeichenketten", [
  "string-append hängt beliebig viele Zeichenketten aneinander.",
  "Das Leerzeichen ist selbst eine Zeichenkette: \" \". Es kommt als eigenes Argument zwischen Vor- und Nachname."]),
"k1-B2": ("kapitel-1-1-4-rechnen-ohne-zahlen-zeichenketten", [
  "Leerzeichen und Satzzeichen zählen auch als Zeichen.",
  "Schreibe (string-length …) mit dem Text in Anführungszeichen als Argument."]),
"k1-B3": ("kapitel-1-1-4-rechnen-ohne-zahlen-zeichenketten", [
  "string-append braucht lauter Zeichenketten – alter ist aber eine Zahl.",
  "Wandle die Zahl mit number->string um und achte auf die Leerzeichen in \"Ich bin \" und \" Jahre alt\"."]),
"k1-B4": ("kapitel-1-1-4-rechnen-ohne-zahlen-zeichenketten", [
  "Frage dich bei jedem Ausdruck: Welche Sorte erwartet der Operator – Zahl oder Zeichenkette – und welche bekommt er?",
  "\"23\" mit Anführungszeichen ist Text, 23 ohne ist eine Zahl."]),
"k1-C1": ("kapitel-1-1-4-rechnen-ohne-zahlen-bilder-erzeugen", [
  "Ändere immer nur eine Zahl und schau, was sich am Bild verändert.",
  "Vergleiche (square 40 …) mit (circle 40 …): Ist der Kreis gleich groß? Was misst die Zahl beim Kreis?"]),
"k1-C2": ("kapitel-1-1-4-rechnen-ohne-zahlen-bilder-kombinieren", [
  "Dach und Haus stehen übereinander – dafür gibt es above.",
  "Nimm für Dreieck und Quadrat dieselbe Seitenlänge, damit das Dach genau passt. Das erste Argument von above liegt oben."]),
"k1-C3": ("kapitel-1-1-4-rechnen-ohne-zahlen-bilder-kombinieren", [
  "above nimmt auch mehr als zwei Bilder.",
  "Drei Kreise mit gleichem Radius, Modus \"solid\", Farben \"red\", \"yellow\", \"green\" – in dieser Reihenfolge von oben nach unten."]),
"k1-C4": ("kapitel-1-1-4-rechnen-ohne-zahlen-bilder-kombinieren", [
  "Für den Umriss nimmst du den Modus \"outline\".",
  "Oben der kleinste Kreis, unten der größte – alles mit above."]),
"k1-C5": ("kapitel-1-1-4-rechnen-ohne-zahlen-bilder-erzeugen", [
  "Die Argumente sind: Seitenlänge, Anzahl Ecken, Schrittweite, Modus, Farbe.",
  "Stell dir 7 Punkte auf einem Kreis vor: Schrittweite k heißt „verbinde jeden Punkt mit dem k-ten nächsten“."]),
"k1-C6": ("kapitel-1-1-5-abstraktion-und-applikation-lambda-und-tile", [
  "Was bedeuten Klammern in Racket immer?",
  "(s1) heißt „wende s1 als Funktion an“. Ist s1 eine Funktion?"]),
"k1-D1": ("kapitel-1-1-5-abstraktion-und-applikation-lambda-und-tile", [
  "Schreibe (tile s1 p1) ins Definitionsfenster und klicke oben auf „Stepper“.",
  "Achte darauf, wie im Rumpf von tile a und b durch die Argumente ersetzt werden (Substitution)."]),
"k1-D2": ("kapitel-1-1-5-abstraktion-und-applikation-lambda-und-tile", [
  "Was für ein Wert kommt bei (tile s1 p1) heraus?",
  "tile erwartet zwei Bilder. Wenn tile selbst ein Bild liefert, darfst du das Ergebnis wieder hineingeben."]),
"k1-D3": ("kapitel-1-1-5-abstraktion-und-applikation-lambda-und-tile", [
  "Die Funktion hat einen Parameter – das Bild.",
  "Gerüst: (define nebeneinander-drei (lambda (bild) …)). Im Rumpf setzt beside das Bild dreimal nebeneinander."]),
"k1-D4": ("kapitel-1-1-5-abstraktion-und-applikation-lambda-und-tile", [
  "Nimm dein Haus aus C2 und ersetze die festen Werte durch Parameter.",
  "Zwei Parameter: (lambda (größe farbe) …). Überall, wo vorher 100 stand, steht jetzt größe."]),
"k1-D5": ("kapitel-1-1-5-abstraktion-und-applikation-lambda-und-tile", [
  "Der Name ist ein Parameter, der Rest des Textes ist fest.",
  "Im Rumpf: string-append aus \"Hallo, \", dem Namen und \"!\"."]),
"k1-D6": ("kapitel-1-1-5-abstraktion-und-applikation-lambda-und-tile", [
  "Schau dir den Rumpf von tile an: Unten steht (beside b a). Was musst du für tile-gespiegelt ändern?",
  "Für vier-kacheln: Benutze tile als Baustein – einmal (tile a b), einmal (tile b a) und dann beides wieder mit tile zusammen."]),
"k1-E1": ("kapitel-1-1-9-signatur", [
  "Eine Kurzbeschreibung ist ein Satz als Kommentar: ; Fläche eines Kreises berechnen.",
  "Signatur: (: name (eingabe-sorte -> ausgabe-sorte)). Überlege bei jeder Ein- und Ausgabe: Zahl (welche Art?), Zeichenkette oder Bild?"]),
"k1-E2": ("kapitel-1-1-11-konstruktionsanleitungen", [
  "Gehe die Schritte der Konstruktionsanleitung durch: Kurzbeschreibung, Signatur, Tests, Gerüst, Rumpf.",
  "Rechne die Tests erst von Hand aus: 0 °C = 32 °F, 100 °C = 212 °F, −40 °C = −40 °F. 9/5 kannst du direkt als Bruch schreiben."]),
"k1-E3": ("kapitel-1-1-10-tests", [
  "Ein Test hat die Form (check-expect ausdruck erwartetes-ergebnis).",
  "Bei Bildern ist das erwartete Ergebnis selbst ein Bild – schreib hin, was tile laut Rumpf daraus macht, z. B. mit above und beside."]),
"k1-E4": ("kapitel-1-1-11-konstruktionsanleitungen", [
  "Brutto = Netto + Netto · Satz/100.",
  "Zwei Parameter: (lambda (netto satz) …). Rechne die Testwerte vorher aus: 100 € mit 19 % sind 119 €."]),
"k1-E5": ("kapitel-1-1-12-die-macht-der-abstraktion", [
  "Schreib zuerst tarif-a und tarif-b einzeln und vergleiche sie: Was ist gleich, was ist verschieden?",
  "Alles, was sich unterscheidet (Grundgebühr, Preis pro Minute), wird ein zusätzlicher Parameter von handy-rechnung."]),
"k1-E6": ("kapitel-1-1-9-signatur", [
  "Die eingebauten Zahlsorten: natural ⊂ integer ⊂ rational ⊂ real.",
  "Frage jeweils: Kann der Wert negativ sein? Hat er Nachkommastellen? Ist er überhaupt als Bruch darstellbar?"]),
"k1-E7": ("kapitel-1-1-10-tests", [
  "Ändere nur eine Zahl im Rumpf und drücke Start.",
  "Die Meldung nennt den tatsächlichen und den erwarteten Wert. Um wie viel unterscheiden sie sich – und warum?"]),
# ---------------- Kapitel 2
"k2-F1": ("kapitel-2-2-1-boolesche-werte", [
  "Mach dir eine Tabelle mit allen vier Fällen für a und b.",
  "„Genau einer“ heißt: mindestens einer (or) – aber nicht beide (not und and)."]),
"k2-F2": ("kapitel-2-2-2-verzweigungen-mit-cond", [
  "Drei Fälle – also ein cond mit drei Zweigen.",
  "Bedingungen (> x 0) und (< x 0); der letzte Fall kann else sein."]),
"k2-F3": ("kapitel-2-2-8-binaere-verzweigungen-mit-if", [
  "if hat drei Teile: Bedingung, Ergebnis bei #t, Ergebnis bei #f.",
  "Bei negativen Zahlen ist das Ergebnis (- x), sonst x selbst."]),
"k2-F4": ("kapitel-2-2-4-aufzaehlungen", [
  "Eine Aufzählung definierst du mit (define wochentag (signature (enum \"Montag\" …))).",
  "Zeichenketten vergleichst du mit string=?. Die Funktion liefert #t, wenn der Tag \"Samstag\" oder \"Sonntag\" ist."]),
"k2-F5": ("kapitel-2-2-5-zahlenbereiche", [
  "cond prüft die Zweige von oben nach unten – der erste passende gewinnt.",
  "Fang mit der höchsten Grenze an: ((>= p 92) 1), dann 81, 67 … Teste jede Grenze und die Zahl direkt darunter."]),
"k2-F6": ("kapitel-2-2-5-zahlenbereiche", [
  "„Unter 5.000“ heißt (< umsatz 5000) – 5000 selbst gehört schon zur nächsten Stufe.",
  "Prüfe die Grenzen von unten nach oben; der letzte Zweig „Schwarz“ kann else sein."]),
"k2-F7": ("kapitel-2-2-9-syntaktischer-zucker", [
  "„Teilbar durch 4“ heißt: (= (remainder j 4) 0).",
  "Die Regel als Formel: (durch 400 teilbar) oder (durch 4 teilbar und nicht durch 100 teilbar). Teste 2024, 2023, 1900 und 2000."]),
"k2-F8": ("kapitel-2-2-10-unsinnige-daten-abfangen", [
  "„Bis 1 kg“ heißt einschließlich: (<= kg 1).",
  "Der letzte Zweig ist (else (violation \"zu schwer\")). Mit (check-error (versandkosten 21)) testest du ihn."]),
"k2-F9": ("kapitel-2-2-8-binaere-verzweigungen-mit-if", [
  "Schau dir cute? in der Übersicht an: Welche Tiere sind „cute“?",
  "Mit (or (string=? p \"Katze\") (string=? p \"Hund\")) hast du schon einen Wahrheitswert – den kannst du in ein if stecken oder direkt zurückgeben."]),
# ---------------- Kapitel 3
"k3-Z1": ("kapitel-3-3-2-zusammengesetzte-daten-selbst-konstruieren-die-uhrzeit", [
  "Record-Definition: (define-record punkt make-punkt punkt? (punkt-x real) (punkt-y real)).",
  "Das Ergebnis ist ein neuer Punkt: (make-punkt (+ (punkt-x p) dx) …). Einen Record „ändert“ man nicht, man baut einen neuen."]),
"k3-Z2": ("kapitel-3-3-3-konstruktionsanleitungen-fuer-zusammengesetzte-daten", [
  "Zuerst die Record-Definition mit zwei Feldern, dann zwei Funktionen.",
  "Bei rechteck als Eingabe: Schreib zuerst (rechteck-breite r) und (rechteck-höhe r) in den Rumpf (Schablone). quadrat? vergleicht die beiden mit =."]),
"k3-Z3": ("kapitel-3-3-2-zusammengesetzte-daten-selbst-konstruieren-die-uhrzeit", [
  "Zwei Uhrzeiten kann man leichter vergleichen, wenn man beide in Minuten seit Mitternacht umrechnet.",
  "Stunde · 60 + Minute – dann reicht ein >. Denk an den Test mit zwei gleichen Uhrzeiten."]),
"k3-Z4": ("kapitel-3-3-2-zusammengesetzte-daten-selbst-konstruieren-die-uhrzeit", [
  "Rechne die Uhrzeit in Minuten seit Mitternacht um, addiere n und rechne zurück.",
  "Ein Tag hat 1440 Minuten. remainder sorgt für den Überlauf nach Mitternacht, quotient und remainder durch 60 liefern Stunde und Minute."]),
"k3-Z5": ("kapitel-3-3-1-computer-konfigurieren", [
  "Schau in der Übersicht nach, welche Felder der Record computer hat und wie die Selektoren heißen.",
  "Ein cond mit drei Zweigen; im ersten müssen RAM und Festplatte beide passen (and). Achte auf „mindestens“: >=."]),
"k3-Z6": ("kapitel-3-3-4-ein-und-ausgabe-zusammengesetzter-daten-guerteltiere", [
  "Zwei Fälle: Das Gürteltier lebt – oder nicht. Tote Gürteltiere bleiben unverändert.",
  "Neues Gewicht: (max 20000 (- gewicht 1000)). Das Ergebnis ist ein neues Gürteltier mit make-dillo."]),
"k3-Z7": ("kapitel-3-3-3-konstruktionsanleitungen-fuer-zusammengesetzte-daten", [
  "Mal: Zähler mal Zähler, Nenner mal Nenner.",
  "Plus ohne Kürzen: a/b + c/d = (a·d + c·b) / (b·d). Baue das Ergebnis mit make-bruch."]),
"k3-Z8": ("kapitel-3-3-5-alternativen-bei-den-konstruktionsanleitungen", [
  "Zeichne zwei Termine als Strecken auf einem Zeitstrahl. Wann überschneiden sie sich nicht?",
  "Sie überschneiden sich, wenn der erste anfängt, bevor der zweite endet, und der zweite anfängt, bevor der erste endet. Hilfsfunktion: Uhrzeit in Minuten."]),
# ---------------- Kapitel 4
"k4-G1": ("kapitel-4-4-1-gemischte-daten-tiere", [
  "Für jede Record-Sorte gibt es schon ein Prädikat: dillo? und parrot?.",
  "Kombiniere die beiden mit or."]),
"k4-G2": ("kapitel-4-4-2-gemischte-daten-als-ausgabe", [
  "Gemischte Daten: ein cond mit einem Zweig pro Sorte, Bedingung ist das Prädikat.",
  "Im dillo?-Zweig baust du ein neues Gürteltier mit #f, im parrot?-Zweig einen Papagei mit dem Satz \"\"."]),
"k4-G3": ("kapitel-4-4-1-gemischte-daten-tiere", [
  "Zwei Sorten – zwei Zweige im cond.",
  "Im parrot?-Zweig holst du den Satz mit dem Selektor parrot-sentence."]),
"k4-G4": ("kapitel-4-4-1-gemischte-daten-tiere", [
  "Erst drei define-record, dann (define form (signature (mixed kreis rechteck dreieck))).",
  "fläche: ein cond mit kreis?, rechteck?, dreieck?. Kreis: π · r² (nimm 3.14159), Dreieck: Grundseite · Höhe / 2."]),
"k4-G5": ("kapitel-4-4-1-gemischte-daten-tiere", [
  "Benutze deine Funktion fläche aus G4 – du musst die Fälle nicht noch einmal unterscheiden.",
  "Berechne beide Flächen einmal (lokale Definitionen) und vergleiche dann mit =, < und >."]),
"k4-G6": ("kapitel-4-4-4-fehler-repraesentieren", [
  "Das Ergebnis ist gemischt: entweder eine Zahl oder ein Record fehler.",
  "sicher-teilen: if b gleich 0, dann make-fehler, sonst (/ a b). ergebnis->string: ein cond mit fehler? und number?."]),
"k4-G7": ("kapitel-4-4-3-die-lebensmittelampel", [
  "Drei Records mit je einem Feld, gemischt zu verstoß. bußgeld braucht einen Zweig pro Sorte.",
  "In jedem Zweig noch einmal eine Fallunterscheidung (if) für die Grenzen. Teste genau 60 Minuten und knapp unter 1 Sekunde."]),
# ---------------- Kapitel 5
"k5-S1": ("kapitel-5-5-1-fluesse-abbilden", [
  "Ein Fluss ist ein Bach (creek) oder ein Zusammenfluss (confluence) aus zwei Flüssen – ein Selbstbezug.",
  "Bach: 0. Zusammenfluss: 1 plus die Zusammenflüsse von Hauptfluss und Nebenfluss (zwei rekursive Aufrufe)."]),
"k5-S2": ("kapitel-5-5-1-fluesse-abbilden", [
  "Beim Bach ist das Ergebnis einfach sein Quellort (creek-origin).",
  "Beim Zusammenfluss: die Quellnamen beider Teilflüsse mit string-append und \", \" dazwischen verbinden."]),
"k5-S3": ("kapitel-5-5-1-fluesse-abbilden", [
  "Ein Bach hat Tiefe 1.",
  "Zusammenfluss: 1 plus die größere der beiden Tiefen – dafür gibt es max."]),
"k5-S4": ("kapitel-5-5-3-finanzvertraege-abbilden", [
  "Ein neuer Fall in den Daten heißt: neuer Record give, neue Sorte in der mixed-Signatur und ein neuer Zweig in contract-payment.",
  "Der neue Zweig ruft contract-payment für den inneren Vertrag auf und dreht das Vorzeichen um."]),
"k5-S5": ("kapitel-5-5-3-finanzvertraege-abbilden", [
  "Ein Smart Constructor sieht aus wie ein Konstruktor, prüft aber vorher Sonderfälle.",
  "if mit (or (= n 0) (nothing? c)): dann (make-nothing), sonst (make-multiple n c)."]),
"k5-S6": ("kapitel-5-5-2-bilder-modellieren", [
  "Seife und Shampoo sind Records ohne Felder, die Mischung hat zwei Felder – beide wieder Produkte (Selbstbezug).",
  "seifen-anteil: Seife 1, Shampoo 0, Mischung: Durchschnitt der beiden Anteile – zwei rekursive Aufrufe, dann durch 2."]),
})
# Hilfen zu den Übungen, Kapitel 6–10
H.update({
# ---------------- Kapitel 6
"k6-L1": ("kapitel-6-6-3-konstruktionsanleitung-fuer-listen", [
  "Listenschablone: ein cond mit (empty? list) und (cons? list); im cons?-Fall stehen (first list) und der rekursive Aufruf mit (rest list).",
  "Für den empty-Fall: Welche Zahl verändert ein Produkt nicht, wenn man mit ihr malnimmt? Das ist das Ergebnis für die leere Liste."]),
"k6-L2": ("kapitel-6-6-3-konstruktionsanleitung-fuer-listen", [
  "Leere Liste: keine Nullen, also 0.",
  "Im cons?-Fall: Ist (first list) gleich 0, zählst du 1 zum Ergebnis für den Rest dazu – sonst nimmst du das Ergebnis für den Rest unverändert."]),
"k6-L3": ("kapitel-6-6-3-konstruktionsanleitung-fuer-listen", [
  "Die leere Liste enthält keine Zahl > 10 – also #f.",
  "Im cons?-Fall: Das erste Element ist > 10 oder der Rest enthält eine solche Zahl – verbinde die beiden mit or."]),
"k6-L4": ("kapitel-6-6-6-funktionen-die-listen-produzieren", [
  "Das Ergebnis ist eine Liste – im empty-Fall also empty.",
  "Im cons?-Fall baust du mit cons eine neue Liste: vorne das verdoppelte erste Element, hinten das Ergebnis des rekursiven Aufrufs."]),
"k6-L5": ("kapitel-6-6-8-funktionen-auf-nichtleeren-listen", [
  "Bei nichtleeren Listen ist der Basisfall eine Liste mit genau einem Element: (empty? (rest list)).",
  "Berechne den längsten String im Rest einmal (lokale Definition) und vergleiche dessen Länge mit der von (first list)."]),
"k6-L6": ("kapitel-6-6-8-funktionen-auf-nichtleeren-listen", [
  "Basisfall: Die Liste hat nur noch ein Element – dann ist das das letzte.",
  "Sonst ist das letzte Element der ganzen Liste dasselbe wie das letzte Element des Rests."]),
"k6-L7": ("kapitel-6-6-7-minimum-einer-liste-und-lokale-variablen", [
  "delete-once: Ist das erste Element die gesuchte Zahl, ist das Ergebnis einfach der Rest. Sonst bleibt das erste Element vorne und du suchst im Rest weiter.",
  "sort-numbers: Bestimme das Minimum m mit list-min-nonempty, dann (cons m (sort-numbers (delete-once m list))). Die leere Liste ist schon sortiert."]),
# ---------------- Kapitel 7
"k7-N1": ("kapitel-7-7-1-zahlen-die-zaehlen", [
  "Schablone für natürliche Zahlen: cond mit (zero? n) und (positive? n); im zweiten Fall der rekursive Aufruf mit (- n 1).",
  "0! = 1 ist der Basisfall. Sonst gilt n! = n · (n−1)!."]),
"k7-N2": ("kapitel-7-7-1-zahlen-die-zaehlen", [
  "Basisfall: Die Summe bis 0 ist 0.",
  "Die Summe bis n ist n plus die Summe bis n−1. Vergleiche ein paar Ergebnisse mit n(n+1)/2."]),
"k7-N3": ("kapitel-7-7-1-zahlen-die-zaehlen", [
  "Rekursion über die Zahl n, nicht über den String.",
  "0-mal wiederholt ist die leere Zeichenkette \"\". Sonst: s vorne anhängen an (repeat-string s (- n 1))."]),
"k7-N4": ("kapitel-7-7-2-natuerliche-zahlen-und-listen", [
  "Die Rekursion läuft über n – und gleichzeitig wird die Liste kürzer.",
  "take: Bei n = 0 ist das Ergebnis empty, sonst (cons (first list) (take (rest list) (- n 1))). drop: Bei n = 0 die ganze Liste, sonst drop vom Rest."]),
"k7-N5": ("kapitel-7-7-3-andersrum-zaehlen", [
  "Hier zählst du nicht bis 0 herunter, sondern bis from.",
  "Wenn from = to, ist das Ergebnis (list from). Sonst kommt to nach vorne und dahinter (between-down from (- to 1))."]),
"k7-N6": ("kapitel-7-7-2-natuerliche-zahlen-und-listen", [
  "Zerlege die Aufgabe: Erst mit between alle Zahlen von a bis b erzeugen, dann die geraden heraussuchen.",
  "Schreibe dafür eine Hilfsfunktion nach der Listenschablone, die nur Elemente behält, für die even? gilt."]),
"k7-N7": ("kapitel-7-7-1-zahlen-die-zaehlen", [
  "Du brauchst zwei Basisfälle: n = 0 und n = 1.",
  "Für n ≥ 2: (+ (fibonacci (- n 1)) (fibonacci (- n 2))). Zähle im Kopf, wie oft (fibonacci 2) bei (fibonacci 6) berechnet wird."]),
# ---------------- Kapitel 8
"k8-I1": ("kapitel-8-8-2-aussagen-ueber-natuerliche-zahlen", [
  "Rechne für jedes n beide Seiten getrennt aus.",
  "Beispiel n = 3: links 0 + 1 + 2 + 3, rechts 3 · 4 / 2."]),
"k8-I2": ("kapitel-8-8-3-induktive-beweise-fuehren", [
  "Induktionsanfang: n = 0 (leere Summe) oder n = 1.",
  "Im Schluss: Die Summe für n + 1 ist die Summe für n plus die nächste ungerade Zahl 2(n+1) − 1. Setze die Induktionsvoraussetzung n² ein und vereinfache zu (n+1)²."]),
"k8-I3": ("kapitel-8-8-3-induktive-beweise-fuehren", [
  "Gleiches Vorgehen wie bei der Gauß-Formel: Anfang n = 0, dann von n auf n + 1.",
  "Schreibe die Summe für n + 1 als Summe für n plus (n+1)². Setze die Voraussetzung ein, klammere (n+1)/6 aus und forme zu (n+1)(n+2)(2n+3)/6 um."]),
"k8-I4": ("kapitel-8-8-3-induktive-beweise-fuehren", [
  "Ein Induktionsschluss muss für jedes n funktionieren – probiere den kleinsten Fall n = 1 → n + 1 = 2 aus.",
  "Bei zwei Pferden: Haben die Gruppe „ohne das erste“ und die Gruppe „ohne das letzte“ überhaupt ein gemeinsames Pferd?"]),
"k8-I5": ("kapitel-8-8-5-endliche-folgen", [
  "Folgeninduktion: Anfang mit der leeren Folge ε, Schluss von u auf eine Folge mit einem Element mehr vorne.",
  "Benutze die Definition von cat für diesen Fall und setze dann die Induktionsvoraussetzung für u ein."]),
"k8-I6": ("kapitel-8-8-7-strukturelle-rekursion", [
  "Strukturelle Rekursion: ein Fall pro Regel der Grammatik – #t/#f, und, oder, nicht.",
  "und wird zu oder (mit vertauschten Teilausdrücken), oder zu und, nicht bleibt nicht – in jedem Fall rekursiv in die Teilausdrücke."]),
# ---------------- Kapitel 9
"k9-H1": ("kapitel-9-9-2-higher-order-funktionen-auf-listen-filtern", [
  "filter bekommt ein Prädikat und eine Liste – in dieser Reihenfolge.",
  "even? ist schon ein passendes Prädikat. Ohne Klammern übergeben: even?, nicht (even?)."]),
"k9-H2": ("kapitel-9-9-3-listen-umwandeln-map", [
  "map wendet eine Funktion auf jedes Element an.",
  "Die Funktion schreibst du direkt hin: (lambda (x) (* x x))."]),
"k9-H3": ("kapitel-9-9-2-higher-order-funktionen-auf-listen-filtern", [
  "Das ist ein Fall für filter mit einem selbst geschriebenen Prädikat.",
  "Das Prädikat: (lambda (s) (> (string-length s) 3)). Achte auf „länger als 3“ – genau 3 Zeichen gehört nicht dazu."]),
"k9-H4": ("kapitel-9-9-4-listen-zusammenfalten-fold", [
  "fold bekommt den Basiswert, eine Funktion mit zwei Parametern (Element, Zwischenergebnis) und die Liste.",
  "Summe: Basis 0 und +. Produkt: Basis 1 und *. Länge: Basis 0 und eine Funktion, die das Element ignoriert und 1 addiert."]),
"k9-H5": ("kapitel-9-9-4-listen-zusammenfalten-fold", [
  "Was ist das Ergebnis für die leere Liste? Gilt ein Prädikat für „alle“ Elemente einer leeren Liste?",
  "every?: Basis #t, verknüpft mit and. any?: Basis #f, verknüpft mit or. Die Funktion für fold: (lambda (x acc) …)."]),
"k9-H6": ("kapitel-9-9-5-schoenfinkeln-currying", [
  "compose liefert eine Funktion – der Rumpf ist also selbst ein lambda.",
  "(lambda (f g) (lambda (x) …)) – innen wird erst g, dann f angewendet."]),
"k9-H7": ("kapitel-9-9-3-listen-umwandeln-map", [
  "Mit Schablone: wie double-all, nur dass statt „verdoppeln“ die Funktion f angewendet wird.",
  "Mit fold: Basis empty, und die Verknüpfung hängt (f x) vorne an das Zwischenergebnis: (lambda (x acc) (cons (f x) acc))."]),
"k9-H8": ("kapitel-9-9-5-schoenfinkeln-currying", [
  "curry3 macht aus einer Funktion mit drei Parametern drei ineinander geschachtelte Funktionen mit je einem Parameter.",
  "curry3: (lambda (f) (lambda (a) (lambda (b) (lambda (c) …)))). uncurry3 macht es rückgängig: (((f a) b) c)."]),
"k9-H9": ("kapitel-9-9-6-lexikalische-bindung", [
  "Welches y meint der innere Rumpf (+ x y) – das aus dem define oder den Parameter des inneren lambda?",
  "Lexikalische Bindung: Es gilt immer die nächste umschließende Bindung im Programmtext."]),
# ---------------- Kapitel 10
"k10-A1": ("kapitel-10-10-2-schablonen-fuer-funktionen-mit-akkumulator", [
  "Schablone: eine lokale Hilfsfunktion accumulate mit den Parametern (list acc); am Ende (accumulate list0 startwert).",
  "Startwert ist 1. In jedem Schritt wird acc mit (first list) multipliziert; im empty-Fall ist acc schon das Ergebnis."]),
"k10-A2": ("kapitel-10-10-2-schablonen-fuer-funktionen-mit-akkumulator", [
  "Der Akkumulator zählt die schon gesehenen Elemente.",
  "Startwert 0, in jedem Schritt (+ count 1), im empty-Fall count zurückgeben."]),
"k10-A3": ("kapitel-10-10-3-ueber-natuerliche-zahlen-akkumulieren", [
  "Wie bei Listen, nur über n: accumulate bekommt (n acc), der rekursive Aufruf geht mit (- n 1).",
  "Startwert 1. In jedem Schritt (* n acc); bei (zero? n) ist acc das Ergebnis."]),
"k10-A4": ("kapitel-10-10-2-schablonen-fuer-funktionen-mit-akkumulator", [
  "Der Akkumulator ist „das größte Element bisher“.",
  "Starte mit (accumulate (rest list0) (first list0)) und nimm in jedem Schritt (max (first list) m)."]),
"k10-A5": ("kapitel-10-10-6-das-phaenomen-der-umgedrehten-liste", [
  "Ein Akkumulator, der mit cons aufgebaut wird, dreht die Liste automatisch um.",
  "Startwert empty, in jedem Schritt (cons (first list) acc)."]),
"k10-A6": ("kapitel-10-10-6-das-phaenomen-der-umgedrehten-liste", [
  "Du brauchst zwei Akkumulatoren: die bisherige Summe und die bisher erzeugten Teilsummen.",
  "Die Teilsummen werden mit cons gesammelt und sind deshalb verkehrt herum – am Ende einmal reverse."]),
"k10-A7": ("kapitel-10-10-3-ueber-natuerliche-zahlen-akkumulieren", [
  "Merke dir immer zwei aufeinanderfolgende Fibonacci-Zahlen a und b.",
  "Start mit a = 0, b = 1. Ein Schritt macht aus (a, b) das Paar (b, a + b). Nach n Schritten ist a das Ergebnis."]),
"k10-A8": ("kapitel-10-10-5-kontext-und-endrekursion", [
  "Ein Endaufruf ist ein Aufruf, nach dem nichts mehr zu tun ist.",
  "Frage bei jedem Fall: Wird mit dem Ergebnis von p danach noch gerechnet (z. B. + oder cons)?"]),
})
# Hilfen zu den Übungen, Kapitel 11–15
H.update({
# ---------------- Kapitel 11
"k11-V1": ("kapitel-11-11-5-bewegte-bilder-mit-universe-rkt", [
  "Trenne Modell und Ansicht: Die Welt ist nur eine Zahl (y). Eine Funktion berechnet die nächste Welt, eine andere zeichnet sie.",
  "Nächste Welt: y plus ein paar Pixel, aber nie tiefer als der Boden – dafür eignet sich min. Getestet wird die Funktion fall."]),
"k11-V2": ("kapitel-11-11-9-reaktive-animation-mit-big-bang", [
  "Die Welt ist ein Record aus Position x und Geschwindigkeit dx. Die Tick-Funktion heißt bewege.",
  "Berechne erst die neue Position. Liegt sie außerhalb von 0 … BREITE, dreht sich die Richtung um (dx wird −dx) und der Ball bleibt an der alten Position."]),
"k11-V3": ("kapitel-11-11-9-reaktive-animation-mit-big-bang", [
  "Die Welt ist eine Ampelfarbe – eine Aufzählung mit drei Werten.",
  "nächste-farbe ist ein cond mit drei Zweigen. Die Tastenfunktion ruft nächste-farbe nur bei \" \" (Leertaste) auf, sonst bleibt die Welt gleich."]),
"k11-V4": ("kapitel-11-11-9-reaktive-animation-mit-big-bang", [
  "Die Maus-Funktion bekommt Welt, x, y und die Art des Ereignisses.",
  "Nur bei \"button-down\" wird die Welt zu (make-punkt x y); bei allen anderen Ereignissen bleibt sie, wie sie ist."]),
"k11-V5": ("kapitel-11-11-7-die-welt-ein-highway", [
  "Die Welt ist ein Record mit allem, was sich ändert: x der Figur, x und y des Steins.",
  "Schreibe einzelne Funktionen und teste sie für sich: tick (Stein fällt, unten neu oben), Tasten (Figur nach links/rechts), getroffen? (für stop-when)."]),
# ---------------- Kapitel 12
"k12-B1": ("kapitel-12-12-2-binaerbaeume", [
  "Ein Baum ist ein Blatt (#f) oder ein Knoten mit Markierung und zwei Teilbäumen.",
  "Blatt: 0. Knoten: Markierung plus die Summen beider Teilbäume – zwei rekursive Aufrufe."]),
"k12-B2": ("kapitel-12-12-2-binaerbaeume", [
  "Gleiche Schablone wie bei tree-sum.",
  "Jeder Knoten zählt 1, dazu die Knoten links und rechts. Ein Blatt hat 0 Knoten."]),
"k12-B3": ("kapitel-12-12-3-baeume-fuers-suchen", [
  "Blatt: leere Liste. Knoten: erst die Liste des linken Teilbaums, dann die Markierung, dann die Liste des rechten.",
  "Zum Aneinanderhängen von Listen gibt es append; die Markierung allein ist (list (node-label t))."]),
"k12-B4": ("kapitel-12-12-4-sortierte-baeume-herstellen", [
  "tree-insert fügt eine Zahl in einen Baum ein – das passt genau zur Funktion, die fold braucht (Element, Zwischenergebnis).",
  "Basiswert ist der leere Baum #f: (fold #f tree-insert l)."]),
"k12-B5": ("kapitel-12-12-1-stammbaeume", [
  "Schau dir ancestor? an: Wo wird geprüft, ob der Name der Person selbst passt?",
  "Prüfe für die Person selbst nicht ihren eigenen Namen, sondern nur, ob der Name bei einem Elternteil oder dessen Vorfahren vorkommt."]),
"k12-B6": ("kapitel-12-12-3-baeume-fuers-suchen", [
  "Es reicht nicht, nur die direkten Kinder zu vergleichen – alle Knoten links müssen kleiner sein.",
  "Trick: Ein Baum ist genau dann sortiert, wenn tree->list (aus B3) eine streng aufsteigende Liste liefert. Schreibe dafür eine Hilfsfunktion."]),
"k12-B7": ("kapitel-12-12-7-suchbaeume-balancieren", [
  "Zeichne den Baum nach jedem Einfügen auf. Wo landet jede neue Zahl, wenn sie größer ist als alle bisherigen?",
  "Ein balancierter Baum mit 5 Knoten braucht nur so viele Ebenen, wie man 5 Knoten möglichst gleichmäßig verteilen kann."]),
# ---------------- Kapitel 13
"k13-P1": ("kapitel-13-13-7-algebraische-eigenschaften", [
  "Eine Eigenschaft schreibst du mit (check-property (for-all ((a rational) (b rational)) …)).",
  "Im Rumpf steht der Vergleich, der für alle a und b stimmen soll: (= (* a b) (* b a))."]),
"k13-P2": ("kapitel-13-13-7-algebraische-eigenschaften", [
  "Neutrales Element heißt: a + 0 ergibt wieder a.",
  "Du kannst beide Aussagen in eine Eigenschaft mit and packen oder zwei check-property schreiben."]),
"k13-P3": ("kapitel-13-13-3-mehr-eigenschaften-und-inexakte-zahlen", [
  "Löse F = C · 9/5 + 32 nach C auf.",
  "C = (F − 32) · 5/9. Die Eigenschaft: Hin- und Zurückrechnen ergibt c. Mit exakten Brüchen (5/9) klappt der Vergleich mit =."]),
"k13-P4": ("kapitel-13-13-8-eigenschaften-von-funktionen-auf-listen", [
  "Für Listen erzeugst du Eingaben mit der Signatur (list-of integer).",
  "Listen vergleichst du in Eigenschaften mit expect: (expect (reverse (reverse l)) l). Für die Länge reicht =."]),
"k13-P5": ("kapitel-13-13-8-eigenschaften-von-funktionen-auf-listen", [
  "Du brauchst zwei Listen a und b und ein festes Prädikat, z. B. even?.",
  "Vergleiche (filter even? (append a b)) mit (append (filter even? a) (filter even? b))."]),
"k13-P6": ("kapitel-13-13-4-relationale-probleme", [
  "Drei Eigenschaften, drei check-property. sorted? findest du in der Übersicht (13.4).",
  "Für „jedes Element kommt vor“ brauchst du eine Hilfsfunktion member? und every? aus Kapitel 9."]),
"k13-P7": ("kapitel-13-13-4-relationale-probleme", [
  "Welche Liste ist immer sortiert und hat die richtige Länge – egal, was drinsteht?",
  "Denke an eine Liste aus lauter gleichen Zahlen, z. B. mit map."]),
"k13-P8": ("kapitel-13-13-3-mehr-eigenschaften-und-inexakte-zahlen", [
  "Für welchen Wert von b ist (/ a b) gar nicht erlaubt?",
  "Mit (==> bedingung eigenschaft) prüft DrRacket die Eigenschaft nur, wenn die Bedingung gilt: (==> (not (= b 0)) …)."]),
# ---------------- Kapitel 14
"k14-K1": ("kapitel-14-14-4-wie-funktionieren-variablen", [
  "Gebunden ist eine Variable, wenn ein umschließendes λ sie als Parameter hat.",
  "Achte auf die Reichweite: Der Rumpf eines λ reicht so weit wie möglich nach rechts. In b) steht das zweite x außerhalb der Klammer."]),
"k14-K2": ("kapitel-14-14-5-reduktion-im-kalkuel", [
  "β-Reduktion: Setze das Argument für jedes x im Rumpf ein.",
  "Nach dem ersten Schritt steht (λy.y)(λy.y) da – noch einmal reduzieren."]),
"k14-K3": ("kapitel-14-14-5-reduktion-im-kalkuel", [
  "Die Anwendung ist linksassoziativ: erst f einsetzen, dann x.",
  "Nach dem Einsetzen steht (λy.y)((λy.y) z) da. Die Identität gibt ihr Argument einfach zurück."]),
"k14-K4": ("kapitel-14-14-8-der-kalkuel-als-programmiersprache", [
  "Setze die Definitionen ein: if false e₁ e₂ = (λtka.t k a) (λxy.y) e₁ e₂.",
  "Reduziere Schritt für Schritt: t := false, k := e₁, a := e₂ – dann bleibt false e₁ e₂, und false wählt das zweite Argument."]),
"k14-K5": ("kapitel-14-14-8-der-kalkuel-als-programmiersprache", [
  "⌈1⌉ = λf.λx.f x und ⌈2⌉ = λf.λx.f (f x).",
  "Setze ⌈1⌉ für n ein; im Rumpf steht dann ⌈1⌉ f x – das reduziert zu f x, und davor steht noch ein f."]),
"k14-K6": ("kapitel-14-14-6-normalformen", [
  "Was passiert, wenn du (omega omega) einen Schritt reduzierst?",
  "Nach einem β-Schritt steht wieder genau (omega omega) da. Ein Term, der sich nie verändert, hat keine Normalform."]),
# ---------------- Kapitel 15
"k15-Q1": ("kapitel-15-15-3-quote-und-symbole", [
  "' (quote) wertet nicht aus – der Ausdruck wird als Daten zurückgegeben.",
  "'(a b c) ist eine Liste aus drei Symbolen; \"mike\" mit Anführungszeichen ist eine Zeichenkette, kein Symbol."]),
"k15-Q2": ("kapitel-15-15-4-datendefinitionen-fuer-den-kalkuel", [
  "Prüfe drei Dinge: Ist term eine Liste? Ist das erste Element das Symbol +? Hat die Liste genau drei Elemente?",
  "Symbole vergleichst du mit equal?: (equal? (first term) '+). Erst (cons? term) prüfen, sonst stürzt first bei Zahlen ab."]),
"k15-Q3": ("kapitel-15-15-4-datendefinitionen-fuer-den-kalkuel", [
  "Drei Fälle: Zahl, Addition, Multiplikation – ein cond, wie bei gemischten Daten.",
  "Bei Addition: (+ (compute a) (compute b)), wobei a das zweite und b das dritte Element der Liste ist."]),
"k15-Q4": ("kapitel-15-15-5-datendefinition-fuer-maschinensprache", [
  "Die SECD-Maschine braucht erst die Argumente auf dem Stapel, dann den Befehl.",
  "Übersetze von innen nach außen: 2 und 3 auf den Stapel, dann *, damit ist das zweite Argument von + fertig."]),
"k15-Q5": ("kapitel-15-15-7-secd-code-ausfuehren", [
  "Zahlen im Code wandern einfach auf den Stapel S.",
  "Ein Primitiv nimmt so viele Werte vom Stapel, wie es Argumente hat, und legt das Ergebnis zurück."]),
"k15-Q6": ("kapitel-15-15-8-die-endrekursive-secd-maschine", [
  "tailap ist für Endaufrufe – Aufrufe, nach denen im Rumpf nichts mehr zu tun ist.",
  "Im Rumpf (f (g x)): Nach welchem der beiden Aufrufe wird noch weitergerechnet?"]),
})