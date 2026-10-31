# Launch checklist (owner)

## Before the build
- [ ] Create a **public** GitHub repository (e.g. `chalet-website`) and copy this whole kit into it (from the zip, so the hidden `.github` and `.claude` folders come along).
- [ ] Repo **Settings → Pages → Source: GitHub Actions**.
- [ ] Fill in what you can in `content/chalet.yaml` (`npm run todo` lists the gaps): prices, cleaning fee, deposit, tourist tax, bed sizes, walking time to the lifts, owner name, registration number, classification.
- [ ] Confirm the `verified: false` items: map pin, balneo bathtub, bunk room, restaurants.
- [ ] Decide the minimum stays and set them from `proposed` to `confirmed`.

## Proofreading (no longer blocks deployment; see BUILD-REPORT decision 15)
- [ ] Read every page in **French and English** (`npm run dev`, then http://localhost:4321).
- [ ] Set `reviewed: true` / `"_reviewed": true` on each approved file.
- [ ] Have the Legal notice, Terms (CGV) and Privacy pages checked.

## Hostaway (listing 559125)
- [ ] Booking website published at `book.lesalpagesdusoleil.com` (CNAME `book` → Hostaway; HTTPS must work before the site points there); colours `#2E5E86` / `#F6F3EE`; logo.
- [ ] Same facts as chalet.yaml: check-in 16:00, check-out 10:00, size, rules, cancellation, cleaning fee.
- [ ] Turn on **Google Vacation Rentals**.
- [ ] Platform titles start with "Les Alpages du Soleil" (Airbnb listing name field), descriptions without "luxe", registration number when issued.
- [ ] Re-check the Abritel listing (the old link is dead).

## Domain and email (Nuxit)
- [ ] Name servers: the domain is registered at Nuxit but uses Wix's (`ns4/ns5.wixdns.net`, old Wix site). Switch them to Nuxit's `ns1.modns.fr` / `ns2.modns.fr` (same as dolceazzurra.com); these already hold the domain's Nuxit zone.
- [ ] DNS: `CNAME` `www` → `hninou.github.io.`; four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; delete old `A`/`CNAME` for `@` and `www`.
- [ ] GitHub Pages: custom domain `www.lesalpagesdusoleil.com` → Enforce HTTPS.
- [ ] Email: ImprovMX MX records + one SPF TXT record (`v=spf1 include:spf.improvmx.com include:_spf.google.com ~all`), same as dolceazzurra.com: delete the old Nuxit mail records (MX `mail`/`mx14`/`mx15`, A `mail`, `webmail`, `lists`); add the domain in ImprovMX with the alias `stay` → the owner's Gmail; then Gmail "Send mail as" for `stay@lesalpagesdusoleil.com`. (`contact.email` in chalet.yaml is already `stay@lesalpagesdusoleil.com`.)

## After launch
- [ ] Google Search Console (Domain property, TXT record), sitemap **full URL**: `https://www.lesalpagesdusoleil.com/sitemap-index.xml`; request indexing for `/` and `/en/`.
- [ ] URL inspection: 0 critical issues on the vacation-rental data.
- [ ] Test a full booking from the live site on a phone.
- [ ] Instagram bio, Hostaway guest guide, welcome binder: link to the site.
- [ ] Mid-December photo shoot (shot list in `content/photos.yaml`), then replace the low-resolution interior photos.
- [ ] DE, then NL: native proofreader → set `status: live` in chalet.yaml.
