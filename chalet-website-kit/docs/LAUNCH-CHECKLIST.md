# Launch checklist (owner)

## Before the build
- [ ] Create a **public** GitHub repository (e.g. `chalet-website`) and copy this whole kit into it (from the zip, so the hidden `.github` and `.claude` folders come along).
- [ ] Repo **Settings → Pages → Source: GitHub Actions**.
- [ ] Fill in what you can in `content/chalet.yaml` (`npm run todo` lists the gaps): prices, cleaning fee, deposit, tourist tax, bed sizes, walking time to the lifts, owner name, registration number, classification.
- [ ] Confirm the `verified: false` items: map pin, balneo bathtub, bunk room, restaurants.
- [ ] Decide the minimum stays and set them from `proposed` to `confirmed`.

## Proofreading (blocks deployment until done)
- [ ] Read every page in **French and English** (`npm run dev`, then http://localhost:4321).
- [ ] Set `reviewed: true` / `"_reviewed": true` on each approved file.
- [ ] Have the Legal notice, Terms (CGV) and Privacy pages checked.

## Hostaway (listing 559125)
- [ ] Booking website published at `lesalpagesdusoleil.holidayfuture.com`; colours `#2E5E86` / `#F6F3EE`; logo.
- [ ] Same facts as chalet.yaml: check-in 16:00, check-out 10:00, size, rules, cancellation, cleaning fee.
- [ ] Turn on **Google Vacation Rentals**.
- [ ] Platform titles start with "Les Alpages du Soleil" (Airbnb listing name field), descriptions without "luxe", registration number when issued.
- [ ] Re-check the Abritel listing (the old link is dead).

## Domain and email (Nuxit)
- [ ] Confirm the Nuxit domain is `lesalpagesdusoleil.com` and what currently serves it (old Wix site?). Switch DNS only when the new site is ready.
- [ ] DNS: `CNAME` `www` → `<github-username>.github.io`; four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; delete old `A`/`CNAME` for `@` and `www`.
- [ ] GitHub Pages: custom domain `www.lesalpagesdusoleil.com` → Enforce HTTPS.
- [ ] Email: ImprovMX MX records + one SPF TXT record (`v=spf1 include:spf.improvmx.com include:_spf.google.com ~all`), then Gmail "Send mail as" for `contact@lesalpagesdusoleil.com`. Then update `contact.email` in chalet.yaml.

## After launch
- [ ] Google Search Console (Domain property, TXT record), sitemap **full URL**: `https://www.lesalpagesdusoleil.com/sitemap-index.xml`; request indexing for `/` and `/en/`.
- [ ] URL inspection: 0 critical issues on the vacation-rental data.
- [ ] Test a full booking from the live site on a phone.
- [ ] Instagram bio, Hostaway guest guide, welcome binder: link to the site.
- [ ] Mid-December photo shoot (shot list in `content/photos.yaml`), then replace the low-resolution interior photos.
- [ ] DE, then NL: native proofreader → set `status: live` in chalet.yaml.
