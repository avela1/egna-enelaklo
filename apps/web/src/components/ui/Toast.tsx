import * as ToastPrimitive from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  description?: string;
  duration?: number;
  title: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setItems((current) => [...current, { ...options, id }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      <ToastContext.Provider value={value}>{children}</ToastContext.Provider>

      {items.map((item) => (
        <ToastPrimitive.Root
          key={item.id}
          duration={item.duration ?? 5000}
          onOpenChange={(open) => {
            if (!open) dismiss(item.id);
          }}
          className={cn(
            'flex items-start gap-3 rounded-panel border border-line bg-surface p-4',
            'data-[state=open]:animate-fade-in',
          )}
        >
          <ToastIcon variant={item.variant ?? 'info'} />
          <div className="flex flex-1 flex-col gap-1">
            <ToastPrimitive.Title className="text-[15px] font-semibold text-ink-900">
              {item.title}
            </ToastPrimitive.Title>
            {item.description ? (
              <ToastPrimitive.Description className="text-sm text-ink-500">
                {item.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          <ToastPrimitive.Close
            aria-label="Close"
            className="rounded-control p-1 text-ink-500 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}

      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const classes = 'mt-0.5 h-5 w-5 shrink-0';

  switch (variant) {
    case 'success':
      return <CheckCircle2 aria-hidden="true" className={cn(classes, 'text-brand-500')} />;
    case 'warning':
      return <AlertTriangle aria-hidden="true" className={cn(classes, 'text-warning-text')} />;
    case 'error':
      return <XCircle aria-hidden="true" className={cn(classes, 'text-danger-text')} />;
    default:
      return <Info aria-hidden="true" className={cn(classes, 'text-ink-500')} />;
  }
}

/** Imperative toast API: `const { toast } = useToast(); toast({ title: 'Saved' })`. */
export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
