import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Plus, Save, Trash2 } from 'lucide-react';
import {
  FIELD_TYPES,
  MAPPED_FIELDS,
  type Field,
  type Section,
  type TemplateDefinition,
} from '@egna-enelaklo/shared';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  Switch,
  Textarea,
  useToast,
} from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { TaskForm } from '@/features/tasks/TaskForm';

interface TemplateRow {
  definition: TemplateDefinition;
  id: string;
  serviceId: string;
  status: string;
  version: number;
}

interface ServiceRow {
  id: string;
  key: string;
  name: { en: string };
}

export function TemplateEditorPage() {
  const { t } = useTranslation();
  const { serviceId } = useParams<{ serviceId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [definition, setDefinition] = useState<TemplateDefinition>({
    requiredEvidence: [],
    sections: [],
  });
  const [editingField, setEditingField] = useState<{
    field: Field;
    index: number;
    section: number;
  } | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishIssues, setPublishIssues] = useState<{ field?: string; message: string }[]>([]);

  const service = useQuery({
    queryKey: ['staff', 'service', serviceId],
    queryFn: () => apiRequest<ServiceRow>(`/staff/catalog/services/${serviceId}`),
    enabled: false,
  });

  const templates = useQuery({
    queryKey: ['staff', 'templates', serviceId],
    queryFn: () => apiRequest<TemplateRow[]>(`/staff/services/${serviceId}/templates`),
    enabled: Boolean(serviceId),
  });

  const draft = (templates.data ?? []).find((template) => template.status === 'DRAFT');
  const live = (templates.data ?? []).find((template) => template.status === 'LIVE');

  useEffect(() => {
    if (draft) setDefinition(draft.definition);
  }, [draft]);

  const save = useMutation({
    mutationFn: (value: TemplateDefinition) =>
      apiRequest(`/staff/templates/${draft?.id}`, { method: 'PUT', body: { definition: value } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'templates', serviceId] });
      toast({ title: t('staff.templates.saved'), variant: 'success' });
    },
    onError: (error: unknown) => {
      const details = (error as { details?: { message?: string }[] }).details;
      toast({
        title: t('common.states.error'),
        description: details?.[0]?.message ?? t('common.states.error'),
        variant: 'error',
      });
    },
  });

  const publish = useMutation({
    mutationFn: () => apiRequest(`/staff/templates/${draft?.id}/publish`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'templates', serviceId] });
      setPublishOpen(false);
      setPublishIssues([]);
      toast({ title: t('staff.templates.published'), variant: 'success' });
    },
    onError: (error: unknown) => {
      const details = (error as { details?: { field?: string; message?: string }[] }).details;
      setPublishIssues(
        (details ?? []).map((detail) => ({
          field: detail.field,
          message: detail.message ?? t('common.states.error'),
        })),
      );
      toast({
        title: t('staff.templates.publishFailed'),
        description: details?.[0]?.message ?? t('common.states.error'),
        variant: 'error',
      });
      setPublishOpen(false);
    },
  });

  const createDraft = useMutation({
    mutationFn: () => apiRequest(`/staff/services/${serviceId}/templates`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'templates', serviceId] });
    },
  });

  const updateField = (sectionIndex: number, fieldIndex: number, field: Field) => {
    setDefinition((current) => {
      const sections = current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: section.fields.map((entry, entryIndex) =>
                entryIndex === fieldIndex ? field : entry,
              ),
            }
          : section,
      );

      return { ...current, sections };
    });
  };

  const addField = () => {
    const key = `field${Date.now().toString().slice(-6)}`;
    const field: Field = {
      key,
      type: 'text',
      label: { en: 'New field' },
      required: false,
    };

    setDefinition((current) => {
      if (current.sections.length === 0) {
        return {
          ...current,
          sections: [
            {
              key: `section${Date.now().toString().slice(-6)}`,
              title: { en: 'New section' },
              fields: [field],
            },
          ],
        };
      }

      const sections = current.sections.map((section, index) =>
        index === current.sections.length - 1
          ? { ...section, fields: [...section.fields, field] }
          : section,
      );

      return { ...current, sections };
    });
  };

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    setDefinition((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: section.fields.filter((_, entryIndex) => entryIndex !== fieldIndex),
            }
          : section,
      ),
    }));
  };

  const moveField = (sectionIndex: number, fieldIndex: number, direction: -1 | 1) => {
    setDefinition((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;

        const fields = [...section.fields];
        const target = fieldIndex + direction;
        if (target < 0 || target >= fields.length) return section;

        const moved = fields[target];
        fields[target] = fields[fieldIndex] as Field;
        fields[fieldIndex] = moved as Field;

        return { ...section, fields };
      }),
    }));
  };

  if (templates.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            to="/staff/catalog"
            className="flex items-center gap-1 text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t('staff.templates.backToCatalog')}
          </Link>
          <h2 className="font-heading text-pageTitle font-bold text-ink-900">
            {t('staff.templates.title', { service: service.data?.name.en ?? '' })}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
            <Switch
              checked={preview}
              label={t('staff.templates.preview')}
              onCheckedChange={setPreview}
            />
            {t('staff.templates.preview')}
          </label>

          {draft ? (
            <Button onClick={() => save.mutate(definition)} variant="secondary">
              <Save aria-hidden="true" className="h-4 w-4" />
              {t('staff.templates.saveDraft')}
            </Button>
          ) : (
            <Button onClick={() => createDraft.mutate()}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t('staff.templates.createDraft')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>{t('staff.templates.fields')}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {definition.sections.map((section, sectionIndex) => (
              <SectionFields
                key={section.key}
                issues={publishIssues}
                onEdit={(field, index) => setEditingField({ field, index, section: sectionIndex })}
                onMove={moveField}
                onRemove={removeField}
                section={section}
                sectionIndex={sectionIndex}
              />
            ))}

            <div>
              <Button onClick={addField} size="sm" type="button" variant="secondary">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t('staff.templates.addField')}
              </Button>
            </div>

            {preview ? (
              <div className="mt-4">
                <p className="mb-3 text-sm font-bold text-ink-700">
                  {t('staff.templates.livePreview')}
                </p>
                <TaskForm
                  addresses={[]}
                  definition={definition}
                  errors={{}}
                  language="en"
                  onAddAddress={() => undefined}
                  onChange={() => undefined}
                  onUpload={async () => ''}
                  uploadingField={null}
                  values={{}}
                />
              </div>
            ) : null}
          </CardBody>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('staff.templates.version')}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-500">{t('staff.templates.draft')}</span>
                <Chip variant="warning">
                  {draft ? `v${draft.version}` : t('staff.templates.none')}
                </Chip>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-500">{t('staff.templates.live')}</span>
                <Chip variant="brand">{live ? `v${live.version}` : t('staff.templates.none')}</Chip>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm text-ink-500">{t('staff.templates.evidence')}</span>
                <span className="text-[15px] text-ink-900">
                  {definition.requiredEvidence.length > 0
                    ? definition.requiredEvidence.join(', ')
                    : t('staff.templates.none')}
                </span>
              </div>

              <Button className="w-full" disabled={!draft} onClick={() => setPublishOpen(true)}>
                <Eye aria-hidden="true" className="h-4 w-4" />
                {t('staff.templates.publish')}
              </Button>

              <p className="text-xs text-ink-500">{t('staff.templates.auditNote')}</p>
            </CardBody>
          </Card>
        </aside>
      </div>

      <FieldEditor
        fields={definition.sections.flatMap((section) => section.fields)}
        onClose={() => setEditingField(null)}
        onSave={(field) => {
          if (editingField) {
            updateField(editingField.section, editingField.index, field);
          }
          setEditingField(null);
        }}
        state={editingField}
      />

      <Modal
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={t('staff.templates.publishTitle')}
        description={t('staff.templates.publishDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublishOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button loading={publish.isPending} onClick={() => publish.mutate()}>
              {t('staff.templates.publish')}
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2 text-sm text-ink-700">
          <li>· {t('staff.templates.publishChange1')}</li>
          <li>· {t('staff.templates.publishChange2')}</li>
          <li>· {t('staff.templates.publishChange3')}</li>
        </ul>
      </Modal>
    </div>
  );
}

function SectionFields({
  issues,
  onEdit,
  onMove,
  onRemove,
  section,
  sectionIndex,
}: {
  issues: { field?: string; message: string }[];
  onEdit: (field: Field, index: number) => void;
  onMove: (sectionIndex: number, fieldIndex: number, direction: -1 | 1) => void;
  onRemove: (sectionIndex: number, fieldIndex: number) => void;
  section: Section;
  sectionIndex: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-ink-700">{section.title.en}</p>

      {section.fields.length === 0 ? (
        <p className="rounded-panel border border-dashed border-line px-4 py-6 text-center text-sm text-ink-500">
          {t('staff.templates.noFields')}
        </p>
      ) : null}

      {section.fields.map((field, index) => (
        <div
          key={field.key}
          className="flex flex-wrap items-center gap-3 rounded-panel border border-line px-4 py-3"
        >
          <span className="font-mono text-xs text-ink-500">{field.key}</span>
          <span className="text-[15px] font-semibold text-ink-900">{field.label.en}</span>
          <Chip>{field.type}</Chip>
          <Chip variant={field.required ? 'warning' : 'neutral'}>
            {field.required ? t('staff.templates.required') : t('staff.templates.optional')}
          </Chip>

          {issues
            .filter((issue) => issue.field === field.key)
            .map((issue) => (
              <span
                key={issue.message}
                role="alert"
                className="text-xs font-semibold text-danger-text"
              >
                {issue.message}
              </span>
            ))}

          {issues
            .filter((issue) => issue.field === field.key)
            .map((issue) => (
              <span
                key={issue.message}
                role="alert"
                className="text-xs font-semibold text-danger-text"
              >
                {issue.message}
              </span>
            ))}

          <div className="ml-auto flex items-center gap-1">
            <Button
              aria-label={t('staff.templates.moveUp')}
              onClick={() => onMove(sectionIndex, index, -1)}
              size="sm"
              variant="ghost"
            >
              <ArrowUp aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              aria-label={t('staff.templates.moveDown')}
              onClick={() => onMove(sectionIndex, index, 1)}
              size="sm"
              variant="ghost"
            >
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button onClick={() => onEdit(field, index)} size="sm" variant="secondary">
              {t('common.actions.edit')}
            </Button>
            <Button
              aria-label={t('common.actions.remove')}
              onClick={() => onRemove(sectionIndex, index)}
              size="sm"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4 text-danger-text" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldEditor({
  fields,
  onClose,
  onSave,
  state,
}: {
  fields: Field[];
  onClose: () => void;
  onSave: (field: Field) => void;
  state: { field: Field; index: number; section: number } | null;
}) {
  const { t } = useTranslation();
  const [field, setField] = useState<Field | null>(state?.field ?? null);
  const otherFields = fields;

  useEffect(() => {
    setField(state?.field ?? null);
  }, [state]);

  if (!state || !field) return null;

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('staff.templates.editField')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={() => onSave(field)}>{t('common.actions.save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField htmlFor="field-key" label={t('staff.templates.fieldKey')}>
          <Input
            id="field-key"
            onChange={(event) => setField({ ...field, key: event.target.value })}
            value={field.key}
          />
        </FormField>

        <FormField htmlFor="field-type" label={t('staff.templates.fieldType')}>
          <Select
            id="field-type"
            onChange={(event) => setField({ ...field, type: event.target.value as Field['type'] })}
            options={FIELD_TYPES.map((type) => ({ label: type, value: type }))}
            value={field.type}
          />
        </FormField>

        <FormField htmlFor="field-label" label={t('staff.templates.labelEn')}>
          <Input
            id="field-label"
            onChange={(event) =>
              setField({ ...field, label: { ...field.label, en: event.target.value } })
            }
            value={field.label.en}
          />
        </FormField>

        <FormField htmlFor="field-label-am" label={t('staff.templates.labelAm')}>
          <Input
            id="field-label-am"
            onChange={(event) =>
              setField({ ...field, label: { ...field.label, am: event.target.value } })
            }
            value={field.label.am ?? ''}
          />
        </FormField>

        <FormField htmlFor="field-label-om" label={t('staff.templates.labelOm')}>
          <Input
            id="field-label-om"
            onChange={(event) =>
              setField({ ...field, label: { ...field.label, om: event.target.value } })
            }
            value={field.label.om ?? ''}
          />
        </FormField>

        <FormField htmlFor="field-help" label={t('staff.templates.help')}>
          <Textarea
            id="field-help"
            onChange={(event) => setField({ ...field, help: { en: event.target.value } })}
            value={field.help?.en ?? ''}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="field-min" label={t('staff.templates.min')}>
            <Input
              id="field-min"
              onChange={(event) =>
                setField({
                  ...field,
                  min: event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
              type="number"
              value={field.min ?? ''}
            />
          </FormField>

          <FormField htmlFor="field-max" label={t('staff.templates.max')}>
            <Input
              id="field-max"
              onChange={(event) =>
                setField({
                  ...field,
                  max: event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
              type="number"
              value={field.max ?? ''}
            />
          </FormField>
        </div>

        <FormField htmlFor="field-maps-to" label={t('staff.templates.mapsTo')}>
          <Select
            id="field-maps-to"
            onChange={(event) =>
              setField({
                ...field,
                mapsTo: (event.target.value || undefined) as Field['mapsTo'],
              })
            }
            options={[
              { label: t('staff.templates.none'), value: '' },
              ...MAPPED_FIELDS.map((value) => ({ label: value, value })),
            ]}
            value={field.mapsTo ?? ''}
          />
        </FormField>

        {field.type === 'select' ? (
          <FormField
            htmlFor="field-options"
            hint={t('staff.templates.optionsHint')}
            label={t('staff.templates.options')}
          >
            <Textarea
              id="field-options"
              onChange={(event) =>
                setField({ ...field, options: parseOptions(event.target.value) })
              }
              value={(field.options ?? [])
                .map((option) => `${option.value} | ${option.label.en}`)
                .join('\n')}
            />
          </FormField>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            htmlFor="field-showif"
            hint={t('staff.templates.showIfHint')}
            label={t('staff.templates.showIf')}
          >
            <Select
              id="field-showif"
              onChange={(event) => {
                const target = event.target.value;
                setField({
                  ...field,
                  showIf: target
                    ? { field: target, equals: field.showIf?.equals ?? '' }
                    : undefined,
                });
              }}
              options={[
                { label: t('staff.templates.none'), value: '' },
                ...otherFields
                  .filter((other) => other.key !== field.key)
                  .map((other) => ({ label: other.label.en, value: other.key })),
              ]}
              value={field.showIf?.field ?? ''}
            />
          </FormField>

          <FormField htmlFor="field-showif-value" label={t('staff.templates.showIfValue')}>
            <Input
              id="field-showif-value"
              disabled={!field.showIf}
              onChange={(event) =>
                setField({
                  ...field,
                  showIf: field.showIf
                    ? { ...field.showIf, equals: event.target.value }
                    : undefined,
                })
              }
              value={String(field.showIf?.equals ?? '')}
            />
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => setField({ ...field, required: event.target.checked })}
          />
          {t('staff.templates.required')}
        </label>
      </div>
    </Modal>
  );
}

/** Reads the options of a select: one per line, "value | label". */
function parseOptions(text: string): { label: { en: string }; value: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const [value, ...rest] = line.split('|');
      const label = rest.join('|').trim();

      return {
        value: (value ?? '').trim(),
        label: { en: label === '' ? (value ?? '').trim() : label },
      };
    });
}
