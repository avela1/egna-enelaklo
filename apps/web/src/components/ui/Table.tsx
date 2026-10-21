import {
  createElement,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Responsive table: the wrapper scrolls horizontally on narrow screens so the
 * columns never squash together.
 */
export function Table({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)} {...rest}>
      <table className="w-full min-w-[640px] border-collapse text-left">{children}</table>
    </div>
  );
}

export function TableHeader({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return createElement(
    'thead',
    { className: cn('bg-canvas text-ink-500', className), ...rest },
    children,
  );
}

export function TableBody({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return createElement(
    'tbody',
    { className: cn('divide-y divide-line', className), ...rest },
    children,
  );
}

export function TableRow({ children, className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return createElement('tr', { className: cn('bg-surface', className), ...rest }, children);
}

export function TableHead({
  children,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return createElement(
    'th',
    {
      scope: 'col',
      className: cn(
        'whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-500',
        className,
      ),
      ...rest,
    },
    children,
  );
}

export function TableCell({
  children,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return createElement(
    'td',
    { className: cn('px-4 py-3 text-[15px] text-ink-700', className), ...rest },
    children,
  );
}
