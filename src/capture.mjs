#!/usr/bin/env node
// Paso opcional: levanta la app en cada commit con cambios de UI y captura sus pantallas.
// No toca el proyecto: usa un worktree aparte y reutiliza node_modules.
//
// Uso: node src/capture.mjs <ruta-del-proyecto> [--config archivo.json] [--ref origin/main] [--only hash1,hash2]
//
// La configuración (designdiff.json) dice qué pantallas capturar y cómo llegar a cada una:
// {
//   "size": [430, 932],
//   "screens": [
//     { "name": "inicio", "route": "/", "steps": [{ "click": "Explorar la app" }] },
//     { "name": "movimientos", "route": "/", "steps": [{ "click": "Explorar la app" }, { "click": "Movimientos" }] }
//   ]
// }
// Pasos posibles: { "click": "texto visible" } o { "click": ["texto nuevo", "texto viejo"] }, { "localStorage": { "clave": valor } },
// { "goto": "/ruta" }, { "wait": 1000 }, { "eval": "código JS" }.
// Si un paso no encuentra su botón (en versiones viejas puede no existir), se sigue igual.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { readCommits } from './git.mjs';
import { openBrowser } from './browser.mjs';

const [projectDir, ...rest] = process.argv.slice(2);
if (!projectDir) {
  console.error('Uso: node src/capture.mjs <ruta-del-proyecto> [--config archivo.json] [--ref rama] [--only hashes]');
  process.exit(1);
}
const arg = (k, d) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : d);
const name = path.basename(path.resolve(projectDir)).toLowerCase();
// Salida fuera de cualquier repo, para no commitear datos de las sesiones por error.
const outDir = path.resolve(arg('--out', path.join(os.homedir(), '.designdiff', name)));
const only = arg('--only', '').split(',').filter(Boolean);
const ref = arg('--ref', 'HEAD');

// Configuración: --config, o ~/.designdiff/<proyecto>/designdiff.json, o designdiff.json en el proyecto.
const configPath = [arg('--config'), path.join(outDir, 'designdiff.json'), path.join(projectDir, 'designdiff.json')]
  .find((p) => p && fs.existsSync(p));
const config = configPath ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
const [W, H] = config.size || [430, 932];
const screens = config.screens || [{ name: 'inicio', route: '/' }];
if (configPath) console.log(`Configuración: ${configPath}`);

const shotsDir = path.join(outDir, 'capturas');
const wtRoot = path.join(outDir, '.worktrees');
fs.mkdirSync(shotsDir, { recursive: true });
fs.mkdirSync(wtRoot, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (args) => execFileSync('git', args, { cwd: projectDir, stdio: 'pipe' });
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');

async function waitFor(url, ms = 120_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status < 500) return true; } catch {}
    await sleep(1000);
  }
  return false;
}

function stop(server) {
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' }); } catch {}
  } else {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
  }
}

const commits = readCommits(projectDir, ref).filter((c) =>
  only.length ? only.some((h) => c.hash.startsWith(h)) : c.uiFiles > 0,
);
const results = [];
const lastHash = {}; // por pantalla: para detectar capturas iguales a la anterior
let port = 4310;

for (const c of commits) {
  const wt = path.join(wtRoot, c.short);
  const entry = { hash: c.hash, short: c.short, shots: [], error: null };
  let server;
  try {
    if (!fs.existsSync(wt)) git(['worktree', 'add', '--detach', wt, c.hash]);
    const nm = path.join(wt, 'node_modules');
    if (!fs.existsSync(nm)) fs.symlinkSync(path.join(path.resolve(projectDir), 'node_modules'), nm, 'junction');
    const p = port++;
    // Sin variables de entorno sensibles: la app tiene que arrancar en su modo local o demo.
    const env = { ...process.env, PORT: String(p) };
    for (const k of Object.keys(env)) if (/SUPABASE|SECRET|KEY|TOKEN|PASSWORD|DATABASE/i.test(k)) delete env[k];
    // Build de producción: sin overlays de desarrollo. Si falla, cae a modo dev.
    let mode = 'start';
    if (!fs.existsSync(path.join(wt, '.next', 'BUILD_ID'))) try {
      execFileSync('npx next build --webpack', { cwd: wt, env: { ...env, NODE_ENV: 'production' }, shell: true, stdio: 'pipe', timeout: 300_000 });
    } catch { mode = 'dev'; }
    server = spawn(`npx next ${mode} ${mode === 'dev' ? '--webpack ' : ''}-p ${p}`, {
      cwd: wt, shell: true, detached: process.platform !== 'win32',
      env: { ...env, NODE_ENV: mode === 'start' ? 'production' : 'development' },
    });
    entry.mode = mode;
    let log = '';
    server.stdout.on('data', (d) => (log += d));
    server.stderr.on('data', (d) => (log += d));
    const base = `http://localhost:${p}`;
    if (!(await waitFor(base + (screens[0].route || '/')))) throw new Error(`no levantó:\n${log.slice(-800)}`);

    for (const s of screens) {
      // Navegador limpio por pantalla: cada una arranca como alguien que abre la app por primera vez.
      const page = await openBrowser({ width: W, height: H, port: 9333 });
      try {
        await page.goto(base + (s.route || '/'));
        const missed = [];
        for (const step of s.steps || []) if ((await page.step(step, base)) === false) missed.push(step.click);
        const file = path.join(shotsDir, `${c.short}-${s.name}.png`);
        await page.screenshot(file);
        const hash = md5(file);
        entry.shots.push({
          name: s.name,
          route: s.route || '/',
          file: path.relative(outDir, file).split(path.sep).join('/'),
          hash,
          sameAsPrevious: lastHash[s.name] === hash,
          missedSteps: missed,
        });
        lastHash[s.name] = hash;
      } finally {
        await page.close();
      }
    }
  } catch (e) {
    entry.error = String(e.message || e).slice(0, 400);
  } finally {
    if (server) stop(server);
  }
  const same = entry.shots.filter((s) => s.sameAsPrevious).length;
  console.log(c.short, entry.error ? `✗ ${entry.error.split('\n')[0]}` : `✓ ${entry.shots.length} capturas${same ? ` (${same} sin cambios)` : ''}`);
  results.push(entry);
}

fs.writeFileSync(path.join(outDir, 'capturas.json'), JSON.stringify(results, null, 2));
