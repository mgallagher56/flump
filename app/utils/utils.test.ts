import { describe, expect, test, vi } from 'vitest';

import { safeRedirect, useMatchesData, validateEmail } from './utils';

// vi mock useMatches
vi.mock('@remix-run/react', () => {
  return {
    useMatches: (): { id: string; data: { foo: string } }[] => [
      {
        id: 'home',
        data: { foo: 'bar' }
      }
    ]
  };
});

describe('validateEmail', () => {
  test('validateEmail returns false for non-emails', () => {
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('n@')).toBe(false);
  });

  test('validateEmail returns true for emails', () => {
    expect(validateEmail('kody@example.com')).toBe(true);
  });
});

describe('safeRedirect', () => {
  test('safeRedirect returns the default redirect if to is not a string', () => {
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect('')).toBe('/');
    expect(safeRedirect('not-a-path')).toBe('/');
  });

  test('safeRedirect returns the default redirect if to is not a relative path', () => {
    expect(safeRedirect('//example.com')).toBe('/');
    expect(safeRedirect('https://example.com')).toBe('/');
    expect(safeRedirect('mailto')).toBe('/');
  });

  test('safeRedirect returns to if it is a relative path', () => {
    expect(safeRedirect('/')).toBe('/');
    expect(safeRedirect('/about')).toBe('/about');
    expect(safeRedirect('/about?foo=bar')).toBe('/about?foo=bar');
  });

  test('safeREdirect returns the given default redirect if to is not a relative path', () => {
    expect(safeRedirect('//example.com', '/about')).toBe('/about');
    expect(safeRedirect('https://example.com', '/about')).toBe('/about');
    expect(safeRedirect('mailto', '/about')).toBe('/about');
  });
});

describe('useMatchesData', () => {
  beforeEach(() => {
    // vi mock useMemo
    vi.mock('react', () => {
      return {
        useMemo: vi.fn((fn) => fn())
      };
    });
  });
  test('useMatchesData returns undefined if no matching routes', () => {
    expect(useMatchesData('not-a-route')).toBe(undefined);
  });

  test('useMatchesData returns the matching route data', () => {
    const data = { foo: 'bar' };
    expect(useMatchesData('home')).toEqual(data);
  });
});
