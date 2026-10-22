import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  useToast,
} from '@/components/ui';
import { ApiError, apiRequest } from '@/lib/api';
import { useAuth } from '@/features/auth/auth-context';
import { LanguagePicker } from './LanguagePicker';

/** The profile of the signed in person: name, phone, language and password. */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, refresh, signOutAll } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [locale, setLocale] = useState(user?.locale ?? 'en');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordRules = [
    { met: newPassword.length >= 10, label: t('auth.passwordRuleLength') },
    { met: /[A-Za-z]/.test(newPassword), label: t('auth.passwordRuleLetter') },
    { met: /[0-9]/.test(newPassword), label: t('auth.passwordRuleNumber') },
  ];

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setLocale(user?.locale ?? 'en');
  }, [user]);

  if (!user) return null;

  const saveProfile = async () => {
    setSavingProfile(true);

    try {
      await apiRequest('/me', {
        method: 'PATCH',
        body: { name: name.trim(), phone: phone.trim(), locale },
      });

      if (locale !== i18n.language) await i18n.changeLanguage(locale);

      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      refresh();

      toast({ title: t('profile.saved'), variant: 'success' });
    } catch (error) {
      toast({
        title: t('common.states.error'),
        description: error instanceof ApiError ? error.message : t('common.states.error'),
        variant: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setSavingPassword(true);

    try {
      await apiRequest('/me/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });

      setCurrentPassword('');
      setNewPassword('');

      toast({ title: t('auth.passwordChanged'), variant: 'success' });
    } catch (error) {
      toast({
        title: t('common.states.error'),
        description:
          error instanceof ApiError && error.code === 'WRONG_PASSWORD'
            ? t('auth.wrongCurrentPassword')
            : t('common.states.error'),
        variant: 'error',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const signOutEverywhere = async () => {
    try {
      await signOutAll();
      toast({ title: t('profile.signedOutEverywhere'), variant: 'success' });
    } catch {
      toast({ title: t('common.states.error'), variant: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.title')}</CardTitle>
          <p className="text-sm text-ink-500">{t('profile.description')}</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField htmlFor="profile-name" label={t('auth.fullName')}>
              <Input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>

            <FormField htmlFor="profile-phone" label={t('auth.phone')} hint={t('auth.phoneHint')}>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </FormField>
          </div>

          <FormField label={t('auth.language')} htmlFor="profile-language">
            <LanguagePicker
              value={locale}
              onChange={(value) => {
                setLocale(value);
                void i18n.changeLanguage(value);
              }}
            />
          </FormField>

          <div className="flex justify-end">
            <Button onClick={saveProfile} loading={savingProfile}>
              {t('common.actions.save')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.changePasswordTitle')}</CardTitle>
          <p className="text-sm text-ink-500">{t('profile.changePasswordDescription')}</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField htmlFor="profile-current-password" label={t('auth.currentPassword')}>
              <Input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </FormField>

            <FormField
              htmlFor="profile-new-password"
              label={t('auth.newPassword')}
              error={
                newPassword && !passwordRules.every((rule) => rule.met)
                  ? t('validation.passwordTooShort')
                  : undefined
              }
            >
              <Input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </FormField>

            <ul className="flex flex-col gap-1.5" aria-label={t('auth.passwordRules')}>
              {passwordRules.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-sm ${
                    rule.met ? 'text-brand-700' : 'text-ink-500'
                  }`}
                >
                  {rule.met ? (
                    <Check aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <X aria-hidden="true" className="h-4 w-4" />
                  )}
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={changePassword}
              loading={savingPassword}
              disabled={!currentPassword || newPassword.length < 10}
            >
              {t('auth.changePassword')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.sessionsTitle')}</CardTitle>
          <p className="text-sm text-ink-500">{t('profile.sessionsDescription')}</p>
        </CardHeader>
        <CardBody className="flex justify-end">
          <Button variant="danger" onClick={signOutEverywhere}>
            {t('auth.signOutAllDevices')}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
