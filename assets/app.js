/* Racket lernen – kleine Hilfsfunktionen für alle Seiten. Kein Framework nötig. */
(function () {
  "use strict";
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Hell/Dunkel ---------- */
  var root = document.documentElement;
  var saved = store.get("sdp-theme");
  if (saved) root.setAttribute("data-theme", saved);
  else if (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".themebtn");
    if (!b) return;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("sdp-theme", next);
  });

  /* ---------- Code kopieren ---------- */
  document.querySelectorAll("pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.className = "copy"; btn.type = "button"; btn.textContent = "Kopieren";
    btn.addEventListener("click", function () {
      var text = pre.querySelector("code") ? pre.querySelector("code").innerText : pre.innerText;
      var done = function () { btn.textContent = "Kopiert ✓"; setTimeout(function () { btn.textContent = "Kopieren"; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
    });
    pre.appendChild(btn);
  });

  /* ---------- Hervorheben von Suchtreffern ---------- */
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function unmark(el) {
    el.querySelectorAll("mark.hit").forEach(function (m) {
      var p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize();
    });
  }
  function markIn(el, q) {
    if (!q) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) {
      if (n.parentNode.closest("button,script,style,.katex")) continue;
      nodes.push(n);
    }
    var ql = q.toLowerCase();
    nodes.forEach(function (node) {
      var t = node.nodeValue, low = t.toLowerCase(), i = low.indexOf(ql);
      if (i < 0) return;
      var frag = document.createDocumentFragment(), last = 0;
      while (i >= 0) {
        frag.appendChild(document.createTextNode(t.slice(last, i)));
        var m = document.createElement("mark"); m.className = "hit"; m.textContent = t.slice(i, i + q.length);
        frag.appendChild(m); last = i + q.length; i = low.indexOf(ql, last);
      }
      frag.appendChild(document.createTextNode(t.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- URL-Parameter ---------- */
  var params = new URLSearchParams(location.search);
  function setParam(k, v) {
    if (v) params.set(k, v); else params.delete(k);
    var qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ---------- Filter für Tabellen-Seiten (Befehle, Glossar, Fehler, Übungen) ---------- */
  var bar = document.querySelector(".filters[data-filter]");
  if (bar) {
    var q = bar.querySelector("input[type=search]");
    var kap = bar.querySelector("select.kap");
    var modeSeg = bar.querySelector(".seg.mode");
    var starSeg = bar.querySelector(".seg.stars");
    var openOnly = bar.querySelector(".openonly");
    var countEl = bar.querySelector(".count");
    var items = Array.prototype.slice.call(document.querySelectorAll(".fi"));
    var groups = Array.prototype.slice.call(document.querySelectorAll(".fg")).reverse(); // innere Gruppen zuerst
    var empty = document.querySelector(".empty");
    var scope = document.querySelector(".filterscope") || document.body;
    var mode = params.get("modus") === "bis" ? "bis" : "nur";
    var stars = params.get("sterne") || "";

    if (q && params.get("q")) q.value = params.get("q");
    if (kap && params.get("kap")) kap.value = params.get("kap");

    function segSet(seg, val) {
      if (!seg) return;
      seg.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === val); });
    }
    segSet(modeSeg, mode); segSet(starSeg, stars);

    function apply() {
      var term = q ? q.value.trim() : "";
      var tn = norm(term);
      var k = kap ? parseInt(kap.value, 10) || 0 : 0;
      var visible = 0;
      items.forEach(function (it) {
        var ok = true;
        if (k) {
          var ks = (it.dataset.kap || "").split(/\s+/).filter(Boolean).map(Number);
          ok = mode === "bis" ? ks.some(function (x) { return x >= 1 && x <= k; }) : ks.indexOf(k) >= 0;
        }
        if (ok && stars) ok = it.dataset.stars === stars;
        if (ok && openOnly && openOnly.checked) ok = !it.classList.contains("done");
        if (ok && tn) ok = norm(it.textContent).indexOf(tn) >= 0;
        it.classList.toggle("hidden", !ok);
        if (ok) visible++;
      });
      groups.forEach(function (g) {
        var any = g.querySelector(".fi:not(.hidden)");
        g.classList.toggle("hidden", !any);
      });
      unmark(scope);
      if (term.length > 1) markIn(scope, term);
      if (countEl) countEl.textContent = visible + " " + (visible === 1 ? (bar.dataset.one || "Eintrag") : (bar.dataset.many || "Einträge"));
      if (empty) empty.style.display = visible ? "none" : "block";
      document.querySelectorAll(".letters a").forEach(function (a) {
        var t = document.getElementById(a.getAttribute("href").slice(1));
        a.classList.toggle("off", !t || t.classList.contains("hidden"));
      });
      setParam("q", term); setParam("kap", k ? String(k) : ""); setParam("modus", k && mode === "bis" ? "bis" : "");
      setParam("sterne", stars);
    }
    if (q) q.addEventListener("input", apply);
    if (kap) kap.addEventListener("change", apply);
    if (openOnly) openOnly.addEventListener("change", apply);
    if (modeSeg) modeSeg.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; mode = b.dataset.v; segSet(modeSeg, mode); apply();
    });
    if (starSeg) starSeg.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; stars = b.dataset.v; segSet(starSeg, stars); apply();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== q && q) { e.preventDefault(); q.focus(); }
    });
    window.__applyFilter = apply;
    apply();
  }

  /* ---------- Übungen: Häkchen speichern ---------- */
  var tasks = document.querySelectorAll("li.task");
  if (tasks.length) {
    var prog = document.querySelector(".progress div");
    var progTxt = document.querySelector(".progtxt");
    var update = function () {
      var done = document.querySelectorAll("li.task.done").length;
      if (prog) prog.style.width = (100 * done / tasks.length) + "%";
      if (progTxt) progTxt.textContent = done + " / " + tasks.length + " erledigt";
    };
    tasks.forEach(function (li) {
      var cb = li.querySelector("input[type=checkbox]");
      var key = "sdp-ueb-" + li.id;
      if (store.get(key) === "1") { cb.checked = true; li.classList.add("done"); }
      cb.addEventListener("change", function () {
        li.classList.toggle("done", cb.checked);
        store.set(key, cb.checked ? "1" : "0");
        update();
        if (window.__applyFilter && document.querySelector(".openonly:checked")) window.__applyFilter();
      });
    });
    update();
    var toggleAll = document.querySelector(".togglesol");
    if (toggleAll) toggleAll.addEventListener("click", function () {
      var ds = document.querySelectorAll("details.loesung"), anyClosed = Array.prototype.some.call(ds, function (d) { return !d.open; });
      ds.forEach(function (d) { d.open = anyClosed; });
      toggleAll.textContent = anyClosed ? "Alle Lösungen zuklappen" : "Alle Lösungen aufklappen";
    });
  }

  /* ---------- Lernübersicht: Kapitelwahl, Suche, Inhaltsverzeichnis ---------- */
  var doc = document.querySelector(".doc[data-lernen]");
  if (doc) {
    var secs = Array.prototype.slice.call(doc.querySelectorAll("section.kapitel"));
    var sel = document.querySelector("select.kapwahl");
    var search = document.querySelector("input.lernsuche");
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll("aside.toc a[data-sec]"));
    var pager = document.querySelector(".pager");
    var info = document.querySelector(".count");

    function show(id, scroll) {
      secs.forEach(function (s) { s.classList.toggle("hidden", id !== "alle" && s.id !== id); });
      tocLinks.forEach(function (a) {
        var own = a.dataset.sec === id;
        a.classList.toggle("current", own && !a.classList.contains("sub"));
        if (a.classList.contains("sub")) a.classList.toggle("hidden", id !== "alle" && a.dataset.sec !== id);
      });
      if (sel) sel.value = id;
      // Blättern
      if (pager) {
        pager.innerHTML = "";
        var i = secs.findIndex(function (s) { return s.id === id; });
        if (id !== "alle" && i >= 0) {
          if (i > 0) pager.insertAdjacentHTML("beforeend", '<a class="prev" href="#' + secs[i - 1].id + '"><small>← zurück</small>' + secs[i - 1].dataset.title + "</a>");
          else pager.insertAdjacentHTML("beforeend", "<span></span>");
          if (i < secs.length - 1) pager.insertAdjacentHTML("beforeend", '<a class="next" href="#' + secs[i + 1].id + '"><small>weiter →</small>' + secs[i + 1].dataset.title + "</a>");
        }
      }
      if (scroll) window.scrollTo(0, 0);
    }
    function fromHash() {
      var h = decodeURIComponent(location.hash.slice(1));
      if (!h) { show(secs[0].id, false); return; }
      var target = document.getElementById(h);
      if (!target) { show(secs[0].id, false); return; }
      var sec = target.closest("section.kapitel");
      show(sec ? sec.id : "alle", false);
      if (target !== sec) setTimeout(function () { target.scrollIntoView(); }, 0); else window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", fromHash);
    if (sel) sel.addEventListener("change", function () {
      if (sel.value === "alle") { history.replaceState(null, "", location.pathname); show("alle", true); }
      else location.hash = sel.value;
    });
    if (search) {
      var timer;
      search.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          var term = search.value.trim(), tn = norm(term);
          unmark(doc);
          if (term.length < 2) { doc.querySelectorAll(".abschnitt,.kapitel").forEach(function (e) { e.classList.remove("hidden"); }); fromHash(); if (info) info.textContent = ""; return; }
          var hits = 0;
          secs.forEach(function (s) {
            var any = false;
            var parts = s.querySelectorAll(".abschnitt");
            if (!parts.length) parts = [s];
            Array.prototype.forEach.call(parts, function (p) {
              var ok = norm(p.textContent).indexOf(tn) >= 0;
              if (p !== s) p.classList.toggle("hidden", !ok);
              if (ok) { any = true; hits++; }
            });
            s.classList.toggle("hidden", !any);
          });
          if (pager) pager.innerHTML = "";
          if (sel) sel.value = "alle";
          markIn(doc, term);
          if (info) info.textContent = hits + (hits === 1 ? " Abschnitt" : " Abschnitte") + " mit „" + term + "“";
        }, 160);
      });
    }
    fromHash();
    var tocDet = document.querySelector("aside.toc details");
    if (tocDet && window.innerWidth < 860) tocDet.open = false;
    tocLinks.forEach(function (a) { a.addEventListener("click", function () { if (tocDet && window.innerWidth < 860) tocDet.open = false; }); });
  }
})();
