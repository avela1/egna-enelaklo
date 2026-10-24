import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import {
  isFieldVisible,
  localize,
  rowFields,
  toWirePayload,
  type Field,
  type Section,
  type TaskPayload,
  type TemplateDefinition,
} from '@egna-enelaklo/shared';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  FormField,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { attachmentUrl, type AddressSummary, type TaskAttachment } from './api';

export interface TaskFormProps {
  addresses: AddressSummary[];
  attachments?: TaskAttachment[];
  definition: TemplateDefinition;
  errors: Record<string, string>;
  language: string;
  onAddAddress: () => void;
  onChange: (values: Record<string, unknown>) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onUpload: (field: Field, file: File) => Promise<string>;
  uploadingField: string | null;
  values: Record<string, unknown>;
}

/**
 * Renders the request form of a template.
 *
 * The same renderer is used for the customer form and for the live preview in
 * the staff template editor, so what an administrator sees is what a customer
 * gets.
 */
export function TaskForm({
  addresses,
  attachments,
  definition,
  errors,
  language,
  onAddAddress,
  onChange,
  onRemoveAttachment,
  onUpload,
  uploadingField,
  values,
}: TaskFormProps) {
  // The visibility of a conditional field is decided on the wire values, so
  // the form and the server always agree.
  const wire = useMemo(() => toWirePayload(definition, values), [definition, values]);

  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="flex flex-col gap-5">
      {definition.sections.map((section) => (
        <SectionCard
          key={section.key}
          addresses={addresses}
          attachments={attachments}
          errors={errors}
          language={language}
          onAddAddress={onAddAddress}
          onChange={setValue}
          onRemoveAttachment={onRemoveAttachment}
          onUpload={onUpload}
          section={section}
          uploadingField={uploadingField}
          values={values}
          visible={isSectionVisible(section, wire)}
          wire={wire}
        />
      ))}
    </div>
  );
}

function isSectionVisible(section: Section, wire: TaskPayload): boolean {
  return section.fields.some((field) => isFieldVisible(field, wire));
}

interface SectionCardProps {
  addresses: AddressSummary[];
  attachments?: TaskAttachment[];
  errors: Record<string, string>;
  language: string;
  onAddAddress: () => void;
  onChange: (key: string, value: unknown) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onUpload: (field: Field, file: File) => Promise<string>;
  section: Section;
  uploadingField: string | null;
  values: Record<string, unknown>;
  visible: boolean;
  wire: TaskPayload;
}

function SectionCard({
  addresses,
  attachments,
  errors,
  language,
  onAddAddress,
  onChange,
  onRemoveAttachment,
  onUpload,
  section,
  uploadingField,
  values,
  visible,
  wire,
}: SectionCardProps) {
  if (!visible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{localize(section.title, language)}</CardTitle>
        {section.description ? (
          <p className="text-sm text-ink-500">{localize(section.description, language)}</p>
        ) : null}
      </CardHeader>

      <CardBody className="flex flex-col gap-5">
        {section.fields.map((field) => {
          if (!isFieldVisible(field, wire)) return null;

          return (
            <FieldControl
              key={field.key}
              addresses={addresses}
              attachment={attachments?.find((entry) => entry.id === values[field.key])}
              error={errors[field.key]}
              field={field}
              language={language}
              onAddAddress={onAddAddress}
              onChange={(value) => onChange(field.key, value)}
              onRemoveAttachment={onRemoveAttachment}
              onUpload={onUpload}
              uploading={uploadingField === field.key}
              value={values[field.key]}
            />
          );
        })}
      </CardBody>
    </Card>
  );
}

interface FieldControlProps {
  addresses: AddressSummary[];
  attachment?: TaskAttachment;
  error?: string;
  field: Field;
  language: string;
  onAddAddress: () => void;
  onChange: (value: unknown) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onUpload: (field: Field, file: File) => Promise<string>;
  uploading: boolean;
  value: unknown;
}

