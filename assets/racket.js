/* Mini-Racket: ein kleiner Interpreter für die Lehrsprachen „Schreibe Dein Programm!“.
   Läuft im Browser (window.MiniRacket) und in Node (module.exports).
   Unterstützt die drei Sprachebenen (Option level), define, lambda (auch mit Restparameter), cond, if, and, or,
   let, let*, letrec, quote, begin, match, define-record, define-singleton, Signaturen (Prüfung mit Option checkSigs),
   alle check-…-Tests, Listen, Zeichenketten, exakte Brüche, Bilder (2htdp/image) und big-bang-Klauseln (Hook onBigBang). */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ Werte
  function RacketError(msg, kind) { this.message = msg; this.kind = kind || "error"; }
  RacketError.prototype = Object.create(Error.prototype);

  var symtab = new Map();
  function Sym(name) { this.name = name; }
  function sym(name) { var s = symtab.get(name); if (!s) { s = new Sym(name); symtab.set(name, s); } return s; }
  function Pair(car, cdr) { this.car = car; this.cdr = cdr; }
  var Empty = { toString: function () { return "empty"; } };
  function Closure(params, body, env, name) { this.params = params; this.body = body; this.env = env; this.name = name || null; }
  function Prim(name, fn, min, max) { this.name = name; this.fn = fn; this.min = min; this.max = max === undefined ? min : max; }
  function RecordType(name, fields) { this.name = name; this.fields = fields; }
  function RecordVal(type, vals) { this.type = type; this.vals = vals; }
  function Sig(kind, data) { this.kind = kind; this.data = data; }
  function LazySig(expr, env) { this.expr = expr; this.env = env; this.cache = null; }
  function Property(vars, sigExprs, body, env) { this.vars = vars; this.sigExprs = sigExprs; this.body = body; this.env = env; }
  var Void = { toString: function () { return ""; } };
  function Locked(name, msg) { this.name = name; this.msg = msg; }        // Name gibt es in der gewählten Sprachebene nicht
  function Clause(kind, args) { this.kind = kind; this.args = args; }      // big-bang-Klausel (to-draw, on-tick, …)
  function Singleton(name) { this.name = name; }
  function IWorld(name) { this.name = name; }

  // ------------------------------------------------------------------ exakte Zahlen
  function bgcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }
  function Rat(n, d) {
    if (d === undefined) d = 1n;
    if (d === 0n) throw new RacketError("/: durch 0 geteilt");
    if (d < 0n) { n = -n; d = -d; }
    var g = bgcd(n, d); if (g > 1n) { n /= g; d /= g; }
    this.n = n; this.d = d;
  }
  function isNum(x) { return x instanceof Rat || typeof x === "number"; }          // reelle Zahl
  // komplexe Zahl: re, im jeweils Rat oder float; mk() vereinfacht exakte 0 als Imaginärteil zur reellen Zahl
  function Cx(re, im) { this.re = re; this.im = im; }
  function mkC(re, im) { if (im instanceof Rat && im.n === 0n) return re; if (!(re instanceof Rat) && im instanceof Rat) im = Number(im.n) / Number(im.d); if (re instanceof Rat && re.n !== 0n && !(im instanceof Rat)) re = Number(re.n) / Number(re.d); return new Cx(re, im); }
  function isNumber(x) { return isNum(x) || x instanceof Cx; }
  function reP(x) { return x instanceof Cx ? x.re : x; }
  function imP(x) { return x instanceof Cx ? x.im : (x instanceof Rat ? new Rat(0n) : 0); }
  function isExact(x) { return x instanceof Rat || (x instanceof Cx && x.re instanceof Rat && x.im instanceof Rat); }
  function toF(x) { return x instanceof Rat ? Number(x.n) / Number(x.d) : x; }
  function isInt(x) { return x instanceof Rat ? x.d === 1n : (Number.isFinite(x) && Math.floor(x) === x); }
  function R(i) { return new Rat(BigInt(i)); }
  function add(a, b) { if (a instanceof Cx || b instanceof Cx) return mkC(add(reP(a), reP(b)), add(imP(a), imP(b))); if (a instanceof Rat && b instanceof Rat) return new Rat(a.n * b.d + b.n * a.d, a.d * b.d); return toF(a) + toF(b); }
  function sub(a, b) { if (a instanceof Cx || b instanceof Cx) return mkC(sub(reP(a), reP(b)), sub(imP(a), imP(b))); if (a instanceof Rat && b instanceof Rat) return new Rat(a.n * b.d - b.n * a.d, a.d * b.d); return toF(a) - toF(b); }
  function mul(a, b) { if (a instanceof Cx || b instanceof Cx) { var ar = reP(a), ai = imP(a), br = reP(b), bi = imP(b); return mkC(sub(mul(ar, br), mul(ai, bi)), add(mul(ar, bi), mul(ai, br))); } if (a instanceof Rat && b instanceof Rat) return new Rat(a.n * b.n, a.d * b.d); return toF(a) * toF(b); }
  function div(a, b) {
    if (a instanceof Cx || b instanceof Cx) {
      var ar = reP(a), ai = imP(a), br = reP(b), bi = imP(b), den = add(mul(br, br), mul(bi, bi));
      if (den instanceof Rat && den.n === 0n) throw new RacketError("/: durch 0 geteilt");
      return mkC(div(add(mul(ar, br), mul(ai, bi)), den), div(sub(mul(ai, br), mul(ar, bi)), den));
    }
    if (b instanceof Rat && b.n === 0n) throw new RacketError("/: durch 0 geteilt");
    if (a instanceof Rat && b instanceof Rat) return new Rat(a.n * b.d, a.d * b.n);
    return toF(a) / toF(b);
  }
  function cmp(a, b) {
    if (a instanceof Rat && b instanceof Rat) { var l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; }
    var x = toF(a), y = toF(b); return x < y ? -1 : x > y ? 1 : 0;
  }
  function parseNumber(t) {
    var m;
    if ((m = /^#i(.*)$/.exec(t))) { var v = parseNumber(m[1]); return v === null ? null : toF(v); }
    if ((m = /^([+-]?\d+)$/.exec(t))) return new Rat(BigInt(m[1]));
    if ((m = /^([+-]?\d+)\/(\d+)$/.exec(t))) return new Rat(BigInt(m[1]), BigInt(m[2]));
    if ((m = /^([+-]?)(\d*)\.(\d+)$/.exec(t)) || (m = /^([+-]?)(\d+)\.(\d*)$/.exec(t))) {
      var digits = (m[2] || "0") + (m[3] || ""), scale = (m[3] || "").length;
      var n = BigInt(digits) * (m[1] === "-" ? -1n : 1n);
      return new Rat(n, 10n ** BigInt(scale));
    }
    if ((m = /^([+-]?\d+(?:\.\d+)?)e([+-]?\d+)$/i.exec(t))) return parseFloat(t);
    if ((m = /^([+-]?[\d.\/]+(?:e[+-]?\d+)?)?([+-])([\d.\/]*(?:e[+-]?\d+)?)i$/i.exec(t))) {
      var re = m[1] ? parseNumber(m[1]) : new Rat(0n), im = m[3] ? parseNumber(m[3]) : new Rat(1n);
      if (re === null || im === null) return null;
      if (m[2] === "-") im = sub(new Rat(0n), im);
      return mkC(re, im);
    }
    return null;
  }
  function ratToString(x) {
    if (x.d === 1n) return x.n.toString();
    var d = x.d, two = 0, five = 0;
    while (d % 2n === 0n) { d /= 2n; two++; }
    while (d % 5n === 0n) { d /= 5n; five++; }
    if (d === 1n) {
      var k = Math.max(two, five), scaled = x.n * (10n ** BigInt(k)) / x.d;
      var neg = scaled < 0n; if (neg) scaled = -scaled;
      var s = scaled.toString().padStart(k + 1, "0");
      return (neg ? "-" : "") + s.slice(0, s.length - k) + "." + s.slice(s.length - k);
    }
    return x.n.toString() + "/" + x.d.toString();
  }
  function numToString(x) {
    if (x instanceof Cx) {
      var ex = isExact(x), part = function (v) { return v instanceof Rat ? ratToString(v) : (Number.isInteger(v) ? v.toFixed(1) : String(v)); };
      var reZero = x.re instanceof Rat && x.re.n === 0n, ims = part(x.im);
      if (ims.charAt(0) !== "-") ims = "+" + ims;
      if (x.im instanceof Rat && (x.im.n === 1n || x.im.n === -1n) && x.im.d === 1n) ims = ims.charAt(0);
      return (ex ? "" : "#i") + (reZero ? "" : part(x.re)) + ims + "i";
    }
    if (x instanceof Rat) return ratToString(x);
    if (Number.isInteger(x)) return "#i" + x.toFixed(1);
    return "#i" + String(x);
  }

  // ------------------------------------------------------------------ Leser
  function Reader(src) { this.s = src; this.i = 0; this.line = 1; }
  Reader.prototype.skip = function () {
    var s = this.s;
    for (;;) {
      var c = s[this.i];
      if (c === undefined) return;
      if (c === "\n") { this.line++; this.i++; }
      else if (/\s/.test(c)) this.i++;
      else if (c === ";") { while (this.i < s.length && s[this.i] !== "\n") this.i++; }
      else if (c === "#" && s[this.i + 1] === "|") {
        var e = s.indexOf("|#", this.i + 2); if (e < 0) e = s.length - 2;
        this.line += (s.slice(this.i, e).match(/\n/g) || []).length; this.i = e + 2;
      } else if (c === "#" && s[this.i + 1] === ";") { this.i += 2; this.read(); }
      else return;
    }
  };
  Reader.prototype.read = function () {
    this.skip();
    var s = this.s, c = s[this.i], line = this.line;
    if (c === undefined) return Reader.EOF;
    if (c === "(" || c === "[") {
      var close = c === "(" ? ")" : "]"; this.i++;
      var items = [];
      for (;;) {
        this.skip();
        var d = s[this.i];
        if (d === undefined) throw new RacketError("Klammer-Fehler: Zur öffnenden Klammer in Zeile " + line + " fehlt die schließende Klammer.", "syntax");
        if (d === ")" || d === "]") {
          if (d !== close) throw new RacketError("Klammer-Fehler in Zeile " + this.line + ": „" + d + "“ passt nicht zur öffnenden „" + c + "“.", "syntax");
          this.i++; break;
        }
        items.push(this.read());
      }
      items.line = line; return items;
    }
    if (c === ")" || c === "]") { this.i++; throw new RacketError("Klammer-Fehler in Zeile " + line + ": eine schließende Klammer „" + c + "“ zu viel.", "syntax"); }
    if (c === "'") { this.i++; var q = [sym("quote"), this.read()]; q.line = line; return q; }
    if (c === "`") { this.i++; var qq = [sym("quote"), this.read()]; qq.line = line; return qq; }
    if (c === '"') {
      this.i++; var out = "";
      for (;;) {
        var ch = s[this.i++];
        if (ch === undefined) throw new RacketError("Zeichenkette ab Zeile " + line + " wird nicht mit \" geschlossen.", "syntax");
        if (ch === '"') break;
        if (ch === "\\") { var nx = s[this.i++]; out += nx === "n" ? "\n" : nx === "t" ? "\t" : nx; }
        else { if (ch === "\n") this.line++; out += ch; }
      }
      return new String(out); // String-Objekt: unterscheidet Literal von Symbolnamen
    }
    var start = this.i;
    while (this.i < s.length && !/[\s()\[\]";']/.test(s[this.i])) this.i++;
    var tok = s.slice(start, this.i);
    if (tok === "#t" || tok === "#true") return true;
    if (tok === "#f" || tok === "#false") return false;
    if (tok.startsWith("#\\")) return new String(tok.slice(2));
    var n = parseNumber(tok);
    if (n !== null) return n;
    var sy = sym(tok); return { sym: sy, line: line };
  };
  Reader.EOF = { eof: true };
  function readAll(src) {
    var r = new Reader(src), out = [];
    for (;;) { var x = r.read(); if (x === Reader.EOF) break; out.push(x); }
    return out;
  }
  // Symbole im Syntaxbaum: {sym, line}; Listen: Arrays; Zeichenketten: String-Objekte
  function isSymNode(x) { return x && typeof x === "object" && x.sym instanceof Sym; }
  function symName(x) { return isSymNode(x) ? x.sym.name : (x instanceof Sym ? x.name : null); }
  function lineOf(x) { return x && (x.line || (Array.isArray(x) && x.line)) || null; }

  // ------------------------------------------------------------------ Umgebung
  function Env(parent) { this.vars = new Map(); this.parent = parent; }
  Env.prototype.lookup = function (name, node) {
    var e = this;
    while (e) { if (e.vars.has(name)) { var v = e.vars.get(name); if (v instanceof Locked) throw new RacketError(v.msg, "level"); if (v === UNINIT) throw new RacketError(name + ": Variable wird benutzt, bevor sie definiert ist", "unbound"); return v; } e = e.parent; }
    throw new RacketError(name + ": Variable ist nicht definiert", "unbound", name);
  };
  Env.prototype.define = function (name, v) { this.vars.set(name, v); };
  var UNINIT = {};

  // ------------------------------------------------------------------ Ausgabe
  function show(v, depth) {
    depth = depth || 0;
    if (depth > 40) return "…";
    if (v === true) return "#t";
    if (v === false) return "#f";
    if (isNumber(v)) return numToString(v);
    if (v instanceof String || typeof v === "string") return JSON.stringify(String(v));
    if (v === Empty) return "empty";
    if (v instanceof Sym) return "'" + v.name;
    if (v instanceof Pair) {
      var parts = [], p = v, n = 0;
      while (p instanceof Pair && n < 60) { parts.push(show(p.car, depth + 1)); p = p.cdr; n++; }
      if (p instanceof Pair) parts.push("…");
      return "(list " + parts.join(" ") + ")";
    }
    if (v instanceof Closure) return "#<procedure" + (v.name ? ":" + v.name : "") + ">";
    if (v instanceof Prim) return "#<procedure:" + v.name + ">";
    if (v instanceof RecordVal) return "#<record:" + v.type.name + (v.vals.length ? " " + v.vals.map(function (x) { return show(x, depth + 1); }).join(" ") : "") + ">";
    if (v instanceof Img) return "[Bild " + Math.round(v.w) + "×" + Math.round(v.h) + "]";
    if (v instanceof Sig || v instanceof LazySig) return "#<signature>";
    if (v instanceof Property) return "#<property>";
    if (v instanceof Singleton) return v.name;
    if (v instanceof IWorld) return "#<iworld:" + v.name + ">";
    if (v instanceof Clause) return "#<" + v.kind + ">";
    if (v === Void || v === undefined) return "";
    return String(v);
  }
  function typeName(v) {
    if (isNumber(v)) return "Zahl"; if (v instanceof String || typeof v === "string") return "Zeichenkette";
    if (v === true || v === false) return "Wahrheitswert"; if (v === Empty) return "leere Liste";
    if (v instanceof Pair) return "Liste"; if (v instanceof Closure || v instanceof Prim) return "Funktion";
    if (v instanceof RecordVal) return "Record " + v.type.name; if (v instanceof Img) return "Bild";
    if (v instanceof Sym) return "Symbol"; return "Wert";
  }

  // ------------------------------------------------------------------ Gleichheit
  var imageEqualHook = null; // im Browser: Pixelvergleich
  function equal(a, b, eps) {
    if ((a instanceof Cx || b instanceof Cx) && isNumber(a) && isNumber(b)) return equal(reP(a), reP(b), eps) && equal(imP(a), imP(b), eps);
    if (isNum(a) && isNum(b)) {
      if (eps !== undefined) return Math.abs(toF(a) - toF(b)) <= toF(eps);
      if (isExact(a) && isExact(b)) return cmp(a, b) === 0;
      return Math.abs(toF(a) - toF(b)) < 1e-9;
    }
    if ((a instanceof String || typeof a === "string") && (b instanceof String || typeof b === "string")) return String(a) === String(b);
    if (a instanceof Pair && b instanceof Pair) {
      while (a instanceof Pair && b instanceof Pair) { if (!equal(a.car, b.car, eps)) return false; a = a.cdr; b = b.cdr; }
      return equal(a, b, eps);
    }
    if (a instanceof RecordVal && b instanceof RecordVal) {
      if (a.type !== b.type && a.type.name !== b.type.name) return false;
      for (var i = 0; i < a.vals.length; i++) if (!equal(a.vals[i], b.vals[i], eps)) return false;
      return true;
    }
    if (a instanceof Img && b instanceof Img) return imageEqualHook ? imageEqualHook(a, b) : a.key() === b.key();
    return a === b;
  }

  // ------------------------------------------------------------------ Auswerter
  function Interp(opts) {
    opts = opts || {};
    this.steps = 0; this.maxSteps = opts.maxSteps || 3000000;
    this.global = new Env(null);
    this.tests = []; this.output = [];
    this.checkSigs = !!opts.checkSigs; this.sigDecls = new Map(); this.sigViolations = [];
    this.level = opts.level || null; this.lockedForms = {};
    installPrims(this);
    if (this.level) applyLevel(this, this.level);
  }
  function tick(it) { if (++it.steps > it.maxSteps) throw new RacketError("Das Programm läuft zu lange (über " + (it.maxSteps / 1e6) + " Mio. Schritte) – vermutlich eine Endlosrekursion: Wird der rekursive Aufruf wirklich mit einem kleineren Wert gemacht?", "loop"); }

  function special(name) { return SPECIAL.hasOwnProperty(name); }
  var SPECIAL = { define: 1, lambda: 1, "λ": 1, cond: 1, if: 1, and: 1, or: 1, let: 1, "let*": 1, letrec: 1, quote: 1, "define-record": 1, "define-record-procedures": 1,
    "check-expect": 1, "check-within": 1, "check-error": 1, "check-property": 1, "check-satisfied": 1, "check-member-of": 1, "check-range": 1, ":": 1, signature: 1, "for-all": 1, "==>": 1, begin: 1, else: 1,
    match: 1, "define-singleton": 1 };

  Interp.prototype.evalBody = function (forms, env) {
    // interne Definitionen zuerst, dann der letzte Ausdruck (Endposition)
    for (var i = 0; i < forms.length - 1; i++) this.eval(forms[i], env);
    return forms[forms.length - 1];
  };

  Interp.prototype.eval = function (x, env) {
    for (;;) {
      tick(this);
      if (isSymNode(x)) {
        var nm = x.sym.name;
        if (nm.charAt(0) === "%" && !env.vars.has(nm)) return new Sig("var", nm);
        try { return env.lookup(nm); }
        catch (e) { if (e instanceof RacketError && e.kind === "unbound" && x.line) e.line = x.line; throw e; }
      }
      if (!Array.isArray(x)) {
        if (x instanceof String) return String(x);
        return x;
      }
      if (x.length === 0) throw new RacketError("(): leere Klammern – hier fehlt der Operator", "syntax");
      var head = x[0], hn = symName(head);
      if (hn && special(hn) && !env.vars.has(hn) && !(env !== this.global && this.shadowed(hn, env))) {
        if (this.lockedForms[hn]) throw new RacketError(this.lockedForms[hn], "level");
        switch (hn) {
          case "quote": return quoteData(x[1]);
          case "define": return this.doDefine(x, env);
          case "lambda": case "λ": return this.makeLambda(x, env, null);
          case "if": {
            if (x.length !== 4) throw new RacketError("if: erwartet Bedingung, Konsequente und Alternative (3 Teile), hat aber " + (x.length - 1), "syntax");
            var c = this.eval(x[1], env);
            if (c !== true && c !== false) throw new RacketError("if: Bedingung ergab keinen Wahrheitswert, sondern " + show(c), "type");
            x = c ? x[2] : x[3]; continue;
          }
          case "cond": {
            var chosen = null;
            for (var i = 1; i < x.length; i++) {
              var cl = x[i];
              if (!Array.isArray(cl) || cl.length < 2) throw new RacketError("cond: jeder Zweig braucht die Form (Bedingung Ergebnis)", "syntax");
              if (symName(cl[0]) === "else") { if (i !== x.length - 1) throw new RacketError("cond: else muss der letzte Zweig sein", "syntax"); chosen = cl; break; }
              var t = this.eval(cl[0], env);
              if (t !== true && t !== false) throw new RacketError("cond: Bedingung ergab keinen Wahrheitswert, sondern " + show(t), "type");
              if (t) { chosen = cl; break; }
            }
            if (!chosen) throw new RacketError("cond: alle Bedingungen ergaben #f", "cond");
            x = this.evalBody(chosen.slice(1), env); continue;
          }
          case "and": case "or": {
            if (x.length === 1) return hn === "and";
            for (var j = 1; j < x.length - 1; j++) {
              var b = this.eval(x[j], env);
              if (b !== true && b !== false) throw new RacketError(hn + ": Wahrheitswert erwartet, " + show(b) + " bekommen", "type");
              if (hn === "and" && !b) return false;
              if (hn === "or" && b) return true;
            }
            var last = this.eval(x[x.length - 1], env);
            if (last !== true && last !== false) throw new RacketError(hn + ": Wahrheitswert erwartet, " + show(last) + " bekommen", "type");
            return last;
          }
          case "let": case "let*": case "letrec": {
            var bindings = x[1];
            if (!Array.isArray(bindings)) throw new RacketError(hn + ": erwartet eine Liste von Bindungen ((name wert) …)", "syntax");
            var ne = new Env(env);
            for (var k = 0; k < bindings.length; k++) {
              var bd = bindings[k], bn = symName(bd[0]);
              if (hn === "letrec") ne.define(bn, UNINIT);
            }
            for (k = 0; k < bindings.length; k++) {
              var bd2 = bindings[k], bn2 = symName(bd2[0]);
              var val = this.eval(bd2[1], hn === "let" ? env : ne);
              if (val instanceof Closure && !val.name) val.name = bn2;
              if (hn === "let*") { ne = new Env(ne); }
              ne.define(bn2, val);
            }
            x = this.evalBody(x.slice(2), ne); env = ne; continue;
          }
          case "begin": x = this.evalBody(x.slice(1), env); continue;
          case "define-record": case "define-record-procedures": return this.doRecord(x, env);
          case "check-expect": case "check-within": case "check-error": case "check-property": case "check-satisfied": case "check-member-of": case "check-range":
            this.tests.push({ kind: hn, form: x, env: env, line: x.line }); return Void;
          case ":": return this.doSigDecl(x, env);
          case "define-singleton": return this.doSingleton(x, env);
          case "match": {
            if (x.length < 3) throw new RacketError("match: erwartet einen Ausdruck und mindestens einen Zweig (Muster Ausdruck)", "syntax");
            var mv = this.eval(x[1], env), hit = null, menv = null;
            for (var mi = 2; mi < x.length; mi++) {
              var mcl = x[mi];
              if (!Array.isArray(mcl) || mcl.length < 2) throw new RacketError("match: jeder Zweig hat die Form (Muster Ausdruck)", "syntax");
              var bnd = new Map();
              if (this.matchPat(mcl[0], mv, bnd, env)) { hit = mcl; menv = new Env(env); bnd.forEach(function (v, k) { menv.define(k, v); }); break; }
            }
            if (!hit) throw new RacketError("match: kein Zweig passt auf den Wert " + show(mv), "cond");
            x = this.evalBody(hit.slice(1), menv); env = menv; continue;
          }
          case "signature": return new LazySig(x[1], env);
          case "for-all": {
            var vars = [], sigs = [];
            x[1].forEach(function (p) { vars.push(symName(p[0])); sigs.push(p[1]); });
            return new Property(vars, sigs, x[2], env);
          }
          case "==>": {
            var cond = this.eval(x[1], env);
            if (!cond) return SKIP;
            x = x[2]; continue;
          }
          case "else": throw new RacketError("else: nur als letzter Zweig in cond erlaubt", "syntax");
        }
      }
      // Anwendung
      var f = this.eval(head, env);
      var args = new Array(x.length - 1);
      for (var a = 1; a < x.length; a++) args[a - 1] = this.eval(x[a], env);
      if (f instanceof Closure) {
        if (f.sigDecl && this.checkSigs) return this.applyChecked(f, args, x.line);
        var fe = bindArgs(f, args);
        env = fe; x = this.evalBody(f.body, fe); continue;
      }
      return this.applyNonClosure(f, args, head, x.line);
    }
  };
  Interp.prototype.shadowed = function (name, env) { var e = env; while (e && e !== this.global) { if (e.vars.has(name)) return true; e = e.parent; } return false; };
  function bindArgs(f, args) {
    var n = f.params.length;
    if (f.rest ? args.length < n : args.length !== n)
      throw new RacketError((f.name || "Funktion") + ": erwartet " + (f.rest ? "mindestens " : "") + n + " Argument" + (n === 1 && !f.rest ? "" : "e") + ", bekommt aber " + args.length, "arity");
    var fe = new Env(f.env);
    for (var p = 0; p < n; p++) fe.define(f.params[p], args[p]);
    if (f.rest) { var l = Empty; for (var q = args.length - 1; q >= n; q--) l = new Pair(args[q], l); fe.define(f.rest, l); }
    return fe;
  }
  Interp.prototype.applyNonClosure = function (f, args, head, line) {
    if (f instanceof Prim) {
      if (f.sigCheck && this.checkSigs) f.sigCheck(args, line);
      if (args.length < f.min || (f.max !== -1 && args.length > f.max))
        throw new RacketError(f.name + ": erwartet " + (f.min === f.max ? f.min : f.max === -1 ? "mindestens " + f.min : f.min + " bis " + f.max) + " Argument" + ((f.min === 1 && f.max === 1) ? "" : "e") + ", bekommt aber " + args.length, "arity");
      return f.fn.apply(this, args);
    }
    if (f instanceof Sig || f instanceof LazySig) return new Sig("app", [f, args]);
    if (isNum(f)) throw new RacketError("Operator darf keine Zahl sein, ist aber " + show(f) + " – steht der Operator vorne in der Klammer?", "notproc");
    throw new RacketError("Operator ist keine Funktion: " + show(f) + " (" + typeName(f) + ") – Klammern bedeuten „anwenden“; ist hier eine Klammer zu viel?", "notproc");
  };
  Interp.prototype.apply = function (f, args) {
    if (f instanceof Closure) {
      if (f.sigDecl && this.checkSigs) return this.applyChecked(f, args, null);
      var fe = bindArgs(f, args);
      return this.eval(this.evalBody(f.body, fe), fe);
    }
    return this.applyNonClosure(f, args, null);
  };
  var SKIP = { skip: true };

  Interp.prototype.makeLambda = function (x, env, name) {
    var ps = x[1];
    if (!Array.isArray(ps)) throw new RacketError("lambda: nach lambda kommt die Parameterliste in Klammern, z. B. (lambda (x) …)", "syntax");
    if (x.length < 3) throw new RacketError("lambda: der Rumpf fehlt", "syntax");
    var names = ps.map(function (p) { var n = symName(p); if (!n) throw new RacketError("lambda: Parameter müssen Namen sein", "syntax"); return n; });
    var rest = null, dot = names.indexOf(".");
    if (dot >= 0) {
      if (this.level && this.level !== "advanced") throw new RacketError("lambda: Ein Restparameter mit Punkt (lambda (x . rest) …) gibt es erst in der Sprachebene „Schreibe Dein Programm! – fortgeschritten“", "syntax");
      if (dot !== names.length - 2) throw new RacketError("lambda: Nach dem Punkt muss genau ein Name für den Restparameter stehen", "syntax");
      rest = names[dot + 1]; names = names.slice(0, dot);
    }
    var cl = new Closure(names, x.slice(2), env, name); cl.rest = rest; return cl;
  };
  Interp.prototype.doDefine = function (x, env) {
    if (Array.isArray(x[1])) {
      throw new RacketError("define: In der Lehrsprache gibt es kein (define (" + (symName(x[1][0]) || "f") + " …) …). Schreibe (define " + (symName(x[1][0]) || "f") + " (lambda (…) …)).", "syntax");
    }
    var name = symName(x[1]);
    if (!name) throw new RacketError("define: nach define muss ein Name stehen", "syntax");
    if (x.length !== 3) throw new RacketError("define: erwartet einen Namen und genau einen Ausdruck, hat aber " + (x.length - 2) + " Ausdrücke", "syntax");
    var vx = x[2], val;
    var hn = Array.isArray(vx) ? symName(vx[0]) : null;
    if ((hn === "lambda" || hn === "λ") && !env.vars.has(hn)) val = this.makeLambda(vx, env, name);
    else { env.define(name, UNINIT); val = this.eval(vx, env); if (val instanceof Closure && !val.name) val.name = name; }
    env.define(name, val);
    if (this.checkSigs && this.sigDecls.has(name) && env === this.global) this.attachSig(name, val, this.sigDecls.get(name));
    return Void;
  };
  Interp.prototype.doRecord = function (x, env) {
    var it = this;
    var tn = x[1], typeName = Array.isArray(tn) ? symName(tn[0]) : symName(tn);
    var ctor = symName(x[2]);
    var rest = x.slice(3), pred = null;
    if (rest.length && !Array.isArray(rest[0])) { pred = symName(rest[0]); rest = rest.slice(1); }
    var fields = rest.map(function (f) { return symName(f[0]); });
    var rt = new RecordType(typeName, fields); rt.ctorName = ctor;
    rt.fieldSigs = rest.map(function (f) { return f[1]; }); rt.env = env; rt.params = Array.isArray(tn) ? tn.length - 1 : 0;
    var sigv = new Sig("record", rt);
    env.define(typeName, Array.isArray(tn) ? new Prim(typeName, function () { return sigv; }, 0, -1) : sigv);
    var ctorP = new Prim(ctor, function () { return new RecordVal(rt, Array.prototype.slice.call(arguments)); }, fields.length);
    ctorP.recordType = rt;
    ctorP.sigCheck = function (args, line) {
      for (var i = 0; i < args.length; i++) if (rt.fieldSigs[i] !== undefined) {
        var sg; try { sg = it.evalSig(rt.fieldSigs[i], rt.env); } catch (e) { continue; }
        if (!it.sigOk(sg, args[i])) it.violation(ctor + ": Signaturverletzung beim Feld " + fields[i] + " – bekommen " + show(args[i]) + ", erwartet " + unparse(rt.fieldSigs[i]), line, lineOf(rt.fieldSigs[i]));
      }
    };
    env.define(ctor, ctorP);
    if (pred) env.define(pred, new Prim(pred, function (v) { return v instanceof RecordVal && (v.type === rt || v.type.name === rt.name); }, 1));
    fields.forEach(function (sel, i) {
      env.define(sel, new Prim(sel, function (v) {
        if (!(v instanceof RecordVal) || (v.type !== rt && v.type.name !== rt.name))
          throw new RacketError(sel + ": Signaturverletzung – erwartet einen Record " + typeName + ", bekommen " + show(v) + (v instanceof RecordVal ? " (ein Record " + v.type.name + ")" : ""), "sig");
        return v.vals[i];
      }, 1));
    });
    return Void;
  };
  function quoteData(d) {
    if (Array.isArray(d)) { var l = Empty; for (var i = d.length - 1; i >= 0; i--) l = new Pair(quoteData(d[i]), l); return l; }
    if (isSymNode(d)) return d.sym;
    if (d instanceof String) return String(d);
    return d;
  }

  // ------------------------------------------------------------------ Signaturen prüfen (wie DrRacket: Verletzungen werden gesammelt, das Programm läuft weiter)
  function unparse(x) {
    if (Array.isArray(x)) return "(" + x.map(unparse).join(" ") + ")";
    if (isSymNode(x)) return x.sym.name;
    if (x instanceof String) return JSON.stringify(String(x));
    if (x === true) return "#t"; if (x === false) return "#f";
    if (isNum(x)) return numToString(x);
    return String(x);
  }
  Interp.prototype.violation = function (msg, line, sigLine) {
    if (this.sigViolations.length >= 100) return;
    var full = msg + (line ? " (Aufruf in Zeile " + line + (sigLine ? ", Signatur in Zeile " + sigLine : "") + ")" : sigLine ? " (Signatur in Zeile " + sigLine + ")" : "");
    for (var i = 0; i < this.sigViolations.length; i++) if (this.sigViolations[i].msg === full) { this.sigViolations[i].count++; return; }
    this.sigViolations.push({ msg: full, line: line, sigLine: sigLine, count: 1 });
  };
  // Signatur-Ausdruck auswerten; (a b -> c) wird zur Funktions-Signatur
  Interp.prototype.evalSig = function (x, env) {
    var it = this;
    if (Array.isArray(x)) {
      var ai = -1; for (var i = 0; i < x.length; i++) if (symName(x[i]) === "->") ai = i;
      if (ai >= 0) return new Sig("fn", { args: x.slice(0, ai).map(function (a) { return it.evalSig(a, env); }), res: x[ai + 1] !== undefined ? it.evalSig(x[ai + 1], env) : new Sig("base", "any") });
      var hn = symName(x[0]);
      if (hn === "signature") return it.evalSig(x[1], env);
      if (hn === "predicate" || hn === "lambda" || hn === "λ" || hn === "integer-from-to" || hn === "enum" || hn === "one-of") return it.resolveSig(it.eval(x, env));
      var f = it.eval(x[0], env);
      if (f instanceof Prim) return it.resolveSig(f.fn.apply(it, x.slice(1).map(function (a) { return it.evalSig(a, env); })));
      if (f instanceof Closure) return it.resolveSig(it.apply(f, x.slice(1).map(function (a) { return it.evalSig(a, env); })));
      return new Sig("base", "any");
    }
    if (isSymNode(x)) { if (x.sym.name.charAt(0) === "%") return new Sig("var", x.sym.name); return it.resolveSig(env.lookup(x.sym.name)); }
    return it.resolveSig(it.eval(x, env));
  };
  Interp.prototype.sigOk = function (sg, v) {
    var it = this; sg = it.resolveSig(sg);
    if (!(sg instanceof Sig)) return true;
    switch (sg.kind) {
      case "base":
        switch (sg.data) {
          case "number": return isNumber(v);
          case "real": return isNum(v);
          case "rational": return isNum(v) && (isExact(v) || Number.isFinite(v));
          case "integer": return isNum(v) && isInt(v);
          case "natural": return isNum(v) && isInt(v) && cmp(v, R(0)) >= 0;
          case "boolean": return v === true || v === false;
          case "string": return typeof v === "string" || v instanceof String;
          case "symbol": return v instanceof Sym;
          case "empty-list": return v === Empty;
          case "true": return v === true; case "false": return v === false;
          case "image": return v instanceof Img;
          case "property": return v instanceof Property || v === true || v === false;
          case "color": return typeof v === "string" || (v instanceof RecordVal && v.type.name === "color");
          case "mode": return v === "solid" || v === "outline" || isNum(v);
          default: return true;
        }
      case "var": return true;
      case "list": case "nelist": {
        if (sg.kind === "nelist" && !(v instanceof Pair)) return false;
        while (v instanceof Pair) { if (!it.sigOk(sg.data, v.car)) return false; v = v.cdr; }
        return v === Empty;
      }
      case "range": return isNum(v) && isInt(v) && cmp(v, sg.data[0]) >= 0 && cmp(v, sg.data[1]) <= 0;
      case "enum": return sg.data.some(function (o) { return equal(o, v); });
      case "mixed": return sg.data.some(function (o) { return it.sigOk(o, v); });
      case "combined": return sg.data.every(function (o) { return it.sigOk(o, v); });
      case "pred": { var r; try { r = it.apply(sg.data, [v]); } catch (e) { return false; } return r === true; }
      case "record": return v instanceof RecordVal && (v.type === sg.data || v.type.name === sg.data.name);
      case "singleton": return v === sg.data;
      case "fn": return v instanceof Closure || v instanceof Prim;
      case "app": return true;
    }
    return true;
  };
  Interp.prototype.doSigDecl = function (x, env) {
    if (x.length !== 3) throw new RacketError(": erwartet einen Namen und eine Signatur, z. B. (: f (number -> number))", "syntax");
    var name = symName(x[1]);
    if (!name) throw new RacketError(": nach dem Doppelpunkt muss der Name stehen, dann die Signatur", "syntax");
    if (!this.checkSigs) return Void;
    var decl = { expr: x[2], env: env, line: x.line || lineOf(x[2]), name: name };
    this.sigDecls.set(name, decl);
    if (env.vars.has(name)) { var v = env.vars.get(name); if (v !== UNINIT) this.attachSig(name, v, decl); }
    return Void;
  };
  Interp.prototype.attachSig = function (name, val, decl) {
    var sg;
    try { sg = this.evalSig(decl.expr, decl.env); } catch (e) { sg = null; }
    if (val instanceof Closure) { val.sigDecl = decl; return; }
    if (sg && !(sg.kind === "fn") && !this.sigOk(sg, val)) this.violation(name + ": Signaturverletzung – der Wert " + show(val) + " passt nicht zur Signatur " + unparse(decl.expr), null, decl.line);
  };
  Interp.prototype.applyChecked = function (f, args, line) {
    var d = f.sigDecl, sg = d.sig;
    if (!sg) { try { sg = d.sig = this.evalSig(d.expr, d.env); } catch (e) { sg = d.sig = new Sig("base", "any"); } }
    var fe = bindArgs(f, args);
    if (sg.kind === "fn") {
      if (sg.data.args.length !== f.params.length && !f.rest && !d.arityWarned) {
        d.arityWarned = true;
        this.violation(f.name + ": Die Signatur nennt " + sg.data.args.length + " Argument" + (sg.data.args.length === 1 ? "" : "e") + ", die Funktion hat aber " + f.params.length + " Parameter", null, d.line);
      }
      var argExprs = Array.isArray(d.expr) ? d.expr : [];
      for (var i = 0; i < args.length && i < sg.data.args.length; i++)
        if (!this.sigOk(sg.data.args[i], args[i])) this.violation(f.name + ": Signaturverletzung beim " + (i + 1) + ". Argument – bekommen " + show(args[i]) + ", erwartet " + unparse(argExprs[i]), line, d.line);
    }
    var res = this.eval(this.evalBody(f.body, fe), fe);
    if (sg.kind === "fn" && !this.sigOk(sg.data.res, res)) {
      var rx = Array.isArray(d.expr) ? d.expr[d.expr.length - 1] : null;
      this.violation(f.name + ": Signaturverletzung beim Ergebnis – geliefert " + show(res) + ", erwartet " + unparse(rx), line, d.line);
    }
    return res;
  };
  Interp.prototype.doSingleton = function (x, env) {
    // (define-singleton signatur name [prädikat])
    var sn = symName(x[1]), vn = symName(x[2]), pn = x[3] ? symName(x[3]) : null;
    if (!sn || !vn) throw new RacketError("define-singleton: erwartet (define-singleton signatur name) oder (define-singleton signatur name prädikat)", "syntax");
    var single = new Singleton(vn);
    env.define(sn, new Sig("singleton", single));
    env.define(vn, single);
    if (pn) env.define(pn, new Prim(pn, function (v) { return v === single; }, 1));
    return Void;
  };
  // Muster für match: Name, ... / _ (alles), Literale, empty, (cons a b), (list a …), 'symbol, (konstruktor muster …)
  Interp.prototype.matchPat = function (pat, v, bnd, env) {
    var it = this;
    if (isSymNode(pat)) {
      var n = pat.sym.name;
      if (n === "..." || n === "_") return true;
      if (n === "empty") return v === Empty;
      if (n === "#t" || n === "true") return v === true;
      if (n === "#f" || n === "false") return v === false;
      bnd.set(n, v); return true;
    }
    if (pat instanceof String) return (typeof v === "string" || v instanceof String) && String(v) === String(pat);
    if (pat === true || pat === false) return v === pat;
    if (isNum(pat)) return isNum(v) && equal(pat, v);
    if (Array.isArray(pat)) {
      var h = symName(pat[0]);
      if (h === "quote") return equal(quoteData(pat[1]), v);
      if (h === "cons") return v instanceof Pair && pat.length === 3 && it.matchPat(pat[1], v.car, bnd, env) && it.matchPat(pat[2], v.cdr, bnd, env);
      if (h === "list") { for (var i = 1; i < pat.length; i++) { if (!(v instanceof Pair) || !it.matchPat(pat[i], v.car, bnd, env)) return false; v = v.cdr; } return v === Empty; }
      var c; try { c = env.lookup(h); } catch (e) { throw new RacketError("match: " + h + " ist kein Konstruktor eines Records", "syntax"); }
      if (!(c instanceof Prim) || !c.recordType) throw new RacketError("match: " + h + " ist kein Konstruktor eines Records", "syntax");
      if (!(v instanceof RecordVal) || (v.type !== c.recordType && v.type.name !== c.recordType.name)) return false;
      if (pat.length - 1 !== v.vals.length) throw new RacketError("match: das Muster für " + h + " braucht " + v.vals.length + " Teilmuster, hat aber " + (pat.length - 1), "syntax");
      for (var k = 1; k < pat.length; k++) if (!it.matchPat(pat[k], v.vals[k - 1], bnd, env)) return false;
      return true;
    }
    return false;
  };

  // ------------------------------------------------------------------ Programm laufen lassen
  Interp.prototype.run = function (src) {
    var forms = readAll(src), values = [];
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      var v = this.eval(f, this.global);
      var hn = Array.isArray(f) ? symName(f[0]) : null;
      var isDef = hn && (hn === "define" || hn === "define-record" || hn === "define-singleton" || hn === ":" || hn.indexOf("check-") === 0);
      if (!isDef && v !== Void) values.push({ form: f, value: v });
    }
    return values;
  };

  // Tests ausführen; liefert Liste von Ergebnissen
  Interp.prototype.runTests = function (tests) {
    var it = this, res = [];
    (tests || this.tests).forEach(function (t) { res.push(it.runTest(t)); });
    return res;
  };
  Interp.prototype.runTest = function (t, actualEnv, expectedEnv) {
    var f = t.form, it = this, aEnv = actualEnv || t.env, eEnv = expectedEnv || t.env;
    var r = { kind: t.kind, form: f, line: t.line };
    try {
      if (t.kind === "check-expect" || t.kind === "check-within") {
        var exp = it.eval(f[2], eEnv);
        r.expected = exp;
        var act = it.eval(f[1], aEnv);
        r.actual = act;
        var eps = t.kind === "check-within" ? it.eval(f[3], eEnv) : undefined;
        r.ok = equal(act, exp, eps);
      } else if (t.kind === "check-error") {
        try { r.actual = it.eval(f[1], aEnv); r.ok = false; r.noError = true; }
        catch (e) {
          if (!(e instanceof RacketError) || e.kind === "loop") throw e;
          r.errorMsg = e.message; r.ok = true;
          if (f.length > 2) { var want = it.eval(f[2], eEnv); if (String(want) !== e.message) { r.ok = false; r.wrongMsg = true; r.expectedMsg = String(want); } }
        }
      } else if (t.kind === "check-member-of") {
        var av = it.eval(f[1], aEnv); r.actual = av;
        var opts = f.slice(2).map(function (e) { return it.eval(e, eEnv); });
        r.expected = opts; r.ok = opts.some(function (o) { return equal(av, o); }); r.memberOf = true;
      } else if (t.kind === "check-range") {
        var rv = it.eval(f[1], aEnv), lo = it.eval(f[2], eEnv), hi = it.eval(f[3], eEnv); r.actual = rv; r.range = [lo, hi];
        r.ok = isNum(rv) && cmp(rv, lo) >= 0 && cmp(rv, hi) <= 0;
      } else if (t.kind === "check-satisfied") {
        var v = it.eval(f[1], aEnv), pr = it.eval(f[2], eEnv);
        r.actual = v; r.ok = it.apply(pr, [v]) === true;
      } else if (t.kind === "check-property") {
        var prop = it.eval(f[1], aEnv);
        var pres = it.checkProperty(prop);
        r.ok = pres.ok; r.counter = pres.counter; r.untestable = pres.untestable; r.propError = pres.error;
      }
    } catch (e) {
      if (!(e instanceof RacketError)) {
        if (e instanceof RangeError) e = new RacketError("Zu tiefe Rekursion – vermutlich eine Endlosrekursion.", "loop");
        else throw e;
      }
      r.ok = false; r.error = e;
    }
    return r;
  };

  // ------------------------------------------------------------------ Eigenschaften (check-property)
  function rnd(n) { return Math.floor(Math.random() * n); }
  Interp.prototype.resolveSig = function (s) {
    var guard = 0;
    while (s instanceof LazySig && guard++ < 50) { if (!s.cache) s.cache = this.eval(s.expr, s.env); s = s.cache; }
    return s;
  };
  Interp.prototype.gen = function (s, depth) {
    s = this.resolveSig(s); depth = depth || 0;
    if (!(s instanceof Sig)) throw new RacketError("untestable", "untestable");
    var it = this;
    switch (s.kind) {
      case "var": return it.gen(new Sig("base", "natural"), depth);
      case "record": {
        var rt = s.data;
        if (depth > 4 || rt.params) throw new RacketError("untestable", "untestable");
        return new RecordVal(rt, rt.fieldSigs.map(function (fs) {
          if (fs === undefined) return R(rnd(10));
          var fsig; try { fsig = it.eval(fs, rt.env); } catch (e) { throw new RacketError("untestable", "untestable"); }
          return it.gen(fsig, depth + 1);
        }));
      }
      case "base":
        var hints = it.numHints || [];
        var pick = function (pred) { var c = hints.filter(pred); return c.length && rnd(2) === 0 ? c[rnd(c.length)] : null; };
        switch (s.data) {
          case "natural": { var h = pick(function (x) { return isInt(x) && cmp(x, R(0)) >= 0; }); return h || R(rnd(depth > 2 ? 5 : 30)); }
          case "integer": { var h2 = pick(function (x) { return isInt(x); }); return h2 || R(rnd(61) - 30); }
          case "rational": case "number": case "real": { var h3 = pick(function () { return true; }); return h3 || (rnd(3) === 0 ? R(rnd(41) - 20) : new Rat(BigInt(rnd(201) - 100), BigInt(rnd(9) + 1))); }
          case "boolean": return rnd(2) === 0;
          case "string": { var sh = (it.strHints || []); if (sh.length && rnd(2) === 0) return sh[rnd(sh.length)]; var al = "abcdeäöxyz ", n = rnd(6), o = ""; while (n--) o += al[rnd(al.length)]; return o; }
          case "any": return R(rnd(10));
          case "empty-list": return Empty;
          case "true": return true; case "false": return false;
        }
        break;
      case "list": case "nelist": {
        var len = rnd(depth > 1 ? 3 : 8) + (s.kind === "nelist" ? 1 : 0), l = Empty;
        while (len--) l = new Pair(it.gen(s.data, depth + 1), l);
        return l;
      }
      case "range": { var lo = Number(s.data[0].n), hi = Number(s.data[1].n); return R(lo + rnd(hi - lo + 1)); }
      case "enum": return s.data[rnd(s.data.length)];
      case "mixed": {
        var opts = s.data;
        if (depth > 2) { var base = opts.filter(function (o) { var rs = it.resolveSig(o); return !(rs instanceof Sig && rs.kind === "record"); }); if (base.length) opts = base; }
        return it.gen(opts[rnd(opts.length)], depth + 1);
      }
      case "app": {
        var f = s.data[0];
        throw new RacketError("untestable", "untestable");
      }
    }
    throw new RacketError("untestable", "untestable");
  };
  Interp.prototype.checkProperty = function (prop) {
    if (!(prop instanceof Property)) {
      if (prop === true) return { ok: true }; if (prop === false) return { ok: false };
      return { ok: true, untestable: true };
    }
    var it = this, sigs;
    try { sigs = prop.sigExprs.map(function (se) { return it.eval(se, prop.env); }); }
    catch (e) { return { ok: true, untestable: true }; }
    for (var trial = 0; trial < 100; trial++) {
      var vals;
      try { vals = sigs.map(function (s) { return it.gen(s, 0); }); }
      catch (e) { if (e instanceof RacketError && e.kind === "untestable") return { ok: true, untestable: true }; throw e; }
      var ne = new Env(prop.env);
      prop.vars.forEach(function (v, i) { ne.define(v, vals[i]); });
      var r;
      try { r = it.eval(prop.body, ne); }
      catch (e) {
        if (!(e instanceof RacketError) || e.kind === "loop") throw e;
        return { ok: false, counter: prop.vars.map(function (v, i) { return v + " = " + show(vals[i]); }), error: e };
      }
      if (r === SKIP) continue;
      if (r instanceof Property) { var sub = it.checkProperty(r); if (!sub.ok) return sub; continue; }
      if (r !== true) return { ok: false, counter: prop.vars.map(function (v, i) { return v + " = " + show(vals[i]); }) };
    }
    return { ok: true };
  };

  // ------------------------------------------------------------------ Bilder
  function Img(w, h, draw, key) { this.w = w; this.h = h; this.draw = draw; this._key = key; }
  Img.prototype.key = function () { return this._key; };
  function colorOf(c) {
    if (c instanceof RecordVal) return c.vals[3] !== undefined ? "rgba(" + c.vals.slice(0, 3).map(toF).join(",") + "," + (toF(c.vals[3]) / 255) + ")" : "rgb(" + c.vals.slice(0, 3).map(toF).join(",") + ")";
    return String(c).replace(/\s+/g, "").toLowerCase();
  }
  function modeStyle(ctx, mode, color) {
    var m = String(mode), solid = m === "solid" || m === "\"solid\"";
    var alpha = isNum(mode) ? toF(mode) / 255 : 1;
    if (isNum(mode)) solid = true;
    ctx.globalAlpha = alpha;
    if (solid) { ctx.fillStyle = color; } else { ctx.strokeStyle = color; ctx.lineWidth = 1; }
    return solid;
  }
  function checkMode(name, m) {
    if (isNum(m)) return;
    var s = String(m);
    if (s !== "solid" && s !== "outline") throw new RacketError(name + ": Modus muss \"solid\" oder \"outline\" sein, ist aber " + show(m), "type");
  }
  function needNonNeg(name, v, what) { if (!isNum(v) || toF(v) < 0) throw new RacketError(name + ": nicht-negative Zahl als " + what + " erwartet, " + show(v) + " bekommen", "type"); return toF(v); }
  function polyImg(name, pts, mode, color, key) {
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minx = Math.min.apply(null, xs), miny = Math.min.apply(null, ys);
    var w = Math.max.apply(null, xs) - minx, h = Math.max.apply(null, ys) - miny;
    var col = colorOf(color);
    return new Img(w, h, function (ctx, ox, oy) {
      ctx.save(); var solid = modeStyle(ctx, mode, col);
      ctx.beginPath();
      pts.forEach(function (p, i) { var X = ox + p[0] - minx, Y = oy + p[1] - miny; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath(); if (solid) ctx.fill(); else ctx.stroke(); ctx.restore();
    }, key);
  }
  function starPoints(n, k, R) {
    var pts = [], i = 0, cnt = 0;
    // Verbinde Punkt i mit i+k; zeichne als ein Linienzug (für teilerfremde n,k ein Stern)
    do { var a = -Math.PI / 2 + 2 * Math.PI * i / n; pts.push([R * Math.cos(a), R * Math.sin(a)]); i = (i + k) % n; cnt++; } while (i !== 0 && cnt <= n);
    return pts;
  }
  function wrapImg(base, draw, w, h, key) { return new Img(w, h, draw, key); }
  function imageArgs(name, list) { list.forEach(function (x) { if (!(x instanceof Img)) throw new RacketError(name + ": Bild erwartet, " + show(x) + " (" + typeName(x) + ") bekommen", "type"); }); }
  function alignOff(al, total, size, horiz) {
    al = String(al);
    if (al === "left" || al === "top") return 0;
    if (al === "right" || al === "bottom") return total - size;
    return (total - size) / 2;
  }
  function besideImgs(list, align) {
    var w = 0, h = 0; list.forEach(function (i) { w += i.w; h = Math.max(h, i.h); });
    return new Img(w, h, function (ctx, ox, oy) {
      var x = ox; list.forEach(function (i) { i.draw(ctx, x, oy + alignOff(align, h, i.h)); x += i.w; });
    }, "beside[" + align + "](" + list.map(function (i) { return i.key(); }).join(",") + ")");
  }
  function aboveImgs(list, align) {
    var w = 0, h = 0; list.forEach(function (i) { h += i.h; w = Math.max(w, i.w); });
    return new Img(w, h, function (ctx, ox, oy) {
      var y = oy; list.forEach(function (i) { i.draw(ctx, ox + alignOff(align, w, i.w), y); y += i.h; });
    }, "above[" + align + "](" + list.map(function (i) { return i.key(); }).join(",") + ")");
  }
  function overlayImgs(list, under) {
    var w = 0, h = 0; list.forEach(function (i) { w = Math.max(w, i.w); h = Math.max(h, i.h); });
    var order = under ? list.slice() : list.slice().reverse();
    return new Img(w, h, function (ctx, ox, oy) {
      order.forEach(function (i) { i.draw(ctx, ox + (w - i.w) / 2, oy + (h - i.h) / 2); });
    }, (under ? "underlay" : "overlay") + "(" + list.map(function (i) { return i.key(); }).join(",") + ")");
  }
  var textMeasure = function (str, size) { return { w: str.length * size * 0.55, h: size * 1.2 }; };

  // ------------------------------------------------------------------ eingebaute Funktionen
  function installPrims(it) {
    var g = it.global;
    function def(name, min, max, fn) { g.define(name, new Prim(name, fn, min, max)); }
    function num(name, v, pos) { if (v instanceof Cx) throw new RacketError(name + ": reelle Zahl als " + (pos || "Argument") + " erwartet, die komplexe Zahl " + show(v) + " bekommen", "type"); if (!isNum(v)) throw new RacketError(name + ": Zahl als " + (pos || "Argument") + " erwartet, " + show(v) + " bekommen", "type"); return v; }
    function cnum(name, v, pos) { if (!isNumber(v)) throw new RacketError(name + ": Zahl als " + (pos || "Argument") + " erwartet, " + show(v) + " bekommen", "type"); return v; }
    function intg(name, v) { num(name, v); if (!isInt(v)) throw new RacketError(name + ": ganze Zahl erwartet, " + show(v) + " bekommen", "type"); return v; }
    function str(name, v, pos) { if (!(typeof v === "string" || v instanceof String)) throw new RacketError(name + ": Zeichenkette als " + (pos || "Argument") + " erwartet, " + show(v) + " bekommen", "type"); return String(v); }
    function lst(name, v) { if (!(v === Empty || v instanceof Pair)) throw new RacketError(name + ": Liste erwartet, " + show(v) + " bekommen", "type"); return v; }
    function proc(name, v) { if (!(v instanceof Closure || v instanceof Prim)) throw new RacketError(name + ": Funktion erwartet, " + show(v) + " bekommen – Argumente vertauscht?", "type"); return v; }
    function ord(i) { return ["erstes", "zweites", "drittes", "viertes", "fünftes"][i] || (i + 1) + "."; }
    function toArr(l) { var a = []; while (l instanceof Pair) { a.push(l.car); l = l.cdr; } return a; }
    function fromArr(a) { var l = Empty; for (var i = a.length - 1; i >= 0; i--) l = new Pair(a[i], l); return l; }
    it.toArr = toArr; it.fromArr = fromArr;

    // Zahlen
    def("+", 0, -1, function () { var s = R(0); for (var i = 0; i < arguments.length; i++) s = add(s, cnum("+", arguments[i], ord(i) + " Argument")); return s; });
    def("*", 0, -1, function () { var s = R(1); for (var i = 0; i < arguments.length; i++) s = mul(s, cnum("*", arguments[i], ord(i) + " Argument")); return s; });
    def("-", 1, -1, function (a) { cnum("-", a, "erstes Argument"); if (arguments.length === 1) return sub(R(0), a); var s = a; for (var i = 1; i < arguments.length; i++) s = sub(s, cnum("-", arguments[i], ord(i) + " Argument")); return s; });
    def("/", 1, -1, function (a) { cnum("/", a, "erstes Argument"); if (arguments.length === 1) return div(R(1), a); var s = a; for (var i = 1; i < arguments.length; i++) s = div(s, cnum("/", arguments[i], ord(i) + " Argument")); return s; });
    ["=", "<", ">", "<=", ">="].forEach(function (op) {
      def(op, 1, -1, function () {
        if (op === "=") { for (var j = 0; j < arguments.length; j++) cnum(op, arguments[j], ord(j) + " Argument"); for (j = 0; j + 1 < arguments.length; j++) if (!equal(arguments[j], arguments[j + 1]) || (isExact(arguments[j]) !== isExact(arguments[j + 1]) && !equal(arguments[j], arguments[j + 1]))) return false; if (Array.prototype.some.call(arguments, function (v) { return v instanceof Cx; })) return true; }
        for (var i = 0; i < arguments.length; i++) num(op, arguments[i], ord(i) + " Argument");
        for (i = 0; i + 1 < arguments.length; i++) {
          var c = cmp(arguments[i], arguments[i + 1]);
          var ok = op === "=" ? c === 0 : op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c >= 0;
          if (!ok) return false;
        }
        return true;
      });
    });
    function idiv(name, a, b, kind) {
      intg(name, a); intg(name, b);
      if (toF(b) === 0) throw new RacketError(name + ": durch 0 geteilt", "type");
      if (isExact(a) && isExact(b)) {
        var q = a.n / b.n, r = a.n % b.n;
        if (kind === "q") return new Rat(q);
        if (kind === "r") return new Rat(r);
        var m = r; if (m !== 0n && ((m < 0n) !== (b.n < 0n))) m += b.n; return new Rat(m);
      }
      var x = toF(a), y = toF(b);
      if (kind === "q") return Math.trunc(x / y); if (kind === "r") return x % y; return ((x % y) + y) % y;
    }
    def("quotient", 2, 2, function (a, b) { return idiv("quotient", a, b, "q"); });
    def("remainder", 2, 2, function (a, b) { return idiv("remainder", a, b, "r"); });
    def("modulo", 2, 2, function (a, b) { return idiv("modulo", a, b, "m"); });
    def("abs", 1, 1, function (a) { num("abs", a); return cmp(a, R(0)) < 0 ? sub(R(0), a) : a; });
    def("min", 1, -1, function () { var m = num("min", arguments[0]); for (var i = 1; i < arguments.length; i++) if (cmp(num("min", arguments[i]), m) < 0) m = arguments[i]; return m; });
    def("max", 1, -1, function () { var m = num("max", arguments[0]); for (var i = 1; i < arguments.length; i++) if (cmp(num("max", arguments[i]), m) > 0) m = arguments[i]; return m; });
    // komplexe Hilfsfunktionen (Gleitkomma)
    function C(re, im) { return mkC(re, im); }
    function fparts(z) { return [toF(reP(z)), toF(imP(z))]; }
    function cexp(z) { var p = fparts(z), e = Math.exp(p[0]); return C(e * Math.cos(p[1]), e * Math.sin(p[1])); }
    function clog(z) { var p = fparts(z); return C(Math.log(Math.hypot(p[0], p[1])), Math.atan2(p[1], p[0])); }
    function csqrt(z) { var p = fparts(z), r = Math.hypot(p[0], p[1]), a = Math.sqrt((r + p[0]) / 2), b = Math.sqrt((r - p[0]) / 2); return C(a, p[1] < 0 ? -b : b); }
    var I = new Cx(new Rat(0n), new Rat(1n));
    function csin(z) { var p = fparts(z); return C(Math.sin(p[0]) * Math.cosh(p[1]), Math.cos(p[0]) * Math.sinh(p[1])); }
    function ccos(z) { var p = fparts(z); return C(Math.cos(p[0]) * Math.cosh(p[1]), -Math.sin(p[0]) * Math.sinh(p[1])); }
    function casin(z) { return mul(sub(R(0), I), clog(add(mul(I, z), csqrt(sub(R(1), mul(z, z)))))); }     // -i·log(iz + √(1−z²))
    function cacos(z) { return sub(R(0) instanceof Rat ? Math.PI / 2 : 0, casin(z)); }
    function catan(z) { return mul(div(I, R(2)), sub(clog(sub(R(1), mul(I, z))), clog(add(R(1), mul(I, z))))); }
    function bsqrt(n) { if (n < 0n) return null; if (n < 2n) return n; var x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x * x === n ? x : null; }
    def("sqrt", 1, 1, function (a) {
      cnum("sqrt", a);
      if (a instanceof Cx) return csqrt(a);
      if (isExact(a)) { var neg = a.n < 0n, an = neg ? -a.n : a.n, sn = bsqrt(an), sd = bsqrt(a.d); if (sn !== null && sd !== null) return neg ? mkC(new Rat(0n), new Rat(sn, sd)) : new Rat(sn, sd); }
      if (toF(a) < 0) return mkC(new Rat(0n), Math.sqrt(-toF(a)));
      return Math.sqrt(toF(a));
    });
    def("expt", 2, 2, function (a, b) {
      cnum("expt", a); cnum("expt", b);
      if (b instanceof Rat && b.d === 1n && (a instanceof Rat || a instanceof Cx)) {
        var e = b.n, neg = e < 0n; if (neg) e = -e;
        var r;
        if (a instanceof Rat) r = new Rat(a.n ** e, a.d ** e);
        else { r = R(1); var base = a; while (e > 0n) { if (e & 1n) r = mul(r, base); base = mul(base, base); e >>= 1n; } }
        return neg ? div(R(1), r) : r;
      }
      if (a instanceof Cx || b instanceof Cx || (toF(a) < 0 && !isInt(b))) { if (isNum(a) && toF(a) === 0) return isExact(a) ? R(0) : 0; return cexp(mul(b, clog(a))); }
      return Math.pow(toF(a), toF(b));
    });
    function rounder(name, fn) {
      def(name, 1, 1, function (a) {
        num(name, a);
        if (isExact(a)) {
          var f = a.n / a.d; if (a.n < 0n && a.n % a.d !== 0n) f -= 1n; // floor
          if (name === "floor") return new Rat(f);
          if (name === "ceiling") return new Rat(a.d === 1n ? f : f + 1n);
          if (name === "truncate") return new Rat(a.n / a.d);
          var twice = new Rat(2n * a.n - 2n * f * a.d, a.d); // 2*(a - floor)
          var c = cmp(twice, R(1));
          if (c < 0) return new Rat(f); if (c > 0) return new Rat(f + 1n);
          return new Rat(f % 2n === 0n ? f : f + 1n);
        }
        return fn(toF(a));
      });
    }
    rounder("floor", Math.floor); rounder("ceiling", Math.ceil); rounder("truncate", Math.trunc);
    rounder("round", function (x) { var r = Math.round(x); if (Math.abs(x % 1) === 0.5 && r % 2 !== 0) r -= 1; return r; });
    def("gcd", 0, -1, function () { var r = 0n; for (var i = 0; i < arguments.length; i++) { intg("gcd", arguments[i]); r = bgcd(r, arguments[i].n); } return new Rat(r); });
    def("lcm", 0, -1, function () { var r = 1n; for (var i = 0; i < arguments.length; i++) { intg("lcm", arguments[i]); var x = arguments[i].n < 0n ? -arguments[i].n : arguments[i].n; if (x === 0n) return R(0); r = r * x / bgcd(r, x); } return new Rat(r); });
    def("exact->inexact", 1, 1, function (a) { cnum("exact->inexact", a); if (a instanceof Cx) return new Cx(toF(a.re), toF(a.im)); return toF(a); });
    def("inexact->exact", 1, 1, function (a) { num("inexact->exact", a); if (isExact(a)) return a; var p = parseNumber(String(a)); return p || R(Math.round(a)); });
    def("zero?", 1, 1, function (a) { if (a instanceof Cx) return false; return cmp(num("zero?", a), R(0)) === 0; });
    def("positive?", 1, 1, function (a) { return cmp(num("positive?", a), R(0)) > 0; });
    def("negative?", 1, 1, function (a) { return cmp(num("negative?", a), R(0)) < 0; });
    def("even?", 1, 1, function (a) { intg("even?", a); return isExact(a) ? a.n % 2n === 0n : a % 2 === 0; });
    def("odd?", 1, 1, function (a) { intg("odd?", a); return isExact(a) ? a.n % 2n !== 0n : Math.abs(a % 2) === 1; });
    def("number?", 1, 1, isNumber); def("real?", 1, 1, isNum);
    def("rational?", 1, 1, function (a) { return isNum(a) && (isExact(a) || Number.isFinite(a)); });
    def("integer?", 1, 1, function (a) { return isNum(a) && isInt(a); });
    def("natural?", 1, 1, function (a) { return isNum(a) && isInt(a) && cmp(a, R(0)) >= 0; });
    def("exact?", 1, 1, function (a) { return isExact(cnum("exact?", a)); });
    def("inexact?", 1, 1, function (a) { return !isExact(cnum("inexact?", a)); });
    def("number->string", 1, 1, function (a) { cnum("number->string", a); return numToString(a).replace(/^#i/, ""); });
    def("string->number", 1, 1, function (s) { var n = parseNumber(str("string->number", s).trim()); return n === null ? false : n; });
    def("add1", 1, 1, function (a) { return add(num("add1", a), R(1)); });
    def("sub1", 1, 1, function (a) { return sub(num("sub1", a), R(1)); });

    // Wahrheitswerte, Gleichheit
    def("not", 1, 1, function (b) { if (b !== true && b !== false) throw new RacketError("not: Wahrheitswert erwartet, " + show(b) + " bekommen", "type"); return !b; });
    def("boolean?", 1, 1, function (b) { return b === true || b === false; });
    def("boolean=?", 2, 2, function (a, b) { return a === b; });
    def("equal?", 2, 2, function (a, b) { return equal(a, b); });
    def("eq?", 2, 2, function (a, b) { return a === b || (isNum(a) && isNum(b) && equal(a, b)) || ((typeof a === "string") && a === b); });
    def("eqv?", 2, 2, function (a, b) { return a === b || (isNum(a) && isNum(b) && equal(a, b)); });
    def("violation", 1, 1, function (m) { throw new RacketError(String(m), "violation"); });
    def("error", 1, -1, function () { throw new RacketError(Array.prototype.map.call(arguments, function (x) { return typeof x === "string" ? x : show(x); }).join(" "), "violation"); });

    // Zeichenketten
    def("string-append", 0, -1, function () { var s = ""; for (var i = 0; i < arguments.length; i++) s += str("string-append", arguments[i], ord(i) + " Argument"); return s; });
    def("string-length", 1, 1, function (s) { return R(Array.from(str("string-length", s)).length); });
    def("string?", 1, 1, function (s) { return typeof s === "string" || s instanceof String; });
    [["string=?", function (c) { return c === 0; }], ["string<?", function (c) { return c < 0; }], ["string>?", function (c) { return c > 0; }],
     ["string<=?", function (c) { return c <= 0; }], ["string>=?", function (c) { return c >= 0; }]].forEach(function (p) {
      def(p[0], 1, -1, function () {
        for (var i = 0; i < arguments.length; i++) str(p[0], arguments[i], ord(i) + " Argument");
        for (i = 0; i + 1 < arguments.length; i++) { var a = String(arguments[i]), b = String(arguments[i + 1]); if (!p[1](a < b ? -1 : a > b ? 1 : 0)) return false; }
        return true;
      });
    });
    def("string-upcase", 1, 1, function (s) { return str("string-upcase", s).toUpperCase(); });
    def("string-downcase", 1, 1, function (s) { return str("string-downcase", s).toLowerCase(); });
    def("substring", 2, 3, function (s, a, b) { s = str("substring", s); var ch = Array.from(s); return ch.slice(Number(intg("substring", a).n), b === undefined ? ch.length : Number(intg("substring", b).n)).join(""); });
    def("string->strings-list", 1, 1, function (s) { return fromArr(Array.from(str("string->strings-list", s))); });
    def("strings-list->string", 1, 1, function (l) { return toArr(lst("strings-list->string", l)).map(function (x) { return str("strings-list->string", x); }).join(""); });
    def("string->list", 1, 1, function (s) { return fromArr(Array.from(str("string->list", s))); });
    def("list->string", 1, 1, function (l) { return toArr(lst("list->string", l)).map(String).join(""); });
    def("string->symbol", 1, 1, function (s) { return sym(str("string->symbol", s)); });
    def("symbol->string", 1, 1, function (s) { if (!(s instanceof Sym)) throw new RacketError("symbol->string: Symbol erwartet", "type"); return s.name; });
    def("symbol?", 1, 1, function (s) { return s instanceof Sym; });
    def("symbol=?", 2, 2, function (a, b) { return a === b; });

    // Listen
    g.define("empty", Empty); g.define("null", Empty);
    def("cons", 2, 2, function (a, l) { if (!(l === Empty || l instanceof Pair)) throw new RacketError("cons: Liste als zweites Argument erwartet, " + show(l) + " bekommen", "type"); return new Pair(a, l); });
    def("first", 1, 1, function (l) { if (!(l instanceof Pair)) throw new RacketError("first: nichtleere Liste erwartet, " + show(l) + " bekommen" + (l === Empty ? " – fehlt der Fall (empty? …)?" : ""), "type"); return l.car; });
    def("rest", 1, 1, function (l) { if (!(l instanceof Pair)) throw new RacketError("rest: nichtleere Liste erwartet, " + show(l) + " bekommen" + (l === Empty ? " – fehlt der Fall (empty? …)?" : ""), "type"); return l.cdr; });
    g.define("car", g.vars.get("first")); g.define("cdr", g.vars.get("rest"));
    def("empty?", 1, 1, function (l) { return l === Empty; }); def("null?", 1, 1, function (l) { return l === Empty; });
    def("cons?", 1, 1, function (l) { return l instanceof Pair; }); def("pair?", 1, 1, function (l) { return l instanceof Pair; });
    def("list?", 1, 1, function (l) { while (l instanceof Pair) l = l.cdr; return l === Empty; });
    def("list", 0, -1, function () { return fromArr(Array.prototype.slice.call(arguments)); });
    def("length", 1, 1, function (l) { return R(toArr(lst("length", l)).length); });
    def("append", 0, -1, function () { var a = []; for (var i = 0; i < arguments.length; i++) a = a.concat(toArr(lst("append", arguments[i]))); return fromArr(a); });
    def("reverse", 1, 1, function (l) { return fromArr(toArr(lst("reverse", l)).reverse()); });
    def("list-ref", 2, 2, function (l, i) { var a = toArr(lst("list-ref", l)), k = Number(intg("list-ref", i).n); if (k < 0 || k >= a.length) throw new RacketError("list-ref: Index " + k + " zu groß für eine Liste der Länge " + a.length, "type"); return a[k]; });
    def("member?", 2, 2, function (x, l) { return toArr(lst("member?", l)).some(function (y) { return equal(x, y); }); });
    def("member", 2, 2, function (x, l) { l = lst("member", l); while (l instanceof Pair) { if (equal(x, l.car)) return l; l = l.cdr; } return false; });
    def("filter", 2, 2, function (p, l) { proc("filter", p); lst("filter", l); var me = this; return fromArr(toArr(l).filter(function (x) { var r = me.apply(p, [x]); if (r !== true && r !== false) throw new RacketError("filter: das Prädikat muss #t oder #f liefern, lieferte " + show(r), "type"); return r; })); });
    def("map", 2, -1, function (f) { proc("map", f); var me = this, ls = Array.prototype.slice.call(arguments, 1).map(function (l) { return toArr(lst("map", l)); }); return fromArr(ls[0].map(function (x, i) { return me.apply(f, ls.map(function (a) { return a[i]; })); })); });
    def("for-each", 2, 2, function (f, l) { var me = this; toArr(lst("for-each", l)).forEach(function (x) { me.apply(f, [x]); }); return Void; });
    def("fold", 3, 3, function (e, f, l) { proc("fold", f); lst("fold", l); var a = toArr(l), acc = e; for (var i = a.length - 1; i >= 0; i--) acc = this.apply(f, [a[i], acc]); return acc; });
    def("foldr", 3, 3, function (f, e, l) { proc("foldr", f); var a = toArr(lst("foldr", l)), acc = e; for (var i = a.length - 1; i >= 0; i--) acc = this.apply(f, [a[i], acc]); return acc; });
    def("foldl", 3, 3, function (f, e, l) { proc("foldl", f); var a = toArr(lst("foldl", l)), acc = e; for (var i = 0; i < a.length; i++) acc = this.apply(f, [a[i], acc]); return acc; });
    def("apply", 2, 2, function (f, l) { return this.apply(proc("apply", f), toArr(lst("apply", l))); });
    def("procedure?", 1, 1, function (f) { return f instanceof Closure || f instanceof Prim; });
    def("identity", 1, 1, function (x) { return x; });

    // Signaturen (Prüfung siehe sigOk; außerdem für check-property gebraucht)
    ["number", "real", "rational", "integer", "natural", "boolean", "string", "any", "empty-list", "true", "false", "symbol", "image", "property", "unspecific", "color", "mode"].forEach(function (n) { g.define(n, new Sig("base", n)); });
    def("list-of", 1, 1, function (s) { return new Sig("list", s); });
    def("cons-list-of", 1, 1, function (s) { return new Sig("nelist", s); });
    def("nonempty-list-of", 1, 1, function (s) { return new Sig("nelist", s); });
    def("integer-from-to", 2, 2, function (a, b) { return new Sig("range", [a, b]); });
    def("enum", 0, -1, function () { return new Sig("enum", Array.prototype.slice.call(arguments)); });
    def("one-of", 0, -1, function () { return new Sig("enum", Array.prototype.slice.call(arguments)); });
    def("mixed", 1, -1, function () { return new Sig("mixed", Array.prototype.slice.call(arguments)); });
    def("predicate", 1, 1, function (p) { return new Sig("pred", p); });
    def("combined", 1, -1, function () { return new Sig("combined", Array.prototype.slice.call(arguments)); });
    def("expect", 2, 2, function (a, b) { return equal(a, b); });
    def("expect-within", 3, 3, function (a, b, e) { return equal(a, b, e); });

    // Bilder (Teilmenge von 2htdp/image)
    def("image?", 1, 1, function (x) { return x instanceof Img; });
    def("rectangle", 4, 4, function (w, h, m, c) { checkMode("rectangle", m); var W = needNonNeg("rectangle", w, "Breite"), H = needNonNeg("rectangle", h, "Höhe"), col = colorOf(c);
      return new Img(W, H, function (ctx, ox, oy) { ctx.save(); if (modeStyle(ctx, m, col)) ctx.fillRect(ox, oy, W, H); else ctx.strokeRect(ox + 0.5, oy + 0.5, W - 1, H - 1); ctx.restore(); }, "rect(" + W + "," + H + "," + m + "," + col + ")"); });
    def("square", 3, 3, function (s, m, c) { needNonNeg("square", s, "Seitenlänge"); return g.vars.get("rectangle").fn(s, s, m, c); });
    def("ellipse", 4, 4, function (w, h, m, c) { checkMode("ellipse", m); var W = needNonNeg("ellipse", w, "Breite"), H = needNonNeg("ellipse", h, "Höhe"), col = colorOf(c);
      return new Img(W, H, function (ctx, ox, oy) { ctx.save(); var s = modeStyle(ctx, m, col); ctx.beginPath(); ctx.ellipse(ox + W / 2, oy + H / 2, Math.max(W / 2 - (s ? 0 : .5), 0), Math.max(H / 2 - (s ? 0 : .5), 0), 0, 0, 2 * Math.PI); if (s) ctx.fill(); else ctx.stroke(); ctx.restore(); }, "ellipse(" + W + "," + H + "," + m + "," + col + ")"); });
    def("circle", 3, 3, function (r, m, c) { var R2 = needNonNeg("circle", r, "Radius") * 2; return g.vars.get("ellipse").fn(R2, R2, m, c); });
    def("triangle", 3, 3, function (s, m, c) { checkMode("triangle", m); var S = needNonNeg("triangle", s, "Seitenlänge"), H = S * Math.sqrt(3) / 2; return polyImg("triangle", [[S / 2, 0], [S, H], [0, H]], m, c, "tri(" + S + "," + m + "," + colorOf(c) + ")"); });
    def("right-triangle", 4, 4, function (w, h, m, c) { var W = toF(w), H = toF(h); return polyImg("right-triangle", [[0, 0], [0, H], [W, H]], m, c, "rtri(" + W + "," + H + "," + m + "," + colorOf(c) + ")"); });
    def("isosceles-triangle", 4, 4, function (s, ang, m, c) { var S = toF(s), a = toF(ang) * Math.PI / 180, w = 2 * S * Math.sin(a / 2), h = S * Math.cos(a / 2); return polyImg("isosceles-triangle", [[w / 2, 0], [w, h], [0, h]], m, c, "iso(" + S + "," + toF(ang) + "," + m + "," + colorOf(c) + ")"); });
    def("regular-polygon", 4, 4, function (s, n, m, c) { checkMode("regular-polygon", m); var S = toF(s), N = Number(intg("regular-polygon", n).n), Rr = S / (2 * Math.sin(Math.PI / N)); return polyImg("regular-polygon", starPoints(N, 1, Rr), m, c, "rpoly(" + S + "," + N + "," + m + "," + colorOf(c) + ")"); });
    def("star-polygon", 5, 5, function (s, n, k, m, c) { checkMode("star-polygon", m); var S = toF(s), N = Number(intg("star-polygon", n).n), K = Number(intg("star-polygon", k).n), Rr = S / (2 * Math.sin(Math.PI * K / N)); return polyImg("star-polygon", starPoints(N, K, Rr), m, c, "star(" + S + "," + N + "," + K + "," + m + "," + colorOf(c) + ")"); });
    def("star", 3, 3, function (s, m, c) { checkMode("star", m); var S = toF(s), Rr = S / (2 * Math.sin(Math.PI * 2 / 5)); return polyImg("star", starPoints(5, 2, Rr), m, c, "star5(" + S + "," + m + "," + colorOf(c) + ")"); });
    def("line", 3, 3, function (dx, dy, c) { var X = toF(dx), Y = toF(dy), col = colorOf(c); return new Img(Math.abs(X), Math.abs(Y), function (ctx, ox, oy) { ctx.save(); ctx.strokeStyle = col; ctx.beginPath(); var x0 = X < 0 ? -X : 0, y0 = Y < 0 ? -Y : 0; ctx.moveTo(ox + x0, oy + y0); ctx.lineTo(ox + x0 + X, oy + y0 + Y); ctx.stroke(); ctx.restore(); }, "line(" + X + "," + Y + "," + col + ")"); });
    def("text", 3, 3, function (s, size, c) { var S = str("text", s), Z = toF(num("text", size)), col = colorOf(c), m = textMeasure(S, Z); return new Img(m.w, m.h, function (ctx, ox, oy) { ctx.save(); ctx.fillStyle = col; ctx.font = Z + "px sans-serif"; ctx.textBaseline = "top"; ctx.fillText(S, ox, oy + Z * 0.1); ctx.restore(); }, "text(" + S + "," + Z + "," + col + ")"); });
    def("empty-scene", 2, 3, function (w, h, c) { var W = toF(w), H = toF(h), col = c === undefined ? "white" : colorOf(c); return new Img(W, H, function (ctx, ox, oy) { ctx.save(); ctx.fillStyle = col; ctx.fillRect(ox, oy, W, H); ctx.strokeStyle = "black"; ctx.strokeRect(ox + .5, oy + .5, W - 1, H - 1); ctx.restore(); }, "scene(" + W + "," + H + "," + col + ")"); });
    def("beside", 1, -1, function () { var a = Array.prototype.slice.call(arguments); imageArgs("beside", a); return a.length === 1 ? a[0] : besideImgs(a, "center"); });
    def("above", 1, -1, function () { var a = Array.prototype.slice.call(arguments); imageArgs("above", a); return a.length === 1 ? a[0] : aboveImgs(a, "center"); });
    def("beside/align", 2, -1, function (al) { var a = Array.prototype.slice.call(arguments, 1); imageArgs("beside/align", a); return besideImgs(a, String(al)); });
    def("above/align", 2, -1, function (al) { var a = Array.prototype.slice.call(arguments, 1); imageArgs("above/align", a); return aboveImgs(a, String(al)); });
    def("overlay", 1, -1, function () { var a = Array.prototype.slice.call(arguments); imageArgs("overlay", a); return a.length === 1 ? a[0] : overlayImgs(a, false); });
    def("underlay", 1, -1, function () { var a = Array.prototype.slice.call(arguments); imageArgs("underlay", a); return a.length === 1 ? a[0] : overlayImgs(a, true); });
    def("overlay/xy", 4, 4, function (i1, dx, dy, i2) { imageArgs("overlay/xy", [i1, i2]); var X = toF(dx), Y = toF(dy); var minx = Math.min(0, X), miny = Math.min(0, Y); var w = Math.max(i1.w, X + i2.w) - minx, h = Math.max(i1.h, Y + i2.h) - miny;
      return new Img(w, h, function (ctx, ox, oy) { i2.draw(ctx, ox + X - minx, oy + Y - miny); i1.draw(ctx, ox - minx, oy - miny); }, "oxy(" + i1.key() + "," + X + "," + Y + "," + i2.key() + ")"); });
    function place(name, img, x, y, sc, ax, ay) {
      imageArgs(name, [img, sc]); var X = toF(num(name, x)), Y = toF(num(name, y));
      var dx = ax === "left" ? 0 : ax === "right" ? img.w : img.w / 2, dy = ay === "top" ? 0 : ay === "bottom" ? img.h : img.h / 2;
      return new Img(sc.w, sc.h, function (ctx, ox, oy) { sc.draw(ctx, ox, oy); ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, sc.w, sc.h); ctx.clip(); img.draw(ctx, ox + X - dx, oy + Y - dy); ctx.restore(); }, "place(" + img.key() + "," + (X - dx) + "," + (Y - dy) + "," + sc.key() + ")");
    }
    def("place-image", 4, 4, function (img, x, y, sc) { return place("place-image", img, x, y, sc, "center", "center"); });
    def("place-image/align", 6, 6, function (img, x, y, ax, ay, sc) { return place("place-image/align", img, x, y, sc, String(ax), String(ay)); });
    def("scale", 2, 2, function (f, img) { imageArgs("scale", [img]); var F = toF(num("scale", f)); return new Img(img.w * F, img.h * F, function (ctx, ox, oy) { ctx.save(); ctx.translate(ox, oy); ctx.scale(F, F); img.draw(ctx, 0, 0); ctx.restore(); }, "scale(" + F + "," + img.key() + ")"); });
    def("rotate", 2, 2, function (a, img) { imageArgs("rotate", [img]); var A = toF(num("rotate", a)) * Math.PI / 180, c = Math.abs(Math.cos(A)), s = Math.abs(Math.sin(A)); var w = img.w * c + img.h * s, h = img.w * s + img.h * c;
      return new Img(w, h, function (ctx, ox, oy) { ctx.save(); ctx.translate(ox + w / 2, oy + h / 2); ctx.rotate(-A); img.draw(ctx, -img.w / 2, -img.h / 2); ctx.restore(); }, "rot(" + toF(a) + "," + img.key() + ")"); });
    def("flip-horizontal", 1, 1, function (img) { imageArgs("flip-horizontal", [img]); return new Img(img.w, img.h, function (ctx, ox, oy) { ctx.save(); ctx.translate(ox + img.w, oy); ctx.scale(-1, 1); img.draw(ctx, 0, 0); ctx.restore(); }, "fliph(" + img.key() + ")"); });
    def("flip-vertical", 1, 1, function (img) { imageArgs("flip-vertical", [img]); return new Img(img.w, img.h, function (ctx, ox, oy) { ctx.save(); ctx.translate(ox, oy + img.h); ctx.scale(1, -1); img.draw(ctx, 0, 0); ctx.restore(); }, "flipv(" + img.key() + ")"); });
    def("frame", 1, 1, function (img) { imageArgs("frame", [img]); return new Img(img.w, img.h, function (ctx, ox, oy) { img.draw(ctx, ox, oy); ctx.save(); ctx.strokeStyle = "black"; ctx.strokeRect(ox + .5, oy + .5, img.w - 1, img.h - 1); ctx.restore(); }, "frame(" + img.key() + ")"); });
    def("image-width", 1, 1, function (img) { imageArgs("image-width", [img]); return R(Math.round(img.w)); });
    def("image-height", 1, 1, function (img) { imageArgs("image-height", [img]); return R(Math.round(img.h)); });
    def("make-posn", 2, 2, function (x, y) { return new RecordVal(POSN, [x, y]); });
    def("posn-x", 1, 1, function (p) { return p.vals[0]; }); def("posn-y", 1, 1, function (p) { return p.vals[1]; });
    def("polygon", 3, 3, function (pts, m, c) { var a = toArr(lst("polygon", pts)).map(function (p) { return [toF(p.vals[0]), toF(p.vals[1])]; }); return polyImg("polygon", a, m, c, "poly(" + JSON.stringify(a) + "," + m + "," + colorOf(c) + ")"); });
    def("make-color", 3, 4, function (r, g2, b, a) { return new RecordVal(COLOR, a === undefined ? [r, g2, b] : [r, g2, b, a]); });

    // ---------- weitere Zahlenfunktionen (Sprachebenen „Schreibe Dein Programm!“)
    function fl(name, f, exactZeroIn, exactOut, cf) {
      def(name, 1, 1, function (a) {
        cnum(name, a);
        if (a instanceof Cx) return cf(a);
        if (exactZeroIn !== undefined && isExact(a) && cmp(a, exactZeroIn) === 0) return exactOut;
        var r = f(toF(a));
        if (Number.isNaN(r)) return cf(a);
        return r;
      });
    }
    fl("sin", Math.sin, R(0), R(0), csin); fl("cos", Math.cos, R(0), R(1), ccos); fl("tan", Math.tan, R(0), R(0), function (z) { return div(csin(z), ccos(z)); });
    fl("asin", Math.asin, R(0), R(0), casin); fl("acos", Math.acos, R(1), R(0), cacos); fl("exp", Math.exp, R(0), R(1), cexp);
    def("log", 1, 1, function (a) { cnum("log", a); if (a instanceof Cx) return clog(a); if (isExact(a) && cmp(a, R(1)) === 0) return R(0); if (cmp(a, R(0)) === 0) throw new RacketError("log: Logarithmus von 0 ist nicht definiert", "type"); if (toF(a) < 0) return clog(a); return Math.log(toF(a)); });
    def("atan", 1, 2, function (a, b) { cnum("atan", a); if (b === undefined) { if (a instanceof Cx) return catan(a); return isExact(a) && cmp(a, R(0)) === 0 ? R(0) : Math.atan(toF(a)); } num("atan", a); num("atan", b); return Math.atan2(toF(a), toF(b)); });
    def("numerator", 1, 1, function (a) { num("numerator", a); if (isExact(a)) return new Rat(a.n); var p = parseNumber(String(a)); return p ? toF(new Rat(p.n)) : a; });
    def("denominator", 1, 1, function (a) { num("denominator", a); if (isExact(a)) return new Rat(a.d); var p = parseNumber(String(a)); return p ? toF(new Rat(p.d)) : 1; });
    def("random", 1, 1, function (n) { intg("random", n); if (cmp(n, R(1)) < 0) throw new RacketError("random: positive natürliche Zahl erwartet, " + show(n) + " bekommen", "type"); return R(Math.floor(Math.random() * toF(n))); });
    def("current-seconds", 0, 0, function () { return R(Math.floor(Date.now() / 1000)); });
    def("real-part", 1, 1, function (a) { return reP(cnum("real-part", a)); });
    def("imag-part", 1, 1, function (a) { return imP(cnum("imag-part", a)); });
    def("magnitude", 1, 1, function (a) {
      cnum("magnitude", a);
      if (a instanceof Cx) { var sq = add(mul(a.re, a.re), mul(a.im, a.im)); if (sq instanceof Rat) { var sn = bsqrt(sq.n), sd = bsqrt(sq.d); if (sn !== null && sd !== null) return new Rat(sn, sd); } return Math.sqrt(toF(sq)); }
      return cmp(a, R(0)) < 0 ? sub(R(0), a) : a;
    });
    def("angle", 1, 1, function (a) { cnum("angle", a); if (a instanceof Cx) return Math.atan2(toF(a.im), toF(a.re)); if (cmp(a, R(0)) === 0) throw new RacketError("angle: für 0 nicht definiert", "type"); return cmp(a, R(0)) > 0 ? (isExact(a) ? R(0) : 0) : Math.PI; });
    def("make-polar", 2, 2, function (r, t) { num("make-polar", r); num("make-polar", t); var R1 = toF(r), T = toF(t); if (isExact(t) && t.n === 0n) return r; return mkC(R1 * Math.cos(T), R1 * Math.sin(T)); });
    def("make-rectangular", 2, 2, function (a, b) { return mkC(num("make-rectangular", a), num("make-rectangular", b)); });
    def("complex?", 1, 1, isNumber);
    def("false?", 1, 1, function (x) { return x === false; });
    def("true?", 1, 1, function (x) { return x === true; });
    def("signature?", 1, 1, function (x) { return x instanceof Sig || x instanceof LazySig; });
    def("write-string", 1, 1, function (s) { s = str("write-string", s); it.output.push(s); if (it.onOutput) it.onOutput(s); return Void; });
    def("write-newline", 0, 0, function () { it.output.push("\n"); if (it.onOutput) it.onOutput("\n"); return Void; });
    def("read", 0, 0, function () {
      if (!it.onRead) throw new RacketError("read: Eingabe ist hier nicht möglich", "type");
      var t = it.onRead(); if (t === null || t === undefined) throw new RacketError("read: keine Eingabe", "type");
      var forms = readAll(String(t)); if (!forms.length) throw new RacketError("read: keine Eingabe", "type");
      return quoteData(forms[0]);
    });
    def("expect-member-of", 1, -1, function (a) { var o = Array.prototype.slice.call(arguments, 1); return o.some(function (b) { return equal(a, b); }); });
    def("expect-range", 3, 3, function (a, lo, hi) { return isNum(a) && cmp(a, lo) >= 0 && cmp(a, hi) <= 0; });

    // ---------- weitere Bildfunktionen (2htdp/image)
    function imgs(name, a) { a = Array.prototype.slice.call(a); imageArgs(name, a); return a; }
    function fit(name, list, under, xa, ya) {
      var w = 0, h = 0; list.forEach(function (i) { w = Math.max(w, i.w); h = Math.max(h, i.h); });
      var order = under ? list.slice() : list.slice().reverse();
      return new Img(w, h, function (ctx, ox, oy) { order.forEach(function (i) { i.draw(ctx, ox + alignOff(xa, w, i.w), oy + alignOff(ya, h, i.h)); }); },
        name + "[" + xa + "," + ya + "](" + list.map(function (i) { return i.key(); }).join(",") + ")");
    }
    function offsetImg(name, i1, dx, dy, i2, under) {
      imageArgs(name, [i1, i2]); var X = toF(num(name, dx)), Y = toF(num(name, dy));
      // i2 wird um (X,Y) gegenüber der Mitte von i1 verschoben (overlay/offset)
      var c1x = i1.w / 2, c1y = i1.h / 2, x2 = c1x + X - i2.w / 2, y2 = c1y + Y - i2.h / 2;
      var minx = Math.min(0, x2), miny = Math.min(0, y2), w = Math.max(i1.w, x2 + i2.w) - minx, h = Math.max(i1.h, y2 + i2.h) - miny;
      return new Img(w, h, function (ctx, ox, oy) {
        if (under) { i1.draw(ctx, ox - minx, oy - miny); i2.draw(ctx, ox + x2 - minx, oy + y2 - miny); }
        else { i2.draw(ctx, ox + x2 - minx, oy + y2 - miny); i1.draw(ctx, ox - minx, oy - miny); }
      }, name + "(" + i1.key() + "," + X + "," + Y + "," + i2.key() + ")");
    }
    g.define("empty-image", new Img(0, 0, function () {}, "empty"));
    def("overlay/align", 4, -1, function (xa, ya) { var a = imgs("overlay/align", Array.prototype.slice.call(arguments, 2)); return fit("overlay/align", a, false, String(xa), String(ya)); });
    def("underlay/align", 4, -1, function (xa, ya) { var a = imgs("underlay/align", Array.prototype.slice.call(arguments, 2)); return fit("underlay/align", a, true, String(xa), String(ya)); });
    def("overlay/offset", 4, 4, function (i1, x, y, i2) { return offsetImg("overlay/offset", i1, x, y, i2, false); });
    def("underlay/offset", 4, 4, function (i1, x, y, i2) { return offsetImg("underlay/offset", i1, x, y, i2, true); });
    def("underlay/xy", 4, 4, function (i1, dx, dy, i2) { imageArgs("underlay/xy", [i1, i2]); var X = toF(dx), Y = toF(dy); var minx = Math.min(0, X), miny = Math.min(0, Y); var w = Math.max(i1.w, X + i2.w) - minx, h = Math.max(i1.h, Y + i2.h) - miny;
      return new Img(w, h, function (ctx, ox, oy) { i1.draw(ctx, ox - minx, oy - miny); i2.draw(ctx, ox + X - minx, oy + Y - miny); }, "uxy(" + i1.key() + "," + X + "," + Y + "," + i2.key() + ")"); });
    def("text/font", 8, 8, function (s, size, c, face, family, style, weight, ul) {
      var S = str("text/font", s), Z = toF(num("text/font", size)), col = colorOf(c);
      var fam = { "default": "sans-serif", "swiss": "Helvetica, Arial, sans-serif", "roman": "Georgia, 'Times New Roman', serif", "modern": "ui-monospace, Menlo, Consolas, monospace", "decorative": "fantasy", "script": "cursive", "symbol": "serif", "system": "system-ui" }[String(family)] || "sans-serif";
      var fnt = (String(style) === "italic" || String(style) === "slant" ? "italic " : "") + (String(weight) === "bold" ? "bold " : String(weight) === "light" ? "300 " : "") + Z + "px " + (face instanceof String || typeof face === "string" ? "'" + face + "', " : "") + fam;
      var m = textMeasure(S, Z, fnt);
      return new Img(m.w, m.h, function (ctx, ox, oy) { ctx.save(); ctx.fillStyle = col; ctx.font = fnt; ctx.textBaseline = "top"; ctx.fillText(S, ox, oy + Z * 0.1); if (ul === true) { ctx.fillRect(ox, oy + Z * 1.08, m.w, Math.max(1, Z / 14)); } ctx.restore(); }, "textf(" + S + "," + Z + "," + col + "," + fnt + "," + ul + ")");
    });
    function lineCol(c) { return c instanceof RecordVal && c.type.name === "pen" ? colorOf(c.vals[0]) : colorOf(c); }
    def("add-line", 6, 6, function (img, x1, y1, x2, y2, c) {
      imageArgs("add-line", [img]); var X1 = toF(x1), Y1 = toF(y1), X2 = toF(x2), Y2 = toF(y2), col = lineCol(c);
      var minx = Math.min(0, X1, X2), miny = Math.min(0, Y1, Y2), w = Math.max(img.w, X1, X2) - minx, h = Math.max(img.h, Y1, Y2) - miny;
      return new Img(w, h, function (ctx, ox, oy) { img.draw(ctx, ox - minx, oy - miny); ctx.save(); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(ox + X1 - minx + .5, oy + Y1 - miny + .5); ctx.lineTo(ox + X2 - minx + .5, oy + Y2 - miny + .5); ctx.stroke(); ctx.restore(); }, "addline(" + img.key() + "," + [X1, Y1, X2, Y2] + "," + col + ")");
    });
    def("scene+line", 6, 6, function (img, x1, y1, x2, y2, c) {
      imageArgs("scene+line", [img]); var X1 = toF(x1), Y1 = toF(y1), X2 = toF(x2), Y2 = toF(y2), col = lineCol(c);
      return new Img(img.w, img.h, function (ctx, ox, oy) { img.draw(ctx, ox, oy); ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, img.w, img.h); ctx.clip(); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(ox + X1 + .5, oy + Y1 + .5); ctx.lineTo(ox + X2 + .5, oy + Y2 + .5); ctx.stroke(); ctx.restore(); }, "sceneline(" + img.key() + "," + [X1, Y1, X2, Y2] + "," + col + ")");
    });
    def("place-images", 3, 3, function (is, ps, sc) {
      var I = toArr(lst("place-images", is)), P = toArr(lst("place-images", ps)), r = sc;
      if (I.length !== P.length) throw new RacketError("place-images: Bilder- und Positionsliste müssen gleich lang sein", "type");
      for (var i = 0; i < I.length; i++) r = place("place-images", I[i], P[i].vals[0], P[i].vals[1], r, "center", "center");
      return r;
    });
    def("place-images/align", 5, 5, function (is, ps, ax, ay, sc) {
      var I = toArr(lst("place-images/align", is)), P = toArr(lst("place-images/align", ps)), r = sc;
      for (var i = 0; i < I.length; i++) r = place("place-images/align", I[i], P[i].vals[0], P[i].vals[1], r, String(ax), String(ay));
      return r;
    });
    def("put-image", 4, 4, function (img, x, y, sc) { imageArgs("put-image", [img, sc]); return place("put-image", img, x, sub(R(Math.round(sc.h)), num("put-image", y)), sc, "center", "center"); });
    def("scale/xy", 3, 3, function (fx, fy, img) { imageArgs("scale/xy", [img]); var X = toF(num("scale/xy", fx)), Y = toF(num("scale/xy", fy)); return new Img(img.w * X, img.h * Y, function (ctx, ox, oy) { ctx.save(); ctx.translate(ox, oy); ctx.scale(X, Y); img.draw(ctx, 0, 0); ctx.restore(); }, "scalexy(" + X + "," + Y + "," + img.key() + ")"); });
    def("crop", 5, 5, function (x, y, w, h, img) { imageArgs("crop", [img]); var X = toF(x), Y = toF(y), W = toF(w), H = toF(h); return new Img(W, H, function (ctx, ox, oy) { ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W, H); ctx.clip(); img.draw(ctx, ox - X, oy - Y); ctx.restore(); }, "crop(" + [X, Y, W, H] + "," + img.key() + ")"); });
    def("color-frame", 2, 2, function (c, img) { imageArgs("color-frame", [img]); var col = colorOf(c); return new Img(img.w, img.h, function (ctx, ox, oy) { img.draw(ctx, ox, oy); ctx.save(); ctx.strokeStyle = col; ctx.strokeRect(ox + .5, oy + .5, img.w - 1, img.h - 1); ctx.restore(); }, "cframe(" + col + "," + img.key() + ")"); });
    def("image-baseline", 1, 1, function (img) { imageArgs("image-baseline", [img]); return R(Math.round(img.h)); });
    def("rhombus", 4, 4, function (s, ang, m, c) { checkMode("rhombus", m); var S = toF(s), A = toF(ang) * Math.PI / 180, w = 2 * S * Math.sin(A / 2), h = 2 * S * Math.cos(A / 2); return polyImg("rhombus", [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]], m, c, "rhombus(" + S + "," + toF(ang) + "," + m + "," + colorOf(c) + ")"); });
    def("radial-star", 5, 5, function (n, inner, outer, m, c) { checkMode("radial-star", m); var N = Number(intg("radial-star", n).n), I = toF(inner), O = toF(outer), pts = [];
      for (var i = 0; i < 2 * N; i++) { var a = -Math.PI / 2 + Math.PI * i / N, r = i % 2 ? I : O; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      return polyImg("radial-star", pts, m, c, "rstar(" + [N, I, O] + "," + m + "," + colorOf(c) + ")"); });
    def("wedge", 4, 4, function (r, ang, m, c) { checkMode("wedge", m); var Rr = toF(r), A = toF(ang), pts = [[0, 0]], steps = Math.max(2, Math.ceil(A / 5));
      for (var i = 0; i <= steps; i++) { var a = -A * Math.PI / 180 * i / steps; pts.push([Rr * Math.cos(a), Rr * Math.sin(a)]); }
      return polyImg("wedge", pts, m, c, "wedge(" + Rr + "," + A + "," + m + "," + colorOf(c) + ")"); });
    function triSSS(name, a, b, c, m, col) {
      // a = Seite unten links→rechts? Wie 2htdp: Seiten a, b, c; Ecke A gegenüber a
      if (a + b <= c || a + c <= b || b + c <= a) throw new RacketError(name + ": Mit diesen Maßen gibt es kein Dreieck", "type");
      var x = (b * b + c * c - a * a) / (2 * c), y = Math.sqrt(Math.max(0, b * b - x * x));
      return polyImg(name, [[0, y], [c, y], [x, 0]], m, col, "tri3(" + [a, b, c].map(function (v) { return v.toFixed(6); }) + "," + m + "," + colorOf(col) + ")");
    }
    function deg(v) { return toF(v) * Math.PI / 180; }
    def("triangle/sss", 5, 5, function (a, b, c, m, col) { checkMode("triangle/sss", m); return triSSS("triangle/sss", toF(a), toF(b), toF(c), m, col); });
    def("triangle/sas", 5, 5, function (a, B, c, m, col) { checkMode("triangle/sas", m); var A = toF(a), C = toF(c), b = Math.sqrt(A * A + C * C - 2 * A * C * Math.cos(deg(B))); return triSSS("triangle/sas", A, b, C, m, col); });
    def("triangle/ssa", 5, 5, function (a, b, Cang, m, col) { checkMode("triangle/ssa", m); var A = toF(a), Bs = toF(b), c = Math.sqrt(A * A + Bs * Bs - 2 * A * Bs * Math.cos(deg(Cang))); return triSSS("triangle/ssa", A, Bs, c, m, col); });
    def("triangle/ass", 5, 5, function (Aang, b, c, m, col) { checkMode("triangle/ass", m); var Bs = toF(b), C = toF(c), a = Math.sqrt(Bs * Bs + C * C - 2 * Bs * C * Math.cos(deg(Aang))); return triSSS("triangle/ass", a, Bs, C, m, col); });
    function triAngles(name, A, B, C, side, which, m, col) {
      // zwei Winkel + eine Seite → Sinussatz
      var k = side / Math.sin(which === "a" ? A : which === "b" ? B : C);
      return triSSS(name, k * Math.sin(A), k * Math.sin(B), k * Math.sin(C), m, col);
    }
    def("triangle/aas", 5, 5, function (A, B, c, m, col) { checkMode("triangle/aas", m); var a1 = deg(A), b1 = deg(B); return triAngles("triangle/aas", a1, b1, Math.PI - a1 - b1, toF(c), "c", m, col); });
    def("triangle/asa", 5, 5, function (A, b, C, m, col) { checkMode("triangle/asa", m); var a1 = deg(A), c1 = deg(C); return triAngles("triangle/asa", a1, Math.PI - a1 - c1, c1, toF(b), "b", m, col); });
    def("triangle/saa", 5, 5, function (a, B, C, m, col) { checkMode("triangle/saa", m); var b1 = deg(B), c1 = deg(C); return triAngles("triangle/saa", Math.PI - b1 - c1, b1, c1, toF(a), "a", m, col); });
    def("color-list->bitmap", 3, 3, function (l, w, h) {
      var cols = toArr(lst("color-list->bitmap", l)).map(colorOf), W = Number(intg("color-list->bitmap", w).n), H = Number(intg("color-list->bitmap", h).n);
      return new Img(W, H, function (ctx, ox, oy) { ctx.save(); for (var i = 0; i < cols.length && i < W * H; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(ox + i % W, oy + Math.floor(i / W), 1, 1); } ctx.restore(); }, "bitmap(" + W + "," + H + "," + cols.join(";") + ")");
    });
    def("make-pen", 5, 5, function (c, w, st, cap, join) { return new RecordVal(PEN, [c, w, st, cap, join]); });
    def("color-red", 1, 1, function (c) { return c.vals[0]; }); def("color-green", 1, 1, function (c) { return c.vals[1]; }); def("color-blue", 1, 1, function (c) { return c.vals[2]; });
    def("color-alpha", 1, 1, function (c) { return c.vals[3] === undefined ? R(255) : c.vals[3]; });
    def("color?", 1, 1, function (c) { return c instanceof RecordVal && c.type.name === "color"; });
    def("posn?", 1, 1, function (p) { return p instanceof RecordVal && p.type.name === "posn"; });
    def("mode?", 1, 1, function (m) { return m === "solid" || m === "outline" || (isNum(m) && isInt(m) && toF(m) >= 0 && toF(m) <= 255); });
    def("image-color?", 1, 1, function (c) { return typeof c === "string" || (c instanceof RecordVal && c.type.name === "color"); });
    def("x-place?", 1, 1, function (x) { return ["left", "right", "middle", "center", "pinhole"].indexOf(String(x)) >= 0; });
    def("y-place?", 1, 1, function (x) { return ["top", "bottom", "middle", "center", "baseline", "pinhole"].indexOf(String(x)) >= 0; });
    def("angle?", 1, 1, function (x) { return isNum(x) && toF(x) >= 0 && toF(x) < 360; });
    def("side-count?", 1, 1, function (x) { return isNum(x) && isInt(x) && toF(x) >= 3; });
    def("step-count?", 1, 1, function (x) { return isNum(x) && isInt(x) && toF(x) >= 1; });
    // Bilder aus Dateien: der Playground lädt sie vorher und liefert sie über it.onBitmap
    function bitmapImg(name, src, isUrl) {
      var key = String(src);
      if (!(typeof src === "string" || src instanceof String)) throw new RacketError(name + ": erwartet den Dateinamen als Zeichenkette, z. B. (bitmap \"katze.png\")", "type");
      var b = it.onBitmap ? it.onBitmap(key, isUrl) : null;
      if (!b) throw new RacketError(name + ": Das Bild „" + key + "“ ist " + (isUrl ? "nicht geladen (Adresse falsch oder der Server erlaubt das Laden nicht)" : "nicht eingefügt – füge es oben mit „🖼 Bild einfügen“ ein") , "type");
      return new Img(b.w, b.h, function (ctx, ox, oy) { ctx.drawImage(b.el, ox, oy, b.w, b.h); }, "bitmap(" + key + ")");
    }
    def("bitmap", 1, 1, function (f) { return bitmapImg("bitmap", f, false); });
    def("bitmap/url", 1, 1, function (u) { return bitmapImg("bitmap/url", u, true); });
    def("bitmap/file", 1, 1, function (f) { return bitmapImg("bitmap/file", f, false); });
    def("freeze", 1, 3, function (img) { imageArgs("freeze", [img]); return img; });
    def("image->color-list", 1, 1, function (img) {
      imageArgs("image->color-list", [img]);
      if (!it.onPixels) throw new RacketError("image->color-list: geht nur im Browser", "type");
      var px = it.onPixels(img), out = [];
      for (var i = 0; i < px.length; i += 4) out.push(new RecordVal(COLOR, [R(px[i]), R(px[i + 1]), R(px[i + 2]), R(px[i + 3])]));
      return fromArr(out);
    });
    def("image=?", 2, 2, function (a, b) { imageArgs("image=?", [a, b]); return equal(a, b); });

    // ---------- Animationen (2htdp/universe)
    function clause(name, min, max) { def(name, min, max, function () { var a = Array.prototype.slice.call(arguments); proc(name, a[0]); return new Clause(name === "on-draw" ? "to-draw" : name, a); }); }
    clause("to-draw", 1, 3); clause("on-draw", 1, 3); clause("on-tick", 1, 3); clause("on-key", 1, 1); clause("on-release", 1, 1);
    clause("on-pad", 1, 1); clause("on-mouse", 1, 1); clause("stop-when", 1, 2); clause("check-with", 1, 1);
    ["name", "record?", "state", "close-on-stop", "display-mode"].forEach(function (n) { def(n, 1, 3, function () { return new Clause(n, Array.prototype.slice.call(arguments)); }); });
    def("big-bang", 1, -1, function (init) {
      var cl = Array.prototype.slice.call(arguments, 1);
      cl.forEach(function (c) { if (!(c instanceof Clause)) throw new RacketError("big-bang: nach dem Anfangszustand kommen nur Klauseln wie (to-draw …) oder (on-tick …), nicht " + show(c), "type"); });
      if (!cl.some(function (c) { return c.kind === "to-draw"; })) throw new RacketError("big-bang: es fehlt die Klausel (to-draw zeichne-funktion)", "syntax");
      cl.forEach(function (c) { if (["on-new", "on-msg", "on-disconnect", "to-string"].indexOf(c.kind) >= 0) throw new RacketError("big-bang: (" + c.kind + " …) gehört zu universe, nicht zu big-bang", "syntax"); });
      if (it.onBigBang) { it.onBigBang({ init: init, clauses: cl }); return Void; }
      it.animSkipped = true; return init;
    });
    def("animate", 1, 1, function (f) {
      proc("animate", f);
      if (it.onBigBang) { it.onBigBang({ init: R(0), clauses: [new Clause("to-draw", [f]), new Clause("on-tick", [new Prim("add1", function (n) { return add(n, R(1)); }, 1)])] }); return Void; }
      it.animSkipped = true; return R(0);
    });
    // ---------- universe: mehrere Welten, die über einen Server Nachrichten austauschen
    clause("on-new", 1, 1); clause("on-msg", 1, 1); clause("on-disconnect", 1, 1); clause("on-receive", 1, 1); clause("to-string", 1, 1);
    def("register", 1, 1, function (ip) { return new Clause("register", [ip]); });
    def("port", 1, 1, function (p) { return new Clause("port", [p]); });
    g.define("LOCALHOST", "127.0.0.1");
    function isSexp(v, d) {
      if ((d || 0) > 200) return false;
      if (isNumber(v) || typeof v === "string" || v instanceof String || v === true || v === false || v instanceof Sym || v === Empty) return true;
      if (v instanceof Pair) { while (v instanceof Pair) { if (!isSexp(v.car, (d || 0) + 1)) return false; v = v.cdr; } return v === Empty; }
      return false;
    }
    it.isSexp = isSexp;
    def("sexp?", 1, 1, function (v) { return isSexp(v); });
    def("make-package", 2, 2, function (w, m) { if (!isSexp(m)) throw new RacketError("make-package: Die Nachricht muss ein S-Ausdruck sein (Zahl, Zeichenkette, Wahrheitswert, Symbol oder Liste daraus), ist aber " + show(m), "type"); return new RecordVal(PACKAGE, [w, m]); });
    def("package?", 1, 1, function (v) { return v instanceof RecordVal && v.type === PACKAGE; });
    def("make-bundle", 3, 3, function (st, mails, disc) {
      toArr(lst("make-bundle", mails)).forEach(function (m) { if (!(m instanceof RecordVal && m.type === MAIL)) throw new RacketError("make-bundle: Die zweite Angabe muss eine Liste von Mails (make-mail …) sein", "type"); });
      toArr(lst("make-bundle", disc)).forEach(function (w) { if (!(w instanceof IWorld)) throw new RacketError("make-bundle: Die dritte Angabe muss eine Liste von iworlds sein", "type"); });
      return new RecordVal(BUNDLE, [st, mails, disc]);
    });
    def("bundle?", 1, 1, function (v) { return v instanceof RecordVal && v.type === BUNDLE; });
    def("make-mail", 2, 2, function (w, m) {
      if (!(w instanceof IWorld)) throw new RacketError("make-mail: Die erste Angabe muss eine iworld sein, ist aber " + show(w), "type");
      if (!isSexp(m)) throw new RacketError("make-mail: Die Nachricht muss ein S-Ausdruck sein, ist aber " + show(m), "type");
      return new RecordVal(MAIL, [w, m]);
    });
    def("mail?", 1, 1, function (v) { return v instanceof RecordVal && v.type === MAIL; });
    def("iworld?", 1, 1, function (v) { return v instanceof IWorld; });
    def("iworld=?", 2, 2, function (a, b) { return a === b; });
    def("iworld-name", 1, 1, function (w) { if (!(w instanceof IWorld)) throw new RacketError("iworld-name: iworld erwartet, " + show(w) + " bekommen", "type"); return w.name; });
    g.define("iworld1", new IWorld("iworld1")); g.define("iworld2", new IWorld("iworld2")); g.define("iworld3", new IWorld("iworld3"));
    def("universe", 1, -1, function (init) {
      var cl = Array.prototype.slice.call(arguments, 1);
      cl.forEach(function (c) { if (!(c instanceof Clause)) throw new RacketError("universe: nach dem Anfangszustand kommen nur Klauseln wie (on-new …) oder (on-msg …), nicht " + show(c), "type"); });
      ["on-new", "on-msg"].forEach(function (k) { if (!cl.some(function (c) { return c.kind === k; })) throw new RacketError("universe: es fehlt die Klausel (" + k + " …)", "syntax"); });
      if (it.onUniverse) { it.onUniverse({ init: init, clauses: cl }); return Void; }
      it.animSkipped = true; return init;
    });
    def("launch-many-worlds", 0, -1, function () { return Void; });
    def("launch-many-worlds/proc", 0, -1, function () { var me = this; Array.prototype.forEach.call(arguments, function (f) { me.apply(proc("launch-many-worlds/proc", f), []); }); return Void; });
    def("key-event?", 1, 1, function (k) { return typeof k === "string" || k instanceof String; });
    def("key=?", 2, 2, function (a, b) { return String(str("key=?", a)) === String(str("key=?", b)); });
    def("mouse-event?", 1, 1, function (k) { return ["button-down", "button-up", "drag", "move", "enter", "leave"].indexOf(String(k)) >= 0; });
    def("mouse=?", 2, 2, function (a, b) { return String(str("mouse=?", a)) === String(str("mouse=?", b)); });
  }
  var POSN = new RecordType("posn", ["x", "y"]), COLOR = new RecordType("color", ["red", "green", "blue", "alpha"]), PEN = new RecordType("pen", ["color", "width", "style", "cap", "join"]),
    PACKAGE = new RecordType("package", ["world", "message"]), BUNDLE = new RecordType("bundle", ["state", "mails", "low-to-remove"]), MAIL = new RecordType("mail", ["to", "content"]);

  // ------------------------------------------------------------------ Sprachebenen
  // Was es in welcher Sprachebene gibt (laut Doku „Sprachebenen und Material zu Schreibe Dein Programm!“)
  var LV_NAMES = { beginner: "Schreibe Dein Programm! – Anfänger", vanilla: "Schreibe Dein Programm!", advanced: "Schreibe Dein Programm! – fortgeschritten" };
  var LISTS = ["append", "cons", "cons?", "empty", "empty?", "filter", "first", "fold", "length", "list", "list-ref", "rest", "reverse", "map", "for-each"];
  var ADV = ["string->symbol", "symbol->string", "symbol=?", "symbol?", "apply", "eq?"];
  // nicht Teil der Lehrsprachen (gibt es nur im großen Racket bzw. anderen Lehrsprachen)
  var NOT_SDP = { "add1": "(+ x 1)", "sub1": "(- x 1)", "car": "first", "cdr": "rest", "null": "empty", "null?": "empty?", "pair?": "cons?", "list?": null, "member": null, "member?": null,
    "foldl": "fold", "foldr": "fold", "string-upcase": null, "string-downcase": null, "substring": null, "string->list": "string->strings-list", "list->string": "strings-list->string",
    "identity": null, "error": "violation", "eqv?": "equal?", "procedure?": null, "truncate": null, "nonempty-list-of": "cons-list-of", "one-of": "enum" };
  function applyLevel(it, lv) {
    var g = it.global;
    function lock(n, msg) { if (g.vars.has(n)) g.define(n, new Locked(n, msg)); }
    Object.keys(NOT_SDP).forEach(function (n) { lock(n, n + ": gibt es in den Sprachebenen von „Schreibe Dein Programm!“ nicht" + (NOT_SDP[n] ? " – nimm stattdessen " + NOT_SDP[n] : "")); });
    if (lv === "beginner") {
      LISTS.forEach(function (n) { lock(n, n + ": Listen gibt es erst in der Sprachebene „" + LV_NAMES.vanilla + "“ (ab Kapitel 6) – stelle oben die Sprachebene um"); });
      ["let", "let*", "letrec"].forEach(function (n) { it.lockedForms[n] = n + ": gibt es erst in der Sprachebene „" + LV_NAMES.vanilla + "“ – stelle oben die Sprachebene um"; });
    }
    if (lv !== "advanced") {
      ADV.forEach(function (n) { lock(n, n + ": gibt es erst in der Sprachebene „" + LV_NAMES.advanced + "“ – stelle oben die Sprachebene um"); });
      ["quote", "begin"].forEach(function (n) { it.lockedForms[n] = (n === "quote" ? "Das Hochkomma ' (quote) und Symbole gibt es" : "begin gibt es") + " erst in der Sprachebene „" + LV_NAMES.advanced + "“ – stelle oben die Sprachebene um"; });
    }
  }

  var api = {
    Interp: Interp, RacketError: RacketError, readAll: readAll, show: show, equal: equal, typeName: typeName,
    isNum: isNum, isNumber: isNumber, Cx: Cx, isExact: isExact, toF: toF, Img: Img, Pair: Pair, Empty: Empty, Rat: Rat, Sym: Sym, sym: sym, symName: symName, RecordVal: RecordVal,
    Closure: Closure, Prim: Prim, Void: Void, RecordType: RecordType, Sig: Sig, quoteData: quoteData,
    Locked: Locked, Clause: Clause, IWorld: IWorld, PACKAGE: function () { return PACKAGE; }, BUNDLE: function () { return BUNDLE; }, MAIL: function () { return MAIL; }, Singleton: Singleton, LEVELS: LV_NAMES, unparse: unparse,
    setImageEqual: function (f) { imageEqualHook = f; },
    setTextMeasure: function (f) { textMeasure = f; }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MiniRacket = api;
})(this);
