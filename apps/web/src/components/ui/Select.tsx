import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFormField } from './FormField';

export interface SelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, id, invalid, options, placeholder, ...rest },
  ref,
) {
  const field = useFormField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const selectId = id ?? field?.id;
  const describedBy =
    [field?.hasHint ? field.hintId : null, field?.hasError ? field.errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="relative flex items-center">
      <select
        ref={ref}
        id={selectId}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-input w-full appearance-none rounded-control border bg-surface px-3 pr-10 text-[15px] text-ink-900',
          'focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-brand-500',
          isInvalid ? 'border-danger-text' : 'border-line focus:border-brand-500',
          className,
        )}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 h-4 w-4 text-ink-500"
      />
    </div>
  );
});
