# Kapitel „Erste Schritte“ für Leute ohne Vorwissen. Liefert HTML für die Lernübersicht.
import base64, html


def pg(code):
    return "playground.html#code=" + base64.b64encode(code.encode("utf-8")).decode("ascii") + "&amp;lvl=beginner"


def ex(code, note="", errok=False):
    """Codebeispiel mit Ausprobieren-Knopf."""
    btn = f'<a class="trybtn{" errok" if errok else ""}" href="{pg(code)}">▶ Im Playground ausprobieren</a>'
    n = f'<p class="exnote">{note}</p>' if note else ""
    return f'<div class="example"><pre><code class="language-racket">{html.escape(code)}</code></pre>{btn}{n}</div>'


def box(kind, title, body):
    return f'<div class="callout {kind}"><strong>{title}</strong> {body}</div>'


DRRACKET_SVG = """<figure class="drr-fig"><svg viewBox="0 0 640 380" role="img" aria-label="Skizze des DrRacket-Fensters">
<rect x="1" y="1" width="638" height="378" rx="10" fill="var(--panel)" stroke="var(--line)"/>
<rect x="1" y="1" width="638" height="34" rx="10" fill="var(--th)"/>
<text x="16" y="23" font-size="13" fill="var(--muted)">Datei  Bearbeiten  Ansicht  Sprache  Racket  Einfügen  Hilfe</text>
<rect x="470" y="44" width="70" height="26" rx="6" fill="var(--accent)"/><text x="505" y="62" font-size="13" fill="#fff" text-anchor="middle" font-weight="700">Start ▶</text>
<rect x="550" y="44" width="76" height="26" rx="6" fill="var(--th)" stroke="var(--line)"/><text x="588" y="62" font-size="12" fill="var(--muted)" text-anchor="middle">Stepper</text>
<rect x="14" y="80" width="612" height="130" rx="6" fill="var(--code-bg)" stroke="var(--line)"/>
<text x="26" y="104" font-size="13" font-family="monospace" fill="var(--text)">(define preis 5)</text>
<text x="26" y="124" font-size="13" font-family="monospace" fill="var(--text)">(* preis 3)</text>
<rect x="14" y="220" width="612" height="120" rx="6" fill="var(--code-bg)" stroke="var(--line)"/>
<text x="26" y="244" font-size="13" font-family="monospace" fill="var(--muted)">Willkommen bei DrRacket …</text>
<text x="26" y="266" font-size="13" font-family="monospace" fill="var(--text)">15</text>
<text x="26" y="288" font-size="13" font-family="monospace" fill="var(--accent)">&gt; (+ 1 2)</text>
<text x="26" y="310" font-size="13" font-family="monospace" fill="var(--text)">3</text>
<text x="16" y="365" font-size="12" fill="var(--muted)">Schreibe Dein Programm! – Anfänger ▾</text>
<g font-size="12" fill="var(--accent)" font-weight="700">
<text x="420" y="104">① Definitionsfenster</text>
<text x="420" y="244">② Interaktionsfenster</text>
<text x="300" y="62">③ Programm ausführen →</text>
<text x="280" y="365">← ④ eingestellte Sprache</text>
</g></svg>
<figcaption>So sieht DrRacket ungefähr aus (vereinfachte Skizze). ① oben schreibst du dein Programm, ② unten erscheinen die Ergebnisse und du kannst einzelne Ausdrücke ausprobieren, ③ <strong>Start</strong> führt das Programm aus, ④ unten links steht die eingestellte Sprache.</figcaption></figure>"""


