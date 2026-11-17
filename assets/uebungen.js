/* Übungen: „Lösung abgeben“ – Editor, Prüfung im Browser, Rückmeldung. Braucht racket.js und pruefer.js. */
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

  // ---------- Bilder: Text messen und pixelgenau vergleichen
  var mcv = document.createElement("canvas").getContext("2d");
  M.setTextMeasure(function (s, size) { mcv.font = size + "px sans-serif"; return { w: Math.ceil(mcv.measureText(s).width), h: Math.ceil(size * 1.2) }; });
  function renderImg(img, scaleMax) {
    var w = Math.max(1, Math.ceil(img.w)), h = Math.max(1, Math.ceil(img.h));
    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    var ctx = cv.getContext("2d"); img.draw(ctx, 0, 0);
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

  // ---------- Aufgabe zusammenstellen
  function taskFor(kap, label) {
    var ch = DATA.kap[kap]; if (!ch || ch.segs[label] === undefined) return null;
    var lern = [], prev = [];
    for (var k = 1; k <= kap; k++) if (DATA.lern[k]) lern.push(DATA.lern[k]);
    for (k = 1; k < kap; k++) if (DATA.kap[k]) Object.keys(DATA.kap[k].segs).forEach(function (s) { prev.push(DATA.kap[k].segs[s]); });
    return { kap: kap, label: label, override: (ch.override || {})[label], given: ch.given, ref: ch.segs[label], lern: lern, prev: prev,
      others: Object.keys(ch.segs).filter(function (s) { return s !== label; }).map(function (s) { return ch.segs[s]; }) };
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function showResult(box, r) {
    box.innerHTML = "";
    var head = document.createElement("div");
    head.className = "res-head res-" + r.status;
    head.textContent = (r.status === "ok" ? "✓ " : (r.status === "manual" || r.status === "zeigen") ? "ℹ " : "✗ ") + r.summary;
    box.appendChild(head);
    if (r.items && r.items.length) {
      var ul = document.createElement("ul"); ul.className = "res-list";
      r.items.forEach(function (it) {
        var li = document.createElement("li"); li.className = it.ok ? "ok" : "bad";
        li.innerHTML = '<span class="mark">' + (it.ok ? "✓" : "✗") + '</span><div><code class="t">' + esc(it.title) + "</code>" +
          (it.detail ? '<div class="d">' + esc(it.detail) + "</div>" : "") + (it.hint ? '<div class="h">💡 ' + esc(it.hint) + "</div>" : "") + "</div>";
        if (it.images && it.images.length) {
          var imgs = document.createElement("div"); imgs.className = "res-imgs";
          it.images.forEach(function (im, i) {
            var fig = document.createElement("figure"); fig.appendChild(renderImg(im, 220));
            var cap = document.createElement("figcaption"); cap.textContent = it.images.length > 1 ? (i === 0 ? "dein Bild" : "erwartet") : "dein Bild";
            fig.appendChild(cap); imgs.appendChild(fig);
          });
          li.querySelector("div").appendChild(imgs);
        }
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    if (r.gallery) {
      [["Dein Ergebnis", r.gallery.mine], ["Musterlösung", r.gallery.theirs]].forEach(function (g) {
        if (!g[1].length) return;
        var h = document.createElement("div"); h.className = "res-note"; h.textContent = g[0] + ":"; box.appendChild(h);
        var row = document.createElement("div"); row.className = "res-imgs";
        g[1].forEach(function (im) { var fig = document.createElement("figure"); fig.appendChild(renderImg(im, 220)); row.appendChild(fig); });
        box.appendChild(row);
      });
    }
    (r.notes || []).forEach(function (n) { var p = document.createElement("div"); p.className = "res-note"; p.textContent = n; box.appendChild(p); });
  }

  function attach(li, task, kind) {
    var id = li.id;
    var bar = document.createElement("div"); bar.className = "abgabe-bar";
    var open = document.createElement("button"); open.type = "button"; open.className = "abgabe-btn";
    var openLabel = kind === "zeigen" ? "Bild ausprobieren" : "Lösung abgeben";
    open.innerHTML = "▶ " + openLabel;
    bar.appendChild(open);
    var status = document.createElement("span"); status.className = "abgabe-status"; bar.appendChild(status);
    li.appendChild(bar);
    var last = store.get("sdp-res-" + id);
    if (last === "ok") status.textContent = "✓ zuletzt richtig"; else if (last === "fail") status.textContent = "✗ zuletzt noch Fehler";
    status.className = "abgabe-status " + (last || "");

    var panel = null;
    open.addEventListener("click", function () {
      if (panel) { panel.classList.toggle("hidden"); open.innerHTML = (panel.classList.contains("hidden") ? "▶ " : "▼ ") + openLabel; return; }
      open.innerHTML = "▼ " + openLabel;
      panel = document.createElement("div"); panel.className = "abgabe";
      var info = kind === "zeigen" ? "Schreib deinen Ausdruck – du siehst dein Bild neben der Musterlösung."
        : kind === "werte" ? "Schreibe die Ausdrücke in der Reihenfolge der Aufgabe untereinander."
        : kind === "selbsttests" ? "Hier sollst du Tests schreiben (check-expect …). Sie werden ausgeführt und gezählt."
        : "Schreibe deine Definitionen wie im Definitionsfenster von DrRacket. Geprüft wird mit den Tests der Musterlösung" + (kind === "tests" ? " – deine eigenen check-expect-Tests laufen auch mit." : ".");
      if (task.given && /\(define s1/.test(task.given)) info += " Schon vorhanden: s1, c1, p1 und tile.";
      if (task.required && task.required.length && kind !== "zeigen") info += " Die Prüfung erwartet diese Namen: " + task.required.join(", ") + ".";
      panel.innerHTML = '<div class="abgabe-info">' + esc(info) + '</div>' +
        '<textarea spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="; Dein Racket-Code …"></textarea>' +
        '<div class="abgabe-actions"><button type="button" class="pruefen">Prüfen</button><span class="kbd">Strg+Enter</span>' +
        '<button type="button" class="leeren">Leeren</button></div><div class="abgabe-res" aria-live="polite"></div>';
      li.appendChild(panel);
      var ta = panel.querySelector("textarea"), res = panel.querySelector(".abgabe-res");
      ta.value = store.get("sdp-code-" + id) || "";
      var autosize = function () { ta.style.height = "auto"; ta.style.height = Math.min(600, Math.max(130, ta.scrollHeight + 4)) + "px"; };
      autosize();
      ta.addEventListener("input", function () { store.set("sdp-code-" + id, ta.value); autosize(); });
      ta.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); return; }
        if (e.key === "Tab") { e.preventDefault(); insert("  "); return; }
        if (e.key === "Enter") {
          var before = ta.value.slice(0, ta.selectionStart), line = before.slice(before.lastIndexOf("\n") + 1);
          var ind = (/^\s*/.exec(line) || [""])[0];
          var opens = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
          if (opens > 0) ind += "  ";
          e.preventDefault(); insert("\n" + ind);
        }
      });
      function insert(t) { var s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + t + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + t.length; ta.dispatchEvent(new Event("input")); }
      function check() {
        res.innerHTML = '<div class="res-head">Prüfe …</div>';
        setTimeout(function () {
          var r;
          try { r = P.grade(task, ta.value); }
          catch (e) { r = { status: "error", summary: "Interner Fehler im Prüfer: " + (e && e.message), items: [] }; }
          showResult(res, r);
          if (r.status === "ok" || r.status === "fail") {
            store.set("sdp-res-" + id, r.status);
            status.textContent = r.status === "ok" ? "✓ zuletzt richtig" : "✗ zuletzt noch Fehler";
            status.className = "abgabe-status " + r.status;
          }
          if (r.status === "ok") {
            var cb = li.querySelector('input[type=checkbox]');
            if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event("change")); }
          }
        }, 20);
      }
      panel.querySelector(".pruefen").addEventListener("click", check);
      panel.querySelector(".leeren").addEventListener("click", function () { if (!ta.value || confirm("Code wirklich löschen?")) { ta.value = ""; ta.dispatchEvent(new Event("input")); res.innerHTML = ""; } });
      ta.focus();
    });
  }

  var n = 0;
  document.querySelectorAll("li.task").forEach(function (li) {
    var kap = parseInt(li.dataset.kap, 10), label = li.dataset.label;
    var task = taskFor(kap, label); if (!task) return;
    var kind;
    var an;
    try { an = P.analyse(task); kind = an.kind; } catch (e) { return; }
    if (kind === "manual") return;
    task.required = an.required;
    attach(li, task, kind); n++;
  });
  var c = document.querySelector(".pruefbar"); if (c) c.textContent = n;
})();
