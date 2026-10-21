import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import {
  LANGUAGE_LABELS,
  persistLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/i18n';

export interface LanguageSwitchProps {
  className?: string;
  tone?: 'light' | 'dark';
}

/** EN / አማ / OM switch. The choice is the only value kept in localStorage. */
export function LanguageSwitch({ className, tone = 'light' }: LanguageSwitchProps) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguage;

  return (
    <div
      role="group"
      aria-label={t('common.language.label')}
      className={cn(
        'inline-flex items-center gap-1 rounded-control border p-0.5',
        tone === 'dark' ? 'border-white/15 bg-white/5' : 'border-line bg-surface',
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((code) => {
        const isActive = code === current;

        return (
          <button
            key={code}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              void i18n.changeLanguage(code);
              persistLanguage(code);
            }}
            className={cn(
              'h-control rounded-[8px] px-3 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              isActive
                ? 'bg-brand-500 text-white'
                : tone === 'dark'
                  ? 'text-white/70 hover:bg-white/10'
                  : 'text-ink-700 hover:bg-canvas',
            )}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