def build():
    p = []
    p.append('<p class="lead2">Dieses Kapitel ist für dich, wenn du <strong>noch nie programmiert</strong> hast. Du brauchst kein Vorwissen – nur etwa 30 Minuten. '
             'Jedes Beispiel kannst du mit einem Klick auf <strong>„▶ Im Playground ausprobieren“</strong> direkt im Browser ausführen und verändern. '
             'Fachwörter mit gepunkteter Unterstreichung kannst du antippen – dann erscheint eine kurze Erklärung.</p>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-was-ist-programmieren">Was ist Programmieren?</h3>'
             '<p>Ein Computer kann sehr schnell rechnen, aber er weiß von selbst nicht, <em>was</em> er tun soll. Ein <strong>Programm</strong> ist eine genaue Anleitung für den Computer – geschrieben in einer Sprache, die er versteht: einer <strong>Programmiersprache</strong>.</p>'
             '<p>Stell dir einen sehr gründlichen, aber völlig fantasielosen Helfer vor: Er macht <em>genau</em> das, was dasteht – nicht mehr und nicht weniger. Steht da Unsinn, macht er Unsinn oder meldet einen Fehler. Programmieren heißt also: so genau aufschreiben, was passieren soll, dass es keine Missverständnisse gibt.</p>'
             '<p>Hier lernst du die Sprache <strong>Racket</strong>. Sie wurde extra zum Lernen entwickelt: Es gibt nur wenige Regeln, und die Fehlermeldungen sind auf Deutsch und verständlich. Was du hier lernst – genau denken, Probleme in kleine Teile zerlegen, testen – brauchst du in jeder anderen Programmiersprache genauso.</p></div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-erstes-programm">Dein erstes Programm: Rechnen</h3>'
             '<p>Racket kann zuerst einmal das, was ein Taschenrechner kann. Probier es aus:</p>'
             + ex("(+ 1 2)", "Ergebnis: 3. Ändere die Zahlen und klicke im Playground auf „Ausführen“.") +
             '<p>Ungewohnt ist nur die Schreibweise: Das <strong>Rechenzeichen steht vorne</strong>, und alles steht in einer runden Klammer. '
             'Lies <code>(+ 1 2)</code> so: <em>„Addiere 1 und 2.“</em> Erst kommt, <em>was</em> gemacht werden soll, dann <em>womit</em>.</p>'
             '<table><thead><tr><th>Mathe</th><th>Racket</th><th>vorgelesen</th></tr></thead><tbody>'
             '<tr><td>1 + 2</td><td><code>(+ 1 2)</code></td><td>addiere 1 und 2</td></tr>'
             '<tr><td>10 − 3</td><td><code>(- 10 3)</code></td><td>ziehe 3 von 10 ab</td></tr>'
             '<tr><td>6 · 7</td><td><code>(* 6 7)</code></td><td>multipliziere 6 und 7</td></tr>'
             '<tr><td>15 : 3</td><td><code>(/ 15 3)</code></td><td>teile 15 durch 3</td></tr></tbody></table>'
             + box("tip", "Leerzeichen sind wichtig:", "Zwischen <code>+</code>, <code>1</code> und <code>2</code> muss jeweils ein Leerzeichen stehen. <code>(+1 2)</code> liest Racket anders, als du denkst.") +
             '</div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-klammern">Klammern in Klammern</h3>'
             '<p>Wie in Mathe kann man Rechnungen ineinander schachteln. Racket rechnet dabei immer <strong>die innerste Klammer zuerst</strong> aus:</p>'
             + ex("(* 2 (+ 3 4))") +
             '<ol class="steps"><li>Innen: <code>(+ 3 4)</code> ergibt <code>7</code>.</li><li>Jetzt steht da <code>(* 2 7)</code>.</li><li>Das ergibt <code>14</code>.</li></ol>'
             '<p>So ein Stück Programm, das einen Wert ergibt, heißt <strong>Ausdruck</strong>. <code>(+ 3 4)</code> ist ein Ausdruck, <code>7</code> auch – und <code>(* 2 (+ 3 4))</code> ebenfalls.</p>'
             + box("tip", "Zum Mitzählen:", "Jede öffnende Klammer <code>(</code> braucht genau eine schließende <code>)</code>. Fehlt eine, meldet DrRacket einen Klammer-Fehler.") +
             '</div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-texte-bilder">Texte und Bilder</h3>'
             '<p>Programme rechnen nicht nur mit Zahlen. Texte stehen in Anführungszeichen und heißen <strong>Zeichenketten</strong>:</p>'
             + ex('(string-append "Hallo, " "Welt!")', "string-append hängt Texte aneinander. Das Leerzeichen nach dem Komma gehört zum ersten Text.") +
             '<p>Und Racket kann Bilder malen – die Zahl ist die Größe, dann kommen Füllung und Farbe (auf Englisch):</p>'
             + ex('(circle 30 "solid" "red")\n(beside (circle 30 "solid" "red")\n        (square 60 "solid" "blue"))', "beside setzt Bilder nebeneinander, above übereinander. Probier \"outline\" statt \"solid\" oder andere Farben wie \"green\".") +
             '</div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-namen">Dingen einen Namen geben</h3>'
             '<p>Mit <code>define</code> gibst du einem Wert einen Namen. Danach kannst du den Namen benutzen, als stünde der Wert da:</p>'
             + ex("(define preis 5)\n(define anzahl 3)\n(* preis anzahl)", "Ergebnis: 15. Ändere den Preis – das Ergebnis passt sich an.") +
             '<p>Das ist praktisch: Ändert sich der Preis, änderst du ihn an <em>einer</em> Stelle. So einen Namen nennt man <strong>Variable</strong>; die Zeile mit <code>define</code> heißt <strong>Definition</strong>.</p></div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-funktionen">Eigene Befehle bauen: Funktionen</h3>'
             '<p>Das Wichtigste beim Programmieren: Du kannst dir <strong>eigene Befehle</strong> bauen. So einen Befehl nennt man <strong>Funktion</strong>. Er bekommt etwas hinein und liefert etwas heraus – wie ein Rezept mit Platzhaltern.</p>'
             + ex("(define verdoppeln\n  (lambda (x)\n    (* 2 x)))\n\n(verdoppeln 21)\n(verdoppeln 100)", "Ergebnis: 42 und 200.") +
             '<p>Lies das so: <em>„verdoppeln ist ein Rezept (lambda) mit dem Platzhalter x: Rechne 2 mal x.“</em> Beim Aufruf <code>(verdoppeln 21)</code> wird für <code>x</code> die <code>21</code> eingesetzt. Den Platzhalter nennt man <strong>Parameter</strong>, den eingesetzten Wert <strong>Argument</strong>.</p>'
             + box("info", "Keine Sorge:", "Das wird in Kapitel 1 noch ganz in Ruhe erklärt. Hier geht es nur darum, dass du die Idee einmal gesehen hast.") +
             '</div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-fehler">Fehler sind normal</h3>'
             '<p>Jeder, der programmiert, macht ständig Fehler – auch Profis. Wichtig ist nur, die <strong>Fehlermeldung zu lesen</strong>. Probier einen Fehler absichtlich aus:</p>'
             + ex('(+ "5" 3)', "Meldung: Zahl erwartet, \"5\" bekommen. \"5\" in Anführungszeichen ist Text, keine Zahl.", errok=True) +
             '<ol class="steps"><li><strong>Meldung ganz lesen.</strong> Sie sagt meistens genau, was nicht passt.</li>'
             '<li><strong>Markierte Stelle ansehen.</strong> DrRacket färbt den Ausdruck rot, der das Problem ausgelöst hat.</li>'
             '<li><strong>Nachschlagen.</strong> Die Seite <a href="fehler.html">Fehlermeldungen</a> erklärt die häufigsten Meldungen.</li></ol></div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-installieren">DrRacket installieren</h3>'
             '<p>Der Playground hier ist zum Ausprobieren. Zum richtigen Lernen brauchst du <strong>DrRacket</strong> – das Programm, in dem du Racket schreibst. Es ist kostenlos.</p>'
             '<ol class="steps">'
             '<li>Öffne <a href="https://racket-lang.org">racket-lang.org</a> und klicke auf <strong>Download</strong>. Lade Racket nur von dort (bzw. von download.racket-lang.org) herunter.</li>'
             '<li>Wähle dein System (Windows, Mac oder Linux) und lade die Installationsdatei herunter.</li>'
             '<li><strong>Windows:</strong> die heruntergeladene .exe öffnen und durchklicken. <strong>Mac:</strong> die .dmg öffnen und den Ordner „Racket“ in „Programme“ ziehen.</li>'
             '<li>Starte <strong>DrRacket</strong> (nicht „Racket“ – das ist die Version ohne Fenster).</li></ol>'
             + DRRACKET_SVG +
             '<p>Wenn die Menüs auf Englisch sind: Im Menü <strong>Help</strong> gibt es den Punkt <em>„Interact with DrRacket in German“</em>. Danach ist alles auf Deutsch.</p></div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-einstellen">Sprache einstellen (einmalig)</h3>'
             '<p>DrRacket kennt viele Sprachen. Für dieses Buch stellst du einmal die richtige ein:</p>'
             '<ol class="steps">'
             '<li>Menü <strong>Sprache → Sprache auswählen…</strong> (englisch: <em>Language → Choose Language…</em>).</li>'
             '<li>Im Fenster unter <strong>Lehrsprachen</strong> (<em>Teaching Languages</em>) den Bereich <strong>DeinProgramm</strong> aufklappen.</li>'
             '<li><strong>„Schreibe Dein Programm! – Anfänger“</strong> anklicken und mit <strong>OK</strong> bestätigen.</li>'
             '<li>Für Bilder: Menü <strong>Sprache → Teachpack hinzufügen…</strong> → <code>image.rkt</code> auswählen. Für Animationen (ab Kapitel 11) genauso <code>universe.rkt</code>.</li>'
             '<li>Auf <strong>Start</strong> klicken. Unten links im Fenster sollte jetzt die Sprache stehen.</li></ol>'
             + box("tip", "Später umstellen:", "Ab Kapitel 6 (Listen) brauchst du die Sprache „Schreibe Dein Programm!“ ohne „Anfänger“. Darauf weist das Kapitel dich hin.") +
             '<p>Jetzt tippst du oben ins Definitionsfenster zum Beispiel <code>(+ 1 2)</code> und klickst auf <strong>Start</strong> – unten erscheint <code>3</code>. Geschafft! 🎉</p></div>')

    p.append('<div class="abschnitt"><h3 id="erste-schritte-wie-weiter">So lernst du mit dieser Seite</h3>'
             '<ol class="steps">'
             '<li><strong>Ein Kapitel lesen</strong> – am besten mit DrRacket daneben. Tippe die Beispiele selbst ab (nicht kopieren!) und verändere sie.</li>'
             '<li><strong>Die Übungen zum Kapitel lösen.</strong> Unter jeder Überschrift in der Lernübersicht steht, welche Übungen dazugehören. Abgeben kannst du direkt auf der Übungsseite – dort gibt es auch Tipps.</li>'
             '<li><strong>Bei Fehlern</strong> auf der Seite <a href="fehler.html">Fehlermeldungen</a> nachsehen.</li>'
             '<li><strong>Zum Nachschlagen:</strong> <a href="befehle.html">Befehle</a> (alle Befehle mit Beispiel) und <a href="glossar.html">Glossar</a> (alle Fachwörter). Dort musst du nicht von vorne bis hinten lesen.</li></ol>'
             + box("info", "Exkurse kannst du überspringen:", "Kapitel 8, 14 und 15 sind Ausflüge in Mathematik und Theorie. Für das Programmierenlernen brauchst du sie nicht – lies sie, wenn du neugierig bist.") +
             '<p><a class="nextbtn" href="#kapitel-1">Weiter zu Kapitel 1: Elemente des Programmierens →</a></p></div>')
    return "".join(p)
