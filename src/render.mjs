#!/usr/bin/env node
// Paso final: momentos curados + commits + capturas -> proceso.html.
// Uso: node src/render.mjs ~/.designdiff/<proyecto>
// Los marcos de análisis (move, phase, hat, criteria) están explicados en docs/teoria.md.

import fs from 'node:fs';
import path from 'node:path';
import { diffPercent } from './png.mjs';

const dir = path.resolve(process.argv[2] || '.');
const read = (f, d) => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : d);
const { commits } = read('candidates.json', { commits: [] });
const { project, summary, lang: rawLang, moments: rawMoments } = read('moments.json', { moments: [] });
const captures = read('capturas.json', []);
const config = read('designdiff.json', {});

// --- Idioma de la página: el de moments.json ("lang"), inglés por defecto ---
const STRINGS = {
  en: {
    week: 'Week', decisions: 'decisions', commits: 'commits', captures: 'screenshots', firstVersion: 'First version', today: 'Today',
    before: 'Before', after: 'After', unchanged: 'the screen did not change from the previous version',
    screensIn: 'Screens in', codeIn: 'Code in', file: 'file', files: 'files',
    direction: 'My direction', ai: 'What the AI did', decision: 'My decision',
    reframe: 'Reframe', adjust: 'Adjustment',
    prev: 'Previous', next: 'Next', changed: (p) => `${Math.round(p)}% changed`,
    evoLabel: '01 — Evolution', evoTitle: 'How each screen changed',
    evoSub: (k, n) => `${k} changes across ${n} versions. Only the versions where the screen changed are shown.`,
    readLabel: '02 — Reading', readTitle: 'How it was thought through',
    momentsLabel: '03 — Decisions', momentsTitle: 'My direction, the AI’s execution and my judgment',
    criteria: 'Repeated criteria', hats: 'Thinking modes',
    diamond: 'Path through the Double Diamond · each dot is a decision, in order · large dots are reframes',
    method: 'Classified with design rationale, reflective practice, the Double Diamond and the Six Thinking Hats. See docs/teoria.md.',
    footer: 'Generated with designdiff from AI agent sessions and git history.',
    rDirected: (d, n) => `In <b>${d} of ${n}</b> decisions the direction came from me before the AI acted: the AI built and proposed options, and I chose or corrected.`,
    rCriteria: (c, k, n) => `The criterion that repeats the most is <b>${c}</b>: it shows up in ${k} of ${n} decisions.`,
    rMoves: (r, a) => `${r === 1 ? 'One decision changed' : `${r} decisions changed`} the problem being solved. ${a} improved the solution.`,
    rHat: (h, k, n) => `The most present thinking mode is <b>${h}</b> (${k} of ${n}).`,
    rNoData: 'No decision relied mainly on data: a good place to add research.',
    rNoDiscover: 'There are no discovery decisions: the project started from the solution.',
    rBacks: (b) => `The process went back ${b} ${b === 1 ? 'time' : 'times'} in the Double Diamond.`,
    hats: { blanco: 'Data', rojo: 'Intuition', negro: 'Risk', amarillo: 'Value', verde: 'Alternatives', azul: 'Process' },
    phases: { descubrir: 'Discover', definir: 'Define', desarrollar: 'Develop', entregar: 'Deliver' },
  },
  es: {
    week: 'Semana', decisions: 'decisiones', commits: 'commits', captures: 'capturas', firstVersion: 'Primera versión', today: 'Hoy',
    before: 'Antes', after: 'Después', unchanged: 'la pantalla no cambió respecto de la versión anterior',
    screensIn: 'Pantallas en', codeIn: 'Código en', file: 'archivo', files: 'archivos',
    direction: 'Mi dirección', ai: 'Lo que hizo la IA', decision: 'Mi decisión',
    reframe: 'Reencuadre', adjust: 'Ajuste',
    prev: 'Anterior', next: 'Siguiente', changed: (p) => `cambió ${Math.round(p)}%`,
    evoLabel: '01 — Evolución', evoTitle: 'Cómo cambió cada pantalla',
    evoSub: (k, n) => `${k} cambios en ${n} versiones. Solo se muestran las versiones donde la pantalla cambió.`,
    readLabel: '02 — Lectura', readTitle: 'Cómo se pensó',
    momentsLabel: '03 — Decisiones', momentsTitle: 'Mi dirección, la ejecución de la IA y mi criterio',
    criteria: 'Criterios que se repiten', hats: 'Modos de pensamiento',
    diamond: 'Recorrido por el doble diamante · cada punto es una decisión, en orden · los grandes son reencuadres',
    method: 'Clasificación según design rationale, práctica reflexiva, doble diamante y seis sombreros. Ver docs/teoria.md.',
    footer: 'Generado con designdiff a partir de sesiones con agentes de IA y del historial de git.',
    rDirected: (d, n) => `En <b>${d} de ${n}</b> decisiones la dirección salió de mí antes de que la IA actuara: la IA construyó y propuso opciones, y yo elegí o corregí.`,
    rCriteria: (c, k, n) => `El criterio que más se repite es <b>${c}</b>: aparece en ${k} de ${n} decisiones.`,
    rMoves: (r, a) => `${r === 1 ? 'Una decisión cambió' : `${r} decisiones cambiaron`} el problema que se estaba resolviendo. ${a} mejoraron la solución.`,
    rHat: (h, k, n) => `El modo de pensamiento más presente es <b>${h}</b> (${k} de ${n}).`,
    rNoData: 'Ninguna decisión se apoyó principalmente en datos: es un buen lugar para sumar investigación.',
    rNoDiscover: 'No hay decisiones de descubrimiento: el proyecto arrancó desde la solución.',
    rBacks: (b) => `El proceso volvió hacia atrás ${b} ${b === 1 ? 'vez' : 'veces'} en el doble diamante.`,
    hats: { blanco: 'Datos', rojo: 'Intuición', negro: 'Riesgo', amarillo: 'Valor', verde: 'Alternativas', azul: 'Proceso' },
    phases: { descubrir: 'Descubrir', definir: 'Definir', desarrollar: 'Desarrollar', entregar: 'Entregar' },
  },
};
const lang = STRINGS[String(rawLang || 'en').slice(0, 2).toLowerCase()] ? String(rawLang).slice(0, 2).toLowerCase() : 'en';
const T = STRINGS[lang];

