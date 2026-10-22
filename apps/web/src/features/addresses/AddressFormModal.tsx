import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SUB_CITY_LABELS, type AddressValues } from '@egna-enelaklo/shared';
import { Button, FormField, Input, Modal, Select, useToast } from '@/components/ui';
import { apiRequest } from '@/lib/api';
import type { AddressSummary } from '@/features/tasks/api';

export interface AddressFormModalProps {
  address?: AddressSummary | null;
  onClose: () => void;
  onSaved?: (address: AddressSummary) => void;
  open: boolean;
}

export function emptyAddress(): AddressValues {
  return {
    contactName: '',
    contactPhone: '',
    directions: '',
    isDefault: false,
    label: '',
    landmark: '',
    subCity: 'BOLE',
    woreda: '',
  };
}

/**
 * The address form, used by the address screen and by the request form when a
 * customer needs an address right away.
 */
export function AddressFormModal({ address, onClose, onSaved, open }: AddressFormModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AddressValues>(emptyAddress());

  const save = useMutation({
    mutationFn: (input: { id?: string; values: AddressValues }) =>
      input.id
        ? apiRequest<AddressSummary>(`/addresses/${input.id}`, {
            method: 'PATCH',
            body: input.values,
          })
        : apiRequest<AddressSummary>('/addresses', { method: 'POST', body: input.values }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast({ title: t('addresses.saved'), variant: 'success' });
      onSaved?.(saved);
      onClose();
    },
    onError: () => {
      toast({ title: t('common.states.error'), variant: 'error' });
    },
  });

  const start = () => {
    if (!address) {
      setValues(emptyAddress());
      return;
    }

    setValues({
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      directions: address.directions,
      isDefault: address.isDefault,
      label: address.label,
      landmark: address.landmark,
      subCity: address.subCity as AddressValues['subCity'],
      woreda: address.woreda ?? '',
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (value) start();
        if (!value) onClose();
      }}
      title={address ? t('addresses.edit') : t('addresses.add')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate({ id: address?.id, values })}>
            {t('common.actions.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField htmlFor="address-label" label={t('addresses.label')}>
          <Input
            id="address-label"
            onChange={(event) => setValues({ ...values, label: event.target.value })}
            value={values.label}
          />
        </FormField>

        <FormField htmlFor="address-subcity" label={t('addresses.subCity')}>
          <Select
            id="address-subcity"
            onChange={(event) =>
              setValues({ ...values, subCity: event.target.value as AddressValues['subCity'] })
            }
            options={Object.entries(SUB_CITY_LABELS).map(([value, label]) => ({ label, value }))}
            value={values.subCity}
          />
        </FormField>

        <FormField htmlFor="address-woreda" label={t('addresses.woreda')}>
          <Input
            id="address-woreda"
            onChange={(event) => setValues({ ...values, woreda: event.target.value })}
            value={values.woreda ?? ''}
          />
        </FormField>

        <FormField htmlFor="address-landmark" label={t('addresses.landmark')}>
          <Input
            id="address-landmark"
            onChange={(event) => setValues({ ...values, landmark: event.target.value })}
            value={values.landmark}
          />
        </FormField>

        <FormField htmlFor="address-directions" label={t('addresses.directions')}>
          <Input
            id="address-directions"
            onChange={(event) => setValues({ ...values, directions: event.target.value })}
            value={values.directions}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="address-contact-name" label={t('addresses.contactName')}>
            <Input
              id="address-contact-name"
              onChange={(event) => setValues({ ...values, contactName: event.target.value })}
              value={values.contactName}
            />
          </FormField>

          <FormField htmlFor="address-contact-phone" label={t('addresses.contactPhone')}>
            <Input
              id="address-contact-phone"
              onChange={(event) => setValues({ ...values, contactPhone: event.target.value })}
              placeholder="+251911234567"
              type="tel"
              value={values.contactPhone}
            />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
