import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TimelineProps {
  children: ReactNode;
  className?: string;
}

/**
 * The prototype's `.timeline`: what happened to a case, in order — verification steps, refund
 * decisions, audit history. An ordered list, because the order is the meaning.
 */
export function Timeline({ children, className }: TimelineProps) {
  return (
    <ol className={cn('ml-2 border-l border-[#10b98150] pl-[25px]', className)}>{children}</ol>
  );
}

export interface TimelineItemProps {
  /** When it happened. Pass an ISO string in `dateTime` if this is a formatted date. */
  meta?: ReactNode;
  dateTime?: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function TimelineItem({ meta, dateTime, title, children, className }: TimelineItemProps) {
  return (
    <li
      className={cn(
        'relative pb-7',
        "before:absolute before:left-[-30px] before:top-1.5 before:h-[9px] before:w-[9px] before:rounded-full before:bg-primary before:content-['']",
        className,
      )}
    >
      {meta &&
        (dateTime ? (
          <time dateTime={dateTime} className="text-ui-sm text-muted-foreground">
            {meta}
          </time>
        ) : (
          <span className="text-ui-sm text-muted-foreground">{meta}</span>
        ))}
      <p className="font-semibold text-foreground">{title}</p>
      {children && <div className="my-1.5 text-ui-md text-muted-foreground">{children}</div>}
    </li>
  );
}
