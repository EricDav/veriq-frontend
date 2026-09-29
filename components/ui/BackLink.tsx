import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BackLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}

/**
 * The prototype's `.back`: the step back out of a detail screen, sitting above the page head. A real
 * link, so it is reachable by keyboard and openable in a new tab.
 *
 * For the route back to the dashboard itself use {@link BackToDashboard}, which knows where each
 * role's home is.
 */
export function BackLink({ href, children, className, onNavigate }: BackLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'mb-[25px] inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <ChevronLeft aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
      {children}
    </Link>
  );
}
