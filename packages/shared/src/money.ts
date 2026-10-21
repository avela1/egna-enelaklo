/**
 * Money helpers.
 *
 * RULE: money is ALWAYS stored and passed around as an integer number of
 * santim (1 ETB = 100 santim). Never use floating point for money and never
 * store a decimal amount. `formatETB` is the only place where a human
 * readable amount is produced.
 */

export const SANTIM_PER_BIRR = 100;
export const ETB_CURRENCY = 'ETB';

/**
 * Converts a birr amount (number or numeric string) to integer santim.
 *
 * Rounds to the nearest santim to avoid binary floating point drift
 * (e.g. 0.1 + 0.2 -> 30 santim, not 29).
 *
 * @throws {RangeError} when the value is not a finite number.
 */
export function toSantim(amount: number | string): number {
  const value = typeof amount === 'string' ? Number(amount.trim()) : amount;

  if (!Number.isFinite(value)) {
    throw new RangeError(`toSantim: expected a finite amount, received ${String(amount)}`);
  }

  return Math.round((value + Number.EPSILON) * SANTIM_PER_BIRR);
}

/**
 * Converts integer santim back to a birr amount.
 *
 * @throws {RangeError} when the value is not a finite number.
 */
export function fromSantim(santim: number): number {
  if (!Number.isFinite(santim)) {
    throw new RangeError(`fromSantim: expected a finite amount, received ${String(santim)}`);
  }

  return santim / SANTIM_PER_BIRR;
}

/** True when the value is a safe integer number of santim. */
export function isSantim(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/**
 * Formats integer santim as a human readable birr amount.
 *
 * Examples:
 *   formatETB(273000)  -> "ETB 2,730"
 *   formatETB(25200)   -> "ETB 252"
 *   formatETB(273050)  -> "ETB 2,730.50"
 *   formatETB(-2500)   -> "ETB -25"
 *
 * @throws {RangeError} when the value is not a finite number.
 */
export function formatETB(santim: number): string {
  if (!Number.isFinite(santim)) {
    throw new RangeError(`formatETB: expected a finite amount, received ${String(santim)}`);
  }

  const rounded = Math.round(santim);
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);
  const birr = Math.floor(absolute / SANTIM_PER_BIRR);
  const cents = absolute % SANTIM_PER_BIRR;

  const grouped = groupThousands(birr);
  const fraction = cents === 0 ? '' : `.${String(cents).padStart(2, '0')}`;

  return `${ETB_CURRENCY} ${negative ? '-' : ''}${grouped}${fraction}`;
}

/**
 * Adds two santim amounts.
 *
 * @throws {RangeError} when the result is not a safe integer.
 */
export function addSantim(a: number, b: number): number {
  const result = a + b;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError('addSantim: result is not a safe integer');
  }
  return result;
}

/**
 * Subtracts two santim amounts.
 *
 * @throws {RangeError} when the result is not a safe integer.
 */
export function subtractSantim(a: number, b: number): number {
  const result = a - b;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError('subtractSantim: result is not a safe integer');
  }
  return result;
}

/** Formats a plain integer with thousands separators: 2730 -> "2,730". */
function groupThousands(value: number): string {
  const digits = String(value);
  let out = '';
  let counter = 0;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    out = `${digits[index]}${out}`;
    counter += 1;
    if (counter % 3 === 0 && index > 0) out = `,${out}`;
  }

  return out;
}
