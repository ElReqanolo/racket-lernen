/* Übungen: Abgabe für jede Aufgabe – Code-Editor (immer offen) oder Auswahl/Eingabe, Musterlösung pro Aufgabe.
   Braucht racket.js und pruefer.js. */
(function () {
  "use strict";
  var M = window.MiniRacket, P = window.Pruefer;
  var dataEl = document.getElementById("aufgaben-daten");
  if (!M || !P || !dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- Bilder
  var mcv = document.createElement("canvas").getContext("2d");
  M.setTextMeasure(function (s, size) { mcv.font = size + "px sans-serif"; return { w: Math.ceil(mcv.measureText(s).width), h: Math.ceil(size * 1.2) }; });
  function renderImg(img, scaleMax) {
    var w = Math.max(1, Math.ceil(img.w)), h = Math.max(1, Math.ceil(img.h));
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    img.draw(cv.getContext("2d"), 0, 0);
    if (scaleMax) { var f = Math.min(1, scaleMax / Math.max(w, h)); cv.style.width = Math.round(w * f) + "px"; cv.style.height = Math.round(h * f) + "px"; }
    return cv;
  }
  M.setImageEqual(function (a, b) {
    if (Math.round(a.w) !== Math.round(b.w) || Math.round(a.h) !== Math.round(b.h)) return false;
    if (a.key() === b.key()) return true;
    var ca = renderImg(a).getContext("2d"), cb = renderImg(b).getContext("2d");
    var w = Math.max(1, Math.ceil(a.w)), h = Math.max(1, Math.ceil(a.h));
    var da = ca.getImageData(0, 0, w, h).data, db = cb.getImageData(0, 0, w, h).data, diff = 0;
    for (var i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) + Math.abs(da[i + 3] - db[i + 3]) > 96) diff++;
    }
    return diff <= Math.max(4, w * h * 0.004);
  });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

  function taskFor(kap, label) {
    var ch = DATA.kap[kap]; if (!ch) return null;
    var lern = [], prev = [];
    for (var k = 1; k <= kap; k++) if (DATA.lern[k]) lern.push(DATA.lern[k]);
    for (k = 1; k < kap; k++) if (DATA.kap[k]) Object.keys(DATA.kap[k].segs).forEach(function (s) { prev.push(DATA.kap[k].segs[s]); });
    return { kap: kap, label: label, custom: (ch.custom || {})[label], quiz: (ch.quiz || {})[label], given: ch.given, ref: ch.segs[label], lern: lern, prev: prev,
      others: Object.keys(ch.segs).filter(function (s) { return s !== label; }).map(function (s) { return ch.segs[s]; }) };
  }

  // ---------- Rückmeldung zur Code-Prüfung
  function showResult(box, r) {
    box.innerHTML = "";
    var head = el("div", "res-head res-" + r.status);
    head.textContent = (r.status === "ok" ? "✓ " : r.status === "manual" ? "ℹ " : "✗ ") + r.summary;
    box.appendChild(head);
    if (r.items && r.items.length) {
      var ul = el("ul", "res-list");
      r.items.forEach(function (it) {
        var li = el("li", it.ok ? "ok" : "bad", '<span class="mark">' + (it.ok ? "✓" : "✗") + '</span><div><code class="t">' + esc(it.title) + "</code>" +
          (it.detail ? '<div class="d">' + esc(it.detail) + "</div>" : "") + (it.hint ? '<div class="h">💡 ' + esc(it.hint) + "</div>" : "") + "</div>");
        if (it.images && it.images.length) {
          var imgs = el("div", "res-imgs");
          it.images.forEach(function (im, i) {
            var fig = el("figure"); fig.appendChild(renderImg(im, 220));
            var cap = el("figcaption"); cap.textContent = it.images.length > 1 ? (i === 0 ? "dein Bild" : "erwartet") : "dein Bild";
            fig.appendChild(cap); imgs.appendChild(fig);
          });
          li.querySelector("div").appendChild(imgs);
        }
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    (r.notes || []).forEach(function (n) { var p = el("div", "res-note"); p.textContent = n; box.appendChild(p); });
    if (r.status === "fail" || r.status === "error") tipHint(box);
  }
  function tipHint(box) {
    var tli = box.closest("li.task"), tb = tli && tli.querySelector(".tippbtn");
    if (tb && !tb.disabled) {
      var p2 = el("div", "res-note", "Komm nicht weiter? ");
      var b2 = el("button", "chip"); b2.type = "button"; b2.textContent = "💡 Tipp anzeigen";
      b2.addEventListener("click", function () { tb.click(); tb.scrollIntoView({ behavior: "smooth", block: "center" }); });
      p2.appendChild(b2); box.appendChild(p2);
    }
  }

  // ---------- Auswahl / Eingabe
  function norm(s) {
    return String(s).toLowerCase().replace(/lambda/g, "λ").replace(/\\/g, "λ").replace(/[−–]/g, "-").replace(/\s+/g, " ").trim().replace(/\s*([().,])\s*/g, "$1");
  }
  function fieldOk(val, answers) {
    var v = norm(val);
    if (!v) return false;
    return answers.some(function (a) {
      var n = norm(a);
      if (v === n || v.replace(/ /g, "") === n.replace(/ /g, "")) return true;
      var x = parseFloat(v.replace(",", ".")), y = parseFloat(n);
      return /^-?[\d.,]+$/.test(v) && !isNaN(x) && !isNaN(y) && Math.abs(x - y) < 1e-9;
    });
  }
  function buildQuiz(id, quiz) {
    var box = el("div", "quiz");
    var saved = {}; try { saved = JSON.parse(store.get("sdp-quiz-" + id) || "{}"); } catch (e) {}
    (quiz.questions || []).forEach(function (q, qi) {
      var multi = Array.isArray(q.correct);
      var f = el("fieldset", "q"); f.dataset.qi = qi;
      f.appendChild(el("legend", "", esc(q.q) + (multi ? ' <span class="multi">(mehrere Antworten möglich)</span>' : "")));
      q.options.forEach(function (o, oi) {
        var lab = el("label", "opt");
        var inp = el("input"); inp.type = multi ? "checkbox" : "radio"; inp.name = id + "-q" + qi; inp.value = oi;
        if (saved["q" + qi] && saved["q" + qi].indexOf(oi) >= 0) inp.checked = true;
        lab.appendChild(inp); lab.appendChild(el("span", "", esc(o)));
        f.appendChild(lab);
      });
      f.appendChild(el("div", "qres"));
      box.appendChild(f);
    });
    (quiz.fields || []).forEach(function (fd, fi) {
      var row = el("label", "field");
      row.appendChild(el("span", "flabel", esc(fd.label)));
      var inp = el("input"); inp.type = "text"; inp.dataset.fi = fi; inp.placeholder = fd.placeholder || "Deine Antwort";
      inp.autocomplete = "off"; inp.spellcheck = false; inp.value = saved["f" + fi] || "";
      row.appendChild(inp); row.appendChild(el("span", "fres"));
      box.appendChild(row);
    });
    box.grade = function () {
      var all = true, ans = {};
      (quiz.questions || []).forEach(function (q, qi) {
        var f = box.querySelector('fieldset[data-qi="' + qi + '"]');
        var chosen = Array.prototype.filter.call(f.querySelectorAll("input"), function (i) { return i.checked; }).map(function (i) { return +i.value; });
        ans["q" + qi] = chosen;
        var want = Array.isArray(q.correct) ? q.correct.slice().sort() : [q.correct];
        var ok = chosen.length === want.length && chosen.slice().sort().every(function (c, i) { return c === want[i]; });
        f.classList.toggle("ok", ok); f.classList.toggle("bad", !ok);
        f.querySelector(".qres").textContent = !chosen.length ? "Bitte eine Antwort wählen." : ok ? "✓ richtig" : (Array.isArray(q.correct) ? "✗ noch nicht ganz – prüfe jede Antwort einzeln" : "✗ leider falsch – versuch es noch einmal");
        if (!ok) all = false;
      });
      (quiz.fields || []).forEach(function (fd, fi) {
        var inp = box.querySelector('input[data-fi="' + fi + '"]'), ok = fieldOk(inp.value, fd.answers);
        ans["f" + fi] = inp.value;
        inp.parentNode.classList.toggle("ok", ok); inp.parentNode.classList.toggle("bad", !ok);
        inp.parentNode.querySelector(".fres").textContent = !inp.value.trim() ? "fehlt" : ok ? "✓" : "✗";
        if (!ok) all = false;
      });
      store.set("sdp-quiz-" + id, JSON.stringify(ans));
      return all;
    };
    box.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type === "text") { e.preventDefault(); box.dispatchEvent(new Event("submitquiz")); } });
    return box;
  }

  // ---------- Musterlösung
  function cleanRef(ref) {
    if (!ref) return "";
    var lines = ref.replace(/^;[^\n]*\n?/, "").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var code = lines.join("\n");
    return /\(/.test(code.replace(/;[^\n]*/g, "")) ? code : "";
  }

  // ---------- Aufgabe einrichten
  function setup(li, task, kind) {
    var id = li.id, tried = false;
    var work = el("div", "aufgabe-work");
    var hasCode = kind !== "quiz";
    var quizBox = task.quiz && (task.quiz.questions || task.quiz.fields) ? buildQuiz(id, task.quiz) : null;
    var ta = null, clr = null, res = el("div", "abgabe-res");
    if (hasCode) {
      var info = kind === "werte" ? "Schreibe die Ausdrücke in der Reihenfolge der Aufgabe untereinander."
        : kind === "selbsttests" ? "Hier sollst du Tests schreiben (check-expect … oder check-property …). Sie werden ausgeführt und gezählt."
        : kind === "regeln" ? "Schreib deinen Code – das Ergebnis wird angezeigt und geprüft."
        : "Schreibe deine Definitionen wie im Definitionsfenster von DrRacket. Geprüft wird mit den Tests der Musterlösung und mit Zufallstests; deine eigenen check-expect-Tests laufen mit.";
      if (task.given && /\(define s1/.test(task.given)) info += " Schon vorhanden: s1, c1, p1 und tile.";
      if (task.required && task.required.length) info += " Erwartete Namen: " + task.required.join(", ") + ".";
      work.appendChild(el("div", "abgabe-info", esc(info)));
      ta = el("textarea"); ta.spellcheck = false; ta.setAttribute("autocapitalize", "off"); ta.setAttribute("autocomplete", "off");
      ta.placeholder = "; Dein Racket-Code …";
      ta.value = store.get("sdp-code-" + id) || "";
      work.appendChild(ta);
    }
    if (quizBox) work.appendChild(quizBox);

    // Aktionen
    var actions = el("div", "abgabe-actions");
    var pruef = el("button", "pruefen", hasCode ? "Prüfen" : "Antwort abgeben"); pruef.type = "button";
    actions.appendChild(pruef);
    if (hasCode) actions.appendChild(el("span", "kbd", "Strg+Enter"));
    var code = cleanRef(task.ref), explain = (task.quiz && task.quiz.explain) || "";
    var solBody = null;
    if (code || explain) {
      var mbtn = el("button", "chip musterbtn"); mbtn.type = "button"; mbtn.textContent = "👁 Musterlösung ansehen";
      solBody = el("div", "musterbody"); solBody.hidden = true;
      solBody.appendChild(el("div", "musterhead", "Musterlösung"));
      if (explain) solBody.appendChild(el("p", "", esc(explain)));
      if (code) { var pre = el("pre"); var cc = el("code"); cc.textContent = code; pre.appendChild(cc); solBody.appendChild(pre); }
      mbtn.addEventListener("click", function () {
        if (solBody.hidden && !tried && !li.classList.contains("done") && !confirm("Erst selbst probieren? Die Musterlösung verrät alles.\n\nTrotzdem anzeigen?")) return;
        solBody.hidden = !solBody.hidden;
        mbtn.textContent = solBody.hidden ? "👁 Musterlösung ansehen" : "Musterlösung ausblenden";
      });
      actions.appendChild(mbtn);
    }
    if (hasCode) { clr = el("button", "leeren", "Leeren"); clr.type = "button"; actions.appendChild(clr); }
    work.appendChild(actions);
    work.appendChild(res);
    if (solBody) work.appendChild(solBody);
    li.appendChild(work);

    if (ta) {
      var autosize = function () { ta.style.height = "auto"; ta.style.height = Math.min(700, Math.max(170, ta.scrollHeight + 4)) + "px"; };
      setTimeout(autosize, 0);
      var insert = function (t) { var s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + t + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + t.length; ta.dispatchEvent(new Event("input")); };
      ta.addEventListener("input", function () { store.set("sdp-code-" + id, ta.value); autosize(); });
      ta.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); return; }
        if (e.key === "Tab") { e.preventDefault(); insert("  "); return; }
        if (e.key === "Enter") {
          var before = ta.value.slice(0, ta.selectionStart), line = before.slice(before.lastIndexOf("\n") + 1);
          var ind = (/^\s*/.exec(line) || [""])[0];
          if ((line.match(/\(/g) || []).length > (line.match(/\)/g) || []).length) ind += "  ";
          e.preventDefault(); insert("\n" + ind);
        }
      });
      clr.addEventListener("click", function () { if (!ta.value || confirm("Code wirklich löschen?")) { ta.value = ""; ta.dispatchEvent(new Event("input")); res.innerHTML = ""; } });
    }
    function check() {
      tried = true;
      res.innerHTML = '<div class="res-head">Prüfe …</div>';
      setTimeout(function () {
        var codeOk = true, quizOk = true;
        if (hasCode) {
          var r;
          try { r = P.grade(task, ta.value); } catch (e) { r = { status: "error", summary: "Interner Fehler im Prüfer: " + (e && e.message), items: [] }; }
          showResult(res, r); codeOk = r.status === "ok";
        } else res.innerHTML = "";
        if (quizBox) quizOk = quizBox.grade();
        var ok = codeOk && quizOk;
        if (!hasCode) {
          var head = el("div", "res-head res-" + (ok ? "ok" : "fail"));
          head.textContent = ok ? "✓ Richtig!" : "✗ Noch nicht alles richtig – sieh dir die markierten Antworten noch einmal an.";
          res.appendChild(head);
          if (ok && explain) { var ex = el("div", "res-note"); ex.textContent = explain; res.appendChild(ex); }
          if (!ok) tipHint(res);
        } else if (quizBox && codeOk && !quizOk) {
          var h2 = el("div", "res-note"); h2.textContent = "Der Code stimmt – jetzt noch die Frage richtig beantworten."; res.appendChild(h2);
        }
        if (ok && window.__markDone) window.__markDone(li);
      }, 20);
    }
    pruef.addEventListener("click", check);
    if (quizBox) quizBox.addEventListener("submitquiz", check);
  }

  document.querySelectorAll("li.task").forEach(function (li) {
    var kap = parseInt(li.dataset.kap, 10), label = li.dataset.label;
    var task = taskFor(kap, label); if (!task) return;
    var kind;
    if (task.quiz && (task.quiz.questions || task.quiz.fields) && !task.custom) kind = "quiz";
    else {
      if (task.ref === undefined) return;
      try { var an = P.analyse(task); kind = an.kind; task.required = an.required; } catch (e) { return; }
      if (kind === "manual") return;
    }
    setup(li, task, kind);
  });
})();
