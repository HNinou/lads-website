#!/usr/bin/env node
// Static verifier for the built site (parses each page in headless Chromium, JS off). Usage:
//   node scripts/verify.mjs            -> checks ./dist
//   node scripts/verify.mjs --strict   -> unreviewed translations fail (used by CI before deploy)
//   node scripts/verify.mjs --dist=out -> check another folder
// Exit code 0 = pass, 1 = fail. Every FAIL line names the file and the rule.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import YAML from 'yaml';
import { ROOT, REQUIRED_PAGES, loadVilla, loadPhotos, locales, localePrefix, requiredPageList, walk, Report } from './lib/site.mjs';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const DIST = path.resolve(ROOT, (args.find((a) => a.startsWith('--dist=')) || '--dist=dist').slice(7));

const villa = loadVilla();
const photos = loadPhotos();
const L = locales(villa);
const DOMAIN = villa.site.domain.replace(/\/$/, '');
const HOST = new URL(DOMAIN).host;
const REG = villa.legal.registration_number; // French meublé de tourisme registration number
const HAS_REG = REG && REG !== 'TODO_OWNER';
const HOSTAWAY_BASE = villa.booking.base_url;
const LISTING_ID = String(villa.booking.listing_id);
const r = new Report('Static site verification');

// Third-party hosts allowed to load resources (scripts, styles, iframes, images).
const RESOURCE_ALLOWLIST = new Set(['d2q3n06xhbi0am.cloudfront.net', new URL(HOSTAWAY_BASE).host]);

// Claims that must never appear (see content/copy-brief.md).
const BANNED = [
  [/\b(luxe|luxueux|luxueuse|luxury|luxurious|luxus|luxuri\w*|luxe-chalet|luxechalet)\b/i, '"luxury" claim (unverifiable; describe instead)'],
  [/meilleur(s)? (tarif|prix)|best (price|rate)|bester preis|beste prijs|prix le plus bas|lowest price/i, 'best-price claim'],
  [/ski[\s-]?in|ski[\s-]?out|skis aux pieds|aux pieds des pistes|au pied des pistes|direkt an der piste|aan de piste/i, 'ski-in/ski-out claim (the lifts are 300 m away)'],
  [/\b(5|five|cinq|fünf|vijf)[\s-]?(star|étoiles?|sterne|sterren)/i, 'star-rating claim'],
  [/\b(paradise|paradis|paradies|paradijs|breathtaking|à couper le souffle|atemberaubend|adembenemend|exceptionnel|exceptional)\b/i, 'hype word'],
  [/lesalpagesdusoleil1/i, 'Wi-Fi password published (never put access codes on the website)'],
];
if (villa.rates?.all_inclusive !== true) {
  BANNED.push([/tout compris|tout inclus|all[\s-]inclusive|everything included|alles inklusive|alles inbegrepen|all-in/i, '"all inclusive" claim while a cleaning fee is charged separately']);
}
const PLACEHOLDER = /TODO_OWNER|\bTODO\b|\bTBD\b|lorem ipsum|\{\{|\}\}|\bundefined\b|\bNaN\b|\[object Object\]/i;

const rel = (f) => path.relative(ROOT, f);
const localeOf = (urlPath) => {
  const seg = urlPath.split('/').filter(Boolean)[0];
  return L.all.includes(seg) ? seg : L.def;
};

// ---------- 0. dist exists ----------
if (!fs.existsSync(DIST)) {
  r.error('dist', `folder ${rel(DIST)} not found. Run "npm run build" first.`);
  process.exit(r.print());
}

// ---------- 1. required pages ----------
const required = requiredPageList(villa, DIST);
for (const p of required) {
  if (fs.existsSync(p.file)) r.ok();
  else r.error(p.urlPath, `required page missing (${p.page}, ${p.locale}) at ${rel(p.file)}`);
}
const requiredByPath = new Map(required.map((p) => [p.urlPath, p]));

// ---------- 2. draft locales not published ----------
for (const code of L.draft) {
  if (fs.existsSync(path.join(DIST, code))) r.error(`/${code}/`, `locale "${code}" is draft in chalet.yaml but was built`);
  else r.ok();
}

// ---------- 3. per-page checks ----------
const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const fileSet = new Set(files.map((f) => path.resolve(f)));

