import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useFormField } from './FormField';

export interface SwitchProps {
  checked?: boolean;
  className?: string;
  defaultChecked?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  label: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  checked,
  className,
  defaultChecked,
  description,
  disabled = false,
  id,
  label,
  onCheckedChange,
}: SwitchProps) {
  const generatedId = useId();
  const field = useFormField();
  const switchId = id ?? field?.id ?? generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col">
        <label htmlFor={switchId} className="text-[15px] font-semibold text-ink-700">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-xs text-ink-500">
            {description}
          </p>
        ) : null}
      </div>

      <SwitchPrimitive.Root
        id={switchId}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={descriptionId}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill border border-line bg-canvas transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-500',
          disabled ? 'cursor-not-allowed opacity-60' : undefined,
        )}
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-surface shadow-sm transition-transform data-[state=checked]:translate-x-6" />
      </SwitchPrimitive.Root>
    </div>
  );
}
