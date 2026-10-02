'use client';

import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FieldShellProps {
  /** Ties the label to the control it wraps. */
  htmlFor?: string;
  label?: ReactNode;
  /** Renders the "Optional" marker required by Blueprint §4 and §7. */
  optional?: boolean;
  /** Renders the required marker. A field is never both required and optional. */
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}

/**
 * Label, optional/required marker, hint and error for one form control (Master Blueprint §7 Forms:
 * "label every optional field"). Errors announce themselves so a keyboard user hears the correction.
 */
export function FieldShell({
  htmlFor,
  label,
  optional = false,
  required = false,
  hint,
  error,
  className,
  labelClassName,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {/*
        The prototype writes both markers inline at the label's own size — "Account type *" and
        "Agent referral code (Optional)" — rather than colouring the asterisk or setting the word in a
        smaller chip, which read as two different type sizes on one line.
      */}
      {label && (
        <label htmlFor={htmlFor} className={cn('label', labelClassName)}>
          {label}
          {required && <span> *</span>}
          {optional && !required && <span className="font-normal"> (Optional)</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="mt-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'onChange' | 'value'> {
  id: string;
  label?: ReactNode;
  /** Blank placeholder shown first; the control always starts on it when no answer is chosen. */
  placeholder?: string;
  options: readonly SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  optional?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
  labelClassName?: string;
}

/**
 * The one select primitive for the whole app. It always begins blank on a "Select …" placeholder and never
 * preselects an answer, which is how Master Blueprint §4 ("no important field has an Unknown option or a
 * preselected answer") and §7 ("Important selects start blank, use Select placeholders … prevent unintentional
 * defaults") are enforced in a single place. Filters pass their own placeholder, for example "Any status".
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    label,
    placeholder = 'Select…',
    options,
    value,
    onValueChange,
    optional = false,
    required = false,
    hint,
    error,
    className,
    fieldClassName,
    labelClassName,
    ...rest
  },
  ref,
) {
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ');
  return (
    <FieldShell
      htmlFor={id}
      label={label}
      optional={optional}
      required={required}
      hint={hint}
      error={error}
      className={fieldClassName}
      labelClassName={labelClassName}
    >
      <select
        {...rest}
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn('input', error && 'border-destructive focus:border-destructive focus:ring-[#fb718540]', className)}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
