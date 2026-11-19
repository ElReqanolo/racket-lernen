// Jede Musterlösung muss die Online-Prüfung bestehen, ein leeres Programm darf sie nicht bestehen.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { P, seite, aufgaben } = require('./hilfen');

const data = aufgaben();
const liste = [...seite('uebungen.html').matchAll(/data-kap="(\d+)" data-stars="\d" data-label="([^"]*)"/g)].map(m => ({ kap: +m[1], label: m[2] }));

test('125 Aufgaben vorhanden, jede mit Lösung oder Quiz', () => {
  assert.equal(liste.length, 125);
  for (const t of liste) {
    const ch = data.kap[t.kap];
    assert.ok(ch.segs[t.label] !== undefined || (ch.quiz || {})[t.label], 'ohne Lösung: ' + t.kap + t.label);
  }
});

test('Musterlösungen bestehen, leere Abgaben nicht', () => {
  const probleme = [];
  for (const t of liste) {
    const ch = data.kap[t.kap], ref = ch.segs[t.label], quiz = (ch.quiz || {})[t.label], custom = (ch.custom || {})[t.label];
    if (ref === undefined) continue;
    if (quiz && !custom && !/\(check-/.test(ref)) continue;          // reine Auswahl-/Eingabeaufgabe
    const others = Object.entries(ch.segs).filter(([k]) => k !== t.label).map(([, v]) => v);
    const lern = []; for (let k = 1; k <= t.kap; k++) if (data.lern[k]) lern.push(data.lern[k]);
    const prev = []; for (let k = 1; k < t.kap; k++) prev.push(...Object.values(data.kap[k].segs));
    const task = { kap: t.kap, custom, given: ch.given, ref, others, lern, prev };
    const r = P.grade(task, ref);
    if (r.status !== 'ok' && r.status !== 'manual') probleme.push(t.kap + t.label + ': ' + r.summary);
    if (r.status === 'manual' && /nicht geprüft werden \(/.test(r.summary)) probleme.push(t.kap + t.label + ': ' + r.summary);
    if (r.status === 'ok' && P.grade(task, '(define nix 1)').status === 'ok') probleme.push(t.kap + t.label + ': leere Abgabe besteht');
  }
  assert.deepEqual(probleme, []);
});

test('Quizfragen: richtige Antwort ist gültig', () => {
  for (const k in data.kap) for (const [lab, q] of Object.entries(data.kap[k].quiz || {})) {
    (q.questions || []).forEach(qq => { const c = Array.isArray(qq.correct) ? qq.correct : [qq.correct]; c.forEach(i => assert.ok(i >= 0 && i < qq.options.length, k + lab)); });
    (q.fields || []).forEach(f => assert.ok(f.answers.length > 0, k + lab));
  }
});
