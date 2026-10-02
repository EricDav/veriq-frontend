import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * The prototype's auth shell: one `.panel.stack` at 620px, centred with 50px above and below, holding
 * a `.page-head`, the fields, and a `.row.wrap` of the three account links.
 *
 * It replaces the full-bleed gradient card the auth screens used to sit on — the prototype has no such
 * treatment, and auth is just another panel on the same flat background as the rest of the site.
 */
const AUTH_LINKS = [
  { href: '/auth/login', label: 'Log in' },
  { href: '/auth/register', label: 'Create account' },
  { href: '/auth/forgot-password', label: 'Forgot password?' },
];

export interface AuthPanelProps {
  /** "Welcome back", "Create your Operator account". */
  title: string;
  /** The one line under it. */
  lead: ReactNode;
  /**
   * The prototype shows the three account links on its login and signup panels. A screen in the
   * middle of a flow — verifying a code, setting a new password — turns them off, so the only way on
   * is the one the flow intends.
   */
  showLinks?: boolean;
  children: ReactNode;
}

export function AuthPanel({ title, lead, showLinks = true, children }: AuthPanelProps) {
  return (
    <main className="proto-type mx-auto max-w-[1280px] px-[22px] pb-[30px] pt-24 wide:px-10 wide:pb-[50px] wide:pt-32">
      <section className="mx-auto my-[50px] flex max-w-[620px] flex-col gap-[22px] rounded-2xl border border-[#ffffff12] bg-card p-[21px] wide:p-7">
        <div className="page-head">
          <h1 className="mb-2 font-display text-[1.7rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground wide:text-[2rem]">
            {title}
          </h1>
          <p className="text-muted-foreground">{lead}</p>
        </div>

        {children}

        {showLinks && (
          <div className="flex flex-wrap items-center gap-3 text-ui-md">
            {AUTH_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-muted-foreground transition-colors hover:text-primary">
                {label}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
