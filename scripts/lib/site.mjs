// Shared helpers for the verifier scripts. Reads content/chalet.yaml.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const ROOT = process.cwd();

// Pages every live locale must have (path relative to the locale root, trailing slash).
export const REQUIRED_PAGES = [
  { id: 'home', path: '' },
  { id: 'chalet', path: 'chalet/' },
  { id: 'gallery', path: 'gallery/' },
  { id: 'winter', path: 'winter/' },
  { id: 'summer', path: 'summer/' },
  { id: 'access', path: 'access/' },
  { id: 'services', path: 'services/' },
  { id: 'book', path: 'book/' },
  { id: 'legal', path: 'legal/' },
  { id: 'terms', path: 'terms/' },
  { id: 'privacy', path: 'privacy/' },
];

export function loadVilla() {
  const file = path.join(ROOT, 'content', 'chalet.yaml');
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}. Run from the repo root.`);
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

export function loadPhotos() {
  const file = path.join(ROOT, 'content', 'photos.yaml');
  if (!fs.existsSync(file)) return { photos: [] };
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

export function locales(villa) {
  const all = villa.site.locales;
  const def = villa.site.default_locale;
  return {
    def,
    live: all.filter((l) => l.status === 'live').map((l) => l.code),
    draft: all.filter((l) => l.status !== 'live').map((l) => l.code),
    all: all.map((l) => l.code),
  };
}

export const localePrefix = (code, def) => (code === def ? '' : `${code}/`);

// Every required page for every live locale: { locale, page, urlPath, file }
export function requiredPageList(villa, dist) {
  const { def, live } = locales(villa);
  const out = [];
  for (const code of live) {
    for (const page of REQUIRED_PAGES) {
      const urlPath = `/${localePrefix(code, def)}${page.path}`;
      out.push({ locale: code, page: page.id, urlPath, file: path.join(dist, urlPath, 'index.html') });
    }
  }
  return out;
}

export function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export class Report {
  constructor(title) { this.title = title; this.errors = []; this.warnings = []; this.passed = 0; }
  error(where, msg) { this.errors.push(`${where}: ${msg}`); }
  warn(where, msg) { this.warnings.push(`${where}: ${msg}`); }
  ok() { this.passed++; }
  print() {
    const errs = this.errors;
    const warns = this.warnings;
    console.log(`\n=== ${this.title} ===`);
    for (const w of warns) console.log(`WARN  ${w}`);
    for (const e of errs) console.log(`FAIL  ${e}`);
    console.log(`\n${this.passed} checks passed, ${warns.length} warnings, ${errs.length} failures.`);
    if (errs.length) console.log('RESULT: FAIL. Fix every FAIL line, then run the check again.');
    else console.log('RESULT: PASS');
    return errs.length ? 1 : 0;
  }
}
