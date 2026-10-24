# egna-enelaklo (እኛ እንላከሎ)

- [ ]

A task marketplace for Addis Ababa. Customers delegate real-world errands to company-managed
taskers. Web first: there is no marketing landing page, the root URL goes straight to sign in.

Customer portal: `/app`

Tasker portal: `/tasker`

Staff console: `/staff`

Public auth pages: `/sign-in`, `/register`, `/forgot-password`

Component reference: `/ui-kit`

---

## Requirements

| Tool       | Version                     |
| ---------- | --------------------------- |
| Node       | 22 LTS (see `.nvmrc`)       |
| npm        | 10+                         |
| Docker     | Docker Desktop / Compose v2 |
| PostgreSQL | 16 (runs in Docker)         |

## Setup in under 10 minutes

```bash
# 1. install everything (npm workspaces)
npm install

# 2. create the environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. start the local services (postgres, mailpit)
npm run infra:up

# 4. run the first database migration and create the development accounts
npm run db:migrate
npm run db:seed

# 5. start the web app (5173) and the API (3000)
npm run dev
```

Then open:

| URL                                 | What it is                        |
| ----------------------------------- | --------------------------------- |
| http://localhost:5173               | Web app (redirects to `/sign-in`) |
| http://localhost:5173/ui-kit        | Every UI component in every state |
| http://localhost:3000/api/v1/health | API health + database check       |
| http://localhost:3000/api/docs      | Swagger UI                        |
| http://localhost:9001               | MinIO console (private bucket)    |
| http://localhost:8025               | Mailpit (captured emails)         |

## Signing in

The seed creates one account per role. They all use the value of `SEED_PASSWORD` in
`apps/api/.env`.

| Account              | Role       | Lands on  |
| -------------------- | ---------- | --------- |
| `admin@egna.test`    | ADMIN      | `/staff`  |
| `ops@egna.test`      | OPERATIONS | `/staff`  |
| `finance@egna.test`  | FINANCE    | `/staff`  |
| `tasker@egna.test`   | TASKER     | `/tasker` |
| `customer@egna.test` | CUSTOMER   | `/app`    |

Customers can also register themselves at `/register`; the verification email arrives in
Mailpit.

> **If the machine already runs PostgreSQL on 5432** (common on a developer laptop), set
> `POSTGRES_HOST_PORT=5433` in the root `.env` and use port 5433 in `DATABASE_URL` in
> `apps/api/.env` as well. `npm run infra:up` reads the root `.env`, so the container follows
> that port and the two stay in sync. Without this, Prisma connects to the _native_ server and
> fails with `P1000: Authentication failed`.
>
> MinIO runs behind the `storage` profile, so a registry that cannot reach `minio/minio` never
> blocks the rest of the stack. Start it with `npm run infra:storage` when you need object
> storage (first needed in Phase 4).

## Root scripts

| Command                 | What it does                                       |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Turborepo: starts the web app and the API together |
| `npm run build`         | Builds every package and app                       |
| `npm run lint`          | ESLint (flat config) in every workspace            |
| `npm run typecheck`     | `tsc --noEmit` in every workspace                  |
| `npm run test`          | Vitest (web, shared) and Jest + Supertest (api)    |
| `npm run format`        | Prettier over the whole repo                       |
| `npm run format:check`  | Prettier check (used in CI)                        |
| `npm run tokens:build`  | Regenerates CSS variables + the Tailwind preset    |
| `npm run infra:up`      | Starts postgres + mailpit in Docker                |
| `npm run infra:down`    | Stops the local services                           |
| `npm run infra:ps`      | Shows the local services and their ports           |
| `npm run infra:logs`    | Follows the service logs                           |
| `npm run infra:storage` | Also starts MinIO (the `storage` profile)          |
| `npm run db:migrate`    | `prisma migrate dev`                               |
| `npm run db:deploy`     | `prisma migrate deploy` (CI / production)          |
| `npm run db:seed`       | `prisma db seed` (empty in Phase 0)                |
| `npm run db:studio`     | Prisma Studio                                      |

