# CLAUDE.md: Les Alpages du Soleil website

You are building the direct-booking website for **Les Alpages du Soleil**, a chalet for 12 in the old village of La Rosière 1850 (Montvalezan, Savoie, France).
Static site on **GitHub Pages** at **https://www.lesalpagesdusoleil.com**. Bookings are handled by the owner's **Hostaway** account.

This kit follows the same system as the owner's other site (Villa Dolce & Azzurra, dolceazzurra.com), including the fixes learned there. Read this whole file before writing code. When the spec and your instinct disagree, the spec wins. When it is silent, choose the simplest option that keeps every check green and record the decision in `docs/BUILD-REPORT.md`.

---

## 0. Definition of done

1. `npm run build` succeeds.
2. `npm run verify -- --strict` prints `RESULT: PASS`.
3. `npm run check:visual` prints `RESULT: PASS`.
4. You have **looked at every screenshot** in `.verify/screenshots/` and they meet section 5.
5. `docs/BUILD-REPORT.md` is up to date, including the output of `npm run todo`.
6. Everything is committed and pushed to `main`; the GitHub Actions deploy is green.

Never claim a step is done without running its check and reading the output.

---

## 1. Read these first

| File | What it is |
| --- | --- |
| `content/chalet.yaml` | **Single source of truth for every fact**: capacity, rules, booking IDs, ski area, access, locales, prices (mostly TODO_OWNER for now). |
| `content/copy-brief.md` | Voice, key messages, **banned claims**, front-page order and draft headlines in FR and EN. |
| `content/photos.yaml` | Photo catalogue: file, size, role (hero / feature / gallery), group, season, quality, English alt text, and the shot list still missing. |
| `reference/old-site-v1.html`, `reference/old-site-v2.html` | The two old one-page sites. **Content source only.** Do not copy their structure, claims ("luxe", "meilleur tarif"), `?lang=` links or dead links. |
| `docs/PROPOSAL.md` | The strategy behind the site. |
| `docs/LAUNCH-CHECKLIST.md` | What only the owner can do. |

---

## 2. Non-negotiable rules

1. **Facts come from `content/chalet.yaml`.** Never invent a fact, price, distance, review, label or bed size. `TODO_OWNER` = omit the element and list it in the build report.
2. **Banned claims** (see copy brief): no "luxe/luxury", no "best price", no "ski-in/ski-out" or "au pied des pistes" (the lifts are 300 m away), no "tout compris/all inclusive" while `rates.all_inclusive` is false, no hype words, no star ratings until a classification is in chalet.yaml. Real guest quotes are rendered verbatim inside an element with `data-quote`.
3. **Never publish access information:** no Wi-Fi password, key-box code or door code, anywhere. They belong in the guest guide (Touchstay/Hostaway), not on the website.
4. **One booking path: Hostaway** (listing 559125). Every page has a visible "Check dates" button (`data-cta="book"`) to the Book page with the calendar widget. No Abritel/Airbnb links.
5. **Registration number:** when `legal.registration_number` is filled in, it appears in the footer of every page (the verifier enforces this). Until then, the footer shows the legal notice link only.
6. **No third-party requests** except the Hostaway widget (`d2q3n06xhbi0am.cloudfront.net`, `lesalpagesdusoleil.holidayfuture.com`). Self-hosted fonts, no Google Maps embeds (a link only), no analytics, no cookie banner.
7. **No hidden text, keyword lists or `meta keywords`.**
8. **Draft locales (`de`, `nl`) are not built** until chalet.yaml marks them `live`.
9. **The repo is public.** No secrets, guest data or access codes.
10. **Don't touch** `content/`, `reference/` or `scripts/` except to fix a genuine bug in a script (explain it in the build report). Never weaken a check.

---

## 3. Stack and setup

Same stack as Dolce & Azzurra: **Astro** (static), plain CSS with custom properties, minimal vanilla JS, Node 20+, `astro:assets` for images, Fontsource for fonts, `@astrojs/sitemap`.

```bash
npm install astro @astrojs/sitemap sharp yaml @fontsource-variable/literata @fontsource-variable/inter
npm install -D playwright @axe-core/playwright
npx playwright install chromium
mkdir -p src/assets/photos src/assets/brand public
cp assets/photos/*.jpg src/assets/photos/
cp assets/brand/mark-transparent.svg assets/brand/favicon.svg src/assets/brand/
cp assets/brand/favicon.svg public/favicon.svg
```

