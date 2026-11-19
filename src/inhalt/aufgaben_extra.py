# Abfragen für Aufgaben ohne automatische Code-Prüfung.
# questions: Auswahlfragen (correct = Index oder Liste von Indizes bei Mehrfachauswahl)
# fields:    Eingabefelder (answers = akzeptierte Antworten; Vergleich ohne Leerzeichen/Groß-Klein)
# code:      zusätzliche Regeln für die Code-Prüfung (tests, mustFail, require, forbid, value, images, calls)
# explain:   Erklärung, die nach dem Abgeben bzw. bei „Musterlösung ansehen“ erscheint
Q = {
# ---------------------------------------------------------------- Kapitel 1
"k1-A2": {"fields": [{"label": "(- 10 (- 5 2)) ergibt", "answers": ["7"]}],
  "explain": "Erst die innere Klammer: (- 5 2) = 3. Dann (- 10 3) = 7."},
"k1-B1": {"code": {"require": ["string-append"], "value": "string-space"},
  "explain": "Zum Beispiel (string-append \"Anna\" \" \" \"Beispiel\") – das Leerzeichen \" \" ist ein eigenes Argument."},
"k1-B4": {"questions": [
  {"q": "(+ \"23\" 42)", "options": ["liefert 65", "liefert \"2342\"", "Fehler: + braucht Zahlen, \"23\" ist Text", "liefert \"23\""], "correct": 2},
  {"q": "(string-append 23 \"42\")", "options": ["liefert \"2342\"", "Fehler: string-append braucht Text, 23 ist eine Zahl", "liefert 65", "liefert \"42\""], "correct": 1},
  {"q": "(number->string \"23\")", "options": ["liefert \"23\"", "liefert 23", "Fehler: \"23\" ist schon Text, keine Zahl"], "correct": 2}],
  "explain": "Alle drei sind Fehler: Jeder Befehl erwartet eine bestimmte Sorte. + rechnet nur mit Zahlen, string-append hängt nur Texte aneinander, number->string wandelt nur Zahlen um."},
"k1-C1": {"questions": [
  {"q": "Was bestimmt die Zahl bei (square 40 \"solid\" \"red\")?", "options": ["die Seitenlänge in Pixeln", "die Fläche", "den Umfang", "die Farbe"], "correct": 0},
  {"q": "Was bestimmt die Zahl bei (circle 40 \"solid\" \"red\")?", "options": ["den Durchmesser", "den Radius – der Kreis ist 80 Pixel breit", "den Umfang", "die Fläche"], "correct": 1},
  {"q": "Was bedeuten die zwei Zahlen bei (rectangle 80 30 \"solid\" \"orange\")?", "options": ["Breite und Höhe", "Höhe und Breite", "x- und y-Position", "Fläche und Umfang"], "correct": 0}],
  "explain": "square: Seitenlänge; circle: Radius (Durchmesser = 2 × Radius); rectangle und ellipse: erst Breite, dann Höhe – alles in Pixeln."},
"k1-C2": {"code": {"images": [{"re": "^above\\[center\\]\\(tri\\(.*\\),rect\\(", "msg": "Erwartet wird ein Dreieck (triangle) oben auf einem Quadrat (square), zusammengesetzt mit above."}]},
  "explain": "(above (triangle 100 \"solid\" \"red\") (square 100 \"solid\" \"blue\")) – gleiche Seitenlänge, damit das Dach passt."},
"k1-C3": {"code": {"images": [{"re": "^above\\[center\\]\\(ellipse\\([^)]*,red\\),ellipse\\([^)]*,yellow\\),ellipse\\([^)]*,green\\)\\)$", "msg": "Erwartet werden drei Kreise mit above: oben rot (\"red\"), in der Mitte gelb (\"yellow\"), unten grün (\"green\")."}]},
  "explain": "(above (circle 20 \"solid\" \"red\") (circle 20 \"solid\" \"yellow\") (circle 20 \"solid\" \"green\"))"},
"k1-C4": {"code": {"images": [{"re": "^above\\[center\\]\\(ellipse\\([^)]*outline[^)]*\\),ellipse\\([^)]*outline[^)]*\\),ellipse\\([^)]*outline[^)]*\\)\\)$", "msg": "Erwartet werden drei Kreise im Modus \"outline\", untereinander mit above."}]},
  "explain": "(above (circle 15 \"outline\" \"black\") (circle 25 \"outline\" \"black\") (circle 35 \"outline\" \"black\")) – oben klein, unten groß."},
"k1-C5": {"code": {"images": [{"re": "^star\\([^,]*,7,1,", "msg": "Es fehlt (star-polygon … 7 1 …)."}, {"re": "^star\\([^,]*,7,2,", "msg": "Es fehlt (star-polygon … 7 2 …)."}, {"re": "^star\\([^,]*,7,3,", "msg": "Es fehlt (star-polygon … 7 3 …)."}], "allImages": True},
  "questions": [{"q": "Was kommt bei Schrittweite 1 heraus?", "options": ["ein Siebeneck", "ein Stern mit 7 Spitzen", "ein Kreis", "ein Dreieck"], "correct": 0}],
  "explain": "Schrittweite 1 verbindet benachbarte Punkte – ein Siebeneck. Schrittweite 2 und 3 überspringen Punkte und ergeben verschieden spitze Sterne."},
"k1-C6": {"questions": [
  {"q": "Was liefert s1 in der REPL?", "options": ["das rote Quadrat", "einen Fehler", "den Text \"s1\"", "die Zahl 40"], "correct": 0},
  {"q": "Was liefert (s1)?", "options": ["auch das rote Quadrat", "einen Fehler, weil Klammern „wende als Funktion an“ bedeuten und s1 ein Bild ist", "ein leeres Bild", "die Zahl 40"], "correct": 1}],
  "explain": "s1 ist eine Variable und liefert ihren Wert, das Bild. (s1) heißt „wende s1 als Funktion an“ – s1 ist aber keine Funktion."},
"k1-D1": {"questions": [
  {"q": "Was macht der Stepper im ersten Schritt bei (tile s1 p1)?", "options": ["Er ersetzt tile durch seinen lambda-Ausdruck", "Er zeigt sofort das fertige Bild", "Er meldet einen Fehler", "Er löscht die Definitionen"], "correct": 0},
  {"q": "Was passiert danach mit a und b im Rumpf?", "options": ["Sie werden durch s1 und p1 ersetzt (Substitution)", "Sie bleiben stehen", "Sie werden zu Zahlen", "Sie werden gelöscht"], "correct": 0}],
  "explain": "Der Stepper zeigt: tile wird durch (lambda (a b) …) ersetzt, dann werden a und b im Rumpf durch die Argumente s1 und p1 ersetzt, danach werden beside und above ausgewertet."},
"k1-D2": {"questions": [{"q": "Kann man das Ergebnis von tile wieder an tile übergeben?", "options": ["Ja, weil tile ein Bild liefert und tile Bilder erwartet", "Nein, tile nimmt nur s1, c1 und p1", "Nein, das ergibt eine Endlosschleife", "Nur einmal"], "correct": 0}],
  "explain": "Ja: (tile (tile s1 p1) (tile p1 c1)) funktioniert, weil tile ein Bild liefert – und Bilder sind genau das, was tile erwartet."},
"k1-D4": {"code": {"calls": ["(haus 80 \"blue\")"], "images": [{"re": "^above\\[center\\]\\(tri\\(80,.*rect\\(80,80,[^,]*,blue\\)\\)$", "msg": "(haus 80 \"blue\") soll ein 80 Pixel großes Dach (triangle) über einem blauen Quadrat (square) mit Seitenlänge 80 liefern."}]},
  "explain": "(define haus (lambda (größe farbe) (above (triangle größe \"solid\" \"red\") (square größe \"solid\" farbe))))"},
"k1-E1": {"questions": [
  {"q": "a) Fläche eines Kreises aus dem Radius", "options": ["(: kreisfläche (real -> real))", "(: kreisfläche (natural -> string))", "(: kreisfläche (real real -> real))", "(: kreisfläche (image -> real))"], "correct": 0},
  {"q": "b) Anzahl der Buchstaben eines Namens", "options": ["(: buchstaben-anzahl (natural -> string))", "(: buchstaben-anzahl (string -> natural))", "(: buchstaben-anzahl (string -> string))", "(: buchstaben-anzahl (string -> real))"], "correct": 1},
  {"q": "c) Grußtext für einen Namen", "options": ["(: gruß (string -> boolean))", "(: gruß (string string -> image))", "(: gruß (string -> string))", "(: gruß (natural -> string))"], "correct": 2},
  {"q": "d) Bild eines Quadrats mit gegebener Seitenlänge", "options": ["(: quadrat-bild (natural -> image))", "(: quadrat-bild (image -> natural))", "(: quadrat-bild (string -> image))", "(: quadrat-bild (natural natural -> natural))"], "correct": 0}],
  "explain": "Links vom Pfeil stehen die Sorten der Eingaben, rechts die Sorte des Ergebnisses. Eine Anzahl ist natural, Text ist string, ein Bild ist image."},
"k1-E6": {"questions": [
  {"q": "a) Anzahl der Schüler einer Klasse", "options": ["natural", "integer", "rational", "real"], "correct": 0},
  {"q": "b) Kontostand in Euro mit Cent", "options": ["natural", "integer", "rational", "string"], "correct": 2},
  {"q": "c) Temperatur in °C", "options": ["natural", "rational oder real", "boolean", "string"], "correct": 1},
  {"q": "d) Wurzel aus 2", "options": ["natural", "integer", "rational", "real"], "correct": 3}],
  "explain": "a) natural: keine negativen oder halben Schüler. b) rational: Cent-Beträge exakt, auch negativ. c) rational oder real: negativ und mit Komma möglich. d) real: √2 ist kein Bruch."},
"k1-E7": {"questions": [
  {"q": "DrRacket meldet: „Der tatsächliche Wert 23 ist nicht der erwartete Wert 32.“ Woher kommt die 23?", "options": ["aus deiner Funktion (dem Rumpf)", "aus dem check-expect", "aus der Signatur", "aus der Kurzbeschreibung"], "correct": 0},
  {"q": "Und woher kommt die 32?", "options": ["aus deiner Funktion", "aus dem erwarteten Wert im check-expect", "von DrRacket selbst", "aus der Signatur"], "correct": 1},
  {"q": "Wo steckt also der Fehler, wenn der Test richtig ist?", "options": ["im Rumpf der Funktion", "im Test", "in der Signatur", "in DrRacket"], "correct": 0}],
  "explain": "Der tatsächliche Wert kommt von der Funktion, der erwartete aus dem Test. Stimmt der Test, steckt der Fehler im Rumpf."},
# ---------------------------------------------------------------- Kapitel 2
"k2-F9": {"code": {"forbid": ["cond"], "require": ["if", "or"], "tests": [
  "(check-expect (cute? \"Katze\") #t)", "(check-expect (cute? \"Hund\") #t)", "(check-expect (cute? \"Gürteltier\") #f)", "(check-expect (cute? \"Spinne\") #f)"]},
  "explain": "(define cute? (lambda (p) (if (or (string=? p \"Katze\") (string=? p \"Hund\")) #t #f))) – noch kürzer geht es ganz ohne if: (or (string=? p \"Katze\") (string=? p \"Hund\"))."},
# ---------------------------------------------------------------- Kapitel 8
"k8-I1": {"fields": [
  {"label": "n = 0: Summe 0 + … + n", "answers": ["0"]}, {"label": "n = 1", "answers": ["1"]}, {"label": "n = 2", "answers": ["3"]},
  {"label": "n = 3", "answers": ["6"]}, {"label": "n = 4", "answers": ["10"]}],
  "explain": "n(n+1)/2 ergibt 0, 1, 3, 6, 10 – genau die Summen 0, 0+1, 0+1+2, 0+1+2+3, 0+1+2+3+4."},
"k8-I2": {"questions": [
  {"q": "Induktionsanfang (n = 0): Was ist die Summe der ersten 0 ungeraden Zahlen?", "options": ["0 = 0²", "1", "−1", "nicht definiert"], "correct": 0},
  {"q": "Welche Zahl kommt im Schluss von n auf n + 1 zur Summe dazu?", "options": ["2n + 1 (= 2(n+1) − 1)", "n + 1", "2n − 1", "(n + 1)²"], "correct": 0},
  {"q": "Mit der Voraussetzung wird die Summe für n + 1 zu …", "options": ["n² + 2n + 1 = (n + 1)²", "n² + n + 1", "2n²", "n² + 1"], "correct": 0}],
  "explain": "Anfang: leere Summe = 0 = 0². Schluss: 1 + 3 + … + (2n − 1) + (2(n+1) − 1) = n² + 2n + 1 = (n + 1)²."},
"k8-I3": {"questions": [
  {"q": "Was kommt im Schluss zur Summe für n dazu?", "options": ["(n + 1)²", "n + 1", "n²", "2n + 1"], "correct": 0},
  {"q": "Mit der Voraussetzung ergibt sich n(n+1)(2n+1)/6 + (n+1)². Was kommt nach dem Ausklammern von (n+1)/6 heraus?", "options": ["(n+1)(2n² + 7n + 6)/6", "(n+1)(2n² + n)/6", "(n+1)²/6", "n(n+1)/6"], "correct": 0},
  {"q": "2n² + 7n + 6 lässt sich zerlegen in …", "options": ["(n + 2)(2n + 3)", "(n + 1)(2n + 6)", "(2n + 1)(n + 6)", "(n + 3)(2n + 2)"], "correct": 0}],
  "explain": "n(n+1)(2n+1)/6 + (n+1)² = (n+1)(n(2n+1) + 6(n+1))/6 = (n+1)(2n² + 7n + 6)/6 = (n+1)(n+2)(2n+3)/6 – die Formel für n + 1."},
"k8-I4": {"questions": [{"q": "Wo steckt der Fehler im „Pferde-Beweis“?", "options": [
  "Der Schluss funktioniert nicht von 1 auf 2 Pferde: Die beiden Gruppen haben kein gemeinsames Pferd",
  "Der Induktionsanfang n = 1 ist falsch",
  "Pferde kann man nicht zählen",
  "Induktion funktioniert nur für gerade Zahlen"], "correct": 0}],
  "explain": "Bei zwei Pferden ergeben „ohne das erste“ und „ohne das letzte“ zwei Gruppen mit je einem Pferd, die sich nicht überschneiden. Der Schluss muss für jedes n gelten – hier gilt er erst ab n ≥ 2."},
"k8-I5": {"questions": [
  {"q": "Induktionsanfang u = ε: Länge(cat(ε, v)) = …", "options": ["Länge(v) = 0 + Länge(v)", "0", "1 + Länge(v)", "Länge(ε)"], "correct": 0},
  {"q": "Schluss u = m u': Länge(cat(m u', v)) = Länge(m cat(u', v)) = …", "options": ["1 + Länge(cat(u', v))", "Länge(cat(u', v))", "2 · Länge(u')", "Länge(v)"], "correct": 0},
  {"q": "Mit der Voraussetzung wird daraus …", "options": ["1 + Länge(u') + Länge(v) = Länge(m u') + Länge(v)", "Länge(u') · Länge(v)", "Länge(v) + 1", "Länge(u')"], "correct": 0}],
  "explain": "Anfang: Länge(cat(ε, v)) = Länge(v) = Länge(ε) + Länge(v). Schluss: Länge(cat(m u', v)) = 1 + Länge(cat(u', v)) = 1 + Länge(u') + Länge(v) = Länge(m u') + Länge(v)."},
# ---------------------------------------------------------------- Kapitel 9, 10, 12
"k9-H9": {"fields": [{"label": "((f 10) 1) ergibt", "answers": ["11"]}],
  "questions": [{"q": "Warum?", "options": ["Der Parameter y der inneren Funktion verdeckt die lokale Definition y = 20", "Die lokale Definition y = 20 wird benutzt", "x ist 1 und y ist 10", "f liefert eine Zahl"], "correct": 0}],
  "explain": "(f 10) liefert die innere Funktion mit x = 10. Ihr Parameter y verdeckt die lokale Definition y = 20, also (+ 10 1) = 11."},
"k10-A8": {"questions": [{"q": "Welche Aufrufe von p sind Endaufrufe? (mehrere möglich)", "options": ["a) (p (+ x 1))", "b) (+ 1 (p x))", "c) (if (= x 0) 0 (p (- x 1)))", "d) (cons x (p (rest l)))"], "correct": [0, 2]}],
  "explain": "a) und c) sind Endaufrufe: Danach ist nichts mehr zu tun (if gibt das Ergebnis direkt weiter). Bei b) muss noch 1 addiert, bei d) noch cons ausgeführt werden."},
"k12-B7": {"fields": [{"label": "Tiefe nach Einfügen von 1, 2, 3, 4, 5", "answers": ["5"]}, {"label": "Tiefe eines balancierten Baums mit 5 Knoten", "answers": ["3"]}],
  "explain": "Jede neue Zahl ist größer als alle bisherigen und landet ganz rechts – eine Kette mit Tiefe 5. Balanciert (Wurzel 3, darunter 2 und 5, darunter 1 und 4) reicht Tiefe 3."},
# ---------------------------------------------------------------- Kapitel 13
"k13-P7": {"code": {"tests": [
  "(check-property (for-all ((l (list-of integer))) (sorted? (fake-sort l))))",
  "(check-property (for-all ((l (list-of integer))) (= (length (fake-sort l)) (length l))))"],
  "mustFail": ["(check-property (for-all ((l (list-of integer))) (every? (lambda (x) (member? x (fake-sort l))) l)))"],
  "needName": "fake-sort"},
  "explain": "Zum Beispiel (define fake-sort (lambda (l) (map (lambda (x) 0) l))) – sortiert und richtig lang, aber die Elemente stimmen nicht."},
# ---------------------------------------------------------------- Kapitel 14
"k14-K1": {"questions": [
  {"q": "a) λx.x y", "options": ["x gebunden, y frei", "x und y gebunden", "x frei, y gebunden", "beide frei"], "correct": 0},
  {"q": "b) (λx.x) x", "options": ["beide x gebunden", "das x im Rumpf ist gebunden, das zweite x (das Argument) ist frei", "beide x frei", "das Argument-x ist gebunden"], "correct": 1},
  {"q": "c) λx.λy.z x", "options": ["x, y und z gebunden", "x und y gebunden, z frei", "nur x gebunden", "alle frei"], "correct": 1}],
  "explain": "Gebunden ist eine Variable, wenn ein umschließendes λ sie als Parameter hat. In b) steht das zweite x außerhalb von (λx.x); in c) wird y gebunden, aber nicht benutzt."},
"k14-K2": {"fields": [{"label": "Normalform", "answers": ["λy.y", "λx.x", "λz.z"], "placeholder": "z. B. λa.a (\\ statt λ geht auch)"}],
  "explain": "(λx.x x)(λy.y) → (λy.y)(λy.y) → λy.y"},
"k14-K3": {"fields": [{"label": "Ergebnis der Reduktion", "answers": ["z"]}],
  "explain": "(λf.λx.f (f x)) (λy.y) z → (λx.(λy.y)((λy.y) x)) z → (λy.y)((λy.y) z) → (λy.y) z → z"},
"k14-K4": {"questions": [
  {"q": "Nach Einsetzen von t := false, k := e₁, a := e₂ bleibt …", "options": ["false e₁ e₂", "e₁", "true e₁ e₂", "if e₁ e₂"], "correct": 0},
  {"q": "false = λxy.y angewendet auf e₁ e₂ ergibt …", "options": ["e₂", "e₁", "false", "λy.y"], "correct": 0}],
  "explain": "if false e₁ e₂ = (λtka.t k a) false e₁ e₂ →* false e₁ e₂ = (λxy.y) e₁ e₂ → (λy.y) e₂ → e₂"},
"k14-K5": {"questions": [
  {"q": "succ ⌈1⌉ reduziert im ersten Schritt zu …", "options": ["λf.λx.f (⌈1⌉ f x)", "⌈1⌉ f x", "λf.λx.x", "⌈2⌉ ⌈1⌉"], "correct": 0},
  {"q": "⌈1⌉ f x reduziert zu …", "options": ["f x", "x", "f (f x)", "⌈1⌉"], "correct": 0},
  {"q": "Damit ist das Ergebnis …", "options": ["λf.λx.f (f x) = ⌈2⌉", "λf.λx.f x = ⌈1⌉", "λf.λx.x = ⌈0⌉", "f (f x)"], "correct": 0}],
  "explain": "succ ⌈1⌉ → λf.λx.f (⌈1⌉ f x) = λf.λx.f ((λf.λx.f x) f x) →* λf.λx.f (f x) = ⌈2⌉"},
"k14-K6": {"questions": [{"q": "Warum hängt sich (omega omega) auf?", "options": [
  "Eine β-Reduktion führt wieder genau zu (omega omega) – der Term hat keine Normalform",
  "DrRacket kennt omega nicht", "Der Term ist zu groß für den Speicher", "omega hat einen Syntaxfehler"], "correct": 0}],
  "explain": "(omega omega) ist (λx.x x)(λx.x x). Ein Reduktionsschritt ergibt wieder denselben Term – es gibt keine Normalform, DrRacket rechnet endlos weiter."},
# ---------------------------------------------------------------- Kapitel 15
"k15-Q1": {"questions": [
  {"q": "a) '(1 2 3)", "options": ["die Liste (1 2 3)", "6", "ein Fehler", "das Symbol 1"], "correct": 0},
  {"q": "b) (first '(a b c))", "options": ["das Symbol a", "die Zeichenkette \"a\"", "ein Fehler: a ist nicht definiert", "die Liste (a)"], "correct": 0},
  {"q": "c) (symbol? \"mike\")", "options": ["#t", "#f – ein String ist kein Symbol", "ein Fehler", "'mike"], "correct": 1},
  {"q": "d) (equal? 'a 'a)", "options": ["#t", "#f", "ein Fehler"], "correct": 0},
  {"q": "e) '(+ 1 2)", "options": ["3", "die Liste (+ 1 2) – quote wertet nicht aus", "ein Fehler", "das Symbol +"], "correct": 1}],
  "explain": "quote liefert den Ausdruck als Daten: Listen bleiben Listen, Namen werden zu Symbolen. Ein String in Anführungszeichen ist kein Symbol."},
"k15-Q4": {"questions": [{"q": "Welcher SECD-Code gehört zu '(+ 1 (* 2 3))?", "options": [
  "(list 1 2 3 (make-prim '* 2) (make-prim '+ 2))",
  "(list (make-prim '+ 2) 1 (make-prim '* 2) 2 3)",
  "(list 1 (make-prim '+ 2) 2 3 (make-prim '* 2))",
  "(list 2 3 (make-prim '* 2) (make-prim '+ 2) 1)"], "correct": 0}],
  "explain": "Erst alle Argumente auf den Stapel, dann der Befehl: 1, dann 2 und 3, dann * (ergibt 6), dann + mit 1 und 6."},
"k15-Q5": {"fields": [{"label": "Stapel nach prim* (oben zuerst, mit Leerzeichen)", "answers": ["6 1"]}, {"label": "Endergebnis", "answers": ["7"]}],
  "explain": "S: 1 → 2 1 → 3 2 1 → (prim*) 6 1 → (prim+) 7. Ergebnis 7."},
"k15-Q6": {"questions": [
  {"q": "Der Aufruf (f …) im Rumpf wird übersetzt mit …", "options": ["tailap – danach ist im Rumpf nichts mehr zu tun", "ap"], "correct": 0},
  {"q": "Der Aufruf (g x) wird übersetzt mit …", "options": ["tailap", "ap – danach muss noch f aufgerufen werden"], "correct": 1}],
  "explain": "(f …) steht am Ende des Rumpfs → tailap. (g x) ist ein Argument von f, danach kommt noch der Aufruf von f → ap."},
}

# Musterlösung für I6 (stand im Buch als Text statt als Code-Abschnitt)
REF_EXTRA = {
"k8-I6": """(: vertauschen (bool-expr -> bool-expr))
(check-expect (vertauschen (make-und #t #f)) (make-oder #f #t))
(define vertauschen
  (lambda (e)
    (cond
      ((boolean? e) (not e))
      ((und? e) (make-oder (vertauschen (und-links e)) (vertauschen (und-rechts e))))
      ((oder? e) (make-und (vertauschen (oder-links e)) (vertauschen (oder-rechts e))))
      ((nicht? e) (make-nicht (vertauschen (nicht-ausdruck e)))))))
(define e1 (make-und #t (make-nicht (make-oder #f #t))))
(check-expect (auswerten (vertauschen e1)) (not (auswerten e1)))
(check-property
 (for-all ((a boolean) (b boolean))
   (expect (auswerten (vertauschen (make-und a b))) (not (auswerten (make-und a b))))))
""",
}
