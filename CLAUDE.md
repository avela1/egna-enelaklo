# CLAUDE.md

Permanent instructions for every session that works on **egna-enelaklo** (እኛ እንላከሎ).
Read this file completely before writing code.

## 1. The product in one paragraph

egna-enelaklo is an Ethiopian task marketplace launching in Addis Ababa. Customers delegate
real-world errands to company-managed taskers. It is web first (a mobile app comes much later).
There is no marketing landing page: the root URL goes to sign in. Exactly three services at
launch: **buy and deliver**, **queue and paperwork**, **pickup and drop-off**. Four kinds of
users, each with their own portal in one web app: customer (`/app`), tasker (`/tasker`), staff
(`/staff`) and public auth pages (`/`). English first, plus Amharic and Afaan Oromoo. Currency
is ETB.

Business flow: customer submits a task -> staff review -> staff quote (service fee + budget
cap) -> customer approves -> staff manually assign a verified tasker -> tasker executes and
uploads receipt/delivery evidence -> customer confirms (auto-confirm after 24h) -> final charge
is fee + receipt total, never above the authorised amount, unused budget released. Taskers buy
with their own money and are reimbursed after confirmation. Staff handle exceptions, refunds and
disputes. Payments are sandbox/test-mode only for now.

## 2. The eight phases

| Phase | Scope                                                                  |
| ----- | ---------------------------------------------------------------------- |
| 0     | Foundation: monorepo, tokens, UI kit, layouts, routes, i18n, API shell |
| 1     | Auth, roles/permissions, audit log, users admin                        |
| 2     | Service catalogue and task request forms                               |
| 3     | Staff review, quotes, customer approval, notifications                 |
| 4     | Taskers: onboarding, assignment, evidence, completion                  |
| 5     | Money: ledger, reconciliation, sandbox payments, refunds, earnings     |
| 6     | Exceptions, reports, settings, help                                    |
| 7     | Hardening, Amharic/Oromo strings, e2e tests, pilot                     |

Design every phase so the next one slots in without restructuring.

## 3. Permanent rules (never break these)

1. Keep the folder structure in section 5. Do not invent new top-level folders.
2. Task status will change only through ONE TaskStateMachine service (added in a later phase).
   Never update status directly.
3. Money is always integer santim (1 ETB = 100 santim). Never floats.
4. Every staff/admin write will also write an audit_log row in the same DB transaction.
5. Authorization is enforced on the SERVER with permission keys. Hiding UI is not security.
6. Auth will use httpOnly cookie sessions + CSRF. Never store tokens in localStorage.
7. Uploaded files go to a PRIVATE bucket and are served through short-lived signed URLs.
8. UI must use only components from `apps/web/src/components/ui` and the design tokens.
   No raw hex colours or one-off pixel values inside pages.
9. All user-facing strings go through i18n keys. `en.json`, `am.json` and `om.json` must always
   contain the same keys.
10. Never fake integrations. Anything not implemented must be clearly marked as such, not made
    to look functional.
11. Never commit real credentials. Provide `.env.example` only.
12. Every phase ends with: migrations run, lint + typecheck + tests pass,
    `docs/phases/phase-N.md` with an acceptance checklist, then STOP and wait for approval.

## 4. Tech stack (use exactly this)

- TypeScript 5, strict mode everywhere, Node 22 LTS.
- npm workspaces + Turborepo monorepo.
- `apps/web`: React 18, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS
  3.4, Radix UI primitives, react-i18next.
- `apps/api`: NestJS 10, REST under `/api/v1`, Swagger, Prisma 5 + PostgreSQL 16, pino logging,
  Helmet, zod for env validation, argon2id for password hashing. (Later phases add pg-boss for
  jobs; do not install it now.)
- `packages/shared`: Zod schemas, enums, money utils (shared by web and api).
- Tests: Vitest (web, shared), Jest + Supertest (api). ESLint (flat config) + Prettier,
  Husky + lint-staged. GitHub Actions CI.
- Local services via Docker Compose: PostgreSQL, SeaweedFS (S3-compatible private file
  storage, see docs/decisions/0005), Mailpit.

## 5. Folder map

```
egna-enelaklo/
  apps/web/            React app: src/app (router, providers, layouts), src/features/<domain>/,
                       src/components/ui/, src/lib/, src/i18n/, src/styles/
  apps/api/            NestJS: prisma/ (schema.prisma, migrations, seed.ts), src/common/,
                       src/config/, src/modules/ (only health in Phase 0)
  packages/shared/     Zod schemas, enums, money utils
  packages/design-tokens/ tokens.json + build script -> CSS variables + Tailwind preset
  packages/config/     shared tsconfig, ESLint config, Prettier config
  design/brand/        logo.svg, wordmark.svg, favicon.svg
  docs/                architecture.md, api-conventions.md, phases/phase-0.md, decisions/
  infra/               docker-compose.yml
  .github/workflows/ci.yml, .env.example, .nvmrc, .editorconfig, turbo.json, package.json,
  README.md, CLAUDE.md
```

## 6. Design system rules

- Source of truth: `packages/design-tokens/tokens.json`. Run `npm run tokens:build` after
  changing it. The build writes `dist/tokens.css` (CSS variables) and `dist/tailwind-preset.js`.
- Brand teal: 500 `#0E7C7B`, 700 `#0A5E5D`, 100 `#CFE8E6`, 50 `#E1F2F1`.
- Ink: 900 `#1F2A2E`, 700 `#3B4A4F`, 500 `#5A696D`. Line `#DCE4E4`. Surface `#FFFFFF`.
  Page background `#F4F7F7`.
- Warning: text `#6B4400` on `#FCEFD0`. Danger: text `#8A1C1C` on `#FBE0E0`.
  Neutral chip: text `#3B4A4F` on `#E8EDED`.
- Fonts: Sora 600/700 for headings (page title 28px, letter-spacing -0.5px), Figtree 400-700
  for body (15px base), Noto Sans Ethiopic for Amharic.
- Radius 10px controls, 12px inner panels, 16px cards. Cards are white with a 1px line border
  and NO shadow. Controls are at least 44px tall, inputs 46px, primary buttons 48px.
- Every control has a visible focus ring.
- StatusChip variants: Draft/Cancelled grey, Submitted/In review teal tint, Needs info/Quote
  ready amber, Approved/In progress solid teal, Delivered outlined teal, Completed charcoal,
  Exception red.

## 7. Working agreements

- Every user-facing string goes through `useTranslation()`. Never hard-code copy in a component.
  Add the key to `en.json`, `am.json` and `om.json` in the same commit; the web test fails when
  the three files drift apart.
- Pages use only components from `apps/web/src/components/ui`. If you need a new primitive, add
  it there (accessible, keyboard friendly) and show it in `/ui-kit`.
- The API validates the environment with zod at boot, returns `{ code, message, details,
requestId }` for every error and logs with pino.
- New endpoints live under `/api/v1`, are documented in Swagger and follow
  `docs/api-conventions.md`.
- Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` before you stop.
- Never commit `.env` files, real credentials or generated `dist/` output.
