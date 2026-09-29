import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** `neutral` is the prototype's base emerald notice; `amber` is its one variant. */
export type NoticeTone = 'neutral' | 'amber';

const TONES: Record<NoticeTone, string> = {
  neutral: 'border-[#10b98130] bg-[#10b9810b]',
  amber: 'border-[#fbbf2425] bg-[#fbbf2409]',
};

const ICON_TONES: Record<NoticeTone, string> = {
  neutral: 'text-primary',
  amber: 'text-[#fcd34d]',
};

export interface NoticeProps {
  tone?: NoticeTone;
  /** Usually a lucide icon. Rendered beside the text and hidden from assistive tech. */
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * The prototype's `.notice`: a standing explanation attached to a decision — why a fee applies, what a
 * refund covers. Amber carries `role="status"` so a notice that appears in response to something the
 * user did is announced; the neutral one is part of the page and stays silent.
 */
export function Notice({ tone = 'neutral', icon, title, children, className }: NoticeProps) {
  return (
    <div
      role={tone === 'amber' ? 'status' : undefined}
      className={cn('flex gap-3 rounded-xl border px-5 py-[18px] text-ui-md', TONES[tone], className)}
    >
      {icon && (
        <span aria-hidden="true" className={cn('mt-0.5 flex-shrink-0', ICON_TONES[tone])}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && <div className="mt-[3px] text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