// Los valores de los marcos se aceptan en inglés o en español.
const ALIAS = {
  reframe: 'reencuadre', adjustment: 'ajuste', adjust: 'ajuste',
  discover: 'descubrir', define: 'definir', develop: 'desarrollar', deliver: 'entregar',
  white: 'blanco', red: 'rojo', black: 'negro', yellow: 'amarillo', green: 'verde', blue: 'azul',
};
const norm = (v) => (v ? ALIAS[String(v).toLowerCase()] || String(v).toLowerCase() : v);
const moments = rawMoments.map((m) => ({ ...m, move: norm(m.move), phase: norm(m.phase), hat: norm(m.hat) }));

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Sin fechas exactas: semanas desde el primer commit y versiones numeradas.
const start = new Date(commits[0]?.ts || Date.now()).getTime();
const week = (iso) => `${T.week} ${Math.max(1, Math.floor((new Date(iso).getTime() - start) / 6048e5) + 1)}`;

// --- Vocabulario de los marcos (docs/teoria.md) ---
const HAT_COLORS = { blanco: '#e9e9e9', rojo: '#ff5a4e', negro: '#5c5c5c', amarillo: '#ffc93d', verde: '#3fd17a', azul: '#4d8dff' };
const HATS = Object.fromEntries(Object.entries(HAT_COLORS).map(([k, color]) => [k, { label: T.hats[k], color }]));
const PHASES = ['descubrir', 'definir', 'desarrollar', 'entregar'];
const PHASE_LABEL = T.phases;

