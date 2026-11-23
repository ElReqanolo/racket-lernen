/* Racket lernen – kleine Hilfsfunktionen für alle Seiten. Kein Framework nötig. */
(function () {
  "use strict";
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Hell/Dunkel und Einstellungen (angewendet von sdpApply im <head>) ---------- */
  var apply = window.sdpApply || function () {};
  function setOpt(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} apply(); }
  var settings = document.querySelector(".settings");
  if (settings) {
    var KEYS = ["sdp-theme", "sdp-accent", "sdp-font", "sdp-motion"];
    var show = function () {
      settings.querySelectorAll("[data-set]").forEach(function (g) {
        var cur = store.get(g.dataset.set) || "", hit = false;
        g.querySelectorAll("button").forEach(function (b) { var on = b.dataset.v === cur; hit = hit || on; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
        var c = g.querySelector(".custom"); if (c) { c.classList.toggle("on", !hit); if (cur) c.querySelector("input").value = cur; }
      });
    };
    settings.addEventListener("click", function (e) {
      var b = e.target.closest("[data-set] button");
      if (b) { setOpt(b.closest("[data-set]").dataset.set, b.dataset.v); show(); return; }
      var r = e.target.closest("[data-reset]");
      if (!r) return;
      if (r.dataset.reset === "all") {
        if (!confirm("Alle gespeicherten Daten löschen?\n\nFortschritt, Häkchen, Code und Antworten werden gelöscht. Das lässt sich nicht rückgängig machen.")) return;
        try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("sdp-") === 0) localStorage.removeItem(k); }); } catch (e2) {}
      } else KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e2) {} });
      apply(); show();
    });
    settings.querySelector(".custom input").addEventListener("input", function (e) { setOpt("sdp-accent", e.target.value); show(); });
    show();
  }

  /* ---------- Beim Runterscrollen Kopfzeile ausblenden und Filterleiste einklappen (nur Suche bleibt) ---------- */
  (function () {
    var fbar = document.querySelector(".filters"), body = document.body, lastY = window.scrollY;
    var baseMB = fbar ? parseFloat(getComputedStyle(fbar).marginBottom) || 0 : 0;
    function set(hide) {
      if (body.classList.contains("hidehead") === hide) return;
      body.classList.toggle("hidehead", hide);
      if (!fbar) return;
      // Höhe im Seitenfluss gleich halten, sonst springt die Seite beim Ein-/Ausklappen
      var h0 = fbar.offsetHeight;
      fbar.classList.toggle("compact", hide);
      fbar.style.marginBottom = hide ? (baseMB + h0 - fbar.offsetHeight) + "px" : "";
      document.documentElement.style.setProperty("--fh", (hide && getComputedStyle(fbar).display !== "none" ? fbar.offsetHeight : 0) + "px");
    }
    function onScroll() {
      var y = window.scrollY;
      if (y < 150) { set(false); lastY = y; return; }
      if (document.activeElement && document.activeElement.matches && document.activeElement.matches("input[type=search]")) { lastY = y; return; }
      if (y > lastY + 12) { set(true); lastY = y; }
      else if (y < lastY - 60) { set(false); lastY = y; }
      else if (y > lastY) lastY = y; // weiter runter: Bezugspunkt mitziehen
      else if (y < lastY && !body.classList.contains("hidehead")) lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  })();

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

    var single = bar.hasAttribute("data-single");
    if (q && params.get("q")) q.value = params.get("q");
    if (kap && params.get("kap")) kap.value = params.get("kap");
    else if (kap && single) kap.value = store.get("sdp-ueb-kap") || "1";

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
      if (single) {
        store.set("sdp-ueb-kap", String(k));
        document.querySelectorAll(".kaplink:not(.sub)").forEach(function (l) { l.classList.toggle("current", l.dataset.kap === String(k)); });
        var pg = document.querySelector(".uebpager");
        if (pg) {
          pg.innerHTML = "";
          if (k > 1) pg.insertAdjacentHTML("beforeend", '<a class="prev" href="?kap=' + (k - 1) + '" data-kap="' + (k - 1) + '"><small>← zurück</small>' + kap.options[k - 2].text + "</a>"); else pg.insertAdjacentHTML("beforeend", "<span></span>");
          if (k >= 1 && k < 15) pg.insertAdjacentHTML("beforeend", '<a class="next" href="?kap=' + (k + 1) + '" data-kap="' + (k + 1) + '"><small>weiter →</small>' + kap.options[k].text + "</a>");
        }
        setParam("kap", String(k));
      } else setParam("kap", k ? String(k) : "");
      setParam("q", term); setParam("modus", k && mode === "bis" ? "bis" : "");
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
    document.addEventListener("click", function (e) {
      var l = e.target.closest(".kaplink, .uebpager a");
      if (!l || !kap) return;
      e.preventDefault();
      kap.value = l.dataset.kap; apply();
      var det = document.querySelector("aside.toc details"); if (det && window.innerWidth < 860) det.open = false;
      var tg = l.dataset.target && document.getElementById(l.dataset.target);
      if (tg) tg.scrollIntoView({ behavior: "instant", block: "start" }); else window.scrollTo({ top: 0, behavior: "instant" });
    });
    apply();
  }

  /* ---------- Startseite: Kapitelkacheln aufklappen ---------- */
  function toggleKap(card) {
    var open = !card.classList.contains("open");
    document.querySelectorAll(".kapitem.open").forEach(function (c) { if (c !== card) { c.classList.remove("open"); c.setAttribute("aria-expanded", "false"); } });
    card.classList.toggle("open", open); card.setAttribute("aria-expanded", open ? "true" : "false");
  }
  document.addEventListener("click", function (e) {
    var card = e.target.closest(".kapitem");
    if (!card || e.target.closest("a")) return;
    toggleKap(card);
  });
  document.addEventListener("keydown", function (e) {
    var card = e.target.closest && e.target.closest(".kapitem");
    if (card && e.target === card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleKap(card); }
  });

  /* ---------- Übungen: Tipps nacheinander aufdecken ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".tippbtn");
    if (!b) return;
    var items = b.parentNode.querySelectorAll("ol.tipps li"), shown = 0, total = items.length;
    for (var i = 0; i < total; i++) { if (items[i].hidden) { items[i].hidden = false; shown = i + 1; break; } shown = i + 1; }
    if (shown >= total) { b.textContent = "💡 Alle Tipps gezeigt"; b.disabled = true; }
    else b.textContent = "💡 Noch ein Tipp (" + (shown + 1) + " von " + total + ")";
  });

  /* ---------- Übungen: erledigt wird automatisch gesetzt, wenn die Abgabe richtig ist ---------- */
  var tasks = document.querySelectorAll("li.task");
  if (tasks.length) {
    var prog = document.querySelector(".progress div");
    var progTxt = document.querySelector(".progtxt");
    var update = function () {
      var done = document.querySelectorAll("li.task.done").length;
      if (prog) prog.style.width = (100 * done / tasks.length) + "%";
      if (progTxt) progTxt.textContent = "gesamt " + done + " / " + tasks.length;
      var counts = {};
      tasks.forEach(function (li) { var k = li.dataset.kap; counts[k] = counts[k] || [0, 0]; counts[k][1]++; if (li.classList.contains("done")) counts[k][0]++; });
      document.querySelectorAll(".kp[data-kp]").forEach(function (sp) {
        var c = counts[sp.dataset.kp] || [0, 0]; sp.textContent = c[0] + "/" + c[1]; sp.classList.toggle("full", c[1] > 0 && c[0] === c[1]);
      });
      document.querySelectorAll(".kapprog[data-kp]").forEach(function (sp) {
        var c = counts[sp.dataset.kp] || [0, 0], pct = c[1] ? Math.round(100 * c[0] / c[1]) : 0;
        sp.innerHTML = '<span class="kpbar"><span style="width:' + pct + '%"></span></span>' + c[0] + " von " + c[1] + " erledigt";
        sp.classList.toggle("full", c[1] > 0 && c[0] === c[1]);
      });
      var cur = document.querySelector(".curprog"), sel = document.querySelector(".filters select.kap");
      if (cur && sel) {
        var k = sel.value;
        if (k !== "0" && counts[k]) cur.textContent = "Kapitel " + k + ": " + counts[k][0] + " / " + counts[k][1] + " erledigt";
        else cur.textContent = "Alle Kapitel: " + done + " / " + tasks.length + " erledigt";
      }
    };
    window.__updateProgress = update;
    tasks.forEach(function (li) {
      if (store.get("sdp-ueb-" + li.id) === "1") li.classList.add("done");
      var st = li.querySelector(".status"); if (st) st.title = li.classList.contains("done") ? "erledigt" : "offen";
    });
    window.__markDone = function (li) {
      if (li.classList.contains("done")) return;
      li.classList.add("done", "just-done"); store.set("sdp-ueb-" + li.id, "1");
      setTimeout(function () { li.classList.remove("just-done"); }, 1000);
      var st = li.querySelector(".status"); if (st) st.title = "erledigt";
      update();
    };
    var selK = document.querySelector(".filters select.kap"); if (selK) selK.addEventListener("change", update);
    var resetBtn = document.querySelector(".resetkap");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      var k = selK ? selK.value : "0";
      var list = Array.prototype.filter.call(tasks, function (li) { return k === "0" || li.dataset.kap === k; });
      var what = k === "0" ? "ALLE Kapitel" : "Kapitel " + k;
      if (!confirm(what + " zurücksetzen?\n\nDein Code, deine Antworten und alle Häkchen in " + what + " werden gelöscht. Das lässt sich nicht rückgängig machen.")) return;
      list.forEach(function (li) { ["sdp-ueb-", "sdp-code-", "sdp-quiz-", "sdp-res-"].forEach(function (p) { try { localStorage.removeItem(p + li.id); } catch (e) {} }); });
      location.reload();
    });
    document.addEventListener("click", function (e) { if (e.target.closest(".kaplink, .uebpager a")) setTimeout(update, 0); });
    update();
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
      if (target !== sec) setTimeout(function () { target.scrollIntoView({ behavior: "instant", block: "start" }); }, 0); else window.scrollTo(0, 0);
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

