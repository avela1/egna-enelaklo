import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Package, Paperclip, Plus } from 'lucide-react';
import { Button, Card, CardBody, Chip, EmptyState, Skeleton, StatusChip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useTasks, type TaskListItem } from '../api';

type Filter = 'all' | 'active' | 'completed';

export function TaskListPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const all = useTasks();
  const active = useTasks('active');
  const completed = useTasks('completed');

  const counts = {
    active: active.data?.items.length ?? 0,
    completed: completed.data?.items.length ?? 0,
    waiting:
      all.data?.items.filter((task) => task.status === 'DRAFT' || task.status === 'NEEDS_INFO')
        .length ?? 0,
  };

  const items = useMemo(() => {
    const source =
      filter === 'active'
        ? active.data?.items
        : filter === 'completed'
          ? completed.data?.items
          : all.data?.items;

    if (!source) return [];

    const term = search.trim().toLowerCase();
    if (!term) return source;

    return source.filter(
      (task) => task.ref.toLowerCase().includes(term) || task.title.toLowerCase().includes(term),
    );
  }, [active.data, all.data, completed.data, filter, search]);

  const isLoading = all.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-sectionTitle font-bold text-ink-900">
          {t('task.list.title')}
        </h2>

        <Link to="/app/new">
          <Button>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t('common.actions.newTask')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          icon={<ClipboardList aria-hidden="true" className="h-5 w-5" />}
          label={t('task.list.active')}
          value={counts.active}
        />
        <SummaryTile
          icon={<Package aria-hidden="true" className="h-5 w-5" />}
          label={t('task.list.waitingForYou')}
          value={counts.waiting}
        />
        <SummaryTile
          icon={<ClipboardList aria-hidden="true" className="h-5 w-5" />}
          label={t('task.list.completed')}
          value={counts.completed}
        />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'active', 'completed'] as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  'h-control rounded-pill px-4 text-sm font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  filter === key
                    ? 'bg-ink-900 text-white'
                    : 'bg-canvas text-ink-700 hover:bg-brand-50',
                )}
              >
                {t(`task.list.filter.${key}`)}
              </button>
            ))}

            <input
              type="search"
              value={search}
              placeholder={t('task.list.searchPlaceholder')}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t('task.list.searchPlaceholder')}
              className="h-control ml-auto w-full max-w-xs rounded-control border border-line bg-surface px-3 text-[15px] text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title={t('task.list.empty')}
              description={t('task.list.emptyDescription')}
              action={
                <Link to="/app/new">
                  <Button>
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('common.actions.newTask')}
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {items.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-500">
          {icon}
        </span>
        <span className="flex flex-col">
          <span className="text-sm text-ink-500">{label}</span>
          <span className="font-heading text-2xl font-bold text-ink-900">{value}</span>
        </span>
      </CardBody>
    </Card>
  );
}

function TaskRow({ task }: { task: TaskListItem }) {
  const { t } = useTranslation();

  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-500">{task.ref}</span>
          <StatusChip status={task.status as never} />
        </span>
        <span className="truncate text-[15px] font-semibold text-ink-900">
          {task.title || t(`services.${task.serviceKey}`)}
        </span>
        <span className="text-xs text-ink-500">
          {t(`services.${task.serviceKey}`)} · {t('task.list.updated')} {formatDate(task.updatedAt)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {task.attachmentCount > 0 ? (
          <span
            aria-label={t('task.attachments.aria')}
            title={t('task.attachments.aria')}
            className="flex h-control items-center gap-1 rounded-control bg-brand-50 px-2 text-sm font-semibold text-brand-700"
          >
            <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
            {task.attachmentCount}
          </span>
        ) : null}
        {task.status === 'DRAFT' ? <Chip variant="warning">{t('task.list.draft')}</Chip> : null}
        <Link to={`/app/tasks/${task.id}`}>
          <Button size="sm" variant="secondary">
            {task.status === 'DRAFT' ? t('task.list.continueDraft') : t('common.actions.open')}
          </Button>
        </Link>
      </div>
    </li>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}
