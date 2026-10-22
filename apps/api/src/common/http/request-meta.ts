import type { AuthenticatedRequest } from '../auth/principal';

export interface RequestMeta {
  ip?: string;
  requestId?: string;
  userAgent?: string;
}

/** The request details that end up in the session and the audit log. */
export function requestMeta(request: AuthenticatedRequest): RequestMeta {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    requestId: request.requestId,
  };
}
