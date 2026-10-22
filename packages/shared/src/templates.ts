import { z } from 'zod';

/** A text in the three languages of the product. Missing languages fall back to English. */
export interface LocalizedText {
  am?: string;
  en: string;
  om?: string;
}

/** The field types a request form can hold. */
export const FIELD_TYPES = [
  'address',
  'checkbox',
  'date',
  'datetime',
  'file',
  'money',
  'number',
  'phone',
  'repeater',
  'select',
  'text',
  'textarea',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

/** A value of a field that another field can depend on. */
export type ShowIf = {
  equals?: boolean | string;
  field: string;
  in?: (boolean | string)[];
};

/** The task attribute a field fills in. */
export const MAPPED_FIELDS = [
  'budgetCap',
  'contactPhone',
  'deadline',
  'deliveryAddress',
  'pickupAddress',
] as const;

export type MappedField = (typeof MAPPED_FIELDS)[number];

export interface FieldOption {
  label: LocalizedText;
  value: string;
}

export interface Field {
  /** Only for the file type: the content types that may be uploaded. */
  allowedTypes?: string[];
  defaultValue?: unknown;
  help?: LocalizedText;
  /** Only for the repeater type: the fields of one row. */
  fields?: Field[];
  key: string;
  label: LocalizedText;
  mapsTo?: MappedField;
  max?: number;
  /** Only for the file type: the maximum size in megabytes. */
  maxMb?: number;
  min?: number;
  options?: FieldOption[];
  pattern?: string;
  placeholder?: LocalizedText;
  required: boolean;
  /** Only for the repeater type: the label of one row. */
  rowLabel?: LocalizedText;
  showIf?: ShowIf;
  type: FieldType;
}

export interface Section {
  description?: LocalizedText;
  fields: Field[];
  key: string;
  title: LocalizedText;
}

/** The evidence a tasker has to upload later. Used from Phase 4 onwards. */
export const EVIDENCE_TYPES = [
  'COMPLETION_PHOTO',
  'DELIVERY_PHOTO',
  'PICKUP_PHOTO',
  'RECEIPT_PHOTO',
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** The definition of a request form. It is stored as JSON in the database. */
export interface TemplateDefinition {
  requiredEvidence: string[];
  sections: Section[];
}

/** The description of a service, as it is shown on the chooser card. */
export interface ServiceDescription {
  summary: LocalizedText;
  youProvide: LocalizedText[];
  youReceive: LocalizedText;
}

/** The Zod schema of a localized text. */
export const LocalizedTextSchema = z.object({
  am: z.string().optional(),
  en: z.string().min(1),
  om: z.string().optional(),
});

/** The Zod schema of a service description. */
export const ServiceDescriptionSchema = z.object({
  summary: LocalizedTextSchema,
  youProvide: z.array(LocalizedTextSchema).default([]),
  youReceive: LocalizedTextSchema,
});

/** The Zod schema of one field of a definition. */
export const FieldSchema: z.ZodType<Field> = z.lazy(() =>
  z.object({
    allowedTypes: z.array(z.string()).optional(),
    defaultValue: z.unknown().optional(),
    fields: z.array(FieldSchema).optional(),
    help: LocalizedTextSchema.optional(),
    key: z.string().min(1),
    label: LocalizedTextSchema,
    mapsTo: z.enum(MAPPED_FIELDS).optional(),
    max: z.number().optional(),
    maxMb: z.number().optional(),
    min: z.number().optional(),
    options: z.array(z.object({ label: LocalizedTextSchema, value: z.string() })).optional(),
    pattern: z.string().optional(),
    placeholder: LocalizedTextSchema.optional(),
    required: z.boolean(),
    rowLabel: LocalizedTextSchema.optional(),
    showIf: z
      .object({
        equals: z.union([z.string(), z.boolean()]).optional(),
        field: z.string().min(1),
        in: z.array(z.union([z.string(), z.boolean()])).optional(),
      })
      .optional(),
    type: z.enum(FIELD_TYPES),
  }),
) as z.ZodType<Field>;

/** The Zod schema of a whole definition. */
export const TemplateDefinitionSchema: z.ZodType<TemplateDefinition> = z.lazy(() =>
  z.object({
    requiredEvidence: z.array(z.string()).default([]),
    sections: z
      .array(
        z.object({
          description: LocalizedTextSchema.optional(),
          fields: z.array(FieldSchema),
          key: z.string().min(1),
          title: LocalizedTextSchema,
        }),
      )
      .default([]),
  }),
) as z.ZodType<TemplateDefinition>;

/** The shape of the answers. The money fields hold integer santim. */
export type TaskPayload = Record<string, unknown>;

/** Reads a localized text in the given language, falling back to English. */
export function localize(text: LocalizedText | undefined, language: string): string {
  if (!text) return '';

  if (language === 'am' && text.am) return text.am;
  if (language === 'om' && text.om) return text.om;

  return text.en;
}

/** Every field of a definition. The fields of a repeater are rows, not top level fields. */
export function allFields(definition: TemplateDefinition): Field[] {
  const fields: Field[] = [];

  for (const section of definition.sections) {
    fields.push(...section.fields);
  }

  return fields;
}

/** The fields of one repeater row. */
export function rowFields(field: Field): Field[] {
  return field.type === 'repeater' ? (field.fields ?? []) : [];
}

/** The field with the given key, anywhere in the definition. */
export function findField(definition: TemplateDefinition, key: string): Field | undefined {
  return allFields(definition).find((field) => field.key === key);
}

/** True when the field is visible for the given answers. */
export function isFieldVisible(field: Field, payload: TaskPayload): boolean {
  if (!field.showIf) return true;

  const value = payload[field.showIf.field];

  if (field.showIf.equals !== undefined) {
    return value === field.showIf.equals || String(value) === String(field.showIf.equals);
  }

  if (field.showIf.in) {
    return field.showIf.in.some((option) => option === value || String(option) === String(value));
  }

  return true;
}

/** The fields of the definition that are visible for the given answers. */
export function visibleFields(definition: TemplateDefinition, payload: TaskPayload): Field[] {
  return allFields(definition).filter((field) => isFieldVisible(field, payload));
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^\+2519\d{8}$/;

const REQUIRED = 'validation.required';
const INVALID = 'validation.invalid';

const requiredText = () => z.string({ invalid_type_error: INVALID, required_error: REQUIRED });
const requiredNumber = () => z.number({ invalid_type_error: INVALID, required_error: REQUIRED });
const requiredBoolean = () => z.boolean({ invalid_type_error: INVALID, required_error: REQUIRED });

/** The validator of one field, in the wire format (money in santim). */
function fieldValidator(field: Field): z.ZodTypeAny {
  const required = field.required;

  switch (field.type) {
    case 'text':
    case 'textarea': {
      let schema = requiredText();

      if (typeof field.min === 'number') {
        schema = schema.min(field.min, 'validation.tooShort') as z.ZodString;
      }
      if (typeof field.max === 'number') {
        schema = schema.max(field.max, 'validation.tooLong') as z.ZodString;
      }
      if (field.pattern) {
        schema = schema.regex(new RegExp(field.pattern), INVALID) as z.ZodString;
      }

      return required ? schema.min(1, REQUIRED) : schema.optional();
    }

    case 'number': {
      let schema = requiredNumber();

      if (typeof field.min === 'number') schema = schema.min(field.min, 'validation.tooSmall');
      if (typeof field.max === 'number') schema = schema.max(field.max, 'validation.tooLarge');

      return required ? schema : schema.optional();
    }

    case 'money': {
      let schema = requiredNumber().int();

      // The definition states the limits in birr, the payload holds santim.
      if (typeof field.min === 'number')
        schema = schema.min(field.min * 100, 'validation.tooSmall');
      if (typeof field.max === 'number')
        schema = schema.max(field.max * 100, 'validation.tooLarge');

      return required ? schema : schema.optional();
    }

    case 'select': {
      const values = (field.options ?? []).map((option) => option.value);
      const schema = requiredText().refine((value) => values.includes(value), INVALID);

      return required ? schema : schema.optional();
    }

    case 'checkbox':
      return requiredBoolean().optional();

    case 'date': {
      const schema = requiredText()
        .regex(DATE_PATTERN, INVALID)
        .refine((value) => !Number.isNaN(Date.parse(value)), INVALID);

      return required ? schema : schema.optional();
    }

    case 'datetime': {
      const schema = requiredText().refine((value) => !Number.isNaN(Date.parse(value)), INVALID);

      return required ? schema : schema.optional();
    }

    case 'phone': {
      const schema = requiredText().regex(PHONE_PATTERN, INVALID);

      return required ? schema : schema.optional();
    }

    case 'address': {
      const schema = requiredText().uuid(INVALID);

      return required ? schema : schema.optional();
    }

    case 'file': {
      const schema = z.union([requiredText().uuid(INVALID), z.array(requiredText().uuid(INVALID))]);

      return required ? schema : schema.optional();
    }

    case 'repeater': {
      const rowShape: z.ZodRawShape = {};

      for (const subField of field.fields ?? []) {
        rowShape[subField.key] = fieldValidator(subField);
      }

      const rows = z.array(z.object(rowShape).strict());

      return required ? rows.min(1, 'validation.minRows') : rows.optional();
    }

    default:
      return z.unknown();
  }
}

/**
 * Builds the Zod validator of a template.
 *
 * The same validator is used by the API (authoritative) and by the web form
 * (inline errors), so both always agree. Unknown keys are rejected and a
 * hidden field (showIf) is ignored.
 */
export function buildZodSchema(definition: TemplateDefinition): z.ZodType<TaskPayload> {
  const shape: z.ZodRawShape = {};
  const conditional: Field[] = [];

  for (const field of allFields(definition)) {
    if (field.showIf) {
      // A conditional field is checked by hand, so a hidden field never fails.
      conditional.push(field);
      shape[field.key] = z.unknown();
      continue;
    }

    shape[field.key] = fieldValidator(field);
  }

  const base = z.object(shape).strict();

  return base.superRefine((payload, context) => {
    for (const field of conditional) {
      if (!isFieldVisible(field, payload)) continue;

      // The field is visible, so it has to be filled in the way it asks for.
      const result = fieldValidator(field).safeParse(payload[field.key]);

      if (!result.success) {
        for (const issue of result.error.issues) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.key],
            message: issue.message,
          });
        }
      }
    }

    // A deadline has to be in the future.
    for (const field of allFields(definition)) {
      if (field.mapsTo !== 'deadline') continue;

      const value = payload[field.key];
      if (typeof value !== 'string' || value === '') continue;

      const deadline = new Date(value);
      if (Number.isNaN(deadline.getTime())) continue;

      if (deadline.getTime() <= Date.now()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.key],
          message: 'validation.deadlineInFuture',
        });
      }
    }
  }) as z.ZodType<TaskPayload>;
}

