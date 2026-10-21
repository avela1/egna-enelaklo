import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabsProps {
  children: ReactNode;
  className?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  value?: string;
}

export function Tabs({ children, className, defaultValue, onValueChange, value }: TabsProps) {
  return (
    <TabsPrimitive.Root
      className={cn('flex flex-col gap-4', className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn('flex flex-wrap items-center gap-1 border-b border-line', className)}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export interface TabsTriggerProps {
  children: ReactNode;
  className?: string;
  value: string;
}

export function TabsTrigger({ children, className, value }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'h-control rounded-pill px-4 text-[15px] font-semibold text-ink-700 transition-colors',
        'hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'data-[state=active]:bg-ink-900 data-[state=active]:text-white',
        className,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export interface TabsContentProps {
  children: ReactNode;
  className?: string;
  value: string;
}

export function TabsContent({ children, className, value }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
