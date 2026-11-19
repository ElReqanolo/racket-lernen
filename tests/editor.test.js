// Fehlermarkierung beim Tippen (assets/js/editor.js)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { E, beispiele, ausprobierLinks } = require('./hilfen');

function meldungen(code, lv) { return E.analyse(code, lv === undefined ? 'vanilla' : lv).errs.map(e => e.msg); }

test('erkennt typische Fehler', () => {
  const faelle = [
    ['(circel 20 "solid" "red")', /Meintest du „circle“/],
    ['(circle 20 "solid")', /es fehlt eine Angabe/],
    ['(square 1 2 3 4)', /zu viel/],
    ['(+ 1 (* 2 3)', /fehlt die schließende Klammer/],
    ['(+ 1 2))', /zu viel/],
    ['(5 3)', /keine Funktion/],
    ['(string-append "abc', /nicht mit " geschlossen/],
    ['(define f (lambda (x y) (+ x y))) (f 1)', /f: erwartet 2 Argumente/],
    ['(if (> 1 2) 3)', /if: erwartet/],
    ['(define g (lambda (x) (cond ((> x 1) "a") (else))))', /keine Antwort/],
    ['(: f ((list-of %a) -> natrual))', /Meintest du „natural“/],
    ['()', /Leere Klammer/],
    ['(let ((x 1)) x)', /erst in der Sprachebene/, 'beginner'],
    ['(match 1 ((make-foo a) a))', /kein bekannter Konstruktor/],
  ];
  for (const [code, rx, lv] of faelle) assert.ok(meldungen(code, lv).some(m => rx.test(m)), code + ' → ' + JSON.stringify(meldungen(code, lv)));
});

test('keine falschen Meldungen bei gültigem Code', () => {
  const gut = [
    '(define s1 (square 40 "solid" "red")) (define tile (lambda (a b) (above (beside a b) (beside b a)))) (tile s1 s1)',
    '(check-property (for-all ((a rational) (b rational)) (= (+ a b) (+ b a))))',
    '(define-record dillo make-dillo dillo? (dillo-weight natural) (dillo-alive? boolean)) (: f (dillo -> natural)) (define f (lambda (d) (match d ((make-dillo w a) w))))',
    '(+ 3+4i +i -2i 1.5-2.5i #i3)',
    '(define f (lambda (x) (cond ((> x 0) (define y (* x 2)) (+ y 1)) (else 0))))',
  ];
  for (const c of gut) assert.deepEqual(meldungen(c), [], c);
  assert.deepEqual(meldungen('(define g (lambda (a . r) r)) (g 1 2)', 'advanced'), []);
});

test('Playground-Beispiele und Ausprobieren-Links sind ohne Meldung', () => {
  const B = beispiele();
  for (const k in B) assert.deepEqual(meldungen(B[k]), [], k);
  for (const l of ausprobierLinks()) if (!l.fehlerAbsicht) assert.deepEqual(meldungen(l.code, l.level), [], l.code.slice(0, 80));
});

test('Syntaxfarben: Schlüsselwörter, Zeichenketten, Kommentare, Klammern', () => {
  const h = E.highlight('(define x "a;b") ; Kommentar\n(+ 1 #t)', true);
  assert.match(h, /<span class="t-key">define<\/span>/);
  assert.match(h, /<span class="t-str">"a;b"<\/span>/);
  assert.match(h, /<span class="t-com">; Kommentar<\/span>/);
  assert.match(h, /<span class="t-con">#t<\/span>/);
  assert.equal((h.match(/<span class="sx">/g) || []).length, 2);
  // unvollständiger Code: alle Gruppen werden geschlossen
  const u = E.highlight('(+ (* 1 2)', true);
  assert.equal((u.match(/<span/g) || []).length, (u.match(/<\/span>/g) || []).length);
  // Text bleibt gleich
  const src = '(define (f x) "x<y&z")';
  assert.equal(E.highlight(src, true).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&amp;/g, '&'), src);
});
