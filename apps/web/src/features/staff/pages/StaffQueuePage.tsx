import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  EmptyState,
  Modal,
  Skeleton,
  StatusChip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { apiRequest } from '@/lib/api';

interface StaffTaskRow {
  createdAt: string;
  customerEmail: string;
  customerName: string;
  id: string;
  ref: string;
  serviceName: { en: string };
  status: string;
  subCity: string | null;
  submittedAt: string | null;
}

export function StaffQueuePage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<StaffTaskRow | null>(null);

  const tasks = useQuery({
    queryKey: ['staff', 'tasks'],
    queryFn: () => apiRequest<{ items: StaffTaskRow[]; total: number }>('/staff/tasks?pageSize=50'),
  });

  const items = tasks.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" message={t('staff.queue.temporary')} />

      <Card>
        {tasks.isLoading ? (
          <CardBody className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardBody>
        ) : items.length === 0 ? (
          <CardBody>
            <EmptyState
              title={t('staff.queue.empty')}
              description={t('staff.queue.emptyDescription')}
            />
          </CardBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('staff.queue.reference')}</TableHead>
                <TableHead>{t('staff.queue.service')}</TableHead>
                <TableHead>{t('staff.queue.customer')}</TableHead>
                <TableHead>{t('staff.queue.subCity')}</TableHead>
                <TableHead>{t('staff.queue.status')}</TableHead>
                <TableHead>{t('staff.queue.submitted')}</TableHead>
                <TableHead className="text-right">{t('staff.queue.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-xs">{task.ref}</TableCell>
                  <TableCell>{task.serviceName.en}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-ink-900">{task.customerName}</span>
                    <span className="block text-xs text-ink-500">{task.customerEmail}</span>
                  </TableCell>
                  <TableCell className="text-sm text-ink-500">{task.subCity ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={task.status as never} />
                  </TableCell>
                  <TableCell className="text-sm text-ink-500">
                    {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => setOpen(task)} size="sm" variant="secondary">
                      <Eye aria-hidden="true" className="h-4 w-4" />
                      {t('common.actions.view')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        open={open !== null}
        onOpenChange={(value) => {
          if (!value) setOpen(null);
        }}
        title={open ? `${t('staff.queue.detail')} ${open.ref}` : ''}
        description={open?.serviceName.en}
      >
        {open ? (
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-xs text-ink-500">{t('staff.queue.customer')}</dt>
              <dd className="text-[15px] text-ink-900">
                {open.customerName} ({open.customerEmail})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">{t('staff.queue.subCity')}</dt>
              <dd className="text-[15px] text-ink-900">{open.subCity ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">{t('staff.queue.status')}</dt>
              <dd>
                <StatusChip status={open.status as never} />
              </dd>
            </div>
            <p className="text-sm text-ink-500">{t('staff.queue.readOnly')}</p>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
