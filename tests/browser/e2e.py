#!/usr/bin/env python3
"""Browsertests der ganzen Website (braucht Playwright: pip install playwright && playwright install chromium).

Aufruf im Hauptordner:  python3 tests/browser/e2e.py
Startet selbst einen kleinen Webserver auf dem Hauptordner und prüft Seiten, Übungen und Playground
am Computer (1300 px) und auf dem Handy (400 px).
"""
import asyncio, functools, http.server, os, socketserver, sys, threading
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SEITEN = ["index.html", "lernen.html", "befehle.html", "glossar.html", "fehler.html", "uebungen.html", "playground.html", "einstellungen.html"]
fehler = []


def check(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        fehler.append(msg)


def server():
    class Leise(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Leise, directory=ROOT)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


async def neu(b, url, w=1300, h=900):
    pg = await b.new_page(viewport={"width": w, "height": h})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
    pg.errs = errs
    await pg.goto(url)
    await pg.evaluate("localStorage.clear()")
    await pg.reload()
    await pg.wait_for_timeout(300)
    return pg


async def code_setzen(pg, code):
    await pg.evaluate("c => { const t = document.getElementById('pg-code'); t.value = c; t.dispatchEvent(new Event('input')); }", code)


async def main():
    httpd, base = server()
    async with async_playwright() as p:
        b = await p.chromium.launch()

        print("Seiten laden ohne JavaScript-Fehler")
        for s in SEITEN:
            pg = await neu(b, base + s)
            check(not pg.errs, f"{s} ohne Fehler {pg.errs[:1]}")
            await pg.close()

        print("Filter, Suche, Design")
        pg = await neu(b, base + "glossar.html")
        alle = await pg.evaluate("document.querySelectorAll('.fi:not(.hidden)').length")
        await pg.fill(".filters input[type=search]", "lambda"); await pg.wait_for_timeout(300)
        treffer = await pg.evaluate("[...document.querySelectorAll('.fi')].filter(e => e.offsetParent).length")
        check(0 < treffer < alle, f"Glossar-Suche filtert ({alle} → {treffer})")
        await pg.click(".setbtn"); await pg.wait_for_load_state()
        await pg.click('[data-set="sdp-design"] button[data-v="dark"]')
        check(await pg.evaluate("document.documentElement.getAttribute('data-theme')") == "dark", "Dunkles Design schaltet um")
        await pg.close()
        pg = await neu(b, base + "lernen.html")
        await pg.fill("input.lernsuche", "Akkumulator"); await pg.wait_for_timeout(600)
        check("Akkumulator" in await pg.evaluate("document.querySelector('.filters .count').textContent"), "Volltextsuche der Lernübersicht")
        await pg.fill("input.lernsuche", ""); await pg.wait_for_timeout(400)
        el = pg.locator("section .gl:visible").first
        await el.scroll_into_view_if_needed(); await el.click(); await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.getElementById('gltip').classList.contains('on')"), "Fachwort-Erklärung erscheint beim Antippen")
        await pg.close()

        print("Übungen: alle richtigen Antworten werden abgehakt, falsche nicht")
        for datei, erwartet in (("uebungen_richtig.js", "notDone=0 "), ("uebungen_falsch.js", "notDone=125 ")):
            pg = await neu(b, base + "uebungen.html?kap=0")
            await pg.evaluate(open(os.path.join(HERE, datei)).read())
            await pg.wait_for_timeout(9000)
            t = await pg.title()
            check(erwartet in t, f"{datei}: {t[:70]}")
            await pg.close()
        pg = await neu(b, base + "uebungen.html?kap=1")
        await pg.evaluate("document.querySelectorAll('li.task')[0].classList.add('done'); localStorage.setItem('sdp-ueb-k1-A1','1')")
        await pg.click(".resetkap"); await pg.wait_for_timeout(500)
        check(await pg.evaluate("localStorage.getItem('sdp-ueb-k1-A1')") is None, "Kapitel zurücksetzen löscht den Fortschritt")
        await pg.close()

        print("Playground")
        pg = await neu(b, base + "playground.html")
        opts = await pg.evaluate("[...document.querySelectorAll('#pg-ex option')].slice(1).map(o => o.value)")
        for o in opts:
            await pg.select_option("#pg-ex", o); await pg.wait_for_timeout(250)
            errs = await pg.evaluate("document.querySelectorAll('#pg-out .pg-line.err:not(.sig)').length")
            check(errs == 0, f"Beispiel „{o}“ läuft")
        await pg.evaluate("document.querySelectorAll('.pg-anim .chip').forEach(b => b.click())")
        await code_setzen(pg, ""); await pg.click("#pg-code")
        await pg.keyboard.type("(circ"); await pg.keyboard.press("Tab")
        check((await pg.input_value("#pg-code")) == "(circle", "Tab vervollständigt")
        await pg.keyboard.type(' 20 "solid")'); await pg.wait_for_timeout(600)
        msgs = await pg.evaluate("[...document.querySelectorAll('.ed-msg')].map(x => x.textContent)")
        check(any("fehlt eine Angabe" in m for m in msgs), "Fehlende Angabe wird beim Tippen markiert")
        await code_setzen(pg, "(define v (lambda (x) (* 2 x)))\n(v (+ 1 2))")
        await pg.click("#pg-step"); await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelector('.st-pos').textContent") == "Schritt 1 von 3", "Stepper zeigt 3 Schritte")
        await pg.keyboard.press("End")
        check("6" in await pg.evaluate("document.querySelector('.st-after').textContent"), "Stepper endet mit 6")
        await pg.keyboard.press("Escape")
        await pg.select_option("#pg-level", "beginner")
        await code_setzen(pg, "(cons 1 empty)"); await pg.click("#pg-run"); await pg.wait_for_timeout(300)
        check("Sprachebene" in await pg.evaluate("document.querySelector('#pg-out').innerText"), "Sprachebene „Anfänger“ lehnt Listen ab")
        await pg.select_option("#pg-level", "vanilla")
        await code_setzen(pg, "(define k "); await pg.focus("#pg-code")
        await pg.evaluate("document.getElementById('pg-code').setSelectionRange(10, 10)")
        await pg.set_input_files("#pg-imgfile", os.path.join(HERE, "kachel.png")); await pg.wait_for_timeout(500)
        await pg.keyboard.type(")\n(image-width k)\n(length (image->color-list k))")
        await pg.click("#pg-run"); await pg.wait_for_timeout(500)
        out = await pg.evaluate("document.querySelector('#pg-out').innerText")
        check("3" in out and "6" in out, "Bild einfügen mit bitmap und image->color-list")
        await pg.select_option("#pg-ex", "Universe: zwei Welten"); await pg.wait_for_timeout(600)
        cvs = pg.locator(".pg-animcv")
        bb = await cvs.nth(0).bounding_box(); await pg.mouse.click(bb["x"] + 40, bb["y"] + 40); await pg.wait_for_timeout(400)
        check("(list 1" in await pg.evaluate("document.querySelector('.pg-ustate code').textContent"), "universe: Klick erreicht den Server")
        check(not pg.errs, f"Playground ohne JavaScript-Fehler {pg.errs[:1]}")
        await pg.close()

        print("Handy (400 px)")
        for s in SEITEN:
            pg = await neu(b, base + s, 400, 850)
            breite = await pg.evaluate("document.documentElement.scrollWidth")
            check(breite <= 400, f"{s}: kein seitliches Wischen ({breite}px)")
            await pg.evaluate("window.scrollTo({top: 900, behavior: 'instant'}); window.dispatchEvent(new Event('scroll'))")
            await pg.wait_for_timeout(300)
            hoch = await pg.evaluate("document.documentElement.scrollHeight > 1400")
            if hoch:
                check(await pg.evaluate("document.body.classList.contains('hidehead')"), f"{s}: Kopfzeile verschwindet beim Runterscrollen")
            await pg.close()
        await b.close()
    httpd.shutdown()
    print(f"\n{'Alles in Ordnung.' if not fehler else str(len(fehler)) + ' Fehler:'}")
    for f in fehler:
        print("  -", f)
    sys.exit(1 if fehler else 0)


asyncio.run(main())
