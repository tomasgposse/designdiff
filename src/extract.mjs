#!/usr/bin/env node
// Paso 1: sesiones + git -> candidatos a "momento de criterio".
// Uso: node src/extract.mjs <ruta-del-proyecto> [--out carpeta] [--ref rama]
// La salida va a ~/.designdiff/<proyecto>, fuera de cualquier repo.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readSessions } from './adapters.mjs';
import { readCommits } from './git.mjs';
import { redact } from './redact.mjs';

const [projectDir, ...rest] = process.argv.slice(2);
if (!projectDir) {
  console.error('Uso: node src/extract.mjs <ruta-del-proyecto> [--out carpeta]');
  process.exit(1);
}
const name = path.basename(path.resolve(projectDir)).toLowerCase();
const outIdx = rest.indexOf('--out');
const outDir = path.resolve(outIdx >= 0 ? rest[outIdx + 1] : path.join(os.homedir(), '.designdiff', name));
fs.mkdirSync(outDir, { recursive: true });

// Mensajes que casi nunca son criterio: confirmaciones y operación.
const ACK = /^(ok|dale|listo|si|sí|sisi|ya|bien|genial|perfecto|guardado|entr[eé]|autorizado|ese|esto|hacelo|segu[ií]|continu[aá]|gracias)[\s.,!?]*/i;
const OPS = /\b(git (push|pull|commit)|vercel|deploy|terminal|npm|clave|api key|token|google cloud|instal)/i;
// Señales de decisión de diseño, producto o código.
const SIGNAL = [
  /\b(no|nono)\b[, ]/i, /\ben vez de\b/i, /\bmejor\b/i, /\bprefiero\b/i, /\bquiero\b/i,
  /\bque sea\b/i, /\bsac[aá]\b/i, /\bmenos\b/i, /\bcapaz\b/i, /\bdeber[ií]a\b/i,
  /\bpero\b/i, /\bigual\b/i, /\bse entiende\b/i, /\bla idea es\b/i, /\bonboarding\b/i,
  /\bexperiencia\b/i, /\busuari|\bgente\b|\bpersonas\b/i, /\bsimple|sencill|autom[aá]tic/i,
  /\bfijate\b/i, /\bimportante\b/i, /\bdetect/i, /\bse vea|no se ve|no se lee/i, /https?:\/\//i, /\bbug|se rompe|no funciona|no se puede\b/i,
];

const events = readSessions(projectDir);
const refIdx = rest.indexOf('--ref');
const commits = readCommits(projectDir, refIdx >= 0 ? rest[refIdx + 1] : 'HEAD');

const candidates = [];
events.forEach((e, i) => {
  if (e.role !== 'user') return;
  const words = e.text.split(/\s+/).length;
  const signals = SIGNAL.filter((re) => re.test(e.text)).length + (e.images ? 1 : 0);
  const isAck = ACK.test(e.text) && words <= 4;
  const isOps = OPS.test(e.text) && signals < 3;
  if (isAck || isOps || words < 6 || signals < 2) return;

  // Lo que la IA había propuesto justo antes: el "antes" de la decisión.
  const prev = events.slice(0, i).reverse().find((x) => x.role === 'assistant');
  const next = events.slice(i + 1).find((x) => x.role === 'assistant');
  candidates.push({
    id: `c${candidates.length + 1}`,
    ts: e.ts,
    source: e.source,
    session: e.session.slice(0, 8),
    signals,
    images: e.images,
    imagePaths: e.imagePaths || [],
    user: redact(e.text).slice(0, 1200),
    aiBefore: prev ? redact(prev.text).slice(0, 900) : null,
    aiAfter: next ? redact(next.text).slice(0, 600) : null,
  });
});

const stats = {
  project: name,
  sessions: new Set(events.map((e) => `${e.source}:${e.session}`)).size,
  sources: [...new Set(events.map((e) => e.source))],
  userMessages: events.filter((e) => e.role === 'user').length,
  candidates: candidates.length,
  commits: commits.length,
  from: events[0]?.ts,
  to: events.at(-1)?.ts,
};

fs.writeFileSync(path.join(outDir, 'candidates.json'), JSON.stringify({ stats, commits, candidates }, null, 2));
console.log(stats);
console.log(`-> ${path.join(outDir, 'candidates.json')}`);
