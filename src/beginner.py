# Einsteigerhilfen: Ausprobieren-Knöpfe an Codebeispielen und antippbare Fachwörter.
import re, html, base64


def _strip(code):
    """Strings und Kommentare entfernen (für die Symbolsuche)."""
    code = re.sub(r'"(?:\\.|[^"\\])*"', '""', code)
    return re.sub(r";[^\n]*", "", code)


def top_forms(code):
    out, depth, start, i, n = [], 0, None, 0, len(code)
    while i < n:
        c = code[i]
        if c == '"':
            i += 1
            while i < n and code[i] != '"':
                i += 2 if code[i] == "\\" else 1
        elif c == ";":
            while i < n and code[i] != "\n":
                i += 1
            continue
        elif c in "([":
            if depth == 0:
                start = i
            depth += 1
        elif c in ")]":
            depth -= 1
            if depth == 0 and start is not None:
                out.append(code[start:i + 1]); start = None
            if depth < 0:
                return None
        i += 1
    return out if depth == 0 else None


def def_name(form):
    m = re.match(r"\(define\s+([^\s()\[\]]+)", form)
    if m:
        return [m.group(1)]
    m = re.match(r"\(define-record\s+\(?([^\s()]+)\)?\s+([^\s()]+)((?:\s+[^\s()]+)?)", form)
    if m:
        names = [m.group(1), m.group(2)] + ([m.group(3).strip()] if m.group(3).strip() else [])
        names += re.findall(r"\(\s*([^\s()]+)\s+[^()]*?\)", form[m.end():])
        return names
    return []


def symbols(code):
    return set(re.findall(r"[^\s()\[\]\"';`]+", _strip(code)))


def pg_level(code):
    """Sprachebene für den Playground schätzen: fortgeschritten bei Symbolen/quote, sonst „Schreibe Dein Programm!“."""
    bare = _strip(code)
    bare = re.sub(r'"(?:[^"\\]|\\.)*"', '""', bare)
    if re.search(r"'|\(quote\b|\bsymbol[?=]|string->symbol|symbol->string|\(begin\b|\(apply\b|\(eq\?|\s\.\s", bare):
        return "advanced"
    return "vanilla"


def pg_link(code):
    code = code.replace("nonempty-list-of", "cons-list-of")
    return "playground.html#code=" + base64.b64encode(code.encode("utf-8")).decode("ascii") + "&amp;lvl=" + pg_level(code)


import json as _json, os as _os, subprocess as _sp
# eingebaute Namen direkt aus dem Interpreter holen (assets/js/racket.js)
_RACKET = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "assets", "js", "racket.js")
BUILTINS = set(_json.loads(_sp.run(["node", "-e", "const M=require(process.argv[1]);console.log(JSON.stringify([...new M.Interp().global.vars.keys()]))", _RACKET], capture_output=True, text=True, check=True).stdout))


def add_try_buttons(sec_html):
    """Hängt an jedes Racket-Beispiel einen Knopf; frühere Definitionen des Kapitels werden mitgegeben."""
    known = []  # (namen, quelltext)

    def repl(m):
        code = html.unescape(m.group(1))
        forms = top_forms(code)
        bare = _strip(code)
        if forms is None or not forms or "..." in bare or "…" in bare or "|" in bare:
            if forms:
                for f in forms:
                    if def_name(f): known.append((def_name(f), f))
            return m.group(0)
        own = set(n for f in forms for n in def_name(f))
        need, used = [], symbols(code)
        changed = True
        while changed:
            changed = False
            for names, src in reversed(known):
                if any(nm in used for nm in names) and not any(nm in own for nm in names) and src not in need:
                    need.insert(0, src); used |= symbols(src); changed = True
        # Reihenfolge wie im Kapitel; je Name nur die letzte Definition; keine eingebauten Namen überschreiben
        last = {}
        for names, src in known:
            if src in need and not any(nm in BUILTINS for nm in names):
                for nm in names: last[nm] = src
        keep = set(last.values())
        # Definitionen, die auf weggelassene (mit eingebauten kollidierende) Definitionen verweisen, auch weglassen
        dropped = set(nm for names, src in known if src in need and src not in keep for nm in names if nm not in BUILTINS)
        changed = True
        while changed and dropped:
            changed = False
            for names, src in known:
                if src in keep and symbols(src) & dropped:
                    keep.discard(src); dropped |= set(names); changed = True
        need = []
        for _, src in known:
            if src in keep and src not in need: need.append(src)
        full = ("; aus früheren Beispielen dieses Kapitels:\n" + "\n".join(need) + "\n\n" if need else "") + code
        for f in forms:
            if def_name(f): known.append((def_name(f), f))
        return (f'<div class="example">{m.group(0)}<a class="trybtn" href="{pg_link(full)}">▶ Im Playground ausprobieren</a></div>')
    return re.sub(r'<pre><code class="language-racket">(.*?)</code></pre>', repl, sec_html, flags=re.S)