Workspace scripts (run with `-w <workspace>`):

```bash
npm run dev       -w @egna-enelaklo/web    # vite, port 5173
npm run dev       -w @egna-enelaklo/api    # nest start --watch, port 3000
npm run test      -w @egna-enelaklo/api    # jest + supertest
npm run prisma:migrate -w @egna-enelaklo/api

npm run infra:up && npm run dev
npm run infra:up && npm run db:migrate && npm run db:seed && npm run dev
```

## Repository layout

```
egna-enelaklo/
  apps/
    web/                 React 18 + Vite + Tailwind: customer, tasker and staff portals
    api/                 NestJS 10 + Prisma 5: REST API under /api/v1
  packages/
    shared/              Enums, Zod schemas and money helpers used by web and api
    design-tokens/       tokens.json -> CSS variables + Tailwind preset
    config/              Shared tsconfig, ESLint and Prettier configuration
  design/                brand/ (logo, wordmark, favicon) and the page designs
  docs/                  architecture, api conventions, phases, decisions
  infra/                 docker-compose.yml for the local services
```

## The three services

| Code                  | Name                | What it means                                                         |
| --------------------- | ------------------- | --------------------------------------------------------------------- |
| `BUY_AND_DELIVER`     | Buy and deliver     | A tasker buys the listed items within the budget and delivers them    |
| `QUEUE_AND_PAPERWORK` | Queue and paperwork | Queueing or submitting documents at kebele, licensing or bank offices |
| `PICKUP_AND_DROPOFF`  | Pickup and drop-off | Collecting a parcel, document or key and delivering it elsewhere      |

The catalogue is data driven: services live in the database, not in code.

## Languages and money

- English first, with Amharic (አማ) and Afaan Oromoo (OM). The language switch lives in every
  layout header and the choice is stored in `localStorage` (the only thing stored there).
- Currency is ETB. Money is always an **integer number of santim** (1 ETB = 100 santim).
  Use `toSantim`, `fromSantim` and `formatETB` from `@egna-enelaklo/shared`; never use floats.

## Quality gates

Every phase ends with all of these green:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The pre-commit hook (Husky + lint-staged) runs Prettier and ESLint on the staged files, so a
deliberate lint error blocks the commit. GitHub Actions runs the same four commands on every
push and pull request.

## Design

- `design/brand/` - `logo.svg`, `wordmark.svg`, `favicon.svg` (the app uses the favicon).
- `design/` - the page designs for every portal, used as the visual reference while building.
- `packages/design-tokens/tokens.json` - the single source of truth for colour, type and
  control sizes. `npm run tokens:build` regenerates the CSS variables and the Tailwind preset.
- `/ui-kit` - the live component sheet.

## Documentation

- [CLAUDE.md](CLAUDE.md) - the permanent rules every future session must follow
- [docs/architecture.md](docs/architecture.md) - folder map, route map, the auth flow, the
  permission model
- [docs/api-conventions.md](docs/api-conventions.md) - error format, naming, versioning, pagination
- [docs/security.md](docs/security.md) - sessions, CSRF, rate limits, passwords, the audit log
- [docs/data-model.md](docs/data-model.md) - every table
- [docs/state-machine.md](docs/state-machine.md) - the task lifecycle and its diagram
- [docs/templates.md](docs/templates.md) - the format of a request template
- [docs/phases/phase-0.md](docs/phases/phase-0.md) - Phase 0 acceptance checklist
- [docs/phases/phase-1.md](docs/phases/phase-1.md) - Phase 1 acceptance checklist
- [docs/phases/phase-2.md](docs/phases/phase-2.md) - Phase 2 acceptance checklist
- [docs/decisions](docs/decisions) - architecture decision records
