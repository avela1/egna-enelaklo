import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, FileText, Package, ShoppingBag } from 'lucide-react';
import { Button, Card, CardBody, Skeleton } from '@/components/ui';
import { localize } from '@egna-enelaklo/shared';
import { useCreateTask, useServices, type ServiceSummary } from '../api';

const ICONS: Record<string, typeof ShoppingBag> = {
  'file-text': FileText,
  package: Package,
  'shopping-bag': ShoppingBag,
};

export function ChooseServicePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const services = useServices();
  const createTask = useCreateTask();

  const start = async (service: ServiceSummary) => {
    const task = await createTask.mutateAsync(service.key);
    navigate(`/app/tasks/${task.id}/edit`);
  };

  return (
    <div className="flex flex-col gap-6">
      <TaskStepper current={1} />

      {services.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(services.data ?? []).map((service) => (
            <ServiceCard
              key={service.id}
              onStart={() => void start(service)}
              pending={createTask.isPending}
              service={service}
            />
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardBody className="flex flex-col items-center gap-2 py-8 text-center">
          <Briefcase aria-hidden="true" className="h-6 w-6 text-ink-500" />
          <p className="text-[15px] font-semibold text-ink-700">{t('task.choose.moreServices')}</p>
          <p className="max-w-md text-sm text-ink-500">{t('task.choose.moreServicesHint')}</p>
        </CardBody>
      </Card>

      <div className="rounded-panel border border-brand-100 bg-brand-50 p-4">
        <p className="text-[15px] text-ink-700">
          {t('task.choose.prohibitedHint')}{' '}
          <Link
            to="/app/help"
            className="font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {t('task.choose.readRules')}
          </Link>
        </p>
      </div>

      <p className="sr-only">{i18n.language}</p>
    </div>
  );
}

function ServiceCard({
  onStart,
  pending,
  service,
}: {
  onStart: () => void;
  pending: boolean;
  service: ServiceSummary;
}) {
  const { t, i18n } = useTranslation();
  const Icon = ICONS[service.icon] ?? Briefcase;

  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex flex-1 flex-col gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-panel bg-brand-50 text-brand-500">
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>

        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-lg font-bold text-ink-900">
            {localize(service.name, i18n.language)}
          </h3>
          <p className="text-sm text-ink-500">
            {localize(service.description.summary, i18n.language)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
            {t('task.choose.youProvide')}
          </p>
          <ul className="flex flex-col gap-1">
            {service.description.youProvide.map((item) => (
              <li key={item.en} className="flex items-start gap-2 text-sm text-ink-700">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                />
                {localize(item, i18n.language)}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-ink-700">
          <span className="font-semibold">{t('task.choose.youReceive')}: </span>
          {localize(service.description.youReceive, i18n.language)}
        </p>

        <div className="mt-auto pt-2">
          <Button className="w-full" disabled={pending} onClick={onStart}>
            {t('task.choose.start')}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function TaskStepper({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useTranslation();

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {(['choose', 'details', 'review'] as const).map((key, index) => {
        const step = (index + 1) as 1 | 2 | 3;
        const state = step < current ? 'done' : step === current ? 'current' : 'upcoming';

        return (
          <li key={key} className="flex flex-1 items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                state === 'done'
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : state === 'current'
                    ? 'border-brand-500 bg-surface text-brand-700'
                    : 'border-line bg-surface text-ink-500'
              }`}
            >
              {step}
            </span>
            <span
              className={`text-[15px] font-semibold ${
                state === 'upcoming' ? 'text-ink-500' : 'text-ink-900'
              }`}
            >
              {t(`task.steps.${key}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
