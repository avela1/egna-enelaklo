# Architecture decision records

Short, dated notes about decisions that shape the codebase. One file per decision, numbered,
immutable once accepted: a later decision supersedes an earlier one, it never edits it.

Format:

```markdown
# ADR NNNN - Title

- Status: proposed | accepted | superseded by ADR NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```

| ADR                                                     | Title                                                     | Status   |
| ------------------------------------------------------- | --------------------------------------------------------- | -------- |
| [0001](0001-monorepo-and-tooling.md)                    | npm workspaces + Turborepo monorepo, Vite, NestJS, Prisma | accepted |
| [0002](0002-design-tokens-as-single-source-of-truth.md) | Design tokens are generated from one tokens.json          | accepted |
| [0003](0003-money-is-integer-santim.md)                 | Money is always integer santim                            | accepted |
| [0004](0004-one-web-app-four-portals.md)                | One web app serves the four portals                       | accepted |
| [0005](0005-seaweedfs-replaces-minio.md)                | SeaweedFS replaces MinIO for local file storage           | accepted |
