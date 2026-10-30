// @ts-check
import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import YAML from 'yaml';

// Locales come from content/chalet.yaml: only `live` ones are built.
const chalet = YAML.parse(fs.readFileSync(new URL('./content/chalet.yaml', import.meta.url), 'utf8'));
const live = chalet.site.locales.filter((l) => l.status === 'live').map((l) => l.code);
const HREFLANG = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', nl: 'nl-NL' };

export default defineConfig({
  site: 'https://www.lesalpagesdusoleil.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: chalet.site.default_locale,
    locales: live,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: chalet.site.default_locale,
        locales: Object.fromEntries(live.map((code) => [code, HREFLANG[code]])),
      },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
