#!/usr/bin/env node
// Browser checks on the built site (Playwright + axe). Usage:
//   node scripts/visual-check.mjs              -> serves ./dist, checks every required page, mobile + desktop
//   node scripts/visual-check.mjs --only=book  -> one page id (see REQUIRED_PAGES)
//   node scripts/visual-check.mjs --no-shots   -> skip screenshots
// Screenshots go to .verify/screenshots/<locale>-<page>-<viewport>.png. LOOK AT THEM after every design change.
// Needs: npm i -D playwright @axe-core/playwright && npx playwright install chromium
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, loadVilla, requiredPageList, Report } from './lib/site.mjs';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const shots = !args.includes('--no-shots');
const DIST = path.resolve(ROOT, (args.find((a) => a.startsWith('--dist=')) || '--dist=dist').slice(7));
const OUT = path.resolve(ROOT, '.verify', 'screenshots');
const villa = loadVilla();
const r = new Report('Browser verification');

let AxeBuilder = null;
try { ({ default: AxeBuilder } = await import('@axe-core/playwright')); } catch { r.warn('axe', '@axe-core/playwright not installed; accessibility scan skipped'); }

if (!fs.existsSync(DIST)) { r.error('dist', 'not found. Run "npm run build" first.'); process.exit(r.print()); }
fs.mkdirSync(OUT, { recursive: true });

// --- tiny static server for dist (directory index, 404.html) ---
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(DIST, p);
  if (!f.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': MIME['.html'] }); const nf = path.join(DIST, '404.html'); return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900 },
];
const pages = requiredPageList(villa, DIST).filter((p) => !only || p.page === only);
const browser = await chromium.launch();

try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: 'reduce' });
    for (const p of pages) {
      const where = `${p.urlPath} [${vp.name}]`;
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ text: m.text(), url: m.location()?.url || '' }); });
      page.on('pageerror', (e) => consoleErrors.push({ text: String(e), url: '' }));
      const failed = [];
      page.on('requestfailed', (q) => { if (q.url().startsWith(BASE)) failed.push(q.url().slice(BASE.length)); });

      const resp = await page.goto(BASE + p.urlPath, { waitUntil: 'load', timeout: 30000 }).catch((e) => { r.error(where, `navigation failed: ${e.message}`); return null; });
      if (!resp) { await page.close(); continue; }
      if (resp.status() !== 200) r.error(where, `HTTP ${resp.status()}`);

      // scroll through the page so lazy images and widgets load
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) { window.scrollTo(0, y); await new Promise((z) => setTimeout(z, 120)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(600);

      // 1. no horizontal overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) r.error(where, `horizontal overflow of ${overflow}px (page scrolls sideways)`); else r.ok();

      // 2. broken images
      const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc.startsWith(location.origin)).map((i) => i.currentSrc));
      for (const b of broken) r.error(where, `broken image ${b}`);
      for (const f of failed) r.error(where, `failed request ${f}`);
      if (!broken.length && !failed.length) r.ok();

      // 3. console errors (own code = fail, third-party = warn)
      for (const e of consoleErrors) {
        const thirdParty = (e.url && !e.url.startsWith(BASE)) || /hostaway|cloudfront|holidayfuture/i.test(e.text);
        if (thirdParty) r.warn(where, `third-party console error (${e.url || 'external'}): ${e.text.slice(0, 120)}`);
        else r.error(where, `console error: ${e.text.slice(0, 200)}`);
      }

      // 4. booking CTA reachable: a [data-cta="book"] must be visible after scrolling to the middle
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(300);
      const ctaVisible = await page.evaluate(() => [...document.querySelectorAll('[data-cta="book"]')].some((el) => {
        const b = el.getBoundingClientRect(); const s = getComputedStyle(el);
        return b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= innerHeight && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0;
      }));
      if (p.page !== 'book' && !ctaVisible) r.error(where, 'no visible [data-cta="book"] in the viewport mid-page (needs a sticky "Check dates" button)'); else r.ok();
      await page.evaluate(() => window.scrollTo(0, 0));

      // 5. tap targets on mobile (links/buttons at least 40x40 CSS px, inline text links excluded)
      if (vp.isMobile) {
        const small = await page.evaluate(() => [...document.querySelectorAll('button, [role=button], nav a, header a, footer a, [data-cta]')]
          .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.height < 40 && b.width < 40); })
          .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)));
        if (small.length) r.warn(where, `small tap targets: ${small.slice(0, 5).join(' | ')}`); else r.ok();
      }

      // 6. Book page: Hostaway widget container rendered
      if (p.page === 'book') {
        await page.locator('#hostaway-calendar-widget').scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(2500);
        const h = await page.evaluate(() => document.getElementById('hostaway-calendar-widget')?.getBoundingClientRect().height ?? -1);
        if (h < 0) r.error(where, '#hostaway-calendar-widget missing');
        else if (h < 50) r.warn(where, 'Hostaway widget rendered no content (normal offline; must render on the live site)');
        else r.ok();
      }

      // 7. accessibility (desktop only, serious + critical violations fail)
      if (AxeBuilder && vp.name === 'desktop') {
        const res = await new AxeBuilder({ page }).exclude('#hostaway-calendar-widget').analyze();
        for (const v of res.violations) {
          const msg = `a11y ${v.impact}: ${v.id} (${v.nodes.length}x) ${v.help}`;
          if (v.impact === 'serious' || v.impact === 'critical') r.error(where, msg); else r.warn(where, msg);
        }
        if (!res.violations.length) r.ok();
      }

      if (shots) await page.screenshot({ path: path.join(OUT, `${p.locale}-${p.page}-${vp.name}.png`), fullPage: true });
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (shots) console.log(`\nScreenshots: ${path.relative(ROOT, OUT)}/ (open and review them against CLAUDE.md "Design")`);
process.exit(r.print());
