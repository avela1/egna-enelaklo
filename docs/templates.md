# Service templates

A template is the versioned definition of a request form. The catalogue is **data**: a new
service is a row in `services` plus a template, never a code change.

- The types and the Zod builder live in `packages/shared/src/templates.ts`.
- The definition is stored as JSON in `service_templates.definition`.
- A task keeps the exact version it was created with (`tasks.template_id`), so publishing a
  new version never changes a task that is already submitted.

## The definition

```jsonc
{
  "requiredEvidence": ["RECEIPT_PHOTO", "DELIVERY_PHOTO"],
  "sections": [
    {
      "key": "items",
      "title": { "en": "Items to buy", "am": "..." },
      "description": { "en": "..." },
      "fields": [
        {
          "key": "items",
          "type": "repeater",
          "label": { "en": "Items to buy" },
          "help": { "en": "Add every item with the quantity you need." },
          "required": true,
          "rowLabel": { "en": "Item" },
          "fields": [
            { "key": "name", "type": "text", "label": { "en": "Item" }, "required": true },
            {
              "key": "quantity",
              "type": "number",
              "label": { "en": "Quantity" },
              "required": true,
              "min": 1,
            },
            {
              "key": "notes",
              "type": "text",
              "label": { "en": "Notes for the tasker" },
              "required": false,
            },
          ],
        },
      ],
    },
  ],
}
```

## The field types

| Type       | What it is                                   | Stored as           |
| ---------- | -------------------------------------------- | ------------------- |
| `text`     | One line of text                             | string              |
| `textarea` | A longer text                                | string              |
| `number`   | A number                                     | number              |
| `money`    | An amount in birr, entered as a number       | **integer santim**  |
| `select`   | One of the options                           | the option value    |
| `checkbox` | A yes or no                                  | boolean             |
| `date`     | A day                                        | `YYYY-MM-DD`        |
| `datetime` | A day and a time                             | ISO string          |
| `phone`    | An Ethiopian phone number                    | `+2519XXXXXXXX`     |
| `address`  | One of the saved addresses of the customer   | the address id      |
| `file`     | A document the customer uploads              | the attachment id   |
| `repeater` | A list of rows, for example the items to buy | an array of objects |

Extra properties:

| Property       | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| `help`         | The text under the field                                              |
| `placeholder`  | A hint inside the field                                               |
| `min` / `max`  | The length of a text, the value of a number, the birr amount of money |
| `options`      | The options of a select                                               |
| `defaultValue` | The value a new row of a repeater starts with                         |
| `showIf`       | The field only shows when another field has a certain value           |
| `mapsTo`       | The task attribute the field fills in                                 |
| `allowedTypes` | The content types a file may have                                     |
| `maxMb`        | The maximum size of a file                                            |

## `mapsTo`

| Value             | What it fills in                                     |
| ----------------- | ---------------------------------------------------- |
| `budgetCap`       | `tasks.budget_cap_santim`                            |
| `deadline`        | `tasks.deadline_at`                                  |
| `pickupAddress`   | `tasks.pickup_address_id`                            |
| `deliveryAddress` | `tasks.delivery_address_id`                          |
| `contactPhone`    | The phone number of the person who receives the work |

The API reads these when the customer submits, so the staff can filter a task by the
sub-city or the deadline without reading the whole payload.

## `showIf`

```jsonc
{
  "key": "authorizationLetter",
  "type": "file",
  "label": { "en": "Authorization letter" },
  "required": true,
  "showIf": { "field": "authorizationNeeded", "equals": "YES" },
}
```

A hidden field is ignored: it is not validated and it never blocks a request. A field that
becomes visible has to be filled in.

## The validator

`buildZodSchema(definition)` in `packages/shared` turns a definition into a Zod validator.
The **API** uses it to validate a submission (it is the authority) and the **web app** uses
the same schema for the inline errors, so the two can never disagree.

The validator:

- requires the fields that are marked as required,
- respects the minimum and the maximum of a number, a money field and a text,
- converts the money limits from birr to santim (`min: 50` means 5000 santim),
- needs at least one row in a repeater that is required,
- checks the format of a date, a phone number, an address id and a select value,
- ignores a hidden field and validates a visible one,
- rejects an unknown key,
- refuses a deadline that is in the past.

The messages are i18n keys (`validation.required`, `validation.tooSmall`, ...), so the API
answers with the key and the web app translates it.

## The money

The form holds the amount in **birr** (what a person types), the payload and the database
hold **integer santim**. `toWirePayload` and `fromWirePayload` convert between the two, and
both are in `packages/shared` so the two apps agree.

## Publishing

The staff editor works on a **draft** version. Publishing it:

1. checks that the field keys are unique,
2. checks that the types are known, that a select has options and that a repeater has
   sub fields,
3. checks that every `showIf` refers to a field that exists,
4. checks that the attributes the live version fills in are still filled in (a live version
   with a budget field can never lose it),
5. archives the previous live version and makes the draft the live one, in one transaction.

A partial unique index on `service_templates` makes sure a service has at most one live
version, even if two people publish at the same time.

## The three launch templates

| Service               | Sections                                | Evidence                      |
| --------------------- | --------------------------------------- | ----------------------------- |
| `buy_and_deliver`     | Items to buy, Budget and shop, Delivery | RECEIPT_PHOTO, DELIVERY_PHOTO |
| `queue_and_paperwork` | Office and paperwork                    | COMPLETION_PHOTO              |
| `pickup_and_dropoff`  | Pickup, Drop-off, The item              | PICKUP_PHOTO, DELIVERY_PHOTO  |

The field labels are English for now: the Amharic and Oromo fall back to English until the
copy is reviewed (Phase 7).
