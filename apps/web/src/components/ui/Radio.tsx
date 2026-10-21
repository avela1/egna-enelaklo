import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface RadioGroupProps {
  children: ReactNode;
  className?: string;
  defaultValue?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  value?: string;
}

export function RadioGroup({
  children,
  className,
  defaultValue,
  name,
  onValueChange,
  orientation = 'vertical',
  value,
}: RadioGroupProps) {
  const generatedName = useId();

  return (
    <RadioGroupPrimitive.Root
      name={name ?? generatedName}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation={orientation}
      className={cn(
        'flex gap-3',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center',
        className,
      )}
    >
      {children}
    </RadioGroupPrimitive.Root>
  );
}

export interface RadioProps {
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  label: ReactNode;
  value: string;
}

export function Radio({ className, description, disabled = false, id, label, value }: RadioProps) {
  const generatedId = useId();
  const radioId = id ?? generatedId;
  const descriptionId = description ? `${radioId}-description` : undefined;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <RadioGroupPrimitive.Item
        id={radioId}
        value={value}
        disabled={disabled}
        aria-describedby={descriptionId}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-surface transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'data-[state=checked]:border-brand-500',
          disabled ? 'cursor-not-allowed opacity-60' : 'border-line',
        )}
      >
        <RadioGroupPrimitive.Indicator className="h-2.5 w-2.5 rounded-full bg-brand-500" />
      </RadioGroupPrimitive.Item>

      <div className="flex flex-col">
        <label htmlFor={radioId} className="text-[15px] leading-6 text-ink-700">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-xs text-ink-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
