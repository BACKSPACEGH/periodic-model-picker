/**
 * Installs / updates the Antigravity plugin into `~/.gemini/config/plugins/periodic-model-picker`.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(homedir(), '.gemini', 'config', 'plugins', 'periodic-model-picker');

rmSync(TARGET, { recursive: true, force: true });
mkdirSync(TARGET, { recursive: true });

for (const item of ['plugin.json', 'assets', 'shared', 'sidecars', 'skills']) {
  cpSync(join(ROOT, item), join(TARGET, item), { recursive: true });
}

console.log(`[install] Installed Antigravity plugin to: ${TARGET}`);
