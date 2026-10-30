// Photo catalogue from content/photos.yaml joined with the image files in src/assets/photos/.
import type { ImageMetadata } from 'astro';
import YAML from 'yaml';
import raw from '../../content/photos.yaml?raw';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });
const dicts = import.meta.glob<Record<string, any>>('../i18n/*.json', { eager: true, import: 'default' });

export interface Photo {
  file: string;
  stem: string;
  id: string; // the two-digit number, e.g. "01"
  w: number;
  h: number;
  role: string;
  group: string;
  season: string;
  low: boolean; // 1024 px source: never shown wider than 900 px
  alt_en: string;
  src: ImageMetadata;
}

export const photos: Photo[] = YAML.parse(raw)
  .photos.filter((p: any) => p.rights === 'owner' || p.rights === 'licensed')
  .map((p: any) => {
    const mod = files[`../assets/photos/${p.file}`];
    if (!mod) throw new Error(`Photo ${p.file} listed in content/photos.yaml but missing from src/assets/photos/`);
    const stem = p.file.replace(/\.\w+$/, '');
    return { ...p, stem, id: stem.slice(0, 2), low: p.quality === 'low', src: mod.default };
  });

/** Photo by its number ("01") or stem. */
export function photo(id: string): Photo {
  const p = photos.find((x) => x.id === id || x.stem === id);
  if (!p) throw new Error(`Unknown photo "${id}"`);
  return p;
}

/** Alt text in the page language (English from photos.yaml, others from src/i18n/<locale>.json "alt"). */
export function alt(locale: string, p: Photo): string {
  if (locale === 'en') return p.alt_en;
  const v = dicts[`../i18n/${locale}.json`]?.alt?.[p.id];
  if (typeof v !== 'string') throw new Error(`Missing alt text for photo ${p.id} in src/i18n/${locale}.json "alt"`);
  return v;
}

/** Largest width to generate for a photo (low-quality sources are capped at 900 px, portraits at 1200 px). */
export const maxWidth = (p: Photo) => Math.min(p.low ? 900 : p.h > p.w ? 1200 : 1600, p.w);
