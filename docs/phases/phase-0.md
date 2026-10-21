# Phase 0 - Foundation

Status: **complete**, waiting for approval.

Phase 0 builds the foundation only: the monorepo, the design system, the four portals with
placeholder pages, the i18n skeleton and the API shell. No business logic is implemented on
purpose, and nothing pretends to work: every placeholder says so.

## What was built

### A. Monorepo

- npm workspaces + Turborepo with the tasks `build`, `lint`, `typecheck`, `test`, `dev`.
- Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`, `format:check`,
  `tokens:build`, `db:migrate`, `db:deploy`, `db:seed`, `db:studio`.
- Shared strict TypeScript in `packages/config/tsconfig/base.json` with `noUncheckedIndexedAccess`,
  `noUnusedLocals`, `noUnusedParameters` and `noImplicitOverride`.
- ESLint 9 flat config shared from `packages/config/eslint`, Prettier config, Husky +
  lint-staged (`.husky/pre-commit` runs ESLint and Prettier on the staged files).

### B. Local environment

- `infra/docker-compose.yml`: `postgres:16-alpine` (named volume, healthcheck, database
  `egna_dev`), `minio` (API 9000, console 9001) with a `minio-init` service that creates the
  **private** bucket `egna-private` and disables anonymous access, `mailpit` (SMTP 1025, UI
  8025).
- MinIO runs behind the `storage` profile (`npm run infra:storage`) so that a registry which
  cannot reach `minio/minio` does not block PostgreSQL and Mailpit.
- The PostgreSQL host port is configurable with `POSTGRES_HOST_PORT` in the root `.env`, so the
  stack also runs on a machine that already has PostgreSQL on 5432.
- `.env.example` at the root, in `apps/api` and in `apps/web`, every variable documented. No
  real `.env` is committed and `.env` is git ignored.
- Ports: web 5173, api 3000.

### C. Design tokens

- `packages/design-tokens/tokens.json` is the single source of truth.
- `npm run tokens:build` writes `dist/tokens.css` (CSS variables) and `dist/tailwind-preset.js`
  (Tailwind preset).
- Brand teal 500/700/100/50, ink 900/700/500, line, surface, page background, warning, danger
  and neutral chip colours, Sora / Figtree / Noto Sans Ethiopic, 10/12/16px radii, 44/46/48px
  control heights.

### D. Web app

- Vite + React 18 + TypeScript + Tailwind 3.4, Radix primitives, react-i18next, TanStack Query,
  React Hook Form + Zod.
- `src/components/ui`: Button (primary, secondary, danger, ghost, loading, three sizes), Input,
  Select, Textarea, Checkbox, Radio, Switch, FormField, Card, Table, Tabs, Stepper, Modal,
  Toast, EmptyState, Skeleton, Chip, StatusChip. All accessible (real labels, `aria-*`, visible
  focus ring, keyboard support).
- `StatusChip` covers all fourteen task statuses with the exact colours of the brief.
- Brand components: `LogoMark` (48x48 teal rounded square, white check, two light speed
  lines), `Wordmark` (Sora 700 + Noto Sans Ethiopic 600), `Brand`. The same assets are saved in
  `design/brand/` and the favicon is used by the app.
- Layouts: `CustomerLayout` (232px white sidebar, page title + language switch in the header),
  `TaskerLayout` (white top bar, dark "Tasker" badge, max width 1200px on the canvas
  background), `StaffLayout` (250px `#1F2A2E` sidebar, grouped navigation, active item solid
  teal), `AuthLayout` (split screen, no landing page). All of them collapse on narrow screens.
- Routes: `/` redirects to `/sign-in`; the auth pages; `/app` (7 pages), `/tasker` (5 pages),
  `/staff` (13 pages), `/ui-kit` and a 404 page. Every page is a title plus an `EmptyState`.
- i18n: `en.json`, `am.json`, `om.json` with identical keys, the language switch in every
  layout header, and the choice remembered in `localStorage` (the only value stored there).

### E. API

