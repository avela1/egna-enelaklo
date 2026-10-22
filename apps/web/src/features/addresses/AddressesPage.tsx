import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { SUB_CITY_LABELS } from '@egna-enelaklo/shared';
import { Button, Card, CardBody, Chip, EmptyState, Skeleton, useToast } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import { useAddresses, type AddressSummary } from '../tasks/api';
import { AddressFormModal } from './AddressFormModal';

export function AddressesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const addresses = useAddresses();

  const [editing, setEditing] = useState<AddressSummary | null>(null);
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: (id: string) => apiRequest(`/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: t('addresses.deleted'), variant: 'success' });
    },
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/addresses/${id}`, { method: 'PATCH', body: { isDefault: true } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (address: AddressSummary) => {
    setEditing(address);
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-sectionTitle font-bold text-ink-900">
          {t('addresses.title')}
        </h2>

        <Button onClick={openNew}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t('addresses.add')}
        </Button>
      </div>

      {addresses.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (addresses.data ?? []).length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<MapPin aria-hidden="true" className="h-6 w-6" />}
              title={t('addresses.empty')}
              description={t('addresses.emptyDescription')}
              action={
                <Button onClick={openNew}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {t('addresses.add')}
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(addresses.data ?? []).map((address) => (
            <Card key={address.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
                      {address.label}
                      {address.isDefault ? (
                        <Chip variant="brand">
                          <Star aria-hidden="true" className="h-3 w-3" />
                          {t('addresses.default')}
                        </Chip>
                      ) : null}
                    </span>
                    <span className="text-sm text-ink-500">
                      {SUB_CITY_LABELS[address.subCity as keyof typeof SUB_CITY_LABELS]}
                      {address.woreda ? `, ${address.woreda}` : ''}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-ink-700">{address.landmark}</p>
                <p className="text-sm text-ink-500">{address.directions}</p>
                <p className="text-sm text-ink-500">
                  {address.contactName} · {address.contactPhone}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => openEdit(address)} size="sm" variant="secondary">
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                    {t('common.actions.edit')}
                  </Button>

                  {!address.isDefault ? (
                    <Button
                      onClick={() => makeDefault.mutate(address.id)}
                      size="sm"
                      variant="secondary"
                    >
                      <Star aria-hidden="true" className="h-4 w-4" />
                      {t('addresses.makeDefault')}
                    </Button>
                  ) : null}

                  <Button onClick={() => remove.mutate(address.id)} size="sm" variant="ghost">
                    <Trash2 aria-hidden="true" className="h-4 w-4 text-danger-text" />
                    {t('common.actions.remove')}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <AddressFormModal address={editing} onClose={() => setOpen(false)} open={open} />
    </div>
  );
}
