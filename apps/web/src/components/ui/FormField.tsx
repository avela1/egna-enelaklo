import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FormFieldContextValue {
  id: string;
  labelId: string;
  hintId: string;
  errorId: string;
  invalid: boolean;
  hasHint: boolean;
  hasError: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/** Returns the closest FormField context, or null when used outside a FormField. */
export function useFormField(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}

export interface FormFieldProps {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  hint?: ReactNode;
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
}

/**
 * Wraps a single form control with a real <label>, an optional hint and an
 * optional error message, and wires up `aria-describedby` / `aria-invalid`
 * for the control it wraps.
 */
export function FormField({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
  required = false,
}: FormFieldProps) {
  const generatedId = useId();
  const id = htmlFor || generatedId;
  const hasHint = Boolean(hint);
  const hasError = Boolean(error);
  const invalid = hasError;

  const value: FormFieldContextValue = {
    id,
    labelId: `${id}-label`,
    hintId: `${id}-hint`,
    errorId: `${id}-error`,
    invalid,
    hasHint,
    hasError,
  };

  return (
    <FormFieldContext.Provider value={value}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label
          id={value.labelId}
          htmlFor={id}
          className="text-sm font-semibold text-ink-700 peer-aria-[invalid=true]:text-danger-text"
        >
          {label}
          {required ? (
            <span className="ml-1 text-danger-text" aria-hidden="true">
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>

        {children}

        {hasHint ? (
          <p id={value.hintId} className="text-xs text-ink-500">
            {hint}
          </p>
        ) : null}

        {hasError ? (
          <p id={value.errorId} role="alert" className="text-xs font-semibold text-danger-text">
            {error}
          </p>
        ) : null}
      </div>
    </FormFieldContext.Provider>
  );
}
