import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useFormField } from './FormField';

export interface CheckboxProps {
  checked?: boolean;
  className?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  id?: string;
  label: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
}

export function Checkbox({
  checked,
  className,
  defaultChecked,
  disabled = false,
  id,
  label,
  onCheckedChange,
  name,
  value,
}: CheckboxProps) {
  const generatedId = useId();
  const field = useFormField();
  const checkboxId = id ?? field?.id ?? generatedId;
  const describedBy =
    [field?.hasHint ? field.hintId : null, field?.hasError ? field.errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <CheckboxPrimitive.Root
        id={checkboxId}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={field?.invalid || undefined}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border bg-surface transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
          field?.invalid ? 'border-danger-text' : 'border-line',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      <label htmlFor={checkboxId} className="text-[15px] leading-6 text-ink-700">
        {label}
      </label>
    </div>
  );
}
