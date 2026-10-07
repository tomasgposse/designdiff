import { execFileSync } from 'node:child_process';

const git = (cwd, args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const UI_FILE = /\.(tsx|jsx|vue|svelte|css|scss|html)$|(^|\/)(app|components|pages|src\/ui|styles|public)\//;

// ref: rama o commit a recorrer (por defecto HEAD). Sirve para leer origin/main sin hacer pull.
export function readCommits(projectDir, ref = 'HEAD') {
  const SEP = '\u001f';
  const raw = git(projectDir, [
    'log', '--reverse', '--date=iso-strict', `--format=@@${SEP}%H${SEP}%ad${SEP}%s`, '--numstat', ref,
  ]);
  const commits = [];
  for (const block of raw.split('@@').filter(Boolean)) {
    const [head, ...files] = block.split('\n');
    const [, hash, date, subject] = head.split(SEP);
    // --numstat: "agregadas	borradas	ruta" ("-" en archivos binarios).
    const changed = files.map((f) => f.trim()).filter(Boolean).map((l) => {
      const [add, del, ...p] = l.split('	');
      return { path: p.join('	'), add: +add || 0, del: +del || 0 };
    });
    commits.push({
      hash,
      short: hash.slice(0, 7),
      ts: new Date(date).toISOString(),
      subject,
      files: changed.length,
      uiFiles: changed.filter((f) => UI_FILE.test(f.path)).length,
      add: changed.reduce((n, f) => n + f.add, 0),
      del: changed.reduce((n, f) => n + f.del, 0),
      // Evidencia para decisiones que no se ven en pantalla: los archivos que más cambiaron.
      top: [...changed].sort((a, b) => b.add + b.del - (a.add + a.del)).slice(0, 5),
    });
  }
  return commits;
}
