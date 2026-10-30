# Build report

Claude Code updates this file at the end of every phase (see CLAUDE.md section 10).

## Status
| Phase | Status | Gate result | Date |
| --- | --- | --- | --- |
| 0. Setup | done | `build` OK, `verify` PASS | 2026-10-30 |
| 1. Design system | done | `check` PASS, screenshots reviewed | 2026-10-30 |
| 2. French content | done (`reviewed: false`) | `check` PASS, screenshots reviewed | 2026-10-30 |
| 3. English | done (`reviewed: false`) | `check` PASS, `en-*` screenshots reviewed | 2026-10-30 |
| 4. SEO polish | done | `check` PASS | 2026-10-30 |
| 5. Deploy | **waiting for the owner** (GitHub Pages settings, DNS) | CI runs `verify` without `--strict` (decision 15): PASS | 2026-10-30 |

Latest results (30 Oct 2026):
- `npm run build`: 23 pages (11 FR + 11 EN + 404).
- `npm run verify`: **PASS**, 1386 checks, 0 failures. Warnings: translation review flags (24), registration number not set.
- `npm run verify -- --strict`: **FAIL** with 24 failures, all of them "not yet reviewed" flags. Nothing else fails.
- `npm run check:visual`: **PASS**, 176 checks, 0 failures. 4 warnings: small buttons inside the Hostaway calendar (third-party markup) on Home and Book, mobile.
- All 44 screenshots in `.verify/screenshots/` reviewed, plus manual captures of the mobile menu, the lightbox, the winter hero (forced January date) and the legacy `?lang=en` redirect.

## What was built
- Astro 7 static site, plain CSS with the CLAUDE.md tokens, 3–4 KB of inline vanilla JS per page, no JS files (menu, header state, sticky CTA, lightbox, lazy Hostaway loader, fade-ins).
- 11 pages × FR (root) and EN (`/en/`), plus `/404.html`. DE and NL are not built (draft in chalet.yaml).
- Home hero: `17` (living room and glass gable) all year (decision 17). `<html data-season>` is set in `<head>` and switches only the short seasonal line under the headline; winter without JS.
- Hostaway calendar on Home and Book (one per page), loaded when it comes within 600 px of the viewport, `<noscript>` text and a permanent "Ouvrir la page de réservation" fallback link to `booking.listing_url`.
- `VacationRental` JSON-LD on both home pages: `additionalType: "Chalet"`, `containsPlace` with `occupancy {"@type":"QuantitativeValue","value":12}`, 5 bedrooms, 4 bathrooms, 170 m² (`MTK`), 12 absolute image URLs, address, geo, check-in/out, amenities. No `maxValue`, no rating, no review. `identifier` is added automatically once the registration number is set.
- OG image per page (1200×630 JPEG crop), canonical, hreflang `fr-FR`/`en-GB`/`x-default`, sitemap with i18n alternates, `robots.txt`, `CNAME`.
- Legacy redirect: `/?lang=en` → `/en/` (inline script on the FR root only).

