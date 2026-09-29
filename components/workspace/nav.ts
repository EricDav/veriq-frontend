import {
  BellRing,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileText,
  Heart,
  Home,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Mail,
  Plus,
  MapPin,
  MessageCircle,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  TrendingUp,
  Undo2,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface WorkspaceNav {
  /** The uppercase label over the role's own section, e.g. "Renter workspace". */
  roleLabel: string;
  /** What this role came here to do — the prototype's own list, in its order. */
  roleItems: readonly NavItem[];
  /**
   * Routes this product has that the prototype's sidebar does not show. They keep their own labelled
   * group rather than being dropped, so nothing becomes unreachable.
   */
  moreItems?: readonly NavItem[];
  moreLabel?: string;
  /** Below the divider: the items every role reaches the same way. */
  commonItems: readonly NavItem[];
}

const COMMON: readonly NavItem[] = [
  // The prototype's sidebar sends this to the full-width public discovery page, outside the
  // workspace shell — not to a browse screen nested in the dashboard.
  { label: 'Browse properties', href: '/properties', icon: Search },
  { label: 'Street intelligence', href: '/street-intelligence', icon: MapPin },
  { label: 'Account & profile', href: '/dashboard/profile', icon: User },
];

const RENTER: WorkspaceNav = {
  roleLabel: 'Renter workspace',
  roleItems: [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Saved properties', href: '/dashboard/saved', icon: Heart },
    { label: 'Unlock history', href: '/dashboard/unlocks', icon: KeyRound },
    { label: 'My wallet', href: '/dashboard/wallet', icon: Wallet },
    { label: 'Refund requests', href: '/dashboard/refunds', icon: Undo2 },
    // Not in the prototype: Blueprint §5 requires somewhere to see and cancel notify-me watches.
    { label: 'Availability alerts', href: '/dashboard/availability-notifications', icon: BellRing },
  ],
  commonItems: [...COMMON, { label: 'Share intelligence', href: '/dashboard/community', icon: Users }, { label: 'Chats', href: '/dashboard/chat', icon: MessageCircle }],
};

const AGENT: WorkspaceNav = {
  roleLabel: 'Agent workspace',
  roleItems: [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My operators', href: '/dashboard/agent/portfolio', icon: Users },
    { label: 'Portfolio', href: '/dashboard/agent', icon: Building2 },
    { label: 'Verification queue', href: '/dashboard/agent/verification', icon: ClipboardCheck },
    { label: 'List for an operator', href: '/dashboard/properties/new', icon: Plus },
    { label: 'Ledger', href: '/dashboard/agent/earnings', icon: Landmark },
    { label: 'My referral code', href: '/dashboard/agent/portfolio#referral', icon: Share2 },
  ],
  moreLabel: 'Also yours',
  moreItems: [
    { label: 'Pending revisions', href: '/dashboard/agent/revisions', icon: FileText },
    { label: 'Shared property', href: '/dashboard/agent/shared', icon: Users },
    { label: 'Property for sale', href: '/dashboard/agent/sales', icon: Landmark },
    { label: 'Refund confirmations', href: '/dashboard/agent/refunds', icon: Undo2 },
  ],
  commonItems: [...COMMON, { label: 'Chats', href: '/dashboard/chat', icon: MessageCircle }],
};

const ADMIN: WorkspaceNav = {
  roleLabel: 'Admin workspace',
  roleItems: [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Agent accounts', href: '/dashboard/admin/veriq-agents', icon: ShieldCheck },
    { label: 'Operators & assignments', href: '/dashboard/admin/assignments', icon: Users },
    { label: 'Ledger', href: '/dashboard/admin/ledger', icon: Landmark },
    { label: 'Property reviews', href: '/dashboard/admin/verification', icon: ClipboardCheck },
    { label: 'Refund review', href: '/dashboard/admin/refunds', icon: Undo2 },
    { label: 'Street governance', href: '/dashboard/admin/community', icon: MapPin },
    { label: 'Business settings', href: '/dashboard/admin/business-rules', icon: Settings2 },
    { label: 'Audit trail', href: '/dashboard/admin/audit', icon: FileText },
  ],
  moreLabel: 'Also Admin',
  moreItems: [
    { label: 'Property for sale', href: '/dashboard/admin/sales', icon: Landmark },
    { label: 'Pricing & free unlock', href: '/dashboard/admin/pricing', icon: KeyRound },
    { label: 'Categories', href: '/dashboard/admin/categories', icon: Building2 },
    { label: 'Agent quality', href: '/dashboard/admin/quality', icon: TrendingUp },
    { label: 'Users', href: '/dashboard/admin/users', icon: Users },
    { label: 'Allowed states', href: '/dashboard/admin/states', icon: MapPin },
    { label: 'Blogs', href: '/dashboard/admin/blogs', icon: BookOpen },
    { label: 'Contact forms', href: '/dashboard/admin/contacts', icon: Mail },
    { label: 'Communications', href: '/dashboard/admin/communications', icon: MessageCircle },
    { label: 'Site content', href: '/dashboard/admin/content', icon: FileText },
  ],
  commonItems: COMMON,
};

const PROPERTY_OPERATOR: WorkspaceNav = {
  roleLabel: 'Property Operator workspace',
  roleItems: [
    { label: 'Overview', href: '/dashboard/operator', icon: LayoutDashboard },
    { label: 'My properties', href: '/dashboard/operator/properties', icon: Home },
    { label: 'Add a property', href: '/dashboard/operator/properties/new', icon: Plus },
    { label: 'My verification', href: '/dashboard/operator/verification', icon: ShieldCheck },
  ],
  moreLabel: 'Also yours',
  moreItems: [
    { label: 'Shared property', href: '/dashboard/operator/shared', icon: Users },
    { label: 'Property for sale', href: '/dashboard/operator/sales', icon: Landmark },
  ],
  commonItems: COMMON,
};

const SHORT_LET_OPERATOR: WorkspaceNav = {
  roleLabel: 'Short let workspace',
  roleItems: [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My properties', href: '/dashboard/operator-properties', icon: Home },
  ],
  commonItems: COMMON,
};

/** The sidebar a role sees. Unknown and renter-like roles get the renter workspace. */
export function navFor(role?: UserRole): WorkspaceNav {
  if (role === UserRole.ADMIN) return ADMIN;
  if (role === UserRole.AGENT) return AGENT;
  if (role === UserRole.PROPERTY_OPERATOR) return PROPERTY_OPERATOR;
  if (role === UserRole.SHORT_LET_OPERATOR) return SHORT_LET_OPERATOR;
  return RENTER;
}

/** Every item of a role's sidebar, in the order it is shown. */
export function allNavItems(nav: WorkspaceNav): readonly NavItem[] {
  return [...nav.roleItems, ...(nav.moreItems ?? []), ...nav.commonItems];
}

/**
 * A nav item is active on its own route and on anything nested under it. `/dashboard` is excluded
 * from the prefix rule, or it would light up on every workspace screen.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  return pathname.startsWith(`${href}/`);
}
