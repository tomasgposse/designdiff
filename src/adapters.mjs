// Lectores de sesiones de agentes. Cada adaptador devuelve eventos normalizados:
// { ts, source, session, role: 'user' | 'assistant', text }
// El formato de las sesiones no está documentado oficialmente: si cambia, se arregla acá.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const norm = (p) => path.resolve(p).toLowerCase().replace(/[\\/]+$/, '');

function readJsonl(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* línea rota: se ignora */ }
  }
  return out;
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

// Claude Code: ~/.claude/projects/<ruta-con-guiones>/<session>.jsonl
export function readClaudeCode(projectDir, home = os.homedir()) {
  const slug = path.resolve(projectDir).replace(/[:\\/ ]/g, '-');
  const dir = path.join(home, '.claude', 'projects', slug);
  const events = [];
  for (const file of walk(dir, '.jsonl')) {
    if (file.includes(`${path.sep}subagents${path.sep}`)) continue;
    const session = path.basename(file, '.jsonl');
    for (const d of readJsonl(file)) {
      if (d.isMeta || d.isSidechain) continue;
      if (d.type !== 'user' && d.type !== 'assistant') continue;
      const c = d.message?.content;
      let text = '';
      let images = 0;
      if (typeof c === 'string') text = c;
      else if (Array.isArray(c)) {
        text = c.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
        images = c.filter((x) => x.type === 'image').length;
      }
      text = text.trim();
      if (!text) continue;
      // Ruido del harness: expansiones de skills, recordatorios, comandos.
      if (/^(Base directory for this skill|<|\[Image|Caveat:)/.test(text)) continue;
      events.push({ ts: d.timestamp, source: 'claude-code', session, role: d.type, text, images });
    }
  }
  return events;
}

// Codex: ~/.codex/sessions/AAAA/MM/DD/rollout-*.jsonl, filtrado por cwd del proyecto.
export function readCodex(projectDir, home = os.homedir()) {
  const dir = path.join(home, '.codex', 'sessions');
  const target = norm(projectDir);
  const events = [];
  for (const file of walk(dir, '.jsonl')) {
    const rows = readJsonl(file);
    const meta = rows.find((r) => r.type === 'session_meta')?.payload;
    if (!meta || !meta.cwd || norm(meta.cwd) !== target) continue;
    if (meta.source?.subagent) continue; // revisores internos, no la conversación
    const session = meta.id || path.basename(file, '.jsonl');
    for (const d of rows) {
      const p = d.payload;
      if (d.type !== 'response_item' || p?.type !== 'message') continue;
      if (p.role !== 'user' && p.role !== 'assistant') continue;
      let text = (p.content || [])
        .map((x) => x.text || '')
        .join('\n')
        .trim();
      // Con adjuntos, Codex envuelve el pedido: nos quedamos con "My request".
      const req = text.match(/## My request:\s*([\s\S]*?)(?:<image|$)/);
      const imagePaths = [...text.matchAll(/<image [^>]*path="([^"]+)"/g)].map((m) => m[1]);
      const images = imagePaths.length;
      if (req) text = req[1].trim();
      if (!text || text.startsWith('<') || text.startsWith('# AGENTS.md')) continue;
      events.push({ ts: d.timestamp, source: 'codex', session, role: p.role, text, images, imagePaths });
    }
  }
  return events;
}

export function readSessions(projectDir) {
  return [...readCodex(projectDir), ...readClaudeCode(projectDir)].sort((a, b) =>
    a.ts < b.ts ? -1 : 1,
  );
}
