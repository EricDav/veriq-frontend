import Link from 'next/link';
import type { ReactNode } from 'react';
import { Gift, Home, KeyRound, Landmark, Lock, MapPin, Users } from 'lucide-react';
import type { FormSchemaDefinition, PortfolioItem, SaleListingPublic, SharedListingPublic } from '@/types/renter';
import { answerValue } from './SchemaAnswers';
import { CATEGORY_LABELS, formatNaira, listingHref, locationLine, mediaSrc } from './format';

const PRICE_BASIS_LABELS: Record<string, string> = {
  total: 'total',
  per_plot: 'per plot',
  per_square_metre: 'per m²',
  other: '',
};

function UnlockFeeBadge({ isFree, price }: { isFree: boolean; price: number }) {
  return isFree ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white">
      <Gift className="h-3 w-3" /> Free unlock · ₦0
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">
      <Lock className="h-3 w-3 text-gold-400" /> Unlock {formatNaira(price)}
    </span>
  );
}

function CardShell({
  href,
  image,
  alt,
  badge,
  categoryLabel,
  children,
}: {
  href: string;
  image: string | null;
  alt: string;
  badge?: ReactNode;
  categoryLabel: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="group block h-full">
      <article className="card flex h-full flex-col overflow-hidden">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-navy-700 to-navy-900">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(image)} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><Home className="h-12 w-12 text-white/15" /></div>
          )}
          <span className="absolute left-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-navy-800">{categoryLabel}</span>
          {badge && <span className="absolute bottom-3 right-3">{badge}</span>}
        </div>
        <div className="flex flex-1 flex-col p-5">{children}</div>
      </article>
    </Link>
  );
}

/** Public Shared Property card: general area, opportunity type, contribution and unlock fee only (§11.4). */
export function SharedListingCard({ listing, schema = null }: { listing: SharedListingPublic; schema?: FormSchemaDefinition | null }) {
  const contribution = answerValue(schema, 'contribution_amount', listing.basics.contribution_amount);
  const basis = answerValue(schema, 'contribution_basis', listing.basics.contribution_basis);
  const bathroom = answerValue(schema, 'bathroom_sharing', listing.basics.bathroom_sharing);
  return (
    <CardShell
      href={`/shared/${listing.id}`}
      image={listing.coverImageUrl}
      alt={listing.displayLabel}
      categoryLabel="Shared Property"
      badge={<UnlockFeeBadge isFree={listing.isFreeUnlock} price={listing.unlockPrice} />}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-veriq-secondary"><Users className="h-3.5 w-3.5" /> {listing.opportunityTypeLabel}</p>
      <h3 className="mt-1.5 line-clamp-2 font-display text-base font-bold text-navy-900 group-hover:text-veriq-secondary">{listing.displayLabel}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-veriq-muted"><MapPin className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{locationLine(listing.area, listing.city, listing.state)}</span></p>
      {bathroom && <p className="mt-2 text-xs text-slate-500">Bathroom: {bathroom}</p>}
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Contribution</p>
          <p className="text-base font-bold text-navy-900">{contribution ?? 'On unlock'}{basis && <span className="text-xs font-normal text-slate-400"> {basis.toLowerCase()}</span>}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available</span>
      </div>
    </CardShell>
  );
}

/** Public Property for Sale card: subtype, general area, asking price, document status count and unlock fee. */
export function SaleListingCard({ listing }: { listing: SaleListingPublic }) {
  const basis = PRICE_BASIS_LABELS[listing.priceBasis] ?? '';
  const bedrooms = listing.basics.bedrooms;
  const landArea = typeof listing.basics.land_area === 'string' ? listing.basics.land_area : null;
  const recorded = listing.documentAvailability.length;
  return (
    <CardShell
      href={`/for-sale/${listing.id}`}
      image={listing.coverImageUrl}
      alt={listing.title}
      categoryLabel="Property for Sale"
      badge={<UnlockFeeBadge isFree={listing.isFreeUnlock} price={listing.unlockPrice} />}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-veriq-secondary"><Landmark className="h-3.5 w-3.5" /> {listing.subtypeLabel}</p>
      <h3 className="mt-1.5 line-clamp-2 font-display text-base font-bold text-navy-900 group-hover:text-veriq-secondary">{listing.title}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-veriq-muted"><MapPin className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{locationLine(listing.area, listing.city, listing.state)}</span></p>
      <p className="mt-2 text-xs text-slate-500">
        {typeof bedrooms === 'number' ? `${bedrooms} bedroom${bedrooms === 1 ? '' : 's'}` : landArea ?? ''}
        {recorded > 0 && `${typeof bedrooms === 'number' || landArea ? ' · ' : ''}${recorded} document status${recorded === 1 ? '' : 'es'} recorded`}
      </p>
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Asking price</p>
          <p className="text-base font-bold text-navy-900">{formatNaira(listing.askingPrice)}{basis && <span className="text-xs font-normal text-slate-400"> {basis}</span>}</p>
        </div>
        {listing.negotiable !== null && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{listing.negotiable ? 'Negotiable' : 'Fixed price'}</span>
        )}
      </div>
    </CardShell>
  );
}

/** Portfolio card on the public Veriq Agent profile. */
export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const label = CATEGORY_LABELS[item.category] ?? 'Property';
  return (
    <CardShell href={listingHref(item.targetType, item.id)} image={item.coverImageUrl} alt={item.title} categoryLabel={label}>
      <h3 className="line-clamp-2 font-display text-base font-bold text-navy-900 group-hover:text-veriq-secondary">{item.title}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-veriq-muted"><MapPin className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{locationLine(item.area, item.city) || 'General area shown on the listing'}</span></p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-veriq-secondary"><KeyRound className="h-3.5 w-3.5" /> View basic details</span>
    </CardShell>
  );
}