`package.json` already has the scripts (`dev`, `build`, `preview`, `verify`, `check:visual`, `todo`, `check`). Keep them.

`astro.config.mjs`:
- `site: 'https://www.lesalpagesdusoleil.com'`, `trailingSlash: 'always'`, `build: { format: 'directory' }`
- `i18n: { defaultLocale: 'fr', locales: <live codes from chalet.yaml>, routing: { prefixDefaultLocale: false } }`
- sitemap with i18n locales built from chalet.yaml (`fr: 'fr-FR', en: 'en-GB'`, later `de: 'de-DE', nl: 'nl-NL'`)
- `public/CNAME` = `www.lesalpagesdusoleil.com`; `public/robots.txt` with `Sitemap: https://www.lesalpagesdusoleil.com/sitemap-index.xml`

---

## 4. Architecture

### URLs (same short slugs in every language; French at the root)

| Page | FR | EN |
| --- | --- | --- |
| Home | `/` | `/en/` |
| Le chalet / The Chalet | `/chalet/` | `/en/chalet/` |
| Galerie / Gallery | `/gallery/` | `/en/gallery/` |
| Hiver / Winter | `/winter/` | `/en/winter/` |
| Été / Summer | `/summer/` | `/en/summer/` |
| Accès / Getting here | `/access/` | `/en/access/` |
| Services | `/services/` | `/en/services/` |
| Réserver / Book | `/book/` | `/en/book/` |
| Mentions légales / Legal notice | `/legal/` | `/en/legal/` |
| CGV / Booking terms | `/terms/` | `/en/terms/` |
| Confidentialité / Privacy | `/privacy/` | `/en/privacy/` |
| 404 | `/404.html` | |

These are exactly `REQUIRED_PAGES` in `scripts/lib/site.mjs`. Page titles and headings are translated; the slugs stay the same.

### Folders

```
src/pages/[...locale]/index.astro, chalet.astro, gallery.astro, winter.astro, summer.astro, access.astro,
       services.astro, book.astro, legal.astro, terms.astro, privacy.astro     # getStaticPaths: undefined (fr) + other live codes
src/pages/404.astro
src/layouts/Base.astro       # <html lang>, head (title, description, canonical, hreflang, OG), header, footer, sticky CTA
src/components/              # Header, Footer, LanguageSwitcher, StickyCta, Hero (seasonal), FactsStrip, Section, Figure,
                             # Gallery, Lightbox, BookingWidget, Faq, ThreePoints, Reviews, AccessList, ServiceCard
src/content/pages/<locale>/<page>.md   # long-form copy; frontmatter: title, description, reviewed: false
src/i18n/<locale>.json       # UI strings; first key "_reviewed": false
src/lib/facts.ts             # loads content/chalet.yaml at build time
src/lib/i18n.ts, src/lib/photos.ts
```

### Head (verifier-enforced)

`<html lang>`, one `<h1>`, title 10–70 chars, unique meta description 50–170 chars, absolute canonical with trailing slash, `hreflang` for every live locale + `x-default` (pointing to the FR root), `og:title`, `og:image` (absolute, 1200×630), viewport, no `meta keywords`.

### Legacy URLs

The root page includes a tiny inline script: if `?lang=` is a live locale other than `fr`, `location.replace('/<code>/')`.

### Seasonal hero

The home hero shows `01-bain-nordique-terrasse-hiver` from December to April and `38-alpages-ete` from May to November. Render both `<picture>` elements; an inline script in `<head>` sets `data-season` on `<html>` from the current month; CSS shows the matching one. Without JS, show the winter one. The headline and the first line of copy stay the same; only the image and a short seasonal line change.

### Translation workflow

FR first, then EN. Every new or changed file starts `reviewed: false` / `"_reviewed": false`; only the owner flips it after proofreading. `verify` warns; `verify --strict` (CI) fails. DE and NL: write drafts only when asked.

---

## 5. Design

**Concept:** old larch wood, slate, snow light and low winter sun. Big photos, a warm off-white background, calm type, a lot of air. Cosier than the villa site, never kitsch: no snowflake icons, no script fonts, no fake wood textures.

