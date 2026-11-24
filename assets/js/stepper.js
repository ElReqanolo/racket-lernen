/* Stepper: zeigt die Auswertung Schritt für Schritt im Substitutionsmodell – wie der Stepper in DrRacket.
   Braucht racket.js (window.MiniRacket bzw. require). RacketStepper.build(src, level) → { steps, error }. */
(function (root) {
  "use strict";
  var M = root.MiniRacket || (typeof require !== "undefined" ? require("./racket.js") : null);
  if (!M) return;
  var MAX_STEPS = 1500;

  // ---------------------------------------------------------------- Knoten
  function SV(v) { this.v = v; }                       // Wert, der keine eigene Schreibweise im Quelltext hat (Liste, Record, Bild …)
  function isSym(n) { return n && typeof n === "object" && n.sym instanceof M.Sym; }
  function sname(n) { return isSym(n) ? n.sym.name : (n instanceof M.Sym ? n.name : null); }
  function mkSym(name) { return { sym: M.sym(name) }; }
  function isLit(n) { return n instanceof M.Rat || typeof n === "number" || n === true || n === false || n instanceof String || n instanceof M.Cx; }
  function head(n) { return Array.isArray(n) ? sname(n[0]) : null; }
  function copySet(tree, path, val) {
    if (!path.length) return val;
    var c = tree.slice(); c.line = tree.line;
    c[path[0]] = copySet(tree[path[0]], path.slice(1), val);
    return c;
  }
  function getAt(tree, path) { var n = tree; for (var i = 0; i < path.length; i++) n = n[path[i]]; return n; }

  function Stepper(src, level) {
    this.it = new M.Interp(level ? { level: level } : {});
    this.it.onBigBang = function () {}; this.it.onUniverse = function () {};
    this.defs = {};          // Name → lambda-Syntax der eigenen Funktionen
    this.src = src;
  }
  var SPECIAL_VALUE_FORMS = { lambda: 1, "λ": 1, quote: 1 };
  Stepper.prototype.bound = function (name) { try { return this.it.global.lookup(name); } catch (e) { return undefined; } };
  // Ist der Knoten schon ein Wert?
  Stepper.prototype.isValue = function (n) {
    if (isLit(n) || n instanceof SV) return true;
    if (isSym(n)) {
      var nm = n.sym.name;
      if (this.defs[nm]) return false;   // eigene Funktion: wird erst durch ihren lambda-Ausdruck ersetzt (wie im Buch)
      var v = this.bound(nm);
      return v instanceof M.Prim || v instanceof M.Closure || v instanceof M.Sig || v === M.Empty;
    }
    if (Array.isArray(n) && SPECIAL_VALUE_FORMS[head(n)]) return true;
    return false;
  };
  Stepper.prototype.toVal = function (n) {
    if (n instanceof String) return String(n);
    if (isLit(n)) return n;
    if (n instanceof SV) return n.v;
    if (isSym(n)) return this.it.global.lookup(n.sym.name);
    if (Array.isArray(n) && head(n) === "quote") return M.quoteData(n[1]);
    return this.it.eval(this.plain(n), this.it.global);
  };
  Stepper.prototype.fromVal = function (v) {
    if (typeof v === "string") return new String(v);
    if (v instanceof M.Rat || typeof v === "number" || v === true || v === false || v instanceof M.Cx) return v;
    if (v instanceof M.Closure && v.name && this.defs[v.name]) return mkSym(v.name);
    if (v instanceof M.Prim && this.bound(v.name) === v) return mkSym(v.name);
    return new SV(v);
  };

  // ---------------------------------------------------------------- Ersetzen von Parametern
  function subst(n, map) {
    if (isSym(n)) return map.hasOwnProperty(n.sym.name) ? map[n.sym.name] : n;
    if (!Array.isArray(n)) return n;
    var h = head(n), out;
    if (h === "quote") return n;
    if (h === "lambda" || h === "λ") {
      var inner = shadow(map, (Array.isArray(n[1]) ? n[1] : []).map(sname));
      out = [n[0], n[1]].concat(n.slice(2).map(function (x) { return subst(x, inner); }));
    } else if (h === "let" || h === "let*" || h === "letrec") {
      var names = (Array.isArray(n[1]) ? n[1] : []).map(function (b) { return sname(b[0]); });
      var inner2 = shadow(map, names);
      var binds = (n[1] || []).map(function (b) { return [b[0], subst(b[1], h === "let" ? map : inner2)]; });
      out = [n[0], binds].concat(n.slice(2).map(function (x) { return subst(x, inner2); }));
    } else if (h === "match") {
      out = [n[0], subst(n[1], map)].concat(n.slice(2).map(function (cl) {
        var pv = []; (function pat(p) { if (isSym(p)) pv.push(p.sym.name); else if (Array.isArray(p)) p.slice(1).forEach(pat); })(cl[0]);
        var m2 = shadow(map, pv); return [cl[0]].concat(cl.slice(1).map(function (x) { return subst(x, m2); }));
      }));
    } else out = n.map(function (x) { return subst(x, map); });
    out.line = n.line; return out;
  }
  function shadow(map, names) { var m = {}; for (var k in map) if (names.indexOf(k) < 0) m[k] = map[k]; return m; }

  // ---------------------------------------------------------------- nächsten Redex finden (von links, innen zuerst)
  Stepper.prototype.find = function (n, path) {
    if (this.isValue(n)) return null;
    if (isSym(n)) return path;
    if (!Array.isArray(n)) return null;
    var h = head(n), self = this, i, r;
    function firstNonValue(from, to) { for (var j = from; j < to; j++) { var rr = self.find(n[j], path.concat(j)); if (rr) return rr; } return null; }
    switch (h) {
      case "if": return this.isValue(n[1]) ? path : this.find(n[1], path.concat(1));
      case "cond":
        if (n.length < 2) return path;
        var cl = n[1];
        if (!Array.isArray(cl)) return path;
        if (sname(cl[0]) === "else" || this.isValue(cl[0])) return path;
        return this.find(cl[0], path.concat([1, 0]));
      case "and": case "or":
        if (n.length < 2 || this.isValue(n[1])) return path;
        return this.find(n[1], path.concat(1));
      case "let": case "let*":
        var bs = n[1] || [];
        for (i = 0; i < bs.length; i++) { if (!this.isValue(bs[i][1])) return this.find(bs[i][1], path.concat([1, i, 1])); if (h === "let*") break; }
        return path;
      case "match": return this.isValue(n[1]) ? path : this.find(n[1], path.concat(1));
      case "letrec": case "begin": case "for-all": case "check-property": case "signature": return path;
    }
    r = firstNonValue(0, n.length);
    return r || path;
  };

  // ---------------------------------------------------------------- einen Redex reduzieren
  function StepError(msg) { this.message = msg; }
  Stepper.prototype.reduce = function (n) {
    var it = this.it, self = this;
    if ((this.count = (this.count || 0) + 1) > 6000) throw new StepError("Nach sehr vielen Schritten angehalten – läuft das Programm endlos?");
    if (isSym(n) && this.defs[n.sym.name]) return { node: this.defs[n.sym.name], note: n.sym.name + " durch seinen lambda-Ausdruck ersetzen" };
    if (isSym(n)) return { node: this.fromVal(it.global.lookup(n.sym.name)), note: n.sym.name + " durch seinen Wert ersetzen" };
    var h = head(n);
    switch (h) {
      case "if": {
        var c = this.toVal(n[1]);
        if (c !== true && c !== false) throw new StepError("if: Die Bedingung ergab keinen Wahrheitswert, sondern " + M.show(c));
        if (n.length !== 4) throw new StepError("if: braucht Bedingung, Konsequente und Alternative");
        return { node: c ? n[2] : n[3], note: "if mit " + (c ? "#t: die Konsequente" : "#f: die Alternative") + " bleibt übrig" };
      }
      case "cond": {
        if (n.length < 2) throw new StepError("cond: alle Bedingungen ergaben #f");
        var cl = n[1];
        var body = function (x) { return x.length === 2 ? x[1] : self.bigBody(x.slice(1)); };
        if (sname(cl[0]) === "else") return { node: body(cl), note: "cond: der else-Zweig wird genommen" };
        var t = this.toVal(cl[0]);
        if (t !== true && t !== false) throw new StepError("cond: Die Bedingung ergab keinen Wahrheitswert, sondern " + M.show(t));
        if (t) return { node: body(cl), note: "cond: die erste Bedingung ist #t – ihr Zweig wird genommen" };
        var rest = [n[0]].concat(n.slice(2)); rest.line = n.line;
        return { node: rest, note: "cond: die erste Bedingung ist #f – der Zweig fällt weg" };
      }
      case "and": case "or": {
        if (n.length === 1) return { node: h === "and", note: "(" + h + ") ohne Teile" };
        var b = this.toVal(n[1]);
        if (b !== true && b !== false) throw new StepError(h + ": Wahrheitswert erwartet, " + M.show(b) + " bekommen");
        if (n.length === 2) return { node: b, note: h + " mit einem Teil ergibt diesen Wert" };
        if (h === "and" && !b) return { node: false, note: "and: ein #f – das Ganze ist #f" };
        if (h === "or" && b) return { node: true, note: "or: ein #t – das Ganze ist #t" };
        var r2 = [n[0]].concat(n.slice(2)); r2.line = n.line;
        return { node: r2, note: h + ": der erste Teil ist " + (b ? "#t" : "#f") + " und fällt weg" };
      }
      case "let": case "let*": {
        var bs = n[1] || [], map = {};
        if (h === "let*" && bs.length > 1) {
          map[sname(bs[0][0])] = bs[0][1];
          var inner = [mkSym("let*"), bs.slice(1)].concat(n.slice(2)), sub = subst(inner, map);
          return { node: sub, note: "let*: " + sname(bs[0][0]) + " einsetzen" };
        }
        bs.forEach(function (bd) { map[sname(bd[0])] = bd[1]; });
        var bodyL = n.slice(2);
        if (bodyL.length !== 1) return { node: this.bigBody(bodyL.map(function (x) { return subst(x, map); })), note: h + ": Rumpf mit internen Definitionen in einem Schritt ausgewertet" };
        var res = bodyL[0];
        return { node: subst(res, map), note: h + ": die Werte für " + bs.map(function (bd) { return sname(bd[0]); }).join(", ") + " einsetzen" };
      }
      case "match": {
        var v = this.toVal(n[1]);
        for (var k = 2; k < n.length; k++) {
          var bnd = new Map();
          if (it.matchPat(n[k][0], v, bnd, it.global)) {
            var mp = {}; bnd.forEach(function (val, key) { mp[key] = self.fromVal(val); });
            if (n[k].length !== 2) return { node: this.bigBody(n[k].slice(1).map(function (x) { return subst(x, mp); })), note: "match: das " + (k - 1) + ". Muster passt – Rumpf mit internen Definitionen in einem Schritt ausgewertet" };
            return { node: subst(n[k][1], mp), note: "match: das " + (k - 1) + ". Muster passt" };
          }
        }
        throw new StepError("match: kein Zweig passt auf den Wert " + M.show(v));
      }
      case "begin": {
        if (n.length === 2) return { node: n[1], note: "begin mit einem Ausdruck" };
        if (this.isValue(n[1])) { var r3 = [n[0]].concat(n.slice(2)); return { node: r3, note: "begin: der erste Wert wird verworfen" }; }
        break;
      }
    }
    if (h === "letrec" || h === "begin" || h === "for-all" || h === "check-property" || h === "signature" || (Array.isArray(n) && (head(n) === "define"))) {
      return { node: this.fromVal(it.eval(this.plain(n), it.global)), note: h + " in einem Schritt ausgewertet" };
    }
    // Anwendung
    var f = n[0], args = n.slice(1);
    var lam = null, fname = null;
    if (isSym(f) && this.defs[f.sym.name]) { lam = this.defs[f.sym.name]; fname = f.sym.name; }
    else if (Array.isArray(f) && (head(f) === "lambda" || head(f) === "λ")) lam = f;
    if (lam) {
      var params = (lam[1] || []).map(sname);
      var dot = params.indexOf(".");
      var lbody = lam.slice(2);
      if (dot >= 0 || lbody.length !== 1 || lbody.some(function (x) { return head(x) === "define"; })) {
        // Restparameter oder interne Definitionen: in einem Schritt ausrechnen
        var cv = this.toVal(f); it.steps = 0;
        return { node: this.fromVal(it.apply(cv, args.map(function (a) { return self.toVal(a); }))), note: (fname || "Funktion") + " in einem Schritt ausgewertet (interne Definitionen)" };
      }
      if (params.length !== args.length) throw new StepError((fname || "Funktion") + ": erwartet " + params.length + " Argument" + (params.length === 1 ? "" : "e") + ", bekommt aber " + args.length);
      var m2 = {}; params.forEach(function (p, i) { m2[p] = args[i]; });
      return { node: subst(lbody[0], m2), note: (fname ? fname + ": " : "") + "Argumente für " + (params.length ? params.join(", ") : "die Parameter") + " in den Rumpf einsetzen" };
    }
    var fv = this.toVal(f);
    var av = args.map(function (a) { return self.toVal(a); });
    it.steps = 0;
    var res2;
    if (fv instanceof M.Closure) res2 = it.apply(fv, av);
    else res2 = it.applyNonClosure(fv, av, null, null);
    var pn = fv instanceof M.Prim ? fv.name : "Funktion";
    return { node: this.fromVal(res2), note: pn + " ausrechnen" };
  };

  // Rumpf aus mehreren Teilen (interne Definitionen): in einem Schritt mit dem Interpreter ausrechnen
  Stepper.prototype.bigBody = function (forms) {
    var it = this.it, env = new (it.global.constructor)(it.global), self = this, v;
    it.steps = 0;
    forms.forEach(function (f) { v = it.eval(self.plain(f), env); });
    return this.fromVal(v);
  };
  // Stepper-Knoten (SV-Werte) zurück in auswertbare Syntax verwandeln
  Stepper.prototype.plain = function (n) {
    var self = this;
    if (n instanceof SV) { var tmp = "§sv" + (this.svc = (this.svc || 0) + 1); this.it.global.define(tmp, n.v); return mkSym(tmp); }
    if (Array.isArray(n)) { var c = n.map(function (x) { return self.plain(x); }); c.line = n.line; return c; }
    return n;
  };

  // ---------------------------------------------------------------- ganzes Programm
  Stepper.prototype.run = function () {
    var it = this.it, self = this, steps = [], forms;
    var realPush = steps.push.bind(steps);
    steps.push = function (st) {
      if (st.bpath && st.apath && !st.error && text(getAt(st.before, st.bpath)) === text(getAt(st.after, st.apath))) return steps.length;
      return realPush(st);
    };
    try { forms = M.readAll(this.src); } catch (e) { return { steps: [], error: e.message }; }
    // Tests laufen in DrRacket am Ende – auch im Stepper
    var isTest = function (f) { var hh = head(f); return hh && hh.indexOf("check-") === 0; };
    forms = forms.filter(function (f) { return !isTest(f); }).concat(forms.filter(isTest));
    var total = forms.length;
    function wrap(e) {
      if (e instanceof StepError || e instanceof M.RacketError) return e.message;
      if (e instanceof RangeError) return "Zu tiefe Rekursion – vermutlich eine Endlosrekursion.";
      return "Interner Fehler: " + (e && e.message);
    }
    for (var fi = 0; fi < forms.length; fi++) {
      var form = forms[fi], h = head(form);
      try {
        if (h === "define" && Array.isArray(form) && sname(form[1])) {
          var nm = sname(form[1]);
          if (Array.isArray(form[2]) && (head(form[2]) === "lambda" || head(form[2]) === "λ")) {
            it.eval(form, it.global); this.defs[nm] = form[2]; continue;
          }
          var cur = form;
          while (true) {
            var p = this.find(cur[2], [2]);
            if (!p) break;
            if (steps.length >= MAX_STEPS) return { steps: steps, error: "Nach " + MAX_STEPS + " Schritten angehalten – läuft das Programm endlos?" };
            var red = this.reduce(getAt(cur, p)), nx = copySet(cur, p, red.node);
            steps.push({ form: fi, total: total, before: cur, bpath: p, after: nx, apath: p, note: red.note });
            cur = nx;
          }
          it.global.define(nm, this.toVal(cur[2]));
          var fv = this.toVal(cur[2]); if (fv instanceof M.Closure && !fv.name) fv.name = nm;
          continue;
        }
        if (h === "check-expect" || h === "check-within") {
          var ce = form;
          for (var idx = 1; idx < ce.length; idx++) {
            while (true) {
              var pp = this.find(ce[idx], [idx]);
              if (!pp) break;
              if (steps.length >= MAX_STEPS) return { steps: steps, error: "Nach " + MAX_STEPS + " Schritten angehalten – läuft das Programm endlos?" };
              var rr = this.reduce(getAt(ce, pp)), nce = copySet(ce, pp, rr.node);
              steps.push({ form: fi, total: total, before: ce, bpath: pp, after: nce, apath: pp, note: rr.note });
              ce = nce;
            }
          }
          var ok = M.equal(this.toVal(ce[1]), this.toVal(ce[2]), h === "check-within" ? this.toVal(ce[3]) : undefined);
          steps.push({ form: fi, total: total, before: ce, bpath: null, after: ok ? new String("Test bestanden ✓") : new String("Test fehlgeschlagen ✗"), apath: [], note: ok ? "Beide Seiten haben denselben Wert" : "Die Werte sind verschieden", test: ok });
          continue;
        }
        if (h && (h === "define-record" || h === "define-record-procedures" || h === ":" || h === "define-singleton" || h === "define" || h.indexOf("check-") === 0)) {
          it.eval(form, it.global);
          if (h.indexOf("check-") === 0) {
            var t = it.tests.pop(); var res = it.runTest(t);
            steps.push({ form: fi, total: total, before: form, bpath: null, after: new String(res.ok ? "Test bestanden ✓" : "Test fehlgeschlagen ✗"), apath: [], note: h + " in einem Schritt geprüft", test: res.ok });
          }
          continue;
        }
        // Ausdruck
        var e = form;
        if (this.isValue(e) && !isSym(e)) { steps.push({ form: fi, total: total, before: e, bpath: null, after: e, apath: null, note: "Das ist schon ein Wert", value: true }); continue; }
        while (true) {
          var p2 = this.find(e, []);
          if (!p2) break;
          if (steps.length >= MAX_STEPS) return { steps: steps, error: "Nach " + MAX_STEPS + " Schritten angehalten – läuft das Programm endlos?" };
          var red2 = this.reduce(getAt(e, p2)), ne = copySet(e, p2, red2.node);
          steps.push({ form: fi, total: total, before: e, bpath: p2, after: ne, apath: p2, note: red2.note });
          e = ne;
        }
      } catch (err) {
        steps.push({ form: fi, total: total, before: steps.length && steps[steps.length - 1].form === fi ? steps[steps.length - 1].after : form, bpath: null, after: null, error: wrap(err) });
        return { steps: steps, error: null };
      }
    }
    return { steps: steps, error: null };
  };

  // ---------------------------------------------------------------- Darstellung
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function valText(v, imgs) {
    if (v === M.Empty) return "empty";
    if (v instanceof M.Pair) { var a = []; while (v instanceof M.Pair) { a.push(valText(v.car, imgs)); v = v.cdr; } return "(list " + a.join(" ") + ")"; }
    if (v instanceof M.RecordVal) return "(" + (v.type.ctorName || "make-" + v.type.name) + (v.vals.length ? " " + v.vals.map(function (x) { return valText(x, imgs); }).join(" ") : "") + ")";
    if (v instanceof M.Img) { if (imgs) { imgs.push(v); return "\u0001" + (imgs.length - 1) + "\u0002"; } return "[Bild]"; }
    if (v instanceof M.Closure) return v.name ? v.name : "(lambda (" + v.params.join(" ") + ") …)";
    return M.show(v);
  }
  function text(n, imgs) {
    if (n instanceof SV) return valText(n.v, imgs);
    if (n instanceof String) return JSON.stringify(String(n));
    if (isLit(n)) return M.show(n);
    if (isSym(n)) return n.sym.name;
    if (Array.isArray(n)) { if (head(n) === "quote") return "'" + text(n[1], imgs); return "(" + n.map(function (x) { return text(x, imgs); }).join(" ") + ")"; }
    return String(n);
  }
  // hübsch umbrechen; mark = Pfad, der hervorgehoben wird
  function pp(n, indent, mark, cls, imgs, path) {
    var isMark = mark && path.length === mark.length && path.every(function (x, i) { return x === mark[i]; });
    var flat = text(n, imgs ? [] : null);
    var out;
    if (!Array.isArray(n) || head(n) === "quote" || flat.length + indent <= 64 || n.length < 2) {
      out = esc(text(n, imgs));
      if (Array.isArray(n) && mark && !isMark && mark.length > path.length && mark.slice(0, path.length).every(function (x, i) { return x === path[i]; })) {
        // Markierung liegt innen: einzeilig, aber mit Hervorhebung
        out = "(" + n.map(function (x, i) { return pp(x, 0, mark, cls, imgs, path.concat(i)).replace(/\n\s*/g, " "); }).join(" ") + ")";
      }
    } else {
      var hd = pp(n[0], indent + 1, mark, cls, imgs, path.concat(0));
      var hn = text(n[0]).length, firstIndent = indent + 2 + hn;
      var parts = [], specialBody = { define: 1, lambda: 1, "λ": 1, cond: 1, let: 1, "let*": 1, letrec: 1, match: 1, "define-record": 1 }[head(n)];
      var ind = specialBody ? indent + 2 : firstIndent;
      for (var i = 1; i < n.length; i++) {
        var child = pp(n[i], i === 1 && !specialBody ? firstIndent : ind, mark, cls, imgs, path.concat(i));
        parts.push(child);
      }
      if (specialBody) {
        var first = head(n) === "cond" ? "" : " " + parts.shift();
        out = "(" + hd + first + parts.map(function (p) { return "\n" + " ".repeat(ind) + p; }).join("") + ")";
      } else {
        out = "(" + hd + " " + parts[0] + parts.slice(1).map(function (p) { return "\n" + " ".repeat(ind) + p; }).join("") + ")";
      }
    }
    return isMark ? '<span class="' + cls + '">' + out + "</span>" : out;
  }
  function render(n, mark, cls) {
    var imgs = [];
    var html = pp(n, 0, mark, cls, imgs, []);
    html = html.replace(/\u0001(\d+)\u0002/g, function (_, k) { return '<span class="st-img" data-k="' + k + '"></span>'; });
    return { html: html, imgs: imgs };
  }

  var api = {
    build: function (src, level) { return new Stepper(src, level).run(); },
    render: render
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RacketStepper = api;
})(this);
