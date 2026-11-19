/* Playground: Racket-Code im Browser ausführen. Braucht racket.js und pruefer.js. */
(function () {
  "use strict";
  var M = window.MiniRacket, P = window.Pruefer;
  var ta = document.getElementById("pg-code"), out = document.getElementById("pg-out");
  var runBtn = document.getElementById("pg-run"), ex = document.getElementById("pg-ex");
  var repl = document.getElementById("pg-repl"), clearBtn = document.getElementById("pg-clear"), shareBtn = document.getElementById("pg-share");
  if (!M || !ta) return;
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  var BEISPIELE = {
    "Rechnen": '; Der Operator steht vorne in der Klammer\n(+ 1 2)\n(* 23 (+ 44 27))\n(/ 1 3)\n(sqrt 16)\n(string-append "Hallo, " "Welt!")\n(string-length "Racket")',
    "Bilder": '(define s1 (square 40 "solid" "red"))\n(define c1 (circle 20 "solid" "green"))\n(define p1 (star-polygon 20 10 3 "solid" "blue"))\n\n(define tile\n  (lambda (a b)\n    (above (beside a b)\n           (beside b a))))\n\n(tile s1 p1)\n(tile (tile s1 c1) (tile p1 s1))',
    "Funktion mit Tests": '; Temperatur von Celsius in Fahrenheit umrechnen\n(: celsius->fahrenheit (rational -> rational))\n\n(check-expect (celsius->fahrenheit 0) 32)\n(check-expect (celsius->fahrenheit 100) 212)\n(check-expect (celsius->fahrenheit -40) -40)\n\n(define celsius->fahrenheit\n  (lambda (c)\n    (+ (* c 9/5) 32)))\n\n(celsius->fahrenheit 37)',
    "Fallunterscheidung (cond)": '(: schulnote ((integer-from-to 0 100) -> (integer-from-to 1 6)))\n(check-expect (schulnote 92) 1)\n(check-expect (schulnote 91) 2)\n(define schulnote\n  (lambda (p)\n    (cond\n      ((>= p 92) 1)\n      ((>= p 81) 2)\n      ((>= p 67) 3)\n      ((>= p 50) 4)\n      ((>= p 30) 5)\n      (else 6))))\n\n(schulnote 75)',
    "Records": '(define-record dillo\n  make-dillo\n  dillo?\n  (dillo-weight natural)\n  (dillo-alive? boolean))\n\n(define d1 (make-dillo 55000 #t))\n(define run-over-dillo\n  (lambda (d)\n    (make-dillo (dillo-weight d) #f)))\n\nd1\n(dillo-weight d1)\n(run-over-dillo d1)\n(check-expect (dillo-alive? (run-over-dillo d1)) #f)',
    "Listen": '; Sprachebene „Schreibe Dein Programm!“ (eingebaute Listen)\n(define list-sum\n  (lambda (list)\n    (cond\n      ((empty? list) 0)\n      ((cons? list) (+ (first list) (list-sum (rest list)))))))\n\n(list-sum (list 1 2 3 4))\n(filter even? (list 1 2 3 4 5 6))\n(map (lambda (x) (* x x)) (list 1 2 3))\n(fold 0 + (list 1 2 3 4))',
    "Eigenschaften (check-property)": '(check-property\n (for-all ((a rational) (b rational))\n   (= (+ a b) (+ b a))))\n\n(check-property\n (for-all ((l (list-of integer)))\n   (expect (reverse (reverse l)) l)))',
    "Szene mit place-image": '(place-image (circle 15 "solid" "red")\n             60 40\n             (empty-scene 200 100))'
  };
  Object.keys(BEISPIELE).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = k; ex.appendChild(o); });

  // Bilder: Text messen und zeichnen
  var mcv = document.createElement("canvas").getContext("2d");
  M.setTextMeasure(function (s, size) { mcv.font = size + "px sans-serif"; return { w: Math.ceil(mcv.measureText(s).width), h: Math.ceil(size * 1.2) }; });
  function renderImg(img) {
    var w = Math.max(1, Math.ceil(img.w)), h = Math.max(1, Math.ceil(img.h));
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    img.draw(cv.getContext("2d"), 0, 0);
    var f = Math.min(1, 420 / Math.max(w, h)); cv.style.width = Math.round(w * f) + "px"; cv.style.height = Math.round(h * f) + "px";
    return cv;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function line(cls, code, value, extra) {
    var d = document.createElement("div"); d.className = "pg-line " + cls;
    if (code) { var c = document.createElement("code"); c.className = "pg-src"; c.textContent = code; d.appendChild(c); }
    if (value instanceof M.Img) { var w = document.createElement("div"); w.className = "pg-img"; w.appendChild(renderImg(value)); d.appendChild(w); }
    else if (value !== undefined) { var v = document.createElement("div"); v.className = "pg-val"; v.textContent = value; d.appendChild(v); }
    if (extra) { var h = document.createElement("div"); h.className = "pg-hint"; h.textContent = "💡 " + extra; d.appendChild(h); }
    out.appendChild(d); return d;
  }
  function wrapErr(e) {
    if (e instanceof RangeError) return new M.RacketError("Zu tiefe Rekursion – vermutlich eine Endlosrekursion.", "loop");
    if (e instanceof M.RacketError) return e;
    return new M.RacketError("Interner Fehler: " + (e && e.message), "internal");
  }
  function headName(f) { return Array.isArray(f) ? M.symName(f[0]) : null; }

  var interp = null;
  function run() {
    out.innerHTML = "";
    interp = new M.Interp();
    var forms;
    try { forms = M.readAll(ta.value); }
    catch (e) { e = wrapErr(e); line("err", null, e.message, P && P.errorHint(e)); return; }
    var shown = 0;
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      try {
        interp.steps = 0;
        var v = interp.eval(f, interp.global);
        var h = headName(f);
        if (h === "define" || h === "define-record" || h === ":" || (h && h.indexOf("check-") === 0)) continue;
        if (v === M.Void || v === undefined) continue;
        line("ok", P ? P.unparse(f) : "", v instanceof M.Img ? v : M.show(v)); shown++;
      } catch (e) {
        e = wrapErr(e);
        line("err", P ? P.unparse(f) : "", e.message + (e.line ? " (Zeile " + e.line + ")" : ""), P && P.errorHint(e));
        return;
      }
    }
    // Tests
    var res = interp.tests.map(function (t) { try { interp.steps = 0; return interp.runTest(t); } catch (e) { return { ok: false, error: wrapErr(e), form: t.form }; } });
    if (res.length) {
      var bad = res.filter(function (r) { return !r.ok; });
      var head = line(bad.length ? "testbad" : "testok", null, bad.length ? bad.length + " von " + res.length + " Tests fehlgeschlagen" : (res.length === 1 ? "Der Test wurde bestanden!" : "Alle " + res.length + " Tests bestanden!"));
      bad.forEach(function (r) {
        var src = P ? P.unparse(r.form) : "";
        var msg = r.error ? "Fehler: " + r.error.message : r.noError ? "erwartet einen Fehler, bekommt " + M.show(r.actual) : r.counter ? "Eigenschaft falsifizierbar mit " + r.counter.join(", ") : "Der tatsächliche Wert " + M.show(r.actual) + " ist nicht der erwartete Wert " + M.show(r.expected) + ".";
        line("err", src, msg, r.error && P ? P.errorHint(r.error) : null);
      });
    }
    if (!shown && !res.length) line("info", null, "Keine Ausgabe – nur Definitionen. Schreib einen Ausdruck oder probier unten in der Zeile „>“ etwas aus.");
    if (interp.animSkipped) line("info", null, "big-bang/animate wird hier nicht gestartet – die Animation probierst du in DrRacket aus.");
    out.scrollTop = out.scrollHeight;
  }
  function evalRepl() {
    var src = repl.value.trim(); if (!src) return;
    if (!interp) { interp = new M.Interp(); try { M.readAll(ta.value).forEach(function (f) { try { interp.eval(f, interp.global); } catch (e) {} }); } catch (e) {} }
    try {
      var forms = M.readAll(src), v;
      forms.forEach(function (f) { interp.steps = 0; v = interp.eval(f, interp.global); });
      line("ok repl", "> " + src, v === M.Void || v === undefined ? "" : (v instanceof M.Img ? v : M.show(v)));
    } catch (e) { e = wrapErr(e); line("err repl", "> " + src, e.message, P && P.errorHint(e)); }
    hist.unshift(src); hpos = -1; repl.value = "";
    out.scrollTop = out.scrollHeight;
  }
  var hist = [], hpos = -1;

  // Editor-Komfort
  function autosize() { ta.style.height = "auto"; ta.style.height = Math.max(320, ta.scrollHeight + 4) + "px"; }
  function insert(t) { var s = ta.selectionStart, e = ta.selectionEnd; ta.value = ta.value.slice(0, s) + t + ta.value.slice(e); ta.selectionStart = ta.selectionEnd = s + t.length; ta.dispatchEvent(new Event("input")); }
  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); return; }
    if (e.key === "Tab") { e.preventDefault(); insert("  "); return; }
    if (e.key === "Enter") {
      var before = ta.value.slice(0, ta.selectionStart), ln = before.slice(before.lastIndexOf("\n") + 1);
      var ind = (/^\s*/.exec(ln) || [""])[0];
      if ((ln.match(/\(/g) || []).length > (ln.match(/\)/g) || []).length) ind += "  ";
      e.preventDefault(); insert("\n" + ind);
    }
  });
  ta.addEventListener("input", function () { store.set("sdp-playground", ta.value); autosize(); });
  repl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); evalRepl(); }
    else if (e.key === "Tab" && window.RacketEditor) {
      var pos = repl.selectionStart, st = pos, v = repl.value;
      while (st > 0 && !/[\s()\[\]";']/.test(v[st - 1])) st--;
      var pre = v.slice(st, pos); if (!pre) return;
      e.preventDefault();
      var names = window.RacketEditor.names(ta.value).filter(function (k) { return k.indexOf(pre) === 0; });
      if (!names.length) return;
      var c = names[0]; names.forEach(function (x) { while (x.indexOf(c) !== 0) c = c.slice(0, -1); });
      repl.value = v.slice(0, st) + c + v.slice(pos); repl.selectionStart = repl.selectionEnd = st + c.length;
      if (names.length > 1 && c === pre) { line("info", null, "Passend: " + names.slice(0, 12).join("  ") + (names.length > 12 ? "  …" : "")); out.scrollTop = out.scrollHeight; }
    }
    else if (e.key === "ArrowUp" && hist.length) { hpos = Math.min(hist.length - 1, hpos + 1); repl.value = hist[hpos]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hpos = Math.max(-1, hpos - 1); repl.value = hpos < 0 ? "" : hist[hpos]; e.preventDefault(); }
  });
  runBtn.addEventListener("click", run);
  clearBtn.addEventListener("click", function () { if (!ta.value || confirm("Code wirklich löschen?")) { ta.value = ""; ta.dispatchEvent(new Event("input")); out.innerHTML = ""; interp = null; } });
  ex.addEventListener("change", function () {
    if (!ex.value) return;
    if (ta.value.trim() && !confirm("Dein Code wird durch das Beispiel ersetzt. Weiter?")) { ex.value = ""; return; }
    ta.value = BEISPIELE[ex.value]; ex.value = ""; ta.dispatchEvent(new Event("input")); run();
  });
  shareBtn.addEventListener("click", function () {
    var enc = btoa(unescape(encodeURIComponent(ta.value)));
    var url = location.origin + location.pathname + "#code=" + enc;
    var done = function () { shareBtn.textContent = "Link kopiert ✓"; setTimeout(function () { shareBtn.textContent = "🔗 Link teilen"; }, 1600); };
    window.history.replaceState(null, "", "#code=" + enc);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
  });

  // Start: Code aus Link, sonst gespeicherter Code, sonst Beispiel
  var m = /#code=([^&]+)/.exec(location.hash), start = null;
  if (m) { try { start = decodeURIComponent(escape(atob(m[1]))); } catch (e) {} }
  ta.value = start !== null ? start : (store.get("sdp-playground") || BEISPIELE["Bilder"]);
  var ed = window.RacketEditor ? window.RacketEditor.attach(ta) : null;
  autosize(); run();
  if (ed) ed.lint();
})();
