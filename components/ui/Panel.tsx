import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The prototype's `.panel` surface: the raised card every workspace block sits on. Padding drops from
 * 28px to 21px below 760px, which is what `wide:` encodes.
 *
 * Exported on its own so a clickable surface (StatCard, a panel-shaped link) can wear the same skin
 * without nesting an interactive element inside a `<div>`.
 */
export const panelClass = 'rounded-panel border border-[#ffffff12] bg-card p-[21px] wide:p-7';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  /** `section` when the panel is a labelled region of the page, `div` otherwise. */
  as?: Extract<ElementType, 'div' | 'section' | 'article' | 'aside'>;
  children: ReactNode;
}

export function Panel({ as: Tag = 'div', className, children, ...rest }: PanelProps) {
  return (
    <Tag {...rest} className={cn(panelClass, className)}>
      {children}
    </Tag>
  );
}