function resolveInternal(href, fromUrlPath) {
  let u;
  try { u = new URL(href, DOMAIN + fromUrlPath); } catch { return null; }
  if (u.host !== HOST) return null;
  let p = decodeURIComponent(u.pathname);
  const candidates = p.endsWith('/') ? [p + 'index.html'] : [p, p + '.html', p + '/index.html'];
  return { path: p, exists: candidates.some((c) => fileSet.has(path.resolve(path.join(DIST, c)))) };
}

// Parse every page in a headless browser with JavaScript OFF and the network blocked,
// so we inspect exactly the static HTML that ships.
const browser = await chromium.launch();
const ctx = await browser.newContext({ javaScriptEnabled: false });
await ctx.route('**/*', (route) => route.abort());
const tab = await ctx.newPage();

async function inspect(html) {
  await tab.setContent(html, { waitUntil: 'domcontentloaded' });
  return tab.evaluate(() => {
    const q = (s) => [...document.querySelectorAll(s)];
    const attr = (s, a) => document.querySelector(s)?.getAttribute(a) ?? null;
    const body = document.body ? document.body.cloneNode(true) : document.createElement('body');
    body.querySelectorAll('script,style,noscript,template').forEach((n) => n.remove());
    const noQuotes = body.cloneNode(true);
    noQuotes.querySelectorAll('[data-quote]').forEach((n) => n.remove());
    return {
      lang: document.documentElement.getAttribute('lang'),
      title: document.querySelector('head > title')?.textContent.trim() ?? '',
      desc: attr('meta[name="description"]', 'content')?.trim() ?? null,
      viewport: !!document.querySelector('meta[name="viewport"]'),
      keywords: !!document.querySelector('meta[name="keywords"]'),
      canonical: attr('link[rel="canonical"]', 'href'),
      ogImage: attr('meta[property="og:image"]', 'content'),
      ogTitle: !!document.querySelector('meta[property="og:title"]'),
      ogText: q('meta[property^="og:"]').map((m) => m.getAttribute('content') || '').join(' '),
      alternates: q('link[rel="alternate"][hreflang]').map((l) => ({ hreflang: l.getAttribute('hreflang').toLowerCase(), href: l.getAttribute('href') })),
      h1: q('h1').length,
      bodyText: body.textContent.replace(/\s+/g, ' '),
      copyText: noQuotes.textContent.replace(/\s+/g, ' '),
      cta: q('[data-cta="book"]').length,
      anchors: q('a[href]').map((a) => a.getAttribute('href')),
      widgets: q('#hostaway-calendar-widget').length,
      imgs: q('img').map((i) => ({ src: i.getAttribute('src') || '', alt: i.getAttribute('alt'), decorative: i.getAttribute('aria-hidden') === 'true' || i.getAttribute('role') === 'presentation', w: i.getAttribute('width'), h: i.getAttribute('height') })),
      resources: q('script[src], link[href], img[src], iframe[src], source[srcset], video[src]').map((el) => ({
        tag: el.tagName.toLowerCase(), rel: el.getAttribute('rel') || '',
        raw: el.getAttribute('src') || el.getAttribute('href') || (el.getAttribute('srcset') || '').split(/[ ,]/)[0] })),
      hidden: q('[style]').filter((el) => /display:none|visibility:hidden/.test((el.getAttribute('style') || '').replace(/\s/g, '').toLowerCase()))
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim().length),
      srOnly: q('.sr-only, .visually-hidden').map((el) => el.textContent.trim().length),
      ld: q('script[type="application/ld+json"]').map((s) => s.textContent),
    };
  });
}

