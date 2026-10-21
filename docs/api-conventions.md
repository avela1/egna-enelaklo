# API conventions

Everything in this document applies to every endpoint the API will ever expose. When in doubt,
follow this document rather than copying an existing endpoint.

## 1. Base URL and versioning

- Development base URL: `http://localhost:3000/api/v1`
- Every REST endpoint lives under the global prefix `api/v1`.
- Swagger UI is served at `/api/docs` (outside the versioned prefix on purpose).
- The version is in the path, not in a header. A breaking change means `/api/v2` is added
  alongside `/api/v1`; `/api/v1` is never changed in a breaking way.
- Breaking changes: removing or renaming a field, changing a field type, tightening validation,
  changing the meaning of a status code. Adding an optional field is not breaking.

## 2. Resource naming

- Plural, lowercase, kebab-case: `/staff/roles`, `/service-templates`.
- Nesting is allowed for a child that cannot exist alone: `/staff/tasks/{taskId}/quotes`.
- Keep the nesting shallow. If a resource needs a third level, it deserves its own top level
  endpoint.
- Action style endpoints (`POST /tasks/{id}/approve`) are allowed when the action is a state
  change that is not a CRUD update: they keep the permission check and the audit log in one
  place.
- Query parameters are camelCase: `?page=1&pageSize=20&status=SUBMITTED`.

## 3. Request format

- JSON body, `Content-Type: application/json`.
- Timestamps are ISO 8601 in UTC: `2026-03-04T09:15:00.000Z`.
- Money is an **integer number of santim** in the payload (`"fee": 45000` means ETB 450). Never
  a float, never a decimal string. The field name carries the unit when it is not obvious
  (`feeSantim`, `budgetCapSantim`).
- Identifiers are opaque strings. Task references are shown as `T-2041` but the API uses the
  primary key.
- Enum values are the SCREAMING_SNAKE_CASE strings from `packages/shared` (`SUBMITTED`,
  `BUY_AND_DELIVER`, `OPERATIONS`).

## 4. Response format

Success: the resource itself, or a list envelope.

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

Single resource example:

```json
{
  "id": "clx123",
  "reference": "T-2041",
  "serviceType": "BUY_AND_DELIVER",
  "status": "QUOTED",
  "feeSantim": 45000,
  "budgetCapSantim": 200000
}
```

- HTTP status codes: 200 read/update, 201 create, 204 delete with no body, 400 malformed
  request, 401 not signed in, 403 not allowed, 404 unknown resource, 409 conflict, 422 validation
  failed, 429 rate limited, 500 unexpected error.
- 202 is reserved for work that is queued (background jobs), never for "it will probably be
  fine".

## 5. Error format

Every error, without exception, has the same envelope:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "details": [{ "path": "budgetCap", "message": "Must be greater than 0" }],
  "requestId": "1d968356-bc98-4946-b9b8-a0d45f5157ad"
}
```

| Field       | Type          | Meaning                                                         |
| ----------- | ------------- | --------------------------------------------------------------- |
| `code`      | string        | Stable, machine readable, SCREAMING_SNAKE_CASE                  |
| `message`   | string        | Human readable, safe to show to a user                          |
| `details`   | array or null | Field level problems when there are any                         |
| `requestId` | string        | The id from the `x-request-id` header, quote it in a bug report |

Rules:

- `code` is the contract. Clients branch on `code`, never on `message`.
- `message` never contains stack traces, SQL, file paths or credentials.
- The exception filter (`apps/api/src/common/filters/all-exceptions.filter.ts`) produces this
  envelope for every thrown error, including `HttpException`, `ZodError` and unknown errors.
- Every response carries the `x-request-id` header; the body repeats it.

Common codes: `BAD_REQUEST`, `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`, `NOT_IMPLEMENTED`, `SERVICE_UNAVAILABLE`.

## 6. Pagination

- List endpoints are paginated with `?page=` (1 based) and `?pageSize=` (default 20, maximum
  100).
- The response uses the envelope in section 4.
- `total` is the total number of matching rows, not the number of returned rows.
- Endpoints that are naturally small and bounded (roles, service catalogue, templates) may
  return a plain array and say so in their Swagger description.

## 7. Authentication and authorisation

- Sessions are httpOnly cookies. There is no `Authorization` header and no token in
  `localStorage`.
- Mutating requests send a CSRF token header that matches the CSRF cookie.
- Authorisation is enforced on the server with permission keys, for example
  `tasks.review`, `tasks.assign`, `payments.reconcile`, `users.manage`, `audit.read`.
- Roles (customer, tasker, operations, finance, admin) map to permission sets. A role is never
  checked in a controller directly: check the permission key.
- Every staff or admin write writes an `audit_log` row **in the same database transaction** as
  the write itself.

## 8. Logging

- pino, one structured line per request, including `requestId`, `method`, `path`, `status` and
  `durationMs`.
- Never log passwords, session cookies, CSRF tokens, signed URLs or full card numbers.
- Business events (quote sent, tasker assigned, refund issued) are logged with a stable
  `action` string, the same string that goes into the audit log.

## 9. Swagger

- Every endpoint has a summary, a tag, and a documented response shape.
- DTOs are documented with `@ApiProperty` so the generated schema is the contract.
- The Swagger UI is at `/api/docs` and is available in every environment (it documents
  internals; it must never be the only place a rule is written down).

## 10. Checklist for a new endpoint

1. Route under `/api/v1`, plural kebab-case resource name.
2. Validate the body and query with the global `ValidationPipe` and a DTO.
3. Check the permission key on the server, never only in the UI.
4. Write the `audit_log` row in the same transaction for every staff/admin write.
5. Return the standard success shape and the standard error envelope.
6. Document it in Swagger and in `docs/api-conventions.md` when it introduces a new pattern.
7. Add or update the API test (`apps/api/test`).
