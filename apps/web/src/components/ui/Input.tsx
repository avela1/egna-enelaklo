import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useFormField } from './FormField';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, id, invalid, leadingIcon, trailingSlot, ...rest },
  ref,
) {
  const field = useFormField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const inputId = id ?? field?.id;
  const describedBy =
    [field?.hasHint ? field.hintId : null, field?.hasError ? field.errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="relative flex items-center">
      {leadingIcon ? (
        <span aria-hidden="true" className="pointer-events-none absolute left-3 text-ink-500">
          {leadingIcon}
        </span>
      ) : null}

      <input
        ref={ref}
        id={inputId}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-input w-full rounded-control border bg-surface px-3 text-[15px] text-ink-900 transition-colors',
          'placeholder:text-ink-500',
          'focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-brand-500',
          leadingIcon ? 'pl-10' : undefined,
          trailingSlot ? 'pr-12' : undefined,
          isInvalid ? 'border-danger-text' : 'border-line focus:border-brand-500',
          className,
        )}
        {...rest}
      />

      {trailingSlot ? (
        <span className="absolute right-2 flex items-center text-ink-500">{trailingSlot}</span>
      ) : null}
    </div>
  );
});
