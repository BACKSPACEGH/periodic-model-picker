import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Load shared data module
await import(new URL('../shared/periodic-table-data.js', import.meta.url));
const DATA = globalThis.GeminiPeriodicTableData;

test('Periodic table contains all 118 unique IUPAC elements without grid collisions', () => {
  assert.ok(DATA, 'GeminiPeriodicTableData should be defined on globalThis');
  assert.equal(DATA.ELEMENTS.length, 118, 'Must contain exactly 118 elements');

  const seenZ = new Set();
  const seenSymbols = new Set();
  const seenCoords = new Set();

  for (const el of DATA.ELEMENTS) {
    assert.ok(el.z >= 1 && el.z <= 118, `Invalid atomic number: ${el.z}`);
    assert.ok(!seenZ.has(el.z), `Duplicate atomic number: ${el.z}`);
    assert.ok(!seenSymbols.has(el.symbol), `Duplicate symbol: ${el.symbol}`);
    seenZ.add(el.z);
    seenSymbols.add(el.symbol);

    const coordKey = `${el.row}:${el.col}`;
    assert.ok(!seenCoords.has(coordKey), `Grid coordinate collision at ${coordKey} (${el.symbol})`);
    seenCoords.add(coordKey);

    // Ensure Group 3 Periods 6 & 7 are reserved for 57-71 and 89-103 range markers
    assert.notEqual(coordKey, '6:3', 'Row 6 Col 3 is reserved for 57-71 range placeholder');
    assert.notEqual(coordKey, '7:3', 'Row 7 Col 3 is reserved for 89-103 range placeholder');
  }

  for (let z = 1; z <= 118; z++) {
    assert.ok(seenZ.has(z), `Missing atomic number ${z}`);
  }
});

test('Released Gemini 4 models match Hydrogen (1), Carbon (6), Neon (10), and Argon (18)', () => {
  const released = DATA.ELEMENTS.filter((e) => e.released);
  assert.equal(released.length, 4);
  assert.deepEqual(
    released.map((e) => e.symbol),
    ['H', 'C', 'Ne', 'Ar']
  );

  assert.equal(DATA.ELEMENTS_BY_SYMBOL.H.model.fullName, 'Gemini 4 Hydrogen');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.H.model.tagline, 'Everyday help');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.H.model.antigravityModelIds.XHigh, 'gemini-4-hydrogen-xhigh');

  assert.equal(DATA.ELEMENTS_BY_SYMBOL.C.model.fullName, 'Gemini 4 Carbon');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.C.model.tagline, 'Most complex work');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.C.model.antigravityModelIds.High, 'gemini-4-carbon-high');

  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ne.model.fullName, 'Gemini 4 Neon');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ne.model.tagline, 'Fast deep reasoning');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ne.model.theme, 'coral');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ne.model.antigravityModelIds.Low, 'gemini-4-neon-low');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ne.model.antigravityModelIds.Medium, 'gemini-4-neon-medium');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ne.model.antigravityModelIds.High, 'gemini-4-neon-high');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ne.model.antigravityModelIds.XHigh, 'gemini-4-neon-xhigh');

  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ar.model.fullName, 'Gemini 4 Argon');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ar.model.tagline, 'Code and analysis');
  assert.equal(DATA.ELEMENTS_BY_SYMBOL.Ar.model.antigravityModelIds.High, 'gemini-4-argon-high');

  assert.ok(
    DATA.DEFAULT_OTHER_MODELS_ANTIGRAVITY.some((m) => m.id === 'gemini-pro-orchestrator-neon'),
    'Antigravity footer should include Orchestrator (Neon)'
  );
});

test('Build artifacts, Chrome Extension manifest, Userscript, and Antigravity plugin manifests are valid', () => {
  const pluginJson = JSON.parse(readFileSync(join(ROOT, 'plugin.json'), 'utf8'));
  assert.equal(pluginJson.name, 'periodic-model-picker');
  assert.ok(existsSync(join(ROOT, pluginJson.logo)));

  const sidecarJson = JSON.parse(
    readFileSync(join(ROOT, 'sidecars', 'periodic-table', 'sidecar.json'), 'utf8')
  );
  assert.equal(sidecarJson.has_web_ui, true);
  assert.equal(sidecarJson.ui_config.views[0].entrypoint, 'SIDECAR_UI_ENTRYPOINT_AUX_PANE');

  const extManifest = JSON.parse(
    readFileSync(join(ROOT, 'chrome-extension', 'manifest.json'), 'utf8')
  );
  assert.equal(extManifest.manifest_version, 3);
  for (const size of ['16', '48', '128']) {
    const iconPath = join(ROOT, 'chrome-extension', extManifest.icons[size]);
    assert.ok(existsSync(iconPath), `Missing icon ${iconPath}`);
    const bytes = readFileSync(iconPath);
    assert.deepEqual([...bytes.subarray(0, 4)], [137, 80, 78, 71], 'Icon must have valid PNG magic header');
  }

  for (const synced of ['periodic-table-data.js', 'periodic-table-widget.js']) {
    assert.ok(existsSync(join(ROOT, 'chrome-extension', synced)));
    assert.ok(existsSync(join(ROOT, 'docs', synced)));
  }

  const userscript = readFileSync(
    join(ROOT, 'userscript', 'gemini-periodic-table.user.js'),
    'utf8'
  );
  assert.match(userscript, /\/\/ ==UserScript==/);
  assert.match(userscript, /@match\s+https:\/\/gemini\.google\.com\/\*/);
});

test('Sidecar HTTP server serves UI, shared assets, and preference APIs cleanly', async () => {
  const testPort = 18947;
  const proc = spawn(process.execPath, [join(ROOT, 'sidecars', 'periodic-table', 'server.mjs')], {
    env: { ...process.env, PORT: String(testPort), ANTIGRAVITY_SIDECAR_WEB_PORT: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Sidecar startup timed out')), 5000);
      proc.stdout.on('data', (chunk) => {
        if (String(chunk).includes('listening on')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      proc.once('exit', (code) => reject(new Error(`Sidecar exited early: ${code}`)));
    });

    const htmlRes = await fetch(`http://127.0.0.1:${testPort}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.match(html, /Where should we start\?/);

    const dataRes = await fetch(`http://127.0.0.1:${testPort}/periodic-table-data.js`);
    assert.equal(dataRes.status, 200);

    const prefsRes = await fetch(`http://127.0.0.1:${testPort}/api/preferences`);
    assert.equal(prefsRes.status, 200);
    const prefs = await prefsRes.json();
    assert.ok(prefs.selectedSymbol);
  } finally {
    proc.kill('SIGTERM');
  }
});
