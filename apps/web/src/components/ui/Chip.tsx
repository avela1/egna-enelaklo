import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ChipVariant = 'neutral' | 'brand' | 'warning' | 'danger' | 'outline';

export interface ChipProps {
  children: ReactNode;
  className?: string;
  variant?: ChipVariant;
}

const variants: Record<ChipVariant, string> = {
  neutral: 'bg-chip-bg text-chip-text',
  brand: 'bg-brand-50 text-brand-700',
  warning: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
  outline: 'border border-brand-500 text-brand-700',
};

export function Chip({ children, className, variant = 'neutral' }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-chip',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
