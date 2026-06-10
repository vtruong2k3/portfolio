import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveLocale, isSupportedLocale, defaultLocale, locales } from './config';

// Feature: dev-portfolio-3d, Property 3: Locale resolution always yields a supported locale
describe('resolveLocale (Property 3)', () => {
  it('always returns a supported locale for any browser tags', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (tags) => {
        const result = resolveLocale(tags);
        expect(isSupportedLocale(result)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('returns the default locale when no tag matches', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string().filter((s) => {
            const primary = s.trim().toLowerCase().split('-')[0];
            return !(locales as readonly string[]).includes(primary);
          }),
        ),
        (tags) => {
          expect(resolveLocale(tags)).toBe(defaultLocale);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is deterministic for the same input', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (tags) => {
        expect(resolveLocale(tags)).toBe(resolveLocale(tags));
      }),
      { numRuns: 100 },
    );
  });

  it('picks the first matching supported locale', () => {
    expect(resolveLocale(['fr', 'en-US', 'vi'])).toBe('en');
    expect(resolveLocale(['vi-VN'])).toBe('vi');
    expect(resolveLocale([])).toBe(defaultLocale);
    expect(resolveLocale(null)).toBe(defaultLocale);
  });
});
