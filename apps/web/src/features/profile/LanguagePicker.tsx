import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export interface LanguageOption {
  code: 'am' | 'en' | 'om';
  label: string;
  native: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'am', label: 'Amharic', native: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromoo', native: 'Afaan Oromoo' },
];

export interface LanguagePickerProps {
  className?: string;
  onChange: (locale: string) => void;
  value: string;
}

/** The three languages as selectable cards. */
export function LanguagePicker({ className, onChange, value }: LanguagePickerProps) {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('common.language.label')}
      className={cn('grid gap-3 sm:grid-cols-3', className)}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const isSelected = option.code === value;

        return (
          <button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.code)}
            className={cn(
              'flex min-h-control flex-col items-start gap-1 rounded-panel border px-4 py-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              isSelected
                ? 'border-brand-500 bg-brand-50'
                : 'border-line bg-surface hover:bg-canvas',
            )}
          >
            <span className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
              {option.native}
              {isSelected ? <Check aria-hidden="true" className="h-4 w-4 text-brand-500" /> : null}
            </span>
            <span className="text-xs text-ink-500">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