// --- Capturas ---
// Compatibilidad: capturas viejas sin nombre de pantalla se tratan como "inicio".
const entryOf = (short) => captures.find((x) => x.short === short && x.shots?.length);
const shot = (short, screen) => entryOf(short)?.shots.find((s) => (s.name || 'inicio') === screen) || null;
const screenNames = config.screens?.map((s) => s.name) || [...new Set(captures.flatMap((c) => c.shots.map((s) => s.name || 'inicio')))];
const mainScreen = config.strip || (screenNames.includes('inicio') ? 'inicio' : screenNames[0]);

function linkCommit(m) {
  if (m.commit) return commits.find((c) => c.short === m.commit || c.hash.startsWith(m.commit));
  const t = new Date(m.at).getTime();
  return commits.find((c) => new Date(c.ts).getTime() >= t);
}
// Cambio visual real entre dos capturas, en % de la pantalla. Por debajo del umbral
// es ruido (codificación, una animación capturada en otro cuadro) y no cuenta como cambio.
const MIN_CHANGE = config.minChange ?? 1.5;
const diffCache = new Map();
function change(a, b) {
  if (a.hash && a.hash === b.hash) return 0;
  const key = `${a.file}|${b.file}`;
  if (!diffCache.has(key)) {
    try { diffCache.set(key, diffPercent(path.join(dir, a.file), path.join(dir, b.file))); }
    catch { diffCache.set(key, 100); }
  }
  return diffCache.get(key);
}
// "Antes": la última captura de esa pantalla que se vea distinta a la de "después".
function beforeShot(commit, screen, after) {
  const i = commits.findIndex((c) => c.hash === commit.hash);
  for (let j = i - 1; j >= 0; j--) {
    const s = shot(commits[j].short, screen);
    if (s && change(s, after) >= MIN_CHANGE) return { commit: commits[j], shot: s };
  }
  return null;
}
// Si la versión inmediata anterior se ve igual, la decisión no cambió esta pantalla.
function prevShot(commit, screen) {
  const i = commits.findIndex((c) => c.hash === commit.hash);
  for (let j = i - 1; j >= 0; j--) {
    const s = shot(commits[j].short, screen);
    if (s) return s;
  }
  return null;
}

const shotCommits = commits.filter((c) => entryOf(c.short));
const verOf = (c) => `v${String(shotCommits.indexOf(c) + 1).padStart(2, '0')}`;
const img = (s, alt, cls = '') => `<img class="${cls}" src="${esc(s.file)}" alt="${esc(alt)}" decoding="async">`;

