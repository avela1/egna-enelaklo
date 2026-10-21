# ADR 0001 - npm workspaces + Turborepo monorepo, Vite, NestJS, Prisma

- Status: accepted
- Date: 2026-10-20

## Context

The product has a web app, an API and shared contracts (enums, Zod schemas, money helpers),
plus a design token package that both sides must agree on. The team is small, the domain is
still changing, and money and status rules must not drift between the browser and the server.

## Decision

- One repository, npm workspaces, Turborepo for the task graph.
- `apps/web`: React 18 + Vite + Tailwind 3.4 + Radix + react-i18next + TanStack Query +
  React Hook Form + Zod.
- `apps/api`: NestJS 10 + Prisma 5 + PostgreSQL 16 + pino + Helmet + Swagger.
- `packages/shared`: the single implementation of the enums, the Zod schemas and the money
  helpers. The web app imports the TypeScript source (Vite alias + tsconfig paths), the API
  imports the compiled CommonJS output.
- ESLint 9 flat config, Prettier, Husky + lint-staged, GitHub Actions.

## Consequences

- The web app and the API literally cannot disagree about a status or an amount.
- One `npm install` sets up everything; `npm run dev` starts both servers.
- A monorepo needs discipline: the folder map and the permanent rules live in `CLAUDE.md` so
  every session keeps the same structure.
