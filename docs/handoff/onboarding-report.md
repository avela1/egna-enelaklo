# Onboarding and audit report — egna-enelaklo

Date: 2026-10-26 · Auditor: ZCode onboarding session · Scope: read-only audit of the whole repository, phases 0–2, against the permanent rules and the phase baselines. Nothing was modified except this file and a local Prisma client regeneration (see B).

---

## A. Project understanding

egna-enelaklo (እኛ እንላከሎ, "Your tasks. Our people. Done.") is an Ethiopian task marketplace launching in Addis Ababa. Customers delegate real-world errands — exactly three at launch: **Buy and deliver**, **Queue and paperwork**, **Pickup and drop-off** — to company-managed taskers. It is web first with no marketing landing page: `/` redirects to `/sign-in`. One React SPA serves four portals: customer at `/app` (light 232px sidebar), tasker at `/tasker` (top bar, dark "Tasker" badge, 1200px content), staff at `/staff` for Operations/Finance/Admin (dark #1F2A2E 250px sidebar), plus public auth pages. English first with Amharic and Afaan Oromoo over i18n keys from day one; money is ETB stored as integer santim only.

Business flow: customer submits a task → staff review → staff quote (service fee + budget cap) → customer approves (authorising up to fee + cap) → staff manually assign a verified tasker → tasker executes and uploads receipt/delivery evidence → customer confirms (auto-confirm after 24h) → final charge = fee + receipt total, capped at the authorised amount; unused budget is released; taskers are reimbursed after confirmation. Staff handle exceptions, refunds and disputes. Payments stay sandbox/test-mode until a provider and legal validation exist. The catalogue is data-driven: more services require rows, not code.

Stack: TypeScript 5 strict, Node 22, npm workspaces + Turborepo; `apps/web` (React 18, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind 3.4 with a generated design-token preset, Radix UI, react-i18next); `apps/api` (NestJS 10, REST under `/api/v1`, Swagger at `/api/docs`, Prisma 5 + PostgreSQL 16, pino, Helmet, zod env validation, argon2id, @nestjs/throttler); `packages/shared` (enums, Zod schemas, money utils, permission keys, transition table), `packages/design-tokens` (tokens.json → CSS vars + Tailwind preset), `packages/config` (shared tsconfig/ESLint/Prettier). Tests: Vitest (web, shared), Jest + Supertest (api). Docker Compose provides PostgreSQL, S3-compatible storage, Mailpit. pg-boss arrives in a later phase.

Permanent rules I will operate under: folder structure fixed; task status changes only through the one `TaskStateMachine`; money always integer santim; every staff/admin write audited in the same DB transaction; server-side authorization with permission keys; httpOnly cookie sessions + CSRF, nothing but the language preference in localStorage; uploads to a private bucket via short-lived signed URLs; UI only via `components/ui` + tokens; all strings through i18n with en/am/om key parity; no fake integrations; no real credentials committed; every phase ends with migrations + lint + typecheck + tests green and a `docs/phases/phase-N.md` checklist, then STOP.

## B. How to run it, and the actual results

Environment used: Linux, Node v22.23.4, npm 10.9.9, Docker 29.9.2 / Compose v5.6.1.

```bash
npm install                 # ok
cp .env.example .env        # (already present locally; POSTGRES_HOST_PORT=5433)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run infra:up            # postgres:16-alpine on 5433, mailpit on 1025/8025 (both healthy)
npm run tokens:build        # ok
npm run db:deploy           # FAILED — see result 1
npm run db:seed             # FAILED first, then OK — see result 2
npm run lint                # PASS — 8/8 turbo tasks
npm run typecheck           # PASS — 8/8 turbo tasks
npm run test                # PASS — shared 31, web 21, api 45 = 97 tests, 0 failed, 0 skipped
npm run build               # PASS — 5/5 turbo tasks (web bundle >500 kB chunk warning)
```

1. **`npm run db:deploy` fails** with Prisma `P3015: Could not find the migration file at prisma/migrations/20261024110239_/migration.sql`. The directory exists but is empty. 14 of 15 migrations apply; the 15th can never apply. This also breaks CI (`ci.yml` runs `db:deploy`) and any fresh clone. The database schema itself is complete — all 16 tables and both append-only triggers (audit_log, task_status_history) exist after the 14 applied migrations.
2. **`npm run db:seed`** first failed because the `node_modules` Prisma client had been generated on Windows (`F:\SourceCode\...` engine paths; "could not locate the Query Engine for debian-openssl-3.0.x"). After `npx prisma generate` (an environment fix inside node_modules only, no repo file changed) the seed ran: 5 accounts, 3 LIVE services with live templates, 2 addresses, 4 sample tasks, prohibited items.
3. Runtime smoke test (dev servers started, then stopped): `GET /api/v1/health` → `{"status":"ok","database":"connected",...}`; `/api/docs` → 200; CSRF: `POST /auth/login` without token → `403 CSRF_FAILED`; login with seeded customer → session cookie set, `/auth/me` returns user with role/permissions; `GET /services` returns the 3 live services with localized names; customer calling `/staff/tasks` → `403` with `details.missing: ["tasks.view"]` and an `access.denied` audit row (verified in the DB); web root on 5173 serves the app.

## C. Folder map (what really exists)

```
egna-enelaklo/                  git repo, branch phase-2 (origin: github.com/avela1/egna-enelaklo)
  apps/web/       React 18 + Vite + Tailwind; src/app (router, providers, 4 layouts, guards),
                  src/components/ui (21 primitives + brand/), src/features (auth, customer,
                  tasker, staff, tasks, addresses, profile, errors, ui-kit, not-found, shared),
                  src/i18n (en/am/om, 490 keys each), src/lib (api client, cn), src/styles
  apps/api/       NestJS 10; prisma/ (schema, 15 migrations + 1 empty dir, seed*.ts),
                  src/common (auth guards, csrf, audit, http, mail, prisma, pipes, filters,
                  logging, services), src/config (env.ts), src/modules (auth, me, staff{users,
                  roles,audit,staff-tasks}, health, catalog, addresses, tasks{+state machine,
                  prohibited}, uploads), test/ (4 e2e suites)
  packages/shared/       enums, schemas (auth/staff/task/address), money, permissions,
                         state-machine, templates; 31 vitest tests
  packages/design-tokens/ tokens.json + build.mjs → dist/tokens.css + tailwind-preset.js
  packages/config/       eslint/{base,node,react,react-rules,root}.js, prettier/, tsconfig/
  design/                brand/ (logo, wordmark, favicon) + 34 page design PNGs
  docs/                  architecture, api-conventions, security, data-model, state-machine,
                         templates, decisions/0001–0004, phases/phase-{0,1,2}.md
  infra/docker-compose.yml  postgres + mailpit always; seaweedfs behind `storage` profile
  .github/workflows/ci.yml  install → tokens → db:deploy → lint → typecheck → test → build
```

Uncommitted working-tree changes on `phase-2`: README.md, whitespace-only edit of the phase2_catalog migration.sql, real edits in `apps/api/src/modules/tasks/tasks.service.ts` (attachment list item) and `apps/web/src/features/tasks/AttachmentList.tsx` (`openAttachment` refactor) — in-flight Phase 2 polish that was never committed.

## D. Baseline comparison

Section 4 (permanent rules): all 12 rules are implemented in the code as written (see E for edge findings). Evidence highlights: rule 2 `apps/api/src/modules/tasks/task-state-machine.service.ts` + grep-guard test `apps/api/test/tasks.e2e-spec.ts:637`; rule 3 `packages/shared/src/money.ts`, `Int` columns in schema; rule 4 `apps/api/src/common/audit/audit.service.ts` (`record(entry, tx)` called inside `$transaction` everywhere); rule 5 `permissions.guard.ts`; rule 6 `session-cookie.ts` + `csrf.guard.ts` + only `egna.locale` in localStorage; rule 7 `uploads.service.ts` (presign + 300 s read URLs, private bucket); rule 8 no raw hex outside `components/brand/LogoMark.tsx`; rule 9 490 keys in each of en/am/om, parity test `apps/web/src/i18n/i18n.test.ts`.

Section 5 (Phase 0 baseline):

| Item                                                                                                                             | Status                      | Evidence                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo folders apps/web, apps/api, packages/{shared,design-tokens,config}, design/brand, docs, infra                           | IMPLEMENTED                 | repo root                                                                                                                                                                                                                  |
| Root scripts dev/build/lint/typecheck/test/format (+infra, db, tokens)                                                           | IMPLEMENTED                 | package.json:16-35                                                                                                                                                                                                         |
| .nvmrc Node 22, .editorconfig, Husky + lint-staged, strict shared tsconfig                                                       | IMPLEMENTED                 | .nvmrc (22), .lintstagedrc.mjs, .husky/pre-commit, packages/config/tsconfig/base.json (strict + noUncheckedIndexedAccess + noUnused*)                                                                                      |
| docker-compose: postgres:16 db egna_dev                                                                                          | IMPLEMENTED                 | infra/docker-compose.yml:29-46                                                                                                                                                                                             |
| MinIO (API 9000, console 9001, bucket egna-private)                                                                              | DIFFERENT                   | SeaweedFS `chrislusf/seaweedfs:latest` on 9000/9333 behind `storage` profile, no console; documented reason (MinIO archived upstream) in compose comments; bucket name kept; README/phase-0.md still describe MinIO + 9001 |
| mailpit SMTP 1025 UI 8025                                                                                                        | IMPLEMENTED                 | docker-compose.yml:62-70                                                                                                                                                                                                   |
| .env.example in root, apps/api, apps/web                                                                                         | IMPLEMENTED                 | all three present, well documented; real `.env` files exist locally and are git-ignored                                                                                                                                    |
| Ports web 5173, api 3000                                                                                                         | IMPLEMENTED                 | vite.config.ts, env.ts                                                                                                                                                                                                     |
| Design tokens exact palette/fonts/radii → CSS vars + Tailwind preset                                                             | IMPLEMENTED                 | tokens.json (all 15 colours, Sora/Figtree/Noto Sans Ethiopic, 10/12/16)                                                                                                                                                    |
| UI kit (all listed components) + /ui-kit page                                                                                    | IMPLEMENTED                 | src/components/ui/ (21 files; +Alert, RoleChip, UserStatusChip added in phase 1), features/ui-kit/UiKitPage.tsx                                                                                                            |
| CustomerLayout 232px / TaskerLayout top bar + badge 1200px / StaffLayout #1F2A2E 250px grouped                                   | IMPLEMENTED                 | CustomerLayout.tsx:94,113; TaskerLayout.tsx:24,70 (`max-w-tasker` token); StaffLayout.tsx:150,169                                                                                                                          |
| Route map + i18n en/am/om + language switch EN/አማ/OM                                                                             | IMPLEMENTED                 | router.tsx; i18n/; LanguageSwitch.tsx; 490 keys × 3, parity enforced by test                                                                                                                                               |
| StatusChip variants per brief                                                                                                    | IMPLEMENTED                 | StatusChip.tsx (brief's statuses exact; ASSIGNED/ACCEPTED → teal-tint, REFUNDED → outlined-charcoal as unstated extensions)                                                                                                |
| API: /api/v1 prefix, health+DB check, Swagger /api/docs, validation pipe, error envelope, request-id, pino, Helmet, CORS, Prisma | IMPLEMENTED                 | main.ts:18-38, health.controller.ts, all-exceptions.filter.ts, request-id.middleware.ts, pino-logger.ts                                                                                                                    |
| Shared: TaskStatus (14), Role (5), ServiceType, money helpers + tests                                                            | IMPLEMENTED                 | packages/shared/src/enums/*, money.ts, tests/money.test.ts                                                                                                                                                                 |
| CI workflow                                                                                                                      | IMPLEMENTED (currently red) | ci.yml runs db:deploy → will hit the P3015 failure                                                                                                                                                                         |
| README, CLAUDE.md, docs/architecture.md, api-conventions.md, phases/phase-0.md                                                   | IMPLEMENTED                 | present; several drift spots listed in E                                                                                                                                                                                   |

Section 6 (Phase 1 baseline):

| Item                                                                                                                                      | Status      | Evidence                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| User/Role/Permission/RolePermission/UserRole/Session(token hash only)/EmailToken(hashed)/AuditLog(append-only DB block)                   | IMPLEMENTED | schema.prisma:94-221; triggers in migration 20261021000000_phase1_auth                             |
| 13 permission keys + role defaults (CUSTOMER/TASKER none, OPERATIONS 6, FINANCE 5, ADMIN all)                                             | IMPLEMENTED | packages/shared/src/permissions.ts:51-70                                                           |
| register (customers only)                                                                                                                 | IMPLEMENTED | auth.service.ts:44-106 (hard-codes CUSTOMER role)                                                  |
| login generic error, lockout 15 min after 5, session rotation                                                                             | IMPLEMENTED | auth.service.ts:108-209 (DUMMY_HASH timing pad; rotation revokes current session)                  |
| logout, logout-all, me, PATCH /me, change password                                                                                        | IMPLEMENTED | auth.controller.ts, me.controller.ts                                                               |
| forgot/reset (single-use hashed, 60 min)                                                                                                  | IMPLEMENTED | auth.service.ts:238-307 + env RESET_PASSWORD_TOKEN_MINUTES=60                                      |
| verify email + resend                                                                                                                     | IMPLEMENTED | auth.service.ts:310-372                                                                            |
| argon2id                                                                                                                                  | IMPLEMENTED | password.service.ts (m=19456,t=2,p=1); note CLAUDE.md §4 still says "do not install argon2 now"    |
| cookie egna_session httpOnly SameSite=Lax Secure(prod) 7d sliding 30d absolute                                                            | IMPLEMENTED | session-cookie.ts, session.service.ts touch() (hourly write)                                       |
| CSRF double-submit X-CSRF-Token on state-changing incl. auth routes                                                                       | IMPLEMENTED | csrf.guard.ts (global, runs last of 5 guards), csrf.service.ts                                     |
| throttling on /auth/*                                                                                                                     | IMPLEMENTED | app.module.ts:28-30, rate-limit.ts (10/min auth, 120/min rest)                                     |
| global SessionGuard @Public(), PermissionsGuard @RequirePermission()                                                                      | IMPLEMENTED | app.module.ts:46-50, session.guard.ts, permissions.guard.ts (403 writes access.denied audit row)   |
| AuditService.record() in same transaction                                                                                                 | IMPLEMENTED | audit.service.ts; verified in auth/users/roles/catalog/state-machine services                      |
| staff users list/search/filter, invite 72h, change role, disable/enable, no self-disable, last-admin protection, disable revokes sessions | IMPLEMENTED | staff-users.service.ts (CANNOT_DISABLE_SELF, CANNOT_DEMOTE_SELF, LAST_ADMIN, revokeAllForUser)     |
| roles matrix read/edit, ADMIN locked                                                                                                      | IMPLEMENTED | staff-roles.service.ts (ROLE_LOCKED for ADMIN)                                                     |
| audit list/filter + CSV export (audited)                                                                                                  | IMPLEMENTED | staff-audit.controller.ts (recordExport before sending)                                            |
| seed dev-only, refuses production, SEED_PASSWORD, 5 accounts                                                                              | IMPLEMENTED | seed.ts:322-332, SEED_USERS                                                                        |
| web auth pages, verify banner, profile, guards/redirects, staff Users/Roles/Audit, 401/403/404/500                                        | IMPLEMENTED | features/auth/pages/_, VerifyEmailBanner.tsx, ProfilePage.tsx, guards.tsx, staff/pages/_, errors/* |
| Phase 1 tests + docs/security.md, data-model.md, phases/phase-1.md                                                                        | IMPLEMENTED | 45 api tests; docs present (security.md has minor editorial defects)                               |

Phase 2 (the brief says "not started" — it is **already fully built and marked "complete, waiting for approval"** in docs/phases/phase-2.md, committed on branch `phase-2`):

| Item                                                                                                                  | Status      | Evidence                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| Versioned service templates (one live version, publish archives previous, tasks pinned to their version)              | IMPLEMENTED | schema.prisma ServiceTemplate, catalog.service.ts publishTemplate                                       |
| Dynamic request forms (definition → Zod via buildZodSchema, same schema API + web)                                    | IMPLEMENTED | packages/shared/src/templates.ts (555 lines)                                                            |
| Saved addresses (soft delete, default)                                                                                | IMPLEMENTED | addresses module + Address model                                                                        |
| Private uploads (presign → confirm with HeadObject check → signed read URL, owner or tasks.view staff, 404 otherwise) | IMPLEMENTED | uploads.service.ts                                                                                      |
| Task state machine (single service, FOR UPDATE lock, history row, staff audit, append-only history trigger)           | IMPLEMENTED | task-state-machine.service.ts + migration triggers                                                      |
| Customer dashboard / task detail / form / review / addresses screens                                                  | IMPLEMENTED | features/tasks/pages/_, features/addresses/_                                                            |
| Staff catalog + template editor (+ temporary /staff/queue)                                                            | IMPLEMENTED | staff/pages/StaffCatalogPage.tsx, TemplateEditorPage.tsx, StaffQueuePage.tsx; staff-tasks.controller.ts |
| Seed: 3 services + templates, prohibited items (marked pending legal review), addresses, 4 sample tasks               | IMPLEMENTED | seed.ts, seed-templates.ts                                                                              |
| Phase 2 tests, docs/templates.md, state-machine.md, phase-2.md                                                        | IMPLEMENTED | 31 shared + 21 web + 45 api tests pass                                                                  |

## E. Issues found

### Critical

1. **`prisma migrate deploy` fails on any machine** — `apps/api/prisma/migrations/20261024110239_/` is an empty directory (no `migration.sql`), so Prisma aborts with P3015. CI (`ci.yml` step "Apply the migrations") and every fresh clone are broken, which violates permanent rule 12 ("migrations running"). The empty dir must be deleted (it contains nothing) or completed.
2. **The repo is a full phase ahead of the briefed plan** — branch `phase-2`, git history and docs/phases/phase-2.md show Phase 2 (catalog, templates, tasks, state machine, addresses, uploads) fully implemented and self-declared "complete, waiting for approval", while the handoff says Phase 2 has not started. Not a code defect, but a scope/approval divergence that must be resolved before Phase 2 "starts".

### High

3. **34 npm audit vulnerabilities (2 critical, 12 high, 17 moderate, 3 low)**, including a high severity advisory against the runtime dependency `zod 3.23.8` (GHSA-mrhx-c7xc-m3w5, used by shared + api + web). The fix path (`npm audit fix`) bumps zod to 4.x, which is breaking for the Zod schemas in `packages/shared` — needs a planned upgrade, not a blind fix.
4. **Migration history is degraded** — 11 of the 15 migrations are the identical no-op `ALTER TABLE "tasks" ALTER COLUMN "ref" SET DEFAULT ('T-' || nextval('task_ref_seq'))` (a repeated Prisma drift loop), two migrations have empty names (`20261020200052_`, `20261023111041_`, plus 5 more unnamed), names contain typos ("adding_attachements"), and one is named `phase1` while containing phase-2 content. History is hard to review and the drift loop suggests `prisma migrate dev` was being run against a schema/DB that kept disagreeing.

### Medium

5. **Stray route `/app/queue`** renders `StaffQueuePage` inside the customer portal with no client guard — `apps/web/src/app/router.tsx:141-145`. The server still enforces `tasks.view` (verified 403), so this is not a security hole, but the page is misplaced and would show a broken/forbidden view to customers.
6. **`GET /staff/tasks` pagination total is wrong when filtered** — `apps/api/src/modules/staff/staff-tasks.controller.ts` calls `this.prisma.task.count()` without the `where` used by `findMany`, so `total` counts all tasks while `items` are filtered.
7. **Unvalidated body on `POST /attachments/:id/link`** — `@Body('taskId') body: { taskId: string }` has no Zod pipe, against docs/api-conventions.md §10; a malformed body becomes an unhandled shape rather than `VALIDATION_FAILED` (uploads.controller.ts).
8. **Auth audit rows hard-code `actorRole: 'CUSTOMER'`** for login success/failure, lockout, password reset and invite acceptance — `apps/api/src/modules/auth/auth.service.ts:139,168,194,295,415`. Staff logins are recorded with the wrong role in the audit trail.
9. **`submit()` is not atomic** — `apps/api/src/modules/tasks/tasks.service.ts:186-203` writes the payload/mapped columns in one transaction and then transitions status in a second one; a failure in between leaves a submitted-shaped payload on a DRAFT task.
10. **`SESSION_SECRET` is declared but never used** — validated in `apps/api/src/config/env.ts:32` ("Required in production" per its own comment, but `.optional()` and not enforced in production) and referenced nowhere else; the session cookie is an unsigned opaque token. Dead config today; a foot-gun when someone assumes it does something.
11. **Uncommitted work on the phase-2 branch** — 4 modified files (2 real code changes in tasks.service.ts / AttachmentList.tsx, README, whitespace-only migration edit) sitting in the working tree, unpushed/uncommitted.

### Low

12. Dead code: `apps/web/src/features/auth/SignInPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx` are Phase 0 placeholders superseded by `features/auth/pages/*`; nothing imports them.
13. Doc drift: CLAUDE.md §4 still says "argon2 … do not install them now" (installed and used since Phase 1); docs/phases/phase-0.md still describes a `minio-init` service and MinIO console that no longer exist; README still lists "MinIO console :9001" and has a stray `- [ ]` at the top; docs/security.md numbers two sections "1." and prints the dev seed password (`DevPassword2026`); docs/api-conventions.md §7 names permission keys (`tasks.review`, `tasks.assign`, `payments.reconcile`, `audit.read`) that don't exist in `permissions.ts`.
14. **Login lockout counter resets after an expired lock** — `auth.service.ts:155` (`failedLoginCount = user.lockedUntil ? 0 : +1`): once a lock expires, the next wrong password restarts the count at 0 instead of 1, giving a fresh 5 attempts after every lock cycle. Documented `ACCOUNT_LOCKED` code remains the known, accepted enumeration trade-off.
15. Any authenticated user (including TASKER) can call `POST /uploads/sign` and create attachments — harmless now, but worth a deliberate decision before Phase 4.
16. `toWirePayload`/`fromWirePayload` re-implement `×100` / `÷100` instead of using `toSantim`/`fromSantim` (packages/shared/src/templates.ts:411,451) — consistent today, drift risk later.
17. `components/brand/LogoMark.tsx` uses raw hex (mirrors the SVG brand asset; `logo.speed` exists in tokens but is unused there). All pages/features are clean — no raw hex, no inline pixel styles outside layouts' documented fixed widths (232px/250px, which CLAUDE.md itself specifies).
18. Web bundle emits a >500 kB chunk warning (no manualChunks).
19. Turbo warns "no output files found for task @egna-enelaklo/config#build" (config package has no build).
20. Amharic/Oromo locale strings and template field labels are first drafts (documented; Phase 7 owns the review).
21. Node/npm engines pin `>=22 <23` while CI uses `.nvmrc` (22) — consistent; noted only that `npm audit` fix paths were not validated.

### Positive verification (rules that demonstrably hold)

Session/CSRF/permission/audit behaviour was exercised live: CSRF-less POST → 403; customer → /staff/tasks → 403 + `access.denied` audit row; login/logout/me round-trip; audit_log and task_status_history are trigger-protected (verified in psql); i18n parity 490/490/490 keys; no token in localStorage (only `egna.locale`); `.env` files are git-ignored (only `.env.example` tracked); 97 tests, 0 skipped.

## F. Questions for you

1. **Phase 2 approval**: it is built, self-declared complete, and pushed to `origin/phase-2`. Do you want to (a) treat it as pending review — I audit it against your section-5-style baseline for Phase 2 as part of the corrections round, or (b) treat any part of it as not-accepted and rebuild? The corrections list you send will decide this.
2. **The empty migration directory** (`20261024110239_`): deleting the empty folder is the standard Prisma remedy and unblocks CI — shall I do exactly that in the corrections round, or do you want to inspect it first?
3. **MinIO vs SeaweedFS**: is the substitution (documented reason: MinIO community images no longer pullable) acceptable as the permanent local-dev storage, with the docs updated to match?
4. **`ACCOUNT_LOCKED` code + retryAfterSeconds** on a generic login error: keep (as documented in phase-1.md) or make the response fully generic?
5. Should the `.env` files currently on this machine (with `SEED_PASSWORD=DevPassword2026`) be considered trusted-local only, and do you want the password removed from docs/security.md?
6. For zod: stay on 3.x (accept the audit finding) until after a later phase, or plan the 4.x migration as an explicit task?

## G. Phase 2 confirmation

Phase 2 covers the service catalogue as data (services + **versioned** request-form templates with publish/archive and per-task version pinning), the dynamic request forms rendered and validated from those definitions through one shared `buildZodSchema`, saved customer addresses, private-bucket uploads with presigned writes and short-lived signed reads, the single **TaskStateMachine** (transition table, row lock, history rows, staff audit), the customer dashboard and task detail (list, chooser, form with autosave, review, submit/cancel, timeline), and the staff catalog screen + template editor (+ a temporary read-only staff queue). **The major risk is that all of this already exists** on `phase-2`: rather than building Phase 2, the realistic next step is reviewing/accepting or reworking what is there — after fixing the broken migration pipeline (critical #1), which currently blocks the phase-exit gate, CI, and any fresh environment. Secondary risks: the uncommitted working-tree changes blur what "Phase 2 code" is; the no-op migration loop makes every future `migrate dev` noisy; the `/app/queue` stray route and the staff-tasks `count()` bug sit exactly in the Phase 2 surface; and the zod 3.x audit finding touches the schema layer Phase 2 leans on. I have not started any Phase 2 work.

---

## Appendix — corrections applied (2026-10-27)

Decisions from the owner: Phase 2 is skipped (implementation plan comes later); apply the recommendations for open questions 2, 3, 4, 6; leave the seed password in `docs/security.md` as is; fix everything else that blocks a clean run.

**Migration pipeline (critical #1 + question 2)**

- Deleted the empty migration directory `apps/api/prisma/migrations/20261024110239_/` — `prisma migrate deploy` now succeeds (was P3015).
- **Root cause of the 11 no-op migrations found and fixed**: PostgreSQL normalises the `tasks.ref` default to `('T-'::text || nextval('task_ref_seq'::regclass))`, but `schema.prisma` declared `('T-' || nextval('task_ref_seq'))`, so every `prisma migrate dev` saw drift and emitted the same ALTER again. The schema now declares the exact normalised expression; `prisma migrate diff --from-migrations --to-schema-datamodel` reports **"No difference detected"**, so no more junk migrations.
- `prisma:seed` now runs `prisma-generate.mjs` first (`apps/api/package.json`), so a fresh machine cannot seed with a stale Windows/Linux-mismatched client (the failure hit during the audit).

**SeaweedFS accepted (question 3)** — new ADR `docs/decisions/0005-seaweedfs-replaces-minio.md` (the decisions index already referenced it); README (console 9001 → S3 API 9000, storage paragraph, `infra:storage` row, stray `- [ ]` removed), CLAUDE.md, phase-0.md, `.env.example` files and `env.ts` comments now say SeaweedFS.

**ACCOUNT_LOCKED kept (question 4)** — unchanged, as documented in phase-1.md. The related lockout-counter bug was fixed: after an expired lock the first wrong password now counts as the first failure of the new cycle (`auth.service.ts`), instead of one uncounted attempt.

**zod stays on 3.x (question 6)** — no upgrade. `npm audit` details: the 2 criticals are tinypool (dev-only, via vitest 2; fix = vitest 5, breaking); the highs are transitive deps of Nest/Express plus direct `nodemailer` (major) and `zod` (breaking). All need coordinated major upgrades — deferred, not forgotten.

**Other fixes from the issue list**

- Stray `/app/queue` route removed from the customer portal (`apps/web/src/app/router.tsx`).
- `GET /staff/tasks` now counts with the same `where` it filters by — `total` is correct when searching/grouping (`staff-tasks.controller.ts`).
- `POST /attachments/:id/link` body validated with new `LinkAttachmentSchema` (`packages/shared/src/schemas/task.ts` + `uploads.controller.ts`).
- Auth audit rows record the actor's real role (was hard-coded `CUSTOMER`): login, lockout, reset, verify-email, invite acceptance (`auth.service.ts`); verified live — an admin login writes `ADMIN`.
- `submit()` is atomic: `TaskStateMachine.transition()` accepts an optional transaction client and submit runs the payload write and the transition in one transaction (`task-state-machine.service.ts`, `tasks.service.ts`).
- Removed unused `SESSION_SECRET`/`COOKIE_DOMAIN` from the env schema, both `.env.example` files and CI (the session cookie is an opaque token; nothing signs it).
- `toWirePayload`/`fromWirePayload` use the shared `toSantim`/`fromSantim` instead of re-implementing ×100/÷100 (`packages/shared/src/templates.ts`).
- Deleted the dead Phase 0 auth pages `features/auth/{SignInPage,RegisterPage,ForgotPasswordPage}.tsx`.
- Doc drift: CLAUDE.md argon2 line corrected; `docs/api-conventions.md` §7 now names real permission keys; `docs/security.md` section numbering fixed (1–11).

**Verification after the corrections** — `prisma migrate status` up to date on a **freshly created database**; `db:deploy` + `db:seed` green; lint, typecheck, test (45 api + 21 web + 31 shared), build all pass; live smoke test on the fresh DB: health OK, CSRF enforced, admin + customer logins, audit rows with correct roles, draft → fill → submit (single transaction, `budget_cap_santim` extracted, history rows written) → cancel, filtered staff list totals correct. The database was then reset to the pristine seeded state (5 users, 3 live services, 4 sample tasks, 0 audit rows).

**Deliberately not done**: Phase 2 scope changes (skipped by decision), zod/npm major upgrades (deferred), uploads role restriction (Phase 4 decision), chunk-splitting of the web bundle, and the seed password in `docs/security.md` (kept per owner). Changes are uncommitted — say the word and I will commit them on `phase-2` or a new branch.

---

## Appendix — sign-in investigation (2026-10-27)

Report: "I can't log in: Enter a valid email address." Reproduced end to end in a real browser. Findings:

1. **Login itself works.** With `admin@egna.test` / `DevPassword2026` the sign-in succeeds and lands in the staff console (verified twice in the browser and via curl).
2. **The message was misleading.** The sign-in, register, forgot-password and reset pages hard-coded one message for _any_ failure of a field: an empty email, a malformed email, a name too short or a password missing a number all showed "Enter a valid email address" (or the analogous wrong message). Fixed: every field error now shows the real reason from the shared Zod schema — an empty email says "This field is required", a malformed one says "Enter a valid email address" (`apps/web/src/features/auth/pages/{SignInPage,RegisterPage,ForgotPasswordPage,PasswordFormPage}.tsx`). The web test was updated to cover both cases.
3. **14 i18n keys used by the UI were missing from all three locale files** (the parity test only checks en/am/om against each other, not against the code): `auth.signInTitle`, `auth.signInSubtitle`, `auth.forgotPassword`, `auth.newHere`, `auth.terms`, `auth.privacy`, `auth.prohibitedItems`, `auth.help`, `auth.errors.required`, `staff.catalog.draft`, `staff.templates.publishTitle`, `task.detail.cancelTitle`, `task.form.chooseAddress`, `task.form.noRows`. The sign-in page was rendering raw keys like `auth.signInTitle` as headings. All 14 added to `en.json`, `am.json`, `om.json` (504 keys each, parity verified) and the rendered page verified in the browser.
4. **The seeded admin account was locked while investigating** — `failed_login_count` reached 5, so every further attempt (even with the right password) was refused with "Too many attempts. Try again in 15 minutes." This is the documented lockout working as designed. It was reset with `npm run db:seed` (the seed resets the seeded accounts' lockout by design). If sign-in ever says "Too many attempts", either wait 15 minutes or re-run `npm run db:seed` in development.

Working credentials: the five seeded accounts (see `docs/security.md`) all use the `SEED_PASSWORD` value from `apps/api/.env` (`DevPassword2026` on this machine). The email field needs a real email address — typing a phone number, a bare name or an empty field will not pass validation (now with the correct message for each case).

---

## Appendix — Phase 2 compliance audit and the DI-import regression (2026-10-27)

The owner confirmed Phase 2 is implemented and asked for a check against the full Phase 2 brief, plus a fix for the API failing at boot after a git push.

### The recurring "import" breakage — root cause and permanent guard

The boot error `Nest can't resolve dependencies of the AuthService (?, Function, ...)` comes from injectable classes imported with `import type` (e.g. `import type { PrismaService }`). TypeScript erases those imports, so the emitted `design:paramtypes` metadata degrades to `Function` and Nest cannot resolve the dependencies. This has now happened three times (see commits `1550970`, `e919c63`, `4231742` and `c4595aa`) — a formatting tool (editor "organize imports", another AI session, or an ESLint run with the shared config) keeps converting the value imports to type imports, because `packages/config/eslint/base.js` prefers type imports while `apps/api/eslint.config.mjs` disables that rule (the API tool must not have used it).

Applied:

- Restored value imports for all injectables in `auth.service.ts`, `tasks.service.ts`, `staff-tasks.controller.ts`, `task-state-machine.service.ts` (merged with their existing value imports, e.g. `SessionService, hashToken`).
- New permanent guard `apps/api/test/di-imports.spec.ts`: scans every API source file, collects all `@Injectable()` classes, and fails with exact `file:line -> Class` output when any of them is imported via `import type` or an inline `type` specifier (multi-line import blocks included). Verified it passes on fixed sources, fails on the broken state, and passes after restore. It runs in CI with the rest of the API suite.
- CLAUDE.md working agreements now carry the rule ("never `import type` an `@Injectable()` class; do not re-enable `consistent-type-imports` for the API").
- API boots clean (`/api/v1/health` → ok) and the full suite is green: 46 API (incl. the new guard), 21 web, 31 shared tests, lint, typecheck, build, format:check.

### Phase 2 compliance audit (against the brief)

| Brief section                                           | Verdict                        | Evidence / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Database models                                      | **Implemented**                | `schema.prisma` Service/ServiceTemplate/Address/Task/TaskStatusHistory/Attachment/ProhibitedItem; ref via `task_ref_seq` from 1001; history append-only via DB trigger; prohibited list marked "example, pending legal review"                                                                                                                                                                                                                                                                   |
| 1. One LIVE template per service (partial unique index) | **Implemented**                | migration `20261022000000_phase2_catalog` line ~199 `service_templates_one_live_per_service` (documented in data-model.md)                                                                                                                                                                                                                                                                                                                                                                       |
| 2. Definition format + `buildZodSchema`                 | **Implemented**                | `packages/shared/src/templates.ts`: all 12 field types, `showIf`, `mapsTo`, deadline-in-future, money min/max in santim, hidden fields ignored, unknown keys rejected (`.strict()`); 13 shared tests                                                                                                                                                                                                                                                                                             |
| 3. Three live v1 templates                              | **Implemented**                | `seed-templates.ts`: budget min 50/max 50,000 mapsTo budgetCap; authorizationLetter file shown+required only when `authorizationNeeded = YES` (showIf); feesBudget; pickup/drop-off with both contacts and both addresses mapped; youProvide/youReceive in description JSON. Addition beyond the brief: optional `referencePhoto` file field on Buy                                                                                                                                              |
| 4. State machine                                        | **Implemented**                | `packages/shared/src/state-machine.ts` table matches the brief exactly (ASSIGNED→APPROVED incl. decline/expiry; ACCEPTED→APPROVED [staff]); API `TaskStateMachine.transition()` with `FOR UPDATE` row lock, history row, staff audit, optional tx client; shared tests iterate **every** allowed transition via `listTransitions()`; Phase 2 exposes only customer submit/cancel                                                                                                                 |
| 5. API endpoints                                        | **Implemented (2 small gaps)** | services, live template, addresses CRUD (max 20, default unsets previous, soft delete), tasks draft/autosave/submit/cancel/list/detail, uploads sign+read URL (type/size checks, owner-or-`tasks.view`, 404 otherwise), staff read-only list+detail, full catalog CRUD + publish with validation and archive-in-transaction, audited catalog writes. Gaps: list search covers ref + service key, not arbitrary payload text; storage is SeaweedFS, not MinIO (approved, ADR 0005)                |
| 6. Web customer portal                                  | **Implemented**                | dashboard tiles/filters/search/row actions ("Continue draft"/"Open"); stepper; service cards from data + "more services" placeholder + prohibited banner; form renderer with every field type, repeater add/remove, "Add new address" modal, presigned file upload, autosave indicator; review page with per-section edit links and confirm checkbox; task detail with timeline, cancel modal, "We are reviewing" message; addresses page with Make default                                      |
| 7. Web staff console                                    | **Implemented (1 deviation)**  | catalog table + add-service modal + note card; template editor with add field, move up/down, select options, showIf, mapsTo, live preview toggle using the customer renderer, publish confirmation, "written to the audit log" note, publish errors next to fields; queue with temporary banner + read-only detail drawer. Deviation: the field editor edits **English labels only** (documented in phase-2.md, deferred to Phase 7)                                                             |
| 8. Seed                                                 | **Implemented**                | 3 services + templates, prohibited example list, 2 addresses (Home/Bole, Office/Kirkos), 4 sample tasks with history rows. Note: statuses are written directly with `canTransition` checks instead of through the service layer (seed cannot import Nest services)                                                                                                                                                                                                                               |
| 9. Tests                                                | **Implemented**                | shared 31 (every transition, buildZodSchema cases), web 21 (renderer types, showIf, autosave indicator, review edit links), API 46 (cross-customer 404s, field-level submit errors, autosave partial, version pinning, publish rejects dropped budget, refuse editing live, uploads type/size/owner, staff permissions, append-only history, status-writes source guard). Not covered by an explicit test: the one-LIVE-per-service index (enforced by the DB and exercised by the publish flow) |
| 10. Docs                                                | **Implemented**                | architecture, data-model (Phase 2 tables incl. the partial index), state-machine.md (table + mermaid), templates.md, phase-2.md checklist, prohibited list flagged                                                                                                                                                                                                                                                                                                                               |

**Verdict: Phase 2 is complete against the brief**, with three consciously accepted deviations (English-only field labels → Phase 7; SeaweedFS instead of MinIO → ADR 0005; seed writes statuses directly with `canTransition` checks) and two minor gaps worth deciding on later (task-list search not full-text; no dedicated one-LIVE-template test).
