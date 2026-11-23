#!/usr/bin/env python3
"""Erzeugt die HTML-Seiten der Website aus den Inhalten in src/inhalt.

Aufruf (im Hauptordner des Repos):  python3 src/build.py
Schreibt index.html, lernen.html, … in den Hauptordner. JavaScript, CSS und KaTeX liegen fertig in assets/.
"""
import re, json, html, os, subprocess, sys, hashlib, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))       # src/
SRC = os.path.join(HERE, "inhalt")                       # Inhalte (Texte, Aufgaben, Tipps)
OUT = os.path.dirname(HERE)                              # Hauptordner = veröffentlichte Website
sys.path.insert(0, HERE)
sys.path.insert(0, SRC)
from tipps import H as HINTS

LINKS = {}   # frühere Links auf Dokumente → Seitennamen (die Inhalte nutzen bereits die Seitennamen)
NAV = [("index.html", "Start"), ("lernen.html", "Lernübersicht"), ("befehle.html", "Befehle"),
       ("glossar.html", "Glossar"), ("fehler.html", "Fehler"), ("uebungen.html", "Übungen"), ("playground.html", "Playground")]


def slug(s):
    s = re.sub(r"<[^>]+>", "", html.unescape(s)).lower()
    s = s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "x"


def fix_links(s):
    for a, b in LINKS.items():
        s = s.replace(a, b)
    return s


def strip_head(s):
    s = re.sub(r"<h1[^>]*>.*?</h1>\s*", "", s, count=1, flags=re.S)
    s = re.sub(r"<p><time[^>]*>.*?</p>\s*", "", s, count=1, flags=re.S)
    return s


def render_latex(s):
    pat = r'<pre><code class="language-latex">(.*?)</code></pre>'
    lat = re.findall(pat, s, re.S)
    if not lat:
        return s
    r = subprocess.run(["node", os.path.join(HERE, "katex_render.js")], input=json.dumps([html.unescape(x) for x in lat]),
                       capture_output=True, text=True, check=True)
    it = iter(json.loads(r.stdout))
    return re.sub(pat, lambda m: next(it), s, flags=re.S)


def tidy_inline(s):
    """Doppelte Leerzeichen und Zeilenumbrüche an Bindestrichen aus dem PDF-Import entfernen."""
    s = re.sub(r"<code>(.*?)</code>", lambda m: "<code>" + re.sub(r"(\w)- (\w)", r"\1-\2", m.group(1)) + "</code>", s)
    s = re.sub(r"\s+([,.;:)!?])", r"\1", s)
    s = re.sub(r"(\()\s+", r"\1", s)
    s = re.sub(r"  +", " ", s)
    s = s.replace(" – ", " – ")
    return s.strip()


def kap_nums(cell):
    return [int(x) for x in re.findall(r"\d+", re.sub(r"<[^>]+>", "", cell))]


def badges(nums):
    return " ".join(f'<span class="kapbadge">{n}</span>' for n in nums) or "–"


