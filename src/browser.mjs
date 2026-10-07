// Navegador headless controlado por el protocolo de DevTools (Chrome o Edge).
// Sin dependencias: usa el WebSocket nativo de Node 22+.
// Permite preparar la app antes de capturar: saltear onboarding, cargar datos, navegar.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findBrowser() {
  const b = process.env.DESIGNDIFF_BROWSER || BROWSERS.find((p) => fs.existsSync(p));
  if (!b) throw new Error('No encontré Chrome ni Edge. Indicá la ruta con DESIGNDIFF_BROWSER.');
  return b;
}

export async function openBrowser({ width = 430, height = 932, port = 9333 } = {}) {
  // Perfil vacío en cada apertura: la app arranca como para alguien nuevo.
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'designdiff-'));
  const proc = spawn(findBrowser(), [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) throw new Error('El navegador no respondió.');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });

  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;

  async function settle(ms = 1500) {
    for (let i = 0; i < 40; i++) {
      if ((await evaluate('document.readyState')) === 'complete') break;
      await sleep(250);
    }
    await sleep(ms); // animaciones de entrada
  }

  const page = {
    async goto(url) { await send('Page.navigate', { url }); await settle(); },
    evaluate,
    // Ejecuta un paso de preparación. Tipos: click, localStorage, eval, wait, goto.
    async step(s, base) {
      if (s.goto) return page.goto(new URL(s.goto, base).href);
      if (s.wait) return sleep(s.wait);
      if (s.localStorage) {
        await evaluate(`(() => { const d = ${JSON.stringify(s.localStorage)};
          for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); })()`);
        return page.goto(await evaluate('location.href'));
      }
      if (s.click) {
        const ok = await evaluate(`(() => {
          // Acepta varias alternativas: los textos cambian entre versiones de la app.
          const opts = [].concat(${JSON.stringify(s.click)}).map((t) => t.toLowerCase());
          const els = [...document.querySelectorAll('button, a, [role=button], [role=tab], label, summary')]
            .filter((e) => e.offsetParent !== null);
          let el;
          for (const t of opts) if ((el = els.find((e) => e.textContent.trim().toLowerCase().includes(t)))) break;
          if (el) { el.click(); return true; } return false; })()`);
        await settle(800);
        return ok;
      }
      if (s.eval) { await evaluate(s.eval); return settle(800); }
    },
    async screenshot(file) {
      // Congela animaciones y transiciones en su estado final: si no, dos capturas de la
      // misma pantalla pueden salir distintas solo por el cuadro de animación.
      await evaluate(`(() => { const s = document.createElement('style');
        s.textContent = '*,*::before,*::after{animation-delay:-9999s!important;animation-duration:1ms!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important}';
        document.head.appendChild(s); })()`);
      await sleep(150);
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
    },
    async close() {
      try { ws.close(); } catch {}
      proc.kill();
      await sleep(300);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    },
  };
  return page;
}
