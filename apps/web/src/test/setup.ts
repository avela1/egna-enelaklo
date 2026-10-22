import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement ResizeObserver, which the Radix primitives use.
 * A stub is enough for the tests.
 */
class ResizeObserverStub {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
