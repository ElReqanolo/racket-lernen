// Rendert LaTeX-Formeln der Lernübersicht beim Erstellen zu HTML (braucht das npm-Paket „katex“: npm install).
let katex;
try { katex = require('katex'); } catch (e) { katex = require('/opt/npm-tools/node_modules/katex'); }
const fs = require('fs');
const items = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = items.map(s => { try { return katex.renderToString(s, { displayMode: true, throwOnError: false }); } catch (e) { return '<pre>' + s + '</pre>'; } });
process.stdout.write(JSON.stringify(out));
