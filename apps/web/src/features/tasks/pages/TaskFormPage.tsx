import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2, Save } from 'lucide-react';
import {
  buildZodSchema,
  fromWirePayload,
  toWirePayload,
  type Field,
  type TaskPayload,
} from '@egna-enelaklo/shared';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Skeleton,
  useToast,
} from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { AddressFormModal } from '@/features/addresses/AddressFormModal';
import { useAddresses, useSaveDraft, useTask, uploadFile } from '../api';
import { TaskForm } from '../TaskForm';
import { TaskStepper } from './ChooseServicePage';

export function TaskFormPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const task = useTask(id);
  const addresses = useAddresses();
  const saveDraft = useSaveDraft();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prohibited = useQuery({
    queryKey: ['prohibited-items'],
    queryFn: () => apiRequest<{ note: string | null; term: string }[]>('/prohibited-items'),
  });

  const definition = task.data?.definition;

  /** Fills in one answer of the form. */
  const setValue = (key: string, value: unknown) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (!task.data || loaded) return;

    setValues(fromWirePayload(task.data.definition, task.data.payload as TaskPayload));
    setLoaded(true);
  }, [loaded, task.data]);

  // The autosave: 1.5 seconds after the last change.
  useEffect(() => {
    if (!task.data || !definition || task.data.status !== 'DRAFT' || !loaded) return;
    if (Object.keys(values).length === 0) return;

    setSaveState('saving');

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      saveDraft.mutate(
        { id: task.data.id, payload: toWirePayload(definition, values) },
        { onSuccess: () => setSaveState('saved') },
      );
    }, 1500);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [definition, loaded, saveDraft, task.data, values]);

  const prohibitedMatches = useMemo(() => {
    const terms = (prohibited.data ?? []).map((item) => item.term.toLowerCase());
    if (terms.length === 0) return [];

    const text = JSON.stringify(values).toLowerCase();

    return terms.filter((term) => text.includes(term));
  }, [prohibited.data, values]);

  if (task.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task.data || !definition) {
    return (
      <Card>
        <CardBody>
          <p className="text-[15px] text-ink-700">{t('task.form.notFound')}</p>
        </CardBody>
      </Card>
    );
  }

  const upload = async (field: Field, file: File) => {
    setUploadingField(field.key);

    try {
      const result = await uploadFile({
        contentType: file.type || 'application/octet-stream',
        file,
        kind: field.key.toLowerCase().includes('authorization') ? 'AUTHORIZATION_LETTER' : 'OTHER',
        taskId: task.data?.id,
      });

      return result.attachmentId;
    } finally {
      setUploadingField(null);
    }
  };

  const goToReview = () => {
    if (!definition) return;

    const result = buildZodSchema(definition).safeParse(toWirePayload(definition, values));

    if (!result.success) {
      const next: Record<string, string> = {};

      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (!next[key]) next[key] = issue.message;
      }

      setErrors(next);
      toast({ title: t('task.form.fixErrors'), variant: 'error' });
      return;
    }

    setErrors({});

    saveDraft.mutate(
      { id: task.data.id, payload: toWirePayload(definition, values) },
      {
        onSuccess: () => {
          navigate(`/app/tasks/${task.data.id}/review`);
        },
      },
    );
  };

  const saveAndExit = () => {
    if (!definition) return;

    saveDraft.mutate(
      { id: task.data.id, payload: toWirePayload(definition, values) },
      {
        onSuccess: () => {
          toast({ title: t('task.form.saved'), variant: 'success' });
          navigate('/app');
        },
      },
    );
  };

  const budgetField = definition.sections
    .flatMap((section) => section.fields)
    .find((field) => field.mapsTo === 'budgetCap');
  const budget = budgetField ? (values[budgetField.key] as number | undefined) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <TaskStepper current={2} />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <SaveIndicator state={saveState} />
            <Button onClick={saveAndExit} size="sm" variant="secondary">
              <Save aria-hidden="true" className="h-4 w-4" />
              {t('task.form.saveAndExit')}
            </Button>
          </div>

          {prohibitedMatches.length > 0 ? (
            <Alert
              tone="warning"
              title={t('task.form.prohibitedTitle')}
              message={t('task.form.prohibitedBody')}
            />
          ) : null}

          <TaskForm
            addresses={addresses.data ?? []}
            definition={definition}
            errors={errors}
            language={i18n.language}
            onAddAddress={() => setAddressModalOpen(true)}
            onChange={(next) => {
              setValues(next);
              setErrors({});
            }}
            onUpload={upload}
            uploadingField={uploadingField}
            values={values}
          />
        </div>

        <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-24 lg:w-96">
          <Card>
            <CardHeader>
              <CardTitle>{t('task.form.whatNext')}</CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="flex flex-col gap-3">
                {(['review', 'quote', 'approve', 'receipt'] as const).map((key, index) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {index + 1}
                    </span>
                    <span className="text-sm text-ink-700">{t(`task.form.steps.${key}`)}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('task.form.summary')}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-500">{t('task.form.serviceFee')}</span>
                <span className="text-sm font-semibold text-ink-900">
                  {t('task.form.quotedAfterReview')}
                </span>
              </div>

              {budget !== undefined ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink-500">{t('task.form.purchaseBudget')}</span>
                  <span className="text-sm font-semibold text-ink-900">
                    ETB {budget.toLocaleString()}
                  </span>
                </div>
              ) : null}

              <p className="text-xs text-ink-500">{t('task.form.nothingCharged')}</p>

              <div className="flex flex-col gap-2 pt-2">
                <Button className="w-full" onClick={goToReview}>
                  {t('task.form.reviewAndSubmit')}
                </Button>
                <Button className="w-full" onClick={() => navigate('/app/new')} variant="secondary">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  {t('common.actions.back')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>

      <AddressFormModal
        onClose={() => setAddressModalOpen(false)}
        onSaved={(saved) => {
          // The new address is picked straight away.
          void queryClient.invalidateQueries({ queryKey: ['addresses'] });
          setAddressModalOpen(false);
          if (definition) {
            const addressField = definition.sections
              .flatMap((section) => section.fields)
              .find((field) => field.type === 'address');
            if (addressField) setValue(addressField.key, saved.id);
          }
        }}
        open={addressModalOpen}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  const { t } = useTranslation();

  if (state === 'idle') return null;

  return (
    <span className="flex items-center gap-2 text-xs font-semibold text-ink-500" role="status">
      {state === 'saving' ? (
        <>
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          {t('task.form.saving')}
        </>
      ) : (
        <>
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />
          {t('task.form.saved')}
        </>
      )}
    </span>
  );
}
