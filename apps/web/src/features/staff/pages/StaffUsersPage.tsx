import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, UserPlus } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  Input,
  Modal,
  RoleChip,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  UserStatusChip,
  useToast,
} from '@/components/ui';
import { ApiError, apiRequest } from '@/lib/api';
import { useAuth } from '@/features/auth/auth-context';

interface StaffUser {
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  lastLoginAt: string | null;
  locale: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
}

interface StaffUserList {
  items: StaffUser[];
  page: number;
  pageSize: number;
  total: number;
}

const ROLE_OPTIONS = ['CUSTOMER', 'TASKER', 'OPERATIONS', 'FINANCE', 'ADMIN'];
const STATUS_OPTIONS = ['ACTIVE', 'DISABLED', 'INVITED'];

export function StaffUsersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('OPERATIONS');
  const [editRole, setEditRole] = useState('OPERATIONS');

  const users = useQuery({
    queryKey: ['staff', 'users', search, role, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      params.set('pageSize', '20');

      return apiRequest<StaffUserList>(`/staff/users?${params.toString()}`);
    },
    placeholderData: (previous) => previous,
  });

  const invite = useMutation({
    mutationFn: (values: { email: string; name: string; role: string }) =>
      apiRequest<StaffUser>('/staff/users/invite', { method: 'POST', body: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'users'] });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      toast({ title: t('staff.users.invited'), variant: 'success' });
    },
    onError: (error) => {
      toast({
        title: t('common.states.error'),
        description: error instanceof ApiError ? error.message : t('common.states.error'),
        variant: 'error',
      });
    },
  });

  const changeRole = useMutation({
    mutationFn: (values: { id: string; role: string }) =>
      apiRequest<{ id: string; role: string }>(`/staff/users/${values.id}/role`, {
        method: 'PATCH',
        body: { role: values.role },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'users'] });
      setEditing(null);
      toast({ title: t('staff.users.roleChanged'), variant: 'success' });
    },
    onError: (error) => {
      toast({
        title: t('common.states.error'),
        description: error instanceof ApiError ? error.message : t('common.states.error'),
        variant: 'error',
      });
    },
  });

  const changeStatus = useMutation({
    mutationFn: (values: { id: string; status: 'disable' | 'enable' }) =>
      apiRequest<{ id: string; status: string }>(`/staff/users/${values.id}/${values.status}`, {
        method: 'POST',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'users'] });
      setEditing(null);
      toast({ title: t('staff.users.statusChanged'), variant: 'success' });
    },
    onError: (error) => {
      toast({
        title: t('common.states.error'),
        description: error instanceof ApiError ? error.message : t('common.states.error'),
        variant: 'error',
      });
    },
  });

  const items = users.data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-4">
            <FormField htmlFor="staff-users-search" label={t('staff.users.search')}>
              <Input
                id="staff-users-search"
                type="search"
                value={search}
                placeholder={t('staff.users.searchPlaceholder')}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>

            <FormField htmlFor="staff-users-role" label={t('staff.users.role')}>
              <Select
                id="staff-users-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                options={[
                  { label: t('staff.users.allRoles'), value: '' },
                  ...ROLE_OPTIONS.map((value) => ({ label: t(`role.${value}`), value })),
                ]}
              />
            </FormField>

            <FormField htmlFor="staff-users-status" label={t('staff.users.status')}>
              <Select
                id="staff-users-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={[
                  { label: t('staff.users.allStatuses'), value: '' },
                  ...STATUS_OPTIONS.map((value) => ({ label: t(`userStatus.${value}`), value })),
                ]}
              />
            </FormField>

            <div className="flex items-end">
              <Button onClick={() => setInviteOpen(true)} className="w-full">
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                {t('staff.users.invite')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        {users.isLoading ? (
          <CardBody className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardBody>
        ) : items.length === 0 ? (
          <CardBody>
            <EmptyState
              title={t('staff.users.empty')}
              description={t('staff.users.emptyDescription')}
            />
          </CardBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('staff.users.name')}</TableHead>
                <TableHead>{t('staff.users.email')}</TableHead>
                <TableHead>{t('staff.users.role')}</TableHead>
                <TableHead>{t('staff.users.status')}</TableHead>
                <TableHead>{t('staff.users.lastSignIn')}</TableHead>
                <TableHead className="text-right">{t('staff.users.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-semibold text-ink-900">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <RoleChip role={member.role} />
                  </TableCell>
                  <TableCell>
                    <UserStatusChip status={member.status} />
                  </TableCell>
                  <TableCell>
                    {member.lastLoginAt
                      ? new Date(member.lastLoginAt).toLocaleString()
                      : t('staff.users.never')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(member);
                        setEditRole(member.role);
                      }}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                      {t('common.actions.edit')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title={t('staff.users.invite')}
        description={t('staff.users.inviteDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              loading={invite.isPending}
              onClick={() =>
                invite.mutate({
                  email: inviteEmail.trim(),
                  name: inviteName.trim(),
                  role: inviteRole,
                })
              }
            >
              {t('staff.users.invite')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField htmlFor="invite-name" label={t('auth.fullName')}>
            <Input
              id="invite-name"
              type="text"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
            />
          </FormField>

          <FormField htmlFor="invite-email" label={t('auth.email')}>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </FormField>

          <FormField htmlFor="invite-role" label={t('staff.users.role')}>
            <Select
              id="invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              options={['OPERATIONS', 'FINANCE', 'ADMIN'].map((value) => ({
                label: t(`role.${value}`),
                value,
              }))}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={t('staff.users.edit')}
        description={editing?.email}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              loading={changeRole.isPending}
              onClick={() => {
                if (editing) changeRole.mutate({ id: editing.id, role: editRole });
              }}
            >
              {t('common.actions.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField htmlFor="edit-role" label={t('staff.users.role')}>
            <Select
              id="edit-role"
              value={editRole}
              onChange={(event) => setEditRole(event.target.value)}
              options={['OPERATIONS', 'FINANCE', 'ADMIN'].map((value) => ({
                label: t(`role.${value}`),
                value,
              }))}
            />
          </FormField>

          {editing?.id === currentUser?.id ? (
            <p className="text-sm text-ink-500">{t('staff.users.selfProtection')}</p>
          ) : null}

          {editing?.role === 'ADMIN' ? (
            <p className="text-sm text-ink-500">{t('staff.users.lastAdminProtection')}</p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-line pt-4">
            {editing?.status === 'ACTIVE' ? (
              <Button
                variant="danger"
                loading={changeStatus.isPending}
                onClick={() => {
                  if (editing) changeStatus.mutate({ id: editing.id, status: 'disable' });
                }}
              >
                {t('staff.users.disable')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                loading={changeStatus.isPending}
                onClick={() => {
                  if (editing) changeStatus.mutate({ id: editing.id, status: 'enable' });
                }}
              >
                {t('staff.users.enable')}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
