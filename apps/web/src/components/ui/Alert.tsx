import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  action?: ReactNode;
  className?: string;
  message: ReactNode;
  title?: ReactNode;
  tone?: AlertTone;
}

const tones: Record<AlertTone, { box: string; icon: string }> = {
  info: { box: 'border-brand-100 bg-brand-50', icon: 'text-brand-500' },
  success: { box: 'border-brand-100 bg-brand-50', icon: 'text-brand-500' },
  warning: { box: 'border-warning-bg bg-warning-bg', icon: 'text-warning-text' },
  danger: { box: 'border-danger-bg bg-danger-bg', icon: 'text-danger-text' },
};

/** An inline banner for a message that needs attention. */
export function Alert({ action, className, message, title, tone = 'info' }: AlertProps) {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'danger'
          ? XCircle
          : Info;

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-panel border p-4', tones[tone].box, className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 h-5 w-5 shrink-0', tones[tone].icon)} />

      <div className="flex flex-1 flex-col gap-1">
        {title ? <p className="text-[15px] font-bold text-ink-900">{title}</p> : null}
        <div className="text-sm text-ink-700">{message}</div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
