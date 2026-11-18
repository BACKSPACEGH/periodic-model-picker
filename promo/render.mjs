import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROMO_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(PROMO_DIR, '..');
const SCRATCH = '/Users/gzh/.gemini/antigravity/brain/a5bf36ab-99e3-44a0-a5bb-14e2500cf28e/scratch/promo_build';
const FRAMES_DIR = join(SCRATCH, 'frames');
const PREVIEW_DIR = join(SCRATCH, 'preview');

const isPreview = process.argv.includes('--preview');
const FPS = 60;
const DURATION = (31 * 4 * 60) / 124; // 60.0s exact (31 bars @ 124 BPM)
const TOTAL_FRAMES = Math.round(DURATION * FPS); // 3600

mkdirSync(FRAMES_DIR, { recursive: true });
mkdirSync(PREVIEW_DIR, { recursive: true });

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const COVER_OUT = join(PROMO_DIR, 'Model-Periodic-Table-Cover.png');
const MP4_OUT = join(PROMO_DIR, 'Model-Periodic-Table-v1.0.0-Promo.mp4');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const htmlRaw = readFileSync(join(PROMO_DIR, 'promo-canvas.html'), 'utf8');
const dataJs = readFileSync(join(ROOT, 'shared', 'periodic-table-data.js'), 'utf8');

const driverScript = isPreview
  ? `
<script>
(async () => {
  const c = document.getElementById('stage');
  await document.fonts.ready;
  window.renderCoverFrame();
  const coverBlob = await new Promise(r => c.toBlob(r, 'image/png'));
  await fetch('/cover', { method: 'POST', body: coverBlob });

  const times = [1.0, 6.8, 17.2, 24.9, 29.2, 45.2, 50.2, 54.4];
  for (let i = 0; i < times.length; i++) {
    window.renderPromoFrame(times[i]);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.96));
    await fetch('/preview?idx=' + i, { method: 'POST', body: b });
  }
  await fetch('/done');
})();
</script>`
  : `
<script>
(async () => {
  const c = document.getElementById('stage');
  await document.fonts.ready;
  window.renderCoverFrame();
  const coverBlob = await new Promise(r => c.toBlob(r, 'image/png'));
  await fetch('/cover', { method: 'POST', body: coverBlob });

  const total = ${TOTAL_FRAMES};
  const fps = ${FPS};
  for (let i = 0; i < total; i++) {
    window.renderPromoFrame(i / fps);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.95));
    await fetch('/frame?idx=' + i, { method: 'POST', body: b });
  }
  await fetch('/done');
})();
</script>`;

const htmlInjected = htmlRaw.replace('</body>', `${driverScript}\n</body>`);

await new Promise((resolve, reject) => {
  let chromeProc = null;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlInjected);
      } else if (url.pathname === '/shared/periodic-table-data.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(dataJs);
      } else if (url.pathname === '/cover') {
        const buf = await readBody(req);
        writeFileSync(COVER_OUT, buf);
        console.log(`[render] Saved cover -> ${COVER_OUT} (${buf.length} bytes)`);
        res.writeHead(200);
        res.end('ok');
      } else if (url.pathname === '/preview') {
        const idx = Number(url.searchParams.get('idx'));
        const buf = await readBody(req);
        const p = join(PREVIEW_DIR, `preview_${idx}.jpg`);
        writeFileSync(p, buf);
        res.writeHead(200);
        res.end('ok');
      } else if (url.pathname === '/frame') {
        const idx = Number(url.searchParams.get('idx'));
        const buf = await readBody(req);
        const p = join(FRAMES_DIR, `frame_${String(idx).padStart(5, '0')}.jpg`);
        writeFileSync(p, buf);
        if (idx % 300 === 0 || idx === TOTAL_FRAMES - 1) {
          console.log(`[render] Frame ${idx + 1} / ${TOTAL_FRAMES}`);
        }
        res.writeHead(200);
        res.end('ok');
      } else if (url.pathname === '/done') {
        res.writeHead(200);
        res.end('done');
        if (chromeProc) chromeProc.kill();
        server.close(() => resolve());
      } else {
        res.writeHead(404);
        res.end('not found');
      }
    } catch (err) {
      reject(err);
    }
  });

  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    const profileDir = join(SCRATCH, 'chrome_profile');
    mkdirSync(profileDir, { recursive: true });
    chromeProc = spawn(
      CHROME_BIN,
      [
        '--headless=new',
        '--disable-gpu-vsync',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${profileDir}`,
        `http://127.0.0.1:${port}/?capture=1`,
      ],
      { stdio: 'ignore' }
    );
  });
});

if (!isPreview) {
  const binPath = join(SCRATCH, 'encode_video');
  const wavPath = join(SCRATCH, 'track.wav');
  const m4aPath = join(SCRATCH, 'track.m4a');

  console.log('[encode] Compiling native Swift VideoToolbox + DSP encoder...');
  execFileSync('swiftc', ['-O', join(PROMO_DIR, 'encode_video.swift'), '-o', binPath], { stdio: 'inherit' });

  console.log('[encode] Synthesizing 124 BPM Nu-Disco stereo soundtrack + UI SFX...');
  execFileSync(binPath, ['audio', wavPath, String(DURATION)], { stdio: 'inherit' });

  console.log('[encode] Encoding 192 kbps AAC audio via macOS CoreAudio...');
  rmSync(m4aPath, { force: true });
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '192000', wavPath, m4aPath], { stdio: 'inherit' });

  console.log('[encode] Hardware-encoding 1080p 60fps H.264 MP4 + muxing audio...');
  execFileSync(binPath, ['mux', FRAMES_DIR, String(TOTAL_FRAMES), String(FPS), m4aPath, MP4_OUT], { stdio: 'inherit' });

  // Clean up temporary raw frames
  rmSync(FRAMES_DIR, { recursive: true, force: true });
  console.log(`[done] Final video ready: ${MP4_OUT}`);
}
