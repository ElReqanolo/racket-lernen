// Färbt Racket-Code beim Erstellen der Seiten (gleiche Farben wie im Playground). Eingabe: JSON-Liste von Code-Texten.
const path = require('path');
global.window = { MiniRacket: require(path.join(__dirname, '..', 'assets', 'js', 'racket.js')) };
require(path.join(__dirname, '..', 'assets', 'js', 'editor.js'));
const items = JSON.parse(require('fs').readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(items.map(c => global.window.RacketEditor.highlight(c, true))));