- NestJS 10 with zod validated environment, global prefix `api/v1`, Swagger at `/api/docs`,
  global `ValidationPipe`, a global exception filter returning
  `{ code, message, details, requestId }`, request id middleware, pino logging, Helmet and CORS
  limited to the web origin.
- `GET /api/v1/health` returns the service status and a real database check.
- Prisma 5 against PostgreSQL 16 with the first migration applied, plus the `prisma:generate`,
  `prisma:migrate`, `prisma:deploy` and an empty `prisma:seed` script.

### F. Shared package

- `TaskStatus` (14 states), `Role` (5 roles), `ServiceType` (3 services) and their Zod schemas.
- Money helpers `toSantim`, `fromSantim`, `formatETB` ("ETB 2,730"), `addSantim`,
  `subtractSantim`, `isSantim`, all unit tested.

### G. Quality

- 12 tests in `packages/shared`, 5 in `apps/web` (including a render smoke test of the four
  portals), 1 Supertest test in `apps/api` that hits `/api/v1/health`.
- `.github/workflows/ci.yml` installs, lints, typechecks, tests and builds with a PostgreSQL
  service container.

### H. Documentation

- `README.md` (setup in under 10 minutes), `CLAUDE.md` (permanent rules, stack, folder map),
  `docs/architecture.md`, `docs/api-conventions.md`, `docs/phases/phase-0.md` and
  `docs/decisions/`.

## Acceptance checklist

- [x] `docker compose -f infra/docker-compose.yml up -d`, then `npm install`, then `npm run dev`
      starts the web app on 5173 and the API on 3000.
- [x] `GET /api/v1/health` returns `{"status":"ok","database":"connected",...}` and
      `/api/docs` loads.
- [x] `/ui-kit` shows every component and every `StatusChip` with the exact colours of the
      brief (verified: the built CSS contains `#0E7C7B`, `#0A5E5D`, `#E1F2F1`, `#CFE8E6`,
      `#1F2A2E`, `#3B4A4F`, `#5A696D`, `#DCE4E4`, `#FFFFFF`, `#F4F7F7`, `#FCEFD0`, `#6B4400`,
      `#FBE0E0`, `#8A1C1C`, `#E8EDED`).
- [x] All three layouts render and navigate between the placeholder pages; the language switch
      works and is remembered.
- [x] `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` all pass.
- [x] A deliberate lint error is blocked by the pre-commit hook (verified: the commit was
      rejected with `@typescript-eslint/no-explicit-any` and no commit was created).
- [x] No secrets are committed; `.env.example` is complete at the root, in `apps/api` and in
      `apps/web`.

## Deviations and open questions

1. **The Prisma schema is not empty.** Prisma refuses to generate a client from a schema without
   models, so the first migration creates exactly one table: `audit_log`. This table is required
   by permanent rule 4 (every staff/admin write also writes an audit row) and it proves the
   migration pipeline end to end. Every domain table arrives in Phase 1 and later.
2. **`class-validator` and `class-transformer` were added to the API.** The brief asks for a
   global validation pipe; NestJS implements that pipe with these two packages. Zod stays the
   validation library for the environment and for `packages/shared`.
3. **The MinIO image could not be pulled from the machine this was built on** (the registry proxy
   refuses `minio/minio` and `minio/mc`). The compose file is correct and MinIO was moved
   behind the `storage` profile so the rest of the stack is unaffected. Mailpit and PostgreSQL
   were verified running. MinIO is first needed in Phase 4.
4. **The build machine already runs a native PostgreSQL on 5432**, which shadows the container
   port. `POSTGRES_HOST_PORT` in the root `.env` solves it; the build machine was verified with
   the container on 5433 and `DATABASE_URL` pointing at 5433.
5. **The Amharic and Oromo strings are first drafts.** They are complete and in sync with the
   English keys, but they should be reviewed by native speakers before the pilot. Phase 7 is
   where the copy is finalised.
6. **The tasker portal and the staff console have no avatar or user data** because there is no
   authentication yet. They show a clearly unsigned state instead of a fake person.

## Not started (by design)

Phase 1: authentication, roles and permissions, the audit log writer, the users admin.
