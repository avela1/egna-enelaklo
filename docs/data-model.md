# Data model

The PostgreSQL schema, managed with Prisma 5
(`apps/api/prisma/schema.prisma`). Phase 1 adds the accounts, the roles, the permissions,
the sessions, the email tokens and the append-only audit log. The task, quote, evidence and
money tables arrive in the later phases.

## The tables

### `users`

| Column               | Type                | Notes                               |
| -------------------- | ------------------- | ----------------------------------- |
| `id`                 | uuid                | Primary key                         |
| `email`              | text                | Unique, always stored in lower case |
| `phone`              | text, nullable      | E.164 form, `+2519XXXXXXXX`         |
| `name`               | text                | 2 to 80 characters                  |
| `password_hash`      | text                | argon2id, never returned or logged  |
| `locale`             | text                | `en`, `am` or `om`, default `en`    |
| `status`             | enum                | `ACTIVE`, `DISABLED`, `INVITED`     |
| `email_verified_at`  | timestamp, nullable | Set when the address is confirmed   |
| `failed_login_count` | integer             | Reset after a successful sign in    |
| `locked_until`       | timestamp, nullable | Set after five failed attempts      |
| `last_login_at`      | timestamp, nullable |                                     |
| `created_at`         | timestamp           |                                     |
| `updated_at`         | timestamp           |                                     |

Indexes: unique on `email`, plus `status`.

### `roles`, `permissions`, `role_permissions`, `user_roles`

- `roles.name` is the enum `CUSTOMER | TASKER | OPERATIONS | FINANCE | ADMIN`.
- `permissions.key` is the permission key, for example `tasks.view`.
- `role_permissions` links a role to a permission (many to many).
- `user_roles` links a person to a role, with `is_primary`. A person has exactly one
  primary role in Phase 1, but the join table allows more later.

### `sessions`

| Column         | Type                | Notes                                  |
| -------------- | ------------------- | -------------------------------------- |
| `id`           | uuid                | Primary key                            |
| `user_id`      | uuid                | Foreign key to `users`, cascade delete |
| `token_hash`   | text                | Unique, SHA-256 of the session token   |
| `created_at`   | timestamp           | The absolute lifetime starts here      |
| `last_seen_at` | timestamp           | When the session was last used         |
| `expires_at`   | timestamp           | The sliding expiry                     |
| `ip`           | text, nullable      |                                        |
| `user_agent`   | text, nullable      |                                        |
| `revoked_at`   | timestamp, nullable | Set when the session is signed out     |

Indexes: unique on `token_hash`, plus `user_id` and `expires_at`.

### `email_tokens`

| Column       | Type                | Notes                                      |
| ------------ | ------------------- | ------------------------------------------ |
| `id`         | uuid                | Primary key                                |
| `user_id`    | uuid                | Foreign key to `users`, cascade delete     |
| `type`       | enum                | `VERIFY_EMAIL`, `RESET_PASSWORD`, `INVITE` |
| `token_hash` | text                | Unique, SHA-256 of the token               |
| `expires_at` | timestamp           |                                            |
| `used_at`    | timestamp, nullable | A token can only be used once              |
| `created_at` | timestamp           |                                            |

Indexes: unique on `token_hash`, plus `user_id` and `type`.

### `audit_log`

| Column        | Type            | Notes                                   |
| ------------- | --------------- | --------------------------------------- |
| `id`          | text            | Primary key                             |
| `actor_id`    | text, nullable  | The person, or null for a system action |
| `actor_role`  | text            | The role of the person at that moment   |
| `action`      | text            | For example `user.role_changed`         |
| `target_type` | text            | For example `user`                      |
| `target_id`   | text            | The id of the changed thing             |
| `before`      | jsonb, nullable | The state before the change             |
| `after`       | jsonb, nullable | The state after the change              |
| `ip`          | text, nullable  |                                         |
| `user_agent`  | text, nullable  |                                         |
| `request_id`  | text, nullable  | The id of the request that caused it    |
| `created_at`  | timestamp       |                                         |