def page(fname, title, body, katex=False, desc=""):
    nav = "".join(f'<a href="{h}"{" class=active" if h == fname else ""}>{t}</a>' for h, t in NAV)
    kx = '<link rel="stylesheet" href="assets/katex/katex.min.css">' if katex else ""
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Racket lernen</title>
<meta name="description" content="{html.escape(desc or 'Racket lernen mit „Schreibe Dein Programm!“: Erklärungen, Befehle, Glossar, Fehlermeldungen und Übungen.')}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/style.css">{kx}
<script>window.sdpApply=function(){{try{{var d=document.documentElement,g=function(k){{return localStorage.getItem(k)}},t=g('sdp-theme'),a=g('sdp-accent'),f=g('sdp-font');d.setAttribute('data-theme',t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));if(a){{d.setAttribute('data-acc','');d.style.setProperty('--acc',a)}}else d.removeAttribute('data-acc');d.style.setProperty('--fs',f||1);if(g('sdp-motion')==='off')d.setAttribute('data-motion','off');else d.removeAttribute('data-motion')}}catch(e){{}}}};sdpApply()</script>
</head>
<body>
<header class="top"><div class="inner">
<a class="brand" href="index.html"><span class="lam">λ</span><span>Racket lernen</span></a>
<nav class="main">{nav}</nav>
<a class="themebtn{" active" if fname == "einstellungen.html" else ""}" href="einstellungen.html" title="Einstellungen" aria-label="Einstellungen">⚙</a>
</div></header>
<main>
{body}
</main>
<footer>Lernhilfe zum Buch „Schreibe Dein Programm!“ von Michael Sperber und Herbert Klaeren · kein offizielles Material · Beispiele bitte selbst in DrRacket ausprobieren</footer>
<script src="assets/js/app.js"></script>
</body>
</html>
"""


def kap_select(label="Kapitel"):
    opts = "".join(f'<option value="{i}">{i}: {CHAP_SHORT.get(i, "")}</option>' for i in range(1, 16))
    return f'<select class="kap" aria-label="{label}"><option value="0">Alle Kapitel</option>{opts}</select>'


# ------------------------------------------------------------------ Lernübersicht
main = fix_links(open(f"{SRC}/lernuebersicht.html").read())
main = strip_head(main)
main = render_latex(main)
first_h2 = main.index("<h2")
main_intro, main_body = main[:first_h2], main[first_h2:]
parts = re.split(r"(?=<h2[^>]*>)", main_body)
sections, CHAP, CHAP_SHORT = [], {}, {}
used_ids = set()
for p in parts:
    m = re.match(r"<h2[^>]*>(.*?)</h2>", p, re.S)
    if not m:
        continue
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
    if title.startswith("Zuhause lernen"):
        continue
    km = re.match(r"Kapitel (\d+):\s*(.*)", title)
    if km:
        n = int(km.group(1)); sid = f"kapitel-{n}"
        CHAP[n] = title; CHAP_SHORT[n] = km.group(2)
    else:
        n = 0; sid = slug(title.split(":")[0])
    used_ids.add(sid)
    rest = p[m.end():]
    # Abschnitte (h3) einpacken
    subs = re.split(r"(?=<h3[^>]*>)", rest)
    head, subs = subs[0], subs[1:]
    toc_sub, body_sub = [], []
    for sp in subs:
        hm = re.match(r'<h3(?: id="([^"]*)")?[^>]*>(.*?)</h3>', sp, re.S)
        st = re.sub(r"<[^>]+>", "", hm.group(2)).strip()
        hid = f"{sid}-{slug(st)}"
        while hid in used_ids: hid += "-2"
        used_ids.add(hid)
        sp = sp[:hm.start()] + f'<h3 id="{hid}">{hm.group(2)}</h3>' + sp[hm.end():]
        body_sub.append(f'<div class="abschnitt">{sp}</div>')
        toc_sub.append((hid, st))
    if n:
        head = head.replace('href="uebungen.html"', f'href="uebungen.html?kap={n}"')
        links = (f'<div class="chapterlinks"><a class="chip" href="uebungen.html?kap={n}">✎ Übungen</a>'
                 f'<a class="chip" href="befehle.html?kap={n}">⌘ Befehle</a>'
                 f'<a class="chip" href="glossar.html?kap={n}">Aa Begriffe</a>'
                 f'<a class="chip" href="fehler.html?kap={n}">⚠ Fehler</a></div>')
    else:
        links = ""
    sec_html = (f'<section class="kapitel" id="{sid}" data-title="{html.escape(title)}">'
                f'<h2>{m.group(1)}</h2>{links}{head}{"".join(body_sub)}</section>')
    sections.append((sid, title, n, sec_html, toc_sub))

# ---- Einsteigerhilfen: Ausprobieren-Knöpfe, Exkurs-Hinweise, Kapitel „Erste Schritte“
import beginner, erste_schritte
EXKURS = {8, 14, 15}
_new = []
for sid, title, n, sec_html, subs in sections:
    if n:
        sec_html = beginner.add_try_buttons(sec_html)
    if n in EXKURS:
        note = ('<div class="callout info"><strong>Exkurs – kannst du überspringen.</strong> Dieses Kapitel ist ein Ausflug in '
                + ("Mathematik (Beweise)" if n == 8 else "die Theorie hinter Programmiersprachen")
                + '. Zum Programmierenlernen brauchst du es nicht; die anderen Kapitel funktionieren auch ohne. Lies es, wenn du neugierig bist.</div>')
        _k = sec_html.find('<div class="chapterlinks">')
        if _k >= 0:
            _e = sec_html.find("</div>", _k) + len("</div>")
            sec_html = sec_html[:_e] + note + sec_html[_e:]
    _new.append((sid, title, n, sec_html, subs))
sections = _new
_es = erste_schritte.build()
_es_subs = [(m.group(1), re.sub(r"<[^>]+>", "", m.group(2))) for m in re.finditer(r'<h3 id="([^"]+)">(.*?)</h3>', _es)]
sections.insert(0, ("erste-schritte", "Erste Schritte: Programmieren ohne Vorwissen", 0,
                    '<section class="kapitel" id="erste-schritte" data-title="Erste Schritte: Programmieren ohne Vorwissen"><h2>Erste Schritte: Programmieren ohne Vorwissen</h2>' + _es + '</section>', _es_subs))

SECTITLE = {}
for _sid, _t, _n, _h, _subs in sections:
    for _hid, _st in _subs:
        SECTITLE[_hid] = _st
LERNCODE = {}
for sid, title, n, sec_html, _ in sections:
    if n:
        LERNCODE[n] = "\n".join(html.unescape(c) for c in re.findall(r'<pre><code class="language-racket">(.*?)</code></pre>', sec_html, re.S))
toc = []
for sid, title, n, _, subs in sections:
    short = f"{n}. {CHAP_SHORT[n]}" if n else title
    badge = ' <span class="optbadge">optional</span>' if n in EXKURS else (' <span class="newbadge">Start hier</span>' if sid == "erste-schritte" else "")
    toc.append(f'<a href="#{sid}" data-sec="{sid}">{html.escape(short)}{badge}</a>')
    for hid, st in subs:
        toc.append(f'<a class="sub" href="#{hid}" data-sec="{sid}">{html.escape(st)}</a>')
sel_opts = "".join(f'<option value="{sid}">{html.escape(t)}</option>' for sid, t, *_ in sections)
lernen_body = f"""
<h1 class="page-title">Lernübersicht</h1>
<p class="lead">Alle Erklärungen Kapitel für Kapitel – mit Beispielen zum Ausprobieren. Wähle ein Kapitel oder durchsuche den ganzen Text.</p>
<div class="filters">
<select class="kapwahl" aria-label="Kapitel wählen">{sel_opts}<option value="alle">Alles auf einer Seite</option></select>
<input class="lernsuche" type="search" placeholder="Im Text suchen …" aria-label="Im Text suchen">
<span class="count"></span>
</div>
<div class="layout">
<aside class="toc"><details open><summary class="tocsum">Inhalt</summary>{''.join(toc)}</details></aside>
<div>
<div class="doc" data-lernen>{''.join(s[3] for s in sections)}</div>
<div class="pager"></div>
</div>
</div>"""

# ------------------------------------------------------------------ Befehle
bef = open(f"{SRC}/befehle.html").read()
bef = re.sub(r"^.*?(?=<p><strong>So liest)", "", bef, flags=re.S)
bef = re.split(r"<h2>Quellen</h2>", bef)[0]
intro, *topics = re.split(r"(?=<h2>)", bef)


def pre_blank_lines(s):
    def f(m):
        lines = m.group(1).split("\n")
        out = []
        for i, l in enumerate(lines):
            if i and l.startswith(";"):
                out.append("")
            out.append(l)
        return "<pre><code>" + "\n".join(out) + "</code></pre>"
    return re.sub(r"<pre><code>(.*?)</code></pre>", f, s, flags=re.S)


def table_rows(tab, default_kap=None, kap_col=True):
    """Zeilen einer Tabelle als Filter-Einträge markieren; Kap.-Spalte als Badges."""
    head = re.search(r"<thead>.*?</thead>", tab, re.S)
    ths = re.findall(r"<th>(.*?)</th>", head.group(0)) if head else []
    has_kap = bool(ths) and ths[-1].strip().startswith("Kap")

    def row(m):
        cells = re.findall(r"<td>(.*?)</td>", m.group(0), re.S)
        cells = [tidy_inline(c) for c in cells]
        if has_kap:
            nums = kap_nums(cells[-1]); cells[-1] = badges(nums)
        else:
            nums = default_kap or []
        k = " ".join(map(str, nums))
        return f'<tr class="fi" data-kap="{k}">' + "".join(f"<td>{c}</td>" for c in cells) + "</tr>"
    tab = re.sub(r"<tr>(?:(?!</tr>).)*<td>.*?</tr>", row, tab, flags=re.S)
    return f'<div class="tablewrap">{tab}</div>'


topic_html, chips = [], []
for t in topics:
    hm = re.match(r"<h2>(.*?)</h2>", t)
    name = hm.group(1); tid = "thema-" + slug(name)
    body = pre_blank_lines(t[hm.end():])
    body = re.sub(r"<table>.*?</table>",
                  lambda m: table_rows(m.group(0), default_kap=[3] if "Entsteht automatisch" in m.group(0) else None),
                  body, flags=re.S)
    body = re.sub(r"<p>(.*?)</p>", lambda m: "<p>" + tidy_inline(m.group(1)) + "</p>", body, flags=re.S)
    topic_html.append(f'<section class="fg" id="{tid}"><h2>{name}</h2>{body}</section>')
    chips.append(f'<a class="chip" href="#{tid}">{re.sub(r" ?[(].*", "", name)}</a>')
intro = re.sub(r"<table>.*?</table>", lambda m: '<div class="tablewrap">' + re.sub(r"<td>(.*?)</td>", lambda c: "<td>" + tidy_inline(c.group(1)) + "</td>", m.group(0)) + "</div>", intro, flags=re.S)
intro = intro.replace("<td>Teachpacks , <code>image.rkt universe.rkt</code></td>", "<td>Teachpacks <code>image.rkt</code>, <code>universe.rkt</code></td>")
befehle_body = f"""
<h1 class="page-title">Befehlssammlung</h1>
<p class="lead">Alle Befehle der Lehrsprachen auf einen Blick. Filtere nach Kapitel – „bis Kapitel“ zeigt alles, was du bis dahin kennen solltest. Taste <code>/</code> springt in die Suche.</p>
<details class="loesung" style="border-left-color:var(--accent)"><summary style="color:var(--accent)">Sprachebenen und Teachpacks</summary>{tidy_inline(intro)}</details>
<div class="filters" data-filter data-one="Befehl" data-many="Befehle">
<input type="search" placeholder="Befehl suchen, z. B. fold oder place-image …" aria-label="Befehl suchen">
{kap_select()}
<div class="seg mode"><button type="button" data-v="nur">nur Kapitel</button><button type="button" data-v="bis">bis Kapitel</button></div>
<span class="count"></span>
<div class="chips">{''.join(chips)}</div>
</div>
<div class="filterscope">{''.join(topic_html)}</div>
<div class="empty">Kein Befehl passt zu deiner Auswahl.</div>
<h2>Quellen</h2>
<ul>
<li><a href="https://docs.racket-lang.org/deinprogramm/index.html">Racket-Doku: Sprachebenen zu „Schreibe Dein Programm!“</a></li>
<li><a href="https://docs.racket-lang.org/teachpack/2htdpimage.html">Racket-Doku: 2htdp/image</a></li>
<li><a href="https://github.com/deinprogramm/schreibe-dein-programm">Buch-Quelltext „Schreibe Dein Programm!“ (GitHub, CC BY-SA 4.0)</a></li>
</ul>
<p class="lead">Befehle mit „–“ in der Kapitelspalte kommen im Buch nicht ausdrücklich vor, sind aber in der Sprache verfügbar. Die Beispiele sind nicht in DrRacket getestet.</p>"""

# ------------------------------------------------------------------ Glossar
glo = open(f"{SRC}/glossar.html").read()
letters = re.findall(r"<h3>(.*?)</h3>\s*(<table>.*?</table>)", glo, re.S)
g_html, l_nav = [], []
for L, tab in letters:
    lid = f"buchstabe-{L}"
    tab = tab.replace("check- expect", "check-expect").replace("<table>", '<table class="glo"><colgroup><col style="width:22%"><col style="width:44%"><col style="width:26%"><col style="width:8%"></colgroup>', 1)
    g_html.append(f'<section class="fg" id="{lid}"><h2>{L}</h2>{table_rows(tab)}</section>')
    l_nav.append(f'<a class="chip" href="#{lid}">{L}</a>')
n_terms = sum(t.count('class="fi"') for t in g_html)
glossar_body = f"""
<h1 class="page-title">Glossar</h1>
<p class="lead">{n_terms} Fachbegriffe aus allen 15 Kapiteln, alphabetisch. Die Zahl hinten sagt, in welchem Kapitel der Begriff erklärt wird.</p>
<div class="filters" data-filter data-one="Begriff" data-many="Begriffe">
<input type="search" placeholder="Begriff suchen …" aria-label="Begriff suchen">
{kap_select()}
<div class="seg mode"><button type="button" data-v="nur">nur Kapitel</button><button type="button" data-v="bis">bis Kapitel</button></div>
<span class="count"></span>
<div class="chips letters">{''.join(l_nav)}</div>
</div>
<div class="filterscope">{''.join(g_html)}</div>
<div class="empty">Kein Begriff passt zu deiner Auswahl.</div>
<p class="lead" style="margin-top:24px">Quellen: <a href="https://directory.doabooks.org/handle/20.500.12854/135869">Sperber/Klaeren: Schreibe Dein Programm! (Tübingen University Press 2023, Open Access, CC BY-SA 4.0)</a> · <a href="https://docs.racket-lang.org/deinprogramm/index.html">Racket-Doku: Sprachebenen zu „Schreibe Dein Programm!“</a></p>"""

# ------------------------------------------------------------------ Fehler
feh = open(f"{SRC}/fehlermeldungen.html").read()
blocks = re.findall(r"<h3>(.*?)</h3>\s*(<table>.*?</table>)", feh, re.S)
f_html = []
for t, tab in blocks:
    n = int(re.match(r"Kapitel (\d+)", t).group(1))
    f_html.append(f'<section class="fg" id="kapitel-{n}"><h2>{t}</h2>'
                  f'<p><a href="lernen.html#kapitel-{n}">→ Kapitel {n} in der Lernübersicht</a></p>'
                  f'{table_rows(tab, default_kap=[n])}</section>')
fehler_body = f"""
<h1 class="page-title">Fehlermeldungen und typische Fehler</h1>
<p class="lead">Wenn DrRacket etwas rot markiert: Meldung ganz lesen, die markierte Stelle ansehen, den Links in der Meldung folgen – und hier im passenden Kapitel nachschlagen. Kopiere am besten ein Stück der Meldung in die Suche.</p>
<div class="filters" data-filter data-one="Fehler" data-many="Fehler">
<input type="search" placeholder="Meldung oder Stichwort, z. B. „nicht definiert“ …" aria-label="Fehler suchen">
{kap_select()}
<div class="seg mode"><button type="button" data-v="nur">nur Kapitel</button><button type="button" data-v="bis">bis Kapitel</button></div>
<span class="count"></span>
</div>
<div class="filterscope">{''.join(f_html)}</div>
<div class="empty">Nichts gefunden. Versuche ein kürzeres Stichwort.</div>
<p class="lead">„(sinngemäß)“ heißt: Der Wortlaut in DrRacket kann leicht abweichen.</p>
<p class="lead">Quellen: <a href="https://directory.doabooks.org/handle/20.500.12854/135869">Sperber/Klaeren: Schreibe Dein Programm! (Tübingen University Press 2023, Open Access, CC BY-SA 4.0)</a> · <a href="https://docs.racket-lang.org/deinprogramm/Testf_lle.html">Racket-Doku: Testfälle (check-expect, check-error …)</a> · <a href="https://docs.racket-lang.org/deinprogramm/Signaturen.html">Racket-Doku: Signaturen</a></p>"""

# ------------------------------------------------------------------ Übungen
ueb = fix_links(open(f"{SRC}/uebungen.html").read())
ueb = strip_head(ueb)
ueb = render_latex(ueb)
uparts = re.split(r"(?=<h2[^>]*>)", ueb)
u_intro, u_secs, u_tail = "", [], ""
task_ids = set()
UEBSUBS = {}
TASKDATA = {}
TASKS_BY_SEC = {}
# Aufgaben, bei denen es kein eindeutiges Ergebnis gibt
from aufgaben_extra import Q as QUIZ, REF_EXTRA
OVERRIDE = {}
_OLD_OVERRIDE = {(1, "B1"): "manual", (1, "C1"): "zeigen", (1, "C2"): "zeigen", (1, "C3"): "zeigen", (1, "C4"): "zeigen",
            (1, "C5"): "zeigen", (1, "D2"): "zeigen", (1, "D4"): "zeigen", (15, "Q4"): "manual"}


def wrap_solutions(chunk):
    # „Lösungen“ bis zum Ende des Abschnitts in <details> packen
    i = chunk.find("<p><strong>Lösungen</strong></p>")
    if i < 0:
        return chunk
    sol = chunk[i + len("<p><strong>Lösungen</strong></p>"):]
    return chunk[:i]  # Lösungen gibt es jetzt pro Aufgabe


for p in uparts:
    m = re.match(r"<h2[^>]*>(.*?)</h2>", p, re.S)
    if not m:
        continue
    title = re.sub(r"<[^>]+>", "", m.group(1))
    km = re.match(r"Kapitel (\d+)", title)
    if not km:
        if title.startswith("So benutzt"):
            u_intro = p[m.end():].replace("Abhaken kannst du erledigte Aufgaben direkt im Dokument (Kästchen vor der Aufgabe).",
                                          "Jede Aufgabe gibst du direkt hier ab. Ist sie richtig, wird sie automatisch als erledigt markiert – dein Browser merkt sich das.")
        else:
            u_tail += f"<h2>{m.group(1)}</h2>" + p[m.end():]
        continue
    n = int(km.group(1))
    rest = p[m.end():]
    # Daten für die Online-Prüfung: gegebener Code + Musterlösung je Aufgabe
    nonsol = re.sub(r"<p><strong>Lösungen</strong></p>.*?(?=<h3|$)", "", rest, flags=re.S)
    given = "\n".join(html.unescape(c) for c in re.findall(r'<pre><code class="language-racket">(.*?)</code></pre>', nonsol, re.S))
    solhtml = "".join(re.findall(r"<p><strong>Lösungen</strong></p>(.*?)(?=<h3|$)", rest, re.S))
    solcode = "\n".join(html.unescape(c) for c in re.findall(r"<pre><code[^>]*>(.*?)</code></pre>", solhtml, re.S))
    segs = {}
    pieces = re.split(r"^;\s*([A-Z]\d+[a-z]?)\b", solcode, flags=re.M)
    for i in range(1, len(pieces), 2):
        segs[pieces[i]] = segs.get(pieces[i], "") + ";" + pieces[i + 1]
    for tid_, code_ in REF_EXTRA.items():
        if tid_.startswith(f"k{n}-"):
            segs[tid_.split("-", 1)[1]] = ";\n" + code_
    quiz_, custom_ = {}, {}
    for tid_, q_ in QUIZ.items():
        if tid_.startswith(f"k{n}-"):
            lab_ = tid_.split("-", 1)[1]
            qq = {k_: v_ for k_, v_ in q_.items() if k_ != "code"}
            if "questions" in qq or "fields" in qq or "explain" in qq:
                quiz_[lab_] = qq
            if "code" in q_:
                custom_[lab_] = q_["code"]
    TASKDATA[n] = {"given": given, "segs": segs, "quiz": quiz_, "custom": custom_}
    subs = re.split(r"(?=<h3[^>]*>)", rest)
    rest = "".join(wrap_solutions(s) if (s.startswith("<h3") or len(subs) == 1) else s for s in subs)

    def task(mm):
        li = mm.group(0)
        lab = re.search(r"<strong>([A-Z]?\d+[a-z]?)\s*(★*)</strong>", li)
        base = f"k{n}-" + (lab.group(1) if lab else str(len(task_ids)))
        tid = base
        while tid in task_ids: tid += "x"
        task_ids.add(tid)
        stars = len(lab.group(2)) if lab else 0
        li = re.sub(r'<li data-checked="[^"]*">', f'<li class="task fi" id="{tid}" data-kap="{n}" data-stars="{stars}" data-label="{lab.group(1) if lab else ""}">', li, count=1)
        li = re.sub(r"<input[^>]*type=\"checkbox\"[^>]*>\s*", '<span class="status" title="offen" aria-label="offen"></span>', li, count=1)
        h = HINTS.get(tid)
        if h:
            sec, tipps = h
            st = SECTITLE.get(sec, "")
            TASKS_BY_SEC.setdefault(sec, []).append((tid, lab.group(1) if lab else tid))
            tl = "".join(f"<li hidden>{html.escape(t)}</li>" for t in tipps)
            box = (f'<div class="hilfen"><a class="chip lernlink" href="lernen.html#{sec}">📖 Nachlesen: {html.escape(st)}</a>'
                   f'<button type="button" class="chip tippbtn" data-total="{len(tipps)}">💡 Tipp anzeigen</button>'
                   f'<ol class="tipps">{tl}</ol></div>')
            li = li.replace("</p>", "</p>" + box, 1)
        return li
    rest = re.sub(r'<li data-checked="[^"]*">.*?</li>', task, rest, flags=re.S)
    rest = re.sub(r"<ul>(?=<li class=\"task)", '<ul class="fg">', rest)
    UEBSUBS[n] = [(hm.group(1), re.sub(r"<[^>]+>", "", hm.group(2)).replace("Abschnitte ", "")) for hm in re.finditer(r'<h3 id="([^"]+)">(.*?)</h3>', rest, re.S)]
    u_secs.append(f'<section class="fg" id="kapitel-{n}"><h2>{m.group(1)} <span class="kapprog" data-kp="{n}"></span></h2>'
                  f'<p><a href="lernen.html#kapitel-{n}">→ Erklärung zu Kapitel {n}</a> · '
                  f'<a href="fehler.html?kap={n}">typische Fehler</a></p>{rest}</section>')

uebungen_body = f"""
<h1 class="page-title">Übungen mit Lösungen</h1>
<p class="lead">{len(task_ids)} Aufgaben, Kapitel für Kapitel. Jede Aufgabe gibst du direkt hier ab – Code prüft ein kleiner Racket-Interpreter im Browser mit den Tests der Musterlösung, Fragen ohne Programmieren beantwortest du per Auswahl oder Eingabefeld. Ist die Abgabe richtig, wird die Aufgabe automatisch als erledigt markiert.</p>
<div class="callout tip"><strong>Ganz neu beim Programmieren?</strong> Lies zuerst <a href="lernen.html#erste-schritte">Erste Schritte</a> und dann das passende Kapitel der Lernübersicht. Unterstrichene Fachwörter kannst du antippen – dann erscheint eine kurze Erklärung. Kommst du nicht weiter, hilft „💡 Tipp“ bei jeder Aufgabe.</div>
<details class="loesung" style="border-left-color:var(--accent)"><summary style="color:var(--accent)">So benutzt du die Aufgaben</summary>{u_intro}</details>
<div class="filters" data-filter data-single data-one="Aufgabe" data-many="Aufgaben">
<select class="kap" aria-label="Kapitel">{''.join(f'<option value="{i}">Kapitel {i}: {CHAP_SHORT.get(i, "")}</option>' for i in range(1, 16))}<option value="0">Alle Kapitel auf einer Seite</option></select>
<input type="search" placeholder="Aufgabe suchen …" aria-label="Aufgabe suchen">
<div class="seg stars"><button type="button" data-v="">alle</button><button type="button" data-v="1">★</button><button type="button" data-v="2">★★</button><button type="button" data-v="3">★★★</button></div>
<label style="font-size:14px"><input type="checkbox" class="openonly"> nur offene</label>
<span class="curprog"></span>
<button type="button" class="chip resetkap" title="Alle Abgaben und Häkchen dieses Kapitels löschen">↺ Kapitel zurücksetzen</button>
<span class="count"></span>
</div>
<div class="layout">
<aside class="toc"><details open><summary class="tocsum">Kapitel</summary>
<div class="progwrap"><div class="progress" title="Fortschritt gesamt"><div></div></div><span class="progtxt"></span></div>
{''.join(f'<a href="?kap={i}" class="kaplink" data-kap="{i}"><span>{i}. {html.escape(CHAP_SHORT.get(i, ""))}{' <span class="optbadge">optional</span>' if i in EXKURS else ''}</span><span class="kp" data-kp="{i}"></span></a>' + ''.join(f'<a href="#{hid}" class="kaplink sub" data-kap="{i}" data-target="{hid}"><span>{html.escape(ht)}</span></a>' for hid, ht in UEBSUBS.get(i, [])) for i in range(1, 16))}
<a href="?kap=0" class="kaplink" data-kap="0"><span>Alle Kapitel</span></a>
</details></aside>
<div>
<div class="filterscope">{''.join(u_secs)}</div>
<div class="empty">Keine Aufgabe passt zu deiner Auswahl.</div>
<div class="pager uebpager"></div>
</div>
</div>
{u_tail}
<script type="application/json" id="aufgaben-daten">{json.dumps({"kap": TASKDATA, "lern": LERNCODE}, ensure_ascii=False).replace("</", "<\\/").replace("nonempty-list-of", "cons-list-of")}</script>
<script src="assets/js/racket.js"></script>
<script src="assets/js/pruefer.js"></script>
<script src="assets/js/editor.js"></script>
<script src="assets/js/uebungen.js"></script>"""

# ------------------------------------------------------------------ Startseite
CHAPDESC = {}
for _sid, _t, _n, _h, _subs in sections:
    if _n:
        _m = re.search(r"</div>\s*<p>(.*?)</p>", _h, re.S) or re.search(r"<p>(.*?)</p>", _h, re.S)
        _txt = html.unescape(re.sub(r"<[^>]+>", "", _m.group(1))) if _m else ""
        _first = re.split(r"(?<=[.!?])\s", _txt)[0]
        CHAPDESC[_n] = _first if len(_first) < 170 else _first[:165].rsplit(" ", 1)[0] + " …"
kapitems = "".join(
    f'<div class="kapitem" role="button" tabindex="0" aria-expanded="false"><div class="kh"><span class="knum">{n}</span>'
    f'<span class="t">{html.escape(CHAP_SHORT[n])}{' <span class="optbadge">optional</span>' if n in EXKURS else ''}</span><span class="chev" aria-hidden="true">▾</span></div>'
    f'<p class="kd">{html.escape(CHAPDESC.get(n, ""))}</p><div class="l">'
    f'<a class="chip" href="lernen.html#kapitel-{n}">📖 Erklärung</a>'
    f'<a class="chip" href="uebungen.html?kap={n}">✎ Übungen</a>'
    f'<a class="chip" href="befehle.html?kap={n}">⌘ Befehle</a>'
    f'<a class="chip" href="glossar.html?kap={n}">Aa Begriffe</a>'
    f'<a class="chip" href="fehler.html?kap={n}">⚠ Fehler</a></div></div>' for n in sorted(CHAP))
index_body = f"""
<div class="hero">
<div class="hero-text">
<h1>Racket lernen mit „Schreibe Dein Programm!“</h1>
<p class="lead">Programmieren lernen, Schritt für Schritt und mit Beispielen, die du sofort im Browser ausprobierst. Für DrRacket mit der Sprachebene „Schreibe Dein Programm!“ und den Teachpacks <code>image.rkt</code> und <code>universe.rkt</code> – ohne Vorkenntnisse und auch ohne das Buch.</p>
<div class="hero-cta"><a class="btn" href="lernen.html#erste-schritte">Mit den ersten Schritten anfangen</a><a class="btn ghost" href="playground.html">Playground öffnen</a></div>
</div>
<figure class="rechnung spielt" style="--n:3" aria-label="Beispiel: So rechnet Racket den Ausdruck (verdoppeln (+ 1 2)) Schritt für Schritt aus">
<div class="r-bar"><span class="r-file">verdoppeln.rkt</span><span class="r-lvl">Schreibe Dein Programm!</span><span class="r-start">Start ▶</span></div>
<pre class="r-def"><code class="language-racket">(define verdoppeln
  (lambda (x)
    (* 2 x)))</code></pre>
