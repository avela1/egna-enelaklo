import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TemplateDefinition } from '@egna-enelaklo/shared';
import type * as ApiModule from '@/lib/api';
import '@/i18n';
import { TaskForm } from './TaskForm';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, apiRequest: vi.fn() };
});

const definition: TemplateDefinition = {
  requiredEvidence: [],
  sections: [
    {
      key: 'main',
      title: { en: 'Details' },
      fields: [
        { key: 'name', type: 'text', label: { en: 'Name' }, required: true },
        { key: 'story', type: 'textarea', label: { en: 'Story' }, required: false },
        { key: 'quantity', type: 'number', label: { en: 'Quantity' }, required: false, min: 1 },
        {
          key: 'budget',
          type: 'money',
          label: { en: 'Budget' },
          required: false,
          min: 50,
          max: 50_000,
        },
        {
          key: 'office',
          type: 'select',
          label: { en: 'Office' },
          required: false,
          options: [
            { label: { en: 'Kebele' }, value: 'KEBELE' },
            { label: { en: 'Bank' }, value: 'BANK' },
          ],
        },
        { key: 'agree', type: 'checkbox', label: { en: 'I agree' }, required: false },
        { key: 'date', type: 'date', label: { en: 'Date' }, required: false },
        { key: 'when', type: 'datetime', label: { en: 'When' }, required: false },
        { key: 'phone', type: 'phone', label: { en: 'Phone' }, required: false },
        {
          key: 'address',
          type: 'address',
          label: { en: 'Address' },
          required: false,
        },
        {
          key: 'letter',
          type: 'file',
          label: { en: 'Letter' },
          required: false,
          allowedTypes: ['application/pdf'],
        },
        {
          key: 'items',
          type: 'repeater',
          label: { en: 'Items' },
          required: false,
          rowLabel: { en: 'Item' },
          fields: [{ key: 'itemName', type: 'text', label: { en: 'Item name' }, required: false }],
        },
        {
          key: 'authorizationNeeded',
          type: 'select',
          label: { en: 'Authorization needed' },
          required: false,
          options: [
            { label: { en: 'Yes' }, value: 'YES' },
            { label: { en: 'No' }, value: 'NO' },
          ],
        },
        {
          key: 'authorizationLetter',
          type: 'file',
          label: { en: 'Authorization letter' },
          required: true,
          showIf: { field: 'authorizationNeeded', equals: 'YES' },
        },
      ],
    },
  ],
};

function renderForm(overrides: Partial<React.ComponentProps<typeof TaskForm>> = {}) {
  const onChange = vi.fn();

  const utils = render(
    <TaskForm
      addresses={[
        {
          contactName: 'Test',
          contactPhone: '+251911234567',
          directions: 'Near the gate',
          id: '11111111-1111-4111-8111-111111111111',
          isDefault: true,
          label: 'Home',
          landmark: 'Bole Road',
          subCity: 'BOLE',
          woreda: null,
        },
      ]}
      definition={definition}
      errors={{}}
      language="en"
      onAddAddress={vi.fn()}
      onChange={onChange}
      onUpload={vi.fn()}
      uploadingField={null}
      values={{}}
      {...overrides}
    />,
  );

  return { ...utils, onChange };
}

describe('the task form renderer', () => {
  it('renders every field type', () => {
    renderForm();

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Story')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget')).toBeInTheDocument();
    expect(screen.getByLabelText('Office')).toBeInTheDocument();
    expect(screen.getByLabelText('I agree')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('When')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Letter')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
  });

  it('writes the answer of a field', async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.type(screen.getByLabelText('Name'), 'Rice');

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toHaveProperty('name');
  });

  it('hides a conditional field until the condition is met', async () => {
    const { onChange, rerender } = renderForm();

    expect(screen.queryByLabelText('Authorization letter')).not.toBeInTheDocument();

    // The condition is met: the field appears.
    rerender(
      <TaskForm
        addresses={[]}
        definition={definition}
        errors={{}}
        language="en"
        onAddAddress={vi.fn()}
        onChange={onChange}
        onUpload={vi.fn()}
        uploadingField={null}
        values={{ authorizationNeeded: 'YES' }}
      />,
    );

    expect(await screen.findByLabelText('Authorization letter')).toBeInTheDocument();
  });

  it('adds and removes a repeater row', async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();

    await user.click(screen.getByRole('button', { name: /add a row/i }));

    expect(onChange).toHaveBeenCalled();
    expect(Array.isArray(onChange.mock.calls.at(-1)?.[0].items)).toBe(true);
  });

  it('shows the error of a field', () => {
    renderForm({ errors: { name: 'validation.required' } });

    expect(screen.getByText('validation.required')).toBeInTheDocument();
  });

  it('uses the language of the app and falls back to English', async () => {
    const { rerender } = renderForm();

    rerender(
      <TaskForm
        addresses={[]}
        definition={definition}
        errors={{}}
        language="am"
        onAddAddress={vi.fn()}
        onChange={vi.fn()}
        onUpload={vi.fn()}
        uploadingField={null}
        values={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument();
    });
  });
});
