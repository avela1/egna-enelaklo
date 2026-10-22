# Phase 1 - Accounts, permissions and the audit log

Status: **complete**, waiting for approval.

Phase 1 turns the empty shell into a product with secure accounts. There are no tasks, no
quotes and no payments yet: the business flow starts in Phase 2.

## What was built

### 1. The data model

`apps/api/prisma/schema.prisma` with the migration
`20261021000000_phase1_auth`:

- `users` - email (unique, lower case), phone, name, argon2id `password_hash`, `locale`,
  `status` (ACTIVE, DISABLED, INVITED), `email_verified_at`, `failed_login_count`,
  `locked_until`, `last_login_at`, timestamps.
- `roles`, `permissions`, `role_permissions`, `user_roles` - the join tables make a second
  role possible later. A person has one primary role in Phase 1.
- `sessions` - only the SHA-256 hash of the token, sliding expiry, `revoked_at`.
- `email_tokens` - VERIFY_EMAIL, RESET_PASSWORD and INVITE, hashed, expiring, single use.
- `audit_log` - the columns of the brief, plus a **database trigger that blocks UPDATE and
  DELETE**, so the log is append-only even against manual SQL.

### 2. Permissions

The thirteen permission keys and the default role mapping live in
`packages/shared/src/permissions.ts` and are seeded into the database. The `ADMIN` role
always keeps every permission and can never be edited.

### 3. The auth API

