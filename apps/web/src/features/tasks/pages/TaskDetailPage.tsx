import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localize } from '@egna-enelaklo/shared';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FormField,
  Modal,
  Skeleton,
  StatusChip,
  Textarea,
  useToast,
} from '@/components/ui';
import { useCancelTask, useTask } from '../api';
import { AttachmentList } from '../AttachmentList';

export function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const task = useTask(id);
  const cancel = useCancelTask();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (task.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!task.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-[15px] text-ink-700">{t('task.detail.notFound')}</p>
        </CardBody>
      </Card>
    );
  }

  const canCancel = task.data.status === 'DRAFT' || task.data.status === 'SUBMITTED';
  const payload = task.data.payload as Record<string, unknown>;
  const prohibitedMatches = (
    payload['__meta'] as { prohibitedMatches?: { term: string }[] } | undefined
  )?.prohibitedMatches;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm text-ink-500">{task.data.ref}</span>
          <h2 className="font-heading text-pageTitle font-bold text-ink-900">
            {localize(task.data.serviceName, i18n.language)}
          </h2>
          <span className="text-[15px] text-ink-500">{task.data.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <StatusChip status={task.data.status as never} />
          {task.data.status === 'DRAFT' ? (
            <Link to={`/app/tasks/${task.data.id}/edit`}>
              <Button size="sm" variant="secondary">
                {t('task.list.continueDraft')}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {task.data.status === 'SUBMITTED' ? (
        <Alert tone="info" message={t('task.detail.reviewing')} />
      ) : null}

      {prohibitedMatches && prohibitedMatches.length > 0 ? (
        <Alert
          tone="warning"
          title={t('task.form.prohibitedTitle')}
          message={prohibitedMatches.map((match) => match.term).join(', ')}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>{t('task.detail.request')}</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {task.data.definition.sections.map((section) => (
              <div key={section.key} className="flex flex-col gap-2">
                <p className="text-sm font-bold text-ink-700">
                  {localize(section.title, i18n.language)}
                </p>
                {section.fields.map((field) => {
                  const value = payload[field.key];
                  if (value === undefined || value === null || value === '') return null;

                  return (
                    <div key={field.key} className="flex flex-col gap-0.5">
                      <span className="text-xs text-ink-500">
                        {localize(field.label, i18n.language)}
                      </span>
                      <span className="text-[15px] text-ink-900">
                        {Array.isArray(value)
                          ? value
                              .map((row) =>
                                typeof row === 'object' && row !== null
                                  ? Object.values(row as Record<string, unknown>)
                                      .filter(
                                        (entry) =>
                                          entry !== undefined && entry !== null && entry !== '',
                                      )
                                      .join(' · ')
                                  : String(row),
                              )
                              .join(' / ')
                          : typeof value === 'boolean'
                            ? t('common.actions.yes')
                            : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

            {task.data.budgetCapSantim ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-ink-500">{t('task.form.purchaseBudget')}</span>
                <span className="text-[15px] font-semibold text-ink-900">
                  ETB {(task.data.budgetCapSantim / 100).toLocaleString()}
                </span>
              </div>
            ) : null}

            {task.data.attachments.length > 0 ? (
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-sm font-bold text-ink-700">{t('task.detail.attachments')}</p>
                <AttachmentList attachments={task.data.attachments} />
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('task.detail.timeline')}</CardTitle>
          </CardHeader>
          <CardBody>
            <ol className="flex flex-col gap-4">
              {task.data.history.map((entry, index) => (
                <li key={entry.id} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                    {index < task.data.history.length - 1 ? (
                      <span className="mt-1 w-0.5 flex-1 bg-line" />
                    ) : null}
                  </span>
                  <span className="flex flex-col pb-2">
                    <span className="text-[15px] font-semibold text-ink-900">
                      {t(`status.${entry.toStatus}`)}
                    </span>
                    <span className="text-xs text-ink-500">
                      {entry.actorRole === 'customer' || entry.actorRole === 'tasker'
                        ? t('task.detail.you')
                        : t('task.detail.team')}
                      {' · '}
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    {entry.note ? <span className="text-xs text-ink-500">{entry.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>

            {canCancel ? (
              <div className="pt-4">
                <Button className="w-full" onClick={() => setConfirmOpen(true)} variant="danger">
                  {t('task.detail.cancel')}
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('task.detail.cancelTitle')}
        description={t('task.detail.cancelDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              loading={cancel.isPending}
              variant="danger"
              onClick={() => {
                cancel.mutate(
                  { id: task.data.id, reason: reason.trim() || undefined },
                  {
                    onSuccess: () => {
                      setConfirmOpen(false);
                      toast({ title: t('task.detail.cancelled'), variant: 'success' });
                    },
                  },
                );
              }}
            >
              {t('task.detail.cancel')}
            </Button>
          </>
        }
      >
        <FormField htmlFor="cancel-reason" label={t('task.detail.reason')}>
          <Textarea
            id="cancel-reason"
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
        </FormField>
      </Modal>
    </div>
  );
}
