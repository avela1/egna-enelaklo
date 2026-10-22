import { describe, expect, it } from 'vitest';
import {
  buildZodSchema,
  extractMappedValues,
  fromWirePayload,
  toWirePayload,
  type TemplateDefinition,
} from '../src/templates';

const definition: TemplateDefinition = {
  requiredEvidence: ['RECEIPT_PHOTO'],
  sections: [
    {
      key: 'items',
      title: { en: 'Items' },
      fields: [
        {
          key: 'items',
          type: 'repeater',
          label: { en: 'Items' },
          required: true,
          fields: [
            { key: 'name', type: 'text', label: { en: 'Name' }, required: true },
            { key: 'quantity', type: 'number', label: { en: 'Quantity' }, required: true, min: 1 },
          ],
        },
      ],
    },
    {
      key: 'budget',
      title: { en: 'Budget' },
      fields: [
        {
          key: 'budget',
          type: 'money',
          label: { en: 'Budget' },
          required: true,
          min: 50,
          max: 50_000,
          mapsTo: 'budgetCap',
        },
        { key: 'notes', type: 'textarea', label: { en: 'Notes' }, required: false },
      ],
    },
    {
      key: 'delivery',
      title: { en: 'Delivery' },
      fields: [
        {
          key: 'deliveryAddress',
          type: 'address',
          label: { en: 'Address' },
          required: true,
          mapsTo: 'deliveryAddress',
        },
        {
          key: 'contactPhone',
          type: 'phone',
          label: { en: 'Phone' },
          required: true,
          mapsTo: 'contactPhone',
        },
        {
          key: 'neededBy',
          type: 'datetime',
          label: { en: 'Needed by' },
          required: true,
          mapsTo: 'deadline',
        },
        {
          key: 'authorizationNeeded',
          type: 'select',
          label: { en: 'Authorization' },
          required: true,
          options: [
            { label: { en: 'Yes' }, value: 'YES' },
            { label: { en: 'No' }, value: 'NO' },
          ],
        },
        {
          key: 'authorizationLetter',
          type: 'file',
          label: { en: 'Letter' },
          required: true,
          showIf: { field: 'authorizationNeeded', equals: 'YES' },
        },
      ],
    },
  ],
};

const addressId = '11111111-1111-4111-8111-111111111111';
const future = new Date(Date.now() + 86_400_000).toISOString();

function validPayload() {
  return {
    items: [{ name: 'Rice', quantity: 2 }],
    budget: 120_000,
    deliveryAddress: addressId,
    contactPhone: '+251911234567',
    neededBy: future,
    authorizationNeeded: 'NO',
  };
}

describe('buildZodSchema', () => {
  it('accepts a complete answer', () => {
    const result = buildZodSchema(definition).safeParse(validPayload());

    expect(result.success).toBe(true);
  });

  it('rejects a missing required field and names it', () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload['budget'];

    const result = buildZodSchema(definition).safeParse(payload);

    expect(result.success).toBe(false);

    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some((issue) => issue.path.join('.') === 'budget')).toBe(true);
      expect(issues[0]?.message).toBe('validation.required');
    }
  });

  it('respects the minimum and the maximum of a money field', () => {
    const tooSmall = buildZodSchema(definition).safeParse({ ...validPayload(), budget: 100 });
    const tooLarge = buildZodSchema(definition).safeParse({ ...validPayload(), budget: 9_000_000 });

    expect(tooSmall.success).toBe(false);
    expect(tooLarge.success).toBe(false);
  });

  it('respects the minimum of a number field', () => {
    const result = buildZodSchema(definition).safeParse({
      ...validPayload(),
      items: [{ name: 'Rice', quantity: 0 }],
    });

    expect(result.success).toBe(false);
  });

  it('ignores a hidden conditional field', () => {
    const result = buildZodSchema(definition).safeParse(validPayload());

    expect(result.success).toBe(true);
  });

  it('requires a hidden conditional field when it is visible', () => {
    const result = buildZodSchema(definition).safeParse({
      ...validPayload(),
      authorizationNeeded: 'YES',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join('.') === 'authorizationLetter'),
      ).toBe(true);
    }
  });

  it('rejects an unknown key', () => {
    const result = buildZodSchema(definition).safeParse({
      ...validPayload(),
      somethingElse: 'hello',
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one row in a repeater', () => {
    const result = buildZodSchema(definition).safeParse({ ...validPayload(), items: [] });

    expect(result.success).toBe(false);
  });

  it('checks that a repeater row has its own required fields', () => {
    const result = buildZodSchema(definition).safeParse({
      ...validPayload(),
      items: [{ name: 'Rice' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a deadline in the past', () => {
    const result = buildZodSchema(definition).safeParse({
      ...validPayload(),
      neededBy: new Date(Date.now() - 86_400_000).toISOString(),
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('validation.deadlineInFuture');
    }
  });

  it('rejects a select value that is not an option', () => {
    const result = buildZodSchema(definition).safeParse({
      ...validPayload(),
      authorizationNeeded: 'MAYBE',
    });

    expect(result.success).toBe(false);
  });
});

describe('the payload helpers', () => {
  it('converts money from birr to santim and back', () => {
    const wire = toWirePayload(definition, { ...validPayload(), budget: 1200 });

    expect(wire['budget']).toBe(120_000);

    const form = fromWirePayload(definition, wire);
    expect(form['budget']).toBe(1200);
  });

  it('reads the task attributes the fields fill in', () => {
    const mapped = extractMappedValues(definition, validPayload());

    expect(mapped.budgetCapSantim).toBe(120_000);
    expect(mapped.deliveryAddressId).toBe(addressId);
    expect(mapped.contactPhone).toBe('+251911234567');
    expect(mapped.deadlineAt).toBeInstanceOf(Date);
  });
});
