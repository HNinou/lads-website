# Copy brief: Les Alpages du Soleil

French is the source language (the default locale, at `/`). Write FR first, then EN; the owner proofreads both.
DE and NL are drafted only when asked and stay `status: draft` until a native speaker has reviewed them.

## Positioning (one line)

FR: Un chalet ensoleillé pour 12 dans le vieux village de La Rosière : un bain nordique face aux sommets, les remontées à 300 m, la France et l'Italie sur les mêmes skis.
EN: A sunny chalet for 12 in the old village of La Rosière: a wood-fired hot tub facing the peaks, the lifts 300 m away, France and Italy on the same skis.

## Who reads this

- One organiser booking a school-holiday week for two or three families (FR, NL, DE, UK).
- Groups of friends (UK, FR, NL) in January and March.
- Multigenerational families at Christmas and in summer.
- Summer hikers and families (FR, NL, DE).

## Voice

- Warm, practical, specific: a good host explaining the chalet. Cosier than the Dolce & Azzurra villa site (wood, fire, snow, sun), never sugary.
- Short sentences. Numbers, names, minutes, metres.
- Show, don't claim: "the hot tub faces the peaks, in the sun all afternoon", not "an exceptional setting".
- On EN/DE/NL pages, explain the name once: Les Alpages du Soleil = "the sunny mountain pastures".

## Key messages, in order

1. **The terrace:** a wood-fired hot tub for 6 on a south terrace that isn't overlooked, facing the Tarentaise peaks.
2. **Room for 12, together:** a living room under a cathedral ceiling with a glass gable to the mountains, a fireplace, a sauna, a table for 12, five bedrooms.
3. **Easy skiing:** 300 m (as the crow flies) to the first lifts, a ski room, 156 km of slopes shared with La Thuile in Italy. In summer, walks from the door.

## Banned claims (any language). The verifier fails the build on these.

| Never write | Why | Write instead |
| --- | --- | --- |
| Luxe, luxury, luxueux, Luxus | Unverifiable, generic | The specifics: hot tub, sauna, 170 m², view |
| Meilleur tarif, best price/rate | Not verifiable | "Book direct: the Hostaway calendar shows live prices" |
| Ski-in/ski-out, au pied des pistes, skis aux pieds | The lifts are 300 m away | "300 m as the crow flies to the first lifts, X minutes on foot" |
| Tout compris / all inclusive / everything included | A cleaning fee is charged separately (unless chalet.yaml says otherwise) | List what's included, then the cleaning fee |
| Star ratings | Only once a classification is confirmed in chalet.yaml | Show the official classification text |
| Paradis, exceptionnel, à couper le souffle, breathtaking | Hype | Concrete detail |
| Wi-Fi password, key-box code, door codes | Security | Never on the website; guest guide only |
| Abritel/Twitter links from the old site | Dead | Nothing |

Real guest quotes may contain such words: render them verbatim inside an element with `data-quote` (the verifier skips those).

## Front page (essentials → trust → booking)

1. **Hero** (winter: `01-bain-nordique-terrasse-hiver`; summer: `38-alpages-ete`).
   - FR H1: « Un chalet au soleil pour 12, à La Rosière » · line: « 5 chambres · bain nordique et sauna · à 300 m des remontées · à partir de … € la semaine »
   - EN H1: "A sunny chalet for 12 in La Rosière" · "5 bedrooms · hot tub and sauna · 300 m from the lifts · from €… a week"
   - Buttons: « Voir les disponibilités » / "Check dates" · « Poser une question » / "Ask a question" (WhatsApp)
2. **Facts strip:** 12 personnes · 5 chambres · 4 salles de bain · 170 m² · bain nordique + sauna · 300 m des remontées
3. **Gallery strip:** terrace, living room, a bedroom, sauna, night facade → Gallery
4. **The chalet in 3 points:** « Place pour 12 » / "Room for 12" · « La terrasse » / "The terrace" · « Ski room et pistes » / "Ski room and slopes"
5. **La Rosière and access:** ski area facts, walking route, train to Bourg-Saint-Maurice, airports, summer in one line
6. **Trust:** real reviews (verbatim, attributed), classification and registration number when available, "Your hosts" + Anthony as the local welcome
7. **Booking:** price from, cleaning fee, minimum stay, cancellation, deposit (if known), included list, then the Hostaway calendar

No tagline or slogan in the footer.

## Other pages (outline)

- **Le chalet / The Chalet:** living spaces, the 5 bedrooms with bed sizes (only when filled in), 4 bathrooms, sauna, ski room, terrace and hot tub (how it's heated: wood stove, about 2 hours), amenities, house rules.
- **Hiver / Winter:** Espace San Bernardo facts (from chalet.yaml with source), skiing into Italy, walking route to the lifts, ski school and kids (Famille Plus), restaurants (verified ones only), non-skiers.
- **Été / Summer:** walks from the chalet, lakes, Redoute Ruinée, the pass to the Aosta Valley, activities.
- **Accès / Getting here:** train, car (winter road via Bourg only, snow equipment), airports, parking for 2.
- **Services:** cards from chalet.yaml services, each "Ask us"; no third-party phone numbers.
- **Réserver / Book:** calendar, prices, cleaning fee, minimum stay, cancellation, deposit, house rules, FAQ.
- **Mentions légales, CGV / Terms, Confidentialité / Privacy:** see CLAUDE.md section 9.
