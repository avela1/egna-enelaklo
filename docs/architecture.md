# Architecture

egna-enelaklo is a single web application that serves four portals, backed by one REST API.
This document is the map for everyone who touches the repository.

## 1. Monorepo

npm workspaces + Turborepo. Every workspace is a private package.

| Workspace                | Package                        | Purpose                                          |
| ------------------------ | ------------------------------ | ------------------------------------------------ |
| `apps/web`               | `@egna-enelaklo/web`           | React 18 + Vite: customer, tasker, staff, auth   |
| `apps/api`               | `@egna-enelaklo/api`           | NestJS 10 REST API under `/api/v1`               |
| `packages/shared`        | `@egna-enelaklo/shared`        | Enums, Zod schemas, permissions, money helpers   |
| `packages/design-tokens` | `@egna-enelaklo/design-tokens` | `tokens.json` -> CSS variables + Tailwind preset |
| `packages/config`        | `@egna-enelaklo/config`        | Shared tsconfig, ESLint, Prettier                |

Turbo tasks: `build`, `lint`, `typecheck`, `test`, `dev`. Every task depends on `^build`, so a
package is always built before the package that consumes it.

`packages/shared` is consumed directly from source by the web app (Vite alias + tsconfig
`paths`), and from `dist` by the API (CommonJS). That keeps one implementation and avoids
interop surprises in the browser bundle.

## 2. Folder map

```
apps/web/src
  app/            router, providers, layouts, route types, app level hooks
  components/ui/  the design system: Button, Input, Select, Textarea, Checkbox, Radio,
                  Switch, FormField, Card, Table, Tabs, Stepper, Modal, Toast, Alert,
                  EmptyState, Skeleton, Chip, StatusChip, RoleChip, UserStatusChip
  components/brand/ LogoMark, Wordmark, Brand
  features/       one folder per domain: auth, customer, tasker, staff, profile, errors, ui-kit
  i18n/           i18next setup and locales/en.json, am.json, om.json
  lib/            cn (class merge), api (typed client with CSRF and session handling)
  styles/         Tailwind entry point

apps/api/src
  common/         auth (guards, decorators), audit, csrf, http, mail, prisma, services
  config/         env validation (zod)
  modules/        auth, me, staff (users, roles, audit), health
  prisma/         schema, migrations, seed
```

## 3. Route map

### Public (auth layout, split screen)

| Route              | Page                            |
| ------------------ | ------------------------------- |
| `/`                | redirects to `/sign-in`         |
| `/sign-in`         | Sign in                         |
| `/register`        | Create a customer account       |
| `/forgot-password` | Reset password, three steps     |
| `/reset-password`  | Set a new password with a token |
| `/set-password`    | Accept a staff invitation       |
| `/verify-email`    | Confirm the email address       |

### Customer portal `/app` (light sidebar, 232px)

| Route                   | Page                                          |
| ----------------------- | --------------------------------------------- |
| `/app`                  | My tasks: the tiles, the filters and the list |
| `/app/new`              | Choose a service (step 1)                     |
| `/app/tasks/:id`        | The task: the summary and the timeline        |
| `/app/tasks/:id/edit`   | The details (step 2), with the autosave       |
| `/app/tasks/:id/review` | Review and submit (step 3)                    |
| `/app/new-task`         | Placeholder, replaced in Phase 3              |
| `/app/addresses`        | The saved addresses                           |
| `/app/payments`         | Placeholder, replaced in Phase 5              |
| `/app/notifications`    | Placeholder, replaced in Phase 3              |
| `/app/help`             | Help and the rules                            |
| `/app/profile`          | Profile, language and password                |

### Tasker portal `/tasker` (top navigation, max width 1200px)

| Route                | Page                           |
| -------------------- | ------------------------------ |
| `/tasker`            | Assignments                    |
| `/tasker/assignment` | Assignment                     |
| `/tasker/job`        | Active job                     |
| `/tasker/earnings`   | Earnings                       |
| `/tasker/profile`    | Profile, language and password |

### Staff console `/staff` (dark sidebar, 250px)

