/* Editor-Hilfen für Racket-Textfelder: Syntaxfarben, Vorschläge, Tab-Vervollständigung und Fehlermarkierung beim Tippen.
   Braucht racket.js (window.MiniRacket). Nutzung: RacketEditor.attach(textarea, {onLint: fn, level: fn})
   RacketEditor.highlight(code) liefert farbiges HTML (wird auch beim Erstellen der Seiten benutzt). */
(function () {
  "use strict";
  var M = window.MiniRacket;
  if (!M) return;

  // ---------------------------------------------------------------- Syntaxfarben
  var KEYWORDS = new Set(["define", "lambda", "λ", "cond", "else", "if", "and", "or", "let", "let*", "letrec", "quote", "begin",
    "define-record", "define-record-procedures", "define-singleton", "check-expect", "check-within", "check-error", "check-property",
    "check-satisfied", "check-member-of", "check-range", ":", "signature", "for-all", "==>", "match", "->"]);
  // Zerlegt Quelltext in Abschnitte mit Farbklasse; Klammern bekommen ihre Schachtelungstiefe
  function tokens(src) {
    var out = [], i = 0, n = src.length, depth = 0;
    function push(s, e, c, d) { out.push({ s: s, e: e, c: c, d: d }); }
    while (i < n) {
      var c = src[i], s = i;
      if (c === ";") { while (i < n && src[i] !== "\n") i++; push(s, i, "t-com"); continue; }
      if (c === "#" && src[i + 1] === "|") { var e = src.indexOf("|#", i + 2); i = e < 0 ? n : e + 2; push(s, i, "t-com"); continue; }
      if (c === '"') { i++; while (i < n && src[i] !== '"') { if (src[i] === "\\") i++; i++; } i = Math.min(n, i + 1); push(s, i, "t-str"); continue; }
      if (c === "(" || c === "[") { push(s, i + 1, "t-par", depth); depth++; i++; continue; }
      if (c === ")" || c === "]") { depth = Math.max(0, depth - 1); push(s, i + 1, "t-par", depth); i++; continue; }
      if (c === "'" || c === "`") { push(s, i + 1, "t-quo"); i++; continue; }
      if (/\s/.test(c)) { while (i < n && /\s/.test(src[i])) i++; push(s, i, ""); continue; }
      while (i < n && !/[\s()\[\]";']/.test(src[i])) i++;
      if (i === s) i++;
      var w = src.slice(s, i), cls = "";
      if (/^#(t|f|true|false)$/.test(w) || /^#\\/.test(w)) cls = "t-con";
      else if (/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$|^[+-]?\d+\/\d+$|^#[ie]/i.test(w) || /^([+-]?[\d.\/]+)?[+-][\d.\/]*i$/.test(w)) cls = "t-num";
      else if (KEYWORDS.has(w)) cls = "t-key";
      push(s, i, cls);
    }
    return out;
  }
  function escH(t) { return t.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  // nest=true: jede Klammergruppe wird in <span class="sx"> eingeschlossen (für das Hervorheben zusammengehöriger Klammern)
  function highlight(src, nest) {
    var html = "", open = 0;
    tokens(src).forEach(function (t) {
      var txt = escH(src.slice(t.s, t.e));
      if (t.c === "t-par") {
        var cls = "t-par d" + (t.d % 4), opening = src[t.s] === "(" || src[t.s] === "[";
        if (nest && opening) { html += '<span class="sx"><span class="' + cls + '">' + txt + "</span>"; open++; return; }
        if (nest && !opening && open > 0) { html += '<span class="' + cls + '">' + txt + "</span></span>"; open--; return; }
        html += '<span class="' + cls + '">' + txt + "</span>"; return;
      }
      html += t.c ? '<span class="' + t.c + '">' + txt + "</span>" : txt;
    });
    while (open-- > 0) html += "</span>";
    return html;
  }

  // ---------------------------------------------------------------- bekannte Namen
  var SPECIAL = ["define", "lambda", "λ", "cond", "else", "if", "and", "or", "let", "let*", "letrec", "quote", "begin",
    "define-record", "define-record-procedures", "check-expect", "check-within", "check-error", "check-property",
    "check-satisfied", "check-member-of", "check-range", ":", "signature", "for-all", "==>", "match", "define-singleton"];
  // eingebaute Namen je Sprachebene (gesperrte Namen liefern eine eigene Meldung)
  var PRIMS = new Map(), KNOWN = new Set(), LOCKED = new Map(), LOCKEDFORMS = {}, curLevel = "?";
  function useLevel(lv) {
    if (lv === curLevel) return; curLevel = lv;
    var it = new M.Interp(lv ? { level: lv } : {});
    PRIMS = new Map(); LOCKED = new Map(); LOCKEDFORMS = it.lockedForms || {};
    it.global.vars.forEach(function (v, k) { if (v instanceof M.Locked) LOCKED.set(k, v.msg); else PRIMS.set(k, v); });
    KNOWN = new Set(SPECIAL.filter(function (k) { return !LOCKEDFORMS[k]; }).concat(Array.from(PRIMS.keys())));
  }
  useLevel(null);
  // Mindest-/Höchstzahl an Teilen nach dem Namen bei Sonderformen
  var FORM_ARITY = {
    "if": [3, 3, "Bedingung, Konsequente und Alternative"], "define": [2, 2, "einen Namen und einen Ausdruck"],
    "lambda": [2, -1, "eine Parameterliste und einen Rumpf"], "λ": [2, -1, "eine Parameterliste und einen Rumpf"],
    "check-expect": [2, 2, "einen Ausdruck und den erwarteten Wert"], "check-within": [3, 3, "Ausdruck, erwarteten Wert und Toleranz"],
    "check-error": [1, 2, "einen Ausdruck (und optional die Fehlermeldung)"], "check-property": [1, 1, "eine Eigenschaft"],
    "check-satisfied": [2, 2, "einen Ausdruck und ein Prädikat"], ":": [2, 2, "einen Namen und eine Signatur"],
    "cond": [1, -1, "mindestens einen Zweig"], "let": [2, -1, "Bindungen und einen Rumpf"], "let*": [2, -1, "Bindungen und einen Rumpf"],
    "letrec": [2, -1, "Bindungen und einen Rumpf"], "for-all": [2, 2, "Bindungen und eine Eigenschaft"], "==>": [2, 2, "eine Bedingung und eine Eigenschaft"],
    "quote": [1, 1, "genau einen Wert"], "check-member-of": [2, -1, "einen Ausdruck und mindestens einen erlaubten Wert"],
    "check-range": [3, 3, "einen Ausdruck, eine Untergrenze und eine Obergrenze"], "match": [2, -1, "einen Ausdruck und mindestens einen Zweig (Muster Ausdruck)"],
    "define-singleton": [2, 3, "Signatur, Name und optional ein Prädikat"]
  };

  // ---------------------------------------------------------------- Leser mit Positionen
  function parse(src) {
    var i = 0, n = src.length, errs = [], top = [];
    function err(s, e, msg) { errs.push({ s: s, e: e, msg: msg }); }
    function skip() {
      for (;;) {
        var c = src[i];
        if (c === undefined) return;
        if (/\s/.test(c)) i++;
        else if (c === ";") { while (i < n && src[i] !== "\n") i++; }
        else if (c === "#" && src[i + 1] === "|") { var e = src.indexOf("|#", i + 2); if (e < 0) { err(i, i + 2, "Blockkommentar #| wird nicht mit |# geschlossen."); i = n; } else i = e + 2; }
        else if (c === "#" && src[i + 1] === ";") { i += 2; read(); }
        else return;
      }
    }
    function read() {
      skip();
      var c = src[i], s = i;
      if (c === undefined) return null;
      if (c === "(" || c === "[") {
        i++; var close = c === "(" ? ")" : "]", node = { t: "list", s: s, e: -1, items: [], open: c };
        for (;;) {
          skip();
          var d = src[i];
          if (d === undefined) { err(s, s + 1, "Zu dieser öffnenden Klammer fehlt die schließende Klammer „" + close + "“."); node.e = n; node.unclosed = true; return node; }
          if (d === ")" || d === "]") {
            if (d !== close) { err(i, i + 1, "„" + d + "“ passt nicht zur öffnenden „" + c + "“ – erwartet wird „" + close + "“."); }
            i++; node.e = i; return node;
          }
          var x = read(); if (x) node.items.push(x);
        }
      }
      if (c === ")" || c === "]") { i++; err(s, i, "Eine schließende Klammer „" + c + "“ zu viel – hier ist keine Klammer mehr offen."); return null; }
      if (c === "'" || c === "`") { i++; var q = read(); return { t: "quote", s: s, e: q ? q.e : i, item: q }; }
      if (c === '"') {
        i++;
        while (i < n && src[i] !== '"') { if (src[i] === "\\") i++; i++; }
        if (i >= n) { err(s, s + 1, "Diese Zeichenkette wird nicht mit \" geschlossen."); return { t: "str", s: s, e: n }; }
        i++; return { t: "str", s: s, e: i };
      }
      while (i < n && !/[\s()\[\]";']/.test(src[i])) i++;
      var tok = src.slice(s, i);
      if (/^#(t|f|true|false)$/.test(tok)) return { t: "bool", s: s, e: i };
      if (tok.indexOf("#\\") === 0) return { t: "char", s: s, e: i };
      if (/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$|^[+-]?\d+\/\d+$|^#[ie][+-]?[\d.\/]+$/i.test(tok) || /^([+-]?[\d.\/]+(e[+-]?\d+)?)?[+-][\d.\/]*(e[+-]?\d+)?i$/i.test(tok)) return { t: "num", s: s, e: i, v: tok };
      if (tok[0] === "#") { err(s, i, "„" + tok + "“ verstehe ich nicht. Gemeint ist vielleicht #t oder #f."); return { t: "bad", s: s, e: i }; }
      return { t: "sym", s: s, e: i, v: tok };
    }
    for (;;) { skip(); if (i >= n) break; var x = read(); if (x) top.push(x); }
    return { forms: top, errs: errs };
  }

  // ---------------------------------------------------------------- Prüfen
  function sym(node) { return node && node.t === "sym" ? node.v : null; }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var d = []; for (var x = 0; x <= a.length; x++) { d[x] = [x]; }
    for (var y = 1; y <= b.length; y++) d[0][y] = y;
    for (x = 1; x <= a.length; x++) for (y = 1; y <= b.length; y++)
      d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function suggest(name, pool) {
    var best = null, bd = name.length < 5 ? 1 : 2;
    pool.forEach(function (k) { if (k.length < 2) return; var d = lev(name, k); if (d <= bd && (!best || d < bd)) { best = k; bd = d; } });
    return best;
  }
  function argWord(k) { return k === 1 ? "1 Argument" : k + " Argumente"; }
  function arityText(min, max) { return min === max ? argWord(min) : max === -1 ? "mindestens " + argWord(min) : min + " bis " + max + " Argumente"; }

  function analyse(src, lv) {
    if (lv !== undefined) useLevel(lv);
    var p = parse(src), errs = p.errs, globals = new Map(); // Name -> {min,max} oder {}
    function defineGlobal(name, info) { if (name) globals.set(name, info || {}); }
    function lambdaArity(node) {
      if (node && node.t === "list" && (sym(node.items[0]) === "lambda" || sym(node.items[0]) === "λ") && node.items[1] && node.items[1].t === "list") {
        var ps = node.items[1].items, dot = ps.findIndex(function (x) { return sym(x) === "."; });
        return dot >= 0 ? { min: dot, max: -1 } : { min: ps.length, max: ps.length };
      }
      return {};
    }
    function recordNames(f, add) {
      var it = f.items, head = sym(it[0]);
      var tn = it[1]; if (tn && tn.t === "list") tn = tn.items[0];
      add(sym(tn), {});
      add(sym(it[2]), { min: 0, max: 0, ctor: true });
      var rest = it.slice(3);
      if (head === "define-record-procedures") {
        add(sym(rest[0]), { min: 1, max: 1 });
        if (rest[1] && rest[1].t === "list") rest[1].items.forEach(function (x) { add(sym(x), { min: 1, max: 1 }); });
        var ctorP = globals.get(sym(it[2])); if (ctorP && rest[1] && rest[1].t === "list") ctorP.min = ctorP.max = rest[1].items.length;
        return;
      }
      if (rest[0] && rest[0].t === "sym") { add(sym(rest[0]), { min: 1, max: 1 }); rest = rest.slice(1); }
      var fields = 0;
      rest.forEach(function (fs) { if (fs.t === "list") { add(sym(fs.items[0]), { min: 1, max: 1 }); fields++; } });
      var c = globals.get(sym(it[2])); if (c) c.min = c.max = fields;
    }
    // 1. Durchgang: alle Definitionen auf oberster Ebene einsammeln
    p.forms.forEach(function (f) {
      if (f.t !== "list") return;
      var h = sym(f.items[0]);
      if (h === "define") {
        if (f.items[1] && f.items[1].t === "list") defineGlobal(sym(f.items[1].items[0]), { min: f.items[1].items.length - 1, max: f.items[1].items.length - 1 });
        else defineGlobal(sym(f.items[1]), lambdaArity(f.items[2]));
      } else if (h === "define-record" || h === "define-record-procedures") recordNames(f, defineGlobal);
      else if (h === "define-singleton") { defineGlobal(sym(f.items[1]), {}); defineGlobal(sym(f.items[2]), {}); if (f.items[3]) defineGlobal(sym(f.items[3]), { min: 1, max: 1 }); }
    });

    function bound(name, scopes) {
      if (KNOWN.has(name) || globals.has(name)) return true;
      for (var k = 0; k < scopes.length; k++) if (scopes[k].has(name)) return true;
      return false;
    }
    function local(name, scopes) { for (var k = 0; k < scopes.length; k++) if (scopes[k].has(name)) return true; return false; }
    function unknown(node, scopes, inSig) {
      var name = node.v;
      if (bound(name, scopes)) return;
      if (inSig && (name === "->" || name[0] === "%")) return;
      if (LOCKED.has(name) && !inSig) { errs.push({ s: node.s, e: node.e, msg: LOCKED.get(name) + "." }); return; }
      var pool = new Set(KNOWN); globals.forEach(function (_, k) { pool.add(k); }); scopes.forEach(function (sc) { sc.forEach(function (k) { pool.add(k); }); });
      var sug = suggest(name, pool);
      errs.push({ s: node.s, e: node.e, msg: "„" + name + "“ ist kein bekannter Befehl und nirgends definiert." + (sug ? " Meintest du „" + sug + "“?" : " Hast du es mit define definiert?") });
    }
    function bindList(node, scopes, withExpr, inSigExpr) {
      // ((name expr) ...) – Namen binden, Ausdrücke prüfen
      var sc = new Set();
      if (!node || node.t !== "list") { if (node) errs.push({ s: node.s, e: node.e, msg: "Hier wird eine Liste von Bindungen in Klammern erwartet, z. B. ((x 1) (y 2))." }); return sc; }
      node.items.forEach(function (b) {
        if (b.t !== "list" || !sym(b.items[0]) || b.items.length !== 2) { errs.push({ s: b.s, e: b.e, msg: "Eine Bindung hat die Form (name ausdruck)." }); return; }
        sc.add(sym(b.items[0]));
        if (withExpr) check(b.items[1], scopes, inSigExpr);
      });
      return sc;
    }
    function body(items, scopes) {
      // interne Definitionen im Rumpf sehen sich gegenseitig
      var sc = new Set();
      items.forEach(function (x) { if (x.t === "list" && sym(x.items[0]) === "define") { var nm = x.items[1]; sc.add(nm && nm.t === "list" ? sym(nm.items[0]) : sym(nm)); } });
      var s2 = sc.size ? [sc].concat(scopes) : scopes;
      items.forEach(function (x) { check(x, s2, false); });
    }
    function check(node, scopes, inSig) {
      if (!node) return;
      if (node.t === "sym") { unknown(node, scopes, inSig); return; }
      if (node.t !== "list") return;
      var it = node.items, h = sym(it[0]), name = h;
      if (!it.length) { errs.push({ s: node.s, e: node.e, msg: "Leere Klammer: Nach „(“ muss ein Befehl stehen, z. B. (+ 1 2)." }); return; }
      if (inSig && h !== "predicate" && h !== "lambda" && h !== "λ" && h !== "integer-from-to") { it.forEach(function (x) { check(x, scopes, true); }); return; }
      var isLocal = h && local(h, scopes);
      if (h && !isLocal && LOCKEDFORMS[h]) { errs.push({ s: it[0].s, e: it[0].e, msg: LOCKEDFORMS[h] + "." }); return; }
      if (h && !isLocal && FORM_ARITY[h]) {
        var fa = FORM_ARITY[h], k = it.length - 1;
        if (k < fa[0] || (fa[1] !== -1 && k > fa[1])) {
          errs.push({ s: it[0].s, e: it[0].e, msg: h + ": erwartet " + fa[2] + (k < fa[0] ? " – da fehlt etwas" : " – das ist zu viel") + " (" + k + " Teil" + (k === 1 ? "" : "e") + " gefunden)." });
        }
      }
      if (h && !isLocal) switch (h) {
        case "quote": return;
        case "define-singleton": return;
        case "match":
          check(it[1], scopes, false);
          it.slice(2).forEach(function (cl) {
            if (cl.t !== "list" || cl.items.length < 2) { errs.push({ s: cl.s, e: cl.e, msg: "match: Jeder Zweig hat die Form (Muster Ausdruck)." }); return; }
            var pv = new Set();
            (function pat(n) {
              if (!n) return;
              if (n.t === "sym") { if (["...", "_", "empty", "true", "false"].indexOf(n.v) < 0) pv.add(n.v); return; }
              if (n.t === "list") { var hh = sym(n.items[0]); if (hh === "quote") return; if (hh && hh !== "cons" && hh !== "list" && !bound(hh, scopes)) errs.push({ s: n.items[0].s, e: n.items[0].e, msg: "match: „" + hh + "“ ist kein bekannter Konstruktor." }); n.items.slice(1).forEach(pat); }
            })(cl.items[0]);
            body(cl.items.slice(1), [pv].concat(scopes));
          });
          return;
        case "define":
          if (it[1] && it[1].t === "list") { var ps = new Set(); it[1].items.slice(1).forEach(function (x) { ps.add(sym(x)); }); body(it.slice(2), [ps].concat(scopes)); return; }
          if (it[1] && it[1].t !== "sym") errs.push({ s: it[1].s, e: it[1].e, msg: "define: Nach define muss ein Name stehen, kein " + (it[1].t === "num" ? "Zahl" : "Wert") + "." });
          else if (it[1] && KNOWN.has(it[1].v) && SPECIAL.indexOf(it[1].v) >= 0) errs.push({ s: it[1].s, e: it[1].e, msg: "„" + it[1].v + "“ ist ein reserviertes Wort und kann nicht neu definiert werden." });
          it.slice(2).forEach(function (x) { check(x, scopes, false); }); return;
        case "lambda": case "λ":
          var pr = new Set();
          if (it[1] && it[1].t === "list") it[1].items.forEach(function (x) { if (x.t !== "sym") errs.push({ s: x.s, e: x.e, msg: "lambda: In der Parameterliste dürfen nur Namen stehen." }); else if (x.v !== ".") pr.add(x.v); });
          else if (it[1]) errs.push({ s: it[1].s, e: it[1].e, msg: "lambda: Nach lambda kommt die Parameterliste in Klammern, z. B. (lambda (x) …)." });
          body(it.slice(2), [pr].concat(scopes)); return;
        case "cond":
          it.slice(1).forEach(function (cl, ci) {
            if (cl.t !== "list") { errs.push({ s: cl.s, e: cl.e, msg: "cond: Jeder Zweig steht in eigenen Klammern: (Bedingung Antwort)." }); return; }
            if (cl.items.length < 2) { errs.push({ s: cl.s, e: cl.e, msg: "cond: Dieser Zweig hat " + (cl.items.length ? "keine Antwort" : "weder Bedingung noch Antwort") + " – Form: (Bedingung Antwort)." }); }
            if (sym(cl.items[0]) === "else") { if (ci !== it.length - 2) errs.push({ s: cl.items[0].s, e: cl.items[0].e, msg: "cond: else darf nur im letzten Zweig stehen." }); }
            else check(cl.items[0], scopes, false);
            body(cl.items.slice(1), scopes);
          });
          return;
        case "let": case "let*": case "letrec":
          var sc = bindList(it[1], scopes, false);
          var inner = [sc].concat(scopes);
          if (it[1] && it[1].t === "list") it[1].items.forEach(function (b) { if (b.t === "list" && b.items[1]) check(b.items[1], h === "let" ? scopes : inner, false); });
          body(it.slice(2), inner); return;
        case "for-all":
          var fsc = new Set();
          if (it[1] && it[1].t === "list") it[1].items.forEach(function (b) { if (b.t === "list" && sym(b.items[0])) { fsc.add(sym(b.items[0])); if (b.items[1]) check(b.items[1], scopes, true); } else errs.push({ s: b.s, e: b.e, msg: "for-all: Eine Bindung hat die Form (name signatur)." }); });
          it.slice(2).forEach(function (x) { check(x, [fsc].concat(scopes), false); }); return;
        case ":":
          if (it[1] && it[1].t !== "sym") errs.push({ s: it[1].s, e: it[1].e, msg: ": braucht zuerst den Namen, dann die Signatur, z. B. (: f (natural -> natural))." });
          if (it[2]) check(it[2], scopes, true); return;
        case "signature":
          it.slice(1).forEach(function (x) { check(x, scopes, true); }); return;
        case "define-record": case "define-record-procedures":
          var params = new Set();
          if (it[1] && it[1].t === "list") it[1].items.slice(1).forEach(function (x) { params.add(sym(x)); });
          if (!sym(it[2])) errs.push({ s: (it[2] || it[0]).s, e: (it[2] || it[0]).e, msg: h + ": Nach dem Namen des Records kommt der Name des Konstruktors, z. B. make-dillo." });
          if (h === "define-record") it.slice(3).forEach(function (fs) {
            if (fs.t === "list") { if (fs.items.length !== 2) errs.push({ s: fs.s, e: fs.e, msg: "define-record: Ein Feld hat die Form (selektor signatur)." }); else check(fs.items[1], [params].concat(scopes), true); }
          });
          return;
      }
      // normale Anwendung
      var head = it[0];
      if (head.t === "num" || head.t === "str" || head.t === "bool" || head.t === "char") {
        errs.push({ s: head.s, e: head.e, msg: "Nach „(“ muss ein Befehl stehen – " + src.slice(head.s, head.e) + " ist keine Funktion. Steht hier eine Klammer zu viel?" });
      } else check(head, scopes, false);
      if (h && h === "else") errs.push({ s: head.s, e: head.e, msg: "else gibt es nur als letzten Zweig in cond." });
      if (h && !isLocal) {
        var info = globals.has(h) ? globals.get(h) : PRIMS.get(h), min, max;
        if (info instanceof M.Prim) { min = info.min; max = info.max; }
        else if (info && info.min !== undefined) { min = info.min; max = info.max; }
        else if (info instanceof M.Closure) { min = max = info.params.length; }
        var got = it.length - 1;
        if (min !== undefined && (got < min || (max !== -1 && got > max))) {
          errs.push({ s: head.s, e: head.e, msg: h + ": erwartet " + arityText(min, max) + ", bekommt aber " + got + (got < min ? " – es fehlt " + (min - got === 1 ? "eine Angabe" : (min - got) + " Angaben") + "." : " – " + (got - (max) === 1 ? "eine Angabe" : (got - max) + " Angaben") + " zu viel.") });
        }
      }
      it.slice(1).forEach(function (x) { check(x, scopes, false); });
    }
    p.forms.forEach(function (f) {
      if (f.t === "sym" || f.t === "list") check(f, [], false);
    });
    errs.sort(function (a, b) { return a.s - b.s; });
    // doppelte Meldungen an derselben Stelle entfernen
    var seen = {}; errs = errs.filter(function (x) { var k = x.s + ":" + x.msg; if (seen[k]) return false; seen[k] = 1; return true; });
    return { errs: errs, globals: globals };
  }

  // ---------------------------------------------------------------- Oberfläche
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function lineOf(src, pos) { return src.slice(0, pos).split("\n").length; }

  // Zeilennummern links neben dem Textfeld (wie in DrRacket); ohne Zeilenumbruch, damit Nummer und Zeile zusammenpassen
  function lineNumbers(ta) {
    var box = document.createElement("div"); box.className = "ln-box";
    ta.parentNode.insertBefore(box, ta);
    var g = document.createElement("pre"); g.className = "ln-gutter"; g.setAttribute("aria-hidden", "true");
    box.appendChild(g); box.appendChild(ta);
    ta.setAttribute("wrap", "off");
    var cs = getComputedStyle(ta);
    ["fontFamily", "fontSize", "lineHeight", "paddingTop", "borderTopWidth", "borderBottomWidth"].forEach(function (k) { g.style[k] = cs[k]; });
    var n = 0;
    function upd() {
      var m = ta.value.split("\n").length;
      if (m !== n) { n = m; var s = ""; for (var i = 1; i <= m; i++) s += i + "\n"; g.textContent = s + "\n\n"; }
      g.scrollTop = ta.scrollTop;
    }
    ta.addEventListener("input", upd); ta.addEventListener("scroll", upd); upd();
    return box;
  }

  function attach(ta, opts) {
    opts = opts || {};
    var box = lineNumbers(ta);
    var wrap = document.createElement("div"); wrap.className = "ed-wrap";
    ta.parentNode.insertBefore(wrap, ta);
    var hl = document.createElement("pre"); hl.className = "ed-hl"; hl.setAttribute("aria-hidden", "true");
    wrap.appendChild(hl); wrap.appendChild(ta); ta.classList.add("ed-ta");
    var list = document.createElement("div"); list.className = "ed-lint"; list.setAttribute("aria-live", "polite");
    box.parentNode.insertBefore(list, box.nextSibling);
    var ac = document.createElement("div"); ac.className = "ed-ac"; ac.setAttribute("role", "listbox"); wrap.appendChild(ac);
    var state = { errs: [], globals: new Map() }, timer = null;
    var COPY = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "tabSize", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderRadius"];
    function styleLike(el) { var cs = getComputedStyle(ta); COPY.forEach(function (k) { el.style[k] = cs[k]; }); }
    styleLike(hl);

    // farbiger Text im Hintergrund + rote Wellenlinie unter Fehlern
    function paint(errs) {
      var src = ta.value, toks = tokens(src), out = "", ei = 0, inErr = -1;
      var ranges = errs.map(function (e, k) { return { s: e.s, e: Math.max(e.e, e.s + 1), k: k }; }).sort(function (a, b) { return a.s - b.s; });
      var cuts = new Set([0, src.length]);
      toks.forEach(function (t) { cuts.add(t.s); cuts.add(t.e); });
      ranges.forEach(function (r) { cuts.add(Math.min(r.s, src.length)); cuts.add(Math.min(r.e, src.length)); });
      var pts = Array.from(cuts).sort(function (a, b) { return a - b; }), ti = 0;
      for (var j = 0; j + 1 < pts.length; j++) {
        var a = pts[j], b = pts[j + 1]; if (a === b) continue;
        while (ti < toks.length && toks[ti].e <= a) ti++;
        var t = toks[ti] && toks[ti].s <= a ? toks[ti] : null;
        var err = -1; for (var r = 0; r < ranges.length; r++) if (ranges[r].s <= a && a < ranges[r].e) { err = ranges[r].k; break; }
        if (err !== inErr) { if (inErr >= 0) out += "</mark>"; if (err >= 0) out += '<mark class="ed-err" data-k="' + err + '">'; inErr = err; }
        var txt = esc(src.slice(a, b)), cls = t && t.c ? t.c + (t.c === "t-par" ? " d" + (t.d % 4) : "") : "";
        out += cls ? '<span class="' + cls + '">' + txt + "</span>" : txt;
      }
      if (inErr >= 0) out += "</mark>";
      ranges.forEach(function (r) { if (r.s >= src.length) out += '<mark class="ed-err ed-eof" data-k="' + r.k + '"> </mark>'; });
      hl.innerHTML = out + "\n";
      hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft;
    }
    function render() {
      var src = ta.value;
      paint(state.errs);
      list.innerHTML = "";
      if (!src.trim()) return;
      if (!state.errs.length) { list.innerHTML = '<div class="ed-ok">✓ Keine Fehler beim Tippen gefunden.</div>'; return; }
      state.errs.slice(0, 8).forEach(function (e, k) {
        var b = document.createElement("button"); b.type = "button"; b.className = "ed-msg"; b.dataset.k = k;
        b.innerHTML = '<span class="ed-ln">Zeile ' + lineOf(src, e.s) + "</span> " + esc(e.msg);
        b.addEventListener("click", function () { ta.focus(); ta.setSelectionRange(e.s, Math.min(e.e, src.length)); markCur(); });
        list.appendChild(b);
      });
      if (state.errs.length > 8) { var m = document.createElement("div"); m.className = "ed-more"; m.textContent = "… und " + (state.errs.length - 8) + " weitere"; list.appendChild(m); }
      markCur();
    }
    function markCur() {
      var c = ta.selectionStart;
      list.querySelectorAll(".ed-msg").forEach(function (b) { var e = state.errs[+b.dataset.k]; b.classList.toggle("cur", !!e && c >= e.s && c <= e.e); });
    }
    function lv() { return opts.level ? opts.level() : null; }
    function lint() { state = analyse(ta.value, lv()); render(); if (opts.onLint) opts.onLint(state.errs); }
    function schedule() { clearTimeout(timer); paint([]); timer = setTimeout(lint, 350); }

    // ---- Vervollständigung
    var acItems = [], acSel = 0, acStart = 0, acPre = "", acNav = false, acAuto = false;
    function prefixAt() {
      var pos = ta.selectionStart, s = pos, v = ta.value;
      while (s > 0 && !/[\s()\[\]";'`]/.test(v[s - 1])) s--;
      return { start: s, text: v.slice(s, pos) };
    }
    function candidates(pre, withExact) {
      var names = new Map();
      analyse(ta.value, lv()).globals.forEach(function (info, k) { names.set(k, info.min !== undefined ? "eigene Funktion · " + arityText(info.min, info.max) : "eigene Definition"); });
      // Parameter und lokale Namen grob aus dem Text holen
      (ta.value.match(/\((?:lambda|λ)\s*\(([^()]*)\)/g) || []).forEach(function (m) { m.replace(/\((?:lambda|λ)\s*\(/, "").replace(")", "").split(/\s+/).forEach(function (p) { if (p && !names.has(p)) names.set(p, "Parameter"); }); });
      SPECIAL.forEach(function (k) { if (!names.has(k)) names.set(k, "Sonderform"); });
      PRIMS.forEach(function (v, k) { if (!names.has(k)) names.set(k, v instanceof M.Sig ? "Signatur" : v instanceof M.Prim ? (v.min === 0 && v.max === -1 ? "eingebaut · beliebig viele Argumente" : "eingebaut · " + arityText(v.min, v.max)) : "eingebaut"); });
      var res = [];
      names.forEach(function (d, k) { if (k.indexOf(pre) === 0 && (withExact || k !== pre)) res.push({ name: k, desc: d }); });
      res.sort(function (a, b) { return (b.name === pre) - (a.name === pre) || a.name.length - b.name.length || (a.name < b.name ? -1 : 1); });
      return res;
    }
    function common(arr) { var c = arr[0]; arr.forEach(function (x) { while (x.indexOf(c) !== 0) c = c.slice(0, -1); }); return c; }
    function replaceRange(s, e, t) { ta.setSelectionRange(s, e); if (!document.execCommand || !document.execCommand("insertText", false, t)) { ta.value = ta.value.slice(0, s) + t + ta.value.slice(e); ta.selectionStart = ta.selectionEnd = s + t.length; ta.dispatchEvent(new Event("input")); } }
    function closeAc() { ac.classList.remove("on"); acItems = []; }
    function caretXY(pos) {
      var m = document.createElement("pre"); m.className = "ed-hl ed-measure"; styleLike(m); m.style.height = "auto";
      m.innerHTML = esc(ta.value.slice(0, pos)) + '<span class="ed-caret">​</span>';
      wrap.appendChild(m); var sp = m.querySelector(".ed-caret"); var r = { x: sp.offsetLeft, y: sp.offsetTop + sp.offsetHeight }; wrap.removeChild(m);
      return r;
    }
    function showAc(items, start) {
      acItems = items.slice(0, 50); acSel = 0; acStart = start; acNav = false; acPre = ta.value.slice(start, ta.selectionStart);
      ac.innerHTML = "";
      acItems.forEach(function (c, k) {
        var d = document.createElement("div"); d.className = "ed-aci" + (k === 0 ? " sel" : ""); d.setAttribute("role", "option");
        var kind = /^eigene|^Parameter/.test(c.desc) ? ["abc", "own"] : c.desc === "Sonderform" ? ["{ }", "form"] : c.desc === "Signatur" ? ["T", "sig"] : ["ƒ", "fn"];
        var pl = Math.min(acPre.length, c.name.length);
        d.innerHTML = '<i class="ed-k ' + kind[1] + '">' + kind[0] + '</i><code><b>' + esc(c.name.slice(0, pl)) + "</b>" + esc(c.name.slice(pl)) + "</code><span>" + esc(c.desc) + "</span>";
        d.addEventListener("mousedown", function (ev) { ev.preventDefault(); acSel = k; acceptAc(); });
        ac.appendChild(d);
      });
      var hint = document.createElement("div"); hint.className = "ed-hint"; hint.textContent = "Tab übernehmen · ↑↓ auswählen · Esc schließen"; ac.appendChild(hint);
      var xy = caretXY(start);
      ac.style.left = Math.min(xy.x - ta.scrollLeft, Math.max(0, wrap.clientWidth - 260)) + "px"; ac.style.top = (xy.y - ta.scrollTop + 2) + "px";
      ac.classList.add("on");
    }
    function moveAc(d) {
      acSel = (acSel + d + acItems.length) % acItems.length; acNav = true;
      ac.querySelectorAll(".ed-aci").forEach(function (el, k) { el.classList.toggle("sel", k === acSel); if (k === acSel) el.scrollIntoView({ block: "nearest" }); });
    }
    function acceptAc() { var c = acItems[acSel]; if (!c) return; replaceRange(acStart, ta.selectionStart, c.name); closeAc(); }
    function complete() {
      acAuto = false;
      var p = prefixAt();
      if (!p.text) return false;
      var cs = candidates(p.text);
      if (!cs.length) return true;
      if (cs.length === 1) { replaceRange(p.start, ta.selectionStart, cs[0].name); return true; }
      var c = common(cs.map(function (x) { return x.name; }));
      if (c.length > p.text.length) replaceRange(p.start, ta.selectionStart, c);
      showAc(candidates(c), p.start);
      return true;
    }
    function inStringOrComment(pos) {
      var v = ta.value, inStr = false, i = v.lastIndexOf("\n", pos - 1) + 1;
      // ab Zeilenanfang grob prüfen; mehrzeilige Zeichenketten sind selten
      for (; i < pos; i++) { var c = v[i]; if (inStr) { if (c === "\\") i++; else if (c === '"') inStr = false; } else if (c === '"') inStr = true; else if (c === ";") return true; }
      return inStr;
    }
    function refreshAc() {
      var p = prefixAt();
      if (!p.text || /^[0-9#".+-]?[0-9]/.test(p.text) || p.text[0] === "#" || inStringOrComment(p.start)) { closeAc(); return; }
      var cs = candidates(p.text, acAuto);
      if (!cs.length || (cs.length === 1 && cs[0].name === p.text)) { closeAc(); return; }
      var sel = acItems[acSel] && acNav ? acItems[acSel].name : null;
      showAc(cs, p.start);
      if (sel) { var k = cs.findIndex(function (c) { return c.name === sel; }); if (k > 0) { acSel = k - 1; moveAc(1); } }
    }

    ta.addEventListener("keydown", function (e) {
      if (ac.classList.contains("on")) {
        if (e.key === "ArrowDown") { e.preventDefault(); e.stopImmediatePropagation(); moveAc(1); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); e.stopImmediatePropagation(); moveAc(-1); return; }
        if (e.key === "Tab" || (e.key === "Enter" && acNav)) { e.preventDefault(); e.stopImmediatePropagation(); acceptAc(); return; }
        if (e.key === "Enter") closeAc();
        if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeAc(); return; }
      }
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && ta.selectionStart === ta.selectionEnd) {
        if (complete()) { e.preventDefault(); e.stopImmediatePropagation(); }
      }
    }, true);
    ta.addEventListener("input", function (e) {
      schedule();
      if (opts.suggest !== false && e.inputType === "insertText" && e.data && !/[\s()\[\]";'`]/.test(e.data)) { acAuto = true; refreshAc(); }
      else if (ac.classList.contains("on")) { if (/^delete/.test(e.inputType || "")) refreshAc(); else if (e.inputType) closeAc(); }
    });
    ta.addEventListener("blur", function () { setTimeout(closeAc, 120); });
    ta.addEventListener("scroll", function () { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; closeAc(); });
    ta.addEventListener("click", function () { closeAc(); markCur(); });
    ta.addEventListener("keyup", markCur);
    lint();
    return { lint: lint, analyse: analyse };
  }

  function names(src, lv) { var g = analyse(src, lv).globals, r = Array.from(g.keys()); SPECIAL.concat(Array.from(PRIMS.keys())).forEach(function (k) { if (r.indexOf(k) < 0) r.push(k); }); return r.sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); }); }
  window.RacketEditor = { attach: attach, lineNumbers: lineNumbers, analyse: analyse, parse: parse, names: names, highlight: highlight, tokens: tokens };
})();