function FieldControl({
  addresses,
  attachment,
  error,
  field,
  language,
  onAddAddress,
  onChange,
  onRemoveAttachment,
  onUpload,
  uploading,
  value,
}: FieldControlProps) {
  const { t } = useTranslation();
  const label = localize(field.label, language);
  const help = field.help ? localize(field.help, language) : undefined;
  const fieldId = `field-${field.key}`;

  switch (field.type) {
    case 'textarea':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <Textarea
            id={fieldId}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder ? localize(field.placeholder, language) : undefined}
            value={(value as string) ?? ''}
          />
        </FormField>
      );

    case 'number':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <Input
            id={fieldId}
            min={field.min}
            max={field.max}
            onChange={(event) =>
              onChange(event.target.value === '' ? undefined : Number(event.target.value))
            }
            type="number"
            value={value === undefined || value === null ? '' : String(value)}
          />
        </FormField>
      );

    case 'money':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <div className="flex items-center gap-2">
            <Input
              id={fieldId}
              min={field.min}
              max={field.max}
              onChange={(event) =>
                onChange(event.target.value === '' ? undefined : Number(event.target.value))
              }
              type="number"
              value={value === undefined || value === null ? '' : String(value)}
            />
            <span className="flex h-input items-center rounded-control border border-line bg-canvas px-3 text-[15px] text-ink-700">
              ETB
            </span>
          </div>
        </FormField>
      );

    case 'select':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <Select
            id={fieldId}
            onChange={(event) => onChange(event.target.value)}
            options={(field.options ?? []).map((option) => ({
              label: localize(option.label, language),
              value: option.value,
            }))}
            placeholder={t('task.form.chooseOne')}
            value={(value as string) ?? ''}
          />
        </FormField>
      );

    case 'checkbox':
      return (
        <div className="flex flex-col gap-1.5">
          <Checkbox
            checked={Boolean(value)}
            label={label}
            onCheckedChange={(checked) => onChange(checked)}
          />
          {help ? <p className="text-xs text-ink-500">{help}</p> : null}
          {error ? (
            <p role="alert" className="text-xs font-semibold text-danger-text">
              {error}
            </p>
          ) : null}
        </div>
      );

    case 'date':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <Input
            id={fieldId}
            onChange={(event) => onChange(event.target.value)}
            type="date"
            value={(value as string) ?? ''}
          />
        </FormField>
      );

    case 'datetime':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <Input
            id={fieldId}
            onChange={(event) => onChange(event.target.value)}
            type="datetime-local"
            value={(value as string) ?? ''}
          />
        </FormField>
      );

    case 'phone':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <Input
            id={fieldId}
            onChange={(event) => onChange(event.target.value)}
            placeholder="+251911234567"
            type="tel"
            value={(value as string) ?? ''}
          />
        </FormField>
      );

    case 'address':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <div className="flex flex-col gap-2">
            <Select
              id={fieldId}
              onChange={(event) => onChange(event.target.value || undefined)}
              options={[
                { label: t('task.form.chooseAddress'), value: '' },
                ...addresses.map((address) => ({
                  label: `${address.label} — ${address.subCity}`,
                  value: address.id,
                })),
              ]}
              value={(value as string) ?? ''}
            />
            <div>
              <Button onClick={onAddAddress} size="sm" type="button" variant="secondary">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t('task.form.addAddress')}
              </Button>
            </div>
          </div>
        </FormField>
      );

    case 'file':
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <FileControl
            attachment={attachment}
            field={field}
            id={fieldId}
            onChange={(fileValue) => onChange(fileValue)}
            onRemoveAttachment={onRemoveAttachment}
            onUpload={onUpload}
            uploading={uploading}
          />
        </FormField>
      );

    case 'repeater':
      return (
        <RepeaterControl
          error={error}
          field={field}
          language={language}
          onChange={onChange}
          value={value}
        />
      );

    default:
      return (
        <FormField error={error} hint={help} htmlFor={fieldId} label={label}>
          <Input
            id={fieldId}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder ? localize(field.placeholder, language) : undefined}
            value={(value as string) ?? ''}
          />
        </FormField>
      );
  }
}

