import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { useFormField } from './FormField';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, id, invalid, rows = 4, ...rest },
  ref,
) {
  const field = useFormField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const textareaId = id ?? field?.id;
  const describedBy =
    [field?.hasHint ? field.hintId : null, field?.hasError ? field.errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <textarea
      ref={ref}
      id={textareaId}
      rows={rows}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        'w-full rounded-control border bg-surface px-3 py-2.5 text-[15px] text-ink-900 transition-colors',
        'placeholder:text-ink-500',
        'focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-brand-500',
        isInvalid ? 'border-danger-text' : 'border-line focus:border-brand-500',
        className,
      )}
      {...rest}
    />
  );
});
