import { describe, expect, it } from 'vitest';
import am from './locales/am.json';
import en from './locales/en.json';
import om from './locales/om.json';

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

function flattenKeys(value: Json, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  if (Array.isArray(value)) return [prefix];

  return Object.entries(value)
    .flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe('i18n resources', () => {
  it('keeps en, am and om in sync', () => {
    const english = flattenKeys(en as Json);
    const amharic = flattenKeys(am as Json);
    const oromo = flattenKeys(om as Json);

    expect(amharic).toEqual(english);
    expect(oromo).toEqual(english);
    expect(english.length).toBeGreaterThan(0);
  });
});
