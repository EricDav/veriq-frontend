'use client';

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { buttonClass } from './Button';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * The dashboard home for a role. Operators land on their own dashboard rather than the renter overview, so the
 * route back always reaches a page the account can actually use.
 */
export function dashboardHomeFor(role?: UserRole | string): string {
  if (role === UserRole.PROPERTY_OPERATOR) return '/dashboard/operator';
  if (role === UserRole.SHORT_LET_OPERATOR) return '/dashboard/operator-properties';
  return '/dashboard';
}

/**
 * A clear route back to the user dashboard, required on every authenticated page (Master Blueprint §7
 * Navigation). Rendered once in the dashboard shell and on the authenticated pages that sit outside it, so the
 * rule lives in one component instead of copied markup.
 */
export function BackToDashboard({
  variant = 'link',
  className,
  labelClassName,
  label = 'Back to dashboard',
  onNavigate,
}: {
  variant?: 'link' | 'button' | 'ghost';
  className?: string;
  /** Lets a tight header hide the words on the narrowest screens while keeping the icon and the accessible name. */
  labelClassName?: string;
  label?: string;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const href = dashboardHomeFor(user?.role);
  // On the prototype's tokens: the surface behind this is always dark.
  const styles = {
    link: cn(
      'inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
      FOCUS,
    ),
    button: buttonClass('secondary', 'small'),
    ghost: buttonClass('ghost', 'small'),
  }[variant];

  return (
    <Link href={href} onClick={onNavigate} aria-label={label} className={cn(styles, className)}>
      <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
      <span className={labelClassName}>{label}</span>
    </Link>
  );
}