| Route                         | Page                           | Group          | Permission           |
| ----------------------------- | ------------------------------ | -------------- | -------------------- |
| `/staff/queue`                | Task queue                     | Operations     | `tasks.view`         |
| `/staff/review`               | Review and quote               | Operations     | `quotes.edit`        |
| `/staff/assign`               | Assign a tasker                | Operations     | `taskers.assign`     |
| `/staff/exceptions`           | Exceptions                     | Operations     | `exceptions.resolve` |
| `/staff/taskers`              | Taskers directory              | Operations     | `taskers.verify`     |
| `/staff/reports`              | Reports                        | Operations     | `reports.view`       |
| `/staff/payments`             | Payments and reconciliation    | Finance        | `payments.view`      |
| `/staff/catalog`              | Service catalog                | Administration | `catalog.edit`       |
| `/staff/templates/:serviceId` | The template editor            | Administration | `catalog.edit`       |
| `/staff/users`                | Users                          | Administration | `users.manage`       |
| `/staff/roles`                | Roles and permissions          | Administration | `roles.manage`       |
| `/staff/audit`                | Audit log                      | Administration | `audit.view`         |
| `/staff/settings`             | Platform settings              | Administration | `settings.manage`    |
| `/staff/profile`              | Profile, language and password |                |                      |     |

### Other

| Route     | Page                              |
| --------- | --------------------------------- |
| `/ui-kit` | Every UI component in every state |
| `/error`  | The server error screen           |
| `*`       | 404 page                          |

Route metadata (the page title shown in the layout header) travels in the route `handle`
(`{ titleKey }`) and is read with `usePageTitleKey()`.

## 4. The auth flow

```
Customer                 API                        Database
   |                       |                            |
   |  GET /auth/csrf  ---->|  writes egna_csrf cookie   |
   |  POST /auth/login ---->|  argon2 verify             |
   |   (X-CSRF-Token)       |  session row (token hash)  |
   |  <-- egna_session      |  audit: login_success      |
   |                       |                            |
   |  GET /auth/me   ----->|  session -> principal      |
   |                       |  role -> permission keys   |
   |  POST /auth/logout -->|  revoke the session        |
```

- The session token is a random 32 byte value. Only its SHA-256 hash is stored.
- The token travels in the httpOnly cookie `egna_session` (SameSite=Lax, Secure in
  production). It is never in `localStorage`.
- Every state changing request needs the CSRF token in the `X-CSRF-Token` header, matching
  the `egna_csrf` cookie.
- `SessionGuard` runs on every route: it resolves the cookie into a principal, or answers
  `401` when the route is not `@Public()`.
- `PermissionsGuard` checks the permission keys, or answers `403` and writes an
  `access.denied` audit row.

See [security.md](security.md) for the whole picture.

## 5. The permission model

- A **permission key** is the unit of authorisation: `tasks.view`, `quotes.edit`,
  `taskers.assign`, `taskers.verify`, `exceptions.resolve`, `refunds.approve`,
  `payments.view`, `reports.view`, `catalog.edit`, `users.manage`, `roles.manage`,
  `audit.view`, `settings.manage`.
- A **role** groups permissions: `CUSTOMER`, `TASKER`, `OPERATIONS`, `FINANCE`, `ADMIN`.
- The mapping lives in the database (`role_permissions`) and is edited by an administrator
  in the staff console. The defaults are in `packages/shared/src/permissions.ts`.
- The web app hides the navigation items a person may not use and shows the forbidden
  screen when they open the URL anyway. The server decides, always.

| Role         | Permissions                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `CUSTOMER`   | none (they only reach their own data)                                                                 |
| `TASKER`     | none (they only reach their own assignments)                                                          |
| `OPERATIONS` | `tasks.view`, `quotes.edit`, `taskers.assign`, `taskers.verify`, `exceptions.resolve`, `reports.view` |
| `FINANCE`    | `tasks.view`, `refunds.approve`, `payments.view`, `reports.view`, `audit.view`                        |
| `ADMIN`      | all of them, and the role can never be edited                                                         |

The portal of a role is fixed: customer -> `/app`, tasker -> `/tasker`, staff ->
`/staff` (`PORTAL_BY_ROLE` in `packages/shared`).

## 6. API map

All REST endpoints live under `/api/v1` and are documented in Swagger at `/api/docs`.