// --- Momentos ---
const items = moments.map((m, i) => {
  const c = linkCommit(m);
  const screen = m.screen || mainScreen;
  const after = c && shot(c.short, screen);
  const immediate = after && prevShot(c, screen);
  const changedHere = after && (!immediate || change(immediate, after) >= MIN_CHANGE);
  const prev = changedHere && beforeShot(c, screen, after);
  const changed = m.visual !== false && after && prev;
  const hat = HATS[m.hat];

  const stage = changed
    ? `<div class="stage">
        <figure>${img(prev.shot, `${screen}, ${T.before}, ${verOf(prev.commit)}`)}<figcaption>${T.before} · ${verOf(prev.commit)}</figcaption></figure>
        <span class="arrow" aria-hidden="true">→</span>
        <figure>${img(after, `${screen}, ${T.after}, ${verOf(c)}`)}<figcaption>${T.after} · ${verOf(c)}</figcaption></figure>
      </div>`
    : after && m.visual !== false
      ? `<div class="stage single"><figure>${img(after, `${screen}, ${verOf(c)}`)}<figcaption>${esc(screen)} · ${verOf(c)} · ${T.unchanged}</figcaption></figure></div>`
      : '';

  // Todas las pantallas de ese commit, a la vista.
  const others = c ? (entryOf(c.short)?.shots || []).filter((s) => !(changed || (after && m.visual !== false)) || s.name !== screen) : [];
  const gallery = others.length
    ? `<div class="gallery"><p class="label">${T.screensIn} ${verOf(c)}</p><div class="row">${others.map((s) => `<figure>${img(s, `${s.name}, ${verOf(c)}`)}<figcaption>${esc(s.name || 'inicio')}</figcaption></figure>`).join('')}</div></div>`
    : '';

  const code = c?.top?.length
    ? `<div class="code"><p class="label">${T.codeIn} ${shotCommits.includes(c) ? verOf(c) : c.short} · ${c.files} ${c.files === 1 ? T.file : T.files} · <span class="add">+${c.add}</span> <span class="del">−${c.del}</span></p>
        <ul>${c.top.map((f) => `<li><span class="file">${esc(f.path)}</span><span class="add">+${f.add}</span><span class="del">−${f.del}</span></li>`).join('')}</ul></div>`
    : '';

  return `<article class="moment" id="m${i + 1}">
    <div class="text">
      <p class="mono head"><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(m.kind)}</span><span>${week(m.at)}</span></p>
      ${m.question ? `<p class="question">${esc(m.question)}</p>` : ''}
      <h2>${esc(m.title)}</h2>
      <blockquote>“${esc(m.quote)}”</blockquote>
      <ol class="flow">
        ${m.direction ? `<li class="me-soft"><span class="step">${T.direction}</span><p>${esc(m.direction)}</p></li>` : ''}
        <li class="ai"><span class="step">${T.ai}</span><p>${esc(m.ai)}</p></li>
        <li class="me"><span class="step">${T.decision}</span><p>${esc(m.decision ?? m.designer)}</p></li>
      </ol>
      <p class="why">${esc(m.why)}</p>
      <p class="tags">
        ${m.move ? `<span class="tag ${m.move === 'reencuadre' ? 'strong' : ''}">${m.move === 'reencuadre' ? T.reframe : T.adjust}</span>` : ''}
        ${m.phase ? `<span class="tag">${esc(PHASE_LABEL[m.phase] || m.phase)}</span>` : ''}
        ${hat ? `<span class="tag"><i class="hat" style="background:${hat.color}"></i>${hat.label}</span>` : ''}
        ${(m.criteria || []).map((x) => `<span class="tag crit">${esc(x)}</span>`).join('')}
        ${m.principle ? `<span class="tag crit">${esc(m.principle)}</span>` : ''}
      </p>
      ${c ? `<p class="mono commit">${shotCommits.includes(c) ? verOf(c) + ' — ' : ''}${esc(c.subject)}</p>` : ''}
    </div>
    <div class="visuals">${stage}${gallery}${code}</div>
  </article>`;
});