```css
:root {
  --c-bg: #F6F3EE;      /* snow linen: page background */
  --c-surface: #ECE6DD; /* bands, cards */
  --c-ink: #2A2622;     /* charred larch: text */
  --c-ink-soft: #5A544E;
  --c-sky: #2E5E86;     /* alpine sky: buttons, links */
  --c-larch: #B98A4E;   /* reclaimed wood: thin rules, small details */
  --c-slate: #6E7072;   /* stone: secondary details */
  --c-sun: #E2A23B;     /* sunset gold: rare highlight (booking band, logo sun) */
  --font-display: "Literata Variable", Georgia, serif;
  --font-text: "Inter Variable", system-ui, sans-serif;
  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
  --step-0:  clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --step-1:  clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-2:  clamp(1.6rem, 1.4rem + 1vw, 2.2rem);
  --step-3:  clamp(2.1rem, 1.7rem + 2vw, 3.4rem);
  --step-4:  clamp(2.6rem, 2rem + 3vw, 4.6rem);
  --space-1: 0.5rem; --space-2: 1rem; --space-3: 1.5rem; --space-4: 2.5rem; --space-5: 4rem; --space-6: 6.5rem;
  --measure: 38rem; --wide: 76rem; --radius: 4px;
}
```

- **Typography:** Literata for headings (weight 400–500), Inter for text; label style (Inter 500, small caps-like uppercase, letter-spacing .08em) for section kickers.
- **Layout:** mobile first; full-bleed photos at section starts; one calm text column; image + text pairs on desktop.
- **Photos:** crops must keep the peaks and horizon visible. Never show a low-quality (`quality: low`) photo larger than 900 px wide; use them in grids and the gallery, not as full-bleed images.
- **Header:** the sun-and-mountains mark (`mark-transparent.svg`, recoloured with `currentColor`) + "Les Alpages du Soleil" set in Literata; nav (Le chalet, Galerie, Hiver, Été, Accès); language switcher; "Voir les disponibilités" button. Transparent over the hero, solid after scroll.
- **Sticky CTA on mobile:** "Voir les disponibilités · à partir de … € / semaine" (price only when `rates.weekly_from` is set), `data-cta="book"`; hidden on the Book page.
- **Facts strip, three points, reviews, booking band:** see the copy brief for order and content.
- **Footer:** contact (email, phone, WhatsApp, Instagram), address, registration number (when set), legal links, © year. **No slogan.**
- **Motion:** subtle fades only; respect `prefers-reduced-motion`.
- **Accessibility:** WCAG 2.2 AA, focus rings, skip link, landmarks, translated alt text, 44 px tap targets.

---

## 6. Pages

Follow `content/copy-brief.md`. Structural notes:

- **Home:** the essentials → trust → booking order in the copy brief. `VacationRental` JSON-LD with `additionalType: "Chalet"`, `containsPlace.occupancy = {"@type":"QuantitativeValue","value":12}`, `numberOfBedrooms: 5`, `numberOfBathroomsTotal: 4`, `floorSize` 170 m², ≥ 8 absolute image URLs, address, geo, `identifier` = registration number when set. **No `maxValue`, no `aggregateRating`, no `review`.** (Both mistakes were caught by Google Search Console on the villa site.)
- **Le chalet:** spaces from chalet.yaml (balneo bathtub only if verified), bedrooms with bed sizes only when filled in, amenities, included list, house rules, hot tub: how it works (wood stove, guests light it; firewood supplied).
- **Winter:** ski area facts with the source link, the walking route to the lifts, Italy, Famille Plus, verified restaurants only.
- **Summer:** from chalet.yaml `location.summer`.
- **Access:** from chalet.yaml `location.access`; "Open in Google Maps" link to the address.
- **Book:** `BookingWidget`, price lines (from, cleaning fee) only when set, minimum stay (only non-`proposed` rules; otherwise "La durée minimale varie selon la saison, voir le calendrier"), cancellation, deposit (when set), included list, house rules, FAQ.
- **Legal / Terms / Privacy:** section 9.

---

## 7. Booking: Hostaway calendar widget

Identical to the villa kit: `src/components/BookingWidget.astro`, one per page, lazy-loaded near the viewport, `<noscript>` fallback link to `booking.listing_url`.

```html
<div id="hostaway-calendar-widget"></div>
<script src="https://d2q3n06xhbi0am.cloudfront.net/calendar.js"></script>
<script>
  window.hostawayCalendarWidget({
    baseUrl: 'https://lesalpagesdusoleil.holidayfuture.com/',   // chalet.yaml booking.base_url
    listingId: 559125,                                         // chalet.yaml booking.listing_id
    numberOfMonths: 2, openInNewTab: false, font: 'Open Sans', rounded: false,
    button: { action: 'checkout', text: 'Voir les disponibilités' },   // localize
    clearButtonText: 'Effacer les dates',                              // localize
    color: { mainColor: '#2E5E86', frameColor: '#ECE6DD', textColor: '#2A2622' },
  });
</script>
```