<div class="r-int"><ol>
<li style="--i:0"><span class="eq">&gt;</span><code>(verdoppeln <mark>(+ 1 2)</mark>)</code></li>
<li style="--i:1"><span class="eq">=</span><code><mark>(verdoppeln 3)</mark></code></li>
<li style="--i:2"><span class="eq">=</span><code><mark>(* 2 3)</mark></code></li>
<li style="--i:3"><span class="eq">=</span><code><span class="ergebnis">6</span></code></li>
</ol></div>
<figcaption><span>Grün markiert ist der Teil, den Racket als Nächstes ausrechnet – so zeigt es auch der Stepper im <a href="playground.html">Playground</a>.</span><button type="button" class="r-replay">Nochmal</button></figcaption>
</figure>
</div>
<div class="cards">
<a class="card" href="lernen.html"><div class="ic">λ</div><h3>Lernübersicht</h3><p>Alle Erklärungen, Kapitel für Kapitel</p></a>
<a class="card" href="befehle.html"><div class="ic">( )</div><h3>Befehle</h3><p>Syntax und Beispiel, filterbar nach Kapitel</p></a>
<a class="card" href="glossar.html"><div class="ic">Aa</div><h3>Glossar</h3><p>{n_terms} Begriffe von A bis Z</p></a>
<a class="card" href="fehler.html"><div class="ic">!</div><h3>Fehlermeldungen</h3><p>Was die Meldung bedeutet und wie du sie behebst</p></a>
<a class="card" href="uebungen.html"><div class="ic">✓</div><h3>Übungen</h3><p>{len(task_ids)} Aufgaben mit Tipps und Online-Prüfung</p></a>
<a class="card" href="playground.html"><div class="ic">▶</div><h3>Playground</h3><p>Befehle direkt im Browser ausprobieren</p></a>
</div>
<h2>Kapitel für Kapitel</h2>
<p class="lead">Klick auf ein Kapitel, um Erklärung, Übungen, Befehle, Begriffe und Fehler dazu zu öffnen. So lernst du am besten: Erklärung lesen, die Beispiele in DrRacket abtippen und verändern, dann die Übungen lösen.</p>
<div class="kaplist">{kapitems}</div>
<h2>Ganz neu? So fängst du an</h2>
<ol class="pfad">
<li><a href="lernen.html#erste-schritte"><strong>Erste Schritte lesen</strong></a><span>Was Programmieren ist, wie Racket aussieht, was Klammern bedeuten – ohne Vorwissen, in etwa 30 Minuten.</span></li>
<li><a href="lernen.html#erste-schritte-installieren"><strong>DrRacket installieren und einstellen</strong></a><span>Schritt für Schritt mit Bild. Bis dahin kannst du alles im <a href="playground.html">Playground</a> ausprobieren.</span></li>
<li><a href="lernen.html#kapitel-1"><strong>Kapitel 1 durcharbeiten</strong></a><span>Lesen, bei jedem Beispiel auf „▶ Im Playground ausprobieren“ klicken und etwas verändern.</span></li>
<li><a href="uebungen.html?kap=1"><strong>Übungen zu Kapitel 1 lösen</strong></a><span>Abgeben, Rückmeldung lesen, verbessern. Richtige Aufgaben werden automatisch abgehakt.</span></li>
<li><strong>Nächstes Kapitel</strong><span>So geht es weiter bis Kapitel 13. Kapitel 8, 14 und 15 sind <span class="optbadge">optional</span> – Exkurse in Mathe und Theorie, die du überspringen kannst.</span></li>
</ol>
<p><strong>Zum Nachschlagen:</strong> <a href="befehle.html">Befehle</a> (was macht <code>above</code>?), <a href="glossar.html">Glossar</a> (was heißt „Signatur“?) und <a href="fehler.html">Fehlermeldungen</a> (was will DrRacket von mir?). In der Lernübersicht kannst du unterstrichene Fachwörter antippen.</p>
<p><strong>Tipp:</strong> Lies nicht nur – tippe die Beispiele selbst ab (nicht kopieren!), führe sie aus und verändere sie. Fehler sind normal und gehören dazu. So lernt man Programmieren am schnellsten.</p>"""

# ------------------------------------------------------------------ Einstellungen (gespeichert nur im eigenen Browser, angewendet von sdpApply im <head>)
_ACC = [("", "Racket-Blau"), ("#0f7c86", "Türkis"), ("#2f7d32", "Grün"), ("#7b3fb5", "Lila"), ("#c4262e", "Racket-Rot"), ("#b85a12", "Orange"), ("#4a5466", "Graphit")]
einstellungen_body = f"""
<h1 class="page-title">Einstellungen</h1>
<p class="lead">Passe die Seite an dich an. Die Einstellungen gelten für alle Seiten und werden nur in deinem Browser gespeichert.</p>
<div class="settings doc">
<h3>Design</h3>
<div class="seg" data-set="sdp-theme"><button type="button" data-v="">Wie System</button><button type="button" data-v="light">Hell</button><button type="button" data-v="dark">Dunkel</button></div>
<h3>Akzentfarbe</h3>
<p class="hint">Farbe für Links, Knöpfe, Markierungen und die hellen Flächen.</p>
<div class="swatches" data-set="sdp-accent">{"".join(f'<button type="button" data-v="{v}" style="--c:{v or '#3e5ba9'}" title="{n}" aria-label="{n}"></button>' for v, n in _ACC)}<label class="custom" title="Eigene Farbe">Eigene: <input type="color" value="#3e5ba9" aria-label="Eigene Akzentfarbe"></label></div>
<h3>Schriftgröße</h3>
<div class="seg" data-set="sdp-font"><button type="button" data-v="0.9">Klein</button><button type="button" data-v="">Normal</button><button type="button" data-v="1.12">Groß</button><button type="button" data-v="1.25">Sehr groß</button></div>
<h3>Animationen</h3>
<div class="seg" data-set="sdp-motion"><button type="button" data-v="">An</button><button type="button" data-v="off">Aus</button></div>
<h3>Zurücksetzen</h3>
<p><button type="button" class="chip" data-reset="design">Einstellungen auf Standard</button> <button type="button" class="chip" data-reset="all">Alle gespeicherten Daten löschen</button></p>
<p class="hint">„Alle gespeicherten Daten löschen“ entfernt auch deinen Fortschritt, deinen Code und deine Antworten bei den Übungen und im Playground.</p>
</div>"""

# ------------------------------------------------------------------ Playground
playground_body = """
<h1 class="page-title">Playground</h1>
<p class="lead">Programmiere direkt im Browser – fast wie in DrRacket: mit Sprachebene, Signaturprüfung, Stepper, Tests, Bildern und Animationen (<code>big-bang</code>, <code>universe</code>). <strong>Ausführen</strong> (oder Strg+Enter) zeigt die Ergebnisse, Bilder und Testergebnisse; in der Zeile mit „&gt;“ kannst du danach weitere Ausdrücke eintippen wie im Interaktionsfenster. Schon beim Tippen erscheinen passende Befehle als Vorschlag – mit <kbd>Tab</kbd> übernimmst du den markierten. Fehler wie fehlende Klammern, unbekannte Befehle oder fehlende Angaben werden schon beim Tippen rot unterstrichen.</p>
<div class="pg">
<div class="pg-left">
<div class="pg-bar">
<button type="button" id="pg-run" class="pg-run">▶ Ausführen</button><span class="kbd">Strg+Enter</span>
<button type="button" id="pg-step" class="chip" title="Auswertung Schritt für Schritt ansehen – wie der Stepper in DrRacket">👣 Stepper</button>
<select id="pg-level" aria-label="Sprachebene" title="Sprachebene wie in DrRacket unter Sprache → Sprache auswählen…"><option value="beginner">Schreibe Dein Programm! – Anfänger</option><option value="vanilla" selected>Schreibe Dein Programm!</option><option value="advanced">Schreibe Dein Programm! – fortgeschritten</option></select>
<select id="pg-ex" aria-label="Beispiel laden"><option value="">Beispiel laden …</option></select>
<button type="button" id="pg-share" class="chip">🔗 Link teilen</button>
<button type="button" id="pg-dl" class="chip" title="Programm als .rkt-Datei speichern – lässt sich in DrRacket öffnen">⬇ Herunterladen</button>
<button type="button" id="pg-open" class="chip" title="Eine .rkt-Datei von deinem Gerät in den Playground laden">📂 Öffnen</button>
<button type="button" id="pg-img" class="chip" title="Ein Bild (PNG, JPG, GIF …) von deinem Gerät einfügen – wie Einfügen → Bild einfügen… in DrRacket">🖼 Bild einfügen</button>
<input type="file" id="pg-imgfile" accept="image/*" hidden>
<input type="file" id="pg-file" accept=".rkt,.scm,.txt,text/plain" hidden>
<button type="button" id="pg-clear" class="chip">Leeren</button>
</div>
<textarea id="pg-code" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Racket-Code"></textarea>
</div>
<div class="pg-right">
<div class="pg-outhead">Ausgabe</div>
<div id="pg-anim" hidden></div>
<div id="pg-out" aria-live="polite"></div>
<div class="pg-replrow"><span>&gt;</span><input id="pg-repl" type="text" spellcheck="false" autocomplete="off" placeholder="Ausdruck eintippen und Enter drücken, z. B. (* 6 7)" aria-label="Ausdruck auswerten"></div>
</div>
</div>
<div id="pg-stepper" class="st-overlay" hidden role="dialog" aria-modal="true" aria-label="Stepper">
<div class="st-panel">
<div class="st-head"><strong>👣 Stepper</strong><span class="st-form"></span><button type="button" class="chip st-close" aria-label="Stepper schließen">✕ Schließen</button></div>
<div class="st-ctrl"><button type="button" class="chip st-first" title="Zum Anfang (Pos1)">⏮</button><button type="button" class="chip st-prev" title="Schritt zurück (←)">◀ Zurück</button><span class="st-pos"></span><button type="button" class="chip st-next" title="Nächster Schritt (→)">Weiter ▶</button><button type="button" class="chip st-last" title="Zum Ende (Ende)">⏭</button></div>
<div class="st-note"></div>
<div class="st-panes"><div><div class="st-label">vorher</div><pre class="st-before"></pre></div><div><div class="st-label">nachher</div><pre class="st-after"></pre></div></div>
</div></div>
<details class="loesung" style="border-left-color:var(--accent);margin-top:22px"><summary style="color:var(--accent)">Was geht hier – und was nicht?</summary>
<ul>
<li><strong>Sprachebene</strong> oben wählen wie in DrRacket: „Anfänger“ (Kapitel 1–5), „Schreibe Dein Programm!“ (ab Kapitel 6, mit Listen und <code>let</code>) oder „fortgeschritten“ (mit Symbolen, <code>'</code>, <code>begin</code>, <code>apply</code> und Restparametern). Was es in der gewählten Ebene nicht gibt, wird wie in DrRacket abgelehnt – mit Hinweis, ab welcher Ebene es geht.</li>
<li>Alles aus den Lehrsprachen: <code>define</code>, <code>lambda</code>, <code>cond</code>, <code>if</code>, <code>and</code>/<code>or</code>, <code>let</code>/<code>let*</code>/<code>letrec</code>, <code>define-record</code> (auch mit Signatur-Parametern), <code>define-singleton</code>, <code>match</code>, Signaturen (<code>signature</code>, <code>enum</code>, <code>mixed</code>, <code>predicate</code>, <code>combined</code>, <code>list-of</code>, <code>cons-list-of</code>, <code>integer-from-to</code>, Signatur-Variablen wie <code>%a</code>), exakte Brüche, alle Zahlen-, Zeichenketten- und Listenfunktionen der Doku sowie <code>write-string</code>, <code>write-newline</code> und <code>read</code>.</li>
<li><strong>Signaturen werden geprüft</strong> wie in DrRacket: Passt ein Argument, ein Ergebnis oder ein Record-Feld nicht zur Signatur, erscheint eine Signaturverletzung mit Zeile – das Programm läuft trotzdem weiter.</li>
<li>Tests: <code>check-expect</code>, <code>check-within</code>, <code>check-member-of</code>, <code>check-range</code>, <code>check-satisfied</code>, <code>check-error</code> (auch mit erwarteter Meldung) und <code>check-property</code> mit <code>for-all</code>, <code>==&gt;</code>, <code>expect</code>, <code>expect-within</code>, <code>expect-member-of</code>, <code>expect-range</code>.</li>
<li><strong>Bilder</strong> aus <code>image.rkt</code>: Formen (<code>square</code>, <code>circle</code>, <code>star-polygon</code>, <code>radial-star</code>, <code>rhombus</code>, <code>wedge</code>, <code>triangle/sss</code> …), Text (<code>text</code>, <code>text/font</code>), Kombinieren (<code>above</code>, <code>beside</code>, <code>overlay</code>, <code>underlay</code> samt <code>/align</code>, <code>/offset</code>, <code>/xy</code>), Szenen (<code>empty-scene</code>, <code>place-image</code>, <code>place-images</code>, <code>scene+line</code>, <code>add-line</code>, <code>put-image</code>), Verändern (<code>scale</code>, <code>scale/xy</code>, <code>rotate</code>, <code>flip-…</code>, <code>crop</code>, <code>frame</code>) – die <a href="befehle.html#thema-bilder-teachpack-image-rkt">Befehlssammlung</a> erklärt die wichtigsten.</li>
<li><strong>Animationen</strong> aus <code>universe.rkt</code>: <code>big-bang</code> mit <code>to-draw</code>, <code>on-tick</code> (auch mit Tempo und Grenze), <code>on-key</code>, <code>on-release</code>, <code>on-mouse</code>, <code>stop-when</code> und <code>check-with</code> sowie <code>animate</code>. Die Animation läuft oben in der Ausgabe; klick ins Bild, damit Tasten ankommen. Mit „Stopp“ hältst du sie an, dann siehst du den Endzustand.</li>
<li><kbd>Tab</kbd> und Vorschläge beim Tippen vervollständigen Befehle und deine eigenen Namen (ƒ = eingebaute Funktion, { } = Sonderform wie <code>define</code>, T = Signatur, abc = selbst definiert). ↑/↓ wählt, Tab oder nach ↑/↓ auch Enter übernimmt, Esc schließt.</li>
<li>Schon beim Tippen markiert: fehlende oder überzählige Klammern, nicht geschlossene Zeichenketten, unbekannte Befehle (mit Vorschlag bei Tippfehlern), Befehle aus einer anderen Sprachebene, zu wenige oder zu viele Angaben, leere Klammern und Werte an der Stelle eines Befehls. Ein Klick auf die Meldung springt zur Stelle.</li>
<li>Der Code bleibt in deinem Browser gespeichert. „Link teilen“ erzeugt einen Link mit Code und Sprachebene; „⬇ Herunterladen“ speichert eine <code>.rkt</code>-Datei für DrRacket (<em>Datei → Öffnen…</em>, vorher Sprachebene und Teachpacks wie in der Datei angegeben einstellen), „📂 Öffnen“ lädt eine <code>.rkt</code>-Datei – auch eine, die DrRacket gespeichert hat; die Sprachebene wird dann übernommen.</li>
<li><strong>👣 Stepper</strong> wie in DrRacket: zeigt Schritt für Schritt, wie Racket rechnet (Substitutionsmodell) – links „vorher“ mit dem markierten Teil, der als Nächstes ausgerechnet wird, rechts „nachher“. Mit ← und → blätterst du. Funktionen mit internen Definitionen und Restparametern rechnet er in einem Schritt aus.</li>
<li><strong>Bilder aus Dateien:</strong> „🖼 Bild einfügen“ fügt ein Bild von deinem Gerät als <code>(bitmap "name.png")</code> ein – wie <em>Einfügen → Bild einfügen…</em> in DrRacket. Es bleibt in deinem Browser gespeichert; beim Herunterladen kommt es als eigene Datei mit (in denselben Ordner wie die <code>.rkt</code>-Datei legen). <code>bitmap/url</code> lädt ein Bild von einer Adresse, <code>image-&gt;color-list</code> und <code>color-list-&gt;bitmap</code> zerlegen bzw. bauen Bilder aus Farben.</li>
<li><strong>universe:</strong> Ein Server (<code>universe</code> mit <code>on-new</code>, <code>on-msg</code>, <code>on-tick</code>, <code>on-disconnect</code>, <code>to-string</code>) und mehrere Welten (<code>big-bang</code> mit <code>register</code>, <code>name</code>, <code>on-receive</code>, <code>make-package</code>) laufen gleichzeitig nebeneinander in der Ausgabe; Nachrichten (<code>make-mail</code>, <code>make-bundle</code>) siehst du im Protokoll des Servers. Statt über das Netz laufen alle Welten in diesem Browserfenster.</li>
<li><strong>Komplexe Zahlen</strong> wie <code>3+4i</code> und <code>(sqrt -1)</code> mit <code>real-part</code>, <code>imag-part</code>, <code>magnitude</code>, <code>angle</code>, <code>make-polar</code>.</li>
<li>Das ist ein Nachbau im Browser – im Zweifel gilt, was DrRacket sagt. Mit „Link teilen“ werden eingefügte Bilder nicht mitgeschickt.</li>
</ul></details>
<script src="assets/js/racket.js"></script>
<script src="assets/js/pruefer.js"></script>
<script src="assets/js/editor.js"></script>
<script src="assets/js/stepper.js"></script>
<script src="assets/js/playground.js"></script>"""

# ------------------------------------------------------------------ Schreiben
# Lernübersicht: zu jedem Abschnitt die passenden Übungen verlinken
def _add_ueb(m):
    sec = m.group(1); ts = TASKS_BY_SEC.get(sec)
    if not ts:
        return m.group(0)
    k = re.match(r"kapitel-(\d+)", sec).group(1)
    links = " ".join(f'<a class="chip" href="uebungen.html?kap={k}#{tid}">{lab}</a>' for tid, lab in ts)
    return m.group(0) + f'<div class="uebdazu"><span>✎ Übungen dazu:</span> {links}</div>'
lernen_body = re.sub(r'<h3 id="([^"]+)">.*?</h3>', _add_ueb, lernen_body, flags=re.S)
def _dedupe_quellen(m):
    sec = m.group(0); seen = set()
    def li_sub(mm):
        href = re.search(r'href="([^"]+)"', mm.group(0))
        if not href: return mm.group(0)
        if href.group(1) in seen: return ""
        seen.add(href.group(1)); return mm.group(0)
    sec = re.sub(r"<li>.*?</li>", li_sub, sec, flags=re.S)
    return re.sub(r"<ul>\s*</ul>", "", sec)
lernen_body = re.sub(r'<section class="kapitel" id="quellen".*?</section>', _dedupe_quellen, lernen_body, count=1, flags=re.S)
_GT = beginner.glossary_terms(glossar_body)
lernen_body = beginner.add_glossary(lernen_body, _GT)
uebungen_body = beginner.add_glossary(uebungen_body, _GT, r'<li class="task')
print("Glossar-Begriffe für Tooltips:", len(_GT), "Markierungen:", lernen_body.count('class="gl"'), "+", uebungen_body.count('class="gl"'))
pages = [("index.html", "Start", index_body, False), ("lernen.html", "Lernübersicht", lernen_body, True),
         ("befehle.html", "Befehle", befehle_body, False), ("glossar.html", "Glossar", glossar_body, False),
         ("fehler.html", "Fehlermeldungen", fehler_body, False), ("uebungen.html", "Übungen", uebungen_body, False), ("playground.html", "Playground", playground_body, False),
         ("einstellungen.html", "Einstellungen", einstellungen_body, False)]
def _fix_sig(t):
    return t.replace("nonempty-list-of", "cons-list-of")
pages = [(fn, t, _fix_sig(b), kx) for fn, t, b, kx in pages]
# Racket-Code einfärben (src/highlight.js nutzt dieselbe Zerlegung wie der Editor im Playground)
_CODE_RX = re.compile(r'(<pre[^>]*>)<code class="language-racket">(.*?)</code></pre>', re.S)
def _highlight_pages(pgs):
    blocks = []
    for _fn, _t, b, _kx in pgs:
        blocks += [m.group(2) for m in _CODE_RX.finditer(b)]
    plain = [html.unescape(x) for x in blocks if "<" not in x]
    r = subprocess.run(["node", os.path.join(HERE, "highlight.js")], input=json.dumps(plain), capture_output=True, text=True, check=True)
    colored = dict(zip(plain, json.loads(r.stdout)))
    def sub(m):
        if "<" in m.group(2): return m.group(0)
        return m.group(1) + '<code class="language-racket">' + colored[html.unescape(m.group(2))] + "</code></pre>"
    return [(fn, t, _CODE_RX.sub(sub, b), kx) for fn, t, b, kx in pgs]
pages = _highlight_pages(pages)
def _ver(path):
    return hashlib.md5(open(path, "rb").read()).hexdigest()[:8]
ASSETS = ["css/style.css", "favicon.svg"] + ["js/" + j + ".js" for j in ("app", "racket", "pruefer", "uebungen", "editor", "stepper", "playground")]
_assets = {a: _ver(f"{OUT}/assets/{a}") for a in ASSETS}
def _bust(htmltext):
    for a, v in _assets.items():
        htmltext = htmltext.replace(f'assets/{a}"', f'assets/{a}?v={v}"')
    return htmltext
for fn, t, b, kx in pages:
    open(f"{OUT}/{fn}", "w").write(_bust(page(fn, t, b, kx)))
# „Ausprobieren“-Knöpfe entfernen, deren Code im Playground nicht läuft (CHECKV=-v zeigt die Gründe)
_ct = subprocess.run(["node", os.path.join(HERE, "check_try.js"), f"{OUT}/lernen.html", os.environ.get("CHECKV", "")], capture_output=True, text=True)
print(_ct.stdout.strip() or _ct.stderr.strip())
open(f"{OUT}/.nojekyll", "w").write("")
print("Kapitel:", len(CHAP), "Abschnitte:", len(sections), "Begriffe:", n_terms, "Aufgaben:", len(task_ids))
for fn, *_ in pages:
    print(fn, os.path.getsize(f"{OUT}/{fn}"))
