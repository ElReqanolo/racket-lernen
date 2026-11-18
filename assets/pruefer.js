/* Prüft eine Abgabe gegen die Musterlösung einer Aufgabe. Braucht racket.js.
   Ergebnis: { status: "ok"|"fail"|"error"|"manual", summary, items:[{ok, title, detail, hint, images}], userImages } */
(function (root) {
  "use strict";
  var M = root.MiniRacket || (typeof require !== "undefined" ? require("./racket.js") : null);

  // ---------- Syntaxbaum wieder als Text
  function unparse(x) {
    if (Array.isArray(x)) {
      if (x.length === 2 && M.symName(x[0]) === "quote") return "'" + unparse(x[1]);
      return "(" + x.map(unparse).join(" ") + ")";
    }
    if (x && x.sym) return x.sym.name;
    if (x instanceof String) return JSON.stringify(String(x));
    return M.show(x);
  }
  function headName(f) { return Array.isArray(f) ? M.symName(f[0]) : null; }
  function definedNames(f) {
    var h = headName(f);
    if (h === "define") return [M.symName(f[1])].filter(Boolean);
    if (h === "define-record" || h === "define-record-procedures") {
      var out = [], tn = f[1];
      out.push(Array.isArray(tn) ? M.symName(tn[0]) : M.symName(tn));
      out.push(M.symName(f[2]));
      f.slice(3).forEach(function (x) { if (Array.isArray(x)) out.push(M.symName(x[0])); else out.push(M.symName(x)); });
      return out.filter(Boolean);
    }
    return [];
  }
  function isDefForm(f) { var h = headName(f); return h === "define" || h === "define-record" || h === "define-record-procedures" || h === ":"; }
  function isCheck(f) { var h = headName(f); return !!h && /^check-/.test(h); }
  function symbolsIn(x, acc) {
    acc = acc || new Set();
    if (Array.isArray(x)) x.forEach(function (y) { symbolsIn(y, acc); });
    else if (x && x.sym) acc.add(x.sym.name);
    return acc;
  }

  // ---------- Kontext: gegebener Code + Definitionen aus anderen Lösungen
  var BUILTIN = null;
  function contextForms(task, refNames) {
    if (!BUILTIN) BUILTIN = new Set(new M.Interp().global.vars.keys());
    var forms = [];
    function addFrom(src, onlyDefs) {
      var fs; try { fs = M.readAll(src); } catch (e) { return; }
      fs.forEach(function (f) {
        if (!isDefForm(f)) { if (onlyDefs) return; if (isCheck(f)) return; }
        if (headName(f) === ":") return;
        var names = definedNames(f);
        if (names.some(function (n) { return refNames.has(n) || BUILTIN.has(n); })) return;
        forms.push(f);
      });
    }
    (task.lern || []).forEach(function (o) { addFrom(o, true); });
    (task.prev || []).forEach(function (o) { addFrom(o, true); });
    if (task.given) addFrom(task.given, true);
    (task.others || []).forEach(function (o) { addFrom(o, true); });
    return forms;
  }
  function evalForms(it, forms) {
    forms.forEach(function (f) { try { it.eval(f, it.global); } catch (e) { /* Kontext-Fehler ignorieren */ } });
    it.tests = [];
  }
  function runProgram(it, src) {
    var forms = M.readAll(src), values = [];
    forms.forEach(function (f) {
      var v = it.eval(f, it.global);
      if (!isDefForm(f) && !isCheck(f) && v !== M.Void && v !== undefined) values.push({ form: f, value: v });
    });
    return { forms: forms, values: values };
  }
  function safe(fn) {
    try { return { v: fn() }; }
    catch (e) {
      if (e instanceof RangeError) return { e: new M.RacketError("Zu tiefe Rekursion – vermutlich eine Endlosrekursion (der rekursive Aufruf kommt nie beim Basisfall an).", "loop") };
      if (e instanceof M.RacketError) return { e: e };
      return { e: new M.RacketError("Interner Fehler im Prüfer: " + (e && e.message), "internal") };
    }
  }

  // ---------- Hinweise
  function errorHint(e) {
    var m = e.message || "";
    if (e.kind === "unbound") {
      var n = m.split(":")[0];
      return "Der Name „" + n + "“ hat keinen Wert. Tippfehler? Heißt deine Funktion genau so wie in der Aufgabe? Wurde sie mit define definiert?";
    }
    if (e.kind === "syntax" && /Klammer/.test(m)) return "Zähle die Klammern: Zu jeder „(“ gehört genau eine „)“. Tipp: In DrRacket mit Tab einrücken, dann sieht man, wo eine fehlt.";
    if (e.kind === "arity") return "Die Anzahl der Argumente passt nicht zur Anzahl der Parameter im lambda.";
    if (e.kind === "notproc") return "Klammern bedeuten in Racket immer „wende an“. Prüfe, ob irgendwo eine Klammer zu viel steht oder der Operator nicht vorne ist.";
    if (e.kind === "cond") return "Für die Eingabe trifft keine Bedingung zu. Fehlt ein Fall – oder ein else-Zweig? Prüfe auch die Grenzen (< oder <=).";
    if (e.kind === "loop") return "Jeder rekursive Aufruf muss mit einem kleineren Teil arbeiten (z. B. (rest l) oder (- n 1)), und der Basisfall muss vorher geprüft werden.";
    if (e.kind === "sig") return "Ein Selektor wurde auf den falschen Record angewendet. Prüfe im cond, ob du im richtigen Zweig bist (Prädikat wie dillo?).";
    if (/first|rest/.test(m) && /empty/.test(m)) return "first/rest gehen nur bei nichtleeren Listen. Prüfe zuerst (empty? l).";
    if (/Zahl .*erwartet, ".*" bekommen/.test(m)) return "Hier kommt Text statt einer Zahl an. Zahlen ohne Anführungszeichen schreiben – oder string->number benutzen.";
    if (/Zeichenkette .*erwartet/.test(m)) return "Hier kommt etwas anderes als Text an. Zahlen mit number->string umwandeln.";
    if (/Funktion erwartet/.test(m)) return "Bei filter und map kommt die Funktion zuerst, bei fold zuerst der Basiswert, dann die Funktion, dann die Liste.";
    if (e.kind === "unsupported") return null;
    return null;
  }
  function diffHint(act, exp) {
    var N = M;
    if (N.isNum(act) && N.isNum(exp)) {
      var a = N.toF(act), b = N.toF(exp);
      if (!N.isExact(act) && Math.abs(a - b) < 1e-6) return "Fast richtig – nur ein Rundungsunterschied. Für Kommazahlen check-within benutzen.";
      if (a === 0 && b !== 0) return "Ergebnis ist 0. Bei Produkten muss der Basisfall 1 sein (neutrales Element der Multiplikation), nicht 0.";
      if (Math.abs(a - b) === 1) return "Um genau 1 daneben. Prüfe Grenzen (< oder <=) und den Basisfall.";
      if (a === -b) return "Vorzeichen verkehrt – Reihenfolge bei der Subtraktion vertauscht?";
      if (b !== 0 && Math.abs(a / b - 2) < 1e-9) return "Doppelt so groß wie erwartet – wird etwas zweimal gezählt?";
      if (b !== 0 && Math.abs(a / b - 0.5) < 1e-9) return "Halb so groß wie erwartet – fehlt ein Teil (z. B. ein rekursiver Aufruf)?";
    }
    if (act === true && exp === false || act === false && exp === true) return "Genau umgekehrt – Bedingung vertauscht, oder ein not zu viel/zu wenig?";
    if (typeof act === "string" && typeof exp === "string") {
      if (act.toLowerCase() === exp.toLowerCase()) return "Nur die Groß-/Kleinschreibung ist anders.";
      if (act.replace(/\s+/g, "") === exp.replace(/\s+/g, "")) return "Nur die Leerzeichen sind anders.";
    }
    if (act instanceof N.Pair && exp instanceof N.Pair) {
      var A = toArr(act), E = toArr(exp);
      if (A.length === E.length && N.equal(N.Interp ? listFrom(A.slice().reverse()) : null, exp)) return "Die Liste ist genau umgedreht – bei einem Akkumulator am Ende reverse benutzen.";
      if (A.length !== E.length) return "Die Liste hat " + A.length + " statt " + E.length + " Elemente.";
    }
    if ((act === N.Empty) !== (exp === N.Empty) && (act instanceof N.Pair || exp instanceof N.Pair)) return "Einmal leere Liste, einmal nicht – stimmt der Basisfall?";
    if (act instanceof N.Img && exp instanceof N.Img) {
      if (Math.round(act.w) !== Math.round(exp.w) || Math.round(act.h) !== Math.round(exp.h)) return "Das Bild ist " + Math.round(act.w) + "×" + Math.round(act.h) + " Pixel groß, erwartet sind " + Math.round(exp.w) + "×" + Math.round(exp.h) + ".";
      return "Gleiche Größe, aber anderer Inhalt – Farbe, Modus oder Reihenfolge prüfen.";
    }
    if (N.typeName(act) !== N.typeName(exp)) return "Falsche Sorte: dein Ergebnis ist " + N.typeName(act) + ", erwartet ist " + N.typeName(exp) + ".";
    return null;
  }
  function toArr(l) { var a = []; while (l instanceof M.Pair) { a.push(l.car); l = l.cdr; } return a; }
  function listFrom(a) { var l = M.Empty; for (var i = a.length - 1; i >= 0; i--) l = new M.Pair(a[i], l); return l; }


  // ---------- Zufallstests: Musterlösung und Abgabe mit denselben Eingaben vergleichen
  function literals(forms) {
    var nums = [], strs = [];
    (function walk(x) {
      if (Array.isArray(x)) { if (M.symName(x[0]) === "quote") return; x.forEach(walk); }
      else if (M.isNum(x)) nums.push(x);
      else if (x instanceof String) strs.push(String(x));
    })(forms);
    var out = [];
    nums.forEach(function (n) {
      if (!M.isExact(n)) return;
      out.push(n, new M.Rat(n.n + n.d, n.d), new M.Rat(n.n - n.d, n.d), new M.Rat(2n * n.n + n.d, 2n * n.d), new M.Rat(2n * n.n - n.d, 2n * n.d));
    });
    return { nums: out, strs: strs };
  }
  function rint(n) { return Math.floor(Math.random() * n); }
  function like(v, ri, depth) {
    if (depth > 6) throw new M.RacketError("untestable", "untestable");
    if (M.isNum(v)) {
      var h = ri.numHints || [];
      if (M.isExact(v) && v.d === 1n) {
        var ints = h.filter(function (x) { return M.isExact(x) && x.d === 1n && (v.n < 0n || x.n >= 0n); });
        if (ints.length && rint(2) === 0) return ints[rint(ints.length)];
        var span = Number(v.n < 0n ? -v.n : v.n) * 2 + 10;
        return new M.Rat(BigInt(v.n < 0n ? rint(2 * span) - span : rint(span)));
      }
      if (M.isExact(v)) { if (h.length && rint(2) === 0) return h[rint(h.length)]; return new M.Rat(BigInt(rint(201) - 100), BigInt(rint(9) + 1)); }
      return (Math.random() - 0.5) * 200;
    }
    if (typeof v === "string") {
      var sh = ri.strHints || [];
      if (sh.length && rint(2) === 0) return sh[rint(sh.length)];
      var al = "abcxyzäAB ", n = rint(7), o = ""; while (n--) o += al[rint(al.length)]; return o;
    }
    if (v === true || v === false) return rint(2) === 0;
    if (v instanceof M.Pair) {
      var elems = []; var q = v; while (q instanceof M.Pair) { elems.push(q.car); q = q.cdr; }
      var len = rint(Math.max(6, elems.length + 3)), l = M.Empty;
      while (len--) l = new M.Pair(like(elems[rint(elems.length)], ri, depth + 1), l);
      return l;
    }
    if (v instanceof M.RecordVal) {
      try { return ri.gen(new M.Sig("record", v.type), depth); } catch (e) { /* Feldsignaturen nicht erzeugbar */ }
      return new M.RecordVal(v.type, v.vals.map(function (x) { return like(x, ri, depth + 1); }));
    }
    if (v === M.Empty) return v;
    throw new M.RacketError("untestable", "untestable");
  }
  function findUserType(ui, name) {
    var found = null;
    ui.global.vars.forEach(function (v) { if (v instanceof M.Sig && v.kind === "record" && v.data.name === name) found = v.data; });
    return found;
  }
  function convert(v, ri, ui) {
    if (v instanceof M.Pair) return new M.Pair(convert(v.car, ri, ui), convert(v.cdr, ri, ui));
    if (v instanceof M.RecordVal) {
      var ut = findUserType(ui, v.type.name);
      var vals = v.vals.map(function (x) { return convert(x, ri, ui); });
      if (!ut) return new M.RecordVal(v.type, vals);
      if (ut.fields.length !== vals.length) throw new M.RacketError("record-mismatch", "untestable");
      var same = v.type.fields.every(function (f) { return ut.fields.indexOf(f) >= 0; });
      if (same) vals = ut.fields.map(function (f) { return vals[v.type.fields.indexOf(f)]; });
      return new M.RecordVal(ut, vals);
    }
    return v;
  }
  function randomTests(A, ri, ui) {
    var lit = literals(A.refForms);
    ri.numHints = lit.nums; ri.strHints = lit.strs;
    var items = [], done = new Set(), within = new Set();
    A.refChecks.forEach(function (t) { if (headName(t) === "check-within" && Array.isArray(t[1])) within.add(M.symName(t[1][0])); });
    function same(name, a, b) {
      if (within.has(name)) return M.equal(a, b, M.isNum(b) ? Math.max(0.001, Math.abs(M.toF(b)) * 1e-3) : 0.001);
      return M.equal(a, b);
    }
    A.refForms.forEach(function (f) {
      if (headName(f) !== ":" || !Array.isArray(f[2])) return;
      var name = M.symName(f[1]);
      if (!A.refNames.has(name)) return;
      var rf = ri.global.vars.get(name), uf = ui.global.vars.get(name);
      if (!(rf instanceof M.Closure) || !(uf instanceof M.Closure || uf instanceof M.Prim)) return;
      var sig = f[2], arrow = sig.findIndex(function (x) { return M.symName(x) === "->"; });
      if (arrow < 0 || arrow !== sig.length - 2) return;
      var argSigs = sig.slice(0, arrow);
      if (argSigs.some(function (s) { return Array.isArray(s) && s.some(function (y) { return M.symName(y) === "->"; }); })) return;
      var sigVals = safe(function () { return argSigs.map(function (s) { return ri.eval(s, ri.global); }); });
      if (sigVals.e) return;
      var tried = 0;
      for (var trial = 0; trial < 60 && tried < 40; trial++) {
        var args = safe(function () { return sigVals.v.map(function (s) { return ri.gen(s, 0); }); });
        if (args.e) return; // nicht erzeugbar
        ri.steps = 0;
        var exp = safe(function () { return ri.apply(rf, args.v); });
        if (exp.e) continue; // Eingabe außerhalb des Gültigkeitsbereichs
        tried++;
        var uargs = safe(function () { return args.v.map(function (a) { return convert(a, ri, ui); }); });
        if (uargs.e) return;
        ui.steps = 0;
        var act = safe(function () { return ui.apply(uf, uargs.v); });
        var call = "(" + name + " " + args.v.map(function (a) { return M.show(a).replace(/^'/, "'"); }).join(" ") + ")";
        if (act.e) { items.push({ ok: false, random: true, title: "Zufallstest " + call, detail: "Fehler: " + act.e.message, hint: errorHint(act.e) || "Diese Eingabe ist in den festen Tests nicht dabei – prüfe, ob deine Funktion alle erlaubten Eingaben abdeckt." }); return; }
        if (!same(name, act.v, exp.v)) {
          items.push({ ok: false, random: true, _act: act.v, _exp: exp.v, title: "Zufallstest " + call, detail: "erwartet " + M.show(exp.v) + ", dein Programm liefert " + M.show(act.v),
            hint: (diffHint(act.v, exp.v) ? diffHint(act.v, exp.v) + " " : "") + "Dieser Fall steht nicht in den festen Tests. Rechne ihn von Hand nach – oft ist es eine Grenze (< oder <=). Falls die Aufgabe diesen Fall gar nicht festlegt, darfst du ihn ignorieren." });
          return;
        }
      }
      if (tried) items.push({ ok: true, random: true, title: "Zufallstests für " + name, detail: tried + " zufällige Eingaben wie die Musterlösung" });
      done.add(name);
    });
    // Funktionen ohne Signatur: Eingaben wie in den Tests der Musterlösung, aber zufällig abgewandelt
    A.refChecks.forEach(function (t) {
      var call = t[1];
      if (!Array.isArray(call)) return;
      var name = M.symName(call[0]);
      if (!name || done.has(name) || !A.refNames.has(name)) return;
      var rf = ri.global.vars.get(name), uf = ui.global.vars.get(name);
      if (!(rf instanceof M.Closure) || !(uf instanceof M.Closure || uf instanceof M.Prim)) return;
      var seed = safe(function () { return call.slice(1).map(function (a) { return ri.eval(a, ri.global); }); });
      if (seed.e || !seed.v.length) return;
      done.add(name);
      var tried = 0, bad = null;
      for (var trial = 0; trial < 60 && tried < 30 && !bad; trial++) {
        var args = safe(function () { return seed.v.map(function (v) { return like(v, ri, 0); }); });
        if (args.e) return;
        ri.steps = 0;
        var exp = safe(function () { return ri.apply(rf, args.v); });
        if (exp.e) continue;
        tried++;
        var uargs = safe(function () { return args.v.map(function (a) { return convert(a, ri, ui); }); });
        if (uargs.e) return;
        ui.steps = 0;
        var act = safe(function () { return ui.apply(uf, uargs.v); });
        var callS = "(" + name + " " + args.v.map(function (a) { return M.show(a); }).join(" ") + ")";
        if (act.e) bad = { ok: false, random: true, title: "Zufallstest " + callS, detail: "Fehler: " + act.e.message, hint: errorHint(act.e) || "Diese Eingabe ist in den festen Tests nicht dabei." };
        else if (!same(name, act.v, exp.v)) bad = { ok: false, random: true, _act: act.v, _exp: exp.v, title: "Zufallstest " + callS, detail: "erwartet " + M.show(exp.v) + ", dein Programm liefert " + M.show(act.v),
          hint: (diffHint(act.v, exp.v) ? diffHint(act.v, exp.v) + " " : "") + "Dieser Fall steht nicht in den festen Tests. Rechne ihn von Hand nach – oft ist es eine Grenze (< oder <=). Falls die Aufgabe diesen Fall gar nicht festlegt, darfst du ihn ignorieren." };
      }
      if (bad) items.push(bad);
      else if (tried) items.push({ ok: true, random: true, title: "Zufallstests für " + name, detail: tried + " abgewandelte Eingaben wie die Musterlösung" });
    });
    return items;
  }

  // ---------- Hauptfunktion
  function analyse(task) {
    var refForms = M.readAll(task.ref || "");
    var refNames = new Set();
    if (!BUILTIN) BUILTIN = new Set(new M.Interp().global.vars.keys());
    refForms.forEach(function (f) { definedNames(f).forEach(function (n) { if (!BUILTIN.has(n)) refNames.add(n); }); });
    var refChecks = refForms.filter(isCheck);
    var refExprs = refForms.filter(function (f) { return !isDefForm(f) && !isCheck(f); });
    var calls = [];
    (task.ref || "").split("\n").forEach(function (line) {
      var m = /;\s*Aufruf:\s*(\(.*\))\s*(?:=>.*)?$/.exec(line);
      if (m) { try { calls = calls.concat(M.readAll(m[1].replace(/=>.*$/, ""))); } catch (e) {} }
    });
    var cust = task.custom || {};
    (cust.tests || []).forEach(function (t) { try { M.readAll(t).forEach(function (f) { refForms.push(f); refChecks.push(f); }); } catch (e) {} });
    if (cust.needName) refNames.add(cust.needName);
    var kind;
    if ((cust.images || cust.value) && !(cust.tests && cust.tests.length)) kind = "regeln";
    else if (refChecks.length && refNames.size) kind = "tests";
    else if (refChecks.length) kind = "selbsttests";
    else if (refExprs.length) kind = "werte";
    else if (refNames.size && calls.length) kind = "aufrufe";
    else if (refNames.size && /\(define s1/.test(task.given || "")) kind = "auto";
    else kind = "manual";
    if (task.override) kind = task.override;
    var required = [];
    refNames.forEach(function (n) { if (refChecks.concat(calls).some(function (f) { return symbolsIn(f).has(n); })) required.push(n); });
    return { required: required, kind: kind, refForms: refForms, refNames: refNames, refChecks: refChecks, refExprs: refExprs, calls: calls };
  }

  function grade(task, userSrc) {
    var A = analyse(task);
    if (A.kind === "manual") return { status: "manual", summary: "Diese Aufgabe kann nicht automatisch geprüft werden. Vergleiche deine Antwort mit der Lösung.", items: [] };
    var ctx = contextForms(task, A.refNames);

    // Musterlösung ausführen
    var ri = new M.Interp(); evalForms(ri, ctx);
    var refRun = safe(function () { return runProgram(ri, task.ref); });
    if (refRun.e) return { status: "manual", summary: "Diese Aufgabe kann online leider nicht geprüft werden (" + refRun.e.message + "). Vergleiche mit der Lösung.", items: [] };
    (task.custom && task.custom.tests || []).forEach(function (t) { safe(function () { M.readAll(t).forEach(function (f) { ri.eval(f, ri.global); }); }); });
    var refTests = ri.tests;

    // Abgabe ausführen
    var ui = new M.Interp(); evalForms(ui, ctx);
    if (!userSrc || !userSrc.trim()) return { status: "error", summary: "Du hast noch nichts eingegeben.", items: [] };
    var userRun = safe(function () { return runProgram(ui, userSrc); });
    if (userRun.e) {
      return { status: "error", summary: "Dein Programm bricht mit einem Fehler ab.", items: [{ ok: false, title: userRun.e.message + (userRun.e.line ? " (Zeile " + userRun.e.line + ")" : ""), hint: errorHint(userRun.e) }] };
    }
    var userVals = userRun.v.values, items = [], extraNotes = [];
    var cust = task.custom || {};
    var userSyms = symbolsIn(userRun.v.forms);
    (cust.forbid || []).forEach(function (sy) { if (userSyms.has(sy)) items.push({ ok: false, title: "„" + sy + "“ ist in dieser Aufgabe nicht erlaubt", hint: "Lies die Aufgabe noch einmal: Sie verlangt eine Lösung ohne " + sy + "." }); });
    (cust.require || []).forEach(function (sy) { if (!userSyms.has(sy)) items.push({ ok: false, title: "„" + sy + "“ kommt in deinem Code nicht vor", hint: "Die Aufgabe verlangt, dass du " + sy + " benutzt." }); });
    if (A.kind === "regeln") {
      if (cust.value === "string-space") {
        var sv = userVals.length ? userVals[userVals.length - 1].value : null;
        items.push(typeof sv === "string" && /\S \S/.test(sv) ? { ok: true, title: "Ergebnis: " + M.show(sv), detail: "Text mit Leerzeichen zwischen Vor- und Nachname" }
          : { ok: false, title: "Ergebnis: " + (sv === null ? "keins" : M.show(sv)), detail: "erwartet wird ein Text mit Vor- und Nachname und einem Leerzeichen dazwischen", hint: "Das Leerzeichen ist ein eigenes Argument: (string-append \"Vorname\" \" \" \"Nachname\")." });
      }
      if (cust.images) {
        var imgs = userVals.map(function (v) { return v.value; });
        (cust.calls || []).forEach(function (c) {
          var r = safe(function () { return M.readAll(c).map(function (f) { return ui.eval(f, ui.global); }).pop(); });
          if (r.e) items.push({ ok: false, title: c, detail: "Fehler: " + r.e.message, hint: errorHint(r.e) }); else imgs.push(r.v);
        });
        imgs = imgs.filter(function (v) { return v instanceof M.Img; });
        if (!imgs.length && !items.length) items.push({ ok: false, title: "Kein Bild gefunden", hint: (cust.calls ? "Definiere die Funktion so, dass " + cust.calls[0] + " ein Bild liefert." : "Schreibe den Bild-Ausdruck direkt hin, nicht nur eine Definition.") });
        else cust.images.forEach(function (rule) {
          var re = new RegExp(rule.re), hit = imgs.filter(function (im) { return re.test(im.key()); });
          items.push(hit.length ? { ok: true, title: rule.ok || "Bild passt", images: [hit[0]] } : { ok: false, title: "Das Bild passt noch nicht", detail: rule.msg, images: imgs.slice(-1) });
        });
      }
    }
    if (A.kind === "zeigen") {
      var callVals = function (it) { return A.calls.map(function (c) { var r = safe(function () { return it.eval(c, it.global); }); return r.e ? null : r.v; }); };
      var mine = userVals.map(function (v) { return v.value; }).concat(A.calls.length ? callVals(ui) : []).filter(function (v) { return v instanceof M.Img; });
      var theirs = refRun.v.values.map(function (v) { return v.value; }).concat(A.calls.length ? callVals(ri) : []).filter(function (v) { return v instanceof M.Img; });
      if (A.calls.length) A.calls.forEach(function (c) { var r = safe(function () { return ui.eval(c, ui.global); }); if (r.e) items.push({ ok: false, title: unparse(c), detail: "Fehler: " + r.e.message, hint: errorHint(r.e) }); });
      if (!mine.length && !items.length) return { status: "fail", summary: "Dein Programm liefert kein Bild.", items: [{ ok: false, title: "Kein Bild gefunden", hint: "Schreibe den Bild-Ausdruck direkt hin, z. B. (above …), nicht nur eine Definition." }] };
      return { status: items.length ? "fail" : "zeigen", summary: items.length ? "Dein Programm hat einen Fehler." : "Hier gibt es kein festes Richtig oder Falsch – vergleiche dein Bild mit der Musterlösung.", items: items, gallery: { mine: mine.slice(0, 6), theirs: theirs.slice(0, 6) } };
    }

    // fehlende Definitionen
    var missing = [];
    A.refNames.forEach(function (n) {
      if (ui.global.vars.has(n)) return;
      var usedInTests = A.refChecks.concat(A.calls).some(function (f) { return symbolsIn(f).has(n); });
      if (usedInTests) missing.push(n);
    });
    if (missing.length) {
      return { status: "fail", summary: "Es fehlt " + (missing.length === 1 ? "eine Definition" : missing.length + " Definitionen") + ".", items: missing.map(function (n) {
        return { ok: false, title: "„" + n + "“ ist in deinem Programm nicht definiert.", hint: "Die Prüfung ruft „" + n + "“ auf. Nenne deine Funktion (oder deinen Record-Teil) genau so wie in der Aufgabe und definiere sie mit define bzw. define-record." };
      }) };
    }

    // eigene Tests des Nutzers
    var ownResults = ui.tests.map(function (t) { var r = safe(function () { return ui.runTest(t); }); return r.e ? { ok: false, error: r.e, form: t.form } : r.v; });
    var ownFailed = ownResults.filter(function (r) { return !r.ok; });

    function compareItem(title, act, exp, eps) {
      var ok = M.equal(act, exp, eps);
      return { _act: act, _exp: exp, ok: ok, title: title, detail: ok ? "→ " + M.show(act) : "erwartet " + M.show(exp) + ", dein Programm liefert " + M.show(act), hint: ok ? null : diffHint(act, exp), images: (!ok && act instanceof M.Img && exp instanceof M.Img) ? [act, exp] : (ok && act instanceof M.Img ? [act] : null) };
    }

    if (A.kind === "tests" || A.kind === "selbsttests") {
      refTests.forEach(function (t) {
        var f = t.form, title = unparse(f[1]);
        if (t.kind === "check-expect" || t.kind === "check-within") {
          var ex = safe(function () { return ri.eval(f[2], ri.global); });
          if (ex.e) return;
          var eps = t.kind === "check-within" ? safe(function () { return ri.eval(f[3], ri.global); }).v : undefined;
          var ac = safe(function () { return ui.eval(f[1], ui.global); });
          if (ac.e) items.push({ ok: false, title: title, detail: "Fehler: " + ac.e.message, hint: errorHint(ac.e) });
          else items.push(compareItem(title, ac.v, ex.v, eps));
        } else if (t.kind === "check-error") {
          var r = safe(function () { return ui.eval(f[1], ui.global); });
          items.push(r.e && r.e.kind !== "loop" ? { ok: true, title: title, detail: "→ Fehler wie erwartet" }
            : { ok: false, title: title, detail: r.e ? r.e.message : "erwartet einen Fehler, dein Programm liefert " + M.show(r.v), hint: r.e ? errorHint(r.e) : "Für diesen Fall soll das Programm mit violation abbrechen." });
        } else if (t.kind === "check-property") {
          var pr = safe(function () { return ui.checkProperty(ui.eval(f[1], ui.global)); });
          var ptitle = "Eigenschaft: " + unparse(f[1]).slice(0, 90) + (unparse(f[1]).length > 90 ? " …" : "");
          if (pr.e) items.push({ ok: false, title: ptitle, detail: "Fehler: " + pr.e.message, hint: errorHint(pr.e) });
          else if (pr.v.untestable) return;
          else items.push({ ok: pr.v.ok, title: ptitle, detail: pr.v.ok ? "100 zufällige Eingaben geprüft" : "Gegenbeispiel: " + (pr.v.counter || []).join(", ") + (pr.v.error ? " – Fehler: " + pr.v.error.message : ""), hint: pr.v.ok ? null : "Rechne das Gegenbeispiel von Hand nach: Liegt der Fehler in der Funktion oder in der Eigenschaft?" });
        }
      });
      if (A.kind === "selbsttests") {
        var need = Math.min(Math.max(A.refChecks.length, 1), 3);
        var have = ui.tests.length;
        items.unshift({ ok: have >= need, title: "Eigene Tests geschrieben: " + have, detail: have >= need ? "genug Tests" : "Die Aufgabe verlangt mindestens " + need + " Test" + (need > 1 ? "s" : "") + " (check-expect …).", hint: have >= need ? null : "Schreibe Tests der Form (check-expect (funktion eingabe) erwartetes-ergebnis)." });
      }
    } else if (A.kind === "werte") {
      var refVals = refRun.v.values;
      if (!userVals.length) return { status: "fail", summary: "Dein Programm liefert keinen Wert.", items: [{ ok: false, title: "Keine Ausdrücke gefunden", hint: "Schreibe die Ausdrücke direkt hin (nicht nur Definitionen). Erwartet " + (refVals.length === 1 ? "wird 1 Ergebnis" : "werden " + refVals.length + " Ergebnisse") + "." }] };
      refVals.forEach(function (rv, i) {
        var label = refVals.length > 1 ? "Ausdruck " + (i + 1) : "Ergebnis";
        if (i >= userVals.length) { items.push({ ok: false, title: label + ": fehlt", detail: "erwartet wird " + M.show(rv.value), hint: "Es werden " + refVals.length + " Ausdrücke in der Reihenfolge der Aufgabe erwartet." }); return; }
        var it = compareItem(label + ": " + unparse(userVals[i].form), userVals[i].value, rv.value);
        items.push(it);
      });
      if (userVals.length > refVals.length) extraNotes.push("Du hast " + userVals.length + " Ausdrücke geschrieben, geprüft wurden die ersten " + refVals.length + ".");
    } else if (A.kind === "aufrufe" || A.kind === "auto") {
      var calls = A.calls;
      if (A.kind === "auto") {
        calls = [];
        A.refNames.forEach(function (n) {
          var fv = ri.global.vars.get(n);
          if (fv instanceof M.Closure) {
            var args = ["s1", "c1", "p1"].slice(0, fv.params.length);
            if (fv.params.length <= 3) calls.push([{ sym: M.sym(n) }].concat(args.map(function (a) { return { sym: M.sym(a) }; })));
          }
        });
      }
      calls.forEach(function (c) {
        var ex = safe(function () { return ri.eval(c, ri.global); });
        if (ex.e) return;
        var ac = safe(function () { return ui.eval(c, ui.global); });
        if (ac.e) items.push({ ok: false, title: unparse(c), detail: "Fehler: " + ac.e.message, hint: errorHint(ac.e) });
        else items.push(compareItem(unparse(c), ac.v, ex.v));
      });
    }

    (cust.mustFail || []).forEach(function (src) {
      var f = M.readAll(src)[0];
      var pr = safe(function () { return ui.checkProperty(ui.eval(f[1], ui.global)); });
      var title = "Diese Eigenschaft muss für deine Funktion FALSCH sein: " + unparse(f[1]).slice(0, 80) + " …";
      if (pr.e) items.push({ ok: false, title: title, detail: "Fehler: " + pr.e.message, hint: errorHint(pr.e) });
      else items.push(pr.v.ok ? { ok: false, title: title, detail: "Sie gilt aber für 100 zufällige Listen.", hint: "Deine Funktion ist zu gut – sie soll die dritte Eigenschaft verletzen." } : { ok: true, title: title, detail: "falsifiziert mit " + (pr.v.counter || []).join(", ") });
    });
    if (A.kind === "tests" || A.kind === "aufrufe") {
      var fixedFailed = items.some(function (i) { return !i.ok; });
      var rnd = randomTests(A, ri, ui);
      // Zufallstests nur zeigen, wenn sie etwas finden oder alles andere stimmt
      rnd.forEach(function (i) { if (!i.ok || !fixedFailed) items.push(i); });
    }
    ownResults.forEach(function (r) {
      var f = r.form;
      if (r.ok) return;
      items.push({ ok: false, own: true, title: "Dein eigener Test: " + unparse(f).slice(0, 100),
        detail: r.error ? "Fehler: " + r.error.message : (r.noError ? "erwartet einen Fehler, aber es kam " + M.show(r.actual) : r.counter ? "Gegenbeispiel: " + r.counter.join(", ") : "erwartet " + M.show(r.expected) + ", bekommt " + M.show(r.actual)),
        hint: r.error ? errorHint(r.error) : (r.expected !== undefined ? "Entweder ist deine Funktion falsch – oder der erwartete Wert im Test. Rechne von Hand nach." : null) });
    });

    if (!items.length) return { status: "manual", summary: "Für diese Aufgabe gibt es keine automatischen Tests. Vergleiche mit der Lösung.", items: [] };
    var failed = items.filter(function (i) { return !i.ok; }).length, passed = items.length - failed;
    // gemeinsames Muster bei mehreren Fehlschlägen: immer gleicher Abstand oder gleicher Faktor
    var numFails = items.filter(function (i) { return !i.ok && !i.own && i._act !== undefined && M.isNum(i._act) && M.isNum(i._exp); });
    if (numFails.length >= 2) {
      var diffs = numFails.map(function (i) { return M.toF(i._act) - M.toF(i._exp); });
      if (diffs.every(function (d) { return Math.abs(d - diffs[0]) < 1e-9; }) && diffs[0] !== 0)
        extraNotes.push("Auffällig: Alle falschen Ergebnisse sind um genau " + M.show(M.isExact(numFails[0]._act) ? new M.Rat(BigInt(Math.round(Math.abs(diffs[0]))), 1n) : Math.abs(diffs[0])).replace(/^#i/, "") + " zu " + (diffs[0] > 0 ? "groß" : "klein") + ". Stimmt eine Konstante (z. B. ein Summand)?");
    }
    var userImages = userVals.filter(function (v) { return v.value instanceof M.Img; }).map(function (v) { return v.value; }).slice(0, 6);
    var summary;
    if (!failed) {
      summary = "Richtig! " + (A.kind === "werte" ? "Alle Ergebnisse stimmen." : "Alle " + passed + " Prüfungen bestanden.");
      if (A.kind === "tests" && !ui.tests.length && task.kap >= 1 && /\(check-/.test(task.ref || "")) extraNotes.push("Tipp: Schreib auch eigene check-expect-Tests – das gehört zur Konstruktionsanleitung.");
    } else summary = failed + " von " + items.length + " Prüfungen " + (failed === 1 ? "schlägt" : "schlagen") + " fehl.";
    return { status: failed ? "fail" : "ok", summary: summary, items: items, notes: extraNotes, userImages: userImages, kind: A.kind };
  }

  var api = { grade: grade, analyse: analyse, unparse: unparse, errorHint: errorHint };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Pruefer = api;
})(typeof window !== "undefined" ? window : this);
