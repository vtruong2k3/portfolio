export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

export function isSupportedLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Resolve a supported locale from browser language tags (Req 19.5, Property 3).
 *
 * Always returns a supported locale: it picks the first tag whose primary
 * subtag matches a supported locale, otherwise falls back to the default.
 * Deterministic for the same input.
 */
export function resolveLocale(
  browserTags: readonly string[] | undefined | null,
): Locale {
  if (!browserTags) return defaultLocale;

  for (const tag of browserTags) {
    if (typeof tag !== 'string') continue;
    const primary = tag.trim().toLowerCase().split('-')[0];
    if (isSupportedLocale(primary)) {
      return primary;
    }
  }

  return defaultLocale;
}
