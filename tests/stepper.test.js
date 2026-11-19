// Stepper (assets/js/stepper.js)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { S, ausprobierLinks, beispiele } = require('./hilfen');

function text(n, p) { return S.render(n, p, 'x').html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"'); }
function schritte(code, lv) { const r = S.build(code, lv || 'vanilla'); return r.steps.map(s => s.error ? 'FEHLER ' + s.error : text(s.after, s.apath)); }

test('Substitutionsmodell: einfache Funktion', () => {
  assert.deepEqual(schritte('(define verdoppeln (lambda (x) (* 2 x))) (verdoppeln (+ 1 2))'),
    ['(verdoppeln 3)', '(* 2 3)', '6']);
});

test('if, cond, and, let werden Schritt für Schritt reduziert', () => {
  const s = schritte('(define fak (lambda (n) (if (= n 0) 1 (* n (fak (- n 1)))))) (fak 2)');
  assert.equal(s[s.length - 1], '2');
  assert.ok(s.includes('(* 2 (fak (- 2 1)))'));
  assert.deepEqual(schritte('(and (> 2 1) (< 2 1))'), ['(and #t (< 2 1))', '(and (< 2 1))', '(and #f)', '#f']);
  assert.deepEqual(schritte('(let ((x 2) (y 3)) (* x y))'), ['(* 2 3)', '6']);
});

test('Tests laufen am Ende, Fehler werden angezeigt', () => {
  const s = schritte('(check-expect (f 2) 4) (define f (lambda (x) (* x x)))');
  assert.equal(s[s.length - 1], '"Test bestanden ✓"');
  const e = schritte('(first empty)');
  assert.match(e[0], /^FEHLER first/);
});

test('läuft ohne Absturz über alle Codebeispiele', () => {
  for (const l of [...ausprobierLinks(), ...Object.values(beispiele()).map(code => ({ code, level: 'vanilla' }))]) {
    const r = S.build(l.code, l.level);
    const fehler = r.steps.filter(s => s.error).map(s => s.error);
    if (!l.fehlerAbsicht) assert.deepEqual(fehler, [], l.code.slice(0, 100));
    assert.ok(!r.error, r.error);
    r.steps.forEach(s => { S.render(s.before, s.bpath, 'a'); if (s.after) S.render(s.after, s.apath, 'b'); });
  }
});
