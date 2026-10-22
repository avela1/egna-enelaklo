import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { localize } from '@egna-enelaklo/shared';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useSubmitTask, useTask } from '../api';
import { TaskStepper } from './ChooseServicePage';

export function TaskReviewPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const task = useTask(id);
  const submit = useSubmitTask();
  const [confirmed, setConfirmed] = useState(false);

  if (task.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!task.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-[15px] text-ink-700">{t('task.form.notFound')}</p>
        </CardBody>
      </Card>
    );
  }

  const payload = task.data.payload as Record<string, unknown>;

  const send = () => {
    if (!confirmed) {
      toast({ title: t('task.review.confirmFirst'), variant: 'error' });
      return;
    }

    submit.mutate(task.data.id, {
      onSuccess: () => {
        toast({ title: t('task.review.submitted'), variant: 'success' });
        navigate(`/app/tasks/${task.data.id}`);
      },
      onError: () => {
        toast({ title: t('common.states.error'), variant: 'error' });
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <TaskStepper current={3} />

      <div className="flex flex-col gap-4">
        {task.data.definition.sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{localize(section.title, i18n.language)}</CardTitle>
                <Link to={`/app/tasks/${task.data.id}/edit`}>
                  <Button size="sm" variant="secondary">
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                    {t('common.actions.edit')}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {section.fields.map((field) => (
                <ReviewRow
                  key={field.key}
                  label={localize(field.label, i18n.language)}
                  value={payload[field.key]}
                />
              ))}
            </CardBody>
          </Card>
        ))}

        {task.data.attachments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('task.review.attachments')}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              {task.data.attachments.map((attachment) => (
                <p key={attachment.id} className="text-sm text-ink-700">
                  {attachment.fileName}
                </p>
              ))}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardBody className="flex flex-col gap-4">
            <p className="text-[15px] text-ink-700">{t('task.review.feeNote')}</p>

            <Checkbox
              checked={confirmed}
              label={t('task.review.confirmLabel')}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />

            <div className="flex flex-wrap gap-3">
              <Button disabled={!confirmed} loading={submit.isPending} onClick={send}>
                {t('task.review.submit')}
              </Button>
              <Link to={`/app/tasks/${task.data.id}/edit`}>
                <Button variant="secondary">{t('common.actions.back')}</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: unknown }) {
  const { t } = useTranslation();

  if (value === undefined || value === null || value === '') return null;

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-ink-500">{label}</span>
        <ul className="flex flex-col gap-1">
          {value.map((row, index) => (
            <li key={index} className="text-[15px] text-ink-900">
              {typeof row === 'object' && row !== null
                ? Object.values(row as Record<string, unknown>)
                    .filter((entry) => entry !== undefined && entry !== null && entry !== '')
                    .join(' · ')
                : String(row)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-ink-500">{label}</span>
        <span className="text-[15px] text-ink-900">
          {value ? t('common.actions.yes') : t('common.actions.no')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="text-[15px] text-ink-900">{String(value)}</span>
    </div>
  );
}
