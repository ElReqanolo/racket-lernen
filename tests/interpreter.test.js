// Tests für den Racket-Interpreter (assets/js/racket.js)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { M, lauf } = require('./hilfen');

function wert(code, opts) { const r = lauf(code, opts); assert.equal(r.fehler, null, 'Fehler bei ' + code + ': ' + r.fehler); return r.werte[r.werte.length - 1]; }
function fehler(code, opts) { const r = lauf(code, opts); assert.ok(r.fehler, 'kein Fehler bei ' + code); return r.fehler; }

test('Zahlen: exakte Brüche, Gleitkomma, Rundung', () => {
  assert.equal(wert('(/ 1 3)'), '1/3');
  assert.equal(wert('(+ 1/2 1/2)'), '1');
  assert.equal(wert('(* 1.5 2)'), '3');   // Dezimalzahlen sind in den Lehrsprachen exakt
  assert.equal(wert('(exact->inexact 1/4)'), '#i0.25');
  assert.equal(wert('(round 5/2)'), '2');
  assert.equal(wert('(sqrt 16)'), '4');
  assert.equal(wert('(expt 2 100)'), '1267650600228229401496703205376');
  assert.equal(wert('(quotient 17 5)'), '3');
  assert.equal(wert('(modulo -7 3)'), '2');
  assert.equal(wert('(numerator 6/4)'), '3');
  assert.equal(wert('(sin 0)'), '0');
  assert.match(fehler('(/ 1 0)'), /durch 0/);
});

test('Komplexe Zahlen', () => {
  assert.equal(wert('(sqrt -1)'), '+i');
  assert.equal(wert('(* 3+4i 3-4i)'), '25');
  assert.equal(wert('(magnitude 3+4i)'), '5');
  assert.equal(wert('(expt +i 2)'), '-1');
  assert.equal(wert('(real-part 3+4i)'), '3');
  assert.equal(wert('(number? 1+2i)'), '#t');
  assert.equal(wert('(real? 1+2i)'), '#f');
  assert.match(fehler('(< 1+i 2)'), /reelle Zahl/);
});

test('Zeichenketten und Wahrheitswerte', () => {
  assert.equal(wert('(string-append "Hallo, " "Welt")'), '"Hallo, Welt"');
  assert.equal(wert('(string-length "Racket")'), '6');
  assert.equal(wert('(string->strings-list "ab")'), '(list "a" "b")');
  assert.equal(wert('(and #t (or #f #t))'), '#t');
  assert.match(fehler('(if 1 2 3)'), /Wahrheitswert/);
});

test('define, lambda, cond, let, Rekursion', () => {
  assert.equal(wert('(define fak (lambda (n) (if (= n 0) 1 (* n (fak (- n 1)))))) (fak 20)'), '2432902008176640000');
  assert.equal(wert('(define f (lambda (x) (cond ((> x 0) "pos") ((< x 0) "neg") (else "null")))) (f -3)'), '"neg"');
  assert.equal(wert('(let ((x 2) (y 3)) (* x y))'), '6');
  assert.equal(wert('(let* ((x 2) (y (* x 3))) y)'), '6');
  assert.match(fehler('(define f (lambda (x) (cond ((> x 0) 1)))) (f -1)'), /alle Bedingungen/);
  assert.match(fehler('(define f (lambda (x) x)) (f 1 2)'), /erwartet 1 Argument/);
  assert.match(fehler('(+ 1 y)'), /nicht definiert/);
  // Endrekursion ohne Stapelüberlauf
  assert.equal(wert('(define z (lambda (n acc) (if (= n 0) acc (z (- n 1) (+ acc 1))))) (z 50000 0)'), '50000');
});

test('Listen und höhere Funktionen', () => {
  assert.equal(wert('(map (lambda (x) (* x x)) (list 1 2 3))'), '(list 1 4 9)');
  assert.equal(wert('(filter even? (list 1 2 3 4))'), '(list 2 4)');
  assert.equal(wert('(fold 0 + (list 1 2 3 4))'), '10');
  assert.equal(wert('(reverse (list 1 2 3))'), '(list 3 2 1)');
  assert.equal(wert('(list-ref (list "a" "b") 1)'), '"b"');
  assert.match(fehler('(first empty)'), /nichtleere Liste/);
});

