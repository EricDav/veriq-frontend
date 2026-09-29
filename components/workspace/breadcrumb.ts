import type { NavItem } from './nav';

export interface Crumb {
  label: string;
  /** Present only when the crumb leads somewhere that exists; the current page is never a link. */
  href?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** A record's id has no meaning in a trail; it becomes "Details" so the crumb still reads. */
function isIdSegment(segment: string): boolean {
  return UUID.test(segment) || OBJECT_ID.test(segment) || /^\d+$/.test(segment);
}

function prettify(segment: string): string {
  const words = segment.replace(/-/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The trail for the workspace header: `Dashboard / Wallet`, `Dashboard / Refunds / Details`.
 *
 * The prototype renders `Dashboard / dashboard` — it appends the raw route slug to a fixed root
 * crumb, so on the dashboard itself the same page is named twice, in two different cases. Here the
 * root crumb is the role's own dashboard home and the rest of the trail comes from the path, with a
 * segment that only repeats the crumb before it dropped.
 *
 * A crumb links only when the path it points at is a real destination (a nav item, or the home);
 * intermediate segments that are not routable stay plain text rather than becoming a broken link.
 */
export function buildBreadcrumb(
  pathname: string,
  items: readonly NavItem[],
  homeHref: string,
  homeLabel = 'Dashboard',
): Crumb[] {
  const byHref = new Map(items.map((item) => [item.href, item.label]));
  const crumbs: Crumb[] = [{ label: homeLabel, href: pathname === homeHref ? undefined : homeHref }];

  const segments = pathname.split('/').filter(Boolean);
  let cumulative = '';

  for (const segment of segments) {
    cumulative += `/${segment}`;
    // Everything up to and including the role's home is already the root crumb.
    if (homeHref === cumulative || homeHref.startsWith(`${cumulative}/`)) continue;

    const known = byHref.get(cumulative);
    const label = known ?? (isIdSegment(segment) ? 'Details' : prettify(segment));
    const isLast = cumulative === pathname;

    if (crumbs[crumbs.length - 1]?.label.toLowerCase() === label.toLowerCase()) continue;

    crumbs.push({ label, href: isLast || !known ? undefined : cumulative });
  }

  return crumbs;
}