function FileControl({
  attachment,
  field,
  id,
  onChange,
  onRemoveAttachment,
  onUpload,
  uploading,
}: {
  attachment?: TaskAttachment;
  field: Field;
  id: string;
  onChange: (value: unknown) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onUpload: (field: Field, file: File) => Promise<string>;
  uploading: boolean;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    setError(null);
    setNewFileName(file.name);

    try {
      const attachmentId = await onUpload(field, file);

      // The old file is no longer referenced: remove it from the bucket.
      if (attachment && onRemoveAttachment) {
        onRemoveAttachment(attachment.id);
      }

      onChange(attachmentId);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('task.form.uploadFailed'));
    }
  };

  const openExisting = async (attachmentId: string) => {
    try {
      const read = await attachmentUrl(attachmentId);
      window.open(read.url, '_blank', 'noopener');
    } catch {
      setError(t('task.attachments.viewFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {attachment ? (
        <p className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink-700">
          <Paperclip aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-700" />
          <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">
            {t('task.form.uploaded')} · {attachment.fileName}
          </span>
          <button
            type="button"
            onClick={() => void openExisting(attachment.id)}
            className="h-control rounded-control border border-line bg-surface px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {t('task.attachments.view')}
          </button>
          {onRemoveAttachment ? (
            <button
              type="button"
              onClick={() => {
                setNewFileName(null);
                onChange(undefined);
                onRemoveAttachment(attachment.id);
              }}
              className="h-control rounded-control border border-line bg-surface px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {t('task.attachments.remove')}
            </button>
          ) : null}
        </p>
      ) : null}

      <label className="flex min-h-control cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-line bg-canvas px-4 text-[15px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-500">
        <Upload aria-hidden="true" className="h-4 w-4" />
        {uploading
          ? t('task.form.uploading')
          : attachment
            ? t('task.form.replaceFile')
            : t('task.form.chooseFile')}
        <input
          id={id}
          type="file"
          className="sr-only"
          accept={(field.allowedTypes ?? []).join(',') || undefined}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </label>

      {uploading ? (
        <p className="text-xs text-ink-500">{t('task.form.uploading')}</p>
      ) : newFileName ? (
        <p className="flex items-center gap-2 text-xs text-ink-500">
          <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
          {newFileName}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs font-semibold text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RepeaterControl({
  error,
  field,
  language,
  onChange,
  value,
}: {
  error?: string;
  field: Field;
  language: string;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const { t } = useTranslation();
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const subFields = rowFields(field);

  const updateRow = (index: number, key: string, rowValue: unknown) => {
    const next = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [key]: rowValue } : row,
    );

    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const addRow = () => {
    const empty: Record<string, unknown> = {};

    for (const subField of subFields) {
      if (subField.defaultValue !== undefined) empty[subField.key] = subField.defaultValue;
    }

    onChange([...rows, empty]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-700">
          {localize(field.label, language)}
        </span>
        <Button onClick={addRow} size="sm" type="button" variant="secondary">
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t('task.form.addRow')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-panel border border-dashed border-line px-4 py-6 text-center text-sm text-ink-500">
          {t('task.form.noRows')}
        </p>
      ) : null}

      {rows.map((row, index) => (
        <div key={index} className="rounded-panel border border-line bg-canvas p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-ink-900">
              {field.rowLabel ? localize(field.rowLabel, language) : t('task.form.row')} {index + 1}
            </span>
            <Button
              aria-label={t('task.form.removeRow')}
              onClick={() => removeRow(index)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4 text-danger-text" />
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {subFields.map((subField) => (
              <FieldControl
                key={subField.key}
                addresses={[]}
                error={errorsForRow(error, subField.key)}
                field={subField}
                language={language}
                onAddAddress={() => undefined}
                onChange={(rowValue) => updateRow(index, subField.key, rowValue)}
                onUpload={async () => ''}
                uploading={false}
                value={row[subField.key]}
              />
            ))}
          </div>
        </div>
      ))}

      {error ? (
        <p role="alert" className="text-xs font-semibold text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The error of a row field is stored as "rows.<key>". */
function errorsForRow(error: string | undefined, key: string): string | undefined {
  if (!error) return undefined;
  if (!error.startsWith('rows.')) return undefined;

  const [, , fieldKey] = error.split('.');
  return fieldKey === key ? error : undefined;
}

export { cn };
