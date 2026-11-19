/**
 * Zero-dependency build & sync script:
 * 1. Copies `shared/periodic-table-data.js` and `shared/periodic-table-widget.js`
 *    into `chrome-extension/` and `docs/`.
 * 2. Generates single-file `userscript/gemini-periodic-table.user.js`.
 * 3. Generates PNG icons (`16`, `48`, `128`) in `chrome-extension/icons/`.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = join(ROOT, 'shared');
const EXT = join(ROOT, 'chrome-extension');
const DOCS = join(ROOT, 'docs');
const USERSCRIPT_DIR = join(ROOT, 'userscript');
const ICONS_DIR = join(EXT, 'icons');

mkdirSync(EXT, { recursive: true });
mkdirSync(DOCS, { recursive: true });
mkdirSync(USERSCRIPT_DIR, { recursive: true });
mkdirSync(ICONS_DIR, { recursive: true });

// 1. Sync shared modules
for (const file of ['periodic-table-data.js', 'periodic-table-widget.js']) {
  copyFileSync(join(SHARED, file), join(EXT, file));
  copyFileSync(join(SHARED, file), join(DOCS, file));
}
console.log('[build] Synced shared modules to chrome-extension/ and docs/');

// 2. Build single-file Tampermonkey / Violentmonkey Userscript
const dataCode = readFileSync(join(SHARED, 'periodic-table-data.js'), 'utf8');
const widgetCode = readFileSync(join(SHARED, 'periodic-table-widget.js'), 'utf8');
const contentCode = readFileSync(join(EXT, 'content.js'), 'utf8');

const userscriptHeader = `// ==UserScript==
// @name         Gemini Model Periodic Table
// @namespace    https://github.com/BACKSPACEGH/periodic-model-picker
// @version      1.1.0
// @author       Meow
// @description  Select Gemini 4 models (Hydrogen, Carbon, Neon, Argon + Thinking levels) on an interactive 118-element Periodic Table!
// @match        https://gemini.google.com/*
// @downloadURL  https://raw.githubusercontent.com/BACKSPACEGH/periodic-model-picker/main/userscript/gemini-periodic-table.user.js
// @updateURL    https://raw.githubusercontent.com/BACKSPACEGH/periodic-model-picker/main/userscript/gemini-periodic-table.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

`;

writeFileSync(
  join(USERSCRIPT_DIR, 'gemini-periodic-table.user.js'),
  userscriptHeader + dataCode + '\n' + widgetCode + '\n' + contentCode,
  'utf8'
);
console.log('[build] Built userscript/gemini-periodic-table.user.js');

// 3. Generate PNG icons for Chrome Extension
function generateIconsWithSwift(svgPath) {
  const swiftCode = `
import AppKit
let svgURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outDir = CommandLine.arguments[2]
guard let image = NSImage(contentsOf: svgURL) else { exit(1) }
for size in [16, 48, 128] {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  )!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  NSGraphicsContext.current?.imageInterpolation = .high
  image.draw(in: NSRect(x: 0, y: 0, width: size, height: size))
  NSGraphicsContext.restoreGraphicsState()
  if let png = rep.representation(using: .png, properties: [:]) {
    try png.write(to: URL(fileURLWithPath: "\\(outDir)/icon\\(size).png"))
  }
}
`;
  execFileSync('swift', ['-e', swiftCode, svgPath, ICONS_DIR], { stdio: 'ignore' });
}

// Pure Node.js fallback PNG generator so builds also succeed on Linux/Windows without Swift
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([len, name, data, crc]);
}

function writeFallbackPng(size, filepath) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const nx = x / size;
      const ny = y / size;
      const margin = 0.08;
      if (nx < margin || nx > 1 - margin || ny < margin || ny > 1 - margin) {
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
      } else if (nx < 0.5 && ny < 0.5) {
        // Blue H quadrant
        raw[px] = 45;
        raw[px + 1] = 105;
        raw[px + 2] = 200;
        raw[px + 3] = 255;
      } else if (nx < 0.5 && ny >= 0.5) {
        // Purple C quadrant
        raw[px] = 126;
        raw[px + 1] = 68;
        raw[px + 2] = 196;
        raw[px + 3] = 255;
      } else if (nx >= 0.5 && ny >= 0.5) {
        // Teal Ar quadrant
        raw[px] = 32;
        raw[px + 1] = 164;
        raw[px + 2] = 150;
        raw[px + 3] = 255;
      } else {
        // Warm coral Ne quadrant
        raw[px] = 234;
        raw[px + 1] = 108;
        raw[px + 2] = 44;
        raw[px + 3] = 255;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(filepath, png);
}

const svgPath = join(ROOT, 'assets', 'logo.svg');
try {
  if (process.platform === 'darwin' && existsSync(svgPath)) {
    generateIconsWithSwift(svgPath);
    console.log('[build] Rendered high-DPI PNG icons from assets/logo.svg');
  } else {
    throw new Error('Use pure Node fallback');
  }
} catch {
  for (const sz of [16, 48, 128]) {
    writeFallbackPng(sz, join(ICONS_DIR, `icon${sz}.png`));
  }
  console.log('[build] Generated fallback PNG icons');
}