/**
 * Converts the answers of the form into the wire format: the money fields
 * become integer santim.
 */
export function toWirePayload(
  definition: TemplateDefinition,
  values: Record<string, unknown>,
): TaskPayload {
  const payload: TaskPayload = {};

  for (const field of allFields(definition)) {
    const value = values[field.key];
    if (value === undefined) continue;

    if (field.type === 'money' && typeof value === 'number') {
      payload[field.key] = Math.round(value * 100);
      continue;
    }

    if (field.type === 'repeater' && Array.isArray(value)) {
      payload[field.key] = value.map((row) => {
        if (typeof row !== 'object' || row === null) return row;

        const converted: Record<string, unknown> = { ...(row as Record<string, unknown>) };

        for (const subField of field.fields ?? []) {
          const subValue = converted[subField.key];
          if (subField.type === 'money' && typeof subValue === 'number') {
            converted[subField.key] = Math.round(subValue * 100);
          }
        }

        return converted;
      });
      continue;
    }

    payload[field.key] = value;
  }

  return payload;
}

/** Converts a wire payload back into the shape the form holds (money in birr). */
export function fromWirePayload(
  definition: TemplateDefinition,
  payload: TaskPayload,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of allFields(definition)) {
    const value = payload[field.key];
    if (value === undefined) continue;

    if (field.type === 'money' && typeof value === 'number') {
      values[field.key] = value / 100;
      continue;
    }

    if (field.type === 'repeater' && Array.isArray(value)) {
      values[field.key] = value.map((row) => {
        if (typeof row !== 'object' || row === null) return row;

        const converted: Record<string, unknown> = { ...(row as Record<string, unknown>) };

        for (const subField of field.fields ?? []) {
          const subValue = converted[subField.key];
          if (subField.type === 'money' && typeof subValue === 'number') {
            converted[subField.key] = subValue / 100;
          }
        }

        return converted;
      });
      continue;
    }

    values[field.key] = value;
  }

  return values;
}

