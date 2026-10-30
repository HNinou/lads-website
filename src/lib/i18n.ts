// UI strings (src/i18n/<locale>.json), page copy (src/content/pages/<locale>/<page>.md) and URL helpers.
import { chalet, defaultLocale, localeCodes } from './facts';

const dicts = import.meta.glob<Record<string, any>>('../i18n/*.json', { eager: true, import: 'default' });
const pages = import.meta.glob<any>('../content/pages/*/*.md', { eager: true });

export const PAGES = {
  home: '',
  chalet: 'chalet/',
  gallery: 'gallery/',
  winter: 'winter/',
  summer: 'summer/',
  access: 'access/',
  services: 'services/',
  book: 'book/',
  legal: 'legal/',
  terms: 'terms/',
  privacy: 'privacy/',
} as const;
export type PageId = keyof typeof PAGES;

export const HTML_LANG: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', nl: 'nl-NL' };
export const OG_LOCALE: Record<string, string> = { fr: 'fr_FR', en: 'en_GB', de: 'de_DE', nl: 'nl_NL' };

export const prefix = (locale: string) => (locale === defaultLocale ? '' : `${locale}/`);
export const pagePath = (locale: string, id: PageId) => `/${prefix(locale)}${PAGES[id]}`;

/** getStaticPaths for src/pages/[...locale]/*: the default locale at the root, the others in folders. */
export const localePaths = () =>
  localeCodes.map((code) => ({ params: { locale: code === defaultLocale ? undefined : code }, props: { locale: code } }));

function dict(locale: string) {
  const d = dicts[`../i18n/${locale}.json`];
  if (!d) throw new Error(`Missing src/i18n/${locale}.json`);
  return d;
}

/**
 * Replace {name} tokens; a token left unreplaced is a build error, never a visible placeholder.
 * `partial` leaves unknown tokens for a later fill() (e.g. {price}, filled only when the owner sets it).
 */
export function fill(str: string, vars: Record<string, string | number> = {}, partial = false) {
  const out = str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  const left = out.match(/\{\w+\}/);
  if (left && !partial) throw new Error(`Unreplaced token ${left[0]} in "${str}"`);
  return out;
}

/** UI string without token filling: for templates that client-side scripts fill in. */
export function tRaw(locale: string, key: string): string {
  const v = key.split('.').reduce((o: any, k) => o?.[k], dict(locale));
  if (typeof v !== 'string') throw new Error(`Missing UI string "${key}" in src/i18n/${locale}.json`);
  return v;
}

/**
 * Typography: a number stays with its unit or noun ("12 personnes", "300 m"), and in French
 * ; : ! ? » take a non-breaking space before them (« after).
 */
export function typo(locale: string, s: string): string {
  let out = s.replace(/(\d) (?=[\p{L}%€])/gu, '$1\u00a0');
  if (locale === 'fr') out = out.replace(/ ([;:!?»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
  return out;
}

/** UI string by dotted key, e.g. t('fr', 'nav.chalet'). */
export function t(locale: string, key: string, vars?: Record<string, string | number>): string {
  return typo(locale, fill(tRaw(locale, key), vars));
}

/**
 * A fact sentence from chalet.yaml in the page language. chalet.yaml facts are written in English;
 * other languages translate them in src/i18n/<locale>.json under "facts", keyed by the exact English text.
 * If the owner edits a fact, the build stops until the translation is updated, so a stale fact never ships.
 */
export function fact(locale: string, text: string): string {
  if (locale === 'en') return typo(locale, text);
  const v = dict(locale).facts?.[text];
  if (typeof v !== 'string') throw new Error(`Missing translation of chalet.yaml fact in src/i18n/${locale}.json "facts": "${text}"`);
  return typo(locale, v);
}

/** Time of day in the page language: "16 h" (fr) / "4 pm" (en), from "16:00". */
export function time(locale: string, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (locale === 'en') return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`;
  return `${h} h${m ? ' ' + String(m).padStart(2, '0') : ''}`;
}

/** Facts from chalet.yaml that page copy may use as {tokens}, so copy never retypes a number. */
export function vars(locale: string): Record<string, string | number> {
  const c = chalet.chalet;
  const ski = chalet.location.ski_area;
  const nbsp = (s: string) => s.replace(/ /g, ' ');
  return {
    domain: chalet.site.cname,
    name: c.name,
    meaning: c.name_meaning_en,
    guests: c.capacity.guests,
    bedrooms: c.capacity.bedrooms,
    bathrooms: c.capacity.bathrooms,
    size: nbsp(`${c.size_m2} m²`),
    checkIn: nbsp(time(locale, c.check_in)),
    checkOut: nbsp(time(locale, c.check_out)),
    distance: nbsp(chalet.location.to_lifts.distance.match(/^[\d.,]+\s*k?m/)![0]),
    skiArea: ski.name,
    km: nbsp(`${ski.km} km`),
    lifts: ski.lifts,
    altitude: fact(locale, ski.altitude),
    linked: fact(locale, ski.linked_with),
    skiSeason: fact(locale, ski.season_2026_27),
    labels: new Intl.ListFormat(HTML_LANG[locale], { type: 'conjunction' }).format(ski.labels),
    route: fact(locale, chalet.location.to_lifts.route),
    setting: fact(locale, c.setting),
    cancellation: fact(locale, chalet.legal.cancellation),
    resort: chalet.legal.address.resort,
    welcome: chalet.contact.local_welcome.replace(/^([^,]+),\s*(.+)$/, '$1 ($2)'), // "Anthony (Les Clefs de la Rosière)"
    phone: nbsp(chalet.contact.phone),
    email: chalet.contact.email,
  };
}

function fillDeep(locale: string, v: any, vs: Record<string, string | number>): any {
  if (typeof v === 'string') return typo(locale, fill(v, vs, true));
  if (Array.isArray(v)) return v.map((x) => fillDeep(locale, x, vs));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillDeep(locale, x, vs)]));
  return v;
}

/** Page copy: frontmatter (with {tokens} filled from chalet.yaml) + rendered Markdown body. */
export function page(locale: string, id: PageId) {
  const mod = pages[`../content/pages/${locale}/${id}.md`];
  if (!mod) throw new Error(`Missing src/content/pages/${locale}/${id}.md`);
  return { fm: fillDeep(locale, mod.frontmatter, vars(locale)) as Record<string, any>, Content: mod.Content };
}

/** Euro amount in the page language: 2 450 € (fr) / €2,450 (en). */
export const euros = (locale: string, n: number) =>
  new Intl.NumberFormat(HTML_LANG[locale], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/** Colon with the page language's spacing: " : " (fr, non-breaking) / ": " (en). */
export const colon = (locale: string) => (locale === 'fr' ? ' : ' : ': ');
