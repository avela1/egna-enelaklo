import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  /** Adds the standard 20px body padding around the children. */
  padded?: boolean;
}

export function Card({ as = 'div', children, className, padded = false, ...rest }: CardProps) {
  return createElement(
    as,
    {
      className: cn('rounded-card border border-line bg-surface', className),
      ...rest,
    },
    padded ? <div className="p-5">{children}</div> : children,
  );
}

export interface CardSectionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

export function CardHeader({ as = 'div', children, className, ...rest }: CardSectionProps) {
  return createElement(
    as,
    { className: cn('flex flex-col gap-1 border-b border-line px-5 py-4', className), ...rest },
    children,
  );
}

export function CardTitle({ as = 'h2', children, className, ...rest }: CardSectionProps) {
  return createElement(
    as,
    { className: cn('font-heading text-lg font-bold text-ink-900', className), ...rest },
    children,
  );
}

export function CardDescription({ as = 'p', children, className, ...rest }: CardSectionProps) {
  return createElement(as, { className: cn('text-sm text-ink-500', className), ...rest }, children);
}

export function CardBody({ as = 'div', children, className, ...rest }: CardSectionProps) {
  return createElement(as, { className: cn('p-5', className), ...rest }, children);
}

export function CardContent({ as = 'div', children, className, ...rest }: CardSectionProps) {
  return createElement(as, { className: cn('px-5 py-4', className), ...rest }, children);
}

export function CardFooter({ as = 'div', children, className, ...rest }: CardSectionProps) {
  return createElement(
    as,
    {
      className: cn('flex flex-wrap items-center gap-3 border-t border-line px-5 py-4', className),
      ...rest,
    },
    children,
  );
}
