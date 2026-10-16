'use strict';
// Bundle a fixed offline release, never a remotely hosted website.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const entry of ['index.html', 'css', 'js', 'assets', 'manifest.webmanifest', 'manifest-dev.webmanifest']) {
  fs.cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
}
// Native releases are bundled offline and updated through the store.
// Keep this adapter out of the browser release.
fs.copyFileSync(path.join(root, 'native/pwa.js'), path.join(out, 'js/pwa.js'));
console.log('Native web assets built in dist/');
