'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('native bundle includes local runtime files and disables browser installation', () => {
  execFileSync(process.execPath, ['scripts/build-native.cjs'], { cwd: root });
  const config = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json')));
  assert.equal(config.webDir, 'dist');
  assert.equal(config.server, undefined, 'release must not load a remote server');
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const asset = match[1].split('?')[0];
    assert.ok(!/^https?:/.test(asset), 'entry assets must be bundled');
    assert.ok(fs.existsSync(path.join(root, 'dist', asset)), asset);
  }
  const nativePwa = fs.readFileSync(path.join(root, 'dist/js/pwa.js'), 'utf8');
  assert.doesNotMatch(nativePwa, /serviceWorker\.register/);
  assert.match(fs.readFileSync(path.join(root, 'js/pwa.js'), 'utf8'), /serviceWorker\.register/);
  assert.ok(!fs.existsSync(path.join(root, 'dist/sw.js')));
});
