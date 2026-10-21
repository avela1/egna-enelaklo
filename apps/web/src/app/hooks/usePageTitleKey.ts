import { useMatches } from 'react-router-dom';
import type { RouteHandle } from '../types';

/**
 * Returns the i18n key of the current page title, taken from the deepest
 * matched route that declares a `titleKey` handle.
 */
export function usePageTitleKey(): string | undefined {
  const matches = useMatches();

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle as RouteHandle | undefined;
    if (handle?.titleKey) return handle.titleKey;
  }

  return undefined;
}
