// Gemeinsame Hilfen für die Node-Tests
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'assets', 'js');
const M = require(path.join(JS, 'racket.js'));
global.window = global.window || {};
global.window.MiniRacket = M;
require(path.join(JS, 'editor.js'));
const E = global.window.RacketEditor;
const S = require(path.join(JS, 'stepper.js'));
const P = require(path.join(JS, 'pruefer.js'));

function seite(name) { return fs.readFileSync(path.join(ROOT, name), 'utf8'); }
// Daten der Übungen (eingebettet in uebungen.html)
function aufgaben() { return JSON.parse(seite('uebungen.html').match(/id="aufgaben-daten"[^>]*>([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, '</')); }
// alle „Im Playground ausprobieren“-Links der Lernübersicht
function ausprobierLinks() {
  return [...seite('lernen.html').matchAll(/<a class="trybtn( errok)?" href="playground\.html#code=([^"&]+)(?:&amp;lvl=(\w+))?"/g)]
    .map(m => ({ code: Buffer.from(m[2], 'base64').toString('utf8'), level: m[3] || 'vanilla', fehlerAbsicht: !!m[1] }));
}
// Beispiele des Playgrounds
function beispiele() {
  const src = fs.readFileSync(path.join(JS, 'playground.js'), 'utf8');
  return (0, eval)('(' + src.match(/var BEISPIELE = (\{[\s\S]*?\n  \});/)[1] + ')');
}
// Programm ausführen wie im Playground
function lauf(code, opts) {
  const it = new M.Interp(Object.assign({ level: 'vanilla', checkSigs: true }, opts || {}));
  const out = []; it.onOutput = s => out.push(s);
  let werte = [], fehler = null;
  try { werte = it.run(code).map(v => M.show(v.value)); } catch (e) { fehler = e.message; }
  let tests = [];
  try { tests = it.runTests(); } catch (e) { fehler = fehler || e.message; }
  return { werte, fehler, tests, ok: tests.every(t => t.ok), verletzungen: it.sigViolations.map(v => v.msg), ausgabe: out.join(''), it };
}
module.exports = { ROOT, JS, M, E, S, P, seite, aufgaben, ausprobierLinks, beispiele, lauf };
