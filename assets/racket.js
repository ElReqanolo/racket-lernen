/* Mini-Racket: ein kleiner Interpreter für die Lehrsprachen „Schreibe Dein Programm!“.
   Läuft im Browser (window.MiniRacket) und in Node (module.exports).
   Unterstützt: define, lambda, cond, if, and, or, let, let*, letrec, quote, define-record,
   Signaturen (werden nicht geprüft), check-expect/within/error/property, Listen, Zeichenketten,
   exakte Brüche, Bilder (2htdp/image-Teilmenge). */
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

  // ------------------------------------------------------------------ exakte Zahlen
  function bgcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }
  function Rat(n, d) {
    if (d === undefined) d = 1n;
    if (d === 0n) throw new RacketError("/: durch 0 geteilt");
    if (d < 0n) { n = -n; d = -d; }
    var g = bgcd(n, d); if (g > 1n) { n /= g; d /= g; }
    this.n = n; this.d = d;
  }
  function isNum(x) { return x instanceof Rat || typeof x === "number"; }
  function isExact(x) { return x instanceof Rat; }
  function toF(x) { return x instanceof Rat ? Number(x.n) / Number(x.d) : x; }
  function isInt(x) { return x instanceof Rat ? x.d === 1n : (Number.isFinite(x) && Math.floor(x) === x); }
  function R(i) { return new Rat(BigInt(i)); }
  function add(a, b) { if (a instanceof Rat && b instanceof Rat) return new Rat(a.n * b.d + b.n * a.d, a.d * b.d); return toF(a) + toF(b); }
  function sub(a, b) { if (a instanceof Rat && b instanceof Rat) return new Rat(a.n * b.d - b.n * a.d, a.d * b.d); return toF(a) - toF(b); }
  function mul(a, b) { if (a instanceof Rat && b instanceof Rat) return new Rat(a.n * b.n, a.d * b.d); return toF(a) * toF(b); }
  function div(a, b) {
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
    while (e) { if (e.vars.has(name)) { var v = e.vars.get(name); if (v === UNINIT) throw new RacketError(name + ": Variable wird benutzt, bevor sie definiert ist", "unbound"); return v; } e = e.parent; }
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
    if (isNum(v)) return numToString(v);
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
    if (v === Void || v === undefined) return "";
    return String(v);
  }
  function typeName(v) {
    if (isNum(v)) return "Zahl"; if (v instanceof String || typeof v === "string") return "Zeichenkette";
    if (v === true || v === false) return "Wahrheitswert"; if (v === Empty) return "leere Liste";
    if (v instanceof Pair) return "Liste"; if (v instanceof Closure || v instanceof Prim) return "Funktion";
    if (v instanceof RecordVal) return "Record " + v.type.name; if (v instanceof Img) return "Bild";
    if (v instanceof Sym) return "Symbol"; return "Wert";
  }

  // ------------------------------------------------------------------ Gleichheit
  var imageEqualHook = null; // im Browser: Pixelvergleich
  function equal(a, b, eps) {
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
    installPrims(this);
  }
  function tick(it) { if (++it.steps > it.maxSteps) throw new RacketError("Das Programm läuft zu lange (über " + (it.maxSteps / 1e6) + " Mio. Schritte) – vermutlich eine Endlosrekursion: Wird der rekursive Aufruf wirklich mit einem kleineren Wert gemacht?", "loop"); }

  function special(name) { return SPECIAL.hasOwnProperty(name); }
  var SPECIAL = { define: 1, lambda: 1, "λ": 1, cond: 1, if: 1, and: 1, or: 1, let: 1, "let*": 1, letrec: 1, quote: 1, "define-record": 1, "define-record-procedures": 1,
    "check-expect": 1, "check-within": 1, "check-error": 1, "check-property": 1, "check-satisfied": 1, ":": 1, signature: 1, "for-all": 1, "==>": 1, begin: 1, else: 1 };

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
          case "check-expect": case "check-within": case "check-error": case "check-property": case "check-satisfied":
            this.tests.push({ kind: hn, form: x, env: env, line: x.line }); return Void;
          case ":": return Void;
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
        if (args.length !== f.params.length)
          throw new RacketError((f.name || "Funktion") + ": erwartet " + f.params.length + " Argument" + (f.params.length === 1 ? "" : "e") + ", bekommt aber " + args.length, "arity");
        var fe = new Env(f.env);
        for (var p = 0; p < args.length; p++) fe.define(f.params[p], args[p]);
        env = fe; x = this.evalBody(f.body, fe); continue;
      }
      return this.applyNonClosure(f, args, head);
    }
  };
  Interp.prototype.shadowed = function (name, env) { var e = env; while (e && e !== this.global) { if (e.vars.has(name)) return true; e = e.parent; } return false; };
  Interp.prototype.applyNonClosure = function (f, args, head) {
    if (f instanceof Prim) {
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
      if (args.length !== f.params.length)
        throw new RacketError((f.name || "Funktion") + ": erwartet " + f.params.length + " Argument" + (f.params.length === 1 ? "" : "e") + ", bekommt aber " + args.length, "arity");
      var fe = new Env(f.env);
      for (var p = 0; p < args.length; p++) fe.define(f.params[p], args[p]);
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
    return new Closure(names, x.slice(2), env, name);
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
    return Void;
  };
  Interp.prototype.doRecord = function (x, env) {
    var it = this;
    var tn = x[1], typeName = Array.isArray(tn) ? symName(tn[0]) : symName(tn);
    var ctor = symName(x[2]);
    var rest = x.slice(3), pred = null;
    if (rest.length && !Array.isArray(rest[0])) { pred = symName(rest[0]); rest = rest.slice(1); }
    var fields = rest.map(function (f) { return symName(f[0]); });
    var rt = new RecordType(typeName, fields);
    rt.fieldSigs = rest.map(function (f) { return f[1]; }); rt.env = env; rt.params = Array.isArray(tn) ? tn.length - 1 : 0;
    var sigv = new Sig("record", rt);
    env.define(typeName, Array.isArray(tn) ? new Prim(typeName, function () { return sigv; }, 0, -1) : sigv);
    env.define(ctor, new Prim(ctor, function () { return new RecordVal(rt, Array.prototype.slice.call(arguments)); }, fields.length));
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

  // ------------------------------------------------------------------ Programm laufen lassen
  Interp.prototype.run = function (src) {
    var forms = readAll(src), values = [];
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      var v = this.eval(f, this.global);
      var hn = Array.isArray(f) ? symName(f[0]) : null;
      var isDef = hn && (hn === "define" || hn === "define-record" || hn === ":" || hn.indexOf("check-") === 0);
      if (!isDef && v !== Void) values.push({ form: f, value: v, src: formSource(src, f) });
    }
    return values;
  };
  function formSource(src, f) { return null; }

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
        catch (e) { if (!(e instanceof RacketError) || e.kind === "loop") throw e; r.ok = true; r.errorMsg = e.message; }
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
    if (c instanceof RecordVal) return "rgb(" + c.vals.slice(0, 3).map(toF).join(",") + ")";
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
    function num(name, v, pos) { if (!isNum(v)) throw new RacketError(name + ": Zahl als " + (pos || "Argument") + " erwartet, " + show(v) + " bekommen", "type"); return v; }
    function intg(name, v) { num(name, v); if (!isInt(v)) throw new RacketError(name + ": ganze Zahl erwartet, " + show(v) + " bekommen", "type"); return v; }
    function str(name, v, pos) { if (!(typeof v === "string" || v instanceof String)) throw new RacketError(name + ": Zeichenkette als " + (pos || "Argument") + " erwartet, " + show(v) + " bekommen", "type"); return String(v); }
    function lst(name, v) { if (!(v === Empty || v instanceof Pair)) throw new RacketError(name + ": Liste erwartet, " + show(v) + " bekommen", "type"); return v; }
    function proc(name, v) { if (!(v instanceof Closure || v instanceof Prim)) throw new RacketError(name + ": Funktion erwartet, " + show(v) + " bekommen – Argumente vertauscht?", "type"); return v; }
    function ord(i) { return ["erstes", "zweites", "drittes", "viertes", "fünftes"][i] || (i + 1) + "."; }
    function toArr(l) { var a = []; while (l instanceof Pair) { a.push(l.car); l = l.cdr; } return a; }
    function fromArr(a) { var l = Empty; for (var i = a.length - 1; i >= 0; i--) l = new Pair(a[i], l); return l; }
    it.toArr = toArr; it.fromArr = fromArr;

    // Zahlen
    def("+", 0, -1, function () { var s = R(0); for (var i = 0; i < arguments.length; i++) s = add(s, num("+", arguments[i], ord(i) + " Argument")); return s; });
    def("*", 0, -1, function () { var s = R(1); for (var i = 0; i < arguments.length; i++) s = mul(s, num("*", arguments[i], ord(i) + " Argument")); return s; });
    def("-", 1, -1, function (a) { num("-", a, "erstes Argument"); if (arguments.length === 1) return sub(R(0), a); var s = a; for (var i = 1; i < arguments.length; i++) s = sub(s, num("-", arguments[i], ord(i) + " Argument")); return s; });
    def("/", 1, -1, function (a) { num("/", a, "erstes Argument"); if (arguments.length === 1) return div(R(1), a); var s = a; for (var i = 1; i < arguments.length; i++) s = div(s, num("/", arguments[i], ord(i) + " Argument")); return s; });
    ["=", "<", ">", "<=", ">="].forEach(function (op) {
      def(op, 1, -1, function () {
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
    function bsqrt(n) { if (n < 0n) return null; if (n < 2n) return n; var x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x * x === n ? x : null; }
    def("sqrt", 1, 1, function (a) {
      num("sqrt", a);
      if (isExact(a) && a.n >= 0n) { var sn = bsqrt(a.n), sd = bsqrt(a.d); if (sn !== null && sd !== null) return new Rat(sn, sd); }
      if (toF(a) < 0) throw new RacketError("sqrt: nicht-negative Zahl erwartet, " + show(a) + " bekommen", "type");
      return Math.sqrt(toF(a));
    });
    def("expt", 2, 2, function (a, b) {
      num("expt", a); num("expt", b);
      if (isExact(a) && isExact(b) && b.d === 1n) {
        var e = b.n, neg = e < 0n; if (neg) e = -e;
        var r = new Rat(a.n ** e, a.d ** e); return neg ? div(R(1), r) : r;
      }
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
    def("exact->inexact", 1, 1, function (a) { return toF(num("exact->inexact", a)); });
    def("inexact->exact", 1, 1, function (a) { num("inexact->exact", a); if (isExact(a)) return a; var p = parseNumber(String(a)); return p || R(Math.round(a)); });
    def("zero?", 1, 1, function (a) { return cmp(num("zero?", a), R(0)) === 0; });
    def("positive?", 1, 1, function (a) { return cmp(num("positive?", a), R(0)) > 0; });
    def("negative?", 1, 1, function (a) { return cmp(num("negative?", a), R(0)) < 0; });
    def("even?", 1, 1, function (a) { intg("even?", a); return isExact(a) ? a.n % 2n === 0n : a % 2 === 0; });
    def("odd?", 1, 1, function (a) { intg("odd?", a); return isExact(a) ? a.n % 2n !== 0n : Math.abs(a % 2) === 1; });
    def("number?", 1, 1, isNum); def("real?", 1, 1, isNum);
    def("rational?", 1, 1, function (a) { return isNum(a) && (isExact(a) || Number.isFinite(a)); });
    def("integer?", 1, 1, function (a) { return isNum(a) && isInt(a); });
    def("natural?", 1, 1, function (a) { return isNum(a) && isInt(a) && cmp(a, R(0)) >= 0; });
    def("exact?", 1, 1, function (a) { return isExact(num("exact?", a)); });
    def("inexact?", 1, 1, function (a) { return !isExact(num("inexact?", a)); });
    def("number->string", 1, 1, function (a) { num("number->string", a); return numToString(a); });
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

    // Signaturen (werden nicht geprüft, nur für check-property gebraucht)
    ["number", "real", "rational", "integer", "natural", "boolean", "string", "any", "empty-list", "true", "false", "symbol", "image", "property", "unspecific", "color", "mode"].forEach(function (n) { g.define(n, new Sig("base", n)); });
    def("list-of", 1, 1, function (s) { return new Sig("list", s); });
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
    def("make-color", 3, 4, function (r, g2, b) { return new RecordVal(COLOR, [r, g2, b]); });

    // Animation – nicht im Browser-Prüfer
    ["big-bang", "animate", "to-draw", "on-tick", "on-key", "on-mouse", "stop-when", "on-pad", "on-draw", "on-release", "name", "check-with"].forEach(function (n) {
      def(n, 0, -1, function () { if (n === "big-bang" || n === "animate") it.animSkipped = true; return Void; });
    });
  }
  var POSN = new RecordType("posn", ["x", "y"]), COLOR = new RecordType("color", ["red", "green", "blue"]);

  var api = {
    Interp: Interp, RacketError: RacketError, readAll: readAll, show: show, equal: equal, typeName: typeName,
    isNum: isNum, isExact: isExact, toF: toF, Img: Img, Pair: Pair, Empty: Empty, Rat: Rat, Sym: Sym, sym: sym, symName: symName, RecordVal: RecordVal,
    Closure: Closure, Prim: Prim, Void: Void, RecordType: RecordType, Sig: Sig, quoteData: quoteData,
    setImageEqual: function (f) { imageEqualHook = f; },
    setTextMeasure: function (f) { textMeasure = f; }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MiniRacket = api;
})(this);