| Endpoint                                                 | What it does                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/v1/auth/register`                             | Creates a customer, emails the verification, starts a session            |
| `POST /api/v1/auth/login`                                | Generic error, account lockout after five failures, always a new session |
| `POST /api/v1/auth/logout` / `logout-all`                | Revokes the session, or every session                                    |
| `GET /api/v1/auth/me`                                    | The person, the role and the permission keys, never the hash             |
| `POST /api/v1/auth/forgot` / `reset`                     | The same answer for every address, single use token                      |
| `POST /api/v1/auth/verify-email` / `resend-verification` | Confirms the address                                                     |
| `POST /api/v1/auth/accept-invite`                        | Sets the password of an invited staff user                               |
| `GET /api/v1/auth/csrf`                                  | Issues the CSRF token                                                    |
| `PATCH /api/v1/me`, `POST /api/v1/me/change-password`    | The own profile                                                          |

Every state changing request needs the `X-CSRF-Token` header (403 otherwise), the auth
routes are limited to 10 requests a minute per IP, and the guards are global:
`SessionGuard` (401), `PermissionsGuard` (403), `RolesGuard`, `CsrfGuard`.

### 4. The staff admin API

- `GET /api/v1/staff/users` - search by name, email or phone, filter by role and status,
  paginated.
- `POST /api/v1/staff/users/invite` - creates an INVITED user and emails a set password link
  (72 hours).
- `PATCH /api/v1/staff/users/:id/role`, `POST .../disable`, `POST .../enable` - an admin can
  never disable itself or remove its own admin role, and the last active admin can never be
  disabled or demoted.
- `GET /api/v1/staff/roles`, `PUT /api/v1/staff/roles/:role/permissions`.
- `GET /api/v1/staff/audit` and `GET /api/v1/staff/audit/export.csv` - filters for the
  action, the actor, a date range and a free text, newest first. The export is audited.

### 5. The seed

`npm run db:seed` creates the roles, the permissions, the default mapping and one account
per role. The password comes from `SEED_PASSWORD`; the seed refuses to run when
`NODE_ENV=production`.

### 6. The web app

- The API client attaches the CSRF token, handles a 401 with the session expired notice and
  a 403 with the forbidden screen.
- The route guards send a person to the portal that belongs to their role, and the staff
  screens need their permission.
- The screens: sign in (with the show and hide password), registration (with the live
  password rules, the language picker and the terms), forgot password in three steps, the
  reset page, the invitation page, the verification page, the profile (name, phone, language,
  password, sign out of all devices) and the three staff screens (users, roles, audit).
- The staff navigation only shows the items the person may use.
- The customer portal shows the "please verify your email" banner with a resend button.
- 403, 404, the server error and the session expired screens are real now.

## The acceptance checklist

- [x] **Migrations and seed run on a clean database.** `prisma migrate reset --force` applies
      both migrations and the seed; the five accounts exist and can sign in.
- [x] **Every seeded role signs in and lands in the right portal.** CUSTOMER -> `/app`,
      TASKER -> `/tasker`, OPERATIONS, FINANCE and ADMIN -> `/staff` (`PORTAL_BY_ROLE`).
- [x] **A customer can register and sees the verify banner.** The registration emails the
      verification link, the banner appears until the address is confirmed, and the link in
      Mailpit confirms it.
- [x] **Five wrong passwords lock the account for 15 minutes and the message stays generic.**
      The fifth answer is `ACCOUNT_LOCKED` with "Invalid email or password" and
      `retryAfterSeconds: 900`; the right password is refused until the lock passes.
- [x] **Forgot and reset work end to end through Mailpit and revoke the old sessions.** The
      answer is the same for a known and an unknown address, the token works once, and every
      session of that person is revoked afterwards.
- [x] **A customer calling `/staff/users` gets 403 and the attempt is audited.** The answer
      is the standard envelope with `missing: ["users.manage"]`, and an `access.denied` row is
      written. An OPERATIONS user gets 403 on Users, Roles and Audit.
- [x] **The admin can invite, re-role, disable and enable a user, and the last active admin
      is protected.** The self protection answers `CANNOT_DISABLE_SELF` and
      `CANNOT_DEMOTE_SELF`, the last admin answers `LAST_ADMIN`.
- [x] **A role permission change takes effect on the next request.** After
      `PUT /staff/roles/OPERATIONS/permissions` the operations user can open the users list
      immediately.
- [x] **The audit log shows the audited actions, the filters work, the CSV downloads, and the
      table cannot be updated or deleted.** The filter, the export and the trigger are covered
      by the tests.
- [x] **The UI matches the design system and works in EN, አማ and OM.** The teal primary
      button, the Sora headings, the 16px cards with a 1px line border, the status and role
      chips and the 48px buttons are the Phase 0 tokens. The three locale files hold the same
      keys, which a test enforces.
- [x] **Lint, typecheck, tests and build all pass.** 12 shared tests, 12 web tests, 21 API
      tests.

## The security checklist

| Check                                                           | Result                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| No secrets or hashes in the logs or the responses               | The password hash is never returned, `sanitizeAuditValue` strips it from the audit log, the tokens are never logged      |
| The cookie is httpOnly and SameSite=Lax (Secure in production)  | `egna_session` is set with `HttpOnly; SameSite=Lax`, `Secure` when `NODE_ENV=production`                                 |
| No tokens in localStorage                                       | Only the language preference is stored; the session lives in the httpOnly cookie and the CSRF token in a readable cookie |
| Every non public route is guarded                               | `SessionGuard` is global, only `@Public()` routes are open                                                               |
| The auth errors are generic                                     | "Invalid email or password" for an unknown address, a wrong password, a disabled account and a locked account            |
| The invite and reset tokens are hashed, expiring and single use | SHA-256 at rest, 72 and 60 minutes, `used_at` and the previous token is invalidated                                      |

## The test results

```
@egna-enelaklo/shared   12 tests passed
@egna-enelaklo/web      12 tests passed
@egna-enelaklo/api      21 tests passed
lint, typecheck, build   all green
```

The API suite covers the registration, the sign in and the generic error, the lockout, the
cookie flags, the CSRF rejection, the password reset (single use and expiry), the rate
limiting, the permission denial, the last admin protection, the locked admin role, the audit
rows and the append-only trigger.

## Gaps that were closed after the first pass

- The audit filter by actor now matches a **name or an email address**, not only the id
  and the role.
- The registration no longer signs in a second time: the endpoint already starts the
  session, so the web app only refreshes `/auth/me`.
- The change password form in the profile shows the same live password rules as the
  registration.
- The UI kit shows the three components that were added in this phase: the alert banner,
  the role chip and the user status chip.
- The seed resets the lockout of the seeded accounts, so they are always usable.
- The API test that checks the last admin protection puts the accounts it disabled back.

## How to sign in with the seeded accounts

All five accounts use the value of `SEED_PASSWORD` in `apps/api/.env`
(`DevPassword2026` on the build machine).

| Account              | Role       | Lands on  |
| -------------------- | ---------- | --------- |
| `admin@egna.test`    | ADMIN      | `/staff`  |
| `ops@egna.test`      | OPERATIONS | `/staff`  |
| `finance@egna.test`  | FINANCE    | `/staff`  |
| `tasker@egna.test`   | TASKER     | `/tasker` |
| `customer@egna.test` | CUSTOMER   | `/app`    |

## Deviations and open questions

**`class-validator` and `class-transformer` stay in the API** for the global
`ValidationPipe`, and the request bodies are validated with the shared Zod schemas
through `ZodValidationPipe`. The Zod schemas are the contract, the Nest pipe is the
safety net.

**The role permission edit is "replace", not "add".** The console sends the whole list of
permission keys for a role, which is easier to reason about than a patch.

**The lockout is visible.** The message stays generic, but the code `ACCOUNT_LOCKED` and
the remaining seconds tell the person to wait. That is a small trade off: it tells an
attacker that the address exists. The rate limit on `/auth/*` is the second layer.

**The Amharic and Oromo strings are first drafts.** They are complete and in sync with
the English keys, but they should be reviewed by native speakers before the pilot.

**The customer portal is still a placeholder** for everything except the profile and the
verification banner. The tasks arrive in Phase 2.

## Not started (by design)

Phase 2: the service catalogue and the task request forms.