test('Records, define-singleton, match', () => {
  const rec = '(define-record dillo make-dillo dillo? (dillo-weight natural) (dillo-alive? boolean)) ';
  assert.equal(wert(rec + '(dillo-weight (make-dillo 10 #t))'), '10');
  assert.equal(wert(rec + '(dillo? (make-dillo 10 #t))'), '#t');
  assert.equal(wert(rec + '(match (make-dillo 10 #f) ((make-dillo w #t) w) ((make-dillo ... #f) 0))'), '0');
  assert.equal(wert('(match (list 1 2) (empty 0) ((cons a r) a))'), '1');
  assert.equal(wert('(define-singleton s-sig nichts nichts?) (nichts? nichts)'), '#t');
});

test('Sprachebenen', () => {
  assert.match(fehler('(cons 1 empty)', { level: 'beginner' }), /erst in der Sprachebene/);
  assert.match(fehler('(let ((x 1)) x)', { level: 'beginner' }), /erst in der Sprachebene/);
  assert.match(fehler("'abc", { level: 'vanilla' }), /fortgeschritten/);
  assert.equal(wert("(symbol? 'abc)", { level: 'advanced' }), '#t');
  assert.equal(wert('(define g (lambda (a . r) r)) (g 1 2 3)', { level: 'advanced' }), '(list 2 3)');
  assert.match(fehler('(add1 1)'), /gibt es in den Sprachebenen/);
});

test('Signaturprüfung', () => {
  let r = lauf('(: f (number -> number)) (define f (lambda (x) (* 2 x))) (f 2)');
  assert.deepEqual(r.verletzungen, []);
  r = lauf('(: f (natural -> string)) (define f (lambda (n) n)) (f 4)');
  assert.equal(r.verletzungen.length, 1); assert.match(r.verletzungen[0], /Ergebnis/);
  r = lauf('(define-record p make-p p? (p-x natural)) (make-p -1)');
  assert.match(r.verletzungen[0], /Feld p-x/);
  r = lauf('(: g ((list-of (mixed string natural)) -> boolean)) (define g (lambda (l) #t)) (g (list "a" 1))');
  assert.deepEqual(r.verletzungen, []);
  // ohne checkSigs (wie in den Übungen) keine Prüfung
  r = lauf('(: f (natural -> string)) (define f (lambda (n) n)) (f 4)', { checkSigs: false });
  assert.deepEqual(r.verletzungen, []);
});

test('Tests: check-expect, -within, -member-of, -range, -error, -property', () => {
  const r = lauf(`(check-expect (+ 1 1) 2) (check-within 3.14 3.1 0.1) (check-member-of 2 1 2 3) (check-range 5 1 10)
    (check-error (violation "x") "x") (check-property (for-all ((a rational) (b rational)) (= (+ a b) (+ b a))))`);
  assert.equal(r.tests.length, 6); assert.ok(r.ok, JSON.stringify(r.tests.map(t => t.ok)));
  const f = lauf('(check-expect (+ 1 1) 3) (check-range 11 1 10) (check-error (violation "a") "b")');
  assert.deepEqual(f.tests.map(t => t.ok), [false, false, false]);
});

test('Bilder: Größen und Gleichheit', () => {
  assert.equal(wert('(image-width (beside (square 10 "solid" "red") (circle 5 "solid" "blue")))'), '20');
  assert.equal(wert('(image-height (above (square 10 "solid" "red") (square 10 "solid" "red")))'), '20');
  assert.equal(wert('(equal? (square 10 "solid" "red") (rectangle 10 10 "solid" "red"))'), '#t');
  assert.equal(wert('(image-width (crop 0 0 5 5 (square 10 "solid" "red")))'), '5');
  assert.match(fehler('(square 10 "voll" "red")'), /Modus/);
  assert.match(fehler('(bitmap "fehlt.png")'), /nicht eingefügt/);
});

test('Ausgabe, big-bang und universe ohne Browser', () => {
  assert.equal(lauf('(write-string "a") (write-newline) (write-string "b")').ausgabe, 'a\nb');
  // ohne Animations-Hook liefert big-bang den Anfangszustand
  assert.equal(wert('(big-bang 5 (to-draw (lambda (x) (empty-scene 10 10))))'), '5');
  assert.match(fehler('(big-bang 5 (on-tick add1))', { level: null }), /to-draw/);
  assert.equal(wert('(iworld? iworld1)'), '#t');
  assert.match(fehler('(make-package 1 (lambda (x) x))'), /S-Ausdruck/);
});
