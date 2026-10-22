# Security

How egna-enelaklo keeps the accounts, the sessions and the audit trail safe. Every rule
here is implemented in Phase 1 and covered by a test.

1. Accounts

| Account              | Role       | Lands on  | Password          |
| -------------------- | ---------- | --------- | ----------------- |
| `admin@egna.test`    | ADMIN      | `/staff`  | `DevPassword2026` |
| `ops@egna.test`      | OPERATIONS | `/staff`  | `DevPassword2026` |
| `finance@egna.test`  | FINANCE    | `/staff`  | `DevPassword2026` |
| `tasker@egna.test`   | TASKER     | `/tasker` | `DevPassword2026` |
| `customer@egna.test` | CUSTOMER   | `/app`    | `DevPassword2026` |

1. Passwords

- Passwords are hashed with **argon2id** (m=19 MiB, t=2, p=1) in
  `apps/api/src/common/services/password.service.ts`.
- A hash never leaves the server: it is not returned by an endpoint, never written to a
  log line and never written to the audit log.
- The rules are shared with the web app through `packages/shared`
  (`PasswordSchema`): at least 10 characters, at least one letter, at least one number.
- The seed password comes from `SEED_PASSWORD` in the environment. The seed refuses to run
  when `NODE_ENV=production`.

## 2. Sessions

- A session is a random 32 byte token. The **server only stores the SHA-256 hash** of the
  token, in `sessions.token_hash` (a unique index).
- The token travels in the cookie `egna_session`:
  - `HttpOnly` — JavaScript can not read it
  - `SameSite=Lax`
  - `Secure` in production
  - `Path=/`
- The lifetime slides: 7 days from the last request, with a hard cap of 30 days from the
  creation. The sliding write happens at most once an hour.
- Signing in always starts a **new** session and revokes the old one, so a stolen cookie
  is worthless after the next sign in.
- Signing out revokes the session. "Sign out of all devices" revokes every session of that
  person. Changing the password revokes every other session.
- Disabling an account revokes all of its sessions.

## 3. CSRF

- The API uses a **double submit token**: `GET /api/v1/auth/csrf` writes a random token in
  the readable cookie `egna_csrf` and returns it.
- Every state changing request (`POST`, `PUT`, `PATCH`, `DELETE`) has to send the same
  token in the `X-CSRF-Token` header. A missing or different token is a `403 CSRF_FAILED`.
- The check includes sign in and registration: a request from another origin can not read
  the cookie, so it can not produce a matching header.
- The web app reads the token from the cookie and never stores it in `localStorage`.

## 4. Rate limiting

`@nestjs/throttler`, per IP, per minute:

| Routes          | Limit        | Environment variable |
| --------------- | ------------ | -------------------- |
| `/auth/*`       | 10 requests  | `AUTH_RATE_LIMIT`    |
| everything else | 120 requests | `RATE_LIMIT`         |

The limit is read per request, so it can be changed without a restart.

## 5. Account lockout

- Five failed sign in attempts lock the account for 15 minutes
  (`LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`).
- The message stays the same for a wrong password, an unknown email and a locked account:
  **"Invalid email or password"**. The lock is reported with the code `ACCOUNT_LOCKED` and
  `details.retryAfterSeconds`, so the web app can explain it without the API leaking
  whether the address exists.
- A successful sign in resets the counter.

## 6. Authorisation

Authorisation is enforced **on the server** with permission keys, never by hiding a menu
item (`PermissionsGuard`).

The keys live in `packages/shared/src/permissions.ts`. A role is only the grouping of
permissions.

`@Public()` marks a route that needs no session. Everything else needs a session
(`SessionGuard`), and every route with `@RequirePermission('key')` needs that permission.

A missing session is a `401`, a missing permission a `403` with the standard envelope
`{ code, message, details, requestId }`.

The web app hides the navigation items a person may not use, and shows the forbidden
screen when they open the URL anyway. Both are convenience: the server decides.

## 7. Email tokens

- A verification, password reset and invitation token is a random 32 byte value. Only its
  SHA-256 hash is stored (`email_tokens.token_hash`).
- A token expires (24 hours for the verification, 60 minutes for the reset, 72 hours for an
  invitation) and can only be used once. The previous unused token of the same kind stops
  working as soon as a new one is sent.
- An invited account cannot sign in until the password is set.
- A password reset revokes every session of that person.

## 8. Audit log

- Every staff or admin write writes an `audit_log` row **in the same transaction** as the
  change (`AuditService.record(entry, tx)`).
- The audited actions are `auth.login_success`, `auth.login_failed`, `auth.locked`,
  `auth.password_reset`, `auth.logout_all`, `user.invited`, `user.role_changed`,
  `user.disabled`, `user.enabled`, `role.permissions_changed` and `audit.exported`, plus
  `access.denied` for a refused request and `user.registered`, `user.profile_updated`,
  `auth.password_changed`, `auth.email_verified` and `auth.invite_accepted`.
- Password hashes, session tokens and email tokens are stripped from the `before` and
  `after` payloads (`sanitizeAuditValue`).
- The table is **append-only**: a PostgreSQL trigger raises an exception on every `UPDATE`
  and `DELETE`. Neither the application nor a manual query can rewrite history.
- The export is recorded as well, so a download of the log is itself visible in the log.

## 9. What the browser stores

| Value               | Where                          |
| ------------------- | ------------------------------ |
| Session token       | httpOnly cookie `egna_session` |
| CSRF token          | readable cookie `egna_csrf`    |
| Language preference | `localStorage`                 |

There is **no token in `localStorage`** and no token in `sessionStorage`.

## 10. Other measures

- Helmet sets the usual security headers.
- CORS only allows the origins in `WEB_ORIGIN`, with credentials.
- The environment is validated with zod at boot: the API does not start with a broken
  configuration.
- The API never returns a password hash, and never logs a password or a token.
- The private object storage bucket is never public; objects are served through short
  lived signed URLs (Phase 4).