/** The task attributes the answers fill in. */
export interface MappedValues {
  budgetCapSantim?: number;
  contactPhone?: string;
  deadlineAt?: Date;
  deliveryAddressId?: string;
  pickupAddressId?: string;
}

/** Reads the mapped attributes out of a validated payload. */
export function extractMappedValues(
  definition: TemplateDefinition,
  payload: TaskPayload,
): MappedValues {
  const mapped: MappedValues = {};

  for (const field of allFields(definition)) {
    if (!field.mapsTo) continue;

    const value = payload[field.key];
    if (value === undefined || value === null || value === '') continue;

    switch (field.mapsTo) {
      case 'budgetCap':
        if (typeof value === 'number') mapped.budgetCapSantim = value;
        break;
      case 'contactPhone':
        if (typeof value === 'string') mapped.contactPhone = value;
        break;
      case 'deadline': {
        const date = new Date(String(value));
        if (!Number.isNaN(date.getTime())) mapped.deadlineAt = date;
        break;
      }
      case 'deliveryAddress':
        if (typeof value === 'string') mapped.deliveryAddressId = value;
        break;
      case 'pickupAddress':
        if (typeof value === 'string') mapped.pickupAddressId = value;
        break;
      default:
        break;
    }
  }

  return mapped;
}

/** A short, human readable title of a task, built from the payload. */
export function summarizePayload(definition: TemplateDefinition, payload: TaskPayload): string {
  const parts: string[] = [];

  for (const section of definition.sections) {
    for (const field of section.fields) {
      if (field.type === 'repeater') {
        const rows = payload[field.key];
        if (Array.isArray(rows) && rows.length > 0) {
          const first = rows[0] as Record<string, unknown> | undefined;
          const label = first ? Object.values(first)[0] : undefined;
          if (typeof label === 'string' && label !== '') {
            parts.push(
              `${field.label.en}: ${label}${rows.length > 1 ? ` +${rows.length - 1}` : ''}`,
            );
          }
        }
        continue;
      }

      const value = payload[field.key];
      if (typeof value === 'string' && value !== '') parts.push(value);
    }

    if (parts.length > 0) break;
  }

  return parts.slice(0, 2).join(' · ');
}
