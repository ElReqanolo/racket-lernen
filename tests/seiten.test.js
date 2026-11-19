// Statische Prüfungen der veröffentlichten Seiten: Links, Anker, Dateien, Daten
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, seite } = require('./hilfen');

const SEITEN = ['index.html', 'lernen.html', 'befehle.html', 'glossar.html', 'fehler.html', 'uebungen.html', 'playground.html'];
const ids = {};
for (const s of SEITEN) ids[s] = new Set([...seite(s).matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));

test('alle Seiten vorhanden, mit Titel und Sprache', () => {
  for (const s of SEITEN) {
    const h = seite(s);
    assert.match(h, /<html lang="de"/, s);
    assert.match(h, /<title>[^<]+<\/title>/, s);
    assert.doesNotMatch(h, /home\/claude|\/tmp\//, s + ' enthält lokale Pfade');
  }
});

test('interne Links und Anker zeigen auf vorhandene Ziele', () => {
  const kaputt = [];
  for (const s of SEITEN) for (const m of seite(s).matchAll(/href="([^"]+)"/g)) {
    const h = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|data:)/.test(h) || h.startsWith('playground.html#code=')) continue;
    if (h.startsWith('assets/')) { if (!fs.existsSync(path.join(ROOT, h.split('?')[0]))) kaputt.push(s + ' → ' + h); continue; }
    const [datei, anker] = h.split('#'); const ziel = (datei.split('?')[0]) || s;
    if (!ids[ziel]) { kaputt.push(s + ' → ' + h); continue; }
    if (anker && !ids[ziel].has(anker)) kaputt.push(s + ' → ' + h);
  }
  assert.deepEqual(kaputt, []);
});

test('eingebundene Skripte und Stile existieren, mit Versionsangabe', () => {
  for (const s of SEITEN) for (const m of seite(s).matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
    assert.ok(fs.existsSync(path.join(ROOT, m[1].split('?')[0])), m[1]);
    if (/\.(js|css)\?/.test(m[1]) || /assets\/(js|css)\//.test(m[1])) assert.match(m[1], /\?v=[0-9a-f]{8}$/, m[1]);
  }
});

test('KaTeX-Schriften, die das CSS braucht, sind vorhanden', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets/katex/katex.min.css'), 'utf8');
  const fonts = fs.readdirSync(path.join(ROOT, 'assets/katex/fonts'));
  assert.ok(fonts.length >= 6);
  for (const f of fonts) assert.ok(css.includes(f), f + ' wird nicht benutzt');
});

test('Glossar, Befehle und Fehler haben Einträge mit Kapitel', () => {
  for (const s of ['glossar.html', 'befehle.html', 'fehler.html']) {
    const n = (seite(s).match(/class="fi"/g) || []).length;
    assert.ok(n > 30, s + ': nur ' + n + ' Einträge');
  }
});

test('Schriften aus dem CSS sind vorhanden', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/style.css'), 'utf8');
  const urls = [...css.matchAll(/url\((\.\.\/fonts\/[^)]+)\)/g)].map(m => m[1]);
  assert.ok(urls.length >= 3);
  for (const u of urls) assert.ok(fs.existsSync(path.join(ROOT, 'assets/css', u)), u);
});