// --- Cómo se pensó: lectura de conjunto ---
const count = (arr) => arr.reduce((acc, x) => ((acc[x] = (acc[x] || 0) + 1), acc), {});
let overview = '';
if (moments.some((m) => m.hat || m.phase || m.move || m.criteria?.length)) {
  const n = moments.length;
  const crit = Object.entries(count(moments.flatMap((m) => (m.criteria || []).map((x) => x.toLowerCase())))).sort((a, b) => b[1] - a[1]);
  const principles = crit.filter(([, k]) => k >= 2).slice(0, 5);
  const moves = count(moments.map((m) => m.move).filter(Boolean));
  const hats = Object.entries(count(moments.map((m) => m.hat).filter(Boolean))).sort((a, b) => b[1] - a[1]);
  const seq = moments.filter((m) => PHASES.includes(m.phase));
  const backs = seq.filter((m, k) => k > 0 && PHASES.indexOf(m.phase) < PHASES.indexOf(seq[k - 1].phase)).length;

  const W = 640, rowH = 22, H = seq.length * rowH + 52, colW = W / 4;
  const pts = seq.map((m, k) => ({ x: colW * PHASES.indexOf(m.phase) + colW / 2, y: 22 + k * rowH, m, k }));
  const diamond = seq.length
    ? `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T.diamond)}">
        ${PHASES.map((p, k) => `<line x1="${k * colW}" y1="0" x2="${k * colW}" y2="${H - 26}" class="grid"/><text x="${k * colW + 8}" y="${H - 8}" class="lane-label">${PHASE_LABEL[p]}</text>`).join('')}
        <polyline points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" class="path"/>
        ${pts.map((p) => `<g><circle cx="${p.x}" cy="${p.y}" r="${p.m.move === 'reencuadre' ? 7 : 4}" class="pt${p.m.move === 'reencuadre' ? ' big' : ''}"/><text x="${p.x + 12}" y="${p.y + 4}" class="pt-label">${String(moments.indexOf(p.m) + 1).padStart(2, '0')}</text><title>${esc(p.m.title)}</title></g>`).join('')}
      </svg>`
    : '';

  const reading = [];
  const directed = moments.filter((m) => m.direction).length;
  if (directed) reading.push(T.rDirected(directed, n));
  if (principles.length) reading.push(T.rCriteria(esc(principles[0][0]), principles[0][1], n));
  if (moves.reencuadre) reading.push(T.rMoves(moves.reencuadre, moves.ajuste || 0));
  if (hats.length) {
    reading.push(T.rHat(HATS[hats[0][0]]?.label.toLowerCase(), hats[0][1], n));
    if (!hats.some(([h]) => h === 'blanco')) reading.push(T.rNoData);
  }
  if (seq.length && !seq.some((m) => m.phase === 'descubrir')) reading.push(T.rNoDiscover);
  if (backs) reading.push(T.rBacks(backs));

  overview = `<section class="block overview" aria-labelledby="como">
    <p class="mono label">${T.readLabel}</p>
    <h2 id="como">${T.readTitle}</h2>
    <ul class="reading">${reading.map((r) => `<li>${r}</li>`).join('')}</ul>
    <div class="ov-grid">
      ${principles.length ? `<div class="panel"><p class="label">${T.criteria}</p><ul class="bars">${principles.map(([k, v]) => `<li><span>${esc(k)}</span><b style="--w:${(v / n) * 100}%"></b><em>${v}</em></li>`).join('')}</ul></div>` : ''}
      ${hats.length ? `<div class="panel"><p class="label">${T.hats}</p><ul class="bars">${hats.map(([k, v]) => `<li><span><i class="hat" style="background:${HATS[k]?.color}"></i>${HATS[k]?.label || k}</span><b style="--w:${(v / n) * 100}%;--c:${HATS[k]?.color}"></b><em>${v}</em></li>`).join('')}</ul></div>` : ''}
      ${diamond ? `<div class="panel wide"><p class="label">${T.diamond}</p>${diamond}</div>` : ''}
    </div>
    <p class="mono note">${T.method}</p>
  </section>`;
}

// --- Evolución: una pantalla a la vez, solo las versiones donde cambió ---
const causes = (c) => moments.map((m, k) => ({ m, k })).filter(({ m }) => linkCommit(m)?.hash === c.hash);
const tracks = screenNames
  .map((name) => {
    // Se compara contra la última versión mostrada: los cambios chicos acumulados terminan contando.
    let last;
    const steps = shotCommits
      .map((c) => ({ c, s: shot(c.short, name) }))
      .filter((step) => {
        if (!step.s) return false;
        step.delta = last ? change(last, step.s) : null;
        if (last && step.delta < MIN_CHANGE) return false;
        last = step.s;
        return true;
      });
    return { name, steps };
  })
  .filter((t) => t.steps.length);
const evolution = tracks.length
  ? `<section class="block evolution" aria-labelledby="evo">
      <p class="mono label">${T.evoLabel}</p>
      <h2 id="evo">${T.evoTitle}</h2>
      <div class="tabs" role="tablist">${tracks.map((t, k) => `<button role="tab" class="mono" aria-selected="${k === 0}" data-track="${k}">${esc(t.name)} <span>${t.steps.length}</span></button>`).join('')}</div>
      ${tracks.map((t, k) => `<div class="track" data-track="${k}"${k ? ' hidden' : ''}>
        <div class="reel-bar">
          <p class="sub">${T.evoSub(t.steps.length, shotCommits.length)}</p>
          <div class="nav mono"><span class="pos">1 / ${t.steps.length}</span><button class="prev" aria-label="${T.prev}">←</button><button class="next" aria-label="${T.next}">→</button></div>
        </div>
        <div class="reel" tabindex="0">${t.steps.map(({ c, s, delta }) => `<figure>${img(s, `${t.name}, ${verOf(c)}`)}<figcaption>
          <span class="ver"><b>${verOf(c)}</b> · ${week(c.ts)}${delta != null ? ` · <span class="delta">${T.changed(delta)}</span>` : ''}</span>
          <span class="what">${esc(c.subject)}</span>
          ${causes(c).map(({ m, k: j }) => `<a href="#m${j + 1}">↳ ${String(j + 1).padStart(2, '0')} ${esc(m.title)}</a>`).join('')}
        </figcaption></figure>`).join('')}</div>
      </div>`).join('')}
    </section>`
  : '';

