import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = join(HERE, '..', '..', 'shared');

const DATA_DIR =
  process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR ||
  join(
    process.env.ANTIGRAVITY_APP_DATA_DIR || join(homedir(), '.gemini', 'antigravity'),
    'sidecar_data',
    'periodic-model-picker',
    'periodic-table'
  );

const PREFS_PATH = join(DATA_DIR, 'preferences.json');

function readPrefs() {
  try {
    if (existsSync(PREFS_PATH)) {
      return JSON.parse(readFileSync(PREFS_PATH, 'utf8'));
    }
  } catch {
    // Ignore malformed preferences file
  }
  return {
    selectedType: 'element',
    selectedSymbol: 'C',
    olderModelId: null,
    thinkingBySymbol: { H: 'Medium', C: 'High', Ar: 'High' },
  };
}

function writePrefs(next) {
  const current = readPrefs();
  const merged = {
    selectedType: next?.selectedType === 'older' ? 'older' : 'element',
    selectedSymbol:
      typeof next?.selectedSymbol === 'string'
        ? next.selectedSymbol.slice(0, 4)
        : current.selectedSymbol,
    olderModelId:
      typeof next?.olderModelId === 'string' ? next.olderModelId.slice(0, 80) : null,
    thinkingBySymbol: {
      ...current.thinkingBySymbol,
      ...(next?.thinkingBySymbol && typeof next.thinkingBySymbol === 'object'
        ? next.thinkingBySymbol
        : {}),
    },
  };
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PREFS_PATH, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

async function resolveSidecarSdk() {
  try {
    return await import('sidecar_sdk');
  } catch {
    try {
      const req = createRequire(import.meta.url);
      return await import(pathToFileURL(req.resolve('sidecar_sdk')).href);
    } catch {
      const candidates = [
        join(homedir(), '.gemini', 'antigravity', 'lib', 'node_modules', 'sidecar_sdk', 'index.mjs'),
        join(homedir(), '.gemini', 'antigravity-ide', 'lib', 'node_modules', 'sidecar_sdk', 'index.mjs'),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return import(pathToFileURL(candidate).href);
        }
      }
      return null;
    }
  }
}

function runAgentApi(args, projectId) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (projectId) env.ANTIGRAVITY_PROJECT_ID = projectId;
    const exe = process.env.ANTIGRAVITY_AGENTAPI_EXE;
    const file = exe || 'agentapi';
    const execArgs = exe ? ['agentapi', ...args] : args;
    execFile(file, execArgs, { encoding: 'utf8', env, timeout: 20000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr?.trim() || err.message));
        return;
      }
      const trimmed = (stdout || '').trim();
      try {
        resolve(trimmed ? JSON.parse(trimmed) : { ok: true });
      } catch {
        resolve({ ok: true, raw: trimmed });
      }
    });
  });
}

function readSharedOrLocal(filename) {
  const sharedFile = join(SHARED_DIR, filename);
  if (existsSync(sharedFile)) return readFileSync(sharedFile, 'utf8');
  return readFileSync(join(HERE, filename), 'utf8');
}

async function startSidecarMode() {
  const sdk = await resolveSidecarSdk();
  if (sdk?.SidecarApp && sdk?.Response) {
    const { SidecarApp, Response } = sdk;
    const app = new SidecarApp();

    app.page(
      '/',
      () =>
        new Response(readFileSync(join(HERE, 'index.html'), 'utf8'), {
          contentType: 'text/html; charset=utf-8',
          headers: { 'Cache-Control': 'no-store' },
        })
    );
    app.page(
      '/periodic-table-data.js',
      () =>
        new Response(readSharedOrLocal('periodic-table-data.js'), {
          contentType: 'application/javascript; charset=utf-8',
          headers: { 'Cache-Control': 'no-store' },
        })
    );
    app.page(
      '/periodic-table-widget.js',
      () =>
        new Response(readSharedOrLocal('periodic-table-widget.js'), {
          contentType: 'application/javascript; charset=utf-8',
          headers: { 'Cache-Control': 'no-store' },
        })
    );

    app.api('/api/preferences', () => readPrefs(), 'GET');
    app.api('/api/preferences', (data) => writePrefs(data), 'POST');

    // Explicit model-aware conversation launcher wrapping official agentapi CLI
    app.api(
      '/api/launch-model-chat',
      async (data) => {
        const model = String(data?.model || 'gemini-4-carbon-high').trim();
        const prompt = String(data?.message || '').trim();
        if (!prompt) {
          return new Response(JSON.stringify({ error: 'Prompt message is required.' }), {
            status: 400,
            contentType: 'application/json',
          });
        }
        const args = ['new-conversation', `--model=${model}`];
        if (data?.title) {
          args.push(`--title=${String(data.title).slice(0, 80)}`);
        }
        args.push(prompt);
        return runAgentApi(args, data?.projectId || process.env.ANTIGRAVITY_PROJECT_ID);
      },
      'POST'
    );

    await app.run();
    for (const sig of ['SIGINT', 'SIGTERM']) {
      process.once(sig, () => {
        app.close().finally(() => process.exit(0));
      });
    }
    return;
  }

  // Fallback HTTP server when running standalone preview or without sidecar_sdk
  startStandaloneServer(Number(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT || process.env.PORT || 17940));
}

function startStandaloneServer(port) {
  const token = process.env.ANTIGRAVITY_SIDECAR_UI_TOKEN || '';

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(join(HERE, 'index.html'), 'utf8'));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/preload.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end('// Standalone preview mode: window.sidecar not injected by host.\n');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/periodic-table-data.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(readSharedOrLocal('periodic-table-data.js'));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/periodic-table-widget.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(readSharedOrLocal('periodic-table-widget.js'));
      return;
    }

    if (req.method !== 'GET' && token) {
      const provided = req.headers['x-sidecar-token'] || url.searchParams.get('token');
      if (provided !== token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
    }

    if (url.pathname === '/api/preferences') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(readPrefs()));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(writePrefs(body ? JSON.parse(body) : {})));
        return;
      }
    }

    if (url.pathname === '/api/launch-model-chat' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = body ? JSON.parse(body) : {};
      try {
        const result = await runAgentApi(
          ['new-conversation', `--model=${data.model || 'gemini-4-carbon-high'}`, String(data.message || '')],
          data.projectId
        );
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            previewMode: true,
            model: data.model,
            note: `Preview mode (outside Antigravity host): selected ${data.model}`,
            detail: err.message,
          })
        );
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[Model Periodic Table] listening on http://127.0.0.1:${server.address().port}`);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.once(sig, () => {
      server.close(() => process.exit(0));
    });
  }
}

if (process.env.ANTIGRAVITY_SIDECAR_WEB_PORT) {
  startSidecarMode();
} else {
  startStandaloneServer(Number(process.env.PORT || 17940));
}
