// Alle Codebeispiele (Playground-Beispiele und „Ausprobieren“-Links) laufen ohne Fehler und Signaturverletzung.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lauf, beispiele, ausprobierLinks } = require('./hilfen');

test('Playground-Beispiele laufen', () => {
  const B = beispiele();
  for (const k in B) {
    const r = lauf(B[k]);
    if (k === 'Signaturen prüfen') { assert.equal(r.verletzungen.length, 1, k); continue; }   // zeigt absichtlich eine Verletzung
    assert.equal(r.fehler, null, k + ': ' + r.fehler);
    assert.ok(r.ok, k + ': Test fehlgeschlagen');
    assert.deepEqual(r.verletzungen, [], k);
  }
});

test('Ausprobieren-Links der Lernübersicht laufen', () => {
  const links = ausprobierLinks();
  assert.ok(links.length > 90, 'zu wenige Links: ' + links.length);
  for (const l of links) {
    const r = lauf(l.code, { level: l.level });
    if (l.fehlerAbsicht) { assert.ok(r.fehler); continue; }
    assert.equal(r.fehler, null, l.code.slice(0, 120) + ' → ' + r.fehler);
    assert.ok(r.ok, l.code.slice(0, 120));
    assert.deepEqual(r.verletzungen, [], l.code.slice(0, 120));
  }
});
