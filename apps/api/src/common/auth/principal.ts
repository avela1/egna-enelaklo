import type { Request } from 'express';

/** The signed in person, resolved from the session cookie. */
export interface Principal {
  email: string;
  id: string;
  locale: string;
  name: string;
  permissions: string[];
  role: string;
  sessionId: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  principal?: Principal;
  requestId?: string;
  sessionId?: string;
}
