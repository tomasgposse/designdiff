// Tapa datos sensibles antes de que nada salga de la máquina.
// Es una primera barrera, no una garantía: la revisión humana sigue siendo obligatoria.

const RULES = [
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[mail]'],
  [/\b(APP_USR|TEST)-[\w-]{10,}\b/g, '[token]'],
  [/\b(sk|pk|rk|ghp|gho|github_pat|xox[abp])[-_][\w-]{12,}\b/g, '[clave]'],
  [/\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}\b/g, '[jwt]'],
  [/\b[A-Za-z0-9_-]{32,}\b/g, '[secreto?]'],
  [/\b\d{22}\b/g, '[cbu]'],
  [/\b(?:\d[ -]?){13,19}\b/g, '[número]'],
  [/\$\s?\d[\d.,]*/g, '$[monto]'],
  [/\b(\+?54\s?9?\s?)?(11|\d{3})[\s-]?\d{4}[\s-]?\d{4}\b/g, '[teléfono]'],
];

export function redact(text, extraTerms = []) {
  let out = text;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  for (const term of extraTerms) {
    if (!term) continue;
    out = out.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[oculto]');
  }
  return out;
}