Indexes: `target_type` + `target_id`, `actor_id`, `action`, `created_at`.

**Append-only.** A trigger raises an exception on every `UPDATE` and `DELETE`:

```sql
CREATE TRIGGER audit_log_block_update
    BEFORE UPDATE ON "audit_log"
    FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();
```

The actor is stored as a plain text id and not as a foreign key: the audit log has to
survive the deletion of a person.

## The permissions

| Key                  | What it opens                            |
| -------------------- | ---------------------------------------- |
| `tasks.view`         | The task list and the task details       |
| `quotes.edit`        | Review tasks and send quotes             |
| `taskers.assign`     | Assign a tasker to a task                |
| `taskers.verify`     | Verify a tasker and their documents      |
| `exceptions.resolve` | Resolve exceptions, refunds and disputes |
| `refunds.approve`    | Approve refunds and budget releases      |
| `payments.view`      | Payments and reconciliation              |
| `reports.view`       | The operational reports                  |
| `catalog.edit`       | The service catalogue and its templates  |
| `users.manage`       | Invite, disable and re-role staff users  |
| `roles.manage`       | Change which permissions a role has      |
| `audit.view`         | Read and export the audit log            |
| `settings.manage`    | Change the platform settings             |

The default mapping:

| Role         | Permissions                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `CUSTOMER`   | none (they only reach their own data)                                                                 |
| `TASKER`     | none (they only reach their own assignments)                                                          |
| `OPERATIONS` | `tasks.view`, `quotes.edit`, `taskers.assign`, `taskers.verify`, `exceptions.resolve`, `reports.view` |
| `FINANCE`    | `tasks.view`, `refunds.approve`, `payments.view`, `reports.view`, `audit.view`                        |
| `ADMIN`      | all of them, and the role can never be edited                                                         |

The mapping lives in the database and can be changed by an administrator
(`PUT /api/v1/staff/roles/{role}/permissions`). The defaults are in
`packages/shared/src/permissions.ts` and are used by the seed.

## The Phase 2 tables

### `services`

| Column        | Type    | Notes                                                             |
| ------------- | ------- | ----------------------------------------------------------------- |
| `id`          | uuid    | Primary key                                                       |
| `key`         | text    | Unique, for example `buy_and_deliver`                             |
| `name`        | jsonb   | `{ en, am?, om? }`                                                |
| `description` | jsonb   | The summary, the "you provide" bullets and the "you receive" line |
| `icon`        | text    | The icon key of the chooser card                                  |
| `status`      | enum    | `LIVE`, `DRAFT` or `DISABLED`                                     |
| `sort_order`  | integer | The order in the chooser                                          |

### `service_templates`

| Column         | Type                | Notes                                                 |
| -------------- | ------------------- | ----------------------------------------------------- |
| `id`           | uuid                | Primary key                                           |
| `service_id`   | uuid                | Foreign key to `services`                             |
| `version`      | integer             | Unique with the service                               |
| `status`       | enum                | `DRAFT`, `LIVE` or `ARCHIVED`                         |
| `definition`   | jsonb               | The form definition, see [templates.md](templates.md) |
| `published_at` | timestamp, nullable |                                                       |
| `published_by` | uuid, nullable      |                                                       |
| `created_by`   | uuid, nullable      |                                                       |

A partial unique index (`service_templates_one_live_per_service`) makes sure a service has
at most one live version.

### `addresses`

| Column          | Type                | Notes                                |
| --------------- | ------------------- | ------------------------------------ |
| `id`            | uuid                | Primary key                          |
| `user_id`       | uuid                | Foreign key to `users`               |
| `label`         | text                | For example `Home`                   |
| `sub_city`      | enum                | The eleven sub-cities of Addis Ababa |
| `woreda`        | text, nullable      |                                      |
| `landmark`      | text                |                                      |
| `directions`    | text                |                                      |
| `contact_name`  | text                |                                      |
| `contact_phone` | text                | `+2519XXXXXXXX`                      |
| `is_default`    | boolean             |                                      |
| `latitude`      | float, nullable     | Not used yet                         |
| `longitude`     | float, nullable     | Not used yet                         |
| `deleted_at`    | timestamp, nullable | The soft delete                      |

