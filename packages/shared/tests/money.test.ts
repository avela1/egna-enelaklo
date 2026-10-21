import { describe, expect, it } from 'vitest';
import { addSantim, formatETB, fromSantim, isSantim, subtractSantim, toSantim } from '../src/money';

describe('money helpers', () => {
  describe('toSantim', () => {
    it('converts birr to integer santim', () => {
      expect(toSantim(2730)).toBe(273000);
      expect(toSantim(12.34)).toBe(1234);
      expect(toSantim('99.99')).toBe(9999);
      expect(toSantim(0)).toBe(0);
    });

    it('rounds to the nearest santim without floating point drift', () => {
      expect(toSantim(0.1 + 0.2)).toBe(30);
      expect(toSantim(1.005)).toBe(101);
    });

    it('rejects non finite values', () => {
      expect(() => toSantim(Number.NaN)).toThrow(RangeError);
      expect(() => toSantim('not-a-number')).toThrow(RangeError);
    });
  });

  describe('fromSantim', () => {
    it('converts santim back to birr', () => {
      expect(fromSantim(273000)).toBe(2730);
      expect(fromSantim(1234)).toBe(12.34);
      expect(fromSantim(0)).toBe(0);
    });
  });

  describe('formatETB', () => {
    it('formats santim as a birr amount with a currency prefix', () => {
      expect(formatETB(273000)).toBe('ETB 2,730');
      expect(formatETB(25200)).toBe('ETB 252');
      expect(formatETB(0)).toBe('ETB 0');
    });

    it('shows cents only when they are not zero', () => {
      expect(formatETB(273050)).toBe('ETB 2,730.50');
      expect(formatETB(5)).toBe('ETB 0.05');
    });

    it('handles negative amounts', () => {
      expect(formatETB(-2500)).toBe('ETB -25');
    });

    it('rejects non finite values', () => {
      expect(() => formatETB(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    });
  });

  it('exposes safe integer helpers', () => {
    expect(isSantim(100)).toBe(true);
    expect(isSantim(10.5)).toBe(false);
    expect(addSantim(100, 50)).toBe(150);
    expect(subtractSantim(100, 50)).toBe(50);
  });
});
