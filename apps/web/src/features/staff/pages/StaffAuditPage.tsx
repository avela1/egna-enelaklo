import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  FormField,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { apiRequest, API_BASE_URL } from '@/lib/api';

interface AuditRow {
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string;
  createdAt: string;
  detail: string | null;
  id: string;
  ip: string | null;
  targetId: string;
  targetType: string;
}

interface AuditList {
  items: AuditRow[];
  page: number;
  pageSize: number;
  total: number;
}

export function StaffAuditPage() {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (action) params.set('action', action);
  if (actor) params.set('actor', actor);
  if (from) params.set('from', new Date(from).toISOString());
  if (to) params.set('to', new Date(to).toISOString());
  params.set('pageSize', '50');

  const audit = useQuery({
    queryKey: ['staff', 'audit', search, action, actor, from, to],
    queryFn: () => apiRequest<AuditList>(`/staff/audit?${params.toString()}`),
    placeholderData: (previous) => previous,
  });

  const items = audit.data?.items ?? [];

  const exportCsv = () => {
    window.open(`${API_BASE_URL}/staff/audit/export.csv?${params.toString()}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-5">
            <FormField htmlFor="audit-search" label={t('staff.audit.search')}>
              <Input
                id="audit-search"
                type="search"
                value={search}
                placeholder={t('staff.audit.searchPlaceholder')}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>

            <FormField htmlFor="audit-action" label={t('staff.audit.action')}>
              <Input
                id="audit-action"
                type="search"
                value={action}
                placeholder="user.role_changed"
                onChange={(event) => setAction(event.target.value)}
              />
            </FormField>

            <FormField htmlFor="audit-actor" label={t('staff.audit.actor')}>
              <Input
                id="audit-actor"
                type="search"
                value={actor}
                onChange={(event) => setActor(event.target.value)}
              />
            </FormField>

            <FormField htmlFor="audit-from" label={t('staff.audit.from')}>
              <Input
                id="audit-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </FormField>

            <FormField htmlFor="audit-to" label={t('staff.audit.to')}>
              <Input
                id="audit-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </FormField>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-ink-900">
                {t('staff.audit.title')}
              </h2>
              <p className="text-sm text-ink-500">{t('staff.audit.appendOnly')}</p>
            </div>

            <Button variant="secondary" onClick={exportCsv}>
              <Download aria-hidden="true" className="h-4 w-4" />
              {t('common.actions.exportCsv')}
            </Button>
          </div>
        </CardHeader>

        {audit.isLoading ? (
          <CardBody className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardBody>
        ) : items.length === 0 ? (
          <CardBody>
            <EmptyState
              title={t('staff.audit.empty')}
              description={t('staff.audit.emptyDescription')}
            />
          </CardBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('staff.audit.time')}</TableHead>
                <TableHead>{t('staff.audit.actor')}</TableHead>
                <TableHead>{t('staff.audit.action')}</TableHead>
                <TableHead>{t('staff.audit.target')}</TableHead>
                <TableHead>{t('staff.audit.detail')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-ink-900">
                      {row.actorName ?? row.actorEmail ?? t('staff.audit.system')}
                    </span>
                    <span className="block text-xs text-ink-500">{row.actorRole}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{row.action}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink-500">{row.targetType}</span>
                    <span className="block font-mono text-xs">{row.targetId}</span>
                  </TableCell>
                  <TableCell className="text-xs text-ink-500">{row.detail ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