const totalShots = captures.reduce((n, c) => n + c.shots.length, 0);
const hero = shot(shotCommits.at(-1)?.short, mainScreen);
const first = shot(shotCommits[0]?.short, mainScreen);

const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(project)} · designdiff</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f2f2f0;--panel:#ffffff;--ink:#111;--muted:#6b6b6b;--line:#dcdcd8;--dots:#d2d2cc;--stage:#e6e6e2}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0a0a0a;--panel:#131313;--ink:#ededed;--muted:#8a8a8a;--line:#252525;--dots:#222;--stage:#111}}
:root[data-theme="dark"]{--bg:#0a0a0a;--panel:#131313;--ink:#ededed;--muted:#8a8a8a;--line:#252525;--dots:#222;--stage:#111}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.mono,.label{font-family:"Geist Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.02em}
.label{color:var(--muted);margin:0 0 12px;text-transform:uppercase}
img{display:block;width:100%;height:auto}
.wrap{max-width:1240px;margin:0 auto;padding:0 20px}

/* Portada */
.top{display:flex;justify-content:space-between;padding:20px 0;color:var(--muted)}
.cover{display:grid;grid-template-columns:1.1fr 1fr;gap:24px;align-items:end;padding:40px 0 56px;border-bottom:1px solid var(--line)}
h1{font:500 clamp(48px,9vw,112px)/.9 "Geist Mono",monospace;letter-spacing:-.06em;margin:0 0 24px}
.lede{font-size:clamp(18px,2vw,22px);line-height:1.4;max-width:34ch;margin:0 0 32px}
.stats{display:flex;gap:28px}.stats div{display:grid}.stats b{font:500 32px "Geist Mono",monospace;letter-spacing:-.04em}.stats span{color:var(--muted);font-size:13px}
.cover-art{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--stage);background-image:radial-gradient(var(--dots) 1px,transparent 1px);background-size:14px 14px;border-radius:20px;padding:28px}
.cover-art figure{margin:0}.cover-art img{border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.35)}

/* Bloques */
.block{padding:64px 0;border-bottom:1px solid var(--line)}
.block>h2,.overview h2{font:500 clamp(28px,4vw,44px)/1.05 Geist,sans-serif;letter-spacing:-.035em;margin:0 0 8px}
.sub{color:var(--muted);margin:0 0 16px}

/* Evolución */
.tabs{display:flex;flex-wrap:wrap;gap:6px;margin:20px 0 16px}
.tabs button{font-size:13px;background:none;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:8px 12px;cursor:pointer}
.tabs button span{opacity:.6;margin-left:4px}
.tabs button[aria-selected="true"]{color:var(--bg);background:var(--ink);border-color:var(--ink)}
.reel-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:12px}.reel-bar .sub{margin:0}
.nav{display:flex;align-items:center;gap:8px;flex:0 0 auto}.pos{color:var(--muted);min-width:52px;text-align:right}
.nav button{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:16px "Geist Mono",monospace;cursor:pointer}
.nav button:hover:not(:disabled){border-color:var(--ink)}.nav button:disabled{opacity:.3;cursor:default}
.reel{display:flex;align-items:flex-start;gap:20px;overflow-x:auto;padding:28px;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none;background:var(--stage);background-image:radial-gradient(var(--dots) 1px,transparent 1px);background-size:14px 14px;border-radius:20px}
.reel::-webkit-scrollbar{display:none}.reel:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.reel figure{flex:0 0 220px;margin:0;scroll-snap-align:start;scroll-margin-left:28px}
.reel img{border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.35)}
.reel figcaption b{color:var(--ink);font-weight:500}
.reel figcaption .ver{display:block}.delta{color:var(--ink)}
.reel figcaption .what{display:block;margin-top:6px;font:13px/1.35 Geist,sans-serif;color:var(--muted)}
.reel figcaption a{display:block;margin-top:6px;color:var(--ink);text-decoration:none;font-family:Geist,sans-serif;font-size:13px;line-height:1.3}
.reel figcaption a:hover{text-decoration:underline}

