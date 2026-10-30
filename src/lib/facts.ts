// Loads content/chalet.yaml at build time: the single source of truth for every fact.
import YAML from 'yaml';
import raw from '../../content/chalet.yaml?raw';

export const chalet = YAML.parse(raw);

export const TODO = 'TODO_OWNER';

/** True when a fact has been supplied by the owner (not missing, not TODO_OWNER). */
export const isSet = (v: unknown): boolean => v !== undefined && v !== null && v !== '' && v !== TODO;

export const DOMAIN: string = chalet.site.domain.replace(/\/$/, '');
export const defaultLocale: string = chalet.site.default_locale;
export const liveLocales: { code: string; name: string }[] = chalet.site.locales.filter((l: any) => l.status === 'live');
export const localeCodes: string[] = liveLocales.map((l) => l.code);

export const registration: string | null = isSet(chalet.legal.registration_number) ? chalet.legal.registration_number : null;
export const classification: string | null = isSet(chalet.legal.classification) ? chalet.legal.classification : null;
export const weeklyFrom: number | null = isSet(chalet.rates.weekly_from) ? Number(chalet.rates.weekly_from) : null;
export const cleaningFee: number | null = isSet(chalet.rates.cleaning_fee) ? Number(chalet.rates.cleaning_fee) : null;

/** Minimum-stay rules the owner has confirmed (anything still `proposed` is not published). */
export const confirmedMinStays = Object.entries(chalet.rates.minimum_stay || {})
  .filter(([, rule]: [string, any]) => rule && rule.status !== 'proposed')
  .map(([id, rule]: [string, any]) => ({ id, ...rule }));

/** Spaces to publish: unverified ones (e.g. the balneo bathtub) stay off the site. */
export const spaces = chalet.chalet.spaces.filter((s: any) => s.verified !== false);

/** Bedrooms whose bed sizes are filled in. */
export const bedroomsWithBeds = chalet.chalet.bedrooms.filter((b: any) => isSet(b.beds) && b.verified !== false);

/** Restaurants: only verified ones are published. */
export const restaurants = chalet.location.restaurants.filter((r: any) => r.verified === true);

export const address = chalet.legal.address;
export const mapsUrl =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(`${address.street}, ${address.postal_code} ${address.city}, France`);

export const contact = chalet.contact;
export const phoneHref = 'tel:' + contact.phone.replace(/\s/g, '');
export const whatsappHref = `https://wa.me/${contact.whatsapp}`;
export const instagramHref = `https://www.instagram.com/${contact.instagram}/`;
