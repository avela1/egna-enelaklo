import { cn } from '@/lib/cn';

export interface SkeletonProps {
  className?: string;
}

/** Loading placeholder. Use it instead of spinners inside cards and tables. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-panel bg-canvas', className)} />
  );
}
