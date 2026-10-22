# Phase 2 - The catalogue, the templates and the tasks

Status: **complete**, waiting for approval.

Phase 2 turns the catalogue into data, builds the request forms out of versioned templates
and gives the customer a real dashboard. There are no quotes, no assignment and no payments
yet: those arrive in Phase 3 to Phase 5.

## What was built

### 1. The database

The migration `20261022000000_phase2_catalog` adds:

- `services` - key, name, description, icon, status, sort order.
- `service_templates` - the versioned form definition, with a partial unique index that
  keeps a service at one live version.
- `addresses` - the saved addresses of a customer, with a soft delete.
- `tasks` - with the human reference `T-1001` from a Postgres sequence that starts at 1001.
- `task_status_history` - one row per status change, protected by a trigger so it is append only.
- `attachments` - the metadata of the files in the private bucket.
- `prohibited_items` - the example list, marked as pending legal review.

### 2. The shared contracts

`packages/shared/src/templates.ts` holds the types of a definition, the Zod builder
`buildZodSchema`, the payload helpers (`toWirePayload`, `fromWirePayload`,
`extractMappedValues`) and the localisation helper.
`packages/shared/src/state-machine.ts` holds the transition table and `canTransition`.

### 3. The state machine

The table of the brief, exactly. `TaskStateMachine.transition()` locks the task, asks the
table, writes the change, the history row and, for staff, the audit row in one transaction.
No other code writes `Task.status`; a test reads the source and fails when it does.

### 4. The API

- `GET /services`, `GET /services/:key/template`
- `GET/POST /addresses`, `PATCH/DELETE /addresses/:id`
- `POST /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/submit`, `POST /tasks/:id/cancel`,
  `GET /tasks`, `GET /tasks/:id`
- `POST /uploads/sign`, `GET /attachments/:id/url`
- `GET /prohibited-items`
- `GET /staff/tasks` (temporary, `tasks.view`)
- `GET /staff/catalog`, `POST /staff/services`, `PATCH /staff/services/:id`,
  `GET /staff/services/:id/templates`, `POST /staff/services/:id/templates`,
  `PUT /staff/templates/:id`, `POST /staff/templates/:id/publish` (`catalog.edit`)

Every catalogue write is audited with a before and after summary.

### 5. The seed

The three services with their live first version, the example prohibited list, two addresses
for `customer@egna.test` and four sample tasks (DRAFT, SUBMITTED, SUBMITTED, CANCELLED)
with their history rows.

### 6. The web app

- `/app` - the tiles, the filter tabs, the search, the task list and the empty state.
- `/app/new` - the three service cards from the data, the "more services" placeholder and
  the prohibited items banner.
- `/app/tasks/:id/edit` - the form renderer, the autosave with its indicator, the sticky
  column with "What happens next" and the summary, and the prohibited items warning.
- `/app/tasks/:id/review` - the read only summary per section with an edit link, the
  attachments, the confirmation and the submit.
- `/app/tasks/:id` - the summary, the vertical timeline and the cancel action.
- `/app/addresses` - the address cards, the form modal and the default action.
- `/staff/catalog` - the service table and the "add service" modal.
- `/staff/templates/:serviceId` - the field editor, the version card, the live preview and
  the publish confirmation.
- `/staff/queue` - the temporary read only list.

## The gaps that were closed after the first pass

- The status history is protected by a database trigger, so it is append only like the audit
  log.
- The request form opens an **Add new address modal** instead of sending the customer away.
- The template editor has an **Add field** button, the field editor handles the **options of
  a select** and the **showIf condition**, and the errors of a failed publish appear **next to
  the offending field**.
- The task page shows the rows of a repeater as text instead of "object Object", and the
  upload control shows the name of the file, not the id of the attachment.
- The web tests cover the **autosave indicator** and the **edit links of the review page**.

## The acceptance checklist

- [x] **Migrations and seed run on a clean database.** `prisma migrate reset --force`
      applies the three migrations and the seed; the three services appear in the chooser
      with their descriptions from the data.
- [x] **A customer completes and submits each of the three request types.** The form is
      built from the template, the validation errors are per field, a draft autosaves and
      can be resumed from the dashboard. (Verified for Buy and deliver and Queue and
      paperwork in the tests; Pickup and drop-off uses the same renderer.)
- [x] **The authorization letter upload works and is only visible to the owner and
      permitted staff.** The file field only shows when `authorizationNeeded` is `YES`, the
      upload goes through a presigned URL, and another customer gets a 404 for the file.
- [x] **The customer can add, change, delete and default the addresses and use them in the
      forms.**
- [x] **A submitted task shows SUBMITTED, the timeline and can be cancelled; a draft can be
      cancelled.** The history rows are written for every change.
- [x] **Another customer's task or file returns 404.** The task, the address and the
      attachment of another customer are not found.
- [x] **The admin edits a template, adds a field and publishes v2; a new task shows the new
      field while an old task still opens with v1; the old live version becomes ARCHIVED.**
- [x] **Publishing blocks the removal of the required budget and delivery fields.** The
      publish answers `400 TEMPLATE_INVALID` with the offending field.
- [x] **The staff temporary list shows the submitted tasks to the people with
      `tasks.view` only.** A customer gets a 403.
- [x] **Every status change goes through the TaskStateMachine with history rows, and every
      catalogue write is in the audit log.**
- [x] **The UI matches the design system and works in EN, አማ and OM.** The keys are in
      all three locale files and a test keeps them in sync.
- [x] **Lint, typecheck, tests and build pass.** 31 shared, 21 web and 45 API tests.

## The seeded logins

The password of every seeded account is the value of `SEED_PASSWORD` in `apps/api/.env`.

| Account              | Role       | Lands on  |
| -------------------- | ---------- | --------- |
| `admin@egna.test`    | ADMIN      | `/staff`  |
| `ops@egna.test`      | OPERATIONS | `/staff`  |
| `finance@egna.test`  | FINANCE    | `/staff`  |
| `tasker@egna.test`   | TASKER     | `/tasker` |
| `customer@egna.test` | CUSTOMER   | `/app`    |

`customer@egna.test` has two addresses (Home in Bole, Office in Kirkos) and four sample
tasks.

## Deviations and open questions

1. **The field labels of the three templates are English only.** The service names, the
   descriptions and the section titles are translated; the labels fall back to English until
   the copy is reviewed (Phase 7).
2. **The prohibited items list is an example.** It is marked as pending legal review in the
   code, in the migration and in the documentation. It warns and flags, it never blocks.
3. **The money in the template limits is in birr, the payload is in santim.** The
   definition says `min: 50` (birr) and the schema checks `5000` (santim). The conversion
   happens in the shared helper, so both apps agree.
4. **The staff task list is temporary and read only**, as the brief asks. The real review
   queue arrives in Phase 3.
5. **The upload does not verify the size of the file that really arrives.** The server
   checks the declared type and size before it signs the URL; the bucket policy has to
   enforce the rest. This is noted for the hardening phase.
6. **The customer portal still has placeholders** for new task, payments and notifications.

## Not started (by design)

Phase 3: the review queue, the quotes and the customer approval.
