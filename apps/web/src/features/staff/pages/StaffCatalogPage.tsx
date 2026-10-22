import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
import type { CreateServiceValues } from '@egna-enelaklo/shared';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Chip,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@/components/ui';
import { apiRequest } from '@/lib/api';

interface CatalogRow {
  draftVersion: number | null;
  id: string;
  icon: string;
  key: string;
  latestVersion: number | null;
  liveVersion: number | null;
  name: { en: string };
  sortOrder: number;
  status: string;
  updatedAt: string;
  versions: number;
}

export function StaffCatalogPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ description: '', icon: 'package', key: '', name: '' });

  const catalog = useQuery({
    queryKey: ['staff', 'catalog'],
    queryFn: () => apiRequest<CatalogRow[]>('/staff/catalog'),
  });

  const create = useMutation({
    mutationFn: (body: CreateServiceValues) =>
      apiRequest('/staff/services', { method: 'POST', body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'catalog'] });
      setOpen(false);
      toast({ title: t('staff.catalog.created'), variant: 'success' });
    },
    onError: () => {
      toast({ title: t('common.states.error'), variant: 'error' });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-sectionTitle font-bold text-ink-900">
          {t('staff.catalog.title')}
        </h2>

        <Button onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t('staff.catalog.addService')}
        </Button>
      </div>

      <Card>
        {catalog.isLoading ? (
          <CardBody className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardBody>
        ) : (catalog.data ?? []).length === 0 ? (
          <CardBody>
            <EmptyState
              title={t('staff.catalog.empty')}
              description={t('staff.catalog.emptyDescription')}
            />
          </CardBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('staff.catalog.service')}</TableHead>
                <TableHead>{t('staff.catalog.version')}</TableHead>
                <TableHead>{t('staff.catalog.status')}</TableHead>
                <TableHead>{t('staff.catalog.lastEdited')}</TableHead>
                <TableHead className="text-right">{t('staff.catalog.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(catalog.data ?? []).map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-semibold text-ink-900">{service.name.en}</TableCell>
                  <TableCell>
                    {service.liveVersion ? (
                      <span className="text-sm">
                        v{service.liveVersion} ({t('staff.catalog.live')})
                      </span>
                    ) : (
                      <span className="text-sm text-ink-500">
                        {t('staff.catalog.noLiveVersion')}
                      </span>
                    )}
                    {service.draftVersion ? (
                      <Chip className="ml-2" variant="warning">
                        v{service.draftVersion} {t('staff.catalog.draft')}
                      </Chip>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Chip
                      variant={
                        service.status === 'LIVE'
                          ? 'brand'
                          : service.status === 'DRAFT'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {t(
                        `userStatus.${service.status === 'LIVE' ? 'ACTIVE' : service.status === 'DRAFT' ? 'INVITED' : 'DISABLED'}`,
                      )}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-sm text-ink-500">
                    {new Date(service.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/staff/templates/${service.id}`}>
                      <Button size="sm" variant="secondary">
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        {t('common.actions.edit')}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('staff.catalog.noteTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-[15px] text-ink-700">{t('staff.catalog.noteBody')}</p>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={t('staff.catalog.addService')}
        description={t('staff.catalog.addServiceDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              loading={create.isPending}
              onClick={() =>
                create.mutate({
                  description: {
                    summary: { en: values.description },
                    youProvide: [],
                    youReceive: { en: values.description },
                  },
                  icon: values.icon,
                  key: values.key,
                  name: { en: values.name },
                })
              }
            >
              {t('staff.catalog.create')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField htmlFor="service-key" label={t('staff.catalog.key')}>
            <Input
              id="service-key"
              onChange={(event) => setValues({ ...values, key: event.target.value })}
              placeholder="buy_and_deliver"
              value={values.key}
            />
          </FormField>

          <FormField htmlFor="service-name" label={t('staff.catalog.name')}>
            <Input
              id="service-name"
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              value={values.name}
            />
          </FormField>

          <FormField htmlFor="service-description" label={t('staff.catalog.description')}>
            <Input
              id="service-description"
              onChange={(event) => setValues({ ...values, description: event.target.value })}
              value={values.description}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
