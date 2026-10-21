# ADR 0002 - Design tokens are generated from one tokens.json

- Status: accepted
- Date: 2026-10-20

## Context

The brand has a fixed palette, two typefaces and a set of control sizes. If those values were
copied into components, the product would slowly drift and the staff console, the customer
portal and the tasker portal would stop looking like the same product.

## Decision

`packages/design-tokens/tokens.json` is the only place a colour, a font or a control height
may be written down. `npm run tokens:build` turns it into:

- `dist/tokens.css`: CSS custom properties on `:root`
- `dist/tailwind-preset.js`: the Tailwind preset used by `apps/web`

Components use the Tailwind names (`bg-brand-500`, `text-ink-700`, `rounded-card`,
`h-primary`, `text-pageTitle`). Pages never write a raw hex colour or a one-off pixel value.

## Consequences

- Changing a colour is a one line change in `tokens.json` followed by a rebuild.
- The UI kit page (`/ui-kit`) renders every component in every state, which is how the design
  is reviewed without a screenshot round trip.
- The generated files live in `dist/` and are never committed.