for (const file of htmlFiles) {
  const urlPath = '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  const where = urlPath;
  const html = fs.readFileSync(file, 'utf8');
  const d = await inspect(html);
  const loc = localeOf(urlPath);
  const isRequired = requiredByPath.has(urlPath);
  const req = requiredByPath.get(urlPath);
  const is404 = /404/.test(urlPath) || path.basename(file) === '404.html';

  if (Buffer.byteLength(html) > 200_000) r.warn(where, `HTML is ${Math.round(Buffer.byteLength(html) / 1024)} KB (budget 200 KB)`);

  // lang
  if (!d.lang) r.error(where, '<html> has no lang attribute');
  else if (isRequired && !d.lang.toLowerCase().startsWith(loc)) r.error(where, `<html lang="${d.lang}"> but page belongs to locale "${loc}"`);
  else r.ok();

  // head basics
  if (!d.title) r.error(where, 'missing <title>');
  else if (d.title.length < 10 || d.title.length > 70) r.warn(where, `title length ${d.title.length} (aim 10-70): "${d.title}"`);
  else r.ok();
  if (!d.desc) r.error(where, 'missing meta description');
  else if (d.desc.length < 50 || d.desc.length > 170) r.warn(where, `meta description length ${d.desc.length} (aim 50-170)`);
  else r.ok();
  if (!d.viewport) r.error(where, 'missing meta viewport'); else r.ok();
  if (d.keywords) r.error(where, 'meta keywords tag present (keyword stuffing; remove it)'); else r.ok();

  if (!is404) {
    if (!d.canonical) r.error(where, 'missing canonical link');
    else if (d.canonical !== DOMAIN + urlPath) r.error(where, `canonical is ${d.canonical}, expected ${DOMAIN + urlPath}`);
    else r.ok();
    if (!d.ogImage) r.error(where, 'missing og:image');
    else if (!d.ogImage.startsWith(DOMAIN)) r.error(where, `og:image must be an absolute URL on ${DOMAIN}`);
    else r.ok();
    if (!d.ogTitle) r.error(where, 'missing og:title'); else r.ok();
  }

  // hreflang on required pages
  if (isRequired) {
    const alts = Object.fromEntries(d.alternates.map((a) => [a.hreflang, a.href]));
    const pagePath = REQUIRED_PAGES.find((p) => p.id === req.page).path;
    for (const code of L.live) {
      const expected = `${DOMAIN}/${localePrefix(code, L.def)}${pagePath}`;
      const key = Object.keys(alts).find((k) => k === code || k.startsWith(code + '-'));
      if (!key) r.error(where, `missing hreflang="${code}"`);
      else if (alts[key] !== expected) r.error(where, `hreflang ${code} is ${alts[key]}, expected ${expected}`);
      else r.ok();
    }
    if (!alts['x-default']) r.error(where, 'missing hreflang="x-default"'); else r.ok();
    for (const code of L.draft) if (Object.keys(alts).some((k) => k === code || k.startsWith(code + '-'))) r.error(where, `hreflang points to draft locale "${code}"`);
  }

  // one h1
  if (d.h1 !== 1) r.error(where, `${d.h1} <h1> elements (need exactly 1)`); else r.ok();

  // Registration number on every page (French law, once issued)
  if (HAS_REG) { if (!d.bodyText.includes(REG)) r.error(where, `registration number ${REG} not visible on page (required on every listing)`); else r.ok(); }

  // Booking CTA on every page
  if (!is404) {
    const bookPath = '/' + localePrefix(loc, L.def) + 'book/';
    const linksBook = d.anchors.some((h) => resolveInternal(h, urlPath)?.path === bookPath);
    if (req?.page !== 'book' && !linksBook) r.error(where, `no link to ${bookPath}`);
    else if (!d.cta) r.error(where, 'no element with data-cta="book" (sticky "Check dates" button)');
    else r.ok();
  }

  // Hostaway widget
  if (d.widgets > 1) r.error(where, `${d.widgets} Hostaway calendar widgets (Hostaway allows 1 per page)`);
  if (req?.page === 'book') {
    if (d.widgets !== 1) r.error(where, 'book page must contain exactly one #hostaway-calendar-widget');
    else if (!html.includes(LISTING_ID) || !html.includes(HOSTAWAY_BASE.replace(/\/$/, ''))) r.error(where, `widget config must use listingId ${LISTING_ID} and baseUrl ${HOSTAWAY_BASE}`);
    else r.ok();
  }

  // images
  for (const i of d.imgs) {
    if (i.alt === null) r.error(where, `img without alt: ${i.src}`);
    else if (!i.decorative && !i.alt.trim()) r.error(where, `img with empty alt but not marked decorative: ${i.src}`);
    else r.ok();
    if (!i.w || !i.h) r.error(where, `img without width/height (layout shift): ${i.src}`);
  }

  // external resources
  for (const res of d.resources) {
    if (res.tag === 'link' && !/stylesheet|preload|modulepreload|icon|manifest/.test(res.rel)) continue;
    if (!res.raw || res.raw.startsWith('data:')) continue;
    let u; try { u = new URL(res.raw, DOMAIN + urlPath); } catch { continue; }
    if (u.host === HOST) continue;
    if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) r.error(where, `Google Fonts loaded remotely (${u.host}); self-host fonts (GDPR)`);
    else if (!RESOURCE_ALLOWLIST.has(u.host)) r.error(where, `<${res.tag}> loads from non-allowlisted host ${u.host}`);
    else r.ok();
  }
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html)) r.error(where, 'reference to Google Fonts found in HTML');

  // hidden text / keyword stuffing
  for (const n of d.hidden) if (n > 200) r.error(where, `hidden element with ${n} chars of text (hidden-text SEO is penalised)`);
  for (const n of d.srOnly) if (n > 160) r.error(where, `screen-reader-only text of ${n} chars (keep sr-only text short)`);

  // placeholders + banned claims
  const scanText = `${d.copyText} ${d.title} ${d.desc || ''} ${d.ogText}`; // real guest quotes ([data-quote]) are exempt
  const ph = scanText.match(PLACEHOLDER);
  if (ph) r.error(where, `placeholder text "${ph[0]}" visible`); else r.ok();
  for (const [re, why] of BANNED) {
    const m = scanText.match(re);
    if (m) r.error(where, `banned claim "${m[0]}": ${why}`);
  }
  const dead = html.match(/abritel\.fr\/location-vacances\/p1118971|twitter\.com\/alpagesdusoleil|static\.wixstatic\.com/i);
  if (dead) r.error(where, `dead or old-site link/resource: ${dead[0]}`);
  if (/@gmail\.com/i.test(html)) r.warn(where, 'gmail address on page (switch to a domain address when ready)');

  // JSON-LD
  const ld = [];
  for (const t of d.ld) { try { ld.push(JSON.parse(t)); } catch (e) { r.error(where, `invalid JSON-LD: ${e.message}`); } }
  if (req?.page === 'home') {
    const types = JSON.stringify(ld);
    if (!/"@type":"VacationRental"/.test(types)) r.error(where, 'home page needs VacationRental JSON-LD');
    else r.ok();
    if (/"maxValue"/.test(types) || !/"occupancy":\{[^}]*"value":\s*\d+/.test(types)) r.error(where, 'VacationRental occupancy must be {"@type":"QuantitativeValue","value":N} (Google rejects maxValue)');
    if (!/"additionalType":"Chalet"/.test(types)) r.warn(where, 'VacationRental should have top-level "additionalType":"Chalet"');
    if (/aggregateRating|"review"/.test(types)) r.error(where, 'JSON-LD must not contain ratings/reviews (Airbnb ratings are not first-party)');
  }

  // internal links
  for (const href of d.anchors) {
    if (/^(mailto:|tel:|https?:\/\/wa\.me|#|javascript:)/i.test(href)) continue;
    const res = resolveInternal(href, urlPath);
    if (!res) continue;
    for (const code of L.draft) if (res.path.startsWith(`/${code}/`)) r.error(where, `links to draft locale: ${href}`);
    if (!res.exists) r.error(where, `broken internal link: ${href}`);
    else r.ok();
    if (/[?&]lang=/.test(href)) r.error(where, `uses legacy ?lang= link: ${href}`);
  }
}
await browser.close();

if (!HAS_REG) r.warn('registration', 'legal.registration_number is TODO_OWNER: add it to chalet.yaml as soon as it is issued; it must then appear on every page');

// ---------- 4. site-wide files ----------
const cnameFile = path.join(DIST, 'CNAME');
if (!fs.existsSync(cnameFile)) r.error('CNAME', 'dist/CNAME missing (put it in public/CNAME)');
else if (fs.readFileSync(cnameFile, 'utf8').trim() !== villa.site.cname) r.error('CNAME', `must contain exactly ${villa.site.cname}`);
else r.ok();

const robots = path.join(DIST, 'robots.txt');
if (!fs.existsSync(robots)) r.error('robots.txt', 'missing');
else if (!/Sitemap:\s*https?:\/\//i.test(fs.readFileSync(robots, 'utf8'))) r.error('robots.txt', 'must reference the sitemap with an absolute URL');
else r.ok();

const sitemaps = files.filter((f) => /sitemap.*\.xml$/.test(path.basename(f)));
if (!sitemaps.length) r.error('sitemap', 'no sitemap*.xml in dist');
else {
  const xml = sitemaps.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const p of required) if (!xml.includes(`<loc>${DOMAIN}${p.urlPath}</loc>`)) r.error('sitemap', `missing ${DOMAIN}${p.urlPath}`);
  for (const code of L.draft) if (xml.includes(`${DOMAIN}/${code}/`)) r.error('sitemap', `contains draft locale ${code}`);
  r.ok();
}

if (!fs.existsSync(path.join(DIST, '404.html'))) r.warn('404', 'no 404.html (GitHub Pages shows its own)'); else r.ok();

if (villa.site.legacy_lang_param) {
  const home = path.join(DIST, 'index.html');
  const h = fs.existsSync(home) ? fs.readFileSync(home, 'utf8') : '';
  if (!/URLSearchParams|[?&]lang=|searchParams/.test(h) || !/location\.(replace|href|assign)/.test(h)) r.error('/', 'root page must redirect legacy /?lang=xx URLs to /xx/');
  else r.ok();
}

// ---------- 5. assets ----------
let jsBytes = 0;
for (const f of files) {
  const size = fs.statSync(f).size;
  if (/\.(js|mjs)$/.test(f)) jsBytes += size;
  if (/\.(jpe?g|png|webp|avif|gif)$/i.test(f)) {
    if (size > 800_000) r.error(rel(f), `image is ${Math.round(size / 1024)} KB (max 800 KB)`);
    else if (size > 450_000) r.warn(rel(f), `image is ${Math.round(size / 1024)} KB (aim < 450 KB)`);
  }
}
if (jsBytes > 200_000) r.warn('js', `total JS ${Math.round(jsBytes / 1024)} KB (budget 200 KB)`); else r.ok();

// photo rights: unconfirmed photos must not ship
const unconfirmed = (photos.photos || []).filter((p) => p.rights !== 'owner' && p.rights !== 'licensed').map((p) => p.file.replace(/\.\w+$/, ''));
for (const f of files) {
  const b = path.basename(f);
  const hit = unconfirmed.find((stem) => b.startsWith(stem));
  if (hit) r.error(rel(f), `photo "${hit}" has rights: unconfirmed in content/photos.yaml; it must not be published`);
}
const srcPhotos = path.join(ROOT, 'src', 'assets', 'photos');
for (const f of walk(srcPhotos)) {
  const hit = unconfirmed.find((stem) => path.basename(f).startsWith(stem));
  if (hit) r.error(rel(f), 'unconfirmed-rights photo copied into src/; keep it in assets/photos only');
}

// ---------- 6. source: translation review flags ----------
// --strict (CI deploy) turns these into failures: nothing reaches guests unreviewed.
const flag = (w, m) => (strict ? r.error(w, m) : r.warn(w, m));
const contentDir = path.join(ROOT, 'src', 'content');
for (const f of walk(contentDir).filter((f) => /\.(md|mdx)$/.test(f))) {
  const parts = path.relative(contentDir, f).split(path.sep);
  const code = parts.find((p) => L.all.includes(p));
  if (!code || !L.live.includes(code)) continue;
  const fm = fs.readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const data = fm ? YAML.parse(fm[1]) || {} : {};
  if (data.reviewed !== true) flag(rel(f), `live locale "${code}" not yet reviewed by owner (set reviewed: true after proofreading)`);
  else r.ok();
}
const i18nDir = path.join(ROOT, 'src', 'i18n');
for (const code of L.live) {
  const f = path.join(i18nDir, `${code}.json`);
  if (!fs.existsSync(f)) continue;
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (j._reviewed !== true) flag(rel(f), `UI strings for "${code}" not yet reviewed (set "_reviewed": true)`);
    else r.ok();
  } catch (e) { r.error(rel(f), `invalid JSON: ${e.message}`); }
}

process.exit(r.print());
