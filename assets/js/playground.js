/* Playground: Racket-Code im Browser ausführen – mit Sprachebenen, Signaturprüfung, Tests, Bildern,
   Animationen (big-bang, universe), Stepper und Editor-Hilfen.
   Braucht racket.js, pruefer.js (Fehlerhinweise), editor.js und stepper.js. */
(function () {
  "use strict";
  var M = window.MiniRacket, P = window.Pruefer;
  var ta = document.getElementById("pg-code"), out = document.getElementById("pg-out");
  var runBtn = document.getElementById("pg-run"), ex = document.getElementById("pg-ex");
  var lvlSel = document.getElementById("pg-level"), anim = document.getElementById("pg-anim");
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
    "Szene mit place-image": '(place-image (circle 15 "solid" "red")\n             60 40\n             (empty-scene 200 100))',
    "Animation (big-bang)": '; Ein Ball fliegt nach rechts. Pfeiltasten ← → ändern die Position,\n; ein Mausklick setzt ihn an die Klickstelle. Am rechten Rand ist Schluss.\n(: zeichne (natural -> image))\n(define zeichne\n  (lambda (x)\n    (place-image (circle 15 "solid" "red") x 60\n                 (empty-scene 300 120))))\n\n(: weiter (natural -> natural))\n(define weiter (lambda (x) (+ x 2)))\n\n(define taste\n  (lambda (x k)\n    (cond\n      ((key=? k "left") (max 0 (- x 20)))\n      ((key=? k "right") (+ x 20))\n      (else x))))\n\n(define maus\n  (lambda (x mx my ereignis)\n    (if (mouse=? ereignis "button-down") mx x)))\n\n(define fertig? (lambda (x) (> x 300)))\n\n(big-bang 0\n  (to-draw zeichne)\n  (on-tick weiter)\n  (on-key taste)\n  (on-mouse maus)\n  (stop-when fertig?))',
    "Signaturen prüfen": '; Wie in DrRacket: Passt ein Wert nicht zur Signatur,\n; meldet der Playground eine Signaturverletzung.\n(: verdoppeln (number -> number))\n(define verdoppeln\n  (lambda (x)\n    (* 2 x)))\n\n(verdoppeln 21)\n\n(: begruessung (string -> string))\n(define begruessung\n  (lambda (name)\n    (string-length name)))   ; Fehler: liefert eine Zahl\n\n(begruessung "Ada")',
    "Pattern-Matching (match)": '(define-record dillo\n  make-dillo\n  dillo?\n  (dillo-weight natural)\n  (dillo-alive? boolean))\n\n(define beschreibe\n  (lambda (d)\n    (match d\n      ((make-dillo w #t) (string-append "lebt, wiegt " (number->string w) " g"))\n      ((make-dillo ... #f) "überfahren"))))\n\n(beschreibe (make-dillo 55000 #t))\n(beschreibe (make-dillo 58000 #f))',
    "Universe: zwei Welten": '; Zwei Welten und ein Server. Klickt man in eine Welt, zählt der Server\n; hoch und schickt den neuen Stand an alle angemeldeten Welten.\n(define zeichne\n  (lambda (n)\n    (overlay (text (number->string n) 48 "black")\n             (empty-scene 200 120))))\n\n(define klick\n  (lambda (n x y ereignis)\n    (if (mouse=? ereignis "button-down")\n        (make-package n "plus")\n        n)))\n\n(define empfange (lambda (n nachricht) nachricht))\n\n; Zustand des Servers: (list zähler welten)\n(define neu\n  (lambda (u welt)\n    (make-bundle (list (first u) (cons welt (first (rest u))))\n                 (list (make-mail welt (first u)))\n                 empty)))\n\n(define nachricht\n  (lambda (u welt msg)\n    (define z (+ (first u) 1))\n    (make-bundle (list z (first (rest u)))\n                 (map (lambda (w) (make-mail w z)) (first (rest u)))\n                 empty)))\n\n(universe (list 0 empty)\n  (on-new neu)\n  (on-msg nachricht))\n\n(big-bang 0 (to-draw zeichne) (on-mouse klick) (on-receive empfange)\n  (register LOCALHOST) (name "Anna"))\n(big-bang 0 (to-draw zeichne) (on-mouse klick) (on-receive empfange)\n  (register LOCALHOST) (name "Ben"))',
    "Komplexe Zahlen": '(sqrt -1)\n(* 3+4i 3-4i)\n(magnitude 3+4i)\n(expt +i 2)\n(real-part (make-polar 2 0))',
    "Ausgabe mit write-string": '(write-string "Hallo, ")\n(write-string "Welt!")\n(write-newline)\n(write-string (number->string (* 6 7)))'
  };
  var BEISPIEL_LEVEL = { "Listen": "vanilla", "Eigenschaften (check-property)": "vanilla", "Universe: zwei Welten": "vanilla" };
  Object.keys(BEISPIELE).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = k; ex.appendChild(o); });

  // Bilder: Text messen und zeichnen
  var mcv = document.createElement("canvas").getContext("2d");
  M.setTextMeasure(function (s, size, font) { mcv.font = font || (size + "px sans-serif"); return { w: Math.ceil(mcv.measureText(s).width), h: Math.ceil(size * 1.2) }; });
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

  // ---------- Sprachebene
  function level() { return lvlSel ? lvlSel.value : "vanilla"; }
  if (lvlSel) {
    var sl = store.get("sdp-pg-level"); if (sl && M.LEVELS[sl]) lvlSel.value = sl;
    lvlSel.addEventListener("change", function () { store.set("sdp-pg-level", lvlSel.value); if (window.__pgLint) window.__pgLint(); run(); });
  }
  window.__pgLevel = level;

  var outLine = null;
  function newInterp() {
    var it = new M.Interp({ level: level(), checkSigs: true });
    it.onOutput = function (t) {
      if (!outLine || outLine.parentNode !== out || out.lastChild !== outLine) { outLine = line("print", null, ""); }
      var v = outLine.querySelector(".pg-val"); v.textContent += t; out.scrollTop = out.scrollHeight;
    };
    it.onRead = function () { return window.prompt("read: Eingabe für dein Programm (z. B. eine Zahl oder \"Text\")", ""); };
    it.onBigBang = function (spec) { pendingAnim.push({ world: spec }); };
    it.onUniverse = function (spec) { pendingAnim.push({ universe: spec }); };
    it.onBitmap = function (name, isUrl) { return BITMAPS[(isUrl ? "url:" : "file:") + name] || null; };
    it.onPixels = function (img) {
      var w = Math.max(1, Math.round(img.w)), h = Math.max(1, Math.round(img.h)), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      var c = cv.getContext("2d"); img.draw(c, 0, 0);
      try { return c.getImageData(0, 0, w, h).data; }
      catch (e) { throw new M.RacketError("image->color-list: Die Farben dieses Bildes dürfen nicht ausgelesen werden (Bild von einer fremden Adresse ohne Freigabe)", "type"); }
    };
    return it;
  }

  // ---------- Bilder aus Dateien (bitmap)
  var BITMAPS = {};
  function imgKey(name) { return "sdp-pg-img:" + name; }
  function loadBitmap(key, src, cors, done) {
    var el = new Image();
    if (cors) el.crossOrigin = "anonymous";
    el.onload = function () { BITMAPS[key] = { w: el.naturalWidth, h: el.naturalHeight, el: el }; done(); };
    el.onerror = function () { if (cors) loadBitmap(key, src, false, done); else done(); };
    el.src = src;
  }
  function preload(code, cb) {
    var need = [], m, rx = /\(bitmap(?:\/file)?\s+"([^"]+)"/g, rxu = /\(bitmap\/url\s+"([^"]+)"/g;
    while ((m = rx.exec(code))) if (!BITMAPS["file:" + m[1]]) { var d = store.get(imgKey(m[1])); if (d) need.push(["file:" + m[1], d, false]); }
    while ((m = rxu.exec(code))) if (!BITMAPS["url:" + m[1]]) need.push(["url:" + m[1], m[1], true]);
    if (!need.length) return cb();
    var left = need.length;
    need.forEach(function (n) { loadBitmap(n[0], n[1], n[2], function () { if (--left === 0) cb(); }); });
  }
  var pendingAnim = [];
  function launchPending() {
    var list = pendingAnim; pendingAnim = [];
    // erst der Server, dann die Welten (damit register ihn findet)
    list.filter(function (p) { return p.universe; }).forEach(function (p) { if (U) stopUniverse(); startUniverse(p.universe); });
    list.filter(function (p) { return p.world; }).forEach(function (p) { startWorld(p.world); });
    return list.length;
  }

  // ---------- Animationen (big-bang) und universe – mehrere Welten gleichzeitig möglich
  var WORLDS = [], U = null, worldCount = 0;
  function isRec(v, T) { return v instanceof M.RecordVal && v.type === T(); }
  function animArea() { anim.hidden = false; return anim; }
  function stopAnim(reason) {
    WORLDS.slice().forEach(function (w) { stopWorld(w, reason, true); });
    if (U) stopUniverse();
  }
  function stopWorld(a, reason, quiet) {
    var i = WORLDS.indexOf(a); if (i < 0) return;
    WORLDS.splice(i, 1);
    clearInterval(a.timer); a.box.classList.add("stopped");
    a.status.textContent = reason || "Angehalten.";
    a.stopBtn.textContent = "↻ Neu starten";
    a.stopBtn.onclick = function () { a.box.remove(); startWorld(a.spec); };
    line("ok", "Endzustand" + (a.name ? " von „" + a.name + "“" : " der Animation"), M.show(a.state));
    if (U && a.iw && U.worlds.indexOf(a) >= 0) {
      U.worlds.splice(U.worlds.indexOf(a), 1);
      if (U.C["on-disconnect"]) uCall(U.C["on-disconnect"][0], [U.state, a.iw]);
      uRender();
    }
    if (window.__pgAnimDone) window.__pgAnimDone(a);
  }

  // ---- Universe (Server)
  function uLog(t) { if (!U) return; var d = document.createElement("div"); d.textContent = t; U.log.appendChild(d); while (U.log.childNodes.length > 40) U.log.removeChild(U.log.firstChild); U.log.scrollTop = U.log.scrollHeight; }
  function uRender() { if (!U) return; try { U.stateEl.textContent = U.C["to-string"] ? String(interp.apply(U.C["to-string"][0], [U.state])) : M.show(U.state); } catch (e) { U.stateEl.textContent = M.show(U.state); } U.who.textContent = U.worlds.length ? U.worlds.map(function (w) { return w.iw.name; }).join(", ") : "noch keine"; }
  function uFail(e) { e = wrapErr(e); line("err", "Fehler im Universe-Server", e.message, P && P.errorHint(e)); stopUniverse("Abgebrochen wegen eines Fehlers."); }
  function uCall(f, args) {
    if (!U) return;
    try {
      interp.steps = 0;
      var b = interp.apply(f, args);
      if (!isRec(b, M.BUNDLE)) throw new M.RacketError("universe: Die Funktion muss ein Bundle liefern, z. B. (make-bundle zustand (list (make-mail welt nachricht)) empty), lieferte aber " + M.show(b), "type");
      U.state = b.vals[0];
      if (U.C["check-with"] && interp.apply(U.C["check-with"][0], [U.state]) !== true) throw new M.RacketError("check-with: Der Zustand " + M.show(U.state) + " ist kein gültiger Universe-Zustand", "type");
      interp.toArr(b.vals[1]).forEach(function (m) {
        var to = m.vals[0], msg = m.vals[1], w = U.worlds.filter(function (x) { return x.iw === to; })[0];
        uLog("→ an " + to.name + ": " + M.show(msg));
        if (w) setTimeout(function () { deliver(w, msg); }, 0);
      });
      interp.toArr(b.vals[2]).forEach(function (iw) {
        var w = U.worlds.filter(function (x) { return x.iw === iw; })[0];
        if (w) { U.worlds.splice(U.worlds.indexOf(w), 1); uLog("✕ " + iw.name + " getrennt"); stopWorld(w, "Vom Universe-Server getrennt."); }
      });
      uRender();
    } catch (e) { uFail(e); }
  }
  function startUniverse(spec) {
    var C = {}; spec.clauses.forEach(function (c) { C[c.kind] = c.args; });
    var box = document.createElement("div"); box.className = "pg-anim pg-univ";
    box.innerHTML = '<div class="pg-animhead"><span class="pg-animstatus"><strong>Universe-Server</strong> läuft</span><button type="button" class="chip">■ Stopp</button></div>' +
      '<div class="pg-ustate"><span>Zustand:</span> <code></code></div><div class="pg-uwho"><span>Verbunden:</span> <em></em></div><div class="pg-ulog" aria-live="polite"></div>';
    animArea().insertBefore(box, anim.firstChild);
    U = { C: C, state: spec.init, worlds: [], box: box, stateEl: box.querySelector("code"), who: box.querySelector("em"), log: box.querySelector(".pg-ulog"), timer: null, status: box.querySelector(".pg-animstatus") };
    box.querySelector("button").onclick = function () { stopUniverse("Angehalten."); };
    uRender();
    if (C["on-tick"]) {
      var rate = C["on-tick"][1] !== undefined ? M.toF(C["on-tick"][1]) : 1 / 28;
      U.timer = setInterval(function () { if (U) uCall(C["on-tick"][0], [U.state]); }, Math.max(10, rate * 1000));
    }
  }
  function stopUniverse(reason) {
    if (!U) return;
    var u = U; U = null; clearInterval(u.timer);
    u.status.innerHTML = "<strong>Universe-Server</strong> – " + (reason || "beendet.");
    u.box.classList.add("stopped");
    line("ok", "Endzustand des Universe-Servers", M.show(u.state));
  }
  function deliver(w, msg) {
    if (WORLDS.indexOf(w) < 0 || !w.C["on-receive"]) return;
    w.step(w.C["on-receive"][0], [msg]);
  }

  // ---- Welt (big-bang)
  function startWorld(spec) {
    var it = interp, C = {};
    spec.clauses.forEach(function (c) { C[c.kind] = c.args; });
    worldCount++;
    var name = C.name ? String(C.name[0]) : (C.register ? "Welt " + worldCount : null);
    var box = document.createElement("div"); box.className = "pg-anim";
    var head = document.createElement("div"); head.className = "pg-animhead";
    var status = document.createElement("span"); status.className = "pg-animstatus";
    status.textContent = (name ? name + ": " : "") + "Läuft – klick ins Bild, damit Tasten ankommen.";
    var stopBtn = document.createElement("button"); stopBtn.type = "button"; stopBtn.className = "chip"; stopBtn.textContent = "■ Stopp";
    head.appendChild(status); head.appendChild(stopBtn);
    var cv = document.createElement("canvas"); cv.tabIndex = 0; cv.className = "pg-animcv";
    box.appendChild(head); box.appendChild(cv);
    animArea().appendChild(box);
    var a = { spec: spec, state: spec.init, box: box, status: status, stopBtn: stopBtn, timer: null, ticks: 0, cv: cv, C: C, name: name, iw: null };
    WORLDS.push(a);
    stopBtn.onclick = function () { stopWorld(a, "Angehalten."); };
    var ctx = cv.getContext("2d");
    function alive() { return WORLDS.indexOf(a) >= 0; }
    function call(f, args) { it.steps = 0; return it.apply(f, args); }
    function fail(e) { e = wrapErr(e); line("err", "Fehler in der Animation" + (name ? " „" + name + "“" : ""), e.message, P && P.errorHint(e)); stopWorld(a, "Abgebrochen wegen eines Fehlers."); }
    function draw(fn) {
      var img = call(fn || C["to-draw"][0], [a.state]);
      if (!(img instanceof M.Img)) throw new M.RacketError("to-draw: Die Zeichenfunktion muss ein Bild liefern, lieferte aber " + M.show(img), "type");
      var W = C["to-draw"][1] !== undefined ? M.toF(C["to-draw"][1]) : img.w, H = C["to-draw"][2] !== undefined ? M.toF(C["to-draw"][2]) : img.h;
      W = Math.max(1, Math.ceil(W)); H = Math.max(1, Math.ceil(H));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; var f = Math.min(1, 520 / W); cv.style.width = Math.round(W * f) + "px"; cv.style.height = Math.round(H * f) + "px"; }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); img.draw(ctx, 0, 0);
    }
    function check() {
      if (C["check-with"] && call(C["check-with"][0], [a.state]) !== true) throw new M.RacketError("check-with: Der Zustand " + M.show(a.state) + " ist kein gültiger Zustand", "type");
      if (C["stop-when"] && call(C["stop-when"][0], [a.state]) === true) { draw(C["stop-when"][1]); stopWorld(a, "Fertig – stop-when hat #t geliefert."); return true; }
      return false;
    }
    a.step = function (fn, args) {
      if (!alive()) return;
      try {
        var r = call(fn, [a.state].concat(args));
        if (isRec(r, M.PACKAGE)) {
          a.state = r.vals[0];
          var msg = r.vals[1];
          if (U && a.iw && U.worlds.indexOf(a) >= 0) { uLog("← von " + a.iw.name + ": " + M.show(msg)); setTimeout(function () { if (U && U.C["on-msg"]) uCall(U.C["on-msg"][0], [U.state, a.iw, msg]); }, 0); }
        } else a.state = r;
        if (!check()) draw();
      } catch (e) { fail(e); }
    };
    try { if (check()) return; draw(); } catch (e) { fail(e); return; }
    // beim Universe anmelden
    if (C.register) {
      if (U) {
        a.iw = new M.IWorld(name);
        U.worlds.push(a); uLog("＋ " + name + " meldet sich an");
        setTimeout(function () { if (U && alive()) uCall(U.C["on-new"][0], [U.state, a.iw]); }, 0);
      } else status.textContent = (name ? name + ": " : "") + "Läuft – aber kein Universe-Server gestartet (register ohne universe).";
    }
    if (C["on-tick"]) {
      var rate = C["on-tick"][1] !== undefined ? M.toF(C["on-tick"][1]) : 1 / 28, limit = C["on-tick"][2] !== undefined ? M.toF(C["on-tick"][2]) : Infinity;
      a.timer = setInterval(function () {
        if (!alive()) return;
        a.step(C["on-tick"][0], []); a.ticks++;
        if (alive() && a.ticks >= limit) stopWorld(a, "Fertig – Tick-Grenze erreicht.");
      }, Math.max(10, rate * 1000));
    }
    var KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Enter: "\r", Backspace: "\b", Escape: "escape", Tab: "\t", Delete: "\u007F",
      Shift: "shift", Control: "control", Alt: "menu", Home: "home", End: "end", PageUp: "prior", PageDown: "next", Insert: "insert", CapsLock: "capital" };
    function keyName(e) { return KEYS[e.key] || (/^F\d+$/.test(e.key) ? e.key.toLowerCase() : e.key.length === 1 ? e.key : null); }
    cv.addEventListener("keydown", function (e) { var k = keyName(e); if (k === null || !alive()) return; e.preventDefault(); if (C["on-key"]) a.step(C["on-key"][0], [k]); if (C["on-pad"] && /^(left|right|up|down| |shift|w|a|s|d)$/.test(k)) a.step(C["on-pad"][0], [k]); });
    cv.addEventListener("keyup", function (e) { var k = keyName(e); if (k === null || !alive() || !C["on-release"]) return; e.preventDefault(); a.step(C["on-release"][0], [k]); });
    if (C["on-mouse"]) {
      var down = false;
      var mouse = function (e, kind) {
        if (!alive()) return;
        var r = cv.getBoundingClientRect(), x = Math.round((e.clientX - r.left) * cv.width / r.width), y = Math.round((e.clientY - r.top) * cv.height / r.height);
        a.step(C["on-mouse"][0], [new M.Rat(BigInt(x)), new M.Rat(BigInt(y)), kind]);
      };
      cv.addEventListener("mousedown", function (e) { down = true; cv.focus(); mouse(e, "button-down"); });
      cv.addEventListener("mouseup", function (e) { down = false; mouse(e, "button-up"); });
      cv.addEventListener("mousemove", function (e) { mouse(e, down ? "drag" : "move"); });
      cv.addEventListener("mouseenter", function (e) { mouse(e, "enter"); });
      cv.addEventListener("mouseleave", function (e) { mouse(e, "leave"); });
    }
    if (WORLDS.length === 1) cv.focus({ preventScroll: true });
  }

  var interp = null;
  function run() { preload(ta.value, runNow); }
  function runNow() {
    stopAnim(); if (anim) { anim.innerHTML = ""; anim.hidden = true; }
    out.innerHTML = ""; outLine = null; pendingAnim = []; worldCount = 0;
    interp = newInterp();
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
        if (h === "define" || h === "define-record" || h === "define-singleton" || h === ":" || (h && h.indexOf("check-") === 0)) continue;
        if (v === M.Void || v === undefined) continue;
        line("ok", P ? P.unparse(f) : "", v instanceof M.Img ? v : M.show(v)); shown++;
      } catch (e) {
        e = wrapErr(e);
        line("err", P ? P.unparse(f) : "", e.message + (e.line ? " (Zeile " + e.line + ")" : ""), P && P.errorHint(e));
        showViolations();   // bis zum Fehler gefundene Signaturverletzungen trotzdem zeigen
        return;
      }
    }
    // Tests
    var res = interp.tests.map(function (t) { try { interp.steps = 0; return interp.runTest(t); } catch (e) { return { ok: false, error: wrapErr(e), form: t.form }; } });
    if (res.length) {
      var bad = res.filter(function (r) { return !r.ok; });
      line(bad.length ? "testbad" : "testok", null, bad.length ? bad.length + " von " + res.length + " Tests fehlgeschlagen" : (res.length === 1 ? "Der Test wurde bestanden!" : "Alle " + res.length + " Tests bestanden!"));
      bad.forEach(function (r) {
        var src = P ? P.unparse(r.form) : "";
        var msg = r.error ? "Fehler: " + r.error.message : r.noError ? "erwartet einen Fehler, bekommt " + M.show(r.actual) : r.wrongMsg ? "Die Fehlermeldung war „" + r.errorMsg + "“, erwartet war „" + r.expectedMsg + "“." : r.memberOf ? "Der tatsächliche Wert " + M.show(r.actual) + " ist keiner der erwarteten Werte " + r.expected.map(M.show).join(", ") + "." : r.range ? "Der tatsächliche Wert " + M.show(r.actual) + " liegt nicht zwischen " + M.show(r.range[0]) + " und " + M.show(r.range[1]) + "." : r.counter ? "Eigenschaft falsifizierbar mit " + r.counter.join(", ") : "Der tatsächliche Wert " + M.show(r.actual) + " ist nicht der erwartete Wert " + M.show(r.expected) + ".";
        line("err", src, msg, r.error && P ? P.errorHint(r.error) : null);
      });
    }
    var sv = interp.sigViolations;
    showViolations();
    if (pendingAnim.length) { shown += launchPending(); }
    if (!shown && !res.length && !sv.length && !interp.output.length) line("info", null, "Keine Ausgabe – nur Definitionen. Schreib einen Ausdruck oder probier unten in der Zeile „>“ etwas aus.");

    out.scrollTop = out.scrollHeight;
  }
  function showViolations() {
    var sv = interp.sigViolations;
    if (!sv.length) return;
    line("testbad", null, sv.length === 1 ? "1 Signaturverletzung" : sv.length + " Signaturverletzungen");
    sv.forEach(function (v) { line("err sig", null, v.msg + (v.count > 1 ? " – " + v.count + "-mal" : "")); });
  }
  function evalRepl() {
    var src = repl.value.trim(); if (!src) return;
    if (!interp) { interp = newInterp(); try { M.readAll(ta.value).forEach(function (f) { try { interp.eval(f, interp.global); } catch (e) {} }); } catch (e) {} }
    try {
      var forms = M.readAll(src), v;
      forms.forEach(function (f) { interp.steps = 0; v = interp.eval(f, interp.global); });
      line("ok repl", "> " + src, v === M.Void || v === undefined ? "" : (v instanceof M.Img ? v : M.show(v)));
      if (pendingAnim.length) launchPending();
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
      var names = window.RacketEditor.names(ta.value, level()).filter(function (k) { return k.indexOf(pre) === 0; });
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
    ta.value = BEISPIELE[ex.value];
    if (lvlSel && BEISPIEL_LEVEL[ex.value] && lvlSel.value === "beginner") { lvlSel.value = BEISPIEL_LEVEL[ex.value]; store.set("sdp-pg-level", lvlSel.value); }
    ex.value = ""; ta.dispatchEvent(new Event("input")); run();
  });
  shareBtn.addEventListener("click", function () {
    var enc = btoa(unescape(encodeURIComponent(ta.value)));
    enc += "&lvl=" + level();
    var url = location.origin + location.pathname + "#code=" + enc;
    var done = function () { shareBtn.textContent = "Link kopiert ✓"; setTimeout(function () { shareBtn.textContent = "🔗 Link teilen"; }, 1600); };
    window.history.replaceState(null, "", "#code=" + enc);
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
  });

  // ---------- Stepper
  var stBtn = document.getElementById("pg-step"), stBox = document.getElementById("pg-stepper");
  var ST = { steps: [], i: 0 };
  function stRenderInto(el, tree, path, cls) {
    var r = window.RacketStepper.render(tree, path, cls);
    el.innerHTML = r.html;
    el.querySelectorAll(".st-img").forEach(function (sp) { var img = r.imgs[+sp.dataset.k]; if (img) sp.appendChild(renderImg(img)); });
  }
  function stShow() {
    var n = ST.steps.length, s = ST.steps[ST.i];
    var pos = stBox.querySelector(".st-pos"), note = stBox.querySelector(".st-note"), b = stBox.querySelector(".st-before"), a = stBox.querySelector(".st-after");
    stBox.querySelector(".st-prev").disabled = stBox.querySelector(".st-first").disabled = ST.i <= 0;
    stBox.querySelector(".st-next").disabled = stBox.querySelector(".st-last").disabled = ST.i >= n - 1;
    if (!n) { pos.textContent = "keine Schritte"; note.textContent = ST.error || "Es gibt nichts auszuwerten – schreib einen Ausdruck, z. B. (+ 1 2)."; b.innerHTML = a.innerHTML = ""; return; }
    pos.textContent = "Schritt " + (ST.i + 1) + " von " + n + (ST.error ? " (abgebrochen)" : "");
    stBox.querySelector(".st-form").textContent = "Ausdruck " + (s.form + 1) + " von " + s.total;
    note.textContent = s.error ? "" : (s.note || "");
    note.className = "st-note" + (s.test === true ? " ok" : s.test === false ? " bad" : "");
    var panes = stBox.querySelector(".st-panes"); panes.classList.remove("neu"); void panes.offsetWidth; panes.classList.add("neu");
    stRenderInto(b, s.before, s.bpath, "st-redex");
    if (s.error) { a.innerHTML = '<span class="st-err">Fehler: ' + esc(s.error) + "</span>"; }
    else stRenderInto(a, s.after, s.apath, "st-contr");
    if (ST.i === n - 1 && ST.error) note.textContent = ST.error;
  }
  function stOpen() {
    if (!window.RacketStepper) return;
    var r = window.RacketStepper.build(ta.value, level());
    ST = { steps: r.steps, i: 0, error: r.error };
    stBox.hidden = false; document.body.classList.add("st-open"); stShow();
    stBox.querySelector(".st-next").focus();
  }
  function stClose() { stBox.hidden = true; document.body.classList.remove("st-open"); ta.focus(); }
  if (stBtn && stBox) {
    stBtn.addEventListener("click", stOpen);
    stBox.querySelector(".st-close").addEventListener("click", stClose);
    stBox.querySelector(".st-first").addEventListener("click", function () { ST.i = 0; stShow(); });
    stBox.querySelector(".st-prev").addEventListener("click", function () { if (ST.i > 0) { ST.i--; stShow(); } });
    stBox.querySelector(".st-next").addEventListener("click", function () { if (ST.i < ST.steps.length - 1) { ST.i++; stShow(); } });
    stBox.querySelector(".st-last").addEventListener("click", function () { ST.i = Math.max(0, ST.steps.length - 1); stShow(); });
    // Tastatur auf der ganzen Seite, solange der Stepper offen ist (der Fokus kann auf einem deaktivierten Knopf verloren gehen)
    document.addEventListener("keydown", function (e) {
      if (stBox.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); stClose(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); stBox.querySelector(".st-next").click(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stBox.querySelector(".st-prev").click(); }
      else if (e.key === "Home") { e.preventDefault(); stBox.querySelector(".st-first").click(); }
      else if (e.key === "End") { e.preventDefault(); stBox.querySelector(".st-last").click(); }
    });
    stBox.addEventListener("click", function (e) { if (e.target === stBox) stClose(); });
  }

  // Bild einfügen
  var imgBtn = document.getElementById("pg-img"), imgIn = document.getElementById("pg-imgfile");
  if (imgBtn) imgBtn.addEventListener("click", function () { imgIn.value = ""; imgIn.click(); });
  if (imgIn) imgIn.addEventListener("change", function () {
    var f = imgIn.files[0]; if (!f) return;
    if (f.size > 1500000) { alert("Das Bild ist zu groß (über 1,5 MB). Nimm bitte ein kleineres Bild."); return; }
    var name = f.name.replace(/[^\w.\-äöüÄÖÜß]/g, "_");
    var r = new FileReader();
    r.onload = function () {
      store.set(imgKey(name), r.result);
      loadBitmap("file:" + name, r.result, false, function () {
        ta.focus();
        var t = '(bitmap "' + name + '")';
        if (!document.execCommand || !document.execCommand("insertText", false, t)) { var p0 = ta.selectionStart; ta.value = ta.value.slice(0, p0) + t + ta.value.slice(ta.selectionEnd); ta.dispatchEvent(new Event("input")); }
      });
    };
    r.readAsDataURL(f);
  });

  // Herunterladen als .rkt
  var dlBtn = document.getElementById("pg-dl"), openBtn = document.getElementById("pg-open"), fileIn = document.getElementById("pg-file");
  function fileName() {
    var m = /\(define\s+([^\s()]+)\s*\(\s*(?:lambda|λ)\b/.exec(ta.value);
    var n = m ? m[1].replace(/[^A-Za-z0-9\-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") : "";
    return (n || "programm") + ".rkt";
  }
  if (dlBtn) dlBtn.addEventListener("click", function () {
    var code = ta.value.replace(/\s+$/, "") + "\n";
    var tp = [];
    if (/\b(square|circle|rectangle|above|beside|overlay|underlay|place-image|empty-scene|star-polygon|text|triangle|ellipse|scale|rotate|image-width)\b/.test(code)) tp.push("image.rkt");
    if (/\b(big-bang|animate|key=\?|mouse=\?)\b/.test(code)) tp.push("universe.rkt");
    var head = "; Erstellt im Racket-Playground (elreqanolo.github.io/racket-lernen)\n" +
      "; In DrRacket öffnen: Datei -> Öffnen...\n" +
      "; Sprache: \"" + M.LEVELS[level()].replace("–", "-") + "\"" + (tp.length ? ", Teachpack" + (tp.length > 1 ? "s " : " ") + tp.join(" und ") : "") + "\n\n";
    var bm = [], mm, rxb = /\(bitmap(?:\/file)?\s+"([^"]+)"/g;
    while ((mm = rxb.exec(code))) if (bm.indexOf(mm[1]) < 0) bm.push(mm[1]);
    if (bm.length) head = head.replace(/\n\n$/, "\n; Bilder: " + bm.join(", ") + " – liegen als eigene Dateien bei; in denselben Ordner wie diese Datei legen\n\n");
    bm.forEach(function (n, k) { var d = store.get(imgKey(n)); if (!d) return; setTimeout(function () { var a2 = document.createElement("a"); a2.href = d; a2.download = n; document.body.appendChild(a2); a2.click(); a2.remove(); }, 300 * (k + 1)); });
    var blob = new Blob([head + code], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName();
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });
  if (openBtn) openBtn.addEventListener("click", function () { fileIn.value = ""; fileIn.click(); });
  if (fileIn) fileIn.addEventListener("change", function () {
    var f = fileIn.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var t = String(r.result);
      if (/^#reader\(lib "read\.(ss|rkt)" "wxme"\)/.test(t) || t.indexOf("WXME") === 0) { out.innerHTML = ""; line("err", null, "Diese Datei enthält eingefügte Bilder oder Sonderformate aus DrRacket und kann hier nicht gelesen werden."); return; }
      // Sprachebene aus den Kopfzeilen von DrRacket übernehmen, dann die Kopfzeilen entfernen
      var lm = /#reader\(lib "(beginner|vanilla|advanced)-reader\.(?:ss|rkt)" "deinprogramm"/.exec(t);
      if (lm && lvlSel) { lvlSel.value = lm[1]; store.set("sdp-pg-level", lm[1]); }
      t = t.replace(/^;; The first three lines of this file were inserted by DrRacket\.[^\n]*\n;;[^\n]*\n#reader[^\n]*\n/, "").replace(/^#lang [^\n]*\n/, "");
      if (ta.value.trim() && !confirm("Dein Code im Playground wird durch „" + f.name + "“ ersetzt. Weiter?")) return;
      ta.value = t; ta.dispatchEvent(new Event("input")); run();
    };
    r.readAsText(f, "utf-8");
  });

  // Start: Code aus Link, sonst gespeicherter Code, sonst Beispiel
  var m = /#code=([^&]+)/.exec(location.hash), start = null, lv = /[#&]lvl=(\w+)/.exec(location.hash);
  if (lv && lvlSel && M.LEVELS[lv[1]]) lvlSel.value = lv[1];
  if (m) { try { start = decodeURIComponent(escape(atob(m[1]))); } catch (e) {} }
  ta.value = start !== null ? start : (store.get("sdp-playground") || BEISPIELE["Bilder"]);
  var ed = window.RacketEditor ? window.RacketEditor.attach(ta, { level: level }) : null;
  if (ed) window.__pgLint = ed.lint;
  autosize(); run();
  if (ed) ed.lint();
})();