# ---------------------------------------------------------------- Fachwörter
SKIP_TERMS = {"Bild", "Feld", "Welt", "Index", "Tiefe", "Modus", "Tick", "Test (check-expect)", "Symbol", "Literal", "Kommentar",
              "Zweig", "Modell", "Variable", "Definition", "Funktion", "Argument", "Parameter", "Bedingung", "Rumpf", "Kontext",
              "Restliste", "leere Liste", "Daten / Information", "DrRacket", "Teachpack", "Nachfolger", "Vorgänger",
              "Operand", "Operator", "Komponente", "Ansicht (View)", "Basis / Exponent", "frei / gebunden", "Grammatik", "Compiler",
              "Rotation", "Normalform", "Redex", "Environment", "Dump", "Closure", "Halbgruppe / Monoid", "Homomorphismus", "Inverse (Umkehrfunktion)",
              "Eingebaute Funktion", "disjunkt", "iterativ", "polymorph", "falsifizierbar", "Tick"}


def glossary_terms(glossar_html):
    terms = []
    for row in re.findall(r'<tr class="fi"[^>]*>(.*?)</tr>', glossar_html, re.S):
        cells = re.findall(r"<td>(.*?)</td>", row, re.S)
        if len(cells) < 2:
            continue
        name = html.unescape(re.sub(r"<[^>]+>", "", cells[0])).strip()
        if name in SKIP_TERMS or "`" in name or re.search(r"[α-ω]", name):
            continue
        if "<code>" in cells[0]:
            continue
        mean = html.unescape(re.sub(r"<[^>]+>", "", cells[1])).strip()
        mean = re.sub(r"\s*\(Kap\. \d+\)", "", mean)
        mean = re.sub(r"(\w)- ([A-ZÄÖÜ])", r"\1-\2", mean)
        variants = [v.strip() for v in re.split(r"\s*/\s*", re.sub(r"\s*\(.*?\)", "", name)) if v.strip()]
        for v in variants:
            if len(v) >= 4:
                terms.append((v, mean))
    terms.sort(key=lambda t: -len(t[0]))
    return terms


SKIP_TAGS = {"code", "pre", "a", "h1", "h2", "h3", "h4", "button", "script", "style", "th", "summary", "select", "option", "textarea", "label", "legend", "figcaption", "svg", "text"}


def add_glossary(doc_html, terms, scope_re=r'<(?:div class="abschnitt"|section class="kapitel"|li class="task)'):
    parts = re.split(r"(<[^>]+>)", doc_html)
    skip, used, out = [], set(), []
    pats = [(t, m, re.compile(r"(?<![\w-])(" + re.escape(t) + r"(?:en|n|s|e|es)?)(?![\w-])")) for t, m in terms]
    for p in parts:
        if p.startswith("<"):
            if re.match(scope_re, p):
                used = set()
            m = re.match(r"<(/?)([a-zA-Z0-9]+)", p)
            if m:
                tag = m.group(2).lower()
                if tag in SKIP_TAGS and not p.endswith("/>"):
                    if m.group(1):
                        if skip and skip[-1] == tag: skip.pop()
                    else:
                        skip.append(tag)
            out.append(p); continue
        if skip or not p.strip():
            out.append(p); continue
        text = p
        for t, mean, rx in pats:
            if t in used:
                continue
            mm = rx.search(text)
            if not mm:
                continue
            used.add(t)
            rep = f'<span class="gl" tabindex="0" data-def="{html.escape(t + ": " + mean, quote=True)}">{mm.group(1)}</span>'
            # nur einfügen, wenn der Treffer nicht schon in einem eingefügten span liegt
            before = text[:mm.start()]
            if before.count('<span class="gl"') != before.count("</span>"):
                continue
            text = before + rep + text[mm.end():]
        out.append(text)
    return "".join(out)