Inject values from chalet.yaml at build time. The widget will not render in local checks (warning, not failure).

---

## 8. SEO and performance

- Titles and descriptions per page and language, written for people. Phrases to use naturally: FR "chalet La Rosière 12 personnes bain nordique", EN "La Rosière chalet with hot tub for 12", DE "Chalet La Rosière 12 Personen Whirlpool", NL "chalet La Rosière 12 personen hottub".
- Sitemap with i18n alternates; robots.txt; canonical + hreflang as above.
- Budgets: HTML ≤ 200 KB/page, JS ≤ 200 KB, no shipped image > 450 KB, hero `fetchpriority="high"`, everything else lazy.

---

## 9. French legal pages (the owner must review them)

- **Mentions légales:** owner or company (`legal.owner_name`), address, phone, email, publication director, host: GitHub, Inc. (88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). Registration number and classification when set.
- **CGV / Booking terms:** booking through Hostaway, prices in EUR, cleaning fee, deposit (when set), cancellation (`legal.cancellation`), tourist tax (when set), arrival 16:00 / departure 10:00, house rules, capacity 12 maximum.
- **Confidentialité:** no cookies or analytics on this site; booking data processed by Hostaway (link their privacy policy); contact for data requests.
- Mark all three `reviewed: false`.

---

## 10. Working method (phases and gates)

| Phase | Build | Gate |
| --- | --- | --- |
| 0. Setup | Install, config, folders, tokens, Base layout, minimal versions of all required pages in FR and EN with correct head, footer and sticky CTA | `npm run build && npm run verify` |
| 1. Design system | Header, footer, seasonal hero, facts strip, three points, gallery + lightbox, reviews, booking widget, FAQ | `npm run check` + **review screenshots** |
| 2. French content | All FR pages, complete, from chalet.yaml + copy brief | `npm run check` + screenshots |
| 3. English | EN translations (`reviewed: false`) and translated alt text | `npm run check` + screenshots of `en-*` |
| 4. SEO polish | JSON-LD (section 6), OG images, legacy redirect, 404 | `npm run check` |
| 5. Deploy | Push to `main`; confirm the Action is green | Action green; owner does DNS |

After each phase: run the gate, fix until green, update `docs/BUILD-REPORT.md` (with `npm run todo`), commit. Review the PNGs in `.verify/screenshots/` like a demanding art director. When a fact is missing, omit it and continue; don't stop.

---

## 11. Verification reference

As in the villa kit, plus the chalet-specific rules:

| Command | Checks |
| --- | --- |
| `npm run verify` | Required pages per live locale; draft locales absent; head tags; hreflang; one h1; registration number on every page (once set); booking link + `data-cta="book"`; Hostaway widget; images; third-party hosts; hidden text; placeholders; **banned claims** (luxe, best price, ski-in, all-inclusive, hype, Wi-Fi password, dead old links; guest quotes in `[data-quote]` exempt); JSON-LD (`VacationRental`, `occupancy.value`, `additionalType: "Chalet"`, no ratings); internal links; CNAME, robots, sitemap; legacy redirect; budgets; translation review flags (`--strict` fails). |
| `npm run check:visual` | Every required page at 390×844 and 1440×900: HTTP 200, no overflow, no broken images, no console errors from our code, sticky CTA visible mid-page, tap targets, Hostaway container, axe accessibility; screenshots. |
| `npm run todo` | Facts the owner must supply (`TODO_OWNER`), facts to confirm (`verified: false`), unconfirmed photos. |

---

## 12. Deployment

`.github/workflows/deploy.yml` builds, runs `verify` and `check:visual --no-shots`, then deploys to GitHub Pages. The owner sets **Settings → Pages → Source: GitHub Actions** and the custom domain `www.lesalpagesdusoleil.com` with "Enforce HTTPS", and updates DNS at Nuxit (see `docs/LAUNCH-CHECKLIST.md`). The owner chose to publish before proofreading, so CI runs `verify` without `--strict`: unreviewed translations are warnings, not deploy blockers. Run `verify -- --strict` locally to list what is still unproofread.
