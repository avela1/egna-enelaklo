# ADR 0004 - One web app serves the four portals

- Status: accepted
- Date: 2026-10-20

## Context

Customers, taskers and staff work in the same product but in very different interfaces: the
customer portal is a light sidebar app, the tasker portal is a top navigation app, the staff
console is a dark, dense back office. They also need the public sign in pages, and there is no
marketing landing page: the root URL goes to sign in.

## Decision

One React application serves all four surfaces, split by route prefix and layout:

| Prefix    | Layout           | Users                              |
| --------- | ---------------- | ---------------------------------- |
| `/`       | `AuthLayout`     | public (sign in, register)         |
| `/app`    | `CustomerLayout` | customers                          |
| `/tasker` | `TaskerLayout`   | taskers                            |
| `/staff`  | `StaffLayout`    | staff (operations, finance, admin) |

- The layouts live in `apps/web/src/app/layouts` and the pages in `apps/web/src/features`.
- The shared components live in `apps/web/src/components/ui` and are the only building blocks
  a page may use.
- The three portals have their own visual language (light sidebar, top bar, dark sidebar)
  while sharing the same tokens, the same components and the same i18n files.
- Authorisation is enforced on the server. The portals only decide what to show.

## Consequences

- One bundle, one i18n set, one design system, one release train.
- A mobile app can be added later by reusing the API and the tokens, not the layouts.
- The role check happens in the server, so a hidden menu item is a usability choice, never a
  security control.