A customer may save at most 20 addresses. Setting one as the default unsets the previous
one.

### `tasks`

| Column                | Type                | Notes                                                       |
| --------------------- | ------------------- | ----------------------------------------------------------- |
| `id`                  | uuid                | Primary key                                                 |
| `ref`                 | text                | `T-1001`, from the sequence `task_ref_seq` (starts at 1001) |
| `customer_id`         | uuid                | Foreign key to `users`                                      |
| `service_id`          | uuid                | The service                                                 |
| `template_id`         | uuid                | The exact template version                                  |
| `status`              | enum                | The task status, see [state-machine.md](state-machine.md)   |
| `payload`             | jsonb               | The answers, with `__meta.prohibitedMatches`                |
| `budget_cap_santim`   | integer, nullable   | The maximum the customer authorised                         |
| `deadline_at`         | timestamp, nullable |                                                             |
| `pickup_address_id`   | uuid, nullable      |                                                             |
| `delivery_address_id` | uuid, nullable      |                                                             |
| `sub_city`            | enum, nullable      | Derived from the delivery address                           |
| `submitted_at`        | timestamp, nullable |                                                             |
| `cancelled_at`        | timestamp, nullable |                                                             |

### `task_status_history`

| Column        | Type           | Notes                                                |
| ------------- | -------------- | ---------------------------------------------------- |
| `id`          | uuid           | Primary key                                          |
| `task_id`     | uuid           | Foreign key to `tasks`                               |
| `from_status` | enum           |                                                      |
| `to_status`   | enum           |                                                      |
| `actor_id`    | uuid, nullable | Null for a system action                             |
| `actor_role`  | text           | `customer`, `staff`, `tasker`, `finance` or `system` |
| `note`        | text, nullable |                                                      |
| `created_at`  | timestamp      |                                                      |

### `attachments`

| Column         | Type           | Notes                                              |
| -------------- | -------------- | -------------------------------------------------- |
| `id`           | uuid           | Primary key                                        |
| `owner_id`     | uuid           | The person who uploaded it                         |
| `task_id`      | uuid, nullable | Until the file is linked to a task                 |
| `kind`         | enum           | `AUTHORIZATION_LETTER`, `REFERENCE_PHOTO`, `OTHER` |
| `storage_key`  | text           | The key in the private bucket                      |
| `file_name`    | text           | Sanitised                                          |
| `content_type` | text           |                                                    |
| `size_bytes`   | integer        |                                                    |
| `created_at`   | timestamp      |                                                    |

### `prohibited_items`

| Column       | Type           | Notes                               |
| ------------ | -------------- | ----------------------------------- |
| `id`         | uuid           | Primary key                         |
| `term`       | text           | Unique, matched against the answers |
| `note`       | text, nullable |                                     |
| `active`     | boolean        |                                     |
| `created_at` | timestamp      |                                     |

**PENDING LEGAL REVIEW**: the seeded list is an EXAMPLE only. It shows a warning to the
customer and a flag to the staff; it never blocks a request on its own. It has to be reviewed
by a lawyer before the product goes live.

## The migrations

| Migration                       | What it does                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261020200052_`               | The baseline: the `audit_log` table                                                                                                                                              |
| `20261021000000_phase1_auth`    | Accounts, roles, permissions, sessions, email tokens and the append-only trigger                                                                                                 |
| `20261022000000_phase2_catalog` | The catalogue, the templates, the addresses, the tasks, the attachments, the prohibited list, the task reference sequence and the index that keeps one live template per service |

Run them with `npm run db:migrate` (development) or `npm run db:deploy` (CI and
production).