/* Fachwort-Erklärungen (Glossar-Tooltips) */
(function () {
  const terms = document.querySelectorAll('.gl');
  if (!terms.length) return;
  const tip = document.createElement('div'); tip.id = 'gltip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  let cur = null, sy = 0;
  function show(el) {
    cur = el; const d = el.dataset.def || ''; const i = d.indexOf(': ');
    tip.innerHTML = ''; const b = document.createElement('b'); b.textContent = i > 0 ? d.slice(0, i) : '';
    tip.appendChild(b); tip.appendChild(document.createTextNode(i > 0 ? d.slice(i + 2) : d));
    tip.classList.add('on'); sy = scrollY;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let x = Math.max(10, Math.min(r.left, innerWidth - w - 10));
    let y = r.bottom + 8; if (y + h > innerHeight - 10) y = r.top - h - 8;
    tip.style.left = x + 'px'; tip.style.top = Math.max(10, y) + 'px';
  }
  function hide() { cur = null; tip.classList.remove('on'); }
  terms.forEach(el => {
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', hide);
    el.addEventListener('click', e => { e.stopPropagation(); show(el); });
  });
  document.addEventListener('click', hide);
  addEventListener('scroll', () => { if (cur && Math.abs(scrollY - sy) > 40) hide(); }, { passive: true });
})();

/* Startseite: die Rechnung noch einmal abspielen */
(function () {
  var r = document.querySelector(".rechnung"), b = r && r.querySelector(".r-replay");
  if (!b) return;
  b.addEventListener("click", function () { r.classList.remove("spielt"); void r.offsetWidth; r.classList.add("spielt"); });
})();