/* Lectura */
.reading{list-style:none;margin:20px 0 32px;padding:0;display:grid;gap:10px;font-size:clamp(17px,1.8vw,20px);max-width:62ch}
.reading li{padding-left:22px;position:relative}.reading li:before{content:"→";position:absolute;left:0;color:var(--muted)}
.ov-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}.panel.wide{grid-column:1/-1}
.bars{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.bars li{display:grid;grid-template-columns:150px 1fr 20px;gap:12px;align-items:center}
.bars span{display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bars b{height:8px;border-radius:2px;background:linear-gradient(90deg,var(--c,var(--ink)) var(--w),var(--line) var(--w))}
.bars em{font:12px "Geist Mono",monospace;font-style:normal;color:var(--muted);text-align:right}
.hat{display:inline-block;width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.panel svg{width:100%;height:auto}
.grid{stroke:var(--line)}.lane-label{font:12px "Geist Mono",monospace;fill:var(--muted)}
.path{fill:none;stroke:var(--muted);stroke-width:1;stroke-dasharray:3 3}.pt{fill:var(--ink)}.pt.big{fill:none;stroke:var(--ink);stroke-width:2}
.pt-label{font:11px "Geist Mono",monospace;fill:var(--muted)}
.note{color:var(--muted);margin:20px 0 0}

/* Decisiones */
.moments-head{padding:64px 0 8px}
.moments-head h2{font:500 clamp(28px,4vw,44px)/1.05 Geist,sans-serif;letter-spacing:-.035em;margin:0}
.moment{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:40px;padding:48px 0;border-bottom:1px solid var(--line)}
.text{position:sticky;top:20px;align-self:start}
.head{display:flex;gap:14px;color:var(--muted);margin:0 0 20px}.head span:first-child{color:var(--ink)}
.question{color:var(--muted);margin:0 0 6px}
.moment h2{font:500 clamp(26px,3vw,36px)/1.08 Geist,sans-serif;letter-spacing:-.03em;margin:0 0 14px}
blockquote{margin:0 0 24px;font-family:"Geist Mono",monospace;font-size:13px;color:var(--muted)}
.flow{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px;counter-reset:f}
.flow li{border:1px solid var(--line);border-radius:12px;padding:14px 16px;counter-increment:f}
.flow p{margin:0}.flow .ai{color:var(--muted)}
.flow .me{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.flow .me-soft{border-color:var(--ink)}
.step{display:block;font:11px "Geist Mono",monospace;text-transform:uppercase;letter-spacing:.04em;opacity:.7;margin-bottom:6px}
.step:before{content:counter(f) " — "}
.why{margin:0 0 18px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px}
.tag{display:inline-flex;align-items:center;gap:6px;font:12px "Geist Mono",monospace;border:1px solid var(--line);border-radius:6px;padding:3px 8px;color:var(--muted)}
.tag.strong{color:var(--ink);border-color:var(--ink)}.tag.crit{border-style:dashed}
.commit{color:var(--muted);margin:0}
.visuals{display:grid;gap:16px;align-content:start}
.stage{display:flex;align-items:center;justify-content:center;gap:20px;background:var(--stage);background-image:radial-gradient(var(--dots) 1px,transparent 1px);background-size:14px 14px;border-radius:20px;padding:36px 28px}
.stage figure{margin:0;flex:0 1 300px}.stage img{border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.4)}
.stage.single figure{flex-basis:320px}
.arrow{font:24px "Geist Mono",monospace;color:var(--muted);flex:0 0 auto}
figcaption{font:11px "Geist Mono",monospace;color:var(--muted);margin-top:10px}
.gallery .row{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.gallery figure{margin:0}.gallery img{border-radius:10px;border:1px solid var(--line)}
.code{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.code ul{list-style:none;margin:0;padding:0;display:grid;gap:6px;font:12px "Geist Mono",monospace}
.code li{display:grid;grid-template-columns:1fr auto auto;gap:12px}.file{overflow-wrap:anywhere}
.add{color:#3fd17a}.del{color:#ff5a4e}
footer{padding:40px 0 80px;color:var(--muted)}

@media (max-width:860px){
  .cover,.moment,.ov-grid{grid-template-columns:1fr}
  .text{position:static}
  .stage{padding:24px 16px;gap:10px}
  .bars li{grid-template-columns:110px 1fr 20px}
  .reel{padding:20px}.reel figure{flex-basis:170px}
}
</style></head><body>
<div class="wrap">
  <div class="top mono"><span>designdiff</span><span>${esc(project)} · ${moments.length} ${T.decisions}</span></div>
  <header class="cover">
    <div>
      <h1>${esc(project)}</h1>
      <p class="lede">${esc(summary)}</p>
      <div class="stats"><div><b>${moments.length}</b><span>${T.decisions}</span></div><div><b>${commits.length}</b><span>${T.commits}</span></div><div><b>${totalShots}</b><span>${T.captures}</span></div></div>
    </div>
    ${first && hero ? `<div class="cover-art"><figure>${img(first, T.firstVersion)}<figcaption>${T.firstVersion}</figcaption></figure><figure>${img(hero, T.today)}<figcaption>${T.today}</figcaption></figure></div>` : ''}
  </header>
  ${evolution}
  ${overview}
  <div class="moments-head"><p class="mono label">${T.momentsLabel}</p><h2>${T.momentsTitle}</h2></div>
  ${items.join('\n')}
  <footer class="mono">${T.footer}</footer>
</div>
<script>
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.track').forEach((t) => {
    t.hidden = t.dataset.track !== b.dataset.track;
    if (!t.hidden && t.update) t.update(); // al mostrarse recién tiene ancho
  });
}));
// Flechas del carrusel: avanzan de a una captura y muestran la posición.
document.querySelectorAll('.track').forEach((t) => {
  const reel = t.querySelector('.reel'), figs = [...reel.children];
  const prev = t.querySelector('.prev'), next = t.querySelector('.next'), pos = t.querySelector('.pos');
  const left = (f) => f.offsetLeft - reel.offsetLeft - 28;
  const maxScroll = () => reel.scrollWidth - reel.clientWidth;
  // Última captura a la que se puede llegar (las del final entran juntas en pantalla).
  const lastIdx = () => Math.max(0, figs.findIndex((f) => left(f) >= maxScroll() - 4));
  let idx = 0, moving = 0;
  const update = () => {
    // Al final se ven varias capturas juntas: el contador muestra el rango.
    const atEnd = idx >= lastIdx() && idx < figs.length - 1;
    pos.textContent = (idx + 1) + (atEnd ? '–' + figs.length : '') + ' / ' + figs.length;
    prev.disabled = idx <= 0;
    next.disabled = idx >= lastIdx();
  };
  const go = (d) => {
    idx = Math.min(lastIdx(), Math.max(0, idx + d));
    moving = Date.now();
    reel.scrollTo({ left: left(figs[idx]) });
    update();
  };
  prev.onclick = () => go(-1);
  next.onclick = () => go(1);
  // Si la persona scrollea a mano (trackpad, touch), se recalcula la posición.
  reel.addEventListener('scroll', () => {
    if (Date.now() - moving < 700) return;
    const i = figs.findIndex((f) => left(f) >= reel.scrollLeft - 4);
    idx = i < 0 ? figs.length - 1 : i;
    update();
  }, { passive: true });
  reel.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
  new ResizeObserver(update).observe(reel);
  t.update = update;
  update();
});
</script>
</body></html>`;

fs.writeFileSync(path.join(dir, 'proceso.html'), html);
console.log(`-> ${path.join(dir, 'proceso.html')} (${lang})`);
