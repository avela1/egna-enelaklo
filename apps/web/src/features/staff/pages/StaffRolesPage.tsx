import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { ApiError, apiRequest } from '@/lib/api';
import { cn } from '@/lib/cn';

interface RoleItem {
  description: string;
  locked: boolean;
  name: string;
  permissions: string[];
}

interface PermissionItem {
  description: string;
  key: string;
}

interface RolesResponse {
  items: RoleItem[];
  permissions: PermissionItem[];
}

export function StaffRolesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const roles = useQuery({
    queryKey: ['staff', 'roles'],
    queryFn: () => apiRequest<RolesResponse>('/staff/roles'),
  });

  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!roles.data) return;

    const initial: Record<string, string[]> = {};
    for (const role of roles.data.items) initial[role.name] = [...role.permissions];
    setDraft(initial);
  }, [roles.data]);

  const save = useMutation({
    mutationFn: (values: { permissions: string[]; role: string }) =>
      apiRequest<{ name: string; permissions: string[] }>(
        `/staff/roles/${values.role}/permissions`,
        { method: 'PUT', body: { permissions: values.permissions } },
      ),
    onSuccess: async () => {
      await roles.refetch();
      setConfirmOpen(false);
      toast({ title: t('staff.roles.saved'), variant: 'success' });
    },
    onError: (error) => {
      toast({
        title: t('common.states.error'),
        description: error instanceof ApiError ? error.message : t('common.states.error'),
        variant: 'error',
      });
    },
  });

  const toggle = (role: string, permission: string) => {
    setDraft((current) => {
      const list = current[role] ?? [];
      const next = list.includes(permission)
        ? list.filter((key) => key !== permission)
        : [...list, permission];

      return { ...current, [role]: next };
    });
  };

  if (roles.isLoading) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardBody>
      </Card>
    );
  }

  const items = roles.data?.items ?? [];
  const permissions = roles.data?.permissions ?? [];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>{t('staff.roles.title')}</CardTitle>
          <p className="text-sm text-ink-500">{t('staff.roles.serverChecked')}</p>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('staff.roles.permission')}</TableHead>
              {items.map((role) => (
                <TableHead key={role.name} className="text-center">
                  {t(`role.${role.name}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.key}>
                <TableCell>
                  <span className="font-semibold text-ink-900">{permission.key}</span>
                  <span className="block text-xs text-ink-500">{permission.description}</span>
                </TableCell>

                {items.map((role) => {
                  const checked = (draft[role.name] ?? []).includes(permission.key);

                  return (
                    <TableCell key={role.name} className="text-center">
                      <label className="inline-flex cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded-[6px] border-line text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          checked={checked}
                          disabled={role.locked}
                          onChange={() => toggle(role.name, permission.key)}
                          aria-label={`${t(`role.${role.name}`)}: ${permission.key}`}
                        />
                      </label>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <CardFooter className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-xs text-ink-500">
            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            {t('staff.roles.adminLocked')}
          </p>

          <Button onClick={() => setConfirmOpen(true)}>{t('common.actions.save')}</Button>
        </CardFooter>
      </Card>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('staff.roles.confirmTitle')}
        description={t('staff.roles.confirmDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              loading={save.isPending}
              onClick={() => {
                for (const role of items) {
                  if (role.locked) continue;
                  void save.mutateAsync({ role: role.name, permissions: draft[role.name] ?? [] });
                }
                setConfirmOpen(false);
              }}
            >
              {t('common.actions.save')}
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2 text-sm text-ink-700">
          {items
            .filter((role) => !role.locked)
            .map((role) => (
              <li key={role.name} className="flex items-center gap-2">
                <span className={cn('font-semibold text-ink-900')}>{t(`role.${role.name}`)}</span>
                <span>
                  {t('staff.roles.permissionCount', {
                    count: (draft[role.name] ?? []).length,
                  })}
                </span>
              </li>
            ))}
        </ul>
      </Modal>
    </div>
  );
}