| Method | Path                                    | Permission     | Purpose                             |
| ------ | --------------------------------------- | -------------- | ----------------------------------- |
| GET    | `/api/v1/health`                        | public         | Liveness plus a real database check |
| GET    | `/api/v1/auth/csrf`                     | public         | Issue the CSRF token                |
| POST   | `/api/v1/auth/register`                 | public         | Create a customer account           |
| POST   | `/api/v1/auth/login`                    | public         | Sign in and start a session         |
| POST   | `/api/v1/auth/logout`                   | signed in      | Sign out of this device             |
| POST   | `/api/v1/auth/logout-all`               | signed in      | Sign out everywhere                 |
| GET    | `/api/v1/auth/me`                       | signed in      | The signed in person                |
| POST   | `/api/v1/auth/forgot`                   | public         | Ask for a reset link                |
| POST   | `/api/v1/auth/reset`                    | public         | Set a new password                  |
| POST   | `/api/v1/auth/verify-email`             | public         | Confirm the email address           |
| POST   | `/api/v1/auth/resend-verification`      | public         | Send the verification email again   |
| POST   | `/api/v1/auth/accept-invite`            | public         | Accept a staff invitation           |
| PATCH  | `/api/v1/me`                            | signed in      | Update name, phone or language      |
| POST   | `/api/v1/me/change-password`            | signed in      | Change your own password            |
| GET    | `/api/v1/staff/users`                   | `users.manage` | Search and filter the people        |
| POST   | `/api/v1/staff/users/invite`            | `users.manage` | Invite a staff user                 |
| PATCH  | `/api/v1/staff/users/:id/role`          | `users.manage` | Change a role                       |
| POST   | `/api/v1/staff/users/:id/disable`       | `users.manage` | Disable an account                  |
| POST   | `/api/v1/staff/users/:id/enable`        | `users.manage` | Enable an account                   |
| GET    | `/api/v1/staff/roles`                   | `roles.manage` | The roles and their permissions     |
| PUT    | `/api/v1/staff/roles/:role/permissions` | `roles.manage` | Replace the permissions of a role   |
| GET    | `/api/v1/staff/audit`                   | `audit.view`   | The audit log, newest first         |
| GET    | `/api/v1/staff/audit/export.csv`        | `audit.view`   | Download the audit log as CSV       |

Cross cutting behaviour, all set up in `apps/api/src/main.ts`:

- global prefix `api/v1`
- Helmet security headers
- CORS limited to `WEB_ORIGIN`, credentials allowed (httpOnly cookies)
- request id middleware (`x-request-id` in and out)
- request logger (pino, one structured line per request)
- rate limiting (10 a minute on `/auth/*`, 120 a minute elsewhere, per IP)
- global `ValidationPipe` (whitelist, forbid unknown, transform) and the Zod pipe for the
  request bodies
- global exception filter returning `{ code, message, details, requestId }`
- environment validated with zod at boot

See [api-conventions.md](api-conventions.md) for the full contract.

## 7. The catalogue, the templates and the tasks

- The catalogue is **data**: `services` and `service_templates`. A new service needs a row
  and a template, never a code change. See [templates.md](templates.md).
- `buildZodSchema(definition)` in `packages/shared` turns a template into a validator. The
  API uses it to validate a submission, the web app uses the same one for the inline errors.
- A task keeps the exact template version it was created with, so publishing a new version
  never changes a task that is already submitted.
- The status of a task only ever changes through the `TaskStateMachine` service. See
  [state-machine.md](state-machine.md).
- The request form is rendered from the definition by one component
  (`apps/web/src/features/tasks/TaskForm.tsx`). The staff template editor uses the same
  renderer for its live preview, so an administrator sees what a customer gets.

## 8. Design tokens and the UI kit

`packages/design-tokens/tokens.json` is the single source of truth. `npm run tokens:build`
generates:

- `dist/tokens.css`: CSS custom properties (`:root`) used by the web app
- `dist/tailwind-preset.js`: the Tailwind preset (`brand`, `ink`, `line`, `surface`, `canvas`,
  `warning`, `danger`, `chip` colours, `heading`/`body`/`ethiopic` fonts, radii, control sizes)

Pages never hard-code a colour or a control size. `/ui-kit` is the visual regression sheet: it
renders every component in every state, including all fourteen status chips.

## 9. Data model

Phase 1 ships the accounts, the roles, the permissions, the sessions, the email tokens and
the append-only audit log. See [data-model.md](data-model.md) for every column, index and
the database trigger that blocks changes to the audit log.

## 10. Conventions

- **Money**: integer santim, always. `toSantim` / `fromSantim` / `formatETB` live in
  `packages/shared/src/money.ts`.
- **Status**: the only legal statuses are the ones in `TaskStatus`
  (`packages/shared/src/enums/task-status.ts`). Status changes go through one TaskStateMachine
  service (Phase 2+), never directly.
- **i18n**: every user facing string is a key. `en.json`, `am.json` and `om.json` always hold
  the same keys; a web test enforces it.
- **Auth**: httpOnly cookie sessions with CSRF. Tokens are never stored in `localStorage`.
  The only value in `localStorage` is the language preference.
- **Authorisation**: enforced on the server with permission keys. Hiding UI is not security.
- **Files**: private bucket, short lived signed URLs.
- **Testing**: Vitest for web and shared, Jest + Supertest for the API.
