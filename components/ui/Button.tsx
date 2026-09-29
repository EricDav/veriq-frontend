import { Children, cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'default' | 'small';

/**
 * Inter **SemiBold (600)**, not Inter Medium. Master Blueprint §7 specifies Medium for buttons; the
 * interactive prototype — which is the design reference every screen is being matched to — uses 600,
 * so the prototype wins. Change this only if the prototype changes.
 */
const BASE =
  'inline-flex items-center justify-center gap-[9px] whitespace-nowrap rounded-btn border border-transparent ' +
  'font-sans font-semibold leading-[1.4] transition-all duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background ' +
  'disabled:pointer-events-none disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-[#34d399] hover:-translate-y-px',
  secondary: 'border-input bg-[#ffffff06] text-foreground hover:bg-[#ffffff12]',
  ghost: 'bg-transparent text-muted-foreground hover:text-foreground',
};

/** Ghost carries its own square padding; `small` overrides it, exactly as the prototype's cascade does. */
const PADDING: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { default: 'px-5 py-3 text-ui-md', small: 'px-3 py-2 text-ui-sm' },
  secondary: { default: 'px-5 py-3 text-ui-md', small: 'px-3 py-2 text-ui-sm' },
  ghost: { default: 'p-2 text-ui-md', small: 'px-3 py-2 text-ui-sm' },
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'default', className?: string) {
  return cn(BASE, VARIANTS[variant], PADDING[variant][size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Renders the single child element with the button styling instead of a `<button>`, so a
   * `next/link` keeps real link semantics (right-click, middle-click, prefetch) while looking
   * like a button. This mirrors the codebase's existing `<Link className="btn-…">` habit.
   */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'default', asChild = false, className, type, children, ...rest },
  ref,
) {
  const classes = buttonClass(variant, size, className);

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement<{ className?: string }>(child)) {
      throw new Error('<Button asChild> expects a single React element child.');
    }
    return cloneElement(child as ReactElement<{ className?: string }>, {
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button {...rest} ref={ref} type={type ?? 'button'} className={classes}>
      {children}
    </button>
  );
});
