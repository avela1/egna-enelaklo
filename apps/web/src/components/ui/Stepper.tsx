import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StepperStep {
  description?: string;
  id: string;
  label: string;
}

export interface StepperProps {
  className?: string;
  currentIndex: number;
  steps: StepperStep[];
}

type StepState = 'done' | 'current' | 'upcoming';

function stateFor(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'current';
  return 'upcoming';
}

export function Stepper({ className, currentIndex, steps }: StepperProps) {
  return (
    <ol className={cn('flex flex-col gap-4 sm:flex-row sm:items-start', className)}>
      {steps.map((step, index) => {
        const state = stateFor(index, currentIndex);
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className="flex flex-1 items-start gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
                  state === 'done' && 'border-brand-500 bg-brand-500 text-white',
                  state === 'current' && 'border-brand-500 bg-surface text-brand-700',
                  state === 'upcoming' && 'border-line bg-surface text-ink-500',
                )}
              >
                {state === 'done' ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
              </span>
            </div>

            <div className="flex flex-col pb-6">
              <span
                className={cn(
                  'text-[15px] font-semibold',
                  state === 'upcoming' ? 'text-ink-500' : 'text-ink-900',
                )}
              >
                {step.label}
              </span>
              {step.description ? (
                <span className="text-xs text-ink-500">{step.description}</span>
              ) : null}
            </div>

            {isLast ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  'mt-4 hidden h-0.5 flex-1 sm:block',
                  state === 'done' ? 'bg-brand-500' : 'bg-line',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
