# Architecture

egna-enelaklo is a single web application that serves four portals, backed by one REST API.
This document is the map for everyone who touches the repository.

## 1. Monorepo

npm workspaces + Turborepo. Every workspace is a private package.

| Workspace                | Package                        | Purpose                                          |
| ------------------------ | ------------------------------ | ------------------------------------------------ |
| `apps/web`               | `@egna-enelaklo/web`           | React 18 + Vite: customer, tasker, staff, auth   |
| `apps/api`               | `@egna-enelaklo/api`           | NestJS 10 REST API under `/api/v1`               |
| `packages/shared`        | `@egna-enelaklo/shared`        | Enums, Zod schemas, money helpers                |
| `packages/design-tokens` | `@egna-enelaklo/design-tokens` | `tokens.json` -> CSS variables + Tailwind preset |
| `packages/config`        | `@egna-enelaklo/config`        | Shared tsconfig, ESLint, Prettier                |

Turbo tasks: `build`, `lint`, `typecheck`, `test`, `dev`. Every task depends on `^build`, so a
package is always built before the package that consumes it.

`packages/shared` is consumed directly from source by the web app (Vite alias + tsconfig
`paths`) and from `dist` by the API (CommonJS). That keeps one implementation and avoids
interop surprises in the browser bundle.

## 2. Folder map

```
apps/web/src
  app/            router, providers, layouts, route types, app level hooks
  components/ui/  the design system: Button, Input, Select, Textarea, Checkbox, Radio,
                  Switch, FormField, Card, Table, Tabs, Stepper, Modal, Toast, EmptyState,
                  Skeleton, Chip, StatusChip
  components/brand/ LogoMark, Wordmark, Brand
  features/       one folder per domain: auth, customer, tasker, staff, ui-kit, shared
  i18n/           i18next setup and locales/en.json, am.json, om.json
  lib/            cn (class merge), api (typed fetch client)
  styles/         Tailwind entry point

apps/api/src
  common/         prisma service, filters, logging, middleware
  config/         env validation (zod)
  modules/        feature modules; Phase 0 has only health
```

## 3. Route map

### Public (auth layout, split screen)

| Route              | Page                      |
| ------------------ | ------------------------- |
| `/`                | redirects to `/sign-in`   |
| `/sign-in`         | Sign in                   |
| `/register`        | Create a customer account |
| `/forgot-password` | Reset password            |

### Customer portal `/app` (light sidebar, 232px)

| Route                | Page                 |
| -------------------- | -------------------- |
| `/app`               | My tasks (dashboard) |
| `/app/new-task`      | New task             |
| `/app/addresses`     | Saved addresses      |
| `/app/payments`      | Payments             |
| `/app/notifications` | Notifications        |
| `/app/help`          | Help and rules       |
| `/app/profile`       | Profile and language |

### Tasker portal `/tasker` (top navigation, max width 1200px)

| Route                | Page        |
| -------------------- | ----------- |
| `/tasker`            | Assignments |
| `/tasker/assignment` | Assignment  |
| `/tasker/job`        | Active job  |
| `/tasker/earnings`   | Earnings    |
| `/tasker/profile`    | My profile  |

### Staff console `/staff` (dark sidebar, 250px)

| Route               | Page                        | Group          |
| ------------------- | --------------------------- | -------------- |
| `/staff/queue`      | Task queue                  | Operations     |
| `/staff/review`     | Review and quote            | Operations     |
| `/staff/assign`     | Assign a tasker             | Operations     |
| `/staff/exceptions` | Exceptions                  | Operations     |
| `/staff/taskers`    | Taskers directory           | Operations     |
| `/staff/reports`    | Reports                     | Operations     |
| `/staff/payments`   | Payments and reconciliation | Finance        |
| `/staff/catalog`    | Service catalog             | Administration |
| `/staff/templates`  | Templates                   | Administration |
| `/staff/users`      | Users                       | Administration |
| `/staff/roles`      | Roles and permissions       | Administration |
| `/staff/audit`      | Audit log                   | Administration |
| `/staff/settings`   | Platform settings           | Administration |

### Other

| Route     | Page                              |
| --------- | --------------------------------- |
| `/ui-kit` | Every UI component in every state |
| `*`       | 404 page                          |

Route metadata (the page title shown in the layout header) travels in the route `handle`
(`{ titleKey }`) and is read with `usePageTitleKey()`.

## 4. API map

All REST endpoints live under `/api/v1` and are documented in Swagger at `/api/docs`.

| Method | Path             | Purpose                             |
| ------ | ---------------- | ----------------------------------- |
| GET    | `/api/v1/health` | Liveness plus a real database check |

Cross cutting behaviour, all set up in `apps/api/src/main.ts`:

- global prefix `api/v1`
- Helmet security headers
- CORS limited to `WEB_ORIGIN`, credentials allowed (httpOnly cookies later)
- request id middleware (`x-request-id` in and out)
- request logger (pino, one structured line per request)
- global `ValidationPipe` (whitelist, forbid unknown, transform)
- global exception filter returning `{ code, message, details, requestId }`
- environment validated with zod at boot

See [api-conventions.md](api-conventions.md) for the full contract.

## 5. Design tokens and the UI kit

`packages/design-tokens/tokens.json` is the single source of truth. `npm run tokens:build`
generates:

- `dist/tokens.css` - CSS custom properties (`:root`) used by the web app
- `dist/tailwind-preset.js` - the Tailwind preset (`brand`, `ink`, `line`, `surface`, `canvas`,
  `warning`, `danger`, `chip` colours, `heading`/`body`/`ethiopic` fonts, radii, control sizes)

Pages never hard-code a colour or a control size. `/ui-kit` is the visual regression sheet: it
renders every component in every state, including all fourteen status chips.

## 6. Data model

Phase 0 ships one table, `audit_log`, because permanent rule 4 requires the audit trail from
day one. Prisma cannot generate a client from a model-less schema, so the baseline table also
proves the migration pipeline end to end.

Every domain table (users, roles, sessions, tasks, quotes, assignments, evidence, ledger) is
added in Phase 1 and later, with its own migration.

## 7. Conventions

- **Money**: integer santim, always. `toSantim` / `fromSantim` / `formatETB` live in
  `packages/shared/src/money.ts`.
- **Status**: the only legal statuses are the ones in `TaskStatus`
  (`packages/shared/src/enums/task-status.ts`). Status changes go through one TaskStateMachine
  service (Phase 1+), never directly.
- **i18n**: every user facing string is a key. `en.json`, `am.json` and `om.json` always hold
  the same keys; a web test enforces it.
- **Auth**: httpOnly cookie sessions with CSRF. Tokens are never stored in `localStorage`. The
  only value in `localStorage` is the language preference.
- **Authorisation**: enforced on the server with permission keys. Hiding UI is not security.
- **Files**: private bucket, short lived signed URLs.
- **Testing**: Vitest for web and shared, Jest + Supertest for the API.
