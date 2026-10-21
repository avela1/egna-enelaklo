# ADR 0003 - Money is always integer santim

- Status: accepted
- Date: 2026-10-20

## Context

The final charge of a task is the service fee plus the receipt total, capped at the amount the
customer authorised. Taskers pay with their own money and are reimbursed later, and the
ledger has to reconcile to the santim. Floating point money (0.1 + 0.2 !== 0.3) and rounding
at the wrong moment are the classic source of lost birr.

## Decision

- One birr is 100 santim. Every amount in the database, in the API payloads and in the
  application code is an **integer number of santim**.
- The only place a decimal appears is the human readable string produced by `formatETB`.
- The helpers live in `packages/shared/src/money.ts` and are unit tested: `toSantim`,
  `fromSantim`, `formatETB`, `addSantim`, `subtractSantim`, `isSantim`.
- The database column is an integer, never `Float` and never `Decimal`.

## Consequences

- Rounding happens once, deliberately, when a receipt total is converted, and it is visible in
  the code.
- The browser and the API format amounts identically because they share the helper.
- Field names carry the unit when it is not obvious (`feeSantim`, `budgetCapSantim`).
