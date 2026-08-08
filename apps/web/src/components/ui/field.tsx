'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '@/lib/format';

const CONTROL =
  'w-full rounded-lg border border-felt-500/40 bg-felt-950/60 px-3 py-2.5 text-ink-50 placeholder:text-ink-600 ' +
  'transition-colors focus:border-brass-400 focus:outline-none aria-[invalid=true]:border-crimson-500';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
}

/**
 * Label, control, hint and error in one place.
 *
 * The error is tied to the input with `aria-describedby` and `aria-invalid`, so
 * screen readers announce it. The original rendered validation messages into a
 * detached `<ul>` elsewhere on the page with no association at all.
 */
export function Field({ label, error, hint, children }: FieldProps & { children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink-200">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-ink-400">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs font-medium text-crimson-400">
          {error}
        </span>
      )}
    </label>
  );
}

export function TextField({
  label,
  error,
  hint,
  className,
  ...props
}: ComponentProps<'input'> & FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-200">
        {label}
      </label>
      <input
        id={id}
        className={cx(CONTROL, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-crimson-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...props
}: ComponentProps<'textarea'> & FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-200">
        {label}
      </label>
      <textarea
        id={id}
        className={cx(CONTROL, 'min-h-40 resize-y', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-crimson-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...props
}: ComponentProps<'select'> & FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-200">
        {label}
      </label>
      <select id={id} className={cx(CONTROL, className)} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-crimson-400">
          {error}
        </p>
      )}
    </div>
  );
}
