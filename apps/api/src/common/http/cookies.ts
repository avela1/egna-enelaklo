/** Name of the httpOnly cookie that carries the session token. */
export const SESSION_COOKIE = 'egna_session';

/** Name of the readable cookie that carries the CSRF token. */
export const CSRF_COOKIE = 'egna_csrf';

/** Header the client has to send the CSRF token in. */
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Parses a `Cookie` header into a plain object. Small enough that the API
 * does not need a cookie parsing dependency.
 */
export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};

  /** @type {Record<string, string>} */
  const cookies: Record<string, string> = {};

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;

    const key = part.slice(0, index).trim();
    if (key === '' || key in cookies) continue;

    const value = part.slice(index + 1).trim();

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}