## Decisions
1. **Kit moved to the repo root.** The kit was committed in `chalet-website-kit/`; its README says to copy it to the root, and GitHub Actions only reads `.github/workflows/` there. Moved with `git mv` (history kept). The old two-line root README was replaced by the kit README.
2. **CI uses Node 22.** `npm install` resolved Astro 7.4, which requires Node ≥ 22.23. The workflow pinned Node 20, so CI would have failed before any check. `deploy.yml` now uses `node-version: 22` and `package.json` `engines` says `>=22.23` (the spec's "Node 20+" still holds).
3. **Bug fix in `scripts/verify.mjs`** (allowed by CLAUDE.md rule 10). The ski-in pattern `/ski[\s-]?in|ski[\s-]?out/` had no word boundary, so the ordinary word "skiing" failed the build as a ski-in claim. Changed to `/\bski[\s-]?in\b|\bski[\s-]?out\b/`. "ski-in", "ski in", "skiin" and "ski-out" are still caught; nothing else in the check changed. Separate commit.
4. **Translating chalet.yaml facts.** chalet.yaml writes most facts in English. French versions live in `src/i18n/fr.json` → `"facts"`, keyed by the exact English sentence. If the owner edits a fact in chalet.yaml, the build stops with "Missing translation of chalet.yaml fact…" until the French line is updated, so a stale translation can never ship. Same for alt text (`"alt"`, keyed by photo number).
5. **Page copy uses `{tokens}`** (`{guests}`, `{distance}`, `{km}`, `{checkIn}`…) filled from chalet.yaml at build time, so the Markdown never retypes a number. An unfilled token is a build error. Copy lives in Markdown frontmatter (`src/content/pages/<locale>/<page>.md`); bodies are empty.
6. **Typography:** a number is always kept with its unit ("300 m", "12 personnes") and French gets non-breaking spaces before `; : ! ?` and inside « ».
7. **Omitted because the fact is missing or unconfirmed:** weekly price (hero line, sticky CTA, booking facts), cleaning fee amount (the text says it is added and shown before payment, since `all_inclusive: false`), deposit, tourist tax, bed sizes, walking time to the lifts, owner name (legal notice says "the operator of the chalet"), registration number and classification, all three restaurants (`verified: false`), the balneo bathtub (`verified: false`). The bunk-bed room is not listed as a fact (unverified) but photo 26 is shown with its catalogue alt text.
8. **Minimum stay:** all rules are `proposed`, so every page shows "La durée minimale varie selon la saison, voir le calendrier." Confirmed rules will be listed automatically.
9. **Hostaway rating not displayed.** chalet.yaml has 5.0 from a single review; showing "5.0" on one review reads as a claim and star ratings are banned until classification. Only Fabrice's quote is shown, verbatim in `[data-quote]`, in French on both languages.
10. **Footer** has contact, address, legal links, language switch and ©; no slogan. Registration number appears automatically once set.
11. **Images:** WebP for content photos, AVIF + WebP for heroes. Low-quality (1024 px) photos are generated at 900 px maximum and only used in grids, image pairs and the gallery. Portrait photos are capped at 1200 px wide, others at 1600 px (heroes 1920). Largest shipped image: 384 KB. Photos 40, 42 and 45 are not published (decision 16).
12. **Fonts:** only the Latin and Latin Extended subsets of Literata and Inter are shipped (enough for FR, EN, DE, NL).
13. **Services:** each card's "Nous demander / Ask us" opens WhatsApp with the service name prefilled. No partner phone numbers.
14. **Privacy page** links Hostaway's privacy policy (`https://www.hostaway.com/privacy-policy/`, checked: HTTP 200).
15. **Publishing before proofreading (owner's decision, 30 Oct 2026).** The deploy workflow now runs `npm run verify` instead of `npm run verify -- --strict`. `--strict` only turns the 24 "not yet reviewed" warnings into failures; every other check still blocks the deploy, and `scripts/verify.mjs` is unchanged. To block unproofread copy again, put `-- --strict` back in `.github/workflows/deploy.yml`.
16. **Photo review (owner, 30 Oct 2026).** The summer home hero is now `36` (the hot tub facing the peaks), matching the winter hero `01`; `38` was a landscape that showed nothing of the chalet and stays on the Summer page and in the gallery. Not published: `40` (an identifiable person on an unfinished-looking terrace), `42` and `45` (a neighbour's washing; `45` also telecom masts); they stay in `content/photos.yaml` and `assets/photos/`, are filtered out in `src/lib/photos.ts`, and their copies were removed from `src/assets/photos/` (otherwise Astro ships the original files). On the Summer page `44` replaces `45` and panorama `41` replaces `42`; the home "terrace" card uses `35` so it never repeats the summer hero; in the JSON-LD `37` replaces `38`. All other photos checked: nothing inappropriate.
17. **Home hero is the living room (owner, 30 Oct 2026).** The owner preferred an interior over the hot tub and chose between `16` and `17`; `17` was picked because it shows the glass gable and the peaks with little snow, so it works all year (`16` has a decorated Christmas tree). The seasonal photo swap is gone; the seasonal line stays. `17` is a low-quality 1024 px source, against the design rule "never show a low-quality photo larger than 900 px": the hero ships it at its native 1024 px (no upscaled files), so it looks soft on large screens until the December shoot provides a sharp version of this view. The first "three points" card now uses `23` (the table for 12) instead of `13`, which showed the same view as the hero, and the home photo strip uses `14` instead of `13` for the same reason. A visitor-facing winter/summer switch was prototyped and dropped by the owner (too crowded).

## Remaining warnings
- **Translation review (no longer blocks the deploy, decision 15):** all 22 page files and both `src/i18n/*.json` are `reviewed: false` / `"_reviewed": false`.
- **Contact email** is now `stay@lesalpagesdusoleil.com` (owner, 30 Oct 2026). It only receives mail once the ImprovMX records are live (see the launch checklist).
- **Registration number** not set.
- **Hostaway widget:** its day names and the "Select check-in and check-out dates" line are in English on the French pages, and its buttons are smaller than 44 px on mobile. These come from Hostaway's script; only the two button labels are configurable (done). At run time the widget contacts `d2q3n06xhbi0am.cloudfront.net` and `booking-engine.hostaway.com` (Hostaway's API); it loads no Google Fonts. No other page makes a third-party request.
- **Geo coordinates** (`verified: false`) are published in the JSON-LD as allowed; please confirm the map pin.

## Owner to-do
Output of `npm run todo` (30 Oct 2026):

```
## Missing facts (TODO_OWNER): 13
- [ ] legal.registration_number
- [ ] legal.classification
- [ ] legal.owner_name
- [ ] legal.tourist_tax
- [ ] legal.security_deposit
- [ ] rates.weekly_from
- [ ] rates.cleaning_fee
- [ ] rates.periods
- [ ] chalet.bedrooms.1.beds
- [ ] chalet.bedrooms.2.beds
- [ ] chalet.bedrooms.3.beds
- [ ] chalet.bedrooms.4.beds
- [ ] location.to_lifts.walk_minutes

## Facts from a single source, to confirm: 6
- [ ] legal.geo
- [ ] chalet.bedrooms.5
- [ ] chalet.spaces.balneo
- [ ] location.restaurants.Le Miroir
- [ ] location.restaurants.Lo Riondet
- [ ] location.restaurants.Tout Poudre

## Photos with unconfirmed rights (not published): 0
```

Also (see `docs/LAUNCH-CHECKLIST.md`):
- [ ] Proofread FR and EN (`npm run dev`, http://localhost:4321), then set `reviewed: true` in each `src/content/pages/*/*.md` and `"_reviewed": true` in `src/i18n/fr.json` and `en.json`.
- [ ] Have the Mentions légales, CGV and Confidentialité pages checked.
- [ ] When you fill in bed sizes for bedroom 5 ("bunk beds") or confirm restaurants, add the French wording to `src/i18n/fr.json` → `"facts"`; the build will tell you the exact key it needs.
- [ ] GitHub: Settings → Pages → Source: GitHub Actions; custom domain `www.lesalpagesdusoleil.com`, Enforce HTTPS; DNS at Nuxit.
